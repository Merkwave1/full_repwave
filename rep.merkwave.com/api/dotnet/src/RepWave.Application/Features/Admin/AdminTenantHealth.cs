using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using System.Text.Json.Serialization;

namespace RepWave.Application.Features.Admin;

// ── Usage / health DTOs ───────────────────────────────────────────────────────

public record TenantUsageSummaryDto(
    int UsersTotal,
    int UsersActive,
    int Clients,
    int Suppliers,
    int Products,
    int SalesOrders,
    int PurchaseOrders,
    int Visits,
    int Warehouses,
    [property: JsonPropertyName("logins_last_30_days")] int LoginsLast30Days,
    DateTime? LastLoginAt,
    string? LastLoginUser,
    bool DatabaseReachable,
    string? Error);

public record TenantUserRoleCountDto(string Role, int Count);

public record TenantUserDetailDto(
    int UserId,
    string Name,
    string Email,
    string Role,
    bool IsActive,
    DateTime? CreatedAt,
    DateTime? LastLoginAt,
    [property: JsonPropertyName("login_count_30d")] int LoginCount30d);

public record TenantHealthDto(
    string TenantId,
    string TenantName,
    TenantUsageSummaryDto Summary,
    List<TenantUserRoleCountDto> UsersByRole,
    List<TenantUserDetailDto> Users,
    Dictionary<string, string?> Settings,
    DateTime QueriedAt);

// ── Health query ──────────────────────────────────────────────────────────────

public record GetTenantHealthQuery(string TenantId) : IRequest<ApiResponse<TenantHealthDto>>;

public class GetTenantHealthQueryHandler(IMasterDbContext masterDb, IAdminTenantHealthReader healthReader)
    : IRequestHandler<GetTenantHealthQuery, ApiResponse<TenantHealthDto>>
{
    public async Task<ApiResponse<TenantHealthDto>> Handle(GetTenantHealthQuery request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null)
            return ApiResponse<TenantHealthDto>.Failure("Tenant not found.");

        var health = await healthReader.ReadFullAsync(
            tenant.TenantId, tenant.Name, tenant.ConnectionString, ct);
        return ApiResponse<TenantHealthDto>.Success(health);
    }
}

// ── All tenants usage summary ─────────────────────────────────────────────────

public record GetAllTenantsUsageQuery() : IRequest<ApiResponse<List<TenantUsageRowDto>>>;

public record TenantUsageRowDto(string TenantId, string Name, string? Plan, TenantUsageSummaryDto Usage);

public class GetAllTenantsUsageQueryHandler(IMasterDbContext masterDb, IAdminTenantHealthReader healthReader)
    : IRequestHandler<GetAllTenantsUsageQuery, ApiResponse<List<TenantUsageRowDto>>>
{
    public async Task<ApiResponse<List<TenantUsageRowDto>>> Handle(
        GetAllTenantsUsageQuery request, CancellationToken ct)
    {
        var tenants = await masterDb.Tenants.AsNoTracking().OrderBy(t => t.Name).ToListAsync(ct);

        var tasks = tenants.Select(async t =>
        {
            var usage = await healthReader.ReadSummaryAsync(t.ConnectionString, ct);
            return new TenantUsageRowDto(t.TenantId, t.Name, t.Plan, usage);
        });

        return ApiResponse<List<TenantUsageRowDto>>.Success((await Task.WhenAll(tasks)).ToList());
    }
}
