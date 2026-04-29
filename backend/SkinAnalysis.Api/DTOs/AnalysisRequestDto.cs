using System.ComponentModel.DataAnnotations;

namespace SkinAnalysis.Api.DTOs;

public class AnalysisRequestDto
{
    public string UserId { get; set; } = string.Empty;

    [Required]
    public string ImageUrl { get; set; } = string.Empty;
}
