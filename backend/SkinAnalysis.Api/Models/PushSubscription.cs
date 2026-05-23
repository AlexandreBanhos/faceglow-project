using System.ComponentModel.DataAnnotations.Schema;

namespace SkinAnalysis.Api.Models;

[Table("push_subscriptions")]
public class PushSubscription
{
    public Guid   Id        { get; set; } = Guid.NewGuid();
    public Guid   UserId    { get; set; }
    public string Endpoint  { get; set; } = "";
    public string P256dh    { get; set; } = "";
    public string Auth      { get; set; } = "";
    public string? UserAgent{ get; set; }

    public bool PrefRoutineMorning  { get; set; } = true;
    public bool PrefRoutineNight    { get; set; } = true;
    public bool PrefAnalysisWeekly  { get; set; } = true;
    public bool PrefPendingSteps    { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
