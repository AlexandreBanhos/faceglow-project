namespace SkinAnalysis.Api.Domain.RoutineEngine;

public sealed class UserProfile
{
    public string SkinType { get; init; } = string.Empty;

    public bool Acne { get; init; }

    public bool Olheiras { get; init; }

    public bool Poros { get; init; }

    public bool Manchas { get; init; }

    public bool LabiosRessecados { get; init; }

    public int AcneScore { get; init; }

    public int OilinessScore { get; init; }

    public int DarkSpotsScore { get; init; }

    public int SensitivityScore { get; init; }

    public int HydrationScore { get; init; }

    public int LinhasFinas { get; init; }

    public BudgetLevel Budget { get; init; } = BudgetLevel.Medium;
}