using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.SalesDeliveries;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record SalesDeliveryDto(
    int SalesDeliveriesId,
    int? SalesDeliveriesSalesOrderId,
    string? SalesOrderNotes,
    string SalesDeliveriesDeliveryStatus,
    int? SalesDeliveriesDeliveredBy,
    string? DeliveredByName,
    DateTime? SalesDeliveriesDate,
    string? SalesDeliveriesNotes,
    List<SalesDeliveryItemDto> Items);

public record SalesDeliveryItemDto(
    int SalesDeliveryItemsId,
    int? SalesDeliveryItemsSalesDeliveryId,
    int? SalesDeliveryItemsSalesOrderItemId,
    int QuantityDelivered);

public record CreateSalesDeliveryRequest(
    int SalesOrderId,
    string DeliveryStatus,
    int? DeliveredBy,
    DateTime? DeliveryDate,
    string? Notes,
    List<CreateSalesDeliveryItemRequest> Items);

public record CreateSalesDeliveryItemRequest(
    int? SalesOrderItemId,
    int QuantityDelivered);

public record UpdateDeliveryStatusRequest(string Status);

// ── Queries ───────────────────────────────────────────────────────────────────

public record GetAllSalesDeliveriesQuery(int? SalesOrderId = null, string? Status = null)
    : IRequest<ApiResponse<List<SalesDeliveryDto>>>;

public class GetAllSalesDeliveriesQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllSalesDeliveriesQuery, ApiResponse<List<SalesDeliveryDto>>>
{
    public async Task<ApiResponse<List<SalesDeliveryDto>>> Handle(GetAllSalesDeliveriesQuery request, CancellationToken ct)
    {
        var query = db.SalesDeliveries.AsNoTracking()
            .Include(d => d.SalesOrder)
            .Include(d => d.DeliveredByUser)
            .Include(d => d.Items)
            .AsQueryable();

        if (request.SalesOrderId.HasValue)
            query = query.Where(d => d.SalesDeliveriesSalesOrderId == request.SalesOrderId.Value);
        if (!string.IsNullOrEmpty(request.Status))
            query = query.Where(d => d.SalesDeliveriesDeliveryStatus == request.Status);

        var list = await query.OrderByDescending(d => d.SalesDeliveriesDate).ToListAsync(ct);

        var result = list.Select(d => new SalesDeliveryDto(
            d.SalesDeliveriesId, d.SalesDeliveriesSalesOrderId,
            d.SalesOrder?.SalesOrdersNotes, d.SalesDeliveriesDeliveryStatus,
            d.SalesDeliveriesDeliveredBy, d.DeliveredByUser?.UsersName,
            d.SalesDeliveriesDate, d.SalesDeliveriesNotes,
            d.Items.Select(i => new SalesDeliveryItemDto(
                i.SalesDeliveryItemsId, i.SalesDeliveryItemsSalesDeliveryId,
                i.SalesDeliveryItemsSalesOrderItemId,
                i.SalesDeliveryItemsQuantityDelivered)).ToList()
        )).ToList();

        return ApiResponse<List<SalesDeliveryDto>>.Success(result);
    }
}

public record GetSalesDeliveryByIdQuery(int Id) : IRequest<ApiResponse<SalesDeliveryDto>>;

public class GetSalesDeliveryByIdQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetSalesDeliveryByIdQuery, ApiResponse<SalesDeliveryDto>>
{
    public async Task<ApiResponse<SalesDeliveryDto>> Handle(GetSalesDeliveryByIdQuery request, CancellationToken ct)
    {
        var d = await db.SalesDeliveries.AsNoTracking()
            .Include(x => x.SalesOrder)
            .Include(x => x.DeliveredByUser)
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.SalesDeliveriesId == request.Id, ct);

        if (d is null) return ApiResponse<SalesDeliveryDto>.Failure("Delivery not found.");

        return ApiResponse<SalesDeliveryDto>.Success(new SalesDeliveryDto(
            d.SalesDeliveriesId, d.SalesDeliveriesSalesOrderId,
            d.SalesOrder?.SalesOrdersNotes, d.SalesDeliveriesDeliveryStatus,
            d.SalesDeliveriesDeliveredBy, d.DeliveredByUser?.UsersName,
            d.SalesDeliveriesDate, d.SalesDeliveriesNotes,
            d.Items.Select(i => new SalesDeliveryItemDto(
                i.SalesDeliveryItemsId, i.SalesDeliveryItemsSalesDeliveryId,
                i.SalesDeliveryItemsSalesOrderItemId,
                i.SalesDeliveryItemsQuantityDelivered)).ToList()));
    }
}

// ── Commands ──────────────────────────────────────────────────────────────────

public record CreateSalesDeliveryCommand(CreateSalesDeliveryRequest Req) : IRequest<ApiResponse<SalesDeliveryDto>>;

public class CreateSalesDeliveryCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateSalesDeliveryCommand, ApiResponse<SalesDeliveryDto>>
{
    public async Task<ApiResponse<SalesDeliveryDto>> Handle(CreateSalesDeliveryCommand request, CancellationToken ct)
    {
        var r = request.Req;

        // Load sales order with items to get warehouse and variant info
        var salesOrder = await db.SalesOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.SalesOrdersId == r.SalesOrderId, ct);
        if (salesOrder is null) return ApiResponse<SalesDeliveryDto>.Failure("Sales order not found.");

        var delivery = new SalesDelivery
        {
            SalesDeliveriesSalesOrderId = r.SalesOrderId,
            SalesDeliveriesDeliveryStatus = r.DeliveryStatus,
            SalesDeliveriesDeliveredBy = r.DeliveredBy,
            SalesDeliveriesDate = r.DeliveryDate ?? DateTime.UtcNow,
            SalesDeliveriesNotes = r.Notes
        };
        db.SalesDeliveries.Add(delivery);
        await db.SaveChangesAsync(ct); // get delivery ID

        foreach (var item in r.Items)
        {
            // Get the corresponding SalesOrderItem for variant + packaging info
            var soItem = item.SalesOrderItemId.HasValue
                ? salesOrder.Items.FirstOrDefault(i => i.SalesOrderItemsId == item.SalesOrderItemId.Value)
                : null;

            db.SalesDeliveryItems.Add(new SalesDeliveryItem
            {
                SalesDeliveryItemsSalesDeliveryId = delivery.SalesDeliveriesId,
                SalesDeliveryItemsSalesOrderItemId = item.SalesOrderItemId,
                SalesDeliveryItemsQuantityDelivered = item.QuantityDelivered
            });

            // Deduct from inventory using oldest batch (FIFO)
            if (soItem?.SalesOrderItemsVariantId is not null && salesOrder.SalesOrdersWarehouseId.HasValue)
            {
                var inv = await db.Inventories
                    .Where(i =>
                        i.VariantId == soItem.SalesOrderItemsVariantId.Value &&
                        i.WarehouseId == salesOrder.SalesOrdersWarehouseId.Value &&
                        i.PackagingTypeId == soItem.SalesOrderItemsPackagingTypeId &&
                        i.InventoryQuantity > 0)
                    .OrderBy(i => i.InventoryProductionDate)
                    .FirstOrDefaultAsync(ct);

                if (inv is not null)
                {
                    inv.InventoryQuantity -= item.QuantityDelivered;

                    db.InventoryMovements.Add(new InventoryMovement
                    {
                        ProductVariantId = soItem.SalesOrderItemsVariantId,
                        WarehouseId = salesOrder.SalesOrdersWarehouseId,
                        Quantity = -item.QuantityDelivered,
                        MovementType = "sales_delivery",
                        ReferenceId = delivery.SalesDeliveriesId,
                        MovementDate = DateTime.UtcNow,
                        CreatedBy = r.DeliveredBy,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }
        await db.SaveChangesAsync(ct);

        // Update sales order delivery status
        var allDeliveryItems = await db.SalesDeliveryItems
            .Where(di => db.SalesDeliveries
                .Where(d => d.SalesDeliveriesSalesOrderId == r.SalesOrderId)
                .Select(d => d.SalesDeliveriesId)
                .Contains(di.SalesDeliveryItemsSalesDeliveryId!.Value))
            .GroupBy(di => di.SalesDeliveryItemsSalesOrderItemId)
            .Select(g => new { SalesOrderItemId = g.Key, TotalDelivered = g.Sum(x => x.SalesDeliveryItemsQuantityDelivered) })
            .ToListAsync(ct);

        var allFullyDelivered = salesOrder.Items.All(oi =>
            allDeliveryItems.Any(d => d.SalesOrderItemId == oi.SalesOrderItemsId &&
                                     d.TotalDelivered >= oi.SalesOrderItemsQuantity));

        salesOrder.SalesOrdersDeliveryStatus = allFullyDelivered ? "Delivered" : "Partially Delivered";
        await db.SaveChangesAsync(ct);

        return ApiResponse<SalesDeliveryDto>.Success(new SalesDeliveryDto(
            delivery.SalesDeliveriesId, delivery.SalesDeliveriesSalesOrderId, null,
            delivery.SalesDeliveriesDeliveryStatus, delivery.SalesDeliveriesDeliveredBy, null,
            delivery.SalesDeliveriesDate, delivery.SalesDeliveriesNotes, []));
    }
}

public record UpdateDeliveryStatusCommand(int Id, string Status) : IRequest<ApiResponse<object>>;

public class UpdateDeliveryStatusCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateDeliveryStatusCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UpdateDeliveryStatusCommand request, CancellationToken ct)
    {
        var d = await db.SalesDeliveries.FindAsync([request.Id], ct);
        if (d is null) return ApiResponse<object>.Failure("Delivery not found.");
        d.SalesDeliveriesDeliveryStatus = request.Status;
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Status updated.");
    }
}

public record DeleteSalesDeliveryCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteSalesDeliveryCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteSalesDeliveryCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteSalesDeliveryCommand request, CancellationToken ct)
    {
        var d = await db.SalesDeliveries.FindAsync([request.Id], ct);
        if (d is null) return ApiResponse<object>.Failure("Delivery not found.");
        db.SalesDeliveries.Remove(d);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Delivery deleted.");
    }
}
