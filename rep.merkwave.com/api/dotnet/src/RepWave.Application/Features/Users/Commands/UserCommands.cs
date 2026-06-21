using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Application.Features.Users.DTOs;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Users.Commands;

// ── Create ──────────────────────────────────────────────────
public record CreateUserCommand(CreateUserRequest Request) : IRequest<ApiResponse<UserDto>>;

public class CreateUserCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateUserCommand, ApiResponse<UserDto>>
{
    public async Task<ApiResponse<UserDto>> Handle(CreateUserCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;

        if (await db.Users.AnyAsync(u => u.UsersEmail == r.UsersEmail, ct))
            return ApiResponse<UserDto>.Failure("Email already exists.");

        // Check user limit
        var limitSetting = await db.Settings
            .Where(s => s.SettingsKey == "users_limits")
            .Select(s => s.SettingsValue)
            .FirstOrDefaultAsync(ct);

        if (int.TryParse(limitSetting, out var limit))
        {
            var currentCount = await db.Users.CountAsync(ct);
            if (currentCount >= limit)
                return ApiResponse<UserDto>.Failure($"User limit ({limit}) reached.");
        }

        var user = new User
        {
            UsersName = r.UsersName,
            UsersEmail = r.UsersEmail,
            UsersPassword = BCrypt.Net.BCrypt.HashPassword(r.UsersPassword),
            UsersRole = r.UsersRole,
            UsersPhone = r.UsersPhone,
            UsersNationalId = r.UsersNationalId,
            UsersStatus = r.UsersStatus,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return ApiResponse<UserDto>.Success(new UserDto(
            user.UsersId, user.UsersName, user.UsersEmail, user.UsersRole,
            user.UsersPhone, user.UsersNationalId, user.UsersStatus, user.UsersImage,
            user.CreatedAt, user.UpdatedAt));
    }
}

// ── Update ──────────────────────────────────────────────────
public record UpdateUserCommand(int Id, UpdateUserRequest Request) : IRequest<ApiResponse<UserDto>>;

public class UpdateUserCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateUserCommand, ApiResponse<UserDto>>
{
    public async Task<ApiResponse<UserDto>> Handle(UpdateUserCommand cmd, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([cmd.Id], ct);
        if (user is null) return ApiResponse<UserDto>.Failure("User not found.");

        var r = cmd.Request;

        if (await db.Users.AnyAsync(u => u.UsersEmail == r.UsersEmail && u.UsersId != cmd.Id, ct))
            return ApiResponse<UserDto>.Failure("Email already in use by another user.");

        user.UsersName = r.UsersName;
        user.UsersEmail = r.UsersEmail;
        user.UsersRole = r.UsersRole;
        user.UsersPhone = r.UsersPhone;
        user.UsersNationalId = r.UsersNationalId;
        user.UsersStatus = r.UsersStatus;
        if (!string.IsNullOrWhiteSpace(r.UsersImage))
            user.UsersImage = r.UsersImage;
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(r.UsersPassword))
            user.UsersPassword = BCrypt.Net.BCrypt.HashPassword(r.UsersPassword);

        await db.SaveChangesAsync(ct);

        return ApiResponse<UserDto>.Success(new UserDto(
            user.UsersId, user.UsersName, user.UsersEmail, user.UsersRole,
            user.UsersPhone, user.UsersNationalId, user.UsersStatus, user.UsersImage,
            user.CreatedAt, user.UpdatedAt));
    }
}

// ── Delete ──────────────────────────────────────────────────
public record DeleteUserCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteUserCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteUserCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteUserCommand cmd, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([cmd.Id], ct);
        if (user is null) return ApiResponse<object>.Failure("User not found.");

        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);

        return ApiResponse<object>.Success(null, "User deleted successfully.");
    }
}
