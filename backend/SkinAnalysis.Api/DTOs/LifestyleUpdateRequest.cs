using System.Text.Json;

namespace SkinAnalysis.Api.DTOs;

public class LifestyleUpdateRequest
{
    public bool UsesMakeup { get; set; }
    public string? BudgetRange { get; set; }
    public bool PregnancySafe { get; set; }
    public JsonElement? LifestyleData { get; set; }
}
