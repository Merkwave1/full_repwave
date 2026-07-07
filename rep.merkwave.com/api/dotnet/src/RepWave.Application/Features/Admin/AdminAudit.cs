using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Admin;

public record AdminAuditLogDto(
    int Id,
    string AdminEmail,
    string AdminName,
    string Action,
    string? TenantId,
    int? TargetUserId,
    string? TargetUserEmail,
    string? Details,
    DateTime CreatedAt);

internal static class AdminAuditWriter
{
    public static async Task LogAsync(
        IMasterDbContext masterDb,
        IAdminActorProvider actorProvider,
        string action,
        string? tenantId = null,
        int? targetUserId = null,
        string? targetUserEmail = null,
        string? details = null,
        CancellationToken ct = default)
    {
        var (email, name) = actorProvider.GetCurrentAdmin();

        masterDb.AdminAuditLogs.Add(new AdminAuditLog
        {
            AdminEmail = email,
            AdminName = name,
            Action = action,
            TenantId = tenantId,
            TargetUserId = targetUserId,
            TargetUserEmail = targetUserEmail,
            Details = details,
            CreatedAt = DateTime.UtcNow,
        });
        await masterDb.SaveChangesAsync(ct);
    }
}

public record GetAdminAuditLogQuery(int Limit = 50, string? TenantId = null)
    : IRequest<ApiResponse<List<AdminAuditLogDto>>>;

public class GetAdminAuditLogQueryHandler(IMasterDbContext masterDb)
    : IRequestHandler<GetAdminAuditLogQuery, ApiResponse<List<AdminAuditLogDto>>>
{
    public async Task<ApiResponse<List<AdminAuditLogDto>>> Handle(
        GetAdminAuditLogQuery request, CancellationToken ct)
    {
        var limit = Math.Clamp(request.Limit, 10, 200);
        var query = masterDb.AdminAuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(request.TenantId))
            query = query.Where(l => l.TenantId == request.TenantId);

        var rows = await query
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        var items = rows.Select(l => new AdminAuditLogDto(
            l.Id, l.AdminEmail, l.AdminName, l.Action,
            l.TenantId, l.TargetUserId, l.TargetUserEmail, l.Details, l.CreatedAt))
            .ToList();

        return ApiResponse<List<AdminAuditLogDto>>.Success(items);
    }
}
