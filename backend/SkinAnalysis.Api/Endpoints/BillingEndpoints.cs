using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Helpers;
using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Endpoints;

public static class BillingEndpoints
{
    public static void MapBillingEndpoints(this WebApplication app)
    {
        app.MapPost("/billing/checkout", CheckoutHandler)
            .WithName("CreateBillingCheckout").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("billing");

        app.MapPost("/billing/checkout/pix", CheckoutPixDefaultHandler)
            .WithName("CreateBillingCheckoutPixDefault").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("billing");

        app.MapPost("/billing/checkout/stripe", CheckoutStripeDefaultHandler)
            .WithName("CreateBillingCheckoutStripeDefault").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("billing");

        app.MapPost("/billing/mercadopago/pix", MercadoPagoPixHandler)
            .WithName("CreateMercadoPagoPixCheckout").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("billing");

        app.MapPost("/billing/mercadopago/checkout", MercadoPagoCheckoutHandler)
            .WithName("CreateMercadoPagoCardCheckout").WithOpenApi().RequireAuthorization()
            .RequireRateLimiting("billing");

        app.MapGet("/billing/status", GetStatusHandler)
            .WithName("GetBillingStatus").WithOpenApi().AllowAnonymous();

        app.MapPost("/billing/cancel", CancelHandler)
            .WithName("CancelBilling").WithOpenApi().RequireAuthorization();

        app.MapPost("/billing/webhook/mercadopago", MercadoPagoWebhookHandler)
            .WithName("MercadoPagoWebhook").WithOpenApi();

        app.MapPost("/billing/webhook/stripe", StripeWebhookHandler)
            .WithName("StripeWebhook").WithOpenApi();
    }

    private static async Task<IResult> CheckoutHandler(
        BillingCheckoutRequestDto request, ClaimsPrincipal user,
        IBillingService billingService, CancellationToken cancellationToken)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        request.Email ??= user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email);
        request.FullName ??= user.FindFirstValue("name") ?? user.FindFirstValue("full_name") ?? user.FindFirstValue(ClaimTypes.Name);

        try
        {
            var result = await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken);
            return Results.Ok(result);
        }
        catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return Results.Problem(title: "Billing failed", detail: ex.Message, statusCode: StatusCodes.Status502BadGateway); }
    }

    private static async Task<IResult> CheckoutPixDefaultHandler(
        ClaimsPrincipal user, IBillingService billingService, CancellationToken cancellationToken)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        var request = new BillingCheckoutRequestDto
        {
            PlanKey = "credits",
            Gateway = "mercadopago-pix",
            Email = user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email),
            FullName = user.FindFirstValue("name") ?? user.FindFirstValue("full_name") ?? user.FindFirstValue(ClaimTypes.Name),
        };
        return Results.Ok(await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken));
    }

    private static async Task<IResult> CheckoutStripeDefaultHandler(
        ClaimsPrincipal user, IBillingService billingService, CancellationToken cancellationToken)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        var request = new BillingCheckoutRequestDto
        {
            PlanKey = "monthly",
            Gateway = "stripe-card",
            Email = user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email),
            FullName = user.FindFirstValue("name") ?? user.FindFirstValue("full_name") ?? user.FindFirstValue(ClaimTypes.Name),
        };
        return Results.Ok(await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken));
    }

    private static async Task<IResult> MercadoPagoPixHandler(
        BillingCheckoutRequestDto request, ClaimsPrincipal user,
        IBillingService billingService, CancellationToken cancellationToken)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        request.Gateway = "mercadopago-pix";
        request.Email ??= user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email);
        request.FullName ??= user.FindFirstValue("name") ?? user.FindFirstValue("full_name") ?? user.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrWhiteSpace(request.PlanKey)) request.PlanKey = "test";

        return Results.Ok(await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken));
    }

    private static async Task<IResult> MercadoPagoCheckoutHandler(
        BillingCheckoutRequestDto request, ClaimsPrincipal user,
        IBillingService billingService, CancellationToken cancellationToken)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        request.Gateway = "mercadopago-card";
        request.Email ??= user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email);
        request.FullName ??= user.FindFirstValue("name") ?? user.FindFirstValue("full_name") ?? user.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrWhiteSpace(request.PlanKey)) request.PlanKey = "test";

        return Results.Ok(await billingService.CreateCheckoutAsync(userId.Value, request, cancellationToken));
    }

    private static async Task<IResult> CancelHandler(
        ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache,
        CancellationToken cancellationToken)
    {
        var userId = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userId.HasValue) return Results.Unauthorized();

        var subscription = await dbContext.Subscriptions
            .Where(x => x.UserId == userId.Value && x.Status == "active")
            .OrderByDescending(x => x.ActivatedAtUtc ?? x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (subscription is null)
            return Results.NotFound(new { error = "Nenhuma assinatura ativa encontrada." });

        subscription.Status = "canceled";
        subscription.ExpiresAtUtc = DateTime.UtcNow;
        subscription.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        cache.Remove($"billing_status_{userId.Value}");

        return Results.Ok(new { canceled = true });
    }

    private static async Task<IResult> GetStatusHandler(
        string? externalReference, string? externalId, string? forceRefresh,
        ClaimsPrincipal user, AppDbContext dbContext, IMemoryCache cache,
        CancellationToken cancellationToken)
    {
        SkinAnalysis.Api.Models.Subscription? subscription = null;
        var shouldBypassCache = forceRefresh?.Equals("true", StringComparison.OrdinalIgnoreCase) ?? false;

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
            var userId = EndpointHelpers.GetAuthenticatedUserId(user);
            if (!userId.HasValue) return Results.Unauthorized();

            var cacheKey = $"billing_status_{userId.Value}";
            if (!shouldBypassCache && cache.TryGetValue(cacheKey, out SkinAnalysis.Api.Models.Subscription? cachedSubscription))
            {
                subscription = cachedSubscription;
            }
            else
            {
                subscription = await dbContext.Subscriptions
                    .Where(x => x.UserId == userId.Value)
                    .OrderByDescending(x => x.ActivatedAtUtc ?? x.CreatedAtUtc)
                    .FirstOrDefaultAsync(cancellationToken);

                if (subscription != null)
                    cache.Set(cacheKey, subscription, TimeSpan.FromMinutes(5));
            }
        }

        if (subscription is null) return Results.NotFound();

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
            externalId = subscription.ExternalId,
        });
    }

    private static async Task<IResult> MercadoPagoWebhookHandler(
        HttpRequest request, AppDbContext dbContext, IHttpClientFactory httpClientFactory,
        IBillingService billingService, IMemoryCache cache,
        SkinAnalysis.Api.Services.AffiliateService affiliateService,
        IServiceScopeFactory scopeFactory,
        ILoggerFactory loggerFactory, CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("MercadoPagoWebhook");
        var requestBody = await new StreamReader(request.Body).ReadToEndAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(requestBody))
            return Results.Ok(new { received = true, ignored = true });

        string? paymentId;
        try
        {
            using var payloadDocument = JsonDocument.Parse(requestBody);
            var payloadRoot = payloadDocument.RootElement;
            paymentId = EndpointHelpers.TryGetJsonNestedString(payloadRoot, "data", "id")
                ?? EndpointHelpers.TryGetJsonString(payloadRoot, "id");
        }
        catch
        {
            logger.LogWarning("Mercado Pago webhook payload inválido: {Body}", requestBody);
            return Results.BadRequest(new { error = "Payload inválido." });
        }

        if (string.IsNullOrWhiteSpace(paymentId))
            return Results.Ok(new { received = true, ignored = true });

        string accessToken;
        try { accessToken = billingService.ResolveMercadoPagoAccessToken(); }
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
            return Results.Problem(title: "Gateway lookup failed", detail: "Não foi possível validar o pagamento.", statusCode: StatusCodes.Status502BadGateway);
        }

        using var paymentDocument = JsonDocument.Parse(paymentBody);
        var paymentRoot = paymentDocument.RootElement;
        var externalReference = EndpointHelpers.TryGetJsonString(paymentRoot, "external_reference");
        var paymentStatus = EndpointHelpers.TryGetJsonString(paymentRoot, "status") ?? "pending";

        var subscription = await dbContext.Subscriptions
            .FirstOrDefaultAsync(x =>
                (!string.IsNullOrWhiteSpace(externalReference) && x.ExternalReference == externalReference)
                || x.ExternalId == paymentId,
                cancellationToken);

        if (subscription is null) return Results.Ok(new { received = true, ignored = true });

        var previousStatus = subscription.Status;
        subscription.ExternalId = paymentId;
        subscription.Status = EndpointHelpers.MapGatewayStatus("mercadopago", paymentStatus);
        subscription.UpdatedAtUtc = DateTime.UtcNow;

        var justActivated = subscription.Status.Equals("active", StringComparison.OrdinalIgnoreCase)
            && !previousStatus.Equals("active", StringComparison.OrdinalIgnoreCase);

        if (subscription.Status.Equals("active", StringComparison.OrdinalIgnoreCase))
        {
            subscription.ActivatedAtUtc ??= DateTime.UtcNow;
            subscription.ExpiresAtUtc ??= DateTime.UtcNow.AddDays(EndpointHelpers.GetPlanAccessDays(subscription.PlanKey));
        }

        if (justActivated)
        {
            await EndpointHelpers.GrantCreditsAsync(dbContext, subscription.UserId, subscription.PlanKey, cancellationToken);
            await affiliateService.RecordConversionAsync(subscription.Id, subscription.UserId, subscription.PlanKey, subscription.AmountCents, cancellationToken);
            _ = TriggerRoutineGenerationAsync(scopeFactory, subscription.UserId, loggerFactory);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        cache.Remove($"billing_status_{subscription.UserId}");

        return Results.Ok(new { received = true });
    }

    private static async Task<IResult> StripeWebhookHandler(
        HttpRequest request, AppDbContext dbContext, IConfiguration configuration,
        IMemoryCache cache, SkinAnalysis.Api.Services.AffiliateService affiliateService,
        IServiceScopeFactory scopeFactory,
        ILoggerFactory loggerFactory, CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("StripeWebhook");
        var payload = await new StreamReader(request.Body).ReadToEndAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(payload))
            return Results.BadRequest(new { error = "Payload vazio." });

        var signature = request.Headers["Stripe-Signature"].ToString();
        var webhookSecret = configuration["Stripe:WebhookSecret"]?.Trim();

        if (!string.IsNullOrWhiteSpace(webhookSecret) && !EndpointHelpers.ValidateStripeSignature(payload, signature, webhookSecret))
        {
            logger.LogWarning("Stripe webhook signature inválida.");
            return Results.Unauthorized();
        }

        JsonDocument eventDocument;
        try { eventDocument = JsonDocument.Parse(payload); }
        catch { return Results.BadRequest(new { error = "Payload inválido." }); }

        using (eventDocument)
        {
            var root = eventDocument.RootElement;
            var eventType = EndpointHelpers.TryGetJsonString(root, "type") ?? string.Empty;
            if (!root.TryGetProperty("data", out var dataElement) || !dataElement.TryGetProperty("object", out var objectElement))
                return Results.Ok(new { received = true, ignored = true });

            var externalId = EndpointHelpers.TryGetJsonString(objectElement, "id") ?? string.Empty;
            var externalReference = EndpointHelpers.TryGetJsonNestedString(objectElement, "metadata", "external_reference");

            var subscription = await dbContext.Subscriptions
                .FirstOrDefaultAsync(x =>
                    (!string.IsNullOrWhiteSpace(externalReference) && x.ExternalReference == externalReference)
                    || (!string.IsNullOrWhiteSpace(externalId) && x.ExternalId == externalId),
                    cancellationToken);

            if (subscription is null) return Results.Ok(new { received = true, ignored = true });

            var previousStatus = subscription.Status;
            var paymentStatus = EndpointHelpers.TryGetJsonString(objectElement, "payment_status") ?? string.Empty;
            subscription.Status = eventType switch
            {
                "checkout.session.completed" when paymentStatus.Equals("paid", StringComparison.OrdinalIgnoreCase) => "active",
                "checkout.session.async_payment_succeeded" => "active",
                "checkout.session.expired" => "canceled",
                "payment_intent.payment_failed" => "canceled",
                _ => subscription.Status,
            };

            var justActivated = subscription.Status.Equals("active", StringComparison.OrdinalIgnoreCase)
                && !previousStatus.Equals("active", StringComparison.OrdinalIgnoreCase);

            if (!string.IsNullOrWhiteSpace(externalId)) subscription.ExternalId = externalId;
            subscription.UpdatedAtUtc = DateTime.UtcNow;

            if (subscription.Status.Equals("active", StringComparison.OrdinalIgnoreCase))
            {
                subscription.ActivatedAtUtc ??= DateTime.UtcNow;
                subscription.ExpiresAtUtc ??= DateTime.UtcNow.AddDays(EndpointHelpers.GetPlanAccessDays(subscription.PlanKey));
            }

            if (justActivated)
            {
                await EndpointHelpers.GrantCreditsAsync(dbContext, subscription.UserId, subscription.PlanKey, cancellationToken);
                await affiliateService.RecordConversionAsync(subscription.Id, subscription.UserId, subscription.PlanKey, subscription.AmountCents, cancellationToken);
                _ = TriggerRoutineGenerationAsync(scopeFactory, subscription.UserId, loggerFactory);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            cache.Remove($"billing_status_{subscription.UserId}");
        }

        return Results.Ok(new { received = true });
    }

    private static Task TriggerRoutineGenerationAsync(IServiceScopeFactory scopeFactory, Guid userId, ILoggerFactory loggerFactory)
    {
        return Task.Run(async () =>
        {
            var logger = loggerFactory.CreateLogger("PremiumRoutineGen");
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var routineGen = scope.ServiceProvider.GetRequiredService<SkinAnalysis.Api.Services.RoutineGeneratorService>();

                var profile = await db.SkinProfiles
                    .Where(p => p.UserId == userId && p.IsCurrent)
                    .OrderByDescending(p => p.CreatedAt)
                    .FirstOrDefaultAsync();

                if (profile is null)
                {
                    logger.LogInformation("[RoutineGen] No profile for user {UserId} — skipping", userId);
                    return;
                }

                var hasRoutine = await db.Routines.AnyAsync(r => r.UserId == userId && r.IsActive);
                if (hasRoutine)
                {
                    logger.LogInformation("[RoutineGen] User {UserId} already has routine — skipping on renewal", userId);
                    return;
                }

                await routineGen.GenerateForProfileAsync(profile);
                logger.LogInformation("[RoutineGen] Routine generated for user {UserId}", userId);

                try
                {
                    var push = scope.ServiceProvider.GetRequiredService<SkinAnalysis.Api.Services.PushNotificationService>();
                    await push.SendToUserAsync(userId,
                        "Sua rotina está pronta! ✨",
                        "Geramos uma rotina personalizada com os melhores produtos para o seu tipo de pele.",
                        "/routine", "routine_ready");
                }
                catch (InvalidOperationException) { }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[RoutineGen] Falha ao gerar rotina para user {UserId}", userId);
            }
        });
    }
}
