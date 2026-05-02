namespace SkinAnalysis.Api.DTOs;

public record MarkRoutineCompleteRequest(
    string Period,         // "morning", "night", or "both"
    string? LocalDate = null // "YYYY-MM-DD" no timezone local do usuário
);
