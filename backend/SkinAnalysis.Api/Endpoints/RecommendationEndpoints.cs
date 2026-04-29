using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Endpoints;

/// <summary>
/// Recommendation endpoints using the new scoring engine with cache + telemetry.
/// 
/// These are v2 endpoints that replace the old binary filtering with:
/// 1. RecommendationInput validation (enum checking)
/// 2. ProductRecommendationEngine scoring (relevance ranking)
/// 3. RoutineBuilder assembly (complete sequences)
/// 4. RecommendationCacheService (avoid redundant queries)
/// 5. RecommendationTelemetryService (track acceptance + feedback)
/// </summary>
public static class RecommendationEndpoints
{
    /// <summary>
    /// POST /v2/recommendations
    /// 
    /// Get scored product recommendations + complete routine.
    /// Uses caching + scoring (not binary filtering).
    /// 
    /// Example request:
    /// {
    ///   "skinType": "oleosa",
    ///   "concerns": ["acne", "oleosidade"],
    ///   "periods": ["manha", "noite"],
    ///   "analysisId": "uuid-123"
    /// }
    /// 
    /// Example response:
    /// {
    ///   "recommendationLogId": "uuid-log",
    ///   "morning": {
    ///     "steps": [
    ///       { "order": 1, "stepType": "cleanser", "product": {...}, "score": 18 },
    ///       { "order": 2, "stepType": "serum", "product": {...}, "score": 22 },
    ///       ...
    ///     ]
    ///   },
    ///   "night": { ... },
    ///   "allProducts": [...],
    ///   "cacheHit": true,
    ///   "cacheHitCount": 5
    /// }
    /// </summary>
    public static void MapRecommendationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/v2/recommendations")
            .WithName("RecommendationsV2")
            .WithOpenApi()
            .RequireAuthorization();

        group.MapPost("/", GetRecommendations)
            .WithName("GetRecommendations")
            .WithOpenApi();

        group.MapPost("/{logId:guid}/feedback", RecordRecommendationFeedback)
            .WithName("RecordRecommendationFeedback")
            .WithOpenApi();

        group.MapGet("/analytics", GetRecommendationAnalytics)
            .WithName("GetRecommendationAnalytics")
            .WithOpenApi();

        group.MapGet("/cache/stats", GetCacheStats)
            .WithName("GetCacheStats")
            .WithOpenApi();
    }

    private static async Task<IResult> GetRecommendations(
        RecommendationRequest request,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        ProductRecommendationEngine engine,
        RoutineBuilder routineBuilder,
        RecommendationCacheService cacheService,
        RecommendationTelemetryService telemetryService,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        // Authenticate user
        var userId = GetAuthenticatedUserId(user);
        if (!userId.HasValue)
            return Results.Unauthorized();

        try
        {
            // Validate input
            var input = RecommendationInput.Validate(
                request.SkinType,
                request.Concerns,
                request.Periods
            );

            logger.LogInformation(
                "[REC] New recommendation request for user {UserId}: {Input}",
                userId.Value, input);

            // Try cache first
            var cached = await cacheService.TryGetFromCacheAsync(
                userId.Value,
                input.SkinType,
                input.GetConcernsArray(),
                input.GetPeriodsArray()
            );

            // Build routine (cached or fresh)
            var routine = await routineBuilder.BuildCompleteRoutineAsync(
                input.GetSkinTypesArray(),
                input.GetConcernsArray(),
                input.GetPeriodsArray()
            );

            var productIds = routine.AllProducts.Select(p => p.Id).ToArray();
            var scores = routine.Morning.Steps
                .Concat(routine.Night.Steps)
                .Where(s => s.Product != null)
                .OrderByDescending(s => s.Score)
                .Select(s => s.Score)
                .ToArray();

            // Log telemetry
            var log = await telemetryService.LogRecommendationAsync(
                userId.Value,
                request.AnalysisId,
                input.SkinType,
                input.GetConcernsArray(),
                input.GetPeriodsArray(),
                productIds,
                scores,
                routineType: routine.RoutineType,
                aiEngine: "recommendation-engine"
            );

            // Cache for future use
            if (cached == null)
            {
                await cacheService.CacheRecommendationsAsync(
                    userId.Value,
                    input.SkinType,
                    input.GetConcernsArray(),
                    input.GetPeriodsArray(),
                    productIds,
                    scores
                );
            }

            logger.LogInformation(
                "[REC] Recommendation ready for user {UserId}: {ProductCount} products, " +
                "cache hit: {CacheHit}, routine type: {RoutineType}",
                userId.Value, productIds.Length, cached != null, routine.RoutineType);

            return Results.Ok(new
            {
                recommendationLogId = log.Id,
                morning = new
                {
                    type = routine.Morning.Type,
                    period = routine.Morning.Period,
                    steps = routine.Morning.Steps.Select(s => new
                    {
                        order = s.Order,
                        stepType = s.StepType,
                        product = s.Product == null ? null : new
                        {
                            id = s.Product.Id,
                            name = s.Product.Name,
                            brand = s.Product.Brand,
                            category = s.Product.Category,
                            imageUrl = s.Product.ImageUrl ?? "",
                            price = s.Product.PriceAvg ?? 0,
                            priceRange = s.Product.PriceRange
                        },
                        score = s.Score,
                        reasoning = s.Reasoning,
                        isOptional = s.IsOptional
                    }).ToArray()
                },
                night = new
                {
                    type = routine.Night.Type,
                    period = routine.Night.Period,
                    steps = routine.Night.Steps.Select(s => new
                    {
                        order = s.Order,
                        stepType = s.StepType,
                        product = s.Product == null ? null : new
                        {
                            id = s.Product.Id,
                            name = s.Product.Name,
                            brand = s.Product.Brand,
                            category = s.Product.Category,
                            imageUrl = s.Product.ImageUrl ?? "",
                            price = s.Product.PriceAvg ?? 0,
                            priceRange = s.Product.PriceRange
                        },
                        score = s.Score,
                        reasoning = s.Reasoning,
                        isOptional = s.IsOptional
                    }).ToArray()
                },
                allProducts = routine.AllProducts.Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    brand = p.Brand,
                    category = p.Category,
                    price = p.PriceAvg ?? 0,
                    priceRange = p.PriceRange,
                    imageUrl = p.ImageUrl ?? ""
                }).ToArray(),
                routineType = routine.RoutineType,
                complexity = routine.Complexity,
                cacheHit = cached != null,
                cacheHitCount = cached?.HitCount ?? 0
            });
        }
        catch (ArgumentException ex)
        {
            logger.LogWarning("[REC] Validation error: {Message}", ex.Message);
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[REC] Unexpected error getting recommendations");
            return Results.Problem("Failed to get recommendations", statusCode: 500);
        }
    }

    private static async Task<IResult> RecordRecommendationFeedback(
        Guid logId,
        RecommendationFeedbackRequest request,
        ClaimsPrincipal user,
        RecommendationTelemetryService telemetryService,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        var userId = GetAuthenticatedUserId(user);
        if (!userId.HasValue)
            return Results.Unauthorized();

        try
        {
            await telemetryService.RecordFeedbackAsync(
                logId,
                request.SelectedProductIds ?? Array.Empty<Guid>(),
                request.Rating,
                request.Comment
            );

            logger.LogInformation(
                "[TELEMETRY] Recorded feedback for recommendation {LogId}: {Selected} products, rating {Rating}",
                logId, request.SelectedProductIds?.Length ?? 0, request.Rating);

            return Results.Ok(new { success = true });
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> GetRecommendationAnalytics(
        RecommendationTelemetryService telemetryService,
        ClaimsPrincipal user,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        var userId = GetAuthenticatedUserId(user);
        if (!userId.HasValue)
            return Results.Unauthorized();

        try
        {
            var analytics = await telemetryService.GetAnalyticsAsync();

            return Results.Ok(new
            {
                summary = analytics.Summary,
                totalRecommendations = analytics.TotalRecommendations,
                recommendationsWithFeedback = analytics.RecommendationsWithFeedback,
                feedbackRate = $"{analytics.FeedbackRate:P1}",
                averageAcceptanceRate = $"{analytics.AverageAcceptanceRate:P1}",
                averageTimeToFeedback = $"{analytics.AverageTimeToFeedback.TotalSeconds:F0}s",
                averageRecommendationCount = $"{analytics.AverageRecommendationCount:F1}",
                averageHighestScore = $"{analytics.AverageHighestScore:F2}",
                popularProducts = analytics.PopularProducts.Take(5),
                popularSkinTypes = analytics.PopularSkinTypes.Take(5),
                popularConcerns = analytics.PopularConcerns.Take(5),
                timeWindow = analytics.TimeWindow.TotalDays,
                asOf = analytics.AsOf
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[TELEMETRY] Error getting analytics");
            return Results.Problem("Failed to get analytics", statusCode: 500);
        }
    }

    private static async Task<IResult> GetCacheStats(
        RecommendationCacheService cacheService,
        ClaimsPrincipal user,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        var userId = GetAuthenticatedUserId(user);
        if (!userId.HasValue)
            return Results.Unauthorized();

        try
        {
            var stats = await cacheService.GetStatsAsync();

            return Results.Ok(new
            {
                totalEntries = stats.TotalEntries,
                activeEntries = stats.ActiveEntries,
                expiredEntries = stats.ExpiredEntries,
                totalHits = stats.TotalHits,
                hitRate = $"{stats.HitRate:F2}",
                efficiency = stats.TotalEntries > 0
                    ? $"{((stats.TotalHits / (decimal)stats.TotalEntries) * 100):F1}% hits per entry"
                    : "No data"
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[CACHE] Error getting stats");
            return Results.Problem("Failed to get cache stats", statusCode: 500);
        }
    }

    private static Guid? GetAuthenticatedUserId(ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirstValue("sub");
        return !string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId)
            ? userId
            : null;
    }
}

/// <summary>
/// Request to get recommendations.
/// </summary>
public class RecommendationRequest
{
    public string SkinType { get; set; } = "";
    public List<string>? Concerns { get; set; }
    public List<string>? Periods { get; set; }
    public Guid? AnalysisId { get; set; }
}

/// <summary>
/// Request to record user feedback on recommendations.
/// </summary>
public class RecommendationFeedbackRequest
{
    public Guid[]? SelectedProductIds { get; set; }
    public int? Rating { get; set; } // 1-5 stars
    public string? Comment { get; set; }
}
