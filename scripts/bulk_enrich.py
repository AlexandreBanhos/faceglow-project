#!/usr/bin/env python3
"""
FaceGlow — Bulk Product Enrichment
Chama Gemini para enriquecer todos os produtos do catalogo.
So sobrescreve campos que estao vazios/nulos.

Uso:
  pip install requests psycopg2-binary
  python scripts/bulk_enrich.py
  python scripts/bulk_enrich.py --dry-run      # mostra o que faria sem salvar
  python scripts/bulk_enrich.py --id <uuid>    # enriquece apenas um produto
"""

import json, time, csv, sys, re, argparse, unicodedata
from datetime import datetime
from pathlib import Path

try:
    import requests
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("Instale as dependencias primeiro:")
    print("  pip install requests psycopg2-binary")
    sys.exit(1)

# ── Config ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY = "AIzaSyAepTPmiaA4KbMxzpMSrBYB4_WFYI7MWsY"
GEMINI_MODEL   = "gemini-2.5-flash"
GEMINI_URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

DB = dict(
    host="aws-1-sa-east-1.pooler.supabase.com",
    port=6543,
    dbname="postgres",
    user="postgres.hemoqtqlczjgtrfibudj",
    password="rPB1wWS349WM![MDht,c[(+AT$1_w8|Qv^7yf",
    sslmode="require",
)

DELAY_S = 6.0  # delay entre chamadas Gemini (~10 RPM, dentro do free tier)

# ── Valores validos (espelham ProductEnrichmentService.cs) ───────────────────
VALID_STEP_TYPES   = {"cleanser","toner","serum","moisturizer","sunscreen","eye_cream","retinoid","acid","spot_treatment","oil","mask","exfoliant"}
VALID_SKIN_TYPES   = {"oleosa","seca","mista","sensivel","normal"}
VALID_CONCERNS     = {"acne","cravos","manchas","rugas","olheiras","hidratacao","oleosidade","sensibilidade","poros","vermelhidao","firmeza"}
VALID_STRENGTH     = {"mild","moderate","strong"}
VALID_PRICE_RANGES = {"low","medium","high","premium"}
VALID_PERIODS      = {"morning","night"}

# ── Prompt (identico ao backend) ─────────────────────────────────────────────
PROMPT = """Voce e um especialista em dermocosmetica e skincare com foco no mercado brasileiro.
Dado o nome e a marca de um produto cosmético, analise com base no seu conhecimento e retorne
SOMENTE um JSON valido com os dados do produto conforme o schema abaixo.

REGRAS CRITICAS - OS VALORES DEVEM SER EXATAMENTE ASSIM (sem traducao, sem maiusculas):

1. step_type_key - exatamente um destes (lowercase, sem espaco):
   cleanser | toner | serum | moisturizer | sunscreen | eye_cream | retinoid | acid | spot_treatment | oil | mask | exfoliant

2. compatible_skin_types - array com apenas estes valores (lowercase):
   "oleosa" | "seca" | "mista" | "sensivel" | "normal"

3. targets_concerns - array com apenas estes valores (lowercase, sem acentos):
   "acne" | "cravos" | "manchas" | "rugas" | "olheiras" | "hidratacao" | "oleosidade" | "sensibilidade" | "poros" | "vermelhidao" | "firmeza"

4. strength_level - exatamente: "mild" ou "moderate" ou "strong"

5. suitable_periods - array: ["morning"] | ["night"] | ["morning","night"]

6. price_range - exatamente: "low" | "medium" | "high" | "premium"
   low=ate R$35, medium=R$35-100, high=R$100-250, premium=acima R$250

7. estimated_price_brl - numero decimal (preco real em farmacias/lojas BR)

8. key_ingredients - 5-8 ingredientes ativos em PORTUGUES

9. description - 3-4 frases em PORTUGUES: funcao principal, ativos, tipo de pele alvo, como usar

10. tagline - frase marketing em PORTUGUES (max 10 palavras)

11. confidence - 0.0 a 1.0

NUNCA invente - use null para campos desconhecidos.
Retorne SOMENTE o JSON, sem markdown, sem texto adicional:
{
  "tagline": "...",
  "description": "...",
  "step_type_key": "moisturizer",
  "compatible_skin_types": ["oleosa", "mista"],
  "targets_concerns": ["acne", "oleosidade"],
  "strength_level": "mild",
  "suitable_periods": ["morning", "night"],
  "price_range": "medium",
  "estimated_price_brl": 79.90,
  "key_ingredients": ["Niacinamida", "Zinco PCA"],
  "confidence": 0.9
}"""

# ── Normalizacao ─────────────────────────────────────────────────────────────
def _norm_str(value):
    if not value:
        return None
    v = unicodedata.normalize("NFKD", value.strip().lower()).encode("ascii", "ignore").decode()
    return v

def normalize(value, allowed):
    v = _norm_str(value)
    return v if v and v in allowed else None

def normalize_array(values, allowed):
    if not isinstance(values, list):
        return []
    seen = []
    for v in values:
        n = normalize(v, allowed)
        if n and n not in seen:
            seen.append(n)
    return seen

# ── Gemini ───────────────────────────────────────────────────────────────────
def call_gemini(name, brand, retries=3):
    payload = {
        "contents": [{"parts": [{"text": f"{PROMPT}\n\nProduto: {name}\nMarca: {brand}"}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json"
        }
    }
    last_err = None
    for attempt in range(retries):
        if attempt:
            time.sleep(4 * attempt)
        try:
            r = requests.post(GEMINI_URL, json=payload, timeout=35)
            if r.status_code == 429:
                wait = 30 * (attempt + 1)
                print(f"          [429] rate limit, aguardando {wait}s...")
                time.sleep(wait)
                last_err = "429 rate limit"
                continue
            r.raise_for_status()
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            if not text or not text.strip():
                last_err = "Gemini retornou texto vazio"
                continue
            text = text.strip()
            if text.startswith("```"):
                first = text.find("\n")
                last  = text.rfind("```")
                if first > 0 and last > first:
                    text = text[first+1:last].strip()
                else:
                    text = text.lstrip("`").strip()
            return json.loads(text)
        except json.JSONDecodeError as e:
            last_err = f"JSON invalido: {e}"
        except Exception as e:
            last_err = str(e)
    raise RuntimeError(last_err or "Falha desconhecida")

# ── Banco ─────────────────────────────────────────────────────────────────────
def fetch_products(conn, product_id=None):
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        if product_id:
            cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        else:
            cur.execute("""
                SELECT * FROM products
                WHERE is_active = true
                ORDER BY brand, name
            """)
        return cur.fetchall()

def update_product(conn, product_id, fields, dry_run=False):
    if not fields:
        return 0
    if dry_run:
        print(f"     [DRY RUN] UPDATE products SET {list(fields.keys())}")
        return len(fields)
    set_parts = ", ".join(f"{k} = %s" for k in fields)
    values    = list(fields.values()) + [product_id]
    with conn.cursor() as cur:
        cur.execute(f"UPDATE products SET {set_parts}, updated_at = now() WHERE id = %s", values)
    conn.commit()
    return len(fields)

# ── Logica principal ──────────────────────────────────────────────────────────
def enrich_product(row, dry_run=False):
    name  = row["name"]
    brand = row["brand"]

    data = call_gemini(name, brand)

    updates = {}

    def pick(db_field, gemini_key, default=None):
        if row[db_field] is None:
            val = data.get(gemini_key, default)
            if val is not None:
                updates[db_field] = val

    def pick_norm(db_field, gemini_key, allowed):
        if row[db_field] is None:
            val = normalize(data.get(gemini_key), allowed)
            if val:
                updates[db_field] = val

    def pick_array(db_field, gemini_key, allowed, fallback=None):
        existing = row[db_field]
        if not existing or len(existing) == 0:
            arr = normalize_array(data.get(gemini_key, []), allowed)
            if arr:
                updates[db_field] = arr
            elif fallback:
                updates[db_field] = fallback

    # Texto livre
    pick("tagline",     "tagline")
    pick("description", "description")

    # Campos normalizados
    pick_norm("step_type_key",  "step_type_key",  VALID_STEP_TYPES)
    pick_norm("strength_level", "strength_level", VALID_STRENGTH)
    pick_norm("price_range",    "price_range",    VALID_PRICE_RANGES)

    # Arrays normalizados
    pick_array("compatible_skin_types", "compatible_skin_types", VALID_SKIN_TYPES)
    pick_array("targets_concerns",      "targets_concerns",      VALID_CONCERNS)
    pick_array("suitable_periods",      "suitable_periods",      VALID_PERIODS, fallback=["morning","night"])

    # Numericos
    if row["price_avg"] is None:
        price = data.get("estimated_price_brl")
        if price is not None:
            try:
                updates["price_avg"] = float(price)
            except (TypeError, ValueError):
                pass

    confidence = data.get("confidence", 0)
    return updates, confidence

def is_complete(row):
    checks = [
        row["step_type_key"],
        row["tagline"],
        row["description"],
        row["compatible_skin_types"] and len(row["compatible_skin_types"]) > 0,
        row["targets_concerns"] and len(row["targets_concerns"]) > 0,
        row["strength_level"],
        row["suitable_periods"] and len(row["suitable_periods"]) > 0,
        row["price_range"],
        row["price_avg"],
    ]
    return all(checks)

# ── CLI ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Bulk enrich FaceGlow products via Gemini")
    parser.add_argument("--dry-run", action="store_true", help="Mostra o que faria sem salvar")
    parser.add_argument("--id", metavar="UUID", help="Enriquece apenas este produto")
    parser.add_argument("--all", action="store_true", help="Enriquece todos, mesmo os completos")
    args = parser.parse_args()

    conn = psycopg2.connect(**DB)
    products = fetch_products(conn, args.id)

    if not args.all and not args.id:
        products = [p for p in products if not is_complete(p)]

    total = len(products)
    print(f"\nFaceGlow Bulk Enrich — {total} produto(s) para processar")
    if args.dry_run:
        print("MODO DRY RUN — nada sera salvo\n")

    log_path = Path("scripts") / f"enrich_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    results  = []

    ok = fail = skip = 0

    for i, row in enumerate(products, 1):
        pid   = str(row["id"])
        name  = row["name"]
        brand = row["brand"]
        label = f"[{i:>3}/{total}] {brand} — {name}"
        print(label)

        try:
            updates, confidence = enrich_product(row, dry_run=args.dry_run)
            if not updates:
                print(f"          -> ja completo, pulando")
                skip += 1
                results.append({"id": pid, "name": name, "brand": brand,
                                 "status": "skip", "fields": "", "confidence": confidence, "error": ""})
                continue

            n = update_product(conn, pid, updates, dry_run=args.dry_run)
            fields_str = ", ".join(updates.keys())
            print(f"          -> {n} campo(s) atualizados: {fields_str} (conf={confidence:.2f})")
            ok += 1
            results.append({"id": pid, "name": name, "brand": brand,
                             "status": "ok", "fields": fields_str, "confidence": confidence, "error": ""})

        except Exception as e:
            err = str(e)[:120]
            print(f"          -> ERRO: {err}")
            fail += 1
            results.append({"id": pid, "name": name, "brand": brand,
                             "status": "error", "fields": "", "confidence": 0, "error": err})

        if i < total:
            time.sleep(DELAY_S)

    # ── Salva log ──────────────────────────────────────────────────────────────
    with open(log_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["id","name","brand","status","fields","confidence","error"])
        w.writeheader()
        w.writerows(results)

    conn.close()

    print(f"\n{'='*60}")
    print(f"  OK:     {ok}")
    print(f"  Erros:  {fail}")
    print(f"  Skip:   {skip}")
    print(f"  Log:    {log_path}")
    print(f"{'='*60}\n")

    if fail:
        print("Produtos com erro:")
        for r in results:
            if r["status"] == "error":
                print(f"  - {r['brand']} / {r['name']}: {r['error']}")

if __name__ == "__main__":
    main()
