using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Services;

public class AffiliateService(AppDbContext db, ILogger<AffiliateService> log)
{
    // ── Validação de código ───────────────────────────────────────────────────

    public async Task<Affiliate?> FindActiveAsync(string code, CancellationToken ct)
        => await db.Affiliates
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Code == code.ToLowerInvariant() && a.IsActive, ct);

    // ── Criação de afiliado (admin) ───────────────────────────────────────────

    public async Task<Affiliate> CreateAsync(
        string name, string code, decimal commissionRate, string? email, string? notes,
        Guid createdBy, CancellationToken ct)
    {
        if (await db.Affiliates.AnyAsync(a => a.Code == code.ToLowerInvariant(), ct))
            throw new InvalidOperationException($"Código '{code}' já existe.");

        var affiliate = new Affiliate
        {
            Name           = name,
            Code           = code.ToLowerInvariant(),
            CommissionRate = commissionRate,
            Email          = email,
            Notes          = notes,
            CreatedBy      = createdBy,
        };

        db.Affiliates.Add(affiliate);
        await db.SaveChangesAsync(ct);
        log.LogInformation("[Affiliate] Criado {Code} para {Name} ({Rate}%)", affiliate.Code, name, commissionRate * 100);
        return affiliate;
    }

    public async Task<Affiliate?> UpdateAsync(
        Guid id, string? name, decimal? rate, bool? isActive, string? notes, CancellationToken ct)
    {
        var affiliate = await db.Affiliates.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (affiliate is null) return null;

        if (name    is not null) affiliate.Name           = name;
        if (rate    is not null) affiliate.CommissionRate = rate.Value;
        if (isActive is not null) affiliate.IsActive      = isActive.Value;
        if (notes   is not null) affiliate.Notes          = notes;
        affiliate.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return affiliate;
    }

    // ── Atribuição na compra ──────────────────────────────────────────────────

    /// <summary>
    /// Chamado no webhook de pagamento confirmado.
    /// Verifica se o usuário veio via afiliado e registra a conversão.
    /// </summary>
    public async Task RecordConversionAsync(
        Guid subscriptionId, Guid userId, string planKey, int amountCents, CancellationToken ct)
    {
        // Busca o afiliado atribuído ao usuário (gravado no cadastro)
        var user = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user?.ReferredBy is null) return;

        var affiliate = await db.Affiliates.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == user.ReferredBy, ct);

        if (affiliate is null || !affiliate.IsActive) return;

        // Evita conversão duplicada para a mesma subscription
        if (await db.AffiliateConversions.AnyAsync(c => c.SubscriptionId == subscriptionId, ct)) return;

        var commissionCents = (int)(amountCents * affiliate.CommissionRate);

        db.AffiliateConversions.Add(new AffiliateConversion
        {
            AffiliateId     = affiliate.Id,
            UserId          = userId,
            SubscriptionId  = subscriptionId,
            PlanKey         = planKey,
            AmountCents     = amountCents,
            CommissionCents = commissionCents,
            Status          = "pending",
        });

        await db.SaveChangesAsync(ct);
        log.LogInformation("[Affiliate] Conversão {SubId}: R$ {Amount} → comissão R$ {Comm} para {Code}",
            subscriptionId, amountCents / 100m, commissionCents / 100m, affiliate.Code);
    }

    /// <summary>
    /// Chamado no cadastro: salva o afiliado no perfil do usuário.
    /// </summary>
    public async Task AttachReferralToUserAsync(Guid userId, string code, CancellationToken ct)
    {
        var affiliate = await FindActiveAsync(code, ct);
        if (affiliate is null) return;

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || user.ReferredBy is not null) return; // não sobrescreve

        user.ReferralCode = code;
        user.ReferredBy   = affiliate.Id;
        await db.SaveChangesAsync(ct);
        log.LogInformation("[Affiliate] Usuário {UserId} atribuído ao afiliado {Code}", userId, code);
    }

    // ── Relatórios ────────────────────────────────────────────────────────────

    public async Task<List<AffiliateStats>> GetAllStatsAsync(CancellationToken ct)
    {
        return await db.Affiliates
            .AsNoTracking()
            .Select(a => new AffiliateStats
            {
                Affiliate        = a,
                TotalConversions = db.AffiliateConversions.Count(c => c.AffiliateId == a.Id),
                TotalSalesCents  = db.AffiliateConversions.Where(c => c.AffiliateId == a.Id).Sum(c => (int?)c.AmountCents) ?? 0,
                TotalCommCents   = db.AffiliateConversions.Where(c => c.AffiliateId == a.Id).Sum(c => (int?)c.CommissionCents) ?? 0,
                PendingCommCents = db.AffiliateConversions.Where(c => c.AffiliateId == a.Id && c.Status == "pending").Sum(c => (int?)c.CommissionCents) ?? 0,
            })
            .ToListAsync(ct);
    }

    // ── Pagamento de comissão (admin) ─────────────────────────────────────────

    public async Task<AffiliatePayout?> PayoutAsync(
        Guid affiliateId, List<Guid> conversionIds, string? notes, Guid paidBy, CancellationToken ct)
    {
        var conversions = await db.AffiliateConversions
            .Where(c => conversionIds.Contains(c.Id) && c.AffiliateId == affiliateId && c.Status == "pending")
            .ToListAsync(ct);

        if (conversions.Count == 0) return null;

        var totalCents = conversions.Sum(c => c.CommissionCents);
        var payout = new AffiliatePayout
        {
            AffiliateId   = affiliateId,
            TotalCents    = totalCents,
            ConversionIds = [.. conversions.Select(c => c.Id)],
            Notes         = notes,
            CreatedBy     = paidBy,
        };

        db.AffiliatePayouts.Add(payout);

        foreach (var c in conversions)
        {
            c.Status = "paid";
            c.PaidAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        log.LogInformation("[Affiliate] Payout R$ {Total} para {AffId} ({Count} conversões)", totalCents / 100m, affiliateId, conversions.Count);
        return payout;
    }
}

public class AffiliateStats
{
    public required Affiliate Affiliate       { get; init; }
    public int TotalConversions               { get; init; }
    public int TotalSalesCents                { get; init; }
    public int TotalCommCents                 { get; init; }
    public int PendingCommCents               { get; init; }
}
