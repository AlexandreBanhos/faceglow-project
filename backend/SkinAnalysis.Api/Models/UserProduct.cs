namespace SkinAnalysis.Api.Models;

/// <summary>
/// Represents a user's personal product (custom or from catalog)
/// Separates user inventory from global catalog
/// </summary>
public class UserProduct
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public Guid ProductId { get; set; }

    /// <summary>
    /// Custom name if user overrides product name
    /// </summary>
    public string? CustomName { get; set; }

    /// <summary>
    /// Custom notes about this product for this user
    /// </summary>
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }

    public Product? Product { get; set; }
}
