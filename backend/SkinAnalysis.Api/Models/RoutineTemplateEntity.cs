namespace SkinAnalysis.Api.Models;

public sealed class RoutineTemplateEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Period { get; set; } = "";
    public string[]? MatchSkinTypes { get; set; }
    public string[]? MatchConcerns { get; set; }
    public string[]? RequireFlags { get; set; }
    public short? MinAcneScore { get; set; }
    public short? MinOilinessScore { get; set; }
    public short? MinSensitivity { get; set; }
    public string[] StepTypeKeys { get; set; } = [];
    public short SpecificityScore { get; set; }
    public bool IsActive { get; set; }
}
