using System.ComponentModel.DataAnnotations;

namespace SkinAnalysis.Api.Models;

public class RoutineStep
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RoutineId { get; set; }

    [MaxLength(50)]
    public string StepType { get; set; } = string.Empty;

    public Guid ProductId { get; set; }

    public bool IsUserProduct { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Routine Routine { get; set; } = null!;

    public Product Product { get; set; } = null!;
}
