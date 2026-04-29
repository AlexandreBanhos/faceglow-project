using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;
using SkinAnalysisEntity = SkinAnalysis.Api.Models.SkinAnalysis;

namespace SkinAnalysis.Api.Services;

public class SkinAnalysisService(AppDbContext dbContext, IRoutineService routineService) : ISkinAnalysisService
{
    public async Task<(SkinAnalysisEntity Analysis, Routine Routine)> CreateAnalysisAndGenerateRoutine(
        Guid userId,
        string email,
        string skinType,
        int acneLevel,
        int sensitivityLevel,
        bool hasDarkCircles,
        bool hasSpots,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null)
        {
            user = new User
            {
                Id = userId,
                Email = email,
                CreatedAt = DateTime.UtcNow,
            };
            dbContext.Users.Add(user);
        }
        else if (!string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(email))
        {
            user.Email = email;
        }

        var analysis = new SkinAnalysisEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SkinType = NormalizeSkinType(skinType),
            AcneLevel = Math.Clamp(acneLevel, 0, 100),
            SensitivityLevel = Math.Clamp(sensitivityLevel, 0, 100),
            HasDarkCircles = hasDarkCircles,
            HasSpots = hasSpots,
            CreatedAt = DateTime.UtcNow,
        };

        dbContext.SkinAnalyses.Add(analysis);
        await dbContext.SaveChangesAsync(cancellationToken);

        var routine = await routineService.GenerateRoutine(userId, analysis, cancellationToken);
        return (analysis, routine);
    }

    private static string NormalizeSkinType(string skinType)
    {
        if (string.IsNullOrWhiteSpace(skinType))
        {
            return "unknown";
        }

        return skinType.Trim().ToLowerInvariant();
    }
}
