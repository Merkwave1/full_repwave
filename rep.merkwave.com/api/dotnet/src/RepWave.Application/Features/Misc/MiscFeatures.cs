using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.InventoryFeatures;

public record InventoryDto(int InventoryId, int VariantId, int? PackagingTypeId, int? WarehouseId,
    DateOnly? InventoryProductionDate, int InventoryQuantity, string InventoryStatus,
    string? ProductName, string? VariantName, int? ProductsId);
public record GetInventoryQuery(int Page = 1, int PageSize = 500, int? WarehouseId = null, int? VariantId = null)
    : IRequest<ApiResponse<PagedResult<InventoryDto>>>;
public class GetInventoryHandler(IApplicationDbContext db) : IRequestHandler<GetInventoryQuery, ApiResponse<PagedResult<InventoryDto>>>
{
    public async Task<ApiResponse<PagedResult<InventoryDto>>> Handle(GetInventoryQuery q, CancellationToken ct)
    {
        var query = db.Inventories.AsNoTracking().Where(i => i.InventoryQuantity > 0);
        if (q.WarehouseId.HasValue) query = query.Where(i => i.WarehouseId == q.WarehouseId);
        if (q.VariantId.HasValue) query = query.Where(i => i.VariantId == q.VariantId);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(i => new InventoryDto(
                i.InventoryId, i.VariantId, i.PackagingTypeId, i.WarehouseId,
                i.InventoryProductionDate, i.InventoryQuantity, i.InventoryStatus,
                i.Variant != null && i.Variant.Product != null ? i.Variant.Product.ProductsName : null,
                i.Variant != null ? i.Variant.VariantName : null,
                i.Variant != null ? (int?)i.Variant.VariantProductsId : null))
            .ToListAsync(ct);
        return ApiResponse<PagedResult<InventoryDto>>.Success(new() { Data = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize });
    }
}

public record RemoveInventoryItemCommand(int Id) : IRequest<ApiResponse<object>>;
public class RemoveInventoryItemCommandHandler(IApplicationDbContext db) : IRequestHandler<RemoveInventoryItemCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(RemoveInventoryItemCommand cmd, CancellationToken ct)
    {
        var item = await db.Inventories.FindAsync([cmd.Id], ct);
        if (item is null) return ApiResponse<object>.Failure("سجل المخزون غير موجود.");
        if (item.InventoryQuantity > 0) return ApiResponse<object>.Failure("لا يمكن حذف سجل مخزون له كمية موجبة.");
        db.Inventories.Remove(item);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "تم حذف السجل بنجاح.");
    }
}

public record RepackInventoryRequest(int InventoryId, int ToPackagingTypeId, int QuantityToConvert);
public record RepackInventoryCommand(RepackInventoryRequest Request) : IRequest<ApiResponse<object>>;
public class RepackInventoryHandler(IApplicationDbContext db) : IRequestHandler<RepackInventoryCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(RepackInventoryCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;
        if (r.QuantityToConvert <= 0) return ApiResponse<object>.Failure("الكمية يجب أن تكون أكبر من صفر.");

        var source = await db.Inventories.FindAsync([r.InventoryId], ct);
        if (source is null) return ApiResponse<object>.Failure("سجل المخزون المصدر غير موجود.");
        if (source.PackagingTypeId is null) return ApiResponse<object>.Failure("نوع تعبئة المصدر غير محدد.");
        if (source.InventoryQuantity < r.QuantityToConvert)
            return ApiResponse<object>.Failure($"الكمية المطلوبة ({r.QuantityToConvert}) أكبر من المتاح ({source.InventoryQuantity}).");

        var sourcePt = await db.PackagingTypes.FindAsync([source.PackagingTypeId.Value], ct);
        var targetPt = await db.PackagingTypes.FindAsync([r.ToPackagingTypeId], ct);
        if (sourcePt is null) return ApiResponse<object>.Failure("نوع التعبئة المصدر غير موجود.");
        if (targetPt is null) return ApiResponse<object>.Failure("نوع التعبئة الهدف غير موجود.");

        decimal baseUnits = r.QuantityToConvert * sourcePt.PackagingTypesDefaultConversionFactor;
        decimal targetQtyDecimal = baseUnits / targetPt.PackagingTypesDefaultConversionFactor;
        if (targetQtyDecimal % 1 != 0)
            return ApiResponse<object>.Failure("التحويل لا ينتج كمية صحيحة. يرجى تعديل الكمية.");
        int targetQty = (int)targetQtyDecimal;

        source.InventoryQuantity -= r.QuantityToConvert;

        var dest = await db.Inventories.FirstOrDefaultAsync(i =>
            i.VariantId == source.VariantId &&
            i.WarehouseId == source.WarehouseId &&
            i.PackagingTypeId == r.ToPackagingTypeId &&
            i.InventoryProductionDate == source.InventoryProductionDate, ct);

        if (dest is null)
        {
            dest = new Inventory
            {
                VariantId = source.VariantId,
                WarehouseId = source.WarehouseId,
                PackagingTypeId = r.ToPackagingTypeId,
                InventoryProductionDate = source.InventoryProductionDate,
                InventoryQuantity = targetQty,
                InventoryStatus = source.InventoryStatus,
            };
            db.Inventories.Add(dest);
        }
        else
        {
            dest.InventoryQuantity += targetQty;
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, $"تم التحويل بنجاح: {r.QuantityToConvert} {sourcePt.PackagingTypesName} → {targetQty} {targetPt.PackagingTypesName}.");
    }
}

// Notifications
public record NotificationDto(int NotificationsId, string? NotificationsTitle, string? NotificationsBody,
    string? NotificationsChannel, bool NotificationsIsRead, DateTime? NotificationsCreatedAt, string? NotificationsRole);

public record GetAllNotificationsQuery(int Page = 1, int PageSize = 50, bool? IsRead = null)
    : IRequest<ApiResponse<PagedResult<NotificationDto>>>;
public class GetAllNotificationsHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllNotificationsQuery, ApiResponse<PagedResult<NotificationDto>>>
{
    public async Task<ApiResponse<PagedResult<NotificationDto>>> Handle(GetAllNotificationsQuery q, CancellationToken ct)
    {
        var query = db.Notifications.AsNoTracking();
        if (q.IsRead.HasValue) query = query.Where(n => n.NotificationsIsRead == q.IsRead.Value);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(n => n.NotificationsCreatedAt).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(n => new NotificationDto(n.NotificationsId, n.NotificationsTitle, n.NotificationsBody, n.NotificationsChannel, n.NotificationsIsRead, n.NotificationsCreatedAt, n.NotificationsRole))
            .ToListAsync(ct);
        return ApiResponse<PagedResult<NotificationDto>>.Success(new() { Data = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize });
    }
}
public record MarkNotificationReadCommand(int Id) : IRequest<ApiResponse<object>>;
public class MarkNotificationReadHandler(IApplicationDbContext db) : IRequestHandler<MarkNotificationReadCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(MarkNotificationReadCommand cmd, CancellationToken ct)
    {
        var n = await db.Notifications.FindAsync([cmd.Id], ct);
        if (n is null) return ApiResponse<object>.Failure("Notification not found.");
        n.NotificationsIsRead = true; n.NotificationsReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Marked as read.");
    }
}

public record CreateNotificationRequest(string? Title, string? Body, string? Channel = "general",
    string? Priority = "normal", string? Role = null, string? ReferenceTable = null, int? ReferenceId = null);
public record CreateNotificationCommand(CreateNotificationRequest Request) : IRequest<ApiResponse<NotificationDto>>;
public class CreateNotificationHandler(IApplicationDbContext db) : IRequestHandler<CreateNotificationCommand, ApiResponse<NotificationDto>>
{
    public async Task<ApiResponse<NotificationDto>> Handle(CreateNotificationCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;
        var n = new Notification
        {
            NotificationsTitle = r.Title,
            NotificationsBody = r.Body,
            NotificationsChannel = r.Channel,
            NotificationsPriority = r.Priority ?? "normal",
            NotificationsRole = r.Role,
            NotificationsReferenceTable = r.ReferenceTable,
            NotificationsReferenceId = r.ReferenceId,
            NotificationsIsRead = false,
            NotificationsCreatedAt = DateTime.UtcNow,
            NotificationsSentAt = DateTime.UtcNow,
        };
        db.Notifications.Add(n);
        await db.SaveChangesAsync(ct);
        return ApiResponse<NotificationDto>.Success(new NotificationDto(n.NotificationsId, n.NotificationsTitle,
            n.NotificationsBody, n.NotificationsChannel, n.NotificationsIsRead, n.NotificationsCreatedAt, n.NotificationsRole));
    }
}

// Settings
public record SettingDto(int SettingsId, string SettingsKey, string? SettingsValue, string? SettingsLabel, string SettingsCategory);
public record GetAllSettingsQuery(string? Category = null) : IRequest<ApiResponse<List<SettingDto>>>;
public class GetAllSettingsHandler(IApplicationDbContext db) : IRequestHandler<GetAllSettingsQuery, ApiResponse<List<SettingDto>>>
{
    public async Task<ApiResponse<List<SettingDto>>> Handle(GetAllSettingsQuery q, CancellationToken ct)
    {
        var query = db.Settings.AsNoTracking();
        if (q.Category is not null) query = query.Where(s => s.SettingsCategory == q.Category);
        var items = await query.Select(s => new SettingDto(s.SettingsId, s.SettingsKey, s.SettingsValue, s.SettingsLabel, s.SettingsCategory)).ToListAsync(ct);
        return ApiResponse<List<SettingDto>>.Success(items);
    }
}
public record UpdateSettingCommand(string Key, string? Value, string? Description = null, string? Type = null) : IRequest<ApiResponse<object>>;
public class UpdateSettingHandler(IApplicationDbContext db) : IRequestHandler<UpdateSettingCommand, ApiResponse<object>>
{
    private static string InferCategory(string key)
    {
        if (key.StartsWith("company_", StringComparison.OrdinalIgnoreCase)) return "company";
        if (key.Contains("currency", StringComparison.OrdinalIgnoreCase) ||
            key.Contains("tax", StringComparison.OrdinalIgnoreCase) ||
            key.Contains("payment", StringComparison.OrdinalIgnoreCase) ||
            key.Equals("defult_client_credit_limit", StringComparison.OrdinalIgnoreCase))
            return "financial";
        if (key.Contains("stock", StringComparison.OrdinalIgnoreCase) ||
            key.Contains("inventory", StringComparison.OrdinalIgnoreCase) ||
            key.Contains("reorder", StringComparison.OrdinalIgnoreCase) ||
            key.Contains("expiry", StringComparison.OrdinalIgnoreCase))
            return "inventory";
        return "general";
    }

    private static string InferType(string key) =>
        key.Contains("threshold", StringComparison.OrdinalIgnoreCase) ||
        key.Contains("_limit", StringComparison.OrdinalIgnoreCase) ||
        key.Equals("decimal_places", StringComparison.OrdinalIgnoreCase)
            ? "integer"
            : key.StartsWith("allow_", StringComparison.OrdinalIgnoreCase) ||
              key.Contains("_enabled", StringComparison.OrdinalIgnoreCase)
                ? "boolean"
                : "string";

    public async Task<ApiResponse<object>> Handle(UpdateSettingCommand cmd, CancellationToken ct)
    {
        var s = await db.Settings.FirstOrDefaultAsync(x => x.SettingsKey == cmd.Key, ct);
        if (s is null)
        {
            s = new Setting
            {
                SettingsKey = cmd.Key,
                SettingsValue = cmd.Value,
                SettingsDescription = cmd.Description,
                SettingsCategory = InferCategory(cmd.Key),
                SettingsType = cmd.Type ?? InferType(cmd.Key),
                SettingsLabel = cmd.Description ?? cmd.Key,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Settings.Add(s);
        }
        else
        {
            s.SettingsValue = cmd.Value;
            if (!string.IsNullOrWhiteSpace(cmd.Description))
                s.SettingsDescription = cmd.Description;
            if (!string.IsNullOrWhiteSpace(cmd.Type))
                s.SettingsType = cmd.Type;
            s.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "Setting updated.");
    }
}

// Dashboard Stats
public record DashboardStatsQuery : IRequest<ApiResponse<object>>;
public class GetDashboardStatsHandler(IApplicationDbContext db) : IRequestHandler<DashboardStatsQuery, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DashboardStatsQuery _, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var d7 = today.AddDays(-7);
        var d30 = today.AddDays(-30);
        var d90 = today.AddDays(-90);
        var currentMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var prevMonthStart = currentMonthStart.AddMonths(-1);

        static bool IsCountedSale(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var s = status.Trim();
            return s.Equals("Invoiced", StringComparison.OrdinalIgnoreCase)
                || s.Equals("Confirmed", StringComparison.OrdinalIgnoreCase)
                || s.Equals("Approved", StringComparison.OrdinalIgnoreCase)
                || s.Equals("Delivered", StringComparison.OrdinalIgnoreCase)
                || s.Equals("Partially Delivered", StringComparison.OrdinalIgnoreCase);
        }

        // Sales — use 90-day window for period stats (field names kept for frontend compat)
        var allSales = await db.SalesOrders.AsNoTracking()
            .Where(o => o.SalesOrdersOrderDate != null)
            .ToListAsync(ct);
        var countedSales = allSales.Where(o => IsCountedSale(o.SalesOrdersStatus)).ToList();
        var s90 = countedSales.Where(o => o.SalesOrdersOrderDate >= d90).ToList();
        var s7 = s90.Where(o => o.SalesOrdersOrderDate >= d7).ToList();
        var sToday = s90.Where(o => o.SalesOrdersOrderDate >= today).ToList();

        var allSalesOrders = db.SalesOrders.AsNoTracking();
        var currentMonthOrders = await allSalesOrders.Where(o => o.SalesOrdersOrderDate >= currentMonthStart).ToListAsync(ct);
        var prevMonthOrders = await allSalesOrders.Where(o => o.SalesOrdersOrderDate >= prevMonthStart && o.SalesOrdersOrderDate < currentMonthStart).ToListAsync(ct);

        // Returns
        var ret90 = await db.SalesReturns.AsNoTracking().Where(r => r.ReturnsDate >= d90).ToListAsync(ct);
        var ret7 = ret90.Where(r => r.ReturnsDate >= d7).ToList();
        var retToday = ret90.Where(r => r.ReturnsDate >= today).ToList();

        // Purchases
        var pur90 = await db.PurchaseOrders.AsNoTracking().Where(p => p.PurchaseOrdersOrderDate >= d90).ToListAsync(ct);
        var pur7 = pur90.Where(p => p.PurchaseOrdersOrderDate >= d7).ToList();
        var purToday = pur90.Where(p => p.PurchaseOrdersOrderDate >= today).ToList();

        // Financial — client cash uses types: payment (income), refund (expense)
        var fin90 = await db.FinancialTransactions.AsNoTracking().Where(f => f.FinancialTransactionsDate >= d90).ToListAsync(ct);
        var fin7 = fin90.Where(f => f.FinancialTransactionsDate >= d7).ToList();
        static bool IsFinancialIncome(string? t)
        {
            if (string.IsNullOrWhiteSpace(t)) return false;
            var s = t.Trim();
            return s.Equals("payment", StringComparison.OrdinalIgnoreCase)
                || s.Equals("income", StringComparison.OrdinalIgnoreCase)
                || s.Equals("credit", StringComparison.OrdinalIgnoreCase)
                || s.Equals("deposit", StringComparison.OrdinalIgnoreCase)
                || s.Equals("receipt", StringComparison.OrdinalIgnoreCase)
                || s.Contains("income", StringComparison.OrdinalIgnoreCase)
                || s.Contains("collection", StringComparison.OrdinalIgnoreCase);
        }
        static bool IsFinancialExpense(string? t)
        {
            if (string.IsNullOrWhiteSpace(t)) return false;
            var s = t.Trim();
            return s.Equals("refund", StringComparison.OrdinalIgnoreCase)
                || s.Equals("expense", StringComparison.OrdinalIgnoreCase)
                || s.Equals("debit", StringComparison.OrdinalIgnoreCase)
                || s.Equals("withdrawal", StringComparison.OrdinalIgnoreCase)
                || s.Contains("expense", StringComparison.OrdinalIgnoreCase);
        }
        var income90 = fin90.Where(f => IsFinancialIncome(f.FinancialTransactionsType)).Sum(f => f.FinancialTransactionsAmount);
        var expenses90 = fin90.Where(f => IsFinancialExpense(f.FinancialTransactionsType)).Sum(f => f.FinancialTransactionsAmount);
        var income7 = fin7.Where(f => IsFinancialIncome(f.FinancialTransactionsType)).Sum(f => f.FinancialTransactionsAmount);
        var expenses7 = fin7.Where(f => IsFinancialExpense(f.FinancialTransactionsType)).Sum(f => f.FinancialTransactionsAmount);

        // Supplier payments count as cash outflows
        var d90Date = DateOnly.FromDateTime(d90);
        var d7Date = DateOnly.FromDateTime(d7);
        expenses90 += await db.SupplierPayments.AsNoTracking()
            .Where(p => p.PaymentDate >= d90Date)
            .SumAsync(p => p.Amount, ct);
        expenses7 += await db.SupplierPayments.AsNoTracking()
            .Where(p => p.PaymentDate >= d7Date)
            .SumAsync(p => p.Amount, ct);

        // Clients
        var totalActiveClients = await db.Clients.AsNoTracking().CountAsync(c => c.ClientsStatus == "active", ct);
        var newClients90d = await db.Clients.AsNoTracking().CountAsync(c => c.ClientsCreatedAt >= d90, ct);
        var newClients7d = await db.Clients.AsNoTracking().CountAsync(c => c.ClientsCreatedAt >= d7, ct);
        var totalClientsBalance = await db.Clients.AsNoTracking().SumAsync(c => c.ClientsCreditBalance, ct);

        // Suppliers
        var totalSuppliersBalance = await db.Suppliers.AsNoTracking().SumAsync(s => s.SupplierBalance, ct);

        // Recent visits
        var recentVisits = await db.Visits.AsNoTracking()
            .Include(v => v.Client)
            .Include(v => v.RepUser)
            .OrderByDescending(v => v.VisitsStartTime)
            .Take(5)
            .Select(v => new
            {
                visits_id = v.VisitsId,
                client_company_name = v.Client != null ? v.Client.ClientsCompanyName : "",
                visits_start_time = v.VisitsStartTime,
                visits_status = v.VisitsStatus,
                visits_purpose = v.VisitsPurpose,
                representative_name = v.RepUser != null ? v.RepUser.UsersName : ""
            })
            .ToListAsync(ct);

        // Top selling products (90d) — filter status in memory (local fn can't be used in EF trees)
        var salesItems90 = await db.SalesOrderItems.AsNoTracking()
            .Include(i => i.SalesOrder)
            .Include(i => i.Variant!).ThenInclude(v => v.Product)
            .Where(i => i.SalesOrder != null && i.SalesOrder.SalesOrdersOrderDate >= d90)
            .ToListAsync(ct);
        var topSelling = salesItems90
            .Where(i => IsCountedSale(i.SalesOrder!.SalesOrdersStatus))
            .GroupBy(i => i.SalesOrderItemsVariantId)
            .Select(g => new
            {
                sales_order_items_variant_id = g.Key,
                variant_name = g.First().Variant?.VariantName ?? "",
                products_name = g.First().Variant?.Product?.ProductsName ?? "",
                total_quantity = g.Sum(x => x.SalesOrderItemsQuantity),
                total_revenue = g.Sum(x => x.SalesOrderItemsTotalPrice),
                order_count = g.Select(x => x.SalesOrderItemsSalesOrderId).Distinct().Count()
            })
            .OrderByDescending(x => x.total_quantity)
            .Take(10)
            .ToList();

        // Top returned products (90d)
        var topReturned = await db.SalesReturnItems.AsNoTracking()
            .Include(i => i.Return)
            .Include(i => i.SalesOrderItem!).ThenInclude(soi => soi.Variant!).ThenInclude(v => v.Product)
            .Where(i => i.Return != null && i.Return.ReturnsDate >= d90 && i.SalesOrderItem != null)
            .GroupBy(i => i.SalesOrderItem!.SalesOrderItemsVariantId)
            .Select(g => new
            {
                sales_order_items_variant_id = g.Key,
                variant_name = g.First().SalesOrderItem!.Variant != null ? g.First().SalesOrderItem!.Variant!.VariantName : "",
                products_name = g.First().SalesOrderItem!.Variant != null && g.First().SalesOrderItem!.Variant!.Product != null
                    ? g.First().SalesOrderItem!.Variant!.Product!.ProductsName : "",
                total_returned_quantity = g.Sum(x => x.ReturnItemsQuantity),
                total_returned_value = g.Sum(x => x.ReturnItemsTotalPrice),
                return_count = g.Select(x => x.ReturnItemsReturnId).Distinct().Count()
            })
            .OrderByDescending(x => x.total_returned_quantity)
            .Take(10)
            .ToListAsync(ct);

        // Low stock (<= 20 units)
        var lowStock = await db.Inventories.AsNoTracking()
            .Include(i => i.Variant!).ThenInclude(v => v.Product)
            .Include(i => i.Warehouse)
            .Where(i => i.InventoryQuantity > 0 && i.InventoryQuantity <= 20)
            .OrderBy(i => i.InventoryQuantity)
            .Take(15)
            .Select(i => new
            {
                variant_id = i.VariantId,
                variant_name = i.Variant != null ? i.Variant!.VariantName : "",
                products_name = i.Variant != null && i.Variant!.Product != null
                    ? i.Variant!.Product!.ProductsName : "",
                total_stock = i.InventoryQuantity,
                warehouse_name = i.Warehouse != null ? i.Warehouse!.WarehouseName : ""
            })
            .ToListAsync(ct);

        // Rep performance (90d)
        var repOrders90 = await db.SalesOrders.AsNoTracking()
            .Include(o => o.Representative)
            .Where(o => o.SalesOrdersOrderDate >= d90 && o.SalesOrdersRepresentativeId != null)
            .ToListAsync(ct);
        var visitsByRep = await db.Visits.AsNoTracking()
            .Where(v => v.VisitsStartTime >= d90)
            .GroupBy(v => v.VisitsRepUserId)
            .Select(g => new { RepId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.RepId, x => x.Count, ct);
        var userPerformance = repOrders90
            .Where(o => IsCountedSale(o.SalesOrdersStatus))
            .GroupBy(o => o.SalesOrdersRepresentativeId)
            .Select(g => new
            {
                users_id = g.Key,
                users_name = g.First().Representative?.UsersName ?? "",
                users_role = g.First().Representative?.UsersRole ?? "",
                orders_handled = g.Count(),
                total_sales_value = g.Sum(x => x.SalesOrdersTotalAmount),
                visits_conducted = visitsByRep.GetValueOrDefault(g.Key ?? 0, 0)
            })
            .OrderByDescending(x => x.total_sales_value)
            .Take(10)
            .ToList();

        var result = new
        {
            meta = new { generated_at = now },
            sales = new
            {
                invoiced_30d_count = s90.Count,
                invoiced_30d_value = s90.Sum(o => o.SalesOrdersTotalAmount),
                invoiced_7d_count = s7.Count,
                invoiced_7d_value = s7.Sum(o => o.SalesOrdersTotalAmount),
                invoiced_today_count = sToday.Count,
                invoiced_today_value = sToday.Sum(o => o.SalesOrdersTotalAmount),
            },
            purchases = new
            {
                active_30d_count = pur90.Count,
                active_30d_value = pur90.Sum(p => p.PurchaseOrdersTotalAmount),
                active_7d_count = pur7.Count,
                active_7d_value = pur7.Sum(p => p.PurchaseOrdersTotalAmount),
                active_today_count = purToday.Count,
                active_today_value = purToday.Sum(p => p.PurchaseOrdersTotalAmount),
            },
            financial = new
            {
                income_30d = income90,
                expenses_30d = expenses90,
                income_7d = income7,
                expenses_7d = expenses7,
            },
            returns = new
            {
                returns_30d_count = ret90.Count,
                returns_30d_value = ret90.Sum(r => r.ReturnsTotalAmount),
                returns_7d_count = ret7.Count,
                returns_7d_value = ret7.Sum(r => r.ReturnsTotalAmount),
                returns_today_count = retToday.Count,
                returns_today_value = retToday.Sum(r => r.ReturnsTotalAmount),
            },
            clients = new
            {
                total_active_clients = totalActiveClients,
                new_clients_30d = newClients90d,
                new_clients_7d = newClients7d,
                total_clients_balance = totalClientsBalance,
            },
            suppliers = new
            {
                total_balance = totalSuppliersBalance,
            },
            top_selling_products = topSelling,
            top_returned_products = topReturned,
            low_stock_products = lowStock,
            recent_visits = recentVisits,
            monthly_comparison = new
            {
                current_month_sales = currentMonthOrders.Sum(o => o.SalesOrdersTotalAmount),
                current_month_orders = currentMonthOrders.Count,
                previous_month_sales = prevMonthOrders.Sum(o => o.SalesOrdersTotalAmount),
                previous_month_orders = prevMonthOrders.Count,
            },
            user_performance = userPerformance,
        };
        return ApiResponse<object>.Success(result);
    }
}
