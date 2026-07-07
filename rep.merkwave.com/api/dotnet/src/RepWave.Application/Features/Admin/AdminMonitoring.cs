using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using System.Text.Json.Serialization;

namespace RepWave.Application.Features.Admin;

// ── Global users (cross-tenant, admin-only) ───────────────────────────────────

public record AdminGlobalUserDto(
    int UserId,
    string TenantId,
    string TenantName,
    string Name,
    string Email,
    string Role,
    bool IsActive,
    DateTime? CreatedAt,
    DateTime? LastLoginAt,
    [property: JsonPropertyName("login_count_30d")] int LoginCount30d);

public record GetAdminGlobalUsersQuery(
    string? Search = null,
    string? TenantId = null,
    string? Role = null,
    bool? ActiveOnly = null,
    int Page = 1,
    int PageSize = 50) : IRequest<ApiResponse<PagedResult<AdminGlobalUserDto>>>;

public class GetAdminGlobalUsersQueryHandler(
    IMasterDbContext masterDb, ITenantDbContextFactory dbFactory)
    : IRequestHandler<GetAdminGlobalUsersQuery, ApiResponse<PagedResult<AdminGlobalUserDto>>>
{
    public async Task<ApiResponse<PagedResult<AdminGlobalUserDto>>> Handle(
        GetAdminGlobalUsersQuery q, CancellationToken ct)
    {
        var tenants = await masterDb.Tenants.AsNoTracking().ToListAsync(ct);
        if (!string.IsNullOrWhiteSpace(q.TenantId))
            tenants = tenants.Where(t => t.TenantId == q.TenantId).ToList();

        var d30 = DateTime.UtcNow.AddDays(-30);
        var search = q.Search?.Trim().ToLowerInvariant();

        var tasks = tenants.Select(async t =>
        {
            try
            {
                using var db = dbFactory.CreateFromConnectionString(t.ConnectionString);
                var query = db.Users.AsNoTracking().AsQueryable();
                if (!string.IsNullOrWhiteSpace(q.Role))
                    query = query.Where(u => u.UsersRole == q.Role);
                if (q.ActiveOnly == true)
                    query = query.Where(u => u.UsersStatus);

                var users = await query
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

                var userIds = users.Select(u => u.UsersId).ToList();
                var loginStats = userIds.Count == 0
                    ? []
                    : await db.LoginLogs.AsNoTracking()
                        .Where(l => l.LoginLogsStatus == "success"
                            && l.LoginLogsUsersId != null
                            && userIds.Contains(l.LoginLogsUsersId.Value)
                            && l.LoginLogsCreatedAt >= d30)
                        .GroupBy(l => l.LoginLogsUsersId)
                        .Select(g => new
                        {
                            UserId = g.Key!.Value,
                            LastLogin = g.Max(x => x.LoginLogsCreatedAt),
                            Count = g.Count(),
                        })
                        .ToListAsync(ct);

                var loginMap = loginStats.ToDictionary(x => x.UserId, x => (x.LastLogin, x.Count));

                return users
                    .Where(u =>
                    {
                        if (search is null) return true;
                        return u.UsersName.Contains(search, StringComparison.OrdinalIgnoreCase)
                            || u.UsersEmail.Contains(search, StringComparison.OrdinalIgnoreCase);
                    })
                    .Select(u =>
                    {
                        loginMap.TryGetValue(u.UsersId, out var lg);
                        return new AdminGlobalUserDto(
                            u.UsersId, t.TenantId, t.Name,
                            u.UsersName, u.UsersEmail, u.UsersRole,
                            u.UsersStatus, u.CreatedAt,
                            lg.LastLogin, lg.Count);
                    });
            }
            catch
            {
                return Enumerable.Empty<AdminGlobalUserDto>();
            }
        });

        var all = (await Task.WhenAll(tasks)).SelectMany(x => x)
            .OrderByDescending(u => u.LastLoginAt ?? u.CreatedAt ?? DateTime.MinValue)
            .ToList();

        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, 100);
        var items = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return ApiResponse<PagedResult<AdminGlobalUserDto>>.Success(
            new PagedResult<AdminGlobalUserDto>(items, all.Count, page, pageSize));
    }
}

public record AdminSetUserStatusRequest(bool IsActive);

public record AdminSetUserStatusCommand(string TenantId, int UserId, AdminSetUserStatusRequest Req)
    : IRequest<ApiResponse<AdminGlobalUserDto>>;

public class AdminSetUserStatusCommandHandler(
    IMasterDbContext masterDb, ITenantDbContextFactory dbFactory, IAdminActorProvider actorProvider)
    : IRequestHandler<AdminSetUserStatusCommand, ApiResponse<AdminGlobalUserDto>>
{
    public async Task<ApiResponse<AdminGlobalUserDto>> Handle(
        AdminSetUserStatusCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null)
            return ApiResponse<AdminGlobalUserDto>.Failure("Tenant not found.");

        using var db = dbFactory.CreateFromConnectionString(tenant.ConnectionString);
        var user = await db.Users.FirstOrDefaultAsync(u => u.UsersId == request.UserId, ct);
        if (user is null)
            return ApiResponse<AdminGlobalUserDto>.Failure("User not found.");

        user.UsersStatus = request.Req.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await AdminAuditWriter.LogAsync(
            masterDb, actorProvider, request.Req.IsActive ? "user_enable" : "user_disable",
            tenant.TenantId, user.UsersId, user.UsersEmail,
            $"{user.UsersName} set to {(request.Req.IsActive ? "active" : "disabled")}", ct);

        var d30 = DateTime.UtcNow.AddDays(-30);
        var loginStats = await db.LoginLogs.AsNoTracking()
            .Where(l => l.LoginLogsStatus == "success"
                && l.LoginLogsUsersId == user.UsersId
                && l.LoginLogsCreatedAt >= d30)
            .GroupBy(l => l.LoginLogsUsersId)
            .Select(g => new { LastLogin = g.Max(x => x.LoginLogsCreatedAt), Count = g.Count() })
            .FirstOrDefaultAsync(ct);

        return ApiResponse<AdminGlobalUserDto>.Success(new AdminGlobalUserDto(
            user.UsersId, tenant.TenantId, tenant.Name,
            user.UsersName, user.UsersEmail, user.UsersRole,
            user.UsersStatus, user.CreatedAt,
            loginStats?.LastLogin, loginStats?.Count ?? 0));
    }
}

// ── Subscriptions monitor (admin-only) ────────────────────────────────────────

public record AdminIdleTenantDto(
    string TenantId,
    string Name,
    string? Plan,
    string Status,
    DateTime? ExpirationDate,
    int? DaysUntilExpiry,
    int UsersTotal,
    int Clients,
    int SalesOrders,
    DateTime CreatedAt);

public record AdminSubscriptionsMonitorDto(
    List<AdminTenantDto> ExpiringIn7Days,
    List<AdminTenantDto> Expired,
    List<AdminIdleTenantDto> IdleTrials,
    List<AdminTenantDto> Suspended,
    int TotalActive,
    int TotalTrial,
    int TotalPaid);

public record GetAdminSubscriptionsMonitorQuery() : IRequest<ApiResponse<AdminSubscriptionsMonitorDto>>;

public class GetAdminSubscriptionsMonitorQueryHandler(
    IMasterDbContext masterDb, IAdminTenantHealthReader healthReader)
    : IRequestHandler<GetAdminSubscriptionsMonitorQuery, ApiResponse<AdminSubscriptionsMonitorDto>>
{
    public async Task<ApiResponse<AdminSubscriptionsMonitorDto>> Handle(
        GetAdminSubscriptionsMonitorQuery request, CancellationToken ct)
    {
        var tenants = await masterDb.Tenants.AsNoTracking().OrderByDescending(t => t.CreatedAt).ToListAsync(ct);
        var now = DateTime.UtcNow;
        var d7 = now.AddDays(7);

        var expiring = tenants
            .Where(t => t.IsActive && t.ExpirationDate.HasValue
                && t.ExpirationDate.Value >= now && t.ExpirationDate.Value <= d7)
            .OrderBy(t => t.ExpirationDate)
            .Select(t => TenantStatusHelper.ToDto(t))
            .ToList();

        var expired = tenants
            .Where(t => TenantStatusHelper.Compute(t) is "trial_expired" or "paid_expired")
            .OrderByDescending(t => t.ExpirationDate)
            .Take(50)
            .Select(t => TenantStatusHelper.ToDto(t))
            .ToList();

        var suspended = tenants
            .Where(t => !t.IsActive)
            .OrderByDescending(t => t.UpdatedAt)
            .Take(50)
            .Select(t => TenantStatusHelper.ToDto(t))
            .ToList();

        var trialTenants = tenants
            .Where(t => string.Equals(t.Plan, "trial", StringComparison.OrdinalIgnoreCase)
                && TenantStatusHelper.Compute(t) == "trial_active"
                && t.CreatedAt < now.AddDays(-2))
            .ToList();

        var idleTasks = trialTenants.Select(async t =>
        {
            var usage = await healthReader.ReadSummaryAsync(t.ConnectionString, ct);
            if (!usage.DatabaseReachable) return null;
            if (usage.UsersTotal > 1 || usage.Clients > 0 || usage.SalesOrders > 0) return null;
            return new AdminIdleTenantDto(
                t.TenantId, t.Name, t.Plan, TenantStatusHelper.Compute(t),
                t.ExpirationDate, TenantStatusHelper.DaysUntil(t),
                usage.UsersTotal, usage.Clients, usage.SalesOrders, t.CreatedAt);
        });

        var idle = (await Task.WhenAll(idleTasks)).Where(x => x is not null).Cast<AdminIdleTenantDto>().ToList();

        var monitor = new AdminSubscriptionsMonitorDto(
            expiring,
            expired,
            idle,
            suspended,
            tenants.Count(t => t.IsActive && TenantStatusHelper.Compute(t) is "trial_active" or "paid_active"),
            tenants.Count(t => TenantStatusHelper.Compute(t) is "trial_active" or "trial_expired"),
            tenants.Count(t => TenantStatusHelper.Compute(t) is "paid_active" or "paid_expired"));

        return ApiResponse<AdminSubscriptionsMonitorDto>.Success(monitor);
    }
}

// ── Activity feed (admin-only) ────────────────────────────────────────────────

public record AdminActivityItemDto(
    string Type,
    string TenantId,
    string TenantName,
    string? UserName,
    string? UserEmail,
    string? Detail,
    DateTime At);

public record GetAdminActivityFeedQuery(int Limit = 50) : IRequest<ApiResponse<List<AdminActivityItemDto>>>;

public class GetAdminActivityFeedQueryHandler(
    IMasterDbContext masterDb, ITenantDbContextFactory dbFactory)
    : IRequestHandler<GetAdminActivityFeedQuery, ApiResponse<List<AdminActivityItemDto>>>
{
    public async Task<ApiResponse<List<AdminActivityItemDto>>> Handle(
        GetAdminActivityFeedQuery request, CancellationToken ct)
    {
        var limit = Math.Clamp(request.Limit, 10, 200);
        var tenants = await masterDb.Tenants.AsNoTracking().ToListAsync(ct);
        var items = new List<AdminActivityItemDto>();

        foreach (var t in tenants.OrderByDescending(x => x.CreatedAt).Take(30))
        {
            items.Add(new AdminActivityItemDto(
                "signup", t.TenantId, t.Name,
                null, t.ContactEmail, $"Plan: {t.Plan ?? "trial"}", t.CreatedAt));
        }

        var loginTasks = tenants.Select(async t =>
        {
            try
            {
                using var db = dbFactory.CreateFromConnectionString(t.ConnectionString);
                var logs = await db.LoginLogs.AsNoTracking()
                    .OrderByDescending(l => l.LoginLogsCreatedAt)
                    .Take(15)
                    .Select(l => new
                    {
                        l.LoginLogsStatus,
                        l.LoginLogsUsersName,
                        l.LoginLogsReason,
                        l.LoginLogsUsersRole,
                        l.LoginLogsCreatedAt,
                    })
                    .ToListAsync(ct);
                return logs.Select(l => new AdminActivityItemDto(
                    l.LoginLogsStatus == "success" ? "login_success" : "login_failure",
                    t.TenantId,
                    t.Name,
                    l.LoginLogsUsersName,
                    null,
                    l.LoginLogsReason ?? l.LoginLogsUsersRole,
                    l.LoginLogsCreatedAt ?? DateTime.UtcNow)).ToList();
            }
            catch
            {
                return [];
            }
        });

        var logins = (await Task.WhenAll(loginTasks)).SelectMany(x => x);
        items.AddRange(logins);

        var feed = items
            .OrderByDescending(i => i.At)
            .Take(limit)
            .ToList();

        return ApiResponse<List<AdminActivityItemDto>>.Success(feed);
    }
}

// ── Engagement matrix (admin-only) ────────────────────────────────────────────

public record AdminEngagementRowDto(
    string TenantId,
    string Name,
    string? Plan,
    string Status,
    bool IsActive,
    DateTime? ExpirationDate,
    int? DaysUntilExpiry,
    int UsersTotal,
    int UsersActive,
    int Clients,
    int SalesOrders,
    int Visits,
    [property: JsonPropertyName("logins_last_30_days")] int LoginsLast30Days,
    DateTime? LastLoginAt,
    string Engagement); // hot, warm, cold, dead

public record GetAdminEngagementMatrixQuery() : IRequest<ApiResponse<List<AdminEngagementRowDto>>>;

public class GetAdminEngagementMatrixQueryHandler(
    IMasterDbContext masterDb, IAdminTenantHealthReader healthReader)
    : IRequestHandler<GetAdminEngagementMatrixQuery, ApiResponse<List<AdminEngagementRowDto>>>
{
    public async Task<ApiResponse<List<AdminEngagementRowDto>>> Handle(
        GetAdminEngagementMatrixQuery request, CancellationToken ct)
    {
        var tenants = await masterDb.Tenants.AsNoTracking().OrderBy(t => t.Name).ToListAsync(ct);

        var tasks = tenants.Select(async t =>
        {
            var usage = await healthReader.ReadSummaryAsync(t.ConnectionString, ct);
            var status = TenantStatusHelper.Compute(t);
            var engagement = ScoreEngagement(usage, status);
            return new AdminEngagementRowDto(
                t.TenantId, t.Name, t.Plan, status, t.IsActive,
                t.ExpirationDate, TenantStatusHelper.DaysUntil(t),
                usage.UsersTotal, usage.UsersActive,
                usage.Clients, usage.SalesOrders, usage.Visits,
                usage.LoginsLast30Days, usage.LastLoginAt,
                engagement);
        });

        var rows = (await Task.WhenAll(tasks))
            .OrderByDescending(r => r.Engagement == "hot" ? 4 : r.Engagement == "warm" ? 3 : r.Engagement == "cold" ? 2 : 1)
            .ThenByDescending(r => r.LoginsLast30Days)
            .ToList();

        return ApiResponse<List<AdminEngagementRowDto>>.Success(rows);
    }

    private static string ScoreEngagement(TenantUsageSummaryDto u, string status)
    {
        if (!u.DatabaseReachable || status is "trial_expired" or "paid_expired" or "suspended")
            return "dead";
        if (u.LoginsLast30Days >= 5 || u.SalesOrders >= 3 || u.Visits >= 5)
            return "hot";
        if (u.LoginsLast30Days >= 1 || u.Clients >= 1 || u.SalesOrders >= 1)
            return "warm";
        if (u.UsersTotal > 0)
            return "cold";
        return "dead";
    }
}
