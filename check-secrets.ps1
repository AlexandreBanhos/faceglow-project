# 🔒 Script: Scan for Exposed Secrets in Repository (PowerShell)
# This script searches for common secret patterns in the repository
# Usage: .\check-secrets.ps1

$REPO_ROOT = (git rev-parse --show-toplevel)
$FOUND_SECRETS = 0

Write-Host "`n🔍 Scanning repository for exposed secrets...`n" -ForegroundColor Green

# Patterns to search for (high confidence)
$PATTERNS = @(
    'sk_live_|sk_test_',              # Stripe secret keys
    'whsec_',                          # Stripe webhook secrets
    'pk_live_|pk_test_',               # Stripe publishable keys
    'APP_USR-[0-9]{16,}',              # MercadoPago tokens
    'AIzaSy[A-Za-z0-9_-]{33}',         # Google/Gemini API keys
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', # JWT patterns
    'Password=[^;]+;',                 # Connection strings with passwords
    'password:\s*[^'`n]+'              # YAML password fields with values
)

$EXCLUDED_PATHS = @(
    '\.git',
    'node_modules',
    '\.node_modules',
    'dist',
    'build',
    'customize[\\/]skills[\\/]ruflo',
    '\.vscode',
    '\.claude'
)

Write-Host "Patterns being searched:" -ForegroundColor Green
foreach ($pattern in $PATTERNS) {
    Write-Host "  • $pattern"
}
Write-Host ""

# Search for each pattern
foreach ($pattern in $PATTERNS) {
    $files = Get-ChildItem -Path $REPO_ROOT -Recurse -File `
        -Include @('*.js', '*.ts', '*.tsx', '*.cs', '*.md', '.env*', '*.json', '*.yaml', '*.yml', '*.html') |
        Where-Object {
            $fullPath = $_.FullName
            # Check if path should be excluded
            $exclude = $false
            foreach ($excludePath in $EXCLUDED_PATHS) {
                if ($fullPath -match $excludePath) {
                    $exclude = $true
                    break
                }
            }
            -not $exclude
        }

    foreach ($file in $files) {
        try {
            $matches = @(Select-String -Path $file.FullName -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue)
            if ($matches.Count -gt 0) {
                Write-Host "⚠️  Pattern found: $pattern" -ForegroundColor Red
                $totalMatches = 0
                foreach ($match in $matches) {
                    $totalMatches += $match.Matches.Count
                }
                Write-Host "  → $($file.FullName) ($totalMatches matches)" -ForegroundColor Yellow
                Write-Host ""
                $FOUND_SECRETS++
            }
        }
        catch {
            # Silently ignore binary files or read errors
        }
    }
}

# Check if .env is tracked by git
Write-Host "`n" + "Checking git tracking status..." -ForegroundColor Green
$gitFiles = git ls-files 2>$null
if ($gitFiles -match '^\.env$') {
    Write-Host "🚨 CRITICAL: .env is tracked by git!" -ForegroundColor Red
    $FOUND_SECRETS++
} else {
    Write-Host "✓ .env is properly ignored" -ForegroundColor Green
}

# Check if .gitignore has .env
$gitIgnorePath = Join-Path $REPO_ROOT '.gitignore'
if (Test-Path $gitIgnorePath) {
    $gitIgnoreContent = Get-Content $gitIgnorePath -Raw
    if ($gitIgnoreContent -match '^\.env$') {
        Write-Host "✓ .env is in .gitignore" -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env not found in .gitignore" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($FOUND_SECRETS -eq 0) {
    Write-Host "✅ No obvious secrets detected!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Found $FOUND_SECRETS potential issues!" -ForegroundColor Red
    Write-Host "⚠️  IMPORTANT: These may be false positives. Review manually." -ForegroundColor Yellow
    Write-Host "See SECURITY_POLICY.md for guidelines."
    exit 1
}
