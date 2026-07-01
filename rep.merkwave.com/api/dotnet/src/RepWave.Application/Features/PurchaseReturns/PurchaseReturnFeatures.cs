using MediatR;
using RepWave.Application.Common;
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

public record PurchaseReturnItemDetailDto(
    int PurchaseReturnItemsId,
    int? PurchaseReturnItemsPurchaseOrderItemId,
    int PurchaseReturnItemsQuantity,
    decimal PurchaseReturnItemsUnitCost,
    decimal PurchaseReturnItemsTotalCost,
    string? PurchaseReturnItemsNotes,
    int? PurchaseOrderItemsVariantId,
    int? PurchaseOrderItemsPackagingTypeId,
    int? ProductsId,
    string? ProductsName,
    string? VariantName,
    string? PackagingTypesName);

public record PurchaseReturnDetailDto(
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
    DateTime? PurchaseReturnsCreatedAt,
    List<PurchaseReturnItemDetailDto> Items);

public record GetPurchaseReturnByIdQuery(int Id) : IRequest<ApiResponse<PurchaseReturnDetailDto>>;

public class GetPurchaseReturnByIdHandler(IApplicationDbContext db)
    : IRequestHandler<GetPurchaseReturnByIdQuery, ApiResponse<PurchaseReturnDetailDto>>
{
    public async Task<ApiResponse<PurchaseReturnDetailDto>> Handle(
        GetPurchaseReturnByIdQuery request, CancellationToken ct)
    {
        var ret = await db.PurchaseReturns.AsNoTracking()
            .Include(r => r.Supplier)
            .Include(r => r.Warehouse)
            .Include(r => r.Items)
                .ThenInclude(i => i.PurchaseOrderItem!)
                    .ThenInclude(poi => poi.Variant!)
                        .ThenInclude(v => v.Product)
            .Include(r => r.Items)
                .ThenInclude(i => i.PurchaseOrderItem!)
                    .ThenInclude(poi => poi.PackagingType)
            .FirstOrDefaultAsync(r => r.PurchaseReturnsId == request.Id, ct);

        if (ret is null)
            return ApiResponse<PurchaseReturnDetailDto>.Failure("Purchase return not found.");

        var items = ret.Items
            .OrderBy(i => i.PurchaseReturnItemsId)
            .Select(i =>
            {
                var poi = i.PurchaseOrderItem;
                return new PurchaseReturnItemDetailDto(
                    i.PurchaseReturnItemsId,
                    i.PurchaseReturnItemsPurchaseOrderItemId,
                    i.PurchaseReturnItemsQuantity,
                    i.PurchaseReturnItemsUnitCost,
                    i.PurchaseReturnItemsTotalCost,
                    i.PurchaseReturnItemsNotes,
                    poi?.PurchaseOrderItemsVariantId,
                    poi?.PurchaseOrderItemsPackagingTypeId,
                    poi?.Variant?.Product?.ProductsId,
                    poi?.Variant?.Product?.ProductsName,
                    poi?.Variant?.VariantName,
                    poi?.PackagingType?.PackagingTypesName);
            })
            .ToList();

        return ApiResponse<PurchaseReturnDetailDto>.Success(new PurchaseReturnDetailDto(
            ret.PurchaseReturnsId,
            ret.PurchaseReturnsPurchaseOrderId,
            ret.PurchaseReturnsSupplierId,
            ret.Supplier?.SupplierName,
            ret.PurchaseReturnsWarehouseId,
            ret.Warehouse?.WarehouseName,
            ret.PurchaseReturnsDate,
            ret.PurchaseReturnsTotalAmount,
            ret.PurchaseReturnsStatus,
            ret.PurchaseReturnsNotes,
            ret.PurchaseReturnsReason,
            ret.PurchaseReturnsCreatedAt,
            items));
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
            PurchaseReturnsDate = r.Date.ToUtc() ?? DateTime.UtcNow,
            PurchaseReturnsTotalAmount = totalAmount,
            PurchaseReturnsStatus = "Processed",
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

            if (item.PurchaseOrderItemId.HasValue)
            {
                var poItem = await db.PurchaseOrderItems.FindAsync([item.PurchaseOrderItemId.Value], ct);
                if (poItem is not null)
                {
                    poItem.PurchaseOrderItemsQuantityReturned += item.Quantity;

                    // Deduct inventory only for quantities that were actually received
                    if (r.WarehouseId.HasValue && poItem.PurchaseOrderItemsVariantId is not null)
                    {
                        var warehouseReturnQty = Math.Min(
                            item.Quantity,
                            Math.Max(0, poItem.PurchaseOrderItemsQuantityReceived));

                        if (warehouseReturnQty > 0)
                        {
                            var inv = await db.Inventories.FirstOrDefaultAsync(i =>
                                i.VariantId == poItem.PurchaseOrderItemsVariantId.Value &&
                                i.WarehouseId == r.WarehouseId.Value &&
                                i.PackagingTypeId == poItem.PurchaseOrderItemsPackagingTypeId, ct);
                            if (inv is not null)
                                inv.InventoryQuantity = Math.Max(0, inv.InventoryQuantity - warehouseReturnQty);

                            db.InventoryMovements.Add(new InventoryMovement
                            {
                                ProductVariantId = poItem.PurchaseOrderItemsVariantId,
                                WarehouseId = r.WarehouseId,
                                Quantity = -warehouseReturnQty,
                                MovementType = "purchase_return",
                                ReferenceId = ret.PurchaseReturnsId,
                                MovementDate = DateTime.UtcNow,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
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

public record UpdatePurchaseReturnItemRequest(
    int? PurchaseReturnItemId,
    int? PurchaseOrderItemId,
    int Quantity,
    decimal UnitCost,
    string? Notes);

public record UpdatePurchaseReturnRequest(
    int? SupplierId,
    int? PurchaseOrderId,
    DateTime? Date,
    string? Reason,
    string? Notes,
    IList<UpdatePurchaseReturnItemRequest> Items);

public record UpdatePurchaseReturnCommand(int Id, UpdatePurchaseReturnRequest Request)
    : IRequest<ApiResponse<PurchaseReturnDto>>;

public class UpdatePurchaseReturnHandler(IApplicationDbContext db)
    : IRequestHandler<UpdatePurchaseReturnCommand, ApiResponse<PurchaseReturnDto>>
{
    private static bool AffectsBalance(string status) =>
        status is "Approved" or "Processed" or "Pending";

    private static async Task ReverseItemEffects(
        IApplicationDbContext db,
        PurchaseReturnItem item,
        int? warehouseId,
        CancellationToken ct)
    {
        if (!item.PurchaseReturnItemsPurchaseOrderItemId.HasValue) return;

        var poItem = await db.PurchaseOrderItems.FindAsync(
            [item.PurchaseReturnItemsPurchaseOrderItemId.Value], ct);
        if (poItem is null) return;

        poItem.PurchaseOrderItemsQuantityReturned = Math.Max(
            0,
            poItem.PurchaseOrderItemsQuantityReturned - item.PurchaseReturnItemsQuantity);

        if (!warehouseId.HasValue || poItem.PurchaseOrderItemsVariantId is null) return;

        var restoreQty = Math.Min(
            item.PurchaseReturnItemsQuantity,
            Math.Max(0, poItem.PurchaseOrderItemsQuantityReceived));
        if (restoreQty <= 0) return;

        var inv = await db.Inventories.FirstOrDefaultAsync(i =>
            i.VariantId == poItem.PurchaseOrderItemsVariantId.Value &&
            i.WarehouseId == warehouseId.Value &&
            i.PackagingTypeId == poItem.PurchaseOrderItemsPackagingTypeId, ct);
        if (inv is not null)
            inv.InventoryQuantity += restoreQty;
    }

    private static async Task ApplyItemEffects(
        IApplicationDbContext db,
        int returnId,
        int? warehouseId,
        int? purchaseOrderItemId,
        int quantity,
        CancellationToken ct)
    {
        if (!purchaseOrderItemId.HasValue) return;

        var poItem = await db.PurchaseOrderItems.FindAsync([purchaseOrderItemId.Value], ct);
        if (poItem is null) return;

        poItem.PurchaseOrderItemsQuantityReturned += quantity;

        if (!warehouseId.HasValue || poItem.PurchaseOrderItemsVariantId is null) return;

        var deductQty = Math.Min(quantity, Math.Max(0, poItem.PurchaseOrderItemsQuantityReceived));
        if (deductQty <= 0) return;

        var inv = await db.Inventories.FirstOrDefaultAsync(i =>
            i.VariantId == poItem.PurchaseOrderItemsVariantId.Value &&
            i.WarehouseId == warehouseId.Value &&
            i.PackagingTypeId == poItem.PurchaseOrderItemsPackagingTypeId, ct);
        if (inv is not null)
            inv.InventoryQuantity = Math.Max(0, inv.InventoryQuantity - deductQty);

        db.InventoryMovements.Add(new InventoryMovement
        {
            ProductVariantId = poItem.PurchaseOrderItemsVariantId,
            WarehouseId = warehouseId,
            Quantity = -deductQty,
            MovementType = "purchase_return",
            ReferenceId = returnId,
            MovementDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        });
    }

    public async Task<ApiResponse<PurchaseReturnDto>> Handle(
        UpdatePurchaseReturnCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;
        if (r.Items is null || r.Items.Count == 0)
            return ApiResponse<PurchaseReturnDto>.Failure("At least one return item is required.");

        var ret = await db.PurchaseReturns
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.PurchaseReturnsId == cmd.Id, ct);
        if (ret is null)
            return ApiResponse<PurchaseReturnDto>.Failure("Purchase return not found.");

        var oldTotal = ret.PurchaseReturnsTotalAmount;
        var oldStatus = ret.PurchaseReturnsStatus;
        var warehouseId = ret.PurchaseReturnsWarehouseId;

        foreach (var oldItem in ret.Items.ToList())
            await ReverseItemEffects(db, oldItem, warehouseId, ct);

        db.PurchaseReturnItems.RemoveRange(ret.Items);
        await db.SaveChangesAsync(ct);

        if (r.SupplierId.HasValue) ret.PurchaseReturnsSupplierId = r.SupplierId;
        if (r.PurchaseOrderId.HasValue) ret.PurchaseReturnsPurchaseOrderId = r.PurchaseOrderId;
        if (r.Date.HasValue) ret.PurchaseReturnsDate = r.Date.ToUtc();
        ret.PurchaseReturnsReason = r.Reason;
        ret.PurchaseReturnsNotes = r.Notes;

        var newTotal = 0m;
        foreach (var item in r.Items)
        {
            var lineTotal = item.Quantity * item.UnitCost;
            newTotal += lineTotal;
            db.PurchaseReturnItems.Add(new PurchaseReturnItem
            {
                PurchaseReturnItemsReturnId = ret.PurchaseReturnsId,
                PurchaseReturnItemsPurchaseOrderItemId = item.PurchaseOrderItemId,
                PurchaseReturnItemsQuantity = item.Quantity,
                PurchaseReturnItemsUnitCost = item.UnitCost,
                PurchaseReturnItemsTotalCost = lineTotal,
                PurchaseReturnItemsNotes = item.Notes,
            });

            await ApplyItemEffects(
                db, ret.PurchaseReturnsId, warehouseId, item.PurchaseOrderItemId, item.Quantity, ct);
        }

        ret.PurchaseReturnsTotalAmount = newTotal;
        ret.PurchaseReturnsStatus = "Processed";

        if (ret.PurchaseReturnsSupplierId.HasValue)
        {
            var supplier = await db.Suppliers.FindAsync([ret.PurchaseReturnsSupplierId.Value], ct);
            if (supplier is not null)
            {
                if (AffectsBalance(oldStatus)) supplier.SupplierBalance += oldTotal;
                if (AffectsBalance(ret.PurchaseReturnsStatus)) supplier.SupplierBalance -= newTotal;
            }
        }

        await db.SaveChangesAsync(ct);

        return ApiResponse<PurchaseReturnDto>.Success(new PurchaseReturnDto(
            ret.PurchaseReturnsId,
            ret.PurchaseReturnsPurchaseOrderId,
            ret.PurchaseReturnsSupplierId,
            null,
            ret.PurchaseReturnsWarehouseId,
            null,
            ret.PurchaseReturnsDate,
            ret.PurchaseReturnsTotalAmount,
            ret.PurchaseReturnsStatus,
            ret.PurchaseReturnsNotes,
            ret.PurchaseReturnsReason,
            ret.PurchaseReturnsCreatedAt));
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
