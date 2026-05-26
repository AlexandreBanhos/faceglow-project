using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Helpers;
using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Endpoints;

public static class AffiliateEndpoints
{
    public static void MapAffiliateEndpoints(this WebApplication app)
    {
        // Público: valida código antes do cadastro
        app.MapGet("/affiliates/validate/{code}", ValidateCode).RequireRateLimiting("public");

        // Autenticado: grava referral no usuário após cadastro
        app.MapPost("/affiliates/attach", AttachReferral).RequireAuthorization();

        // Admin only
        app.MapGet   ("/admin/affiliates",            AdminGetAll).RequireAuthorization();
        app.MapPost  ("/admin/affiliates",            AdminCreate).RequireAuthorization();
        app.MapPut   ("/admin/affiliates/{id:guid}",  AdminUpdate).RequireAuthorization();
        app.MapGet   ("/admin/affiliates/{id:guid}/conversions", AdminGetConversions).RequireAuthorization();
        app.MapPost  ("/admin/affiliates/{id:guid}/payout",      AdminPayout).RequireAuthorization();
    }

    // ── Valida código (público) ───────────────────────────────────────────────

    private static async Task<IResult> ValidateCode(
        string code, AffiliateService svc, System.Threading.CancellationToken ct)
    {
        var aff = await svc.FindActiveAsync(code, ct);
        if (aff is null) return Results.NotFound(new { valid = false });
        return Results.Ok(new { valid = true, name = aff.Name, code = aff.Code });
    }

    // ── Grava referral no usuário (pós-cadastro) ──────────────────────────────

    private record AttachRequest(string Code);

    private static async Task<IResult> AttachReferral(
        AttachRequest req, ClaimsPrincipal user,
        AffiliateService svc, System.Threading.CancellationToken ct)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();
        await svc.AttachReferralToUserAsync(userId.Value, req.Code, ct);
        return Results.Ok();
    }

    // ── Admin: lista todos ────────────────────────────────────────────────────

    private static async Task<IResult> AdminGetAll(
        ClaimsPrincipal user, AffiliateService svc,
        AdminService admin, System.Threading.CancellationToken ct)
    {
        if (!await IsAdmin(user, admin, ct)) return Results.Forbid();
        var stats = await svc.GetAllStatsAsync(ct);
        return Results.Ok(stats.Select(s => new
        {
            id            = s.Affiliate.Id,
            code          = s.Affiliate.Code,
            name          = s.Affiliate.Name,
            email         = s.Affiliate.Email,
            commissionRate= s.Affiliate.CommissionRate,
            isActive      = s.Affiliate.IsActive,
            notes         = s.Affiliate.Notes,
            createdAt     = s.Affiliate.CreatedAt,
            totalConversions  = s.TotalConversions,
            totalSalesCents   = s.TotalSalesCents,
            totalCommCents    = s.TotalCommCents,
            pendingCommCents  = s.PendingCommCents,
        }));
    }

    // ── Admin: cria afiliado ──────────────────────────────────────────────────

    private record CreateRequest(string Name, string Code, decimal CommissionRate, string? Email, string? Notes);

    private static async Task<IResult> AdminCreate(
        CreateRequest req, ClaimsPrincipal user,
        AffiliateService svc, AdminService admin, System.Threading.CancellationToken ct)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue || !await IsAdmin(user, admin, ct)) return Results.Forbid();

        if (req.CommissionRate is < 0 or > 1)
            return Results.BadRequest(new { error = "commissionRate deve estar entre 0 e 1 (ex: 0.15 = 15%)" });

        try
        {
            var aff = await svc.CreateAsync(req.Name, req.Code, req.CommissionRate, req.Email, req.Notes, userId.Value, ct);
            return Results.Created($"/admin/affiliates/{aff.Id}", aff);
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { error = ex.Message });
        }
    }

    // ── Admin: atualiza afiliado ──────────────────────────────────────────────

    private record UpdateRequest(string? Name, decimal? CommissionRate, bool? IsActive, string? Notes);

    private static async Task<IResult> AdminUpdate(
        Guid id, UpdateRequest req, ClaimsPrincipal user,
        AffiliateService svc, AdminService admin, System.Threading.CancellationToken ct)
    {
        if (!await IsAdmin(user, admin, ct)) return Results.Forbid();
        var aff = await svc.UpdateAsync(id, req.Name, req.CommissionRate, req.IsActive, req.Notes, ct);
        return aff is null ? Results.NotFound() : Results.Ok(aff);
    }

    // ── Admin: conversões de um afiliado ──────────────────────────────────────

    private static async Task<IResult> AdminGetConversions(
        Guid id, ClaimsPrincipal user, AppDbContext db,
        AdminService admin, System.Threading.CancellationToken ct)
    {
        if (!await IsAdmin(user, admin, ct)) return Results.Forbid();

        var conversions = await db.AffiliateConversions
            .AsNoTracking()
            .Where(c => c.AffiliateId == id)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id, c.UserId, c.SubscriptionId, c.PlanKey,
                c.AmountCents, c.CommissionCents, c.Status, c.PaidAt, c.CreatedAt,
            })
            .ToListAsync(ct);

        return Results.Ok(conversions);
    }

    // ── Admin: registrar pagamento ────────────────────────────────────────────

    private record PayoutRequest(List<Guid> ConversionIds, string? Notes);

    private static async Task<IResult> AdminPayout(
        Guid id, PayoutRequest req, ClaimsPrincipal user,
        AffiliateService svc, AdminService admin, System.Threading.CancellationToken ct)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue || !await IsAdmin(user, admin, ct)) return Results.Forbid();

        var payout = await svc.PayoutAsync(id, req.ConversionIds, req.Notes, userId.Value, ct);
        return payout is null ? Results.BadRequest(new { error = "Nenhuma conversão pendente encontrada." }) : Results.Ok(payout);
    }

    private static async Task<bool> IsAdmin(ClaimsPrincipal user, AdminService admin, System.Threading.CancellationToken ct)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return false;
        return await admin.IsUserAdminAsync(userId.Value, ct);
    }
}
