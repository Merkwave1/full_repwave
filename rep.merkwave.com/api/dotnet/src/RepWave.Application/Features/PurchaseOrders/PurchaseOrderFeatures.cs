using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.PurchaseOrders;

public record PurchaseOrderDto(int PurchaseOrdersId, int? PurchaseOrdersSupplierId, int? PurchaseOrdersWarehouseId,
    DateTime? PurchaseOrdersOrderDate, decimal PurchaseOrdersTotalAmount, string PurchaseOrdersStatus,
    string? PurchaseOrdersNotes, DateTime? PurchaseOrdersCreatedAt,
    string? SupplierName = null, string? WarehouseName = null, int ItemsCount = 0);

public record PurchaseOrderItemRequest(int? VariantId, int? PackagingTypeId, int QuantityOrdered, decimal UnitCost);

public record CreatePurchaseOrderRequest(int SupplierId, int? WarehouseId, DateTime? OrderDate, string? Notes,
    DateOnly? ExpectedDeliveryDate, string Status = "Ordered", IList<PurchaseOrderItemRequest>? Items = null);

public record GetAllPurchaseOrdersQuery(int Page = 1, int PageSize = 50, string? Status = null)
    : IRequest<ApiResponse<PagedResult<PurchaseOrderDto>>>;
public class GetAllPurchaseOrdersHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllPurchaseOrdersQuery, ApiResponse<PagedResult<PurchaseOrderDto>>>
{
    public async Task<ApiResponse<PagedResult<PurchaseOrderDto>>> Handle(GetAllPurchaseOrdersQuery q, CancellationToken ct)
    {
        var query = db.PurchaseOrders.AsNoTracking();
        if (q.Status is not null) query = query.Where(o => o.PurchaseOrdersStatus == q.Status);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(o => o.PurchaseOrdersCreatedAt).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(o => new PurchaseOrderDto(o.PurchaseOrdersId, o.PurchaseOrdersSupplierId, o.PurchaseOrdersWarehouseId, o.PurchaseOrdersOrderDate, o.PurchaseOrdersTotalAmount, o.PurchaseOrdersStatus, o.PurchaseOrdersNotes, o.PurchaseOrdersCreatedAt,
                o.Supplier != null ? o.Supplier.SupplierName : null,
                o.Warehouse != null ? o.Warehouse.WarehouseName : null,
                o.Items.Count))
            .ToListAsync(ct);
        return ApiResponse<PagedResult<PurchaseOrderDto>>.Success(new() { Data = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize });
    }
}

public record GetPurchaseOrderByIdQuery(int Id) : IRequest<ApiResponse<PurchaseOrderDto>>;
public class GetPurchaseOrderByIdHandler(IApplicationDbContext db) : IRequestHandler<GetPurchaseOrderByIdQuery, ApiResponse<PurchaseOrderDto>>
{
    public async Task<ApiResponse<PurchaseOrderDto>> Handle(GetPurchaseOrderByIdQuery q, CancellationToken ct)
    {
        var o = await db.PurchaseOrders.AsNoTracking()
            .Include(x => x.Supplier).Include(x => x.Warehouse).Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.PurchaseOrdersId == q.Id, ct);
        if (o is null) return ApiResponse<PurchaseOrderDto>.Failure("Purchase order not found.");
        return ApiResponse<PurchaseOrderDto>.Success(new PurchaseOrderDto(o.PurchaseOrdersId, o.PurchaseOrdersSupplierId, o.PurchaseOrdersWarehouseId, o.PurchaseOrdersOrderDate, o.PurchaseOrdersTotalAmount, o.PurchaseOrdersStatus, o.PurchaseOrdersNotes, o.PurchaseOrdersCreatedAt,
            o.Supplier?.SupplierName, o.Warehouse?.WarehouseName, o.Items.Count));
    }
}

public record CreatePurchaseOrderCommand(CreatePurchaseOrderRequest Request) : IRequest<ApiResponse<PurchaseOrderDto>>;
public class CreatePurchaseOrderHandler(IApplicationDbContext db)
    : IRequestHandler<CreatePurchaseOrderCommand, ApiResponse<PurchaseOrderDto>>
{
    public async Task<ApiResponse<PurchaseOrderDto>> Handle(CreatePurchaseOrderCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;
        var order = new PurchaseOrder
        {
            PurchaseOrdersSupplierId = r.SupplierId,
            PurchaseOrdersWarehouseId = r.WarehouseId,
            PurchaseOrdersOrderDate = r.OrderDate ?? DateTime.UtcNow,
            PurchaseOrdersNotes = r.Notes,
            PurchaseOrdersExpectedDeliveryDate = r.ExpectedDeliveryDate,
            PurchaseOrdersStatus = r.Status,
            PurchaseOrdersCreatedAt = DateTime.UtcNow
        };
        foreach (var item in r.Items ?? [])
        {
            var total = item.QuantityOrdered * item.UnitCost;
            order.Items.Add(new PurchaseOrderItem
            {
                PurchaseOrderItemsVariantId = item.VariantId,
                PurchaseOrderItemsPackagingTypeId = item.PackagingTypeId,
                PurchaseOrderItemsQuantityOrdered = item.QuantityOrdered,
                PurchaseOrderItemsUnitCost = item.UnitCost,
                PurchaseOrderItemsTotalCost = total
            });
        }
        order.PurchaseOrdersTotalAmount = order.Items.Sum(i => i.PurchaseOrderItemsTotalCost);
        db.PurchaseOrders.Add(order);

        // Update supplier balance for non-draft/non-cancelled orders
        if (r.Status != "Draft" && r.Status != "Cancelled" && order.PurchaseOrdersTotalAmount > 0)
        {
            var supplier = await db.Suppliers.FindAsync([r.SupplierId], ct);
            if (supplier is not null)
                supplier.SupplierBalance += order.PurchaseOrdersTotalAmount;
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<PurchaseOrderDto>.Success(new PurchaseOrderDto(order.PurchaseOrdersId, order.PurchaseOrdersSupplierId, order.PurchaseOrdersWarehouseId, order.PurchaseOrdersOrderDate, order.PurchaseOrdersTotalAmount, order.PurchaseOrdersStatus, order.PurchaseOrdersNotes, order.PurchaseOrdersCreatedAt));
    }
}

public record UpdatePurchaseOrderStatusCommand(int Id, string Status) : IRequest<ApiResponse<object>>;
public class UpdatePurchaseOrderStatusHandler(IApplicationDbContext db) : IRequestHandler<UpdatePurchaseOrderStatusCommand, ApiResponse<object>>
{
    private static bool IsActive(string status) => status != "Draft" && status != "Cancelled";

    public async Task<ApiResponse<object>> Handle(UpdatePurchaseOrderStatusCommand cmd, CancellationToken ct)
    {
        var o = await db.PurchaseOrders
            .Include(x => x.Supplier)
            .FirstOrDefaultAsync(x => x.PurchaseOrdersId == cmd.Id, ct);
        if (o is null) return ApiResponse<object>.Failure("Purchase order not found.");
        var oldStatus = o.PurchaseOrdersStatus;
        o.PurchaseOrdersStatus = cmd.Status;
        o.PurchaseOrdersUpdatedAt = DateTime.UtcNow;

        if (o.Supplier is not null && o.PurchaseOrdersTotalAmount > 0)
        {
            var wasActive = IsActive(oldStatus);
            var isActive = IsActive(cmd.Status);
            if (!wasActive && isActive)
                o.Supplier.SupplierBalance += o.PurchaseOrdersTotalAmount;
            else if (wasActive && !isActive)
                o.Supplier.SupplierBalance -= o.PurchaseOrdersTotalAmount;
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Status updated.");
    }
}

public record DeletePurchaseOrderCommand(int Id) : IRequest<ApiResponse<object>>;
public class DeletePurchaseOrderHandler(IApplicationDbContext db) : IRequestHandler<DeletePurchaseOrderCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeletePurchaseOrderCommand cmd, CancellationToken ct)
    {
        var o = await db.PurchaseOrders.FindAsync([cmd.Id], ct);
        if (o is null) return ApiResponse<object>.Failure("Purchase order not found.");
        db.PurchaseOrders.Remove(o); await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Purchase order deleted.");
    }
}
