using SkinAnalysis.Api.Domain.RoutineEngine;

namespace SkinAnalysis.Api.Services;

/// <summary>
/// Bridge between AI output and database queries.
/// Validates, normalizes, and standardizes recommendation inputs.
/// 
/// Prevents garbage data from IA from breaking queries.
/// </summary>
public class RecommendationInput
{
    public required string SkinType { get; set; }
    public required List<string> Concerns { get; set; }
    public required List<string> Periods { get; set; }
    public string? StrengthTolerance { get; set; } // leve/medio/forte

    /// <summary>
    /// Validate and normalize input from AI or user.
    /// Throws if invalid.
    /// </summary>
    public static RecommendationInput Validate(
        string skinType,
        List<string>? concerns = null,
        List<string>? periods = null,
        string? strengthTolerance = null)
    {
        if (string.IsNullOrWhiteSpace(skinType))
            throw new ArgumentException("SkinType is required");

        concerns ??= [];
        periods ??= ["manha", "noite"]; // Default to morning + night

        // Validate skin type
        if (!SkinTypeEnum.IsValid(skinType))
            throw new ArgumentException(
                $"Invalid skin type '{skinType}'. Valid values: {string.Join(", ", SkinTypeEnum.All)}");

        // Normalize and validate concerns
        var normalizedConcerns = new List<string>();
        foreach (var concern in concerns.Where(x => !string.IsNullOrWhiteSpace(x)))
        {
            var normalized = concern.ToLowerInvariant().Trim();
            if (ConcernEnum.IsValid(normalized))
                normalizedConcerns.Add(normalized);
            else
                throw new ArgumentException(
                    $"Invalid concern '{concern}'. Valid values: {string.Join(", ", ConcernEnum.All)}");
        }

        // Normalize and validate periods
        var normalizedPeriods = new List<string>();
        foreach (var period in periods.Where(x => !string.IsNullOrWhiteSpace(x)))
        {
            var normalized = period.ToLowerInvariant().Trim();
            if (PeriodEnum.IsValid(normalized))
                normalizedPeriods.Add(normalized);
            else
                throw new ArgumentException(
                    $"Invalid period '{period}'. Valid values: {string.Join(", ", PeriodEnum.All)}");
        }

        // Validate strength tolerance if provided
        if (strengthTolerance != null && !StrengthLevelEnum.IsValid(strengthTolerance))
            throw new ArgumentException(
                $"Invalid strength tolerance '{strengthTolerance}'. Valid values: {string.Join(", ", StrengthLevelEnum.All)}");

        return new RecommendationInput
        {
            SkinType = skinType.ToLowerInvariant(),
            Concerns = normalizedConcerns,
            Periods = normalizedPeriods,
            StrengthTolerance = strengthTolerance?.ToLowerInvariant()
        };
    }

    /// <summary>
    /// Convert to arrays for database query.
    /// </summary>
    public string[] GetSkinTypesArray() => [SkinType];

    public string[] GetConcernsArray() => Concerns.Count > 0 ? Concerns.ToArray() : [];

    public string[] GetPeriodsArray() => Periods.Count > 0 ? Periods.ToArray() : ["manha", "noite"];

    /// <summary>
    /// Create from Gemini API analysis output.
    /// Resilient to API variations.
    /// </summary>
    public static RecommendationInput FromGeminiAnalysis(
        string geminiSkinType,
        List<string>? geminiConcerns = null,
        List<string>? geminiPeriods = null)
    {
        try
        {
            return Validate(
                geminiSkinType,
                geminiConcerns,
                geminiPeriods
            );
        }
        catch (ArgumentException ex)
        {
            throw new InvalidOperationException(
                $"Failed to parse Gemini analysis output. Details: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Create from form input (e.g., questionnaire).
    /// </summary>
    public static RecommendationInput FromUserInput(
        string skinType,
        List<string>? selectedConcerns = null,
        List<string>? selectedPeriods = null)
    {
        return Validate(skinType, selectedConcerns, selectedPeriods);
    }

    public override string ToString()
    {
        return $"SkinType={SkinType}, Concerns=[{string.Join(",", Concerns)}], Periods=[{string.Join(",", Periods)}]";
    }
}

/// <summary>
/// Enum validation extensions.
/// </summary>
public static class SkinTypeEnum
{
    public const string Oleosa = "oleosa";
    public const string Seca = "seca";
    public const string Mista = "mista";
    public const string Sensivel = "sensivel";
    public const string Todas = "todas";
    public const string Acneica = "acneica";

    public static readonly string[] All = { Oleosa, Seca, Mista, Sensivel, Todas, Acneica };

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value, StringComparer.OrdinalIgnoreCase);
}

public static class ConcernEnum
{
    public const string Acne = "acne";
    public const string Oleosidade = "oleosidade";
    public const string Secura = "secura";
    public const string Manchas = "manchas";
    public const string Olheiras = "olheiras";
    public const string Poros = "poros";
    public const string Rugas = "rugas";
    public const string Sensibilidade = "sensibilidade";
    public const string Ressecamento = "ressecamento";
    public const string Hidratacao = "hidratacao";
    public const string Cravos = "cravos";
    public const string Barreira = "barreira";
    public const string Vico = "viço"; // Natural aging/dullness
    public const string Protecao = "protecao";

    public static readonly string[] All =
    {
        Acne, Oleosidade, Secura, Manchas, Olheiras, Poros, Rugas,
        Sensibilidade, Ressecamento, Hidratacao, Cravos, Barreira, Vico, Protecao
    };

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value, StringComparer.OrdinalIgnoreCase);
}

public static class PeriodEnum
{
    public const string Manha = "manha";
    public const string Noite = "noite";
    public const string Vez = "vez"; // Mask, occasional treatment

    public static readonly string[] All = { Manha, Noite, Vez };

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value, StringComparer.OrdinalIgnoreCase);
}

public static class StrengthLevelEnum
{
    public const string Leve = "leve";
    public const string Medio = "medio";
    public const string Forte = "forte";

    public static readonly string[] All = { Leve, Medio, Forte };

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value, StringComparer.OrdinalIgnoreCase);
}
