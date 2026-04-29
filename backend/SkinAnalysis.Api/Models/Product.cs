using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Globalization;
using System.Text;

namespace SkinAnalysis.Api.Models;

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Brand { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    // Keep for backward compatibility, but always sync with SkinTypes[0]
    [MaxLength(100)]
    [Obsolete("Use SkinTypes instead", false)]
    public string SkinType { get; set; } = string.Empty;

    public string[] SkinTypes { get; set; } = Array.Empty<string>();

    public string[] Concerns { get; set; } = Array.Empty<string>();

    public string[] Actives { get; set; } = Array.Empty<string>();

    [MaxLength(20)]
    public string StrengthLevel { get; set; } = "leve";

    public string[] Period { get; set; } = Array.Empty<string>();

    [MaxLength(20)]
    public string PriceRange { get; set; } = "medium";

    public decimal? PriceAvg { get; set; }

    public int Priority { get; set; } = 100;

    public bool IsActive { get; set; } = true;

    public bool IsUserProduct { get; set; }

    public Guid? UserId { get; set; }

    [MaxLength(500)]
    public string Highlight { get; set; } = string.Empty;

    public User? User { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RoutineStep> RoutineSteps { get; set; } = new List<RoutineStep>();

    [NotMapped]
    public DateTime CreatedAtUtc
    {
        get => CreatedAt;
        set => CreatedAt = value;
    }

    // Deprecated: Use Period directly. This is kept for backward compatibility only.
    [NotMapped]
    [Obsolete("Use Period array directly instead", false)]
    public string Recurrence
    {
        get => Period.Length == 1 ? Period[0] : "daily";
        set
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                Period = Array.Empty<string>();
                return;
            }

            Period = NormalizeText(value) switch
            {
                "manha" => new[] { "manha" },
                "morning" => new[] { "manha" },
                "noite" => new[] { "noite" },
                "night" => new[] { "noite" },
                _ => new[] { "manha", "noite" },
            };
        }
    }

    [NotMapped]
    [Obsolete("Use Period array directly instead", false)]
    public string PreferredPeriod
    {
        get => Period.Length == 1 ? Period[0] : "both";
        set => Recurrence = value;
    }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    [NotMapped]
    public string[] UseCases
    {
        get => Concerns.Concat(Actives).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        set => Concerns = value ?? Array.Empty<string>();
    }

    private static string NormalizeText(string value)
    {
        return value.Trim().Normalize(NormalizationForm.FormD).ToLowerInvariant();
    }
}
