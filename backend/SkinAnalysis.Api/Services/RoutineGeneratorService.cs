using System.Text.Json;
using Dapper;
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
        // Deactivate any existing routines for this user
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

    // ── Template selection ─────────────────────────────────────────────────
    private async Task<RoutineTemplateRow?> SelectTemplateAsync(SkinProfile profile, string period, CancellationToken ct)
    {
        var conn = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync(ct);

        const string sql = """
            SELECT id, name, step_type_keys, specificity_score
            FROM routine_templates
            WHERE period = @period
              AND is_active = true
              AND (match_skin_types IS NULL OR @skinType = ANY(match_skin_types))
              AND (match_concerns IS NULL OR match_concerns && @concerns)
              AND (min_acne_score IS NULL OR @acneScore >= min_acne_score)
              AND (min_oiliness_score IS NULL OR @oilinessScore >= min_oiliness_score)
              AND (min_sensitivity IS NULL OR @sensitivityScore >= min_sensitivity)
              AND (require_flags IS NULL OR (
                    (NOT 'has_active_acne'    = ANY(require_flags) OR @hasActiveAcne) AND
                    (NOT 'has_dark_circles'   = ANY(require_flags) OR @hasDarkCircles) AND
                    (NOT 'has_enlarged_pores' = ANY(require_flags) OR @hasEnlargedPores)
                  ))
            ORDER BY specificity_score ASC
            LIMIT 1
            """;

        return await conn.QueryFirstOrDefaultAsync<RoutineTemplateRow>(
            new CommandDefinition(sql, new
            {
                period,
                skinType = profile.SkinType,
                concerns = profile.PrimaryConcerns,
                acneScore = profile.AcneScore,
                oilinessScore = profile.OilinessScore,
                sensitivityScore = profile.SensitivityScore,
                hasActiveAcne = profile.HasActiveAcne,
                hasDarkCircles = profile.HasDarkCircles,
                hasEnlargedPores = profile.HasEnlargedPores,
            }, cancellationToken: ct));
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
        var altBudget = scored.FirstOrDefault(x => x.product.Id != primary.product.Id
                            && x.product.PriceRange is "low" or "medium");
        var altRated  = scored.FirstOrDefault(x => x.product.Id != primary.product.Id
                            && x.product.Id != altBudget.product?.Id);

        await AddSlotAsync(step, "primary",    primary.product,   primary.score,   "Melhor para seu perfil", ct);
        if (altBudget.product is not null)
            await AddSlotAsync(step, "alt_budget", altBudget.product, altBudget.score, "Melhor custo-benefício", ct);
        if (altRated.product is not null)
            await AddSlotAsync(step, "alt_rated",  altRated.product,  altRated.score,  "Mais bem avaliado", ct);
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

    // ── Helpers ────────────────────────────────────────────────────────────
    private static string ResolveRecurrence(string stepKey, string period) => stepKey switch
    {
        "acid" or "retinoid" => "2-3x_week",
        "sunscreen" => "daily",
        _ => "daily",
    };

    // Internal DTOs for Dapper queries
    private sealed record RoutineTemplateRow(Guid Id, string Name, string[] StepTypeKeys, int SpecificityScore);
}
