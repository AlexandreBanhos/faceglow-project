namespace SkinAnalysis.Api.Models;

public class RoutineStepCompletion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid StepId { get; set; }
    public DateOnly CompletedDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public AnalysisRoutineStep Step { get; set; } = null!;
}
