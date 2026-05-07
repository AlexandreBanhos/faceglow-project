namespace SkinAnalysis.Api.Models;

public sealed class RoutineChangeSuggestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid AnalysisId { get; set; }
    public string SuggestionType { get; set; } = ""; // add_step | remove_step | swap_product
    public string StepTypeKey { get; set; } = "";
    public string? StepPeriod { get; set; } // morning | night | both
    public string? CurrentProductName { get; set; }
    public Guid? SuggestedProductId { get; set; }
    public string? SuggestedProductName { get; set; }
    public string? SuggestedImageUrl { get; set; }
    public string Reason { get; set; } = "";
    public short Priority { get; set; } = 5;
    public string Status { get; set; } = "pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }

    public User User { get; set; } = null!;
    public SkinAnalysisRecord Analysis { get; set; } = null!;
    public Product? SuggestedProduct { get; set; }
}
