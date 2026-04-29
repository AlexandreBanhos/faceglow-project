using System.ComponentModel.DataAnnotations;

namespace SkinAnalysis.Api.Models;

public class SkinAnalysis
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(100)]
    public string SkinType { get; set; } = string.Empty;

    public int AcneLevel { get; set; }

    public int SensitivityLevel { get; set; }

    public bool HasDarkCircles { get; set; }

    public bool HasSpots { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;

    public ICollection<Routine> Routines { get; set; } = new List<Routine>();
}
