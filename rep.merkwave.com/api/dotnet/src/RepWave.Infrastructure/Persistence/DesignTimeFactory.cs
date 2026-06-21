using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace RepWave.Infrastructure.Persistence;

/// <summary>
/// Used only by EF CLI tooling (dotnet ef migrations add / update).
/// Points at the first tenant's connection string defined in appsettings.json.
/// </summary>
public class ApplicationDbContextDesignTimeFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        // Load appsettings from the Api project during design-time
        var basePath = Path.Combine(Directory.GetCurrentDirectory(), "..", "RepWave.Api");
        var config = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        // Use the first registered tenant connection for migrations
        var section = config.GetSection("TenantConnections").GetChildren().FirstOrDefault();
        var connStr = section?.Value
            ?? config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "No TenantConnections or DefaultConnection found in appsettings.json for migrations.");

        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connStr, b => b.MigrationsAssembly("RepWave.Infrastructure"))
            .Options;
        return new ApplicationDbContext(opts);
    }
}
