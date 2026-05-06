namespace SkinAnalysis.Api.Models;

public sealed class SkinProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? AnalysisId { get; set; }

    public bool IsCurrent { get; set; } = true;
    public string Source { get; set; } = "ai_analysis";

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
    public bool HasFineLines { get; set; }

    public string[] PrimaryConcerns { get; set; } = [];

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public SkinAnalysisRecord? Analysis { get; set; }
    public ICollection<UserRoutine> Routines { get; set; } = new List<UserRoutine>();
}
