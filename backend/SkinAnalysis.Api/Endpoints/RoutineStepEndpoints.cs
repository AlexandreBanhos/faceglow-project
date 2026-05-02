using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Endpoints;

public static class RoutineStepEndpoints
{
    public static void MapRoutineStepEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/analysis")
            .WithTags("Routine Steps")
            .WithOpenApi();

        group.MapGet("/{id:guid}/steps", GetRoutineStepsHandler)
            .WithName("GetRoutineSteps")
            .WithDescription("Get structured routine steps for an analysis (with lazy population)")
            .RequireAuthorization();

        group.MapPost("/{id:guid}/steps", AddRoutineStepHandler)
            .WithName("AddRoutineStep")
            .WithDescription("Add a custom routine step")
            .RequireAuthorization();

        group.MapPatch("/{id:guid}/steps/{stepId:guid}", PatchRoutineStepHandler)
            .WithName("PatchRoutineStep")
            .WithDescription("Update a routine step (tier, product override, image)")
            .RequireAuthorization();

        group.MapDelete("/{id:guid}/steps/{stepId:guid}", DeleteRoutineStepHandler)
            .WithName("DeleteRoutineStep")
            .WithDescription("Soft delete a routine step")
            .RequireAuthorization();

        group.MapPut("/{id:guid}/steps/reorder", ReorderStepsHandler)
            .WithName("ReorderSteps")
            .WithDescription("Reorder routine steps within a period by updating step_order")
            .RequireAuthorization();

        group.MapPost("/{id:guid}/steps/migrate", MigrateFromCustomizationsHandler)
            .WithName("MigrateFromCustomizations")
            .WithDescription("One-time migration: applies routineOrder and schedule from customizations_json to structured steps")
            .RequireAuthorization();
    }

    private static (Guid userId, bool valid) GetUserId(ClaimsPrincipal user)
    {
        var claim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(claim, out var id)) return (id, true);
        return (Guid.Empty, false);
    }

    // ========== GET STRUCTURED ROUTINE STEPS (with images) ==========
    private static async Task<IResult> GetRoutineStepsHandler(
        Guid id,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        IMemoryCache cache,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var cacheKey = $"steps_{id}_{userId}";
        if (cache.TryGetValue(cacheKey, out var cached)) return Results.Ok(cached);

        var steps = await dbContext.AnalysisRoutineSteps
            .AsNoTracking()
            .Where(s => s.AnalysisId == id && s.UserId == userId && s.IsActive)
            .Include(s => s.Product)
            .Include(s => s.Recommendation)
            .OrderBy(s => s.Period)
            .ThenBy(s => s.StepOrder)
            .ToListAsync(cancellationToken);

        // Lazy populate: if no steps exist yet, generate from routine_json
        if (steps.Count == 0)
        {
            var analysis = await dbContext.Analyses
                .AsNoTracking()
                .Include(a => a.Recommendations)
                .Where(a => a.Id == id && a.UserId == userId)
                .FirstOrDefaultAsync(cancellationToken);

            if (analysis is null) return Results.NotFound(new { error = "Análise não encontrada." });

            var generated = BuildStepsFromRoutineJson(analysis, analysis.Recommendations.ToList());
            if (generated.Count > 0)
            {
                try
                {
                    dbContext.AnalysisRoutineSteps.AddRange(generated);
                    await dbContext.SaveChangesAsync(cancellationToken);
                    steps = generated;
                    logger.LogInformation("[GET /steps] Populados {Count} passos para análise {Id}", generated.Count, id);
                }
                catch (Microsoft.EntityFrameworkCore.DbUpdateException)
                {
                    // Race condition: outro request já populou os steps (unique constraint)
                    // Re-fetch do banco para retornar os steps corretos
                    dbContext.ChangeTracker.Clear();
                    steps = await dbContext.AnalysisRoutineSteps
                        .AsNoTracking()
                        .Where(s => s.AnalysisId == id && s.UserId == userId && s.IsActive)
                        .Include(s => s.Product)
                        .Include(s => s.Recommendation)
                        .OrderBy(s => s.Period)
                        .ThenBy(s => s.StepOrder)
                        .ToListAsync(cancellationToken);
                    logger.LogInformation("[GET /steps] Race condition detectada, re-fetch retornou {Count} passos para análise {Id}", steps.Count, id);
                }
            }
        }

        static string? ResolveImage(AnalysisRoutineStep s)
            => s.OverrideImageUrl
            ?? s.Product?.ImageUrl
            ?? s.Recommendation?.ImageUrl
            ?? s.ImageUrl;

        var dto = steps.Select(s => new
        {
            s.Id,
            s.AnalysisId,
            s.Period,
            s.StepOrder,
            s.Category,
            s.ProductId,
            s.ProductName,
            imageUrl = ResolveImage(s),
            s.Recurrence,
            s.IsExtra,
            s.IsUserAdded,
            s.SelectedTier,
            s.OverrideProductName,
            s.OverrideImageUrl,
            scheduleDays = s.ScheduleDays ?? "[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\",\"sat\",\"sun\"]",
        }).ToList();

        cache.Set(cacheKey, dto, TimeSpan.FromSeconds(30));
        return Results.Ok(dto);
    }

    // ========== ADD CUSTOM ROUTINE STEP ==========
    private static async Task<IResult> AddRoutineStepHandler(
        Guid id,
        AddRoutineStepRequest request,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        IMemoryCache cache,
        CancellationToken cancellationToken)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var exists = await dbContext.Analyses.AnyAsync(a => a.Id == id && a.UserId == userId, cancellationToken);
        if (!exists) return Results.NotFound(new { error = "Análise não encontrada." });

        var maxOrder = await dbContext.AnalysisRoutineSteps
            .Where(s => s.AnalysisId == id && s.Period == request.Period)
            .MaxAsync(s => (int?)s.StepOrder, cancellationToken) ?? -1;

        var step = new AnalysisRoutineStep
        {
            AnalysisId = id,
            UserId = userId,
            Period = request.Period,
            StepOrder = maxOrder + 1,
            Category = request.Category ?? "Personalizado",
            ProductName = request.ProductName,
            ImageUrl = request.ImageUrl,
            OverrideImageUrl = request.ImageUrl,
            Recurrence = NormalizeRecurrence(request.Recurrence) ?? "daily",
            IsUserAdded = true,
        };

        try
        {
            dbContext.AnalysisRoutineSteps.Add(step);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException)
        {
            // Produto já existe nesse período (unique constraint) — reativar se estava soft-deleted
            dbContext.ChangeTracker.Clear();
            var existing = await dbContext.AnalysisRoutineSteps
                .FirstOrDefaultAsync(s => s.AnalysisId == id && s.UserId == userId
                    && s.Period == request.Period
                    && EF.Functions.ILike(s.ProductName, request.ProductName), cancellationToken);

            if (existing is not null && !existing.IsActive)
            {
                existing.IsActive = true;
                existing.UpdatedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
                cache.Remove($"steps_{id}_{userId}");
                return Results.Ok(new { existing.Id, existing.Period, existing.ProductName, existing.Category, reactivated = true });
            }

            return Results.Conflict(new { error = "Esse produto já existe nessa etapa da rotina." });
        }

        cache.Remove($"steps_{id}_{userId}");
        return Results.Created($"/analysis/{id}/steps/{step.Id}", new { step.Id, step.Period, step.ProductName, step.Category });
    }

    // ========== UPDATE ROUTINE STEP (tier, product override, image) ==========
    private static async Task<IResult> PatchRoutineStepHandler(
        Guid id,
        Guid stepId,
        PatchRoutineStepRequest request,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        IMemoryCache cache,
        CancellationToken cancellationToken)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var step = await dbContext.AnalysisRoutineSteps
            .Where(s => s.Id == stepId && s.AnalysisId == id && s.UserId == userId)
            .FirstOrDefaultAsync(cancellationToken);

        if (step is null) return Results.NotFound(new { error = "Passo não encontrado." });

        if (request.SelectedTier is not null) step.SelectedTier = request.SelectedTier;
        if (request.OverrideProductName is not null) step.OverrideProductName = request.OverrideProductName;
        if (request.OverrideImageUrl is not null) step.OverrideImageUrl = request.OverrideImageUrl;
        if (request.ProductId.HasValue) step.ProductId = request.ProductId;
        if (request.ScheduleDays is not null) step.ScheduleDays = request.ScheduleDays;
        step.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        cache.Remove($"steps_{id}_{userId}");

        return Results.Ok(new { step.Id, step.SelectedTier, step.OverrideProductName, step.OverrideImageUrl });
    }

    // ========== SOFT DELETE ROUTINE STEP ==========
    private static async Task<IResult> DeleteRoutineStepHandler(
        Guid id,
        Guid stepId,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        IMemoryCache cache,
        CancellationToken cancellationToken)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var step = await dbContext.AnalysisRoutineSteps
            .Where(s => s.Id == stepId && s.AnalysisId == id && s.UserId == userId)
            .FirstOrDefaultAsync(cancellationToken);

        if (step is null) return Results.NotFound(new { error = "Passo não encontrado." });

        step.IsActive = false;
        step.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        cache.Remove($"steps_{id}_{userId}");

        return Results.Ok(new { message = "Passo removido." });
    }

    // ========== REORDER STEPS ==========
    private static async Task<IResult> ReorderStepsHandler(
        Guid id,
        ReorderStepsRequest request,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        IMemoryCache cache,
        CancellationToken cancellationToken)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var steps = await dbContext.AnalysisRoutineSteps
            .Where(s => s.AnalysisId == id && s.UserId == userId && s.IsActive && s.Period == request.Period)
            .ToListAsync(cancellationToken);

        var stepMap = steps.ToDictionary(s => s.Id);
        for (int i = 0; i < request.StepIds.Count; i++)
        {
            if (stepMap.TryGetValue(request.StepIds[i], out var step))
            {
                step.StepOrder = i;
                step.UpdatedAt = DateTime.UtcNow;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        cache.Remove($"steps_{id}_{userId}");
        return Results.Ok(new { updated = request.StepIds.Count });
    }

    // ========== MIGRATE FROM CUSTOMIZATIONS JSON (one-time) ==========
    private static async Task<IResult> MigrateFromCustomizationsHandler(
        Guid id,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        IMemoryCache cache,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var analysis = await dbContext.Analyses
            .AsNoTracking()
            .Where(a => a.Id == id && a.UserId == userId)
            .FirstOrDefaultAsync(cancellationToken);

        if (analysis is null) return Results.NotFound(new { error = "Análise não encontrada." });
        if (string.IsNullOrWhiteSpace(analysis.CustomizationsJson) || analysis.CustomizationsJson == "{}")
            return Results.Ok(new { migrated = false, reason = "Sem customizações para migrar." });

        var steps = await dbContext.AnalysisRoutineSteps
            .Where(s => s.AnalysisId == id && s.UserId == userId && s.IsActive)
            .ToListAsync(cancellationToken);

        if (steps.Count == 0)
            return Results.Ok(new { migrated = false, reason = "Sem steps estruturados para atualizar." });

        MigrationCustomizations? cust;
        try { cust = System.Text.Json.JsonSerializer.Deserialize<MigrationCustomizations>(analysis.CustomizationsJson); }
        catch { return Results.Ok(new { migrated = false, reason = "CustomizationsJson inválido." }); }

        if (cust is null) return Results.Ok(new { migrated = false, reason = "CustomizationsJson vazio." });

        int updated = 0;

        // Apply routineOrder → step_order
        void ApplyOrder(string period, List<string>? order)
        {
            if (order is null || order.Count == 0) return;
            var periodSteps = steps.Where(s => s.Period == period).ToList();
            var stepByKey = periodSteps.ToDictionary(
                s => $"{s.Period}::{s.ProductName.Trim().ToLowerInvariant()}", s => s);
            for (int i = 0; i < order.Count; i++)
            {
                if (stepByKey.TryGetValue(order[i].ToLowerInvariant(), out var step))
                {
                    step.StepOrder = i;
                    step.UpdatedAt = DateTime.UtcNow;
                    updated++;
                }
            }
        }

        ApplyOrder("morning", cust.RoutineOrder?.Morning);
        ApplyOrder("night", cust.RoutineOrder?.Night);

        // Apply schedule.daysByItem → schedule_days per step
        if (cust.Schedule?.DaysByItem is not null)
        {
            var stepByKey = steps.ToDictionary(
                s => $"{s.Period}::{s.ProductName.Trim().ToLowerInvariant()}", s => s);
            foreach (var (key, days) in cust.Schedule.DaysByItem)
            {
                var normalizedKey = key.ToLowerInvariant();
                if (stepByKey.TryGetValue(normalizedKey, out var step) && days is not null)
                {
                    step.ScheduleDays = System.Text.Json.JsonSerializer.Serialize(days);
                    step.UpdatedAt = DateTime.UtcNow;
                    updated++;
                }
            }
        }

        if (updated > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            cache.Remove($"steps_{id}_{userId}");
            logger.LogInformation("[Migrate] Migrados {Count} steps para análise {Id}", updated, id);
        }

        return Results.Ok(new { migrated = true, stepsUpdated = updated });
    }

    private record MigrationCustomizations(
        [property: System.Text.Json.Serialization.JsonPropertyName("routineOrder")] MigrationOrder? RoutineOrder,
        [property: System.Text.Json.Serialization.JsonPropertyName("schedule")] MigrationSchedule? Schedule
    );
    private record MigrationOrder(
        [property: System.Text.Json.Serialization.JsonPropertyName("morning")] List<string>? Morning,
        [property: System.Text.Json.Serialization.JsonPropertyName("night")] List<string>? Night
    );
    private record MigrationSchedule(
        [property: System.Text.Json.Serialization.JsonPropertyName("daysByItem")] Dictionary<string, List<string>>? DaysByItem
    );

    // ========== Helper methods ==========

    private static string NormalizeRecurrence(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "daily";
        var lower = raw.Trim().ToLowerInvariant();
        return lower switch
        {
            "morning" or "night" or "both" => "daily",
            "daily" or "as_needed" or "weekly" => lower,
            "2x_semana" or "3x_semana" or "2x_week" or "3x_week" => lower,
            _ when lower.StartsWith("2-3x") || lower.StartsWith("3x") || lower.StartsWith("2x") => lower,
            _ => "daily",
        };
    }

    private static List<AnalysisRoutineStep> BuildStepsFromRoutineJson(
        Analysis analysis,
        List<Recommendation> recommendations)
    {
        var steps = new List<AnalysisRoutineStep>();
        if (string.IsNullOrWhiteSpace(analysis.RoutineJson)) return steps;

        AnalysisRoutineDto? routine;
        try { routine = System.Text.Json.JsonSerializer.Deserialize<AnalysisRoutineDto>(analysis.RoutineJson); }
        catch { return steps; }
        if (routine is null) return steps;

        var recByName = recommendations
            .Where(r => !string.IsNullOrWhiteSpace(r.Product))
            .GroupBy(r => r.Product.Trim().ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.First());

        static (string category, string productName, string recurrence) ParseStep(string raw)
        {
            var sep = raw.IndexOf(':');
            var category = sep > 0 ? raw[..sep].Trim() : "Passo";
            var rest = sep > 0 ? raw[(sep + 1)..].Trim() : raw.Trim();

            string recurrence = "daily";
            var match = System.Text.RegularExpressions.Regex.Match(rest, @"\(([^)]+)\)\s*$");
            if (match.Success)
            {
                recurrence = match.Groups[1].Value.Trim().ToLowerInvariant();
                rest = rest[..match.Index].Trim();
            }

            return (category, rest, recurrence);
        }

        static bool IsExtraCategory(string cat)
        {
            var n = cat.ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
            n = System.Text.RegularExpressions.Regex.Replace(n, @"\p{M}", "");
            return n is "extras" or "extra" or "adicional";
        }

        void AddSteps(IList<string> rawSteps, string period)
        {
            var seenTitles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < rawSteps.Count; i++)
            {
                var (category, productName, rawRec) = ParseStep(rawSteps[i]);
                if (string.IsNullOrWhiteSpace(productName)) continue;
                if (!seenTitles.Add(productName.ToLowerInvariant())) continue;

                recByName.TryGetValue(productName.ToLowerInvariant(), out var rec);

                steps.Add(new AnalysisRoutineStep
                {
                    AnalysisId = analysis.Id,
                    UserId = analysis.UserId,
                    Period = period,
                    StepOrder = i,
                    Category = category,
                    RecommendationId = rec?.Id,
                    ProductName = productName,
                    ImageUrl = rec?.ImageUrl,
                    Recurrence = NormalizeRecurrence(rawRec),
                    IsExtra = IsExtraCategory(category),
                    IsActive = true,
                });
            }
        }

        AddSteps(routine.Morning, "morning");
        AddSteps(routine.Night, "night");
        return steps;
    }
}
