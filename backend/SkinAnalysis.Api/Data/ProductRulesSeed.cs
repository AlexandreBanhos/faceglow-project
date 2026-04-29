using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Data;

/// <summary>
/// Seed ProductRules from existing Products.
/// 
/// One-time data migration: each Product becomes a ProductRule
/// with intelligence extracted from existing fields.
/// 
/// Priority assignment:
/// - Cleanser: 5 (foundation)
/// - Moisturizer: 6 (hydration layer)
/// - Serum: 7 (active layer)
/// - Treatment: 10 (strongest = highest priority)
/// - Sunscreen: 9 (critical for AM)
/// - Eye: 6 (specialized)
/// - Lip: 4 (optional)
/// - Exfoliant: 8 (powerful)
/// - Mask: 7 (occasional)
/// </summary>
public static class ProductRulesSeed
{
    public static void EnsureSeed(AppDbContext dbContext)
    {
        dbContext.Database.SetCommandTimeout(60);

        // Check if already seeded
        if (dbContext.ProductRules.Any())
        {
            Console.WriteLine("[SEED] ProductRules already seeded, running upgrade...");
            UpgradeExistingRules(dbContext);
            return;
        }

        Console.WriteLine("[SEED] Starting ProductRules seed from Products...");

        var products = dbContext.Products
            .AsNoTracking()
            .Where(x => x.IsActive)
            .ToList();

        if (!products.Any())
        {
            Console.WriteLine("[SEED] No active products found, skipping ProductRules seed");
            return;
        }

        var rules = new List<ProductRule>();

        foreach (var product in products)
        {
            var rule = new ProductRule
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                SkinTypes = product.SkinTypes ?? Array.Empty<string>(),
                Concerns = product.Concerns ?? Array.Empty<string>(),
                Actives = product.Actives ?? Array.Empty<string>(),
                StepTypes = DetermineStepTypes(product.Category),
                Periods = product.Period ?? Array.Empty<string>(),
                StrengthLevel = product.StrengthLevel ?? "leve",
                Priority = DeterminePriority(product.Category, product.Priority),
                Reasoning = GenerateReasoning(product),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            rules.Add(rule);
        }

        dbContext.ProductRules.AddRange(rules);
        dbContext.SaveChanges();

        Console.WriteLine($"[SEED] Successfully created {rules.Count} ProductRules from Products");

        // Log summary by category
        var byCategory = rules.GroupBy(r => r.StepTypes?.FirstOrDefault() ?? "unknown");
        foreach (var group in byCategory)
        {
            Console.WriteLine($"  - {group.Key}: {group.Count()} rules");
        }
    }

    /// <summary>
    /// Upgrade existing ProductRules to fix Portuguese category mappings and priorities.
    /// This fixes the bug where Retinoide categories weren't being mapped to "treatment" step type.
    /// </summary>
    private static void UpgradeExistingRules(AppDbContext dbContext)
    {
        Console.WriteLine("[SEED] Upgrading existing ProductRules...");
        
        try
        {
            var rulesToUpdate = dbContext.ProductRules
                .Where(r => r.StepTypes != null && r.StepTypes.Length > 0)
                .ToList();

            var updatedCount = 0;

            foreach (var rule in rulesToUpdate)
            {
                // Get the product to check original category
                var product = dbContext.Products
                    .AsNoTracking()
                    .FirstOrDefault(p => p.Id == rule.ProductId);

                if (product == null)
                    continue;

                var originalCategory = product.Category;
                var newStepTypes = DetermineStepTypes(originalCategory);
                var newPriority = DeterminePriority(originalCategory, product.Priority);

                // Check if anything changed
                if (!rule.StepTypes.SequenceEqual(newStepTypes) || rule.Priority != newPriority)
                {
                    rule.StepTypes = newStepTypes;
                    rule.Priority = newPriority;
                    rule.UpdatedAt = DateTime.UtcNow;
                    updatedCount++;
                }
            }

            if (updatedCount > 0)
            {
                dbContext.SaveChanges();
                Console.WriteLine($"[SEED] Updated {updatedCount} ProductRules");
                
                // Log sample updates by step type
                var byStepType = rulesToUpdate.GroupBy(r => r.StepTypes?.FirstOrDefault() ?? "unknown");
                foreach (var group in byStepType)
                {
                    Console.WriteLine($"  - {group.Key}: {group.Count()} rules");
                }
            }
            else
            {
                Console.WriteLine("[SEED] No ProductRules updates needed");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SEED] Error upgrading ProductRules: {ex.Message}");
        }
    }

    /// <summary>
    /// Map product category to one or more step types.
    /// Supports both English and Portuguese category names.
    /// </summary>
    private static string[] DetermineStepTypes(string? category)
    {
        return (category ?? "").ToLowerInvariant() switch
        {
            // English categories
            "cleanser" => new[] { "cleanser" },
            "moisturizer" => new[] { "moisturizer" },
            "serum" => new[] { "serum" },
            "treatment" => new[] { "treatment" },
            "sunscreen" => new[] { "sunscreen" },
            "eye" => new[] { "eye" },
            "lip" => new[] { "lip" },
            "exfoliant" => new[] { "exfoliant" },
            "mask" => new[] { "mask" },
            "toner" => new[] { "toner" },
            "oil" => new[] { "oil" },
            
            // Portuguese categories (mapped to English step types)
            "limpeza" => new[] { "cleanser" },
            "hidratante" => new[] { "moisturizer" },
            "retinoide" or "retinol" => new[] { "treatment" },  // Retinoids/Retinols map to treatment
            "protetor" => new[] { "sunscreen" },
            "olho" => new[] { "eye" },
            "labio" => new[] { "lip" },
            "esfoliante" => new[] { "exfoliant" },
            "mascara" => new[] { "mask" },
            "tonico" => new[] { "toner" },
            
            _ => new[] { category ?? "other" }
        };
    }

    /// <summary>
    /// Assign priority based on category and product priority.
    /// Higher = prioritized in recommendations.
    /// Supports both English and Portuguese category names.
    /// </summary>
    private static int DeterminePriority(string? category, int? productPriority)
    {
        var isSpecialCategory = (category ?? "").ToLowerInvariant();
        var basePriority = isSpecialCategory switch
        {
            // Treatment categories (retinoide/retinol = strongest actives)
            "treatment" or "retinoide" or "retinol" => 10,    
            
            // Active treatments
            "serum" or "esfoliante" or "exfoliant" => 8,
            
            // Critical protection (AM only)
            "sunscreen" or "protetor" => 9,
            
            // Intensive treatments
            "mask" or "mascara" => 7,
            
            // Foundation hydration
            "moisturizer" or "hidratante" => 6,
            "eye" or "olho" => 6,
            
            // Secondary
            "toner" or "tonico" => 5,
            "cleanser" or "limpeza" => 5,
            "lip" or "labio" => 4,
            "oil" => 5,
            
            _ => 3  // Default for unknown categories
        };

        // Add product-level priority modifier (if set)
        var productModifier = (productPriority ?? 0) > 0 ? productPriority.Value : 0;
        
        return basePriority + productModifier;
    }

    /// <summary>
    /// Generate human-readable reasoning for why this rule exists.
    /// </summary>
    private static string GenerateReasoning(Product product)
    {
        var parts = new List<string>();

        // Skin type reasoning
        if (product.SkinTypes?.Any() == true)
        {
            var types = string.Join(", ", product.SkinTypes);
            parts.Add($"Para pele: {types}");
        }

        // Concern reasoning
        if (product.Concerns?.Any() == true)
        {
            var maxConcerns = Math.Min(3, product.Concerns.Length);
            var concerns = string.Join(", ", product.Concerns.Take(maxConcerns));
            parts.Add($"Resolve: {concerns}");
        }

        // Actives reasoning
        if (product.Actives?.Any() == true && product.Actives.Length > 0)
        {
            var actives = string.Join(", ", product.Actives.Take(2));
            parts.Add($"Com: {actives}");
        }

        // Period reasoning
        if (product.Period?.Any() == true)
        {
            var periods = string.Join(" + ", product.Period);
            parts.Add($"Usar: {periods}");
        }

        return string.Join(" | ", parts).Substring(0, Math.Min(500, string.Join(" | ", parts).Length));
    }

    /// <summary>
    /// Run after startup when database is ready.
    /// </summary>
    public static async Task EnsureSeedAsync(AppDbContext dbContext)
    {
        try
        {
            await Task.Run(() => EnsureSeed(dbContext));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SEED] Error seeding ProductRules: {ex.Message}");
            throw;
        }
    }
}
