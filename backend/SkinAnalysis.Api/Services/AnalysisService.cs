using System.Text.Json;
using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Models;
using BudgetLevel = SkinAnalysis.Api.Domain.RoutineEngine.BudgetLevel;
using CatalogProduct = SkinAnalysis.Api.Models.Product;
using Routine = SkinAnalysis.Api.Domain.RoutineEngine.Routine;
using RoutineEngine = SkinAnalysis.Api.Domain.RoutineEngine.RoutineEngine;
using RoutineEngineProduct = SkinAnalysis.Api.Domain.RoutineEngine.Product;
using UserProfile = SkinAnalysis.Api.Domain.RoutineEngine.UserProfile;

namespace SkinAnalysis.Api.Services;

public class AnalysisService : IAnalysisService
{
    private const int RoutineStabilityDays = 21;
    private static readonly TimeSpan ProductCatalogCacheTtl = TimeSpan.FromMinutes(30);
    private static readonly SemaphoreSlim ProductCatalogCacheLock = new(1, 1);

    private static IReadOnlyList<Product>? CachedProducts;
    private static DateTime CachedProductsLoadedAtUtc;

    /// <summary>Called at startup to pre-populate the in-memory product cache, avoiding the first-request DB hit.</summary>
    public static void SetProductCatalogCache(IReadOnlyList<Product> products)
    {
        CachedProducts = products;
        CachedProductsLoadedAtUtc = DateTime.UtcNow;
    }

    private readonly AppDbContext dbContext;
    private readonly IImageAnalysisService imageAnalyzer;
    private readonly ILogger<AnalysisService> logger;
    private readonly RoutineEngine routineEngine = new();

    public AnalysisService(AppDbContext dbContext, IImageAnalysisService imageAnalyzer, ILogger<AnalysisService> logger)
    {
        this.dbContext = dbContext;
        this.imageAnalyzer = imageAnalyzer;
        this.logger = logger;
    }

    public async Task<AnalysisResponseDto> CreateAnalysisAsync(AnalysisRequestDto request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(request.UserId, out var userId))
            throw new ArgumentException("userId must be a valid UUID.");

        var aiResult = await imageAnalyzer.AnalyzeImageAsync(request.ImageUrl, cancellationToken);

        var isFaceValid = aiResult.RostoValido ?? true;
        var isImageSharp = aiResult.ImagemNitida ?? true;
        var isAllowedContent = aiResult.ConteudoPermitido ?? true;
        if (!isFaceValid || !isImageSharp || !isAllowedContent)
        {
            var reason = string.IsNullOrWhiteSpace(aiResult.MotivoBloqueio)
                ? "Imagem invalida para analise. Envie uma selfie frontal, nitida, sem desfoque e com apenas um rosto humano."
                : aiResult.MotivoBloqueio.Trim();
            logger.LogWarning("Imagem inválida para userId {UserId}: {Reason}", userId, reason);
            throw new ArgumentException(reason);
        }

        var skinType = NormalizeSkinType(string.IsNullOrWhiteSpace(aiResult.TipoPele) ? aiResult.SkinType : aiResult.TipoPele);
        var conditions = EnrichConditions(
            aiResult.Condicoes,
            aiResult.Scores,
            aiResult.RecomendacoesAdicionais,
            aiResult.Summary);
        var derivedScores = BuildScoresFromAnalysis(aiResult.Scores);
        var additionalNotes = string.IsNullOrWhiteSpace(aiResult.RecomendacoesAdicionais)
            ? aiResult.Summary
            : aiResult.RecomendacoesAdicionais;

        var routinePlan = await BuildRoutinePlanAsync(skinType, conditions, derivedScores, cancellationToken);

        var selectedProducts = routinePlan.Products;
        var routine = routinePlan.Routine;
        var validSelectedProducts = selectedProducts
            .Where(product => product.IsActive && !string.IsNullOrWhiteSpace(product.Name))
            .DistinctBy(product => product.Name.Trim())
            .ToList();

        var analysis = new Analysis
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ImageUrl = request.ImageUrl,
            SkinType = skinType,
            Summary = additionalNotes,
            RoutineJson = JsonSerializer.Serialize(routine),
            AcneScore = derivedScores.Acne,
            OilinessScore = derivedScores.Oiliness,
            DarkSpotsScore = derivedScores.DarkSpots,
            HydrationScore = derivedScores.Hydration,
            SensitivityScore = derivedScores.Sensitivity,
            OverallScore = CalculateOverallScore(derivedScores),
            AcneActive = conditions.Acne,
            DarkCircles = conditions.Olheiras,
            EnlargedPores = conditions.Poros,
            PigmentationSpots = conditions.Manchas,
            DryLips = conditions.LabiosRessecados,
            AdditionalRecommendations = additionalNotes,
            CreatedAtUtc = DateTime.UtcNow,
        };

        await SaveAnalysisWithRetryAsync(analysis, cancellationToken);

        var persistedRecommendations = new List<Recommendation>();
        foreach (var product in validSelectedProducts)
        {
            persistedRecommendations.Add(new Recommendation
            {
                Id = Guid.NewGuid(),
                AnalysisId = analysis.Id,
                Type = product.Category,
                Product = product.Name,
                Description = BuildRecommendationReason(product),
                ImageUrl = ResolveProductImageUrl(product)
            });
        }

        if (persistedRecommendations.Count > 0)
        {
            dbContext.Recommendations.AddRange(persistedRecommendations);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        analysis.Recommendations = persistedRecommendations;

        return new AnalysisResponseDto
        {
            Id = analysis.Id,
            UserId = analysis.UserId,
            ImageUrl = analysis.ImageUrl,
            SkinType = analysis.SkinType,
            Summary = analysis.Summary,
            Conditions = new AnalysisConditionsDto
            {
                Acne = analysis.AcneActive,
                Olheiras = analysis.DarkCircles,
                Poros = analysis.EnlargedPores,
                Manchas = analysis.PigmentationSpots,
                LabiosRessecados = analysis.DryLips
            },
            AdditionalRecommendations = analysis.AdditionalRecommendations,
            Scores = new AnalysisScoresDto
            {
                Acne = analysis.AcneScore,
                Oiliness = analysis.OilinessScore,
                DarkSpots = analysis.DarkSpotsScore,
                Hydration = analysis.HydrationScore,
                Sensitivity = derivedScores.Sensitivity
            },
            OverallScore = analysis.OverallScore,
            CreatedAtUtc = analysis.CreatedAtUtc,
            Routine = routine,
            Recommendations = analysis.Recommendations.Select(r => new RecommendationDto
            {
                Type = r.Type,
                Product = r.Product,
                Reason = r.Description,
                ImageUrl = r.ImageUrl
            }).ToList(),
            HasRecommendations = persistedRecommendations.Count > 0,
        };
    }

    public async Task<AnalysisResponseDto> CreateQuickAnalysisAsync(AnalysisRequestDto request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(request.UserId, out var userId))
            throw new ArgumentException("userId must be a valid UUID.");

        logger.LogInformation("[ANALYSIS] Starting analysis for userId: {UserId}, ImageUrl: {ImageUrl}", userId, request.ImageUrl);

        try
        {
            logger.LogInformation("[ANALYSIS] Calling imageAnalyzer.AnalyzeImageAsync at {Timestamp}", DateTime.UtcNow);
            var aiResult = await imageAnalyzer.AnalyzeImageAsync(request.ImageUrl, cancellationToken);
            logger.LogInformation("[ANALYSIS] imageAnalyzer completed at {Timestamp}. Result: RostoValido={RostoValido}, ImagemNitida={ImagemNitida}, ConteudoPermitido={ConteudoPermitido}", DateTime.UtcNow, aiResult.RostoValido, aiResult.ImagemNitida, aiResult.ConteudoPermitido);

            var isFaceValid = aiResult.RostoValido ?? true;
            var isImageSharp = aiResult.ImagemNitida ?? true;
            var isAllowedContent = aiResult.ConteudoPermitido ?? true;
            if (!isFaceValid || !isImageSharp || !isAllowedContent)
            {
                var reason = string.IsNullOrWhiteSpace(aiResult.MotivoBloqueio)
                    ? "Imagem invalida para analise. Envie uma selfie frontal, nitida, sem desfoque e com apenas um rosto humano."
                    : aiResult.MotivoBloqueio.Trim();
                logger.LogWarning("[ANALYSIS] Image validation failed: {Reason}", reason);
                throw new ArgumentException(reason);
            }

            var skinType = NormalizeSkinType(string.IsNullOrWhiteSpace(aiResult.TipoPele) ? aiResult.SkinType : aiResult.TipoPele);
            var conditions = EnrichConditions(aiResult.Condicoes, aiResult.Scores, aiResult.RecomendacoesAdicionais, aiResult.Summary);
            var derivedScores = BuildScoresFromAnalysis(aiResult.Scores);
            var additionalNotes = string.IsNullOrWhiteSpace(aiResult.RecomendacoesAdicionais) ? aiResult.Summary : aiResult.RecomendacoesAdicionais;

            var analysis = new Analysis
            {
                Id = Guid.NewGuid(), UserId = userId,
                ImageUrl = request.ImageUrl, SkinType = skinType,
                Summary = additionalNotes,
                RoutineJson = "{\"morning\":[],\"night\":[]}",
                AcneScore = derivedScores.Acne, OilinessScore = derivedScores.Oiliness,
                DarkSpotsScore = derivedScores.DarkSpots, HydrationScore = derivedScores.Hydration,
                SensitivityScore = derivedScores.Sensitivity,
                Poros = derivedScores.Poros, Olheiras = derivedScores.Olheiras,
                LinhasFinas = derivedScores.LinhasFinas, Vermelhidao = derivedScores.Vermelhidao,
                EspinhasAtivas = derivedScores.EspinhasAtivas, Cravos = derivedScores.Cravos,
                OverallScore = CalculateOverallScore(derivedScores),
                AcneActive = conditions.Acne, DarkCircles = conditions.Olheiras,
                EnlargedPores = conditions.Poros, PigmentationSpots = conditions.Manchas,
                DryLips = conditions.LabiosRessecados,
                AdditionalRecommendations = additionalNotes,
                CreatedAtUtc = DateTime.UtcNow,
            };

            logger.LogInformation("[ANALYSIS] Saving analysis {AnalysisId} at {Timestamp}", analysis.Id, DateTime.UtcNow);
            await SaveAnalysisWithRetryAsync(analysis, cancellationToken);
            logger.LogInformation("[ANALYSIS] Analysis {AnalysisId} saved successfully at {Timestamp}", analysis.Id, DateTime.UtcNow);

            return new AnalysisResponseDto
            {
                Id = analysis.Id, UserId = analysis.UserId,
                ImageUrl = analysis.ImageUrl, SkinType = analysis.SkinType,
                Summary = analysis.Summary, Conditions = conditions,
                AdditionalRecommendations = additionalNotes, Scores = derivedScores,
                OverallScore = analysis.OverallScore, CreatedAtUtc = analysis.CreatedAtUtc,
                Routine = new AnalysisRoutineDto { Morning = new(), Night = new() },
                Recommendations = new(), HasRecommendations = false,
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[ANALYSIS] CreateQuickAnalysisAsync failed for userId {UserId}: {ExceptionMessage}", userId, ex.Message);
            throw;
        }
    }

    public async Task<AnalysisResponseDto> BuildRoutineAsync(Guid analysisId, CancellationToken cancellationToken)
    {
        var analysis = await dbContext.Analyses
            .Include(a => a.Recommendations)
            .FirstOrDefaultAsync(a => a.Id == analysisId, cancellationToken)
            ?? throw new InvalidOperationException("Analysis not found.");

        var hasRoutine = !string.IsNullOrWhiteSpace(analysis.RoutineJson)
            && analysis.RoutineJson != "{\"morning\":[],\"night\":[]}";
        if (hasRoutine && analysis.Recommendations.Any())
            return MapAnalysisToDto(analysis);

        var conditions = new AnalysisConditionsDto
        {
            Acne = analysis.AcneActive, Olheiras = analysis.DarkCircles,
            Poros = analysis.EnlargedPores, Manchas = analysis.PigmentationSpots,
            LabiosRessecados = analysis.DryLips,
        };
        var scores = new AnalysisScoresDto
        {
            Acne = analysis.AcneScore, Oiliness = analysis.OilinessScore,
            DarkSpots = analysis.DarkSpotsScore, Hydration = analysis.HydrationScore,
            Sensitivity = analysis.SensitivityScore,
            Poros = analysis.Poros, Olheiras = analysis.Olheiras,
            LinhasFinas = analysis.LinhasFinas, Vermelhidao = analysis.Vermelhidao,
            EspinhasAtivas = analysis.EspinhasAtivas, Cravos = analysis.Cravos,
        };

        var routinePlan = await BuildRoutinePlanAsync(analysis.SkinType, conditions, scores, cancellationToken);
        analysis.RoutineJson = JsonSerializer.Serialize(routinePlan.Routine);

        var recs = routinePlan.Products
            .Where(p => p.IsActive && !string.IsNullOrWhiteSpace(p.Name))
            .DistinctBy(p => p.Name.Trim())
            .Select(p => new Recommendation
            {
                Id = Guid.NewGuid(), AnalysisId = analysis.Id,
                Type = p.Category, Product = p.Name,
                Description = BuildRecommendationReason(p),
                ImageUrl = ResolveProductImageUrl(p),
            }).ToList();

        if (recs.Any())
            dbContext.Recommendations.AddRange(recs);

        // Explicitly mark the analysis as modified to ensure RoutineJson is saved
        dbContext.Analyses.Update(analysis);
        await dbContext.SaveChangesAsync(cancellationToken);
        analysis.Recommendations = recs;

        return MapAnalysisToDto(analysis);
    }

    private AnalysisResponseDto MapAnalysisToDto(Analysis analysis)
    {
        AnalysisRoutineDto routine;
        try { routine = JsonSerializer.Deserialize<AnalysisRoutineDto>(analysis.RoutineJson) ?? new(); }
        catch { routine = new(); }

        return new AnalysisResponseDto
        {
            Id = analysis.Id, UserId = analysis.UserId,
            ImageUrl = analysis.ImageUrl, SkinType = analysis.SkinType,
            Summary = analysis.Summary,
            Conditions = new AnalysisConditionsDto
            {
                Acne = analysis.AcneActive, Olheiras = analysis.DarkCircles,
                Poros = analysis.EnlargedPores, Manchas = analysis.PigmentationSpots,
                LabiosRessecados = analysis.DryLips,
            },
            AdditionalRecommendations = analysis.AdditionalRecommendations,
            Scores = new AnalysisScoresDto
            {
                Acne = analysis.AcneScore, Oiliness = analysis.OilinessScore,
                DarkSpots = analysis.DarkSpotsScore, Hydration = analysis.HydrationScore,
                Sensitivity = analysis.SensitivityScore,
                Poros = analysis.Poros, Olheiras = analysis.Olheiras,
                LinhasFinas = analysis.LinhasFinas, Vermelhidao = analysis.Vermelhidao,
                EspinhasAtivas = analysis.EspinhasAtivas, Cravos = analysis.Cravos,
            },
            OverallScore = analysis.OverallScore, CreatedAtUtc = analysis.CreatedAtUtc,
            Routine = routine,
            Recommendations = analysis.Recommendations.Select(r => new RecommendationDto
            {
                Type = r.Type, Product = r.Product, Reason = r.Description, ImageUrl = r.ImageUrl,
            }).ToList(),
            HasRecommendations = analysis.Recommendations.Any(),
        };
    }

    private async Task SaveAnalysisWithRetryAsync(Analysis analysis, CancellationToken cancellationToken)
    {
        var _sw = System.Diagnostics.Stopwatch.StartNew();
        logger.LogInformation("[ANALYSIS] � SaveChangesAsync starting - AnalysisId: {Id}, Timestamp: {Ts}", analysis.Id, DateTime.UtcNow);
        
        try
        {
            // Remove any previously tracked instances to avoid conflicts
            var existing = dbContext.Analyses.Local.FirstOrDefault(a => a.Id == analysis.Id);
            if (existing != null && existing != analysis)
            {
                dbContext.Entry(existing).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
            }
            
            dbContext.Analyses.Add(analysis);
            await dbContext.SaveChangesAsync(cancellationToken);
            
            _sw.Stop();
            logger.LogInformation("[ANALYSIS] ✅ SaveChangesAsync SUCCESS after {ElapsedMs}ms", _sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            _sw.Stop();
            logger.LogError(ex, "[ANALYSIS] ❌ SaveChangesAsync FAILED after {ElapsedMs}ms: {Message}", _sw.ElapsedMilliseconds, ex.Message);
            throw;
        }
    }

    private static bool IsPrimaryKeyConflict(DbUpdateException exception, string constraintName)
    {
        return exception.InnerException is PostgresException postgresException
               && postgresException.SqlState == PostgresErrorCodes.UniqueViolation
               && string.Equals(postgresException.ConstraintName, constraintName, StringComparison.OrdinalIgnoreCase);
    }

    private async Task<RoutinePlan> BuildRoutinePlanAsync(string skinType, AnalysisConditionsDto conditions, AnalysisScoresDto scores, CancellationToken cancellationToken)
    {
        var products = await GetProductCatalogAsync(cancellationToken);
        var selected = products
            .Where(product => IsSkinTypeMatch(product.SkinTypes, skinType))
            .ToList();

        if (selected.Count == 0)
        {
            selected = products.ToList();
        }

        var engineProducts = selected.Select(MapToRoutineProduct).ToList();
        var userProfile = new UserProfile
        {
            SkinType = skinType,
            Acne = conditions.Acne,
            Olheiras = conditions.Olheiras,
            Poros = conditions.Poros,
            Manchas = conditions.Manchas,
            LabiosRessecados = conditions.LabiosRessecados,
            AcneScore = scores.Acne,
            OilinessScore = scores.Oiliness,
            DarkSpotsScore = scores.DarkSpots,
            SensitivityScore = scores.Sensitivity,
            HydrationScore = scores.Hydration,
            LinhasFinas = scores.LinhasFinas,
            Budget = BudgetLevel.Medium,
        };

        var routineResult = routineEngine.BuildRoutine(userProfile, engineProducts);

        return new RoutinePlan
        {
            Products = selected,
            Routine = ToAnalysisRoutineDto(routineResult.Routine),
        };
    }

    private static RoutineEngineProduct MapToRoutineProduct(CatalogProduct product)
    {
        var mappedCategory = product.Category.ToLowerInvariant() switch
        {
            "cleanser" => "Limpeza",
            "moisturizer" => "Hidratante",
            "serum" => "Serum",
            "sunscreen" => "Protetor",
            "treatment" => "Retinoide",
            "eye" => "Extras",
            "lip" => "Extras",
            _ => product.Category,
        };

        var period = product.Period.Length == 0
            ? new[] { "both" }
            : product.Period.Select(value => NormalizeText(value) switch
            {
                "manha" => "morning",
                "morning" => "morning",
                "noite" => "night",
                "night" => "night",
                _ => "both",
            }).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

        var useCases = product.Concerns.Concat(product.Actives).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

        return new RoutineEngineProduct
        {
            Id = product.Id,
            Name = product.Name,
            Category = mappedCategory,
            Recurrence = product.Period.Length > 1 ? "daily" : string.Equals(period[0], "night", StringComparison.OrdinalIgnoreCase) ? "night" : "morning",
            PreferredPeriod = product.Period.Length > 1 ? "both" : period[0],
            Highlight = BuildProductHighlight(product),
            ImageUrl = string.Empty,
            SkinTypes = product.SkinTypes,
            UseCases = useCases,
            Priority = ComputePriority(product),
            IsActive = true,
        };
    }

    private static AnalysisRoutineDto ToAnalysisRoutineDto(Routine routine)
    {
        return new AnalysisRoutineDto
        {
            Morning = routine.Morning.Steps.Select(step => step.DisplayText).ToList(),
            Night = routine.Night.Steps.Select(step => step.DisplayText).ToList(),
        };
    }

    private static int ScoreProduct(Product product, IReadOnlyCollection<string> useCasePriority)
    {
        var score = product.Priority;
        if (useCasePriority.Any() && product.UseCases.Any())
        {
            score += product.UseCases.Intersect(useCasePriority, StringComparer.OrdinalIgnoreCase).Count() * 20;
        }

#pragma warning disable CS0618
        if (string.Equals(product.Recurrence, "daily", StringComparison.OrdinalIgnoreCase))
        {
            score += 5;
        }
#pragma warning restore CS0618

        return score;
    }

    private static Product? PickProduct(
        IReadOnlyCollection<Product> source,
        ICollection<Product> selected,
        string category,
        IReadOnlyCollection<string> acceptedPeriods,
        IReadOnlyCollection<string> useCasePriority,
        IReadOnlyCollection<string>? includeKeywords = null,
        IReadOnlyCollection<string>? excludeKeywords = null)
    {
#pragma warning disable CS0618
        var include = includeKeywords ?? Array.Empty<string>();
        var exclude = excludeKeywords ?? Array.Empty<string>();

        var candidate = source
            .Where(product => string.Equals(product.Category, category, StringComparison.OrdinalIgnoreCase))
            .Where(product => acceptedPeriods.Any(period =>
                string.Equals(period, "both", StringComparison.OrdinalIgnoreCase)
                    ? string.Equals(product.PreferredPeriod, "both", StringComparison.OrdinalIgnoreCase)
                    : string.Equals(product.PreferredPeriod, period, StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(product.PreferredPeriod, "both", StringComparison.OrdinalIgnoreCase)))
            .Where(product => !selected.Any(s => string.Equals(s.Name, product.Name, StringComparison.OrdinalIgnoreCase)))
            .Where(product => !exclude.Any() || !ContainsAnyKeyword(product, exclude))
            .OrderByDescending(product => ScoreProduct(product, useCasePriority))
            .ThenByDescending(product => ContainsAnyKeyword(product, include))
            .FirstOrDefault(product => !include.Any() || ContainsAnyKeyword(product, include));

        candidate ??= source
            .Where(product => string.Equals(product.Category, category, StringComparison.OrdinalIgnoreCase))
            .Where(product => acceptedPeriods.Any(period =>
                string.Equals(period, "both", StringComparison.OrdinalIgnoreCase)
                    ? string.Equals(product.PreferredPeriod, "both", StringComparison.OrdinalIgnoreCase)
                    : string.Equals(product.PreferredPeriod, period, StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(product.PreferredPeriod, "both", StringComparison.OrdinalIgnoreCase)))
            .Where(product => !selected.Any(s => string.Equals(s.Name, product.Name, StringComparison.OrdinalIgnoreCase)))
            .Where(product => !exclude.Any() || !ContainsAnyKeyword(product, exclude))
            .OrderByDescending(product => ScoreProduct(product, useCasePriority))
            .FirstOrDefault();

        if (candidate is not null)
        {
            selected.Add(candidate);
        }

        return candidate;
#pragma warning restore CS0618
    }

    private async Task<IReadOnlyList<Product>> GetProductCatalogAsync(CancellationToken cancellationToken)
    {
        var cachedProducts = CachedProducts;
        if (cachedProducts is not null && DateTime.UtcNow - CachedProductsLoadedAtUtc <= ProductCatalogCacheTtl)
        {
            return cachedProducts;
        }

        await ProductCatalogCacheLock.WaitAsync(cancellationToken);
        try
        {
            cachedProducts = CachedProducts;
            if (cachedProducts is not null && DateTime.UtcNow - CachedProductsLoadedAtUtc <= ProductCatalogCacheTtl)
            {
                return cachedProducts;
            }

            var products = await dbContext.Products
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderByDescending(x => x.Priority)
                .ToListAsync(cancellationToken);

            CachedProducts = products;
            CachedProductsLoadedAtUtc = DateTime.UtcNow;
            logger.LogInformation("[PERF] Product catalog cache refreshed with {Count} items.", products.Count);

            return products;
        }
        finally
        {
            ProductCatalogCacheLock.Release();
        }
    }

    private static Product? PickProductWithImagePreference(
        IReadOnlyCollection<Product> source,
        IReadOnlyCollection<Product> imagePreferredSource,
        ICollection<Product> selected,
        string category,
        IReadOnlyCollection<string> acceptedPeriods,
        IReadOnlyCollection<string> useCasePriority,
        IReadOnlyCollection<string>? includeKeywords = null,
        IReadOnlyCollection<string>? excludeKeywords = null)
    {
#pragma warning disable CS0618
        var fromImagePreferred = PickProduct(
            imagePreferredSource,
            selected,
            category,
            acceptedPeriods,
            useCasePriority,
            includeKeywords,
            excludeKeywords);

        return fromImagePreferred ?? PickProduct(
            source,
            selected,
            category,
            acceptedPeriods,
            useCasePriority,
            includeKeywords,
            excludeKeywords);
#pragma warning restore CS0618
    }

    private static Product? TryReusePreviousProduct(
        IReadOnlyCollection<Product> source,
        ICollection<Product> selected,
        IReadOnlyDictionary<string, List<string>> previousRecommendationsByCategory,
        string category,
        IReadOnlyCollection<string> acceptedPeriods,
        IReadOnlyCollection<string>? excludeKeywords = null)
    {
        if (!previousRecommendationsByCategory.TryGetValue(category, out var previousNames) || previousNames.Count == 0)
        {
            return null;
        }

        var excluded = excludeKeywords ?? Array.Empty<string>();

        foreach (var previousName in previousNames)
        {
            var candidate = source
                .Where(product => string.Equals(product.Category, category, StringComparison.OrdinalIgnoreCase))
                .Where(product => string.Equals(product.Name, previousName, StringComparison.OrdinalIgnoreCase))
                .Where(product => acceptedPeriods.Any(period => MatchesPreferredPeriod(product, period)))
                .Where(product => !selected.Any(s => string.Equals(s.Name, product.Name, StringComparison.OrdinalIgnoreCase)))
                .Where(product => !excluded.Any() || !ContainsAnyKeyword(product, excluded))
                .OrderByDescending(product => HasValidImageUrl(product))
                .ThenByDescending(product => product.Priority)
                .FirstOrDefault();

            if (candidate is null)
            {
                continue;
            }

            selected.Add(candidate);
            return candidate;
        }

        return null;
    }

    private static bool MatchesPreferredPeriod(Product product, string period)
    {
#pragma warning disable CS0618
        return string.Equals(period, "both", StringComparison.OrdinalIgnoreCase)
            ? string.Equals(product.PreferredPeriod, "both", StringComparison.OrdinalIgnoreCase)
            : string.Equals(product.PreferredPeriod, period, StringComparison.OrdinalIgnoreCase) ||
              string.Equals(product.PreferredPeriod, "both", StringComparison.OrdinalIgnoreCase);
#pragma warning restore CS0618
    }

    private static bool ContainsAnyKeyword(Product product, IReadOnlyCollection<string> keywords)
    {
        if (!keywords.Any())
        {
            return true;
        }

        var normalizedKeywords = keywords.Select(NormalizeText).Where(value => !string.IsNullOrWhiteSpace(value)).ToArray();
        if (normalizedKeywords.Length == 0)
        {
            return true;
        }

        var haystack = NormalizeText($"{product.Name} {product.Highlight} {string.Join(' ', product.UseCases)}");
        return normalizedKeywords.Any(keyword => haystack.Contains(keyword, StringComparison.Ordinal));
    }

    private static string NormalizeText(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Normalize(NormalizationForm.FormD);
        var chars = normalized
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .ToArray();
        return new string(chars).ToLowerInvariant();
    }

    private static void AddRoutineStep(List<string> destination, Product? product, string? recurrenceOverride = null)
    {
        if (product is null)
        {
            return;
        }

        if (destination.Any(step => step.Contains($": {product.Name}", StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        if (IsSingleStepCategory(product.Category) &&
            destination.Any(step => step.StartsWith($"{product.Category}:", StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        destination.Add(BuildRoutineStep(product, recurrenceOverride));
    }

    private static bool IsSingleStepCategory(string category)
    {
        return string.Equals(category, "Limpeza", StringComparison.OrdinalIgnoreCase)
            || string.Equals(category, "Serum", StringComparison.OrdinalIgnoreCase)
            || string.Equals(category, "Hidratante", StringComparison.OrdinalIgnoreCase)
            || string.Equals(category, "Protetor", StringComparison.OrdinalIgnoreCase)
            || string.Equals(category, "Retinoide", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildRoutineStep(Product product, string? recurrenceOverride = null)
    {
#pragma warning disable CS0618
        var recurrenceValue = string.IsNullOrWhiteSpace(recurrenceOverride) ? product.Recurrence : recurrenceOverride;
        var recurrence = string.Equals(recurrenceValue, "daily", StringComparison.OrdinalIgnoreCase)
            ? string.Empty
            : $" ({recurrenceValue})";

        return $"{product.Category}: {product.Name}{recurrence}";
#pragma warning restore CS0618
    }

    private static string BuildRecommendationReason(Product product)
    {
        var activeText = product.Actives.Length > 0
            ? $" Ativos: {string.Join(", ", product.Actives)}."
            : string.Empty;

        var concernText = product.Concerns.Length > 0
            ? $" Focado em: {string.Join(", ", product.Concerns)}."
            : string.Empty;

        if (string.IsNullOrWhiteSpace(product.Brand) && string.IsNullOrWhiteSpace(activeText) && string.IsNullOrWhiteSpace(concernText))
        {
            return $"Selecionado para a categoria {product.Category} com base na analise de pele.";
        }

        return $"{product.Brand} {product.Name}.{concernText}{activeText}".Trim();
    }

    private static string ResolveProductImageUrl(Product product)
    {
        // Priorizar imagem real do produto se disponível
        if (!string.IsNullOrWhiteSpace(product.ImageUrl))
        {
            return product.ImageUrl;
        }

        // Fallback para placeholder por categoria
        return NormalizeText(product.Category) switch
        {
            "cleanser" => "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
            "serum" => "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=80",
            "moisturizer" => "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80",
            "sunscreen" => "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
            "treatment" => "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?auto=format&fit=crop&w=900&q=80",
            "eye" => "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
            "lip" => "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=80",
            _ => "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=80"
        };
    }

    private static bool HasValidImageUrl(Product product)
    {
        return !string.IsNullOrWhiteSpace(product.ImageUrl);
    }

    private static string BuildProductHighlight(Product product)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(product.Brand))
        {
            parts.Add(product.Brand);
        }

        if (product.Concerns.Length > 0)
        {
            parts.Add(string.Join(", ", product.Concerns));
        }

        if (product.Actives.Length > 0)
        {
            parts.Add(string.Join(", ", product.Actives));
        }

        return parts.Count == 0 ? string.Empty : string.Join(" | ", parts);
    }

    private static int ComputePriority(Product product)
    {
        var priceScore = product.PriceRange.ToLowerInvariant() switch
        {
            "low" => 100,
            "medium" => 80,
            "high" => 60,
            _ => 75,
        };

        var strengthScore = product.StrengthLevel.ToLowerInvariant() switch
        {
            "leve" => 0,
            "medio" => 5,
            "forte" => 10,
            _ => 0,
        };

        return priceScore + strengthScore;
    }

    private static bool IsSkinTypeMatch(IEnumerable<string> supportedSkinTypes, string skinType)
    {
        var list = supportedSkinTypes?.ToArray() ?? Array.Empty<string>();
        if (list.Length == 0)
        {
            return true;
        }

        var normalizedSkinType = NormalizeText(skinType);

        return list.Any(value =>
            NormalizeText(value) == normalizedSkinType ||
            NormalizeText(value) == "todas" ||
            NormalizeText(value) == "todos" ||
            NormalizeText(value) == "geral");
    }

    private static IReadOnlyCollection<string> BuildUseCasePriority(AnalysisConditionsDto conditions)
    {
        var result = new List<string>();
        if (conditions.Acne)
        {
            result.Add("acne");
            result.Add("espinha ativa");
            result.Add("inflamacao");
        }

        if (conditions.Manchas)
        {
            result.Add("manchas");
        }

        if (conditions.Poros)
        {
            result.Add("poros");
        }

        if (conditions.Olheiras)
        {
            result.Add("olheiras");
        }

        if (conditions.LabiosRessecados)
        {
            result.Add("labios_ressecados");
        }

        return result;
    }

    private sealed class RoutinePlan
    {
        public List<Product> Products { get; set; } = new();

        public AnalysisRoutineDto Routine { get; set; } = new();
    }

    private static int CalculateOverallScore(AnalysisScoresDto scores)
    {
        var averageSeverity = (scores.Acne + scores.Oiliness + scores.DarkSpots + scores.Sensitivity) / 4.0;
        var overall = 100 - (averageSeverity * 10);
        return Math.Clamp((int)Math.Round(overall), 0, 100);
    }

    private static AnalysisScoresDto BuildScoresFromAnalysis(AnalysisScoresDto? aiScores)
    {
        if (aiScores is null)
        {
            throw new InvalidOperationException("A IA nao retornou scores validos para a analise.");
        }

        return new AnalysisScoresDto
        {
            Acne = Math.Clamp(aiScores.Acne, 0, 10),
            Oiliness = Math.Clamp(aiScores.Oiliness, 0, 10),
            DarkSpots = Math.Clamp(aiScores.DarkSpots, 0, 10),
            Hydration = Math.Clamp(aiScores.Hydration, 0, 10),
            Sensitivity = Math.Clamp(aiScores.Sensitivity, 0, 10),
            Poros = Math.Clamp(aiScores.Poros, 0, 10),
            Olheiras = Math.Clamp(aiScores.Olheiras, 0, 10),
            LinhasFinas = Math.Clamp(aiScores.LinhasFinas, 0, 10),
            Vermelhidao = Math.Clamp(aiScores.Vermelhidao, 0, 10),
            EspinhasAtivas = Math.Clamp(aiScores.EspinhasAtivas, 0, 10),
            Cravos = Math.Clamp(aiScores.Cravos, 0, 10)
        };
    }

    private static string NormalizeSkinType(string skinType)
    {
        if (string.IsNullOrWhiteSpace(skinType))
        {
            return "indefinida";
        }

        return NormalizeText(skinType) switch
        {
            "oily" => "oleosa",
            "dry" => "seca",
            "combination" => "mista",
            "normal" => "normal",
            "sensitive" => "sensivel",
            "oleosa" => "oleosa",
            "seca" => "seca",
            "mista" => "mista",
            "sensivel" => "sensivel",
            "acneica" => "acneica",
            _ => NormalizeText(skinType)
        };
    }

    private static AnalysisConditionsDto EnrichConditions(
        AnalysisConditionsDto? rawConditions,
        AnalysisScoresDto? scores,
        string? additionalRecommendations,
        string? summary)
    {
        var conditions = rawConditions ?? new AnalysisConditionsDto();
        var text = NormalizeText($"{additionalRecommendations} {summary}");

        var acneFromText = ContainsAny(text, "acne", "espinha", "espinhas", "comedao", "comedoes", "lesao inflamatoria");
        var darkSpotsFromText = ContainsAny(text, "mancha", "manchas", "hiperpigment", "melasma", "pigment", "tom desigual");
        var poresFromText = ContainsAny(text, "poro", "poros", "poros dilatados", "textura irregular");
        var darkCirclesFromText = ContainsAny(text, "olheira", "olheiras", "dark circle", "dark circles");
        var dryLipsFromText = ContainsAny(text, "labio ressecado", "labios ressecados", "ressecamento labial");

        var acneFromScore = scores is not null && scores.Acne >= 5;
        var darkSpotsFromScore = scores is not null && scores.DarkSpots >= 5;
        var poresFromScore = scores is not null && scores.Oiliness >= 7;

        return new AnalysisConditionsDto
        {
            Acne = conditions.Acne || acneFromText || acneFromScore,
            Olheiras = conditions.Olheiras || darkCirclesFromText,
            Poros = conditions.Poros || poresFromText || poresFromScore,
            Manchas = conditions.Manchas || darkSpotsFromText || darkSpotsFromScore,
            LabiosRessecados = conditions.LabiosRessecados || dryLipsFromText,
        };
    }

    private static bool ContainsAny(string haystack, params string[] needles)
    {
        if (string.IsNullOrWhiteSpace(haystack) || needles.Length == 0)
        {
            return false;
        }

        return needles.Any(needle => haystack.Contains(NormalizeText(needle), StringComparison.Ordinal));
    }
}
