namespace RepWave.Application.Features.Auth.DTOs;

public record LoginRequest(
    string Email,
    string Password,
    string TenantId,
    string? Hwid = null,
    string LoginType = "admin");

/// <summary>
/// Payload for POST /api/auth/change-password.
/// Frontend sends { oldPassword, newPassword }.
/// </summary>
public record ChangePasswordRequest(string OldPassword, string NewPassword);

public record LoginResponse(
    int UserId,
    string Name,
    string Email,
    string Role,
    string Token,
    string TenantId,
    string? Image,
    int? DaysRemaining
);
