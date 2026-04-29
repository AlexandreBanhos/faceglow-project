namespace SkinAnalysis.Api.Models;

/// <summary>
/// Standardized skin types with validation
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

    public static bool IsValid(string value) => All.Contains(value, StringComparer.OrdinalIgnoreCase);
}

/// <summary>
/// Standardized concerns (problems that products solve)
/// </summary>
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
    public const string Vico = "vico";
    public const string Protecao = "protecao";

    public static readonly string[] All = 
    {
        Acne, Oleosidade, Secura, Manchas, Olheiras, Poros, Rugas, 
        Sensibilidade, Ressecamento, Hidratacao, Cravos, Barreira, Vico, Protecao
    };

    public static bool IsValid(string value) => All.Contains(value, StringComparer.OrdinalIgnoreCase);
}

/// <summary>
/// Standardized product categories
/// </summary>
public static class ProductCategoryEnum
{
    public const string Cleanser = "cleanser";
    public const string Moisturizer = "moisturizer";
    public const string Serum = "serum";
    public const string Treatment = "treatment";
    public const string Sunscreen = "sunscreen";
    public const string Eye = "eye";
    public const string Lip = "lip";
    public const string Exfoliant = "exfoliant";
    public const string Mask = "mask";
    public const string Oil = "oil";

    public static readonly string[] All = 
    {
        Cleanser, Moisturizer, Serum, Treatment, Sunscreen, 
        Eye, Lip, Exfoliant, Mask, Oil
    };

    public static bool IsValid(string value) => All.Contains(value, StringComparer.OrdinalIgnoreCase);
}

/// <summary>
/// Standardized application periods
/// </summary>
public static class PeriodEnum
{
    public const string Manha = "manha";
    public const string Noite = "noite";
    public const string Vez = "vez"; // One-time use (masks, peels, etc)

    public static readonly string[] All = { Manha, Noite, Vez };

    public static bool IsValid(string value) => All.Contains(value, StringComparer.OrdinalIgnoreCase);
}

/// <summary>
/// Standardized strength levels
/// </summary>
public static class StrengthLevelEnum
{
    public const string Leve = "leve";
    public const string Medio = "medio";
    public const string Forte = "forte";

    public static readonly string[] All = { Leve, Medio, Forte };

    public static bool IsValid(string value) => All.Contains(value, StringComparer.OrdinalIgnoreCase);
}

/// <summary>
/// Standardized price ranges
/// </summary>
public static class PriceRangeEnum
{
    public const string Low = "low";
    public const string Medium = "medium";
    public const string High = "high";

    public static readonly string[] All = { Low, Medium, High };

    public static bool IsValid(string value) => All.Contains(value, StringComparer.OrdinalIgnoreCase);
}
