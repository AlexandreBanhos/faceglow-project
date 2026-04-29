using System.ComponentModel.DataAnnotations;

namespace SkinAnalysis.Api.Models;

public class Recommendation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AnalysisId { get; set; }

    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [MaxLength(300)]
    public string Product { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string ImageUrl { get; set; } = string.Empty;

    public Analysis Analysis { get; set; } = null!;
}
