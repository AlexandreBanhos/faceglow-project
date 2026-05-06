namespace SkinAnalysis.Api.Models;

public sealed class StepCompletion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid RoutineId { get; set; }
    public Guid StepId { get; set; }
    public DateOnly CompletedDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public UserRoutine Routine { get; set; } = null!;
    public UserRoutineStep Step { get; set; } = null!;
}
