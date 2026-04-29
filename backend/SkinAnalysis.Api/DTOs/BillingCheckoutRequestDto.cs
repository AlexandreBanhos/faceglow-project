namespace SkinAnalysis.Api.DTOs;

public class BillingCheckoutRequestDto
{
    public string PlanKey { get; set; } = string.Empty;

    public string Gateway { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? FullName { get; set; }
}