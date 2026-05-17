using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Services;

public sealed class RoutineGeneratorService(AppDbContext db, ILogger<RoutineGeneratorService> logger)
{
    // Scoring weights
    private const decimal BaseSkinTypeBonus = 20m;
    private const decimal BaseConcernBonus = 12m;
    private const decimal StaffPickBonus = 10m;
    private const decimal StrengthPenaltyStrong = 35m;
    private const decimal StrengthPenaltyModerate = 15m;

    public async Task GenerateForProfileAsync(SkinProfile profile, CancellationToken ct = default)
    {
        // Desativa TODAS as rotinas ativas do usuário — a constraint idx_routines_active
        // é UNIQUE(user_id, period) WHERE is_active=true, então precisamos limpar por UserId.
        await db.Routines
            .Where(r => r.UserId == profile.UserId && r.IsActive)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.IsActive, false), ct);

        foreach (var period in new[] { "morning", "night" })
        {
            var template = await SelectTemplateAsync(profile, period, ct);
            if (template is null)
            {
                logger.LogWarning("[Engine] No template found for profile {ProfileId} period {Period}", profile.Id, period);
                continue;
            }

            var routine = new UserRoutine
            {
                UserId = profile.UserId,
                SkinProfileId = profile.Id,
                Period = period,
                DisplayName = period == "morning" ? "Rotina da Manhã" : "Rotina da Noite",
                TemplateId = template.Id,
                GeneratedBy = "engine",
                IsActive = true,
            };
            db.Routines.Add(routine);
            await db.SaveChangesAsync(ct);

            var stepTypeKeys = template.StepTypeKeys ?? [];

            // Usuárias de maquiagem recebem limpeza dedicada como 1º passo da rotina noturna
            if (period == "night" && profile.UsesMakeup && !stepTypeKeys.Contains("makeup_remover"))
                stepTypeKeys = ["makeup_remover", .. stepTypeKeys];

            for (int order = 0; order < stepTypeKeys.Length; order++)
            {
                var stepKey = stepTypeKeys[order];
                var step = new UserRoutineStep
                {
                    RoutineId = routine.Id,
                    StepTypeKey = stepKey,
                    StepOrder = order,
                    Recurrence = ResolveRecurrence(stepKey, period),
                };
                db.RoutineSteps.Add(step);
                await db.SaveChangesAsync(ct);

                await PopulateSlotsAsync(step, stepKey, period, profile, ct);
            }

            // Save initial version snapshot
            await SaveVersionSnapshotAsync(routine, 1, "initial_generation", ct);
        }

        logger.LogInformation("[Engine] Routines generated for profile {ProfileId}", profile.Id);
    }

    // ── Template selection (EF Core — handles text[] arrays correctly) ────────
    private async Task<RoutineTemplateEntity?> SelectTemplateAsync(SkinProfile profile, string period, CancellationToken ct)
    {
        // Load all active templates for this period, then filter in C#
        // (avoids Dapper text[] mapping issues with PostgreSQL arrays)
        var candidates = await db.RoutineTemplates
            .AsNoTracking()
            .Where(t => t.Period == period && t.IsActive)
            .OrderBy(t => t.SpecificityScore)
            .ToListAsync(ct);

        return candidates.FirstOrDefault(t =>
            (t.MatchSkinTypes == null || t.MatchSkinTypes.Contains(profile.SkinType)) &&
            (t.MatchConcerns == null || t.MatchConcerns.Intersect(profile.PrimaryConcerns).Any()) &&
            (t.MinAcneScore == null || profile.AcneScore >= t.MinAcneScore) &&
            (t.MinOilinessScore == null || profile.OilinessScore >= t.MinOilinessScore) &&
            (t.MinSensitivity == null || profile.SensitivityScore >= t.MinSensitivity) &&
            (t.RequireFlags == null || t.RequireFlags.All(flag => flag switch
            {
                "has_active_acne"    => profile.HasActiveAcne,
                "has_dark_circles"   => profile.HasDarkCircles,
                "has_enlarged_pores" => profile.HasEnlargedPores,
                "uses_makeup"        => profile.UsesMakeup,
                _                    => true,
            })));
    }

    // ── Slot population ────────────────────────────────────────────────────
    private async Task PopulateSlotsAsync(
        UserRoutineStep step, string stepKey, string period,
        SkinProfile profile, CancellationToken ct)
    {
        var candidates = await GetCandidatesAsync(stepKey, period, profile, ct);
        if (candidates.Count == 0) return;

        var scored = candidates
            .Select(p => (product: p, score: ScoreProduct(p, profile, period)))
            .OrderByDescending(x => x.score)
            .ToList();

        var primary   = scored[0];
        // All slots must have DISTINCT products
        var usedIds = new HashSet<Guid> { primary.product.Id };

        // alt_budget: cheapest option that's not primary
        var altBudget = scored.FirstOrDefault(x =>
            !usedIds.Contains(x.product.Id) &&
            x.product.PriceRange is "low" or "medium");
        if (altBudget.product is not null) usedIds.Add(altBudget.product.Id);

        // alt_rated: highest curation score among remaining distinct products
        var altRated = scored
            .Where(x => !usedIds.Contains(x.product.Id))
            .OrderByDescending(x => x.product.CurationScore)
            .ThenByDescending(x => x.score)
            .FirstOrDefault();

        await AddSlotAsync(step, "primary", primary.product, primary.score, "Melhor para seu perfil", ct);

        if (altBudget.product is not null)
            await AddSlotAsync(step, "alt_budget", altBudget.product, altBudget.score, "Melhor custo-benefício", ct);

        if (altRated.product is not null)
            await AddSlotAsync(step, "alt_rated", altRated.product, altRated.score, "Mais bem avaliado", ct);
    }

    private async Task AddSlotAsync(
        UserRoutineStep step, string tier, Product product,
        decimal score, string reason, CancellationToken ct)
    {
        db.StepProductSlots.Add(new StepProductSlot
        {
            StepId = step.Id,
            Tier = tier,
            ProductId = product.Id,
            IsSelected = tier == "primary",
            ScoreAtGeneration = score,
            RecommendationReason = reason,
        });
        await db.SaveChangesAsync(ct);
    }

    // ── Product candidates ─────────────────────────────────────────────────
    private async Task<List<Product>> GetCandidatesAsync(
        string stepKey, string period, SkinProfile profile, CancellationToken ct)
    {
        var query = db.Products
            .AsNoTracking()
            .Include(p => p.Images)
            .Where(p => p.StepTypeKey == stepKey
                     && p.IsActive
                     && p.SuitablePeriods.Contains(period));

        // Skin type hard filter — only if product has restrictions
        var skinType = profile.SkinType;
        query = query.Where(p =>
            p.CompatibleSkinTypes.Length == 0 ||
            p.CompatibleSkinTypes.Contains(skinType));

        // Strength filter for very sensitive skin
        if (profile.SensitivityScore >= 7)
            query = query.Where(p => p.StrengthLevel != "strong");

        // Budget filter — include only products within or below the user's range
        if (!string.IsNullOrEmpty(profile.BudgetRange))
        {
            var allowed = profile.BudgetRange switch
            {
                "low"     => new[] { "low" },
                "medium"  => new[] { "low", "medium" },
                "high"    => new[] { "low", "medium", "high" },
                "premium" => new[] { "low", "medium", "high", "premium" },
                _         => Array.Empty<string>(),
            };
            if (allowed.Length > 0)
                query = query.Where(p => p.PriceRange == null || allowed.Contains(p.PriceRange));
        }

        return await query
            .OrderByDescending(p => p.CurationScore)
            .Take(15)
            .ToListAsync(ct);
    }

    // ── Scoring ────────────────────────────────────────────────────────────
    private static decimal ScoreProduct(Product p, SkinProfile profile, string period)
    {
        var score = (decimal)p.CurationScore;

        // Skin type match bonus
        if (p.CompatibleSkinTypes.Contains(profile.SkinType))
            score += BaseSkinTypeBonus;

        // Concern match bonus
        var matchedConcerns = p.TargetsConcerns.Intersect(profile.PrimaryConcerns).Count();
        score += matchedConcerns * BaseConcernBonus;

        // Active acne bonus
        if (profile.HasActiveAcne && p.TargetsConcerns.Contains("acne"))
            score += 15m;

        // Staff pick bonus
        if (p.IsStaffPick) score += StaffPickBonus;
        if (p.IsDermaTested) score += 8m;

        // Strength penalty for sensitive skin
        if (profile.SensitivityScore >= 7 && p.StrengthLevel == "moderate")
            score -= StrengthPenaltyModerate;

        // Period match: prefer products that explicitly target this period
        if (p.SuitablePeriods.Length == 1 && p.SuitablePeriods[0] == period)
            score += 5m;

        return score;
    }

    // ── Versioning ─────────────────────────────────────────────────────────
    public async Task SaveVersionSnapshotAsync(
        UserRoutine routine, int version, string changeType, CancellationToken ct,
        string changedBy = "engine", string? summary = null)
    {
        var steps = await db.RoutineSteps
            .AsNoTracking()
            .Where(s => s.RoutineId == routine.Id && s.IsActive)
            .Include(s => s.Slots)
                .ThenInclude(sl => sl.Product)
                    .ThenInclude(p => p!.Images)
            .OrderBy(s => s.StepOrder)
            .ToListAsync(ct);

        var snapshot = new
        {
            version,
            period = routine.Period,
            generatedBy = routine.GeneratedBy,
            steps = steps.Select(s => new
            {
                order = s.StepOrder,
                stepType = s.StepTypeKey,
                recurrence = s.Recurrence,
                slots = s.Slots.Select(sl => new
                {
                    tier = sl.Tier,
                    isSelected = sl.IsSelected,
                    productId = sl.ProductId,
                    productName = sl.Product?.Name,
                    imageUrl = sl.Product?.PrimaryImageUrl,
                    score = sl.ScoreAtGeneration,
                })
            })
        };

        db.RoutineVersions.Add(new RoutineVersion
        {
            RoutineId = routine.Id,
            Version = version,
            ChangedBy = changedBy,
            ChangeType = changeType,
            ChangeSummary = summary,
            Snapshot = JsonSerializer.Serialize(snapshot),
        });
        await db.SaveChangesAsync(ct);
    }

    // ── Internal helpers for RoutineSuggestionService ─────────────────────
    internal async Task<RoutineTemplateEntity?> SelectTemplateForSuggestionsAsync(SkinProfile profile, string period, CancellationToken ct)
        => await SelectTemplateAsync(profile, period, ct);

    internal async Task<Product?> GetBestProductForStepAsync(string stepKey, string period, SkinProfile profile, CancellationToken ct)
    {
        var candidates = await GetCandidatesAsync(stepKey, period, profile, ct);
        if (candidates.Count == 0) return null;
        return candidates
            .Select(p => (product: p, score: ScoreProduct(p, profile, period)))
            .OrderByDescending(x => x.score)
            .FirstOrDefault().product;
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    private static string ResolveRecurrence(string stepKey, string period) => stepKey switch
    {
        "acid" or "retinoid" => "2-3x_week",
        "sunscreen" => "daily",
        _ => "daily",
    };

}
