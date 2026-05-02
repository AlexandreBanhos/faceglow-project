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
    Guid? ProductId,
    string? ScheduleDays = null    // JSON array ex: "[\"mon\",\"tue\",\"wed\"]"
);

public record ReorderStepsRequest(
    string Period,
    List<Guid> StepIds  // IDs na nova ordem desejada
);
