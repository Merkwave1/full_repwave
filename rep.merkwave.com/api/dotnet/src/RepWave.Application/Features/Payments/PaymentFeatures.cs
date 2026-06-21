using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Payments;

public record PaymentDto(int PaymentsId, int? PaymentsClientId, int? PaymentsMethodId, decimal PaymentsAmount,
    DateOnly? PaymentsDate, int? PaymentsSafeId, string? PaymentsNotes, int? PaymentsRepUserId, DateTime? PaymentsCreatedAt);
public record CreatePaymentRequest(int ClientId, int MethodId, decimal Amount, DateOnly Date,
    int? SafeId, string? Notes, int? VisitId);

public record GetAllPaymentsQuery(int Page = 1, int PageSize = 50, int? ClientId = null)
    : IRequest<ApiResponse<PagedResult<PaymentDto>>>;
public class GetAllPaymentsHandler(IApplicationDbContext db) : IRequestHandler<GetAllPaymentsQuery, ApiResponse<PagedResult<PaymentDto>>>
{
    public async Task<ApiResponse<PagedResult<PaymentDto>>> Handle(GetAllPaymentsQuery q, CancellationToken ct)
    {
        var query = db.Payments.AsNoTracking();
        if (q.ClientId.HasValue) query = query.Where(p => p.PaymentsClientId == q.ClientId);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(p => p.PaymentsCreatedAt).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(p => new PaymentDto(p.PaymentsId, p.PaymentsClientId, p.PaymentsMethodId, p.PaymentsAmount, p.PaymentsDate, p.PaymentsSafeId, p.PaymentsNotes, p.PaymentsRepUserId, p.PaymentsCreatedAt))
            .ToListAsync(ct);
        return ApiResponse<PagedResult<PaymentDto>>.Success(new() { Data = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize });
    }
}
public record CreatePaymentCommand(int RepUserId, CreatePaymentRequest Request) : IRequest<ApiResponse<PaymentDto>>;
public class CreatePaymentHandler(IApplicationDbContext db) : IRequestHandler<CreatePaymentCommand, ApiResponse<PaymentDto>>
{
    public async Task<ApiResponse<PaymentDto>> Handle(CreatePaymentCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;

        // Update client credit balance
        var client = await db.Clients.FindAsync([r.ClientId], ct);
        if (client is not null)
            client.ClientsCreditBalance += r.Amount;

        var payment = new Payment
        {
            PaymentsClientId = r.ClientId,
            PaymentsMethodId = r.MethodId,
            PaymentsAmount = r.Amount,
            PaymentsDate = r.Date,
            PaymentsSafeId = r.SafeId,
            PaymentsNotes = r.Notes,
            PaymentsRepUserId = cmd.RepUserId,
            PaymentsVisitId = r.VisitId,
            PaymentsCreatedAt = DateTime.UtcNow
        };
        db.Payments.Add(payment);

        // Safe transaction
        if (r.SafeId.HasValue)
        {
            var safe = await db.Safes.FindAsync([r.SafeId.Value], ct);
            if (safe is not null)
            {
                var balanceBefore = safe.SafesBalance;
                safe.SafesBalance += r.Amount;
                var tx = new SafeTransaction
                {
                    SafeTransactionsSafeId = safe.SafesId,
                    SafeTransactionsType = "receipt",
                    SafeTransactionsAmount = r.Amount,
                    SafeTransactionsBalanceBefore = balanceBefore,
                    SafeTransactionsBalanceAfter = safe.SafesBalance,
                    SafeTransactionsRelatedTable = "payments",
                    SafeTransactionsStatus = "completed",
                    SafeTransactionsDate = DateTime.UtcNow,
                    SafeTransactionsCreatedBy = cmd.RepUserId,
                    SafeTransactionsCreatedAt = DateTime.UtcNow
                };
                db.SafeTransactions.Add(tx);
                await db.SaveChangesAsync(ct);
                payment.PaymentsSafeTransactionId = tx.SafeTransactionsId;
            }
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<PaymentDto>.Success(new PaymentDto(payment.PaymentsId, payment.PaymentsClientId, payment.PaymentsMethodId, payment.PaymentsAmount, payment.PaymentsDate, payment.PaymentsSafeId, payment.PaymentsNotes, payment.PaymentsRepUserId, payment.PaymentsCreatedAt));
    }
}
public record DeletePaymentCommand(int Id) : IRequest<ApiResponse<object>>;
public class DeletePaymentHandler(IApplicationDbContext db) : IRequestHandler<DeletePaymentCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeletePaymentCommand cmd, CancellationToken ct)
    {
        var p = await db.Payments.FindAsync([cmd.Id], ct);
        if (p is null) return ApiResponse<object>.Failure("Payment not found.");

        // Reverse client balance
        var client = await db.Clients.FindAsync([p.PaymentsClientId], ct);
        if (client is not null)
            client.ClientsCreditBalance -= p.PaymentsAmount;

        // Reverse safe balance
        if (p.PaymentsSafeId.HasValue)
        {
            var safe = await db.Safes.FindAsync([p.PaymentsSafeId.Value], ct);
            if (safe is not null)
            {
                var balanceBefore = safe.SafesBalance;
                safe.SafesBalance -= p.PaymentsAmount;
                db.SafeTransactions.Add(new SafeTransaction
                {
                    SafeTransactionsSafeId = safe.SafesId,
                    SafeTransactionsType = "receipt_reversal",
                    SafeTransactionsAmount = p.PaymentsAmount,
                    SafeTransactionsBalanceBefore = balanceBefore,
                    SafeTransactionsBalanceAfter = safe.SafesBalance,
                    SafeTransactionsRelatedTable = "payments",
                    SafeTransactionsStatus = "completed",
                    SafeTransactionsDate = DateTime.UtcNow,
                    SafeTransactionsCreatedAt = DateTime.UtcNow
                });
            }
        }

        db.Payments.Remove(p);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Payment deleted.");
    }
}
