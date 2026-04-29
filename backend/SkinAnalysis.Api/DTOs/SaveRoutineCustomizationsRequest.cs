namespace SkinAnalysis.Api.DTOs;

public class SaveRoutineCustomizationsRequest
{
    /// <summary>
    /// JSON string containing routine customizations:
    /// { selectedByItem, customSteps, routineOrder, schedule, myProducts }
    /// </summary>
    public string? CustomizationsJson { get; set; }
}
