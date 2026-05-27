using System.Security.Claims;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;
using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/admin")
            .WithTags("Admin")
            .WithOpenApi();

        group.MapGet("/me", CheckAdminStatusHandler)
            .WithName("CheckAdminStatus")
            .WithDescription("Check if current user is an admin")
            .RequireAuthorization();

        group.MapPost("/setup-first-admin/{targetUserId:guid}", SetupFirstAdminHandler)
            .WithName("SetupFirstAdmin")
            .WithDescription("Promote first user to admin (only works if no admin exists)");

        group.MapPost("/promote/{targetUserId:guid}", PromoteUserToAdminHandler)
            .WithName("PromoteUserToAdmin")
            .WithDescription("Promote a user to admin status (requires admin authorization)")
            .RequireAuthorization();

        group.MapGet("/users", GetAdminUsersHandler)
            .WithName("GetAdminUsers")
            .WithDescription("List all users with billing and credits info")
            .RequireAuthorization();

        group.MapPost("/users/{targetUserId:guid}/credits", AddUserCreditsHandler)
            .WithName("AddUserCredits")
            .WithDescription("Add credits to a user")
            .RequireAuthorization();

        group.MapPost("/users/{targetUserId:guid}/premium", ActivateUserPremiumHandler)
            .WithName("ActivateUserPremium")
            .WithDescription("Manually activate a premium plan for a user")
            .RequireAuthorization();

        group.MapDelete("/users/{targetUserId:guid}/premium", RevokeUserPremiumHandler)
            .WithName("RevokeUserPremium")
            .RequireAuthorization();

        group.MapGet("/users/{targetUserId:guid}/routine", GetUserRoutineHandler)
            .WithName("GetAdminUserRoutine")
            .WithDescription("Get a user's active routine with steps and products")
            .RequireAuthorization();

        group.MapPatch("/users/{targetUserId:guid}/steps/{stepId:guid}/toggle", ToggleRoutineStepHandler)
            .WithName("ToggleAdminRoutineStep")
            .WithDescription("Toggle a routine step active/inactive")
            .RequireAuthorization();

        group.MapPost("/users/{targetUserId:guid}/routine/regenerate", RegenerateUserRoutineHandler)
            .WithName("RegenerateAdminUserRoutine")
            .WithDescription("Regenerate the routine for a user based on their latest analysis")
            .RequireAuthorization();

        group.MapGet("/users/{targetUserId:guid}/skin-profile", GetUserSkinProfileHandler)
            .WithName("GetAdminUserSkinProfile").RequireAuthorization();

        group.MapGet("/users/{targetUserId:guid}/products", GetUserProductsHandler)
            .WithName("GetAdminUserProducts")
            .WithDescription("Get a user's custom products")
            .RequireAuthorization();

        group.MapPatch("/users/{targetUserId:guid}/steps/{stepId:guid}", UpdateRoutineStepHandler)
            .WithName("UpdateAdminRoutineStep").RequireAuthorization();

        group.MapPatch("/users/{targetUserId:guid}/steps/{stepId:guid}/order", ReorderRoutineStepHandler)
            .WithName("ReorderAdminRoutineStep").RequireAuthorization();

        group.MapPatch("/users/{targetUserId:guid}/steps/{stepId:guid}/period", MoveStepPeriodHandler)
            .WithName("MoveAdminRoutineStepPeriod").RequireAuthorization();

        group.MapPatch("/users/{targetUserId:guid}/steps/{stepId:guid}/product", AssignStepProductHandler)
            .WithName("AssignAdminStepProduct").RequireAuthorization();

        group.MapPost("/users/{targetUserId:guid}/steps", AddRoutineStepHandler)
            .WithName("AddAdminRoutineStep").RequireAuthorization();

        group.MapDelete("/users/{targetUserId:guid}/steps/{stepId:guid}", DeleteRoutineStepHandler)
            .WithName("DeleteAdminRoutineStep").RequireAuthorization();
    }

    private static async Task<IResult> CheckAdminStatusHandler(
        ClaimsPrincipal user,
        AdminService adminService,
        ILogger<AdminService> logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var userId = AdminService.ExtractUserIdFromClaims(user);
            if (userId == null) return Results.Unauthorized();

            var isAdmin = await adminService.IsUserAdminAsync(userId.Value, cancellationToken);
            return Results.Ok(new { isAdmin });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error checking admin status");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> SetupFirstAdminHandler(
        Guid targetUserId,
        HttpContext httpContext,
        AdminService adminService,
        IConfiguration configuration,
        ILogger<AdminService> logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var bootstrapToken = configuration["Admin:BootstrapToken"]?.Trim();
            if (string.IsNullOrEmpty(bootstrapToken))
            {
                logger.LogWarning("[AdminEndpoints] setup-first-admin called but Admin:BootstrapToken is not configured");
                return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            }

            var providedToken = httpContext.Request.Headers["X-Bootstrap-Token"].ToString();
            if (providedToken != bootstrapToken)
            {
                logger.LogWarning("[AdminEndpoints] setup-first-admin called with invalid bootstrap token");
                return Results.Unauthorized();
            }

            if (targetUserId == Guid.Empty) return Results.BadRequest(new { error = "Invalid user ID" });

            var (success, message) = await adminService.SetupFirstAdminAsync(targetUserId, cancellationToken);
            if (!success) return Results.BadRequest(new { error = message });

            return Results.Ok(new { message, isAdmin = true });
        }
        catch (OperationCanceledException)
        {
            return Results.StatusCode(408);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error setting up first admin");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> PromoteUserToAdminHandler(
        Guid targetUserId,
        ClaimsPrincipal user,
        AdminService adminService,
        ILogger<AdminService> logger,
        CancellationToken cancellationToken)
    {
        try
        {
            if (targetUserId == Guid.Empty) return Results.BadRequest(new { error = "Invalid user ID" });

            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId == null) return Results.Unauthorized();

            var (success, message) = await adminService.PromoteUserToAdminAsync(requesterId.Value, targetUserId, cancellationToken);
            if (!success) return Results.Forbid();

            return Results.Ok(new { message, isAdmin = true });
        }
        catch (OperationCanceledException)
        {
            return Results.StatusCode(408);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error promoting user");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> GetAdminUsersHandler(
        ClaimsPrincipal user,
        AppDbContext dbContext,
        AdminService adminService,
        ILogger<AdminService> logger,
        int page = 1,
        int pageSize = 20,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId is null) return Results.Unauthorized();
            if (!await adminService.IsUserAdminAsync(requesterId.Value, cancellationToken)) return Results.Forbid();

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);
            var offset = (page - 1) * pageSize;
            var searchParam = string.IsNullOrWhiteSpace(search) ? null : search.Trim();

            const string countSql = """
                SELECT COUNT(*)::int FROM users u
                WHERE (@Search IS NULL OR u.email ILIKE '%' || @Search || '%')
                """;

            const string querySql = """
                SELECT
                    u.id         AS Id,
                    u.email      AS Email,
                    u.created_at AS CreatedAt,
                    u.is_admin   AS IsAdmin,
                    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '') AS DisplayName,
                    s.plan_key   AS PlanKey,
                    s.status     AS SubscriptionStatus,
                    s.expires_at_utc AS ExpiresAtUtc,
                    COALESCE(uc.credits_remaining, 0) AS CreditsRemaining,
                    sp.skin_type AS SkinType,
                    sa.last_analysis_at AS LastAnalysisAt
                FROM users u
                LEFT JOIN auth.users au ON au.id = u.id
                LEFT JOIN LATERAL (
                    SELECT plan_key, status, expires_at_utc
                    FROM subscriptions
                    WHERE user_id = u.id
                    ORDER BY created_at_utc DESC
                    LIMIT 1
                ) s ON true
                LEFT JOIN user_credits uc ON uc.user_id = u.id
                LEFT JOIN LATERAL (
                    SELECT skin_type
                    FROM skin_profiles
                    WHERE user_id = u.id AND is_current = true
                    LIMIT 1
                ) sp ON true
                LEFT JOIN LATERAL (
                    SELECT created_at AS last_analysis_at
                    FROM skin_analyses
                    WHERE user_id = u.id AND status = 'completed'
                    ORDER BY created_at DESC
                    LIMIT 1
                ) sa ON true
                WHERE (@Search IS NULL OR u.email ILIKE '%' || @Search || '%'
                    OR au.raw_user_meta_data->>'full_name' ILIKE '%' || @Search || '%')
                ORDER BY u.created_at DESC
                LIMIT @PageSize OFFSET @Offset
                """;

            var connection = dbContext.Database.GetDbConnection();
            await dbContext.Database.OpenConnectionAsync(cancellationToken);

            var total = await connection.ExecuteScalarAsync<int>(
                new CommandDefinition(countSql, new { Search = searchParam }, cancellationToken: cancellationToken));

            var items = await connection.QueryAsync<AdminUserRow>(
                new CommandDefinition(querySql, new { Search = searchParam, PageSize = pageSize, Offset = offset }, cancellationToken: cancellationToken));

            return Results.Ok(new { items, total, page, pageSize });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error listing users");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> AddUserCreditsHandler(
        Guid targetUserId,
        AddCreditsRequest body,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        AdminService adminService,
        IMemoryCache cache,
        ILogger<AdminService> logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId is null) return Results.Unauthorized();
            if (!await adminService.IsUserAdminAsync(requesterId.Value, cancellationToken)) return Results.Forbid();

            if (body.Amount is <= 0 or > 500)
                return Results.BadRequest(new { error = "Amount must be between 1 and 500" });

            var credit = await dbContext.UserCredits.FirstOrDefaultAsync(x => x.UserId == targetUserId, cancellationToken);
            if (credit is null)
            {
                dbContext.UserCredits.Add(new UserCredit
                {
                    UserId = targetUserId,
                    CreditsRemaining = body.Amount,
                    UpdatedAt = DateTime.UtcNow,
                });
            }
            else
            {
                credit.CreditsRemaining += body.Amount;
                credit.UpdatedAt = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            cache.Remove($"user_credits_{targetUserId}");

            logger.LogInformation("[AdminEndpoints] Admin {Admin} added {Amount} credits to user {User}", requesterId, body.Amount, targetUserId);
            return Results.Ok(new { creditsAdded = body.Amount });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error adding credits");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> ActivateUserPremiumHandler(
        Guid targetUserId,
        ActivatePremiumRequest body,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        AdminService adminService,
        ILogger<AdminService> logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId is null) return Results.Unauthorized();
            if (!await adminService.IsUserAdminAsync(requesterId.Value, cancellationToken)) return Results.Forbid();

            if (string.IsNullOrWhiteSpace(body.PlanKey))
                return Results.BadRequest(new { error = "PlanKey is required" });
            if (body.Days is <= 0 or > 3650)
                return Results.BadRequest(new { error = "Days must be between 1 and 3650" });

            var now = DateTime.UtcNow;
            var subscription = new Subscription
            {
                UserId = targetUserId,
                Provider = "admin",
                Gateway = "admin",
                PlanKey = body.PlanKey.Trim().ToLowerInvariant(),
                PlanName = $"Admin — {body.PlanKey.Trim()}",
                Status = "active",
                ExternalReference = $"admin_{targetUserId}_{now.Ticks}",
                AmountCents = 0,
                Currency = "BRL",
                ActivatedAtUtc = now,
                ExpiresAtUtc = now.AddDays(body.Days),
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
            };

            dbContext.Subscriptions.Add(subscription);
            await dbContext.SaveChangesAsync(cancellationToken);

            logger.LogInformation("[AdminEndpoints] Admin {Admin} activated plan {Plan} for {Days}d for user {User}", requesterId, body.PlanKey, body.Days, targetUserId);
            return Results.Ok(new { planKey = subscription.PlanKey, expiresAtUtc = subscription.ExpiresAtUtc });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error activating premium");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> RevokeUserPremiumHandler(
        Guid targetUserId,
        ClaimsPrincipal user,
        AppDbContext dbContext,
        AdminService adminService,
        ILogger<AdminService> logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId is null) return Results.Unauthorized();
            if (!await adminService.IsUserAdminAsync(requesterId.Value, cancellationToken)) return Results.Forbid();

            var active = await dbContext.Subscriptions
                .Where(s => s.UserId == targetUserId && s.Status == "active")
                .ToListAsync(cancellationToken);

            foreach (var sub in active)
            {
                sub.Status = "revoked";
                sub.UpdatedAtUtc = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            logger.LogInformation("[AdminEndpoints] Admin {Admin} revoked premium for user {User} ({Count} subs)", requesterId, targetUserId, active.Count);
            return Results.Ok(new { revoked = active.Count });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error revoking premium");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> GetUserRoutineHandler(
        Guid targetUserId,
        ClaimsPrincipal user,
        AppDbContext db,
        AdminService adminService,
        ILogger<AdminService> logger,
        CancellationToken ct)
    {
        try
        {
            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId is null) return Results.Unauthorized();
            if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

            var routines = await db.Routines
                .AsNoTracking()
                .Where(r => r.UserId == targetUserId && r.IsActive)
                .Include(r => r.Steps.OrderBy(s => s.StepOrder))
                    .ThenInclude(s => s.Slots)
                        .ThenInclude(sl => sl.Product)
                            .ThenInclude(p => p!.Images)
                .Include(r => r.Steps)
                    .ThenInclude(s => s.Slots)
                        .ThenInclude(sl => sl.UserProduct)
                .ToListAsync(ct);

            // latest analysis id for regeneration
            var latestAnalysisId = await db.SkinAnalyses
                .AsNoTracking()
                .Where(a => a.UserId == targetUserId && a.Status == "completed")
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => (Guid?)a.Id)
                .FirstOrDefaultAsync(ct);

            var result = new Dictionary<string, object?>();
            foreach (var r in routines)
            {
                var steps = r.Steps.Select(s =>
                {
                    var selected = s.Slots.FirstOrDefault(sl => sl.IsSelected) ?? s.Slots.FirstOrDefault();
                    string? productName = null, productBrand = null, productImage = null, slotTier = null;
                    if (selected is not null)
                    {
                        slotTier = selected.Tier;
                        if (selected.Product is not null)
                        {
                            productName = selected.Product.Name;
                            productBrand = selected.Product.Brand;
                            productImage = selected.Product.Images.OrderBy(i => i.Position).FirstOrDefault()?.PublicUrl;
                        }
                        else if (selected.UserProduct is not null)
                        {
                            productName = selected.UserProduct.CustomName;
                            productBrand = selected.UserProduct.CustomBrand;
                            productImage = selected.UserProduct.CustomImageUrl;
                        }
                    }
                    return new
                    {
                        stepId = s.Id,
                        stepTypeKey = s.StepTypeKey,
                        stepOrder = s.StepOrder,
                        isActive = s.IsActive,
                        isSkipped = s.IsSkipped,
                        recurrence = s.Recurrence,
                        productName,
                        productBrand,
                        productImage,
                        slotTier,
                    };
                });

                result[r.Period] = new { routineId = r.Id, steps };
            }

            return Results.Ok(new { latestAnalysisId, routine = result });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error fetching routine for user {User}", targetUserId);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> ToggleRoutineStepHandler(
        Guid targetUserId,
        Guid stepId,
        ClaimsPrincipal user,
        AppDbContext db,
        AdminService adminService,
        ILogger<AdminService> logger,
        CancellationToken ct)
    {
        try
        {
            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId is null) return Results.Unauthorized();
            if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

            var step = await db.RoutineSteps
                .Include(s => s.Routine)
                .FirstOrDefaultAsync(s => s.Id == stepId && s.Routine.UserId == targetUserId, ct);

            if (step is null) return Results.NotFound();

            step.IsActive = !step.IsActive;
            step.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            logger.LogInformation("[AdminEndpoints] Admin {Admin} toggled step {Step} → isActive={Active}", requesterId, stepId, step.IsActive);
            return Results.Ok(new { stepId, isActive = step.IsActive });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error toggling step {Step}", stepId);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> RegenerateUserRoutineHandler(
        Guid targetUserId,
        ClaimsPrincipal user,
        AppDbContext db,
        AdminService adminService,
        IServiceScopeFactory scopeFactory,
        ILogger<AdminService> logger,
        CancellationToken ct)
    {
        try
        {
            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId is null) return Results.Unauthorized();
            if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

            var latestAnalysis = await db.SkinAnalyses
                .AsNoTracking()
                .Where(a => a.UserId == targetUserId && a.Status == "completed")
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (latestAnalysis is null)
                return Results.BadRequest(new { error = "Usuário não possui análise concluída" });

            _ = Task.Run(async () =>
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var svc = scope.ServiceProvider.GetRequiredService<IAnalysisService>();
                try
                {
                    await svc.BuildRoutineAsync(latestAnalysis.Id, CancellationToken.None);
                    logger.LogInformation("[AdminEndpoints] Routine regenerated for user {User}", targetUserId);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "[AdminEndpoints] Failed to regenerate routine for user {User}", targetUserId);
                }
            });

            return Results.Accepted(value: new { analysisId = latestAnalysis.Id, message = "Rotina sendo regenerada" });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error regenerating routine for user {User}", targetUserId);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> UpdateRoutineStepHandler(
        Guid targetUserId, Guid stepId,
        UpdateStepRequest body,
        ClaimsPrincipal user, AppDbContext db,
        AdminService adminService, ILogger<AdminService> logger, CancellationToken ct)
    {
        var requesterId = AdminService.ExtractUserIdFromClaims(user);
        if (requesterId is null) return Results.Unauthorized();
        if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .FirstOrDefaultAsync(s => s.Id == stepId && s.Routine.UserId == targetUserId, ct);

        if (step is null) return Results.NotFound();

        if (!string.IsNullOrWhiteSpace(body.StepTypeKey)) step.StepTypeKey = body.StepTypeKey;
        if (!string.IsNullOrWhiteSpace(body.Recurrence)) step.Recurrence = body.Recurrence;
        step.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Results.Ok(new { stepId, step.StepTypeKey, step.Recurrence });
    }

    private static async Task<IResult> ReorderRoutineStepHandler(
        Guid targetUserId, Guid stepId,
        ReorderStepRequest body,
        ClaimsPrincipal user, AppDbContext db,
        AdminService adminService, ILogger<AdminService> logger, CancellationToken ct)
    {
        var requesterId = AdminService.ExtractUserIdFromClaims(user);
        if (requesterId is null) return Results.Unauthorized();
        if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .FirstOrDefaultAsync(s => s.Id == stepId && s.Routine.UserId == targetUserId, ct);

        if (step is null) return Results.NotFound();

        var siblings = await db.RoutineSteps
            .Where(s => s.RoutineId == step.RoutineId)
            .OrderBy(s => s.StepOrder)
            .ToListAsync(ct);

        var idx = siblings.FindIndex(s => s.Id == stepId);
        var swapIdx = body.Direction == "up" ? idx - 1 : idx + 1;

        if (swapIdx < 0 || swapIdx >= siblings.Count)
            return Results.BadRequest(new { error = "Já está no limite" });

        (siblings[idx].StepOrder, siblings[swapIdx].StepOrder) = (siblings[swapIdx].StepOrder, siblings[idx].StepOrder);
        siblings[idx].UpdatedAt = siblings[swapIdx].UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Results.Ok(new { stepId, newOrder = step.StepOrder });
    }

    private static async Task<IResult> MoveStepPeriodHandler(
        Guid targetUserId, Guid stepId,
        ClaimsPrincipal user, AppDbContext db,
        AdminService adminService, ILogger<AdminService> logger, CancellationToken ct)
    {
        var requesterId = AdminService.ExtractUserIdFromClaims(user);
        if (requesterId is null) return Results.Unauthorized();
        if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .FirstOrDefaultAsync(s => s.Id == stepId && s.Routine.UserId == targetUserId, ct);

        if (step is null) return Results.NotFound();

        var targetPeriod = step.Routine.Period == "morning" ? "night" : "morning";

        var targetRoutine = await db.Routines
            .FirstOrDefaultAsync(r => r.UserId == targetUserId && r.Period == targetPeriod && r.IsActive, ct);

        if (targetRoutine is null)
            return Results.BadRequest(new { error = $"Usuário não possui rotina de {targetPeriod}" });

        var maxOrder = await db.RoutineSteps
            .Where(s => s.RoutineId == targetRoutine.Id)
            .MaxAsync(s => (int?)s.StepOrder, ct) ?? 0;

        step.RoutineId = targetRoutine.Id;
        step.StepOrder = maxOrder + 1;
        step.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Results.Ok(new { stepId, newPeriod = targetPeriod });
    }

    private static async Task<IResult> AssignStepProductHandler(
        Guid targetUserId, Guid stepId,
        AssignProductRequest body,
        ClaimsPrincipal user, AppDbContext db,
        AdminService adminService, ILogger<AdminService> logger, CancellationToken ct)
    {
        var requesterId = AdminService.ExtractUserIdFromClaims(user);
        if (requesterId is null) return Results.Unauthorized();
        if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .Include(s => s.Slots)
            .FirstOrDefaultAsync(s => s.Id == stepId && s.Routine.UserId == targetUserId, ct);

        if (step is null) return Results.NotFound();

        db.StepProductSlots.RemoveRange(step.Slots);

        string? productName = null, productBrand = null, productImage = null;

        if (body.ProductId.HasValue)
        {
            db.StepProductSlots.Add(new StepProductSlot
            {
                StepId = step.Id,
                Tier = "primary",
                ProductId = body.ProductId,
                IsSelected = true,
            });

            var product = await db.Products.AsNoTracking()
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == body.ProductId.Value, ct);

            if (product is not null)
            {
                productName = product.Name;
                productBrand = product.Brand;
                productImage = product.Images.OrderBy(i => i.Position).FirstOrDefault()?.PublicUrl;
            }
        }

        step.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new { stepId, productId = body.ProductId, productName, productBrand, productImage });
    }

    private static async Task<IResult> AddRoutineStepHandler(
        Guid targetUserId,
        AddStepRequest body,
        ClaimsPrincipal user, AppDbContext db,
        AdminService adminService, ILogger<AdminService> logger, CancellationToken ct)
    {
        var requesterId = AdminService.ExtractUserIdFromClaims(user);
        if (requesterId is null) return Results.Unauthorized();
        if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

        if (string.IsNullOrWhiteSpace(body.StepTypeKey))
            return Results.BadRequest(new { error = "stepTypeKey é obrigatório" });
        if (body.Period is not "morning" and not "night")
            return Results.BadRequest(new { error = "period deve ser 'morning' ou 'night'" });

        var routine = await db.Routines
            .FirstOrDefaultAsync(r => r.UserId == targetUserId && r.Period == body.Period && r.IsActive, ct);

        if (routine is null)
            return Results.BadRequest(new { error = $"Usuário não possui rotina de {body.Period}" });

        var maxOrder = await db.RoutineSteps
            .Where(s => s.RoutineId == routine.Id)
            .MaxAsync(s => (int?)s.StepOrder, ct) ?? 0;

        var step = new UserRoutineStep
        {
            RoutineId = routine.Id,
            StepTypeKey = body.StepTypeKey.Trim(),
            StepOrder = maxOrder + 1,
            IsActive = true,
            IsUserAdded = true,
            Recurrence = "daily",
        };

        db.RoutineSteps.Add(step);
        await db.SaveChangesAsync(ct);

        string? productName = null, productBrand = null, productImage = null;

        if (body.ProductId.HasValue)
        {
            db.StepProductSlots.Add(new StepProductSlot
            {
                StepId = step.Id,
                Tier = "primary",
                ProductId = body.ProductId,
                IsSelected = true,
            });
            await db.SaveChangesAsync(ct);

            var product = await db.Products.AsNoTracking()
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == body.ProductId.Value, ct);

            if (product is not null)
            {
                productName = product.Name;
                productBrand = product.Brand;
                productImage = product.Images.OrderBy(i => i.Position).FirstOrDefault()?.PublicUrl;
            }
        }

        logger.LogInformation("[AdminEndpoints] Admin {Admin} added step {Type} to {Period} routine of user {User}", requesterId, step.StepTypeKey, body.Period, targetUserId);

        return Results.Ok(new
        {
            stepId = step.Id,
            stepTypeKey = step.StepTypeKey,
            stepOrder = step.StepOrder,
            isActive = step.IsActive,
            isSkipped = step.IsSkipped,
            recurrence = step.Recurrence,
            productName,
            productBrand,
            productImage,
            routineId = routine.Id,
        });
    }

    private static async Task<IResult> GetUserSkinProfileHandler(
        Guid targetUserId,
        ClaimsPrincipal user, AppDbContext db,
        AdminService adminService,
        ILogger<AdminService> logger, CancellationToken ct)
    {
        var requesterId = AdminService.ExtractUserIdFromClaims(user);
        if (requesterId is null) return Results.Unauthorized();
        if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

        var profile = await db.SkinProfiles
            .AsNoTracking()
            .Where(p => p.UserId == targetUserId && p.IsCurrent)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (profile is null) return Results.NotFound();

        var lastAnalysisAt = await db.SkinAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == targetUserId && a.Status == "completed")
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => (DateTime?)a.CreatedAt)
            .FirstOrDefaultAsync(ct);

        return Results.Ok(new
        {
            skinType = profile.SkinType,
            acneScore = profile.AcneScore,
            oilinessScore = profile.OilinessScore,
            darkSpotsScore = profile.DarkSpotsScore,
            hydrationScore = profile.HydrationScore,
            sensitivityScore = profile.SensitivityScore,
            agingScore = profile.AgingScore,
            rednessScore = profile.RednessScore,
            primaryConcerns = profile.PrimaryConcerns,
            hasActiveAcne = profile.HasActiveAcne,
            hasDarkCircles = profile.HasDarkCircles,
            hasEnlargedPores = profile.HasEnlargedPores,
            hasFineLines = profile.HasFineLines,
            usesMakeup = profile.UsesMakeup,
            budgetRange = profile.BudgetRange,
            updatedAt = profile.UpdatedAt,
            lastAnalysisAt,
        });
    }

    private static async Task<IResult> DeleteRoutineStepHandler(
        Guid targetUserId, Guid stepId,
        ClaimsPrincipal user, AppDbContext db,
        AdminService adminService, ILogger<AdminService> logger, CancellationToken ct)
    {
        var requesterId = AdminService.ExtractUserIdFromClaims(user);
        if (requesterId is null) return Results.Unauthorized();
        if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .FirstOrDefaultAsync(s => s.Id == stepId && s.Routine.UserId == targetUserId, ct);

        if (step is null) return Results.NotFound();

        db.RoutineSteps.Remove(step);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("[AdminEndpoints] Admin {Admin} deleted step {Step} from user {User}", requesterId, stepId, targetUserId);
        return Results.Ok(new { stepId, deleted = true });
    }

    private static async Task<IResult> GetUserProductsHandler(
        Guid targetUserId,
        ClaimsPrincipal user,
        AppDbContext db,
        AdminService adminService,
        ILogger<AdminService> logger,
        CancellationToken ct)
    {
        try
        {
            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId is null) return Results.Unauthorized();
            if (!await adminService.IsUserAdminAsync(requesterId.Value, ct)) return Results.Forbid();

            var products = await db.UserProducts
                .AsNoTracking()
                .Where(p => p.UserId == targetUserId)
                .Include(p => p.CatalogProduct)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    name = p.CatalogProduct != null ? p.CatalogProduct.Name : p.CustomName,
                    brand = p.CatalogProduct != null ? p.CatalogProduct.Brand : p.CustomBrand,
                    imageUrl = p.CatalogProduct != null
                        ? p.CatalogProduct.Images.OrderBy(i => i.Position).Select(i => i.PublicUrl).FirstOrDefault()
                        : p.CustomImageUrl,
                    stepTypeKey = p.CatalogProduct != null ? p.CatalogProduct.StepTypeKey : p.StepTypeKey,
                    isCatalog = p.CatalogProductId != null,
                    p.CreatedAt,
                })
                .ToListAsync(ct);

            return Results.Ok(products);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error fetching products for user {User}", targetUserId);
            return Results.StatusCode(500);
        }
    }
}

record AdminUserRow(
    Guid Id,
    string Email,
    DateTime CreatedAt,
    bool IsAdmin,
    string DisplayName,
    string? PlanKey,
    string? SubscriptionStatus,
    DateTime? ExpiresAtUtc,
    int CreditsRemaining,
    string? SkinType,
    DateTime? LastAnalysisAt);

record AddCreditsRequest(int Amount);
record ActivatePremiumRequest(string PlanKey, int Days);
record UpdateStepRequest(string? StepTypeKey, string? Recurrence);
record ReorderStepRequest(string Direction);
record AssignProductRequest(Guid? ProductId);
record AddStepRequest(string StepTypeKey, string Period, Guid? ProductId);
