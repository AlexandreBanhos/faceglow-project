namespace SkinAnalysis.Api.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SkinAnalysisRecord> SkinAnalyses { get; set; } = new List<SkinAnalysisRecord>();
    public ICollection<SkinProfile> SkinProfiles { get; set; } = new List<SkinProfile>();
    public ICollection<UserRoutine> Routines { get; set; } = new List<UserRoutine>();
    public ICollection<UserProduct> UserProducts { get; set; } = new List<UserProduct>();
}
