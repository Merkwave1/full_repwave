using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Admin;

/// <summary>Seeds minimal sample ERP data into a tenant DB for admin preview.</summary>
public record SeedTenantSampleDataCommand(string TenantId) : IRequest<ApiResponse<TenantUsageSummaryDto>>;

public class SeedTenantSampleDataCommandHandler(
    IMasterDbContext masterDb,
    ITenantDbContextFactory dbFactory,
    IAdminTenantHealthReader healthReader)
    : IRequestHandler<SeedTenantSampleDataCommand, ApiResponse<TenantUsageSummaryDto>>
{
    public async Task<ApiResponse<TenantUsageSummaryDto>> Handle(
        SeedTenantSampleDataCommand request, CancellationToken ct)
    {
        var tenant = await masterDb.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantId == request.TenantId, ct);
        if (tenant is null)
            return ApiResponse<TenantUsageSummaryDto>.Failure("Tenant not found.");

        try
        {
            using var db = dbFactory.CreateFromConnectionString(tenant.ConnectionString);

            if (await db.Clients.CountAsync(ct) < 3)
            {
                var names = new[] { ("سوبر ماركت النور", "nour@client.com"), ("بقالة الأمانة", "amana@client.com"), ("صيدلية الشفاء", "shifa@client.com") };
                foreach (var (company, email) in names)
                {
                    if (await db.Clients.AnyAsync(c => c.ClientsCompanyName == company, ct)) continue;
                    db.Clients.Add(new Client
                    {
                        ClientsCompanyName = company,
                        ClientsContactName = "مدير",
                        ClientsEmail = email,
                        ClientsStatus = "active",
                        ClientsType = "customer",
                        ClientsCreditLimit = 10000,
                        ClientsCreatedAt = DateTime.UtcNow,
                    });
                }
            }

            if (await db.Products.CountAsync(ct) < 2)
            {
                if (!await db.Products.AnyAsync(p => p.ProductsName == "مياه معدنية 1.5 لتر", ct))
                {
                    var product = new Product
                    {
                        ProductsName = "مياه معدنية 1.5 لتر",
                        ProductsIsActive = true,
                        ProductsCreatedAt = DateTime.UtcNow,
                    };
                    db.Products.Add(product);
                    await db.SaveChangesAsync(ct);
                    db.ProductVariants.Add(new ProductVariant
                    {
                        VariantProductsId = product.ProductsId,
                        VariantName = "مياه معدنية 1.5 لتر - قطعة",
                        VariantSku = "WATER-15",
                        VariantStatus = "active",
                        VariantUnitPrice = 10,
                    });
                }
            }

            if (await db.Users.CountAsync(u => u.UsersRole == "rep", ct) < 2)
            {
                if (!await db.Users.AnyAsync(u => u.UsersEmail == "rep1@sample.local", ct))
                {
                    db.Users.Add(new User
                    {
                        UsersName = "مندوب تجريبي ١",
                        UsersEmail = "rep1@sample.local",
                        UsersPassword = BCrypt.Net.BCrypt.HashPassword("Sample123!"),
                        UsersRole = "rep",
                        UsersStatus = true,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }

            await db.SaveChangesAsync(ct);

            if (await db.SalesOrders.CountAsync(ct) < 2)
            {
                var clientId = await db.Clients.Select(c => c.ClientsId).FirstOrDefaultAsync(ct);
                if (clientId > 0)
                {
                    db.SalesOrders.Add(new SalesOrder
                    {
                        SalesOrdersClientId = clientId,
                        SalesOrdersStatus = "confirmed",
                        SalesOrdersDeliveryStatus = "Delivered",
                        SalesOrdersOrderDate = DateTime.UtcNow.AddDays(-3),
                        SalesOrdersTotalAmount = 1500,
                        SalesOrdersCreatedAt = DateTime.UtcNow.AddDays(-3),
                    });
                    db.SalesOrders.Add(new SalesOrder
                    {
                        SalesOrdersClientId = clientId,
                        SalesOrdersStatus = "pending",
                        SalesOrdersDeliveryStatus = "Not Delivered",
                        SalesOrdersOrderDate = DateTime.UtcNow,
                        SalesOrdersTotalAmount = 800,
                        SalesOrdersCreatedAt = DateTime.UtcNow,
                    });
                }
            }

            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            return ApiResponse<TenantUsageSummaryDto>.Failure($"Seed failed: {ex.Message}");
        }

        var usage = await healthReader.ReadSummaryAsync(tenant.ConnectionString, ct);
        return ApiResponse<TenantUsageSummaryDto>.Success(usage, "Sample data seeded.");
    }
}
