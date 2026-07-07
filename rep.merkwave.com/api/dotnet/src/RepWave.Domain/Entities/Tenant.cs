namespace RepWave.Domain.Entities;

/// <summary>Registered tenant in the master database.</summary>
public class Tenant
{
    public int Id { get; set; }
    public string TenantId { get; set; } = null!;          // slug used in JWT claim
    public string Name { get; set; } = null!;              // display name
    public string ConnectionString { get; set; } = null!;  // tenant DB connection string
    public string? Plan { get; set; }                      // e.g. "starter", "pro"
    public bool IsActive { get; set; } = true;
    public DateTime? ExpirationDate { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactCountry { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    /// <summary>When paid/trial subscription started (defaults to CreatedAt).</summary>
    public DateTime? SubscriptionStartedAt { get; set; }
    /// <summary>Number of trial extensions or plan renewals.</summary>
    public int RenewalCount { get; set; } = 0;
    public DateTime? LastRenewedAt { get; set; }
}
