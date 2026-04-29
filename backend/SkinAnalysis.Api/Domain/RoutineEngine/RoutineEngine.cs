using SkinAnalysis.Api.Models;
using System.Globalization;
using System.Text;

namespace SkinAnalysis.Api.Domain.RoutineEngine;

public sealed class RoutineEngine
{
    private static readonly string[] MorningEssentials = ["Limpeza", "Hidratante", "Protetor"];
    private static readonly string[] NightEssentials = ["Limpeza", "Hidratante"];

    public RoutineBuildResult BuildRoutine(UserProfile user, IReadOnlyList<Product> products)
    {
        var catalog = products
            .Where(product => product.IsActive && !string.IsNullOrWhiteSpace(product.Name))
            .Select(NormalizeProduct)
            .ToList();

        var selected = new List<Product>();
        var routine = new Routine();
        var notes = new List<string>();
        var skinType = NormalizeText(user.SkinType);
        var concernOrder = BuildConcernOrder(user);
        var optionalSlots = user.Budget switch
        {
            BudgetLevel.Low => 1,
            BudgetLevel.Medium => 2,
            _ => 4,
        };

        AddStep(routine.Morning.Steps, SelectProduct(catalog, selected, "Limpeza", ["both", "morning"], skinType, Array.Empty<string>(), ["limpeza", "gel", "sabonete"]), "manhã", selected);
        AddStep(routine.Morning.Steps, SelectMorningTreatment(catalog, selected, skinType, concernOrder), "manhã", selected);
        AddStep(routine.Morning.Steps, SelectProduct(catalog, selected, "Hidratante", ["both", "morning"], skinType, Array.Empty<string>(), ["hidrat"]), "manhã", selected);
        AddStep(routine.Morning.Steps, SelectProduct(catalog, selected, "Protetor", ["both", "morning"], skinType, Array.Empty<string>(), ["fps", "solar", "uv"]), "manhã", selected);

        AddStep(routine.Night.Steps, SelectProduct(catalog, selected, "Limpeza", ["both", "night"], skinType, Array.Empty<string>(), ["limpeza", "gel", "sabonete"]), "noite", selected);

        // Serum garantido na noite (anti-aging / tratamento base)
        AddStep(routine.Night.Steps, SelectProduct(catalog, selected, "Serum", ["both", "night"], skinType, Array.Empty<string>(), ["serum", "sérum", "vitamina", "niacin", "retinol", "ativo"]), "noite", selected);

        foreach (var concern in concernOrder.Take(optionalSlots))
        {
            var product = SelectConcernProduct(catalog, selected, skinType, concern, "night");
            AddStep(routine.Night.Steps, product, "noite", selected, concern.RecurrenceOverride);
        }

        AddStep(routine.Night.Steps, SelectProduct(catalog, selected, "Hidratante", ["both", "night"], skinType, Array.Empty<string>(), ["hidrat"]), "noite", selected);

        if (user.Budget == BudgetLevel.High)
        {
            AddStep(routine.Night.Steps, SelectProduct(catalog, selected, "Extras", ["both", "night", "morning"], skinType, Array.Empty<string>(), ["olhos", "cafe", "caffeine", "eye"]), "noite", selected);
            AddStep(routine.Night.Steps, SelectProduct(catalog, selected, "Extras", ["both", "night", "morning"], skinType, Array.Empty<string>(), ["labial", "lip", "labios"]), "noite", selected);
        }

        if (selected.Count == 0)
        {
            notes.Add("Nenhum produto compatível foi encontrado; a rotina foi deixada vazia para evitar recomendações incorretas.");
        }

        return new RoutineBuildResult
        {
            Routine = routine,
            SelectedProducts = selected.DistinctBy(product => product.Id).ToList(),
            Notes = notes,
        };
    }

    private static Product? SelectMorningTreatment(IReadOnlyList<Product> catalog, ICollection<Product> selected, string skinType, IReadOnlyList<ConcernPlan> concernOrder)
    {
        var treatmentOrder = concernOrder
            .Where(concern => concern.IncludeInMorning)
            .OrderByDescending(concern => concern.Severity)
            .ThenBy(concern => concern.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var concern in treatmentOrder)
        {
            var candidate = SelectConcernProduct(catalog, selected, skinType, concern, "morning");
            if (candidate is not null)
            {
                return candidate;
            }
        }

        return null;
    }

    private static Product? SelectConcernProduct(
        IReadOnlyList<Product> catalog,
        ICollection<Product> selected,
        string skinType,
        ConcernPlan concern,
        string period)
    {
        return SelectProduct(
            catalog,
            selected,
            concern.Categories,
            ["both", period],
            skinType,
            concern.ExcludedKeywords,
            concern.Keywords);
    }

    private static Product? SelectProduct(
        IReadOnlyList<Product> catalog,
        ICollection<Product> selected,
        string category,
        IReadOnlyList<string> acceptedPeriods,
        string skinType,
        IReadOnlyList<string> excludedKeywords,
        IReadOnlyList<string> includeKeywords)
    {
        return SelectProduct(catalog, selected, [category], acceptedPeriods, skinType, excludedKeywords, includeKeywords);
    }

    private static Product? SelectProduct(
        IReadOnlyList<Product> catalog,
        ICollection<Product> selected,
        IReadOnlyList<string> categories,
        IReadOnlyList<string> acceptedPeriods,
        string skinType,
        IReadOnlyList<string> excludedKeywords,
        IReadOnlyList<string> includeKeywords)
    {
        var available = catalog
            .Where(product => categories.Any(category => string.Equals(product.Category, category, StringComparison.OrdinalIgnoreCase)))
            .Where(product => acceptedPeriods.Any(period => MatchesPeriod(product, period)))
            .Where(product => !selected.Any(item => string.Equals(item.Name, product.Name, StringComparison.OrdinalIgnoreCase)))
            .Where(product => excludedKeywords.Count == 0 || !ContainsAnyKeyword(product, excludedKeywords))
            .ToList();

        if (available.Count == 0)
        {
            available = catalog
                .Where(product => categories.Any(category => string.Equals(product.Category, category, StringComparison.OrdinalIgnoreCase)))
                .Where(product => !selected.Any(item => string.Equals(item.Name, product.Name, StringComparison.OrdinalIgnoreCase)))
                .Where(product => excludedKeywords.Count == 0 || !ContainsAnyKeyword(product, excludedKeywords))
                .ToList();
        }

        var bestMatch = available
            .OrderByDescending(product => ScoreProduct(product, skinType, includeKeywords))
            .ThenByDescending(product => HasMatchingKeyword(product, includeKeywords))
            .ThenByDescending(product => product.Priority)
            .FirstOrDefault(product => includeKeywords.Count == 0 || HasMatchingKeyword(product, includeKeywords));

        bestMatch ??= available
            .OrderByDescending(product => ScoreProduct(product, skinType, includeKeywords))
            .ThenByDescending(product => product.Priority)
            .FirstOrDefault();

        if (bestMatch is not null)
        {
            selected.Add(bestMatch);
        }

        return bestMatch;
    }

    private static int ScoreProduct(Product product, string skinType, IReadOnlyList<string> includeKeywords)
    {
        var score = product.Priority;

        if (MatchesSkinType(product, skinType))
        {
            score += 35;
        }

        if (ContainsAnyKeyword(product, includeKeywords))
        {
            score += 25;
        }

        if (string.Equals(product.Recurrence, "daily", StringComparison.OrdinalIgnoreCase))
        {
            score += 5;
        }

        if (string.Equals(product.PreferredPeriod, "both", StringComparison.OrdinalIgnoreCase))
        {
            score += 10;
        }

        return score;
    }

    private static bool HasMatchingKeyword(Product product, IReadOnlyList<string> keywords)
    {
        if (keywords.Count == 0)
        {
            return true;
        }

        return ContainsAnyKeyword(product, keywords);
    }

    private static bool MatchesSkinType(Product product, string skinType)
    {
        if (product.SkinTypes.Count == 0)
        {
            return true;
        }

        return product.SkinTypes.Any(item =>
            string.Equals(NormalizeText(item), skinType, StringComparison.OrdinalIgnoreCase) ||
            NormalizeText(item) is "todas" or "todos" or "geral");
    }

    private static bool MatchesPeriod(Product product, string period)
    {
        return string.Equals(period, "both", StringComparison.OrdinalIgnoreCase)
            ? string.Equals(product.PreferredPeriod, "both", StringComparison.OrdinalIgnoreCase)
            : string.Equals(product.PreferredPeriod, period, StringComparison.OrdinalIgnoreCase) ||
              string.Equals(product.PreferredPeriod, "both", StringComparison.OrdinalIgnoreCase);
    }

    private static bool ContainsAnyKeyword(Product product, IReadOnlyList<string> keywords)
    {
        if (keywords.Count == 0)
        {
            return true;
        }

        var haystack = NormalizeText($"{product.Name} {product.Highlight} {string.Join(' ', product.UseCases)}");
        return keywords.Select(NormalizeText).Any(keyword => !string.IsNullOrWhiteSpace(keyword) && haystack.Contains(keyword, StringComparison.Ordinal));
    }

    private static Product NormalizeProduct(Product product)
    {
        return new Product
        {
            Id = product.Id,
            Name = product.Name?.Trim() ?? string.Empty,
            Category = product.Category?.Trim() ?? string.Empty,
            Recurrence = product.Recurrence?.Trim() ?? "daily",
            PreferredPeriod = product.PreferredPeriod?.Trim() ?? "both",
            Highlight = product.Highlight?.Trim() ?? string.Empty,
            ImageUrl = product.ImageUrl?.Trim() ?? string.Empty,
            SkinTypes = product.SkinTypes?.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()).ToArray() ?? Array.Empty<string>(),
            UseCases = product.UseCases?.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()).ToArray() ?? Array.Empty<string>(),
            Priority = product.Priority,
            IsActive = product.IsActive,
        };
    }

    private static void AddStep(List<RoutineStep> destination, Product? product, string period, ICollection<Product> selected, string? recurrenceOverride = null)
    {
        if (product is null)
        {
            return;
        }

        if (destination.Any(step => string.Equals(step.ProductName, product.Name, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        if (!selected.Any(item => item.Id == product.Id))
        {
            selected.Add(product);
        }

        destination.Add(new RoutineStep
        {
            Period = period,
            Category = product.Category,
            ProductId = product.Id,
            ProductName = product.Name,
            Recurrence = string.IsNullOrWhiteSpace(recurrenceOverride) ? product.Recurrence : recurrenceOverride,
            Reason = string.IsNullOrWhiteSpace(product.Highlight)
                ? $"Selecionado para a categoria {product.Category}."
                : product.Highlight,
        });
    }

    private static IReadOnlyList<ConcernPlan> BuildConcernOrder(UserProfile user)
    {
        return new List<ConcernPlan>
        {
            new ConcernPlan(
                "Acne",
                user.Acne,
                user.AcneScore,
                new[] { "Serum", "Extras" },
                new[] { "niacinamida", "niacinamide", "equilibrio", "oleosidade", "salic", "acne", "spot", "antiacne" },
                new[] { "acido", "acid" }),
            new ConcernPlan(
                "Manchas",
                user.Manchas,
                user.DarkSpotsScore,
                new[] { "Serum", "Extras" },
                new[] { "vitamina c", "antioxidante", "tranexam", "thiamidol", "pigment" },
                Array.Empty<string>()),
            new ConcernPlan(
                "Poros",
                user.Poros,
                Math.Max(1, user.OilinessScore),
                new[] { "Serum", "Extras" },
                new[] { "niacinamida", "niacinamide", "pore", "poros", "glicol" },
                new[] { "acido", "acid" }),
            new ConcernPlan(
                "Olheiras",
                user.Olheiras,
                user.SensitivityScore,
                new[] { "Extras" },
                new[] { "cafeina", "caffeine", "eye", "olhos", "olheira" },
                Array.Empty<string>()),
            new ConcernPlan(
                "Lábios",
                user.LabiosRessecados,
                user.SensitivityScore / 2,
                new[] { "Extras" },
                new[] { "labial", "labios", "lip" },
                Array.Empty<string>()),
            new ConcernPlan(
                "AntiAging",
                user.LinhasFinas > 30 || user.SensitivityScore > 40,
                user.LinhasFinas,
                new[] { "Retinoide", "Serum" },
                new[] { "retinol", "retinoide", "retinoid", "peptide", "anti-aging", "antiaging", "firmeza" },
                Array.Empty<string>()),
            new ConcernPlan(
                "Hidratação",
                user.HydrationScore > 40,
                user.HydrationScore,
                new[] { "Serum", "Hidratante" },
                new[] { "hidratan", "acido hialuronico", "hyaluronic", "hidra", "aqua", "moisture" },
                Array.Empty<string>()),
            }
            .Where(plan => plan.IsActive)
        .OrderByDescending(plan => plan.Severity)
        .ThenBy(plan => plan.Name, StringComparer.OrdinalIgnoreCase)
        .ToList();
    }

    private static string NormalizeText(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Normalize(NormalizationForm.FormD);
        var chars = normalized
            .Where(character => CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            .ToArray();

        return new string(chars).ToLowerInvariant();
    }

    private sealed record ConcernPlan(
        string Name,
        bool IsActive,
        int Severity,
        IReadOnlyList<string> Categories,
        IReadOnlyList<string> Keywords,
        IReadOnlyList<string> ExcludedKeywords)
    {
        public bool IncludeInMorning => string.Equals(Name, "Acne", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(Name, "Manchas", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(Name, "Poros", StringComparison.OrdinalIgnoreCase);

        public string? RecurrenceOverride => string.Equals(Name, "Acne", StringComparison.OrdinalIgnoreCase)
            ? "as_needed"
            : string.Equals(Name, "Poros", StringComparison.OrdinalIgnoreCase)
                ? "2-3x_semana"
                : null;
    }
}