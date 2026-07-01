using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.SalesReturns;

// â”€â”€ DTOs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

public record SalesReturnDto(
    int ReturnsId,
    int? ReturnsClientId,
    string? ClientName,
    int? ReturnsSalesOrderId,
    string? SalesOrderNotes,
    DateTime? ReturnsDate,
    string? ReturnsReason,
    decimal ReturnsTotalAmount,
    string ReturnsStatus,
    string? ReturnsNotes,
    DateTime? ReturnsCreatedAt,
    List<SalesReturnItemDto> Items);

public record SalesReturnItemDto(
    int ReturnItemsId,
    int? ReturnItemsSalesOrderItemId,
    int ReturnItemsQuantity,
    decimal ReturnItemsUnitPrice,
    decimal ReturnItemsTotalPrice,
    string? ReturnItemsNotes);

public record CreateSalesReturnRequest(
    int ClientId,
    int? SalesOrderId,
    string? Reason,
    string? Notes,
    int? CreatedByUserId,
    List<CreateSalesReturnItemRequest> Items);

public record CreateSalesReturnItemRequest(
    int? SalesOrderItemId,
    int Quantity,
    decimal UnitPrice,
    string? Notes);

// â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

public record GetAllSalesReturnsQuery(int? ClientId = null, int? SalesOrderId = null, string? Status = null, int Page = 1, int PageSize = 20)
    : IRequest<ApiResponse<PagedResult<SalesReturnDto>>>;

public class GetAllSalesReturnsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllSalesReturnsQuery, ApiResponse<PagedResult<SalesReturnDto>>>
{
    public async Task<ApiResponse<PagedResult<SalesReturnDto>>> Handle(GetAllSalesReturnsQuery request, CancellationToken ct)
    {
        var query = db.SalesReturns.AsNoTracking()
            .Include(r => r.Client)
            .Include(r => r.SalesOrder)
            .Include(r => r.Items)
            .AsQueryable();

        if (request.ClientId.HasValue)
            query = query.Where(r => r.ReturnsClientId == request.ClientId.Value);
        if (request.SalesOrderId.HasValue)
            query = query.Where(r => r.ReturnsSalesOrderId == request.SalesOrderId.Value);
        if (!string.IsNullOrEmpty(request.Status))
            query = query.Where(r => r.ReturnsStatus == request.Status);

        var total = await query.CountAsync(ct);
        var list = await query
            .OrderByDescending(r => r.ReturnsDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);

        var result = list.Select(r => new SalesReturnDto(
            r.ReturnsId, r.ReturnsClientId, r.Client?.ClientsCompanyName,
            r.ReturnsSalesOrderId, r.SalesOrder?.SalesOrdersNotes,
            r.ReturnsDate, r.ReturnsReason, r.ReturnsTotalAmount,
            r.ReturnsStatus, r.ReturnsNotes, r.ReturnsCreatedAt,
            r.Items.Select(i => new SalesReturnItemDto(
                i.ReturnItemsId, i.ReturnItemsSalesOrderItemId,
                i.ReturnItemsQuantity, i.ReturnItemsUnitPrice,
                i.ReturnItemsTotalPrice, i.ReturnItemsNotes)).ToList()
        )).ToList();

        return ApiResponse<PagedResult<SalesReturnDto>>.Success(
            new PagedResult<SalesReturnDto>(result, total, request.Page, request.PageSize));
    }
}

// â”€â”€ Commands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

public record CreateSalesReturnCommand(CreateSalesReturnRequest Req) : IRequest<ApiResponse<SalesReturnDto>>;

public class CreateSalesReturnCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateSalesReturnCommand, ApiResponse<SalesReturnDto>>
{
    public async Task<ApiResponse<SalesReturnDto>> Handle(CreateSalesReturnCommand request, CancellationToken ct)
    {
        var r = request.Req;

        if (r.ClientId <= 0)
            return ApiResponse<SalesReturnDto>.Failure("يجب اختيار العميل.");

        if (!r.SalesOrderId.HasValue)
            return ApiResponse<SalesReturnDto>.Failure("يجب اختيار أمر البيع المرتبط بالمرتجع.");

        if (r.Items is null || r.Items.Count == 0)
            return ApiResponse<SalesReturnDto>.Failure("يجب إضافة منتج واحد على الأقل للمرتجع.");

        var client = await db.Clients.FirstOrDefaultAsync(c => c.ClientsId == r.ClientId, ct);
        if (client is null)
            return ApiResponse<SalesReturnDto>.Failure("العميل المحدد غير موجود.");

        var salesOrder = await db.SalesOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.SalesOrdersId == r.SalesOrderId.Value, ct);
        if (salesOrder is null)
            return ApiResponse<SalesReturnDto>.Failure("أمر البيع المحدد غير موجود.");
        if (salesOrder.SalesOrdersClientId != r.ClientId)
            return ApiResponse<SalesReturnDto>.Failure("أمر البيع لا يتبع العميل المحدد.");

        var orderItemIds = salesOrder.Items.Select(i => i.SalesOrderItemsId).ToList();
        var returnedByItem = await db.SalesReturnItems.AsNoTracking()
            .Where(ri => ri.ReturnItemsSalesOrderItemId != null
                && orderItemIds.Contains(ri.ReturnItemsSalesOrderItemId!.Value))
            .GroupBy(ri => ri.ReturnItemsSalesOrderItemId!.Value)
            .Select(g => new { ItemId = g.Key, Total = g.Sum(x => x.ReturnItemsQuantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Total, ct);

        foreach (var item in r.Items)
        {
            if (!item.SalesOrderItemId.HasValue || item.Quantity <= 0)
                return ApiResponse<SalesReturnDto>.Failure("بيانات منتج المرتجع غير صالحة.");

            var soItem = salesOrder.Items.FirstOrDefault(i =>
                i.SalesOrderItemsId == item.SalesOrderItemId.Value);
            if (soItem is null)
                return ApiResponse<SalesReturnDto>.Failure("أحد منتجات المرتجع لا يتبع أمر البيع المحدد.");

            returnedByItem.TryGetValue(item.SalesOrderItemId.Value, out var alreadyReturned);
            var maxReturnable = Math.Max(0, soItem.SalesOrderItemsQuantity - alreadyReturned);
            if (item.Quantity > maxReturnable)
                return ApiResponse<SalesReturnDto>.Failure(
                    maxReturnable <= 0
                        ? "تم إرجاع الكمية الكاملة لهذا المنتج مسبقاً."
                        : $"الكمية المراد إرجاعها تتجاوز المتبقي ({maxReturnable}) لأحد المنتجات.");
        }

        var totalAmount = r.Items.Sum(i => i.Quantity * i.UnitPrice);

        var ret = new SalesReturn
        {
            ReturnsClientId = r.ClientId,
            ReturnsSalesOrderId = r.SalesOrderId,
            ReturnsCreatedByUserId = r.CreatedByUserId,
            ReturnsDate = DateTime.UtcNow,
            ReturnsReason = r.Reason,
            ReturnsTotalAmount = totalAmount,
            ReturnsStatus = "Pending",
            ReturnsNotes = r.Notes,
            ReturnsCreatedAt = DateTime.UtcNow
        };
        db.SalesReturns.Add(ret);

        // Restore client's credit balance
        client.ClientsCreditBalance += totalAmount;

        await db.SaveChangesAsync(ct); // get ret.ReturnsId

        foreach (var item in r.Items)
        {
            db.SalesReturnItems.Add(new SalesReturnItem
            {
                ReturnItemsReturnId = ret.ReturnsId,
                ReturnItemsSalesOrderItemId = item.SalesOrderItemId,
                ReturnItemsQuantity = item.Quantity,
                ReturnItemsUnitPrice = item.UnitPrice,
                ReturnItemsTotalPrice = item.Quantity * item.UnitPrice,
                ReturnItemsNotes = item.Notes
            });

            // Restore inventory
            if (item.SalesOrderItemId.HasValue && salesOrder?.SalesOrdersWarehouseId is not null)
            {
                var soItem = await db.SalesOrderItems.FindAsync([item.SalesOrderItemId.Value], ct);
                if (soItem?.SalesOrderItemsVariantId is not null)
                {
                    var inv = await db.Inventories.FirstOrDefaultAsync(i =>
                        i.VariantId == soItem.SalesOrderItemsVariantId.Value &&
                        i.WarehouseId == salesOrder.SalesOrdersWarehouseId.Value &&
                        i.PackagingTypeId == soItem.SalesOrderItemsPackagingTypeId, ct);
                    if (inv is not null)
                    {
                        inv.InventoryQuantity += item.Quantity;
                    }
                    else
                    {
                        db.Inventories.Add(new Inventory
                        {
                            VariantId = soItem.SalesOrderItemsVariantId.Value,
                            WarehouseId = salesOrder.SalesOrdersWarehouseId.Value,
                            PackagingTypeId = soItem.SalesOrderItemsPackagingTypeId,
                            InventoryQuantity = item.Quantity,
                            InventoryStatus = "available"
                        });
                    }

                    db.InventoryMovements.Add(new InventoryMovement
                    {
                        ProductVariantId = soItem.SalesOrderItemsVariantId,
                        WarehouseId = salesOrder.SalesOrdersWarehouseId,
                        Quantity = item.Quantity,
                        MovementType = "sales_return",
                        ReferenceId = ret.ReturnsId,
                        MovementDate = DateTime.UtcNow,
                        CreatedBy = r.CreatedByUserId,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }
        await db.SaveChangesAsync(ct);

        return ApiResponse<SalesReturnDto>.Success(new SalesReturnDto(
            ret.ReturnsId, ret.ReturnsClientId, null, ret.ReturnsSalesOrderId, null,
            ret.ReturnsDate, ret.ReturnsReason, ret.ReturnsTotalAmount,
            ret.ReturnsStatus, ret.ReturnsNotes, ret.ReturnsCreatedAt, []));
    }
}

public record UpdateSalesReturnStatusCommand(int Id, string Status) : IRequest<ApiResponse<object>>;

public class UpdateSalesReturnStatusCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateSalesReturnStatusCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UpdateSalesReturnStatusCommand request, CancellationToken ct)
    {
        var ret = await db.SalesReturns.FindAsync([request.Id], ct);
        if (ret is null) return ApiResponse<object>.Failure("Return not found.");
        ret.ReturnsStatus = request.Status;
        ret.ReturnsUpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Status updated.");
    }
}

public record DeleteSalesReturnCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteSalesReturnCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteSalesReturnCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteSalesReturnCommand request, CancellationToken ct)
    {
        var ret = await db.SalesReturns.FindAsync([request.Id], ct);
        if (ret is null) return ApiResponse<object>.Failure("Return not found.");
        db.SalesReturns.Remove(ret);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Return deleted.");
    }
}


