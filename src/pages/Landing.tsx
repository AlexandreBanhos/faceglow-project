/**
 * Landing Page — DDD & SOLID Architecture
 * 
 * Page Component que orquestra todos os domain components de landing
 * Padrão: Provider Injection + Composition
 * Princípios SOLID aplicados:
 * - Single Responsibility: Página só orquestra, não contém lógica
 * - Open/Closed: Fácil adicionar novas seções sem quebrar existentes
 * - Dependency Inversion: Todos components dependem de ILandingContentService via Provider
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser } from "@/lib/auth";
import { LandingProvider } from "@/shared/providers/LandingProvider";
import { LandingHero } from "@/components/landing/LandingHero";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingSection } from "@/components/landing/PricingSection";
import { AuroraBackdrop, FGGradientText } from "@/components/shared";
import logoFaceglow from "@/assets/logo-faceglow.svg";

/**
 * Page Container — Sem lógica, apenas composição
 */
export function LandingPageContent() {
  const navigate = useNavigate();

  // Redireciona usuários autenticados para o dashboard — sem bloquear o render.
  // getSessionUser() usa a sessão cacheada localmente (sem rede), é quase síncrono.
  useEffect(() => {
    let mounted = true;
    getSessionUser().then(user => {
      if (mounted && user) navigate("/dashboard", { replace: true });
    }).catch(() => {});
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <main className="relative w-full overflow-hidden" style={{ background: "var(--grad-aurora)" }}>
      {/* Aurora backdrop */}
      <AuroraBackdrop tone="warm" className="-z-10" />

      {/* Navigation — Fixed over hero, glass effect */}
      <nav
        className="fixed left-0 right-0 top-0 z-50 px-4 py-3 md:px-8"
      >
        <div className="mx-auto max-w-7xl">
        <div className="lg-surface px-4 py-3 rounded-full flex justify-between items-center gap-3">
          {/* Logo */}
          <div className="flex items-center">
            <img src={logoFaceglow} alt="FaceGlow" className="h-10 w-auto" />
          </div>

          {/* Nav Links — Hidden on mobile */}
          <div className="hidden md:flex gap-8 items-center">
            <a href="#why-section" className="text-sm text-[var(--fg-ink-2)] hover:text-[var(--fg-ink)] transition-colors font-medium">
              Por que FaceGlow
            </a>
            <a href="#offers" className="text-sm text-[var(--fg-ink-2)] hover:text-[var(--fg-ink)] transition-colors font-medium">
              O que oferece
            </a>
            <a href="#how" className="text-sm text-[var(--fg-ink-2)] hover:text-[var(--fg-ink)] transition-colors font-medium">
              Como funciona
            </a>
            <a href="#pricing" className="text-sm text-[var(--fg-ink-2)] hover:text-[var(--fg-ink)] transition-colors font-medium">
              Planos
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3 items-center">
            <button
              onClick={() => navigate("/auth?mode=login")}
              className="liquiglass-button px-5 py-2 rounded-2xl text-sm font-semibold text-[var(--fg-ink-2)]"
            >
              Entrar
            </button>
            <button
              onClick={() => document.getElementById("cta-final")?.scrollIntoView({ behavior: "smooth" })}
              className="coral-button hidden px-6 py-2 rounded-full text-sm font-semibold sm:inline-flex"
            >
              Começar grátis
            </button>
          </div>
        </div>
        </div>
      </nav>

      {/* Hero */}
      <LandingHero />

      {/* Stats strip */}
      <StatsStrip />

      {/* Benefits (Why FaceGlow) */}
      <BenefitsSection />

      {/* Features (What FaceGlow Offers) */}
      <FeaturesSection />

      {/* How It Works */}
      <HowItWorks />

      {/* Pricing */}
      <PricingSection />

      {/* Final CTA — Liquid glass premium card */}
      <section id="cta-final" className="relative z-10 py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="lg-surface-strong p-8 md:p-16 rounded-[2.5rem] text-center relative overflow-hidden">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-coral/20 to-pink/20 border border-[var(--glass-border)]">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-coral to-pink" />
              <span className="fg-mono text-xs font-bold text-[var(--fg-ink-2)]">COMECE AGORA</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Sua pele merece
              <br />
              <FGGradientText>cuidado de verdade</FGGradientText>
            </h2>

            {/* Subheading */}
            <p className="text-[var(--fg-ink-3)] text-lg mb-8 max-w-xl mx-auto">
              1 análise grátis. Sem cartão de crédito. Resultado em 60 segundos.
            </p>

            {/* Primary CTA */}
            <button
              onClick={() => navigate("/analyze")}
              className="coral-button px-8 py-4 rounded-2xl font-bold text-lg mb-8 inline-block"
            >
              Analisar minha pele agora
            </button>

            {/* Perks */}
            <div className="flex flex-col md:flex-row gap-6 justify-center items-center text-sm" style={{ color: "var(--fg-ink-3)" }}>
              {["1 análise grátis", "Sem cartão de crédito", "Resultado em 60s"].map((perk) => (
                <div key={perk} className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="7" fill="url(#perk-grad)" />
                    <path d="M4 7L6 9L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <defs>
                      <linearGradient id="perk-grad" x1="0" y1="0" x2="14" y2="14">
                        <stop stopColor="#ddb693" />
                        <stop offset="1" stopColor="#ef8fb8" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200/50 mt-20 py-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <img src={logoFaceglow} alt="FaceGlow" className="h-10 w-auto" />
              <p className="text-sm text-gray-600 mt-3">
                Diagnóstico de pele com IA. Profissional, acessível, disponível 24/7.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-coral transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-coral transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-coral transition-colors">Download</a></li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-coral transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-coral transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-coral transition-colors">Contato</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/privacidade" className="hover:text-coral transition-colors">Política de Privacidade</a></li>
                <li><a href="/termos" className="hover:text-coral transition-colors">Termos de Uso</a></li>
                <li><a href="mailto:privacidade@faceglow.com.br" className="hover:text-coral transition-colors">LGPD / Dados</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-gray-200/50 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600 gap-4">
            <p>© {new Date().getFullYear()} FaceGlow. Todos os direitos reservados.</p>
            <div className="flex flex-wrap gap-4 md:gap-6 items-center justify-center">
              <a href="/privacidade" className="hover:text-coral transition-colors">Política de Privacidade</a>
              <a href="/termos" className="hover:text-coral transition-colors">Termos de Uso</a>
              <a href="mailto:suporte@faceglow.com.br" className="hover:text-coral transition-colors">Contato</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/**
 * Export com Provider wrapper — DI Container
 */
export default function Landing() {
  // Set page title and meta tags for SEO
  useEffect(() => {
    document.title = "FaceGlow — Diagnóstico de Pele com IA em 60 segundos";
    
    // Update meta description
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Tire uma selfie e descubra seu tipo de pele, condições e rotina personalizada. IA profissional, validado por dermatologistas, sem filas."
      );
    }
  }, []);

  return (
    <LandingProvider>
      <LandingPageContent />
    </LandingProvider>
  );
}
