using System.Net;
using System.Net.Mail;
using System.Text;

namespace SkinAnalysis.Api.Services;

public class PremiumNotificationService
{
    private readonly IConfiguration configuration;
    private readonly ILogger<PremiumNotificationService> logger;

    public PremiumNotificationService(IConfiguration configuration, ILogger<PremiumNotificationService> logger)
    {
        this.configuration = configuration;
        this.logger = logger;
    }

    public async Task NotifyAdminNewPremiumUserAsync(
        Guid userId,
        string userEmail,
        string? userName,
        string planName,
        string gateway,
        int amountCents,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var adminEmail = configuration["Notifications:AdminEmail"]?.Trim();
            var smtpHost = configuration["Email:SmtpHost"]?.Trim();
            var smtpPort = int.TryParse(configuration["Email:SmtpPort"], out var port) ? port : 587;
            var smtpUser = configuration["Email:SmtpUser"]?.Trim();
            var smtpPassword = configuration["Email:SmtpPassword"]?.Trim();
            var fromEmail = configuration["Email:FromEmail"]?.Trim();

            if (string.IsNullOrWhiteSpace(adminEmail))
            {
                logger.LogInformation("Admin email not configured — skipping premium notification");
                return;
            }

            if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(fromEmail))
            {
                logger.LogWarning("Email service not configured — cannot send premium notification");
                return;
            }

            var subject = $"🎉 Novo Premium User - {planName}";
            var body = BuildPremiumNotificationHtml(userId, userEmail, userName, planName, gateway, amountCents);

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = true,
                Credentials = !string.IsNullOrWhiteSpace(smtpUser)
                    ? new NetworkCredential(smtpUser, smtpPassword)
                    : null,
                Timeout = 10000
            };

            using var message = new MailMessage(fromEmail, adminEmail)
            {
                Subject = subject,
                Body = body,
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8
            };

            await client.SendMailAsync(message, cancellationToken);
            logger.LogInformation("Premium notification sent to admin for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send premium notification for user {UserId}", userId);
        }
    }

    private static string BuildPremiumNotificationHtml(
        Guid userId,
        string userEmail,
        string? userName,
        string planName,
        string gateway,
        int amountCents)
    {
        var amount = (amountCents / 100m).ToString("C", System.Globalization.CultureInfo.GetCultureInfo("pt-BR"));
        var gatewayDisplay = gateway switch
        {
            "stripe-card" => "Stripe (Cartão)",
            "mercadopago-card" => "Mercado Pago (Cartão)",
            "mercadopago-pix" => "Mercado Pago (PIX)",
            _ => gateway
        };

        return $@"
<!DOCTYPE html>
<html lang=""pt-BR"">
<head>
    <meta charset=""UTF-8"">
    <title>Novo Premium User</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }}
        .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #e8748a 0%, #f4a8c7 100%); padding: 30px 20px; text-align: center; }}
        .logo {{ font-size: 28px; font-weight: bold; color: white; margin: 0; }}
        .content {{ padding: 30px 20px; }}
        .alert-box {{ background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px; }}
        .alert-box h3 {{ color: #856404; margin: 0 0 10px 0; }}
        .details {{ background: #f9f9f9; border-left: 4px solid #e8748a; padding: 15px; margin: 15px 0; border-radius: 4px; }}
        .details p {{ margin: 8px 0; color: #333; font-size: 14px; }}
        .details strong {{ color: #1a1a1a; }}
        .footer {{ background: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }}
        .stat {{ display: inline-block; margin: 10px 15px; }}
        .stat-value {{ font-size: 24px; font-weight: bold; color: #e8748a; }}
        .stat-label {{ font-size: 12px; color: #666; text-transform: uppercase; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1 class=""logo"">Face<span style=""opacity: 0.8;"">Glow</span></h1>
            <p style=""color: #fff; opacity: 0.9; margin: 10px 0 0 0;"">🎉 Novo Premium User!</p>
        </div>

        <div class=""content"">
            <div class=""alert-box"">
                <h3>✨ Parabéns! Um novo usuário ativou premium!</h3>
            </div>

            <h2 style=""color: #1a1a1a; margin-top: 0;"">Detalhes da Ativação</h2>

            <div class=""details"">
                <p><strong>Usuário ID:</strong> {userId}</p>
                <p><strong>Email:</strong> {userEmail}</p>
                <p><strong>Nome:</strong> {(string.IsNullOrWhiteSpace(userName) ? "Não informado" : userName)}</p>
                <p><strong>Plano:</strong> {planName}</p>
                <p><strong>Gateway:</strong> {gatewayDisplay}</p>
                <p><strong>Valor:</strong> {amount}</p>
                <p><strong>Data:</strong> {DateTime.UtcNow:dd/MM/yyyy HH:mm:ss} (UTC)</p>
            </div>

            <div style=""text-align: center; margin: 30px 0;"">
                <div class=""stat"">
                    <div class=""stat-value"">💳</div>
                    <div class=""stat-label"">Pagamento Ativo</div>
                </div>
                <div class=""stat"">
                    <div class=""stat-value"">👤</div>
                    <div class=""stat-label"">Premium Ativado</div>
                </div>
            </div>

            <p style=""color: #666; font-size: 14px; text-align: center; margin-top: 20px;"">
                Seus créditos foram adicionados automaticamente e sua rotina está sendo gerada. 🚀
            </p>
        </div>

        <div class=""footer"">
            <p>© 2026 FaceGlow | Notificação Automática do Sistema</p>
        </div>
    </div>
</body>
</html>
";
    }
}
