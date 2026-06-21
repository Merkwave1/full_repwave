using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Invoices;

public record InvoiceDto(
    int InvoicesId,
    int? InvoicesClientId,
    string? ClientName,
    DateTime? InvoicesDate,
    DateTime? InvoicesDueDate,
    decimal InvoicesTotalAmount,
    string InvoicesStatus,
    string? InvoicesNotes,
    DateTime? InvoicesCreatedAt);

public record CreateInvoiceItemRequest(int ProductId, int Quantity, decimal UnitPrice);

public record CreateInvoiceRequest(
    int ClientId,
    DateTime? Date,
    DateTime? DueDate,
    DateTime? ExpirationDate,
    string Status,
    string? Notes,
    IList<CreateInvoiceItemRequest> Items);

public record GetAllInvoicesQuery(int? ClientId = null, string? Status = null, int Page = 1, int PageSize = 20)
    : IRequest<ApiResponse<PagedResult<InvoiceDto>>>;

public class GetAllInvoicesQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllInvoicesQuery, ApiResponse<PagedResult<InvoiceDto>>>
{
    public async Task<ApiResponse<PagedResult<InvoiceDto>>> Handle(GetAllInvoicesQuery request, CancellationToken ct)
    {
        var query = db.Invoices.AsNoTracking()
            .Include(i => i.Client)
            .AsQueryable();

        if (request.ClientId.HasValue)
            query = query.Where(i => i.InvoicesClientId == request.ClientId.Value);
        if (!string.IsNullOrEmpty(request.Status))
            query = query.Where(i => i.InvoicesStatus == request.Status);

        var total = await query.CountAsync(ct);
        var list = await query
            .OrderByDescending(i => i.InvoicesDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(i => new InvoiceDto(
                i.InvoicesId, i.InvoicesClientId,
                i.Client != null ? i.Client.ClientsCompanyName : null,
                i.InvoicesDate, i.InvoicesDueDate, i.InvoicesTotalAmount,
                i.InvoicesStatus, i.InvoicesNotes, i.InvoicesCreatedAt))
            .ToListAsync(ct);

        return ApiResponse<PagedResult<InvoiceDto>>.Success(
            new PagedResult<InvoiceDto>(list, total, request.Page, request.PageSize));
    }
}

public record GetInvoiceByIdQuery(int Id) : IRequest<ApiResponse<InvoiceDto>>;

public class GetInvoiceByIdQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetInvoiceByIdQuery, ApiResponse<InvoiceDto>>
{
    public async Task<ApiResponse<InvoiceDto>> Handle(GetInvoiceByIdQuery request, CancellationToken ct)
    {
        var i = await db.Invoices.AsNoTracking()
            .Include(x => x.Client)
            .FirstOrDefaultAsync(x => x.InvoicesId == request.Id, ct);

        if (i is null) return ApiResponse<InvoiceDto>.Failure("Invoice not found.");

        return ApiResponse<InvoiceDto>.Success(new InvoiceDto(
            i.InvoicesId, i.InvoicesClientId, i.Client?.ClientsCompanyName,
            i.InvoicesDate, i.InvoicesDueDate, i.InvoicesTotalAmount,
            i.InvoicesStatus, i.InvoicesNotes, i.InvoicesCreatedAt));
    }
}

public record CreateInvoiceCommand(CreateInvoiceRequest Req) : IRequest<ApiResponse<InvoiceDto>>;

public class CreateInvoiceCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateInvoiceCommand, ApiResponse<InvoiceDto>>
{
    public async Task<ApiResponse<InvoiceDto>> Handle(CreateInvoiceCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var calculatedTotal = r.Items.Sum(i => i.Quantity * i.UnitPrice);
        var inv = new Invoice
        {
            InvoicesClientId = r.ClientId,
            InvoicesDate = r.Date ?? DateTime.UtcNow,
            InvoicesDueDate = r.DueDate,
            InvoicesExpirationDate = r.ExpirationDate,
            InvoicesTotalAmount = calculatedTotal,
            InvoicesStatus = r.Status,
            InvoicesNotes = r.Notes,
            InvoicesCreatedAt = DateTime.UtcNow
        };
        foreach (var item in r.Items)
        {
            inv.Items.Add(new InvoiceItem
            {
                InvoiceItemProductId = item.ProductId,
                InvoiceItemQuantity = item.Quantity,
                InvoiceItemUnitPrice = item.UnitPrice,
                InvoiceItemTotalPrice = item.Quantity * item.UnitPrice,
                InvoiceItemCreatedAt = DateTime.UtcNow,
                InvoiceItemUpdatedAt = DateTime.UtcNow
            });
        }
        db.Invoices.Add(inv);
        if (r.Status == "Confirmed")
        {
            var client = await db.Clients.FindAsync([r.ClientId], ct);
            if (client is not null)
                client.ClientsCreditBalance -= calculatedTotal;
        }
        await db.SaveChangesAsync(ct);
        return ApiResponse<InvoiceDto>.Success(new InvoiceDto(
            inv.InvoicesId, inv.InvoicesClientId, null, inv.InvoicesDate, inv.InvoicesDueDate,
            inv.InvoicesTotalAmount, inv.InvoicesStatus, inv.InvoicesNotes, inv.InvoicesCreatedAt));
    }
}

public record UpdateInvoiceStatusCommand(int Id, string Status) : IRequest<ApiResponse<object>>;

public class UpdateInvoiceStatusCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateInvoiceStatusCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UpdateInvoiceStatusCommand request, CancellationToken ct)
    {
        var inv = await db.Invoices
            .Include(x => x.Client)
            .FirstOrDefaultAsync(x => x.InvoicesId == request.Id, ct);
        if (inv is null) return ApiResponse<object>.Failure("Invoice not found.");
        var oldStatus = inv.InvoicesStatus;
        inv.InvoicesStatus = request.Status;
        inv.InvoicesUpdatedAt = DateTime.UtcNow;
        if (inv.Client is not null)
        {
            if (request.Status == "Confirmed" && oldStatus != "Confirmed")
                inv.Client.ClientsCreditBalance -= inv.InvoicesTotalAmount;
            else if (oldStatus == "Confirmed" && request.Status != "Confirmed")
                inv.Client.ClientsCreditBalance += inv.InvoicesTotalAmount;
        }
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Invoice status updated.");
    }
}

public record DeleteInvoiceCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteInvoiceCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteInvoiceCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteInvoiceCommand request, CancellationToken ct)
    {
        var inv = await db.Invoices.FindAsync([request.Id], ct);
        if (inv is null) return ApiResponse<object>.Failure("Invoice not found.");
        db.Invoices.Remove(inv);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Invoice deleted.");
    }
}


