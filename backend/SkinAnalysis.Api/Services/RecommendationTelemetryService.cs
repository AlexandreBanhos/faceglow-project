using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Services;

/// <summary>
/// Recommendation telemetry: captures every recommendation for analysis.
/// 
/// Tracks:
/// 1. Input: what skin type + concerns + periods
/// 2. Output: which products were recommended + their scores
/// 3. Feedback: did user accept/reject the recommendations
/// 4. Metrics: acceptance rate, time to feedback, product performance
/// 
/// Purpose:
/// - Understand AI recommendation quality
/// - Identify underperforming products
/// - Train future recommendation models
/// - Answer "what are most popular recommendations?"
/// - Detect trends over time
/// </summary>
public class RecommendationTelemetryService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<RecommendationTelemetryService> _logger;

    public RecommendationTelemetryService(AppDbContext dbContext, ILogger<RecommendationTelemetryService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Log a recommendation event.
    /// </summary>
    public async Task<RecommendationLog> LogRecommendationAsync(
        Guid userId,
        Guid? analysisId,
        string skinType,
        string[] concerns,
        string[] periods,
        Guid[] recommendedProductIds,
        decimal[] scores,
        string? routineType = null,
        string aiEngine = "gemini")
    {
        if (recommendedProductIds.Length != scores.Length)
            throw new ArgumentException("ProductIds and Scores arrays must have same length");

        var log = new RecommendationLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AnalysisId = analysisId,
            InputSkinType = skinType,
            InputConcerns = concerns,
            InputPeriods = periods,
            RecommendedProductIds = recommendedProductIds,
            RecommendationScores = scores,
            AiEngine = aiEngine,
            RoutineType = routineType,
            RecommendationCount = recommendedProductIds.Length,
            HighestScore = scores.Length > 0 ? scores.Max() : 0,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.RecommendationLogs.Add(log);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "[TELEMETRY] Logged recommendation for user {UserId}: {Count} products, highest score {Score}, routine type {RoutineType}",
            userId, recommendedProductIds.Length, scores.Max(), routineType ?? "N/A");

        return log;
    }

    /// <summary>
    /// Record user feedback on a recommendation.
    /// Call this when user selects/accepts products.
    /// </summary>
    public async Task RecordFeedbackAsync(
        Guid recommendationLogId,
        Guid[] selectedProductIds,
        int? rating = null,
        string? comment = null)
    {
        var log = await _dbContext.RecommendationLogs
            .FirstOrDefaultAsync(x => x.Id == recommendationLogId);

        if (log == null)
            throw new ArgumentException($"Recommendation log not found: {recommendationLogId}");

        log.SelectedProductIds = selectedProductIds;
        log.FeedbackRating = rating;
        log.FeedbackComment = comment;
        log.FeedbackProvidedAt = DateTime.UtcNow;

        _dbContext.RecommendationLogs.Update(log);
        await _dbContext.SaveChangesAsync();

        var acceptanceRate = log.AcceptanceRate;
        var timeToFeedback = log.TimeToFeedback;

        _logger.LogInformation(
            "[TELEMETRY] Recorded feedback for recommendation {LogId}: {Selected} of {Recommended} products selected, " +
            "acceptance rate {AcceptanceRate:P}, time to feedback {TimeToFeedback}",
            recommendationLogId, selectedProductIds.Length, log.RecommendationCount,
            acceptanceRate, timeToFeedback?.TotalSeconds.ToString("F0") + "s" ?? "immediate");
    }

    /// <summary>
    /// Get analytics on recommendation quality.
    /// </summary>
    public async Task<RecommendationAnalytics> GetAnalyticsAsync(TimeSpan? timeWindow = null)
    {
        timeWindow ??= TimeSpan.FromDays(30);
        var since = DateTime.UtcNow.Subtract(timeWindow.Value);

        var logs = await _dbContext.RecommendationLogs
            .Where(x => x.CreatedAt >= since)
            .ToListAsync();

        if (logs.Count == 0)
            return new RecommendationAnalytics();

        var logsWithFeedback = logs.Where(x => x.HasFeedback).ToList();

        var analytics = new RecommendationAnalytics
        {
            TotalRecommendations = logs.Count,
            RecommendationsWithFeedback = logsWithFeedback.Count,
            AverageAcceptanceRate = logsWithFeedback.Count > 0
                ? logsWithFeedback.Average(x => (double)x.AcceptanceRate)
                : 0,
            AverageTimeToFeedback = logsWithFeedback.Count > 0
                ? TimeSpan.FromSeconds(logsWithFeedback.Average(x => x.TimeToFeedback?.TotalSeconds ?? 0))
                : TimeSpan.Zero,
            AverageRecommendationCount = logs.Average(x => x.RecommendationCount),
            AverageHighestScore = logs.Average(x => (double)x.HighestScore),
            FeedbackRate = logsWithFeedback.Count / (double)logs.Count,
            PopularProducts = GetPopularProducts(logs, 10),
            PopularSkinTypes = GetPopularCategories(logs, x => x.InputSkinType, 10),
            PopularConcerns = GetPopularCategories(logs, x => x.InputConcerns, 10),
            TimeWindow = timeWindow.Value,
            AsOf = DateTime.UtcNow
        };

        return analytics;
    }

    /// <summary>
    /// Get performance metrics for a specific product.
    /// </summary>
    public async Task<ProductPerformanceMetrics> GetProductPerformanceAsync(Guid productId, TimeSpan? timeWindow = null)
    {
        timeWindow ??= TimeSpan.FromDays(30);
        var since = DateTime.UtcNow.Subtract(timeWindow.Value);

        var logs = await _dbContext.RecommendationLogs
            .Where(x =>
                x.CreatedAt >= since &&
                (x.RecommendedProductIds.Contains(productId) || x.SelectedProductIds!.Contains(productId))
            )
            .ToListAsync();

        if (logs.Count == 0)
            return new ProductPerformanceMetrics { ProductId = productId };

        var recommendedIn = logs.Count(x => x.RecommendedProductIds.Contains(productId));
        var selectedIn = logs.Count(x => x.SelectedProductIds != null && x.SelectedProductIds.Contains(productId));
        var ratedHighly = logs.Count(x =>
            x.SelectedProductIds != null &&
            x.SelectedProductIds.Contains(productId) &&
            x.FeedbackRating >= 4
        );

        return new ProductPerformanceMetrics
        {
            ProductId = productId,
            TimesRecommended = recommendedIn,
            TimesSelected = selectedIn,
            SelectionRate = recommendedIn > 0 ? (decimal)selectedIn / recommendedIn : 0,
            HighRatings = ratedHighly,
            AverageScore = logs
                .Where(x => x.RecommendedProductIds.Contains(productId))
                .SelectMany(x => x.RecommendationScores.Select((s, i) =>
                    x.RecommendedProductIds[i] == productId ? s : 0
                ))
                .Average(),
            TimeWindow = timeWindow.Value,
            AsOf = DateTime.UtcNow
        };
    }

    private static List<CategoryCount> GetPopularProducts(List<RecommendationLog> logs, int top)
    {
        return logs
            .SelectMany(x => x.RecommendedProductIds)
            .GroupBy(x => x)
            .OrderByDescending(x => x.Count())
            .Take(top)
            .Select(x => new CategoryCount
            {
                Category = x.Key.ToString(),
                Count = x.Count()
            })
            .ToList();
    }

    private static List<CategoryCount> GetPopularCategories(
        List<RecommendationLog> logs,
        Func<RecommendationLog, dynamic> selector,
        int top)
    {
        var result = new List<string>();

        foreach (var log in logs)
        {
            var value = selector(log);
            if (value is string[] arr)
            {
                result.AddRange(arr.Where(x => !string.IsNullOrEmpty(x)));
            }
            else if (value != null)
            {
                var str = value.ToString();
                if (!string.IsNullOrEmpty(str))
                    result.Add(str);
            }
        }

        return result
            .GroupBy(x => x)
            .OrderByDescending(x => x.Count())
            .Take(top)
            .Select(x => new CategoryCount
            {
                Category = x.Key,
                Count = x.Count()
            })
            .ToList();
    }
}

public class RecommendationAnalytics
{
    public int TotalRecommendations { get; set; }
    public int RecommendationsWithFeedback { get; set; }
    public double AverageAcceptanceRate { get; set; }
    public TimeSpan AverageTimeToFeedback { get; set; }
    public double AverageRecommendationCount { get; set; }
    public double AverageHighestScore { get; set; }
    public double FeedbackRate { get; set; }
    public List<CategoryCount> PopularProducts { get; set; } = [];
    public List<CategoryCount> PopularSkinTypes { get; set; } = [];
    public List<CategoryCount> PopularConcerns { get; set; } = [];
    public TimeSpan TimeWindow { get; set; }
    public DateTime AsOf { get; set; }

    public string Summary =>
        $"Total: {TotalRecommendations:N0}, Feedback: {FeedbackRate:P0}, " +
        $"Acceptance: {AverageAcceptanceRate:P0}, Via: {AverageRecommendationCount:F1} products";
}

public class ProductPerformanceMetrics
{
    public Guid ProductId { get; set; }
    public int TimesRecommended { get; set; }
    public int TimesSelected { get; set; }
    public decimal SelectionRate { get; set; }
    public int HighRatings { get; set; }
    public decimal AverageScore { get; set; }
    public TimeSpan TimeWindow { get; set; }
    public DateTime AsOf { get; set; }

    public string PerformanceGrade => SelectionRate switch
    {
        >= 0.8m => "A+",
        >= 0.6m => "A",
        >= 0.4m => "B",
        >= 0.2m => "C",
        _ => "D"
    };
}

public class CategoryCount
{
    public string Category { get; set; } = "";
    public int Count { get; set; }
}
