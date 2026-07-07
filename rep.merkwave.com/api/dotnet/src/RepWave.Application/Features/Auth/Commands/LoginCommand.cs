using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Application.Features.Auth.DTOs;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Auth.Commands;

public record LoginCommand(LoginRequest Request) : IRequest<ApiResponse<LoginResponse>>;

/// <summary>
/// Uses <see cref="ITenantDbContextFactory"/> so it can open the correct tenant DB
/// before a JWT exists. All other handlers use the scoped <see cref="IApplicationDbContext"/>
/// which is resolved from the JWT claim automatically.
/// </summary>
public class LoginCommandHandler(ITenantDbContextFactory dbFactory, ITenantService tenantService, ITokenService tokenService)
    : IRequestHandler<LoginCommand, ApiResponse<LoginResponse>>
{
    public async Task<ApiResponse<LoginResponse>> Handle(LoginCommand command, CancellationToken ct)
    {
        var req = command.Request;

        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return ApiResponse<LoginResponse>.Failure("Email and password are required.");

        if (string.IsNullOrWhiteSpace(req.TenantId))
            return ApiResponse<LoginResponse>.Failure("TenantId is required.");

        // Validate tenant exists in configuration before touching any DB
        if (!tenantService.TenantExists(req.TenantId))
            return ApiResponse<LoginResponse>.Failure("Unknown tenant. Check your TenantId.");

        // Open the tenant-specific database
        IApplicationDbContext db;
        try
        {
            db = dbFactory.Create(req.TenantId);
        }
        catch (InvalidOperationException ex)
        {
            return ApiResponse<LoginResponse>.Failure(ex.Message);
        }

        using (db)
        {
        var expiration = await db.Settings
            .Where(s => s.SettingsKey == "expiration_date")
            .Select(s => s.SettingsValue)
            .FirstOrDefaultAsync(ct);

        if (expiration is null)
            return ApiResponse<LoginResponse>.Failure("System subscription not configured. Contact support.");

        if (DateTime.TryParse(expiration, out var expiryDate) && DateTime.UtcNow > expiryDate)
            return ApiResponse<LoginResponse>.Failure("System subscription has expired. Contact support.");

        // Find user in tenant DB
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.UsersEmail == req.Email, ct);

        if (user is null)
            return ApiResponse<LoginResponse>.Failure("Invalid email or password.");

        if (!user.UsersStatus)
            return ApiResponse<LoginResponse>.Failure("Account is inactive. Contact your administrator.");

        // Verify password (BCrypt hash stored in DB)
        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.UsersPassword))
            return ApiResponse<LoginResponse>.Failure("Invalid email or password.");

        // Log successful login
        var log = new LoginLog
        {
            LoginLogsUsersId = user.UsersId,
            LoginLogsUsersName = user.UsersName,
            LoginLogsUsersRole = user.UsersRole,
            LoginLogsUsersHwid = req.Hwid,
            LoginLogsStatus = "success",
            LoginLogsReason = null,
            LoginLogsCreatedAt = DateTime.UtcNow
        };
        db.LoginLogs.Add(log);
        await db.SaveChangesAsync(ct);

        // TenantId is embedded in the token — every subsequent request carries it
        var token = tokenService.GenerateToken(user.UsersId, user.UsersEmail, user.UsersRole, user.UsersName, req.TenantId);

        return ApiResponse<LoginResponse>.Success(new LoginResponse(
            user.UsersId,
            user.UsersName,
            user.UsersEmail,
            user.UsersRole,
            token,
            req.TenantId,
            user.UsersImage,
            null
        ));
        }
    }
}
