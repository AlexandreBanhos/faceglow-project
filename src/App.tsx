import { lazy, Suspense } from "react";
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { LoadingProvider } from "@/shared/hooks";
import { GlobalLoadingOverlay } from "@/shared/components/loaders/GlobalLoadingOverlay";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/LoadingScreen";
import RequireAuth from "./components/RequireAuth";
import { PWAInstallModal } from "./components/PWAInstallModal";
import { usePWAInstall } from "./hooks/usePWAInstall";
import RequireAdmin from "./components/RequireAdmin";
import RequirePremium from "./components/RequirePremium";
import { UserProvider } from "./contexts/UserContext";
import { LgpdBanner } from "./components/LgpdBanner";

// ── Lazy-loaded pages — carregam apenas quando a rota for acessada ────────────
const Landing       = lazy(() => import("./pages/Landing"));
const Onboarding    = lazy(() => import("./pages/Onboarding"));
const Auth          = lazy(() => import("./pages/Auth"));
const Dashboard     = lazy(() => import("./pages/Dashboard"));
const Analyze       = lazy(() => import("./pages/Analyze"));
const Results       = lazy(() => import("./pages/Results"));
const Routine       = lazy(() => import("./pages/Routine"));
const History       = lazy(() => import("./pages/History"));
const Profile       = lazy(() => import("./pages/Profile"));
const EditProfile   = lazy(() => import("./pages/EditProfile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Premium       = lazy(() => import("./pages/Premium"));
const PixCheckout   = lazy(() => import("./pages/PixCheckout"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const BillingCancel = lazy(() => import("./pages/BillingCancel"));
const BillingPending = lazy(() => import("./pages/BillingPending"));
const AdminProducts = lazy(() => import("./pages/AdminProducts").then(m => ({ default: m.AdminProducts })));
const MeusProdutos  = lazy(() => import("./pages/MeusProdutos"));
const NotFound      = lazy(() => import("./pages/NotFound"));
const VerifyEmail   = lazy(() => import("./pages/VerifyEmail"));
const EmailConfirmed = lazy(() => import("./pages/EmailConfirmed"));
const PrivacyPolicy  = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse     = lazy(() => import("./pages/TermsOfUse"));
const ChangeEmail    = lazy(() => import("./pages/ChangeEmail"));
const DeleteAccount  = lazy(() => import("./pages/DeleteAccount"));
const Support        = lazy(() => import("./pages/Support"));
const SkincareLearn  = lazy(() => import("./pages/SkincareLearn"));
const AuthCallback   = lazy(() => import("./pages/AuthCallback"));
const AdminAfiliados = lazy(() => import("./pages/AdminAfiliados"));
const ValidarCarteirinha = lazy(() => import("./pages/ValidarCarteirinha"));
const Carteirinha        = lazy(() => import("./pages/Carteirinha"));

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function PWAInstallBridge() {
  const { shouldShow, isIOS, canPrompt, triggerPrompt, dismiss } = usePWAInstall();
  return (
    <PWAInstallModal
      isVisible={shouldShow}
      isIOS={isIOS}
      canPrompt={canPrompt}
      onInstall={triggerPrompt}
      onDismiss={() => dismiss()}
    />
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LoadingProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <GlobalLoadingOverlay />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <PWAInstallBridge />
            <LgpdBanner />
            <ErrorBoundary>
              <Suspense fallback={<LoadingScreen />}>
                <SentryRoutes>
                  <Route path="/"                 element={<Landing />} />
                  <Route path="/onboarding"       element={<Onboarding />} />
                  <Route path="/auth"             element={<Auth />} />
                  <Route path="/auth-callback"    element={<AuthCallback />} />
                  <Route path="/verify-email"     element={<VerifyEmail />} />
                  <Route path="/email-confirmed"  element={<EmailConfirmed />} />
                  <Route path="/privacidade"      element={<PrivacyPolicy />} />
                  <Route path="/termos"           element={<TermsOfUse />} />
                  <Route path="/support"          element={<Support />} />
                  <Route path="/validar/:codigo" element={<ValidarCarteirinha />} />
                  <Route path="/premium/success"  element={<BillingSuccess />} />
                  <Route path="/premium/cancel"   element={<BillingCancel />} />
                  <Route path="/premium/pending"  element={<BillingPending />} />
                  <Route path="/pix-checkout"     element={<PixCheckout />} />
                  <Route path="/analyze" element={
                    <UserProvider><Analyze /></UserProvider>
                  } />
                  <Route element={<RequireAuth />}>
                    <Route path="/dashboard"         element={<Dashboard />} />
                    <Route path="/results"           element={<Results />} />
                    <Route path="/routine"           element={<Routine />} />
                    <Route path="/history"           element={<History />} />
                    <Route path="/profile"           element={<Profile />} />
                    <Route path="/profile/edit"      element={<EditProfile />} />
                    <Route path="/profile/password"  element={<ChangePassword />} />
                    <Route path="/profile/email"     element={<ChangeEmail />} />
                    <Route path="/profile/delete"    element={<DeleteAccount />} />
                    <Route path="/premium"           element={<Premium />} />
                    <Route path="/aprenda"           element={<SkincareLearn />} />
                    <Route path="/carteirinha"       element={<Carteirinha />} />
                    <Route element={<RequireAdmin />}>
                      <Route path="/admin/products"   element={<AdminProducts />} />
                      <Route path="/admin/afiliados"  element={<AdminAfiliados />} />
                    </Route>
                    <Route element={<RequirePremium />}>
                      <Route path="/meus-produtos"   element={<MeusProdutos />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </SentryRoutes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </LoadingProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
