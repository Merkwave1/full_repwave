using Microsoft.Extensions.Configuration;
using Npgsql;
using RepWave.Application.Common.Interfaces;

namespace RepWave.Infrastructure.Services;

public sealed class PostgresTenantProvisioningHelper(IConfiguration configuration) : ITenantProvisioningHelper
{
    private readonly string _masterConnectionString =
        configuration.GetConnectionString("MasterConnection")
        ?? throw new InvalidOperationException("MasterConnection is not configured.");

    public string BuildConnectionString(string tenantId)
    {
        var master = new NpgsqlConnectionStringBuilder(_masterConnectionString);
        return new NpgsqlConnectionStringBuilder
        {
            Host = master.Host,
            Port = master.Port,
            Username = master.Username,
            Password = master.Password,
            Database = $"repwave_{tenantId}",
        }.ConnectionString;
    }

    public async Task EnsureDatabaseExistsAsync(string tenantId, CancellationToken ct = default)
    {
        var dbName = $"repwave_{tenantId}";
        var admin = new NpgsqlConnectionStringBuilder(_masterConnectionString)
        {
            Database = "postgres",
        };

        await using var conn = new NpgsqlConnection(admin.ConnectionString);
        await conn.OpenAsync(ct);

        await using var existsCmd = conn.CreateCommand();
        existsCmd.CommandText = "SELECT 1 FROM pg_database WHERE datname = @name";
        existsCmd.Parameters.AddWithValue("name", dbName);
        var exists = await existsCmd.ExecuteScalarAsync(ct);
        if (exists is not null) return;

        await using var createCmd = conn.CreateCommand();
        createCmd.CommandText = $"CREATE DATABASE \"{dbName.Replace("\"", "")}\"";
        await createCmd.ExecuteNonQueryAsync(ct);
    }
}
