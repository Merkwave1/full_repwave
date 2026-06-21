using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Auth.Commands;

public record ChangePasswordCommand(int UserId, string CurrentPassword, string NewPassword)
    : IRequest<ApiResponse<object>>;

public class ChangePasswordCommandHandler(IApplicationDbContext db)
    : IRequestHandler<ChangePasswordCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(ChangePasswordCommand command, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([command.UserId], ct);
        if (user is null) return ApiResponse<object>.Failure("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(command.CurrentPassword, user.UsersPassword))
            return ApiResponse<object>.Failure("Current password is incorrect.");

        user.UsersPassword = BCrypt.Net.BCrypt.HashPassword(command.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return ApiResponse<object>.Success(null, "Password changed successfully.");
    }
}
