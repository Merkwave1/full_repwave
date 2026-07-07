using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

namespace RepWave.Application.Features.Clients;

// DTOs
public record ClientDto(
    int ClientsId, string ClientsCompanyName, string? ClientsEmail, string? ClientsContactName,
    string? ClientsContactPhone1, string? ClientsContactPhone2, string? ClientsContactJobTitle,
    string? ClientsAddress, string? ClientsStreet2, string? ClientsBuildingNumber,
    string? ClientsCity, string? ClientsZip, int? ClientsCountryId, int? ClientsGovernorateId,
    int? ClientsAreaTagId, int? ClientsClientTypeId, int? ClientsIndustryId, int? ClientsRepUserId,
    decimal ClientsCreditLimit, decimal ClientsCreditBalance, string ClientsStatus,
    string? ClientsVatNumber, string? ClientsWebsite, string? ClientsDescription,
    string? ClientsSource, string? ClientsPaymentTerms, string? ClientsReferenceNote,
    decimal? ClientsLatitude, decimal? ClientsLongitude,
    DateTime? ClientsLastVisit, DateTime? ClientsCreatedAt, DateTime? ClientsUpdatedAt,
    string? ClientsImage = null,
    string? ClientsType = null,
    [property: JsonPropertyName("clients_total_orders")] int ClientsTotalOrders = 0,
    [property: JsonPropertyName("clients_total_revenue")] decimal ClientsTotalRevenue = 0,
    [property: JsonPropertyName("clients_last_order_date")] DateTime? ClientsLastOrderDate = null);

internal static class ClientDtoMapper
{
    public static ClientDto ToDto(
        Client c,
        int totalOrders = 0,
        decimal totalRevenue = 0,
        DateTime? lastOrderDate = null) =>
        new(
            c.ClientsId, c.ClientsCompanyName, c.ClientsEmail, c.ClientsContactName,
            c.ClientsContactPhone1, c.ClientsContactPhone2, c.ClientsContactJobTitle,
            c.ClientsAddress, c.ClientsStreet2, c.ClientsBuildingNumber,
            c.ClientsCity, c.ClientsZip, c.ClientsCountryId,
            c.ClientsGovernorateId, c.ClientsAreaTagId, c.ClientsClientTypeId, c.ClientsIndustryId,
            c.ClientsRepUserId, c.ClientsCreditLimit, c.ClientsCreditBalance,
            c.ClientsStatus, c.ClientsVatNumber, c.ClientsWebsite, c.ClientsDescription,
            c.ClientsSource, c.ClientsPaymentTerms, c.ClientsReferenceNote,
            c.ClientsLatitude, c.ClientsLongitude,
            c.ClientsLastVisit, c.ClientsCreatedAt, c.ClientsUpdatedAt, c.ClientsImage,
            c.ClientsType, totalOrders, totalRevenue, lastOrderDate);
}

public record CreateClientRequest(string ClientsCompanyName, string? ClientsEmail, string? ClientsContactName,
    string? ClientsContactPhone1, string? ClientsContactPhone2, string? ClientsAddress, string? ClientsCity,
    int? ClientsCountryId, int? ClientsGovernorateId, int? ClientsAreaTagId, int? ClientsClientTypeId,
    int? ClientsIndustryId, int? ClientsRepUserId, decimal ClientsCreditLimit = 0,
    string ClientsStatus = "active", decimal? ClientsLatitude = null, decimal? ClientsLongitude = null,
    string? ClientsImage = null);

public record UpdateClientRequest(
    string ClientsCompanyName, string? ClientsEmail, string? ClientsContactName,
    string? ClientsContactPhone1, string? ClientsContactPhone2, string? ClientsContactJobTitle,
    string? ClientsAddress, string? ClientsStreet2, string? ClientsBuildingNumber,
    string? ClientsCity, string? ClientsZip, int? ClientsCountryId, int? ClientsGovernorateId,
    int? ClientsAreaTagId, int? ClientsClientTypeId, int? ClientsIndustryId, int? ClientsRepUserId,
    decimal ClientsCreditLimit, string ClientsStatus,
    string? ClientsVatNumber, string? ClientsWebsite, string? ClientsDescription,
    string? ClientsSource, string? ClientsPaymentTerms, string? ClientsReferenceNote,
    decimal? ClientsLatitude = null, decimal? ClientsLongitude = null,
    string? ClientsImage = null);

// Queries
public record GetAllClientsQuery(int Page = 1, int PageSize = 50, string? Status = null)
    : IRequest<ApiResponse<PagedResult<ClientDto>>>;

public class GetAllClientsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllClientsQuery, ApiResponse<PagedResult<ClientDto>>>
{
    public async Task<ApiResponse<PagedResult<ClientDto>>> Handle(GetAllClientsQuery q, CancellationToken ct)
    {
        var query = db.Clients.AsNoTracking();
        if (q.Status is not null) query = query.Where(c => c.ClientsStatus == q.Status);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(c => c.ClientsCreatedAt)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(c => new ClientDto(
                c.ClientsId, c.ClientsCompanyName, c.ClientsEmail, c.ClientsContactName,
                c.ClientsContactPhone1, c.ClientsContactPhone2, c.ClientsContactJobTitle,
                c.ClientsAddress, c.ClientsStreet2, c.ClientsBuildingNumber,
                c.ClientsCity, c.ClientsZip, c.ClientsCountryId,
                c.ClientsGovernorateId, c.ClientsAreaTagId, c.ClientsClientTypeId, c.ClientsIndustryId,
                c.ClientsRepUserId, c.ClientsCreditLimit, c.ClientsCreditBalance,
                c.ClientsStatus, c.ClientsVatNumber, c.ClientsWebsite, c.ClientsDescription,
                c.ClientsSource, c.ClientsPaymentTerms, c.ClientsReferenceNote,
                c.ClientsLatitude, c.ClientsLongitude,
                c.ClientsLastVisit, c.ClientsCreatedAt, c.ClientsUpdatedAt,
                c.ClientsImage, c.ClientsType, 0, 0m, null))
            .ToListAsync(ct);
        return ApiResponse<PagedResult<ClientDto>>.Success(new() { Data = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize });
    }
}

public record GetClientByIdQuery(int Id) : IRequest<ApiResponse<ClientDto>>;
public class GetClientByIdQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetClientByIdQuery, ApiResponse<ClientDto>>
{
    public async Task<ApiResponse<ClientDto>> Handle(GetClientByIdQuery q, CancellationToken ct)
    {
        var c = await db.Clients.AsNoTracking().FirstOrDefaultAsync(x => x.ClientsId == q.Id, ct);
        if (c is null) return ApiResponse<ClientDto>.Failure("Client not found.");

        var orders = db.SalesOrders.AsNoTracking().Where(o => o.SalesOrdersClientId == q.Id);
        var totalOrders = await orders.CountAsync(ct);
        var totalRevenue = totalOrders > 0
            ? await orders.SumAsync(o => o.SalesOrdersTotalAmount, ct)
            : 0m;
        var lastOrderDate = totalOrders > 0
            ? await orders.MaxAsync(o => o.SalesOrdersOrderDate, ct)
            : null;

        return ApiResponse<ClientDto>.Success(
            ClientDtoMapper.ToDto(c, totalOrders, totalRevenue, lastOrderDate));
    }
}

// Commands
public record CreateClientCommand(CreateClientRequest Request) : IRequest<ApiResponse<ClientDto>>;
public class CreateClientCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateClientCommand, ApiResponse<ClientDto>>
{
    public async Task<ApiResponse<ClientDto>> Handle(CreateClientCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;
        var client = new Client
        {
            ClientsCompanyName = r.ClientsCompanyName,
            ClientsEmail = r.ClientsEmail,
            ClientsContactName = r.ClientsContactName,
            ClientsContactPhone1 = r.ClientsContactPhone1,
            ClientsContactPhone2 = r.ClientsContactPhone2,
            ClientsAddress = r.ClientsAddress,
            ClientsCity = r.ClientsCity,
            ClientsCountryId = r.ClientsCountryId,
            ClientsGovernorateId = r.ClientsGovernorateId,
            ClientsAreaTagId = r.ClientsAreaTagId,
            ClientsClientTypeId = r.ClientsClientTypeId,
            ClientsIndustryId = r.ClientsIndustryId,
            ClientsRepUserId = r.ClientsRepUserId,
            ClientsCreditLimit = r.ClientsCreditLimit,
            ClientsStatus = r.ClientsStatus,
            ClientsLatitude = r.ClientsLatitude,
            ClientsLongitude = r.ClientsLongitude,
            ClientsImage = r.ClientsImage,
            ClientsCreatedAt = DateTime.UtcNow
        };
        db.Clients.Add(client);
        await db.SaveChangesAsync(ct);
        return ApiResponse<ClientDto>.Success(ClientDtoMapper.ToDto(client));
    }
}

public record UpdateClientCommand(int Id, UpdateClientRequest Request) : IRequest<ApiResponse<ClientDto>>;
public class UpdateClientCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateClientCommand, ApiResponse<ClientDto>>
{
    public async Task<ApiResponse<ClientDto>> Handle(UpdateClientCommand cmd, CancellationToken ct)
    {
        var client = await db.Clients.FindAsync([cmd.Id], ct);
        if (client is null) return ApiResponse<ClientDto>.Failure("Client not found.");
        var r = cmd.Request;
        client.ClientsCompanyName = r.ClientsCompanyName; client.ClientsEmail = r.ClientsEmail;
        client.ClientsContactName = r.ClientsContactName; client.ClientsContactPhone1 = r.ClientsContactPhone1;
        client.ClientsContactPhone2 = r.ClientsContactPhone2; client.ClientsContactJobTitle = r.ClientsContactJobTitle;
        client.ClientsAddress = r.ClientsAddress; client.ClientsStreet2 = r.ClientsStreet2;
        client.ClientsBuildingNumber = r.ClientsBuildingNumber; client.ClientsCity = r.ClientsCity;
        client.ClientsZip = r.ClientsZip; client.ClientsCountryId = r.ClientsCountryId;
        client.ClientsGovernorateId = r.ClientsGovernorateId; client.ClientsAreaTagId = r.ClientsAreaTagId;
        client.ClientsClientTypeId = r.ClientsClientTypeId; client.ClientsIndustryId = r.ClientsIndustryId;
        client.ClientsRepUserId = r.ClientsRepUserId; client.ClientsCreditLimit = r.ClientsCreditLimit;
        client.ClientsStatus = r.ClientsStatus; client.ClientsVatNumber = r.ClientsVatNumber;
        client.ClientsWebsite = r.ClientsWebsite; client.ClientsDescription = r.ClientsDescription;
        client.ClientsSource = r.ClientsSource; client.ClientsPaymentTerms = r.ClientsPaymentTerms;
        client.ClientsReferenceNote = r.ClientsReferenceNote; client.ClientsLatitude = r.ClientsLatitude;
        client.ClientsLongitude = r.ClientsLongitude; client.ClientsImage = r.ClientsImage; client.ClientsUpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var orders = db.SalesOrders.AsNoTracking().Where(o => o.SalesOrdersClientId == cmd.Id);
        var totalOrders = await orders.CountAsync(ct);
        var totalRevenue = totalOrders > 0
            ? await orders.SumAsync(o => o.SalesOrdersTotalAmount, ct)
            : 0m;
        var lastOrderDate = totalOrders > 0
            ? await orders.MaxAsync(o => o.SalesOrdersOrderDate, ct)
            : null;

        return ApiResponse<ClientDto>.Success(
            ClientDtoMapper.ToDto(client, totalOrders, totalRevenue, lastOrderDate));
    }
}

public record DeleteClientCommand(int Id) : IRequest<ApiResponse<object>>;
public class DeleteClientCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteClientCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteClientCommand cmd, CancellationToken ct)
    {
        var client = await db.Clients.FindAsync([cmd.Id], ct);
        if (client is null) return ApiResponse<object>.Failure("العميل غير موجود.");

        // Check for blocking related records
        var hasInvoices      = await db.Invoices.AnyAsync(x => x.InvoicesClientId == cmd.Id, ct);
        var hasSalesOrders   = await db.SalesOrders.AnyAsync(x => x.SalesOrdersClientId == cmd.Id, ct);
        var hasVisits        = await db.Visits.AnyAsync(x => x.VisitsClientId == cmd.Id, ct);
        var hasVisitPlans    = await db.VisitPlanClients.AnyAsync(x => x.ClientId == cmd.Id, ct);
        var hasPayments      = await db.Payments.AnyAsync(x => x.PaymentsClientId == cmd.Id, ct);
        var hasRefunds       = await db.Refunds.AnyAsync(x => x.RefundsClientId == cmd.Id, ct);
        var hasSalesReturns  = await db.SalesReturns.AnyAsync(x => x.ReturnsClientId == cmd.Id, ct);

        if (hasInvoices || hasSalesOrders || hasVisits || hasVisitPlans || hasPayments || hasRefunds || hasSalesReturns)
        {
            var reasons = new List<string>();
            if (hasInvoices)     reasons.Add("فواتير");
            if (hasSalesOrders)  reasons.Add("طلبات مبيعات");
            if (hasVisits)       reasons.Add("زيارات");
            if (hasVisitPlans)   reasons.Add("خطط زيارة");
            if (hasPayments)     reasons.Add("مدفوعات");
            if (hasRefunds)      reasons.Add("مسترجعات");
            if (hasSalesReturns) reasons.Add("مرتجعات مبيعات");
            return ApiResponse<object>.Failure(
                $"لا يمكن حذف العميل لارتباطه بـ: {string.Join("، ", reasons)}.");
        }

        // Remove owned records before deleting the client
        var docs = db.ClientDocuments.Where(x => x.ClientDocumentClientId == cmd.Id);
        db.ClientDocuments.RemoveRange(docs);
        var interested = db.ClientInterestedProducts.Where(x => x.ClientId == cmd.Id);
        db.ClientInterestedProducts.RemoveRange(interested);

        db.Clients.Remove(client);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null, "تم حذف العميل بنجاح.");
    }
}
