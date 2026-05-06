using SkinAnalysis.Api.DTOs;

namespace SkinAnalysis.Api.Services;

public interface IAnalysisService
{
    Task<AnalysisResponseDto> CreateQuickAnalysisAsync(AnalysisRequestDto request, CancellationToken cancellationToken);
    Task<AnalysisResponseDto> BuildRoutineAsync(Guid analysisId, CancellationToken cancellationToken);
}
