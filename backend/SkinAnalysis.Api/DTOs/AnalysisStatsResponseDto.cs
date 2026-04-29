namespace SkinAnalysis.Api.DTOs;

public class AnalysisStatsResponseDto
{
    public int TotalAnalyses { get; set; }

    public int BestScore { get; set; }

    public int StreakDays { get; set; }
}