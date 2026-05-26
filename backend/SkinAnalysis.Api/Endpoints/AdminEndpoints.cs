using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Endpoints;

/// <summary>
/// Admin Management Endpoints
/// 
/// Provides endpoints for:
/// 1. /admin/me - Check current user's admin status (via JWT claims)
/// 2. /admin/setup-first-admin/{userId} - Bootstrap first admin (no auth required)
/// 3. /admin/promote/{userId} - Promote additional admins (requires admin auth)
/// 4. Admin product management CRUD operations
/// 
/// All endpoints include proper validation, error handling, and logging.
/// </summary>
public static class AdminEndpoints
{
    /// <summary>
    /// Maps all admin-related endpoints.
    /// </summary>
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/admin")
            .WithTags("Admin")
            .WithOpenApi();

        // Public endpoint to check admin status (auth required but no DB query)
        group.MapGet("/me", CheckAdminStatusHandler)
            .WithName("CheckAdminStatus")
            .WithDescription("Check if current user is an admin")
            .RequireAuthorization();

        // Bootstrap endpoint (no auth required - only for initial setup)
        group.MapPost("/setup-first-admin/{targetUserId:guid}", SetupFirstAdminHandler)
            .WithName("SetupFirstAdmin")
            .WithDescription("Promote first user to admin (only works if no admin exists)");

        // Admin promotion endpoint (requires admin auth)
        group.MapPost("/promote/{targetUserId:guid}", PromoteUserToAdminHandler)
            .WithName("PromoteUserToAdmin")
            .WithDescription("Promote a user to admin status (requires admin authorization)")
            .RequireAuthorization();
    }

    /// <summary>
    /// GET /admin/me
    /// Check current user's admin status from database.
    /// 
    /// Returns: { "isAdmin": true|false }
    /// </summary>
    private static async Task<IResult> CheckAdminStatusHandler(ClaimsPrincipal user, AdminService adminService, ILogger<AdminService> logger, CancellationToken cancellationToken)
    {
        try
        {
            var userId = AdminService.ExtractUserIdFromClaims(user);
            if (userId == null)
            {
                logger.LogWarning("[AdminEndpoints] Invalid user ID in JWT claims");
                return Results.Unauthorized();
            }

            // Check database for admin status
            var isAdmin = await adminService.IsUserAdminAsync(userId.Value, cancellationToken);

            logger.LogInformation("[AdminEndpoints] User {UserId} checked admin status: {IsAdmin}", userId, isAdmin);

            return Results.Ok(new { isAdmin });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error checking admin status");
            return Results.StatusCode(500);
        }
    }

    /// <summary>
    /// POST /admin/setup-first-admin/{targetUserId}
    /// Bootstrap endpoint to promote the first user to admin.
    /// No authentication required - only works if no admin exists yet.
    /// 
    /// Returns: { "message": "...", "isAdmin": true } or error
    /// </summary>
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

            // Validate input
            if (targetUserId == Guid.Empty)
            {
                logger.LogWarning("[AdminEndpoints] Invalid user ID provided to setup-first-admin");
                return Results.BadRequest(new { error = "Invalid user ID" });
            }

            var (success, message) = await adminService.SetupFirstAdminAsync(targetUserId, cancellationToken);

            if (!success)
            {
                return Results.BadRequest(new { error = message });
            }

            return Results.Ok(new { message, isAdmin = true });
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("[AdminEndpoints] Setup first admin request was cancelled");
            return Results.StatusCode(408);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error setting up first admin");
            return Results.StatusCode(500);
        }
    }

    /// <summary>
    /// POST /admin/promote/{targetUserId}
    /// Promote an additional user to admin status.
    /// Requires the requesting user to already be an admin.
    /// 
    /// Returns: { "message": "...", "isAdmin": true } or error
    /// </summary>
    private static async Task<IResult> PromoteUserToAdminHandler(
        Guid targetUserId,
        ClaimsPrincipal user,
        AdminService adminService,
        ILogger<AdminService> logger,
        CancellationToken cancellationToken)
    {
        try
        {
            // Validate input
            if (targetUserId == Guid.Empty)
            {
                logger.LogWarning("[AdminEndpoints] Invalid target user ID in promote request");
                return Results.BadRequest(new { error = "Invalid user ID" });
            }

            // Extract requester ID
            var requesterId = AdminService.ExtractUserIdFromClaims(user);
            if (requesterId == null)
            {
                logger.LogWarning("[AdminEndpoints] Invalid user ID in JWT claims for promotion request");
                return Results.Unauthorized();
            }

            // Promote user
            var (success, message) = await adminService.PromoteUserToAdminAsync(
                requesterId.Value,
                targetUserId,
                cancellationToken);

            if (!success)
            {
                return Results.Forbid();
            }

            return Results.Ok(new { message, isAdmin = true });
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("[AdminEndpoints] Promote user request was cancelled");
            return Results.StatusCode(408);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminEndpoints] Error promoting user");
            return Results.StatusCode(500);
        }
    }
}
