# FaceGlow — Motor de Geração de Rotinas

## Visão Geral

O motor gera rotinas personalizadas de skincare em 3 fases: **seleção de template → scoring de produtos → população de slots**. A entrada é um `SkinProfile` derivado da análise de IA. A saída são duas rotinas (`morning` e `night`), cada uma com passos e até 3 opções de produto por passo.

---

## Fluxo Completo

```
POST /analysis/{id}/routine
        │
        ▼
BuildRoutineAsync (AnalysisService)
        │
        ├─► [Usuário já tem rotina?]
        │         ├─ SIM → TryGenerateSuggestionsAsync → preserva rotina + gera sugestões
        │         └─ NÃO → GenerateForProfileAsync → cria rotina do zero
        │
        ▼
GenerateForProfileAsync (RoutineGeneratorService)
        │
        ├─ Para "morning" e "night":
        │       ├─ SelectTemplateAsync → escolhe template
        │       ├─ Cria UserRoutine no DB
        │       └─ Para cada step_type_key do template:
        │               ├─ Cria UserRoutineStep
        │               └─ PopulateSlotsAsync → busca e pontua produtos → cria até 3 slots
        │
        └─ SaveVersionSnapshotAsync → salva snapshot JSONB para histórico
```

---

## Tabelas Envolvidas

| Tabela | Papel |
|---|---|
| `skin_profiles` | Scores e tipo de pele derivados da análise de IA |
| `routine_templates` | Templates com critérios de match e lista de step_types |
| `step_types` | Catálogo de 10 tipos de passo |
| `products` | Catálogo de produtos com metadados de compatibilidade |
| `routines` | Rotina ativa por período (morning/night) por usuário |
| `routine_steps` | Passos individuais de cada rotina |
| `step_product_slots` | Até 3 produtos por passo (primary, alt_budget, alt_rated) |
| `routine_versions` | Snapshots JSONB de versões anteriores |
| `routine_change_suggestions` | Sugestões geradas por nova análise |

---

## Fase 1: Seleção de Template

### Como funciona

O engine carrega todos os templates ativos para o período, ordena por `specificity_score ASC` e retorna o **primeiro** que satisfaz todos os filtros do perfil.

```
specificity_score baixo = mais específico (matcheia um perfil raro)
specificity_score alto  = mais genérico (fallback)
```

### Templates cadastrados

#### Manhã

| Template | specificity | Filtros | Passos |
|---|---|---|---|
| Oleosa Acne Ativa – Manhã | 10 | skin ∈ {oleosa,acneica} + concern acne + acne≥4 + flag=has_active_acne | cleanser → serum → **spot_treatment** → moisturizer → sunscreen |
| Oleosa Acne – Manhã | 20 | skin ∈ {oleosa,mista,acneica} + concern acne/oleosidade + acne≥2 | cleanser → serum → moisturizer → sunscreen |
| Sensível – Manhã | 30 | skin = sensivel | cleanser → moisturizer → sunscreen |
| Seca/Normal – Manhã | 30 | skin ∈ {seca,normal} | cleanser → serum → moisturizer → sunscreen |
| Oleosa/Mista – Manhã | 30 | skin ∈ {oleosa,mista} | cleanser → serum → moisturizer → sunscreen |
| Anti-Manchas – Manhã | 40 | concern ∈ {manchas,spots} | cleanser → serum → moisturizer → sunscreen |
| Genérico – Manhã | 100 | sem filtros (fallback) | cleanser → moisturizer → sunscreen |

#### Noite

| Template | specificity | Filtros | Passos |
|---|---|---|---|
| Oleosa Acne Ativa – Noite | 10 | skin ∈ {oleosa,acneica} + concern acne + acne≥4 + flag=has_active_acne | cleanser → **acid** → **spot_treatment** → moisturizer |
| Oleosa Acne – Noite | 20 | skin ∈ {oleosa,mista,acneica} + concern acne/oleosidade + acne≥2 | cleanser → **acid** → moisturizer |
| Sensível – Noite | 30 | skin = sensivel | cleanser → serum → moisturizer |
| Seca/Normal – Noite | 30 | skin ∈ {seca,normal} | cleanser → serum → **retinoid** → moisturizer |
| Oleosa/Mista – Noite | 30 | skin ∈ {oleosa,mista} | cleanser → serum → moisturizer |
| Anti-Manchas – Noite | 40 | concern ∈ {manchas,spots} | cleanser → **acid** → serum → moisturizer |
| Genérico – Noite | 100 | sem filtros (fallback) | cleanser → moisturizer |

### Campos de filtro no template

| Campo | Tipo | Semântica |
|---|---|---|
| `match_skin_types` | text[] | Se preenchido, `profile.skin_type` deve estar no array |
| `match_concerns` | text[] | Se preenchido, ao menos 1 concern do perfil deve estar no array |
| `require_flags` | text[] | Todos os flags booleanos do perfil devem ser `true` |
| `min_acne_score` | smallint | `profile.acne_score >= min_acne_score` |
| `min_oiliness_score` | smallint | `profile.oiliness_score >= min_oiliness_score` |
| `min_sensitivity` | smallint | `profile.sensitivity_score >= min_sensitivity` |
| `specificity_score` | smallint | Ordem de tentativa — menor = testado primeiro |

---

## Fase 2: Candidatos de Produto

Para cada `step_type_key` do template, `GetCandidatesAsync` busca produtos com:

```sql
WHERE step_type_key = :stepKey
  AND is_active = true
  AND suitable_periods @> ARRAY[:period]   -- contém o período atual
  AND (compatible_skin_types = '{}'        -- sem restrição OU
       OR compatible_skin_types @> ARRAY[:skinType])
  -- Para sensitivity >= 7: exclui strength_level = 'strong'
ORDER BY curation_score DESC
LIMIT 15
```

---

## Fase 3: Scoring de Produto

Cada candidato recebe uma pontuação para ordenação:

```
score = curation_score (base)
      + 20  se compatible_skin_types contém o tipo de pele do usuário
      + 12  por cada concern do produto que bate com os concerns do perfil
      + 15  se perfil tem acne ativa E produto targets 'acne'
      + 10  se is_staff_pick = true
      + 8   se is_derma_tested = true
      + 5   se produto é exclusivo do período atual (ex: só noite)
      - 15  se sensitivity >= 7 E strength_level = 'moderate'
      - 35  (produto bloqueado antes mesmo do scoring) se sensitivity >= 7 E strength = 'strong'
```

---

## Fase 4: Criação de Slots

Com os produtos pontuados, o engine cria até 3 slots distintos por passo:

| Tier | Critério |
|---|---|
| `primary` | Maior score geral |
| `alt_budget` | Maior score entre os não-primary com `price_range IN ('low','medium')` |
| `alt_rated` | Maior `curation_score` entre os restantes (diferente de primary e alt_budget) |

**Regra**: todos os 3 slots devem ter produtos distintos (controle por `HashSet<Guid> usedIds`).

O slot `primary` começa com `is_selected = true`. Os outros dois ficam como alternativas que o usuário pode selecionar pelo ProductSwitchSheet.

---

## Tipos de Passo (step_types)

| key | display | Período típico | Produtos |
|---|---|---|---|
| `cleanser` | Limpeza | manhã + noite | 20 |
| `toner` | Tônico | manhã + noite | 10 |
| `acid` | Ácido | **noite** (alguns manhã+noite) | 12 |
| `serum` | Sérum | manhã + noite | 19 |
| `eye_cream` | Creme para Olhos | manhã + noite | 10 |
| `moisturizer` | Hidratante | manhã + noite | 20 |
| `oil` | Óleo Facial | **noite** | 8 |
| `retinoid` | Retinol/Retinoide | **noite** | 14 |
| `spot_treatment` | Tratamento Pontual | manhã + noite | 21 |
| `sunscreen` | Protetor Solar | **manhã** | 23 |

---

## Catálogo de Produtos por Tipo

### Acid (12 produtos)

| Produto | Marca | Strength | Price | Score | Período | Concerns |
|---|---|---|---|---|---|---|
| Effaclar Sérum Ultra Concentrado | La Roche-Posay | moderate | medium | 9★ | noite | acne, poros, oleosidade |
| The Ordinary Glycolic Acid 7% | The Ordinary | moderate | low | 9★ | noite | manchas |
| Creamy Mandelic Acid 5% | Creamy | mild | medium | 8★ | noite | manchas, acne |
| Sallve Ácido Azelaico 10% | Sallve | mild | medium | 8★ | manhã+noite | acne, manchas |
| CeraVe SA Loção Suavizante | CeraVe | mild | medium | 7 | noite | acne, poros |
| Bioderma Sebium AKN Mat | Bioderma | moderate | medium | 7 | noite | acne, oleosidade |
| L'Oréal Glycolic Bright Noturno | L'Oreal | moderate | medium | 7 | noite | manchas, anti_aging |
| Eucerin Even Brighter Clinical | Eucerin | moderate | high | 6 | noite | manchas |
| Isdin Acniben | Isdin | mild | medium | 6 | noite | acne, poros |
| Nivea Luminous630 Noturno | Nivea | mild | low | 6 | noite | manchas |
| Neutrogena Rapid Clear SA | Neutrogena | mild | low | 5 | noite | acne |
| Payot Go Peel Enzimático | Payot | mild | medium | 5 | noite | manchas |

### Eye Cream (10 produtos)

| Produto | Marca | Score | Período | Concerns |
|---|---|---|---|---|
| Isdin K-Ox Eyes | Isdin | 8★ | manhã+noite | olheiras |
| Creamy Eye Complex | Creamy | 8★ | manhã+noite | olheiras, anti_aging |
| La Roche-Posay Pigmentclar Olhos | La Roche-Posay | 8★ | manhã | olheiras, manchas |
| CeraVe Eye Repair Cream | CeraVe | 7 | manhã+noite | olheiras, anti_aging |
| Neutrogena Hydro Boost Eye | Neutrogena | 7 | manhã+noite | olheiras, anti_aging |
| Eucerin Hyaluron-Filler Eye | Eucerin | 7 | manhã+noite | anti_aging, olheiras |
| Bioderma Sensibio Eye | Bioderma | 6 | manhã+noite | olheiras |
| L'Oréal Revitalift Laser Olhos | L'Oreal | 6 | noite | anti_aging, olheiras |
| Payot Nutricia Creme Olhos | Payot | 5 | manhã+noite | olheiras, anti_aging |
| Nivea Cellular Expert Lift Olhos | Nivea | 5 | manhã+noite | olheiras, anti_aging |

### Oil (8 produtos)

| Produto | Marca | Score | Pele | Concerns |
|---|---|---|---|---|
| Sallve Óleo Facial Rosehip | Sallve | 9★ | seca,normal,mista | manchas, anti_aging |
| Isdin Flavo-C Melatonin | Isdin | 8★ | normal,mista,seca | anti_aging, manchas |
| La Roche-Posay Cicaplast Huile | La Roche-Posay | 7 | sensivel,seca | hidratacao |
| Creamy Face Oil Bakuchiol | Creamy | 7★ | normal,mista,seca | anti_aging, manchas |
| Bioderma Sensibio Defensive | Bioderma | 7 | sensivel,seca | hidratacao |
| L'Oréal Extraordinary Oil | L'Oreal | 6 | seca,normal | hidratacao, anti_aging |
| Neutrogena Óleo de Amêndoas | Neutrogena | 5 | seca,normal | hidratacao |
| Nivea Óleo Nutritivo Q10 | Nivea | 5 | seca,normal | hidratacao, anti_aging |

### Toner (10 produtos)

| Produto | Marca | Score | Pele | Concerns |
|---|---|---|---|---|
| La Roche-Posay Serozinc | La Roche-Posay | 9★ | oleosa,mista,acneica | oleosidade, poros, acne |
| Sallve Tônico Antioxidante | Sallve | 8★ | normal,mista | anti_aging, manchas |
| Creamy Hyaluronic Acid Tônico | Creamy | 8★ | todas | hidratacao, anti_aging |
| Bioderma Sensibio Tônico | Bioderma | 7 | sensivel | hidratacao |
| CeraVe Hydrating Toner | CeraVe | 7 | todas | hidratacao |
| Neutrogena Tônico Oil-Free | Neutrogena | 6 | oleosa,mista | oleosidade, poros |
| L'Oréal Hydra Genius Tônico | L'Oreal | 6 | normal,mista | hidratacao |
| Isdin Ureadin Loção Tônica | Isdin | 6 | seca,sensivel | hidratacao |
| Payot Tônico Suavizante | Payot | 5 | seca,normal,sensivel | hidratacao |
| Nivea Água Micelar Tônica | Nivea | 5 | todas | hidratacao |

---

## Sistema de Sugestões (Nova Análise)

Quando o usuário faz uma nova análise e já possui rotina ativa, o sistema **preserva a rotina atual** e gera até 5 sugestões de mudança:

### Tipos de sugestão

| Tipo | Quando gera | Ação ao aceitar |
|---|---|---|
| `add_step` | step_type presente no template ideal mas ausente na rotina | Cria novo `UserRoutineStep` + slot com o produto sugerido |
| `remove_step` | step_type na rotina mas não no template ideal (exceto cleanser/moisturizer/sunscreen) | Soft-delete do step (`is_active = false`) |
| `swap_product` | Mesmo step_type, mas melhor produto pontuado é diferente do atual | Adiciona novo slot ou seleciona slot existente |

### Prioridades de sugestão

```
priority 3 → add_step (mais urgente — algo faltando)
priority 5 → swap_product (melhoria de produto)
priority 7 → remove_step (menos urgente — algo pode ser retirado)
```

Máximo de 5 sugestões por análise, ordenadas por prioridade.

---

## Versionamento de Rotina

A cada geração ou mudança significativa, um snapshot JSONB é salvo em `routine_versions`:

```json
{
  "version": 1,
  "period": "morning",
  "generatedBy": "engine",
  "steps": [
    {
      "order": 0,
      "stepType": "cleanser",
      "recurrence": "daily",
      "slots": [
        { "tier": "primary", "isSelected": true, "productName": "CeraVe Acne Control", "score": 46.0 },
        { "tier": "alt_budget", "isSelected": false, "productName": "NIVEA Sabonete Acne Control", "score": 29.0 },
        { "tier": "alt_rated", "isSelected": false, "productName": "Garnier Uniform & Matte", "score": 28.0 }
      ]
    }
  ]
}
```

`changeType` pode ser: `initial_generation`, `manual_edit`, `restored`.

---

## Adicionando Novos Templates

Para cobrir novos cenários, insira na tabela `routine_templates`:

```sql
INSERT INTO routine_templates (name, period, match_skin_types, match_concerns, require_flags,
  min_acne_score, step_type_keys, specificity_score, is_active)
VALUES (
  'Anti-Envelhecimento – Noite', 'night',
  ARRAY['seca','normal'],
  ARRAY['anti_aging'],
  NULL, NULL,
  ARRAY['cleanser','toner','serum','retinoid','eye_cream','moisturizer','oil'],
  25, true
);
```

**Regras para `specificity_score`:**
- Use valores entre 10 e 40 para templates específicos
- Use 100 apenas para o fallback genérico
- O engine testa do menor para o maior — templates mais restritivos devem ter score mais baixo

## Adicionando Novos Produtos

```sql
INSERT INTO products (
  name, brand, step_type_key, tagline,
  compatible_skin_types,   -- ARRAY['oleosa','mista'] ou ARRAY[]::text[] para todos
  targets_concerns,        -- ARRAY['acne','poros']
  suitable_periods,        -- ARRAY['morning','night'] ou ARRAY['night']
  recommended_frequency,   -- 'daily' | '2-3x_week'
  strength_level,          -- 'mild' | 'moderate' | 'strong'
  price_range,             -- 'low' | 'medium' | 'high' | 'premium'
  price_avg,               -- preço médio em BRL
  curation_score,          -- 0-10 (controla pontuação base no scoring)
  is_staff_pick,           -- true = +10 no score
  is_derma_tested,         -- true = +8 no score
  is_active
) VALUES (...);
```

### Concerns válidos para `targets_concerns`

`acne`, `manchas`, `oleosidade`, `poros`, `hidratacao`, `anti_aging`, `olheiras`, `equilibrio`

### Tipos de pele válidos para `compatible_skin_types`

`oleosa`, `mista`, `seca`, `normal`, `sensivel`, `acneica`
