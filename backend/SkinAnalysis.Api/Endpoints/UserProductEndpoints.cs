using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Endpoints;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Endpoints;

public static class UserProductEndpoints
{
    public static void MapUserProductEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/products/my")
            .WithTags("User Products")
            .WithOpenApi()
            .RequireAuthorization();

        group.MapGet("/", GetMyProductsHandler).WithName("GetMyProducts");
        group.MapPost("/", CreateMyProductHandler).WithName("CreateMyProduct");
        group.MapPatch("/{productId:guid}", UpdateMyProductHandler).WithName("UpdateMyProduct");
        group.MapDelete("/{productId:guid}", DeleteMyProductHandler).WithName("DeleteMyProduct");
    }

    private static (Guid id, bool valid) GetUserId(ClaimsPrincipal user)
    {
        var claim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? (id, true) : (Guid.Empty, false);
    }

    private static async Task<IResult> GetMyProductsHandler(
        ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var products = await db.UserProducts
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Include(p => p.CatalogProduct).ThenInclude(cp => cp!.Images)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        return Results.Ok(products.Select(p => new
        {
            p.Id,
            Name = p.DisplayName,
            Brand = p.CatalogProduct?.Brand ?? p.CustomBrand,
            Category = p.StepTypeKey,
            ImageUrl = p.DisplayImageUrl,
            p.CreatedAt,
        }));
    }

    private static async Task<IResult> CreateMyProductHandler(
        CreateUserProductRequest request, ClaimsPrincipal user,
        AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { error = "Nome do produto é obrigatório." });

        var product = new UserProduct
        {
            UserId = userId,
            CustomName = request.Name.Trim(),
            CustomBrand = request.Brand?.Trim(),
            CustomImageUrl = request.ImageUrl?.Trim(),
            StepTypeKey = string.IsNullOrWhiteSpace(request.Category)
                ? null
                : StepDisplayNames.ResolveKey(request.Category),
        };

        db.UserProducts.Add(product);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/products/my/{product.Id}",
            new { product.Id, Name = product.DisplayName, product.StepTypeKey, ImageUrl = product.DisplayImageUrl });
    }

    private static async Task<IResult> UpdateMyProductHandler(
        Guid productId, UpdateUserProductRequest request,
        ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var product = await db.UserProducts
            .FirstOrDefaultAsync(p => p.Id == productId && p.UserId == userId, ct);
        if (product is null) return Results.NotFound(new { error = "Produto não encontrado." });

        if (request.Name is not null) product.CustomName = request.Name.Trim();
        if (request.Brand is not null) product.CustomBrand = request.Brand.Trim();
        if (request.Category is not null)
            product.StepTypeKey = string.IsNullOrWhiteSpace(request.Category)
                ? null
                : StepDisplayNames.ResolveKey(request.Category);
        if (request.ImageUrl is not null) product.CustomImageUrl = request.ImageUrl.Trim();
        product.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Results.Ok(new { product.Id, Name = product.DisplayName, product.StepTypeKey });
    }

    private static async Task<IResult> DeleteMyProductHandler(
        Guid productId, ClaimsPrincipal user,
        AppDbContext db, CancellationToken ct)
    {
        var (userId, valid) = GetUserId(user);
        if (!valid) return Results.Unauthorized();

        var product = await db.UserProducts
            .FirstOrDefaultAsync(p => p.Id == productId && p.UserId == userId, ct);
        if (product is null) return Results.NotFound(new { error = "Produto não encontrado." });

        db.UserProducts.Remove(product);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { message = "Produto removido." });
    }
}

public record CreateUserProductRequest(string Name, string? Brand, string? Category, string? ImageUrl);
public record UpdateUserProductRequest(string? Name, string? Brand, string? Category, string? ImageUrl);
