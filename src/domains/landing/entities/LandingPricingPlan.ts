/**
 * Domain Entity: PricingPlan
 * Lógica de negócio relacionada aos planos de preço
 * Princípio SOLID: Dependency Inversion - implementações diferentes de plano
 */

import type { PricingPlan } from "../types/landinMarketing.types";

export type PlanId = "free" | "credits" | "monthly";
export type CTA = "signup" | "premium" | "purchase";

export class LandingPricingPlan {
  private constructor(
    readonly id: PlanId,
    readonly name: string,
    readonly priceInCents: number, // Sempre trabalhar em centavos
    readonly period: string,
    readonly analysisCount: number,
    readonly description: string,
    readonly perks: string[],
    readonly isHighlight: boolean,
    readonly badge: string | null,
    readonly ctaLabel: string,
    readonly ctaAction: CTA
  ) {}

  /**
   * Factory com validação
   */
  static create(
    id: PlanId,
    name: string,
    priceInCents: number,
    period: string,
    analysisCount: number,
    description: string,
    perks: string[],
    isHighlight: boolean,
    badge: string | null,
    ctaLabel: string,
    ctaAction: CTA
  ): LandingPricingPlan {
    if (!name || analysisCount < 0) {
      throw new Error("Invalid plan parameters");
    }
    return new LandingPricingPlan(
      id,
      name,
      priceInCents,
      period,
      analysisCount,
      description,
      perks,
      isHighlight,
      badge,
      ctaLabel,
      ctaAction
    );
  }

  /**
   * Domain logic: preço em formato R$
   */
  getFormattedPrice(): string {
    const valueInReais = this.priceInCents / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: this.priceInCents % 100 === 0 ? 0 : 2,
    }).format(valueInReais);
  }

  /**
   * Domain logic: custo por análise
   */
  getPricePerAnalysis(): string {
    if (this.analysisCount === 0) return "Grátis";
    const costInCents = this.priceInCents / this.analysisCount;
    const costInReais = costInCents / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(costInReais);
  }

  /**
   * Domain logic: melhor valor?
   */
  isBestValue(): boolean {
    return this.isHighlight;
  }

  /**
   * Serialização
   */
  toDTO(): PricingPlan {
    return {
      id: this.id,
      name: this.name,
      price: this.priceInCents / 100, // Retornar em reais na API
      currency: "BRL",
      period: this.period,
      analyses: this.analysisCount,
      description: this.description,
      perks: this.perks,
      isHighlight: this.isHighlight,
      badge: this.badge ?? undefined,
      cta: {
        label: this.ctaLabel,
        action: this.ctaAction,
      },
    };
  }
}
