using SkinAnalysis.Api.Models;
using SkinAnalysisEntity = SkinAnalysis.Api.Models.SkinAnalysis;

namespace SkinAnalysis.Api.Services;

public interface ISkinAnalysisService
{
    Task<(SkinAnalysisEntity Analysis, Routine Routine)> CreateAnalysisAndGenerateRoutine(
        Guid userId,
        string email,
        string skinType,
        int acneLevel,
        int sensitivityLevel,
        bool hasDarkCircles,
        bool hasSpots,
        CancellationToken cancellationToken);
}
