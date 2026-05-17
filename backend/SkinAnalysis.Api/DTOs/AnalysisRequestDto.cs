using System.ComponentModel.DataAnnotations;

namespace SkinAnalysis.Api.DTOs;

using System.Text.Json;

public class AnalysisRequestDto
{
    public string UserId { get; set; } = string.Empty;

    [Required]
    public string ImageUrl { get; set; } = string.Empty;

    public bool UsesMakeup { get; set; } = false;
    public string? BudgetRange { get; set; }
    public bool PregnancySafe { get; set; } = false;
    public JsonElement? LifestyleData { get; set; }
}
