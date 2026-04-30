namespace SkinAnalysis.Api.Models;

public class AnalysisRoutineStep
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AnalysisId { get; set; }
    public Guid UserId { get; set; }
    public string Period { get; set; } = "morning"; // "morning" | "night"
    public int StepOrder { get; set; }
    public string Category { get; set; } = string.Empty;
    public Guid? ProductId { get; set; }
    public Guid? RecommendationId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Recurrence { get; set; } = "daily";
    public bool IsExtra { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsUserAdded { get; set; }
    public string? SelectedTier { get; set; } // "best" | "second" | "budget"
    public string? OverrideProductName { get; set; }
    public string? OverrideImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Analysis Analysis { get; set; } = null!;
    public User User { get; set; } = null!;
    public Product? Product { get; set; }
    public Recommendation? Recommendation { get; set; }
}
