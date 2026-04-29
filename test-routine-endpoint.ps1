#!/usr/bin/env powershell

# Script de teste para endpoint POST /routine/mark-complete
# Requer que o usuário esteja logado no frontend antes

$BACKEND_URL = "http://localhost:5172"
$FRONTEND_URL = "http://localhost:8080"

Write-Host "🧪 Teste do Endpoint POST /routine/mark-complete" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Teste 1: Validar que endpoint existe
Write-Host "📋 TESTE 1: Validando que endpoint existe (sem token)..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/routine/mark-complete" `
        -Method Post `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body (@{ period = "morning" } | ConvertTo-Json) `
        -UseBasicParsing `
        -ErrorAction SilentlyContinue
    
    Write-Host "✅ TESTE 1 PASSOU: Endpoint respondeu" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value
    if ($statusCode -eq 401 -or $statusCode -eq 400) {
        Write-Host "✅ TESTE 1 PASSOU: Endpoint existe e requer autenticação (HTTP $statusCode)" -ForegroundColor Green
    } else {
        Write-Host "❌ TESTE 1 FALHOU: HTTP $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "⚠️  Para os próximos testes, você precisa:" -ForegroundColor Yellow
Write-Host "   1. Abrir http://localhost:8080" -ForegroundColor Yellow
Write-Host "   2. Fazer login" -ForegroundColor Yellow
Write-Host "   3. Completar uma rotina da manhã" -ForegroundColor Yellow
Write-Host "   4. Abrir DevTools (F12) → Console" -ForegroundColor Yellow
Write-Host "   5. Cole o seguinte comando:" -ForegroundColor Yellow
Write-Host ""
Write-Host "fetch('http://localhost:5172/routine/mark-complete', {" -ForegroundColor Cyan
Write-Host "  method: 'POST'," -ForegroundColor Cyan
Write-Host "  headers: {" -ForegroundColor Cyan
Write-Host "    'Authorization': \`Bearer \${localStorage.getItem('sb-access-token')}\`," -ForegroundColor Cyan
Write-Host "    'Content-Type': 'application/json'" -ForegroundColor Cyan
Write-Host "  }," -ForegroundColor Cyan
Write-Host "  body: JSON.stringify({ period: 'morning' })" -ForegroundColor Cyan
Write-Host "}).then(r => r.json()).then(d => console.log(d))" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Resultado esperado:" -ForegroundColor Green
Write-Host "   {" -ForegroundColor Gray
Write-Host "     success: true," -ForegroundColor Gray
Write-Host "     message: 'Routine marked'," -ForegroundColor Gray
Write-Host "     morningCompleted: true," -ForegroundColor Gray
Write-Host "     nightCompleted: false" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""

Write-Host "📊 Fluxo Completo de Teste:" -ForegroundColor Cyan
Write-Host "   1. Complete rotina da manha no frontend" -ForegroundColor Cyan
Write-Host "   2. Badge Concluida aparece no card" -ForegroundColor Cyan
Write-Host "   3. Interface muda para rotina da noite (apos 1.5s)" -ForegroundColor Cyan
Write-Host "   4. Complete rotina da noite (opcional)" -ForegroundColor Cyan
Write-Host "   5. Va para Profile page" -ForegroundColor Cyan
Write-Host "   6. Streak incrementa para 1 dia" -ForegroundColor Cyan
