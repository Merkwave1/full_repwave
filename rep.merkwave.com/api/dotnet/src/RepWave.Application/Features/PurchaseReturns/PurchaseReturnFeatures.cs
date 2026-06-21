using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.PurchaseReturns;

public record PurchaseReturnDto(
    int PurchaseReturnsId,
    int? PurchaseReturnsPurchaseOrderId,
    int? PurchaseReturnsSupplierId,
    string? SupplierName,
    int? PurchaseReturnsWarehouseId,
    string? WarehouseName,
    DateTime? PurchaseReturnsDate,
    decimal PurchaseReturnsTotalAmount,
    string PurchaseReturnsStatus,
    string? PurchaseReturnsNotes,
    string? PurchaseReturnsReason,
    DateTime? PurchaseReturnsCreatedAt);

public record CreatePurchaseReturnItemRequest(
    int? PurchaseOrderItemId,
    int Quantity,
    decimal UnitCost,
    string? Notes);

public record CreatePurchaseReturnRequest(
    int? PurchaseOrderId,
    int? SupplierId,
    int? WarehouseId,
    DateTime? Date,
    string? Notes,
    string? Reason,
    IList<CreatePurchaseReturnItemRequest> Items);

public record GetAllPurchaseReturnsQuery(int? SupplierId = null, string? Status = null)
    : IRequest<ApiResponse<List<PurchaseReturnDto>>>;

public class GetAllPurchaseReturnsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllPurchaseReturnsQuery, ApiResponse<List<PurchaseReturnDto>>>
{
    public async Task<ApiResponse<List<PurchaseReturnDto>>> Handle(GetAllPurchaseReturnsQuery request, CancellationToken ct)
    {
        var query = db.PurchaseReturns.AsNoTracking()
            .Include(r => r.Supplier)
            .Include(r => r.Warehouse)
            .AsQueryable();

        if (request.SupplierId.HasValue)
            query = query.Where(r => r.PurchaseReturnsSupplierId == request.SupplierId.Value);
        if (!string.IsNullOrEmpty(request.Status))
            query = query.Where(r => r.PurchaseReturnsStatus == request.Status);

        var list = await query.OrderByDescending(r => r.PurchaseReturnsDate)
            .Select(r => new PurchaseReturnDto(
                r.PurchaseReturnsId, r.PurchaseReturnsPurchaseOrderId,
                r.PurchaseReturnsSupplierId,
                r.Supplier != null ? r.Supplier.SupplierName : null,
                r.PurchaseReturnsWarehouseId,
                r.Warehouse != null ? r.Warehouse.WarehouseName : null,
                r.PurchaseReturnsDate, r.PurchaseReturnsTotalAmount,
                r.PurchaseReturnsStatus, r.PurchaseReturnsNotes,
                r.PurchaseReturnsReason, r.PurchaseReturnsCreatedAt))
            .ToListAsync(ct);

        return ApiResponse<List<PurchaseReturnDto>>.Success(list);
    }
}

public record CreatePurchaseReturnCommand(CreatePurchaseReturnRequest Req) : IRequest<ApiResponse<PurchaseReturnDto>>;

public class CreatePurchaseReturnCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreatePurchaseReturnCommand, ApiResponse<PurchaseReturnDto>>
{
    public async Task<ApiResponse<PurchaseReturnDto>> Handle(CreatePurchaseReturnCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var totalAmount = r.Items.Sum(i => i.Quantity * i.UnitCost);

        var ret = new PurchaseReturn
        {
            PurchaseReturnsPurchaseOrderId = r.PurchaseOrderId,
            PurchaseReturnsSupplierId = r.SupplierId,
            PurchaseReturnsWarehouseId = r.WarehouseId,
            PurchaseReturnsDate = r.Date ?? DateTime.UtcNow,
            PurchaseReturnsTotalAmount = totalAmount,
            PurchaseReturnsStatus = "Pending",
            PurchaseReturnsNotes = r.Notes,
            PurchaseReturnsReason = r.Reason,
            PurchaseReturnsCreatedAt = DateTime.UtcNow
        };
        db.PurchaseReturns.Add(ret);
        await db.SaveChangesAsync(ct); // get ret.PurchaseReturnsId

        foreach (var item in r.Items)
        {
            db.PurchaseReturnItems.Add(new PurchaseReturnItem
            {
                PurchaseReturnItemsReturnId = ret.PurchaseReturnsId,
                PurchaseReturnItemsPurchaseOrderItemId = item.PurchaseOrderItemId,
                PurchaseReturnItemsQuantity = item.Quantity,
                PurchaseReturnItemsUnitCost = item.UnitCost,
                PurchaseReturnItemsTotalCost = item.Quantity * item.UnitCost,
                PurchaseReturnItemsNotes = item.Notes
            });

            // Deduct from inventory
            if (item.PurchaseOrderItemId.HasValue && r.WarehouseId.HasValue)
            {
                var poItem = await db.PurchaseOrderItems.FindAsync([item.PurchaseOrderItemId.Value], ct);
                if (poItem?.PurchaseOrderItemsVariantId is not null)
                {
                    var inv = await db.Inventories.FirstOrDefaultAsync(i =>
                        i.VariantId == poItem.PurchaseOrderItemsVariantId.Value &&
                        i.WarehouseId == r.WarehouseId.Value &&
                        i.PackagingTypeId == poItem.PurchaseOrderItemsPackagingTypeId, ct);
                    if (inv is not null)
                        inv.InventoryQuantity -= item.Quantity;

                    db.InventoryMovements.Add(new InventoryMovement
                    {
                        ProductVariantId = poItem.PurchaseOrderItemsVariantId,
                        WarehouseId = r.WarehouseId,
                        Quantity = -item.Quantity,
                        MovementType = "purchase_return",
                        ReferenceId = ret.PurchaseReturnsId,
                        MovementDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        // Reduce supplier balance (goods going back, debt decreases)
        if (r.SupplierId.HasValue && totalAmount > 0)
        {
            var supplier = await db.Suppliers.FindAsync([r.SupplierId.Value], ct);
            if (supplier is not null)
                supplier.SupplierBalance -= totalAmount;
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<PurchaseReturnDto>.Success(new PurchaseReturnDto(
            ret.PurchaseReturnsId, ret.PurchaseReturnsPurchaseOrderId,
            ret.PurchaseReturnsSupplierId, null,
            ret.PurchaseReturnsWarehouseId, null,
            ret.PurchaseReturnsDate, ret.PurchaseReturnsTotalAmount,
            ret.PurchaseReturnsStatus, ret.PurchaseReturnsNotes,
            ret.PurchaseReturnsReason, ret.PurchaseReturnsCreatedAt));
    }
}

public record UpdatePurchaseReturnStatusCommand(int Id, string Status) : IRequest<ApiResponse<object>>;

public class UpdatePurchaseReturnStatusCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdatePurchaseReturnStatusCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UpdatePurchaseReturnStatusCommand request, CancellationToken ct)
    {
        var ret = await db.PurchaseReturns.FindAsync([request.Id], ct);
        if (ret is null) return ApiResponse<object>.Failure("Return not found.");
        ret.PurchaseReturnsStatus = request.Status;
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Status updated.");
    }
}

public record DeletePurchaseReturnCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeletePurchaseReturnCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeletePurchaseReturnCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeletePurchaseReturnCommand request, CancellationToken ct)
    {
        var ret = await db.PurchaseReturns.FindAsync([request.Id], ct);
        if (ret is null) return ApiResponse<object>.Failure("Return not found.");
        db.PurchaseReturns.Remove(ret);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Return deleted.");
    }
}
