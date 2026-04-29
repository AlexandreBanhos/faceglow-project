using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Services;

/// <summary>
/// Core recommendation engine: filters + scores to find best products.
/// Replaces binary WHERE filters with intelligent ranking.
/// </summary>
public class ProductRecommendationEngine
{
    private readonly AppDbContext _dbContext;

    public ProductRecommendationEngine(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Score-based product recommendation (not just filter).
    /// Returns products ranked by relevance score.
    /// 
    /// Scoring logic:
    /// - SkinType match: +3 points
    /// - Concern match: +5 points per concern match
    /// - Period match: +2 points
    /// - Priority boost: + priority value
    /// - Strength level bias: adjust for tolerance
    /// 
    /// Example:
    /// - Product matches skin_type: +3
    /// - Matches 2 concerns: +10
    /// - Matches period: +2
    /// - Priority: 8
    /// - Total: 23 points
    /// </summary>
    public async Task<List<ProductRecommendation>> ScoreProductsAsync(
        string[] skinTypes,
        string[] concerns,
        string[] periods,
        int limit = 5,
        decimal minScoreThreshold = 1m)
    {
        // Load all active ProductRules with their Products
        var rules = await _dbContext.ProductRules
            .Include(x => x.Product)
            .Where(x => x.Product!.IsActive)
            .ToListAsync();

        if (!rules.Any())
            return [];

        // Score each rule based on input match
        var scored = rules
            .Select(rule => new ProductRecommendation
            {
                ProductId = rule.ProductId,
                Product = rule.Product!,
                Rule = rule,
                Score = CalculateScore(rule, skinTypes, concerns, periods),
                MatchDetails = BuildMatchDetails(rule, skinTypes, concerns, periods)
            })
            .Where(x => x.Score >= minScoreThreshold)
            .OrderByDescending(x => x.Score)
            .Take(limit)
            .ToList();

        return scored;
    }

    /// <summary>
    /// Calculate relevance score for a product rule against user input.
    /// Higher score = better match.
    /// </summary>
    private decimal CalculateScore(
        ProductRule rule,
        string[] userSkinTypes,
        string[] userConcerns,
        string[] userPeriods)
    {
        decimal score = 0;

        // 1. Skin type match: +3 if ANY overlap
        var skinTypeMatches = rule.SkinTypes?.Intersect(userSkinTypes, StringComparer.OrdinalIgnoreCase).Count() ?? 0;
        if (skinTypeMatches > 0)
            score += 3 * skinTypeMatches;

        // 2. Concern match: +5 per matching concern
        var concernMatches = rule.Concerns?.Intersect(userConcerns, StringComparer.OrdinalIgnoreCase).Count() ?? 0;
        if (concernMatches > 0)
            score += 5 * concernMatches;

        // 3. Period match: +2 if ANY overlap
        var periodMatches = rule.Periods?.Intersect(userPeriods, StringComparer.OrdinalIgnoreCase).Count() ?? 0;
        if (periodMatches > 0)
            score += 2 * periodMatches;

        // 4. Priority boost: add rule's priority (can be 1-10)
        score += rule.Priority;

        return score;
    }

    /// <summary>
    /// Build human-readable explanation of why product was scored.
    /// Useful for debugging and showing user transparency in recommendations.
    /// </summary>
    private MatchDetails BuildMatchDetails(
        ProductRule rule,
        string[] userSkinTypes,
        string[] userConcerns,
        string[] userPeriods)
    {
        var details = new MatchDetails();

        var skinMatches = rule.SkinTypes?.Intersect(userSkinTypes, StringComparer.OrdinalIgnoreCase).ToList() ?? [];
        if (skinMatches.Any())
            details.SkinTypeMatches = skinMatches;

        var concernMatches = rule.Concerns?.Intersect(userConcerns, StringComparer.OrdinalIgnoreCase).ToList() ?? [];
        if (concernMatches.Any())
            details.ConcernMatches = concernMatches;

        var periodMatches = rule.Periods?.Intersect(userPeriods, StringComparer.OrdinalIgnoreCase).ToList() ?? [];
        if (periodMatches.Any())
            details.PeriodMatches = periodMatches;

        details.RulePriority = rule.Priority;
        details.RuleReasoning = rule.Reasoning;

        return details;
    }

    /// <summary>
    /// Get best products for each step type (e.g., cleanser, serum, moisturizer).
    /// Used for building complete routines.
    /// </summary>
    public async Task<Dictionary<string, ProductRecommendation?>> GetBestByStepTypeAsync(
        string[] skinTypes,
        string[] concerns,
        string[] periods,
        string[] stepTypes)
    {
        var byStepType = new Dictionary<string, ProductRecommendation?>(StringComparer.OrdinalIgnoreCase);

        foreach (var stepType in stepTypes)
        {
            var rules = await _dbContext.ProductRules
                .Include(x => x.Product)
                .Where(x =>
                    x.Product!.IsActive &&
                    (x.StepTypes == null || x.StepTypes.Contains(stepType, StringComparer.OrdinalIgnoreCase))
                )
                .ToListAsync();

            var best = rules
                .Select(rule => new
                {
                    Rule = rule,
                    Score = CalculateScore(rule, skinTypes, concerns, periods)
                })
                .OrderByDescending(x => x.Score)
                .FirstOrDefault();

            if (best != null)
            {
                byStepType[stepType] = new ProductRecommendation
                {
                    ProductId = best.Rule.ProductId,
                    Product = best.Rule.Product!,
                    Rule = best.Rule,
                    Score = best.Score,
                    MatchDetails = BuildMatchDetails(best.Rule, skinTypes, concerns, periods)
                };
            }
        }

        return byStepType;
    }
}

/// <summary>
/// Result of scoring a product against user input.
/// </summary>
public class ProductRecommendation
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public ProductRule Rule { get; set; } = null!;
    public decimal Score { get; set; }
    public MatchDetails MatchDetails { get; set; } = new();
}

/// <summary>
/// Transparency layer: why did this product score so high?
/// </summary>
public class MatchDetails
{
    public List<string> SkinTypeMatches { get; set; } = [];
    public List<string> ConcernMatches { get; set; } = [];
    public List<string> PeriodMatches { get; set; } = [];
    public int RulePriority { get; set; }
    public string? RuleReasoning { get; set; }
}
