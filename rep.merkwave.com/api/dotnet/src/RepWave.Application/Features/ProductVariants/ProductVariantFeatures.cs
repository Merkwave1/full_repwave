using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.ProductVariants;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record ProductVariantDto(
    int VariantId,
    int VariantProductsId,
    string? ProductName,
    string? VariantName,
    string? VariantSku,
    string? VariantBarcode,
    string? VariantImageUrl,
    decimal VariantUnitPrice,
    decimal VariantCostPrice,
    decimal? VariantWeight,
    decimal? VariantVolume,
    string VariantStatus,
    string? VariantNotes,
    bool VariantHasTax,
    decimal VariantTaxRate,
    List<VariantAttributeDto> Attributes);

public record VariantAttributeDto(int AttributeValueId, string? AttributeName, string? ValueText);

public record ProductAttributeDto(int AttributeId, string AttributeName, string? AttributeDescription);

public record ProductAttributeValueDto(int AttributeValueId, int AttributeValueAttributeId, string? AttributeName, string ValueText);

public record PackagingTypeDto(
    int PackagingTypesId,
    string PackagingTypesName,
    string? PackagingTypesDescription,
    decimal PackagingTypesDefaultConversionFactor,
    int? PackagingTypesCompatibleBaseUnitId);

public record UpsertProductVariantRequest(
    int ProductId,
    string? VariantName,
    string? VariantSku,
    string? VariantBarcode,
    string? VariantImageUrl,
    decimal VariantUnitPrice,
    decimal VariantCostPrice,
    decimal? VariantWeight,
    decimal? VariantVolume,
    string VariantStatus,
    string? VariantNotes,
    bool VariantHasTax,
    decimal VariantTaxRate,
    List<int>? AttributeValueIds);

public record UpsertProductAttributeRequest(string AttributeName, string? AttributeDescription);

public record UpsertAttributeValueRequest(int AttributeValueAttributeId, string AttributeValueValue);

public record UpsertPackagingTypeRequest(string PackagingTypesName, string? PackagingTypesDescription, decimal PackagingTypesDefaultConversionFactor = 1);

// ── Product Variants ──────────────────────────────────────────────────────────

public record GetProductVariantsQuery(int ProductId) : IRequest<ApiResponse<List<ProductVariantDto>>>;

public class GetProductVariantsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetProductVariantsQuery, ApiResponse<List<ProductVariantDto>>>
{
    public async Task<ApiResponse<List<ProductVariantDto>>> Handle(GetProductVariantsQuery request, CancellationToken ct)
    {
        var variants = await db.ProductVariants.AsNoTracking()
            .Include(v => v.Product)
            .Include(v => v.AttributeMappings)
                .ThenInclude(m => m.AttributeValue)
                    .ThenInclude(av => av != null ? av.Attribute : null)
            .Where(v => v.VariantProductsId == request.ProductId)
            .ToListAsync(ct);

        var list = variants.Select(v => MapToDto(v)).ToList();
        return ApiResponse<List<ProductVariantDto>>.Success(list);
    }

    private static ProductVariantDto MapToDto(ProductVariant v) => new(
        v.VariantId, v.VariantProductsId, v.Product?.ProductsName,
        v.VariantName, v.VariantSku, v.VariantBarcode, v.VariantImageUrl,
        v.VariantUnitPrice, v.VariantCostPrice, v.VariantWeight, v.VariantVolume,
        v.VariantStatus, v.VariantNotes, v.VariantHasTax, v.VariantTaxRate,
        v.AttributeMappings.Select(m => new VariantAttributeDto(
            m.VariantAttributeMapAttributeValueId,
            m.AttributeValue?.Attribute?.AttributeName,
            m.AttributeValue?.AttributeValueValue)).ToList());
}

public record GetProductVariantByIdQuery(int Id) : IRequest<ApiResponse<ProductVariantDto>>;

public class GetProductVariantByIdQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetProductVariantByIdQuery, ApiResponse<ProductVariantDto>>
{
    public async Task<ApiResponse<ProductVariantDto>> Handle(GetProductVariantByIdQuery request, CancellationToken ct)
    {
        var v = await db.ProductVariants.AsNoTracking()
            .Include(x => x.Product)
            .Include(x => x.AttributeMappings)
                .ThenInclude(m => m.AttributeValue)
                    .ThenInclude(av => av != null ? av.Attribute : null)
            .FirstOrDefaultAsync(x => x.VariantId == request.Id, ct);

        if (v is null) return ApiResponse<ProductVariantDto>.Failure("Variant not found.");

        return ApiResponse<ProductVariantDto>.Success(new ProductVariantDto(
            v.VariantId, v.VariantProductsId, v.Product?.ProductsName,
            v.VariantName, v.VariantSku, v.VariantBarcode, v.VariantImageUrl,
            v.VariantUnitPrice, v.VariantCostPrice, v.VariantWeight, v.VariantVolume,
            v.VariantStatus, v.VariantNotes, v.VariantHasTax, v.VariantTaxRate,
            v.AttributeMappings.Select(m => new VariantAttributeDto(
                m.VariantAttributeMapAttributeValueId,
                m.AttributeValue?.Attribute?.AttributeName,
                m.AttributeValue?.AttributeValueValue)).ToList()));
    }
}

public record CreateProductVariantCommand(UpsertProductVariantRequest Req) : IRequest<ApiResponse<ProductVariantDto>>;

public class CreateProductVariantCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateProductVariantCommand, ApiResponse<ProductVariantDto>>
{
    public async Task<ApiResponse<ProductVariantDto>> Handle(CreateProductVariantCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var variant = new ProductVariant
        {
            VariantProductsId = r.ProductId,
            VariantName = r.VariantName,
            VariantSku = r.VariantSku,
            VariantBarcode = r.VariantBarcode,
            VariantImageUrl = r.VariantImageUrl,
            VariantUnitPrice = r.VariantUnitPrice,
            VariantCostPrice = r.VariantCostPrice,
            VariantWeight = r.VariantWeight,
            VariantVolume = r.VariantVolume,
            VariantStatus = r.VariantStatus,
            VariantNotes = r.VariantNotes,
            VariantHasTax = r.VariantHasTax,
            VariantTaxRate = r.VariantTaxRate
        };

        db.ProductVariants.Add(variant);
        await db.SaveChangesAsync(ct);

        if (r.AttributeValueIds?.Any() == true)
        {
            foreach (var valueId in r.AttributeValueIds)
            {
                db.ProductVariantAttributeMaps.Add(new ProductVariantAttributeMap
                {
                    VariantAttributeMapVariantId = variant.VariantId,
                    VariantAttributeMapAttributeValueId = valueId
                });
            }
            await db.SaveChangesAsync(ct);
        }

        return ApiResponse<ProductVariantDto>.Success(new ProductVariantDto(
            variant.VariantId, variant.VariantProductsId, null,
            variant.VariantName, variant.VariantSku, variant.VariantBarcode,
            variant.VariantImageUrl, variant.VariantUnitPrice, variant.VariantCostPrice,
            variant.VariantWeight, variant.VariantVolume, variant.VariantStatus,
            variant.VariantNotes, variant.VariantHasTax, variant.VariantTaxRate, []));
    }
}

public record UpdateProductVariantCommand(int Id, UpsertProductVariantRequest Req) : IRequest<ApiResponse<ProductVariantDto>>;

public class UpdateProductVariantCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateProductVariantCommand, ApiResponse<ProductVariantDto>>
{
    public async Task<ApiResponse<ProductVariantDto>> Handle(UpdateProductVariantCommand request, CancellationToken ct)
    {
        var v = await db.ProductVariants.FindAsync([request.Id], ct);
        if (v is null) return ApiResponse<ProductVariantDto>.Failure("Variant not found.");

        var r = request.Req;
        v.VariantName = r.VariantName;
        v.VariantSku = r.VariantSku;
        v.VariantBarcode = r.VariantBarcode;
        v.VariantImageUrl = r.VariantImageUrl;
        v.VariantUnitPrice = r.VariantUnitPrice;
        v.VariantCostPrice = r.VariantCostPrice;
        v.VariantWeight = r.VariantWeight;
        v.VariantVolume = r.VariantVolume;
        v.VariantStatus = r.VariantStatus;
        v.VariantNotes = r.VariantNotes;
        v.VariantHasTax = r.VariantHasTax;
        v.VariantTaxRate = r.VariantTaxRate;

        await db.SaveChangesAsync(ct);
        return ApiResponse<ProductVariantDto>.Success(new ProductVariantDto(
            v.VariantId, v.VariantProductsId, null,
            v.VariantName, v.VariantSku, v.VariantBarcode, v.VariantImageUrl,
            v.VariantUnitPrice, v.VariantCostPrice, v.VariantWeight, v.VariantVolume,
            v.VariantStatus, v.VariantNotes, v.VariantHasTax, v.VariantTaxRate, []));
    }
}

public record DeleteProductVariantCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteProductVariantCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteProductVariantCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteProductVariantCommand request, CancellationToken ct)
    {
        var v = await db.ProductVariants.FindAsync([request.Id], ct);
        if (v is null) return ApiResponse<object>.Failure("Variant not found.");
        db.ProductVariants.Remove(v);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Variant deleted.");
    }
}

// ── Product Attributes ────────────────────────────────────────────────────────

public record GetProductAttributesQuery : IRequest<ApiResponse<List<ProductAttributeDto>>>;

public class GetProductAttributesQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetProductAttributesQuery, ApiResponse<List<ProductAttributeDto>>>
{
    public async Task<ApiResponse<List<ProductAttributeDto>>> Handle(GetProductAttributesQuery request, CancellationToken ct)
    {
        var list = await db.ProductAttributes.AsNoTracking()
            .OrderBy(a => a.AttributeName)
            .Select(a => new ProductAttributeDto(a.AttributeId, a.AttributeName ?? "", a.AttributeDescription))
            .ToListAsync(ct);
        return ApiResponse<List<ProductAttributeDto>>.Success(list);
    }
}

public record CreateProductAttributeCommand(UpsertProductAttributeRequest Req) : IRequest<ApiResponse<ProductAttributeDto>>;

public class CreateProductAttributeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateProductAttributeCommand, ApiResponse<ProductAttributeDto>>
{
    public async Task<ApiResponse<ProductAttributeDto>> Handle(CreateProductAttributeCommand request, CancellationToken ct)
    {
        var a = new ProductAttribute
        {
            AttributeName = request.Req.AttributeName,
            AttributeDescription = request.Req.AttributeDescription
        };
        db.ProductAttributes.Add(a);
        await db.SaveChangesAsync(ct);
        return ApiResponse<ProductAttributeDto>.Success(
            new ProductAttributeDto(a.AttributeId, a.AttributeName!, a.AttributeDescription));
    }
}

public record UpdateProductAttributeCommand(int Id, UpsertProductAttributeRequest Req) : IRequest<ApiResponse<ProductAttributeDto>>;

public class UpdateProductAttributeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateProductAttributeCommand, ApiResponse<ProductAttributeDto>>
{
    public async Task<ApiResponse<ProductAttributeDto>> Handle(UpdateProductAttributeCommand request, CancellationToken ct)
    {
        var a = await db.ProductAttributes.FindAsync([request.Id], ct);
        if (a is null) return ApiResponse<ProductAttributeDto>.Failure("Attribute not found.");
        a.AttributeName = request.Req.AttributeName;
        a.AttributeDescription = request.Req.AttributeDescription;
        await db.SaveChangesAsync(ct);
        return ApiResponse<ProductAttributeDto>.Success(
            new ProductAttributeDto(a.AttributeId, a.AttributeName!, a.AttributeDescription));
    }
}

public record DeleteProductAttributeCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteProductAttributeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteProductAttributeCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteProductAttributeCommand request, CancellationToken ct)
    {
        var a = await db.ProductAttributes.FindAsync([request.Id], ct);
        if (a is null) return ApiResponse<object>.Failure("Attribute not found.");
        db.ProductAttributes.Remove(a);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Attribute deleted.");
    }
}

// ── Attribute Values ──────────────────────────────────────────────────────────

public record GetAttributeValuesQuery(int AttributeId) : IRequest<ApiResponse<List<ProductAttributeValueDto>>>;

public class GetAttributeValuesQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAttributeValuesQuery, ApiResponse<List<ProductAttributeValueDto>>>
{
    public async Task<ApiResponse<List<ProductAttributeValueDto>>> Handle(GetAttributeValuesQuery request, CancellationToken ct)
    {
        var list = await db.ProductAttributeValues.AsNoTracking()
            .Include(v => v.Attribute)
            .Where(v => v.AttributeValueAttributeId == request.AttributeId)
            .Select(v => new ProductAttributeValueDto(
                v.AttributeValueId, v.AttributeValueAttributeId,
                v.Attribute != null ? v.Attribute.AttributeName : null,
                v.AttributeValueValue))
            .ToListAsync(ct);
        return ApiResponse<List<ProductAttributeValueDto>>.Success(list);
    }
}

public record CreateAttributeValueCommand(UpsertAttributeValueRequest Req) : IRequest<ApiResponse<ProductAttributeValueDto>>;

public class CreateAttributeValueCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateAttributeValueCommand, ApiResponse<ProductAttributeValueDto>>
{
    public async Task<ApiResponse<ProductAttributeValueDto>> Handle(CreateAttributeValueCommand request, CancellationToken ct)
    {
        var v = new ProductAttributeValue
        {
            AttributeValueAttributeId = request.Req.AttributeValueAttributeId,
            AttributeValueValue = request.Req.AttributeValueValue
        };
        db.ProductAttributeValues.Add(v);
        await db.SaveChangesAsync(ct);
        return ApiResponse<ProductAttributeValueDto>.Success(
            new ProductAttributeValueDto(v.AttributeValueId, v.AttributeValueAttributeId, null, v.AttributeValueValue));
    }
}

public record DeleteAttributeValueCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteAttributeValueCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteAttributeValueCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteAttributeValueCommand request, CancellationToken ct)
    {
        var v = await db.ProductAttributeValues.FindAsync([request.Id], ct);
        if (v is null) return ApiResponse<object>.Failure("Value not found.");
        db.ProductAttributeValues.Remove(v);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Value deleted.");
    }
}

// ── Packaging Types ───────────────────────────────────────────────────────────

public record GetPackagingTypesQuery : IRequest<ApiResponse<List<PackagingTypeDto>>>;

public class GetPackagingTypesQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetPackagingTypesQuery, ApiResponse<List<PackagingTypeDto>>>
{
    public async Task<ApiResponse<List<PackagingTypeDto>>> Handle(GetPackagingTypesQuery request, CancellationToken ct)
    {
        var list = await db.PackagingTypes.AsNoTracking()
            .Select(p => new PackagingTypeDto(
                p.PackagingTypesId,
                p.PackagingTypesName,
                p.PackagingTypesDescription,
                p.PackagingTypesDefaultConversionFactor,
                p.PackagingTypesCompatibleBaseUnitId))
            .ToListAsync(ct);
        return ApiResponse<List<PackagingTypeDto>>.Success(list);
    }
}

public record CreatePackagingTypeCommand(UpsertPackagingTypeRequest Req) : IRequest<ApiResponse<PackagingTypeDto>>;

public class CreatePackagingTypeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreatePackagingTypeCommand, ApiResponse<PackagingTypeDto>>
{
    public async Task<ApiResponse<PackagingTypeDto>> Handle(CreatePackagingTypeCommand request, CancellationToken ct)
    {
        var pt = new PackagingType
        {
            PackagingTypesName = request.Req.PackagingTypesName,
            PackagingTypesDescription = request.Req.PackagingTypesDescription,
            PackagingTypesDefaultConversionFactor = request.Req.PackagingTypesDefaultConversionFactor
        };
        db.PackagingTypes.Add(pt);
        await db.SaveChangesAsync(ct);
        return ApiResponse<PackagingTypeDto>.Success(
            new PackagingTypeDto(
                pt.PackagingTypesId,
                pt.PackagingTypesName,
                pt.PackagingTypesDescription,
                pt.PackagingTypesDefaultConversionFactor,
                pt.PackagingTypesCompatibleBaseUnitId));
    }
}

public record UpdatePackagingTypeCommand(int Id, UpsertPackagingTypeRequest Req) : IRequest<ApiResponse<PackagingTypeDto>>;

public class UpdatePackagingTypeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdatePackagingTypeCommand, ApiResponse<PackagingTypeDto>>
{
    public async Task<ApiResponse<PackagingTypeDto>> Handle(UpdatePackagingTypeCommand request, CancellationToken ct)
    {
        var pt = await db.PackagingTypes.FindAsync([request.Id], ct);
        if (pt is null) return ApiResponse<PackagingTypeDto>.Failure("Packaging type not found.");
        pt.PackagingTypesName = request.Req.PackagingTypesName;
        pt.PackagingTypesDescription = request.Req.PackagingTypesDescription;
        pt.PackagingTypesDefaultConversionFactor = request.Req.PackagingTypesDefaultConversionFactor;
        await db.SaveChangesAsync(ct);
        return ApiResponse<PackagingTypeDto>.Success(
            new PackagingTypeDto(
                pt.PackagingTypesId,
                pt.PackagingTypesName,
                pt.PackagingTypesDescription,
                pt.PackagingTypesDefaultConversionFactor,
                pt.PackagingTypesCompatibleBaseUnitId));
    }
}

public record DeletePackagingTypeCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeletePackagingTypeCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeletePackagingTypeCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeletePackagingTypeCommand request, CancellationToken ct)
    {
        var pt = await db.PackagingTypes.FindAsync([request.Id], ct);
        if (pt is null) return ApiResponse<object>.Failure("Packaging type not found.");
        db.PackagingTypes.Remove(pt);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Packaging type deleted.");
    }
}