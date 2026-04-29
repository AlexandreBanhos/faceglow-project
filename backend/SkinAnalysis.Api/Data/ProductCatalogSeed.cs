using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Data;

public static class ProductCatalogSeed
{
    public static void EnsureSeed(AppDbContext dbContext)
    {
        dbContext.Database.SetCommandTimeout(60);

        var seedProducts = new List<Product>
        {
            new()
            {
                Name = "Gel de Limpeza GL-01",
                Brand = "Principia",
                Category = "cleanser",
                SkinTypes = ["oleosa", "mista"],
                Concerns = ["oleosidade", "acne"],
                Actives = ["niacinamida"],
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "low",
                PriceAvg = 45m,
                ImageUrl = "https://cdn.principiaskin.com/media/catalog/product/cache/a11fc81ad62814be31cd922a993aa5ec/p/r/principia-skincare-cosmeticos-gl-01-gel-limpeza-acido-salicilico-glicerina-1_3.jpg",
            },
            new()
            {
                Name = "Sebium Gel Moussant",
                Brand = "Bioderma",
                Category = "cleanser",
                SkinTypes = ["oleosa"],
                Concerns = ["oleosidade", "acne"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "high",
                PriceAvg = 90m,
                ImageUrl = "https://adrogariaideal.com/wp-content/uploads/2026/04/Gel-de-Limpeza-Antiacne-Sebium-Gel-Moussant-Actif-500ml-1.png"
            },
            new()
            {
                Name = "Gel de Limpeza pH5",
                Brand = "Eucerin",
                Category = "cleanser",
                SkinTypes = ["seca", "sensivel"],
                Concerns = ["sensibilidade"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "medium",
                PriceAvg = 70m,
                ImageUrl = "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRG5-JAt86HFqKTWpDYiny88HZsD7PbhsdLbddxvBhY8XAuALvuiQkS_un9udO7qbSmsCsi3eiFNg4xE1pA3uzMgXNM1TzWYN_cbw4EasT44NKgBdMLXKKZow",
            },
            new()
            {
                Name = "Purified Skin Gel",
                Brand = "Neutrogena",
                Category = "cleanser",
                SkinTypes = ["mista", "oleosa"],
                Concerns = ["oleosidade"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "low",
                PriceAvg = 40m,
            },
            new()
            {
                Name = "Hydro Boost Water Gel",
                Brand = "Neutrogena",
                Category = "moisturizer",
                SkinTypes = ["oleosa", "mista"],
                Concerns = ["hidratacao"],
                Actives = ["acido hialuronico"],
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "medium",
                PriceAvg = 80m,
            },
            new()
            {
                Name = "Locao Facial",
                Brand = "CeraVe",
                Category = "moisturizer",
                SkinTypes = ["todas"],
                Concerns = ["hidratacao", "barreira"],
                Actives = ["ceramidas"],
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "medium",
                PriceAvg = 70m,
            },
            new()
            {
                Name = "Epidrat Rosto",
                Brand = "Mantecorp",
                Category = "moisturizer",
                SkinTypes = ["todas"],
                Concerns = ["hidratacao"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "medium",
                PriceAvg = 75m,
            },
            new()
            {
                Name = "Calming Cream",
                Brand = "Creamy",
                Category = "moisturizer",
                SkinTypes = ["sensivel", "todas"],
                Concerns = ["sensibilidade"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "medium",
                PriceAvg = 70m,
            },
            new()
            {
                Name = "Mix-01",
                Brand = "Principia",
                Category = "serum",
                SkinTypes = ["oleosa", "mista"],
                Concerns = ["acne", "oleosidade", "poros"],
                Actives = ["niacinamida"],
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "low",
                PriceAvg = 60m,
            },
            new()
            {
                Name = "Mix-03",
                Brand = "Principia",
                Category = "serum",
                SkinTypes = ["oleosa"],
                Concerns = ["acne"],
                Actives = ["acidos"],
                StrengthLevel = "medio",
                Period = ["noite"],
                PriceRange = "low",
                PriceAvg = 60m,
            },
            new()
            {
                Name = "Vitamina C",
                Brand = "Creamy",
                Category = "serum",
                SkinTypes = ["todas"],
                Concerns = ["manchas", "viço"],
                Actives = ["vitamina c"],
                StrengthLevel = "leve",
                Period = ["manha"],
                PriceRange = "medium",
                PriceAvg = 80m,
            },
            new()
            {
                Name = "Vitamina C",
                Brand = "La Roche-Posay",
                Category = "serum",
                SkinTypes = ["todas"],
                Concerns = ["manchas", "rugas"],
                Actives = ["vitamina c"],
                StrengthLevel = "medio",
                Period = ["manha"],
                PriceRange = "high",
                PriceAvg = 200m,
            },
            new()
            {
                Name = "Anthelios",
                Brand = "La Roche-Posay",
                Category = "sunscreen",
                SkinTypes = ["todas"],
                Concerns = ["protecao"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha"],
                PriceRange = "high",
                PriceAvg = 110m,
            },
            new()
            {
                Name = "Oil Control FPS 60",
                Brand = "Eucerin",
                Category = "sunscreen",
                SkinTypes = ["oleosa"],
                Concerns = ["oleosidade"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha"],
                PriceRange = "medium",
                PriceAvg = 90m,
            },
            new()
            {
                Name = "UV Aqua Rich",
                Brand = "Bioré",
                Category = "sunscreen",
                SkinTypes = ["todas"],
                Concerns = ["protecao"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha"],
                PriceRange = "medium",
                PriceAvg = 80m,
            },
            new()
            {
                Name = "Nivea Sun FPS 60",
                Brand = "Nivea",
                Category = "sunscreen",
                SkinTypes = ["todas"],
                Concerns = ["protecao"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha"],
                PriceRange = "low",
                PriceAvg = 40m,
            },
            new()
            {
                Name = "Adapaleno",
                Brand = "Medley",
                Category = "treatment",
                SkinTypes = ["oleosa", "acneica"],
                Concerns = ["acne", "cravos"],
                Actives = ["retinoide"],
                StrengthLevel = "forte",
                Period = ["noite"],
                PriceRange = "low",
                PriceAvg = 35m,
            },
            new()
            {
                Name = "Azelan",
                Brand = "Generico",
                Category = "treatment",
                SkinTypes = ["todas"],
                Concerns = ["acne", "manchas"],
                Actives = ["acido azelaico"],
                StrengthLevel = "medio",
                Period = ["noite"],
                PriceRange = "medium",
                PriceAvg = 60m,
            },
            new()
            {
                Name = "Epiduo",
                Brand = "Galderma",
                Category = "treatment",
                SkinTypes = ["acneica"],
                Concerns = ["acne"],
                Actives = ["adapaleno", "peroxido"],
                StrengthLevel = "forte",
                Period = ["noite"],
                PriceRange = "high",
                PriceAvg = 120m,
            },
            new()
            {
                Name = "Vitanol A",
                Brand = "Stiefel",
                Category = "treatment",
                SkinTypes = ["todas"],
                Concerns = ["rugas"],
                Actives = ["retinol"],
                StrengthLevel = "forte",
                Period = ["noite"],
                PriceRange = "medium",
                PriceAvg = 70m,
            },
            new()
            {
                Name = "Cafeina 5% + EGCG",
                Brand = "Principia",
                Category = "eye",
                SkinTypes = ["todas"],
                Concerns = ["olheiras"],
                Actives = ["cafeina"],
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "low",
                PriceAvg = 50m,
            },
            new()
            {
                Name = "Hyaluron-Filler Eye",
                Brand = "Eucerin",
                Category = "eye",
                SkinTypes = ["todas"],
                Concerns = ["olheiras", "rugas"],
                Actives = ["acido hialuronico"],
                StrengthLevel = "medio",
                Period = ["manha", "noite"],
                PriceRange = "high",
                PriceAvg = 150m,
            },
            new()
            {
                Name = "Serum Anti-Olheiras",
                Brand = "Sallve",
                Category = "eye",
                SkinTypes = ["todas"],
                Concerns = ["olheiras"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "medium",
                PriceAvg = 100m,
            },
            new()
            {
                Name = "Eye Cream",
                Brand = "Creamy",
                Category = "eye",
                SkinTypes = ["todas"],
                Concerns = ["olheiras"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "medium",
                PriceAvg = 80m,
            },
            new()
            {
                Name = "Lip Care",
                Brand = "Nivea",
                Category = "lip",
                SkinTypes = ["todas"],
                Concerns = ["ressecamento"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "low",
                PriceAvg = 15m,
            },
            new()
            {
                Name = "Bepantol Labial",
                Brand = "Bepantol",
                Category = "lip",
                SkinTypes = ["todas"],
                Concerns = ["ressecamento"],
                Actives = ["pantenol"],
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "medium",
                PriceAvg = 40m,
            },
            new()
            {
                Name = "Lip Balm",
                Brand = "Creamy",
                Category = "lip",
                SkinTypes = ["todas"],
                Concerns = ["hidratacao"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "medium",
                PriceAvg = 35m,
            },
            new()
            {
                Name = "Cicaplast Lips",
                Brand = "La Roche-Posay",
                Category = "lip",
                SkinTypes = ["todas"],
                Concerns = ["ressecamento"],
                Actives = Array.Empty<string>(),
                StrengthLevel = "leve",
                Period = ["manha", "noite"],
                PriceRange = "high",
                PriceAvg = 70m,
            },
        };

        var seedKeys = seedProducts
            .Select(product => BuildKey(product.Name, product.Brand))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var product in seedProducts)
        {
            product.IsUserProduct = false;
            product.UserId = null;
            // Keep in sync but SkinTypes array is the source of truth
            if (product.SkinTypes.Length > 0)
            {
#pragma warning disable CS0618
                product.SkinType = product.SkinTypes.FirstOrDefault() ?? "todas";
#pragma warning restore CS0618
            }
        }

        var existingKeys = dbContext.Products
            .AsNoTracking()
            .Select(product => new { product.Name, product.Brand })
            .AsEnumerable()
            .Select(product => BuildKey(product.Name, product.Brand))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (existingKeys.SetEquals(seedKeys))
        {
            return;
        }

        dbContext.Products.ExecuteDelete();
        dbContext.Products.AddRange(seedProducts);
        dbContext.SaveChanges();
    }

    private static string BuildKey(string name, string brand)
    {
        return $"{name.Trim()}::{brand.Trim()}";
    }
}
