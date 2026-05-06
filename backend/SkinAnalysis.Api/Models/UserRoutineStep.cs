namespace SkinAnalysis.Api.Models;

public sealed class UserRoutineStep
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoutineId { get; set; }
    public string StepTypeKey { get; set; } = string.Empty;
    public int StepOrder { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsSkipped { get; set; }
    public bool IsUserAdded { get; set; }

    public string Recurrence { get; set; } = "daily";
    public int[] ScheduleDays { get; set; } = [0, 1, 2, 3, 4, 5, 6];

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public UserRoutine Routine { get; set; } = null!;
    public ICollection<StepProductSlot> Slots { get; set; } = new List<StepProductSlot>();
    public ICollection<StepCompletion> Completions { get; set; } = new List<StepCompletion>();
}
