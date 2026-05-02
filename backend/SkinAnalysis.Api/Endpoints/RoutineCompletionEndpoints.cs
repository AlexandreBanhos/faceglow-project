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

    // POST /routine/steps/{stepId}/complete
    // Marca um step específico como concluído no dia local do usuário
    private static async Task<IResult> CompleteStepHandler(
        Guid stepId,
        CompleteStepRequest request,
        ClaimsPrincipal user,
        AppDbContext db,
        CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        // Valida que o step pertence ao usuário
        var stepExists = await db.AnalysisRoutineSteps
            .AnyAsync(s => s.Id == stepId && s.UserId == userId && s.IsActive, ct);
        if (!stepExists) return Results.NotFound(new { error = "Step não encontrado." });

        // Resolve data local com validação ±26h
        DateOnly completedDate;
        if (!string.IsNullOrWhiteSpace(request.LocalDate)
            && DateOnly.TryParseExact(request.LocalDate, "yyyy-MM-dd", out var parsed)
            && parsed >= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-26))
            && parsed <= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(26)))
        {
            completedDate = parsed;
        }
        else
        {
            completedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
        }

        var existing = await db.RoutineStepCompletions
            .FirstOrDefaultAsync(c => c.StepId == stepId && c.CompletedDate == completedDate, ct);

        if (existing is not null)
            return Results.Ok(new { alreadyCompleted = true, completedDate = completedDate.ToString("yyyy-MM-dd") });

        db.RoutineStepCompletions.Add(new RoutineStepCompletion
        {
            UserId = userId,
            StepId = stepId,
            CompletedDate = completedDate,
        });
        await db.SaveChangesAsync(ct);

        return Results.Ok(new { completed = true, completedDate = completedDate.ToString("yyyy-MM-dd") });
    }

    // GET /routine/progress/today?localDate=yyyy-MM-dd
    // Retorna quais steps foram concluídos hoje
    private static async Task<IResult> GetTodayProgressHandler(
        string? localDate,
        ClaimsPrincipal user,
        AppDbContext db,
        CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        DateOnly today;
        if (!string.IsNullOrWhiteSpace(localDate)
            && DateOnly.TryParseExact(localDate, "yyyy-MM-dd", out var parsed)
            && parsed >= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-26))
            && parsed <= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(26)))
        {
            today = parsed;
        }
        else
        {
            today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
        }

        var completedStepIds = await db.RoutineStepCompletions
            .Where(c => c.UserId == userId && c.CompletedDate == today)
            .Select(c => c.StepId)
            .ToListAsync(ct);

        return Results.Ok(new
        {
            date = today.ToString("yyyy-MM-dd"),
            completedStepIds,
        });
    }
}

public record CompleteStepRequest(string? LocalDate = null);
