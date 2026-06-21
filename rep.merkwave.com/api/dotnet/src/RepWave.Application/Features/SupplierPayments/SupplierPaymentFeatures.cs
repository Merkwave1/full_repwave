using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.SupplierPayments;

public record SupplierPaymentDto(
    int SupplierPaymentId,
    int? SupplierId,
    string? SupplierName,
    int? PurchaseOrderId,
    int? SafeId,
    string? SafeName,
    int? PaymentMethodId,
    string? PaymentMethodName,
    decimal Amount,
    DateOnly? PaymentDate,
    string? Notes,
    int? CreatedBy,
    DateTime? CreatedAt);

public record CreateSupplierPaymentRequest(
    int SupplierId,
    int? PurchaseOrderId,
    int? SafeId,
    int? PaymentMethodId,
    decimal Amount,
    DateOnly? PaymentDate,
    string? Notes,
    int? CreatedBy);

public record GetSupplierPaymentsQuery(int? SupplierId = null, int? PurchaseOrderId = null, int Page = 1, int PageSize = 20)
    : IRequest<ApiResponse<PagedResult<SupplierPaymentDto>>>;

public class GetSupplierPaymentsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetSupplierPaymentsQuery, ApiResponse<PagedResult<SupplierPaymentDto>>>
{
    public async Task<ApiResponse<PagedResult<SupplierPaymentDto>>> Handle(
        GetSupplierPaymentsQuery request, CancellationToken ct)
    {
        var query = db.SupplierPayments.AsNoTracking()
            .Include(p => p.Supplier)
            .Include(p => p.Safe)
            .Include(p => p.PaymentMethod)
            .AsQueryable();

        if (request.SupplierId.HasValue)
            query = query.Where(p => p.SupplierId == request.SupplierId.Value);
        if (request.PurchaseOrderId.HasValue)
            query = query.Where(p => p.PurchaseOrderId == request.PurchaseOrderId.Value);

        var total = await query.CountAsync(ct);
        var list = await query
            .OrderByDescending(p => p.PaymentDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new SupplierPaymentDto(
                p.SupplierPaymentId, p.SupplierId,
                p.Supplier != null ? p.Supplier.SupplierName : null,
                p.PurchaseOrderId, p.SafeId,
                p.Safe != null ? p.Safe.SafesName : null,
                p.PaymentMethodId,
                p.PaymentMethod != null ? p.PaymentMethod.PaymentMethodsName : null,
                p.Amount, p.PaymentDate, p.Notes, p.CreatedBy, p.CreatedAt))
            .ToListAsync(ct);

        return ApiResponse<PagedResult<SupplierPaymentDto>>.Success(
            new PagedResult<SupplierPaymentDto>(list, total, request.Page, request.PageSize));
    }
}

public record CreateSupplierPaymentCommand(CreateSupplierPaymentRequest Req) : IRequest<ApiResponse<SupplierPaymentDto>>;

public class CreateSupplierPaymentCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateSupplierPaymentCommand, ApiResponse<SupplierPaymentDto>>
{
    public async Task<ApiResponse<SupplierPaymentDto>> Handle(CreateSupplierPaymentCommand request, CancellationToken ct)
    {
        var r = request.Req;

        // Reduce supplier's outstanding balance (they owe less)
        var supplier = await db.Suppliers.FindAsync([r.SupplierId], ct);
        if (supplier is not null)
            supplier.SupplierBalance -= r.Amount;

        var payment = new SupplierPayment
        {
            SupplierId = r.SupplierId,
            PurchaseOrderId = r.PurchaseOrderId,
            SafeId = r.SafeId,
            PaymentMethodId = r.PaymentMethodId,
            Amount = r.Amount,
            PaymentDate = r.PaymentDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
            Notes = r.Notes,
            CreatedBy = r.CreatedBy,
            CreatedAt = DateTime.UtcNow
        };
        db.SupplierPayments.Add(payment);

        // Safe transaction
        if (r.SafeId.HasValue)
        {
            var safe = await db.Safes.FindAsync([r.SafeId.Value], ct);
            if (safe is not null)
            {
                var balanceBefore = safe.SafesBalance;
                safe.SafesBalance -= r.Amount;
                db.SafeTransactions.Add(new SafeTransaction
                {
                    SafeTransactionsSafeId = safe.SafesId,
                    SafeTransactionsType = "expense",
                    SafeTransactionsAmount = r.Amount,
                    SafeTransactionsBalanceBefore = balanceBefore,
                    SafeTransactionsBalanceAfter = safe.SafesBalance,
                    SafeTransactionsRelatedTable = "supplier_payments",
                    SafeTransactionsStatus = "completed",
                    SafeTransactionsDate = DateTime.UtcNow,
                    SafeTransactionsCreatedBy = r.CreatedBy,
                    SafeTransactionsCreatedAt = DateTime.UtcNow
                });
            }
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<SupplierPaymentDto>.Success(new SupplierPaymentDto(
            payment.SupplierPaymentId, payment.SupplierId, null,
            payment.PurchaseOrderId, payment.SafeId, null,
            payment.PaymentMethodId, null, payment.Amount, payment.PaymentDate,
            payment.Notes, payment.CreatedBy, payment.CreatedAt));
    }
}

public record DeleteSupplierPaymentCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteSupplierPaymentCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteSupplierPaymentCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteSupplierPaymentCommand request, CancellationToken ct)
    {
        var p = await db.SupplierPayments.FindAsync([request.Id], ct);
        if (p is null) return ApiResponse<object>.Failure("Payment not found.");
        db.SupplierPayments.Remove(p);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Payment deleted.");
    }
}
