/**
 * Domain Entity: Benefit
 * Represent uma dor resolvida pela solução
 * Princípio SOLID: Single Responsibility - apenas lógica de um benefício
 */

export class LandingBenefit {
  private constructor(
    readonly id: string,
    readonly icon: string,
    readonly title: string,
    readonly description: string,
    readonly beforeState: string,
    readonly afterState: string
  ) {}

  /**
   * Factory method - criação validada
   */
  static create(
    id: string,
    icon: string,
    title: string,
    description: string,
    beforeState: string,
    afterState: string
  ): LandingBenefit {
    if (!id || !title || !beforeState || !afterState) {
      throw new Error("Benefit must have id, title, beforeState and afterState");
    }
    return new LandingBenefit(id, icon, title, description, beforeState, afterState);
  }

  /**
   * Domain logic: comparação de antes/depois
   */
  getComparison() {
    return {
      before: this.beforeState,
      after: this.afterState,
    };
  }

  /**
   * Serialização para presentation layer
   */
  toDTO() {
    return {
      id: this.id,
      icon: this.icon,
      title: this.title,
      description: this.description,
      comparison: this.getComparison(),
    };
  }
}
