using MediatR;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RepWave.Application.Features.Visits;

public record VisitDto(int VisitsId, int VisitsClientId, int VisitsRepUserId, DateTime VisitsStartTime,
    DateTime? VisitsEndTime, decimal? VisitsStartLatitude, decimal? VisitsStartLongitude,
    string? VisitsPurpose, string? VisitsOutcome, string VisitsStatus, DateTime? VisitsCreatedAt);
public record CreateVisitRequest(int ClientId, DateTime StartTime, decimal? StartLatitude, decimal? StartLongitude, string? Purpose);
public record EndVisitRequest(DateTime EndTime, decimal? EndLatitude, decimal? EndLongitude, string? Outcome, string? Notes);

public record GetAllVisitsQuery(int Page = 1, int PageSize = 50, int? RepId = null, int? ClientId = null)
    : IRequest<ApiResponse<PagedResult<VisitDto>>>;
public class GetAllVisitsHandler(IApplicationDbContext db) : IRequestHandler<GetAllVisitsQuery, ApiResponse<PagedResult<VisitDto>>>
{
    public async Task<ApiResponse<PagedResult<VisitDto>>> Handle(GetAllVisitsQuery q, CancellationToken ct)
    {
        var query = db.Visits.AsNoTracking();
        if (q.RepId.HasValue) query = query.Where(v => v.VisitsRepUserId == q.RepId);
        if (q.ClientId.HasValue) query = query.Where(v => v.VisitsClientId == q.ClientId);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(v => v.VisitsStartTime).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(v => new VisitDto(v.VisitsId, v.VisitsClientId, v.VisitsRepUserId, v.VisitsStartTime, v.VisitsEndTime, v.VisitsStartLatitude, v.VisitsStartLongitude, v.VisitsPurpose, v.VisitsOutcome, v.VisitsStatus, v.VisitsCreatedAt))
            .ToListAsync(ct);
        return ApiResponse<PagedResult<VisitDto>>.Success(new() { Data = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize });
    }
}

public record StartVisitCommand(int RepUserId, CreateVisitRequest Request) : IRequest<ApiResponse<VisitDto>>;
public class StartVisitHandler(IApplicationDbContext db) : IRequestHandler<StartVisitCommand, ApiResponse<VisitDto>>
{
    public async Task<ApiResponse<VisitDto>> Handle(StartVisitCommand cmd, CancellationToken ct)
    {
        var r = cmd.Request;
        var visit = new Visit
        {
            VisitsClientId = r.ClientId,
            VisitsRepUserId = cmd.RepUserId,
            VisitsStartTime = r.StartTime,
            VisitsStartLatitude = r.StartLatitude,
            VisitsStartLongitude = r.StartLongitude,
            VisitsPurpose = r.Purpose,
            VisitsStatus = "Started",
            VisitsCreatedAt = DateTime.UtcNow
        };
        db.Visits.Add(visit); await db.SaveChangesAsync(ct);
        return ApiResponse<VisitDto>.Success(new VisitDto(visit.VisitsId, visit.VisitsClientId, visit.VisitsRepUserId, visit.VisitsStartTime, visit.VisitsEndTime, visit.VisitsStartLatitude, visit.VisitsStartLongitude, visit.VisitsPurpose, visit.VisitsOutcome, visit.VisitsStatus, visit.VisitsCreatedAt));
    }
}

public record EndVisitCommand(int VisitId, EndVisitRequest Request) : IRequest<ApiResponse<VisitDto>>;
public class EndVisitHandler(IApplicationDbContext db) : IRequestHandler<EndVisitCommand, ApiResponse<VisitDto>>
{
    public async Task<ApiResponse<VisitDto>> Handle(EndVisitCommand cmd, CancellationToken ct)
    {
        var visit = await db.Visits.FindAsync([cmd.VisitId], ct);
        if (visit is null) return ApiResponse<VisitDto>.Failure("Visit not found.");
        var r = cmd.Request;
        visit.VisitsEndTime = r.EndTime; visit.VisitsEndLatitude = r.EndLatitude;
        visit.VisitsEndLongitude = r.EndLongitude; visit.VisitsOutcome = r.Outcome;
        visit.VisitsNotes = r.Notes; visit.VisitsStatus = "Completed"; visit.VisitsUpdatedAt = DateTime.UtcNow;

        // Update client's last visit timestamp
        if (visit.VisitsClientId > 0)
        {
            var client = await db.Clients.FindAsync([visit.VisitsClientId], ct);
            if (client is not null)
                client.ClientsLastVisit = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return ApiResponse<VisitDto>.Success(new VisitDto(visit.VisitsId, visit.VisitsClientId, visit.VisitsRepUserId, visit.VisitsStartTime, visit.VisitsEndTime, visit.VisitsStartLatitude, visit.VisitsStartLongitude, visit.VisitsPurpose, visit.VisitsOutcome, visit.VisitsStatus, visit.VisitsCreatedAt));
    }
}
