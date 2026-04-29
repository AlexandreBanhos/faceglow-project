namespace SkinAnalysis.Api.Domain.RoutineEngine;

public sealed class Routine
{
    public RoutinePeriod Morning { get; init; } = new();

    public RoutinePeriod Night { get; init; } = new();
}