using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.FinancialTransactions;

public record FinancialTransactionDto(
    int FinancialTransactionsId,
    string? FinancialTransactionsType,
    decimal FinancialTransactionsAmount,
    DateTime? FinancialTransactionsDate,
    string? FinancialTransactionsNotes,
    int? FinancialTransactionsSafeId,
    int? FinancialTransactionsUserId,
    string? FinancialTransactionsReference,
    DateTime? FinancialTransactionsCreatedAt);

public record CreateFinancialTransactionRequest(
    string Type,
    decimal Amount,
    DateTime? Date,
    string? Notes,
    int? SafeId,
    int? UserId,
    string? Reference);

public record GetAllFinancialTransactionsQuery(
    string? Type = null,
    int? SafeId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int Page = 1,
    int PageSize = 20)
    : IRequest<ApiResponse<PagedResult<FinancialTransactionDto>>>;

public class GetAllFinancialTransactionsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllFinancialTransactionsQuery, ApiResponse<PagedResult<FinancialTransactionDto>>>
{
    public async Task<ApiResponse<PagedResult<FinancialTransactionDto>>> Handle(
        GetAllFinancialTransactionsQuery request, CancellationToken ct)
    {
        var query = db.FinancialTransactions.AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(request.Type))
            query = query.Where(t => t.FinancialTransactionsType == request.Type);
        if (request.SafeId.HasValue)
            query = query.Where(t => t.FinancialTransactionsSafeId == request.SafeId.Value);
        if (request.FromDate.HasValue)
            query = query.Where(t => t.FinancialTransactionsDate >= request.FromDate.Value);
        if (request.ToDate.HasValue)
            query = query.Where(t => t.FinancialTransactionsDate <= request.ToDate.Value);

        var total = await query.CountAsync(ct);
        var list = await query
            .OrderByDescending(t => t.FinancialTransactionsDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(t => new FinancialTransactionDto(
                t.FinancialTransactionsId, t.FinancialTransactionsType,
                t.FinancialTransactionsAmount, t.FinancialTransactionsDate,
                t.FinancialTransactionsNotes, t.FinancialTransactionsSafeId,
                t.FinancialTransactionsUserId, t.FinancialTransactionsReference,
                t.FinancialTransactionsCreatedAt))
            .ToListAsync(ct);

        return ApiResponse<PagedResult<FinancialTransactionDto>>.Success(
            new PagedResult<FinancialTransactionDto>(list, total, request.Page, request.PageSize));
    }
}

public record CreateFinancialTransactionCommand(CreateFinancialTransactionRequest Req)
    : IRequest<ApiResponse<FinancialTransactionDto>>;

public class CreateFinancialTransactionCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateFinancialTransactionCommand, ApiResponse<FinancialTransactionDto>>
{
    public async Task<ApiResponse<FinancialTransactionDto>> Handle(
        CreateFinancialTransactionCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var tx = new FinancialTransaction
        {
            FinancialTransactionsType = r.Type,
            FinancialTransactionsAmount = r.Amount,
            FinancialTransactionsDate = r.Date ?? DateTime.UtcNow,
            FinancialTransactionsNotes = r.Notes,
            FinancialTransactionsSafeId = r.SafeId,
            FinancialTransactionsUserId = r.UserId,
            FinancialTransactionsReference = r.Reference,
            FinancialTransactionsCreatedAt = DateTime.UtcNow
        };
        db.FinancialTransactions.Add(tx);
        await db.SaveChangesAsync(ct);
        return ApiResponse<FinancialTransactionDto>.Success(new FinancialTransactionDto(
            tx.FinancialTransactionsId, tx.FinancialTransactionsType,
            tx.FinancialTransactionsAmount, tx.FinancialTransactionsDate,
            tx.FinancialTransactionsNotes, tx.FinancialTransactionsSafeId,
            tx.FinancialTransactionsUserId, tx.FinancialTransactionsReference,
            tx.FinancialTransactionsCreatedAt));
    }
}

public record DeleteFinancialTransactionCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteFinancialTransactionCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteFinancialTransactionCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteFinancialTransactionCommand request, CancellationToken ct)
    {
        var tx = await db.FinancialTransactions.FindAsync([request.Id], ct);
        if (tx is null) return ApiResponse<object>.Failure("Transaction not found.");
        db.FinancialTransactions.Remove(tx);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Transaction deleted.");
    }
}
