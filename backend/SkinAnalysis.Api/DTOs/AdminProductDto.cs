namespace SkinAnalysis.Api.DTOs;

using System.ComponentModel.DataAnnotations;

public record AdminStatusResponse(bool IsAdmin);
public record AdminOperationResponse(string Message, bool IsAdmin);
public record AdminErrorResponse(string Error, string? Details = null);

public record AdminProductDto(
    Guid Id,
    string Name,
    string Brand,
    string StepTypeKey,
    string[] CompatibleSkinTypes,
    string[] TargetsConcerns,
    string StrengthLevel,
    string[] SuitablePeriods,
    string? PriceRange,
    decimal? PriceAvg,
    int CurationScore,
    bool IsActive,
    string? ImageUrl,
    DateTime CreatedAt
);

public record CreateAdminProductDto(
    [MaxLength(200)] string Name,
    [MaxLength(100)] string Brand,
    [MaxLength(50)]  string StepTypeKey,
    string[] CompatibleSkinTypes,
    string[] TargetsConcerns,
    [MaxLength(20)]  string StrengthLevel,
    string[] SuitablePeriods,
    [MaxLength(50)]  string? PriceRange,
    decimal? PriceAvg,
    [Range(0, 100)]  int CurationScore,
    bool IsActive,
    [MaxLength(1000)] string? ImageUrl,
    string? Tagline,
    string? Description
);

public record UpdateAdminProductDto(
    [MaxLength(200)] string Name,
    [MaxLength(100)] string Brand,
    [MaxLength(50)]  string StepTypeKey,
    string[] CompatibleSkinTypes,
    string[] TargetsConcerns,
    [MaxLength(20)]  string StrengthLevel,
    string[] SuitablePeriods,
    [MaxLength(50)]  string? PriceRange,
    decimal? PriceAvg,
    [Range(0, 100)]  int CurationScore,
    bool IsActive,
    [MaxLength(1000)] string? ImageUrl,
    string? Tagline,
    string? Description
);
