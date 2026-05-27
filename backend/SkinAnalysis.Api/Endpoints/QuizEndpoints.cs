using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Helpers;

namespace SkinAnalysis.Api.Endpoints;

public static class QuizEndpoints
{
    public static void MapQuizEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/quiz")
            .WithTags("Quiz")
            .RequireAuthorization();

        group.MapGet("/answers", GetAnswersHandler);
        group.MapPut("/answers", PutAnswersHandler);
    }

    private static async Task<IResult> GetAnswersHandler(
        HttpContext ctx,
        AppDbContext db,
        CancellationToken ct)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(ctx.User);
        if (userId is null) return Results.Unauthorized();

        var connection = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync(ct);

        var json = await connection.QueryFirstOrDefaultAsync<string>(
            new CommandDefinition(
                "SELECT lifestyle_answers::text FROM users WHERE id = @userId",
                new { userId = userId.Value },
                cancellationToken: ct));

        if (string.IsNullOrWhiteSpace(json))
            return Results.Ok((object?)null);

        using var doc = JsonDocument.Parse(json);
        return Results.Ok(doc.RootElement.Clone());
    }

    private static async Task<IResult> PutAnswersHandler(
        HttpContext ctx,
        AppDbContext db,
        CancellationToken ct)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(ctx.User);
        if (userId is null) return Results.Unauthorized();

        using var reader = new StreamReader(ctx.Request.Body);
        var body = await reader.ReadToEndAsync(ct);
        if (string.IsNullOrWhiteSpace(body))
            return Results.BadRequest(new { detail = "Body vazio." });

        try { JsonDocument.Parse(body); }
        catch { return Results.BadRequest(new { detail = "JSON inválido." }); }

        var connection = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync(ct);

        await connection.ExecuteAsync(new CommandDefinition(
            "UPDATE users SET lifestyle_answers = @json::jsonb WHERE id = @userId",
            new { json = body, userId = userId.Value },
            cancellationToken: ct));

        return Results.Ok(new { success = true });
    }
}
