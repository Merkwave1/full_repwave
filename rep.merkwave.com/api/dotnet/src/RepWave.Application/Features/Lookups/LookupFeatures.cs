using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Lookups;

// ─── Categories ──────────────────────────────────────────────────────────────
public record CategoryDto(int CategoriesId, string CategoriesName, string? CategoriesDescription);
public record UpsertCategoryRequest(string CategoriesName, string? CategoriesDescription);

public record GetAllCategoriesQuery : IRequest<ApiResponse<List<CategoryDto>>>;
public class GetAllCategoriesHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllCategoriesQuery, ApiResponse<List<CategoryDto>>>
{
    public async Task<ApiResponse<List<CategoryDto>>> Handle(GetAllCategoriesQuery _, CancellationToken ct)
    {
        var items = await db.Categories.AsNoTracking()
            .Select(c => new CategoryDto(c.CategoriesId, c.CategoriesName, c.CategoriesDescription))
            .ToListAsync(ct);
        return ApiResponse<List<CategoryDto>>.Success(items);
    }
}
public record CreateCategoryCommand(UpsertCategoryRequest Request) : IRequest<ApiResponse<CategoryDto>>;
public class CreateCategoryHandler(IApplicationDbContext db)
    : IRequestHandler<CreateCategoryCommand, ApiResponse<CategoryDto>>
{
    public async Task<ApiResponse<CategoryDto>> Handle(CreateCategoryCommand cmd, CancellationToken ct)
    {
        if (await db.Categories.AnyAsync(c => c.CategoriesName == cmd.Request.CategoriesName, ct))
            return ApiResponse<CategoryDto>.Failure("Category name already exists.");
        var c = new Category { CategoriesName = cmd.Request.CategoriesName, CategoriesDescription = cmd.Request.CategoriesDescription };
        db.Categories.Add(c);
        await db.SaveChangesAsync(ct);
        return ApiResponse<CategoryDto>.Success(new CategoryDto(c.CategoriesId, c.CategoriesName, c.CategoriesDescription));
    }
}
public record UpdateCategoryCommand(int Id, UpsertCategoryRequest Request) : IRequest<ApiResponse<CategoryDto>>;
public class UpdateCategoryHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateCategoryCommand, ApiResponse<CategoryDto>>
{
    public async Task<ApiResponse<CategoryDto>> Handle(UpdateCategoryCommand cmd, CancellationToken ct)
    {
        var c = await db.Categories.FindAsync([cmd.Id], ct);
        if (c is null) return ApiResponse<CategoryDto>.Failure("Category not found.");
        c.CategoriesName = cmd.Request.CategoriesName; c.CategoriesDescription = cmd.Request.CategoriesDescription;
        await db.SaveChangesAsync(ct);
        return ApiResponse<CategoryDto>.Success(new CategoryDto(c.CategoriesId, c.CategoriesName, c.CategoriesDescription));
    }
}
public record DeleteCategoryCommand(int Id) : IRequest<ApiResponse<object>>;
public class DeleteCategoryHandler(IApplicationDbContext db) : IRequestHandler<DeleteCategoryCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteCategoryCommand cmd, CancellationToken ct)
    {
        var c = await db.Categories.FindAsync([cmd.Id], ct);
        if (c is null) return ApiResponse<object>.Failure("Category not found.");
        db.Categories.Remove(c); await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Category deleted.");
    }
}

// ─── Base Units ──────────────────────────────────────────────────────────────
public record BaseUnitDto(int BaseUnitsId, string BaseUnitsName, string? BaseUnitsDescription);
public record UpsertBaseUnitRequest(string BaseUnitsName, string? BaseUnitsDescription);

public record GetAllBaseUnitsQuery : IRequest<ApiResponse<List<BaseUnitDto>>>;
public class GetAllBaseUnitsHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllBaseUnitsQuery, ApiResponse<List<BaseUnitDto>>>
{
    public async Task<ApiResponse<List<BaseUnitDto>>> Handle(GetAllBaseUnitsQuery _, CancellationToken ct)
        => ApiResponse<List<BaseUnitDto>>.Success(await db.BaseUnits.AsNoTracking()
            .Select(b => new BaseUnitDto(b.BaseUnitsId, b.BaseUnitsName, b.BaseUnitsDescription)).ToListAsync(ct));
}
public record CreateBaseUnitCommand(UpsertBaseUnitRequest Request) : IRequest<ApiResponse<BaseUnitDto>>;
public class CreateBaseUnitHandler(IApplicationDbContext db)
    : IRequestHandler<CreateBaseUnitCommand, ApiResponse<BaseUnitDto>>
{
    public async Task<ApiResponse<BaseUnitDto>> Handle(CreateBaseUnitCommand cmd, CancellationToken ct)
    {
        var b = new BaseUnit { BaseUnitsName = cmd.Request.BaseUnitsName, BaseUnitsDescription = cmd.Request.BaseUnitsDescription };
        db.BaseUnits.Add(b); await db.SaveChangesAsync(ct);
        return ApiResponse<BaseUnitDto>.Success(new BaseUnitDto(b.BaseUnitsId, b.BaseUnitsName, b.BaseUnitsDescription));
    }
}
public record UpdateBaseUnitCommand(int Id, UpsertBaseUnitRequest Request) : IRequest<ApiResponse<BaseUnitDto>>;
public class UpdateBaseUnitHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateBaseUnitCommand, ApiResponse<BaseUnitDto>>
{
    public async Task<ApiResponse<BaseUnitDto>> Handle(UpdateBaseUnitCommand cmd, CancellationToken ct)
    {
        var b = await db.BaseUnits.FindAsync([cmd.Id], ct);
        if (b is null) return ApiResponse<BaseUnitDto>.Failure("Base unit not found.");
        b.BaseUnitsName = cmd.Request.BaseUnitsName; b.BaseUnitsDescription = cmd.Request.BaseUnitsDescription;
        await db.SaveChangesAsync(ct);
        return ApiResponse<BaseUnitDto>.Success(new BaseUnitDto(b.BaseUnitsId, b.BaseUnitsName, b.BaseUnitsDescription));
    }
}
public record DeleteBaseUnitCommand(int Id) : IRequest<ApiResponse<object>>;
public class DeleteBaseUnitHandler(IApplicationDbContext db) : IRequestHandler<DeleteBaseUnitCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteBaseUnitCommand cmd, CancellationToken ct)
    {
        var b = await db.BaseUnits.FindAsync([cmd.Id], ct);
        if (b is null) return ApiResponse<object>.Failure("Base unit not found.");
        db.BaseUnits.Remove(b); await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Base unit deleted.");
    }
}

// ─── Countries & Governorates ────────────────────────────────────────────────
public record CountryDto(int CountriesId, string CountriesNameAr, string? CountriesNameEn, int CountriesSortOrder);
public record GovernorateDto(int GovernoratesId, string GovernoratesNameAr, string? GovernoratesNameEn, int? GovernoratesCountryId, int GovernoratesSortOrder);
public record GovernorateSimpleDto(int GovernoratesId, string GovernoratesNameAr, string? GovernoratesNameEn, int GovernoratesSortOrder);
public record CountryWithGovernoratesDto(int CountriesId, string CountriesNameAr, string? CountriesNameEn, int CountriesSortOrder, List<GovernorateSimpleDto> Governorates);

public record GetAllCountriesQuery : IRequest<ApiResponse<List<CountryWithGovernoratesDto>>>;
public class GetAllCountriesHandler(IApplicationDbContext db) : IRequestHandler<GetAllCountriesQuery, ApiResponse<List<CountryWithGovernoratesDto>>>
{
    public async Task<ApiResponse<List<CountryWithGovernoratesDto>>> Handle(GetAllCountriesQuery _, CancellationToken ct)
    {
        var countries = await db.Countries.AsNoTracking().OrderBy(c => c.CountriesSortOrder).ToListAsync(ct);
        var governorates = await db.Governorates.AsNoTracking().OrderBy(g => g.GovernoratesSortOrder).ToListAsync(ct);
        var result = countries.Select(c => new CountryWithGovernoratesDto(
            c.CountriesId, c.CountriesNameAr, c.CountriesNameEn, c.CountriesSortOrder,
            governorates.Where(g => g.GovernoratesCountryId == c.CountriesId)
                .Select(g => new GovernorateSimpleDto(g.GovernoratesId, g.GovernoratesNameAr, g.GovernoratesNameEn, g.GovernoratesSortOrder))
                .ToList()
        )).ToList();
        return ApiResponse<List<CountryWithGovernoratesDto>>.Success(result);
    }
}

public record GetAllGovernoratesQuery(int? CountryId = null) : IRequest<ApiResponse<List<GovernorateDto>>>;
public class GetAllGovernoratesHandler(IApplicationDbContext db) : IRequestHandler<GetAllGovernoratesQuery, ApiResponse<List<GovernorateDto>>>
{
    public async Task<ApiResponse<List<GovernorateDto>>> Handle(GetAllGovernoratesQuery q, CancellationToken ct)
    {
        var query = db.Governorates.AsNoTracking();
        if (q.CountryId.HasValue) query = query.Where(g => g.GovernoratesCountryId == q.CountryId);
        return ApiResponse<List<GovernorateDto>>.Success(await query.OrderBy(g => g.GovernoratesSortOrder)
            .Select(g => new GovernorateDto(g.GovernoratesId, g.GovernoratesNameAr, g.GovernoratesNameEn, g.GovernoratesCountryId, g.GovernoratesSortOrder)).ToListAsync(ct));
    }
}

// ─── Client Lookups ──────────────────────────────────────────────────────────
public record ClientAreaTagDto(int ClientAreaTagId, string ClientAreaTagName, int ClientAreaTagSortOrder);
public record ClientTypeDto(int ClientTypeId, string ClientTypeName, int ClientTypeSortOrder);
public record ClientIndustryDto(int ClientIndustriesId, string ClientIndustriesName, int ClientIndustriesSortOrder);
public record ClientDocumentTypeDto(int DocumentTypeId, string DocumentTypeName);
public record PaymentMethodDto(int PaymentMethodsId, string PaymentMethodsName, string? PaymentMethodsType);

public record GetAllClientAreaTagsQuery : IRequest<ApiResponse<List<ClientAreaTagDto>>>;
public class GetAllClientAreaTagsHandler(IApplicationDbContext db) : IRequestHandler<GetAllClientAreaTagsQuery, ApiResponse<List<ClientAreaTagDto>>>
{
    public async Task<ApiResponse<List<ClientAreaTagDto>>> Handle(GetAllClientAreaTagsQuery _, CancellationToken ct)
        => ApiResponse<List<ClientAreaTagDto>>.Success(await db.ClientAreaTags.AsNoTracking()
            .Select(t => new ClientAreaTagDto(t.ClientAreaTagId, t.ClientAreaTagName, t.ClientAreaTagSortOrder)).ToListAsync(ct));
}

public record GetAllClientTypesQuery : IRequest<ApiResponse<List<ClientTypeDto>>>;
public class GetAllClientTypesHandler(IApplicationDbContext db) : IRequestHandler<GetAllClientTypesQuery, ApiResponse<List<ClientTypeDto>>>
{
    public async Task<ApiResponse<List<ClientTypeDto>>> Handle(GetAllClientTypesQuery _, CancellationToken ct)
        => ApiResponse<List<ClientTypeDto>>.Success(await db.ClientTypes.AsNoTracking()
            .Select(t => new ClientTypeDto(t.ClientTypeId, t.ClientTypeName, t.ClientTypeSortOrder)).ToListAsync(ct));
}

public record GetAllClientIndustriesQuery : IRequest<ApiResponse<List<ClientIndustryDto>>>;
public class GetAllClientIndustriesHandler(IApplicationDbContext db) : IRequestHandler<GetAllClientIndustriesQuery, ApiResponse<List<ClientIndustryDto>>>
{
    public async Task<ApiResponse<List<ClientIndustryDto>>> Handle(GetAllClientIndustriesQuery _, CancellationToken ct)
        => ApiResponse<List<ClientIndustryDto>>.Success(await db.ClientIndustries.AsNoTracking()
            .Select(i => new ClientIndustryDto(i.ClientIndustriesId, i.ClientIndustriesName, i.ClientIndustriesSortOrder)).ToListAsync(ct));
}

public record GetAllPaymentMethodsQuery : IRequest<ApiResponse<List<PaymentMethodDto>>>;
public class GetAllPaymentMethodsHandler(IApplicationDbContext db) : IRequestHandler<GetAllPaymentMethodsQuery, ApiResponse<List<PaymentMethodDto>>>
{
    public async Task<ApiResponse<List<PaymentMethodDto>>> Handle(GetAllPaymentMethodsQuery _, CancellationToken ct)
        => ApiResponse<List<PaymentMethodDto>>.Success(await db.PaymentMethods.AsNoTracking()
            .Select(m => new PaymentMethodDto(m.PaymentMethodsId, m.PaymentMethodsName, m.PaymentMethodsType)).ToListAsync(ct));
}
