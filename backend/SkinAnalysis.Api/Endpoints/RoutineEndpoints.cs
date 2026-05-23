using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Helpers;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Endpoints;

public static class RoutineEndpoints
{
    public static void MapRoutineEndpoints(this WebApplication app)
    {
        app.MapPost("/routine/mark-complete", MarkCompleteHandler)
            .WithName("MarkRoutineComplete").WithOpenApi().RequireAuthorization();

        app.MapGet("/routine/ready", async (ClaimsPrincipal user, AppDbContext dbContext, CancellationToken ct) =>
        {
            var userId = EndpointHelpers.GetAuthenticatedUserId(user);
            if (!userId.HasValue) return Results.Unauthorized();
            var ready = await dbContext.Routines.AnyAsync(r => r.UserId == userId.Value && r.IsActive, ct);
            return Results.Ok(new { ready });
        }).WithName("GetRoutineReady").WithOpenApi().RequireAuthorization();
    }

    private static async Task<IResult> MarkCompleteHandler(
        MarkRoutineCompleteRequest request, ClaimsPrincipal user,
        AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        DateOnly today;
        if (!string.IsNullOrWhiteSpace(request.LocalDate)
            && DateOnly.TryParseExact(request.LocalDate, "yyyy-MM-dd", out var parsedLocal)
            && parsedLocal >= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-26))
            && parsedLocal <= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(26)))
        {
            today = parsedLocal;
        }
        else
        {
            today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
        }

        var activeSteps = await dbContext.RoutineSteps
            .AsNoTracking()
            .Where(s => s.Routine.UserId == userId.Value
                     && s.Routine.Period == request.Period
                     && s.Routine.IsActive
                     && s.IsActive)
            .Include(s => s.Routine)
            .ToListAsync(cancellationToken);

        foreach (var step in activeSteps)
        {
            var exists = await dbContext.StepCompletions
                .AnyAsync(c => c.StepId == step.Id && c.CompletedDate == today, cancellationToken);
            if (!exists)
            {
                dbContext.StepCompletions.Add(new StepCompletion
                {
                    UserId = userId.Value,
                    RoutineId = step.Routine.Id,
                    StepId = step.Id,
                    CompletedDate = today,
                });
            }
        }
        if (activeSteps.Count > 0) await dbContext.SaveChangesAsync(cancellationToken);

        return Results.Ok(new
        {
            message = "Routine completion marked successfully",
            completionDate = today.ToString("yyyy-MM-dd"),
            morningCompleted = request.Period is "morning" or "both",
            nightCompleted = request.Period is "night" or "both",
            userId = userId.Value,
        });
    }
}
