using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Accounts;

public record AccountDto(int AccountsId, string Code, string Name, string Type, int SortId);

public record UpsertAccountRequest(string Code, string Name, string Type, int SortId = 0);

// ── Get All ───────────────────────────────────────────────────────────────────
public record GetAllAccountsQuery : IRequest<ApiResponse<List<AccountDto>>>;

public class GetAllAccountsHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllAccountsQuery, ApiResponse<List<AccountDto>>>
{
    public async Task<ApiResponse<List<AccountDto>>> Handle(GetAllAccountsQuery _, CancellationToken ct)
    {
        var items = await db.Accounts.AsNoTracking()
            .OrderBy(a => a.AccountsSortId)
            .ThenBy(a => a.AccountsName)
            .Select(a => new AccountDto(a.AccountsId, a.AccountsCode, a.AccountsName, a.AccountsType, a.AccountsSortId))
            .ToListAsync(ct);
        return ApiResponse<List<AccountDto>>.Success(items);
    }
}

// ── Create ────────────────────────────────────────────────────────────────────
public record CreateAccountCommand(UpsertAccountRequest Request) : IRequest<ApiResponse<AccountDto>>;

public class CreateAccountHandler(IApplicationDbContext db)
    : IRequestHandler<CreateAccountCommand, ApiResponse<AccountDto>>
{
    public async Task<ApiResponse<AccountDto>> Handle(CreateAccountCommand cmd, CancellationToken ct)
    {
        if (await db.Accounts.AnyAsync(a => a.AccountsCode == cmd.Request.Code, ct))
            return ApiResponse<AccountDto>.Failure("Account code already exists.");

        var account = new Account
        {
            AccountsCode = cmd.Request.Code,
            AccountsName = cmd.Request.Name,
            AccountsType = cmd.Request.Type,
            AccountsSortId = cmd.Request.SortId
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync(ct);
        return ApiResponse<AccountDto>.Success(new AccountDto(account.AccountsId, account.AccountsCode, account.AccountsName, account.AccountsType, account.AccountsSortId));
    }
}

// ── Update ────────────────────────────────────────────────────────────────────
public record UpdateAccountCommand(int Id, UpsertAccountRequest Request) : IRequest<ApiResponse<AccountDto>>;

public class UpdateAccountHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateAccountCommand, ApiResponse<AccountDto>>
{
    public async Task<ApiResponse<AccountDto>> Handle(UpdateAccountCommand cmd, CancellationToken ct)
    {
        var account = await db.Accounts.FindAsync([cmd.Id], ct);
        if (account is null) return ApiResponse<AccountDto>.Failure("Account not found.");

        account.AccountsCode = cmd.Request.Code;
        account.AccountsName = cmd.Request.Name;
        account.AccountsType = cmd.Request.Type;
        account.AccountsSortId = cmd.Request.SortId;

        await db.SaveChangesAsync(ct);
        return ApiResponse<AccountDto>.Success(new AccountDto(account.AccountsId, account.AccountsCode, account.AccountsName, account.AccountsType, account.AccountsSortId));
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────
public record DeleteAccountCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteAccountHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteAccountCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteAccountCommand cmd, CancellationToken ct)
    {
        var account = await db.Accounts.FindAsync([cmd.Id], ct);
        if (account is null) return ApiResponse<object>.Failure("Account not found.");
        db.Accounts.Remove(account);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Account deleted.");
    }
}
