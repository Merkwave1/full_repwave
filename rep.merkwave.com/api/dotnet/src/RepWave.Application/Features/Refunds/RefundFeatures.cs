using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Refunds;

public record RefundDto(
    int RefundsId,
    int? RefundsClientId,
    string? ClientName,
    int? RefundsMethodId,
    decimal RefundsAmount,
    DateOnly? RefundsDate,
    string? RefundsTransactionId,
    int? RefundsSafeId,
    string? RefundsNotes,
    int? RefundsRepUserId,
    DateTime? RefundsCreatedAt);

public record CreateRefundRequest(
    int ClientId,
    int? MethodId,
    decimal Amount,
    DateOnly? Date,
    string? TransactionId,
    int? SafeId,
    string? Notes,
    int? RepUserId,
    int? VisitId);

public record GetAllRefundsQuery(int? ClientId = null, int? SafeId = null, int Page = 1, int PageSize = 20)
    : IRequest<ApiResponse<PagedResult<RefundDto>>>;

public class GetAllRefundsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllRefundsQuery, ApiResponse<PagedResult<RefundDto>>>
{
    public async Task<ApiResponse<PagedResult<RefundDto>>> Handle(GetAllRefundsQuery request, CancellationToken ct)
    {
        var query = db.Refunds.AsNoTracking()
            .Include(r => r.Client)
            .AsQueryable();

        if (request.ClientId.HasValue)
            query = query.Where(r => r.RefundsClientId == request.ClientId.Value);
        if (request.SafeId.HasValue)
            query = query.Where(r => r.RefundsSafeId == request.SafeId.Value);

        var total = await query.CountAsync(ct);
        var list = await query
            .OrderByDescending(r => r.RefundsDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(r => new RefundDto(
                r.RefundsId, r.RefundsClientId,
                r.Client != null ? r.Client.ClientsCompanyName : null,
                r.RefundsMethodId, r.RefundsAmount, r.RefundsDate,
                r.RefundsTransactionId, r.RefundsSafeId,
                r.RefundsNotes, r.RefundsRepUserId, r.RefundsCreatedAt))
            .ToListAsync(ct);

        return ApiResponse<PagedResult<RefundDto>>.Success(
            new PagedResult<RefundDto>(list, total, request.Page, request.PageSize));
    }
}

public record CreateRefundCommand(CreateRefundRequest Req) : IRequest<ApiResponse<RefundDto>>;

public class CreateRefundCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateRefundCommand, ApiResponse<RefundDto>>
{
    public async Task<ApiResponse<RefundDto>> Handle(CreateRefundCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var refund = new Refund
        {
            RefundsClientId = r.ClientId,
            RefundsMethodId = r.MethodId,
            RefundsAmount = r.Amount,
            RefundsDate = r.Date ?? DateOnly.FromDateTime(DateTime.UtcNow),
            RefundsTransactionId = r.TransactionId,
            RefundsSafeId = r.SafeId,
            RefundsNotes = r.Notes,
            RefundsRepUserId = r.RepUserId,
            RefundsVisitId = r.VisitId,
            RefundsCreatedAt = DateTime.UtcNow
        };
        db.Refunds.Add(refund);
        await db.SaveChangesAsync(ct);
        return ApiResponse<RefundDto>.Success(new RefundDto(
            refund.RefundsId, refund.RefundsClientId, null,
            refund.RefundsMethodId, refund.RefundsAmount, refund.RefundsDate,
            refund.RefundsTransactionId, refund.RefundsSafeId,
            refund.RefundsNotes, refund.RefundsRepUserId, refund.RefundsCreatedAt));
    }
}

public record DeleteRefundCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteRefundCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteRefundCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteRefundCommand request, CancellationToken ct)
    {
        var r = await db.Refunds.FindAsync([request.Id], ct);
        if (r is null) return ApiResponse<object>.Failure("Refund not found.");
        db.Refunds.Remove(r);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Refund deleted.");
    }
}


