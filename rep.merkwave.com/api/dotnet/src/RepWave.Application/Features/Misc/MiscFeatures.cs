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
public record UpdateSettingCommand(string Key, string? Value) : IRequest<ApiResponse<object>>;
public class UpdateSettingHandler(IApplicationDbContext db) : IRequestHandler<UpdateSettingCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(UpdateSettingCommand cmd, CancellationToken ct)
    {
        var s = await db.Settings.FirstOrDefaultAsync(x => x.SettingsKey == cmd.Key, ct);
        if (s is null) return ApiResponse<object>.Failure("Setting not found.");
        s.SettingsValue = cmd.Value; s.UpdatedAt = DateTime.UtcNow;
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
        var currentMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var prevMonthStart = currentMonthStart.AddMonths(-1);

        // Sales
        var salesQ = db.SalesOrders.AsNoTracking()
            .Where(o => o.SalesOrdersStatus == "Invoiced" || o.SalesOrdersStatus == "Confirmed" || o.SalesOrdersStatus == "invoiced" || o.SalesOrdersStatus == "confirmed");
        var s30 = await salesQ.Where(o => o.SalesOrdersOrderDate >= d30).ToListAsync(ct);
        var s7 = s30.Where(o => o.SalesOrdersOrderDate >= d7).ToList();
        var sToday = s30.Where(o => o.SalesOrdersOrderDate >= today).ToList();

        // All sales for monthly comparison
        var allSalesOrders = db.SalesOrders.AsNoTracking();
        var currentMonthOrders = await allSalesOrders.Where(o => o.SalesOrdersOrderDate >= currentMonthStart).ToListAsync(ct);
        var prevMonthOrders = await allSalesOrders.Where(o => o.SalesOrdersOrderDate >= prevMonthStart && o.SalesOrdersOrderDate < currentMonthStart).ToListAsync(ct);

        // Returns
        var ret30 = await db.SalesReturns.AsNoTracking().Where(r => r.ReturnsDate >= d30).ToListAsync(ct);
        var ret7 = ret30.Where(r => r.ReturnsDate >= d7).ToList();
        var retToday = ret30.Where(r => r.ReturnsDate >= today).ToList();

        // Purchases
        var pur30 = await db.PurchaseOrders.AsNoTracking().Where(p => p.PurchaseOrdersOrderDate >= d30).ToListAsync(ct);
        var pur7 = pur30.Where(p => p.PurchaseOrdersOrderDate >= d7).ToList();
        var purToday = pur30.Where(p => p.PurchaseOrdersOrderDate >= today).ToList();

        // Financial
        var fin30 = await db.FinancialTransactions.AsNoTracking().Where(f => f.FinancialTransactionsDate >= d30).ToListAsync(ct);
        var fin7 = fin30.Where(f => f.FinancialTransactionsDate >= d7).ToList();
        var income30 = fin30.Where(f => (f.FinancialTransactionsType ?? "").ToLower().Contains("income") || (f.FinancialTransactionsType ?? "").ToLower() == "credit").Sum(f => f.FinancialTransactionsAmount);
        var expenses30 = fin30.Where(f => (f.FinancialTransactionsType ?? "").ToLower().Contains("expense") || (f.FinancialTransactionsType ?? "").ToLower() == "debit").Sum(f => f.FinancialTransactionsAmount);
        var income7 = fin7.Where(f => (f.FinancialTransactionsType ?? "").ToLower().Contains("income") || (f.FinancialTransactionsType ?? "").ToLower() == "credit").Sum(f => f.FinancialTransactionsAmount);
        var expenses7 = fin7.Where(f => (f.FinancialTransactionsType ?? "").ToLower().Contains("expense") || (f.FinancialTransactionsType ?? "").ToLower() == "debit").Sum(f => f.FinancialTransactionsAmount);

        // Clients
        var totalActiveClients = await db.Clients.AsNoTracking().CountAsync(c => c.ClientsStatus == "active", ct);
        var newClients30d = await db.Clients.AsNoTracking().CountAsync(c => c.ClientsCreatedAt >= d30, ct);
        var newClients7d = await db.Clients.AsNoTracking().CountAsync(c => c.ClientsCreatedAt >= d7, ct);
        var totalClientsBalance = await db.Clients.AsNoTracking().SumAsync(c => c.ClientsCreditBalance, ct);

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

        var result = new
        {
            meta = new { generated_at = now },
            sales = new
            {
                invoiced_30d_count = s30.Count,
                invoiced_30d_value = s30.Sum(o => o.SalesOrdersTotalAmount),
                invoiced_7d_count = s7.Count,
                invoiced_7d_value = s7.Sum(o => o.SalesOrdersTotalAmount),
                invoiced_today_count = sToday.Count,
                invoiced_today_value = sToday.Sum(o => o.SalesOrdersTotalAmount),
            },
            purchases = new
            {
                active_30d_count = pur30.Count,
                active_30d_value = pur30.Sum(p => p.PurchaseOrdersTotalAmount),
                active_7d_count = pur7.Count,
                active_7d_value = pur7.Sum(p => p.PurchaseOrdersTotalAmount),
                active_today_count = purToday.Count,
                active_today_value = purToday.Sum(p => p.PurchaseOrdersTotalAmount),
            },
            financial = new
            {
                income_30d = income30,
                expenses_30d = expenses30,
                income_7d = income7,
                expenses_7d = expenses7,
            },
            returns = new
            {
                returns_30d_count = ret30.Count,
                returns_30d_value = ret30.Sum(r => r.ReturnsTotalAmount),
                returns_7d_count = ret7.Count,
                returns_7d_value = ret7.Sum(r => r.ReturnsTotalAmount),
                returns_today_count = retToday.Count,
                returns_today_value = retToday.Sum(r => r.ReturnsTotalAmount),
            },
            clients = new
            {
                total_active_clients = totalActiveClients,
                new_clients_30d = newClients30d,
                new_clients_7d = newClients7d,
                total_clients_balance = totalClientsBalance,
            },
            top_selling_products = Array.Empty<object>(),
            top_returned_products = Array.Empty<object>(),
            low_stock_products = Array.Empty<object>(),
            recent_visits = recentVisits,
            monthly_comparison = new
            {
                current_month_sales = currentMonthOrders.Sum(o => o.SalesOrdersTotalAmount),
                current_month_orders = currentMonthOrders.Count,
                previous_month_sales = prevMonthOrders.Sum(o => o.SalesOrdersTotalAmount),
                previous_month_orders = prevMonthOrders.Count,
            },
            user_performance = Array.Empty<object>(),
        };
        return ApiResponse<object>.Success(result);
    }
}
