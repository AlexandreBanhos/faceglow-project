namespace SkinAnalysis.Api.Models;

public sealed class StepProductSlot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StepId { get; set; }
    public string Tier { get; set; } = string.Empty; // "primary" | "alt_budget" | "alt_rated" | "user_custom"

    public Guid? ProductId { get; set; }
    public Guid? UserProductId { get; set; }

    public bool IsSelected { get; set; }

    public decimal? ScoreAtGeneration { get; set; }
    public string? ScoreBreakdown { get; set; } // JSONB serialized
    public string? RecommendationReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public UserRoutineStep Step { get; set; } = null!;
    public Product? Product { get; set; }
    public UserProduct? UserProduct { get; set; }
}
