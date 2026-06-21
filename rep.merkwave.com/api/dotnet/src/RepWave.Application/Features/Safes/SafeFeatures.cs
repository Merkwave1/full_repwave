using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Safes;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record SafeDto(
    int SafesId,
    string SafesName,
    string? SafesDescription,
    decimal SafesBalance,
    string? SafesType,
    int? SafesRepUserId,
    string? RepUserName,
    int? SafesPaymentMethodId,
    bool SafesIsActive,
    string? SafesColor,
    DateTime? SafesCreatedAt);

public record SafeTransactionDto(
    int SafeTransactionsId,
    int? SafeTransactionsSafeId,
    string? SafeName,
    string? SafeTransactionsType,
    decimal SafeTransactionsAmount,
    decimal SafeTransactionsBalanceBefore,
    decimal SafeTransactionsBalanceAfter,
    string? SafeTransactionsDescription,
    string? SafeTransactionsReference,
    DateTime? SafeTransactionsDate,
    int? SafeTransactionsCreatedBy,
    string SafeTransactionsStatus,
    string? SafeTransactionsRelatedTable,
    DateTime? SafeTransactionsCreatedAt);

public record SafeTransferDto(
    int SafeTransferId,
    int? FromSafeId,
    string? FromSafeName,
    int? ToSafeId,
    string? ToSafeName,
    decimal Amount,
    string? Notes,
    string Status,
    int? CreatedBy,
    DateTime? TransferDate,
    DateTime? CreatedAt);

public record UpsertSafeRequest(
    string SafesName,
    string? SafesDescription,
    string? SafesType,
    int? SafesRepUserId,
    int? SafesPaymentMethodId,
    bool SafesIsActive,
    string? SafesColor);

public record CreateSafeTransactionRequest(
    int SafeId,
    string Type,
    decimal Amount,
    string? Description,
    string? Reference,
    DateTime? Date,
    string? RelatedTable);

public record CreateSafeTransferRequest(
    int FromSafeId,
    int ToSafeId,
    decimal Amount,
    string? Notes,
    DateTime? TransferDate);

// ── Safes CRUD ────────────────────────────────────────────────────────────────

public record GetAllSafesQuery(bool? IsActive = null) : IRequest<ApiResponse<List<SafeDto>>>;

public class GetAllSafesQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllSafesQuery, ApiResponse<List<SafeDto>>>
{
    public async Task<ApiResponse<List<SafeDto>>> Handle(GetAllSafesQuery request, CancellationToken ct)
    {
        var query = db.Safes.AsNoTracking()
            .Include(s => s.RepUser)
            .AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(s => s.SafesIsActive == request.IsActive.Value);

        var list = await query
            .OrderBy(s => s.SafesName)
            .Select(s => new SafeDto(
                s.SafesId, s.SafesName, s.SafesDescription, s.SafesBalance,
                s.SafesType, s.SafesRepUserId,
                s.RepUser != null ? s.RepUser.UsersName : null,
                s.SafesPaymentMethodId, s.SafesIsActive, s.SafesColor, s.SafesCreatedAt))
            .ToListAsync(ct);

        return ApiResponse<List<SafeDto>>.Success(list);
    }
}

public record GetSafeByIdQuery(int Id) : IRequest<ApiResponse<SafeDto>>;

public class GetSafeByIdQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetSafeByIdQuery, ApiResponse<SafeDto>>
{
    public async Task<ApiResponse<SafeDto>> Handle(GetSafeByIdQuery request, CancellationToken ct)
    {
        var s = await db.Safes.AsNoTracking()
            .Include(x => x.RepUser)
            .FirstOrDefaultAsync(x => x.SafesId == request.Id, ct);

        if (s is null) return ApiResponse<SafeDto>.Failure("Safe not found.");

        return ApiResponse<SafeDto>.Success(new SafeDto(
            s.SafesId, s.SafesName, s.SafesDescription, s.SafesBalance,
            s.SafesType, s.SafesRepUserId,
            s.RepUser?.UsersName,
            s.SafesPaymentMethodId, s.SafesIsActive, s.SafesColor, s.SafesCreatedAt));
    }
}

public record CreateSafeCommand(UpsertSafeRequest Req) : IRequest<ApiResponse<SafeDto>>;

public class CreateSafeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateSafeCommand, ApiResponse<SafeDto>>
{
    public async Task<ApiResponse<SafeDto>> Handle(CreateSafeCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var safe = new Safe
        {
            SafesName = r.SafesName,
            SafesDescription = r.SafesDescription,
            SafesType = r.SafesType,
            SafesRepUserId = r.SafesRepUserId,
            SafesPaymentMethodId = r.SafesPaymentMethodId,
            SafesIsActive = r.SafesIsActive,
            SafesColor = r.SafesColor,
            SafesBalance = 0,
            SafesCreatedAt = DateTime.UtcNow
        };

        db.Safes.Add(safe);
        await db.SaveChangesAsync(ct);

        return ApiResponse<SafeDto>.Success(new SafeDto(
            safe.SafesId, safe.SafesName, safe.SafesDescription, safe.SafesBalance,
            safe.SafesType, safe.SafesRepUserId, null, safe.SafesPaymentMethodId,
            safe.SafesIsActive, safe.SafesColor, safe.SafesCreatedAt));
    }
}

public record UpdateSafeCommand(int Id, UpsertSafeRequest Req) : IRequest<ApiResponse<SafeDto>>;

public class UpdateSafeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateSafeCommand, ApiResponse<SafeDto>>
{
    public async Task<ApiResponse<SafeDto>> Handle(UpdateSafeCommand request, CancellationToken ct)
    {
        var safe = await db.Safes.FindAsync([request.Id], ct);
        if (safe is null) return ApiResponse<SafeDto>.Failure("Safe not found.");

        var r = request.Req;
        safe.SafesName = r.SafesName;
        safe.SafesDescription = r.SafesDescription;
        safe.SafesType = r.SafesType;
        safe.SafesRepUserId = r.SafesRepUserId;
        safe.SafesPaymentMethodId = r.SafesPaymentMethodId;
        safe.SafesIsActive = r.SafesIsActive;
        safe.SafesColor = r.SafesColor;
        safe.SafesUpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return ApiResponse<SafeDto>.Success(new SafeDto(
            safe.SafesId, safe.SafesName, safe.SafesDescription, safe.SafesBalance,
            safe.SafesType, safe.SafesRepUserId, null, safe.SafesPaymentMethodId,
            safe.SafesIsActive, safe.SafesColor, safe.SafesCreatedAt));
    }
}

public record DeleteSafeCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteSafeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteSafeCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteSafeCommand request, CancellationToken ct)
    {
        var safe = await db.Safes.FindAsync([request.Id], ct);
        if (safe is null) return ApiResponse<object>.Failure("Safe not found.");

        db.Safes.Remove(safe);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Safe deleted.");
    }
}

// ── Safe Transactions CRUD ───────────────────────────────────────────────────

public record GetSafeTransactionsQuery(int? SafeId = null, int Page = 1, int PageSize = 20)
    : IRequest<ApiResponse<PagedResult<SafeTransactionDto>>>;

public class GetSafeTransactionsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetSafeTransactionsQuery, ApiResponse<PagedResult<SafeTransactionDto>>>
{
    public async Task<ApiResponse<PagedResult<SafeTransactionDto>>> Handle(
        GetSafeTransactionsQuery request, CancellationToken ct)
    {
        var query = db.SafeTransactions.AsNoTracking()
            .Include(t => t.Safe)
            .AsQueryable();

        if (request.SafeId.HasValue)
            query = query.Where(t => t.SafeTransactionsSafeId == request.SafeId.Value);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(t => t.SafeTransactionsDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(t => new SafeTransactionDto(
                t.SafeTransactionsId, t.SafeTransactionsSafeId,
                t.Safe != null ? t.Safe.SafesName : null,
                t.SafeTransactionsType, t.SafeTransactionsAmount,
                t.SafeTransactionsBalanceBefore, t.SafeTransactionsBalanceAfter,
                t.SafeTransactionsDescription, t.SafeTransactionsReference,
                t.SafeTransactionsDate, t.SafeTransactionsCreatedBy,
                t.SafeTransactionsStatus, t.SafeTransactionsRelatedTable,
                t.SafeTransactionsCreatedAt))
            .ToListAsync(ct);

        return ApiResponse<PagedResult<SafeTransactionDto>>.Success(
            new PagedResult<SafeTransactionDto>(items, total, request.Page, request.PageSize));
    }
}

public record CreateSafeTransactionCommand(CreateSafeTransactionRequest Req, int UserId)
    : IRequest<ApiResponse<SafeTransactionDto>>;

public class CreateSafeTransactionCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateSafeTransactionCommand, ApiResponse<SafeTransactionDto>>
{
    public async Task<ApiResponse<SafeTransactionDto>> Handle(CreateSafeTransactionCommand request, CancellationToken ct)
    {
        var safe = await db.Safes.FindAsync([request.Req.SafeId], ct);
        if (safe is null) return ApiResponse<SafeTransactionDto>.Failure("Safe not found.");

        var balanceBefore = safe.SafesBalance;
        var amount = request.Req.Amount;

        // Adjust balance based on type
        if (request.Req.Type.Equals("credit", StringComparison.OrdinalIgnoreCase))
            safe.SafesBalance += amount;
        else if (request.Req.Type.Equals("debit", StringComparison.OrdinalIgnoreCase))
            safe.SafesBalance -= amount;

        var tx = new SafeTransaction
        {
            SafeTransactionsSafeId = request.Req.SafeId,
            SafeTransactionsType = request.Req.Type,
            SafeTransactionsAmount = amount,
            SafeTransactionsBalanceBefore = balanceBefore,
            SafeTransactionsBalanceAfter = safe.SafesBalance,
            SafeTransactionsDescription = request.Req.Description,
            SafeTransactionsReference = request.Req.Reference,
            SafeTransactionsDate = request.Req.Date ?? DateTime.UtcNow,
            SafeTransactionsCreatedBy = request.UserId,
            SafeTransactionsStatus = "completed",
            SafeTransactionsRelatedTable = request.Req.RelatedTable,
            SafeTransactionsCreatedAt = DateTime.UtcNow
        };

        db.SafeTransactions.Add(tx);
        await db.SaveChangesAsync(ct);

        return ApiResponse<SafeTransactionDto>.Success(new SafeTransactionDto(
            tx.SafeTransactionsId, tx.SafeTransactionsSafeId, safe.SafesName,
            tx.SafeTransactionsType, tx.SafeTransactionsAmount,
            tx.SafeTransactionsBalanceBefore, tx.SafeTransactionsBalanceAfter,
            tx.SafeTransactionsDescription, tx.SafeTransactionsReference,
            tx.SafeTransactionsDate, tx.SafeTransactionsCreatedBy,
            tx.SafeTransactionsStatus, tx.SafeTransactionsRelatedTable,
            tx.SafeTransactionsCreatedAt));
    }
}

// ── Safe Transfers ────────────────────────────────────────────────────────────

public record GetSafeTransfersQuery(int? SafeId = null) : IRequest<ApiResponse<List<SafeTransferDto>>>;

public class GetSafeTransfersQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetSafeTransfersQuery, ApiResponse<List<SafeTransferDto>>>
{
    public async Task<ApiResponse<List<SafeTransferDto>>> Handle(GetSafeTransfersQuery request, CancellationToken ct)
    {
        var query = db.SafeTransfers.AsNoTracking()
            .Include(t => t.FromSafe)
            .Include(t => t.ToSafe)
            .AsQueryable();

        if (request.SafeId.HasValue)
            query = query.Where(t => t.FromSafeId == request.SafeId || t.ToSafeId == request.SafeId);

        var list = await query
            .OrderByDescending(t => t.TransferDate)
            .Select(t => new SafeTransferDto(
                t.SafeTransferId, t.FromSafeId,
                t.FromSafe != null ? t.FromSafe.SafesName : null,
                t.ToSafeId,
                t.ToSafe != null ? t.ToSafe.SafesName : null,
                t.Amount, t.Notes, t.Status, t.CreatedBy, t.TransferDate, t.CreatedAt))
            .ToListAsync(ct);

        return ApiResponse<List<SafeTransferDto>>.Success(list);
    }
}

public record CreateSafeTransferCommand(CreateSafeTransferRequest Req, int UserId)
    : IRequest<ApiResponse<SafeTransferDto>>;

public class CreateSafeTransferCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateSafeTransferCommand, ApiResponse<SafeTransferDto>>
{
    public async Task<ApiResponse<SafeTransferDto>> Handle(CreateSafeTransferCommand request, CancellationToken ct)
    {
        var r = request.Req;

        var fromSafe = await db.Safes.FindAsync([r.FromSafeId], ct);
        if (fromSafe is null) return ApiResponse<SafeTransferDto>.Failure("Source safe not found.");

        var toSafe = await db.Safes.FindAsync([r.ToSafeId], ct);
        if (toSafe is null) return ApiResponse<SafeTransferDto>.Failure("Destination safe not found.");

        if (fromSafe.SafesBalance < r.Amount)
            return ApiResponse<SafeTransferDto>.Failure("Insufficient balance in source safe.");

        var fromBalanceBefore = fromSafe.SafesBalance;
        fromSafe.SafesBalance -= r.Amount;
        var toBalanceBefore = toSafe.SafesBalance;
        toSafe.SafesBalance += r.Amount;

        var transfer = new SafeTransfer
        {
            FromSafeId = r.FromSafeId,
            ToSafeId = r.ToSafeId,
            Amount = r.Amount,
            Notes = r.Notes,
            Status = "Completed",
            CreatedBy = request.UserId,
            TransferDate = r.TransferDate ?? DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        db.SafeTransfers.Add(transfer);
        await db.SaveChangesAsync(ct); // get transfer ID

        // Log safe transactions for both sides
        db.SafeTransactions.Add(new SafeTransaction
        {
            SafeTransactionsSafeId = fromSafe.SafesId,
            SafeTransactionsType = "transfer_out",
            SafeTransactionsAmount = r.Amount,
            SafeTransactionsBalanceBefore = fromBalanceBefore,
            SafeTransactionsBalanceAfter = fromSafe.SafesBalance,
            SafeTransactionsRelatedTable = "safe_transfers",
            SafeTransactionsStatus = "completed",
            SafeTransactionsDate = DateTime.UtcNow,
            SafeTransactionsCreatedBy = request.UserId,
            SafeTransactionsCreatedAt = DateTime.UtcNow
        });
        db.SafeTransactions.Add(new SafeTransaction
        {
            SafeTransactionsSafeId = toSafe.SafesId,
            SafeTransactionsType = "transfer_in",
            SafeTransactionsAmount = r.Amount,
            SafeTransactionsBalanceBefore = toBalanceBefore,
            SafeTransactionsBalanceAfter = toSafe.SafesBalance,
            SafeTransactionsRelatedTable = "safe_transfers",
            SafeTransactionsStatus = "completed",
            SafeTransactionsDate = DateTime.UtcNow,
            SafeTransactionsCreatedBy = request.UserId,
            SafeTransactionsCreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);

        return ApiResponse<SafeTransferDto>.Success(new SafeTransferDto(
            transfer.SafeTransferId, transfer.FromSafeId, fromSafe.SafesName,
            transfer.ToSafeId, toSafe.SafesName,
            transfer.Amount, transfer.Notes, transfer.Status,
            transfer.CreatedBy, transfer.TransferDate, transfer.CreatedAt));
    }
}
