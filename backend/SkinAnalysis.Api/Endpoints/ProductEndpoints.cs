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

        // Enriquecimento com IA
        app.MapPost("/admin/products/enrich", EnrichProductHandler)
            .WithName("EnrichProduct").WithOpenApi().RequireAuthorization();

        app.MapPost("/admin/products/{id:guid}/enrich", EnrichAndSaveProductHandler)
            .WithName("EnrichAndSaveProduct").WithOpenApi().RequireAuthorization();
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
                p.Description, p.Tagline, p.PriceRange, p.PriceAvg,
                p.CompatibleSkinTypes, p.TargetsConcerns,
                p.CurationScore, p.IsStaffPick,
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

            // Projeção direta: evita referência circular Product ↔ ProductImage ↔ Product
            var products = await dbContext.Products
                .AsNoTracking()
                .Where(p => string.IsNullOrEmpty(search) || p.Name.ToLower().Contains(search) || p.Brand.ToLower().Contains(search))
                .OrderByDescending(p => p.CurationScore).ThenByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id, p.Name, p.Brand, p.StepTypeKey,
                    p.Description, p.Tagline,
                    p.CompatibleSkinTypes, p.TargetsConcerns, p.SuitablePeriods,
                    p.StrengthLevel, p.RecommendedFrequency,
                    p.PriceAvg, p.PriceRange, p.Currency,
                    p.CurationScore, p.IsStaffPick, p.IsDermaTested, p.IsActive,
                    p.CreatedAt, p.UpdatedAt,
                    PrimaryImageUrl = p.Images.OrderBy(i => i.Position).Select(i => i.PublicUrl).FirstOrDefault(),
                })
                .ToListAsync(cancellationToken);

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
            Description = request.Description,
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
            product.Description = request.Description ?? product.Description;
            product.UpdatedAt = DateTime.UtcNow;

            // Atualiza imagem se fornecida no request
            if (!string.IsNullOrWhiteSpace(request.ImageUrl))
            {
                var existingImage = await dbContext.ProductImages
                    .Where(img => img.ProductId == product.Id && img.Position == 0)
                    .FirstOrDefaultAsync(cancellationToken);

                if (existingImage is not null)
                {
                    existingImage.PublicUrl = request.ImageUrl;
                    existingImage.Source = "uploaded";
                }
                else
                {
                    dbContext.ProductImages.Add(new ProductImage
                    {
                        ProductId = product.Id,
                        PublicUrl = request.ImageUrl,
                        Position = 0,
                        Source = "uploaded"
                    });
                }
            }

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

    // ── Enriquecimento com IA ─────────────────────────────────────────────────

    /// <summary>Busca dados do produto via Gemini sem salvar (preview para o admin revisar).</summary>
    private static async Task<IResult> EnrichProductHandler(
        EnrichmentRequest request, ClaimsPrincipal user, AdminService adminService,
        ProductEnrichmentService enrichmentService, ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        var userGuid = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userGuid.HasValue) return Results.Unauthorized();

        var isAdmin = await adminService.IsUserAdminAsync(userGuid.Value, cancellationToken);
        if (!isAdmin) return Results.Forbid();

        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Brand))
            return Results.BadRequest(new { error = "Name e Brand são obrigatórios." });

        try
        {
            var result = await enrichmentService.EnrichAsync(request.Name, request.Brand, cancellationToken);
            if (result is null) return Results.Problem("Gemini não retornou dados estruturados para este produto.");
            return Results.Ok(result);
        }
        catch (TimeoutException ex)
        {
            return Results.Problem(title: "Timeout", detail: ex.Message, statusCode: StatusCodes.Status408RequestTimeout);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[EnrichProduct] Error for '{Name}' ({Brand})", request.Name, request.Brand);
            return Results.Problem(detail: ex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
    }

    /// <summary>Busca dados via Gemini E atualiza os campos vazios do produto no banco.</summary>
    private static async Task<IResult> EnrichAndSaveProductHandler(
        Guid id, ClaimsPrincipal user, AdminService adminService,
        AppDbContext dbContext, ProductEnrichmentService enrichmentService,
        ILogger<Program> logger, CancellationToken cancellationToken)
    {
        var userGuid = EndpointHelpers.GetAuthenticatedUserId(user);
        if (!userGuid.HasValue) return Results.Unauthorized();

        var isAdmin = await adminService.IsUserAdminAsync(userGuid.Value, cancellationToken);
        if (!isAdmin) return Results.Forbid();

        var product = await dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product is null) return Results.NotFound();

        try
        {
            var result = await enrichmentService.EnrichAsync(product.Name, product.Brand, cancellationToken);
            if (result is null) return Results.Problem("Gemini não retornou dados estruturados.");

            // Só preenche campos que estão vazios/nulos (não sobrescreve dados já curados)
            if (string.IsNullOrWhiteSpace(product.Description) && !string.IsNullOrWhiteSpace(result.Description))
                product.Description = result.Description;
            if (string.IsNullOrWhiteSpace(product.Tagline) && !string.IsNullOrWhiteSpace(result.Tagline))
                product.Tagline = result.Tagline;
            if (string.IsNullOrWhiteSpace(product.StepTypeKey) && !string.IsNullOrWhiteSpace(result.StepTypeKey))
                product.StepTypeKey = result.StepTypeKey;
            if (product.CompatibleSkinTypes.Length == 0 && result.CompatibleSkinTypes.Length > 0)
                product.CompatibleSkinTypes = result.CompatibleSkinTypes;
            if (product.TargetsConcerns.Length == 0 && result.TargetsConcerns.Length > 0)
                product.TargetsConcerns = result.TargetsConcerns;
            if (string.IsNullOrWhiteSpace(product.StrengthLevel) && !string.IsNullOrWhiteSpace(result.StrengthLevel))
                product.StrengthLevel = result.StrengthLevel;
            if (product.PriceAvg is null && result.EstimatedPriceBRL.HasValue)
                product.PriceAvg = result.EstimatedPriceBRL;
            if (string.IsNullOrWhiteSpace(product.PriceRange) && !string.IsNullOrWhiteSpace(result.PriceRange))
                product.PriceRange = result.PriceRange;

            product.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(new { updated = true, product.Id, result });
        }
        catch (TimeoutException ex)
        {
            return Results.Problem(title: "Timeout", detail: ex.Message, statusCode: StatusCodes.Status408RequestTimeout);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[EnrichAndSave] Error for product {Id}", id);
            return Results.Problem(detail: ex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
    }
}
