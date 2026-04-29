#!/usr/bin/env bash
# =============================================================================
# setup-skills.sh — Instalador de Skills para Claude Code
# =============================================================================
# Uso: bash setup-skills.sh [--dir /caminho/destino]
# Padrão: instala em ./customize/skills no diretório atual
# =============================================================================

set -euo pipefail

# ── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${NC}\n"; }

# ── Argumento opcional --dir ─────────────────────────────────────────────────
SKILLS_DIR="./customize/skills"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) SKILLS_DIR="$2"; shift 2 ;;
    *) error "Argumento desconhecido: $1"; exit 1 ;;
  esac
done

SKILLS_DIR="$(realpath -m "$SKILLS_DIR")"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# ── Verificar dependências ───────────────────────────────────────────────────
header "Verificando dependências"
for cmd in git curl; do
  if command -v "$cmd" &>/dev/null; then
    success "$cmd encontrado"
  else
    error "$cmd não encontrado. Instale antes de continuar."
    exit 1
  fi
done

mkdir -p "$SKILLS_DIR"
log "Diretório de destino: ${BOLD}$SKILLS_DIR${NC}"

# ── Helpers ──────────────────────────────────────────────────────────────────

# Clona um repositório no diretório temporário
clone_repo() {
  local url="$1" dest="$2"
  log "Clonando: $url"
  git clone --depth=1 --quiet "$url" "$dest" 2>/dev/null \
    || { error "Falha ao clonar $url"; return 1; }
  # Remove .git para não poluir o projeto
  rm -rf "$dest/.git"
  success "Clonado → $dest"
}

# Limpa arquivos desnecessários de uma pasta de skill
clean_skill_dir() {
  local dir="$1"
  find "$dir" -maxdepth 1 \( \
    -name ".git" -o -name ".github" -o -name ".gitignore" \
    -o -name ".gitattributes" -o -name "*.lock" \
    -o -name "node_modules" -o -name ".DS_Store" \
    -o -name "Thumbs.db" \
  \) -exec rm -rf {} + 2>/dev/null || true
}

# Garante que a skill tenha um ponto de entrada claro (SKILL.md)
ensure_entrypoint() {
  local dir="$1" name="$2"

  # Já tem SKILL.md? Ótimo.
  [[ -f "$dir/SKILL.md" ]] && return 0

  # Procura por outros arquivos de instrução comuns e renomeia
  for candidate in instructions.md skill.yaml INSTRUCTIONS.md README.md readme.md; do
    if [[ -f "$dir/$candidate" ]]; then
      cp "$dir/$candidate" "$dir/SKILL.md"
      log "  → Ponto de entrada criado a partir de $candidate"
      return 0
    fi
  done

  # Cria um SKILL.md mínimo se nada for encontrado
  cat > "$dir/SKILL.md" <<EOF
# Skill: $name

> Ponto de entrada gerado automaticamente por setup-skills.sh.
> Adicione as instruções desta skill aqui.
EOF
  warn "  → SKILL.md mínimo criado para '$name' (sem arquivo de instruções encontrado)"
}

# ── Rastrear skills instaladas (para o index.md) ─────────────────────────────
declare -A SKILL_DESC

register_skill() {
  local name="$1" desc="$2"
  SKILL_DESC["$name"]="$desc"
}

# =============================================================================
# INSTALAÇÃO DAS SKILLS
# =============================================================================

# ── 1. vercel-labs/agent-skills ───────────────────────────────────────────────
header "1/9 · vercel-labs/agent-skills"
REPO_TMP="$TMP_DIR/agent-skills"
clone_repo "https://github.com/vercel-labs/agent-skills" "$REPO_TMP"

DEST="$SKILLS_DIR/agent-skills"
rm -rf "$DEST"; mkdir -p "$DEST"
cp -r "$REPO_TMP"/. "$DEST/"
clean_skill_dir "$DEST"
ensure_entrypoint "$DEST" "agent-skills"
register_skill "agent-skills" "Skills oficiais de agente da Vercel Labs para Claude Code"
success "agent-skills instalado"

# ── 2. ruvnet/ruflo ───────────────────────────────────────────────────────────
header "2/9 · ruvnet/ruflo"
REPO_TMP="$TMP_DIR/ruflo"
clone_repo "https://github.com/ruvnet/ruflo" "$REPO_TMP"

DEST="$SKILLS_DIR/ruflo"
rm -rf "$DEST"; mkdir -p "$DEST"
cp -r "$REPO_TMP"/. "$DEST/"
clean_skill_dir "$DEST"
ensure_entrypoint "$DEST" "ruflo"
register_skill "ruflo" "Framework Ruflo de automação e agentes por ruvnet"
success "ruflo instalado"

# ── 3. nextlevelbuilder/ui-ux-pro-max-skill ───────────────────────────────────
header "3/9 · ui-ux-pro-max-skill"
REPO_TMP="$TMP_DIR/ui-ux"
clone_repo "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill" "$REPO_TMP"

DEST="$SKILLS_DIR/ui-ux-pro-max"
rm -rf "$DEST"; mkdir -p "$DEST"
cp -r "$REPO_TMP"/. "$DEST/"
clean_skill_dir "$DEST"
ensure_entrypoint "$DEST" "ui-ux-pro-max"
register_skill "ui-ux-pro-max" "Skill avançada de UI/UX design pro para Claude Code"
success "ui-ux-pro-max instalado"

# ── 4. Claude-Code-Usage-Monitor ─────────────────────────────────────────────
header "4/9 · Claude-Code-Usage-Monitor"
REPO_TMP="$TMP_DIR/usage-monitor"
clone_repo "https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor" "$REPO_TMP"

DEST="$SKILLS_DIR/usage-monitor"
rm -rf "$DEST"; mkdir -p "$DEST"
cp -r "$REPO_TMP"/. "$DEST/"
clean_skill_dir "$DEST"
ensure_entrypoint "$DEST" "usage-monitor"
register_skill "usage-monitor" "Monitor de uso e tokens do Claude Code em tempo real"
success "usage-monitor instalado"

# ── 5. everything-claude-code ─────────────────────────────────────────────────
header "5/9 · everything-claude-code"
REPO_TMP="$TMP_DIR/everything-cc"
clone_repo "https://github.com/affaan-m/everything-claude-code" "$REPO_TMP"

DEST="$SKILLS_DIR/everything-claude-code"
rm -rf "$DEST"; mkdir -p "$DEST"
cp -r "$REPO_TMP"/. "$DEST/"
clean_skill_dir "$DEST"
ensure_entrypoint "$DEST" "everything-claude-code"
register_skill "everything-claude-code" "Coleção abrangente de prompts e configs para Claude Code"
success "everything-claude-code instalado"

# ── 6. blader/humanizer ───────────────────────────────────────────────────────
header "6/9 · humanizer"
REPO_TMP="$TMP_DIR/humanizer"
clone_repo "https://github.com/blader/humanizer" "$REPO_TMP"

DEST="$SKILLS_DIR/humanizer"
rm -rf "$DEST"; mkdir -p "$DEST"
cp -r "$REPO_TMP"/. "$DEST/"
clean_skill_dir "$DEST"
ensure_entrypoint "$DEST" "humanizer"
register_skill "humanizer" "Skill para humanizar textos gerados por IA"
success "humanizer instalado"

# ── 7. get-shit-done ──────────────────────────────────────────────────────────
header "7/9 · get-shit-done"
REPO_TMP="$TMP_DIR/gsd"
clone_repo "https://github.com/glittercowboy/get-shit-done" "$REPO_TMP"

DEST="$SKILLS_DIR/get-shit-done"
rm -rf "$DEST"; mkdir -p "$DEST"
cp -r "$REPO_TMP"/. "$DEST/"
clean_skill_dir "$DEST"
ensure_entrypoint "$DEST" "get-shit-done"
register_skill "get-shit-done" "Skill de produtividade e execução focada de tarefas"
success "get-shit-done instalado"

# ── 8. obra/superpowers — skills individuais + using-superpowers ───────────────
header "8/9 · obra/superpowers (skills individuais)"
REPO_TMP="$TMP_DIR/superpowers"
clone_repo "https://github.com/obra/superpowers" "$REPO_TMP"

SKILLS_SOURCE="$REPO_TMP/skills"

if [[ -d "$SKILLS_SOURCE" ]]; then
  for skill_path in "$SKILLS_SOURCE"/*/; do
    [[ -d "$skill_path" ]] || continue
    skill_raw_name="$(basename "$skill_path")"
    # kebab-case: lowercase + underscores → hífens
    skill_name="$(echo "$skill_raw_name" | tr '[:upper:]' '-' | tr '_' '-' | tr ' ' '-' | sed 's/--*/-/g; s/^-//; s/-$//')"

    DEST="$SKILLS_DIR/$skill_name"
    rm -rf "$DEST"; mkdir -p "$DEST"
    cp -r "$skill_path"/. "$DEST/"
    clean_skill_dir "$DEST"
    ensure_entrypoint "$DEST" "$skill_name"

    # Pega descrição do README se existir
    desc="Superpower skill: $skill_name"
    if [[ -f "$DEST/README.md" ]]; then
      first_line="$(grep -m1 '^[^#]' "$DEST/README.md" 2>/dev/null | head -c 120 || echo "")"
      [[ -n "$first_line" ]] && desc="$first_line"
    fi
    register_skill "$skill_name" "$desc"
    success "  → $skill_name instalado"
  done
else
  warn "Pasta /skills não encontrada no repositório superpowers — copiando repositório inteiro"
  DEST="$SKILLS_DIR/superpowers"
  rm -rf "$DEST"; mkdir -p "$DEST"
  cp -r "$REPO_TMP"/. "$DEST/"
  clean_skill_dir "$DEST"
  ensure_entrypoint "$DEST" "superpowers"
  register_skill "superpowers" "Coleção Superpowers de skills para Claude Code (obra)"
fi

# using-superpowers como skill separada
USING_SRC="$REPO_TMP/skills/using-superpowers"
if [[ -d "$USING_SRC" ]]; then
  DEST="$SKILLS_DIR/using-superpowers"
  # Já foi copiado no loop acima — apenas garante ponto de entrada
  ensure_entrypoint "$DEST" "using-superpowers"
  register_skill "using-superpowers" "Guia de uso e configuração das Superpowers skills"
  success "  → using-superpowers confirmado como skill independente"
fi

# ── 9. Labhund/hermes-superpowers ────────────────────────────────────────────
header "9/9 · hermes-superpowers"
REPO_TMP="$TMP_DIR/hermes"
clone_repo "https://github.com/Labhund/hermes-superpowers" "$REPO_TMP"

# Evitar duplicação: descobrir skills que o hermes tem em comum com superpowers
HERMES_SKILLS_SOURCE="$REPO_TMP/skills"

if [[ -d "$HERMES_SKILLS_SOURCE" ]]; then
  for skill_path in "$HERMES_SKILLS_SOURCE"/*/; do
    [[ -d "$skill_path" ]] || continue
    skill_name="hermes-$(basename "$skill_path" | tr '[:upper:]' '-' | tr '_' '-' | tr ' ' '-' | sed 's/--*/-/g; s/^-//; s/-$//')"

    DEST="$SKILLS_DIR/$skill_name"
    rm -rf "$DEST"; mkdir -p "$DEST"
    cp -r "$skill_path"/. "$DEST/"
    clean_skill_dir "$DEST"
    ensure_entrypoint "$DEST" "$skill_name"
    register_skill "$skill_name" "Hermes superpower: $(basename "$skill_path")"
    success "  → $skill_name instalado"
  done
else
  # Sem pasta /skills — instala o repo inteiro com prefixo hermes
  DEST="$SKILLS_DIR/hermes-superpowers"
  rm -rf "$DEST"; mkdir -p "$DEST"
  cp -r "$REPO_TMP"/. "$DEST/"
  clean_skill_dir "$DEST"
  ensure_entrypoint "$DEST" "hermes-superpowers"
  register_skill "hermes-superpowers" "Fork Hermes das Superpowers skills para Claude Code"
  success "hermes-superpowers instalado"
fi

# =============================================================================
# GERAR index.md
# =============================================================================
header "Gerando index.md"

INDEX_FILE="$SKILLS_DIR/index.md"
{
  echo "# Skills Instaladas — Claude Code"
  echo ""
  echo "> Gerado automaticamente por \`setup-skills.sh\` em $(date '+%Y-%m-%d %H:%M')"
  echo ""
  echo "## Como usar"
  echo ""
  echo "Referencie qualquer skill no seu \`CLAUDE.md\` assim:"
  echo ""
  echo '```markdown'
  echo "## Skills disponíveis"
  echo "- customize/skills/<nome-da-skill>/SKILL.md"
  echo '```'
  echo ""
  echo "---"
  echo ""
  echo "## Skills instaladas"
  echo ""
  echo "| Skill | Descrição |"
  echo "|-------|-----------|"
  for name in $(echo "${!SKILL_DESC[@]}" | tr ' ' '\n' | sort); do
    echo "| [\`$name\`](./$name/SKILL.md) | ${SKILL_DESC[$name]} |"
  done
  echo ""
  echo "---"
  echo ""
  echo "## Estrutura de pastas"
  echo ""
  echo '```'
  find "$SKILLS_DIR" -maxdepth 2 \( -name "SKILL.md" -o -type d \) \
    | sed "s|$SKILLS_DIR/||" | sort
  echo '```'
} > "$INDEX_FILE"

success "index.md gerado em $INDEX_FILE"

# =============================================================================
# GERAR/ATUALIZAR CLAUDE.md no pai de customize/
# =============================================================================
CLAUDE_MD="$(dirname "$SKILLS_DIR")/../CLAUDE.md"
CLAUDE_MD="$(realpath -m "$CLAUDE_MD")"

if [[ ! -f "$CLAUDE_MD" ]]; then
  header "Criando CLAUDE.md"
  cat > "$CLAUDE_MD" <<'CLAUDEMD'
# CLAUDE.md — Configuração do Projeto

## Skills disponíveis

As skills abaixo estão disponíveis para uso neste projeto.
Consulte `customize/skills/index.md` para a lista completa.

Para ativar uma skill, leia o arquivo SKILL.md correspondente no início da tarefa.

Exemplo de referência em tarefas:
```
Use a skill em customize/skills/humanizer/SKILL.md para reescrever este texto.
```
CLAUDEMD
  success "CLAUDE.md criado em $CLAUDE_MD"
else
  log "CLAUDE.md já existe — não sobrescrito. Adicione manualmente a referência às skills se desejar."
fi

# =============================================================================
# RESUMO FINAL
# =============================================================================
header "Instalação concluída"

echo -e "${BOLD}Diretório:${NC} $SKILLS_DIR"
echo -e "${BOLD}Skills instaladas:${NC} ${#SKILL_DESC[@]}"
echo ""
echo -e "${BOLD}Estrutura criada:${NC}"
find "$SKILLS_DIR" -maxdepth 2 -type d | sort | \
  sed "s|$SKILLS_DIR||" | sed 's|^/||' | \
  awk 'NF{depth=gsub("/","/"); printf "%s%s\n", substr("                ",1,depth*2), $0}'

echo ""
echo -e "${GREEN}${BOLD}✓ Todas as skills estão prontas para uso no Claude Code!${NC}"
echo -e "  Consulte: ${CYAN}$SKILLS_DIR/index.md${NC}"
