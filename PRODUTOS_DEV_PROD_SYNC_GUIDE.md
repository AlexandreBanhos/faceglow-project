# Produtos Não Sincronizam Entre Dev e Prod — Diagnóstico

## 🔍 Problema Identificado

Produtos cadastrados em **dev** não aparecem em **prod**. A razão é que os produtos são **armazenados POR USUÁRIO** no banco de dados:

```csharp
// Backend: backend/SkinAnalysis.Api/Program.cs, linha ~2328
var products = await dbContext.Products
    .Where(p => p.IsUserProduct && p.UserId == userId.Value)  // ← Por usuário!
    .OrderByDescending(p => p.CreatedAt)
    .ToListAsync();
```

## 📊 Fluxo de Dados de Produtos

```
Frontend (MeusProdutos.tsx)
    ↓
    1️⃣  Carrega localStorage local: getUserCatalog(userId)
    2️⃣  Chama API: fetchMyProducts(userId)
    ↓
Backend (Program.cs: /products/my GET)
    ↓
    Query no BD por: UserId == userId.Value + IsUserProduct == true
    ↓
Retorna apenas produtos DO USUÁRIO LOGADO
```

## ❌ Por Que Não Sincronizam

### Causa Raiz #1: IDs de Usuário Diferentes
Se o usuário tem IDs diferentes em dev vs prod:
- **Dev**: `userId = 550e8400-e29b-41d4-a716-446655440001`
- **Prod**: `userId = 550e8400-e29b-41d4-a716-446655440002` (mesmo usuário, ID diferente!)

**Resultado**: Produtos salvos em dev estão ligados ao ID dev, não aparecem em prod.

### Causa Raiz #2: localStorage vs Backend Mismatch
- ✓ Produtos são salvos em **localStorage** localmente
- ⚠️ API é chamada, mas pode falhar silenciosamente
- ⚠️ Se falhar, produto fica só em localStorage do dev

**Verificar em Console:**
```javascript
// Em Dev
localStorage.getItem('faceglow-user-catalog-{userId}')  // Pode ter produtos!

// Em Prod (outro userId)
localStorage.getItem('faceglow-user-catalog-{diferentUserId}')  // Vazio!
```

### Causa Raiz #3: Diferentes Contas/Auth
Se você logou em:
- **Dev** com conta A
- **Prod** com conta B

Então são usuários completamente diferentes no banco.

---

## 🔧 Como Verificar o Problema

### 1. Verificar localStorage
**Em Dev:**
```javascript
// Console do navegador
Object.keys(localStorage)
  .filter(k => k.includes('faceglow-user-catalog'))
// Deve listar: faceglow-user-catalog-{userId}

localStorage.getItem('faceglow-user-catalog-{userId}')
// Deve mostrar array com seus produtos
```

**Em Prod:**
```javascript
// Mesmo comando
// Se mostrar DADOS DIFERENTES ou vazio = usuários diferentes
```

### 2. Verificar IDs de Usuário
**Em Dev (Console):**
```javascript
// Veja qual userId está sendo usado
JSON.parse(localStorage.getItem('sb-hemoqtqlczjgtrfibudj-auth-token') || '{}')
  ?.user?.id
// Anota este ID
```

**Em Prod (Console):**
```javascript
// Mesmo comando
// Compare com o ID de dev
// Se forem DIFERENTES = encontrou o problema!
```

### 3. Chamar API Diretamente
**Em Dev (Console):**
```javascript
const token = localStorage.getItem('supabase.auth.token');
fetch('http://localhost:5172/products/my', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(console.log)
// Mostra array de seus produtos?
```

**Em Prod:**
```javascript
// Mesmo comando em https://faceglow.vercel.app
// Prod mostra os mesmos produtos?
```

---

## ✅ Soluções

### Solução #1: Se o Problema é UserId Diferente
**PROBLEMA**: Você tem contas Supabase diferentes em dev/prod.

**SOLUÇÃO**: 
1. Alinhar a autenticação (mesma conta em ambos)
2. OU fazer migração manual de dados
3. OU aceitar que cada ambiente tem dados separados (comportamento esperado)

### Solução #2: Se Produtos Ficam em localStorage Sem Sincronizar
**PROBLEMA**: Backend não está sendo chamado ou falha silenciosamente.

**CÓDIGO (em MeusProdutos.tsx, linha ~54):**
```typescript
try {
  const remote = await fetchMyProducts(user.id);
  setProducts(remote);  // ← Se falhar aqui, fica em localStorage
  console.debug("[MeusProdutos] ✓ Produtos remotos carregados", remote);
} catch (error) {
  console.warn("[MeusProdutos] ⚠️ Erro ao carregar remotos:", error);
  // Fallback para localStorage - OK!
}
```

**Se console mostra erro**: Verificar logs do backend para ver se há erro na query.

### Solução #3: Adicionar Logging e Sincronização Explícita
**RECOMENDAÇÃO**: Adicionar função para sincronizar produtos explicitamente:

```typescript
// src/lib/userProducts.ts - Nova função
export const syncMyProducts = async (userId?: string): Promise<UserCatalogProduct[]> => {
  console.debug("[syncMyProducts] Iniciando sincronização...", { userId });
  
  try {
    const remote = await fetchMyProducts(userId);
    console.debug("[syncMyProducts] ✓ Produtos remotos carregados", {
      count: remote.length,
      products: remote.map(p => p.name)
    });
    
    if (userId) saveUserCatalog(remote, userId);
    return remote;
  } catch (error) {
    console.error("[syncMyProducts] ✗ Erro ao sincronizar", error);
    throw error;
  }
};
```

---

## 🚀 Checklist de Debug

- [ ] **Console em Dev**: Ver userId
- [ ] **Console em Prod**: Ver userId (comparar)
- [ ] **Prod localStorage**: Checar se tem dados (deve estar vazio se usuário diferente)
- [ ] **Prod API Call**: `/products/my` retorna produtos?
- [ ] **Login**: Usar MESMA conta em dev e prod
- [ ] **Rede**: Ver requisições em Network tab (dev/prod)

---

## 📝 Comportamento Esperado

**Correto:**
1. Usuário cria produto em Dev
2. Produto salvo em Dev localStorage + Dev Backend
3. Troca para Prod (outro usuário ou mesma conta)
4. Vê produtos diferentes (ou vazios se primeiro acesso)

**Isso é esperado!** Dev e Prod têm dados separados porque:
- Cada ambiente usa seu próprio banco Supabase
- Autenticação pode ser diferente
- IDs de usuário são diferentes por padrão

---

## 🔑 TL;DR

**Por que não aparecem em prod:**
- Dev e Prod usam usuários diferentes (IDs diferentes no Supabase)
- Produtos são sempre filtrados por `UserId`
- Se UserID diferente = nenhum produto é retornado

**O que fazer:**
1. Use mesma conta em dev/prod para testar sincronização
2. OU aceite que cada ambiente tem dados separados (correto!)
3. OU implemente migração de dados manual se necessário
