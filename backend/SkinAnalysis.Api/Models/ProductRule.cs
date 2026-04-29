namespace SkinAnalysis.Api.Models;

/// <summary>
/// Product recommendation rules and intelligence
/// Separates product metadata (what it is) from recommendation logic (how it should be used)
/// This is where the AI matching logic lives
/// </summary>
public class ProductRule
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Which product this rule applies to
    /// </summary>
    public Guid ProductId { get; set; }

    /// <summary>
    /// Compatible skin types (oleosa, seca, mista, sensivel, todas, acneica)
    /// Normalized via SkinTypeEnum
    /// </summary>
    public string[] SkinTypes { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Problems this product solves (acne, oleosidade, manchas, etc)
    /// Normalized via ConcernEnum
    /// </summary>
    public string[] Concerns { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Active ingredients (niacinamida, vitamina c, retinol, etc)
    /// For future: AI understanding of ingredients
    /// </summary>
    public string[] Actives { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Use cases/step types this product fits: cleanser, moisturizer, treatment, sunscreen, eye, lip
    /// aka "routine_step_types"
    /// Normalized via ProductCategoryEnum
    /// </summary>
    public string[] StepTypes { get; set; } = Array.Empty<string>();

    /// <summary>
    /// When to use: manha, noite, vez
    /// Normalized via PeriodEnum
    /// </summary>
    public string[] Periods { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Product strength: leve, medio, forte
    /// Normalized via StrengthLevelEnum
    /// </summary>
    public string StrengthLevel { get; set; } = StrengthLevelEnum.Leve;

    /// <summary>
    /// Recommendation priority in matching (higher = more preferred in results)
    /// Used in scoring: priority * concern_match_weight
    /// </summary>
    public int Priority { get; set; } = 100;

    /// <summary>
    /// Human-readable reason why this rule exists (for debugging/docs)
    /// E.g. "Best niacinamida for oily acne-prone" "Barrier repair for sensitive"
    /// </summary>
    public string? Reasoning { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
}
