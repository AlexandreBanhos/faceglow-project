namespace SkinAnalysis.Api.Models;

public sealed class RoutineVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoutineId { get; set; }
    public int Version { get; set; }
    public string ChangedBy { get; set; } = "engine";
    public string ChangeType { get; set; } = "initial_generation";
    public string? ChangeSummary { get; set; }
    public string Snapshot { get; set; } = "{}"; // JSONB
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public UserRoutine Routine { get; set; } = null!;
}
