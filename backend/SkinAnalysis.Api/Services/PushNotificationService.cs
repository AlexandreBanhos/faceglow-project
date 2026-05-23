using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using WebPush;

namespace SkinAnalysis.Api.Services;

public class PushNotificationService(IConfiguration config, AppDbContext db, ILogger<PushNotificationService> log)
{
    private readonly string _vapidPublicKey  = config["Vapid:PublicKey"]  ?? throw new InvalidOperationException("Vapid:PublicKey not set");
    private readonly string _vapidPrivateKey = config["Vapid:PrivateKey"] ?? throw new InvalidOperationException("Vapid:PrivateKey not set");
    private readonly string _vapidSubject    = config["Vapid:Subject"]    ?? "mailto:suporte@faceglow.com.br";

    // ── Subscription management ───────────────────────────────────────────────

    public async Task UpsertSubscriptionAsync(
        Guid userId, string endpoint, string p256dh, string auth,
        string? userAgent, CancellationToken ct)
    {
        var existing = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == endpoint, ct);

        if (existing is not null)
        {
            existing.P256dh    = p256dh;
            existing.Auth      = auth;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            db.PushSubscriptions.Add(new Models.PushSubscription
            {
                UserId    = userId,
                Endpoint  = endpoint,
                P256dh    = p256dh,
                Auth      = auth,
                UserAgent = userAgent,
            });
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteSubscriptionAsync(Guid userId, CancellationToken ct)
    {
        var subs = await db.PushSubscriptions
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        db.PushSubscriptions.RemoveRange(subs);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdatePreferencesAsync(
        Guid userId, bool morning, bool night, bool weekly, bool pending, CancellationToken ct)
    {
        var subs = await db.PushSubscriptions.Where(s => s.UserId == userId).ToListAsync(ct);
        foreach (var s in subs)
        {
            s.PrefRoutineMorning = morning;
            s.PrefRoutineNight   = night;
            s.PrefAnalysisWeekly = weekly;
            s.PrefPendingSteps   = pending;
            s.UpdatedAt          = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
    }

    // ── Send helpers ──────────────────────────────────────────────────────────

    public async Task SendToUserAsync(
        Guid userId, string title, string body, string? url = null,
        string? tag = null, CancellationToken ct = default)
    {
        var subs = await db.PushSubscriptions.Where(s => s.UserId == userId).ToListAsync(ct);
        foreach (var sub in subs)
            await SendRawAsync(sub.Endpoint, sub.P256dh, sub.Auth, title, body, url, tag, ct);
    }

    public async Task SendRoutineReminderAsync(string period, CancellationToken ct)
    {
        // Busca users com preferência ativa para o período
        var prefField = period == "morning" ? "pref_routine_morning" : "pref_routine_night";
        var subscriptions = await db.PushSubscriptions
            .Where(s => period == "morning" ? s.PrefRoutineMorning : s.PrefRoutineNight)
            .ToListAsync(ct);

        var title  = period == "morning" ? "Rotina da manhã ☀️" : "Rotina da noite 🌙";
        var body   = period == "morning"
            ? "Bom dia! Hora de cuidar da sua pele. Sua rotina da manhã está esperando."
            : "Que tal encerrar o dia cuidando da sua pele? Rotina da noite disponível.";
        var url    = "/routine";

        foreach (var sub in subscriptions)
            await SendRawAsync(sub.Endpoint, sub.P256dh, sub.Auth, title, body, url, $"routine_{period}", ct);

        log.LogInformation("[Push] Enviou lembrete de rotina ({Period}) para {Count} usuários", period, subscriptions.Count);
    }

    public async Task SendAnalysisReminderAsync(CancellationToken ct)
    {
        // Usuários sem análise nas últimas 2 semanas que têm pref ativa
        var cutoff = DateTime.UtcNow.AddDays(-14);
        var usersWithRecentAnalysis = await db.SkinAnalyses
            .Where(a => a.CreatedAt >= cutoff)
            .Select(a => a.UserId)
            .Distinct()
            .ToListAsync(ct);

        var subscriptions = await db.PushSubscriptions
            .Where(s => s.PrefAnalysisWeekly && !usersWithRecentAnalysis.Contains(s.UserId))
            .ToListAsync(ct);

        const string title = "Sua pele merece atenção ✨";
        const string body  = "Faz tempo que você não faz uma análise. Tire uma selfie e veja como está sua pele!";
        const string url   = "/analyze";

        foreach (var sub in subscriptions)
            await SendRawAsync(sub.Endpoint, sub.P256dh, sub.Auth, title, body, url, "analysis_reminder", ct);

        log.LogInformation("[Push] Enviou lembrete de análise para {Count} usuários", subscriptions.Count);
    }

    public async Task SendPendingStepsReminderAsync(CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;
        // Usuários que têm passos mas não completaram hoje (manhã)
        var completedToday = await db.StepCompletions
            .Where(sc => sc.CompletedDate >= DateOnly.FromDateTime(today))
            .Select(sc => sc.UserId)
            .Distinct()
            .ToListAsync(ct);

        var subscriptions = await db.PushSubscriptions
            .Where(s => s.PrefPendingSteps && !completedToday.Contains(s.UserId))
            .ToListAsync(ct);

        const string title = "Passos pendentes da rotina 📋";
        const string body  = "Você ainda tem passos para completar na sua rotina de hoje!";
        const string url   = "/routine";

        foreach (var sub in subscriptions)
            await SendRawAsync(sub.Endpoint, sub.P256dh, sub.Auth, title, body, url, "pending_steps", ct);

        log.LogInformation("[Push] Enviou lembrete de passos pendentes para {Count} usuários", subscriptions.Count);
    }

    // ── Core send ─────────────────────────────────────────────────────────────

    private async Task SendRawAsync(
        string endpoint, string p256dh, string auth,
        string title, string body, string? url, string? tag,
        CancellationToken ct)
    {
        try
        {
            var client = new WebPushClient();
            var vapid  = new VapidDetails(_vapidSubject, _vapidPublicKey, _vapidPrivateKey);
            var sub    = new PushSubscription(endpoint, p256dh, auth);
            var payload = JsonSerializer.Serialize(new { title, body, url = url ?? "/", tag = tag ?? "faceglow", icon = "/android-chrome-192x192.png" });

            await Task.Run(() => client.SendNotification(sub, payload, vapid), ct);
        }
        catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
        {
            // Subscription expirada — remove do banco
            var toDelete = await db.PushSubscriptions.Where(s => s.Endpoint == endpoint).ToListAsync(ct);
            db.PushSubscriptions.RemoveRange(toDelete);
            await db.SaveChangesAsync(ct);
            log.LogInformation("[Push] Removeu subscription expirada: {Endpoint}", endpoint[..Math.Min(40, endpoint.Length)]);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "[Push] Falha ao enviar para {Endpoint}", endpoint[..Math.Min(40, endpoint.Length)]);
        }
    }
}
