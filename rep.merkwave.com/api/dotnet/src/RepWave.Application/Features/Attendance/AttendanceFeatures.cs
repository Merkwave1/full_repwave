using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.Attendance;

public record AttendanceDto(
    int AttendanceId,
    int? UserId,
    string? UserName,
    DateOnly AttendanceDate,
    TimeOnly? CheckInTime,
    TimeOnly? CheckOutTime,
    decimal? CheckInLatitude,
    decimal? CheckInLongitude,
    decimal? CheckOutLatitude,
    decimal? CheckOutLongitude,
    string Status,
    string? Notes,
    DateTime? CreatedAt);

public record CheckInRequest(
    int UserId,
    DateOnly? Date,
    decimal? Latitude,
    decimal? Longitude,
    string? Notes);

public record CheckOutRequest(
    decimal? Latitude,
    decimal? Longitude,
    string? Notes);

public record GetAttendanceQuery(int? UserId = null, DateOnly? FromDate = null, DateOnly? ToDate = null, int Page = 1, int PageSize = 30)
    : IRequest<ApiResponse<PagedResult<AttendanceDto>>>;

public class GetAttendanceQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAttendanceQuery, ApiResponse<PagedResult<AttendanceDto>>>
{
    public async Task<ApiResponse<PagedResult<AttendanceDto>>> Handle(GetAttendanceQuery request, CancellationToken ct)
    {
        var query = db.RepresentativeAttendances.AsNoTracking()
            .Include(a => a.User)
            .AsQueryable();

        if (request.UserId.HasValue)
            query = query.Where(a => a.UserId == request.UserId.Value);
        if (request.FromDate.HasValue)
            query = query.Where(a => a.AttendanceDate >= request.FromDate.Value);
        if (request.ToDate.HasValue)
            query = query.Where(a => a.AttendanceDate <= request.ToDate.Value);

        var total = await query.CountAsync(ct);
        var list = await query
            .OrderByDescending(a => a.AttendanceDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(a => new AttendanceDto(
                a.AttendanceId, a.UserId,
                a.User != null ? a.User.UsersName : null,
                a.AttendanceDate, a.CheckInTime, a.CheckOutTime,
                a.CheckInLatitude, a.CheckInLongitude,
                a.CheckOutLatitude, a.CheckOutLongitude,
                a.Status, a.Notes, a.CreatedAt))
            .ToListAsync(ct);

        return ApiResponse<PagedResult<AttendanceDto>>.Success(
            new PagedResult<AttendanceDto>(list, total, request.Page, request.PageSize));
    }
}

public record CheckInCommand(CheckInRequest Req) : IRequest<ApiResponse<AttendanceDto>>;

public class CheckInCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CheckInCommand, ApiResponse<AttendanceDto>>
{
    public async Task<ApiResponse<AttendanceDto>> Handle(CheckInCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var date = r.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // Prevent double check-in on same day
        var existing = await db.RepresentativeAttendances
            .FirstOrDefaultAsync(a => a.UserId == r.UserId && a.AttendanceDate == date, ct);

        if (existing is not null)
            return ApiResponse<AttendanceDto>.Failure("Already checked in today.");

        var attendance = new RepresentativeAttendance
        {
            UserId = r.UserId,
            AttendanceDate = date,
            CheckInTime = TimeOnly.FromDateTime(DateTime.UtcNow),
            CheckInLatitude = r.Latitude,
            CheckInLongitude = r.Longitude,
            Status = "Present",
            Notes = r.Notes,
            CreatedAt = DateTime.UtcNow
        };

        db.RepresentativeAttendances.Add(attendance);
        await db.SaveChangesAsync(ct);

        return ApiResponse<AttendanceDto>.Success(new AttendanceDto(
            attendance.AttendanceId, attendance.UserId, null,
            attendance.AttendanceDate, attendance.CheckInTime, attendance.CheckOutTime,
            attendance.CheckInLatitude, attendance.CheckInLongitude,
            attendance.CheckOutLatitude, attendance.CheckOutLongitude,
            attendance.Status, attendance.Notes, attendance.CreatedAt));
    }
}

public record CheckOutCommand(int UserId, CheckOutRequest Req) : IRequest<ApiResponse<AttendanceDto>>;

public class CheckOutCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CheckOutCommand, ApiResponse<AttendanceDto>>
{
    public async Task<ApiResponse<AttendanceDto>> Handle(CheckOutCommand request, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var attendance = await db.RepresentativeAttendances
            .FirstOrDefaultAsync(a => a.UserId == request.UserId && a.AttendanceDate == today, ct);

        if (attendance is null)
            return ApiResponse<AttendanceDto>.Failure("No check-in record found for today.");

        if (attendance.CheckOutTime.HasValue)
            return ApiResponse<AttendanceDto>.Failure("Already checked out today.");

        attendance.CheckOutTime = TimeOnly.FromDateTime(DateTime.UtcNow);
        attendance.CheckOutLatitude = request.Req.Latitude;
        attendance.CheckOutLongitude = request.Req.Longitude;
        if (request.Req.Notes is not null) attendance.Notes = request.Req.Notes;

        await db.SaveChangesAsync(ct);

        return ApiResponse<AttendanceDto>.Success(new AttendanceDto(
            attendance.AttendanceId, attendance.UserId, null,
            attendance.AttendanceDate, attendance.CheckInTime, attendance.CheckOutTime,
            attendance.CheckInLatitude, attendance.CheckInLongitude,
            attendance.CheckOutLatitude, attendance.CheckOutLongitude,
            attendance.Status, attendance.Notes, attendance.CreatedAt));
    }
}
