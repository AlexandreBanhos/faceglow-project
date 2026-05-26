using System.Collections.Concurrent;
using SkinAnalysis.Api.DTOs;

namespace SkinAnalysis.Api.Helpers;

internal sealed class AnalysisJob
{
    public string Status { get; private set; }
    public AnalysisResponseDto? Result { get; private set; }
    public string? Error { get; private set; }
    public Guid OwnerId { get; init; }

    public AnalysisJob(string status, Guid ownerId = default, AnalysisResponseDto? result = null, string? error = null)
    {
        Status = status;
        OwnerId = ownerId;
        Result = result;
        Error = error;
    }
}

internal static class AnalysisJobStore
{
    private static readonly ConcurrentDictionary<Guid, AnalysisJob> Jobs = new();

    public static void Set(Guid id, AnalysisJob job) => Jobs[id] = job;

    public static AnalysisJob? Get(Guid id) => Jobs.TryGetValue(id, out var job) ? job : null;

    public static void Complete(Guid id, AnalysisResponseDto result)
    {
        var ownerId = Jobs.TryGetValue(id, out var existing) ? existing.OwnerId : default;
        Jobs[id] = new AnalysisJob("completed", ownerId, result);
        ScheduleEviction(id, TimeSpan.FromMinutes(10));
    }

    public static void Fail(Guid id, string error)
    {
        var ownerId = Jobs.TryGetValue(id, out var existing) ? existing.OwnerId : default;
        Jobs[id] = new AnalysisJob("failed", ownerId, error: error);
        ScheduleEviction(id, TimeSpan.FromMinutes(2));
    }

    private static void ScheduleEviction(Guid id, TimeSpan after)
    {
        _ = Task.Run(async () =>
        {
            await Task.Delay(after);
            Jobs.TryRemove(id, out _);
        });
    }
}
