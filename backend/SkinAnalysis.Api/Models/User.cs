using System.ComponentModel.DataAnnotations;

namespace SkinAnalysis.Api.Models;

public class User
{
    public Guid Id { get; set; }

    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;

    public bool IsAdmin { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SkinAnalysis> SkinAnalyses { get; set; } = new List<SkinAnalysis>();

    public ICollection<Routine> Routines { get; set; } = new List<Routine>();

    public ICollection<Product> Products { get; set; } = new List<Product>();
}
