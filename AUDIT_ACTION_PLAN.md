# FaceGlow — Plano de Ação Pós-Auditoria

**Gerado em:** 2026-04-30  
**Executado em:** 2026-04-30  
**Status geral:** ✅ Todas as fases automatizáveis concluídas  
**Nota:** Rotação de credenciais está EXCLUÍDA — fazer quando tudo estiver 100% validado em produção.

---

## Legenda

- `[x]` Concluído
- `[ ]` Pendente (ação manual)
- `[~]` Não aplicável / aceito como está

---

## FASE 1 — Banco de Dados (Supabase)

### Migrations aplicadas

| Versão | Nome | Status |
|--------|------|--------|
| 20260430182118 | fix_security_functions_and_policies | ✅ |
| 20260430182123 | remove_duplicate_indexes | ✅ |
| 20260430182154 | fix_storage_listing_policy | ✅ |
| 20260430182217 | fix_schema_orphans_and_jsonb_types | ✅ |
| 20260430182944 | fix_remaining_security_warnings | ✅ |
| 20260430183054 | fix_rls_performance_and_missing_index | ✅ |

### 1.1 Segurança Crítica

- [x] **F1.1.1** — Revogar `EXECUTE` de `handle_new_user()` para `anon`, `authenticated` e `PUBLIC`
- [x] **F1.1.2** — Adicionar `SET search_path = public` na função `handle_new_user()`
- [x] **F1.1.3** — Revogar `EXECUTE` de `rls_auto_enable()` para `anon`, `authenticated` e `PUBLIC`
- [x] **F1.1.4** — Adicionar policy `SELECT` para tabela `recommendations` (authenticated)
- [x] **F1.1.5** — Converter policy `analysis_owner` de `{public}` para `{authenticated}`
- [x] **F1.1.6** — Converter policy `subscriptions_owner` de `{public}` para `{authenticated}`
- [x] **F1.1.7** — Converter policy `user_credits_owner` de `{public}` para `{authenticated}`
- [x] **F1.1.8** — Converter policy `routine_owner` de `{public}` para `{authenticated}`
- [x] **F1.1.9** — Converter policy `routine_completions_owner` de `{public}` para `{authenticated}`
- [x] **F1.1.10** — Revogar todos os privilégios de `anon` de tabelas sensíveis
- [x] **F1.1.11** — Bloquear `__EFMigrationsHistory` com policy RESTRICTIVE deny-all
- [x] **F1.1.12** — Remover broad SELECT policy do storage bucket `product-images`
- [ ] **F1.1.13** — Habilitar Leaked Password Protection (**ação manual no Dashboard**)
  - Supabase Dashboard → Auth → Password Security → Enable leaked password protection

### 1.2 Limpeza de Políticas RLS

- [x] **F1.2.1** — Removida policy duplicada `RecLogs: only self` de `recommendation_logs`
- [x] **F1.2.2** — Removida policy duplicada `Routine: only self` de `routine`
- [x] **F1.2.3** — Removida policy duplicada `RoutineStep: only self` de `routine_step`
- [x] **F1.2.4** — Removida policy duplicada `UserProducts: only self` de `user_products`
- [x] **F1.2.5** — Removida policy duplicada `SkinAnalysis: only self` (tabela dropada)
- [x] **F1.2.6** — Removida policy duplicada `UserRecCache: only self`
- [x] **F1.2.7** — Removida policy duplicada `user_credits_self_read`

### 1.3 Limpeza de Índices

- [x] **F1.3.1** — Removido `idx_products_actives_gin` (duplicata)
- [x] **F1.3.2** — Removido `idx_products_concerns_gin` (duplicata)
- [x] **F1.3.3** — Removido `idx_products_skin_types_gin` (duplicata)
- [x] **F1.3.4** — Removido `idx_user_credits_user_id` (redundante — user_id é PK)
- [x] **F1.3.5** — Removido `ix_user_credits_user_id` (redundante — user_id é PK)
- [x] **F1.3.6** — Removido `ix_analysis_user_id` (coberto pelo índice composto)
- [x] **F1.3.7** — Adicionado `ix_routine_analysis_id` para nova FK

### 1.4 Estrutura de Schema

- [x] **F1.4.1** — `analysis.customizations_json` convertido de TEXT para JSONB
- [x] **F1.4.2** — `analysis.routine_json` convertido de TEXT para JSONB
- [x] **F1.4.3** — 3 análises órfãs deletadas (cascade em recommendations)
- [x] **F1.4.4** — FK `analysis.user_id → users(id) CASCADE` adicionada
- [x] **F1.4.5** — FK `subscriptions.user_id → users(id) CASCADE` adicionada
- [x] **F1.4.6** — FK `routine.analysis_id → analysis(id) RESTRICT` adicionada (corrigindo apontamento para skin_analysis)
- [x] **F1.4.7** — Tabela legada `skin_analysis` dropada (0 rows, sem uso)
- [x] **F1.4.8** — Coluna `analysis.updated_at_utc` adicionada com trigger automático

### 1.5 Otimização RLS (Performance)

- [x] **F1.5.1** — Todas as policies atualizadas para `(SELECT auth.uid())` — evita re-avaliação por linha
- [x] **F1.5.2** — `set_updated_at()` corrigido com `SET search_path = public`

---

## FASE 2 — Frontend (React/TypeScript)

### Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/adminCache.ts` | ✅ Cache de admin centralizado (elimina estado compartilhado entre sessões) |
| `src/components/RequireAdmin.tsx` | ✅ Guard de rota para área admin |

### Arquivos modificados

| Arquivo | Alteração | Status |
|---------|-----------|--------|
| `src/lib/auth.ts` | Import adminCache + signOut limpa cache + `getAccessTokenWithWait` retorna null em timeout | ✅ |
| `src/lib/analysisClient.ts` | Removido `getAccessTokenWithWait` local, importa de auth | ✅ |
| `src/lib/billing.ts` | Removido `getAccessTokenWithWait` local, importa de auth; console.log sem emojis corrompidos | ✅ |
| `src/hooks/useIsAdmin.ts` | Usa `adminCache` centralizado em vez de variável de módulo local | ✅ |
| `src/hooks/useUserStatus.ts` | `userId` extraído corretamente do payload JWT (sub claim) | ✅ |
| `src/App.tsx` | Rota `/admin/products` protegida por `RequireAdmin` | ✅ |

---

## FASE 3 — Backend (.NET 8)

| Arquivo | Alteração | Status |
|---------|-----------|--------|
| `Program.cs` | Removido bloco DDL de startup (CREATE TABLE + INSERT migrations) | ✅ |
| `Program.cs` | `/health/db` requer auth + verificação de admin | ✅ |
| `Program.cs` | `/test-db` requer auth | ✅ |

---

## FASE 4 — Ações Manuais Pendentes

- [ ] **M1** — Habilitar "Leaked Password Protection"
  - Supabase Dashboard → Auth → Password Security → Enable

- [ ] **M2** — Rotação de credenciais (fazer após validar tudo em produção)
  - [ ] Senha do banco PostgreSQL (atualizar `.env` e variáveis do servidor)
  - [ ] Gemini API Key
  - [ ] Stripe Secret Key + Webhook Secret
  - [ ] MercadoPago Access Token

---

## Estado dos Advisors Supabase (pós-execução)

### Segurança
| Aviso | Status |
|-------|--------|
| `rls_enabled_no_policy` em `recommendations` | ✅ Resolvido — policy adicionada |
| `rls_enabled_no_policy` em `__EFMigrationsHistory` | ✅ Resolvido — policy RESTRICTIVE deny-all |
| `function_search_path_mutable` em `handle_new_user` | ✅ Resolvido — SET search_path = public |
| `function_search_path_mutable` em `set_updated_at` | ✅ Resolvido |
| `anon_security_definer_function_executable` | ✅ Resolvido — REVOKE PUBLIC |
| `authenticated_security_definer_function_executable` | ✅ Resolvido — REVOKE PUBLIC |
| `public_bucket_allows_listing` em `product-images` | ✅ Resolvido — policy removida |
| `auth_leaked_password_protection` | ⏳ Pendente ação manual |

### Performance
| Aviso | Status |
|-------|--------|
| `auth_rls_initplan` em todas as tabelas | ✅ Resolvido — `(SELECT auth.uid())` |
| `unindexed_foreign_keys` em `routine.analysis_id` | ✅ Resolvido — índice adicionado |
| `unused_index` (INFO) | 🟡 Aceito — tabelas ainda vazias em dev; índices corretos para produção |

---

## Verificações Pós-Deploy

- [ ] Testar login e logout (verificar que cache admin é limpo)
- [ ] Testar análise completa: upload → processamento → resultado
- [ ] Acessar `/admin/products` como usuário normal → deve redirecionar para `/dashboard`
- [ ] Acessar `/admin/products` como admin → deve funcionar normalmente
- [ ] Testar billing: Stripe checkout e PIX (MercadoPago)
- [ ] Testar `/health/db` sem auth → deve retornar 401
- [ ] Testar `/health/db` com admin → deve retornar status do banco
- [ ] Confirmar que `routine_json` e `customizations_json` ainda salvam/carregam corretamente (JSONB)
