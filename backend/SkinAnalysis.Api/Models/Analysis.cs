using System.ComponentModel.DataAnnotations;

namespace SkinAnalysis.Api.Models;

public class Analysis
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(1000)]
    public string ImageUrl { get; set; } = string.Empty;

    [MaxLength(100)]
    public string SkinType { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string Summary { get; set; } = string.Empty;

    [MaxLength(20000)]
    public string RoutineJson { get; set; } = "{\"morning\":[],\"night\":[]}";

    /// <summary>
    /// Stores user customizations to the routine: product swaps, order changes, etc.
    /// Format: JSON with { selectedByItem, customSteps, routineOrder, schedule, myProducts }
    /// </summary>
    [MaxLength(5000)]
    public string CustomizationsJson { get; set; } = "{}";

    public int AcneScore { get; set; }

    public int OilinessScore { get; set; }

    public int DarkSpotsScore { get; set; }

    public int HydrationScore { get; set; }

    public int SensitivityScore { get; set; }

    public int Poros { get; set; }

    public int Olheiras { get; set; }

    public int LinhasFinas { get; set; }

    public int Vermelhidao { get; set; }

    public int EspinhasAtivas { get; set; }

    public int Cravos { get; set; }

    public int OverallScore { get; set; }

    public bool AcneActive { get; set; }

    public bool DarkCircles { get; set; }

    public bool EnlargedPores { get; set; }

    public bool PigmentationSpots { get; set; }

    public bool DryLips { get; set; }

    [MaxLength(2000)]
    public string AdditionalRecommendations { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Recommendation> Recommendations { get; set; } = new List<Recommendation>();
}
