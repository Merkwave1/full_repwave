using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Location;

public record LocationDto(
    int Id,
    int UserId,
    string? UserName,
    decimal Latitude,
    decimal Longitude,
    DateTime TrackingTime,
    byte? BatteryLevel,
    string? PhoneInfo);

public record TrackLocationRequest(
    int UserId,
    decimal Latitude,
    decimal Longitude,
    byte? BatteryLevel,
    string? PhoneInfo);

public record GetTrackingHistoryQuery(int UserId, DateTime? FromDate = null, DateTime? ToDate = null, int Limit = 100)
    : IRequest<ApiResponse<List<LocationDto>>>;

public class GetTrackingHistoryQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetTrackingHistoryQuery, ApiResponse<List<LocationDto>>>
{
    public async Task<ApiResponse<List<LocationDto>>> Handle(GetTrackingHistoryQuery request, CancellationToken ct)
    {
        var query = db.RepLocationTrackings.AsNoTracking()
            .Include(r => r.User)
            .Where(r => r.UserId == request.UserId)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(r => r.TrackingTime >= request.FromDate.Value);
        if (request.ToDate.HasValue)
            query = query.Where(r => r.TrackingTime <= request.ToDate.Value);

        var list = await query
            .OrderByDescending(r => r.TrackingTime)
            .Take(request.Limit)
            .Select(r => new LocationDto(
                r.Id, r.UserId, r.User != null ? r.User.UsersName : null,
                r.Latitude, r.Longitude, r.TrackingTime, r.BatteryLevel, r.PhoneInfo))
            .ToListAsync(ct);

        return ApiResponse<List<LocationDto>>.Success(list);
    }
}

public record GetAllRepsLastLocationQuery : IRequest<ApiResponse<List<LocationDto>>>;

public class GetAllRepsLastLocationQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllRepsLastLocationQuery, ApiResponse<List<LocationDto>>>
{
    public async Task<ApiResponse<List<LocationDto>>> Handle(GetAllRepsLastLocationQuery request, CancellationToken ct)
    {
        // Latest tracking point per user
        var list = await db.RepLocationTrackings.AsNoTracking()
            .Include(r => r.User)
            .GroupBy(r => r.UserId)
            .Select(g => g.OrderByDescending(x => x.TrackingTime).First())
            .Select(r => new LocationDto(
                r.Id, r.UserId, r.User != null ? r.User.UsersName : null,
                r.Latitude, r.Longitude, r.TrackingTime, r.BatteryLevel, r.PhoneInfo))
            .ToListAsync(ct);

        return ApiResponse<List<LocationDto>>.Success(list);
    }
}

public record TrackLocationCommand(TrackLocationRequest Req) : IRequest<ApiResponse<LocationDto>>;

public class TrackLocationCommandHandler(IApplicationDbContext db)
    : IRequestHandler<TrackLocationCommand, ApiResponse<LocationDto>>
{
    public async Task<ApiResponse<LocationDto>> Handle(TrackLocationCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var loc = new RepLocationTracking
        {
            UserId = r.UserId,
            Latitude = r.Latitude,
            Longitude = r.Longitude,
            TrackingTime = DateTime.UtcNow,
            BatteryLevel = r.BatteryLevel,
            PhoneInfo = r.PhoneInfo
        };
        db.RepLocationTrackings.Add(loc);
        await db.SaveChangesAsync(ct);
        return ApiResponse<LocationDto>.Success(new LocationDto(
            loc.Id, loc.UserId, null, loc.Latitude, loc.Longitude,
            loc.TrackingTime, loc.BatteryLevel, loc.PhoneInfo));
    }
}
