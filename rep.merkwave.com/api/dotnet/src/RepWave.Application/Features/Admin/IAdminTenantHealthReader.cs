namespace RepWave.Application.Features.Admin;

public interface IAdminTenantHealthReader
{
    Task<TenantUsageSummaryDto> ReadSummaryAsync(string connectionString, CancellationToken ct = default);
    Task<TenantHealthDto> ReadFullAsync(
        string tenantId, string tenantName, string connectionString, CancellationToken ct = default);
}
