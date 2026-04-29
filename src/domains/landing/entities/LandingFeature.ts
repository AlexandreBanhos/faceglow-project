/**
 * Domain Entity: Feature
 * Representa uma capacidade do FaceGlow
 * Princípio SOLID: Single Responsibility - apenas lógica de uma feature
 */

export type FeatureCategory = "analysis" | "routine" | "products" | "tracking" | "community" | "support";

export class LandingFeature {
  private constructor(
    readonly id: string,
    readonly icon: string,
    readonly title: string,
    readonly description: string,
    readonly category: FeatureCategory,
    readonly tagLabel: string,
    readonly tagBgColor: string,
    readonly tagTextColor: string
  ) {}

  /**
   * Factory method com validação
   */
  static create(
    id: string,
    icon: string,
    title: string,
    description: string,
    category: FeatureCategory,
    tagLabel: string,
    tagBgColor: string,
    tagTextColor: string
  ): LandingFeature {
    if (!id || !title || !category) {
      throw new Error("Feature must have id, title and category");
    }
    return new LandingFeature(
      id,
      icon,
      title,
      description,
      category,
      tagLabel,
      tagBgColor,
      tagTextColor
    );
  }

  /**
   * Domain logic: categorização
   */
  belongsToCategory(cat: FeatureCategory): boolean {
    return this.category === cat;
  }

  /**
   * Serialização
   */
  toDTO() {
    return {
      id: this.id,
      icon: this.icon,
      title: this.title,
      description: this.description,
      category: this.category,
      tag: {
        label: this.tagLabel,
        bgColor: this.tagBgColor,
        textColor: this.tagTextColor,
      },
    };
  }
}
