using System.Security.Cryptography;
using System.Text.RegularExpressions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.TenantManagement;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record TenantDto(
    int Id,
    string TenantId,
    string Name,
    string? Plan,
    bool IsActive,
    DateTime? ExpirationDate,
    string? ContactEmail,
    string? ContactPhone,
    DateTime CreatedAt);

public record RegisterTenantRequest(
    string TenantId,
    string Name,
    string ConnectionString,
    string? Plan,
    DateTime? ExpirationDate,
    string? ContactEmail,
    string? ContactPhone,
    string? Notes,
    string AdminEmail,
    string AdminPassword,
    string AdminName,
    string? AdminPhone);

public record UpdateTenantRequest(
    string? Name,
    string? Plan,
    DateTime? ExpirationDate,
    string? ContactEmail,
    string? ContactPhone,
    string? Notes,
    bool? IsActive);

// ── Register Tenant ───────────────────────────────────────────────────────────

/// <summary>
/// Creates a new tenant record in the master DB and provisions an admin user
/// in the tenant's own database.
/// </summary>
public record RegisterTenantCommand(RegisterTenantRequest Req) : IRequest<ApiResponse<TenantDto>>;

public class RegisterTenantCommandHandler(
    IMasterDbContext masterDb,
    ITenantDbContextFactory dbFactory) : IRequestHandler<RegisterTenantCommand, ApiResponse<TenantDto>>
{
    public async Task<ApiResponse<TenantDto>> Handle(RegisterTenantCommand request, CancellationToken ct)
    {
        var req = request.Req;

        // 1. Validate uniqueness
        if (await masterDb.Tenants.AnyAsync(t => t.TenantId == req.TenantId, ct))
            return ApiResponse<TenantDto>.Failure($"Tenant ID '{req.TenantId}' is already taken.");

        // 2. Save tenant record
        var tenant = new Tenant
        {
            TenantId = req.TenantId.ToLowerInvariant().Trim(),
            Name = req.Name,
            ConnectionString = req.ConnectionString,
            Plan = req.Plan,
            ExpirationDate = req.ExpirationDate,
            ContactEmail = req.ContactEmail,
            ContactPhone = req.ContactPhone,
            Notes = req.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        masterDb.Tenants.Add(tenant);
        await masterDb.SaveChangesAsync(ct);

        // 3. Provision admin user in the tenant DB (creates the DB + schema if it doesn't exist)
        try
        {
            using var tenantDb = await dbFactory.CreateAndEnsureAsync(tenant.TenantId, ct);

            var adminUser = new User
            {
                UsersName = req.AdminName,
                UsersEmail = req.AdminEmail,
                UsersPassword = BCrypt.Net.BCrypt.HashPassword(req.AdminPassword),
                UsersRole = "admin",
                UsersPhone = req.AdminPhone,
                UsersStatus = true,
                CreatedAt = DateTime.UtcNow
            };
            tenantDb.Users.Add(adminUser);

            // Seed default settings
            var expiryDate = req.ExpirationDate?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.AddYears(10).ToString("yyyy-MM-dd");
            tenantDb.Settings.Add(new Setting { SettingsKey = "expiration_date", SettingsValue = expiryDate, SettingsLabel = "Expiration Date", SettingsCategory = "system" });
            tenantDb.Settings.Add(new Setting { SettingsKey = "company_name", SettingsValue = req.Name, SettingsLabel = "Company Name", SettingsCategory = "general" });

            await tenantDb.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            // Rollback master DB record if tenant DB provisioning fails
            masterDb.Tenants.Remove(tenant);
            await masterDb.SaveChangesAsync(ct);
            return ApiResponse<TenantDto>.Failure($"Tenant registered but admin provisioning failed: {ex.Message}");
        }

        var dto = ToDto(tenant);
        return ApiResponse<TenantDto>.Success(dto, "Tenant registered successfully.");
    }

    private static TenantDto ToDto(Tenant t) => new(
        t.Id, t.TenantId, t.Name, t.Plan, t.IsActive,
        t.ExpirationDate, t.ContactEmail, t.ContactPhone, t.CreatedAt);
}

// ── Get All Tenants ───────────────────────────────────────────────────────────

public record GetAllTenantsQuery(bool? IsActive = null) : IRequest<ApiResponse<List<TenantDto>>>;

public class GetAllTenantsQueryHandler(IMasterDbContext masterDb)
    : IRequestHandler<GetAllTenantsQuery, ApiResponse<List<TenantDto>>>
{
    public async Task<ApiResponse<List<TenantDto>>> Handle(GetAllTenantsQuery request, CancellationToken ct)
    {
        var query = masterDb.Tenants.AsNoTracking().AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(t => t.IsActive == request.IsActive.Value);

        var list = await query
            .OrderBy(t => t.Name)
            .Select(t => new TenantDto(
                t.Id, t.TenantId, t.Name, t.Plan, t.IsActive,
                t.ExpirationDate, t.ContactEmail, t.ContactPhone, t.CreatedAt))
            .ToListAsync(ct);

        return ApiResponse<List<TenantDto>>.Success(list);
    }
}

// ── Update Tenant ─────────────────────────────────────────────────────────────

public record UpdateTenantCommand(string TenantId, UpdateTenantRequest Req) : IRequest<ApiResponse<TenantDto>>;

public class UpdateTenantCommandHandler(IMasterDbContext masterDb, ITenantService tenantService)
    : IRequestHandler<UpdateTenantCommand, ApiResponse<TenantDto>>
{
    public async Task<ApiResponse<TenantDto>> Handle(UpdateTenantCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null)
            return ApiResponse<TenantDto>.Failure("Tenant not found.");

        var req = request.Req;
        if (req.Name is not null) tenant.Name = req.Name;
        if (req.Plan is not null) tenant.Plan = req.Plan;
        if (req.ExpirationDate.HasValue) tenant.ExpirationDate = req.ExpirationDate;
        if (req.ContactEmail is not null) tenant.ContactEmail = req.ContactEmail;
        if (req.ContactPhone is not null) tenant.ContactPhone = req.ContactPhone;
        if (req.Notes is not null) tenant.Notes = req.Notes;
        if (req.IsActive.HasValue) tenant.IsActive = req.IsActive.Value;
        tenant.UpdatedAt = DateTime.UtcNow;

        await masterDb.SaveChangesAsync(ct);

        // Invalidate cache so next request picks up any connection/status changes
        tenantService.InvalidateTenantCache(request.TenantId);

        return ApiResponse<TenantDto>.Success(new TenantDto(
            tenant.Id, tenant.TenantId, tenant.Name, tenant.Plan, tenant.IsActive,
            tenant.ExpirationDate, tenant.ContactEmail, tenant.ContactPhone, tenant.CreatedAt));
    }
}

// ── Delete Tenant ─────────────────────────────────────────────────────────────

public record DeleteTenantCommand(string TenantId) : IRequest<ApiResponse<object>>;

public class DeleteTenantCommandHandler(IMasterDbContext masterDb, ITenantService tenantService)
    : IRequestHandler<DeleteTenantCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteTenantCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null)
            return ApiResponse<object>.Failure("Tenant not found.");

        masterDb.Tenants.Remove(tenant);
        await masterDb.SaveChangesAsync(ct);

        tenantService.InvalidateTenantCache(request.TenantId);
        return ApiResponse<object>.Success(null!, "Tenant deleted.");
    }
}

// ── Self-Service Trial Registration ──────────────────────────────────────────

public record TrialRegistrationRequest(
    string ContactName,
    string ContactEmail,
    string? ContactPhone,
    string CompanyName);

public record TrialCredentialsDto(
    string CompanyName,
    string TenantId,
    string Email,
    string Password,
    string ExpiresAt,
    int Days);

public record RegisterTrialCommand(TrialRegistrationRequest Req) : IRequest<ApiResponse<TrialCredentialsDto>>;

public class RegisterTrialCommandHandler(
    IMasterDbContext masterDb,
    ITenantDbContextFactory dbFactory) : IRequestHandler<RegisterTrialCommand, ApiResponse<TrialCredentialsDto>>
{
    private static readonly string[] ForbiddenSlugs = ["demo", "admin", "test", "repwave", "system", "root", "api"];

    public async Task<ApiResponse<TrialCredentialsDto>> Handle(RegisterTrialCommand request, CancellationToken ct)
    {
        var req = request.Req;

        // 1. Generate unique TenantId slug from company name
        var baseSlug = GenerateSlug(req.CompanyName);
        var tenantId = await EnsureUniqueTenantIdAsync(baseSlug, ct);

        // 2. Generate random password
        var password = GeneratePassword();

        // 3. Build connection string (postgres service name in Docker network)
        var connectionString = $"Host=postgres;Port=5432;Database=repwave_{tenantId};Username=repwave_user;Password=repwave_pass";

        var expiresAt = DateTime.UtcNow.AddDays(7);
        const int trialDays = 7;

        // 4. Save tenant record in master DB
        var tenant = new Tenant
        {
            TenantId = tenantId,
            Name = req.CompanyName,
            ConnectionString = connectionString,
            Plan = "trial",
            ExpirationDate = expiresAt,
            ContactEmail = req.ContactEmail,
            ContactPhone = req.ContactPhone,
            Notes = $"Self-service trial. Contact: {req.ContactName}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        masterDb.Tenants.Add(tenant);
        await masterDb.SaveChangesAsync(ct);

        // 5. Provision tenant database and admin user
        try
        {
            using var tenantDb = await dbFactory.CreateAndEnsureAsync(tenantId, ct);

            tenantDb.Users.Add(new User
            {
                UsersName = req.ContactName,
                UsersEmail = req.ContactEmail,
                UsersPassword = BCrypt.Net.BCrypt.HashPassword(password),
                UsersRole = "admin",
                UsersPhone = req.ContactPhone,
                UsersStatus = true,
                CreatedAt = DateTime.UtcNow
            });
            tenantDb.Settings.Add(new Setting
            {
                SettingsKey = "expiration_date",
                SettingsValue = expiresAt.ToString("yyyy-MM-dd"),
                SettingsLabel = "Expiration Date",
                SettingsCategory = "system"
            });
            tenantDb.Settings.Add(new Setting
            {
                SettingsKey = "company_name",
                SettingsValue = req.CompanyName,
                SettingsLabel = "Company Name",
                SettingsCategory = "general"
            });
            await tenantDb.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            masterDb.Tenants.Remove(tenant);
            await masterDb.SaveChangesAsync(ct);
            return ApiResponse<TrialCredentialsDto>.Failure($"Registration failed: {ex.Message}");
        }

        return ApiResponse<TrialCredentialsDto>.Success(
            new TrialCredentialsDto(
                CompanyName: req.CompanyName,
                TenantId: tenantId,
                Email: req.ContactEmail,
                Password: password,
                ExpiresAt: expiresAt.ToString("MMM dd, yyyy"),
                Days: trialDays),
            "Trial account created successfully.");
    }

    private static string GenerateSlug(string name)
    {
        var slug = name.ToLowerInvariant().Trim();
        slug = slug.Replace(" ", "-").Replace("'", "").Replace(".", "").Replace(",", "");
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");
        slug = slug.Trim('-');
        if (slug.Length > 15) slug = slug[..15].TrimEnd('-');
        return string.IsNullOrEmpty(slug) ? "trial" : slug;
    }

    private async Task<string> EnsureUniqueTenantIdAsync(string baseSlug, CancellationToken ct)
    {
        if (ForbiddenSlugs.Contains(baseSlug)) baseSlug = "t-" + baseSlug;
        var tenantId = baseSlug;
        var attempt = 0;
        while (await masterDb.Tenants.AnyAsync(t => t.TenantId == tenantId, ct))
        {
            attempt++;
            tenantId = $"{baseSlug}-{attempt}";
        }
        return tenantId;
    }

    private static string GeneratePassword()
    {
        const string chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
        var bytes = new byte[12];
        RandomNumberGenerator.Fill(bytes);
        return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
    }
}
