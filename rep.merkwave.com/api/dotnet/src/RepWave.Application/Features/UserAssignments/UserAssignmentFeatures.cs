using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.UserAssignments;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record UserSafeDto(int Id, int UserId, string? UserName, int SafeId, string? SafeName, DateTime? AssignedAt);
public record UserWarehouseDto(int Id, int UserId, string? UserName, int WarehouseId, string? WarehouseName, DateTime? AssignedAt);

// ── UserSafes ─────────────────────────────────────────────────────────────────

public record GetUserSafesQuery(int? UserId = null, int? SafeId = null) : IRequest<ApiResponse<List<UserSafeDto>>>;

public class GetUserSafesQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetUserSafesQuery, ApiResponse<List<UserSafeDto>>>
{
    public async Task<ApiResponse<List<UserSafeDto>>> Handle(GetUserSafesQuery request, CancellationToken ct)
    {
        var query = db.UserSafes.AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Safe)
            .AsQueryable();

        if (request.UserId.HasValue) query = query.Where(x => x.UserId == request.UserId.Value);
        if (request.SafeId.HasValue) query = query.Where(x => x.SafeId == request.SafeId.Value);

        var list = await query.Select(x => new UserSafeDto(
            x.Id, x.UserId, x.User != null ? x.User.UsersName : null,
            x.SafeId, x.Safe != null ? x.Safe.SafesName : null, x.AssignedAt))
            .ToListAsync(ct);

        return ApiResponse<List<UserSafeDto>>.Success(list);
    }
}

public record AssignUserToSafeCommand(int UserId, int SafeId) : IRequest<ApiResponse<UserSafeDto>>;

public class AssignUserToSafeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<AssignUserToSafeCommand, ApiResponse<UserSafeDto>>
{
    public async Task<ApiResponse<UserSafeDto>> Handle(AssignUserToSafeCommand request, CancellationToken ct)
    {
        var exists = await db.UserSafes.AnyAsync(x => x.UserId == request.UserId && x.SafeId == request.SafeId, ct);
        if (exists) return ApiResponse<UserSafeDto>.Failure("User already assigned to this safe.");

        var assignment = new UserSafe { UserId = request.UserId, SafeId = request.SafeId, AssignedAt = DateTime.UtcNow };
        db.UserSafes.Add(assignment);
        await db.SaveChangesAsync(ct);

        return ApiResponse<UserSafeDto>.Success(new UserSafeDto(
            assignment.Id, assignment.UserId, null, assignment.SafeId, null, assignment.AssignedAt));
    }
}

public record UnassignUserFromSafeCommand(int UserId, int SafeId) : IRequest<ApiResponse<object>>;

public class UnassignUserFromSafeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UnassignUserFromSafeCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UnassignUserFromSafeCommand request, CancellationToken ct)
    {
        var a = await db.UserSafes
            .FirstOrDefaultAsync(x => x.UserId == request.UserId && x.SafeId == request.SafeId, ct);
        if (a is null) return ApiResponse<object>.Failure("Assignment not found.");
        db.UserSafes.Remove(a);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Unassigned.");
    }
}

// ── UserWarehouses ────────────────────────────────────────────────────────────

public record GetUserWarehousesQuery(int? UserId = null, int? WarehouseId = null) : IRequest<ApiResponse<List<UserWarehouseDto>>>;

public class GetUserWarehousesQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetUserWarehousesQuery, ApiResponse<List<UserWarehouseDto>>>
{
    public async Task<ApiResponse<List<UserWarehouseDto>>> Handle(GetUserWarehousesQuery request, CancellationToken ct)
    {
        var query = db.UserWarehouses.AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Warehouse)
            .AsQueryable();

        if (request.UserId.HasValue) query = query.Where(x => x.UserId == request.UserId.Value);
        if (request.WarehouseId.HasValue) query = query.Where(x => x.WarehouseId == request.WarehouseId.Value);

        var list = await query.Select(x => new UserWarehouseDto(
            x.Id, x.UserId, x.User != null ? x.User.UsersName : null,
            x.WarehouseId, x.Warehouse != null ? x.Warehouse.WarehouseName : null, x.AssignedAt))
            .ToListAsync(ct);

        return ApiResponse<List<UserWarehouseDto>>.Success(list);
    }
}

public record AssignUserToWarehouseCommand(int UserId, int WarehouseId) : IRequest<ApiResponse<UserWarehouseDto>>;

public class AssignUserToWarehouseCommandHandler(IApplicationDbContext db)
    : IRequestHandler<AssignUserToWarehouseCommand, ApiResponse<UserWarehouseDto>>
{
    public async Task<ApiResponse<UserWarehouseDto>> Handle(AssignUserToWarehouseCommand request, CancellationToken ct)
    {
        var exists = await db.UserWarehouses.AnyAsync(
            x => x.UserId == request.UserId && x.WarehouseId == request.WarehouseId, ct);
        if (exists) return ApiResponse<UserWarehouseDto>.Failure("User already assigned to this warehouse.");

        var a = new UserWarehouse { UserId = request.UserId, WarehouseId = request.WarehouseId, AssignedAt = DateTime.UtcNow };
        db.UserWarehouses.Add(a);
        await db.SaveChangesAsync(ct);

        return ApiResponse<UserWarehouseDto>.Success(new UserWarehouseDto(
            a.Id, a.UserId, null, a.WarehouseId, null, a.AssignedAt));
    }
}

public record UnassignUserFromWarehouseCommand(int UserId, int WarehouseId) : IRequest<ApiResponse<object>>;

public class UnassignUserFromWarehouseCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UnassignUserFromWarehouseCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UnassignUserFromWarehouseCommand request, CancellationToken ct)
    {
        var a = await db.UserWarehouses
            .FirstOrDefaultAsync(x => x.UserId == request.UserId && x.WarehouseId == request.WarehouseId, ct);
        if (a is null) return ApiResponse<object>.Failure("Assignment not found.");
        db.UserWarehouses.Remove(a);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Unassigned.");
    }
}
