using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Services;

public sealed class RoutineSuggestionService(
    AppDbContext db,
    RoutineGeneratorService routineGen,
    ILogger<RoutineSuggestionService> logger)
{
    // Returns true if suggestions were generated (existing routine found)
    // Returns false if no existing routine (caller should generate full routine)
    public async Task<bool> TryGenerateSuggestionsAsync(
        Guid analysisId, SkinProfile newProfile, CancellationToken ct)
    {
        // 1. Get current active engine-generated steps
        var currentSteps = await db.RoutineSteps
            .AsNoTracking()
            .Where(s => s.Routine.UserId == newProfile.UserId
                     && s.Routine.IsActive
                     && s.IsActive)
            .Include(s => s.Routine)
            .Include(s => s.Slots.Where(sl => sl.IsSelected))
                .ThenInclude(sl => sl.Product)
            .ToListAsync(ct);

        if (!currentSteps.Any())
            return false; // No existing routine — do full generation

        // 2. Get ideal step types from new profile's template
        var idealByPeriod = new Dictionary<string, string[]>();
        foreach (var period in new[] { "morning", "night" })
        {
            var template = await routineGen.SelectTemplateForSuggestionsAsync(newProfile, period, ct);
            idealByPeriod[period] = template?.StepTypeKeys ?? [];
        }

        var allIdealTypes = idealByPeriod.Values.SelectMany(x => x).Distinct().ToHashSet();

        // 3. Current step types by period
        var currentByType = currentSteps
            .GroupBy(s => s.StepTypeKey)
            .ToDictionary(g => g.Key, g => g.ToList());
        var currentTypes = currentByType.Keys.ToHashSet();

        // 4. Clear old pending suggestions for this user
        await db.RoutineChangeSuggestions
            .Where(s => s.UserId == newProfile.UserId && s.Status == "pending")
            .ExecuteDeleteAsync(ct);

        var suggestions = new List<RoutineChangeSuggestion>();

        // 5. ADD: step types in ideal but missing from current
        foreach (var stepType in allIdealTypes.Except(currentTypes))
        {
            var period = idealByPeriod.FirstOrDefault(kv => kv.Value.Contains(stepType)).Key ?? "morning";
            var best = await routineGen.GetBestProductForStepAsync(stepType, period, newProfile, ct);

            suggestions.Add(new RoutineChangeSuggestion
            {
                UserId = newProfile.UserId,
                AnalysisId = analysisId,
                SuggestionType = "add_step",
                StepTypeKey = stepType,
                StepPeriod = period,
                SuggestedProductId = best?.Id,
                SuggestedProductName = best?.Name,
                SuggestedImageUrl = best?.PrimaryImageUrl,
                Reason = AddReason(stepType, newProfile),
                Priority = 3,
            });
        }

        // 6. REMOVE: engine-generated step types in current but not in ideal
        //    Never suggest removing cleanser/moisturizer/sunscreen (always core)
        var coreSteps = new HashSet<string> { "cleanser", "moisturizer", "sunscreen" };
        foreach (var stepType in currentTypes.Except(allIdealTypes).Except(coreSteps))
        {
            var stepGroup = currentByType[stepType];
            // Only suggest removing if no user-added steps of this type
            if (stepGroup.Any(s => s.IsUserAdded)) continue;

            suggestions.Add(new RoutineChangeSuggestion
            {
                UserId = newProfile.UserId,
                AnalysisId = analysisId,
                SuggestionType = "remove_step",
                StepTypeKey = stepType,
                CurrentProductName = stepGroup
                    .SelectMany(s => s.Slots)
                    .FirstOrDefault()?.Product?.Name,
                Reason = RemoveReason(stepType),
                Priority = 7,
            });
        }

        // 7. SWAP: same step type, but ideal best product differs from current
        foreach (var stepType in currentTypes.Intersect(allIdealTypes))
        {
            if (coreSteps.Contains(stepType)) continue; // skip core swaps to avoid churn

            var period = idealByPeriod.FirstOrDefault(kv => kv.Value.Contains(stepType)).Key ?? "morning";
            var best = await routineGen.GetBestProductForStepAsync(stepType, period, newProfile, ct);
            if (best is null) continue;

            var currentSlot = currentByType[stepType]
                .SelectMany(s => s.Slots)
                .FirstOrDefault();
            if (currentSlot?.ProductId == best.Id) continue; // already using best product
            if (currentSlot?.ProductId is null) continue; // user-custom slot, don't suggest swap

            suggestions.Add(new RoutineChangeSuggestion
            {
                UserId = newProfile.UserId,
                AnalysisId = analysisId,
                SuggestionType = "swap_product",
                StepTypeKey = stepType,
                StepPeriod = period,
                CurrentProductName = currentSlot.Product?.Name,
                SuggestedProductId = best.Id,
                SuggestedProductName = best.Name,
                SuggestedImageUrl = best.PrimaryImageUrl,
                Reason = SwapReason(stepType),
                Priority = 5,
            });
        }

        // Save up to 5 suggestions (highest priority first = lowest Priority number)
        var toSave = suggestions.OrderBy(s => s.Priority).Take(5).ToList();
        db.RoutineChangeSuggestions.AddRange(toSave);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("[Suggestions] {Count} suggestions for user {UserId} from analysis {AnalysisId}",
            toSave.Count, newProfile.UserId, analysisId);

        return true;
    }

    private static string AddReason(string stepType, SkinProfile profile) => stepType switch
    {
        "acid" when profile.AcneScore >= 4 => "Sua análise detectou tendência acneica — um esfoliante químico ajuda a desobstruir os poros",
        "acid" => "Esfoliação química pode melhorar a textura e uniformidade da sua pele",
        "retinoid" => "Seu perfil de pele agora suporta retinol — excelente para anti-envelhecimento",
        "eye_cream" => "Adicionar um creme para olhos pode melhorar a região periocular",
        "serum" => "Um sérum com ativos concentrados complementará sua rotina atual",
        "toner" => "Um tônico equilibra o pH e potencializa os outros produtos",
        "spot_treatment" => "Tratamento pontual para as áreas com maior acne",
        _ => "Recomendado para o seu perfil de pele atual",
    };

    private static string RemoveReason(string stepType) => stepType switch
    {
        "acid" => "Sua pele melhorou — o uso contínuo de ácidos pode causar irritação desnecessária",
        "retinoid" => "Com base na sua nova análise, uma pausa no retinol pode beneficiar sua pele",
        "spot_treatment" => "Sua acne melhorou significativamente — este tratamento pode ser reduzido",
        "oil" => "Sua oleosidade aumentou — o óleo facial pode não ser mais adequado agora",
        _ => "Sua pele evoluiu e este produto pode não ser mais necessário",
    };

    private static string SwapReason(string stepType) => stepType switch
    {
        "serum" => "Um sérum com ingredientes mais alinhados às suas preocupações atuais foi encontrado",
        "retinoid" => "Este retinol tem formulação mais adequada para sua sensibilidade atual",
        "acid" => "Este ácido tem concentração mais adequada para seu perfil atual",
        "toner" => "Encontramos um tônico com melhor pontuação para seu tipo de pele",
        _ => "Produto com melhor pontuação encontrado para seu perfil atual",
    };
}
