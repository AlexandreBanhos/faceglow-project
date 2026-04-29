# Análise de Persistência de Rotina

## 🔍 Status Atual

### Endpoints Implementados
1. **GET** `/analysis/{id:guid}/routine/custom` - Carrega customizações salvas
2. **POST** `/analysis/{id:guid}/routine/save` - Salva customizações no banco

### Fluxo de Dados

```
Frontend State (React) 
    ↓
localStorage (Fallback local)
    ↓
Auto-save (Debounce 2s)
    ↓
Backend API POST `/routine/save`
    ↓
DB (Routines.CustomizationsJson)
```

### Estrutura de Customizações Salvas

```json
{
  "selectedByItem": {
    "morning::titulo_do_item": "produto_selecionado"
  },
  "customSteps": [
    {
      "id": "uuid",
      "period": "morning|night",
      "stepLabel": "Tipo",
      "productName": "Nome",
      "imageUrl": "url",
      "note": "anotação"
    }
  ],
  "routineOrder": {
    "morning": ["key1", "key2"],
    "night": ["key1", "key2"]
  },
  "schedule": {
    "daysByItem": {
      "morning::item_key": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    },
    "checkedByDayItem": {}
  },
  "myProducts": {
    "morning::item_key": {
      "name": "Produto Custom",
      "imageUrl": "url"
    }
  }
}
```

---

## ⚠️ Problemas Identificados

### 1. **Falta de Sincronização Explícita**
- ❌ `selectedOptionByItem` **NÃO é salvo** em localStorage antes do auto-save
- ❌ Se o backend falhar, `selectedOptionByItem` se perde quando a página recarrega
- ⚠️ Outras customizações dependem de localStorage, mas essa não

**Código:**
```typescript
// Linha 544-556 (Routine.tsx)
const customizationsPayload = JSON.stringify({
  selectedByItem: selectedOptionByItem,  // ← Vem do state React
  customSteps: customStepsData,          // ← Vem de localStorage
  routineOrder: routineOrderData,        // ← Vem de localStorage
  schedule: scheduleData,                // ← Vem de localStorage
  myProducts: customProductByItem,       // ← Vem do state React
});
```

**Solução:**
```typescript
// Sincronizar selectedByItem com localStorage após cada mudança
useEffect(() => {
  localStorage.setItem(
    getSelectionStorageKey(analysis?.id),
    JSON.stringify(selectedOptionByItem)
  );
}, [selectedOptionByItem, analysis?.id]);

// Idem para customProductByItem
useEffect(() => {
  localStorage.setItem(
    getMyProductsStorageKey(analysis?.id),
    JSON.stringify(customProductByItem)
  );
}, [customProductByItem, analysis?.id]);
```

---

### 2. **Falta de Feedback Visual de Salvamento**
- ❌ Usuário não sabe se salvou com sucesso
- ❌ Sem indicador de "salvando..." ou erro
- ❌ Sem retry automático em caso de falha

**Recomendação:** Adicionar:
```typescript
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
const [lastSaveError, setLastSaveError] = useState<string | null>(null);
```

---

### 3. **Endpoint GET Retorna 404 em Novas Rotinas**
- ✅ Comportamento esperado: "Nenhuma customização salva"
- ⚠️ Mas deve garantir que localStorage é hydratado corretamente

**Verificação necessária:** Garantir que na primeira visita, o estado inicial é sempre baseado em recomendações.

---

### 4. **Risco de Corrupção de Dados**
- ❌ Sem validação na desserialização do `CustomizationsJson`
- ❌ Se algum campo estiver malformado, pode quebrar toda a rotina
- ❌ Sem versionamento do schema

**Recomendação:** Adicionar validação com `zod` ou `io-ts`:

```typescript
const CustomizationsSchema = z.object({
  selectedByItem: z.record(z.string()),
  customSteps: z.array(CustomStepSchema),
  routineOrder: z.object({ morning: z.array(z.string()), night: z.array(z.string()) }),
  schedule: z.object({
    daysByItem: z.record(z.array(z.string())),
    checkedByDayItem: z.record(z.boolean())
  }),
  myProducts: z.record(z.object({ name: z.string(), imageUrl: z.string().optional() }))
});
```

---

### 5. **Sem Migração de Dados Antigos**
- ⚠️ Se alterar schema de customizações, dados antigos se quebram
- ❌ Sem fallback gracioso

**Recomendação:** Implementar função de migração:
```typescript
const migrateCustomizations = (old: unknown, version: number): Customizations => {
  if (version === 1) {
    // Handle v1 schema → v2 schema
    return transformFromV1(old);
  }
  return old as Customizations;
};
```

---

## ✅ Checklist de Correções

### Imediato (P0)
- [ ] **Sincronizar `selectedOptionByItem` com localStorage**
  - Arquivo: `src/pages/Routine.tsx`
  - Adicionar useEffect para persistir após cada mudança

- [ ] **Sincronizar `customProductByItem` com localStorage**
  - Arquivo: `src/pages/Routine.tsx`
  - Adicionar useEffect para persistir após cada mudança

- [ ] **Validar desserialização no backend**
  - Arquivo: `backend/SkinAnalysis.Api/Program.cs` linha ~932
  - Adicionar try-catch mais específico com logging

### Curto Prazo (P1)
- [ ] **Adicionar feedback visual de salvamento**
  - Toast com status: "Salvando...", "✓ Salvo", "✗ Erro"
  - Indicador visual no card da rotina

- [ ] **Implementar retry automático**
  - Tentar salvar novamente após 5s se falhar primeira vez
  - Máximo 3 tentativas antes de avisar usuário

- [ ] **Adicionar endpoint DELETE**
  - `DELETE /analysis/{id}/routine/{stepId}` para deletar passos customizados
  - Atualizar status de `isActive = false` ao invés de deletar

### Médio Prazo (P2)
- [ ] **Adicionar validação com `zod`**
  - Validar schema ao carregar e ao salvar
  - Garantir type safety

- [ ] **Implementar versionamento de schema**
  - Adicionar `version` field ao `CustomizationsJson`
  - Criar funções de migração

- [ ] **Adicionar testes**
  - Testes E2E de salvar/carregar rotina
  - Testes de falha de rede

---

## 🔧 Implementação Recomendada

### 1. Sincronizar Estados com localStorage

**Arquivo:** `src/pages/Routine.tsx`

```typescript
// Auto-persist selectedOptionByItem
useEffect(() => {
  localStorage.setItem(
    getSelectionStorageKey(analysis?.id),
    JSON.stringify(selectedOptionByItem)
  );
}, [selectedOptionByItem, analysis?.id]);

// Auto-persist customProductByItem
useEffect(() => {
  localStorage.setItem(
    getMyProductsStorageKey(analysis?.id),
    JSON.stringify(customProductByItem)
  );
}, [customProductByItem, analysis?.id]);
```

### 2. Adicionar Status de Salvamento

```typescript
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

// Modificar o auto-save effect
useEffect(() => {
  if (!analysis?.id) return;

  const saveTimeout = setTimeout(async () => {
    try {
      setSaveStatus('saving');
      
      // ... collect customizations ...
      
      const result = await saveRoutineCustomizations(analysis.id, customizationsPayload);
      
      if (result.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      setSaveStatus('error');
    }
  }, 2000);

  return () => clearTimeout(saveTimeout);
}, [/* deps */]);

// Renderizar indicador
<div className={`status-indicator status-${saveStatus}`}>
  {saveStatus === 'saving' && <Loader2 className="animate-spin" />}
  {saveStatus === 'success' && <CheckCircle2 className="text-green-500" />}
  {saveStatus === 'error' && <AlertTriangle className="text-red-500" />}
</div>
```

### 3. Adicionar Endpoints de Edição/Exclusão

**Backend:** `Program.cs`

```csharp
// DELETE custom step
app.MapDelete("/analysis/{id:guid}/routine/step/{stepId:guid}", async (
    Guid id,
    Guid stepId,
    ClaimsPrincipal user,
    AppDbContext dbContext,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var routine = await dbContext.Routines
        .Where(r => r.BasedOnAnalysisId == id && r.UserId == userId.Value)
        .FirstOrDefaultAsync(cancellationToken);

    if (routine is null)
        return Results.NotFound();

    try {
        var customizations = JsonSerializer.Deserialize<CustomizationsDto>(
            routine.CustomizationsJson ?? "{}"
        ) ?? new CustomizationsDto();

        // Remove step from customSteps
        customizations.CustomSteps?.RemoveAll(cs => cs.Id == stepId);

        routine.CustomizationsJson = JsonSerializer.Serialize(customizations);
        routine.UpdatedAtUtc = DateTime.UtcNow;
        
        dbContext.Routines.Update(routine);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Results.Ok(new { message = "Passo deletado com sucesso." });
    }
    catch (Exception ex) {
        logger.LogError(ex, "[DeleteRoutineStep] Erro");
        return Results.Problem("Erro ao deletar passo.");
    }
})
.RequireAuthorization();

// PATCH custom step
app.MapPatch("/analysis/{id:guid}/routine/step/{stepId:guid}", async (
    Guid id,
    Guid stepId,
    PatchRoutineStepRequest request,
    ClaimsPrincipal user,
    AppDbContext dbContext,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    // Similar logic: find, update, save
});
```

---

## 📊 Matriz de Teste

| Cenário | Esperado | Status |
|---------|----------|--------|
| Salvar rotina com produtos | ✓ Produtos persistem após reload | ❓ Testar |
| Perder conexão durante save | ✓ Dados em localStorage se recuperam | ❓ Testar |
| Editar passo customizado | ✓ Mudança refletida imediatamente | ❓ Testar |
| Deletar passo customizado | ✓ Removido da rotina e backend | ❓ Testar |
| Adicionar passo novo | ✓ Adicionado com período correto | ❓ Testar |
| Trocar período (manhã ↔ noite) | ✓ Passo move corretamente | ❓ Testar |
| Acessar rotina em prod | ✓ Customizações carregadas | ❓ Testar |

---

## 🚀 Próximos Passos

1. Implementar P0 (sincronização com localStorage)
2. Testar fluxo completo em dev
3. Adicionar testes E2E
4. Deploy em staging para QA
5. Deploy em prod
