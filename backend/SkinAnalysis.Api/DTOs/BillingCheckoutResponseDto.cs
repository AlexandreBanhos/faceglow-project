namespace SkinAnalysis.Api.DTOs;

public class BillingCheckoutResponseDto
{
    public string Provider { get; set; } = string.Empty;

    public string Gateway { get; set; } = string.Empty;

    public string PlanKey { get; set; } = string.Empty;

    public string PlanName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public int AmountCents { get; set; }

    public string Currency { get; set; } = "BRL";

    public string? CheckoutUrl { get; set; }

    public string? PixQrCode { get; set; }

    public string? PixQrCodeBase64 { get; set; }

    public string? ExternalReference { get; set; }

    public string? ExternalId { get; set; }

    public DateTime? ExpiresAtUtc { get; set; }
}