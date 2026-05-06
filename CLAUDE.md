# FaceGlow — Contexto do Projeto

## Stack
- **Frontend**: React + TypeScript + Vite + Tailwind + shadcn/ui + Framer Motion
- **Backend**: .NET 8 Minimal API (C#) — `backend/SkinAnalysis.Api/`
- **DB**: PostgreSQL via Supabase (EF Core + Dapper para queries críticas)
- **Auth**: Supabase JWT (validado no backend via `JwtBearer`)
- **Storage**: Supabase Storage (URLs públicas permanentes — não signed)
- **AI**: Gemini Flash (`GeminiAnalysisService`) com CTS 30s
- **Pagamentos**: Stripe (cartão) + MercadoPago (PIX)

## URLs locais
- Frontend: `http://localhost:8080` (`vite.config.ts` porta 8080)
- Backend: `http://localhost:5172`

## Convenções de código

### Backend
- Endpoints em `Program.cs` (Minimal API, sem controllers)
- DB: `AppDbContext` (EF Core) para leituras; Dapper para UPSERTs críticos
- Connection pool: sempre usar `dbContext.Database.OpenConnectionAsync()`, nunca `connection.OpenAsync()` direto
- Serviços em `Services/` — injetados como `Scoped`
- Background tasks usam `IServiceScopeFactory` para criar escopo próprio
- `AnalysisJobStore` — store in-memory para jobs assíncronos de análise (evicção 10min)
- `RoutineGeneratorService` — engine de geração de rotinas (template + scoring + slots)

### Frontend
- Rotas em `src/pages/`
- Lib em `src/lib/` (api.ts, auth.ts, analysis.ts, analysisClient.ts, billing.ts, storage.ts, errors.ts)
- `apiRoutes` definido em `src/lib/api.ts`
- `normalizeAnalysis()` em `analysis.ts` converte resposta da API para `AnalysisResponse`
- Cache in-memory em `analysisClient.ts` (180s TTL) — invalidar com `invalidateAnalysisCache()` após nova análise
- Imagens: sempre usar URL pública do Supabase Storage (não signed URL)
- **Premium Check**: `RequireAuth` carrega status ao logar via `useUserStatus()` hook e armazena em `UserContext` (Context na raiz das rotas protegidas)

#### Premium Status (Contexto)
- `useIsPremium()` — Hook para ler `isPremium`, `creditsRemaining`, `subscriptionStatus`
- `useUserContext()` — Acesso direto ao contexto (para casos avançados)
- `UserProvider` — Wrapper obrigatório (provido por `RequireAuth`)
- Atualização: fetch de `/billing/status` + `/analysis/credits` em paralelo ao autenticar; re-fetch automático a cada 5min
- Use `useIsPremium()` em páginas para renderizar ofertas ou telas premium (ex: `<PremiumOfferBanner />`)
- Componente exemplo: `src/components/PremiumOfferBanner.tsx`

## Fluxo de análise (async)
1. `POST /analysis` → retorna `202 { id, status: "processing" }` em <1s
2. Background: IA (Gemini, 30s max) + routine engine + DB writes
3. Frontend: `LoadingAnalysisView` polling `GET /analysis/{id}/status` a cada 2s
4. Resultado via `onResult(result)` callback → navega para `/results`

## Créditos
- Tabela `user_credits` — `credits_remaining` decrementado no POST /analysis antes do background job
- `GET /analysis/credits` — auto-init 5 créditos se novo usuário
- Planos: `credits` (R$5 = 1 crédito), `monthly` (R$29,90 = 5 créditos)

## Billing
- Stripe: cartão de crédito — webhook em `/billing/webhook/stripe`
- MercadoPago: PIX — webhook em `/billing/webhook/mercadopago`
- `BillingService.SaveSubscriptionAsync()` usa Dapper UPSERT com `ON CONFLICT (external_reference)`

## Regras de resposta
- Mostrar apenas o trecho alterado (não repetir código inalterado)
- Sem comentários no código salvo se pedido
- Respostas curtas e diretas
- Português

# Na página
import { useIsPremium } from "@/hooks/useIsPremium";
import { PremiumOfferBanner } from "@/components/PremiumOfferBanner";

export default function AnalysisPage() {
  const { isPremium, creditsRemaining, isLoading, canAnalyze } = useIsPremium();

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <PremiumOfferBanner />
      {canAnalyze ? <AnalysisForm /> : <NeedCreditsMessage />}
      {!isPremium && <OfferBanner />}
    </>
  );
}
