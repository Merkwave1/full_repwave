using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;

namespace RepWave.Application.Features.InventoryManagement;

// DTO matching the PHP get_all.php response: inventory_id, products_id, products_unit_of_measure_id,
// variant_id, packaging_type_id, warehouse_id, inventory_production_date, inventory_quantity, inventory_status
public record InventoryDto(
    int InventoryId,
    int ProductsId,
    int? ProductsUnitOfMeasureId,
    int VariantId,
    int? PackagingTypeId,
    int? WarehouseId,
    DateOnly? InventoryProductionDate,
    int InventoryQuantity,
    string InventoryStatus);

public record GetAllInventoryQuery(
    int? WarehouseId = null,
    int? VariantId = null,
    int? PackagingTypeId = null,
    DateOnly? ProductionDate = null)
    : IRequest<ApiResponse<List<InventoryDto>>>;

public class GetAllInventoryQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllInventoryQuery, ApiResponse<List<InventoryDto>>>
{
    public async Task<ApiResponse<List<InventoryDto>>> Handle(GetAllInventoryQuery request, CancellationToken ct)
    {
        var query = db.Inventories
            .AsNoTracking()
            .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
            // Exclude soft-removed rows — identical to PHP: WHERE inv.inventory_status <> 'Removed'
            .Where(i => i.InventoryStatus != "Removed")
            .AsQueryable();

        if (request.WarehouseId.HasValue)
            query = query.Where(i => i.WarehouseId == request.WarehouseId.Value);

        if (request.VariantId.HasValue)
            query = query.Where(i => i.VariantId == request.VariantId.Value);

        if (request.PackagingTypeId.HasValue)
            query = query.Where(i => i.PackagingTypeId == request.PackagingTypeId.Value);

        if (request.ProductionDate.HasValue)
            query = query.Where(i => i.InventoryProductionDate == request.ProductionDate.Value);

        // ORDER BY p.products_name ASC, inv.warehouse_id ASC, inv.inventory_production_date DESC
        var list = await query
            .OrderBy(i => i.Variant!.Product!.ProductsName)
            .ThenBy(i => i.WarehouseId)
            .ThenByDescending(i => i.InventoryProductionDate)
            .Select(i => new InventoryDto(
                i.InventoryId,
                i.Variant!.VariantProductsId,
                i.Variant.Product!.ProductsUnitOfMeasureId,
                i.VariantId,
                i.PackagingTypeId,
                i.WarehouseId,
                i.InventoryProductionDate,
                i.InventoryQuantity,
                i.InventoryStatus))
            .ToListAsync(ct);

        return ApiResponse<List<InventoryDto>>.Success(list);
    }
}
