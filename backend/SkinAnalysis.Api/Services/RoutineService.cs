using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;
using SkinAnalysisEntity = SkinAnalysis.Api.Models.SkinAnalysis;

namespace SkinAnalysis.Api.Services;

public class RoutineService(AppDbContext dbContext, ILogger<RoutineService> logger) : IRoutineService
{
    public async Task<Routine> GenerateRoutine(Guid userId, SkinAnalysisEntity analysis, CancellationToken cancellationToken)
    {
        var latestAnalysis = await dbContext.SkinAnalyses
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var analysisToUse = latestAnalysis ?? analysis;

        var previousRoutine = await dbContext.Routines
            .Include(x => x.Steps)
            .ThenInclude(x => x.Product)
            .Where(x => x.UserId == userId && x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (previousRoutine is not null)
        {
            previousRoutine.IsActive = false;
        }

        var newRoutine = previousRoutine is null
            ? await BuildInitialRoutine(userId, analysisToUse, cancellationToken)
            : await UpdateRoutineWithDiff(userId, analysisToUse, previousRoutine, cancellationToken);

        dbContext.Routines.Add(newRoutine);
        await dbContext.SaveChangesAsync(cancellationToken);

        return newRoutine;
    }

    public async Task<Routine> UpdateRoutineWithDiff(Guid userId, SkinAnalysisEntity analysis, Routine previousRoutine, CancellationToken cancellationToken)
    {
        var requiredStepTypes = BuildRequiredStepTypes(analysis);
        var products = await LoadCandidateProducts(userId, cancellationToken);

        var nextRoutine = new Routine
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BasedOnAnalysisId = analysis.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            Steps = new List<RoutineStep>(),
        };

        foreach (var stepType in requiredStepTypes)
        {
            var previousStep = previousRoutine.Steps.FirstOrDefault(x => x.StepType == stepType);
            if (previousStep?.Product is not null && IsProductValidForStep(previousStep.Product, analysis, stepType))
            {
                nextRoutine.Steps.Add(new RoutineStep
                {
                    Id = Guid.NewGuid(),
                    RoutineId = nextRoutine.Id,
                    StepType = stepType,
                    ProductId = previousStep.ProductId,
                    IsUserProduct = previousStep.IsUserProduct,
                    CreatedAt = DateTime.UtcNow,
                });

                continue;
            }

            var replacement = SelectProductForStep(products, analysis, stepType, nextRoutine.Steps.Select(x => x.ProductId).ToHashSet());
            if (replacement is null)
            {
                continue;
            }

            nextRoutine.Steps.Add(new RoutineStep
            {
                Id = Guid.NewGuid(),
                RoutineId = nextRoutine.Id,
                StepType = stepType,
                ProductId = replacement.Id,
                IsUserProduct = replacement.IsUserProduct,
                CreatedAt = DateTime.UtcNow,
            });
        }

        return nextRoutine;
    }

    public async Task OverrideRoutineStepWithUserProduct(Guid userId, Guid routineStepId, Guid userProductId, CancellationToken cancellationToken)
    {
        var routineStep = await dbContext.RoutineSteps
            .Include(x => x.Routine)
            .FirstOrDefaultAsync(x => x.Id == routineStepId && x.Routine.UserId == userId, cancellationToken);

        if (routineStep is null)
        {
            throw new InvalidOperationException("Routine step not found for user.");
        }

        var userProduct = await dbContext.Products
            .FirstOrDefaultAsync(x => x.Id == userProductId && x.UserId == userId && x.IsUserProduct, cancellationToken);

        if (userProduct is null)
        {
            throw new InvalidOperationException("User product not found.");
        }

        routineStep.ProductId = userProduct.Id;
        routineStep.IsUserProduct = true;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<Routine> BuildInitialRoutine(Guid userId, SkinAnalysisEntity analysis, CancellationToken cancellationToken)
    {
        var products = await LoadCandidateProducts(userId, cancellationToken);
        var stepTypes = BuildRequiredStepTypes(analysis);

        var routine = new Routine
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BasedOnAnalysisId = analysis.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            Steps = new List<RoutineStep>(),
        };

        foreach (var stepType in stepTypes)
        {
            var product = SelectProductForStep(products, analysis, stepType, routine.Steps.Select(x => x.ProductId).ToHashSet());
            if (product is null)
            {
                continue;
            }

            routine.Steps.Add(new RoutineStep
            {
                Id = Guid.NewGuid(),
                RoutineId = routine.Id,
                StepType = stepType,
                ProductId = product.Id,
                IsUserProduct = product.IsUserProduct,
                CreatedAt = DateTime.UtcNow,
            });
        }

        return routine;
    }

    private async Task<List<Product>> LoadCandidateProducts(Guid userId, CancellationToken cancellationToken)
    {
        // Single query: catalog products sorted by priority, then user products by creation date
        var products = await dbContext.Products
            .AsNoTracking()
            .Where(x => x.IsActive)
            .Where(x => !x.IsUserProduct || x.UserId == userId)
            .OrderByDescending(x => x.IsUserProduct)
            .ThenByDescending(x => x.Priority)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        logger.LogInformation("[PERF] Loaded {Count} candidate products for userId {UserId}.", products.Count, userId);
        return products;
    }

    private static List<string> BuildRequiredStepTypes(SkinAnalysisEntity analysis)
    {
        var steps = new List<string> { "cleansing", "treatment", "hydration", "sunscreen" };

        if (analysis.HasDarkCircles)
        {
            steps.Add("dark-circles-treatment");
        }

        if (analysis.HasSpots)
        {
            steps.Add("spots-treatment");
        }

        return steps;
    }

    private static Product? SelectProductForStep(
        IReadOnlyCollection<Product> products,
        SkinAnalysisEntity analysis,
        string stepType,
        ISet<Guid> alreadySelected)
    {
        var category = ResolveCategory(stepType);

        return products
            .Where(x => !alreadySelected.Contains(x.Id))
            .Where(x => string.Equals(x.Category, category, StringComparison.OrdinalIgnoreCase))
            .Where(x => IsProductValidForStep(x, analysis, stepType))
            .OrderByDescending(x => x.IsUserProduct)
            .ThenByDescending(x => x.CreatedAt)
            .FirstOrDefault();
    }

    private static bool IsProductValidForStep(Product product, SkinAnalysisEntity analysis, string stepType)
    {
#pragma warning disable CS0618
        var normalizedSkinType = analysis.SkinType.Trim().ToLowerInvariant();
        var supportsSkinType = string.IsNullOrWhiteSpace(product.SkinType)
            || string.Equals(product.SkinType, "todas", StringComparison.OrdinalIgnoreCase)
            || string.Equals(product.SkinType, normalizedSkinType, StringComparison.OrdinalIgnoreCase)
            || product.SkinTypes.Any(x => string.Equals(x, normalizedSkinType, StringComparison.OrdinalIgnoreCase));
#pragma warning restore CS0618

        if (!supportsSkinType)
        {
            return false;
        }

        if (stepType == "dark-circles-treatment")
        {
            return product.Concerns.Any(x => string.Equals(x, "olheiras", StringComparison.OrdinalIgnoreCase));
        }

        if (stepType == "spots-treatment")
        {
            return product.Concerns.Any(x => string.Equals(x, "manchas", StringComparison.OrdinalIgnoreCase));
        }

        return true;
    }

    private static string ResolveCategory(string stepType)
    {
        return stepType switch
        {
            "cleansing" => "cleanser",
            "hydration" => "moisturizer",
            "sunscreen" => "sunscreen",
            "dark-circles-treatment" => "eye",
            "spots-treatment" => "serum",
            _ => "treatment",
        };
    }
}
