using MediatR;
using RepWave.Application.Common;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.SalesOrders;

public record SalesOrderDto(int SalesOrdersId, int? SalesOrdersClientId, int? SalesOrdersRepresentativeId,
    int? SalesOrdersWarehouseId, string SalesOrdersStatus, string SalesOrdersDeliveryStatus,
    DateTime? SalesOrdersOrderDate, decimal SalesOrdersSubtotal, decimal SalesOrdersDiscountAmount,
    decimal SalesOrdersTaxAmount, decimal SalesOrdersTotalAmount, string? SalesOrdersNotes,
    DateTime? SalesOrdersCreatedAt,
    string? ClientsCompanyName = null, string? RepresentativeName = null,
    string? WarehouseName = null, int ItemsCount = 0);

public record SalesOrderItemRequest(int? VariantId, int? PackagingTypeId, int Quantity,
    decimal UnitPrice, decimal DiscountAmount = 0, decimal TaxRate = 0, bool HasTax = false);

public record CreateSalesOrderRequest(int ClientId, int? WarehouseId, int? VisitId,
    DateTime? OrderDate, string? Notes, IList<SalesOrderItemRequest> Items);

public record GetAllSalesOrdersQuery(int Page = 1, int PageSize = 50, string? Status = null, int? ClientId = null, int? RepId = null)
    : IRequest<ApiResponse<PagedResult<SalesOrderDto>>>;
public class GetAllSalesOrdersHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllSalesOrdersQuery, ApiResponse<PagedResult<SalesOrderDto>>>
{
    public async Task<ApiResponse<PagedResult<SalesOrderDto>>> Handle(GetAllSalesOrdersQuery q, CancellationToken ct)
    {
        var query = db.SalesOrders.AsNoTracking();
        if (q.Status is not null) query = query.Where(o => o.SalesOrdersStatus == q.Status);
        if (q.ClientId.HasValue) query = query.Where(o => o.SalesOrdersClientId == q.ClientId);
        if (q.RepId.HasValue) query = query.Where(o => o.SalesOrdersRepresentativeId == q.RepId);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(o => o.SalesOrdersCreatedAt).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(o => new SalesOrderDto(o.SalesOrdersId, o.SalesOrdersClientId, o.SalesOrdersRepresentativeId, o.SalesOrdersWarehouseId, o.SalesOrdersStatus, o.SalesOrdersDeliveryStatus, o.SalesOrdersOrderDate, o.SalesOrdersSubtotal, o.SalesOrdersDiscountAmount, o.SalesOrdersTaxAmount, o.SalesOrdersTotalAmount, o.SalesOrdersNotes, o.SalesOrdersCreatedAt,
                o.Client != null ? o.Client.ClientsCompanyName : null,
                o.Representative != null ? o.Representative.UsersName : null,
                o.Warehouse != null ? o.Warehouse.WarehouseName : null,
                o.Items.Count))
            .ToListAsync(ct);
        return ApiResponse<PagedResult<SalesOrderDto>>.Success(new() { Data = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize });
    }
}

public record GetSalesOrderByIdQuery(int Id) : IRequest<ApiResponse<SalesOrderDetailDto>>;

public record SalesOrderItemDetailDto(
    int SalesOrderItemsId,
    int? SalesOrderItemsVariantId,
    int? SalesOrderItemsPackagingTypeId,
    int SalesOrderItemsQuantity,
    int DeliveredQuantity,
    int ReturnedQuantity,
    int QuantityReturnable,
    decimal QuantityPending,
    decimal SalesOrderItemsUnitPrice,
    decimal SalesOrderItemsSubtotal,
    decimal SalesOrderItemsDiscountAmount,
    decimal SalesOrderItemsTaxAmount,
    decimal SalesOrderItemsTaxRate,
    bool SalesOrderItemsHasTax,
    decimal SalesOrderItemsTotalPrice,
    string? SalesOrderItemsNotes,
    string? ProductsName,
    string? VariantName,
    string? VariantSku,
    string? PackagingTypesName,
    string? BaseUnitsName);

public record SalesOrderDetailDto(
    int SalesOrdersId,
    int? SalesOrdersClientId,
    int? SalesOrdersRepresentativeId,
    int? SalesOrdersWarehouseId,
    string SalesOrdersStatus,
    string SalesOrdersDeliveryStatus,
    DateTime? SalesOrdersOrderDate,
    decimal SalesOrdersSubtotal,
    decimal SalesOrdersDiscountAmount,
    decimal SalesOrdersTaxAmount,
    decimal SalesOrdersTotalAmount,
    string? SalesOrdersNotes,
    DateTime? SalesOrdersCreatedAt,
    string? ClientsCompanyName,
    string? ClientsContactName,
    string? ClientsAddress,
    string? RepresentativeName,
    string? WarehouseName,
    List<SalesOrderItemDetailDto> Items);

public class GetSalesOrderByIdHandler(IApplicationDbContext db)
    : IRequestHandler<GetSalesOrderByIdQuery, ApiResponse<SalesOrderDetailDto>>
{
    public async Task<ApiResponse<SalesOrderDetailDto>> Handle(GetSalesOrderByIdQuery q, CancellationToken ct)
    {
        var o = await db.SalesOrders.AsNoTracking()
            .Include(x => x.Client)
            .Include(x => x.Representative)
            .Include(x => x.Warehouse)
            .Include(x => x.Items)
                .ThenInclude(i => i.Variant!)
                    .ThenInclude(v => v.Product!)
                        .ThenInclude(p => p.UnitOfMeasure)
            .Include(x => x.Items)
                .ThenInclude(i => i.PackagingType)
            .FirstOrDefaultAsync(x => x.SalesOrdersId == q.Id, ct);
        if (o is null) return ApiResponse<SalesOrderDetailDto>.Failure("Sales order not found.");

        var deliveredByItem = await db.SalesDeliveryItems.AsNoTracking()
            .Where(di => di.SalesDeliveryItemsSalesOrderItemId != null
                && o.Items.Select(i => i.SalesOrderItemsId).Contains(di.SalesDeliveryItemsSalesOrderItemId!.Value))
            .GroupBy(di => di.SalesDeliveryItemsSalesOrderItemId!.Value)
            .Select(g => new { ItemId = g.Key, Total = g.Sum(x => x.SalesDeliveryItemsQuantityDelivered) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Total, ct);

        var returnedByItem = await db.SalesReturnItems.AsNoTracking()
            .Where(ri => ri.ReturnItemsSalesOrderItemId != null
                && o.Items.Select(i => i.SalesOrderItemsId).Contains(ri.ReturnItemsSalesOrderItemId!.Value))
            .GroupBy(ri => ri.ReturnItemsSalesOrderItemId!.Value)
            .Select(g => new { ItemId = g.Key, Total = g.Sum(x => x.ReturnItemsQuantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Total, ct);

        var items = o.Items
            .OrderBy(i => i.SalesOrderItemsId)
            .Select(i =>
            {
                deliveredByItem.TryGetValue(i.SalesOrderItemsId, out var delivered);
                returnedByItem.TryGetValue(i.SalesOrderItemsId, out var returned);
                var pending = Math.Max(0, i.SalesOrderItemsQuantity - delivered);
                var returnable = Math.Max(0, i.SalesOrderItemsQuantity - returned);
                return new SalesOrderItemDetailDto(
                    i.SalesOrderItemsId,
                    i.SalesOrderItemsVariantId,
                    i.SalesOrderItemsPackagingTypeId,
                    i.SalesOrderItemsQuantity,
                    delivered,
                    returned,
                    returnable,
                    pending,
                    i.SalesOrderItemsUnitPrice,
                    i.SalesOrderItemsSubtotal,
                    i.SalesOrderItemsDiscountAmount,
                    i.SalesOrderItemsTaxAmount,
                    i.SalesOrderItemsTaxRate,
                    i.SalesOrderItemsHasTax,
                    i.SalesOrderItemsTotalPrice,
                    i.SalesOrderItemsNotes,
                    i.Variant?.Product?.ProductsName,
                    i.Variant?.VariantName,
                    i.Variant?.VariantSku,
                    i.PackagingType?.PackagingTypesName,
                    i.Variant?.Product?.UnitOfMeasure?.BaseUnitsName);
            })
            .ToList();

        return ApiResponse<SalesOrderDetailDto>.Success(new SalesOrderDetailDto(
            o.SalesOrdersId,
            o.SalesOrdersClientId,
            o.SalesOrdersRepresentativeId,
            o.SalesOrdersWarehouseId,
            o.SalesOrdersStatus,
            o.SalesOrdersDeliveryStatus,
            o.SalesOrdersOrderDate,
            o.SalesOrdersSubtotal,
            o.SalesOrdersDiscountAmount,
            o.SalesOrdersTaxAmount,
            o.SalesOrdersTotalAmount,
            o.SalesOrdersNotes,
            o.SalesOrdersCreatedAt,
            o.Client?.ClientsCompanyName,
            o.Client?.ClientsContactName,
            o.Client?.ClientsAddress,
            o.Representative?.UsersName,
            o.Warehouse?.WarehouseName,
            items));
    }
}

public record CreateSalesOrderCommand(int RepresentativeId, CreateSalesOrderRequest Request)
    : IRequest<ApiResponse<SalesOrderDto>>;
public class CreateSalesOrderHandler(IApplicationDbContext db)
    : IRequestHandler<CreateSalesOrderCommand, ApiResponse<SalesOrderDto>>
{
    public async Task<ApiResponse<SalesOrderDto>> Handle(CreateSalesOrderCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;

        if (r.ClientId <= 0)
            return ApiResponse<SalesOrderDto>.Failure("Client is required.");

        var clientExists = await db.Clients.AsNoTracking()
            .AnyAsync(c => c.ClientsId == r.ClientId, ct);
        if (!clientExists)
            return ApiResponse<SalesOrderDto>.Failure("العميل المحدد غير موجود. يرجى تحديث الصفحة واختيار عميل من القائمة.");

        if (r.WarehouseId.HasValue)
        {
            var warehouseExists = await db.Warehouses.AsNoTracking()
                .AnyAsync(w => w.WarehouseId == r.WarehouseId.Value, ct);
            if (!warehouseExists)
                return ApiResponse<SalesOrderDto>.Failure("المستودع المحدد غير موجود. يرجى تحديث الصفحة واختيار مستودع من القائمة.");
        }

        if (cmd.RepresentativeId > 0)
        {
            var repExists = await db.Users.AsNoTracking()
                .AnyAsync(u => u.UsersId == cmd.RepresentativeId, ct);
            if (!repExists)
                return ApiResponse<SalesOrderDto>.Failure("المندوب غير موجود.");
        }

        if (r.Items is null || r.Items.Count == 0)
            return ApiResponse<SalesOrderDto>.Failure("Order must contain at least one item.");

        var order = new SalesOrder
        {
            SalesOrdersClientId = r.ClientId,
            SalesOrdersRepresentativeId = cmd.RepresentativeId,
            SalesOrdersWarehouseId = r.WarehouseId,
            SalesOrdersVisitId = r.VisitId,
            SalesOrdersOrderDate = r.OrderDate.ToUtc() ?? DateTime.UtcNow,
            SalesOrdersNotes = r.Notes,
            SalesOrdersCreatedAt = DateTime.UtcNow
        };

        foreach (var item in r.Items)
        {
            var subtotal = item.Quantity * item.UnitPrice;
            var taxAmount = item.HasTax ? subtotal * item.TaxRate / 100 : 0;
            var total = subtotal - item.DiscountAmount + taxAmount;
            order.Items.Add(new SalesOrderItem
            {
                SalesOrderItemsVariantId = item.VariantId,
                SalesOrderItemsPackagingTypeId = item.PackagingTypeId,
                SalesOrderItemsQuantity = item.Quantity,
                SalesOrderItemsUnitPrice = item.UnitPrice,
                SalesOrderItemsSubtotal = subtotal,
                SalesOrderItemsDiscountAmount = item.DiscountAmount,
                SalesOrderItemsTaxRate = item.TaxRate,
                SalesOrderItemsTaxAmount = taxAmount,
                SalesOrderItemsHasTax = item.HasTax,
                SalesOrderItemsTotalPrice = total
            });
        }

        order.SalesOrdersSubtotal = order.Items.Sum(i => i.SalesOrderItemsSubtotal);
        order.SalesOrdersDiscountAmount = order.Items.Sum(i => i.SalesOrderItemsDiscountAmount);
        order.SalesOrdersTaxAmount = order.Items.Sum(i => i.SalesOrderItemsTaxAmount);
        order.SalesOrdersTotalAmount = order.Items.Sum(i => i.SalesOrderItemsTotalPrice);

        db.SalesOrders.Add(order);
        await db.SaveChangesAsync(ct);
        return ApiResponse<SalesOrderDto>.Success(new SalesOrderDto(order.SalesOrdersId, order.SalesOrdersClientId, order.SalesOrdersRepresentativeId, order.SalesOrdersWarehouseId, order.SalesOrdersStatus, order.SalesOrdersDeliveryStatus, order.SalesOrdersOrderDate, order.SalesOrdersSubtotal, order.SalesOrdersDiscountAmount, order.SalesOrdersTaxAmount, order.SalesOrdersTotalAmount, order.SalesOrdersNotes, order.SalesOrdersCreatedAt));
    }
}

public record UpdateSalesOrderStatusCommand(int Id, string Status) : IRequest<ApiResponse<object>>;
public class UpdateSalesOrderStatusHandler(IApplicationDbContext db) : IRequestHandler<UpdateSalesOrderStatusCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UpdateSalesOrderStatusCommand cmd, CancellationToken ct)
    {
        var o = await db.SalesOrders
            .Include(x => x.Client)
            .FirstOrDefaultAsync(x => x.SalesOrdersId == cmd.Id, ct);
        if (o is null) return ApiResponse<object>.Failure("Sales order not found.");
        var oldStatus = o.SalesOrdersStatus;
        o.SalesOrdersStatus = cmd.Status;
        o.SalesOrdersUpdatedAt = DateTime.UtcNow;
        if (o.Client is not null)
        {
            if (cmd.Status == "Invoiced" && oldStatus != "Invoiced")
                o.Client.ClientsCreditBalance -= o.SalesOrdersTotalAmount;
            else if (oldStatus == "Invoiced" && cmd.Status != "Invoiced")
                o.Client.ClientsCreditBalance += o.SalesOrdersTotalAmount;
        }
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Status updated.");
    }
}

public record DeleteSalesOrderCommand(int Id) : IRequest<ApiResponse<object>>;
public class DeleteSalesOrderHandler(IApplicationDbContext db) : IRequestHandler<DeleteSalesOrderCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteSalesOrderCommand cmd, CancellationToken ct)
    {
        var o = await db.SalesOrders.FindAsync([cmd.Id], ct);
        if (o is null) return ApiResponse<object>.Failure("Sales order not found.");
        db.SalesOrders.Remove(o); await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Sales order deleted.");
    }
}

// ── Pending for delivery (inventory) ──────────────────────────────────────────

public record PendingSalesOrderItemDto(
    int SalesOrderItemsId,
    int? SalesOrderItemsVariantId,
    int? SalesOrderItemsPackagingTypeId,
    int SalesOrderItemsQuantity,
    int DeliveredQuantity,
    int ReturnedQuantity,
    decimal QuantityPending,
    string? ProductsName,
    string? VariantName,
    string? VariantSku,
    string? PackagingTypesName,
    string? BaseUnitsName);

public record PendingSalesOrderDto(
    int SalesOrdersId,
    int? SalesOrdersClientId,
    int? SalesOrdersRepresentativeId,
    int? SalesOrdersWarehouseId,
    string SalesOrdersStatus,
    string SalesOrdersDeliveryStatus,
    DateTime? SalesOrdersOrderDate,
    decimal SalesOrdersTotalAmount,
    string? SalesOrdersNotes,
    string? ClientsCompanyName,
    string? ClientsContactName,
    string? ClientsContactPhone1,
    string? ClientsAddress,
    string? WarehouseName,
    string? RepresentativeName,
    List<PendingSalesOrderItemDto> Items);

public record GetPendingSalesOrdersForDeliveryQuery()
    : IRequest<ApiResponse<List<PendingSalesOrderDto>>>;

public class GetPendingSalesOrdersForDeliveryHandler(IApplicationDbContext db)
    : IRequestHandler<GetPendingSalesOrdersForDeliveryQuery, ApiResponse<List<PendingSalesOrderDto>>>
{
    private static readonly string[] ExcludedDeliveryStatuses = ["Delivered"];

    private static bool IsEligibleOrderStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return true;
        return !status.Equals("Draft", StringComparison.OrdinalIgnoreCase)
            && !status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsPendingDelivery(string? deliveryStatus)
    {
        if (string.IsNullOrWhiteSpace(deliveryStatus)) return true;
        return !ExcludedDeliveryStatuses.Contains(deliveryStatus)
            && !deliveryStatus.Equals("Delivered", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<ApiResponse<List<PendingSalesOrderDto>>> Handle(
        GetPendingSalesOrdersForDeliveryQuery request, CancellationToken ct)
    {
        var deliveredByItem = await db.SalesDeliveryItems.AsNoTracking()
            .Where(di => di.SalesDeliveryItemsSalesOrderItemId != null)
            .GroupBy(di => di.SalesDeliveryItemsSalesOrderItemId!.Value)
            .Select(g => new { ItemId = g.Key, Total = g.Sum(x => x.SalesDeliveryItemsQuantityDelivered) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Total, ct);

        var orders = await db.SalesOrders.AsNoTracking()
            .Include(o => o.Client)
            .Include(o => o.Representative)
            .Include(o => o.Warehouse)
            .Include(o => o.Items)
                .ThenInclude(i => i.Variant!)
                    .ThenInclude(v => v.Product!)
                        .ThenInclude(p => p.UnitOfMeasure)
            .Include(o => o.Items)
                .ThenInclude(i => i.PackagingType)
            .Where(o => IsEligibleOrderStatus(o.SalesOrdersStatus))
            .Where(o => IsPendingDelivery(o.SalesOrdersDeliveryStatus))
            .OrderByDescending(o => o.SalesOrdersOrderDate)
            .ToListAsync(ct);

        var result = new List<PendingSalesOrderDto>();

        foreach (var order in orders)
        {
            var pendingItems = order.Items
                .Select(i =>
                {
                    deliveredByItem.TryGetValue(i.SalesOrderItemsId, out var delivered);
                    var pending = i.SalesOrderItemsQuantity - delivered;
                    return new { Item = i, Delivered = delivered, Pending = pending };
                })
                .Where(x => x.Pending > 0)
                .Select(x => new PendingSalesOrderItemDto(
                    x.Item.SalesOrderItemsId,
                    x.Item.SalesOrderItemsVariantId,
                    x.Item.SalesOrderItemsPackagingTypeId,
                    x.Item.SalesOrderItemsQuantity,
                    x.Delivered,
                    0,
                    x.Pending,
                    x.Item.Variant?.Product?.ProductsName,
                    x.Item.Variant?.VariantName,
                    x.Item.Variant?.VariantSku,
                    x.Item.PackagingType?.PackagingTypesName,
                    x.Item.Variant?.Product?.UnitOfMeasure?.BaseUnitsName))
                .ToList();

            if (pendingItems.Count == 0) continue;

            result.Add(new PendingSalesOrderDto(
                order.SalesOrdersId,
                order.SalesOrdersClientId,
                order.SalesOrdersRepresentativeId,
                order.SalesOrdersWarehouseId,
                order.SalesOrdersStatus,
                order.SalesOrdersDeliveryStatus,
                order.SalesOrdersOrderDate,
                order.SalesOrdersTotalAmount,
                order.SalesOrdersNotes,
                order.Client?.ClientsCompanyName,
                order.Client?.ClientsContactName,
                order.Client?.ClientsContactPhone1,
                order.Client?.ClientsAddress,
                order.Warehouse?.WarehouseName,
                order.Representative?.UsersName,
                pendingItems));
        }

        return ApiResponse<List<PendingSalesOrderDto>>.Success(result);
    }
}

public record UpdateSalesOrderRequest(int ClientId, int? WarehouseId, DateTime? OrderDate,
    string? Notes, string? Status, string? DeliveryStatus, IList<SalesOrderItemRequest>? Items);
public record UpdateSalesOrderCommand(int Id, UpdateSalesOrderRequest Request) : IRequest<ApiResponse<SalesOrderDto>>;
public class UpdateSalesOrderHandler(IApplicationDbContext db) : IRequestHandler<UpdateSalesOrderCommand, ApiResponse<SalesOrderDto>>
{
    public async Task<ApiResponse<SalesOrderDto>> Handle(UpdateSalesOrderCommand cmd, CancellationToken ct)
    {
        var o = await db.SalesOrders.Include(x => x.Items).FirstOrDefaultAsync(x => x.SalesOrdersId == cmd.Id, ct);
        if (o is null) return ApiResponse<SalesOrderDto>.Failure("Sales order not found.");
        var r = cmd.Request;
        o.SalesOrdersClientId = r.ClientId;
        if (r.WarehouseId.HasValue) o.SalesOrdersWarehouseId = r.WarehouseId;
        if (r.OrderDate.HasValue) o.SalesOrdersOrderDate = r.OrderDate.ToUtc();
        if (r.Notes is not null) o.SalesOrdersNotes = r.Notes;
        if (r.Status is not null)
        {
            var oldStatus = o.SalesOrdersStatus;
            o.SalesOrdersStatus = r.Status;
            o.SalesOrdersUpdatedAt = DateTime.UtcNow;
            var client = await db.Clients.FindAsync([o.SalesOrdersClientId], ct);
            if (client is not null)
            {
                if (r.Status == "Invoiced" && oldStatus != "Invoiced")
                    client.ClientsCreditBalance -= o.SalesOrdersTotalAmount;
                else if (oldStatus == "Invoiced" && r.Status != "Invoiced")
                    client.ClientsCreditBalance += o.SalesOrdersTotalAmount;
            }
        }
        if (r.DeliveryStatus is not null) o.SalesOrdersDeliveryStatus = r.DeliveryStatus;
        if (r.Items is not null && r.Items.Count > 0)
        {
            db.SalesOrderItems.RemoveRange(o.Items);
            o.Items.Clear();
            foreach (var item in r.Items)
            {
                var subtotal = item.Quantity * item.UnitPrice;
                var taxAmount = item.HasTax ? subtotal * item.TaxRate / 100 : 0;
                o.Items.Add(new SalesOrderItem
                {
                    SalesOrderItemsVariantId = item.VariantId,
                    SalesOrderItemsPackagingTypeId = item.PackagingTypeId,
                    SalesOrderItemsQuantity = item.Quantity,
                    SalesOrderItemsUnitPrice = item.UnitPrice,
                    SalesOrderItemsSubtotal = subtotal,
                    SalesOrderItemsDiscountAmount = item.DiscountAmount,
                    SalesOrderItemsTaxRate = item.TaxRate,
                    SalesOrderItemsTaxAmount = taxAmount,
                    SalesOrderItemsHasTax = item.HasTax,
                    SalesOrderItemsTotalPrice = subtotal - item.DiscountAmount + taxAmount
                });
            }
            o.SalesOrdersSubtotal = o.Items.Sum(i => i.SalesOrderItemsSubtotal);
            o.SalesOrdersDiscountAmount = o.Items.Sum(i => i.SalesOrderItemsDiscountAmount);
            o.SalesOrdersTaxAmount = o.Items.Sum(i => i.SalesOrderItemsTaxAmount);
            o.SalesOrdersTotalAmount = o.Items.Sum(i => i.SalesOrderItemsTotalPrice);
        }
        await db.SaveChangesAsync(ct);
        return ApiResponse<SalesOrderDto>.Success(new SalesOrderDto(o.SalesOrdersId, o.SalesOrdersClientId, o.SalesOrdersRepresentativeId, o.SalesOrdersWarehouseId, o.SalesOrdersStatus, o.SalesOrdersDeliveryStatus, o.SalesOrdersOrderDate, o.SalesOrdersSubtotal, o.SalesOrdersDiscountAmount, o.SalesOrdersTaxAmount, o.SalesOrdersTotalAmount, o.SalesOrdersNotes, o.SalesOrdersCreatedAt));
    }
}
