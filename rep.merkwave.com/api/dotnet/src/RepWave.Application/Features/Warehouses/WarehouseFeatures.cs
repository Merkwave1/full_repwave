using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Warehouses;

public record WarehouseDto(int WarehouseId, string WarehouseName, string? WarehouseType, string? WarehouseCode,
    string? WarehouseAddress, string? WarehouseContactPerson, string? WarehousePhone, string WarehouseStatus, int? WarehouseRepresentativeUserId);
public record UpsertWarehouseRequest(string WarehouseName, string? WarehouseType, string? WarehouseCode,
    string? WarehouseAddress, string? WarehouseContactPerson, string? WarehousePhone,
    string WarehouseStatus = "active", int? WarehouseRepresentativeUserId = null);

public record GetAllWarehousesQuery : IRequest<ApiResponse<List<WarehouseDto>>>;
public class GetAllWarehousesHandler(IApplicationDbContext db) : IRequestHandler<GetAllWarehousesQuery, ApiResponse<List<WarehouseDto>>>
{
    public async Task<ApiResponse<List<WarehouseDto>>> Handle(GetAllWarehousesQuery _, CancellationToken ct)
        => ApiResponse<List<WarehouseDto>>.Success(await db.Warehouses.AsNoTracking()
            .Select(w => new WarehouseDto(w.WarehouseId, w.WarehouseName, w.WarehouseType, w.WarehouseCode,
                w.WarehouseAddress, w.WarehouseContactPerson, w.WarehousePhone, w.WarehouseStatus,
                w.WarehouseRepresentativeUserId)).ToListAsync(ct));
}
public record GetWarehouseByIdQuery(int Id) : IRequest<ApiResponse<WarehouseDto>>;
public class GetWarehouseByIdHandler(IApplicationDbContext db) : IRequestHandler<GetWarehouseByIdQuery, ApiResponse<WarehouseDto>>
{
    public async Task<ApiResponse<WarehouseDto>> Handle(GetWarehouseByIdQuery q, CancellationToken ct)
    {
        var w = await db.Warehouses.AsNoTracking().FirstOrDefaultAsync(x => x.WarehouseId == q.Id, ct);
        if (w is null) return ApiResponse<WarehouseDto>.Failure("Warehouse not found.");
        return ApiResponse<WarehouseDto>.Success(new WarehouseDto(w.WarehouseId, w.WarehouseName, w.WarehouseType, w.WarehouseCode, w.WarehouseAddress, w.WarehouseContactPerson, w.WarehousePhone, w.WarehouseStatus, w.WarehouseRepresentativeUserId));
    }
}
public record CreateWarehouseCommand(UpsertWarehouseRequest Request) : IRequest<ApiResponse<WarehouseDto>>;
public class CreateWarehouseHandler(IApplicationDbContext db) : IRequestHandler<CreateWarehouseCommand, ApiResponse<WarehouseDto>>
{
    public async Task<ApiResponse<WarehouseDto>> Handle(CreateWarehouseCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;
        var w = new Warehouse { WarehouseName = r.WarehouseName, WarehouseType = r.WarehouseType, WarehouseCode = r.WarehouseCode, WarehouseAddress = r.WarehouseAddress, WarehouseContactPerson = r.WarehouseContactPerson, WarehousePhone = r.WarehousePhone, WarehouseStatus = r.WarehouseStatus, WarehouseRepresentativeUserId = r.WarehouseRepresentativeUserId };
        db.Warehouses.Add(w); await db.SaveChangesAsync(ct);
        return ApiResponse<WarehouseDto>.Success(new WarehouseDto(w.WarehouseId, w.WarehouseName, w.WarehouseType, w.WarehouseCode, w.WarehouseAddress, w.WarehouseContactPerson, w.WarehousePhone, w.WarehouseStatus, w.WarehouseRepresentativeUserId));
    }
}
public record UpdateWarehouseCommand(int Id, UpsertWarehouseRequest Request) : IRequest<ApiResponse<WarehouseDto>>;
public class UpdateWarehouseHandler(IApplicationDbContext db) : IRequestHandler<UpdateWarehouseCommand, ApiResponse<WarehouseDto>>
{
    public async Task<ApiResponse<WarehouseDto>> Handle(UpdateWarehouseCommand cmd, CancellationToken ct)
    {
        var w = await db.Warehouses.FindAsync([cmd.Id], ct);
        if (w is null) return ApiResponse<WarehouseDto>.Failure("Warehouse not found.");
        var r = cmd.Request;
        w.WarehouseName = r.WarehouseName; w.WarehouseType = r.WarehouseType; w.WarehouseCode = r.WarehouseCode;
        w.WarehouseAddress = r.WarehouseAddress; w.WarehouseContactPerson = r.WarehouseContactPerson;
        w.WarehousePhone = r.WarehousePhone; w.WarehouseStatus = r.WarehouseStatus;
        w.WarehouseRepresentativeUserId = r.WarehouseRepresentativeUserId;
        await db.SaveChangesAsync(ct);
        return ApiResponse<WarehouseDto>.Success(new WarehouseDto(w.WarehouseId, w.WarehouseName, w.WarehouseType, w.WarehouseCode, w.WarehouseAddress, w.WarehouseContactPerson, w.WarehousePhone, w.WarehouseStatus, w.WarehouseRepresentativeUserId));
    }
}
public record DeleteWarehouseCommand(int Id) : IRequest<ApiResponse<object>>;
public class DeleteWarehouseHandler(IApplicationDbContext db) : IRequestHandler<DeleteWarehouseCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteWarehouseCommand cmd, CancellationToken ct)
    {
        var w = await db.Warehouses.FindAsync([cmd.Id], ct);
        if (w is null) return ApiResponse<object>.Failure("المخزن غير موجود.");

        var conflicts = new List<string>();
        if (await db.Inventories.AnyAsync(x => x.WarehouseId == cmd.Id && x.InventoryQuantity > 0, ct))
            conflicts.Add("مخزون نشط");
        if (await db.SalesOrders.AnyAsync(x => x.SalesOrdersWarehouseId == cmd.Id &&
            x.SalesOrdersStatus != "Invoiced" && x.SalesOrdersStatus != "Cancelled", ct))
            conflicts.Add("طلبات مبيعات");
        if (await db.Transfers.AnyAsync(x => (x.TransferFromWarehouseId == cmd.Id || x.TransferToWarehouseId == cmd.Id) &&
            x.TransferStatus != "Completed" && x.TransferStatus != "Cancelled", ct))
            conflicts.Add("تحويلات مخزون");

        if (conflicts.Count > 0)
            return ApiResponse<object>.Failure($"لا يمكن حذف المخزن لارتباطه بـ: {string.Join("، ", conflicts)}.");

        db.Warehouses.Remove(w);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "تم حذف المخزن بنجاح.");
    }
}
