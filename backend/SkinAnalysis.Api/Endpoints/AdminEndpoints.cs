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
            .WithDescription("Revoke all active subscriptions for a user")
            .RequireAuthorization();
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
                    s.plan_key   AS PlanKey,
                    s.status     AS SubscriptionStatus,
                    s.expires_at_utc AS ExpiresAtUtc,
                    COALESCE(uc.credits_remaining, 0) AS CreditsRemaining
                FROM users u
                LEFT JOIN LATERAL (
                    SELECT plan_key, status, expires_at_utc
                    FROM subscriptions
                    WHERE user_id = u.id
                    ORDER BY created_at_utc DESC
                    LIMIT 1
                ) s ON true
                LEFT JOIN user_credits uc ON uc.user_id = u.id
                WHERE (@Search IS NULL OR u.email ILIKE '%' || @Search || '%')
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
}

record AdminUserRow(
    Guid Id,
    string Email,
    DateTime CreatedAt,
    bool IsAdmin,
    string? PlanKey,
    string? SubscriptionStatus,
    DateTime? ExpiresAtUtc,
    int CreditsRemaining);

record AddCreditsRequest(int Amount);
record ActivatePremiumRequest(string PlanKey, int Days);
