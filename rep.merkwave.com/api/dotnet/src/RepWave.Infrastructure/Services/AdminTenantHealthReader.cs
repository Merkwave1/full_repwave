using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Features.Admin;

namespace RepWave.Infrastructure.Services;

public class AdminTenantHealthReader(ITenantDbContextFactory dbFactory) : IAdminTenantHealthReader
{
    public async Task<TenantUsageSummaryDto> ReadSummaryAsync(string connectionString, CancellationToken ct = default)
    {
        try
        {
            using var db = dbFactory.CreateFromConnectionString(connectionString);
            var d30 = DateTime.UtcNow.AddDays(-30);

            var usersTotal = await db.Users.AsNoTracking().CountAsync(ct);
            var usersActive = await db.Users.AsNoTracking().CountAsync(u => u.UsersStatus, ct);
            var clients = await db.Clients.AsNoTracking().CountAsync(ct);
            var suppliers = await db.Suppliers.AsNoTracking().CountAsync(ct);
            var products = await db.Products.AsNoTracking().CountAsync(ct);
            var salesOrders = await db.SalesOrders.AsNoTracking().CountAsync(ct);
            var purchaseOrders = await db.PurchaseOrders.AsNoTracking().CountAsync(ct);
            var visits = await db.Visits.AsNoTracking().CountAsync(ct);
            var warehouses = await db.Warehouses.AsNoTracking().CountAsync(ct);
            var logins30d = await db.LoginLogs.AsNoTracking()
                .CountAsync(l => l.LoginLogsStatus == "success" && l.LoginLogsCreatedAt >= d30, ct);

            var lastLogin = await db.LoginLogs.AsNoTracking()
                .Where(l => l.LoginLogsStatus == "success")
                .OrderByDescending(l => l.LoginLogsCreatedAt)
                .Select(l => new { l.LoginLogsCreatedAt, l.LoginLogsUsersName })
                .FirstOrDefaultAsync(ct);

            return new TenantUsageSummaryDto(
                usersTotal, usersActive, clients, suppliers, products,
                salesOrders, purchaseOrders, visits, warehouses,
                logins30d,
                lastLogin?.LoginLogsCreatedAt,
                lastLogin?.LoginLogsUsersName,
                true, null);
        }
        catch (Exception ex)
        {
            return new TenantUsageSummaryDto(
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null, null, false, ex.Message);
        }
    }

    public async Task<TenantHealthDto> ReadFullAsync(
        string tenantId, string tenantName, string connectionString, CancellationToken ct = default)
    {
        var summary = await ReadSummaryAsync(connectionString, ct);
        if (!summary.DatabaseReachable)
        {
            return new TenantHealthDto(
                tenantId, tenantName, summary, [], [], new Dictionary<string, string?>(),
                DateTime.UtcNow);
        }

        try
        {
            using var db = dbFactory.CreateFromConnectionString(connectionString);
            var d30 = DateTime.UtcNow.AddDays(-30);

            var roleRows = await db.Users.AsNoTracking()
                .GroupBy(u => u.UsersRole)
                .Select(g => new { Role = g.Key, Count = g.Count() })
                .ToListAsync(ct);
            var usersByRole = roleRows
                .Select(r => new TenantUserRoleCountDto(r.Role, r.Count))
                .OrderByDescending(x => x.Count)
                .ToList();

            var loginStats = await db.LoginLogs.AsNoTracking()
                .Where(l => l.LoginLogsStatus == "success" && l.LoginLogsCreatedAt >= d30)
                .GroupBy(l => l.LoginLogsUsersId)
                .Select(g => new
                {
                    UserId = g.Key,
                    LastLogin = g.Max(x => x.LoginLogsCreatedAt),
                    Count = g.Count(),
                })
                .ToListAsync(ct);

            var loginMap = loginStats
                .Where(x => x.UserId.HasValue)
                .ToDictionary(x => x.UserId!.Value, x => (x.LastLogin, x.Count));

            var users = await db.Users.AsNoTracking()
                .OrderBy(u => u.UsersRole)
                .ThenBy(u => u.UsersName)
                .Select(u => new
                {
                    u.UsersId,
                    u.UsersName,
                    u.UsersEmail,
                    u.UsersRole,
                    u.UsersStatus,
                    u.CreatedAt,
                })
                .ToListAsync(ct);

            var userDetails = users.Select(u =>
            {
                DateTime? lastLogin = null;
                var loginCount = 0;
                if (loginMap.TryGetValue(u.UsersId, out var lg))
                {
                    lastLogin = lg.LastLogin;
                    loginCount = lg.Count;
                }
                return new TenantUserDetailDto(
                    u.UsersId, u.UsersName, u.UsersEmail, u.UsersRole,
                    u.UsersStatus, u.CreatedAt, lastLogin, loginCount);
            }).ToList();

            var settingKeys = new[] { "company_name", "expiration_date", "country" };
            var settingsRows = await db.Settings.AsNoTracking()
                .Where(s => settingKeys.Contains(s.SettingsKey))
                .ToListAsync(ct);
            var settings = settingsRows.ToDictionary(
                s => s.SettingsKey, s => s.SettingsValue, StringComparer.OrdinalIgnoreCase);

            return new TenantHealthDto(
                tenantId, tenantName, summary, usersByRole, userDetails, settings,
                DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            return new TenantHealthDto(
                tenantId, tenantName, summary with { Error = ex.Message },
                [], [], new Dictionary<string, string?>(), DateTime.UtcNow);
        }
    }
}
