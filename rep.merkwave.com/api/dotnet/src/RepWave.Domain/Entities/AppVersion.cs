namespace RepWave.Domain.Entities;

public class AppVersion
{
    public int VersionsId { get; set; }
    public string Entity { get; set; } = string.Empty;
    public int Version { get; set; } = 1;
    public DateTime? UpdatedAt { get; set; }
}
