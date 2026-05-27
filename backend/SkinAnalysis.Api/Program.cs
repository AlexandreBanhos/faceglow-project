using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Dapper;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Endpoints;
using SkinAnalysis.Api.Helpers;
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

// Proteção global contra referências circulares na serialização JSON
builder.Services.ConfigureHttpJsonOptions(opts =>
{
    opts.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    opts.SerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
});

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
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
            ValidAudience = string.IsNullOrWhiteSpace(jwtAudience) ? null : jwtAudience,
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

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("analysis", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirst("sub")?.Value
                ?? httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 2,
            }));

    options.AddPolicy("billing", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirst("sub")?.Value
                ?? httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
            }));

    options.AddPolicy("public", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
            }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Muitas requisições. Tente novamente em alguns instantes." }, token);
    };
});

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
builder.Services.AddScoped<RoutineGeneratorService>();
builder.Services.AddScoped<RoutineSuggestionService>();
builder.Services.AddScoped<IAnalysisService, AnalysisService>();
builder.Services.AddScoped<AdminService>();
builder.Services.AddScoped<ProductEnrichmentService>();
builder.Services.AddScoped<PushNotificationService>();
builder.Services.AddScoped<AffiliateService>();
builder.Services.AddHostedService<NotificationSchedulerService>();

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
        if (!context.Response.HasStarted && !app.Environment.IsProduction())
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

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-XSS-Protection"] = "0";
    if (context.Request.IsHttps)
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

    var path = context.Request.Path.Value ?? "";
    if (path.StartsWith("/billing", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/analysis/credits", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/analysis/dashboard", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/analysis/stats", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.Headers["Cache-Control"] = "no-store";
    }

    await next();
});

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// â”€â”€ Health â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.MapGet("/health", () => Results.Ok(new { status = "ok", utc = DateTime.UtcNow }))
.WithName("Health")
.WithOpenApi();

app.MapGet("/health/db", async (ClaimsPrincipal user, AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = EndpointHelpers.GetAuthenticatedUserId(user);
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

#if DEBUG
app.MapGet("/test-db", async (ClaimsPrincipal user, AppDbContext dbContext, Database db, CancellationToken cancellationToken) =>
{
    var userId = EndpointHelpers.GetAuthenticatedUserId(user);
    if (!userId.HasValue) return Results.Unauthorized();
    if (!await IsUserAdminAsync(userId.Value, dbContext, cancellationToken)) return Results.Forbid();
    var result = await db.ExecuteScalarWithRetryAsync("select 1");
    return Results.Ok(result);
})
.RequireAuthorization()
.WithName("TestDb")
.WithOpenApi();
#endif

// ── Externalized endpoints ────────────────────────────────────────────────
app.MapAnalysisEndpoints();
app.MapBillingEndpoints();
app.MapProductEndpoints();
app.MapRoutineEndpoints();
app.MapAdminEndpoints();
app.MapRoutineStepEndpoints();
app.MapRoutineCompletionEndpoints();
app.MapUserProductEndpoints();
app.MapSuggestionEndpoints();
app.MapNotificationEndpoints();
app.MapAffiliateEndpoints();
app.MapQuizEndpoints();

// ── Lifestyle refinement ─────────────────────────────────────────────────────
app.MapPut("/profile/lifestyle", async (
    LifestyleUpdateRequest dto,
    HttpContext ctx,
    AppDbContext db,
    RoutineGeneratorService routineEngine,
    RoutineSuggestionService suggestionService,
    CancellationToken ct) =>
{
    var userId = EndpointHelpers.GetAuthenticatedUserId(ctx.User);
    if (userId is null)
        return Results.Unauthorized();

    var profile = await db.SkinProfiles
        .FirstOrDefaultAsync(p => p.UserId == userId.Value && p.IsCurrent, ct);

    if (profile is null)
        return Results.NotFound(new { detail = "Perfil não encontrado. Realize uma análise primeiro." });

    if (profile.LifestyleQuestionnaireCompletedAt.HasValue)
        return Results.Conflict(new { detail = "Questionário já respondido.", completedAt = profile.LifestyleQuestionnaireCompletedAt });

    profile.UsesMakeup    = dto.UsesMakeup;
    profile.BudgetRange   = dto.BudgetRange;
    profile.PregnancySafe = dto.PregnancySafe;
    profile.UpdatedAt     = DateTime.UtcNow;
    profile.LifestyleQuestionnaireCompletedAt = DateTime.UtcNow;

    await db.SaveChangesAsync(ct);

    if (profile.AnalysisId.HasValue)
    {
        var hasSuggestions = await suggestionService.TryGenerateSuggestionsAsync(profile.AnalysisId.Value, profile, ct);
        if (!hasSuggestions)
            await routineEngine.GenerateForProfileAsync(profile, ct);
    }
    else
    {
        await routineEngine.GenerateForProfileAsync(profile, ct);
    }

    return Results.Ok(new { success = true, completedAt = profile.LifestyleQuestionnaireCompletedAt });
});

app.MapGet("/profile/lifestyle", async (
    HttpContext ctx,
    AppDbContext db,
    CancellationToken ct) =>
{
    var userId = EndpointHelpers.GetAuthenticatedUserId(ctx.User);
    if (userId is null)
        return Results.Unauthorized();

    var profile = await db.SkinProfiles
        .AsNoTracking()
        .Where(p => p.UserId == userId.Value && p.IsCurrent)
        .Select(p => new { p.LifestyleQuestionnaireCompletedAt })
        .FirstOrDefaultAsync(ct);

    if (profile is null)
        return Results.Ok(new { questionnaireCompletedAt = (DateTime?)null });

    return Results.Ok(new { questionnaireCompletedAt = profile.LifestyleQuestionnaireCompletedAt });
}).RequireAuthorization();

// ── Account management ───────────────────────────────────────────────────────
app.MapPost("/account/deactivate", async (
    HttpContext ctx,
    AppDbContext db,
    CancellationToken ct) =>
{
    var userId = EndpointHelpers.GetAuthenticatedUserId(ctx.User);
    if (userId is null) return Results.Unauthorized();

    var user = await db.Users.FindAsync([userId.Value], ct);
    if (user is null) return Results.NotFound(new { detail = "Usuário não encontrado." });

    user.DeactivatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);

    return Results.Ok(new { success = true, deactivatedAt = user.DeactivatedAt });
}).RequireAuthorization();

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

// (NormalizeRecurrence moved to RoutineStepEndpoints.cs)

// ParseRoutineJson removed â€” routines now served from routine_steps + step_product_slots tables

// (BuildStepsFromRoutineJson moved to RoutineStepEndpoints.cs)

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