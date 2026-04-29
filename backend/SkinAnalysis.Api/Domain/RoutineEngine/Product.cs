namespace SkinAnalysis.Api.Domain.RoutineEngine;

public sealed class Product
{
    public Guid Id { get; init; }

    public string Name { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public string Recurrence { get; init; } = "daily";

    public string PreferredPeriod { get; init; } = "both";

    public string Highlight { get; init; } = string.Empty;

    public string ImageUrl { get; init; } = string.Empty;

    public IReadOnlyList<string> SkinTypes { get; init; } = Array.Empty<string>();

    public IReadOnlyList<string> UseCases { get; init; } = Array.Empty<string>();

    public int Priority { get; init; } = 100;

    public bool IsActive { get; init; } = true;
}