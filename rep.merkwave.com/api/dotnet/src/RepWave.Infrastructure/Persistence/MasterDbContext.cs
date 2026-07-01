using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Domain.Entities;

namespace RepWave.Infrastructure.Persistence;

/// <summary>
/// Separate DbContext for the repwave_master database.
/// Only the Tenants table lives here — never mix tenant business data.
/// </summary>
public class MasterDbContext(DbContextOptions<MasterDbContext> options)
    : DbContext(options), IMasterDbContext
{
    public DbSet<Tenant> Tenants => Set<Tenant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Tenant>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Id).UseIdentityColumn();
            e.Property(t => t.TenantId).HasMaxLength(100).IsRequired();
            e.HasIndex(t => t.TenantId).IsUnique();
            e.Property(t => t.Name).HasMaxLength(300).IsRequired();
            e.Property(t => t.ConnectionString).IsRequired();
            e.Property(t => t.Plan).HasMaxLength(100);
            e.Property(t => t.ContactEmail).HasMaxLength(255);
            e.Property(t => t.ContactPhone).HasMaxLength(50);
            e.Property(t => t.ContactCountry).HasMaxLength(100);
            e.Property(t => t.IsActive).HasDefaultValue(true);
            e.Property(t => t.CreatedAt).HasDefaultValueSql("NOW()");
        });
    }
}
