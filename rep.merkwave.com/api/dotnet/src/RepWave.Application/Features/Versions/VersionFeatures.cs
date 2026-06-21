using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Versions;

public record AppVersionDto(int VersionsId, string Entity, int Version, DateTime? UpdatedAt);

public record GetVersionsQuery(string? Entity = null) : IRequest<ApiResponse<List<AppVersionDto>>>;

public class GetVersionsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetVersionsQuery, ApiResponse<List<AppVersionDto>>>
{
    public async Task<ApiResponse<List<AppVersionDto>>> Handle(GetVersionsQuery request, CancellationToken ct)
    {
        var query = db.AppVersions.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(request.Entity))
            query = query.Where(v => v.Entity == request.Entity);

        var list = await query
            .Select(v => new AppVersionDto(v.VersionsId, v.Entity, v.Version, v.UpdatedAt))
            .ToListAsync(ct);

        return ApiResponse<List<AppVersionDto>>.Success(list);
    }
}

/// <summary>
/// Atomically increments the version counter for the given entity type.
/// If no record exists for the entity, one is created at version 1.
/// Clients can call this after a batch sync to detect changes.
/// </summary>
public record IncrementVersionCommand(string Entity) : IRequest<ApiResponse<AppVersionDto>>;

public class IncrementVersionCommandHandler(IApplicationDbContext db)
    : IRequestHandler<IncrementVersionCommand, ApiResponse<AppVersionDto>>
{
    public async Task<ApiResponse<AppVersionDto>> Handle(IncrementVersionCommand request, CancellationToken ct)
    {
        var ver = await db.AppVersions.FirstOrDefaultAsync(v => v.Entity == request.Entity, ct);

        if (ver is null)
        {
            ver = new AppVersion { Entity = request.Entity, Version = 1, UpdatedAt = DateTime.UtcNow };
            db.AppVersions.Add(ver);
        }
        else
        {
            ver.Version += 1;
            ver.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<AppVersionDto>.Success(new AppVersionDto(ver.VersionsId, ver.Entity, ver.Version, ver.UpdatedAt));
    }
}
