namespace SkinAnalysis.Api.DTOs;

public record UserProductSaveDto(
    string? Name,
    string? Category,
    string? ImageUrl,
    string? Note
);
