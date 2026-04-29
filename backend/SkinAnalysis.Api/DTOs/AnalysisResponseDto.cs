namespace SkinAnalysis.Api.DTOs;

public class AnalysisResponseDto
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string ImageUrl { get; set; } = string.Empty;

    public string SkinType { get; set; } = string.Empty;

    public AnalysisScoresDto Scores { get; set; } = new();

    public string Summary { get; set; } = string.Empty;

    public AnalysisConditionsDto Conditions { get; set; } = new();

    public string AdditionalRecommendations { get; set; } = string.Empty;

    public AnalysisRoutineDto Routine { get; set; } = new();

    public int OverallScore { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public List<RecommendationDto> Recommendations { get; set; } = new();

    /// <summary>
    /// Indicates whether this analysis has any saved recommendations.
    /// Used by clients to decide whether to fetch full details.
    /// </summary>
    public bool HasRecommendations { get; set; }
}

public class RecommendationDto
{
    public string Type { get; set; } = string.Empty;

    public string Product { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }
}
