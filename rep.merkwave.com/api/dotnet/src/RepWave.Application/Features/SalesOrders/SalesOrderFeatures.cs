using MediatR;
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

public record GetSalesOrderByIdQuery(int Id) : IRequest<ApiResponse<SalesOrderDto>>;
public class GetSalesOrderByIdHandler(IApplicationDbContext db) : IRequestHandler<GetSalesOrderByIdQuery, ApiResponse<SalesOrderDto>>
{
    public async Task<ApiResponse<SalesOrderDto>> Handle(GetSalesOrderByIdQuery q, CancellationToken ct)
    {
        var o = await db.SalesOrders.AsNoTracking()
            .Include(x => x.Client)
            .Include(x => x.Representative)
            .Include(x => x.Warehouse)
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.SalesOrdersId == q.Id, ct);
        if (o is null) return ApiResponse<SalesOrderDto>.Failure("Sales order not found.");
        return ApiResponse<SalesOrderDto>.Success(new SalesOrderDto(o.SalesOrdersId, o.SalesOrdersClientId, o.SalesOrdersRepresentativeId, o.SalesOrdersWarehouseId, o.SalesOrdersStatus, o.SalesOrdersDeliveryStatus, o.SalesOrdersOrderDate, o.SalesOrdersSubtotal, o.SalesOrdersDiscountAmount, o.SalesOrdersTaxAmount, o.SalesOrdersTotalAmount, o.SalesOrdersNotes, o.SalesOrdersCreatedAt,
            o.Client?.ClientsCompanyName, o.Representative?.UsersName, o.Warehouse?.WarehouseName, o.Items.Count));
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
        var order = new SalesOrder
        {
            SalesOrdersClientId = r.ClientId,
            SalesOrdersRepresentativeId = cmd.RepresentativeId,
            SalesOrdersWarehouseId = r.WarehouseId,
            SalesOrdersVisitId = r.VisitId,
            SalesOrdersOrderDate = r.OrderDate ?? DateTime.UtcNow,
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
        if (r.OrderDate.HasValue) o.SalesOrdersOrderDate = r.OrderDate;
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
