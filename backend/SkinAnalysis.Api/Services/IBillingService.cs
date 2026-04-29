using SkinAnalysis.Api.DTOs;

namespace SkinAnalysis.Api.Services;

public interface IBillingService
{
    Task<BillingCheckoutResponseDto> CreateCheckoutAsync(Guid userId, BillingCheckoutRequestDto request, CancellationToken cancellationToken);

    string ResolveMercadoPagoAccessToken();
}