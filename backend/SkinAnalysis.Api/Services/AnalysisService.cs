using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Services;

public class AnalysisService(
    AppDbContext db,
    IImageAnalysisService imageAnalyzer,
    RoutineGeneratorService routineGenerator,
    ILogger<AnalysisService> logger) : IAnalysisService
{
    public async Task<AnalysisResponseDto> CreateQuickAnalysisAsync(
        AnalysisRequestDto request, CancellationToken ct)
    {
        if (!Guid.TryParse(request.UserId, out var userId))
            throw new ArgumentException("userId must be a valid UUID.");

        logger.LogInformation("[ANALYSIS] Starting for userId {UserId}", userId);

        var aiResult = await imageAnalyzer.AnalyzeImageAsync(request.ImageUrl, ct);

        var isFaceValid = aiResult.RostoValido ?? true;
        var isImageSharp = aiResult.ImagemNitida ?? true;
        var isAllowedContent = aiResult.ConteudoPermitido ?? true;
        if (!isFaceValid || !isImageSharp || !isAllowedContent)
        {
            var reason = string.IsNullOrWhiteSpace(aiResult.MotivoBloqueio)
                ? "Imagem invalida para analise. Envie uma selfie frontal, nitida, sem desfoque e com apenas um rosto humano."
                : aiResult.MotivoBloqueio.Trim();
            throw new ArgumentException(reason);
        }

        var skinType = NormalizeSkinType(
            string.IsNullOrWhiteSpace(aiResult.TipoPele) ? aiResult.SkinType : aiResult.TipoPele);
        var scores = BuildScores(aiResult.Scores);
        var conditions = EnrichConditions(aiResult.Condicoes, scores,
            aiResult.RecomendacoesAdicionais, aiResult.Summary);
        var notes = string.IsNullOrWhiteSpace(aiResult.RecomendacoesAdicionais)
            ? aiResult.Summary : aiResult.RecomendacoesAdicionais;

        var record = new SkinAnalysisRecord
        {
            Id          = Guid.NewGuid(),
            UserId      = userId,
            ImageUrl    = request.ImageUrl,
            SkinType    = skinType,
            Summary     = notes ?? string.Empty,
            AdditionalNotes = notes ?? string.Empty,
            AcneScore       = scores.Acne,
            OilinessScore   = scores.Oiliness,
            DarkSpotsScore  = scores.DarkSpots,
            HydrationScore  = scores.Hydration,
            SensitivityScore = scores.Sensitivity,
            AgingScore      = scores.LinhasFinas,
            RednessScore    = scores.Vermelhidao,
            HasActiveAcne    = conditions.Acne,
            HasDarkCircles   = conditions.Olheiras,
            HasEnlargedPores = conditions.Poros,
            HasBlackheads    = scores.Cravos >= 3,
            HasFineLines     = scores.LinhasFinas >= 3,
            Status      = "completed",
            ProcessedAt = DateTime.UtcNow,
            CreatedAt   = DateTime.UtcNow,
        };

        db.SkinAnalyses.Add(record);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("[ANALYSIS] Saved SkinAnalysis {Id}", record.Id);

        return MapToDto(record, conditions, scores);
    }

    public async Task<AnalysisResponseDto> BuildRoutineAsync(Guid analysisId, CancellationToken ct)
    {
        var record = await db.SkinAnalyses
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == analysisId, ct)
            ?? throw new InvalidOperationException("Analysis not found.");

        // Ensure skin profile exists
        var profile = await db.SkinProfiles
            .FirstOrDefaultAsync(p => p.AnalysisId == analysisId && p.UserId == record.UserId, ct);

        if (profile is null)
        {
            // Deactivate previous current profile
            await db.SkinProfiles
                .Where(p => p.UserId == record.UserId && p.IsCurrent)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsCurrent, false), ct);

            profile = BuildProfile(record);
            db.SkinProfiles.Add(profile);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("[ANALYSIS] Created SkinProfile {ProfileId}", profile.Id);
        }

        // Generate routines
        await routineGenerator.GenerateForProfileAsync(profile, ct);

        return MapToDto(record, BuildConditionsFromRecord(record), BuildScoresFromRecord(record));
    }

    // ── DTO mapping ────────────────────────────────────────────────────────
    private static AnalysisResponseDto MapToDto(
        SkinAnalysisRecord r,
        AnalysisConditionsDto conditions,
        AnalysisScoresDto scores) => new()
    {
        Id = r.Id,
        UserId = r.UserId,
        ImageUrl = r.ImageUrl ?? string.Empty,
        SkinType = r.SkinType,
        Summary = r.Summary,
        Conditions = conditions,
        AdditionalRecommendations = r.AdditionalNotes,
        Scores = scores,
        OverallScore = r.OverallScore,
        CreatedAtUtc = r.CreatedAt,
        Routine = new AnalysisRoutineDto { Morning = new(), Night = new() },
        Recommendations = new(),
        HasRecommendations = false,
    };

    private static AnalysisConditionsDto BuildConditionsFromRecord(SkinAnalysisRecord r) => new()
    {
        Acne = r.HasActiveAcne,
        Olheiras = r.HasDarkCircles,
        Poros = r.HasEnlargedPores,
        Manchas = r.DarkSpotsScore >= 4,
        LabiosRessecados = false,
    };

    private static AnalysisScoresDto BuildScoresFromRecord(SkinAnalysisRecord r) => new()
    {
        Acne = r.AcneScore,
        Oiliness = r.OilinessScore,
        DarkSpots = r.DarkSpotsScore,
        Hydration = r.HydrationScore,
        Sensitivity = r.SensitivityScore,
        LinhasFinas = r.AgingScore,
        Vermelhidao = r.RednessScore,
    };

    // ── Profile builder ────────────────────────────────────────────────────
    private static SkinProfile BuildProfile(SkinAnalysisRecord r)
    {
        var concerns = new List<string>();
        if (r.AcneScore >= 4 || r.HasActiveAcne) concerns.Add("acne");
        if (r.DarkSpotsScore >= 4) concerns.Add("manchas");
        if (r.OilinessScore >= 5) concerns.Add("oleosidade");
        if (r.HydrationScore <= 4) concerns.Add("hidratacao");
        if (r.HasDarkCircles) concerns.Add("olheiras");
        if (r.HasEnlargedPores) concerns.Add("poros");
        if (r.AgingScore >= 4) concerns.Add("anti_aging");

        return new SkinProfile
        {
            UserId = r.UserId,
            AnalysisId = r.Id,
            IsCurrent = true,
            Source = "ai_analysis",
            SkinType = r.SkinType,
            AcneScore = r.AcneScore,
            OilinessScore = r.OilinessScore,
            DarkSpotsScore = r.DarkSpotsScore,
            HydrationScore = r.HydrationScore,
            SensitivityScore = r.SensitivityScore,
            AgingScore = r.AgingScore,
            RednessScore = r.RednessScore,
            HasActiveAcne = r.HasActiveAcne,
            HasDarkCircles = r.HasDarkCircles,
            HasEnlargedPores = r.HasEnlargedPores,
            HasFineLines = r.AgingScore >= 3,
            PrimaryConcerns = [.. concerns],
        };
    }

    // ── AI score normalization ─────────────────────────────────────────────
    private static AnalysisScoresDto BuildScores(AnalysisScoresDto? ai)
    {
        if (ai is null) throw new InvalidOperationException("IA não retornou scores válidos.");
        return new AnalysisScoresDto
        {
            Acne        = Math.Clamp(ai.Acne, 0, 10),
            Oiliness    = Math.Clamp(ai.Oiliness, 0, 10),
            DarkSpots   = Math.Clamp(ai.DarkSpots, 0, 10),
            Hydration   = Math.Clamp(ai.Hydration, 0, 10),
            Sensitivity = Math.Clamp(ai.Sensitivity, 0, 10),
            Poros       = Math.Clamp(ai.Poros, 0, 10),
            Olheiras    = Math.Clamp(ai.Olheiras, 0, 10),
            LinhasFinas = Math.Clamp(ai.LinhasFinas, 0, 10),
            Vermelhidao = Math.Clamp(ai.Vermelhidao, 0, 10),
            EspinhasAtivas = Math.Clamp(ai.EspinhasAtivas, 0, 10),
            Cravos      = Math.Clamp(ai.Cravos, 0, 10),
        };
    }

    private static AnalysisConditionsDto EnrichConditions(
        AnalysisConditionsDto? raw, AnalysisScoresDto scores,
        string? additional, string? summary)
    {
        var c = raw ?? new AnalysisConditionsDto();
        var text = Normalize($"{additional} {summary}");

        return new AnalysisConditionsDto
        {
            Acne = c.Acne || scores.Acne >= 5 || ContainsAny(text, "acne","espinha","comedao"),
            Olheiras = c.Olheiras || ContainsAny(text, "olheira","dark circle"),
            Poros = c.Poros || scores.Oiliness >= 7 || ContainsAny(text, "poro","textura irregular"),
            Manchas = c.Manchas || scores.DarkSpots >= 5 || ContainsAny(text, "mancha","hiperpigment","melasma"),
            LabiosRessecados = c.LabiosRessecados || ContainsAny(text, "labio ressecado","labios ressecados"),
        };
    }

    private static string Normalize(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return string.Empty;
        var nf = s.Normalize(NormalizationForm.FormD);
        return new string(nf.Where(c =>
            CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark
        ).ToArray()).ToLowerInvariant();
    }

    private static bool ContainsAny(string haystack, params string[] needles)
        => needles.Any(n => haystack.Contains(Normalize(n), StringComparison.Ordinal));

    private static string NormalizeSkinType(string raw) => Normalize(raw) switch
    {
        "oily" or "oleosa" => "oleosa",
        "dry"  or "seca"   => "seca",
        "combination" or "mista" => "mista",
        "normal"    => "normal",
        "sensitive" or "sensivel" => "sensivel",
        "acneica"   => "acneica",
        _ => Normalize(raw) is { Length: > 0 } n ? n : "normal",
    };
}
