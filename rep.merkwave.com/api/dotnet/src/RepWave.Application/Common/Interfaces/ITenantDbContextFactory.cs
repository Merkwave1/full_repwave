namespace RepWave.Application.Common.Interfaces;

/// <summary>
/// Creates an <see cref="IApplicationDbContext"/> connected to a specific tenant database.
/// Inject this in handlers that run before a JWT exists (e.g. login).
/// </summary>
public interface ITenantDbContextFactory
{
    IApplicationDbContext Create(string tenantId);

    /// <summary>Opens a tenant DB using the connection string stored in the master Tenants table.</summary>
    IApplicationDbContext CreateFromConnectionString(string connectionString);

    /// <summary>
    /// Creates the context AND calls EnsureCreated to provision the tenant schema on first use.
    /// Use this when registering a new tenant.
    /// </summary>
    Task<IApplicationDbContext> CreateAndEnsureAsync(string tenantId, CancellationToken ct = default);
}
