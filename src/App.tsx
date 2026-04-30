import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { LoadingProvider } from "@/shared/hooks";
import { GlobalLoadingOverlay } from "@/shared/components/loaders/GlobalLoadingOverlay";
import { ScrollToTop } from "@/components/ScrollToTop";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Results from "./pages/Results";
import Routine from "./pages/Routine";
import History from "./pages/History";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import ChangePassword from "./pages/ChangePassword";
import Premium from "./pages/Premium";
import PixCheckout from "./pages/PixCheckout";
import BillingSuccess from "./pages/BillingSuccess";
import BillingCancel from "./pages/BillingCancel";
import BillingPending from "./pages/BillingPending";
import { AdminProducts } from "./pages/AdminProducts";
import MeusProdutos from "./pages/MeusProdutos";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import { UserProvider } from "./contexts/UserContext";
import Debug from "./pages/Debug";
import VerifyEmail from "./pages/VerifyEmail";
import EmailConfirmed from "./pages/EmailConfirmed";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LoadingProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <GlobalLoadingOverlay />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/debug" element={<Debug />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/email-confirmed" element={<EmailConfirmed />} />
            <Route path="/premium/success" element={<BillingSuccess />} />
            <Route path="/premium/cancel" element={<BillingCancel />} />
            <Route path="/premium/pending" element={<BillingPending />} />
            <Route path="/pix-checkout" element={<PixCheckout />} />
            <Route
              path="/analyze"
              element={(
                <UserProvider>
                  <Analyze />
                </UserProvider>
              )}
            />
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/results" element={<Results />} />
              <Route path="/routine" element={<Routine />} />
              <Route path="/history" element={<History />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/profile/password" element={<ChangePassword />} />
              <Route path="/premium" element={<Premium />} />
              <Route element={<RequireAdmin />}>
                <Route path="/admin/products" element={<AdminProducts />} />
              </Route>
              <Route path="/meus-produtos" element={<MeusProdutos />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </LoadingProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
