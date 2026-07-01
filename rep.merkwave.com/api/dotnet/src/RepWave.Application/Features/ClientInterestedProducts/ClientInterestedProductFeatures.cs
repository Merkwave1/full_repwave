using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.ClientInterestedProducts;

public record ClientInterestedProductDto(
    int ProductsId,
    string? ProductsName,
    string? ProductsBrand,
    string? ProductsCategory,
    string? ProductsDescription,
    string? ProductsImageUrl,
    bool ProductsIsActive);

public record GetClientInterestedProductsQuery(int ClientId) : IRequest<ApiResponse<List<ClientInterestedProductDto>>>;

public class GetClientInterestedProductsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetClientInterestedProductsQuery, ApiResponse<List<ClientInterestedProductDto>>>
{
    public async Task<ApiResponse<List<ClientInterestedProductDto>>> Handle(
        GetClientInterestedProductsQuery request, CancellationToken ct)
    {
        var list = await db.ClientInterestedProducts.AsNoTracking()
            .Include(x => x.Product!)
                .ThenInclude(p => p.Category)
            .Where(x => x.ClientId == request.ClientId)
            .Select(x => new ClientInterestedProductDto(
                x.ProductsId,
                x.Product != null ? x.Product.ProductsName : null,
                x.Product != null ? x.Product.ProductsBrand : null,
                x.Product != null && x.Product.Category != null ? x.Product.Category.CategoriesName : null,
                x.Product != null ? x.Product.ProductsDescription : null,
                x.Product != null ? x.Product.ProductsImageUrl : null,
                x.Product != null && x.Product.ProductsIsActive))
            .ToListAsync(ct);

        return ApiResponse<List<ClientInterestedProductDto>>.Success(list);
    }
}

public record AddClientInterestedProductCommand(int ClientId, int ProductId) : IRequest<ApiResponse<ClientInterestedProductDto>>;

public class AddClientInterestedProductCommandHandler(IApplicationDbContext db)
    : IRequestHandler<AddClientInterestedProductCommand, ApiResponse<ClientInterestedProductDto>>
{
    public async Task<ApiResponse<ClientInterestedProductDto>> Handle(
        AddClientInterestedProductCommand request, CancellationToken ct)
    {
        var exists = await db.ClientInterestedProducts.AnyAsync(
            x => x.ClientId == request.ClientId && x.ProductsId == request.ProductId, ct);

        if (exists)
            return ApiResponse<ClientInterestedProductDto>.Failure("Product already in client's interested list.");

        var item = new ClientInterestedProduct { ClientId = request.ClientId, ProductsId = request.ProductId };
        db.ClientInterestedProducts.Add(item);
        await db.SaveChangesAsync(ct);

        var product = await db.Products.AsNoTracking()
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.ProductsId == request.ProductId, ct);

        return ApiResponse<ClientInterestedProductDto>.Success(new ClientInterestedProductDto(
            request.ProductId,
            product?.ProductsName,
            product?.ProductsBrand,
            product?.Category?.CategoriesName,
            product?.ProductsDescription,
            product?.ProductsImageUrl,
            product?.ProductsIsActive ?? true));
    }
}

public record RemoveClientInterestedProductCommand(int ClientId, int ProductId) : IRequest<ApiResponse<object>>;

public class RemoveClientInterestedProductCommandHandler(IApplicationDbContext db)
    : IRequestHandler<RemoveClientInterestedProductCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(RemoveClientInterestedProductCommand request, CancellationToken ct)
    {
        var item = await db.ClientInterestedProducts
            .FirstOrDefaultAsync(x => x.ClientId == request.ClientId && x.ProductsId == request.ProductId, ct);

        if (item is null) return ApiResponse<object>.Failure("Record not found.");

        db.ClientInterestedProducts.Remove(item);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Removed.");
    }
}
