using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Application.Features.Users.DTOs;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Users.Queries;

public record GetAllUsersQuery(int Page = 1, int PageSize = 50) : IRequest<ApiResponse<PagedResult<UserDto>>>;

public class GetAllUsersQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllUsersQuery, ApiResponse<PagedResult<UserDto>>>
{
    public async Task<ApiResponse<PagedResult<UserDto>>> Handle(GetAllUsersQuery q, CancellationToken ct)
    {
        var query = db.Users.AsNoTracking();
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(u => new UserDto(
                u.UsersId, u.UsersName, u.UsersEmail, u.UsersRole,
                u.UsersPhone, u.UsersNationalId, u.UsersStatus, u.UsersImage,
                u.CreatedAt, u.UpdatedAt))
            .ToListAsync(ct);

        return ApiResponse<PagedResult<UserDto>>.Success(new PagedResult<UserDto>
        {
            Data = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize
        });
    }
}

public record GetUserByIdQuery(int Id) : IRequest<ApiResponse<UserDto>>;

public class GetUserByIdQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetUserByIdQuery, ApiResponse<UserDto>>
{
    public async Task<ApiResponse<UserDto>> Handle(GetUserByIdQuery q, CancellationToken ct)
    {
        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UsersId == q.Id, ct);
        if (u is null) return ApiResponse<UserDto>.Failure("User not found.");

        return ApiResponse<UserDto>.Success(new UserDto(
            u.UsersId, u.UsersName, u.UsersEmail, u.UsersRole,
            u.UsersPhone, u.UsersNationalId, u.UsersStatus, u.UsersImage,
            u.CreatedAt, u.UpdatedAt));
    }
}
