using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace RepWave.Infrastructure.Persistence;

/// <summary>
/// Design-time factory for <see cref="MasterDbContext"/>.
/// Used by "dotnet ef migrations add" / "dotnet ef database update" targeting the master DB.
/// Run from the Infrastructure project with: dotnet ef database update --context MasterDbContext
/// </summary>
public class MasterDbContextDesignTimeFactory : IDesignTimeDbContextFactory<MasterDbContext>
{
    public MasterDbContext CreateDbContext(string[] args)
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "..", "RepWave.Api"))
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        var connStr = config.GetConnectionString("MasterConnection")
            ?? throw new InvalidOperationException("MasterConnection not set in appsettings.json");

        var optionsBuilder = new DbContextOptionsBuilder<MasterDbContext>();
        optionsBuilder.UseNpgsql(connStr);

        return new MasterDbContext(optionsBuilder.Options);
    }
}
