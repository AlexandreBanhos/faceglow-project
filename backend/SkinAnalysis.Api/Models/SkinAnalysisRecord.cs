namespace SkinAnalysis.Api.Models;

public sealed class SkinAnalysisRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string? ImageUrl { get; set; }
    public string AiEngine { get; set; } = "gemini-flash";
    public string? AiRawResponse { get; set; }

    public string SkinType { get; set; } = string.Empty;
    public int AcneScore { get; set; }
    public int OilinessScore { get; set; }
    public int DarkSpotsScore { get; set; }
    public int HydrationScore { get; set; }
    public int SensitivityScore { get; set; }
    public int AgingScore { get; set; }
    public int RednessScore { get; set; }

    public bool HasActiveAcne { get; set; }
    public bool HasDarkCircles { get; set; }
    public bool HasEnlargedPores { get; set; }
    public bool HasBlackheads { get; set; }
    public bool HasFineLines { get; set; }

    public string Summary { get; set; } = string.Empty;
    public string AdditionalNotes { get; set; } = string.Empty;
    public string Status { get; set; } = "completed";
    public DateTime? ProcessedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;

    public int OverallScore => Math.Clamp(
        100 - (int)Math.Round((AcneScore + OilinessScore + DarkSpotsScore + SensitivityScore) / 4.0 * 10),
        0, 100);
}
