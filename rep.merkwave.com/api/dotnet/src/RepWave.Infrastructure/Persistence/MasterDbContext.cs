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
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AdminUser>(e =>
        {
            e.HasKey(u => u.AdminUserId);
            e.Property(u => u.AdminUserId).UseIdentityColumn();
            e.Property(u => u.Email).HasMaxLength(255).IsRequired();
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.PasswordHash).IsRequired();
            e.Property(u => u.Name).HasMaxLength(200).IsRequired();
            e.Property(u => u.IsActive).HasDefaultValue(true);
            e.Property(u => u.CreatedAt).HasDefaultValueSql("NOW()");
        });

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
            e.Property(t => t.RenewalCount).HasDefaultValue(0);
            e.Property(t => t.CreatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<AdminAuditLog>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).UseIdentityColumn();
            e.Property(a => a.AdminEmail).HasMaxLength(255).IsRequired();
            e.Property(a => a.AdminName).HasMaxLength(200).IsRequired();
            e.Property(a => a.Action).HasMaxLength(100).IsRequired();
            e.Property(a => a.TenantId).HasMaxLength(100);
            e.Property(a => a.TargetUserEmail).HasMaxLength(255);
            e.Property(a => a.Details).HasMaxLength(2000);
            e.Property(a => a.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasIndex(a => a.CreatedAt);
            e.HasIndex(a => a.TenantId);
        });
    }
}
