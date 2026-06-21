using Microsoft.EntityFrameworkCore;
using RepWave.Domain.Entities;

namespace RepWave.Application.Common.Interfaces;

/// <summary>
/// Abstraction over the repwave_master database.
/// Only the Tenants table lives here.
/// </summary>
public interface IMasterDbContext
{
    DbSet<Tenant> Tenants { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
