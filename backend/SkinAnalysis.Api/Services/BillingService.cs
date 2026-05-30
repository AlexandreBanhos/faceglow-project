using System.Net.Http.Headers;
using System.Text.Json;
using Dapper;
using MercadoPago.Client.Payment;
using MercadoPago.Config;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Services;

public class BillingService : IBillingService
{
    private readonly AppDbContext dbContext;
    private readonly IHttpClientFactory httpClientFactory;
    private readonly IConfiguration configuration;
    private readonly ILogger<BillingService> logger;
    private readonly IServiceScopeFactory serviceScopeFactory;

    private static readonly IReadOnlyDictionary<string, BillingPlanDefinition> Plans = new Dictionary<string, BillingPlanDefinition>(StringComparer.OrdinalIgnoreCase)
    {
        ["test"]    = new BillingPlanDefinition("test",    "Plano Teste",    100,   1),
        ["credits"] = new BillingPlanDefinition("credits", "Análise Avulsa", 490,   0),
        ["monthly"] = new BillingPlanDefinition("monthly", "Premium Mensal", 2490, 30),
        ["annual"]  = new BillingPlanDefinition("annual",  "Premium Anual",  19790, 365),
    };

    public BillingService(
        AppDbContext dbContext,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<BillingService> logger,
        IServiceScopeFactory serviceScopeFactory)
    {
        this.dbContext = dbContext;
        this.httpClientFactory = httpClientFactory;
        this.configuration = configuration;
        this.logger = logger;
        this.serviceScopeFactory = serviceScopeFactory;
    }

    public async Task<BillingCheckoutResponseDto> CreateCheckoutAsync(Guid userId, BillingCheckoutRequestDto request, CancellationToken cancellationToken)
    {
        if (!Plans.TryGetValue(request.PlanKey, out var plan))
        {
            throw new ArgumentException("Plano invalido.");
        }

        var gateway = NormalizeGateway(request.Gateway);
        var email = request.Email?.Trim();
        var fullName = request.FullName?.Trim();

        if ((gateway == "mercadopago-pix" || gateway == "mercadopago-card") && string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("E-mail é obrigatório para pagamento via Mercado Pago.");
        }

        var externalReference = $"{userId}:{plan.Key}:{DateTime.UtcNow:yyyyMMddHHmmssfff}";

        return gateway switch
        {
            "mercadopago-pix" => await CreateMercadoPagoPixAsync(userId, plan, externalReference, email!, fullName, cancellationToken),
            "mercadopago-card" => await CreateMercadoPagoCardAsync(userId, plan, externalReference, email!, fullName, cancellationToken),
            "stripe-card" => await CreateStripeCheckoutAsync(userId, plan, externalReference, email, fullName, cancellationToken),
            _ => throw new ArgumentException("Gateway de pagamento invalido.")
        };
    }

    public string? ResolveMercadoPagoWebhookSecret()
        => configuration["MercadoPago:WebhookSecret"]?.Trim();

    public string ResolveMercadoPagoAccessToken()
    {
        var isDevelopment = string.Equals(
            configuration["ASPNETCORE_ENVIRONMENT"],
            "Development",
            StringComparison.OrdinalIgnoreCase);

        var testToken = configuration["MercadoPago:AccessTokenTest"]?.Trim();
        var liveToken = configuration["MercadoPago:AccessToken"]?.Trim();
        var allowLiveCredentials = string.Equals(configuration["MercadoPago:UseLiveCredentials"], "true", StringComparison.OrdinalIgnoreCase);

        logger.LogInformation("[MercadoPago] isDevelopment={isDev}, allowLive={allowLive}", isDevelopment, allowLiveCredentials);
        logger.LogInformation("[MercadoPago] testToken exists={testExists}, liveToken exists={liveExists}", 
            !string.IsNullOrWhiteSpace(testToken), !string.IsNullOrWhiteSpace(liveToken));
        logger.LogInformation("[MercadoPago] testToken length={testLen}, liveToken length={liveLen}", 
            testToken?.Length ?? 0, liveToken?.Length ?? 0);

        var token = allowLiveCredentials || !isDevelopment
            ? liveToken
            : !string.IsNullOrWhiteSpace(testToken)
                ? testToken
                : liveToken;

        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Mercado Pago nao configurado. Defina MercadoPago__AccessToken.");
        }

        logger.LogInformation("[MercadoPago] Selected token length={len}, starts with={prefix}", 
            token.Length, token.Substring(0, Math.Min(30, token.Length)));

        if (isDevelopment && !allowLiveCredentials && token.StartsWith("APP_USR-", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Credencial live detectada em desenvolvimento. Configure MercadoPago__AccessTokenTest com token TEST- ou ative MercadoPago__UseLiveCredentials=true.");
        }

        return token;
    }

    private async Task<BillingCheckoutResponseDto> CreateMercadoPagoCardAsync(
        Guid userId,
        BillingPlanDefinition plan,
        string externalReference,
        string email,
        string? fullName,
        CancellationToken cancellationToken)
    {
        var accessToken = ResolveMercadoPagoAccessToken();
        var notificationUrl = configuration["MercadoPago:NotificationUrl"]?.Trim();
        var premiumSuccessUrl = configuration["Frontend:PremiumUrl"]?.Trim();
        var premiumCancelUrl = configuration["Frontend:PremiumCancelUrl"]?.Trim();
        var premiumPendingUrl = configuration["Frontend:PremiumPendingUrl"]?.Trim();

        var payload = new
        {
            items = new[]
            {
                new
                {
                    title = $"FaceGlow Premium - {plan.Name}",
                    quantity = 1,
                    unit_price = plan.AmountCents / 100m,
                    currency_id = "BRL"
                }
            },
            payer = new
            {
                email,
                name = GetFirstName(fullName),
                surname = GetLastName(fullName)
            },
            payment_methods = new
            {
                excluded_payment_types = new[] { new { id = "ticket" }, new { id = "bank_transfer" }, new { id = "atm" } }
            },
            external_reference = externalReference,
            notification_url = string.IsNullOrWhiteSpace(notificationUrl) ? null : notificationUrl,
            auto_return = "approved",
            back_urls = new
            {
                success = string.IsNullOrWhiteSpace(premiumSuccessUrl) ? null : AppendQueryParams(premiumSuccessUrl, new Dictionary<string, string>
                {
                    ["external_reference"] = externalReference,
                    ["gateway"] = "mercadopago-card",
                    ["plan"] = plan.Key
                }),
                failure = string.IsNullOrWhiteSpace(premiumCancelUrl) ? null : AppendQueryParams(premiumCancelUrl, new Dictionary<string, string>
                {
                    ["external_reference"] = externalReference,
                    ["gateway"] = "mercadopago-card",
                    ["plan"] = plan.Key
                }),
                pending = string.IsNullOrWhiteSpace(premiumPendingUrl) ? null : AppendQueryParams(premiumPendingUrl, new Dictionary<string, string>
                {
                    ["external_reference"] = externalReference,
                    ["gateway"] = "mercadopago-card",
                    ["plan"] = plan.Key
                })
            },
            metadata = new Dictionary<string, object>
            {
                ["user_id"] = userId.ToString(),
                ["plan_key"] = plan.Key,
                ["gateway"] = "mercadopago-card"
            }
        };

        var client = httpClientFactory.CreateClient("MercadoPago");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await client.PostAsync(
            "https://api.mercadopago.com/checkout/preferences",
            new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json"),
            cancellationToken);

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Mercado Pago card checkout error {Status}: {Body}", response.StatusCode, responseBody);
            throw new InvalidOperationException("Nao foi possivel iniciar o checkout de cartão no Mercado Pago.");
        }

        using var document = JsonDocument.Parse(responseBody);
        var root = document.RootElement;
        var externalId = TryGetString(root, "id") ?? string.Empty;
        var checkoutUrl = TryGetString(root, "init_point") ?? string.Empty;

        ScheduleSave(new Subscription
        {
            UserId = userId,
            Provider = "mercadopago",
            Gateway = "mercadopago-card",
            PlanKey = plan.Key,
            PlanName = plan.Name,
            Status = "pending",
            ExternalReference = externalReference,
            ExternalId = externalId,
            CheckoutUrl = checkoutUrl,
            AmountCents = plan.AmountCents,
            Currency = "BRL",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(24),
            UpdatedAtUtc = DateTime.UtcNow,
        });

        return new BillingCheckoutResponseDto
        {
            Provider = "mercadopago",
            Gateway = "mercadopago-card",
            PlanKey = plan.Key,
            PlanName = plan.Name,
            Status = "pending",
            AmountCents = plan.AmountCents,
            Currency = "BRL",
            CheckoutUrl = checkoutUrl,
            ExternalReference = externalReference,
            ExternalId = externalId,
            ExpiresAtUtc = DateTime.UtcNow.AddHours(24),
        };
    }

    private async Task<BillingCheckoutResponseDto> CreateMercadoPagoPixAsync(
        Guid userId,
        BillingPlanDefinition plan,
        string externalReference,
        string email,
        string? fullName,
        CancellationToken cancellationToken)
    {
        var token = ResolveMercadoPagoAccessToken();
        logger.LogInformation("[PIX] Token resolved: {tokenLen} chars", token?.Length ?? 0);

        var notificationUrl = configuration["MercadoPago:NotificationUrl"]?.Trim();

        try
        {
            MercadoPagoConfig.AccessToken = token;
            logger.LogInformation("[PIX] MercadoPagoConfig.AccessToken set to {len} chars", token?.Length ?? 0);

            var paymentClient = new PaymentClient();
            var paymentRequest = new PaymentCreateRequest
            {
                TransactionAmount = plan.AmountCents / 100m,
                Description = $"FaceGlow Premium - {plan.Name}",
                PaymentMethodId = "pix",
                ExternalReference = externalReference,
                Payer = new PaymentPayerRequest
                {
                    Email = email,
                    FirstName = GetFirstName(fullName),
                    LastName = GetLastName(fullName)
                },
                Metadata = new Dictionary<string, object>
                {
                    ["user_id"] = userId.ToString(),
                    ["plan_key"] = plan.Key
                }
            };

            if (!string.IsNullOrWhiteSpace(notificationUrl))
            {
                paymentRequest.NotificationUrl = notificationUrl;
            }

            logger.LogInformation("[PIX] Creating payment for {email} with amount {amount}", email, plan.AmountCents / 100m);
            
            var payment = await paymentClient.CreateAsync(paymentRequest);
            logger.LogInformation("[PIX] Payment created: {id}", payment.Id);

            var externalId = Convert.ToString(payment.Id) ?? string.Empty;
            var status = payment.Status ?? "pending";
            var checkoutUrl = payment.PointOfInteraction?.TransactionData?.TicketUrl ?? string.Empty;
            var qrCode = payment.PointOfInteraction?.TransactionData?.QrCode ?? string.Empty;
            var qrCodeBase64 = payment.PointOfInteraction?.TransactionData?.QrCodeBase64 ?? string.Empty;

            ScheduleSave(new Subscription
            {
                UserId = userId,
                Provider = "mercadopago",
                Gateway = "mercadopago-pix",
                PlanKey = plan.Key,
                PlanName = plan.Name,
                Status = status,
                ExternalReference = externalReference,
                ExternalId = externalId,
                CheckoutUrl = checkoutUrl,
                PixQrCode = qrCode,
                PixQrCodeBase64 = qrCodeBase64,
                AmountCents = plan.AmountCents,
                Currency = "BRL",
                ExpiresAtUtc = DateTime.UtcNow.AddHours(24),
                UpdatedAtUtc = DateTime.UtcNow,
            });

            return new BillingCheckoutResponseDto
            {
                Provider = "mercadopago",
                Gateway = "mercadopago-pix",
                PlanKey = plan.Key,
                PlanName = plan.Name,
                Status = status,
                AmountCents = plan.AmountCents,
                Currency = "BRL",
                CheckoutUrl = checkoutUrl,
                PixQrCode = qrCode,
                PixQrCodeBase64 = qrCodeBase64,
                ExternalReference = externalReference,
                ExternalId = externalId,
                ExpiresAtUtc = DateTime.UtcNow.AddHours(24),
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Mercado Pago SDK error while creating PIX checkout.");
            throw new InvalidOperationException($"Nao foi possivel iniciar o pagamento via PIX. Detalhe: {ex.Message}");
        }
    }

    private async Task<BillingCheckoutResponseDto> CreateStripeCheckoutAsync(
        Guid userId,
        BillingPlanDefinition plan,
        string externalReference,
        string? email,
        string? fullName,
        CancellationToken cancellationToken)
    {
        var secretKey = configuration["Stripe:SecretKey"]?.Trim();
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException("Stripe nao configurado. Defina Stripe__SecretKey.");
        }

        var successUrl = configuration["Stripe:SuccessUrl"]?.Trim();
        var cancelUrl = configuration["Stripe:CancelUrl"]?.Trim();
        if (string.IsNullOrWhiteSpace(successUrl) || string.IsNullOrWhiteSpace(cancelUrl))
        {
            throw new InvalidOperationException("Stripe__SuccessUrl e Stripe__CancelUrl precisam estar configurados.");
        }

        var enrichedSuccessUrl = AppendQueryParams(successUrl, new Dictionary<string, string>
        {
            ["external_reference"] = externalReference,
            ["gateway"] = "stripe-card",
            ["plan"] = plan.Key
        });
        var enrichedCancelUrl = AppendQueryParams(cancelUrl, new Dictionary<string, string>
        {
            ["external_reference"] = externalReference,
            ["gateway"] = "stripe-card",
            ["plan"] = plan.Key
        });

        var planDescription = plan.Key switch
        {
            "credits" => "1 análise facial completa com diagnóstico de pele. Incrementa seu histórico e mantém sua rotina atual — passos diários (free) ou acesso total aos produtos (premium).",
            "monthly" => "Acesso premium por 30 dias: 6 créditos de análise + rotina personalizada com produtos.",
            "annual"  => "Acesso premium por 365 dias: créditos de análise ilimitados + rotina personalizada.",
            _         => "Acesso ao FaceGlow Premium.",
        };

        var form = new List<KeyValuePair<string, string>>
        {
            new("mode", "payment"),
            new("locale", "pt-BR"),
            new("submit_type", "pay"),
            new("success_url", enrichedSuccessUrl),
            new("cancel_url", enrichedCancelUrl),
            new("payment_method_types[0]", "card"),
            new("line_items[0][price_data][currency]", "brl"),
            new("line_items[0][price_data][product_data][name]", $"FaceGlow — {plan.Name}"),
            new("line_items[0][price_data][product_data][description]", planDescription),
            new("line_items[0][price_data][unit_amount]", plan.AmountCents.ToString()),
            new("line_items[0][quantity]", "1"),
            new("metadata[user_id]", userId.ToString()),
            new("metadata[plan_key]", plan.Key),
            new("metadata[external_reference]", externalReference),
            new("custom_text[submit][message]", "Seus dados são protegidos com criptografia SSL. Pagamento seguro via Stripe."),
        };
        if (!string.IsNullOrWhiteSpace(email))
        {
            form.Add(new KeyValuePair<string, string>("customer_email", email));
        }

        var client = httpClientFactory.CreateClient("Stripe");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

        var response = await client.PostAsync(
            "https://api.stripe.com/v1/checkout/sessions",
            new FormUrlEncodedContent(form),
            cancellationToken);

        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Stripe error {Status}: {Body}", response.StatusCode, responseText);
            throw new InvalidOperationException("Nao foi possivel iniciar o checkout do Stripe.");
        }

        using var document = JsonDocument.Parse(responseText);
        var root = document.RootElement;
        var checkoutUrl = TryGetString(root, "url") ?? string.Empty;
        var externalId = TryGetString(root, "id") ?? string.Empty;

        ScheduleSave(new Subscription
        {
            UserId = userId,
            Provider = "stripe",
            Gateway = "stripe-card",
            PlanKey = plan.Key,
            PlanName = plan.Name,
            Status = "pending",
            ExternalReference = externalReference,
            ExternalId = externalId,
            CheckoutUrl = checkoutUrl,
            AmountCents = plan.AmountCents,
            Currency = "BRL",
            ExpiresAtUtc = DateTime.UtcNow.AddDays(plan.AccessDays),
            UpdatedAtUtc = DateTime.UtcNow,
        });

        return new BillingCheckoutResponseDto
        {
            Provider = "stripe",
            Gateway = "stripe-card",
            PlanKey = plan.Key,
            PlanName = plan.Name,
            Status = "pending",
            AmountCents = plan.AmountCents,
            Currency = "BRL",
            CheckoutUrl = checkoutUrl,
            ExternalReference = externalReference,
            ExternalId = externalId,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(plan.AccessDays),
        };
    }

    // Fire-and-forget: persiste a subscription em background sem bloquear a resposta.
    // Idempotente via ON CONFLICT — o webhook vai fazer UPSERT de qualquer forma ao confirmar pagamento.
    private void ScheduleSave(Subscription subscription)
    {
        var sub = subscription; // capture para o closure
        _ = Task.Run(async () =>
        {
            try
            {
                await using var scope = serviceScopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await SaveCoreAsync(db, sub);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Background save for subscription {Ref} failed — webhook will recover.", sub.ExternalReference);
            }
        });
    }

    private static async Task SaveCoreAsync(AppDbContext db, Subscription subscription)
    {
        const string upsertSql = """
            INSERT INTO subscriptions
                (id, user_id, provider, gateway, plan_key, plan_name, status,
                 external_reference, external_id, checkout_url,
                 pix_qr_code, pix_qr_code_base64,
                 amount_cents, currency, activated_at_utc, expires_at_utc,
                 created_at_utc, updated_at_utc)
            VALUES
                (@id, @userId, @provider, @gateway, @planKey, @planName, @status,
                 @externalReference, @externalId, @checkoutUrl,
                 @pixQrCode, @pixQrCodeBase64,
                 @amountCents, @currency, @activatedAtUtc, @expiresAtUtc,
                 now(), @updatedAtUtc)
            ON CONFLICT (external_reference) DO UPDATE SET
                status          = EXCLUDED.status,
                external_id     = EXCLUDED.external_id,
                checkout_url    = EXCLUDED.checkout_url,
                pix_qr_code     = EXCLUDED.pix_qr_code,
                pix_qr_code_base64 = EXCLUDED.pix_qr_code_base64,
                amount_cents    = EXCLUDED.amount_cents,
                activated_at_utc = EXCLUDED.activated_at_utc,
                expires_at_utc  = EXCLUDED.expires_at_utc,
                updated_at_utc  = EXCLUDED.updated_at_utc
            """;

        var connection = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync();

        await connection.ExecuteAsync(new CommandDefinition(upsertSql, new
        {
            id = subscription.Id == Guid.Empty ? Guid.NewGuid() : subscription.Id,
            userId = subscription.UserId,
            provider = subscription.Provider,
            gateway = subscription.Gateway,
            planKey = subscription.PlanKey,
            planName = subscription.PlanName,
            status = subscription.Status,
            externalReference = subscription.ExternalReference,
            externalId = subscription.ExternalId,
            checkoutUrl = subscription.CheckoutUrl,
            pixQrCode = subscription.PixQrCode,
            pixQrCodeBase64 = subscription.PixQrCodeBase64,
            amountCents = subscription.AmountCents,
            currency = subscription.Currency,
            activatedAtUtc = subscription.ActivatedAtUtc,
            expiresAtUtc = subscription.ExpiresAtUtc,
            updatedAtUtc = subscription.UpdatedAtUtc,
        }, commandTimeout: 20));
    }

    private static string NormalizeGateway(string gateway) => gateway.Trim().ToLowerInvariant() switch
    {
        "pix" => "mercadopago-pix",
        "mercadopago" => "mercadopago-pix",
        "mercadopago-checkout" => "mercadopago-card",
        "card" => "stripe-card",
        _ => gateway.Trim().ToLowerInvariant()
    };

    private static string? TryGetString(JsonElement element, string propertyName)
        => element.TryGetProperty(propertyName, out var property) ? property.GetString() : null;

    private static string GetFirstName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            return "FaceGlow";
        }

        return fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault() ?? "FaceGlow";
    }

    private static string GetLastName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            return "User";
        }

        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return parts.Length > 1 ? string.Join(' ', parts.Skip(1)) : "User";
    }

    private sealed record BillingPlanDefinition(string Key, string Name, int AmountCents, int AccessDays);

    private static string AppendQueryParams(string? url, IReadOnlyDictionary<string, string> values)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return string.Empty;
        }

        var separator = url.Contains('?') ? "&" : "?";
        var query = string.Join("&", values
            .Where(kvp => !string.IsNullOrWhiteSpace(kvp.Value))
            .Select(kvp => $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value)}"));

        if (string.IsNullOrWhiteSpace(query))
        {
            return url;
        }

        return $"{url}{separator}{query}";
    }
}