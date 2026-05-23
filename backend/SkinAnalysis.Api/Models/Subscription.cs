using System.ComponentModel.DataAnnotations;

namespace SkinAnalysis.Api.Models;

public class Subscription
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(50)]
    public string Provider { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Gateway { get; set; } = string.Empty;

    [MaxLength(50)]
    public string PlanKey { get; set; } = string.Empty;

    [MaxLength(100)]
    public string PlanName { get; set; } = string.Empty;

    [MaxLength(30)]
    public string Status { get; set; } = "pending";

    [MaxLength(200)]
    public string ExternalReference { get; set; } = string.Empty;

    [MaxLength(200)]
    public string ExternalId { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string CheckoutUrl { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string PixQrCode { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string PixQrCodeBase64 { get; set; } = string.Empty;

    public int AmountCents { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "BRL";

    public DateTime? ActivatedAtUtc { get; set; }

    public DateTime? ExpiresAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public string? ReferralCode { get; set; }
    public Guid?   AffiliateId  { get; set; }
}