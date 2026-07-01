namespace RepWave.Application.Common.Interfaces;

/// <summary>
/// Builds per-tenant PostgreSQL connection strings and ensures tenant databases exist.
/// </summary>
public interface ITenantProvisioningHelper
{
    string BuildConnectionString(string tenantId);
    Task EnsureDatabaseExistsAsync(string tenantId, CancellationToken ct = default);
}
