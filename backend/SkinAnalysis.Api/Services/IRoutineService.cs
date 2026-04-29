using SkinAnalysis.Api.Models;
using SkinAnalysisEntity = SkinAnalysis.Api.Models.SkinAnalysis;

namespace SkinAnalysis.Api.Services;

public interface IRoutineService
{
    Task<Routine> GenerateRoutine(Guid userId, SkinAnalysisEntity analysis, CancellationToken cancellationToken);

    Task<Routine> UpdateRoutineWithDiff(Guid userId, SkinAnalysisEntity analysis, Routine previousRoutine, CancellationToken cancellationToken);

    Task OverrideRoutineStepWithUserProduct(Guid userId, Guid routineStepId, Guid userProductId, CancellationToken cancellationToken);
}
