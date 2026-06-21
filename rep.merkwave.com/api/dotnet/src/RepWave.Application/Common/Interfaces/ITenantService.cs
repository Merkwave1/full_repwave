namespace RepWave.Application.Common.Interfaces;

/// <summary>
/// Resolves the current tenant's database connection string.
/// For authenticated requests the tenant comes from the JWT "tenant" claim.
/// Connection strings are stored in the master database and cached in-memory.
/// </summary>
public interface ITenantService
{
    /// <summary>Returns the tenant identifier embedded in the current JWT.</summary>
    string GetTenantId();

    /// <summary>Returns the PostgreSQL connection string for the given tenant ID (from master DB + cache).</summary>
    string GetConnectionString(string tenantId);

    /// <summary>Returns the connection string for the current request's tenant.</summary>
    string GetCurrentConnectionString();

    /// <summary>Returns true when the tenant ID is active in the master database.</summary>
    bool TenantExists(string tenantId);

    /// <summary>Invalidates the cached connection string so the next request re-reads from master DB.</summary>
    void InvalidateTenantCache(string tenantId);
}
