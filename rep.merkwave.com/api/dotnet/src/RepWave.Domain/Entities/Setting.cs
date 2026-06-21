namespace RepWave.Domain.Entities;

public class Setting
{
    public int SettingsId { get; set; }
    public string SettingsKey { get; set; } = string.Empty;
    public string? SettingsValue { get; set; }
    public string? SettingsDescription { get; set; }
    public string SettingsCategory { get; set; } = "general";
    public string SettingsType { get; set; } = "text";
    public string? SettingsLabel { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
