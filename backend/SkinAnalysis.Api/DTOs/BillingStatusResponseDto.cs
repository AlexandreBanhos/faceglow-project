namespace SkinAnalysis.Api.DTOs;

public class BillingStatusResponseDto
{
    public string Provider { get; set; } = string.Empty;

    public string Gateway { get; set; } = string.Empty;

    public string PlanKey { get; set; } = string.Empty;

    public string PlanName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public int AmountCents { get; set; }

    public string Currency { get; set; } = "BRL";

    public string ExternalReference { get; set; } = string.Empty;

    public string ExternalId { get; set; } = string.Empty;

    public DateTime? ActivatedAtUtc { get; set; }

    public DateTime? ExpiresAtUtc { get; set; }
}
