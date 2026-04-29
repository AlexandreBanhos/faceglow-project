using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Options;
using Microsoft.Extensions.Options;

namespace SkinAnalysis.Api.Services;

public class FallbackImageAnalysisService : IImageAnalysisService
{
    private readonly OpenAiAnalysisService openAiAnalyzer;
    private readonly GeminiAnalysisService geminiAnalyzer;
    private readonly OpenAiOptions openAiOptions;
    private readonly GeminiOptions geminiOptions;
    private readonly ILogger<FallbackImageAnalysisService> logger;

    public FallbackImageAnalysisService(
        OpenAiAnalysisService openAi,
        GeminiAnalysisService gemini,
        IOptions<OpenAiOptions> openAiOptions,
        IOptions<GeminiOptions> geminiOptions,
        ILogger<FallbackImageAnalysisService> logger)
    {
        this.openAiAnalyzer = openAi;
        this.geminiAnalyzer = gemini;
        this.openAiOptions = openAiOptions.Value;
        this.geminiOptions = geminiOptions.Value;
        this.logger = logger;
    }

    public async Task<OpenAiAnalysisDto> AnalyzeImageAsync(string imageUrl, CancellationToken cancellationToken)
    {
        var hasOpenAi = !string.IsNullOrWhiteSpace(openAiOptions.ApiKey);
        var hasGemini = !string.IsNullOrWhiteSpace(geminiOptions.ApiKey);

        if (!hasOpenAi && !hasGemini)
        {
            throw new InvalidOperationException("No AI provider configured. Set OpenAI:ApiKey or Gemini:ApiKey.");
        }

        if (hasGemini)
        {
            logger.LogInformation("Using Gemini as configured analyzer.");
            return await geminiAnalyzer.AnalyzeImageAsync(imageUrl, cancellationToken);
        }

        if (hasOpenAi)
        {
            logger.LogInformation("Gemini key is not configured. Using OpenAI as analyzer.");
            return await openAiAnalyzer.AnalyzeImageAsync(imageUrl, cancellationToken);
        }

        throw new InvalidOperationException("No usable AI analyzer was found.");
    }
}
