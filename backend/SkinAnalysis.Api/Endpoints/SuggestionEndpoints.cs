using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Endpoints;

public static class SuggestionEndpoints
{
    public static void MapSuggestionEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/routine/suggestions")
            .WithTags("Routine Suggestions")
            .WithOpenApi()
            .RequireAuthorization();

        group.MapGet("/", GetSuggestionsHandler);
        group.MapPatch("/{id:guid}/accept", AcceptSuggestionHandler);
        group.MapPatch("/{id:guid}/reject", RejectSuggestionHandler);
    }

    private static (Guid id, bool valid) GetUserId(ClaimsPrincipal user)
    {
        var claim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? (id, true) : (Guid.Empty, false);
    }

    private static async Task<IResult> GetSuggestionsHandler(
        ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var suggestions = await db.RoutineChangeSuggestions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "pending")
            .Include(s => s.SuggestedProduct).ThenInclude(p => p!.Images)
            .OrderBy(s => s.Priority)
            .Take(10)
            .ToListAsync(ct);

        return Results.Ok(suggestions.Select(s => new
        {
            s.Id,
            s.SuggestionType,
            s.StepTypeKey,
            StepDisplayName = StepDisplayNames.Get(s.StepTypeKey),
            s.StepPeriod,
            s.CurrentProductName,
            s.SuggestedProductId,
            s.SuggestedProductName,
            SuggestedImageUrl = s.SuggestedProduct?.PrimaryImageUrl ?? s.SuggestedImageUrl,
            s.Reason,
            s.Priority,
            s.AnalysisId,
        }));
    }

    private static async Task<IResult> AcceptSuggestionHandler(
        Guid id, ClaimsPrincipal user, AppDbContext db,
        IMemoryCache cache, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var suggestion = await db.RoutineChangeSuggestions
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId && s.Status == "pending", ct);
        if (suggestion is null) return Results.NotFound();

        var applied = await ApplySuggestionAsync(suggestion, userId, db, ct);

        suggestion.Status = "accepted";
        suggestion.ResolvedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Invalidate step cache for affected routines
        var profileIds = await db.Routines
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.IsActive)
            .Select(r => r.SkinProfileId)
            .ToListAsync(ct);

        var analysisIds = await db.SkinProfiles
            .AsNoTracking()
            .Where(p => profileIds.Contains(p.Id) && p.AnalysisId.HasValue)
            .Select(p => p.AnalysisId!.Value)
            .ToListAsync(ct);

        foreach (var aid in analysisIds)
            cache.Remove($"v2_steps_{aid}_{userId}");

        // Also clear cache for the analysis that triggered the suggestion (new analysis in suggestions mode)
        cache.Remove($"v2_steps_{suggestion.AnalysisId}_{userId}");

        return Results.Ok(new { applied, message = applied ? "Sugestão aplicada!" : "Sugestão aceita (aplicação manual pode ser necessária)" });
    }

    private static async Task<IResult> RejectSuggestionHandler(
        Guid id, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var suggestion = await db.RoutineChangeSuggestions
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId && s.Status == "pending", ct);
        if (suggestion is null) return Results.NotFound();

        suggestion.Status = "rejected";
        suggestion.ResolvedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new { message = "Sugestão ignorada." });
    }

    private static async Task<List<UserRoutine>> LoadRoutinesForSuggestion(
        RoutineChangeSuggestion suggestion, Guid userId, AppDbContext db, CancellationToken ct)
    {
        // Determine which periods to target
        var periods = suggestion.StepPeriod is "morning" or "night"
            ? [suggestion.StepPeriod]
            : new[] { "morning", "night" };

        var routines = new List<UserRoutine>();
        foreach (var period in periods)
        {
            var r = await db.Routines
                .Include(r => r.Steps.Where(s => s.IsActive))
                    .ThenInclude(s => s.Slots)
                .FirstOrDefaultAsync(r =>
                    r.UserId == userId &&
                    r.Period == period &&
                    r.IsActive, ct);
            if (r is not null) routines.Add(r);
        }
        return routines;
    }

    private static async Task<bool> ApplySuggestionAsync(
        RoutineChangeSuggestion suggestion, Guid userId, AppDbContext db, CancellationToken ct)
    {
        var routines = await LoadRoutinesForSuggestion(suggestion, userId, db, ct);
        if (routines.Count == 0) return false;

        // add_step: add to each targeted period's routine
        if (suggestion.SuggestionType == "add_step")
        {
            foreach (var routine in routines)
            {
                var maxOrder = routine.Steps.Any() ? routine.Steps.Max(s => s.StepOrder) : -1;
                var newStep = new UserRoutineStep
                {
                    RoutineId = routine.Id,
                    StepTypeKey = suggestion.StepTypeKey,
                    StepOrder = maxOrder + 1,
                    IsUserAdded = false,
                    Recurrence = "daily",
                };
                db.RoutineSteps.Add(newStep);
                await db.SaveChangesAsync(ct);

                if (suggestion.SuggestedProductId.HasValue)
                {
                    db.StepProductSlots.Add(new StepProductSlot
                    {
                        StepId = newStep.Id,
                        Tier = "primary",
                        ProductId = suggestion.SuggestedProductId.Value,
                        IsSelected = true,
                        RecommendationReason = suggestion.Reason,
                    });
                }
                else if (suggestion.SuggestedProductName is not null)
                {
                    var userProduct = await db.UserProducts.FirstOrDefaultAsync(
                        p => p.UserId == userId && p.CustomName == suggestion.SuggestedProductName, ct)
                        ?? new UserProduct
                        {
                            UserId = userId,
                            CustomName = suggestion.SuggestedProductName,
                            CustomImageUrl = suggestion.SuggestedImageUrl,
                            StepTypeKey = suggestion.StepTypeKey,
                        };
                    if (userProduct.Id == Guid.Empty) { db.UserProducts.Add(userProduct); await db.SaveChangesAsync(ct); }
                    db.StepProductSlots.Add(new StepProductSlot
                    {
                        StepId = newStep.Id,
                        Tier = "user_custom",
                        UserProductId = userProduct.Id,
                        IsSelected = true,
                        RecommendationReason = suggestion.Reason,
                    });
                }

                routine.IsCustomized = true;
                routine.UpdatedAt = DateTime.UtcNow;
            }
            await db.SaveChangesAsync(ct);
            return true;
        }

        // remove_step: remove matching step from each targeted period
        if (suggestion.SuggestionType == "remove_step")
        {
            bool removed = false;
            foreach (var routine in routines)
            {
                var step = routine.Steps.FirstOrDefault(s => s.StepTypeKey == suggestion.StepTypeKey);
                if (step is null) continue;
                step.IsActive = false;
                step.UpdatedAt = DateTime.UtcNow;
                routine.IsCustomized = true;
                routine.UpdatedAt = DateTime.UtcNow;
                removed = true;
            }
            if (removed) await db.SaveChangesAsync(ct);
            return removed;
        }

        // swap_product: swap product slot in each targeted period
        if (suggestion.SuggestionType == "swap_product" && suggestion.SuggestedProductId.HasValue)
        {
            bool swapped = false;
            foreach (var routine in routines)
            {
                var step = routine.Steps.FirstOrDefault(s => s.StepTypeKey == suggestion.StepTypeKey);
                if (step is null) continue;

                var existingSlot = step.Slots.FirstOrDefault(sl => sl.ProductId == suggestion.SuggestedProductId);

                // Phase 1: deselect all
                foreach (var sl in step.Slots) sl.IsSelected = false;
                await db.SaveChangesAsync(ct);

                // Phase 2: select suggested
                if (existingSlot is not null)
                {
                    existingSlot.IsSelected = true;
                }
                else
                {
                    db.StepProductSlots.Add(new StepProductSlot
                    {
                        StepId = step.Id,
                        Tier = "primary",
                        ProductId = suggestion.SuggestedProductId.Value,
                        IsSelected = true,
                        RecommendationReason = suggestion.Reason,
                    });
                }
                routine.IsCustomized = true;
                routine.UpdatedAt = DateTime.UtcNow;
                swapped = true;
            }
            if (swapped) await db.SaveChangesAsync(ct);
            return swapped;
        }

        return false;
    }
}
