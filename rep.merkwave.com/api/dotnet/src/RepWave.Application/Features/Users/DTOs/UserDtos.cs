namespace RepWave.Application.Features.Users.DTOs;

public record UserDto(
    int UsersId,
    string UsersName,
    string UsersEmail,
    string UsersRole,
    string? UsersPhone,
    string? UsersNationalId,
    bool UsersStatus,
    string? UsersImage,
    DateTime? CreatedAt,
    DateTime? UpdatedAt
);

public record CreateUserRequest(
    string UsersName,
    string UsersEmail,
    string UsersPassword,
    string UsersRole,
    string? UsersPhone,
    string? UsersNationalId,
    bool UsersStatus = true
);

public record UpdateUserRequest(
    string UsersName,
    string UsersEmail,
    string UsersRole,
    string? UsersPhone,
    string? UsersNationalId,
    bool UsersStatus,
    string? UsersPassword = null,
    string? UsersImage = null
);
