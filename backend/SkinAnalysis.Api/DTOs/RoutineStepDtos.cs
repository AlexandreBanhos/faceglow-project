namespace SkinAnalysis.Api.DTOs;

public record AddRoutineStepRequest(
    string Period,
    string ProductName,
    string? Category,
    string? ImageUrl,
    string? Recurrence
);

public record PatchRoutineStepRequest(
    string? SelectedTier,
    string? OverrideProductName,
    string? OverrideImageUrl,
    Guid? ProductId
);
