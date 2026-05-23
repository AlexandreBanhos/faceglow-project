using System.Security.Claims;
using SkinAnalysis.Api.Helpers;
using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Endpoints;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this WebApplication app)
    {
        app.MapPost("/notifications/subscribe",    SubscribeHandler).RequireAuthorization();
        app.MapDelete("/notifications/subscribe",  UnsubscribeHandler).RequireAuthorization();
        app.MapPut("/notifications/preferences",   PreferencesHandler).RequireAuthorization();
        // Endpoint para cron externo disparar notificações
        app.MapPost("/notifications/trigger/{type}", TriggerHandler).RequireAuthorization();
    }

    private record SubscribeRequest(string Endpoint, string P256dh, string Auth, string? UserAgent);
    private record PreferencesRequest(bool RoutineMorning, bool RoutineNight, bool AnalysisWeekly, bool PendingSteps);

    private static async Task<IResult> SubscribeHandler(
        SubscribeRequest req, ClaimsPrincipal user,
        PushNotificationService push, CancellationToken ct)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        await push.UpsertSubscriptionAsync(userId.Value, req.Endpoint, req.P256dh, req.Auth, req.UserAgent, ct);
        return Results.Ok(new { subscribed = true });
    }

    private static async Task<IResult> UnsubscribeHandler(
        ClaimsPrincipal user, PushNotificationService push, CancellationToken ct)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        await push.DeleteSubscriptionAsync(userId.Value, ct);
        return Results.Ok(new { unsubscribed = true });
    }

    private static async Task<IResult> PreferencesHandler(
        PreferencesRequest req, ClaimsPrincipal user,
        PushNotificationService push, CancellationToken ct)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        await push.UpdatePreferencesAsync(userId.Value, req.RoutineMorning, req.RoutineNight, req.AnalysisWeekly, req.PendingSteps, ct);
        return Results.Ok();
    }

    private static async Task<IResult> TriggerHandler(
        string type, ClaimsPrincipal user,
        PushNotificationService push,
        IConfiguration config, CancellationToken ct)
    {
        // Protege com chave interna para cron
        var cronKey = config["Notifications:CronKey"];
        var authHeader = user.FindFirstValue("cron-key");
        // Permite admin ou chave de cron
        if (!string.IsNullOrEmpty(cronKey) && authHeader != cronKey)
        {
            var isAdmin = user.FindFirstValue("is_admin") == "true";
            if (!isAdmin) return Results.Forbid();
        }

        switch (type)
        {
            case "routine_morning": await push.SendRoutineReminderAsync("morning", ct); break;
            case "routine_night":   await push.SendRoutineReminderAsync("night",   ct); break;
            case "analysis":        await push.SendAnalysisReminderAsync(ct);           break;
            case "pending_steps":   await push.SendPendingStepsReminderAsync(ct);       break;
            default: return Results.BadRequest(new { error = $"Unknown type: {type}" });
        }

        return Results.Ok(new { triggered = type });
    }
}
