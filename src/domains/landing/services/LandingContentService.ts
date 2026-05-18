/**
 * Application Service: Landing Content
 * Orquestra a lógica de negócio das entities de landing
 * Princípio SOLID: Single Responsibility, Dependency Inversion
 */

import { LandingBenefit } from "../entities/LandingBenefit";
import { LandingFeature } from "../entities/LandingFeature";
import { LandingPricingPlan } from "../entities/LandingPricingPlan";
import type {
  Benefit,
  Feature,
  PricingPlan,
  LandingPageConfig,
  SocialProof,
  Testimonial,
  FAQItem,
  NavLink,
} from "../types/landinMarketing.types";

/**
 * Service Application - não depende de UI específica
 * Abstração que pode ser injetada em diferentes componentes
 */
export interface ILandingContentService {
  getBenefits(): Benefit[];
  getFeatures(): Feature[];
  getPricingPlans(): PricingPlan[];
  getTestimonials(): Testimonial[];
  getFAQ(): FAQItem[];
  getSocialProof(): SocialProof;
  getNavigationLinks(): NavLink[];
  getConfig(): LandingPageConfig;
}

/**
 * Implementação concreta
 */
export class LandingContentService implements ILandingContentService {
  private benefits: LandingBenefit[] = [];
  private features: LandingFeature[] = [];
  private plans: LandingPricingPlan[] = [];

  constructor() {
    this.initializeBenefits();
    this.initializeFeatures();
    this.initializePlans();
  }

  private initializeBenefits(): void {
    this.benefits = [
      LandingBenefit.create(
        "b1",
        "🤔",
        "Não sei qual é meu tipo de pele",
        "IA analisa em 60s e diz exatamente",
        "Testes genéricos e contraditórios na internet",
        "Diagnóstico profissional com IA"
      ),
      LandingBenefit.create(
        "b2",
        "💸",
        "Gasto muito em produtos errados",
        "Recomendações específicas que funcionam",
        "Sem orientação, compra por impulso",
        "Reduz desperdício com produtos precisos"
      ),
      LandingBenefit.create(
        "b3",
        "⏰",
        "Dermatologista é caro e demorado",
        "1 análise grátis online, 24/7, resultado em 60s",
        "Consulta R$ 150-300, agendamento, fila",
        "Análise acessível em qualquer momento"
      ),
      LandingBenefit.create(
        "b4",
        "📱",
        "Não tenho tempo para consultar dermatologista",
        "Análise online em 60 segundos",
        "Agendamento, deslocamento, espera",
        "Acessível 24/7 sem sair de casa"
      ),
    ];
  }

  private initializeFeatures(): void {
    this.features = [
      LandingFeature.create(
        "f1",
        "📸",
        "Análise por selfie com IA",
        "Foto tirada, diagnóstico pronto. Detecta acne, oleosidade, manchas, poros, linhas finas.",
        "analysis",
        "IA Vision",
        "rgba(244,131,107,0.1)",
        "#993C1D"
      ),
      LandingFeature.create(
        "f2",
        "🧬",
        "Rotina personalizada manhã e noite",
        "Com base no diagnóstico, monta rotina estruturada com ingredientes ideais na ordem certa.",
        "routine",
        "Personalização",
        "rgba(232,151,196,0.1)",
        "#72243E"
      ),
      LandingFeature.create(
        "f3",
        "💊",
        "Recomendação de produtos reais",
        "Produtos disponíveis no mercado, filtrados por faixa de preço, alinhados ao diagnóstico.",
        "products",
        "Curadoria",
        "rgba(201,166,245,0.12)",
        "#3C3489"
      ),
      LandingFeature.create(
        "f4",
        "📈",
        "Rastreio de evolução semanal",
        "Compare antes e depois. Métricas reais: hidratação, firmeza, uniformidade, oleosidade.",
        "tracking",
        "Progresso",
        "rgba(97,153,34,0.08)",
        "#27500A"
      ),
      LandingFeature.create(
        "f5",
        "👥",
        "Comunidade e suporte",
        "Compartilhe progresso, receba dicas de outras usuárias e da nossa equipe de especialistas.",
        "community",
        "Comunidade",
        "rgba(100,120,200,0.1)",
        "#2C3E8F"
      ),
      LandingFeature.create(
        "f6",
        "🔐",
        "100% seguro e privado",
        "Seus dados são seus. Anonimato total, sem compartilhamento com terceiros, LGPD compliant.",
        "support",
        "Segurança",
        "rgba(52,168,83,0.1)",
        "#1B5E20"
      ),
    ];
  }

  private initializePlans(): void {
    this.plans = [
      LandingPricingPlan.create(
        "free",
        "Free",
        0,
        "vitalício",
        1,
        "Experimente sem compromisso",
        [
          "✓ 1 análise gratuita",
          "✓ Resultado facial completo",
          "✓ Tipo de pele + condições",
          "✗ Rotina personalizada",
          "✗ Histórico e comparativo",
        ],
        false,
        null,
        "Começar Grátis",
        "signup"
      ),
      LandingPricingPlan.create(
        "monthly",
        "Premium",
        2490, // R$ 24,90
        "por mês",
        8,
        "Acesso completo à plataforma",
        [
          "✓ 8 análises por mês",
          "✓ Rotina personalizada IA",
          "✓ Checklist diário de rotina",
          "✓ Histórico e comparativo",
          "✓ Adicionar produtos próprios",
        ],
        true,
        "MAIS POPULAR",
        "Assinar Agora",
        "premium"
      ),
      LandingPricingPlan.create(
        "credits",
        "Análise Avulsa",
        490, // R$ 4,90
        "por análise",
        1,
        "Sem assinatura, sem compromisso",
        [
          "✓ 1 análise completa",
          "✓ Resultado facial detalhado",
          "✓ Tipo de pele + condições",
          "✗ Rotina personalizada",
          "✗ Histórico de análises",
        ],
        false,
        null,
        "Comprar Análise",
        "purchase"
      ),
    ];
  }

  getBenefits(): Benefit[] {
    return this.benefits.map((b) => b.toDTO());
  }

  getFeatures(): Feature[] {
    return this.features.map((f) => f.toDTO());
  }

  getPricingPlans(): PricingPlan[] {
    return this.plans.map((p) => p.toDTO());
  }

  getTestimonials(): Testimonial[] {
    return [
      {
        id: "t1",
        name: "Ana Silva",
        age: 24,
        city: "São Paulo",
        avatar: "AN",
        rating: 5,
        quote:
          "Depois de 3 meses com a rotina FaceGlow, minha acne diminuiu em 70%! Finalmente tenho confiança no que uso.",
      },
      {
        id: "t2",
        name: "Carlos Mendes",
        age: 31,
        city: "Rio de Janeiro",
        avatar: "CM",
        rating: 5,
        quote:
          "Paguei R$ 4,90 em uma análise e economizei R$ 500 em produtos desnecessários. Vale MUITO a pena.",
      },
      {
        id: "t3",
        name: "Júlia Costa",
        age: 28,
        city: "Belo Horizonte",
        avatar: "JC",
        rating: 5,
        quote:
          "Sou ocupada demais pra dermatologista. FaceGlow é minha solução 24/7. Recomendo!",
      },
    ];
  }

  getFAQ(): FAQItem[] {
    return [
      {
        id: "faq1",
        question: "Como funciona a análise com IA?",
        answer:
          "A IA Gemini analisa sua foto e identifica tipo de pele, scores de hidratação/acne/etc, e condições presentes. Diagnóstico baseado em dados científicos de 30.000+ casos. Tudo em menos de 60 segundos!",
        category: "general",
      },
      {
        id: "faq2",
        question: "A IA substitui dermatologista?",
        answer:
          "FaceGlow é excelente para diagnóstico inicial, rotina diária e recomendações. Para problemas dermatológicos complexos, recomendamos consultoria profissional. Pense em FaceGlow como seu dermatologista do dia-a-dia.",
        category: "general",
      },
      {
        id: "faq3",
        question: "Preciso estar sem maquiagem?",
        answer:
          "Ajuda, mas não é obrigatório. A IA consegue analisar com maquiagem também. Boa iluminação (natural) é mais importante que estar sem maquiagem.",
        category: "technical",
      },
      {
        id: "faq4",
        question: "Como funciona o histórico?",
        answer:
          "A cada análise, seus scores são salvos. Você pode comparar mês a mês, vendo se acne diminuiu, hidratação melhorou, etc. Super motivador!",
        category: "general",
      },
      {
        id: "faq5",
        question: "Qual é minha privacidade?",
        answer:
          "Total anonimato. Suas fotos são APENAS usadas para análise de IA. Não armazenamos, não compartilhamos com terceiros. Seus dados são seus.",
        category: "privacy",
      },
      {
        id: "faq6",
        question: "Posso cancelar a assinatura?",
        answer:
          "Claro! Sem multa, sem taxas ocultas. Cancela a qualquer momento no seu perfil. Se tiver créditos restantes, continuam válidos.",
        category: "pricing",
      },
    ];
  }

  getSocialProof(): SocialProof {
    return {
      totalAnalyses: 12400,
      totalUsers: 4200,
      averageRating: 4.8,
      isValidatedByDermatologists: true,
    };
  }

  getNavigationLinks(): NavLink[] {
    return [
      { label: "Por que FaceGlow", href: "#why", section: "benefits" },
      { label: "O que oferece", href: "#offers", section: "features" },
      { label: "Como funciona", href: "#how", section: "how-it-works" },
      { label: "Planos", href: "#pricing", section: "pricing" },
    ];
  }

  getConfig(): LandingPageConfig {
    return {
      hero: {
        headline: "Diagnóstico de pele profissional em 60s",
        subheadline:
          "Tire uma selfie. Nossa IA identifica seu tipo de pele, condições e monta sua rotina personalizada — sem filas, sem consulta cara.",
        cta: "Analisar minha pele grátis",
        secondaryCta: "Ver como funciona",
      },
      benefits: this.getBenefits(),
      features: this.getFeatures(),
      howItWorks: [
        {
          order: 1,
          icon: "📸",
          title: "Tire uma foto",
          description: "Selfie natureza com boa iluminação",
        },
        {
          order: 2,
          icon: "🤖",
          title: "IA analisa",
          description: "Processamento em menos de 60 segundos",
        },
        {
          order: 3,
          icon: "🧬",
          title: "Diagnóstico completo",
          description: "Tipo de pele, scores e condições detectadas",
        },
        {
          order: 4,
          icon: "💚",
          title: "Rotina + Produtos",
          description: "Recomendações personalizadas para você",
        },
      ],
      testimonials: this.getTestimonials(),
      pricing: this.getPricingPlans(),
      socialProof: this.getSocialProof(),
      faq: this.getFAQ(),
      navigation: this.getNavigationLinks(),
    };
  }
}

/**
 * Factory pattern - criar instâncias de forma controlada
 */
export function createLandingContentService(): ILandingContentService {
  return new LandingContentService();
}
