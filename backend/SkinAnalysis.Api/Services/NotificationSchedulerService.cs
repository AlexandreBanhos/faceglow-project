using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Services;

/// <summary>
/// Roda em background e dispara notificações push nos horários configurados.
/// Horários (UTC-3 / Brasília):
///   08:00 → lembrete rotina da manhã
///   15:00 → passos pendentes (quem não marcou nenhum hoje)
///   21:30 → lembrete rotina da noite
///   Dom 10:00 → lembrete de análise semanal
/// </summary>
public class NotificationSchedulerService(
    IServiceScopeFactory scopeFactory,
    ILogger<NotificationSchedulerService> log) : BackgroundService
{
    // UTC offset do Brasil (BRT = UTC-3)
    private static readonly TimeSpan BrtOffset = TimeSpan.FromHours(-3);

    // Horários em BRT
    private static readonly TimeOnly MorningTime      = new(8,  0);
    private static readonly TimeOnly PendingTime      = new(15, 0);
    private static readonly TimeOnly NightTime        = new(21, 30);
    private static readonly TimeOnly WeeklyTime       = new(10, 0);

    private bool _sentMorningToday;
    private bool _sentPendingToday;
    private bool _sentNightToday;
    private bool _sentWeeklyThisSunday;
    private DateTime _lastResetDate = DateTime.MinValue;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        log.LogInformation("[NotifScheduler] Iniciado");

        while (!ct.IsCancellationRequested)
        {
            try { await TickAsync(ct); }
            catch (Exception ex) { log.LogError(ex, "[NotifScheduler] Erro no tick"); }

            await Task.Delay(TimeSpan.FromMinutes(1), ct);
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        var nowBrt = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "E. South America Standard Time");
        var today  = DateOnly.FromDateTime(nowBrt);
        var now    = TimeOnly.FromDateTime(nowBrt);

        // Reset flags à meia-noite
        if (today != DateOnly.FromDateTime(_lastResetDate))
        {
            _sentMorningToday = false;
            _sentPendingToday = false;
            _sentNightToday   = false;
            _lastResetDate    = nowBrt;
            log.LogDebug("[NotifScheduler] Flags resetadas para {Date}", today);
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var push = scope.ServiceProvider.GetRequiredService<PushNotificationService>();

        // ── 08:00 → rotina da manhã ───────────────────────────────────────
        if (!_sentMorningToday && now >= MorningTime && now < MorningTime.AddMinutes(5))
        {
            await push.SendRoutineReminderAsync("morning", ct);
            _sentMorningToday = true;
        }

        // ── 15:00 → passos pendentes ──────────────────────────────────────
        if (!_sentPendingToday && now >= PendingTime && now < PendingTime.AddMinutes(5))
        {
            await push.SendPendingStepsReminderAsync(ct);
            _sentPendingToday = true;
        }

        // ── 21:30 → rotina da noite ───────────────────────────────────────
        if (!_sentNightToday && now >= NightTime && now < NightTime.AddMinutes(5))
        {
            await push.SendRoutineReminderAsync("night", ct);
            _sentNightToday = true;
        }

        // ── Domingo 10:00 → lembrete de análise ──────────────────────────
        if (nowBrt.DayOfWeek == DayOfWeek.Sunday &&
            !_sentWeeklyThisSunday &&
            now >= WeeklyTime && now < WeeklyTime.AddMinutes(5))
        {
            await push.SendAnalysisReminderAsync(ct);
            _sentWeeklyThisSunday = true;
        }
        // Reset da flag semanal em segunda-feira
        if (nowBrt.DayOfWeek == DayOfWeek.Monday) _sentWeeklyThisSunday = false;
    }
}
