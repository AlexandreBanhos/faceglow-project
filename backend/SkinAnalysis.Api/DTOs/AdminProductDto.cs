namespace SkinAnalysis.Api.DTOs;

using System.ComponentModel.DataAnnotations;

/// <summary>
/// Response for admin status check
/// </summary>
public record AdminStatusResponse(bool IsAdmin);

/// <summary>
/// Response for admin setup/promotion operations
/// </summary>
public record AdminOperationResponse(string Message, bool IsAdmin);

/// <summary>
/// Error response for admin operations
/// </summary>
public record AdminErrorResponse(string Error, string? Details = null);

/// <summary>
/// Product DTO for admin management
/// </summary>
public record AdminProductDto(
    Guid Id,
    string Name,
    string Brand,
    string Category,
    string[] SkinTypes,
    string[] Concerns,
    string[] Actives,
    string StrengthLevel,
    string[] Period,
    string PriceRange,
    decimal? PriceAvg,
    int Priority,
    bool IsActive,
    string? ImageUrl,
    DateTime CreatedAt
);

/// <summary>
/// Create product DTO with validation
/// </summary>
public record CreateAdminProductDto(
    [MaxLength(200)]
    string Name,
    [MaxLength(100)]
    string Brand,
    [MaxLength(100)]
    string Category,
    [MaxLength(20)]
    string[] SkinTypes,
    [MaxLength(30)]
    string[] Concerns,
    [MaxLength(50)]
    string[] Actives,
    [MaxLength(20)]
    string StrengthLevel,
    [MaxLength(7)]
    string[] Period,
    [MaxLength(50)]
    string PriceRange,
    decimal? PriceAvg,
    [Range(0, 10000)]
    int Priority,
    bool IsActive,
    [MaxLength(500)]
    string? ImageUrl
);

/// <summary>
/// Update product DTO with validation
/// </summary>
public record UpdateAdminProductDto(
    [MaxLength(200)]
    string Name,
    [MaxLength(100)]
    string Brand,
    [MaxLength(100)]
    string Category,
    [MaxLength(20)]
    string[] SkinTypes,
    [MaxLength(30)]
    string[] Concerns,
    [MaxLength(50)]
    string[] Actives,
    [MaxLength(20)]
    string StrengthLevel,
    [MaxLength(7)]
    string[] Period,
    [MaxLength(50)]
    string PriceRange,
    decimal? PriceAvg,
    [Range(0, 10000)]
    int Priority,
    bool IsActive,
    [MaxLength(500)]
    string? ImageUrl
);

/// <summary>
/// Pagination result for product listing
/// </summary>
public record AdminProductPageResponse(
    List<AdminProductDto> Items,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages,
    bool HasNextPage,
    bool HasPreviousPage
);
