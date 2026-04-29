namespace SkinAnalysis.Api.Models;

/// <summary>
/// Cache for recommendation results.
/// Avoids recomputing recommendations for identical inputs.
/// 
/// Hash = MD5(skin_type + string.Join(",", concerns) + string.Join(",", periods))
/// TTL = 30 days (can be refreshed if accessed)
/// </summary>
public class RecommendationCache
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string RecommendationHash { get; set; } = "";

    // The original input
    public string SkinType { get; set; } = "";
    public string[] Concerns { get; set; } = [];
    public string[] Periods { get; set; } = [];

    // The cached result
    public Guid[] RecommendedProductIds { get; set; } = [];
    public decimal[] Scores { get; set; } = [];

    // TTL management
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }

    // Analytics: how often was this cache hit?
    public int HitCount { get; set; }

    // Navigation
    public User User { get; set; } = null!;

    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
}

/// <summary>
/// Telemetry log: captures every recommendation made.
/// 
/// Purpose:
/// 1. Understand AI behavior and accuracy
/// 2. Track user preferences over time
/// 3. Identify underperforming products
/// 4. Build training data for future IA improvements
/// 5. Answer business questions: "What are most popular recommendations?"
/// </summary>
public class RecommendationLog
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? AnalysisId { get; set; }

    // INPUT: what triggered this recommendation?
    public string InputSkinType { get; set; } = "";
    public string[] InputConcerns { get; set; } = [];
    public string[] InputPeriods { get; set; } = [];

    // OUTPUT: what did we recommend?
    public Guid[] RecommendedProductIds { get; set; } = [];
    public decimal[] RecommendationScores { get; set; } = [];

    // FEEDBACK: did user like it?
    public Guid[]? SelectedProductIds { get; set; }
    public int? FeedbackRating { get; set; } // 1-5 stars
    public string? FeedbackComment { get; set; }

    // METADATA
    public string AiEngine { get; set; } = "gemini"; // Which AI made this
    public string? RoutineType { get; set; } // "morning", "night", "weekly"
    public int RecommendationCount { get; set; }
    public decimal HighestScore { get; set; }

    // TIMESTAMPS
    public DateTime CreatedAt { get; set; }
    public DateTime? FeedbackProvidedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Analysis? Analysis { get; set; }

    /// <summary>
    /// Acceptance rate: did user select recommended products?
    /// </summary>
    public decimal AcceptanceRate
    {
        get
        {
            if (RecommendedProductIds.Length == 0)
                return 0;

            if (SelectedProductIds == null || SelectedProductIds.Length == 0)
                return 0;

            var matchCount = RecommendedProductIds
                .Intersect(SelectedProductIds)
                .Count();

            return (decimal)matchCount / RecommendedProductIds.Length;
        }
    }

    /// <summary>
    /// Has user provided feedback on this recommendation?
    /// </summary>
    public bool HasFeedback => FeedbackProvidedAt.HasValue;

    /// <summary>
    /// Time to feedback: how long after recommendation did user respond?
    /// Null if no feedback yet.
    /// </summary>
    public TimeSpan? TimeToFeedback =>
        FeedbackProvidedAt.HasValue
            ? FeedbackProvidedAt.Value - CreatedAt
            : null;
}
