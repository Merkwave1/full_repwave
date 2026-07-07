using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Infrastructure.Persistence;

namespace RepWave.Infrastructure.Services;

/// <summary>
/// Creates an <see cref="ApplicationDbContext"/> connected to a specific tenant database.
/// Used only in handlers that run before a JWT exists (login).
/// The returned context is disposable — handlers must dispose it.
/// </summary>
public class TenantDbContextFactory(ITenantService tenantService) : ITenantDbContextFactory
{
    public IApplicationDbContext Create(string tenantId)
    {
        var connStr = tenantService.GetConnectionString(tenantId);
        return CreateFromConnectionString(connStr);
    }

    public IApplicationDbContext CreateFromConnectionString(string connectionString)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString, b => b.MigrationsAssembly("RepWave.Infrastructure"))
            .Options;
        return new ApplicationDbContext(options);
    }

    /// <summary>
    /// Creates the context and calls EnsureCreated to auto-provision the tenant schema.
    /// Safe to call multiple times — EnsureCreated is a no-op if the schema already exists.
    /// </summary>
    public async Task<IApplicationDbContext> CreateAndEnsureAsync(string tenantId, CancellationToken ct = default)
    {
        var connStr = tenantService.GetConnectionString(tenantId);
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connStr, b => b.MigrationsAssembly("RepWave.Infrastructure"))
            .Options;
        var ctx = new ApplicationDbContext(options);
        await ctx.Database.EnsureCreatedAsync(ct);
        return ctx;
    }
}
