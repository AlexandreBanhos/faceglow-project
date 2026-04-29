namespace SkinAnalysis.Api.Models;

public class RoutineCompletion
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public DateTime CompletionDate { get; set; }

    public bool MorningCompleted { get; set; } = false;

    public bool NightCompleted { get; set; } = false;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
