namespace SkinAnalysis.Api.Models;

public sealed class UserProduct
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? CatalogProductId { get; set; }
    public string? CustomName { get; set; }
    public string? CustomBrand { get; set; }
    public string? CustomImageUrl { get; set; }
    public string? StepTypeKey { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Product? CatalogProduct { get; set; }

    public string DisplayName => CatalogProduct?.Name ?? CustomName ?? "Produto";
    public string? DisplayImageUrl => CatalogProduct?.PrimaryImageUrl ?? CustomImageUrl;
}
