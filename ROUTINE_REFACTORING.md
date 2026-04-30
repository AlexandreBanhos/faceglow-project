# Refatoração do Sistema de Rotinas — FaceGlow

**Data:** 2026-04-30  
**Status:** Fase 1 em execução, Fase 2 planejada

---

## Diagnóstico

### Problemas críticos identificados

| Problema | Causa | Impacto |
|----------|-------|---------|
| Imagens não carregam | Lookup por nome de produto (frágil) | Descredibiliza o app |
| Período errado nos passos | Gemini tag `(morning)` em itens do `night` | Rotina noturna mostra itens incorretos |
| Duplicidade de produtos | `buildRoutineFromRecommendations` adiciona tudo a manhã E noite | "Turbine sua rotina" repete itens |
| Edição não persiste | `customizations_json` JSONB com keys por nome de produto | Qualquer diferença de nome quebra o mapeamento |
| Produtos custom sem imagem | `override_image_url` com URL externa — pode expirar/dar 403 | Imagens quebradas para produtos do usuário |
| Tabelas mortas | `routine`, `routine_step`, `user_products`, `user_recommendations_cache` | Confusão e peso no schema |
| Endpoints v2 quebrados | Referenciam `skin_analysis` (dropada) | Crash em runtime se chamados |

### Arquitetura atual (o que roda)

```
analysis.routine_json (JSONB text)
  └── ["Categoria: Produto (recorrência)"]  ← string parsing no frontend
      └── lookup por nome → recommendations.image_url  ← FRÁGIL

analysis.customizations_json (JSONB blob)
  └── selectedByItem: {"morning::nome": "morning::nome::tier"}
  └── myProducts: {"morning::nome": {name, imageUrl}}  ← URL externa
  └── customSteps, routineOrder, schedule
```

### Arquitetura proposta (Fase 1 + 2)

```
analysis_routine_steps (tabela estruturada)
  ├── analysis_id FK → analysis(id)
  ├── product_id FK → products(id)      ← imagem sempre disponível
  ├── recommendation_id FK → recommendations(id)
  ├── period: 'morning' | 'night'
  ├── step_order, category, recurrence
  ├── is_extra, is_active, is_user_added
  ├── selected_tier: 'best'|'second'|'budget'
  ├── override_product_name (produto do usuário)
  └── override_image_url (via upload para Supabase Storage)
```

---

## Fase 1 — Implementada (2026-04-30)

### 1.1 Banco de dados

- [x] Drop `routine`, `routine_step`, `user_products` (join table), `user_recommendations_cache`
- [x] Criar `analysis_routine_steps` com FK para `products` e `recommendations`
- [x] RLS policies para a nova tabela
- [x] Índices adequados

### 1.2 Backend

- [x] Fix `ParseRoutineJson` — normalizar `(morning)/(night)` como tag de período → `daily`
- [x] Remover endpoints v2 quebrados (`/v2/routines/*`, `/v2/analysis/routine`)
- [x] `GET /analysis/{id}/steps` — retorna passos estruturados com imagens (população lazy)
- [x] `POST /analysis/{id}/steps` — adicionar passo customizado
- [x] `PATCH /analysis/{id}/steps/{stepId}` — atualizar passo (tier, produto override)
- [x] `DELETE /analysis/{id}/steps/{stepId}` — soft delete

### 1.3 Frontend

- [x] Novas funções em `analysisClient.ts`: `fetchRoutineSteps`, `addRoutineStep`, `updateRoutineStep`, `deleteRoutineStep`
- [x] Fix `getAccessTokenWithWait` duplicado (já feito anteriormente)

---

## Fase 2 — Planejada (próxima sprint)

### 2.1 Routine.tsx — Migrar de string-parsing para API estruturada

**Arquivo:** `src/pages/Routine.tsx`

**Mudanças:**

1. **Substituir `routineItems` (derivado de `analysis.routine`)** por dados da API `GET /analysis/{id}/steps`
2. **Remover toda a lógica de string parsing**: `parseRoutineStep`, `buildRoutineFromRecommendations`, `buildInitialSchedule`
3. **Imagens**: vêm diretamente do step (`step.imageUrl` ou `step.overrideImageUrl`) — sem lookup por nome
4. **Adicionar passo**: `POST /analysis/{id}/steps` em vez de manipular `customSteps` no JSONB
5. **Editar passo**: `PATCH /analysis/{id}/steps/{stepId}` com `selectedTier` e `overrideProductName`
6. **Deletar passo**: `DELETE /analysis/{id}/steps/{stepId}` em vez de filtrar array local
7. **Salvar customizações**: substituir `saveRoutineCustomizations` (JSONB blob) por calls individuais de PATCH

**Novo RoutineItem type:**
```typescript
type RoutineStep = {
  id: string;
  analysisId: string;
  period: 'morning' | 'night';
  stepOrder: number;
  category: string;
  productId: string | null;
  recommendationId: string | null;
  productName: string;
  imageUrl: string | null;
  recurrence: string;
  isExtra: boolean;
  isActive: boolean;
  isUserAdded: boolean;
  selectedTier: 'best' | 'second' | 'budget' | null;
  overrideProductName: string | null;
  overrideImageUrl: string | null;
};
```

### 2.2 Dashboard.tsx — Usar steps estruturados

- Substituir `RoutineSummaryCard` para buscar imagens de `analysis_routine_steps`
- Imagens dos produtos no card de rotina virão sempre de `products.image_url`

### 2.3 MeusProdutos.tsx — Produtos do usuário com IDs

- Ao adicionar produto via `POST /products/my`, retornar o `product_id`
- Quando o usuário "usar" um produto do catálogo pessoal na rotina:
  - `PATCH /analysis/{id}/steps/{stepId}` com `overrideProductName` + `product_id` do produto pessoal
  - `override_image_url` = URL da foto do produto pessoal (upload para Supabase Storage)

### 2.4 Gemini prompt fix

- Remover recorrência `(morning)/(night)` do prompt de geração de rotina
- Usar apenas: `(daily)`, `(as_needed)`, `(2x_semana)`, `(3x_semana)`, `(weekly)`
- Separar claramente o conceito de período (manhã/noite) do conceito de recorrência

---

## Fase 3 — Longo prazo

### 3.1 Imagens via Supabase Storage (não URLs externas)

- Ao salvar produto customizado pelo usuário: upload da imagem para `product-images` bucket
- `override_image_url` sempre é URL do Supabase (não URL externa)
- Elimina 403/expiração de CDNs externos

### 3.2 Matching produto → catálogo

- Quando Gemini sugere "CeraVe Facial Moisturizing Lotion", buscar em `products` por nome similar
- Se encontrar match, setar `product_id` no step → imagem sempre disponível
- Background job para re-processar análises antigas e preencher `product_id` quando possível

### 3.3 Cache de imagens de produtos

- `products.image_url` = URL do Supabase Storage (não URL externa)
- Migrar imagens dos produtos do catálogo para Supabase (elimina dependência de CDNs externos)

---

## Schema da nova tabela (referência)

```sql
CREATE TABLE public.analysis_routine_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analysis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('morning', 'night')),
  step_order INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  recurrence TEXT NOT NULL DEFAULT 'daily',
  is_extra BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_user_added BOOLEAN NOT NULL DEFAULT false,
  selected_tier TEXT CHECK (selected_tier IN ('best', 'second', 'budget') OR selected_tier IS NULL),
  override_product_name TEXT,
  override_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Notas de implementação

### Recorrência normalizada (não usar período como recorrência)

| Valor atual (Gemini) | Valor normalizado |
|---------------------|-------------------|
| `morning` | `daily` |
| `night` | `daily` |
| `daily` | `daily` |
| `as_needed` | `as_needed` |
| `2x_semana` | `2x_semana` |
| `3x_semana` | `3x_semana` |
| `weekly` | `weekly` |
| qualquer outro | `daily` |

### Prioridade de imagem no step (ordem de resolução)

1. `override_image_url` — produto customizado pelo usuário
2. `product.image_url` (via `product_id`) — produto do catálogo
3. `recommendation.image_url` (via `recommendation_id`) — imagem da recomendação
4. Fallback por categoria (Unsplash ou placeholder local)

### Endpoint summary (Fase 1)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/analysis/{id}/steps` | Listar passos com imagens (popula lazy) |
| POST | `/analysis/{id}/steps` | Adicionar passo customizado |
| PATCH | `/analysis/{id}/steps/{stepId}` | Atualizar tier/produto/imagem |
| DELETE | `/analysis/{id}/steps/{stepId}` | Soft delete (is_active = false) |
