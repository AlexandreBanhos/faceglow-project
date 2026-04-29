using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Services;

/// <summary>
/// Intelligent routine builder: assembles complete skincare sequences.
/// Uses StepType to create ordered, logical routines.
/// 
/// Example flow:
/// 1. Get cleanser for "oleosa" skin
/// 2. Get toner/exfoliant for acne
/// 3. Get serum for specific concerns
/// 4. Get moisturizer appropriate for skin type
/// 5. Get sunscreen for AM routine
/// </summary>
public class RoutineBuilder
{
    private readonly ProductRecommendationEngine _engine;

    // Standard skincare routine sequence
    private static readonly string[] MorningSteps = ["cleanser", "toner", "serum", "moisturizer", "sunscreen"];
    private static readonly string[] NightSteps = ["cleanser", "toner", "exfoliant", "serum", "treatment", "moisturizer"];

    public RoutineBuilder(ProductRecommendationEngine engine)
    {
        _engine = engine;
    }

    /// <summary>
    /// Build complete morning routine.
    /// </summary>
    public async Task<BuiltRoutine> BuildMorningRoutineAsync(
        string[] skinTypes,
        string[] concerns,
        string[] periods)
    {
        var routine = new BuiltRoutine
        {
            Type = "morning",
            Period = "manha"
        };

        // Morning specific - filter only morning-compatible steps
        var morningCompatible = MorningSteps.ToList();

        var stepRecommendations = await _engine.GetBestByStepTypeAsync(
            skinTypes,
            concerns,
            periods,
            morningCompatible.ToArray()
        );

        routine.Steps = morningCompatible
            .Select(step => stepRecommendations.TryGetValue(step, out var product)
                ? new RecommendedRoutineStep
                {
                    StepType = step,
                    Order = morningCompatible.IndexOf(step) + 1,
                    Product = product?.Product,
                    ProductRule = product?.Rule,
                    Score = product?.Score ?? 0,
                    Reasoning = product?.MatchDetails.RuleReasoning
                }
                : new RecommendedRoutineStep
                {
                    StepType = step,
                    Order = morningCompatible.IndexOf(step) + 1,
                    Product = null,
                    IsOptional = true
                }
            )
            .ToList();

        return routine;
    }

    /// <summary>
    /// Build complete night routine.
    /// </summary>
    public async Task<BuiltRoutine> BuildNightRoutineAsync(
        string[] skinTypes,
        string[] concerns,
        string[] periods)
    {
        var routine = new BuiltRoutine
        {
            Type = "night",
            Period = "noite"
        };

        // Night-specific - can be more aggressive
        var nightCompatible = NightSteps.ToList();

        var stepRecommendations = await _engine.GetBestByStepTypeAsync(
            skinTypes,
            concerns,
            periods,
            nightCompatible.ToArray()
        );

        routine.Steps = nightCompatible
            .Select(step => stepRecommendations.TryGetValue(step, out var product)
                ? new RecommendedRoutineStep
                {
                    StepType = step,
                    Order = nightCompatible.IndexOf(step) + 1,
                    Product = product?.Product,
                    ProductRule = product?.Rule,
                    Score = product?.Score ?? 0,
                    Reasoning = product?.MatchDetails.RuleReasoning
                }
                : new RecommendedRoutineStep
                {
                    StepType = step,
                    Order = nightCompatible.IndexOf(step) + 1,
                    Product = null,
                    IsOptional = true
                }
            )
            .ToList();

        return routine;
    }

    /// <summary>
    /// Build complete daily routine (morning + night).
    /// </summary>
    public async Task<CompleteDailyRoutine> BuildCompleteRoutineAsync(
        string[] skinTypes,
        string[] concerns,
        string[] periods)
    {
        var morning = await BuildMorningRoutineAsync(skinTypes, concerns, periods);
        var night = await BuildNightRoutineAsync(skinTypes, concerns, periods);

        return new CompleteDailyRoutine
        {
            Morning = morning,
            Night = night,
            AllProducts = morning.Steps
                .Concat(night.Steps)
                .Where(x => x.Product != null)
                .Select(x => x.Product!)
                .DistinctBy(x => x.Id)
                .ToList(),
            RoutineType = DetermineRoutineType(skinTypes)
        };
    }

    /// <summary>
    /// Build "weekly special" routine (masks, heavy treatments, etc).
    /// </summary>
    public async Task<BuiltRoutine> BuildWeeklySpecialAsync(
        string[] skinTypes,
        string[] concerns)
    {
        string[] weeklySteps = ["mask", "exfoliant", "treatment"];
        var weeklyPeriod = new[] { "vez" };

        var routine = new BuiltRoutine
        {
            Type = "weekly",
            Period = "special"
        };

        var stepRecommendations = await _engine.GetBestByStepTypeAsync(
            skinTypes,
            concerns,
            weeklyPeriod,
            weeklySteps
        );

        routine.Steps = weeklySteps
            .Select(step => stepRecommendations.TryGetValue(step, out var product)
                ? new RecommendedRoutineStep
                {
                    StepType = step,
                    Order = Array.IndexOf(weeklySteps, step) + 1,
                    Product = product?.Product,
                    ProductRule = product?.Rule,
                    Score = product?.Score ?? 0,
                    Reasoning = product?.MatchDetails.RuleReasoning,
                    ApplicableWeekly = 1 // Once per week
                }
                : new RecommendedRoutineStep
                {
                    StepType = step,
                    Order = Array.IndexOf(weeklySteps, step) + 1,
                    IsOptional = true
                }
            )
            .ToList();

        return routine;
    }

    private static string DetermineRoutineType(string[] skinTypes)
    {
        if (skinTypes.Contains("acneica", StringComparer.OrdinalIgnoreCase))
            return "acne-treatment";

        if (skinTypes.Contains("sensivel", StringComparer.OrdinalIgnoreCase))
            return "sensitive";

        if (skinTypes.Contains("oleosa", StringComparer.OrdinalIgnoreCase))
            return "oily-skin";

        if (skinTypes.Contains("seca", StringComparer.OrdinalIgnoreCase))
            return "dry-skin";

        return "balanced";
    }
}

/// <summary>
/// Final routine output: morning, night, and optional weekly treatments.
/// </summary>
public class CompleteDailyRoutine
{
    public BuiltRoutine Morning { get; set; } = null!;
    public BuiltRoutine Night { get; set; } = null!;
    public List<Product> AllProducts { get; set; } = [];
    public string RoutineType { get; set; } = "";

    public int TotalStepsMorning => Morning.Steps?.Count ?? 0;
    public int TotalStepsNight => Night.Steps?.Count ?? 0;
    public int TotalProducts => AllProducts.Count;

    /// <summary>
    /// User-friendly description of routine complexity.
    /// </summary>
    public string Complexity => TotalStepsMorning + TotalStepsNight switch
    {
        <= 4 => "lightweight",
        <= 8 => "standard",
        <= 12 => "comprehensive",
        _ => "intensive"
    };
}

/// <summary>
/// Single routine (morning OR night OR weekly special).
/// </summary>
public class BuiltRoutine
{
    public string Type { get; set; } = ""; // "morning", "night", "weekly"
    public string Period { get; set; } = ""; // "manha", "noite", "special"
    public List<RecommendedRoutineStep> Steps { get; set; } = [];

    public int RequiredProducts => Steps?.Count(x => !x.IsOptional) ?? 0;
    public int OptionalProducts => Steps?.Count(x => x.IsOptional) ?? 0;
}

/// <summary>
/// Single application step within a routine.
/// </summary>
public class RecommendedRoutineStep
{
    public int Order { get; set; }
    public string StepType { get; set; } = ""; // "cleanser", "serum", etc.
    public Product? Product { get; set; }
    public ProductRule? ProductRule { get; set; }
    public decimal Score { get; set; } // Confidence score
    public string? Reasoning { get; set; } // Why this product
    public bool IsOptional { get; set; } // Can be skipped
    public int ApplicableWeekly { get; set; } = 0; // 0 = daily, 1-7 = times per week

    public string Instructions => StepType switch
    {
        "cleanser" => "Apply to damp skin, massage gently, rinse with water",
        "toner" => "Apply with cotton pad or spray, pat until absorbed",
        "exfoliant" => "Apply gently, use 1-2 times per week maximum",
        "serum" => "Apply 2-3 drops, pat into skin",
        "treatment" => "Apply and leave on for recommended time",
        "moisturizer" => "Apply to face and neck, use upward strokes",
        "sunscreen" => "Apply 15-20 minutes before sun exposure, reapply every 2 hours",
        "mask" => "Apply evenly, leave for 10-20 minutes, rinse",
        "eye" => "Pat gently around eyes with ring finger",
        _ => ""
    };
}
