using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Helpers;

public static class EndpointHelpers
{
    public static Guid? GetAuthenticatedUserId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(sub)) return null;
        if (Guid.TryParse(sub, out var parsed)) return parsed;
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(sub));
        return new Guid(hash.AsSpan(0, 16));
    }

    public static int GetPlanAccessDays(string? planKey) => planKey?.Trim().ToLowerInvariant() switch
    {
        "monthly"   => 30,
        "quarterly" => 90,
        "annual"    => 365,
        "credits"   => 0,
        _           => 30,
    };

    public static int GetCreditsForPlan(string? planKey) => planKey?.Trim().ToLowerInvariant() switch
    {
        "credits" => 1,
        "monthly" => 6,
        "test"    => 1,
        _         => 0,
    };

    public static async Task GrantCreditsAsync(AppDbContext dbContext, Guid userId, string planKey, CancellationToken cancellationToken)
    {
        var creditsToGrant = GetCreditsForPlan(planKey);
        if (creditsToGrant <= 0) return;

        var credit = await dbContext.UserCredits.FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (credit is null)
        {
            dbContext.UserCredits.Add(new UserCredit
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

    public static string MapGatewayStatus(string gateway, string status)
    {
        if (gateway.Trim().ToLowerInvariant() == "mercadopago")
        {
            return status.Trim().ToLowerInvariant() switch
            {
                "approved"     => "active",
                "cancelled"    => "canceled",
                "rejected"     => "canceled",
                "refunded"     => "canceled",
                "charged_back" => "canceled",
                _              => "pending",
            };
        }
        return status;
    }

    public static string? TryGetJsonString(JsonElement element, string propertyName)
        => element.TryGetProperty(propertyName, out var property) ? property.GetString() : null;

    public static string? TryGetJsonNestedString(JsonElement element, params string[] path)
    {
        var current = element;
        foreach (var segment in path)
            if (!current.TryGetProperty(segment, out current)) return null;
        return current.ValueKind == JsonValueKind.String ? current.GetString() : current.ToString();
    }

    public static bool ValidateStripeSignature(string payload, string stripeSignature, string secret, long toleranceInSeconds = 300)
    {
        if (string.IsNullOrWhiteSpace(stripeSignature)) return false;

        var parts = stripeSignature.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var timestampPart = parts.FirstOrDefault(p => p.StartsWith("t=", StringComparison.OrdinalIgnoreCase));
        var signaturePart = parts.FirstOrDefault(p => p.StartsWith("v1=", StringComparison.OrdinalIgnoreCase));
        if (timestampPart is null || signaturePart is null) return false;

        if (!long.TryParse(timestampPart[2..], out var timestamp)) return false;

        if (Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeSeconds() - timestamp) > toleranceInSeconds) return false;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes($"{timestamp}.{payload}"));
        return string.Equals(Convert.ToHexString(hash).ToLowerInvariant(), signaturePart[3..], StringComparison.OrdinalIgnoreCase);
    }
}
