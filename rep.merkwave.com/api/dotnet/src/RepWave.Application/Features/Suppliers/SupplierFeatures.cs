using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Suppliers;

public record SupplierDto(int SupplierId, string SupplierName, string? SupplierContactPerson,
    string? SupplierPhone, string? SupplierEmail, string? SupplierAddress, decimal SupplierBalance, DateTime? SupplierCreatedAt);
public record UpsertSupplierRequest(string SupplierName, string? SupplierContactPerson,
    string? SupplierPhone, string? SupplierEmail, string? SupplierAddress, string? SupplierNotes);

public record GetAllSuppliersQuery(int Page = 1, int PageSize = 50) : IRequest<ApiResponse<PagedResult<SupplierDto>>>;
public class GetAllSuppliersHandler(IApplicationDbContext db) : IRequestHandler<GetAllSuppliersQuery, ApiResponse<PagedResult<SupplierDto>>>
{
    public async Task<ApiResponse<PagedResult<SupplierDto>>> Handle(GetAllSuppliersQuery q, CancellationToken ct)
    {
        var total = await db.Suppliers.CountAsync(ct);
        var items = await db.Suppliers.AsNoTracking().OrderByDescending(s => s.SupplierCreatedAt)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(s => new SupplierDto(s.SupplierId, s.SupplierName, s.SupplierContactPerson, s.SupplierPhone, s.SupplierEmail, s.SupplierAddress, s.SupplierBalance, s.SupplierCreatedAt))
            .ToListAsync(ct);
        return ApiResponse<PagedResult<SupplierDto>>.Success(new() { Data = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize });
    }
}
public record GetSupplierByIdQuery(int Id) : IRequest<ApiResponse<SupplierDto>>;
public class GetSupplierByIdHandler(IApplicationDbContext db) : IRequestHandler<GetSupplierByIdQuery, ApiResponse<SupplierDto>>
{
    public async Task<ApiResponse<SupplierDto>> Handle(GetSupplierByIdQuery q, CancellationToken ct)
    {
        var s = await db.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.SupplierId == q.Id, ct);
        if (s is null) return ApiResponse<SupplierDto>.Failure("Supplier not found.");
        return ApiResponse<SupplierDto>.Success(new SupplierDto(s.SupplierId, s.SupplierName, s.SupplierContactPerson, s.SupplierPhone, s.SupplierEmail, s.SupplierAddress, s.SupplierBalance, s.SupplierCreatedAt));
    }
}
public record CreateSupplierCommand(UpsertSupplierRequest Request) : IRequest<ApiResponse<SupplierDto>>;
public class CreateSupplierHandler(IApplicationDbContext db) : IRequestHandler<CreateSupplierCommand, ApiResponse<SupplierDto>>
{
    public async Task<ApiResponse<SupplierDto>> Handle(CreateSupplierCommand cmd, CancellationToken ct)
    {
        var s = new Supplier { SupplierName = cmd.Request.SupplierName, SupplierContactPerson = cmd.Request.SupplierContactPerson, SupplierPhone = cmd.Request.SupplierPhone, SupplierEmail = cmd.Request.SupplierEmail, SupplierAddress = cmd.Request.SupplierAddress, SupplierNotes = cmd.Request.SupplierNotes, SupplierCreatedAt = DateTime.UtcNow };
        db.Suppliers.Add(s); await db.SaveChangesAsync(ct);
        return ApiResponse<SupplierDto>.Success(new SupplierDto(s.SupplierId, s.SupplierName, s.SupplierContactPerson, s.SupplierPhone, s.SupplierEmail, s.SupplierAddress, s.SupplierBalance, s.SupplierCreatedAt));
    }
}
public record UpdateSupplierCommand(int Id, UpsertSupplierRequest Request) : IRequest<ApiResponse<SupplierDto>>;
public class UpdateSupplierHandler(IApplicationDbContext db) : IRequestHandler<UpdateSupplierCommand, ApiResponse<SupplierDto>>
{
    public async Task<ApiResponse<SupplierDto>> Handle(UpdateSupplierCommand cmd, CancellationToken ct)
    {
        var s = await db.Suppliers.FindAsync([cmd.Id], ct);
        if (s is null) return ApiResponse<SupplierDto>.Failure("Supplier not found.");
        s.SupplierName = cmd.Request.SupplierName; s.SupplierContactPerson = cmd.Request.SupplierContactPerson;
        s.SupplierPhone = cmd.Request.SupplierPhone; s.SupplierEmail = cmd.Request.SupplierEmail;
        s.SupplierAddress = cmd.Request.SupplierAddress; s.SupplierNotes = cmd.Request.SupplierNotes;
        await db.SaveChangesAsync(ct);
        return ApiResponse<SupplierDto>.Success(new SupplierDto(s.SupplierId, s.SupplierName, s.SupplierContactPerson, s.SupplierPhone, s.SupplierEmail, s.SupplierAddress, s.SupplierBalance, s.SupplierCreatedAt));
    }
}
public record DeleteSupplierCommand(int Id) : IRequest<ApiResponse<object>>;
public class DeleteSupplierHandler(IApplicationDbContext db) : IRequestHandler<DeleteSupplierCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteSupplierCommand cmd, CancellationToken ct)
    {
        var s = await db.Suppliers.FindAsync([cmd.Id], ct);
        if (s is null) return ApiResponse<object>.Failure("Supplier not found.");
        db.Suppliers.Remove(s); await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Supplier deleted.");
    }
}
