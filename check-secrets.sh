#!/bin/bash

# 🔒 Script: Scan for Exposed Secrets in Repository
# This script searches for common secret patterns in the repository
# Usage: ./check-secrets.sh

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Scanning repository for exposed secrets...${NC}\n"

# Patterns to search for (high confidence)
PATTERNS=(
    'sk_live_|sk_test_'              # Stripe secret keys
    'whsec_'                          # Stripe webhook secrets
    'pk_live_|pk_test_'               # Stripe publishable keys
    'APP_USR-[0-9]{16,}'              # MercadoPago tokens
    'AIzaSy[A-Za-z0-9_-]{33}'         # Google/Gemini API keys
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' # JWT patterns
    'Password=[^;]+;'                 # Connection strings with passwords
    'password:\s*[^[:space:]]+'       # YAML password fields with values
    'secret:\s*[^[:space:]]+'         # YAML secret fields with values
    'api.?key:\s*[^[:space:]]+'       # YAML API key fields with values
)

FOUND_SECRETS=0
EXCLUDED_PATHS=(
    '.git/'
    'node_modules/'
    '.node_modules/'
    'dist/'
    'build/'
    'customize/skills/ruflo/'
    '.vscode/'
    '.claude/'
)

# Build find exclusions
FIND_EXCLUDES=""
for path in "${EXCLUDED_PATHS[@]}"; do
    FIND_EXCLUDES="$FIND_EXCLUDES -not -path '*/$path*'"
done

echo "Patterns being searched:"
for pattern in "${PATTERNS[@]}"; do
    echo "  • $pattern"
done
echo ""

# Search for each pattern
for pattern in "${PATTERNS[@]}"; do
    MATCHES=$(eval "find $REPO_ROOT -type f \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.cs' -o -name '*.md' -o -name '.env*' -o -name '*.json' -o -name '*.yaml' -o -name '*.yml' \) $FIND_EXCLUDES -exec grep -l \"$pattern\" {} \;" 2>/dev/null || true)
    
    if [ -n "$MATCHES" ]; then
        echo -e "${RED}⚠️  Pattern found: $pattern${NC}"
        echo "$MATCHES" | while read -r file; do
            # Count occurrences
            COUNT=$(grep -o "$pattern" "$file" 2>/dev/null | wc -l)
            echo -e "  ${YELLOW}→ $file ($COUNT matches)${NC}"
        done
        echo ""
        FOUND_SECRETS=$((FOUND_SECRETS + 1))
    fi
done

# Check if .env is tracked by git
echo -e "\n${GREEN}Checking git tracking status...${NC}"
if git ls-files | grep -q "^\.env$"; then
    echo -e "${RED}🚨 CRITICAL: .env is tracked by git!${NC}"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
else
    echo -e "${GREEN}✓ .env is properly ignored${NC}"
fi

# Check if .gitignore has .env
if grep -q "^\.env$" "$REPO_ROOT/.gitignore" 2>/dev/null; then
    echo -e "${GREEN}✓ .env is in .gitignore${NC}"
else
    echo -e "${YELLOW}⚠️  .env not found in .gitignore${NC}"
fi

echo ""
if [ $FOUND_SECRETS -eq 0 ]; then
    echo -e "${GREEN}✅ No obvious secrets detected!${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $FOUND_SECRETS potential issues!${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: These may be false positives. Review manually.${NC}"
    echo -e "See SECURITY_POLICY.md for guidelines."
    exit 1
fi
