using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Common.Interfaces;

public interface IApplicationDbContext : IDisposable
{
    DbSet<Setting> Settings { get; }
    DbSet<AppVersion> AppVersions { get; }
    DbSet<User> Users { get; }
    DbSet<LoginLog> LoginLogs { get; }
    DbSet<Country> Countries { get; }
    DbSet<Governorate> Governorates { get; }
    DbSet<Category> Categories { get; }
    DbSet<ClientAreaTag> ClientAreaTags { get; }
    DbSet<ClientType> ClientTypes { get; }
    DbSet<ClientIndustry> ClientIndustries { get; }
    DbSet<ClientDocumentType> ClientDocumentTypes { get; }
    DbSet<Client> Clients { get; }
    DbSet<ClientDocument> ClientDocuments { get; }
    DbSet<ClientInterestedProduct> ClientInterestedProducts { get; }
    DbSet<BaseUnit> BaseUnits { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductAttribute> ProductAttributes { get; }
    DbSet<ProductAttributeValue> ProductAttributeValues { get; }
    DbSet<ProductVariant> ProductVariants { get; }
    DbSet<ProductVariantAttributeMap> ProductVariantAttributeMaps { get; }
    DbSet<PackagingType> PackagingTypes { get; }
    DbSet<ProductPreferredPackaging> ProductPreferredPackagings { get; }
    DbSet<Supplier> Suppliers { get; }
    DbSet<Warehouse> Warehouses { get; }
    DbSet<Inventory> Inventories { get; }
    DbSet<PaymentMethod> PaymentMethods { get; }
    DbSet<Safe> Safes { get; }
    DbSet<SafeTransaction> SafeTransactions { get; }
    DbSet<Payment> Payments { get; }
    DbSet<Refund> Refunds { get; }
    DbSet<Invoice> Invoices { get; }
    DbSet<FinancialTransaction> FinancialTransactions { get; }
    DbSet<PurchaseOrder> PurchaseOrders { get; }
    DbSet<PurchaseOrderItem> PurchaseOrderItems { get; }
    DbSet<PurchaseReturn> PurchaseReturns { get; }
    DbSet<SalesOrder> SalesOrders { get; }
    DbSet<SalesOrderItem> SalesOrderItems { get; }
    DbSet<SalesDelivery> SalesDeliveries { get; }
    DbSet<SalesDeliveryItem> SalesDeliveryItems { get; }
    DbSet<SalesReturn> SalesReturns { get; }
    DbSet<SalesReturnItem> SalesReturnItems { get; }
    DbSet<GoodsReceipt> GoodsReceipts { get; }
    DbSet<GoodsReceiptItem> GoodsReceiptItems { get; }
    DbSet<TransferRequest> TransferRequests { get; }
    DbSet<TransferRequestItem> TransferRequestItems { get; }
    DbSet<Transfer> Transfers { get; }
    DbSet<VisitPlan> VisitPlans { get; }
    DbSet<VisitPlanClient> VisitPlanClients { get; }
    DbSet<Visit> Visits { get; }
    DbSet<VisitActivity> VisitActivities { get; }
    DbSet<RepLocationTracking> RepLocationTrackings { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<UserSafe> UserSafes { get; }
    DbSet<UserWarehouse> UserWarehouses { get; }
    DbSet<SupplierPayment> SupplierPayments { get; }
    DbSet<SafeTransfer> SafeTransfers { get; }
    DbSet<RepresentativeAttendance> RepresentativeAttendances { get; }
    DbSet<Account> Accounts { get; }
    DbSet<InventoryMovement> InventoryMovements { get; }
    DbSet<InvoiceItem> InvoiceItems { get; }
    DbSet<PurchaseReturnItem> PurchaseReturnItems { get; }
    DbSet<TransferItem> TransferItems { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
