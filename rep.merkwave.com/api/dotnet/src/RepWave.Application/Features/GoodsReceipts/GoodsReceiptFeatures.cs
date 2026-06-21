using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.GoodsReceipts;

public record GoodsReceiptDto(
    int GoodsReceiptId,
    int? GoodsReceiptWarehouseId,
    string? WarehouseName,
    int? GoodsReceiptPurchaseOrderId,
    DateTime? GoodsReceiptDate,
    string? GoodsReceiptNotes,
    int? GoodsReceiptReceivedByUserId,
    string? ReceivedByName,
    List<GoodsReceiptItemDto> Items);

public record GoodsReceiptItemDto(
    int GoodsReceiptItemsId,
    int? GoodsReceiptItemsVariantId,
    int? GoodsReceiptItemsPackagingTypeId,
    int QuantityReceived,
    DateOnly? GoodsReceiptItemsProductionDate);

public record CreateGoodsReceiptRequest(
    int? WarehouseId,
    int? PurchaseOrderId,
    int? ReceivedByUserId,
    DateTime? Date,
    string? Notes,
    List<CreateGoodsReceiptItemRequest> Items);

public record CreateGoodsReceiptItemRequest(
    int? VariantId,
    int? PackagingTypeId,
    int QuantityReceived,
    DateOnly? ProductionDate);

public record GetAllGoodsReceiptsQuery(int? WarehouseId = null, int Page = 1, int PageSize = 20)
    : IRequest<ApiResponse<PagedResult<GoodsReceiptDto>>>;

public class GetAllGoodsReceiptsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllGoodsReceiptsQuery, ApiResponse<PagedResult<GoodsReceiptDto>>>
{
    public async Task<ApiResponse<PagedResult<GoodsReceiptDto>>> Handle(GetAllGoodsReceiptsQuery request, CancellationToken ct)
    {
        var query = db.GoodsReceipts.AsNoTracking()
            .Include(g => g.Warehouse)
            .Include(g => g.ReceivedByUser)
            .Include(g => g.Items)
            .AsQueryable();

        if (request.WarehouseId.HasValue)
            query = query.Where(g => g.GoodsReceiptWarehouseId == request.WarehouseId.Value);

        var total = await query.CountAsync(ct);
        var list = await query
            .OrderByDescending(g => g.GoodsReceiptDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);

        var result = list.Select(g => new GoodsReceiptDto(
            g.GoodsReceiptId, g.GoodsReceiptWarehouseId, g.Warehouse?.WarehouseName,
            g.GoodsReceiptPurchaseOrderId, g.GoodsReceiptDate, g.GoodsReceiptNotes,
            g.GoodsReceiptReceivedByUserId, g.ReceivedByUser?.UsersName,
            g.Items.Select(i => new GoodsReceiptItemDto(
                i.GoodsReceiptItemsId, i.GoodsReceiptItemsVariantId,
                i.GoodsReceiptItemsPackagingTypeId, i.QuantityReceived,
                i.GoodsReceiptItemsProductionDate)).ToList()
        )).ToList();

        return ApiResponse<PagedResult<GoodsReceiptDto>>.Success(
            new PagedResult<GoodsReceiptDto>(result, total, request.Page, request.PageSize));
    }
}

public record GetGoodsReceiptByIdQuery(int Id) : IRequest<ApiResponse<GoodsReceiptDto>>;

public class GetGoodsReceiptByIdQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetGoodsReceiptByIdQuery, ApiResponse<GoodsReceiptDto>>
{
    public async Task<ApiResponse<GoodsReceiptDto>> Handle(GetGoodsReceiptByIdQuery request, CancellationToken ct)
    {
        var g = await db.GoodsReceipts.AsNoTracking()
            .Include(x => x.Warehouse)
            .Include(x => x.ReceivedByUser)
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.GoodsReceiptId == request.Id, ct);

        if (g is null) return ApiResponse<GoodsReceiptDto>.Failure("Goods receipt not found.");

        return ApiResponse<GoodsReceiptDto>.Success(new GoodsReceiptDto(
            g.GoodsReceiptId, g.GoodsReceiptWarehouseId, g.Warehouse?.WarehouseName,
            g.GoodsReceiptPurchaseOrderId, g.GoodsReceiptDate, g.GoodsReceiptNotes,
            g.GoodsReceiptReceivedByUserId, g.ReceivedByUser?.UsersName,
            g.Items.Select(i => new GoodsReceiptItemDto(
                i.GoodsReceiptItemsId, i.GoodsReceiptItemsVariantId,
                i.GoodsReceiptItemsPackagingTypeId, i.QuantityReceived,
                i.GoodsReceiptItemsProductionDate)).ToList()));
    }
}

public record CreateGoodsReceiptCommand(CreateGoodsReceiptRequest Req) : IRequest<ApiResponse<GoodsReceiptDto>>;

public class CreateGoodsReceiptCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateGoodsReceiptCommand, ApiResponse<GoodsReceiptDto>>
{
    public async Task<ApiResponse<GoodsReceiptDto>> Handle(CreateGoodsReceiptCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var receipt = new GoodsReceipt
        {
            GoodsReceiptWarehouseId = r.WarehouseId,
            GoodsReceiptPurchaseOrderId = r.PurchaseOrderId,
            GoodsReceiptReceivedByUserId = r.ReceivedByUserId,
            GoodsReceiptDate = r.Date ?? DateTime.UtcNow,
            GoodsReceiptNotes = r.Notes
        };
        db.GoodsReceipts.Add(receipt);
        await db.SaveChangesAsync(ct); // get receipt ID

        foreach (var item in r.Items)
        {
            db.GoodsReceiptItems.Add(new GoodsReceiptItem
            {
                GoodsReceiptItemsGoodsReceiptId = receipt.GoodsReceiptId,
                GoodsReceiptItemsVariantId = item.VariantId,
                GoodsReceiptItemsPackagingTypeId = item.PackagingTypeId,
                QuantityReceived = item.QuantityReceived,
                GoodsReceiptItemsProductionDate = item.ProductionDate
            });

            // Update PO item received qty
            if (r.PurchaseOrderId.HasValue && item.VariantId.HasValue)
            {
                var poItem = await db.PurchaseOrderItems.FirstOrDefaultAsync(p =>
                    p.PurchaseOrderItemsPurchaseOrderId == r.PurchaseOrderId.Value &&
                    p.PurchaseOrderItemsVariantId == item.VariantId &&
                    p.PurchaseOrderItemsPackagingTypeId == item.PackagingTypeId, ct);
                if (poItem is not null)
                    poItem.PurchaseOrderItemsQuantityReceived += item.QuantityReceived;
            }

            // Upsert inventory
            if (item.VariantId.HasValue && r.WarehouseId.HasValue)
            {
                var inv = await db.Inventories.FirstOrDefaultAsync(i =>
                    i.VariantId == item.VariantId.Value &&
                    i.WarehouseId == r.WarehouseId.Value &&
                    i.PackagingTypeId == item.PackagingTypeId &&
                    i.InventoryProductionDate == item.ProductionDate, ct);
                if (inv is not null)
                {
                    inv.InventoryQuantity += item.QuantityReceived;
                }
                else
                {
                    db.Inventories.Add(new Inventory
                    {
                        VariantId = item.VariantId.Value,
                        WarehouseId = r.WarehouseId.Value,
                        PackagingTypeId = item.PackagingTypeId,
                        InventoryProductionDate = item.ProductionDate,
                        InventoryQuantity = item.QuantityReceived,
                        InventoryStatus = "available"
                    });
                }

                // Log inventory movement
                db.InventoryMovements.Add(new InventoryMovement
                {
                    ProductVariantId = item.VariantId,
                    WarehouseId = r.WarehouseId,
                    Quantity = item.QuantityReceived,
                    MovementType = "goods_receipt",
                    ReferenceId = receipt.GoodsReceiptId,
                    MovementDate = DateTime.UtcNow,
                    CreatedBy = r.ReceivedByUserId,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await db.SaveChangesAsync(ct);

        // Update PO status based on received quantities
        if (r.PurchaseOrderId.HasValue)
        {
            var poItems = await db.PurchaseOrderItems
                .Where(p => p.PurchaseOrderItemsPurchaseOrderId == r.PurchaseOrderId.Value)
                .ToListAsync(ct);
            if (poItems.Count > 0)
            {
                var po = await db.PurchaseOrders.FindAsync([r.PurchaseOrderId.Value], ct);
                if (po is not null)
                {
                    var allReceived = poItems.All(p => p.PurchaseOrderItemsQuantityReceived >= p.PurchaseOrderItemsQuantityOrdered);
                    po.PurchaseOrdersStatus = allReceived ? "Received" : "Partially Received";
                    po.PurchaseOrdersUpdatedAt = DateTime.UtcNow;
                    if (allReceived)
                        po.PurchaseOrdersActualDeliveryDate = DateOnly.FromDateTime(DateTime.UtcNow);
                    await db.SaveChangesAsync(ct);
                }
            }
        }

        return ApiResponse<GoodsReceiptDto>.Success(new GoodsReceiptDto(
            receipt.GoodsReceiptId, receipt.GoodsReceiptWarehouseId, null,
            receipt.GoodsReceiptPurchaseOrderId, receipt.GoodsReceiptDate, receipt.GoodsReceiptNotes,
            receipt.GoodsReceiptReceivedByUserId, null, []));
    }
}

public record DeleteGoodsReceiptCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteGoodsReceiptCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteGoodsReceiptCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteGoodsReceiptCommand request, CancellationToken ct)
    {
        var g = await db.GoodsReceipts.FindAsync([request.Id], ct);
        if (g is null) return ApiResponse<object>.Failure("Goods receipt not found.");
        db.GoodsReceipts.Remove(g);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Goods receipt deleted.");
    }
}
