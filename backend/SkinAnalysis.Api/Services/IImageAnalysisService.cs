using SkinAnalysis.Api.DTOs;

namespace SkinAnalysis.Api.Services;

public interface IImageAnalysisService
{
    Task<OpenAiAnalysisDto> AnalyzeImageAsync(string imageUrl, CancellationToken cancellationToken);
}
