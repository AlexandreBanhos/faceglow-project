/**
 * Landing Page Domain - Types & Value Objects
 * Tipificação para marketing, features, testimonials, pricing
 */

/**
 * Benefício core da solução
 */
export type Benefit = {
  id: string;
  icon: string;
  title: string;
  description: string;
  comparison: {
    before: string;
    after: string;
  };
};

/**
 * Feature que FaceGlow oferece
 */
export type Feature = {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: "analysis" | "routine" | "products" | "tracking" | "community" | "support";
  tag: {
    label: string;
    bgColor: string;
    textColor: string;
  };
};

/**
 * Passo no fluxo "Como funciona"
 */
export type HowItWorksStep = {
  order: number;
  icon: string;
  title: string;
  description: string;
};

/**
 * Depoimento de usuário
 */
export type Testimonial = {
  id: string;
  name: string;
  age: number;
  city: string;
  avatar: string;
  rating: number;
  quote: string;
};

/**
 * Plano de preço
 */
export type PricingPlan = {
  id: "free" | "credits" | "monthly";
  name: string;
  price: number;
  currency: "BRL";
  period: string;
  analyses: number;
  description: string;
  perks: string[];
  isHighlight?: boolean;
  badge?: string;
  cta: {
    label: string;
    action: "signup" | "premium" | "purchase";
  };
};

/**
 * Conteúdo da navegação
 */
export type NavLink = {
  label: string;
  href: string;
  section: string;
};

/**
 * Prova social (múltiplos usuários)
 */
export type SocialProof = {
  totalAnalyses: number;
  totalUsers: number;
  averageRating: number;
  isValidatedByDermatologists: boolean;
};

/**
 * Seção de FAQ
 */
export type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category: "general" | "technical" | "pricing" | "privacy";
};

/**
 * Configuração completa da landing page
 */
export type LandingPageConfig = {
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
    secondaryCta: string;
  };
  benefits: Benefit[];
  features: Feature[];
  howItWorks: HowItWorksStep[];
  testimonials: Testimonial[];
  pricing: PricingPlan[];
  socialProof: SocialProof;
  faq: FAQItem[];
  navigation: NavLink[];
};
