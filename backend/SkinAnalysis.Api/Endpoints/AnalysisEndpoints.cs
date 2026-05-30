using System.Security.Claims;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Helpers;
using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Endpoints;

public static class AnalysisEndpoints
{
    public static void MapAnalysisEndpoints(this WebApplication app)
    {
        // Stats & credits
        app.MapGet("/analysis/stats", GetStatsHandler)
            .WithName("GetAnalysisStats").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("polling");

        app.MapGet("/analysis/credits", GetCreditsHandler)
            .WithName("GetAnalysisCredits").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("polling");

        app.MapGet("/analysis/profile-summary", GetProfileSummaryHandler)
            .WithName("GetProfileSummary").WithOpenApi()
            .RequireRateLimiting("polling");

        app.MapGet("/analysis/dashboard", GetDashboardHandler)
            .WithName("GetDashboardSummary").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("polling");

        app.MapGet("/analysis/summary", GetSummaryHandler)
            .WithName("GetAnalysisSummary").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("polling");

        // Single analysis
        app.MapGet("/analysis/{id:guid}/status", GetStatusHandler)
            .WithName("GetAnalysisJobStatus").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("polling");

        // Deprecated stubs
        app.MapPost("/analysis/{id:guid}/routine/save", () =>
            Results.Json(new { error = "Endpoint descontinuado. Use PATCH /analysis/{id}/steps/{stepId}." }, statusCode: 410))
            .WithName("SaveRoutineCustomizations").WithOpenApi();

        app.MapGet("/analysis/{id:guid}/routine/custom", () =>
            Results.Json(new { error = "Endpoint descontinuado. Use GET /analysis/{id}/steps." }, statusCode: 410))
            .WithName("GetCustomRoutine").WithOpenApi();

        app.MapGet("/analysis/{id:guid}", GetByIdHandler)
            .WithName("GetAnalysisById").WithOpenApi().RequireAuthorization();

        app.MapPost("/analysis/{id:guid}/routine", BuildRoutineHandler)
            .WithName("BuildRoutine").WithOpenApi().RequireAuthorization();

        app.MapGet("/analysis", GetAnalysesHandler)
            .WithName("GetAnalysesByUser").WithOpenApi().RequireAuthorization();

        // Main analysis creation
        app.MapPost("/analysis", CreateAnalysisHandler)
            .WithName("CreateAnalysis").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("analysis");
    }

    private static async Task<IResult> GetStatsHandler(
        ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var parsedUserId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!parsedUserId.HasValue) return Results.Unauthorized();

        var totalAnalyses = await dbContext.SkinAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value)
            .CountAsync(cancellationToken);

        var bestScore = await dbContext.SkinAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value)
            .Select(a => (int?)(100 - (int)Math.Round(
                (a.AcneScore + a.OilinessScore + a.DarkSpotsScore + a.SensitivityScore) / 4.0 * 10)))
            .MaxAsync(cancellationToken);

        var completedDays = 0;
        try
        {
            await dbContext.Database.OpenConnectionAsync(cancellationToken);
            var connection = dbContext.Database.GetDbConnection();
            const string sql = """
                SELECT COUNT(DISTINCT completed_date)
                FROM step_completions
                WHERE user_id = @userId
                """;
            completedDays = await connection.ExecuteScalarAsync<int>(
                new CommandDefinition(sql, new { userId = parsedUserId.Value }, cancellationToken: cancellationToken));
        }
        catch { completedDays = 0; }

        return Results.Ok(new AnalysisStatsResponseDto
        {
            TotalAnalyses = totalAnalyses,
            BestScore = Math.Clamp(bestScore ?? 0, 0, 100),
            StreakDays = completedDays,
        });
    }

    private static async Task<IResult> GetCreditsHandler(
        ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache, CancellationToken cancellationToken)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        var cacheKey = $"user_credits_{userId.Value}";
        if (cache.TryGetValue(cacheKey, out int cachedCredits))
            return Results.Ok(new { creditsRemaining = cachedCredits });

        using var creditsTimeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        creditsTimeoutCts.CancelAfter(TimeSpan.FromSeconds(8));

        int? creditsRemaining;
        try
        {
            creditsRemaining = await dbContext.UserCredits
                .AsNoTracking()
                .Where(x => x.UserId == userId.Value)
                .Select(x => (int?)x.CreditsRemaining)
                .FirstOrDefaultAsync(creditsTimeoutCts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            if (cache.TryGetValue(cacheKey, out int staleCredits))
                return Results.Ok(new { creditsRemaining = staleCredits, stale = true });

            return Results.Problem(
                title: "Banco de dados indisponível",
                detail: "Não foi possível consultar créditos agora. Tente novamente em alguns segundos.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        if (creditsRemaining is null)
        {
            var credit = new SkinAnalysis.Api.Models.UserCredit
            {
                UserId = userId.Value,
                CreditsRemaining = 1,
                UpdatedAt = DateTime.UtcNow,
            };
            dbContext.UserCredits.Add(credit);
            await dbContext.SaveChangesAsync(cancellationToken);
            creditsRemaining = credit.CreditsRemaining;
        }

        cache.Set(cacheKey, creditsRemaining.Value, TimeSpan.FromMinutes(5));
        return Results.Ok(new { creditsRemaining = creditsRemaining.Value });
    }

    private static async Task<IResult> GetProfileSummaryHandler(
        ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache, CancellationToken cancellationToken)
    {
        var parsedUserId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!parsedUserId.HasValue) return Results.Unauthorized();

        var cacheKey = $"profile_summary_{parsedUserId.Value}";
        if (cache.TryGetValue(cacheKey, out var cached)) return Results.Ok(cached);

        var creditsRemaining = await dbContext.UserCredits
            .AsNoTracking()
            .Where(c => c.UserId == parsedUserId.Value)
            .Select(c => (int?)c.CreditsRemaining)
            .FirstOrDefaultAsync(cancellationToken) ?? 0;

        var totalAnalysesSummary = await dbContext.SkinAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value)
            .CountAsync(cancellationToken);

        var bestRaw = await dbContext.SkinAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value)
            .Select(a => (int?)(100 - (int)Math.Round(
                (a.AcneScore + a.OilinessScore + a.DarkSpotsScore + a.SensitivityScore) / 4.0 * 10)))
            .MaxAsync(cancellationToken);

        var completedDaysForSummary = 0;
        try
        {
            await dbContext.Database.OpenConnectionAsync(cancellationToken);
            var conn = dbContext.Database.GetDbConnection();
            const string daysSql = """
                SELECT COUNT(DISTINCT completed_date)
                FROM step_completions
                WHERE user_id = @userId
                """;
            completedDaysForSummary = await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(daysSql, new { userId = parsedUserId.Value }, cancellationToken: cancellationToken));
        }
        catch { completedDaysForSummary = 0; }

        var result = new
        {
            stats = new AnalysisStatsResponseDto
            {
                TotalAnalyses = totalAnalysesSummary,
                BestScore = Math.Clamp(bestRaw ?? 0, 0, 100),
                StreakDays = completedDaysForSummary,
            },
            credits = new { creditsRemaining },
        };

        cache.Set(cacheKey, result, TimeSpan.FromMinutes(2));
        return Results.Ok(result);
    }

    private static async Task<IResult> GetDashboardHandler(
        ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache, CancellationToken cancellationToken)
    {
        var parsedUserId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!parsedUserId.HasValue) return Results.Unauthorized();

        var cacheKey = $"dashboard_{parsedUserId.Value}";
        if (cache.TryGetValue(cacheKey, out var cachedDashboard)) return Results.Ok(cachedDashboard);

        var latestTwo = await dbContext.SkinAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value)
            .OrderByDescending(a => a.CreatedAt)
            .Take(2)
            .ToListAsync(cancellationToken);

        if (latestTwo.Count == 0)
        {
            var emptyResult = new { latest = (object?)null, previous = (object?)null };
            cache.Set(cacheKey, emptyResult, TimeSpan.FromMinutes(1));
            return Results.Ok(emptyResult);
        }

        var latest = latestTwo[0];
        var previous = latestTwo.Count > 1 ? latestTwo[1] : null;

        var morningSteps = new List<string>();
        var nightSteps = new List<string>();
        try
        {
            // Projeção leve: não carrega entidades completas nem product_images.
            // Busca por userId (sem filtro de SkinProfileId) para evitar falso negativo
            // quando o perfil não está linkado à rotina ativa.
            var stepProjections = await dbContext.RoutineSteps
                .AsNoTracking()
                .Where(s => s.Routine.UserId == parsedUserId.Value
                         && s.Routine.IsActive
                         && s.IsActive)
                .OrderBy(s => s.Routine.Period).ThenBy(s => s.StepOrder)
                .Select(s => new
                {
                    Period = s.Routine.Period,
                    TypeKey = s.StepTypeKey,
                    ProductName = s.Slots
                        .Where(sl => sl.IsSelected)
                        .Select(sl => sl.Product != null
                            ? sl.Product.Name
                            : sl.UserProduct != null ? sl.UserProduct.CustomName : null)
                        .FirstOrDefault(),
                })
                .ToListAsync(cancellationToken);

            foreach (var step in stepProjections)
            {
                var displayName = StepDisplayNames.Get(step.TypeKey);
                var productName = step.ProductName ?? step.TypeKey;
                var line = $"{displayName}: {productName}";
                if (step.Period == "morning") morningSteps.Add(line);
                else nightSteps.Add(line);
            }
        }
        catch { /* best-effort — don't fail dashboard */ }

        var result = new
        {
            latest = new AnalysisResponseDto
            {
                Id = latest.Id,
                UserId = latest.UserId,
                ImageUrl = latest.ImageUrl ?? string.Empty,
                SkinType = latest.SkinType,
                Summary = latest.Summary,
                Conditions = new AnalysisConditionsDto
                {
                    Acne = latest.HasActiveAcne,
                    Olheiras = latest.HasDarkCircles,
                    Poros = latest.HasEnlargedPores,
                },
                AdditionalRecommendations = latest.AdditionalNotes,
                Scores = new AnalysisScoresDto
                {
                    Acne = latest.AcneScore,
                    Oiliness = latest.OilinessScore,
                    DarkSpots = latest.DarkSpotsScore,
                    Hydration = latest.HydrationScore,
                    Sensitivity = latest.SensitivityScore,
                },
                OverallScore = latest.OverallScore,
                CreatedAtUtc = latest.CreatedAt,
                Routine = new AnalysisRoutineDto { Morning = morningSteps, Night = nightSteps },
                Recommendations = new(),
                HasRecommendations = false,
            },
            previous = previous is null ? null : new { previous.Id, previous.OverallScore, CreatedAtUtc = previous.CreatedAt },
        };

        cache.Set(cacheKey, result, TimeSpan.FromMinutes(1));
        return Results.Ok(result);
    }

    private static async Task<IResult> GetSummaryHandler(
        ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache,
        int? limit, int? offset, CancellationToken cancellationToken)
    {
        var parsedUserId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!parsedUserId.HasValue) return Results.Unauthorized();

        var safeLimit = Math.Clamp(limit.GetValueOrDefault(20), 1, 50);
        var safeOffset = Math.Max(0, offset.GetValueOrDefault(0));
        var cacheKey = $"analysis_summary_{parsedUserId.Value}_{safeLimit}_{safeOffset}";

        if (cache.TryGetValue(cacheKey, out List<AnalysisResponseDto>? cachedResponse))
            return Results.Ok(cachedResponse);

        var analyses = await dbContext.SkinAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value)
            .OrderByDescending(a => a.CreatedAt)
            .Skip(safeOffset)
            .Take(safeLimit)
            .ToListAsync(cancellationToken);

        var response = analyses.Select(a => new AnalysisResponseDto
        {
            Id = a.Id, UserId = a.UserId,
            ImageUrl = a.ImageUrl ?? string.Empty, SkinType = a.SkinType, Summary = a.Summary,
            Conditions = new AnalysisConditionsDto { Acne = a.HasActiveAcne, Olheiras = a.HasDarkCircles, Poros = a.HasEnlargedPores },
            AdditionalRecommendations = a.AdditionalNotes,
            Scores = new AnalysisScoresDto { Acne = a.AcneScore, Oiliness = a.OilinessScore, DarkSpots = a.DarkSpotsScore, Hydration = a.HydrationScore, Sensitivity = a.SensitivityScore },
            OverallScore = a.OverallScore, CreatedAtUtc = a.CreatedAt,
            Routine = new AnalysisRoutineDto { Morning = new(), Night = new() },
            Recommendations = new(), HasRecommendations = false,
        }).ToList();

        cache.Set(cacheKey, response, TimeSpan.FromMinutes(3));
        return Results.Ok(response);
    }

    private static async Task<IResult> GetStatusHandler(
        Guid id, ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var parsedUserId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!parsedUserId.HasValue) return Results.Unauthorized();

        var job = AnalysisJobStore.Get(id);

        if (job is null)
        {
            var persisted = await dbContext.SkinAnalyses
                .AsNoTracking()
                .Where(a => a.Id == id && a.UserId == parsedUserId.Value)
                .FirstOrDefaultAsync(cancellationToken);

            if (persisted is null) return Results.NotFound(new { error = "Análise não encontrada." });


            var completedDto = new AnalysisResponseDto
            {
                Id = persisted.Id, UserId = persisted.UserId,
                ImageUrl = persisted.ImageUrl ?? string.Empty, SkinType = persisted.SkinType,
                Summary = persisted.Summary,
                Conditions = new AnalysisConditionsDto { Acne = persisted.HasActiveAcne, Olheiras = persisted.HasDarkCircles, Poros = persisted.HasEnlargedPores },
                AdditionalRecommendations = persisted.AdditionalNotes,
                Scores = new AnalysisScoresDto { Acne = persisted.AcneScore, Oiliness = persisted.OilinessScore, DarkSpots = persisted.DarkSpotsScore, Hydration = persisted.HydrationScore, Sensitivity = persisted.SensitivityScore, LinhasFinas = persisted.AgingScore, Vermelhidao = persisted.RednessScore },
                OverallScore = persisted.OverallScore, CreatedAtUtc = persisted.CreatedAt,
                Routine = new AnalysisRoutineDto { Morning = new(), Night = new() },
                Recommendations = new(), HasRecommendations = false,
            };

            return Results.Ok(new { id, status = "completed", result = completedDto });
        }

        if (job.OwnerId != Guid.Empty && job.OwnerId != parsedUserId.Value)
            return Results.NotFound(new { error = "Análise não encontrada." });

        return job.Status switch
        {
            "processing" => Results.Ok(new { id, status = "processing", result = (object?)null, error = (string?)null }),
            "completed"  => Results.Ok(new { id, status = "completed",  result = (object?)job.Result, error = (string?)null }),
            "failed"     => Results.Ok(new { id, status = "failed",     result = (object?)null, error = job.Error }),
            _            => Results.Problem("Unknown job status."),
        };
    }

    private static async Task<IResult> GetByIdHandler(
        Guid id, ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var parsedUserId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!parsedUserId.HasValue) return Results.Unauthorized();

        var analysis = await dbContext.SkinAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value && a.Id == id)
            .FirstOrDefaultAsync(cancellationToken);

        if (analysis is null) return Results.NotFound(new { error = "Análise não encontrada." });

        return Results.Ok(new AnalysisResponseDto
        {
            Id = analysis.Id, UserId = analysis.UserId,
            ImageUrl = analysis.ImageUrl ?? string.Empty, SkinType = analysis.SkinType,
            Summary = analysis.Summary,
            Conditions = new AnalysisConditionsDto { Acne = analysis.HasActiveAcne, Olheiras = analysis.HasDarkCircles, Poros = analysis.HasEnlargedPores },
            AdditionalRecommendations = analysis.AdditionalNotes,
            Scores = new AnalysisScoresDto { Acne = analysis.AcneScore, Oiliness = analysis.OilinessScore, DarkSpots = analysis.DarkSpotsScore, Hydration = analysis.HydrationScore, Sensitivity = analysis.SensitivityScore },
            OverallScore = analysis.OverallScore, CreatedAtUtc = analysis.CreatedAt,
            Routine = new AnalysisRoutineDto { Morning = new(), Night = new() },
            Recommendations = new(), HasRecommendations = false,
        });
    }

    private static async Task<IResult> BuildRoutineHandler(
        Guid id, ClaimsPrincipal user, AppDbContext dbContext, IServiceScopeFactory scopeFactory,
        ILogger<Program> logger, CancellationToken cancellationToken)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        var exists = await dbContext.SkinAnalyses.AnyAsync(a => a.Id == id && a.UserId == userId.Value, cancellationToken);
        if (!exists) return Results.NotFound(new { error = "Análise não encontrada." });

        var existing = AnalysisJobStore.Get(id);
        if (existing?.Status == "processing") return Results.Accepted($"/analysis/{id}/status", new { id, routineStatus = "processing" });
        if (existing?.Status == "completed") return Results.Ok(new { id, routineStatus = "completed", result = existing.Result });

        AnalysisJobStore.Set(id, new AnalysisJob("processing", userId.Value));

        _ = Task.Run(async () =>
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var svc = scope.ServiceProvider.GetRequiredService<IAnalysisService>();
            try
            {
                var result = await svc.BuildRoutineAsync(id, CancellationToken.None);
                AnalysisJobStore.Complete(id, result);
                logger.LogInformation("[ASYNC] Routine job {Id} completed.", id);
            }
            catch (Exception ex)
            {
                AnalysisJobStore.Fail(id, "Não foi possível gerar a rotina.");
                logger.LogError(ex, "[ASYNC] Routine job {Id} failed.", id);
            }
        });

        return Results.Accepted($"/analysis/{id}/status", new { id, routineStatus = "processing" });
    }

    private static async Task<IResult> GetAnalysesHandler(
        ClaimsPrincipal user, AppDbContext dbContext, int? limit, int? offset,
        bool? includeRecommendations, CancellationToken cancellationToken)
    {
        var parsedUserId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!parsedUserId.HasValue) return Results.Unauthorized();

        var safeLimit = Math.Clamp(limit.GetValueOrDefault(20), 1, 50);
        var safeOffset = Math.Max(0, offset.GetValueOrDefault(0));

        var analyses = await dbContext.SkinAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value)
            .OrderByDescending(a => a.CreatedAt)
            .Skip(safeOffset)
            .Take(safeLimit)
            .ToListAsync(cancellationToken);

        var response = analyses.Select(a => new AnalysisResponseDto
        {
            Id = a.Id, UserId = a.UserId,
            ImageUrl = a.ImageUrl ?? string.Empty, SkinType = a.SkinType, Summary = a.Summary,
            Conditions = new AnalysisConditionsDto { Acne = a.HasActiveAcne, Olheiras = a.HasDarkCircles, Poros = a.HasEnlargedPores },
            AdditionalRecommendations = a.AdditionalNotes,
            Scores = new AnalysisScoresDto { Acne = a.AcneScore, Oiliness = a.OilinessScore, DarkSpots = a.DarkSpotsScore, Hydration = a.HydrationScore, Sensitivity = a.SensitivityScore },
            OverallScore = a.OverallScore, CreatedAtUtc = a.CreatedAt,
            Routine = new AnalysisRoutineDto { Morning = new(), Night = new() },
            Recommendations = new(), HasRecommendations = false,
        }).ToList();

        return Results.Ok(response);
    }

    private static async Task<IResult> CreateAnalysisHandler(
        AnalysisRequestDto request, ClaimsPrincipal user, AppDbContext dbContext,
        IServiceScopeFactory scopeFactory, IMemoryCache cache,
        ILogger<Program> logger, CancellationToken cancellationToken)
    {
        var authenticatedUserId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!authenticatedUserId.HasValue) return Results.Unauthorized();

        // Rate limiting: máximo 3 análises por minuto por usuário
        var rateLimitKey = $"analysis_rate_{authenticatedUserId.Value}";
        var currentCount = cache.GetOrCreate(rateLimitKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return 0;
        });
        if (currentCount >= 3)
        {
            logger.LogWarning("[ASYNC] Rate limit atingido para userId {UserId}.", authenticatedUserId.Value);
            return Results.Problem(
                title: "Muitas requisições",
                detail: "Aguarde 1 minuto antes de criar outra análise.",
                statusCode: StatusCodes.Status429TooManyRequests);
        }
        cache.Set(rateLimitKey, currentCount + 1, TimeSpan.FromMinutes(1));

        using var saveDebitCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        saveDebitCts.CancelAfter(TimeSpan.FromSeconds(12));
        try
        {
            var affected = await dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE user_credits SET credits_remaining = credits_remaining - 1, updated_at = NOW() WHERE user_id = {authenticatedUserId.Value} AND credits_remaining > 0",
                saveDebitCts.Token);

            if (affected == 0)
            {
                logger.LogWarning("[ASYNC] Débito não aplicado (sem créditos) para userId {UserId}.", authenticatedUserId.Value);
                return Results.Problem(
                    title: "Sem créditos de análise",
                    detail: "Você não tem créditos disponíveis. Adquira mais créditos para continuar.",
                    statusCode: StatusCodes.Status402PaymentRequired);
            }
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                using var retryDebitCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                retryDebitCts.CancelAfter(TimeSpan.FromSeconds(6));
                var retryAffected = await dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE user_credits SET credits_remaining = credits_remaining - 1, updated_at = NOW() WHERE user_id = {authenticatedUserId.Value} AND credits_remaining > 0",
                    retryDebitCts.Token);

                if (retryAffected == 0)
                {
                    logger.LogWarning("[ASYNC] Débito não aplicado no retry para userId {UserId}.", authenticatedUserId.Value);
                    return Results.Problem(
                        title: "Sem créditos de análise",
                        detail: "Você não tem créditos disponíveis. Adquira mais créditos para continuar.",
                        statusCode: StatusCodes.Status402PaymentRequired);
                }
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning("[ASYNC] Credit debit timed out after retry for userId {UserId}.", authenticatedUserId.Value);
                return Results.Problem(
                    title: "Banco de dados lento",
                    detail: "Não foi possível iniciar a análise agora. Tente novamente em alguns segundos.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }
            catch (Exception retryEx)
            {
                logger.LogError(retryEx, "[ASYNC] Credit debit retry failed for userId {UserId}.", authenticatedUserId.Value);
                return Results.Problem(
                    title: "Banco de dados lento",
                    detail: "Não foi possível iniciar a análise agora. Tente novamente em alguns segundos.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }
        }

        logger.LogInformation("[ASYNC] Crédito debitado para userId {UserId}.", authenticatedUserId.Value);
        request.UserId = authenticatedUserId.Value.ToString();

        var jobId = Guid.NewGuid();
        AnalysisJobStore.Set(jobId, new AnalysisJob("processing", authenticatedUserId.Value));

        _ = Task.Run(async () =>
        {
            logger.LogInformation("[ASYNC] Background job {JobId} started.", jobId);
            await using var scope = scopeFactory.CreateAsyncScope();
            var bgService = scope.ServiceProvider.GetRequiredService<IAnalysisService>();
            try
            {
                var result = await bgService.CreateQuickAnalysisAsync(request, CancellationToken.None);

                // Rotina estruturada (com produtos) apenas para usuários premium
                var bgDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var now = DateTime.UtcNow;
                var isPremium = await bgDb.Subscriptions.AnyAsync(
                    s => s.UserId == authenticatedUserId.Value
                        && (s.PlanKey == "monthly" || s.PlanKey == "annual" || s.PlanKey == "quarterly" || s.PlanKey == "test")
                        && s.Status == "active"
                        && (s.ExpiresAtUtc == null || s.ExpiresAtUtc > now),
                    CancellationToken.None);

                AnalysisResponseDto finalResult;
                if (isPremium)
                {
                    finalResult = await bgService.BuildRoutineAsync(result.Id, CancellationToken.None);
                    logger.LogInformation("[ASYNC] Routine built for premium userId {UserId}.", authenticatedUserId.Value);
                }
                else
                {
                    finalResult = result;
                    logger.LogInformation("[ASYNC] Skipping routine build for free userId {UserId}.", authenticatedUserId.Value);
                }

                AnalysisJobStore.Complete(jobId, finalResult);

                cache.Remove($"user_credits_{authenticatedUserId.Value}");
                cache.Remove($"profile_summary_{authenticatedUserId.Value}");
                cache.Remove($"dashboard_{authenticatedUserId.Value}");
                cache.Remove($"analysis_summary_{authenticatedUserId.Value}_20_0");

                logger.LogInformation("[ASYNC] Job {JobId} completed for userId {UserId}.", jobId, authenticatedUserId.Value);
            }
            catch (ArgumentException ex)
            {
                AnalysisJobStore.Fail(jobId, ex.Message);
                try
                {
                    var refundDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    await refundDb.Database.ExecuteSqlInterpolatedAsync(
                        $"UPDATE user_credits SET credits_remaining = credits_remaining + 1, updated_at = NOW() WHERE user_id = {authenticatedUserId.Value}");
                }
                catch (Exception refundEx)
                {
                    logger.LogError(refundEx, "[ASYNC] Falha ao estornar crédito para userId {UserId}.", authenticatedUserId.Value);
                }
                logger.LogWarning("[ASYNC] Job {JobId} rejected: {Message}", jobId, ex.Message);
            }
            catch (Exception ex)
            {
                var errorMessage = string.IsNullOrWhiteSpace(ex.Message) || ex.Message.Length > 220
                    ? "Não foi possível concluir a análise. Tente novamente."
                    : ex.Message;

                AnalysisJobStore.Fail(jobId, errorMessage);
                try
                {
                    var refundDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    await refundDb.Database.ExecuteSqlInterpolatedAsync(
                        $"UPDATE user_credits SET credits_remaining = credits_remaining + 1, updated_at = NOW() WHERE user_id = {authenticatedUserId.Value}");
                }
                catch (Exception refundEx)
                {
                    logger.LogError(refundEx, "[ASYNC] Falha ao estornar crédito para userId {UserId}.", authenticatedUserId.Value);
                }
                logger.LogError(ex, "[ASYNC] Job {JobId} failed for userId {UserId}.", jobId, authenticatedUserId.Value);
            }
        });

        return Results.Accepted($"/analysis/{jobId}/status", new { id = jobId, status = "processing" });
    }
}
