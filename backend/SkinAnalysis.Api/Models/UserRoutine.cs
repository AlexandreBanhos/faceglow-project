namespace SkinAnalysis.Api.Models;

public sealed class UserRoutine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid SkinProfileId { get; set; }
    public string Period { get; set; } = string.Empty; // "morning" | "night"
    public string DisplayName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    public bool IsCustomized { get; set; }
    public int CurrentVersion { get; set; } = 1;

    public string GeneratedBy { get; set; } = "engine";
    public Guid? TemplateId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public SkinProfile SkinProfile { get; set; } = null!;
    public ICollection<UserRoutineStep> Steps { get; set; } = new List<UserRoutineStep>();
    public ICollection<RoutineVersion> Versions { get; set; } = new List<RoutineVersion>();
}
