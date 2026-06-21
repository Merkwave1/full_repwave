using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Products;

// ── Response DTOs ─────────────────────────────────────────────────────────────

public record VariantInProductDto(
    int VariantId, string? VariantName, string? VariantSku, string? VariantBarcode,
    string? VariantImageUrl, decimal VariantUnitPrice, decimal VariantCostPrice,
    bool VariantHasTax, decimal VariantTaxRate, string VariantStatus,
    int? VariantOdooProductId, List<int>? AttributeValueIds = null);

public record ProductDto(
    int ProductsId, string ProductsName, int? ProductsCategoryId, int? ProductsUnitOfMeasureId,
    string? ProductsBrand, string? ProductsDescription, string? ProductsImageUrl, bool ProductsIsActive,
    decimal? ProductsWeight, decimal? ProductsVolume, bool ProductsHasTax, decimal ProductsTaxRate,
    DateTime? ProductsCreatedAt, DateTime? ProductsUpdatedAt,
    int? ProductsSupplierId = null, int? ProductsExpiryPeriodInDays = null,
    List<VariantInProductDto>? Variants = null, List<int>? PreferredPackagingIds = null);

// ── Request input DTOs ────────────────────────────────────────────────────────

public record CreateProductVariantData(
    int? VariantId,
    string? VariantName,
    string? VariantSku,
    string? VariantBarcode,
    string? VariantImageUrl,
    decimal? VariantUnitPrice = null,
    decimal? VariantCostPrice = null,
    decimal? VariantWeight = null,
    decimal? VariantVolume = null,
    string? VariantStatus = null,
    string? VariantNotes = null,
    bool VariantHasTax = false,
    decimal VariantTaxRate = 0,
    List<int>? AttributeValueIds = null);

public record CreateProductRequest(
    string ProductsName,
    int? ProductsCategoryId,
    int? ProductsUnitOfMeasureId,
    string? ProductsBrand,
    string? ProductsDescription,
    string? ProductsImageUrl,
    bool ProductsIsActive = true,
    decimal? ProductsWeight = null,
    decimal? ProductsVolume = null,
    bool ProductsHasTax = false,
    decimal ProductsTaxRate = 0,
    int? ProductsSupplierId = null,
    int? ProductsExpiryPeriodInDays = null,
    List<CreateProductVariantData>? VariantsData = null,
    List<int>? PreferredPackagingIds = null);

// ── Mapper helper ─────────────────────────────────────────────────────────────

internal static class ProductMapper
{
    internal static VariantInProductDto ToVariantDto(ProductVariant v) => new(
        v.VariantId, v.VariantName, v.VariantSku, v.VariantBarcode, v.VariantImageUrl,
        v.VariantUnitPrice, v.VariantCostPrice, v.VariantHasTax, v.VariantTaxRate, v.VariantStatus,
        v.VariantOdooProductId,
        (v.AttributeMappings ?? []).Select(a => a.VariantAttributeMapAttributeValueId).ToList());

    internal static ProductDto ToProductDto(Product p) => new(
        p.ProductsId, p.ProductsName, p.ProductsCategoryId, p.ProductsUnitOfMeasureId,
        p.ProductsBrand, p.ProductsDescription, p.ProductsImageUrl, p.ProductsIsActive,
        p.ProductsWeight, p.ProductsVolume, p.ProductsHasTax, p.ProductsTaxRate,
        p.ProductsCreatedAt, p.ProductsUpdatedAt, p.ProductsSupplierId, p.ProductsExpiryPeriodInDays,
        (p.Variants ?? []).Select(ToVariantDto).ToList(),
        (p.PreferredPackagings ?? []).Select(pp => pp.PackagingTypeId).ToList());
}

// ── Queries ───────────────────────────────────────────────────────────────────

public record GetAllProductsQuery(int Page = 1, int PageSize = 50, bool? IsActive = null)
    : IRequest<ApiResponse<PagedResult<ProductDto>>>;
public class GetAllProductsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllProductsQuery, ApiResponse<PagedResult<ProductDto>>>
{
    public async Task<ApiResponse<PagedResult<ProductDto>>> Handle(GetAllProductsQuery q, CancellationToken ct)
    {
        var query = db.Products.AsNoTracking();
        if (q.IsActive.HasValue) query = query.Where(p => p.ProductsIsActive == q.IsActive.Value);
        var total = await query.CountAsync(ct);
        var items = await query
            .Include(p => p.Variants).ThenInclude(v => v.AttributeMappings)
            .Include(p => p.PreferredPackagings)
            .OrderByDescending(p => p.ProductsCreatedAt)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .ToListAsync(ct);
        var dtos = items.Select(ProductMapper.ToProductDto).ToList();
        return ApiResponse<PagedResult<ProductDto>>.Success(new() { Data = dtos, TotalCount = total, Page = q.Page, PageSize = q.PageSize });
    }
}

public record GetProductByIdQuery(int Id) : IRequest<ApiResponse<ProductDto>>;
public class GetProductByIdQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetProductByIdQuery, ApiResponse<ProductDto>>
{
    public async Task<ApiResponse<ProductDto>> Handle(GetProductByIdQuery q, CancellationToken ct)
    {
        var p = await db.Products.AsNoTracking()
            .Include(x => x.Variants).ThenInclude(v => v.AttributeMappings)
            .Include(x => x.PreferredPackagings)
            .FirstOrDefaultAsync(x => x.ProductsId == q.Id, ct);
        if (p is null) return ApiResponse<ProductDto>.Failure("Product not found.");
        return ApiResponse<ProductDto>.Success(ProductMapper.ToProductDto(p));
    }
}

// ── Commands ──────────────────────────────────────────────────────────────────

public record CreateProductCommand(CreateProductRequest Request) : IRequest<ApiResponse<ProductDto>>;
public class CreateProductCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateProductCommand, ApiResponse<ProductDto>>
{
    public async Task<ApiResponse<ProductDto>> Handle(CreateProductCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;
        var product = new Product
        {
            ProductsName = r.ProductsName,
            ProductsCategoryId = r.ProductsCategoryId,
            ProductsUnitOfMeasureId = r.ProductsUnitOfMeasureId,
            ProductsBrand = r.ProductsBrand,
            ProductsDescription = r.ProductsDescription,
            ProductsImageUrl = r.ProductsImageUrl,
            ProductsIsActive = r.ProductsIsActive,
            ProductsWeight = r.ProductsWeight,
            ProductsVolume = r.ProductsVolume,
            ProductsHasTax = r.ProductsHasTax,
            ProductsTaxRate = r.ProductsTaxRate,
            ProductsSupplierId = r.ProductsSupplierId,
            ProductsExpiryPeriodInDays = r.ProductsExpiryPeriodInDays,
            ProductsCreatedAt = DateTime.UtcNow
        };
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);

        // Save variants
        if (r.VariantsData?.Count > 0)
        {
            foreach (var vd in r.VariantsData)
            {
                var variant = new ProductVariant
                {
                    VariantProductsId = product.ProductsId,
                    VariantName = vd.VariantName,
                    VariantSku = vd.VariantSku,
                    VariantBarcode = vd.VariantBarcode,
                    VariantImageUrl = vd.VariantImageUrl,
                    VariantUnitPrice = vd.VariantUnitPrice ?? 0,
                    VariantCostPrice = vd.VariantCostPrice ?? 0,
                    VariantWeight = vd.VariantWeight,
                    VariantVolume = vd.VariantVolume,
                    VariantStatus = vd.VariantStatus ?? "active",
                    VariantNotes = vd.VariantNotes,
                    VariantHasTax = vd.VariantHasTax,
                    VariantTaxRate = vd.VariantTaxRate
                };
                db.ProductVariants.Add(variant);
                await db.SaveChangesAsync(ct);

                if (vd.AttributeValueIds?.Count > 0)
                {
                    foreach (var attrId in vd.AttributeValueIds)
                        db.ProductVariantAttributeMaps.Add(new ProductVariantAttributeMap
                        {
                            VariantAttributeMapVariantId = variant.VariantId,
                            VariantAttributeMapAttributeValueId = attrId
                        });
                    await db.SaveChangesAsync(ct);
                }
            }
        }

        // Save preferred packagings
        if (r.PreferredPackagingIds?.Count > 0)
        {
            foreach (var pkgId in r.PreferredPackagingIds)
                db.ProductPreferredPackagings.Add(new ProductPreferredPackaging
                {
                    ProductsId = product.ProductsId,
                    PackagingTypeId = pkgId
                });
            await db.SaveChangesAsync(ct);
        }

        // Reload with includes to return accurate data
        var saved = await db.Products.AsNoTracking()
            .Include(p => p.Variants).ThenInclude(v => v.AttributeMappings)
            .Include(p => p.PreferredPackagings)
            .FirstAsync(p => p.ProductsId == product.ProductsId, ct);
        return ApiResponse<ProductDto>.Success(ProductMapper.ToProductDto(saved));
    }
}

public record UpdateProductCommand(int Id, CreateProductRequest Request) : IRequest<ApiResponse<ProductDto>>;
public class UpdateProductCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateProductCommand, ApiResponse<ProductDto>>
{
    public async Task<ApiResponse<ProductDto>> Handle(UpdateProductCommand cmd, CancellationToken ct)
    {
        var p = await db.Products.FindAsync([cmd.Id], ct);
        if (p is null) return ApiResponse<ProductDto>.Failure("Product not found.");
        var r = cmd.Request;
        p.ProductsName = r.ProductsName; p.ProductsCategoryId = r.ProductsCategoryId;
        p.ProductsUnitOfMeasureId = r.ProductsUnitOfMeasureId; p.ProductsBrand = r.ProductsBrand;
        p.ProductsDescription = r.ProductsDescription; p.ProductsImageUrl = r.ProductsImageUrl;
        p.ProductsIsActive = r.ProductsIsActive; p.ProductsHasTax = r.ProductsHasTax;
        p.ProductsTaxRate = r.ProductsTaxRate; p.ProductsWeight = r.ProductsWeight;
        p.ProductsVolume = r.ProductsVolume; p.ProductsSupplierId = r.ProductsSupplierId;
        p.ProductsExpiryPeriodInDays = r.ProductsExpiryPeriodInDays;
        p.ProductsUpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Sync variants
        if (r.VariantsData is not null)
        {
            var existing = await db.ProductVariants
                .Where(v => v.VariantProductsId == cmd.Id)
                .Include(v => v.AttributeMappings)
                .ToListAsync(ct);

            var incomingIds = r.VariantsData
                .Where(v => v.VariantId.HasValue)
                .Select(v => v.VariantId!.Value)
                .ToHashSet();

            // Delete variants not present in the incoming payload
            var toDelete = existing.Where(v => !incomingIds.Contains(v.VariantId)).ToList();
            db.ProductVariants.RemoveRange(toDelete);

            foreach (var vd in r.VariantsData)
            {
                if (vd.VariantId.HasValue)
                {
                    var v = existing.FirstOrDefault(x => x.VariantId == vd.VariantId.Value);
                    if (v is not null)
                    {
                        v.VariantName = vd.VariantName;
                        v.VariantSku = vd.VariantSku;
                        v.VariantBarcode = vd.VariantBarcode;
                        v.VariantImageUrl = vd.VariantImageUrl;
                        v.VariantUnitPrice = vd.VariantUnitPrice ?? v.VariantUnitPrice;
                        v.VariantCostPrice = vd.VariantCostPrice ?? v.VariantCostPrice;
                        v.VariantWeight = vd.VariantWeight;
                        v.VariantVolume = vd.VariantVolume;
                        v.VariantStatus = vd.VariantStatus ?? v.VariantStatus;
                        v.VariantNotes = vd.VariantNotes;
                        v.VariantHasTax = vd.VariantHasTax;
                        v.VariantTaxRate = vd.VariantTaxRate;

                        // Sync attribute mappings
                        if (vd.AttributeValueIds is not null)
                        {
                            db.ProductVariantAttributeMaps.RemoveRange(v.AttributeMappings);
                            foreach (var attrId in vd.AttributeValueIds)
                                db.ProductVariantAttributeMaps.Add(new ProductVariantAttributeMap
                                {
                                    VariantAttributeMapVariantId = v.VariantId,
                                    VariantAttributeMapAttributeValueId = attrId
                                });
                        }
                    }
                }
                else
                {
                    // New variant
                    var newVariant = new ProductVariant
                    {
                        VariantProductsId = cmd.Id,
                        VariantName = vd.VariantName,
                        VariantSku = vd.VariantSku,
                        VariantBarcode = vd.VariantBarcode,
                        VariantImageUrl = vd.VariantImageUrl,
                        VariantUnitPrice = vd.VariantUnitPrice ?? 0,
                        VariantCostPrice = vd.VariantCostPrice ?? 0,
                        VariantWeight = vd.VariantWeight,
                        VariantVolume = vd.VariantVolume,
                        VariantStatus = vd.VariantStatus ?? "active",
                        VariantNotes = vd.VariantNotes,
                        VariantHasTax = vd.VariantHasTax,
                        VariantTaxRate = vd.VariantTaxRate
                    };
                    db.ProductVariants.Add(newVariant);
                    await db.SaveChangesAsync(ct);

                    if (vd.AttributeValueIds?.Count > 0)
                    {
                        foreach (var attrId in vd.AttributeValueIds)
                            db.ProductVariantAttributeMaps.Add(new ProductVariantAttributeMap
                            {
                                VariantAttributeMapVariantId = newVariant.VariantId,
                                VariantAttributeMapAttributeValueId = attrId
                            });
                    }
                }
            }
            await db.SaveChangesAsync(ct);
        }

        // Sync preferred packagings
        if (r.PreferredPackagingIds is not null)
        {
            var existingPkg = await db.ProductPreferredPackagings
                .Where(x => x.ProductsId == cmd.Id)
                .ToListAsync(ct);
            db.ProductPreferredPackagings.RemoveRange(existingPkg);
            foreach (var pkgId in r.PreferredPackagingIds)
                db.ProductPreferredPackagings.Add(new ProductPreferredPackaging
                {
                    ProductsId = cmd.Id,
                    PackagingTypeId = pkgId
                });
            await db.SaveChangesAsync(ct);
        }

        // Reload with includes
        var updated = await db.Products.AsNoTracking()
            .Include(x => x.Variants).ThenInclude(v => v.AttributeMappings)
            .Include(x => x.PreferredPackagings)
            .FirstAsync(x => x.ProductsId == cmd.Id, ct);
        return ApiResponse<ProductDto>.Success(ProductMapper.ToProductDto(updated));
    }
}

public record DeleteProductCommand(int Id) : IRequest<ApiResponse<object>>;
public class DeleteProductCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteProductCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteProductCommand cmd, CancellationToken ct)
    {
        var p = await db.Products.FindAsync([cmd.Id], ct);
        if (p is null) return ApiResponse<object>.Failure("Product not found.");
        db.Products.Remove(p);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Product deleted.");
    }
}
