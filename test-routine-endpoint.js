#!/usr/bin/env node

/**
 * Script de teste para o endpoint POST /routine/mark-complete
 * 
 * Uso:
 * 1. Abra o DevTools do frontend (http://localhost:8080)
 * 2. Abra Console
 * 3. Cole o código abaixo e execute
 * 
 * Ou execute via Node:
 * node test-routine-endpoint.js
 */

const BACKEND_URL = "http://localhost:5172";

// ============================================
// TESTE 1: Validar que endpoint existe (sem token)
// ============================================
async function testEndpointExists() {
  console.log("📋 TESTE 1: Validando que endpoint existe...");
  
  try {
    const response = await fetch(`${BACKEND_URL}/routine/mark-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: "morning" })
    });
    
    if (response.status === 401) {
      console.log("✅ TESTE 1 PASSOU: Endpoint existe e requer autenticação");
      return true;
    } else if (response.status === 400) {
      console.log("✅ TESTE 1 PASSOU: Endpoint existe (erro 400 = sem token)");
      return true;
    } else {
      console.log(`❌ TESTE 1 FALHOU: Status inesperado ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("❌ TESTE 1 FALHOU:", error.message);
    return false;
  }
}

// ============================================
// TESTE 2: Testar com token válido (Frontend)
// ============================================
async function testWithValidToken() {
  console.log("\n📋 TESTE 2: Testando com token válido...");
  
  // Se estamos rodando no browser, temos acesso ao localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    const token = window.localStorage.getItem("sb-access-token");
    
    if (!token) {
      console.log("⚠️ TESTE 2 SKIPPED: Nenhum token no localStorage");
      console.log("   Faça login no http://localhost:8080 primeiro");
      return null;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/routine/mark-complete`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ period: "morning" })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("✅ TESTE 2 PASSOU: Rotina marcada com sucesso");
        console.log("   Resposta:", data);
        return true;
      } else if (response.status === 400) {
        console.log("⚠️ TESTE 2: Erro 400 (possível token inválido)");
        console.log("   Resposta:", data);
        return false;
      } else {
        console.log(`❌ TESTE 2 FALHOU: Status ${response.status}`);
        console.log("   Resposta:", data);
        return false;
      }
    } catch (error) {
      console.error("❌ TESTE 2 FALHOU:", error.message);
      return false;
    }
  } else {
    console.log("⚠️ TESTE 2 SKIPPED: Não estamos em contexto de browser");
    return null;
  }
}

// ============================================
// TESTE 3: Schedule completo manhã + noite
// ============================================
async function testCompleteRoutineDay() {
  console.log("\n📋 TESTE 3: Testando agendamento completo do dia...");
  
  if (typeof window === "undefined") {
    console.log("⚠️ TESTE 3 SKIPPED: Requer contexto de browser");
    return null;
  }
  
  const token = window.localStorage.getItem("sb-access-token");
  if (!token) {
    console.log("⚠️ TESTE 3 SKIPPED: Token não disponível");
    return null;
  }
  
  try {
    // Marcar manhã
    console.log("   → Marcando rotina da manhã...");
    const morningResponse = await fetch(`${BACKEND_URL}/routine/mark-complete`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ period: "morning" })
    });
    
    if (!morningResponse.ok) {
      console.log(`❌ Erro ao marcar manhã: ${morningResponse.status}`);
      return false;
    }
    console.log("     ✓ Manhã marcada");
    
    // Aguardar um pouco para simular atividade
    await new Promise(r => setTimeout(r, 500));
    
    // Marcar noite
    console.log("   → Marcando rotina da noite...");
    const nightResponse = await fetch(`${BACKEND_URL}/routine/mark-complete`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ period: "night" })
    });
    
    if (!nightResponse.ok) {
      console.log(`❌ Erro ao marcar noite: ${nightResponse.status}`);
      return false;
    }
    console.log("     ✓ Noite marcada");
    
    // Verificar stats
    console.log("   → Verificando streak...");
    const statsResponse = await fetch(`${BACKEND_URL}/analysis/stats`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!statsResponse.ok) {
      console.log(`⚠️ Não conseguiu verificar stats: ${statsResponse.status}`);
      return true; // Ainda assim passou
    }
    
    const stats = await statsResponse.json();
    console.log("✅ TESTE 3 PASSOU: Rotina completa do dia marcada");
    console.log("   Streak:", stats.streakDays, "dias");
    return true;
    
  } catch (error) {
    console.error("❌ TESTE 3 FALHOU:", error.message);
    return false;
  }
}

// ============================================
// EXECUTAR TESTES
// ============================================
async function runAllTests() {
  console.log("🧪 Iniciando testes do endpoint POST /routine/mark-complete\n");
  
  const test1 = await testEndpointExists();
  const test2 = await testWithValidToken();
  const test3 = await testCompleteRoutineDay();
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 RESUMO DOS TESTES:");
  console.log(`  Teste 1 (Endpoint existe): ${test1 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log(`  Teste 2 (Com token): ${test2 === null ? "⏭️  SKIPPED" : test2 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log(`  Teste 3 (Dia completo): ${test3 === null ? "⏭️  SKIPPED" : test3 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log("=".repeat(50));
}

// Executar a partir do Node ou Browser
if (typeof window !== "undefined") {
  // Browser
  window.testRoutineEndpoint = runAllTests;
  console.log("🎯 Para rodar os testes, execute: testRoutineEndpoint()");
} else {
  // Node.js
  runAllTests().catch(console.error);
}
