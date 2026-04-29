namespace SkinAnalysis.Api.Models;

public class Routine
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public Guid BasedOnAnalysisId { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Stores custom routine data: selected products, custom steps, order, schedule changes
    /// Format: JSON with { selectedByItem, customSteps, routineOrder, schedule, myProducts }
    /// </summary>
    public string CustomizationsJson { get; set; } = "{}";

    public User User { get; set; } = null!;

    public SkinAnalysis BasedOnAnalysis { get; set; } = null!;

    public ICollection<RoutineStep> Steps { get; set; } = new List<RoutineStep>();
}
