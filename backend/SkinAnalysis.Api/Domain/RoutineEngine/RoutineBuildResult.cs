namespace SkinAnalysis.Api.Domain.RoutineEngine;

public sealed class RoutineBuildResult
{
    public Routine Routine { get; init; } = new();

    public IReadOnlyList<Product> SelectedProducts { get; init; } = Array.Empty<Product>();

    public IReadOnlyList<string> Notes { get; init; } = Array.Empty<string>();
}