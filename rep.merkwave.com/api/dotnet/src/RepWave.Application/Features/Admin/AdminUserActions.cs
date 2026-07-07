using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Admin;

public record AdminResetPasswordResponse(
    int UserId,
    string TenantId,
    string TenantName,
    string Email,
    string TemporaryPassword);

public record AdminImpersonateResponse(
    string HandoffUrl,
    string TenantId,
    string TenantName,
    int UserId,
    string UserName,
    string UserEmail,
    string Role);

public record AdminResetUserPasswordCommand(string TenantId, int UserId)
    : IRequest<ApiResponse<AdminResetPasswordResponse>>;

public class AdminResetUserPasswordCommandHandler(
    IMasterDbContext masterDb,
    ITenantDbContextFactory dbFactory,
    IAdminActorProvider actorProvider,
    ITenantService tenantService)
    : IRequestHandler<AdminResetUserPasswordCommand, ApiResponse<AdminResetPasswordResponse>>
{
    public async Task<ApiResponse<AdminResetPasswordResponse>> Handle(
        AdminResetUserPasswordCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants
            .FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null)
            return ApiResponse<AdminResetPasswordResponse>.Failure("Tenant not found.");

        var extendedForSupport = false;
        if (!tenant.IsActive
            || (tenant.ExpirationDate.HasValue && tenant.ExpirationDate.Value < DateTime.UtcNow))
        {
            tenant.IsActive = true;
            tenant.ExpirationDate = DateTime.UtcNow.AddDays(7);
            tenant.LastRenewedAt = DateTime.UtcNow;
            tenant.RenewalCount = tenant.RenewalCount + 1;
            await masterDb.SaveChangesAsync(ct);
            tenantService.InvalidateTenantCache(tenant.TenantId);
            extendedForSupport = true;
        }

        using var db = dbFactory.CreateFromConnectionString(tenant.ConnectionString);
        var user = await db.Users.FirstOrDefaultAsync(u => u.UsersId == request.UserId, ct);
        if (user is null)
            return ApiResponse<AdminResetPasswordResponse>.Failure("User not found.");

        if (extendedForSupport)
        {
            var expirySetting = await db.Settings
                .FirstOrDefaultAsync(s => s.SettingsKey == "expiration_date", ct);
            var expiryValue = tenant.ExpirationDate!.Value.ToString("yyyy-MM-dd");
            if (expirySetting is null)
            {
                db.Settings.Add(new Setting
                {
                    SettingsKey = "expiration_date",
                    SettingsValue = expiryValue,
                });
            }
            else
            {
                expirySetting.SettingsValue = expiryValue;
            }
            await db.SaveChangesAsync(ct);
        }

        var tempPassword = AdminPasswordHelper.GenerateTemporary();
        user.UsersPassword = BCrypt.Net.BCrypt.HashPassword(tempPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var auditDetails = extendedForSupport
            ? $"Admin reset password for {user.UsersName}; extended subscription +7 days for support access"
            : $"Admin reset password for {user.UsersName}";

        await AdminAuditWriter.LogAsync(
            masterDb, actorProvider, "password_reset",
            tenant.TenantId, user.UsersId, user.UsersEmail,
            auditDetails, ct);

        return ApiResponse<AdminResetPasswordResponse>.Success(
            new AdminResetPasswordResponse(
                user.UsersId, tenant.TenantId, tenant.Name,
                user.UsersEmail, tempPassword),
            extendedForSupport
                ? "Temporary password generated. Subscription extended 7 days so the user can log in."
                : "Temporary password generated. Share securely with the user.");
    }
}

public record AdminImpersonateRequest(int? UserId);

public record AdminImpersonateCommand(string TenantId, AdminImpersonateRequest? Req)
    : IRequest<ApiResponse<AdminImpersonateResponse>>;

public class AdminImpersonateCommandHandler(
    IMasterDbContext masterDb,
    ITenantDbContextFactory dbFactory,
    ITokenService tokenService,
    IAdminActorProvider actorProvider,
    IConfiguration config)
    : IRequestHandler<AdminImpersonateCommand, ApiResponse<AdminImpersonateResponse>>
{
    public async Task<ApiResponse<AdminImpersonateResponse>> Handle(
        AdminImpersonateCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null)
            return ApiResponse<AdminImpersonateResponse>.Failure("Tenant not found.");

        if (!tenant.IsActive)
            return ApiResponse<AdminImpersonateResponse>.Failure("Tenant account is suspended.");

        using var db = dbFactory.CreateFromConnectionString(tenant.ConnectionString);

        User? user;
        if (request.Req?.UserId is int userId)
        {
            user = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.UsersId == userId, ct);
        }
        else
        {
            user = await db.Users.AsNoTracking()
                .Where(u => u.UsersRole == "admin" && u.UsersStatus)
                .OrderBy(u => u.UsersId)
                .FirstOrDefaultAsync(ct);
        }

        if (user is null)
            return ApiResponse<AdminImpersonateResponse>.Failure("No active admin user found for this tenant.");

        if (!user.UsersStatus)
            return ApiResponse<AdminImpersonateResponse>.Failure("Target user is disabled.");

        var (adminEmail, _) = actorProvider.GetCurrentAdmin();

        db.LoginLogs.Add(new LoginLog
        {
            LoginLogsUsersId = user.UsersId,
            LoginLogsUsersName = user.UsersName,
            LoginLogsUsersRole = user.UsersRole,
            LoginLogsStatus = "success",
            LoginLogsReason = $"admin_impersonation:{adminEmail}",
            LoginLogsCreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        var token = tokenService.GenerateToken(
            user.UsersId, user.UsersEmail, user.UsersRole, user.UsersName, tenant.TenantId, adminSupport: true);

        int? daysRemaining = null;
        if (tenant.ExpirationDate.HasValue)
            daysRemaining = (int)Math.Ceiling((tenant.ExpirationDate.Value - DateTime.UtcNow).TotalDays);

        var handoffUrl = AdminHandoffHelper.BuildUrl(config, new
        {
            token,
            user_id = user.UsersId,
            name = user.UsersName,
            email = user.UsersEmail,
            role = user.UsersRole,
            tenant_id = tenant.TenantId,
            image = user.UsersImage,
            days_remaining = daysRemaining,
            admin_support = true,
        });

        await AdminAuditWriter.LogAsync(
            masterDb, actorProvider, "impersonate",
            tenant.TenantId, user.UsersId, user.UsersEmail,
            $"Opened ERP as {user.UsersRole} ({user.UsersName})", ct);

        return ApiResponse<AdminImpersonateResponse>.Success(new AdminImpersonateResponse(
            handoffUrl, tenant.TenantId, tenant.Name,
            user.UsersId, user.UsersName, user.UsersEmail, user.UsersRole));
    }
}

internal static class AdminPasswordHelper
{
    public static string GenerateTemporary()
    {
        const string chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
        var bytes = new byte[12];
        RandomNumberGenerator.Fill(bytes);
        return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
    }
}

internal static class AdminHandoffHelper
{
    public static string BuildUrl(IConfiguration config, object payload)
    {
        var erpBase = config["ErpApp:BaseUrl"]?.TrimEnd('/')
            ?? "http://localhost:5174";

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        });
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
        return $"{erpBase}/auth/handoff?payload={Uri.EscapeDataString(base64)}";
    }
}
