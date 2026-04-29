namespace SkinAnalysis.Api.Models;

public class UserCredit
{
    public Guid UserId { get; set; }

    public int CreditsRemaining { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
