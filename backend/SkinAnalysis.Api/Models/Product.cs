namespace SkinAnalysis.Api.Models;

public sealed class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string StepTypeKey { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Tagline { get; set; }
    public Guid? PrimaryImageId { get; set; }

    public string[] CompatibleSkinTypes { get; set; } = [];
    public string[] TargetsConcerns { get; set; } = [];
    public string[] SuitablePeriods { get; set; } = ["morning", "night"];
    public string RecommendedFrequency { get; set; } = "daily";
    public string StrengthLevel { get; set; } = "mild"; // mild | moderate | strong

    public decimal? PriceAvg { get; set; }
    public string? PriceRange { get; set; } // low | medium | high | premium
    public string Currency { get; set; } = "BRL";

    public int CurationScore { get; set; } = 50;
    public bool IsStaffPick { get; set; }
    public bool IsDermaTested { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ProductImage? PrimaryImage { get; set; }
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<StepProductSlot> Slots { get; set; } = new List<StepProductSlot>();
}

public sealed class ProductImage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public string? StoragePath { get; set; }
    public string PublicUrl { get; set; } = string.Empty;
    public int Position { get; set; }
    public string Source { get; set; } = "uploaded";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Product Product { get; set; } = null!;
}
