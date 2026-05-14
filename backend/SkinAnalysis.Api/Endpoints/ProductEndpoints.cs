using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Helpers;
using SkinAnalysis.Api.Models;
using SkinAnalysis.Api.Services;

namespace SkinAnalysis.Api.Endpoints;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this WebApplication app)
    {
        app.MapGet("/products/catalog", GetCatalogHandler)
            .WithName("GetProductCatalog").RequireAuthorization();

        app.MapGet("/admin/products", GetAdminProductsHandler)
            .WithName("GetAdminProducts").WithOpenApi().RequireAuthorization();

        app.MapPost("/admin/products", CreateAdminProductHandler)
            .WithName("CreateAdminProduct").WithOpenApi().RequireAuthorization();

        app.MapPut("/admin/products/{id:guid}", UpdateAdminProductHandler)
            .WithName("UpdateAdminProduct").WithOpenApi().RequireAuthorization();

        app.MapDelete("/admin/products/{id:guid}", DeleteAdminProductHandler)
            .WithName("DeleteAdminProduct").WithOpenApi().RequireAuthorization();
    }

    private static async Task<IResult> GetCatalogHandler(HttpContext ctx, AppDbContext db, CancellationToken ct)
    {
        var stepType = ctx.Request.Query["stepType"].FirstOrDefault()?.Trim();
        var search = ctx.Request.Query["search"].FirstOrDefault()?.Trim().ToLowerInvariant();

        var products = await db.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Where(p => string.IsNullOrEmpty(stepType) || p.StepTypeKey == stepType)
            .Where(p => string.IsNullOrEmpty(search) || p.Name.ToLower().Contains(search) || p.Brand.ToLower().Contains(search))
            .OrderByDescending(p => p.CurationScore)
            .Select(p => new {
                p.Id, p.Name, p.Brand, p.StepTypeKey,
                p.Tagline, p.PriceRange, p.CurationScore, p.IsStaffPick,
                ImageUrl = p.Images.OrderBy(i => i.Position).Select(i => i.PublicUrl).FirstOrDefault(),
            })
            .Take(20)
            .ToListAsync(ct);

        return Results.Ok(products);
    }

    private static async Task<IResult> GetAdminProductsHandler(
        HttpContext httpContext, ClaimsPrincipal user, AdminService adminService,
        AppDbContext dbContext, ILogger<Program> logger, CancellationToken cancellationToken)
    {
        try
        {
            var userGuid = EndpointHelpers.GetAuthenticatedUserId(user);
            if (!userGuid.HasValue) { logger.LogWarning("[AdminProducts] Unauthorized"); return Results.Unauthorized(); }

            var isAdmin = await adminService.IsUserAdminAsync(userGuid.Value, cancellationToken);
            if (!isAdmin) { logger.LogWarning("[AdminProducts] Forbidden - user {UserId}", userGuid); return Results.Forbid(); }

            var search = httpContext.Request.Query["search"].FirstOrDefault()?.Trim().ToLowerInvariant();
            var query = dbContext.Products.Include(p => p.Images).AsQueryable();
            if (!string.IsNullOrEmpty(search))
                query = query.Where(p => p.Name.ToLower().Contains(search) || p.Brand.ToLower().Contains(search));

            var products = await query
                .OrderByDescending(p => p.CurationScore).ThenByDescending(p => p.CreatedAt)
                .AsNoTracking().ToListAsync(cancellationToken);

            return Results.Ok(products);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminProducts] Error: {Message}", ex.Message);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> CreateAdminProductHandler(
        CreateAdminProductDto request, ClaimsPrincipal user, AdminService adminService,
        AppDbContext dbContext, ILogger<Program> logger, CancellationToken cancellationToken)
    {
        var userGuid = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userGuid.HasValue) return Results.Unauthorized();

        var isAdmin = await adminService.IsUserAdminAsync(userGuid.Value, cancellationToken);
        if (!isAdmin) { logger.LogWarning("[POST AdminProducts] Forbidden - user {UserId}", userGuid); return Results.Forbid(); }

        if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest(new { error = "Name is required" });

        var product = new Product
        {
            Name = request.Name,
            Brand = request.Brand,
            StepTypeKey = request.StepTypeKey,
            CompatibleSkinTypes = request.CompatibleSkinTypes ?? [],
            TargetsConcerns = request.TargetsConcerns ?? [],
            StrengthLevel = request.StrengthLevel ?? "mild",
            SuitablePeriods = request.SuitablePeriods?.Length > 0 ? request.SuitablePeriods : ["morning", "night"],
            PriceRange = request.PriceRange,
            PriceAvg = request.PriceAvg,
            CurationScore = request.CurationScore,
            IsActive = request.IsActive,
            Tagline = request.Tagline,
            CreatedAt = DateTime.UtcNow,
        };

        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            dbContext.ProductImages.Add(new ProductImage { ProductId = product.Id, PublicUrl = request.ImageUrl, Position = 0, Source = "uploaded" });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var dto = new AdminProductDto(
            product.Id, product.Name, product.Brand, product.StepTypeKey,
            product.CompatibleSkinTypes, product.TargetsConcerns, product.StrengthLevel,
            product.SuitablePeriods, product.PriceRange, product.PriceAvg,
            product.CurationScore, product.IsActive, product.PrimaryImageUrl, product.CreatedAt);

        return Results.Created($"/admin/products/{product.Id}", dto);
    }

    private static async Task<IResult> UpdateAdminProductHandler(
        Guid id, UpdateAdminProductDto request, ClaimsPrincipal user, AdminService adminService,
        AppDbContext dbContext, ILogger<Program> logger, CancellationToken cancellationToken)
    {
        try
        {
            var userGuid = EndpointHelpers.GetAuthenticatedUserId(user);
            if (!userGuid.HasValue) return Results.Unauthorized();

            var isAdmin = await adminService.IsUserAdminAsync(userGuid.Value, cancellationToken);
            if (!isAdmin) { logger.LogWarning("[PUT AdminProducts] Forbidden - user {UserId}", userGuid); return Results.Forbid(); }

            var product = await dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
            if (product == null) return Results.NotFound();
            if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest(new { error = "Name is required" });

            product.Name = request.Name ?? product.Name;
            product.Brand = request.Brand ?? product.Brand;
            product.StepTypeKey = request.StepTypeKey ?? product.StepTypeKey;
            product.CompatibleSkinTypes = request.CompatibleSkinTypes ?? product.CompatibleSkinTypes;
            product.TargetsConcerns = request.TargetsConcerns ?? product.TargetsConcerns;
            product.StrengthLevel = request.StrengthLevel ?? product.StrengthLevel;
            product.SuitablePeriods = request.SuitablePeriods ?? product.SuitablePeriods;
            product.PriceRange = request.PriceRange ?? product.PriceRange;
            product.PriceAvg = request.PriceAvg ?? product.PriceAvg;
            product.CurationScore = request.CurationScore;
            product.IsActive = request.IsActive;
            product.Tagline = request.Tagline ?? product.Tagline;
            product.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);

            var dto = new AdminProductDto(
                product.Id, product.Name, product.Brand, product.StepTypeKey,
                product.CompatibleSkinTypes, product.TargetsConcerns, product.StrengthLevel,
                product.SuitablePeriods, product.PriceRange, product.PriceAvg,
                product.CurationScore, product.IsActive, product.PrimaryImageUrl, product.CreatedAt);

            return Results.Ok(dto);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[PUT AdminProducts] Error: {Message}", ex.Message);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> DeleteAdminProductHandler(
        Guid id, ClaimsPrincipal user, AdminService adminService,
        AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var userGuid = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userGuid.HasValue) return Results.Unauthorized();

        var isAdmin = await adminService.IsUserAdminAsync(userGuid.Value, cancellationToken);
        if (!isAdmin) return Results.Forbid();

        var product = await dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product == null) return Results.NotFound();

        dbContext.Products.Remove(product);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }
}
