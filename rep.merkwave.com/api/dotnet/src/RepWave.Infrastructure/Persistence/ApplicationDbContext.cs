using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Domain.Entities;

namespace RepWave.Infrastructure.Persistence;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<AppVersion> AppVersions => Set<AppVersion>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<User> Users => Set<User>();
    public DbSet<LoginLog> LoginLogs => Set<LoginLog>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<Governorate> Governorates => Set<Governorate>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<ClientAreaTag> ClientAreaTags => Set<ClientAreaTag>();
    public DbSet<ClientType> ClientTypes => Set<ClientType>();
    public DbSet<ClientIndustry> ClientIndustries => Set<ClientIndustry>();
    public DbSet<ClientDocumentType> ClientDocumentTypes => Set<ClientDocumentType>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<ClientDocument> ClientDocuments => Set<ClientDocument>();
    public DbSet<ClientInterestedProduct> ClientInterestedProducts => Set<ClientInterestedProduct>();
    public DbSet<BaseUnit> BaseUnits => Set<BaseUnit>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductAttribute> ProductAttributes => Set<ProductAttribute>();
    public DbSet<ProductAttributeValue> ProductAttributeValues => Set<ProductAttributeValue>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductVariantAttributeMap> ProductVariantAttributeMaps => Set<ProductVariantAttributeMap>();
    public DbSet<PackagingType> PackagingTypes => Set<PackagingType>();
    public DbSet<ProductPreferredPackaging> ProductPreferredPackagings => Set<ProductPreferredPackaging>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<Inventory> Inventories => Set<Inventory>();
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
    public DbSet<Safe> Safes => Set<Safe>();
    public DbSet<SafeTransaction> SafeTransactions => Set<SafeTransaction>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Refund> Refunds => Set<Refund>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<FinancialTransaction> FinancialTransactions => Set<FinancialTransaction>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderItem> PurchaseOrderItems => Set<PurchaseOrderItem>();
    public DbSet<PurchaseReturn> PurchaseReturns => Set<PurchaseReturn>();
    public DbSet<SalesOrder> SalesOrders => Set<SalesOrder>();
    public DbSet<SalesOrderItem> SalesOrderItems => Set<SalesOrderItem>();
    public DbSet<SalesDelivery> SalesDeliveries => Set<SalesDelivery>();
    public DbSet<SalesDeliveryItem> SalesDeliveryItems => Set<SalesDeliveryItem>();
    public DbSet<SalesReturn> SalesReturns => Set<SalesReturn>();
    public DbSet<SalesReturnItem> SalesReturnItems => Set<SalesReturnItem>();
    public DbSet<GoodsReceipt> GoodsReceipts => Set<GoodsReceipt>();
    public DbSet<GoodsReceiptItem> GoodsReceiptItems => Set<GoodsReceiptItem>();
    public DbSet<TransferRequest> TransferRequests => Set<TransferRequest>();
    public DbSet<TransferRequestItem> TransferRequestItems => Set<TransferRequestItem>();
    public DbSet<Transfer> Transfers => Set<Transfer>();
    public DbSet<VisitPlan> VisitPlans => Set<VisitPlan>();
    public DbSet<VisitPlanClient> VisitPlanClients => Set<VisitPlanClient>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<VisitActivity> VisitActivities => Set<VisitActivity>();
    public DbSet<RepLocationTracking> RepLocationTrackings => Set<RepLocationTracking>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<UserSafe> UserSafes => Set<UserSafe>();
    public DbSet<UserWarehouse> UserWarehouses => Set<UserWarehouse>();
    public DbSet<SupplierPayment> SupplierPayments => Set<SupplierPayment>();
    public DbSet<SafeTransfer> SafeTransfers => Set<SafeTransfer>();
    public DbSet<RepresentativeAttendance> RepresentativeAttendances => Set<RepresentativeAttendance>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<PurchaseReturnItem> PurchaseReturnItems => Set<PurchaseReturnItem>();
    public DbSet<TransferItem> TransferItems => Set<TransferItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Settings ────────────────────────────────────────────────────────
        modelBuilder.Entity<Setting>(e =>
        {
            e.HasKey(s => s.SettingsId);
            e.Property(s => s.SettingsId).UseIdentityColumn();
            e.HasIndex(s => s.SettingsKey).IsUnique();
            e.Property(s => s.SettingsKey).HasMaxLength(100).IsRequired();
            e.Property(s => s.SettingsCategory).HasMaxLength(50).HasDefaultValue("general");
            e.Property(s => s.SettingsType).HasMaxLength(20).HasDefaultValue("text");
            e.Property(s => s.SettingsLabel).HasMaxLength(150);
        });

        // ── AppVersion ──────────────────────────────────────────────────────
        modelBuilder.Entity<AppVersion>(e =>
        {
            e.HasKey(v => v.VersionsId);
            e.Property(v => v.VersionsId).UseIdentityColumn();
            e.HasIndex(v => v.Entity).IsUnique();
            e.Property(v => v.Entity).HasMaxLength(100).IsRequired();
            e.Property(v => v.Version).HasDefaultValue(1);
        });

        // ── Users ────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.UsersId);
            e.Property(u => u.UsersId).UseIdentityColumn();
            e.HasIndex(u => u.UsersEmail).IsUnique();
            e.Property(u => u.UsersName).HasMaxLength(200).IsRequired();
            e.Property(u => u.UsersEmail).HasMaxLength(200).IsRequired();
            e.Property(u => u.UsersPassword).HasMaxLength(255).IsRequired();
            e.Property(u => u.UsersRole).HasMaxLength(50).HasDefaultValue("rep");
            e.Property(u => u.UsersPhone).HasMaxLength(50);
            e.Property(u => u.UsersNationalId).HasMaxLength(50);
            e.Property(u => u.UsersUuid).HasMaxLength(64);
            e.Property(u => u.UsersImage).HasColumnType("text");
            e.Property(u => u.UsersStatus).HasDefaultValue(true);
        });

        // ── Login Logs ───────────────────────────────────────────────────────
        modelBuilder.Entity<LoginLog>(e =>
        {
            e.HasKey(l => l.LoginLogsId);
            e.Property(l => l.LoginLogsId).UseIdentityColumn();
            e.Property(l => l.LoginLogsUsersName).HasMaxLength(200);
            e.Property(l => l.LoginLogsUsersRole).HasMaxLength(50);
            e.Property(l => l.LoginLogsUsersUuid).HasMaxLength(64);
            e.Property(l => l.LoginLogsUsersIp).HasMaxLength(50);
            e.Property(l => l.LoginLogsUsersHwid).HasMaxLength(255);
            e.Property(l => l.LoginLogsStatus).HasMaxLength(20).HasDefaultValue("failure");
        });

        // ── Geography ────────────────────────────────────────────────────────
        modelBuilder.Entity<Country>(e =>
        {
            e.HasKey(c => c.CountriesId);
            e.Property(c => c.CountriesId).UseIdentityColumn();
            e.Property(c => c.CountriesNameAr).HasMaxLength(200).IsRequired();
            e.Property(c => c.CountriesNameEn).HasMaxLength(200);
            e.Property(c => c.CountriesSortOrder).HasDefaultValue(0);
        });

        modelBuilder.Entity<Governorate>(e =>
        {
            e.HasKey(g => g.GovernoratesId);
            e.Property(g => g.GovernoratesId).UseIdentityColumn();
            e.Property(g => g.GovernoratesNameAr).HasMaxLength(200).IsRequired();
            e.Property(g => g.GovernoratesNameEn).HasMaxLength(200);
            e.Property(g => g.GovernoratesSortOrder).HasDefaultValue(0);
            e.HasOne(g => g.Country).WithMany(c => c.Governorates)
                .HasForeignKey(g => g.GovernoratesCountryId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Client Lookups ───────────────────────────────────────────────────
        modelBuilder.Entity<Category>(e =>
        {
            e.HasKey(c => c.CategoriesId);
            e.Property(c => c.CategoriesId).UseIdentityColumn();
            e.HasIndex(c => c.CategoriesName).IsUnique();
            e.Property(c => c.CategoriesName).HasMaxLength(200).IsRequired();
            e.Property(c => c.CategoriesDescription).HasMaxLength(500);
        });

        modelBuilder.Entity<ClientAreaTag>(e =>
        {
            e.HasKey(t => t.ClientAreaTagId);
            e.Property(t => t.ClientAreaTagId).UseIdentityColumn();
            e.HasIndex(t => t.ClientAreaTagName).IsUnique();
            e.Property(t => t.ClientAreaTagName).HasMaxLength(200).IsRequired();
            e.Property(t => t.ClientAreaTagSortOrder).HasDefaultValue(0);
        });

        modelBuilder.Entity<ClientType>(e =>
        {
            e.HasKey(t => t.ClientTypeId);
            e.Property(t => t.ClientTypeId).UseIdentityColumn();
            e.HasIndex(t => t.ClientTypeName).IsUnique();
            e.Property(t => t.ClientTypeName).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<ClientIndustry>(e =>
        {
            e.HasKey(i => i.ClientIndustriesId);
            e.Property(i => i.ClientIndustriesId).UseIdentityColumn();
            e.HasIndex(i => i.ClientIndustriesName).IsUnique();
            e.Property(i => i.ClientIndustriesName).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<ClientDocumentType>(e =>
        {
            e.HasKey(d => d.DocumentTypeId);
            e.Property(d => d.DocumentTypeId).UseIdentityColumn();
            e.Property(d => d.DocumentTypeName).HasMaxLength(200).IsRequired();
        });

        // ── Clients ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Client>(e =>
        {
            e.HasKey(c => c.ClientsId);
            e.Property(c => c.ClientsId).UseIdentityColumn();
            e.Property(c => c.ClientsCompanyName).HasMaxLength(300).IsRequired();
            e.Property(c => c.ClientsEmail).HasMaxLength(200);
            e.Property(c => c.ClientsStatus).HasMaxLength(50).HasDefaultValue("active");
            e.Property(c => c.ClientsCreditLimit).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(c => c.ClientsCreditBalance).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(c => c.ClientsLatitude).HasPrecision(10, 8);
            e.Property(c => c.ClientsLongitude).HasPrecision(11, 8);

            e.HasOne(c => c.Country).WithMany(x => x.Clients).HasForeignKey(c => c.ClientsCountryId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(c => c.Governorate).WithMany(x => x.Clients).HasForeignKey(c => c.ClientsGovernorateId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(c => c.AreaTag).WithMany(x => x.Clients).HasForeignKey(c => c.ClientsAreaTagId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(c => c.ClientType).WithMany(x => x.Clients).HasForeignKey(c => c.ClientsClientTypeId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(c => c.Industry).WithMany(x => x.Clients).HasForeignKey(c => c.ClientsIndustryId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(c => c.RepUser).WithMany(x => x.Clients).HasForeignKey(c => c.ClientsRepUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ClientDocument>(e =>
        {
            e.HasKey(d => d.ClientDocumentId);
            e.Property(d => d.ClientDocumentId).UseIdentityColumn();
            e.HasOne(d => d.Client).WithMany(c => c.Documents).HasForeignKey(d => d.ClientDocumentClientId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(d => d.DocumentType).WithMany(t => t.ClientDocuments).HasForeignKey(d => d.ClientDocumentTypeId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ClientInterestedProduct>(e =>
        {
            e.HasKey(ci => new { ci.ClientId, ci.ProductsId });
            e.HasOne(ci => ci.Client).WithMany(c => c.InterestedProducts).HasForeignKey(ci => ci.ClientId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ci => ci.Product).WithMany(p => p.InterestedByClients).HasForeignKey(ci => ci.ProductsId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── Products ─────────────────────────────────────────────────────────
        modelBuilder.Entity<BaseUnit>(e =>
        {
            e.HasKey(b => b.BaseUnitsId);
            e.Property(b => b.BaseUnitsId).UseIdentityColumn();
            e.HasIndex(b => b.BaseUnitsName).IsUnique();
            e.Property(b => b.BaseUnitsName).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<Product>(e =>
        {
            e.HasKey(p => p.ProductsId);
            e.Property(p => p.ProductsId).UseIdentityColumn();
            e.Property(p => p.ProductsName).HasMaxLength(300).IsRequired();
            e.Property(p => p.ProductsIsActive).HasDefaultValue(true);
            e.Property(p => p.ProductsHasTax).HasDefaultValue(false);
            e.Property(p => p.ProductsTaxRate).HasPrecision(5, 2).HasDefaultValue(0);
            e.Property(p => p.ProductsWeight).HasPrecision(10, 3);
            e.Property(p => p.ProductsVolume).HasPrecision(10, 3);
            e.HasOne(p => p.Category).WithMany(c => c.Products).HasForeignKey(p => p.ProductsCategoryId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.UnitOfMeasure).WithMany(u => u.Products).HasForeignKey(p => p.ProductsUnitOfMeasureId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProductAttribute>(e =>
        {
            e.HasKey(a => a.AttributeId);
            e.Property(a => a.AttributeId).UseIdentityColumn();
            e.Property(a => a.AttributeName).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<ProductAttributeValue>(e =>
        {
            e.HasKey(v => v.AttributeValueId);
            e.Property(v => v.AttributeValueId).UseIdentityColumn();
            e.Property(v => v.AttributeValueValue).HasMaxLength(200).IsRequired();
            e.HasOne(v => v.Attribute).WithMany(a => a.Values).HasForeignKey(v => v.AttributeValueAttributeId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductVariant>(e =>
        {
            e.HasKey(v => v.VariantId);
            e.Property(v => v.VariantId).UseIdentityColumn();
            e.Property(v => v.VariantUnitPrice).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(v => v.VariantCostPrice).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(v => v.VariantStatus).HasMaxLength(50).HasDefaultValue("active");
            e.Property(v => v.VariantTaxRate).HasPrecision(5, 2).HasDefaultValue(0);
            e.HasOne(v => v.Product).WithMany(p => p.Variants).HasForeignKey(v => v.VariantProductsId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductVariantAttributeMap>(e =>
        {
            e.HasKey(m => new { m.VariantAttributeMapVariantId, m.VariantAttributeMapAttributeValueId });
            e.HasOne(m => m.Variant).WithMany(v => v.AttributeMappings).HasForeignKey(m => m.VariantAttributeMapVariantId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.AttributeValue).WithMany(v => v.VariantMappings).HasForeignKey(m => m.VariantAttributeMapAttributeValueId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PackagingType>(e =>
        {
            e.HasKey(p => p.PackagingTypesId);
            e.Property(p => p.PackagingTypesId).UseIdentityColumn();
            e.Property(p => p.PackagingTypesName).HasMaxLength(200).IsRequired();
            e.Property(p => p.PackagingTypesDefaultConversionFactor).HasPrecision(10, 4).HasDefaultValue(1);
            e.HasOne(p => p.CompatibleBaseUnit).WithMany(u => u.PackagingTypes).HasForeignKey(p => p.PackagingTypesCompatibleBaseUnitId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProductPreferredPackaging>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).UseIdentityColumn();
            e.HasOne(p => p.Product).WithMany(x => x.PreferredPackagings).HasForeignKey(p => p.ProductsId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(p => p.PackagingType).WithMany(x => x.PreferredPackagings).HasForeignKey(p => p.PackagingTypeId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── Suppliers & Warehouse ────────────────────────────────────────────
        modelBuilder.Entity<Supplier>(e =>
        {
            e.HasKey(s => s.SupplierId);
            e.Property(s => s.SupplierId).UseIdentityColumn();
            e.Property(s => s.SupplierName).HasMaxLength(300).IsRequired();
            e.Property(s => s.SupplierBalance).HasPrecision(15, 2).HasDefaultValue(0);
        });

        modelBuilder.Entity<Warehouse>(e =>
        {
            e.HasKey(w => w.WarehouseId);
            e.Property(w => w.WarehouseId).UseIdentityColumn();
            e.Property(w => w.WarehouseName).HasMaxLength(300).IsRequired();
            e.Property(w => w.WarehouseStatus).HasMaxLength(50).HasDefaultValue("active");
            e.HasOne(w => w.RepresentativeUser).WithMany(u => u.Warehouses).HasForeignKey(w => w.WarehouseRepresentativeUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Inventory>(e =>
        {
            e.HasKey(i => i.InventoryId);
            e.Property(i => i.InventoryId).UseIdentityColumn();
            e.Property(i => i.InventoryQuantity).HasDefaultValue(0);
            e.Property(i => i.InventoryStatus).HasMaxLength(50).HasDefaultValue("available");
            e.HasOne(i => i.Variant).WithMany(v => v.Inventories).HasForeignKey(i => i.VariantId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(i => i.Warehouse).WithMany(w => w.Inventories).HasForeignKey(i => i.WarehouseId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Finance ──────────────────────────────────────────────────────────
        modelBuilder.Entity<PaymentMethod>(e =>
        {
            e.HasKey(m => m.PaymentMethodsId);
            e.Property(m => m.PaymentMethodsId).UseIdentityColumn();
            e.HasIndex(m => m.PaymentMethodsName).IsUnique();
            e.Property(m => m.PaymentMethodsName).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Safe>(e =>
        {
            e.HasKey(s => s.SafesId);
            e.Property(s => s.SafesId).UseIdentityColumn();
            e.Property(s => s.SafesName).HasMaxLength(200).IsRequired();
            e.Property(s => s.SafesBalance).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(s => s.SafesIsActive).HasDefaultValue(true);
            e.HasOne(s => s.RepUser).WithMany(u => u.Safes).HasForeignKey(s => s.SafesRepUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(s => s.PaymentMethod).WithMany(m => m.Safes).HasForeignKey(s => s.SafesPaymentMethodId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SafeTransaction>(e =>
        {
            e.HasKey(t => t.SafeTransactionsId);
            e.Property(t => t.SafeTransactionsId).UseIdentityColumn();
            e.Property(t => t.SafeTransactionsAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(t => t.SafeTransactionsBalanceBefore).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(t => t.SafeTransactionsBalanceAfter).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(t => t.SafeTransactionsStatus).HasMaxLength(50).HasDefaultValue("pending");
            e.HasOne(t => t.Safe).WithMany(s => s.Transactions).HasForeignKey(t => t.SafeTransactionsSafeId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(t => t.CreatedByUser).WithMany().HasForeignKey(t => t.SafeTransactionsCreatedBy).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Payment>(e =>
        {
            e.HasKey(p => p.PaymentsId);
            e.Property(p => p.PaymentsId).UseIdentityColumn();
            e.Property(p => p.PaymentsAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.HasOne(p => p.Client).WithMany(c => c.Payments).HasForeignKey(p => p.PaymentsClientId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.Method).WithMany(m => m.Payments).HasForeignKey(p => p.PaymentsMethodId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.Safe).WithMany(s => s.Payments).HasForeignKey(p => p.PaymentsSafeId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.RepUser).WithMany().HasForeignKey(p => p.PaymentsRepUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Refund>(e =>
        {
            e.HasKey(r => r.RefundsId);
            e.Property(r => r.RefundsId).UseIdentityColumn();
            e.Property(r => r.RefundsAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.HasOne(r => r.Client).WithMany(c => c.Refunds).HasForeignKey(r => r.RefundsClientId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(r => r.Method).WithMany(m => m.Refunds).HasForeignKey(r => r.RefundsMethodId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(r => r.Safe).WithMany(s => s.Refunds).HasForeignKey(r => r.RefundsSafeId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Invoice>(e =>
        {
            e.HasKey(i => i.InvoicesId);
            e.Property(i => i.InvoicesId).UseIdentityColumn();
            e.Property(i => i.InvoicesTotalAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.InvoicesStatus).HasMaxLength(50).HasDefaultValue("draft");
        });

        modelBuilder.Entity<FinancialTransaction>(e =>
        {
            e.HasKey(f => f.FinancialTransactionsId);
            e.Property(f => f.FinancialTransactionsId).UseIdentityColumn();
            e.Property(f => f.FinancialTransactionsAmount).HasPrecision(15, 2).HasDefaultValue(0);
        });

        // ── Purchase ─────────────────────────────────────────────────────────
        modelBuilder.Entity<PurchaseOrder>(e =>
        {
            e.HasKey(o => o.PurchaseOrdersId);
            e.Property(o => o.PurchaseOrdersId).UseIdentityColumn();
            e.Property(o => o.PurchaseOrdersTotalAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(o => o.PurchaseOrdersStatus).HasMaxLength(50).HasDefaultValue("Ordered");
            e.HasOne(o => o.Supplier).WithMany(s => s.PurchaseOrders).HasForeignKey(o => o.PurchaseOrdersSupplierId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(o => o.Warehouse).WithMany(w => w.PurchaseOrders).HasForeignKey(o => o.PurchaseOrdersWarehouseId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PurchaseOrderItem>(e =>
        {
            e.HasKey(i => i.PurchaseOrderItemsId);
            e.Property(i => i.PurchaseOrderItemsId).UseIdentityColumn();
            e.Property(i => i.PurchaseOrderItemsUnitCost).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.PurchaseOrderItemsTotalCost).HasPrecision(15, 2).HasDefaultValue(0);
            e.HasOne(i => i.PurchaseOrder).WithMany(o => o.Items).HasForeignKey(i => i.PurchaseOrderItemsPurchaseOrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Variant).WithMany().HasForeignKey(i => i.PurchaseOrderItemsVariantId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(i => i.PackagingType).WithMany().HasForeignKey(i => i.PurchaseOrderItemsPackagingTypeId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PurchaseReturn>(e =>
        {
            e.HasKey(r => r.PurchaseReturnsId);
            e.Property(r => r.PurchaseReturnsId).UseIdentityColumn();
            e.Property(r => r.PurchaseReturnsTotalAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(r => r.PurchaseReturnsStatus).HasMaxLength(50).HasDefaultValue("Pending");
            e.HasOne(r => r.PurchaseOrder).WithMany(o => o.Returns).HasForeignKey(r => r.PurchaseReturnsPurchaseOrderId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(r => r.Supplier).WithMany(s => s.PurchaseReturns).HasForeignKey(r => r.PurchaseReturnsSupplierId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Sales ────────────────────────────────────────────────────────────
        modelBuilder.Entity<SalesOrder>(e =>
        {
            e.HasKey(o => o.SalesOrdersId);
            e.Property(o => o.SalesOrdersId).UseIdentityColumn();
            e.Property(o => o.SalesOrdersStatus).HasMaxLength(50).HasDefaultValue("Pending");
            e.Property(o => o.SalesOrdersDeliveryStatus).HasMaxLength(50).HasDefaultValue("Not Delivered");
            e.Property(o => o.SalesOrdersSubtotal).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(o => o.SalesOrdersDiscountAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(o => o.SalesOrdersTaxAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(o => o.SalesOrdersTotalAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.HasOne(o => o.Client).WithMany(c => c.SalesOrders).HasForeignKey(o => o.SalesOrdersClientId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(o => o.Representative).WithMany(u => u.SalesOrders).HasForeignKey(o => o.SalesOrdersRepresentativeId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(o => o.Warehouse).WithMany(w => w.SalesOrders).HasForeignKey(o => o.SalesOrdersWarehouseId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SalesOrderItem>(e =>
        {
            e.HasKey(i => i.SalesOrderItemsId);
            e.Property(i => i.SalesOrderItemsId).UseIdentityColumn();
            e.Property(i => i.SalesOrderItemsUnitPrice).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.SalesOrderItemsSubtotal).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.SalesOrderItemsDiscountAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.SalesOrderItemsTaxAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.SalesOrderItemsTaxRate).HasPrecision(5, 2).HasDefaultValue(0);
            e.Property(i => i.SalesOrderItemsTotalPrice).HasPrecision(15, 2).HasDefaultValue(0);
            e.HasOne(i => i.SalesOrder).WithMany(o => o.Items).HasForeignKey(i => i.SalesOrderItemsSalesOrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Variant).WithMany().HasForeignKey(i => i.SalesOrderItemsVariantId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(i => i.PackagingType).WithMany().HasForeignKey(i => i.SalesOrderItemsPackagingTypeId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SalesDelivery>(e =>
        {
            e.HasKey(d => d.SalesDeliveriesId);
            e.Property(d => d.SalesDeliveriesId).UseIdentityColumn();
            e.Property(d => d.SalesDeliveriesDeliveryStatus).HasMaxLength(50).HasDefaultValue("Preparing");
            e.HasOne(d => d.SalesOrder).WithMany(o => o.Deliveries).HasForeignKey(d => d.SalesDeliveriesSalesOrderId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SalesDeliveryItem>(e =>
        {
            e.HasKey(i => i.SalesDeliveryItemsId);
            e.Property(i => i.SalesDeliveryItemsId).UseIdentityColumn();
            e.HasOne(i => i.SalesDelivery).WithMany(d => d.Items).HasForeignKey(i => i.SalesDeliveryItemsSalesDeliveryId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SalesReturn>(e =>
        {
            e.HasKey(r => r.ReturnsId);
            e.Property(r => r.ReturnsId).UseIdentityColumn();
            e.Property(r => r.ReturnsTotalAmount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(r => r.ManualDiscount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(r => r.ReturnsStatus).HasMaxLength(50).HasDefaultValue("Pending");
            e.HasOne(r => r.Client).WithMany().HasForeignKey(r => r.ReturnsClientId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(r => r.SalesOrder).WithMany(o => o.Returns).HasForeignKey(r => r.ReturnsSalesOrderId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SalesReturnItem>(e =>
        {
            e.HasKey(i => i.ReturnItemsId);
            e.Property(i => i.ReturnItemsId).UseIdentityColumn();
            e.Property(i => i.ReturnItemsUnitPrice).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.ReturnItemsTotalPrice).HasPrecision(15, 2).HasDefaultValue(0);
            e.HasOne(i => i.Return).WithMany(r => r.Items).HasForeignKey(i => i.ReturnItemsReturnId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.SalesOrderItem).WithMany().HasForeignKey(i => i.ReturnItemsSalesOrderItemId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Inventory Movements ──────────────────────────────────────────────
        modelBuilder.Entity<GoodsReceipt>(e =>
        {
            e.HasKey(g => g.GoodsReceiptId);
            e.Property(g => g.GoodsReceiptId).UseIdentityColumn();
            e.HasOne(g => g.Warehouse).WithMany(w => w.GoodsReceipts).HasForeignKey(g => g.GoodsReceiptWarehouseId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(g => g.PurchaseOrder).WithMany(o => o.GoodsReceipts).HasForeignKey(g => g.GoodsReceiptPurchaseOrderId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<GoodsReceiptItem>(e =>
        {
            e.HasKey(i => i.GoodsReceiptItemsId);
            e.Property(i => i.GoodsReceiptItemsId).UseIdentityColumn();
            e.HasOne(i => i.GoodsReceipt).WithMany(g => g.Items).HasForeignKey(i => i.GoodsReceiptItemsGoodsReceiptId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TransferRequest>(e =>
        {
            e.HasKey(t => t.RequestId);
            e.Property(t => t.RequestId).UseIdentityColumn();
            e.Property(t => t.RequestStatus).HasMaxLength(50).HasDefaultValue("Pending");
            e.HasOne(t => t.SourceWarehouse).WithMany().HasForeignKey(t => t.RequestSourceWarehouseId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.DestinationWarehouse).WithMany().HasForeignKey(t => t.RequestDestinationWarehouseId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.CreatedByUser).WithMany().HasForeignKey(t => t.RequestCreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TransferRequestItem>(e =>
        {
            e.HasKey(i => i.RequestItemId);
            e.Property(i => i.RequestItemId).UseIdentityColumn();
            e.Property(i => i.RequestedQuantity).HasPrecision(10, 2).HasDefaultValue(0);
            e.HasOne(i => i.Request).WithMany(r => r.Items).HasForeignKey(i => i.RequestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Variant).WithMany().HasForeignKey(i => i.VariantId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(i => i.PackagingType).WithMany().HasForeignKey(i => i.PackagingTypeId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Transfer>(e =>
        {
            e.HasKey(t => t.TransferId);
            e.Property(t => t.TransferId).UseIdentityColumn();
            e.Property(t => t.TransferStatus).HasMaxLength(50).HasDefaultValue("Pending");
            e.HasOne(t => t.FromWarehouse).WithMany().HasForeignKey(t => t.TransferFromWarehouseId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.ToWarehouse).WithMany().HasForeignKey(t => t.TransferToWarehouseId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.User).WithMany().HasForeignKey(t => t.TransferUserId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Visits ───────────────────────────────────────────────────────────
        modelBuilder.Entity<VisitPlan>(e =>
        {
            e.HasKey(v => v.VisitPlanId);
            e.Property(v => v.VisitPlanId).UseIdentityColumn();
            e.Property(v => v.VisitPlanStatus).HasMaxLength(50).HasDefaultValue("active");
            e.Property(v => v.VisitPlanRepeatEvery).HasDefaultValue(1);
            e.HasOne(v => v.User).WithMany().HasForeignKey(v => v.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<VisitPlanClient>(e =>
        {
            e.HasKey(v => v.Id);
            e.Property(v => v.Id).UseIdentityColumn();
            e.HasOne(v => v.VisitPlan).WithMany(p => p.Clients).HasForeignKey(v => v.VisitPlanId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(v => v.Client).WithMany().HasForeignKey(v => v.ClientId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Visit>(e =>
        {
            e.HasKey(v => v.VisitsId);
            e.Property(v => v.VisitsId).UseIdentityColumn();
            e.Property(v => v.VisitsStatus).HasMaxLength(50).HasDefaultValue("Started");
            e.Property(v => v.VisitsStartLatitude).HasPrecision(10, 7);
            e.Property(v => v.VisitsStartLongitude).HasPrecision(10, 7);
            e.Property(v => v.VisitsEndLatitude).HasPrecision(10, 7);
            e.Property(v => v.VisitsEndLongitude).HasPrecision(10, 7);
            e.HasOne(v => v.Client).WithMany(c => c.Visits).HasForeignKey(v => v.VisitsClientId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(v => v.RepUser).WithMany(u => u.Visits).HasForeignKey(v => v.VisitsRepUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<VisitActivity>(e =>
        {
            e.HasKey(a => a.ActivityId);
            e.Property(a => a.ActivityId).UseIdentityColumn();
            e.Property(a => a.ActivityType).HasMaxLength(50).IsRequired();
            e.HasOne(a => a.Visit).WithMany(v => v.Activities).HasForeignKey(a => a.ActivityVisitId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.User).WithMany().HasForeignKey(a => a.ActivityUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RepLocationTracking>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).UseIdentityColumn();
            e.Property(r => r.Latitude).HasPrecision(10, 7).IsRequired();
            e.Property(r => r.Longitude).HasPrecision(10, 7).IsRequired();
            e.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── Notifications ────────────────────────────────────────────────────
        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.NotificationsId);
            e.Property(n => n.NotificationsId).UseIdentityColumn();
            e.Property(n => n.NotificationsPriority).HasMaxLength(50).HasDefaultValue("normal");
            e.Property(n => n.NotificationsIsRead).HasDefaultValue(false);
        });

        // ── New entities ─────────────────────────────────────────────────────
        modelBuilder.Entity<UserSafe>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).UseIdentityColumn();
            e.HasIndex(x => new { x.UserId, x.SafeId }).IsUnique();
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Safe).WithMany().HasForeignKey(x => x.SafeId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserWarehouse>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).UseIdentityColumn();
            e.HasIndex(x => new { x.UserId, x.WarehouseId }).IsUnique();
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Warehouse).WithMany().HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SupplierPayment>(e =>
        {
            e.HasKey(x => x.SupplierPaymentId);
            e.Property(x => x.SupplierPaymentId).UseIdentityColumn();
            e.Property(x => x.Amount).HasPrecision(15, 2).HasDefaultValue(0);
            e.HasOne(x => x.Supplier).WithMany().HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.PurchaseOrder).WithMany().HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Safe).WithMany().HasForeignKey(x => x.SafeId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.PaymentMethod).WithMany().HasForeignKey(x => x.PaymentMethodId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SafeTransfer>(e =>
        {
            e.HasKey(x => x.SafeTransferId);
            e.Property(x => x.SafeTransferId).UseIdentityColumn();
            e.Property(x => x.Amount).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(x => x.Status).HasMaxLength(50).HasDefaultValue("Completed");
            e.HasOne(x => x.FromSafe).WithMany().HasForeignKey(x => x.FromSafeId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.ToSafe).WithMany().HasForeignKey(x => x.ToSafeId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RepresentativeAttendance>(e =>
        {
            e.HasKey(x => x.AttendanceId);
            e.Property(x => x.AttendanceId).UseIdentityColumn();
            e.Property(x => x.Status).HasMaxLength(50).HasDefaultValue("Present");
            e.Property(x => x.CheckInLatitude).HasPrecision(10, 7);
            e.Property(x => x.CheckInLongitude).HasPrecision(10, 7);
            e.Property(x => x.CheckOutLatitude).HasPrecision(10, 7);
            e.Property(x => x.CheckOutLongitude).HasPrecision(10, 7);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── Chart of Accounts ─────────────────────────────────────────────────────
        modelBuilder.Entity<Account>(e =>
        {
            e.HasKey(a => a.AccountsId);
            e.Property(a => a.AccountsId).UseIdentityColumn();
            e.HasIndex(a => a.AccountsCode).IsUnique();
            e.Property(a => a.AccountsCode).HasMaxLength(50).IsRequired();
            e.Property(a => a.AccountsName).HasMaxLength(200).IsRequired();
            e.Property(a => a.AccountsType).HasMaxLength(100).HasDefaultValue("مصروفات");
            e.Property(a => a.AccountsSortId).HasDefaultValue(0);
        });

        // ── Inventory Movements ───────────────────────────────────────────────
        modelBuilder.Entity<InventoryMovement>(e =>
        {
            e.HasKey(m => m.MovementId);
            e.Property(m => m.MovementId).UseIdentityColumn();
            e.Property(m => m.Quantity).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(m => m.MovementType).HasMaxLength(50);
            e.HasOne(m => m.Variant).WithMany().HasForeignKey(m => m.ProductVariantId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(m => m.Warehouse).WithMany().HasForeignKey(m => m.WarehouseId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Invoice Items ─────────────────────────────────────────────────────
        modelBuilder.Entity<InvoiceItem>(e =>
        {
            e.HasKey(i => i.InvoiceItemId);
            e.Property(i => i.InvoiceItemId).UseIdentityColumn();
            e.Property(i => i.InvoiceItemUnitPrice).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.InvoiceItemTotalPrice).HasPrecision(15, 2).HasDefaultValue(0);
            e.HasOne(i => i.Invoice).WithMany(inv => inv.Items).HasForeignKey(i => i.InvoiceItemInvoiceId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Product).WithMany().HasForeignKey(i => i.InvoiceItemProductId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Purchase Return Items ─────────────────────────────────────────────
        modelBuilder.Entity<PurchaseReturnItem>(e =>
        {
            e.HasKey(i => i.PurchaseReturnItemsId);
            e.Property(i => i.PurchaseReturnItemsId).UseIdentityColumn();
            e.Property(i => i.PurchaseReturnItemsUnitCost).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.PurchaseReturnItemsTotalCost).HasPrecision(15, 2).HasDefaultValue(0);
            e.Property(i => i.PurchaseReturnItemsNotes).HasColumnType("text");
            e.HasOne(i => i.PurchaseReturn).WithMany(r => r.Items).HasForeignKey(i => i.PurchaseReturnItemsReturnId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.PurchaseOrderItem).WithMany().HasForeignKey(i => i.PurchaseReturnItemsPurchaseOrderItemId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Transfer Items ────────────────────────────────────────────────────
        modelBuilder.Entity<TransferItem>(e =>
        {
            e.HasKey(i => i.TransferItemsId);
            e.Property(i => i.TransferItemsId).UseIdentityColumn();
            e.HasOne(i => i.Transfer).WithMany(t => t.Items).HasForeignKey(i => i.TransferItemsTransferId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Variant).WithMany().HasForeignKey(i => i.TransferItemsVariantId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
