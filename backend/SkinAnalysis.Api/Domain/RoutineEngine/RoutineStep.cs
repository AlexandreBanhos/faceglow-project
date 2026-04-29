namespace SkinAnalysis.Api.Domain.RoutineEngine;

public sealed class RoutineStep
{
    public string Period { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public Guid ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public string Recurrence { get; init; } = "daily";

    public string Reason { get; init; } = string.Empty;

    public string DisplayText => string.Equals(Recurrence, "daily", StringComparison.OrdinalIgnoreCase)
        ? $"{Category}: {ProductName}"
        : $"{Category}: {ProductName} ({Recurrence})";
}