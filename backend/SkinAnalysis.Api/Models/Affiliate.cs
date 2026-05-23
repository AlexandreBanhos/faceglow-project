using System.ComponentModel.DataAnnotations.Schema;

namespace SkinAnalysis.Api.Models;

[Table("affiliates")]
public class Affiliate
{
    public Guid    Id             { get; set; } = Guid.NewGuid();
    public string  Code           { get; set; } = "";
    public string  Name           { get; set; } = "";
    public string? Email          { get; set; }
    public decimal CommissionRate { get; set; } = 0.15m; // 15%
    public bool    IsActive       { get; set; } = true;
    public string? Notes          { get; set; }
    public Guid?   CreatedBy      { get; set; }
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt     { get; set; } = DateTime.UtcNow;
}

[Table("affiliate_conversions")]
public class AffiliateConversion
{
    public Guid    Id             { get; set; } = Guid.NewGuid();
    public Guid    AffiliateId    { get; set; }
    public Guid    UserId         { get; set; }
    public Guid?   SubscriptionId { get; set; }
    public string  PlanKey        { get; set; } = "";
    public int     AmountCents    { get; set; }
    public int     CommissionCents{ get; set; }
    public string  Status         { get; set; } = "pending";
    public DateTime? PaidAt       { get; set; }
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;

    public Affiliate? Affiliate   { get; set; }
}

[Table("affiliate_payouts")]
public class AffiliatePayout
{
    public Guid     Id            { get; set; } = Guid.NewGuid();
    public Guid     AffiliateId   { get; set; }
    public int      TotalCents    { get; set; }
    public Guid[]   ConversionIds { get; set; } = [];
    public string?  Notes         { get; set; }
    public DateTime PaidAt        { get; set; } = DateTime.UtcNow;
    public Guid?    CreatedBy     { get; set; }

    public Affiliate? Affiliate   { get; set; }
}
