using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Services;

/// <summary>
/// Service for admin authorization and user promotion.
/// Centralizes business logic for admin features: authorization checks, user promotion, etc.
/// 
/// Product management (CRUD) endpoints are handled in Program.cs for now.
/// </summary>
public class AdminService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AdminService> _logger;
    
    // Simple in-memory cache for admin status (5 min TTL)
    private static readonly Dictionary<Guid, (bool isAdmin, DateTime expiresAt)> AdminStatusCache = new();
    private const int CacheTtlSeconds = 300; // 5 minutes

    public AdminService(AppDbContext dbContext, ILogger<AdminService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Checks if a user is an admin by querying the database.
    /// </summary>
    /// <param name="userId">The user ID to check</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if user is admin, false otherwise</returns>
    public async Task<bool> IsUserAdminAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Check cache first
        if (AdminStatusCache.TryGetValue(userId, out var cached))
        {
            if (DateTime.UtcNow < cached.expiresAt)
            {
                _logger.LogInformation("[AdminService] Cache hit for user {UserId}: {IsAdmin}", userId, cached.isAdmin);
                return cached.isAdmin;
            }
            else
            {
                // Expired entry, remove it
                AdminStatusCache.Remove(userId);
                _logger.LogInformation("[AdminService] Cache entry expired for user {UserId}, querying DB", userId);
            }
        }

        try
        {
            _logger.LogInformation("[AdminService] Starting admin check for user {UserId}", userId);
            var sw = System.Diagnostics.Stopwatch.StartNew();
            
            var isAdmin = await _dbContext.Users
                .Where(u => u.Id == userId && u.IsAdmin)
                .AnyAsync(cancellationToken);

            sw.Stop();
            _logger.LogInformation("[AdminService] Completed admin check for user {UserId}: {IsAdmin} in {ElapsedMs}ms", userId, isAdmin, sw.ElapsedMilliseconds);
            
            // Cache the result
            AdminStatusCache[userId] = (isAdmin, DateTime.UtcNow.AddSeconds(CacheTtlSeconds));
            
            return isAdmin;
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogError(ex, "[AdminService] Admin check cancelled/timed out for user {UserId}", userId);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AdminService] Error checking admin status for user {UserId}", userId);
            throw;
        }
    }

    /// <summary>
    /// Extracts user ID from JWT claims.
    /// Tries "sub" claim first (Supabase standard), then NameIdentifier.
    /// </summary>
    /// <param name="user">ClaimsPrincipal from request</param>
    /// <returns>User ID or null if not found</returns>
    public static Guid? ExtractUserIdFromClaims(ClaimsPrincipal user)
    {
        var userIdStr = user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdStr, out var userId) ? userId : null;
    }

    /// <summary>
    /// Checks if any admin exists in the system.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if at least one admin exists</returns>
    public async Task<bool> AdminExistsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var exists = await _dbContext.Users
                .Where(u => u.IsAdmin)
                .AnyAsync(cancellationToken);

            _logger.LogInformation("[AdminService] Admin exists check: {Exists}", exists);
            return exists;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AdminService] Error checking if admin exists");
            throw;
        }
    }

    /// <summary>
    /// Sets up the first admin (bootstrap operation).
    /// Only succeeds if no admin exists yet.
    /// </summary>
    /// <param name="targetUserId">User ID to promote to admin</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Success and user info, or error</returns>
    public async Task<(bool Success, string Message)> SetupFirstAdminAsync(Guid targetUserId, CancellationToken cancellationToken = default)
    {
        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Check if admin already exists
            if (await AdminExistsAsync(cancellationToken))
            {
                var msg = "Admin already exists. Use /admin/promote instead.";
                _logger.LogWarning("[AdminService] Attempt to setup first admin when one already exists");
                return (false, msg);
            }

            cancellationToken.ThrowIfCancellationRequested();

            // Find target user
            var targetUser = await _dbContext.Users.FindAsync(new object[] { targetUserId }, cancellationToken: cancellationToken);
            if (targetUser == null)
            {
                var msg = $"User {targetUserId} not found";
                _logger.LogWarning("[AdminService] {Message}", msg);
                return (false, msg);
            }

            // Promote to admin
            targetUser.IsAdmin = true;
            _dbContext.Users.Update(targetUser);
            await _dbContext.SaveChangesAsync(cancellationToken);

            var successMsg = $"User {targetUserId} promoted to admin";
            _logger.LogInformation("[AdminService] {Message}", successMsg);

            // Return success to frontend
            return (true, successMsg);
        }
        catch (OperationCanceledException)
        {
            var errMsg = "Setup first admin operation was cancelled";
            _logger.LogWarning("[AdminService] {Message}", errMsg);
            return (false, errMsg);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error setting up first admin: {ex.Message}";
            _logger.LogError(ex, "[AdminService] Error setting up first admin for user {UserId}", targetUserId);
            return (false, errMsg);
        }
    }

    /// <summary>
    /// Promotes a user to admin (requires caller to be admin).
    /// </summary>
    /// <param name="requesterId">ID of user making the request (must be admin)</param>
    /// <param name="targetUserId">ID of user to promote</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Success and message, or error</returns>
    public async Task<(bool Success, string Message)> PromoteUserToAdminAsync(Guid requesterId, Guid targetUserId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if requester is admin
            var requesterIsAdmin = await IsUserAdminAsync(requesterId, cancellationToken);
            if (!requesterIsAdmin)
            {
                var msg = "Only admins can promote users";
                _logger.LogWarning("[AdminService] Non-admin user {RequesterId} attempted to promote {TargetUserId}", requesterId, targetUserId);
                return (false, msg);
            }

            // Find target user
            var targetUser = await _dbContext.Users.FindAsync(new object[] { targetUserId }, cancellationToken: cancellationToken);
            if (targetUser == null)
            {
                var msg = $"User {targetUserId} not found";
                _logger.LogWarning("[AdminService] {Message}", msg);
                return (false, msg);
            }

            // Promote user
            targetUser.IsAdmin = true;
            _dbContext.Users.Update(targetUser);
            await _dbContext.SaveChangesAsync(cancellationToken);
            
            // Invalidate cache for this user
            AdminStatusCache.Remove(targetUserId);

            var successMsg = $"User {targetUserId} promoted to admin by {requesterId}";
            _logger.LogInformation("[AdminService] {Message}", successMsg);
            return (true, successMsg);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error promoting user: {ex.Message}";
            _logger.LogError(ex, "[AdminService] {Message}", errMsg);
            throw;
        }
    }
}
