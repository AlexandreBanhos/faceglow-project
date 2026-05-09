using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Endpoints;

public static class RoutineCompletionEndpoints
{
    public static void MapRoutineCompletionEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/routine")
            .WithTags("Routine Completion")
            .WithOpenApi()
            .RequireAuthorization();

        group.MapPost("/steps/{stepId:guid}/complete", CompleteStepHandler)
            .WithName("CompleteRoutineStep");

        group.MapDelete("/steps/{stepId:guid}/complete", UncompleteStepHandler)
            .WithName("UncompleteRoutineStep");

        group.MapGet("/progress/today", GetTodayProgressHandler)
            .WithName("GetTodayProgress");

        group.MapGet("/progress/history", GetHistoryProgressHandler)
            .WithName("GetHistoryProgress");
    }

    private static (Guid id, bool valid) GetUserId(ClaimsPrincipal user)
    {
        var claim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? (id, true) : (Guid.Empty, false);
    }

    private static async Task<IResult> CompleteStepHandler(
        Guid stepId, CompleteStepRequest request,
        ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var step = await db.RoutineSteps
            .AsNoTracking()
            .Include(s => s.Routine)
            .FirstOrDefaultAsync(s => s.Id == stepId
                && s.Routine.UserId == userId
                && s.IsActive, ct);

        if (step is null) return Results.NotFound(new { error = "Step não encontrado." });

        var completedDate = ResolveDate(request.LocalDate);

        var existing = await db.StepCompletions
            .FirstOrDefaultAsync(c => c.StepId == stepId && c.CompletedDate == completedDate, ct);

        if (existing is not null)
            return Results.Ok(new { alreadyCompleted = true, completedDate = completedDate.ToString("yyyy-MM-dd") });

        db.StepCompletions.Add(new StepCompletion
        {
            UserId = userId,
            RoutineId = step.Routine.Id,
            StepId = stepId,
            CompletedDate = completedDate,
        });
        await db.SaveChangesAsync(ct);

        return Results.Ok(new { completed = true, completedDate = completedDate.ToString("yyyy-MM-dd") });
    }

    private static async Task<IResult> UncompleteStepHandler(
        Guid stepId, string? localDate,
        ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var today = ResolveDate(localDate);

        var existing = await db.StepCompletions
            .FirstOrDefaultAsync(c => c.StepId == stepId
                && c.UserId == userId
                && c.CompletedDate == today, ct);

        if (existing is null) return Results.Ok(new { alreadyPending = true });

        db.StepCompletions.Remove(existing);
        await db.SaveChangesAsync(ct);

        return Results.Ok(new { uncompleted = true, date = today.ToString("yyyy-MM-dd") });
    }

    private static async Task<IResult> GetTodayProgressHandler(
        string? localDate, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var today = ResolveDate(localDate);

        var completedStepIds = await db.StepCompletions
            .Where(c => c.UserId == userId && c.CompletedDate == today)
            .Select(c => c.StepId)
            .ToListAsync(ct);

        return Results.Ok(new { date = today.ToString("yyyy-MM-dd"), completedStepIds });
    }

    private static async Task<IResult> GetHistoryProgressHandler(
        string? start, string? end, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var startDate = ParseHistoryDate(start, -30);
        var endDate = ParseHistoryDate(end, 0);

        // StepCompletion já guarda RoutineId — join direto com Routines para obter o Period
        var completions = await db.StepCompletions
            .AsNoTracking()
            .Where(c => c.UserId == userId && c.CompletedDate >= startDate && c.CompletedDate <= endDate)
            .Join(db.Routines.AsNoTracking(),
                  c => c.RoutineId,
                  r => r.Id,
                  (c, r) => new { c.CompletedDate, r.Period })
            .ToListAsync(ct);

        var result = completions
            .GroupBy(x => x.CompletedDate.ToString("yyyy-MM-dd"))
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    morning = g.Count(x => x.Period == "morning"),
                    night   = g.Count(x => x.Period == "night"),
                });

        return Results.Ok(result);
    }

    private static DateOnly ParseHistoryDate(string? raw, int defaultDaysOffset)
    {
        if (!string.IsNullOrWhiteSpace(raw)
            && DateOnly.TryParseExact(raw, "yyyy-MM-dd", out var parsed))
            return parsed;
        return DateOnly.FromDateTime(DateTime.UtcNow.AddDays(defaultDaysOffset).AddHours(-3));
    }

    private static DateOnly ResolveDate(string? raw)
    {
        if (!string.IsNullOrWhiteSpace(raw)
            && DateOnly.TryParseExact(raw, "yyyy-MM-dd", out var parsed)
            && parsed >= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-26))
            && parsed <= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(26)))
            return parsed;
        return DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
    }
}

public record CompleteStepRequest(string? LocalDate = null);
