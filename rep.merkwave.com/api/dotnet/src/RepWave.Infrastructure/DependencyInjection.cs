using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Features.Admin;
using RepWave.Infrastructure.Persistence;
using RepWave.Infrastructure.Services;
using RepWave.Infrastructure.Storage;
namespace RepWave.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // ── Core helpers ─────────────────────────────────────────────────────
        services.AddHttpContextAccessor();
        services.AddMemoryCache();      // IMemoryCache for tenant connection-string caching

        // ── Master database (repwave_master) ─────────────────────────────────
        // Singleton lifetime: the master DB connection is shared across all requests.
        var masterConn = config.GetConnectionString("MasterConnection")
            ?? throw new InvalidOperationException(
                "MasterConnection is not configured. Add it to ConnectionStrings in appsettings.json.");

        services.AddDbContext<MasterDbContext>(opts =>
            opts.UseNpgsql(masterConn), ServiceLifetime.Singleton);

        // IMasterDbContext resolves the singleton MasterDbContext
        services.AddSingleton<IMasterDbContext>(sp => sp.GetRequiredService<MasterDbContext>());

        // ── Tenant services ──────────────────────────────────────────────────
        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<ITenantDbContextFactory, TenantDbContextFactory>();
        services.AddScoped<IAdminTenantHealthReader, AdminTenantHealthReader>();
        services.AddScoped<IAdminActorProvider, AdminActorProvider>();
        services.AddScoped<ITenantProvisioningHelper, PostgresTenantProvisioningHelper>();

        // ── Tenant DbContext (per-request, determined by JWT "tenant" claim) ─
        services.AddScoped<ApplicationDbContext>(sp =>
        {
            var tenantService = sp.GetRequiredService<ITenantService>();
            var connStr = tenantService.GetCurrentConnectionString();
            var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql(connStr, b => b.MigrationsAssembly("RepWave.Infrastructure"))
                .Options;
            return new ApplicationDbContext(opts);
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IClientDocumentStorage, ClientDocumentStorage>();

        return services;
    }
}
