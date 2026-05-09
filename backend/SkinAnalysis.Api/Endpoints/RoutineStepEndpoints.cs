using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Models;
using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Endpoints;

public static class RoutineStepEndpoints
{
    public static void MapRoutineStepEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/analysis")
            .WithTags("Routine Steps")
            .WithOpenApi();

        // Main endpoint: GET routine steps by analysis ID
        // Returns same shape as before for frontend compatibility
        group.MapGet("/{id:guid}/steps", GetStepsHandler)
            .WithName("GetRoutineSteps")
            .RequireAuthorization();

        group.MapPost("/{id:guid}/steps", AddStepHandler)
            .WithName("AddRoutineStep")
            .RequireAuthorization();

        group.MapPatch("/{id:guid}/steps/{stepId:guid}", PatchStepHandler)
            .WithName("PatchRoutineStep")
            .RequireAuthorization();

        group.MapDelete("/{id:guid}/steps/{stepId:guid}", DeleteStepHandler)
            .WithName("DeleteRoutineStep")
            .RequireAuthorization();

        group.MapPut("/{id:guid}/steps/reorder", ReorderStepsHandler)
            .WithName("ReorderSteps")
            .RequireAuthorization();

        // New: select a specific slot (primary/alt_budget/alt_rated/user_custom)
        group.MapPatch("/{id:guid}/steps/{stepId:guid}/select-slot", SelectSlotHandler)
            .WithName("SelectStepSlot")
            .RequireAuthorization();

        // New: add a catalog product as a slot (no UserProduct created)
        group.MapPost("/{id:guid}/steps/{stepId:guid}/add-catalog-slot", AddCatalogSlotHandler)
            .WithName("AddCatalogSlot")
            .RequireAuthorization();

        // New: restore to a previous version
        app.MapPost("/routines/{routineId:guid}/restore/{version:int}", RestoreVersionHandler)
            .WithName("RestoreRoutineVersion")
            .RequireAuthorization()
            .WithTags("Routine Steps")
            .WithOpenApi();
    }

    private static (Guid userId, bool valid) GetUserId(ClaimsPrincipal user)
    {
        var claim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? (id, true) : (Guid.Empty, false);
    }

    // ── GET /analysis/{id}/steps ──────────────────────────────────────────
    // Returns steps from the active routines associated with this analysis
    // Shape kept compatible with old response for frontend
    private static async Task<IResult> GetStepsHandler(
        Guid id, ClaimsPrincipal user, AppDbContext db,
        IMemoryCache cache, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var cacheKey = $"v2_steps_{id}_{userId}";
        if (cache.TryGetValue(cacheKey, out var cached)) return Results.Ok(cached);

        // Find analysis, then profile, then routines
        var analysis = await db.SkinAnalyses
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);

        if (analysis is null) return Results.NotFound(new { error = "Análise não encontrada." });

        var profile = await db.SkinProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.AnalysisId == id && p.UserId == userId, ct);

        if (profile is null) return Results.Ok(Array.Empty<object>());

        var includeSteps = (IQueryable<UserRoutineStep> q) => q
            .Include(s => s.Routine)
            .Include(s => s.Slots)
                .ThenInclude(sl => sl.Product)
                    .ThenInclude(p => p!.Images)
            .Include(s => s.Slots)
                .ThenInclude(sl => sl.UserProduct)
            .OrderBy(s => s.Routine.Period)
            .ThenBy(s => s.StepOrder);

        // Primary: steps tied to this analysis's profile
        var steps = await includeSteps(db.RoutineSteps
            .AsNoTracking()
            .Where(s => s.Routine.SkinProfileId == profile.Id
                     && s.Routine.UserId == userId
                     && s.Routine.IsActive
                     && s.IsActive))
            .ToListAsync(ct);

        // Fallback: new analysis in "suggestions mode" — no routine generated for new profile yet.
        // Show the user's current active routine so the page isn't blank.
        if (steps.Count == 0)
        {
            steps = await includeSteps(db.RoutineSteps
                .AsNoTracking()
                .Where(s => s.Routine.UserId == userId
                         && s.Routine.IsActive
                         && s.IsActive))
                .ToListAsync(ct);
        }

        var dto = steps.Select(s =>
        {
            var selected = s.Slots.FirstOrDefault(sl => sl.IsSelected);
            var productName = selected?.Product?.Name
                ?? selected?.UserProduct?.DisplayName
                ?? string.Empty;
            var imageUrl = selected?.Product?.PrimaryImageUrl
                ?? selected?.UserProduct?.DisplayImageUrl;
            var scheduleDays = s.ScheduleDays.Length > 0
                ? JsonSerializer.Serialize(MapDaysToNames(s.ScheduleDays))
                : "[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\",\"sat\",\"sun\"]";

            return new
            {
                s.Id,
                AnalysisId = id,
                Period = s.Routine.Period,
                StepOrder = s.StepOrder,
                Category = s.StepTypeKey,
                CategoryDisplayName = StepDisplayName(s.StepTypeKey),
                ProductId = selected?.ProductId,
                ProductName = productName,
                imageUrl,
                Recurrence = s.Recurrence,
                IsExtra = false,
                s.IsUserAdded,
                SelectedTier = selected?.Tier,
                OverrideProductName = (string?)null,
                OverrideImageUrl = (string?)null,
                scheduleDays,
                // Extra v2 fields
                RoutineId = s.RoutineId,
                StepTypeKey = s.StepTypeKey,
                Slots = s.Slots.Select(sl => new
                {
                    sl.Id,
                    sl.Tier,
                    sl.IsSelected,
                    ProductId = sl.ProductId,
                    ProductName = sl.Product?.Name ?? sl.UserProduct?.DisplayName,
                    ImageUrl = sl.Product?.PrimaryImageUrl ?? sl.UserProduct?.DisplayImageUrl,
                    sl.RecommendationReason,
                    Score = sl.ScoreAtGeneration,
                }).ToList()
            };
        }).ToList();

        cache.Set(cacheKey, dto, TimeSpan.FromSeconds(30));
        return Results.Ok(dto);
    }

    // ── POST /analysis/{id}/steps ─────────────────────────────────────────
    private static async Task<IResult> AddStepHandler(
        Guid id, AddRoutineStepRequest request, ClaimsPrincipal user,
        AppDbContext db, IMemoryCache cache, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var profile = await db.SkinProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.AnalysisId == id && p.UserId == userId, ct);
        if (profile is null) return Results.NotFound(new { error = "Análise não encontrada." });

        var routine = await db.Routines
            .FirstOrDefaultAsync(r => r.SkinProfileId == profile.Id
                                   && r.Period == request.Period
                                   && r.IsActive, ct)
            // Fallback: new analysis in suggestions mode — no routine for this profile yet
            // Use the user's currently active routine for the period
            ?? await db.Routines
            .FirstOrDefaultAsync(r => r.UserId == userId
                                   && r.Period == request.Period
                                   && r.IsActive, ct);

        if (routine is null) return Results.NotFound(new { error = "Rotina não encontrada para esse período." });

        var maxOrder = await db.RoutineSteps
            .Where(s => s.RoutineId == routine.Id && s.IsActive)
            .MaxAsync(s => (int?)s.StepOrder, ct) ?? -1;

        var resolvedKey = StepDisplayNames.ResolveKey(request.Category);

        var step = new UserRoutineStep
        {
            RoutineId = routine.Id,
            StepTypeKey = resolvedKey,
            StepOrder = maxOrder + 1,
            IsUserAdded = true,
            Recurrence = request.Recurrence ?? "daily",
        };
        db.RoutineSteps.Add(step);
        await db.SaveChangesAsync(ct);

        // Check for duplicate step with same product in this routine
        var duplicateExists = await db.RoutineSteps
            .AnyAsync(s => s.RoutineId == routine.Id
                        && s.IsActive
                        && s.Slots.Any(sl => sl.IsSelected
                            && (sl.Product!.Name.ToLower() == request.ProductName.ToLower()
                                || sl.UserProduct!.CustomName!.ToLower() == request.ProductName.ToLower())), ct);
        if (duplicateExists)
            return Results.Conflict(new { error = "Este produto já existe nessa rotina." });

        StepProductSlot slot;
        if (request.ProductId.HasValue)
        {
            // Catalog product: create slot referencing products table — NO UserProduct
            slot = new StepProductSlot
            {
                StepId = step.Id,
                Tier = "primary",
                ProductId = request.ProductId.Value,
                UserProductId = null,
                IsSelected = true,
                RecommendationReason = "Adicionado manualmente",
            };
        }
        else
        {
            // Custom product: upsert in user_products, then reference via UserProductId
            var userProduct = await db.UserProducts.FirstOrDefaultAsync(
                p => p.UserId == userId && p.CustomName == request.ProductName, ct);
            if (userProduct is null)
            {
                userProduct = new UserProduct
                {
                    UserId = userId,
                    CustomName = request.ProductName,
                    CustomImageUrl = request.ImageUrl,
                    StepTypeKey = resolvedKey,
                };
                db.UserProducts.Add(userProduct);
                await db.SaveChangesAsync(ct);
            }
            slot = new StepProductSlot
            {
                StepId = step.Id,
                Tier = "user_custom",
                UserProductId = userProduct.Id,
                ProductId = null,
                IsSelected = true,
                RecommendationReason = request.ProductName,
            };
        }
        db.StepProductSlots.Add(slot);

        routine.IsCustomized = true;
        routine.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        cache.Remove($"v2_steps_{id}_{userId}");
        return Results.Created($"/analysis/{id}/steps/{step.Id}",
            new { step.Id, step.StepOrder, request.Period, request.ProductName, step.StepTypeKey });
    }

    // ── PATCH /analysis/{id}/steps/{stepId} ───────────────────────────────
    private static async Task<IResult> PatchStepHandler(
        Guid id, Guid stepId, PatchRoutineStepRequest request,
        ClaimsPrincipal user, AppDbContext db,
        IMemoryCache cache, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .Include(s => s.Slots)
            .FirstOrDefaultAsync(s => s.Id == stepId
                && s.Routine.UserId == userId
                && s.Routine.SkinProfile.AnalysisId == id, ct);

        if (step is null) return Results.NotFound(new { error = "Passo não encontrado." });

        // If SelectedTier provided, switch slot — two-phase to avoid unique constraint violation
        if (request.SelectedTier is not null)
        {
            foreach (var sl in step.Slots) sl.IsSelected = false;
            step.UpdatedAt = DateTime.UtcNow;
            step.Routine.IsCustomized = true;
            step.Routine.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            var targetSlot = step.Slots.FirstOrDefault(sl => sl.Tier == request.SelectedTier);
            if (targetSlot is not null) { targetSlot.IsSelected = true; await db.SaveChangesAsync(ct); }
        }

        // If ScheduleDays provided, update
        if (request.ScheduleDays is not null)
        {
            step.ScheduleDays = ParseScheduleDays(request.ScheduleDays);
        }

        if (request.SelectedTier is null) // only save again if tier wasn't already saved above
        {
            step.UpdatedAt = DateTime.UtcNow;
            step.Routine.IsCustomized = true;
            step.Routine.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        cache.Remove($"v2_steps_{id}_{userId}");

        return Results.Ok(new { step.Id, SelectedTier = request.SelectedTier });
    }

    // ── DELETE /analysis/{id}/steps/{stepId} ──────────────────────────────
    private static async Task<IResult> DeleteStepHandler(
        Guid id, Guid stepId, ClaimsPrincipal user,
        AppDbContext db, IMemoryCache cache, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .FirstOrDefaultAsync(s => s.Id == stepId
                && s.Routine.UserId == userId, ct);

        if (step is null) return Results.NotFound(new { error = "Passo não encontrado." });

        step.IsActive = false;
        step.UpdatedAt = DateTime.UtcNow;
        step.Routine.IsCustomized = true;
        step.Routine.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        cache.Remove($"v2_steps_{id}_{userId}");

        return Results.Ok(new { message = "Passo removido." });
    }

    // ── PUT /analysis/{id}/steps/reorder ──────────────────────────────────
    private static async Task<IResult> ReorderStepsHandler(
        Guid id, ReorderStepsRequest request, ClaimsPrincipal user,
        AppDbContext db, IMemoryCache cache, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var profile = await db.SkinProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.AnalysisId == id && p.UserId == userId, ct);
        if (profile is null) return Results.NotFound(new { error = "Análise não encontrada." });

        var routine = await db.Routines
            .FirstOrDefaultAsync(r => r.SkinProfileId == profile.Id
                                   && r.Period == request.Period
                                   && r.IsActive, ct);
        if (routine is null) return Results.NotFound(new { error = "Rotina não encontrada." });

        var steps = await db.RoutineSteps
            .Where(s => s.RoutineId == routine.Id && s.IsActive)
            .ToListAsync(ct);

        var stepMap = steps.ToDictionary(s => s.Id);
        for (int i = 0; i < request.StepIds.Count; i++)
        {
            if (stepMap.TryGetValue(request.StepIds[i], out var step))
            {
                step.StepOrder = i;
                step.UpdatedAt = DateTime.UtcNow;
            }
        }

        routine.IsCustomized = true;
        routine.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        cache.Remove($"v2_steps_{id}_{userId}");

        return Results.Ok(new { updated = request.StepIds.Count });
    }

    // ── PATCH /analysis/{id}/steps/{stepId}/select-slot ──────────────────
    private static async Task<IResult> SelectSlotHandler(
        Guid id, Guid stepId, SelectSlotRequest request,
        ClaimsPrincipal user, AppDbContext db,
        IMemoryCache cache, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .Include(s => s.Slots)
            .FirstOrDefaultAsync(s => s.Id == stepId
                && s.Routine.UserId == userId, ct);

        if (step is null) return Results.NotFound(new { error = "Passo não encontrado." });

        var targetSlot = step.Slots.FirstOrDefault(sl => sl.Id == request.SlotId || sl.Tier == request.Tier);
        if (targetSlot is null) return Results.NotFound(new { error = "Slot não encontrado." });

        // Two-phase update to avoid violating the unique partial index
        // idx_slot_single_selection: UNIQUE (step_id) WHERE is_selected = true
        // Phase 1: deselect all slots first
        foreach (var sl in step.Slots) sl.IsSelected = false;
        step.UpdatedAt = DateTime.UtcNow;
        step.Routine.IsCustomized = true;
        step.Routine.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Phase 2: select the target slot
        targetSlot.IsSelected = true;
        await db.SaveChangesAsync(ct);
        cache.Remove($"v2_steps_{id}_{userId}");

        return Results.Ok(new { stepId, selectedSlotId = targetSlot.Id, tier = targetSlot.Tier });
    }

    // ── POST /routines/{routineId}/restore/{version} ──────────────────────
    private static async Task<IResult> RestoreVersionHandler(
        Guid routineId, int version, ClaimsPrincipal user,
        AppDbContext db, IMemoryCache cache,
        RoutineGeneratorService routineGen, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var routine = await db.Routines
            .Include(r => r.SkinProfile)
            .FirstOrDefaultAsync(r => r.Id == routineId && r.UserId == userId, ct);
        if (routine is null) return Results.NotFound(new { error = "Rotina não encontrada." });

        var versionRecord = await db.RoutineVersions
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.RoutineId == routineId && v.Version == version, ct);
        if (versionRecord is null) return Results.NotFound(new { error = "Versão não encontrada." });

        // Save current state before restoring
        var newVersion = routine.CurrentVersion + 1;
        await routineGen.SaveVersionSnapshotAsync(routine, newVersion, "manual_edit", ct,
            "user", $"restored from v{version}");

        // Apply snapshot: rebuild steps + slots from JSON
        await RestoreFromSnapshotAsync(routine, versionRecord.Snapshot, db, ct);
        routine.CurrentVersion = newVersion + 1;
        routine.IsCustomized = true;
        routine.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var analysisId = routine.SkinProfile.AnalysisId;
        if (analysisId.HasValue)
            cache.Remove($"v2_steps_{analysisId.Value}_{userId}");

        return Results.Ok(new { restoredTo = version, newVersion = routine.CurrentVersion });
    }

    // ── POST /analysis/{id}/steps/{stepId}/add-catalog-slot ──────────────────
    private static async Task<IResult> AddCatalogSlotHandler(
        Guid id, Guid stepId, AddCatalogSlotRequest request,
        ClaimsPrincipal user, AppDbContext db,
        IMemoryCache cache, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .Include(s => s.Slots)
            .FirstOrDefaultAsync(s => s.Id == stepId
                && s.Routine.UserId == userId
                && s.IsActive, ct);
        if (step is null) return Results.NotFound(new { error = "Passo não encontrado." });

        if (!request.ProductId.HasValue && string.IsNullOrWhiteSpace(request.ProductName))
            return Results.BadRequest(new { error = "ProductId ou ProductName obrigatório." });

        // Phase 1: deselect all
        foreach (var sl in step.Slots) sl.IsSelected = false;
        await db.SaveChangesAsync(ct);

        // Phase 2: find existing slot or reuse user_custom slot (never duplicate a tier)
        if (request.ProductId.HasValue)
        {
            // Catalog product
            var existingSlot = step.Slots.FirstOrDefault(sl => sl.ProductId == request.ProductId);
            if (existingSlot is not null)
            {
                existingSlot.IsSelected = true;
            }
            else
            {
                // Reuse existing user_custom slot if present (avoids duplicate tiers)
                var reuseSlot = step.Slots.FirstOrDefault(sl => sl.Tier == "user_custom");
                if (reuseSlot is not null)
                {
                    reuseSlot.ProductId = request.ProductId.Value;
                    reuseSlot.UserProductId = null;
                    reuseSlot.IsSelected = true;
                    reuseSlot.RecommendationReason = "Adicionado manualmente";
                }
                else
                {
                    db.StepProductSlots.Add(new StepProductSlot
                    {
                        StepId = step.Id,
                        Tier = "user_custom",        // Never "primary" — avoids tier collision
                        ProductId = request.ProductId.Value,
                        UserProductId = null,
                        IsSelected = true,
                        RecommendationReason = "Adicionado manualmente",
                    });
                }
            }
        }
        else
        {
            // Custom product: upsert UserProduct
            var userProduct = await db.UserProducts.FirstOrDefaultAsync(
                p => p.UserId == userId && p.CustomName == request.ProductName, ct);
            if (userProduct is null)
            {
                userProduct = new UserProduct
                {
                    UserId = userId,
                    CustomName = request.ProductName!,
                    CustomImageUrl = request.ImageUrl,
                    StepTypeKey = step.StepTypeKey,
                };
                db.UserProducts.Add(userProduct);
                await db.SaveChangesAsync(ct);
            }

            var existingUserSlot = step.Slots.FirstOrDefault(sl => sl.UserProductId == userProduct.Id);
            if (existingUserSlot is not null)
            {
                existingUserSlot.IsSelected = true;
            }
            else
            {
                var reuseSlot = step.Slots.FirstOrDefault(sl => sl.Tier == "user_custom");
                if (reuseSlot is not null)
                {
                    reuseSlot.ProductId = null;
                    reuseSlot.UserProductId = userProduct.Id;
                    reuseSlot.IsSelected = true;
                    reuseSlot.RecommendationReason = request.ProductName;
                }
                else
                {
                    db.StepProductSlots.Add(new StepProductSlot
                    {
                        StepId = step.Id,
                        Tier = "user_custom",
                        ProductId = null,
                        UserProductId = userProduct.Id,
                        IsSelected = true,
                        RecommendationReason = request.ProductName,
                    });
                }
            }
        }

        step.Routine.IsCustomized = true;
        step.Routine.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        cache.Remove($"v2_steps_{id}_{userId}");
        return Results.Ok(new { message = "Produto adicionado ao passo." });
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    private static async Task RestoreFromSnapshotAsync(
        UserRoutine routine, string snapshotJson, AppDbContext db, CancellationToken ct)
    {
        // Soft-delete current steps
        await db.RoutineSteps
            .Where(s => s.RoutineId == routine.Id && s.IsActive)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsActive, false), ct);

        using var doc = System.Text.Json.JsonDocument.Parse(snapshotJson);
        var stepsEl = doc.RootElement.GetProperty("steps");

        foreach (var stepEl in stepsEl.EnumerateArray())
        {
            var newStep = new UserRoutineStep
            {
                RoutineId = routine.Id,
                StepTypeKey = stepEl.GetProperty("stepType").GetString() ?? "cleanser",
                StepOrder = stepEl.GetProperty("order").GetInt32(),
                Recurrence = stepEl.GetProperty("recurrence").GetString() ?? "daily",
            };
            db.RoutineSteps.Add(newStep);
            await db.SaveChangesAsync(ct);

            foreach (var slotEl in stepEl.GetProperty("slots").EnumerateArray())
            {
                var tier = slotEl.GetProperty("tier").GetString() ?? "primary";
                var isSelected = slotEl.GetProperty("isSelected").GetBoolean();
                Guid? productId = slotEl.TryGetProperty("productId", out var pidEl)
                    && pidEl.ValueKind != System.Text.Json.JsonValueKind.Null
                    ? pidEl.GetGuid() : null;

                db.StepProductSlots.Add(new StepProductSlot
                {
                    StepId = newStep.Id,
                    Tier = tier,
                    ProductId = productId,
                    IsSelected = isSelected,
                });
            }
            await db.SaveChangesAsync(ct);
        }
    }

    private static int[] ParseScheduleDays(string json)
    {
        try
        {
            var names = System.Text.Json.JsonSerializer.Deserialize<string[]>(json) ?? [];
            return names.Select(d => d.ToLowerInvariant() switch
            {
                "sun" or "dom" => 0,
                "mon" or "seg" => 1,
                "tue" or "ter" => 2,
                "wed" or "qua" => 3,
                "thu" or "qui" => 4,
                "fri" or "sex" => 5,
                "sat" or "sab" => 6,
                _ => -1,
            }).Where(d => d >= 0).ToArray();
        }
        catch { return [0, 1, 2, 3, 4, 5, 6]; }
    }

    private static string StepDisplayName(string key) => StepDisplayNames.Get(key);

    private static string[] MapDaysToNames(int[] days) => days.Select(d => d switch
    {
        0 => "sun", 1 => "mon", 2 => "tue", 3 => "wed",
        4 => "thu", 5 => "fri", 6 => "sat", _ => "mon"
    }).ToArray();
}

// Request DTOs
public record SelectSlotRequest(Guid? SlotId = null, string? Tier = null);

// Step type key → display name in Portuguese (and reverse)
internal static class StepDisplayNames
{
    private static readonly Dictionary<string, string> _keyToName = new()
    {
        ["cleanser"]      = "Limpeza",
        ["toner"]         = "Tônico",
        ["serum"]         = "Sérum",
        ["acid"]          = "Ácido",
        ["retinoid"]      = "Retinol/Retinoide",
        ["eye_cream"]     = "Creme para Olhos",
        ["moisturizer"]   = "Hidratante",
        ["oil"]           = "Óleo Facial",
        ["sunscreen"]     = "Protetor Solar",
        ["spot_treatment"]= "Tratamento Pontual",
    };

    // Label variations → canonical key (case-insensitive)
    private static readonly Dictionary<string, string> _labelToKey = new(StringComparer.OrdinalIgnoreCase)
    {
        ["limpeza"]            = "cleanser",
        ["tônico"]             = "toner",
        ["tonico"]             = "toner",
        ["sérum"]              = "serum",
        ["serum"]              = "serum",
        ["ácido"]              = "acid",
        ["acido"]              = "acid",
        ["esfoliante"]         = "acid",
        ["retinol/retinoide"]  = "retinoid",
        ["retinol"]            = "retinoid",
        ["retinoide"]          = "retinoid",
        ["creme para olhos"]   = "eye_cream",
        ["contorno dos olhos"] = "eye_cream",
        ["hidratante"]         = "moisturizer",
        ["óleo facial"]        = "oil",
        ["oleo facial"]        = "oil",
        ["protetor solar"]     = "sunscreen",
        ["fps"]                = "sunscreen",
        ["tratamento pontual"] = "spot_treatment",
        ["máscara"]            = "spot_treatment",
        ["mascara"]            = "spot_treatment",
        // already-valid keys pass through
        ["cleanser"]      = "cleanser",
        ["toner"]         = "toner",
        ["serum"]         = "serum",
        ["acid"]          = "acid",
        ["retinoid"]      = "retinoid",
        ["eye_cream"]     = "eye_cream",
        ["moisturizer"]   = "moisturizer",
        ["oil"]           = "oil",
        ["sunscreen"]     = "sunscreen",
        ["spot_treatment"]= "spot_treatment",
    };

    public static string Get(string key) =>
        _keyToName.TryGetValue(key, out var name) ? name : key;

    public static string ResolveKey(string? label) =>
        !string.IsNullOrWhiteSpace(label) && _labelToKey.TryGetValue(label.Trim(), out var key)
            ? key
            : "spot_treatment";
}
