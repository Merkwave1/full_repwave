namespace RepWave.Domain.Entities;

/// <summary>Immutable audit trail for super-admin actions (master DB only).</summary>
public class AdminAuditLog
{
    public int Id { get; set; }
    public string AdminEmail { get; set; } = string.Empty;
    public string AdminName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? TenantId { get; set; }
    public int? TargetUserId { get; set; }
    public string? TargetUserEmail { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
