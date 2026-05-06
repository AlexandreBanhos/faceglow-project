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

        group.MapGet("/progress/today", GetTodayProgressHandler)
            .WithName("GetTodayProgress");
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
