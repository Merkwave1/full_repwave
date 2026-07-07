using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using System.Text.Json.Serialization;

namespace RepWave.Application.Features.Admin;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record AdminLoginRequest(string Email, string Password);

public record AdminLoginResponse(int AdminUserId, string Email, string Name, string Token);

public record AdminTenantDto(
    int Id,
    string TenantId,
    string Name,
    string? Plan,
    bool IsActive,
    DateTime? ExpirationDate,
    string? ContactEmail,
    string? ContactPhone,
    string? ContactCountry,
    string? Notes,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    string Status,
    int? DaysUntilExpiry,
    DateTime? SubscribedFrom,
    int RenewalCount,
    DateTime? LastRenewedAt,
    TenantUsageSummaryDto? Usage = null);

public record AdminStatsOverviewDto(
    int TotalTenants,
    int TrialActive,
    int TrialExpired,
    int PaidActive,
    int PaidExpired,
    int Suspended,
    int SignupsLast7Days,
    [property: JsonPropertyName("signups_last_30_days")] int SignupsLast30Days,
    List<PlanCountDto> PaidByPlan,
    List<CountryCountDto> ByCountry,
    List<SignupDayDto> SignupsLast30DaysChart,
    List<AdminTenantDto> ExpiringSoon);

public record PlanCountDto(string Plan, int Count);
public record CountryCountDto(string Country, int Count);
public record SignupDayDto(string Date, int Count);

public record ExtendTrialRequest(int Days = 7);
public record ConvertTrialRequest(string Plan);
public record OpenSubscriptionRequest(string? Plan, DateTime? ExpirationDate);

// ── Status helper ────────────────────────────────────────────────────────────

internal static class TenantStatusHelper
{
    public static string Compute(Tenant t)
    {
        var now = DateTime.UtcNow;
        var expired = t.ExpirationDate.HasValue && t.ExpirationDate.Value < now;
        if (!t.IsActive) return "suspended";
        if (expired) return string.Equals(t.Plan, "trial", StringComparison.OrdinalIgnoreCase) ? "trial_expired" : "paid_expired";
        if (string.Equals(t.Plan, "trial", StringComparison.OrdinalIgnoreCase)) return "trial_active";
        return "paid_active";
    }

    public static int? DaysUntil(Tenant t)
    {
        if (!t.ExpirationDate.HasValue) return null;
        return (int)Math.Ceiling((t.ExpirationDate.Value - DateTime.UtcNow).TotalDays);
    }

    public static AdminTenantDto ToDto(Tenant t, TenantUsageSummaryDto? usage = null) => new(
        t.Id, t.TenantId, t.Name, t.Plan, t.IsActive, t.ExpirationDate,
        t.ContactEmail, t.ContactPhone, t.ContactCountry, t.Notes,
        t.CreatedAt, t.UpdatedAt, Compute(t), DaysUntil(t),
        t.SubscriptionStartedAt ?? t.CreatedAt, t.RenewalCount, t.LastRenewedAt, usage);
}

internal static class TenantSubscriptionHelper
{
    public static void RecordRenewal(Tenant tenant)
    {
        tenant.RenewalCount++;
        tenant.LastRenewedAt = DateTime.UtcNow;
        if (tenant.SubscriptionStartedAt is null)
            tenant.SubscriptionStartedAt = tenant.CreatedAt;
    }
}

// ── Sync tenant settings ─────────────────────────────────────────────────────

internal static class TenantSettingsSync
{
    public static async Task SyncExpirationAsync(
        ITenantDbContextFactory dbFactory, string tenantId, DateTime? expiration, CancellationToken ct)
    {
        if (expiration is null) return;
        try
        {
            using var db = dbFactory.Create(tenantId);
            var setting = await db.Settings.FirstOrDefaultAsync(s => s.SettingsKey == "expiration_date", ct);
            var value = expiration.Value.ToString("yyyy-MM-dd");
            if (setting is null)
            {
                db.Settings.Add(new Setting
                {
                    SettingsKey = "expiration_date",
                    SettingsValue = value,
                    SettingsLabel = "Expiration Date",
                    SettingsCategory = "system",
                    CreatedAt = DateTime.UtcNow,
                });
            }
            else
            {
                setting.SettingsValue = value;
                setting.UpdatedAt = DateTime.UtcNow;
            }
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            /* tenant DB may be unreachable */
        }
    }
}

// ── Login ─────────────────────────────────────────────────────────────────────

public record AdminLoginCommand(AdminLoginRequest Request) : IRequest<ApiResponse<AdminLoginResponse>>;

public class AdminLoginCommandHandler(IMasterDbContext masterDb, ITokenService tokenService)
    : IRequestHandler<AdminLoginCommand, ApiResponse<AdminLoginResponse>>
{
    public async Task<ApiResponse<AdminLoginResponse>> Handle(AdminLoginCommand cmd, CancellationToken ct)
    {
        var email = cmd.Request.Email?.Trim().ToLowerInvariant() ?? "";
        var password = cmd.Request.Password ?? "";
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            return ApiResponse<AdminLoginResponse>.Failure("Email and password are required.");

        var user = await masterDb.AdminUsers.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email && u.IsActive, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return ApiResponse<AdminLoginResponse>.Failure("Invalid email or password.");

        var token = tokenService.GenerateToken(user.AdminUserId, user.Email, "superadmin", user.Name, "master");
        return ApiResponse<AdminLoginResponse>.Success(
            new AdminLoginResponse(user.AdminUserId, user.Email, user.Name, token));
    }
}

// ── Stats overview ────────────────────────────────────────────────────────────

public record GetAdminStatsOverviewQuery() : IRequest<ApiResponse<AdminStatsOverviewDto>>;

public class GetAdminStatsOverviewQueryHandler(IMasterDbContext masterDb)
    : IRequestHandler<GetAdminStatsOverviewQuery, ApiResponse<AdminStatsOverviewDto>>
{
    public async Task<ApiResponse<AdminStatsOverviewDto>> Handle(GetAdminStatsOverviewQuery request, CancellationToken ct)
    {
        var tenants = await masterDb.Tenants.AsNoTracking().ToListAsync(ct);
        var now = DateTime.UtcNow;
        var d7 = now.AddDays(-7);
        var d30 = now.AddDays(-30);
        var d3future = now.AddDays(3);

        int CountStatus(string status) => tenants.Count(t => TenantStatusHelper.Compute(t) == status);

        var paidByPlan = tenants
            .Where(t => !string.Equals(t.Plan, "trial", StringComparison.OrdinalIgnoreCase)
                && TenantStatusHelper.Compute(t) == "paid_active")
            .GroupBy(t => t.Plan ?? "unknown")
            .Select(g => new PlanCountDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        var byCountry = tenants
            .Where(t => !string.IsNullOrWhiteSpace(t.ContactCountry))
            .GroupBy(t => t.ContactCountry!)
            .Select(g => new CountryCountDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToList();

        var chart = Enumerable.Range(0, 30)
            .Select(i =>
            {
                var day = DateOnly.FromDateTime(now.AddDays(-29 + i));
                var count = tenants.Count(t => DateOnly.FromDateTime(t.CreatedAt) == day);
                return new SignupDayDto(day.ToString("yyyy-MM-dd"), count);
            })
            .ToList();

        var expiringSoon = tenants
            .Where(t => t.IsActive && t.ExpirationDate.HasValue
                && t.ExpirationDate.Value >= now && t.ExpirationDate.Value <= d3future)
            .OrderBy(t => t.ExpirationDate)
            .Select(t => TenantStatusHelper.ToDto(t))
            .Take(10)
            .ToList();

        var dto = new AdminStatsOverviewDto(
            tenants.Count,
            CountStatus("trial_active"),
            CountStatus("trial_expired"),
            CountStatus("paid_active"),
            CountStatus("paid_expired"),
            CountStatus("suspended"),
            tenants.Count(t => t.CreatedAt >= d7),
            tenants.Count(t => t.CreatedAt >= d30),
            paidByPlan,
            byCountry,
            chart,
            expiringSoon);

        return ApiResponse<AdminStatsOverviewDto>.Success(dto);
    }
}

// ── Tenant list ───────────────────────────────────────────────────────────────

public record GetAdminTenantsQuery(
    string? Plan = null,
    string? Status = null,
    string? Country = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 25,
    bool IncludeUsage = false) : IRequest<ApiResponse<PagedResult<AdminTenantDto>>>;

public class GetAdminTenantsQueryHandler(IMasterDbContext masterDb, IAdminTenantHealthReader healthReader)
    : IRequestHandler<GetAdminTenantsQuery, ApiResponse<PagedResult<AdminTenantDto>>>
{
    public async Task<ApiResponse<PagedResult<AdminTenantDto>>> Handle(GetAdminTenantsQuery q, CancellationToken ct)
    {
        var all = await masterDb.Tenants.AsNoTracking().OrderByDescending(t => t.CreatedAt).ToListAsync(ct);

        IEnumerable<Tenant> filtered = all;
        if (!string.IsNullOrWhiteSpace(q.Plan))
            filtered = filtered.Where(t => string.Equals(t.Plan, q.Plan, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(q.Status))
            filtered = filtered.Where(t => TenantStatusHelper.Compute(t) == q.Status);
        if (!string.IsNullOrWhiteSpace(q.Country))
            filtered = filtered.Where(t => string.Equals(t.ContactCountry, q.Country, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLowerInvariant();
            filtered = filtered.Where(t =>
                t.TenantId.Contains(s, StringComparison.OrdinalIgnoreCase)
                || t.Name.Contains(s, StringComparison.OrdinalIgnoreCase)
                || (t.ContactEmail?.Contains(s, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        var list = filtered.ToList();
        var total = list.Count;
        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, 100);
        var pageItems = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        // Always load usage (direct connection string from master DB)
        var usageTasks = pageItems.Select(async t =>
        {
            var usage = await healthReader.ReadSummaryAsync(t.ConnectionString, ct);
            return TenantStatusHelper.ToDto(t, usage);
        });
        var items = (await Task.WhenAll(usageTasks)).ToList();

        return ApiResponse<PagedResult<AdminTenantDto>>.Success(
            new PagedResult<AdminTenantDto>(items, total, page, pageSize));
    }
}

// ── Tenant detail ─────────────────────────────────────────────────────────────

public record GetAdminTenantByIdQuery(string TenantId) : IRequest<ApiResponse<AdminTenantDto>>;

public class GetAdminTenantByIdQueryHandler(IMasterDbContext masterDb)
    : IRequestHandler<GetAdminTenantByIdQuery, ApiResponse<AdminTenantDto>>
{
    public async Task<ApiResponse<AdminTenantDto>> Handle(GetAdminTenantByIdQuery request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        return tenant is null
            ? ApiResponse<AdminTenantDto>.Failure("Tenant not found.")
            : ApiResponse<AdminTenantDto>.Success(TenantStatusHelper.ToDto(tenant));
    }
}

// ── Update tenant (admin) ─────────────────────────────────────────────────────

public record AdminUpdateTenantRequest(
    string? Name, string? Plan, DateTime? ExpirationDate,
    string? ContactEmail, string? ContactPhone, string? ContactCountry,
    string? Notes, bool? IsActive);

public record AdminUpdateTenantCommand(string TenantId, AdminUpdateTenantRequest Req)
    : IRequest<ApiResponse<AdminTenantDto>>;

public class AdminUpdateTenantCommandHandler(
    IMasterDbContext masterDb, ITenantService tenantService, ITenantDbContextFactory dbFactory)
    : IRequestHandler<AdminUpdateTenantCommand, ApiResponse<AdminTenantDto>>
{
    public async Task<ApiResponse<AdminTenantDto>> Handle(AdminUpdateTenantCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null) return ApiResponse<AdminTenantDto>.Failure("Tenant not found.");

        var req = request.Req;
        if (req.Name is not null) tenant.Name = req.Name;
        if (req.Plan is not null) tenant.Plan = req.Plan;
        if (req.ExpirationDate.HasValue) tenant.ExpirationDate = req.ExpirationDate;
        if (req.ContactEmail is not null) tenant.ContactEmail = req.ContactEmail;
        if (req.ContactPhone is not null) tenant.ContactPhone = req.ContactPhone;
        if (req.ContactCountry is not null) tenant.ContactCountry = req.ContactCountry;
        if (req.Notes is not null) tenant.Notes = req.Notes;
        if (req.IsActive.HasValue) tenant.IsActive = req.IsActive.Value;
        tenant.UpdatedAt = DateTime.UtcNow;

        await masterDb.SaveChangesAsync(ct);
        tenantService.InvalidateTenantCache(request.TenantId);
        if (req.ExpirationDate.HasValue)
            await TenantSettingsSync.SyncExpirationAsync(dbFactory, request.TenantId, tenant.ExpirationDate, ct);

        return ApiResponse<AdminTenantDto>.Success(TenantStatusHelper.ToDto(tenant));
    }
}

// ── Subscription actions ──────────────────────────────────────────────────────

public record CloseSubscriptionCommand(string TenantId) : IRequest<ApiResponse<AdminTenantDto>>;

public class CloseSubscriptionCommandHandler(IMasterDbContext masterDb, ITenantService tenantService)
    : IRequestHandler<CloseSubscriptionCommand, ApiResponse<AdminTenantDto>>
{
    public async Task<ApiResponse<AdminTenantDto>> Handle(CloseSubscriptionCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null) return ApiResponse<AdminTenantDto>.Failure("Tenant not found.");
        tenant.IsActive = false;
        tenant.UpdatedAt = DateTime.UtcNow;
        await masterDb.SaveChangesAsync(ct);
        tenantService.InvalidateTenantCache(request.TenantId);
        return ApiResponse<AdminTenantDto>.Success(TenantStatusHelper.ToDto(tenant));
    }
}

public record OpenSubscriptionCommand(string TenantId, OpenSubscriptionRequest Req)
    : IRequest<ApiResponse<AdminTenantDto>>;

public class OpenSubscriptionCommandHandler(
    IMasterDbContext masterDb, ITenantService tenantService, ITenantDbContextFactory dbFactory)
    : IRequestHandler<OpenSubscriptionCommand, ApiResponse<AdminTenantDto>>
{
    public async Task<ApiResponse<AdminTenantDto>> Handle(OpenSubscriptionCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null) return ApiResponse<AdminTenantDto>.Failure("Tenant not found.");
        tenant.IsActive = true;
        if (request.Req.Plan is not null) tenant.Plan = request.Req.Plan;
        if (request.Req.ExpirationDate.HasValue) tenant.ExpirationDate = request.Req.ExpirationDate;
        tenant.UpdatedAt = DateTime.UtcNow;
        TenantSubscriptionHelper.RecordRenewal(tenant);
        await masterDb.SaveChangesAsync(ct);
        tenantService.InvalidateTenantCache(request.TenantId);
        await TenantSettingsSync.SyncExpirationAsync(dbFactory, request.TenantId, tenant.ExpirationDate, ct);
        return ApiResponse<AdminTenantDto>.Success(TenantStatusHelper.ToDto(tenant));
    }
}

public record ExtendTrialCommand(string TenantId, ExtendTrialRequest Req)
    : IRequest<ApiResponse<AdminTenantDto>>;

public class ExtendTrialCommandHandler(
    IMasterDbContext masterDb, ITenantService tenantService, ITenantDbContextFactory dbFactory)
    : IRequestHandler<ExtendTrialCommand, ApiResponse<AdminTenantDto>>
{
    public async Task<ApiResponse<AdminTenantDto>> Handle(ExtendTrialCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null) return ApiResponse<AdminTenantDto>.Failure("Tenant not found.");
        var days = Math.Clamp(request.Req.Days, 1, 365);
        var baseDate = tenant.ExpirationDate.HasValue && tenant.ExpirationDate.Value > DateTime.UtcNow
            ? tenant.ExpirationDate.Value : DateTime.UtcNow;
        tenant.ExpirationDate = baseDate.AddDays(days);
        tenant.Plan = "trial";
        tenant.IsActive = true;
        tenant.UpdatedAt = DateTime.UtcNow;
        TenantSubscriptionHelper.RecordRenewal(tenant);
        await masterDb.SaveChangesAsync(ct);
        tenantService.InvalidateTenantCache(request.TenantId);
        await TenantSettingsSync.SyncExpirationAsync(dbFactory, request.TenantId, tenant.ExpirationDate, ct);
        return ApiResponse<AdminTenantDto>.Success(TenantStatusHelper.ToDto(tenant));
    }
}

public record ConvertTrialCommand(string TenantId, ConvertTrialRequest Req)
    : IRequest<ApiResponse<AdminTenantDto>>;

public class ConvertTrialCommandHandler(
    IMasterDbContext masterDb, ITenantService tenantService, ITenantDbContextFactory dbFactory)
    : IRequestHandler<ConvertTrialCommand, ApiResponse<AdminTenantDto>>
{
    public async Task<ApiResponse<AdminTenantDto>> Handle(ConvertTrialCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null) return ApiResponse<AdminTenantDto>.Failure("Tenant not found.");
        var plan = request.Req.Plan?.Trim().ToLowerInvariant() ?? "starter";
        if (plan is not ("starter" or "professional" or "enterprise"))
            return ApiResponse<AdminTenantDto>.Failure("Plan must be starter, professional, or enterprise.");
        tenant.Plan = plan;
        tenant.IsActive = true;
        tenant.ExpirationDate = DateTime.UtcNow.AddYears(1);
        tenant.UpdatedAt = DateTime.UtcNow;
        TenantSubscriptionHelper.RecordRenewal(tenant);
        await masterDb.SaveChangesAsync(ct);
        tenantService.InvalidateTenantCache(request.TenantId);
        await TenantSettingsSync.SyncExpirationAsync(dbFactory, request.TenantId, tenant.ExpirationDate, ct);
        return ApiResponse<AdminTenantDto>.Success(TenantStatusHelper.ToDto(tenant));
    }
}
