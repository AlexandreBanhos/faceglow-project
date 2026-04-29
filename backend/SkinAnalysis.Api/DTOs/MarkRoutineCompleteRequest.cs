namespace SkinAnalysis.Api.DTOs;

public record MarkRoutineCompleteRequest(
    string Period // "morning", "night", or "both"
);
