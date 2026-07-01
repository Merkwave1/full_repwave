using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Transfers;

public record TransferRequestItemDto(
    int RequestItemId,
    int RequestId,
    int? VariantId,
    int? PackagingTypeId,
    decimal RequestedQuantity,
    string? RequestItemNote,
    string? ProductsName,
    string? VariantName,
    string? PackagingTypesName);

public record TransferRequestDto(
    int RequestId,
    string RequestStatus,
    DateTime? RequestDate,
    string? RequestNotes,
    int? RequestSourceWarehouseId,
    int? RequestDestinationWarehouseId,
    int? RequestCreatedByUserId,
    string? SourceWarehouseName,
    string? DestinationWarehouseName,
    string? CreatedByName,
    DateTime? RequestCreatedAt,
    List<TransferRequestItemDto> Items);

public record TransferDto(
    int TransferId,
    int? TransferFromWarehouseId,
    string? FromWarehouseName,
    int? TransferToWarehouseId,
    string? ToWarehouseName,
    int? TransferUserId,
    string TransferStatus,
    DateTime? TransferDate,
    string? TransferNotes);

public record CreateTransferRequestRequest(DateTime? Date, string? Notes, int? SourceWarehouseId, int? DestinationWarehouseId);
public record CreateTransferItemRequest(int VariantId, int? PackagingTypeId, int Quantity);
public record CreateTransferRequest(
    int FromWarehouseId,
    int ToWarehouseId,
    int? UserId,
    DateTime? Date,
    string? Notes,
    string? Status,
    IList<CreateTransferItemRequest> Items);

// ── Transfer Requests ─────────────────────────────────────────────────────────

public record GetAllTransferRequestsQuery(string? Status = null) : IRequest<ApiResponse<List<TransferRequestDto>>>;

public class GetAllTransferRequestsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllTransferRequestsQuery, ApiResponse<List<TransferRequestDto>>>
{
    public async Task<ApiResponse<List<TransferRequestDto>>> Handle(GetAllTransferRequestsQuery request, CancellationToken ct)
    {
        var query = db.TransferRequests.AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(request.Status))
            query = query.Where(r => r.RequestStatus == request.Status);

        var rows = await query
            .Include(r => r.SourceWarehouse)
            .Include(r => r.DestinationWarehouse)
            .Include(r => r.CreatedByUser)
            .Include(r => r.Items)
                .ThenInclude(i => i.Variant!)
                    .ThenInclude(v => v.Product!)
            .Include(r => r.Items)
                .ThenInclude(i => i.PackagingType)
            .OrderByDescending(r => r.RequestDate)
            .ToListAsync(ct);

        var list = rows.Select(r => new TransferRequestDto(
            r.RequestId,
            r.RequestStatus,
            r.RequestDate,
            r.RequestNotes,
            r.RequestSourceWarehouseId,
            r.RequestDestinationWarehouseId,
            r.RequestCreatedByUserId,
            r.SourceWarehouse?.WarehouseName,
            r.DestinationWarehouse?.WarehouseName,
            r.CreatedByUser?.UsersName,
            r.RequestDate,
            r.Items.Select(i => new TransferRequestItemDto(
                i.RequestItemId,
                i.RequestId,
                i.VariantId,
                i.PackagingTypeId,
                i.RequestedQuantity,
                i.RequestItemNote,
                i.Variant?.Product?.ProductsName,
                i.Variant?.VariantName,
                i.PackagingType?.PackagingTypesName)).ToList())).ToList();

        return ApiResponse<List<TransferRequestDto>>.Success(list);
    }
}

public record CreateTransferRequestCommand(CreateTransferRequestRequest Req) : IRequest<ApiResponse<TransferRequestDto>>;

public class CreateTransferRequestCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateTransferRequestCommand, ApiResponse<TransferRequestDto>>
{
    public async Task<ApiResponse<TransferRequestDto>> Handle(CreateTransferRequestCommand request, CancellationToken ct)
    {
        var r = new TransferRequest
        {
            RequestDate = request.Req.Date ?? DateTime.UtcNow,
            RequestNotes = request.Req.Notes,
            RequestStatus = "Pending",
            RequestSourceWarehouseId = request.Req.SourceWarehouseId,
            RequestDestinationWarehouseId = request.Req.DestinationWarehouseId
        };
        db.TransferRequests.Add(r);
        await db.SaveChangesAsync(ct);
        return ApiResponse<TransferRequestDto>.Success(
            new TransferRequestDto(
                r.RequestId,
                r.RequestStatus,
                r.RequestDate,
                r.RequestNotes,
                r.RequestSourceWarehouseId,
                r.RequestDestinationWarehouseId,
                r.RequestCreatedByUserId,
                null,
                null,
                null,
                r.RequestDate,
                []));
    }
}

public record UpdateTransferRequestStatusCommand(int Id, string Status) : IRequest<ApiResponse<object>>;

public class UpdateTransferRequestStatusCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateTransferRequestStatusCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UpdateTransferRequestStatusCommand request, CancellationToken ct)
    {
        var r = await db.TransferRequests.FindAsync([request.Id], ct);
        if (r is null) return ApiResponse<object>.Failure("Transfer request not found.");
        r.RequestStatus = request.Status;
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Status updated.");
    }
}

public record DeleteTransferRequestCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteTransferRequestCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteTransferRequestCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteTransferRequestCommand request, CancellationToken ct)
    {
        var r = await db.TransferRequests.FindAsync([request.Id], ct);
        if (r is null) return ApiResponse<object>.Failure("Transfer request not found.");
        db.TransferRequests.Remove(r);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Transfer request deleted.");
    }
}

// ── Transfers ─────────────────────────────────────────────────────────────────

public record TransferItemDto(
    int TransferItemId,
    int? VariantId,
    int? PackagingTypeId,
    int Quantity,
    int? ProductsId);

public record TransferWithItemsDto(
    int TransferId,
    int? TransferFromWarehouseId,
    string? FromWarehouseName,
    int? TransferToWarehouseId,
    string? ToWarehouseName,
    int? TransferUserId,
    string TransferStatus,
    DateTime? TransferDate,
    string? TransferNotes,
    List<TransferItemDto> Items);

public record GetAllTransfersQuery(string? Status = null) : IRequest<ApiResponse<List<TransferDto>>>;

public record GetTransferByIdQuery(int Id) : IRequest<ApiResponse<TransferWithItemsDto>>;

public class GetTransferByIdQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetTransferByIdQuery, ApiResponse<TransferWithItemsDto>>
{
    public async Task<ApiResponse<TransferWithItemsDto>> Handle(GetTransferByIdQuery request, CancellationToken ct)
    {
        var t = await db.Transfers
            .AsNoTracking()
            .Include(t => t.FromWarehouse)
            .Include(t => t.ToWarehouse)
            .Include(t => t.Items)
                .ThenInclude(i => i.Variant)
            .FirstOrDefaultAsync(t => t.TransferId == request.Id, ct);

        if (t is null) return ApiResponse<TransferWithItemsDto>.Failure("Transfer not found.");

        var items = t.Items
            .Select(i => new TransferItemDto(
                i.TransferItemsId,
                i.TransferItemsVariantId,
                i.TransferItemsPackagingTypeId,
                i.TransferItemsQuantity,
                i.Variant?.VariantProductsId))
            .ToList();

        return ApiResponse<TransferWithItemsDto>.Success(new TransferWithItemsDto(
            t.TransferId,
            t.TransferFromWarehouseId,
            t.FromWarehouse?.WarehouseName,
            t.TransferToWarehouseId,
            t.ToWarehouse?.WarehouseName,
            t.TransferUserId,
            t.TransferStatus,
            t.TransferDate,
            t.TransferNotes,
            items));
    }
}

public class GetAllTransfersQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllTransfersQuery, ApiResponse<List<TransferDto>>>
{
    public async Task<ApiResponse<List<TransferDto>>> Handle(GetAllTransfersQuery request, CancellationToken ct)
    {
        var query = db.Transfers.AsNoTracking()
            .Include(t => t.FromWarehouse)
            .Include(t => t.ToWarehouse)
            .AsQueryable();

        if (!string.IsNullOrEmpty(request.Status))
            query = query.Where(t => t.TransferStatus == request.Status);

        var list = await query
            .OrderByDescending(t => t.TransferDate)
            .Select(t => new TransferDto(
                t.TransferId,
                t.TransferFromWarehouseId,
                t.FromWarehouse != null ? t.FromWarehouse.WarehouseName : null,
                t.TransferToWarehouseId,
                t.ToWarehouse != null ? t.ToWarehouse.WarehouseName : null,
                t.TransferUserId, t.TransferStatus, t.TransferDate, t.TransferNotes))
            .ToListAsync(ct);

        return ApiResponse<List<TransferDto>>.Success(list);
    }
}

public record CreateTransferCommand(CreateTransferRequest Req) : IRequest<ApiResponse<TransferDto>>;

public class CreateTransferCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateTransferCommand, ApiResponse<TransferDto>>
{
    public async Task<ApiResponse<TransferDto>> Handle(CreateTransferCommand request, CancellationToken ct)
    {
        var r = request.Req;

        var fromWarehouse = await db.Warehouses.FindAsync([r.FromWarehouseId], ct);
        if (fromWarehouse is null) return ApiResponse<TransferDto>.Failure("Source warehouse not found.");
        var toWarehouse = await db.Warehouses.FindAsync([r.ToWarehouseId], ct);
        if (toWarehouse is null) return ApiResponse<TransferDto>.Failure("Destination warehouse not found.");

        var transfer = new Transfer
        {
            TransferFromWarehouseId = r.FromWarehouseId,
            TransferToWarehouseId = r.ToWarehouseId,
            TransferUserId = r.UserId,
            TransferDate = r.Date ?? DateTime.UtcNow,
            TransferNotes = r.Notes,
            TransferStatus = r.Status ?? "Completed"
        };
        db.Transfers.Add(transfer);
        await db.SaveChangesAsync(ct); // get transfer ID

        foreach (var item in r.Items)
        {
            // Find oldest source inventory batch (FIFO)
            var srcInv = await db.Inventories
                .Where(i =>
                    i.VariantId == item.VariantId &&
                    i.WarehouseId == r.FromWarehouseId &&
                    i.PackagingTypeId == item.PackagingTypeId &&
                    i.InventoryQuantity > 0)
                .OrderBy(i => i.InventoryProductionDate)
                .FirstOrDefaultAsync(ct);

            if (srcInv is null)
                return ApiResponse<TransferDto>.Failure($"Insufficient inventory for variant {item.VariantId} in source warehouse.");

            srcInv.InventoryQuantity -= item.Quantity;

            // Find or create destination inventory
            var dstInv = await db.Inventories.FirstOrDefaultAsync(i =>
                i.VariantId == item.VariantId &&
                i.WarehouseId == r.ToWarehouseId &&
                i.PackagingTypeId == item.PackagingTypeId &&
                i.InventoryProductionDate == srcInv.InventoryProductionDate, ct);

            if (dstInv is not null)
            {
                dstInv.InventoryQuantity += item.Quantity;
            }
            else
            {
                db.Inventories.Add(new Inventory
                {
                    VariantId = item.VariantId,
                    WarehouseId = r.ToWarehouseId,
                    PackagingTypeId = item.PackagingTypeId,
                    InventoryProductionDate = srcInv.InventoryProductionDate,
                    InventoryQuantity = item.Quantity,
                    InventoryStatus = "available"
                });
            }

            // Log inventory movements
            db.TransferItems.Add(new TransferItem
            {
                TransferItemsTransferId = transfer.TransferId,
                TransferItemsVariantId = item.VariantId,
                TransferItemsPackagingTypeId = item.PackagingTypeId,
                TransferItemsQuantity = item.Quantity
            });

            db.InventoryMovements.Add(new InventoryMovement
            {
                ProductVariantId = item.VariantId,
                WarehouseId = r.FromWarehouseId,
                Quantity = -item.Quantity,
                MovementType = "transfer_out",
                ReferenceId = transfer.TransferId,
                MovementDate = DateTime.UtcNow,
                CreatedBy = r.UserId,
                CreatedAt = DateTime.UtcNow
            });
            db.InventoryMovements.Add(new InventoryMovement
            {
                ProductVariantId = item.VariantId,
                WarehouseId = r.ToWarehouseId,
                Quantity = item.Quantity,
                MovementType = "transfer_in",
                ReferenceId = transfer.TransferId,
                MovementDate = DateTime.UtcNow,
                CreatedBy = r.UserId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<TransferDto>.Success(new TransferDto(
            transfer.TransferId, transfer.TransferFromWarehouseId, fromWarehouse.WarehouseName,
            transfer.TransferToWarehouseId, toWarehouse.WarehouseName,
            transfer.TransferUserId, transfer.TransferStatus, transfer.TransferDate, transfer.TransferNotes));
    }
}

public record UpdateTransferItemRequest(int VariantId, int? PackagingTypeId, int Quantity);
public record UpdateTransferRequest(string? Notes, IList<UpdateTransferItemRequest>? Items);
public record UpdateTransferCommand(int Id, UpdateTransferRequest Req) : IRequest<ApiResponse<TransferDto>>;

public class UpdateTransferCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateTransferCommand, ApiResponse<TransferDto>>
{
    public async Task<ApiResponse<TransferDto>> Handle(UpdateTransferCommand request, CancellationToken ct)
    {
        var t = await db.Transfers
            .Include(x => x.Items)
            .Include(x => x.FromWarehouse)
            .Include(x => x.ToWarehouse)
            .FirstOrDefaultAsync(x => x.TransferId == request.Id, ct);

        if (t is null) return ApiResponse<TransferDto>.Failure("Transfer not found.");

        if (request.Req.Notes is not null)
            t.TransferNotes = request.Req.Notes;

        if (request.Req.Items is not null)
        {
            db.TransferItems.RemoveRange(t.Items);
            foreach (var item in request.Req.Items)
            {
                db.TransferItems.Add(new TransferItem
                {
                    TransferItemsTransferId = t.TransferId,
                    TransferItemsVariantId = item.VariantId,
                    TransferItemsPackagingTypeId = item.PackagingTypeId,
                    TransferItemsQuantity = item.Quantity
                });
            }
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<TransferDto>.Success(new TransferDto(
            t.TransferId, t.TransferFromWarehouseId, t.FromWarehouse?.WarehouseName,
            t.TransferToWarehouseId, t.ToWarehouse?.WarehouseName,
            t.TransferUserId, t.TransferStatus, t.TransferDate, t.TransferNotes));
    }
}

public record UpdateTransferStatusRequest(string Status);
public record UpdateTransferStatusCommand(int Id, string Status) : IRequest<ApiResponse<object>>;

public class UpdateTransferStatusCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateTransferStatusCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UpdateTransferStatusCommand request, CancellationToken ct)
    {
        var t = await db.Transfers.FindAsync([request.Id], ct);
        if (t is null) return ApiResponse<object>.Failure("Transfer not found.");
        t.TransferStatus = request.Status;
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Status updated.");
    }
}

public record DeleteTransferCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteTransferCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteTransferCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteTransferCommand request, CancellationToken ct)
    {
        var t = await db.Transfers.FindAsync([request.Id], ct);
        if (t is null) return ApiResponse<object>.Failure("Transfer not found.");
        db.Transfers.Remove(t);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Transfer deleted.");
    }
}
