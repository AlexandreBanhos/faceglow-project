using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Dapper;
using System.Text.Json;
using Npgsql;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Endpoints;
using SkinAnalysis.Api.Models;
using SkinAnalysis.Api.Options;
using SkinAnalysis.Api.Services;

LoadLocalEnvironmentFiles();

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

// Suppress detailed credential logging in production
var mercadopagoAccessToken = builder.Configuration["MercadoPago:AccessToken"];
var mercadopagoUseLive = builder.Configuration["MercadoPago:UseLiveCredentials"];
var mercadopagoTestToken = builder.Configuration["MercadoPago:AccessTokenTest"];

var portValue = builder.Configuration["PORT"];
if (int.TryParse(portValue, out var port) && port > 0)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();

        if (allowedOrigins is { Length: > 0 })
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
            return;
        }

        policy.SetIsOriginAllowed(origin =>
            Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
            (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || uri.Host == "127.0.0.1"))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var supabaseUrl = builder.Configuration["Supabase:Url"]?.Trim().TrimEnd('/');
var jwtAudience = builder.Configuration["Supabase:JwtAudience"]?.Trim();

if (string.IsNullOrWhiteSpace(supabaseUrl))
{
    throw new InvalidOperationException("Supabase:Url must be configured to validate JWT tokens.");
}

var jwtIssuer = $"{supabaseUrl}/auth/v1";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = jwtIssuer;
        options.RequireHttpsMetadata = builder.Environment.IsProduction();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = builder.Environment.IsProduction(),
            ValidIssuer = jwtIssuer,
            ValidateAudience = false,
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();

builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection(GeminiOptions.SectionName));

builder.Services.AddHttpClient("Gemini", client =>
{
    client.Timeout = TimeSpan.FromSeconds(35); // 30s per-request CTS + 5s buffer
});

builder.Services.AddHttpClient("MercadoPago", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddHttpClient("Stripe", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddMemoryCache();

var dbCommandTimeoutSeconds = builder.Configuration.GetValue<int?>("Database:CommandTimeoutSeconds") ?? 60;
var dbMaxRetryCount = builder.Configuration.GetValue<int?>("Database:MaxRetryCount") ?? 3;
var dbConnectionTimeout = builder.Configuration.GetValue<int?>("Database:ConnectionTimeoutSeconds") ?? 60;

// Build connection string with timeout parameters
var baseConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// For Npgsql, we need to ensure connection timeout parameters are set
// Timeout is the parameter name for connection timeout in Npgsql
if (!string.IsNullOrEmpty(baseConnectionString))
{
    if (!baseConnectionString.Contains("Timeout=", StringComparison.OrdinalIgnoreCase))
    {
        baseConnectionString += $";Timeout={dbConnectionTimeout}";
    }
    // Required for Supabase Supavisor (transaction pooling mode) - prevents prepared statement errors
    if (!baseConnectionString.Contains("No Reset On Close=", StringComparison.OrdinalIgnoreCase))
    {
        baseConnectionString += ";No Reset On Close=true";
    }
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        baseConnectionString,
        npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(dbMaxRetryCount, TimeSpan.FromSeconds(1), null);
            npgsqlOptions.CommandTimeout(dbCommandTimeoutSeconds);
        }));

builder.Services.AddScoped<Database>();
builder.Services.AddScoped<IImageAnalysisService, GeminiAnalysisService>();
builder.Services.AddScoped<IBillingService, BillingService>();
builder.Services.AddScoped<ISkinAnalysisService, SkinAnalysisService>();
builder.Services.AddScoped<IRoutineService, RoutineService>();
builder.Services.AddScoped<IAnalysisService>(sp =>
{
    var analysisServiceType = Type.GetType("SkinAnalysis.Api.Services.AnalysisService, SkinAnalysis.Api")
        ?? throw new InvalidOperationException("AnalysisService type not found.");

    return (IAnalysisService)ActivatorUtilities.CreateInstance(sp, analysisServiceType);
});

builder.Services.AddScoped<ProductRecommendationEngine>();
builder.Services.AddScoped<RecommendationCacheService>();
builder.Services.AddScoped<RecommendationTelemetryService>();
builder.Services.AddScoped<RoutineBuilder>();
builder.Services.AddScoped<AdminService>();

var app = builder.Build();

// ============ PRODUCT CATALOG WARMUP ============

var slowRequestThresholdMs = app.Configuration.GetValue<int?>("Observability:SlowRequestThresholdMs") ?? 1200;

app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? string.Empty;
    if (ShouldSkipRequestTiming(path))
    {
        await next();
        return;
    }

    var startedAtUtc = DateTime.UtcNow;
    var stopwatch = System.Diagnostics.Stopwatch.StartNew();

    try
    {
        await next();
    }
    finally
    {
        stopwatch.Stop();
        var elapsedMs = stopwatch.ElapsedMilliseconds;
        if (!context.Response.HasStarted)
        {
            context.Response.Headers["X-Response-Time-Ms"] = elapsedMs.ToString();
        }

        if (elapsedMs >= slowRequestThresholdMs)
        {
            app.Logger.LogWarning(
                "Slow request: {Method} {Path} -> {StatusCode} in {ElapsedMs}ms (started {StartedAtUtc:O})",
                context.Request.Method,
                path,
                context.Response.StatusCode,
                elapsedMs,
                startedAtUtc);
        }
        else
        {
            app.Logger.LogInformation(
                "Request timing: {Method} {Path} -> {StatusCode} in {ElapsedMs}ms",
                context.Request.Method,
                path,
                context.Response.StatusCode,
                elapsedMs);
        }
    }
});


var swaggerEnabled = app.Environment.IsDevelopment() ||
    string.Equals(app.Configuration["Swagger:Enabled"], "true", StringComparison.OrdinalIgnoreCase);

if (swaggerEnabled)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Helper: Check if user is admin
async Task<bool> IsUserAdminAsync(Guid userId, AppDbContext dbContext, CancellationToken cancellationToken)
{
    return await dbContext.Users
        .Where(u => u.Id == userId)
        .Select(u => u.IsAdmin)
        .FirstOrDefaultAsync(cancellationToken);
}

app.UseCors("Frontend");

// Middleware to ensure CORS headers are applied even on errors
app.Use(async (context, next) =>
{
    // Apply CORS headers for all responses
    var origin = context.Request.Headers["Origin"].ToString();
    if (!string.IsNullOrEmpty(origin))
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        bool isAllowed = false;
        
        if (allowedOrigins is { Length: > 0 })
        {
            isAllowed = allowedOrigins.Contains(origin);
        }
        else
        {
            isAllowed = Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || uri.Host == "127.0.0.1");
        }

        if (isAllowed)
        {
            context.Response.OnStarting(() =>
            {
                context.Response.Headers["Access-Control-Allow-Origin"] = origin;
                context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
                return Task.CompletedTask;
            });
        }
    }

    await next();
});

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok", utc = DateTime.UtcNow }))
.WithName("Health")
.WithOpenApi();

app.MapGet("/health/db", async (ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var isAdmin = await IsUserAdminAsync(userId.Value, dbContext, cancellationToken);
    if (!isAdmin) return Results.Forbid();

    try
    {
        var isConnected = await dbContext.Database.CanConnectAsync(cancellationToken);
        return Results.Ok(new
        {
            status = isConnected ? "connected" : "disconnected",
            database = "PostgreSQL (Supabase)",
            timestamp = DateTime.UtcNow,
            canConnect = isConnected
        });
    }
    catch (Exception ex)
    {
        return Results.Ok(new
        {
            status = "error",
            database = "PostgreSQL (Supabase)",
            error = ex.Message,
            timestamp = DateTime.UtcNow
        });
    }
})
.RequireAuthorization()
.WithName("HealthDb")
.WithOpenApi();

app.MapGet("/test-db", async (ClaimsPrincipal user, Database db) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var result = await db.ExecuteScalarWithRetryAsync("select 1");
    return Results.Ok(result);
})
.RequireAuthorization()
.WithName("TestDb")
.WithOpenApi();

app.MapGet("/analysis/stats", async (ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var parsedUserId = GetAuthenticatedUserId(user);
    if (!parsedUserId.HasValue)
    {
        return Results.Unauthorized();
    }

    var row = await dbContext.Analyses
        .AsNoTracking()
        .Where(a => a.UserId == parsedUserId.Value)
        .GroupBy(_ => 1)
        .Select(g => new
        {
            Total = g.Count(),
            Best = g.Max(a => a.OverallScore),
        })
        .FirstOrDefaultAsync(cancellationToken);

    var totalAnalyses = row?.Total ?? 0;
    var bestScore = row?.Best ?? 0;

    // Calculate streak from routine_completions (independent of analyses)
    var streakDays = 0;
    
    try
    {
        await dbContext.Database.OpenConnectionAsync(cancellationToken);
        var connection = dbContext.Database.GetDbConnection();

        // First, get all complete days for this user (ordered DESC)
        const string getCompleteDaysSql = """
            SELECT CAST(completion_date AS DATE)
            FROM routine_completions
            WHERE user_id = @userId
              AND (morning_completed = true OR night_completed = true)
            ORDER BY completion_date DESC
            LIMIT 365
            """;

        var completeDays = await connection.QueryAsync<DateTime>(
            new CommandDefinition(getCompleteDaysSql, new { userId = parsedUserId.Value }, cancellationToken: cancellationToken));

        var completeDaysList = completeDays.ToList();
        if (completeDaysList.Any())
        {
            // Calculate streak from today going backwards
            var today = DateTime.UtcNow.Date;
            var streak = 0;
            var expectedDate = today;

            foreach (var completeDay in completeDaysList)
            {
                if (completeDay.Date == expectedDate)
                {
                    streak++;
                    expectedDate = expectedDate.AddDays(-1);
                }
                else
                {
                    break; // Streak broken
                }
            }

            streakDays = streak;
        }
    }
    catch (Exception ex)
    {
        // Log the error for debugging
        System.Diagnostics.Debug.WriteLine($"[STREAK DEBUG] Query failed: {ex.Message}");
        streakDays = 0;
    }

    return Results.Ok(new AnalysisStatsResponseDto
    {
        TotalAnalyses = totalAnalyses,
        BestScore = bestScore,
        StreakDays = streakDays,
    });
})
.WithName("GetAnalysisStats")
.WithOpenApi()
.RequireAuthorization();

app.MapGet("/analysis/credits", async (ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue)
    {
        return Results.Unauthorized();
    }

    // Try cache first (5 minute TTL)
    var cacheKey = $"user_credits_{userId.Value}";
    if (cache.TryGetValue(cacheKey, out int cachedCredits))
    {
        return Results.Ok(new { creditsRemaining = cachedCredits });
    }

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
        {
            return Results.Ok(new { creditsRemaining = staleCredits, stale = true });
        }

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

    // Cache the result for 5 minutes
    cache.Set(cacheKey, creditsRemaining.Value, TimeSpan.FromMinutes(5));

    return Results.Ok(new { creditsRemaining = creditsRemaining.Value });
})
.WithName("GetAnalysisCredits")
.WithOpenApi()
.RequireAuthorization();

// Combined profile summary endpoint (stats + credits) to reduce requests
app.MapGet("/analysis/profile-summary", async (ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache, CancellationToken cancellationToken) =>
{
    var parsedUserId = GetAuthenticatedUserId(user);
    if (!parsedUserId.HasValue)
        return Results.Unauthorized();

    var cacheKey = $"profile_summary_{parsedUserId.Value}";
    if (cache.TryGetValue(cacheKey, out var cached))
        return Results.Ok(cached);

    // EF Core DbContext não suporta queries paralelas — executar sequencialmente
    var creditsRemaining = await dbContext.UserCredits
        .AsNoTracking()
        .Where(c => c.UserId == parsedUserId.Value)
        .Select(c => (int?)c.CreditsRemaining)
        .FirstOrDefaultAsync(cancellationToken) ?? 0;

    var stats = await dbContext.Analyses
        .AsNoTracking()
        .Where(a => a.UserId == parsedUserId.Value)
        .GroupBy(_ => 1)
        .Select(g => new { Total = g.Count(), Best = g.Max(a => (int?)a.OverallScore) ?? 0 })
        .FirstOrDefaultAsync(cancellationToken);

    var result = new
    {
        stats = new AnalysisStatsResponseDto
        {
            TotalAnalyses = stats?.Total ?? 0,
            BestScore = stats?.Best ?? 0,
            StreakDays = 0,
        },
        credits = new { creditsRemaining },
    };

    cache.Set(cacheKey, result, TimeSpan.FromMinutes(2));
    return Results.Ok(result);
})
.WithName("GetProfileSummary")
.WithOpenApi();

app.MapGet("/analysis/dashboard", async (ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache, CancellationToken cancellationToken) =>
{
    var parsedUserId = GetAuthenticatedUserId(user);
    if (!parsedUserId.HasValue)
    {
        return Results.Unauthorized();
    }

    // Check cache first (1 minute TTL)
    var cacheKey = $"dashboard_{parsedUserId.Value}";
    if (cache.TryGetValue(cacheKey, out var cachedDashboard))
    {
        return Results.Ok(cachedDashboard);
    }

    // Optimized: No relationship navigation - grab only needed columns
    var latestTwo = await dbContext.Analyses
        .AsNoTracking()
        .Where(a => a.UserId == parsedUserId.Value)
        .OrderByDescending(a => a.CreatedAtUtc)
        .Take(2)
        .Select(a => new
        {
            a.Id,
            a.UserId,
            a.ImageUrl,
            a.SkinType,
            a.Summary,
            a.RoutineJson,
            a.AcneScore,
            a.OilinessScore,
            a.DarkSpotsScore,
            a.HydrationScore,
            a.SensitivityScore,
            a.OverallScore,
            a.CreatedAtUtc,
        })
        .ToListAsync(cancellationToken);

    if (latestTwo.Count == 0)
    {
        var emptyResult = new
        {
            latest = (object?)null,
            previous = (object?)null,
        };
        cache.Set(cacheKey, emptyResult, TimeSpan.FromMinutes(1));
        return Results.Ok(emptyResult);
    }

    var latest = latestTwo[0];
    var previous = latestTwo.Count > 1 ? latestTwo[1] : null;

    // Load recommendations for latest analysis (needed for routine + images in UI)
    var latestRecommendations = await dbContext.Recommendations
        .AsNoTracking()
        .Where(r => r.AnalysisId == latest.Id)
        .ToListAsync(cancellationToken);

    var result = new
    {
        latest = new AnalysisResponseDto
        {
            Id = latest.Id,
            UserId = latest.UserId,
            ImageUrl = latest.ImageUrl,
            SkinType = latest.SkinType,
            Summary = latest.Summary,
            Conditions = new AnalysisConditionsDto(),
            AdditionalRecommendations = string.Empty,
            Scores = new AnalysisScoresDto
            {
                Acne = latest.AcneScore,
                Oiliness = latest.OilinessScore,
                DarkSpots = latest.DarkSpotsScore,
                Hydration = latest.HydrationScore,
                Sensitivity = latest.SensitivityScore,
            },
            OverallScore = latest.OverallScore,
            CreatedAtUtc = latest.CreatedAtUtc,
            Routine = ParseRoutineJson(latest.RoutineJson, latestRecommendations),
            Recommendations = latestRecommendations.Select(r => new RecommendationDto
            {
                Type = r.Type,
                Product = r.Product,
                Reason = r.Description,
                ImageUrl = r.ImageUrl,
            }).ToList(),
            HasRecommendations = latestRecommendations.Any(),
        },
        previous = previous is null
            ? null
            : new
            {
                previous.Id,
                previous.OverallScore,
                previous.CreatedAtUtc,
            },
    };

    // Cache for 1 minute
    cache.Set(cacheKey, result, TimeSpan.FromMinutes(1));

    return Results.Ok(result);
})
.WithName("GetDashboardSummary")
.WithOpenApi()
.RequireAuthorization();

app.MapGet("/analysis/summary", async (ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache, int? limit, int? offset, CancellationToken cancellationToken) =>
{
    var parsedUserId = GetAuthenticatedUserId(user);
    if (!parsedUserId.HasValue)
    {
        return Results.Unauthorized();
    }

    var requestedLimit = limit.GetValueOrDefault(20);
    var safeLimit = Math.Clamp(requestedLimit, 1, 50);
    var requestedOffset = offset.GetValueOrDefault(0);
    var safeOffset = Math.Max(0, requestedOffset);

    // Cache key includes pagination parameters to avoid stale data on different pages
    var cacheKey = $"analysis_summary_{parsedUserId.Value}_{safeLimit}_{safeOffset}";
    
    // Try to get from cache first
    if (cache.TryGetValue(cacheKey, out List<AnalysisResponseDto>? cachedResponse))
    {
        return Results.Ok(cachedResponse);
    }

    // Single query: pagination + recommendation count in one go, ordered by created_at DESC
    var analyses = await dbContext.Analyses
        .AsNoTracking()
        .Where(a => a.UserId == parsedUserId.Value)
        .OrderByDescending(a => a.CreatedAtUtc)
        .Skip(safeOffset)
        .Take(safeLimit)
        .Select(a => new
        {
            a.Id,
            a.UserId,
            a.ImageUrl,
            a.SkinType,
            a.Summary,
            a.AcneActive,
            a.DarkCircles,
            a.EnlargedPores,
            a.PigmentationSpots,
            a.DryLips,
            a.AcneScore,
            a.OilinessScore,
            a.DarkSpotsScore,
            a.HydrationScore,
            a.SensitivityScore,
            a.OverallScore,
            a.CreatedAtUtc,
            RecommendationCount = a.Recommendations.Count(),
        })
        .ToListAsync(cancellationToken);

    var response = analyses.Select(analysis => new AnalysisResponseDto
    {
        Id = analysis.Id,
        UserId = analysis.UserId,
        ImageUrl = analysis.ImageUrl,
        SkinType = analysis.SkinType,
        Summary = analysis.Summary,
        Conditions = new AnalysisConditionsDto
        {
            Acne = analysis.AcneActive,
            Olheiras = analysis.DarkCircles,
            Poros = analysis.EnlargedPores,
            Manchas = analysis.PigmentationSpots,
            LabiosRessecados = analysis.DryLips
        },
        AdditionalRecommendations = string.Empty,
        Scores = new AnalysisScoresDto
        {
            Acne = analysis.AcneScore,
            Oiliness = analysis.OilinessScore,
            DarkSpots = analysis.DarkSpotsScore,
            Hydration = analysis.HydrationScore,
            Sensitivity = analysis.SensitivityScore,
        },
        OverallScore = analysis.OverallScore,
        CreatedAtUtc = analysis.CreatedAtUtc,
        Recommendations = new List<RecommendationDto>(),
        HasRecommendations = analysis.RecommendationCount > 0,
    }).ToList();

    // Cache for 3 minutes (analyses don't change often, but not too stale)
    cache.Set(cacheKey, response, TimeSpan.FromMinutes(3));

    return Results.Ok(response);
})
.WithName("GetAnalysisSummary")
.WithOpenApi()
.RequireAuthorization();

app.MapGet("/analysis/{id:guid}/status", async (Guid id, ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var parsedUserId = GetAuthenticatedUserId(user);
    if (!parsedUserId.HasValue)
    {
        return Results.Unauthorized();
    }

    var job = AnalysisJobStore.Get(id);

    if (job is null)
    {
        // Job not in memory (server restarted after dispatch) — check DB for a completed analysis.
        var persisted = await dbContext.Analyses
            .AsNoTracking()
            .Where(a => a.Id == id && a.UserId == parsedUserId.Value)
            .Include(a => a.Recommendations)
            .FirstOrDefaultAsync(cancellationToken);

        if (persisted is null)
        {
            return Results.NotFound(new { error = "Análise não encontrada." });
        }

        var completedDto = new AnalysisResponseDto
        {
            Id = persisted.Id,
            UserId = persisted.UserId,
            ImageUrl = persisted.ImageUrl,
            SkinType = persisted.SkinType,
            Summary = persisted.Summary,
            Conditions = new AnalysisConditionsDto
            {
                Acne = persisted.AcneActive,
                Olheiras = persisted.DarkCircles,
                Poros = persisted.EnlargedPores,
                Manchas = persisted.PigmentationSpots,
                LabiosRessecados = persisted.DryLips,
            },
            AdditionalRecommendations = persisted.AdditionalRecommendations,
            Scores = new AnalysisScoresDto
            {
                Acne = persisted.AcneScore,
                Oiliness = persisted.OilinessScore,
                DarkSpots = persisted.DarkSpotsScore,
                Hydration = persisted.HydrationScore,
                Sensitivity = persisted.SensitivityScore,
                Poros = persisted.Poros,
                Olheiras = persisted.Olheiras,
                LinhasFinas = persisted.LinhasFinas,
                Vermelhidao = persisted.Vermelhidao,
                EspinhasAtivas = persisted.EspinhasAtivas,
                Cravos = persisted.Cravos,
            },
            OverallScore = persisted.OverallScore,
            CreatedAtUtc = persisted.CreatedAtUtc,
            Routine = ParseRoutineJson(persisted.RoutineJson, persisted.Recommendations),
            Recommendations = persisted.Recommendations.Select(r => new RecommendationDto
            {
                Type = r.Type,
                Product = r.Product,
                Reason = r.Description,
                ImageUrl = r.ImageUrl,
            }).ToList(),
            HasRecommendations = persisted.Recommendations.Any(),
        };

        return Results.Ok(new { id, status = "completed", result = completedDto });
    }

    return job.Status switch
    {
        "processing" => Results.Ok(new { id, status = "processing", result = (object?)null, error = (string?)null }),
        "completed"  => Results.Ok(new { id, status = "completed",  result = (object?)job.Result, error = (string?)null }),
        "failed"     => Results.Ok(new { id, status = "failed",     result = (object?)null, error = job.Error }),
        _            => Results.Problem("Unknown job status."),
    };
})
.WithName("GetAnalysisJobStatus")
.WithOpenApi()
.RequireAuthorization();

// ========== SAVE CUSTOM ROUTINE ==========
app.MapPost("/analysis/{id:guid}/routine/save", async (
    Guid id,
    SaveRoutineCustomizationsRequest request,
    ClaimsPrincipal user,
    AppDbContext dbContext,
    IMemoryCache cache,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var analysis = await dbContext.Analyses
        .Where(a => a.Id == id && a.UserId == userId.Value)
        .FirstOrDefaultAsync(cancellationToken);

    if (analysis is null)
    {
        logger.LogWarning("[POST /routine/save] ❌ ANÁLISE NÃO ENCONTRADA! ID={AnalysisId}, UserId={UserId}", id, userId.Value);
        return Results.NotFound(new { error = "Análise não encontrada." });
    }

    logger.LogInformation("[POST /routine/save] ✓ Salvando customizações para análise: {AnalysisId}", id);

    analysis.CustomizationsJson = request.CustomizationsJson ?? "{}";

    dbContext.Analyses.Update(analysis);
    await dbContext.SaveChangesAsync(cancellationToken);

    // Invalidar caches do dashboard e análise para este usuário
    cache.Remove($"dashboard_{userId.Value}");
    cache.Remove($"analysis_summary_{userId.Value}_20_0");
    cache.Remove($"profile_summary_{userId.Value}");

    logger.LogInformation("[POST /routine/save] ✓ Customizações salvas: {AnalysisId}", id);

    return Results.Ok(new
    {
        message = "Rotina customizada salva com sucesso.",
        analysisId = analysis.Id,
    });
})
.WithName("SaveRoutineCustomizations")
.WithOpenApi()
.RequireAuthorization();

// ========== GET CUSTOM ROUTINE ==========
app.MapGet("/analysis/{id:guid}/routine/custom", async (
    Guid id,
    ClaimsPrincipal user,
    AppDbContext dbContext,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var analysis = await dbContext.Analyses
        .AsNoTracking()
        .Where(a => a.Id == id && a.UserId == userId.Value)
        .FirstOrDefaultAsync(cancellationToken);

    if (analysis is null)
    {
        return Results.NotFound(new { error = "Análise não encontrada." });
    }

    try
    {
        var baseRoutine = string.IsNullOrEmpty(analysis.RoutineJson)
            ? new { }
            : JsonSerializer.Deserialize<object>(analysis.RoutineJson) ?? new { };

        var customizations = string.IsNullOrEmpty(analysis.CustomizationsJson)
            ? new { }
            : JsonSerializer.Deserialize<object>(analysis.CustomizationsJson) ?? new { };

        return Results.Ok(new
        {
            baseRoutine,
            customizations,
            updatedAtUtc = analysis.CreatedAtUtc,
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[GetCustomRoutine] Erro ao processar rotina para análise {AnalysisId}", id);
        return Results.Problem("Erro ao carregar rotina customizada.");
    }
})
.WithName("GetCustomRoutine")
.WithOpenApi()
.RequireAuthorization();

// ========== GET STRUCTURED ROUTINE STEPS (with images) ==========
app.MapGet("/analysis/{id:guid}/steps", async (
    Guid id,
    ClaimsPrincipal user,
    AppDbContext dbContext,
    IMemoryCache cache,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var cacheKey = $"steps_{id}";
    if (cache.TryGetValue(cacheKey, out var cached)) return Results.Ok(cached);

    var steps = await dbContext.AnalysisRoutineSteps
        .AsNoTracking()
        .Where(s => s.AnalysisId == id && s.UserId == userId.Value && s.IsActive)
        .Include(s => s.Product)
        .Include(s => s.Recommendation)
        .OrderBy(s => s.Period)
        .ThenBy(s => s.StepOrder)
        .ToListAsync(cancellationToken);

    // Lazy populate: if no steps exist yet, generate from routine_json
    if (steps.Count == 0)
    {
        var analysis = await dbContext.Analyses
            .AsNoTracking()
            .Include(a => a.Recommendations)
            .Where(a => a.Id == id && a.UserId == userId.Value)
            .FirstOrDefaultAsync(cancellationToken);

        if (analysis is null) return Results.NotFound(new { error = "Análise não encontrada." });

        var generated = BuildStepsFromRoutineJson(analysis, analysis.Recommendations.ToList());
        if (generated.Count > 0)
        {
            dbContext.AnalysisRoutineSteps.AddRange(generated);
            await dbContext.SaveChangesAsync(cancellationToken);
            steps = generated;
            logger.LogInformation("[GET /steps] Populados {Count} passos para análise {Id}", generated.Count, id);
        }
    }

    static string? ResolveImage(SkinAnalysis.Api.Models.AnalysisRoutineStep s)
        => s.OverrideImageUrl
        ?? s.Product?.ImageUrl
        ?? s.Recommendation?.ImageUrl
        ?? s.ImageUrl;

    var dto = steps.Select(s => new
    {
        s.Id,
        s.AnalysisId,
        s.Period,
        s.StepOrder,
        s.Category,
        s.ProductId,
        s.ProductName,
        imageUrl = ResolveImage(s),
        s.Recurrence,
        s.IsExtra,
        s.IsUserAdded,
        s.SelectedTier,
        s.OverrideProductName,
        s.OverrideImageUrl,
    }).ToList();

    cache.Set(cacheKey, dto, TimeSpan.FromSeconds(30));
    return Results.Ok(dto);
})
.WithName("GetRoutineSteps")
.WithOpenApi()
.RequireAuthorization();

// ========== ADD CUSTOM ROUTINE STEP ==========
app.MapPost("/analysis/{id:guid}/steps", async (
    Guid id,
    AddRoutineStepRequest request,
    ClaimsPrincipal user,
    AppDbContext dbContext,
    IMemoryCache cache,
    CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var exists = await dbContext.Analyses.AnyAsync(a => a.Id == id && a.UserId == userId.Value, cancellationToken);
    if (!exists) return Results.NotFound(new { error = "Análise não encontrada." });

    var maxOrder = await dbContext.AnalysisRoutineSteps
        .Where(s => s.AnalysisId == id && s.Period == request.Period)
        .MaxAsync(s => (int?)s.StepOrder, cancellationToken) ?? -1;

    var step = new SkinAnalysis.Api.Models.AnalysisRoutineStep
    {
        AnalysisId = id,
        UserId = userId.Value,
        Period = request.Period,
        StepOrder = maxOrder + 1,
        Category = request.Category ?? "Personalizado",
        ProductName = request.ProductName,
        ImageUrl = request.ImageUrl,
        OverrideImageUrl = request.ImageUrl,
        Recurrence = NormalizeRecurrence(request.Recurrence) ?? "daily",
        IsUserAdded = true,
    };

    dbContext.AnalysisRoutineSteps.Add(step);
    await dbContext.SaveChangesAsync(cancellationToken);
    cache.Remove($"steps_{id}");

    return Results.Created($"/analysis/{id}/steps/{step.Id}", new { step.Id, step.Period, step.ProductName, step.Category });
})
.WithName("AddRoutineStep")
.WithOpenApi()
.RequireAuthorization();

// ========== UPDATE ROUTINE STEP (tier, product override, image) ==========
app.MapPatch("/analysis/{id:guid}/steps/{stepId:guid}", async (
    Guid id,
    Guid stepId,
    PatchRoutineStepRequest request,
    ClaimsPrincipal user,
    AppDbContext dbContext,
    IMemoryCache cache,
    CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var step = await dbContext.AnalysisRoutineSteps
        .Where(s => s.Id == stepId && s.AnalysisId == id && s.UserId == userId.Value)
        .FirstOrDefaultAsync(cancellationToken);

    if (step is null) return Results.NotFound(new { error = "Passo não encontrado." });

    if (request.SelectedTier is not null) step.SelectedTier = request.SelectedTier;
    if (request.OverrideProductName is not null) step.OverrideProductName = request.OverrideProductName;
    if (request.OverrideImageUrl is not null) step.OverrideImageUrl = request.OverrideImageUrl;
    if (request.ProductId.HasValue) step.ProductId = request.ProductId;
    step.UpdatedAt = DateTime.UtcNow;

    await dbContext.SaveChangesAsync(cancellationToken);
    cache.Remove($"steps_{id}");

    return Results.Ok(new { step.Id, step.SelectedTier, step.OverrideProductName, step.OverrideImageUrl });
})
.WithName("PatchRoutineStep")
.WithOpenApi()
.RequireAuthorization();

// ========== SOFT DELETE ROUTINE STEP ==========
app.MapDelete("/analysis/{id:guid}/steps/{stepId:guid}", async (
    Guid id,
    Guid stepId,
    ClaimsPrincipal user,
    AppDbContext dbContext,
    IMemoryCache cache,
    CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var step = await dbContext.AnalysisRoutineSteps
        .Where(s => s.Id == stepId && s.AnalysisId == id && s.UserId == userId.Value)
        .FirstOrDefaultAsync(cancellationToken);

    if (step is null) return Results.NotFound(new { error = "Passo não encontrado." });

    step.IsActive = false;
    step.UpdatedAt = DateTime.UtcNow;
    await dbContext.SaveChangesAsync(cancellationToken);
    cache.Remove($"steps_{id}");

    return Results.Ok(new { message = "Passo removido." });
})
.WithName("DeleteRoutineStep")
.WithOpenApi()
.RequireAuthorization();

app.MapGet("/analysis/{id:guid}", async (Guid id, bool? includeRecommendations, ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var parsedUserId = GetAuthenticatedUserId(user);
    if (!parsedUserId.HasValue)
    {
        return Results.Unauthorized();
    }

    var shouldIncludeRecommendations = includeRecommendations.GetValueOrDefault(true);

    IQueryable<SkinAnalysis.Api.Models.Analysis> query = dbContext.Analyses
        .AsNoTracking()
        .Where(a => a.UserId == parsedUserId.Value && a.Id == id);

    if (shouldIncludeRecommendations)
    {
        query = query
            .AsSplitQuery()
            .Include(a => a.Recommendations);
    }

    var analysis = await query.FirstOrDefaultAsync(cancellationToken);

    var analysisResponse = analysis is null
        ? null
        : new AnalysisResponseDto
        {
            Id = analysis.Id,
            UserId = analysis.UserId,
            ImageUrl = analysis.ImageUrl,
            SkinType = analysis.SkinType,
            Summary = analysis.Summary,
            Conditions = new AnalysisConditionsDto
            {
                Acne = analysis.AcneActive,
                Olheiras = analysis.DarkCircles,
                Poros = analysis.EnlargedPores,
                Manchas = analysis.PigmentationSpots,
                LabiosRessecados = analysis.DryLips
            },
            AdditionalRecommendations = analysis.AdditionalRecommendations,
            Scores = new AnalysisScoresDto
            {
                Acne = analysis.AcneScore,
                Oiliness = analysis.OilinessScore,
                DarkSpots = analysis.DarkSpotsScore,
                Hydration = analysis.HydrationScore,
                Sensitivity = analysis.SensitivityScore,
                Poros = analysis.Poros,
                Olheiras = analysis.Olheiras,
                LinhasFinas = analysis.LinhasFinas,
                Vermelhidao = analysis.Vermelhidao,
                EspinhasAtivas = analysis.EspinhasAtivas,
                Cravos = analysis.Cravos,
            },
            OverallScore = analysis.OverallScore,
            CreatedAtUtc = analysis.CreatedAtUtc,
            Recommendations = shouldIncludeRecommendations
                ? analysis.Recommendations.Select(recommendation => new RecommendationDto
                {
                    Type = recommendation.Type,
                    Product = recommendation.Product,
                    Reason = recommendation.Description,
                    ImageUrl = recommendation.ImageUrl
                }).ToList()
                : new List<RecommendationDto>(),
            HasRecommendations = analysis.Recommendations.Any(),
        };

    if (analysis is not null && analysisResponse is not null)
    {
        analysisResponse.Routine = ParseRoutineJson(
            analysis.RoutineJson,
            shouldIncludeRecommendations ? analysis.Recommendations : Enumerable.Empty<SkinAnalysis.Api.Models.Recommendation>());
    }

    return analysisResponse is null
        ? Results.NotFound(new { error = "Análise não encontrada." })
        : Results.Ok(analysisResponse);
})
.WithName("GetAnalysisById")
.WithOpenApi()
.RequireAuthorization();

app.MapPost("/health-202", () =>
{
    return Results.Accepted();
})
.WithName("Health202")
.WithOpenApi();

app.MapPost("/analysis", async (AnalysisRequestDto request, ClaimsPrincipal user, AppDbContext dbContext, IServiceScopeFactory scopeFactory, IMemoryCache cache, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    var authenticatedUserId = GetAuthenticatedUserId(user);
    if (!authenticatedUserId.HasValue)
    {
        return Results.Unauthorized();
    }

    // Débito atômico em uma única operação SQL.
    // Evita SELECT prévio de créditos, reduz latência e chance de timeout/retry transiente.
    using var saveDebitCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    saveDebitCts.CancelAfter(TimeSpan.FromSeconds(12));
    try
    {
        var affected = await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE user_credits SET credits_remaining = credits_remaining - 1, updated_at = NOW() WHERE user_id = {authenticatedUserId.Value} AND credits_remaining > 0",
            saveDebitCts.Token);

        if (affected == 0)
        {
            logger.LogWarning("[ASYNC] Débito não aplicado (sem créditos ou corrida) para userId {UserId}.", authenticatedUserId.Value);
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
                logger.LogWarning("[ASYNC] Débito não aplicado no retry (sem créditos ou corrida) para userId {UserId}.", authenticatedUserId.Value);
                return Results.Problem(
                    title: "Sem créditos de análise",
                    detail: "Você não tem créditos disponíveis. Adquira mais créditos para continuar.",
                    statusCode: StatusCodes.Status402PaymentRequired);
            }

            logger.LogInformation("[ASYNC] Crédito debitado com sucesso no retry para userId {UserId}.", authenticatedUserId.Value);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("[ASYNC] Credit debit timed out after retry (>18s) for userId {UserId}. Returning 503.", authenticatedUserId.Value);
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

    logger.LogInformation("[ASYNC] Crédito debitado com sucesso para userId {UserId}.", authenticatedUserId.Value);

    request.UserId = authenticatedUserId.Value.ToString();
    logger.LogInformation("[ASYNC] UserId set to {UserId}. Proceeding to create jobId.", request.UserId);

    var jobId = Guid.NewGuid();
    logger.LogInformation("[ASYNC] JobId created: {JobId}", jobId);
    
    AnalysisJobStore.Set(jobId, new AnalysisJob("processing"));
    logger.LogInformation("[ASYNC] Job stored in AnalysisJobStore for {JobId}", jobId);
    
    logger.LogInformation("[ASYNC] About to dispatch Task.Run() for job {JobId}...", jobId);

    // Dispatch analysis to background — response returns immediately
    _ = Task.Run(async () =>
    {
        logger.LogInformation("[ASYNC] Background job {JobId} started executing.", jobId);
        
        await using var scope = scopeFactory.CreateAsyncScope();
        var bgService = scope.ServiceProvider.GetRequiredService<IAnalysisService>();
        try
        {
            logger.LogInformation("[ASYNC] Job {JobId} calling CreateQuickAnalysisAsync...", jobId);
            var result = await bgService.CreateQuickAnalysisAsync(request, CancellationToken.None);
            logger.LogInformation("[ASYNC] Job {JobId} CreateQuickAnalysisAsync completed. Building routine for analysisId {AnalysisId}...", jobId, result.Id);
            
            // Build the routine (products and recommendations)
            var resultWithRoutine = await bgService.BuildRoutineAsync(result.Id, CancellationToken.None);
            logger.LogInformation("[ASYNC] Job {JobId} BuildRoutineAsync completed. Storing final result with routine.", jobId);
            
            AnalysisJobStore.Complete(jobId, resultWithRoutine);
            
            // Invalidate caches after analysis is completed
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
                logger.LogInformation("[ASYNC] Crédito estornado após falha de validação para userId {UserId}, job {JobId}.", authenticatedUserId.Value, jobId);
            }
            catch (Exception refundEx)
            {
                logger.LogError(refundEx, "[ASYNC] Falha ao estornar crédito após erro de validação para userId {UserId}, job {JobId}.", authenticatedUserId.Value, jobId);
            }
            logger.LogWarning("[ASYNC] Job {JobId} rejected: {Message}", jobId, ex.Message);
        }
        catch (Exception ex)
        {
            var errorMessage = string.IsNullOrWhiteSpace(ex.Message)
                ? "Não foi possível concluir a análise. Tente novamente."
                : ex.Message;

            if (errorMessage.Length > 220)
            {
                errorMessage = "Não foi possível concluir a análise. Tente novamente.";
            }

            AnalysisJobStore.Fail(jobId, errorMessage);
            try
            {
                var refundDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await refundDb.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE user_credits SET credits_remaining = credits_remaining + 1, updated_at = NOW() WHERE user_id = {authenticatedUserId.Value}");
                logger.LogInformation("[ASYNC] Crédito estornado após falha de processamento para userId {UserId}, job {JobId}.", authenticatedUserId.Value, jobId);
            }
            catch (Exception refundEx)
            {
                logger.LogError(refundEx, "[ASYNC] Falha ao estornar crédito após erro de processamento para userId {UserId}, job {JobId}.", authenticatedUserId.Value, jobId);
            }
            logger.LogError(ex, "[ASYNC] Job {JobId} failed for userId {UserId}. Exception: {ExceptionMessage}", jobId, authenticatedUserId.Value, ex.Message);
        }
    });
    
    logger.LogInformation("[ASYNC] Returning 202 Accepted for job {JobId} immediately.", jobId);

    return Results.Accepted($"/analysis/{jobId}/status", new { id = jobId, status = "processing" });
})
.WithName("CreateAnalysis")
.WithOpenApi()
.RequireAuthorization();

app.MapPost("/analysis/{id:guid}/routine", async (Guid id, ClaimsPrincipal user, AppDbContext dbContext, IServiceScopeFactory scopeFactory, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var exists = await dbContext.Analyses.AnyAsync(a => a.Id == id && a.UserId == userId.Value, cancellationToken);
    if (!exists) return Results.NotFound(new { error = "Análise não encontrada." });

    var existing = AnalysisJobStore.Get(id);
    if (existing?.Status == "processing") return Results.Accepted($"/analysis/{id}/status", new { id, routineStatus = "processing" });
    if (existing?.Status == "completed") return Results.Ok(new { id, routineStatus = "completed", result = existing.Result });

    AnalysisJobStore.Set(id, new AnalysisJob("processing"));

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
})
.WithName("BuildRoutine")
.WithOpenApi()
.RequireAuthorization();

app.MapGet("/analysis", async (ClaimsPrincipal user, AppDbContext dbContext, int? limit, int? offset, bool? includeRecommendations, CancellationToken cancellationToken) =>
{
    var parsedUserId = GetAuthenticatedUserId(user);
    if (!parsedUserId.HasValue)
    {
        return Results.Unauthorized();
    }

    var requestedLimit = limit.GetValueOrDefault(20);
    var safeLimit = Math.Clamp(requestedLimit, 1, 50);
    var requestedOffset = offset.GetValueOrDefault(0);
    var safeOffset = Math.Max(0, requestedOffset);
    var shouldIncludeRecommendations = includeRecommendations.GetValueOrDefault(false);

    List<SkinAnalysis.Api.Models.Analysis> analyses;
    if (shouldIncludeRecommendations)
    {
        analyses = await dbContext.Analyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value)
            .OrderByDescending(a => a.CreatedAtUtc)
            .Skip(safeOffset)
            .Take(safeLimit)
            .AsSplitQuery()
            .Include(a => a.Recommendations)
            .ToListAsync(cancellationToken);
    }
    else
    {
        analyses = await dbContext.Analyses
            .AsNoTracking()
            .Where(a => a.UserId == parsedUserId.Value)
            .OrderByDescending(a => a.CreatedAtUtc)
            .Skip(safeOffset)
            .Take(safeLimit)
            .ToListAsync(cancellationToken);
    }

    var response = analyses.Select(analysis => new AnalysisResponseDto
    {
        Id = analysis.Id,
        UserId = analysis.UserId,
        ImageUrl = analysis.ImageUrl,
        SkinType = analysis.SkinType,
        Summary = analysis.Summary,
        Conditions = new AnalysisConditionsDto
        {
            Acne = analysis.AcneActive,
            Olheiras = analysis.DarkCircles,
            Poros = analysis.EnlargedPores,
            Manchas = analysis.PigmentationSpots,
            LabiosRessecados = analysis.DryLips
        },
        AdditionalRecommendations = analysis.AdditionalRecommendations,
        Scores = new AnalysisScoresDto
        {
            Acne = analysis.AcneScore,
            Oiliness = analysis.OilinessScore,
            DarkSpots = analysis.DarkSpotsScore,
            Hydration = analysis.HydrationScore,
            Sensitivity = analysis.SensitivityScore,
        },
        OverallScore = analysis.OverallScore,
        CreatedAtUtc = analysis.CreatedAtUtc,
        Routine = ParseRoutineJson(
            analysis.RoutineJson,
            shouldIncludeRecommendations ? analysis.Recommendations : Enumerable.Empty<SkinAnalysis.Api.Models.Recommendation>()),
        Recommendations = shouldIncludeRecommendations
            ? analysis.Recommendations.Select(recommendation => new RecommendationDto
            {
                Type = recommendation.Type,
                Product = recommendation.Product,
                Reason = recommendation.Description,
                ImageUrl = recommendation.ImageUrl
            }).ToList()
            : new List<RecommendationDto>(),
        HasRecommendations = shouldIncludeRecommendations && analysis.Recommendations.Any(),
    }).ToList();

    return Results.Ok(response);
})
.WithName("GetAnalysesByUser")
.WithOpenApi()
.RequireAuthorization();

// v2 endpoints removed — referenced dropped skin_analysis table. Use /analysis/{id}/steps instead.

app.MapPost("/v2/analysis/routine", () => Results.StatusCode(410))
.WithName("CreateSkinAnalysisAndRoutine_Deprecated").RequireAuthorization();
app.MapPost("/v2/routines/regenerate", () => Results.StatusCode(410))
.WithName("RegenerateRoutine_Deprecated").RequireAuthorization();
app.MapGet("/v2/routines/active", () => Results.StatusCode(410))
.WithName("GetActiveRoutine_Deprecated").RequireAuthorization();
app.MapPost("/v2/routines/steps/{routineStepId:guid}/override", (Guid routineStepId) => Results.StatusCode(410))
.WithName("OverrideRoutineStep_Deprecated").RequireAuthorization();


app.MapPost("/routine/mark-complete", async (MarkRoutineCompleteRequest request, ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue)
    {
        return Results.Unauthorized();
    }

    // Use UTC date at midnight
    var todayUtc = DateTime.UtcNow.Date;
    
    // Check if record exists for today
    var existingToday = await dbContext.RoutineCompletions
        .Where(r => r.UserId == userId.Value && r.CompletionDate == todayUtc)
        .FirstOrDefaultAsync(cancellationToken);

    if (existingToday == null)
    {
        // Create new record for today
        var newRecord = new RoutineCompletion
        {
            UserId = userId.Value,
            CompletionDate = todayUtc,
            MorningCompleted = request.Period == "morning" || request.Period == "both",
            NightCompleted = request.Period == "night" || request.Period == "both",
            CreatedAtUtc = DateTime.UtcNow,
        };
        dbContext.RoutineCompletions.Add(newRecord);
        await dbContext.SaveChangesAsync(cancellationToken);
        existingToday = newRecord;
    }
    else
    {
        // Update existing record for today
        if (request.Period == "morning" || request.Period == "both")
            existingToday.MorningCompleted = true;
        
        if (request.Period == "night" || request.Period == "both")
            existingToday.NightCompleted = true;
        
        dbContext.RoutineCompletions.Update(existingToday);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    return Results.Ok(new
    {
        message = "Routine completion marked successfully",
        completionDate = todayUtc.Date,
        morningCompleted = existingToday.MorningCompleted,
        nightCompleted = existingToday.NightCompleted,
        userId = userId.Value,
    });
})
.WithName("MarkRoutineComplete")
.WithOpenApi()
.RequireAuthorization();

#if DEBUG
// DEBUG ENDPOINT - Remove after fixing token issue
app.MapGet("/billing/debug-config", (IConfiguration config) =>
{
    var token = config["MercadoPago:AccessToken"];
    var useLive = config["MercadoPago:UseLiveCredentials"];
    var env = config["ASPNETCORE_ENVIRONMENT"];
    
    return Results.Ok(new
    {
        environment = env,
        mercadopago_use_live = useLive,
        mercadopago_token_exists = !string.IsNullOrEmpty(token),
        mercadopago_token_length = token?.Length ?? 0,
        mercadopago_token_prefix = token?.Substring(0, Math.Min(30, token.Length)) ?? "EMPTY",
        timestamp = DateTime.UtcNow
    });
})
.WithName("BillingDebugConfig")
.WithOpenApi();
#endif

app.MapPost("/billing/checkout", async (BillingCheckoutRequestDto request, ClaimsPrincipal user, IBillingService billingService, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue)
    {
        return Results.Unauthorized();
    }

    var email = user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email);
    var fullName = user.FindFirstValue("name")
        ?? user.FindFirstValue("full_name")
        ?? user.FindFirstValue(ClaimTypes.Name);

    request.Email ??= email;
    request.FullName ??= fullName;

    try
    {
        var result = await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken);
        return Results.Ok(result);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        return Results.Problem(title: "Billing failed", detail: ex.Message, statusCode: StatusCodes.Status502BadGateway);
    }
})
.WithName("CreateBillingCheckout")
.WithOpenApi()
.RequireAuthorization();

app.MapPost("/billing/checkout/pix", async (ClaimsPrincipal user, IBillingService billingService, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue)
    {
        return Results.Unauthorized();
    }

    var request = new BillingCheckoutRequestDto
    {
        PlanKey = "credits",
        Gateway = "mercadopago-pix",
        Email = user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email),
        FullName = user.FindFirstValue("name") ?? user.FindFirstValue("full_name") ?? user.FindFirstValue(ClaimTypes.Name)
    };

    var result = await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken);
    return Results.Ok(result);
})
.WithName("CreateBillingCheckoutPixDefault")
.WithOpenApi()
.RequireAuthorization();

app.MapPost("/billing/checkout/stripe", async (ClaimsPrincipal user, IBillingService billingService, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue)
    {
        return Results.Unauthorized();
    }

    var request = new BillingCheckoutRequestDto
    {
        PlanKey = "monthly",
        Gateway = "stripe-card",
        Email = user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email),
        FullName = user.FindFirstValue("name") ?? user.FindFirstValue("full_name") ?? user.FindFirstValue(ClaimTypes.Name)
    };

    var result = await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken);
    return Results.Ok(result);
})
.WithName("CreateBillingCheckoutStripeDefault")
.WithOpenApi()
.RequireAuthorization();

app.MapPost("/billing/mercadopago/pix", async (BillingCheckoutRequestDto request, ClaimsPrincipal user, IBillingService billingService, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue)
    {
        return Results.Unauthorized();
    }

    request.Gateway = "mercadopago-pix";
    request.Email ??= user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email);
    request.FullName ??= user.FindFirstValue("name") ?? user.FindFirstValue("full_name") ?? user.FindFirstValue(ClaimTypes.Name);
    if (string.IsNullOrWhiteSpace(request.PlanKey))
    {
        request.PlanKey = "test";
    }

    var result = await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken);
    return Results.Ok(result);
})
.WithName("CreateMercadoPagoPixCheckout")
.WithOpenApi()
.RequireAuthorization();

app.MapPost("/billing/mercadopago/checkout", async (BillingCheckoutRequestDto request, ClaimsPrincipal user, IBillingService billingService, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue)
    {
        return Results.Unauthorized();
    }

    request.Gateway = "mercadopago-card";
    request.Email ??= user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email);
    request.FullName ??= user.FindFirstValue("name") ?? user.FindFirstValue("full_name") ?? user.FindFirstValue(ClaimTypes.Name);
    if (string.IsNullOrWhiteSpace(request.PlanKey))
    {
        request.PlanKey = "test";
    }

    var result = await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken);
    return Results.Ok(result);
})
.WithName("CreateMercadoPagoCardCheckout")
.WithOpenApi()
.RequireAuthorization();

// Get billing status for a payment (used for PIX verification)
app.MapGet("/billing/status", async (
    string? externalReference,
    string? externalId,
    string? forceRefresh,
    ClaimsPrincipal user,
    AppDbContext dbContext,
    IMemoryCache cache,
    CancellationToken cancellationToken) =>
{
    Subscription? subscription = null;
    var shouldBypassCache = forceRefresh?.Equals("true", StringComparison.OrdinalIgnoreCase) ?? false;

    // If external identifiers are provided, search by those (no cache - one-time verification)
    if (!string.IsNullOrWhiteSpace(externalReference) || !string.IsNullOrWhiteSpace(externalId))
    {
        subscription = await dbContext.Subscriptions
            .FirstOrDefaultAsync(x =>
                (!string.IsNullOrWhiteSpace(externalReference) && x.ExternalReference == externalReference)
                || (!string.IsNullOrWhiteSpace(externalId) && x.ExternalId == externalId),
                cancellationToken);
    }
    else
    {
        // Otherwise, get the current authenticated user's subscription (WITH CACHE)
        var userId = GetAuthenticatedUserId(user);
        if (!userId.HasValue)
        {
            return Results.Unauthorized();
        }

        var cacheKey = $"billing_status_{userId.Value}";
        
        // Try to get from cache first (unless forceRefresh requested)
        if (!shouldBypassCache && cache.TryGetValue(cacheKey, out Subscription? cachedSubscription))
        {
            subscription = cachedSubscription;
        }
        else
        {
            // Query database
            subscription = await dbContext.Subscriptions
                .Where(x => x.UserId == userId.Value)
                .OrderByDescending(x => x.ActivatedAtUtc ?? x.CreatedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);
            
            // Cache for 5 minutes
            if (subscription != null)
            {
                cache.Set(cacheKey, subscription, TimeSpan.FromMinutes(5));
            }
        }
    }

    if (subscription is null)
    {
        return Results.NotFound();
    }

    // A subscription is considered active if:
    // 1. Status is explicitly "active", OR
    // 2. ExpiresAtUtc is set and in the future (webhook may still be processing, but payment succeeded)
    var isActive = subscription.Status.Equals("active", StringComparison.OrdinalIgnoreCase) 
        || (subscription.ExpiresAtUtc.HasValue && subscription.ExpiresAtUtc > DateTime.UtcNow);

    return Results.Ok(new
    {
        provider = subscription.Provider ?? "unknown",
        gateway = subscription.Gateway ?? "unknown",
        planKey = subscription.PlanKey,
        planName = subscription.PlanName,
        status = subscription.Status,
        isActive,
        amountCents = subscription.AmountCents,
        currency = subscription.Currency ?? "BRL",
        activatedAtUtc = subscription.ActivatedAtUtc,
        expiresAtUtc = subscription.ExpiresAtUtc,
        externalReference = subscription.ExternalReference,
        externalId = subscription.ExternalId
    });
})
.WithName("GetBillingStatus")
.WithOpenApi()
.AllowAnonymous();

app.MapPost("/billing/webhook/mercadopago", async (
    HttpRequest request,
    AppDbContext dbContext,
    IHttpClientFactory httpClientFactory,
    IBillingService billingService,
    IMemoryCache cache,
    ILoggerFactory loggerFactory,
    CancellationToken cancellationToken) =>
{
    var logger = loggerFactory.CreateLogger("MercadoPagoWebhook");
    var requestBody = await new StreamReader(request.Body).ReadToEndAsync(cancellationToken);

    if (string.IsNullOrWhiteSpace(requestBody))
    {
        return Results.Ok(new { received = true, ignored = true });
    }

    string? paymentId;
    try
    {
        using var payloadDocument = JsonDocument.Parse(requestBody);
        var payloadRoot = payloadDocument.RootElement;
        paymentId = TryGetJsonNestedString(payloadRoot, "data", "id") ?? TryGetJsonString(payloadRoot, "id");
    }
    catch
    {
        logger.LogWarning("Mercado Pago webhook payload inválido: {Body}", requestBody);
        return Results.BadRequest(new { error = "Payload inválido." });
    }

    if (string.IsNullOrWhiteSpace(paymentId))
    {
        return Results.Ok(new { received = true, ignored = true });
    }

    string accessToken;
    try
    {
        accessToken = billingService.ResolveMercadoPagoAccessToken();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Mercado Pago token resolution failed on webhook.");
        return Results.Problem(title: "Webhook config error", detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError);
    }

    var client = httpClientFactory.CreateClient("MercadoPago");
    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

    var paymentResponse = await client.GetAsync($"https://api.mercadopago.com/v1/payments/{paymentId}", cancellationToken);
    var paymentBody = await paymentResponse.Content.ReadAsStringAsync(cancellationToken);
    if (!paymentResponse.IsSuccessStatusCode)
    {
        logger.LogError("Mercado Pago webhook lookup error {Status}: {Body}", paymentResponse.StatusCode, paymentBody);
        return Results.Problem(title: "Gateway lookup failed", detail: "Não foi possível validar o pagamento no Mercado Pago.", statusCode: StatusCodes.Status502BadGateway);
    }

    using var paymentDocument = JsonDocument.Parse(paymentBody);
    var paymentRoot = paymentDocument.RootElement;
    var externalReference = TryGetJsonString(paymentRoot, "external_reference");
    var paymentStatus = TryGetJsonString(paymentRoot, "status") ?? "pending";

    var subscription = await dbContext.Subscriptions
        .FirstOrDefaultAsync(x =>
            (!string.IsNullOrWhiteSpace(externalReference) && x.ExternalReference == externalReference)
            || x.ExternalId == paymentId,
            cancellationToken);

    if (subscription is null)
    {
        return Results.Ok(new { received = true, ignored = true });
    }

    var previousMpStatus = subscription.Status;
    subscription.ExternalId = paymentId;
    subscription.Status = MapGatewayStatus("mercadopago", paymentStatus);
    subscription.UpdatedAtUtc = DateTime.UtcNow;

    var justActivatedMp = subscription.Status.Equals("active", StringComparison.OrdinalIgnoreCase)
        && !previousMpStatus.Equals("active", StringComparison.OrdinalIgnoreCase);

    if (subscription.Status.Equals("active", StringComparison.OrdinalIgnoreCase))
    {
        subscription.ActivatedAtUtc ??= DateTime.UtcNow;
        subscription.ExpiresAtUtc ??= DateTime.UtcNow.AddDays(GetPlanAccessDays(subscription.PlanKey));
    }

    if (justActivatedMp)
    {
        await GrantCreditsAsync(dbContext, subscription.UserId, subscription.PlanKey, cancellationToken);
    }

    await dbContext.SaveChangesAsync(cancellationToken);
    
    // Invalidate billing status cache for this user
    var billingCacheKey = $"billing_status_{subscription.UserId}";
    cache.Remove(billingCacheKey);
    
    return Results.Ok(new { received = true });
})
.WithName("MercadoPagoWebhook")
.WithOpenApi();

app.MapPost("/billing/webhook/stripe", async (
    HttpRequest request,
    AppDbContext dbContext,
    IConfiguration configuration,
    IMemoryCache cache,
    ILoggerFactory loggerFactory,
    CancellationToken cancellationToken) =>
{
    var logger = loggerFactory.CreateLogger("StripeWebhook");
    var payload = await new StreamReader(request.Body).ReadToEndAsync(cancellationToken);
    if (string.IsNullOrWhiteSpace(payload))
    {
        return Results.BadRequest(new { error = "Payload vazio." });
    }

    var signature = request.Headers["Stripe-Signature"].ToString();
    var webhookSecret = configuration["Stripe:WebhookSecret"]?.Trim();

    if (!string.IsNullOrWhiteSpace(webhookSecret) && !ValidateStripeSignature(payload, signature, webhookSecret))
    {
        logger.LogWarning("Stripe webhook signature inválida.");
        return Results.Unauthorized();
    }

    JsonDocument eventDocument;
    try
    {
        eventDocument = JsonDocument.Parse(payload);
    }
    catch
    {
        return Results.BadRequest(new { error = "Payload inválido." });
    }

    using (eventDocument)
    {
        var root = eventDocument.RootElement;
        var eventType = TryGetJsonString(root, "type") ?? string.Empty;
        if (!root.TryGetProperty("data", out var dataElement) || !dataElement.TryGetProperty("object", out var objectElement))
        {
            return Results.Ok(new { received = true, ignored = true });
        }

        var externalId = TryGetJsonString(objectElement, "id") ?? string.Empty;
        var externalReference = TryGetJsonNestedString(objectElement, "metadata", "external_reference");

        var subscription = await dbContext.Subscriptions
            .FirstOrDefaultAsync(x =>
                (!string.IsNullOrWhiteSpace(externalReference) && x.ExternalReference == externalReference)
                || (!string.IsNullOrWhiteSpace(externalId) && x.ExternalId == externalId),
                cancellationToken);

        if (subscription is null)
        {
            return Results.Ok(new { received = true, ignored = true });
        }

        var previousStripeStatus = subscription.Status;
        var paymentStatus = TryGetJsonString(objectElement, "payment_status") ?? string.Empty;
        subscription.Status = eventType switch
        {
            "checkout.session.completed" when paymentStatus.Equals("paid", StringComparison.OrdinalIgnoreCase) => "active",
            "checkout.session.async_payment_succeeded" => "active",
            "checkout.session.expired" => "canceled",
            "payment_intent.payment_failed" => "canceled",
            _ => subscription.Status
        };

        var justActivatedStripe = subscription.Status.Equals("active", StringComparison.OrdinalIgnoreCase)
            && !previousStripeStatus.Equals("active", StringComparison.OrdinalIgnoreCase);

        if (!string.IsNullOrWhiteSpace(externalId))
        {
            subscription.ExternalId = externalId;
        }

        subscription.UpdatedAtUtc = DateTime.UtcNow;
        if (subscription.Status.Equals("active", StringComparison.OrdinalIgnoreCase))
        {
            subscription.ActivatedAtUtc ??= DateTime.UtcNow;
            subscription.ExpiresAtUtc ??= DateTime.UtcNow.AddDays(GetPlanAccessDays(subscription.PlanKey));
        }

        if (justActivatedStripe)
        {
            await GrantCreditsAsync(dbContext, subscription.UserId, subscription.PlanKey, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        
        // Invalidate billing status cache for this user
        var billingCacheKey = $"billing_status_{subscription.UserId}";
        cache.Remove(billingCacheKey);
    }

    return Results.Ok(new { received = true });
})
.WithName("StripeWebhook")
.WithOpenApi();

// ============================================
// ADMIN PRODUCTS ENDPOINTS
// ============================================

app.MapGet("/admin/products", async (HttpContext httpContext, ClaimsPrincipal user, AdminService adminService, AppDbContext dbContext, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    try
    {
        // Verify JWT authentication
        var userGuid = GetAuthenticatedUserId(user);
        if (!userGuid.HasValue)
        {
            logger.LogWarning("[AdminProducts] Unauthorized access attempt - no auth token");
            return Results.Unauthorized();
        }

        // Verify admin role
        var isAdmin = await IsUserAdminAsync(userGuid.Value, dbContext, cancellationToken);
        if (!isAdmin)
        {
            logger.LogWarning("[AdminProducts] Forbidden access attempt - user {UserId} not admin", userGuid);
            return Results.Forbid();
        }

        logger.LogInformation("[AdminProducts] Admin {UserId} fetching products", userGuid);
        var startTime = DateTime.UtcNow;

        var search = httpContext.Request.Query["search"].FirstOrDefault()?.Trim().ToLowerInvariant();

        var query = dbContext.Products.Where(p => !p.IsUserProduct);
        if (!string.IsNullOrEmpty(search))
            query = query.Where(p => p.Name.ToLower().Contains(search) || p.Brand.ToLower().Contains(search));

        var products = await query
            .OrderByDescending(p => p.Priority)
            .ThenByDescending(p => p.CreatedAt)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var elapsed = (DateTime.UtcNow - startTime).TotalSeconds;
        logger.LogInformation("[AdminProducts] Query completed in {elapsed}s, returning {Count} products", elapsed, products.Count);
        return Results.Ok(products);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[AdminProducts] Error: {Message}", ex.Message);
        return Results.StatusCode(500);
    }
})
.WithName("GetAdminProducts")
.WithOpenApi()
.RequireAuthorization();

app.MapPost("/admin/products", async (CreateAdminProductDto request, ClaimsPrincipal user, AppDbContext dbContext, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    var userGuid = GetAuthenticatedUserId(user);
    if (!userGuid.HasValue)
    {
        logger.LogWarning("[POST AdminProducts] Unauthorized - no auth token");
        return Results.Unauthorized();
    }

    var isAdmin = await IsUserAdminAsync(userGuid.Value, dbContext, cancellationToken);
    if (!isAdmin)
    {
        logger.LogWarning("[POST AdminProducts] Forbidden - user {UserId} not admin", userGuid);
        return Results.Forbid();
    }

    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(new { error = "Name is required" });
    }

    var product = new Product
    {
        Name = request.Name,
        Brand = request.Brand,
        Category = request.Category,
        SkinTypes = request.SkinTypes ?? Array.Empty<string>(),
        Concerns = request.Concerns ?? Array.Empty<string>(),
        Actives = request.Actives ?? Array.Empty<string>(),
        StrengthLevel = request.StrengthLevel,
        Period = request.Period ?? Array.Empty<string>(),
        PriceRange = request.PriceRange,
        PriceAvg = request.PriceAvg,
        Priority = request.Priority,
        IsActive = request.IsActive,
        ImageUrl = request.ImageUrl,
        IsUserProduct = false,
        CreatedAt = DateTime.UtcNow
    };

    dbContext.Products.Add(product);
    await dbContext.SaveChangesAsync(cancellationToken);

    var dto = new AdminProductDto(
        product.Id,
        product.Name,
        product.Brand,
        product.Category,
        product.SkinTypes,
        product.Concerns,
        product.Actives,
        product.StrengthLevel,
        product.Period,
        product.PriceRange,
        product.PriceAvg,
        product.Priority,
        product.IsActive,
        product.ImageUrl,
        product.CreatedAt
    );

    return Results.Created($"/admin/products/{product.Id}", dto);
})
.WithName("CreateAdminProduct")
.WithOpenApi()
.RequireAuthorization();

// TEST ENDPOINT: Simple PUT test
app.MapPut("/admin/products-test/{id:guid}", async (Guid id, AppDbContext dbContext, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    try
    {
        logger.LogInformation("[TEST] PUT test started at {Time}", DateTime.UtcNow);
        
        var product = await dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        logger.LogInformation("[TEST] Product fetched at {Time}, found={Found}", DateTime.UtcNow, product != null);
        
        if (product == null)
            return Results.NotFound();

        logger.LogInformation("[TEST] About to update product at {Time}", DateTime.UtcNow);
        product.Priority = product.Priority + 1;
        
        logger.LogInformation("[TEST] About to SaveChangesAsync at {Time}", DateTime.UtcNow);
        var changes = await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("[TEST] SaveChangesAsync completed at {Time}, changes={Changes}", DateTime.UtcNow, changes);
        
        logger.LogInformation("[TEST] Returning OK at {Time}", DateTime.UtcNow);
        return Results.Ok(new { id = product.Id, priority = product.Priority });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[TEST] Error at {Time}: {Message}", DateTime.UtcNow, ex.Message);
        return Results.StatusCode(500);
    }
})
.WithName("TestPutProduct")
.WithOpenApi();

app.MapPut("/admin/products/{id:guid}", async (Guid id, UpdateAdminProductDto request, ClaimsPrincipal user, AppDbContext dbContext, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    try
    {
        // Verify authentication
        var userGuid = GetAuthenticatedUserId(user);
        if (!userGuid.HasValue)
        {
            logger.LogWarning("[PUT AdminProducts] Unauthorized access - no auth token");
            return Results.Unauthorized();
        }

        // Verify admin role
        var isAdmin = await IsUserAdminAsync(userGuid.Value, dbContext, cancellationToken);
        if (!isAdmin)
        {
            logger.LogWarning("[PUT AdminProducts] Forbidden - user {UserId} not admin", userGuid);
            return Results.Forbid();
        }

        logger.LogInformation("[PUT AdminProducts] Received request for product {ProductId}", id);
        
        var product = await dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product == null)
        {
            logger.LogWarning("[PUT AdminProducts] Product {ProductId} not found", id);
            return Results.NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest(new { error = "Name is required" });
        }

        logger.LogInformation("[PUT AdminProducts] Updating product {ProductId} name from '{OldName}' to '{NewName}'", 
            id, product.Name, request.Name);
            
        product.Name = request.Name ?? product.Name;
        product.Brand = request.Brand ?? product.Brand;
        product.Category = request.Category ?? product.Category;
        product.SkinTypes = request.SkinTypes ?? product.SkinTypes;
        product.Concerns = request.Concerns ?? product.Concerns;
        product.Actives = request.Actives ?? product.Actives;
        product.StrengthLevel = request.StrengthLevel ?? product.StrengthLevel;
        product.Period = request.Period ?? product.Period;
        product.PriceRange = request.PriceRange ?? product.PriceRange;
        product.PriceAvg = request.PriceAvg ?? product.PriceAvg;
        product.Priority = request.Priority;
        product.IsActive = request.IsActive;
        product.ImageUrl = request.ImageUrl;

        logger.LogInformation("[PUT AdminProducts] Properties assigned, about to save for {ProductId}", id);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("[PUT AdminProducts] SaveChangesAsync completed for {ProductId}", id);

        logger.LogInformation("[PUT AdminProducts] Creating DTO for {ProductId}", id);
        var dto = new AdminProductDto(
            product.Id,
            product.Name,
            product.Brand,
            product.Category,
            product.SkinTypes,
            product.Concerns,
            product.Actives,
            product.StrengthLevel,
            product.Period,
            product.PriceRange,
            product.PriceAvg,
            product.Priority,
            product.IsActive,
            product.ImageUrl,
            product.CreatedAt
        );
        logger.LogInformation("[PUT AdminProducts] DTO created, returning response for {ProductId}", id);

        return Results.Ok(dto);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[PUT AdminProducts] Error: {Message}", ex.Message);
        return Results.StatusCode(500);
    }
})
.WithName("UpdateAdminProduct")
.WithOpenApi()
.RequireAuthorization();

app.MapDelete("/admin/products/{id:guid}", async (Guid id, ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userGuid = GetAuthenticatedUserId(user);
    if (!userGuid.HasValue)
    {
        return Results.Unauthorized();
    }

    var isAdmin = await IsUserAdminAsync(userGuid.Value, dbContext, cancellationToken);
    if (!isAdmin)
    {
        return Results.Forbid();
    }

    var product = await dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    if (product == null)
    {
        return Results.NotFound();
    }

    dbContext.Products.Remove(product);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.NoContent();
})
.WithName("DeleteAdminProduct")
.WithOpenApi()
.RequireAuthorization();

// Map admin endpoints (authorization, user promotion, CRUD operations)
app.MapAdminEndpoints();

// Map v2 recommendation endpoints (scoring + cache + telemetry)
app.MapRecommendationEndpoints();

// ── User Products (Meus Produtos) ────────────────────────────────────────────

app.MapGet("/products/my", async (ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var products = await dbContext.Products
        .Where(p => p.IsUserProduct && p.UserId == userId.Value)
        .OrderByDescending(p => p.CreatedAt)
        .AsNoTracking()
        .Select(p => new { p.Id, p.Name, p.Category, p.ImageUrl, note = p.Highlight, createdAt = p.CreatedAt })
        .ToListAsync(cancellationToken);

    return Results.Ok(products);
})
.WithName("GetMyProducts")
.RequireAuthorization();

app.MapPost("/products/my", async (UserProductSaveDto request, ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { error = "Name is required" });

    var product = new Product
    {
        Name = request.Name.Trim(),
        Category = request.Category?.Trim() ?? string.Empty,
        ImageUrl = request.ImageUrl?.Trim() ?? string.Empty,
        Highlight = request.Note?.Trim() ?? string.Empty,
        IsUserProduct = true,
        UserId = userId.Value,
        IsActive = true,
        CreatedAt = DateTime.UtcNow,
    };

    dbContext.Products.Add(product);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created($"/products/my/{product.Id}", new { product.Id, product.Name, product.Category, product.ImageUrl, note = product.Highlight, createdAt = product.CreatedAt });
})
.WithName("CreateMyProduct")
.RequireAuthorization();

app.MapPut("/products/my/{id:guid}", async (Guid id, UserProductSaveDto request, ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var product = await dbContext.Products.FirstOrDefaultAsync(p => p.Id == id && p.IsUserProduct && p.UserId == userId.Value, cancellationToken);
    if (product is null) return Results.NotFound();

    product.Name = request.Name?.Trim() ?? product.Name;
    product.Category = request.Category?.Trim() ?? product.Category;
    product.ImageUrl = request.ImageUrl?.Trim() ?? product.ImageUrl;
    product.Highlight = request.Note?.Trim() ?? product.Highlight;

    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Ok(new { product.Id, product.Name, product.Category, product.ImageUrl, note = product.Highlight, createdAt = product.CreatedAt });
})
.WithName("UpdateMyProduct")
.RequireAuthorization();

app.MapDelete("/products/my/{id:guid}", async (Guid id, ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();

    var product = await dbContext.Products.FirstOrDefaultAsync(p => p.Id == id && p.IsUserProduct && p.UserId == userId.Value, cancellationToken);
    if (product is null) return Results.NotFound();

    dbContext.Products.Remove(product);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.NoContent();
})
.WithName("DeleteMyProduct")
.RequireAuthorization();

app.Run();

static bool ShouldSkipRequestTiming(string path)
{
    if (string.IsNullOrWhiteSpace(path))
    {
        return true;
    }

    return path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/favicon", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/robots.txt", StringComparison.OrdinalIgnoreCase);
}

// Normaliza tags de período usadas erroneamente pelo Gemini como recorrência
// Ex: "(morning)" num item do array night → daily
static string NormalizeRecurrence(string? raw)
{
    if (string.IsNullOrWhiteSpace(raw)) return "daily";
    var lower = raw.Trim().ToLowerInvariant();
    return lower switch
    {
        "morning" or "night" or "both" => "daily",
        "daily" or "as_needed" or "weekly" => lower,
        "2x_semana" or "3x_semana" or "2x_week" or "3x_week" => lower,
        _ when lower.StartsWith("2-3x") || lower.StartsWith("3x") || lower.StartsWith("2x") => lower,
        _ => "daily",
    };
}

static AnalysisRoutineDto ParseRoutineJson(string routineJson, IEnumerable<SkinAnalysis.Api.Models.Recommendation> recommendations)
{
    if (!string.IsNullOrWhiteSpace(routineJson))
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<AnalysisRoutineDto>(routineJson) ?? new AnalysisRoutineDto();
            if (parsed.Morning.Count > 0 || parsed.Night.Count > 0)
                return parsed;
        }
        catch { /* fallback to recommendations below */ }
    }

    var morning = new List<string>();
    var night = new List<string>();
    var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    foreach (var rec in recommendations)
    {
        if (string.IsNullOrWhiteSpace(rec.Product)) continue;

        var category = string.IsNullOrWhiteSpace(rec.Type) ? "Passo" : rec.Type.Trim();
        var product = rec.Product.Trim();
        var step = $"{category}: {product}";
        var key = $"{category.ToLowerInvariant()}::{product.ToLowerInvariant()}";
        if (!seen.Add(key)) continue;

        if (category.Equals("Protetor", StringComparison.OrdinalIgnoreCase)) { morning.Add(step); continue; }
        if (category.StartsWith("Retino", StringComparison.OrdinalIgnoreCase)) { night.Add(step); continue; }
        morning.Add(step);
        night.Add(step);
    }

    return new AnalysisRoutineDto { Morning = morning, Night = night };
}

// Popula analysis_routine_steps a partir de routine_json + recommendations (chamada lazy)
static List<SkinAnalysis.Api.Models.AnalysisRoutineStep> BuildStepsFromRoutineJson(
    SkinAnalysis.Api.Models.Analysis analysis,
    List<SkinAnalysis.Api.Models.Recommendation> recommendations)
{
    var steps = new List<SkinAnalysis.Api.Models.AnalysisRoutineStep>();
    if (string.IsNullOrWhiteSpace(analysis.RoutineJson)) return steps;

    AnalysisRoutineDto? routine;
    try { routine = JsonSerializer.Deserialize<AnalysisRoutineDto>(analysis.RoutineJson); }
    catch { return steps; }
    if (routine is null) return steps;

    // Index recommendations by product name for fast lookup
    var recByName = recommendations
        .Where(r => !string.IsNullOrWhiteSpace(r.Product))
        .GroupBy(r => r.Product.Trim().ToLowerInvariant())
        .ToDictionary(g => g.Key, g => g.First());

    static (string category, string productName, string recurrence) ParseStep(string raw)
    {
        var sep = raw.IndexOf(':');
        var category = sep > 0 ? raw[..sep].Trim() : "Passo";
        var rest = sep > 0 ? raw[(sep + 1)..].Trim() : raw.Trim();

        string recurrence = "daily";
        var match = System.Text.RegularExpressions.Regex.Match(rest, @"\(([^)]+)\)\s*$");
        if (match.Success)
        {
            recurrence = match.Groups[1].Value.Trim().ToLowerInvariant();
            rest = rest[..match.Index].Trim();
        }

        return (category, rest, recurrence);
    }

    static bool IsExtraCategory(string cat)
    {
        var n = cat.ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
        n = System.Text.RegularExpressions.Regex.Replace(n, @"\p{M}", "");
        return n is "extras" or "extra" or "adicional";
    }

    void AddSteps(IList<string> rawSteps, string period)
    {
        var seenTitles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < rawSteps.Count; i++)
        {
            var (category, productName, rawRec) = ParseStep(rawSteps[i]);
            if (string.IsNullOrWhiteSpace(productName)) continue;
            if (!seenTitles.Add(productName.ToLowerInvariant())) continue;

            recByName.TryGetValue(productName.ToLowerInvariant(), out var rec);

            steps.Add(new SkinAnalysis.Api.Models.AnalysisRoutineStep
            {
                AnalysisId = analysis.Id,
                UserId = analysis.UserId,
                Period = period,
                StepOrder = i,
                Category = category,
                RecommendationId = rec?.Id,
                ProductName = productName,
                ImageUrl = rec?.ImageUrl,
                Recurrence = NormalizeRecurrence(rawRec),
                IsExtra = IsExtraCategory(category),
                IsActive = true,
            });
        }
    }

    AddSteps(routine.Morning, "morning");
    AddSteps(routine.Night, "night");
    return steps;
}

static void LoadLocalEnvironmentFiles()
{
    var currentDirectory = Directory.GetCurrentDirectory();
    
    var candidateFiles = new[]
    {
        Path.Combine(currentDirectory, ".env.local"),
        Path.Combine(currentDirectory, ".env"),
        Path.Combine(currentDirectory, ".env.local.example"),
        Path.Combine(currentDirectory, ".env.example"),
        Path.Combine(currentDirectory, "backend", "SkinAnalysis.Api", ".env.local"),
        Path.Combine(currentDirectory, "backend", "SkinAnalysis.Api", ".env"),
        Path.Combine(currentDirectory, "backend", "SkinAnalysis.Api", ".env.local.example"),
        Path.Combine(currentDirectory, "backend", "SkinAnalysis.Api", ".env.example")
    };

    foreach (var filePath in candidateFiles)
    {
        if (!File.Exists(filePath))
        {
            continue;
        }
        
        foreach (var line in File.ReadAllLines(filePath))
        {
            var trimmedLine = line.Trim();

            if (string.IsNullOrWhiteSpace(trimmedLine) || trimmedLine.StartsWith('#'))
            {
                continue;
            }

            var separatorIndex = trimmedLine.IndexOf('=');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var key = trimmedLine[..separatorIndex].Trim();
            var value = trimmedLine[(separatorIndex + 1)..].Trim();

            if (value.Length >= 2 && ((value.StartsWith('"') && value.EndsWith('"')) || (value.StartsWith('\'') && value.EndsWith('\''))))
            {
                value = value[1..^1];
            }

            if (filePath.EndsWith(".env.example", StringComparison.OrdinalIgnoreCase) &&
                key.StartsWith("ConnectionStrings__", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!string.IsNullOrWhiteSpace(key) && Environment.GetEnvironmentVariable(key) is null)
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}

static Guid? GetAuthenticatedUserId(ClaimsPrincipal user)
{
    var sub = user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(sub))
        return null;
    
    // If it's already a GUID, parse it
    if (Guid.TryParse(sub, out var parsed))
        return parsed;
    
    // In development, if sub is not a GUID, create a deterministic one from the sub value
    // This allows testing with local tokens
    var hash = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(sub));
    return new Guid(hash.AsSpan(0, 16));
}

static int GetPlanAccessDays(string? planKey) => planKey?.Trim().ToLowerInvariant() switch
{
    "monthly" => 30,
    "quarterly" => 90,
    "annual" => 365,
    "credits" => 0,
    _ => 30,
};

static int GetCreditsForPlan(string? planKey) => planKey?.Trim().ToLowerInvariant() switch
{
    "credits" => 1,
    "monthly" => 6,
    "test" => 1,
    _ => 0,
};

static async Task GrantCreditsAsync(AppDbContext dbContext, Guid userId, string planKey, CancellationToken cancellationToken)
{
    var creditsToGrant = GetCreditsForPlan(planKey);
    if (creditsToGrant <= 0)
    {
        return;
    }

    var credit = await dbContext.UserCredits
        .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

    if (credit is null)
    {
        dbContext.UserCredits.Add(new SkinAnalysis.Api.Models.UserCredit
        {
            UserId = userId,
            CreditsRemaining = creditsToGrant,
            UpdatedAt = DateTime.UtcNow,
        });
    }
    else
    {
        credit.CreditsRemaining += creditsToGrant;
        credit.UpdatedAt = DateTime.UtcNow;
    }
}

static string MapGatewayStatus(string gateway, string status)
{
    var normalizedGateway = gateway.Trim().ToLowerInvariant();
    var normalizedStatus = status.Trim().ToLowerInvariant();

    if (normalizedGateway == "mercadopago")
    {
        return normalizedStatus switch
        {
            "approved" => "active",
            "cancelled" => "canceled",
            "rejected" => "canceled",
            "refunded" => "canceled",
            "charged_back" => "canceled",
            _ => "pending"
        };
    }

    return normalizedStatus;
}

static string? TryGetJsonString(JsonElement element, string propertyName)
    => element.TryGetProperty(propertyName, out var property) ? property.GetString() : null;

static string? TryGetJsonNestedString(JsonElement element, params string[] path)
{
    var current = element;
    foreach (var segment in path)
    {
        if (!current.TryGetProperty(segment, out current))
        {
            return null;
        }
    }

    return current.ValueKind == JsonValueKind.String ? current.GetString() : current.ToString();
}

static bool ValidateStripeSignature(string payload, string stripeSignature, string secret, long toleranceInSeconds = 300)
{
    if (string.IsNullOrWhiteSpace(stripeSignature))
    {
        return false;
    }

    var parts = stripeSignature.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    var timestampPart = parts.FirstOrDefault(p => p.StartsWith("t=", StringComparison.OrdinalIgnoreCase));
    var signaturePart = parts.FirstOrDefault(p => p.StartsWith("v1=", StringComparison.OrdinalIgnoreCase));

    if (timestampPart is null || signaturePart is null)
    {
        return false;
    }

    var timestampValue = timestampPart[2..];
    var signatureValue = signaturePart[3..];
    if (!long.TryParse(timestampValue, out var timestamp))
    {
        return false;
    }

    var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    if (Math.Abs(now - timestamp) > toleranceInSeconds)
    {
        return false;
    }

    var signedPayload = $"{timestamp}.{payload}";
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload));
    var expectedSignature = Convert.ToHexString(hash).ToLowerInvariant();

    return string.Equals(expectedSignature, signatureValue, StringComparison.OrdinalIgnoreCase);
}

/// <summary>Represents the state of an in-flight or completed background analysis job.</summary>
internal sealed class AnalysisJob
{
    public string Status { get; private set; }
    public AnalysisResponseDto? Result { get; private set; }
    public string? Error { get; private set; }

    public AnalysisJob(string status, AnalysisResponseDto? result = null, string? error = null)
    {
        Status = status;
        Result = result;
        Error = error;
    }
}

/// <summary>In-memory store for background analysis jobs. Jobs are evicted after 10 minutes.</summary>
internal static class AnalysisJobStore
{
    private static readonly ConcurrentDictionary<Guid, AnalysisJob> Jobs = new();

    public static void Set(Guid id, AnalysisJob job) => Jobs[id] = job;

    public static AnalysisJob? Get(Guid id) => Jobs.TryGetValue(id, out var job) ? job : null;

    public static void Complete(Guid id, AnalysisResponseDto result)
    {
        Jobs[id] = new AnalysisJob("completed", result);
        ScheduleEviction(id, TimeSpan.FromMinutes(10));
    }

    public static void Fail(Guid id, string error)
    {
        Jobs[id] = new AnalysisJob("failed", error: error);
        ScheduleEviction(id, TimeSpan.FromMinutes(2));
    }

    private static void ScheduleEviction(Guid id, TimeSpan after)
    {
        _ = Task.Run(async () =>
        {
            await Task.Delay(after);
            Jobs.TryRemove(id, out _);
        });
    }
}

public sealed class CreateSkinAnalysisRequest
{
    public string SkinType { get; set; } = string.Empty;

    public int AcneLevel { get; set; }

    public int SensitivityLevel { get; set; }

    public bool HasDarkCircles { get; set; }

    public bool HasSpots { get; set; }
}

public sealed class OverrideRoutineStepRequest
{
    public Guid UserProductId { get; set; }
}
