using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.VisitPlans;

public record VisitPlanDto(
    int VisitPlanId,
    string? VisitPlanName,
    string? VisitPlanDescription,
    int? UserId,
    string? UserName,
    string VisitPlanStatus,
    DateOnly? VisitPlanStartDate,
    DateOnly? VisitPlanEndDate,
    string? VisitPlanRecurrenceType,
    string? VisitPlanSelectedDays,
    int VisitPlanRepeatEvery,
    DateTime? VisitPlanCreatedAt,
    List<VisitPlanClientDto> Clients);

public record VisitPlanClientDto(int Id, int? ClientId, string? ClientName, int VisitOrder, string? Notes);

public record UpsertVisitPlanRequest(
    string? Name,
    string? Description,
    int? UserId,
    string Status,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? RecurrenceType,
    string? SelectedDays,
    int RepeatEvery);

public record AddVisitPlanClientRequest(int ClientId, int VisitOrder, string? Notes);

public record GetAllVisitPlansQuery(int? UserId = null, string? Status = null)
    : IRequest<ApiResponse<List<VisitPlanDto>>>;

public class GetAllVisitPlansQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllVisitPlansQuery, ApiResponse<List<VisitPlanDto>>>
{
    public async Task<ApiResponse<List<VisitPlanDto>>> Handle(GetAllVisitPlansQuery request, CancellationToken ct)
    {
        var query = db.VisitPlans.AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Clients)
                .ThenInclude(c => c.Client)
            .AsQueryable();

        if (request.UserId.HasValue)
            query = query.Where(p => p.UserId == request.UserId.Value);
        if (!string.IsNullOrEmpty(request.Status))
            query = query.Where(p => p.VisitPlanStatus == request.Status);

        var list = await query.OrderByDescending(p => p.VisitPlanCreatedAt).ToListAsync(ct);

        return ApiResponse<List<VisitPlanDto>>.Success(list.Select(p => ToDto(p)).ToList());
    }

    private static VisitPlanDto ToDto(VisitPlan p) => new(
        p.VisitPlanId, p.VisitPlanName, p.VisitPlanDescription,
        p.UserId, p.User?.UsersName, p.VisitPlanStatus,
        p.VisitPlanStartDate, p.VisitPlanEndDate, p.VisitPlanRecurrenceType,
        p.VisitPlanSelectedDays, p.VisitPlanRepeatEvery, p.VisitPlanCreatedAt,
        p.Clients.Select(c => new VisitPlanClientDto(
            c.Id, c.ClientId, c.Client?.ClientsCompanyName, c.VisitOrder, c.Notes)).ToList());
}

public record CreateVisitPlanCommand(UpsertVisitPlanRequest Req) : IRequest<ApiResponse<VisitPlanDto>>;

public class CreateVisitPlanCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateVisitPlanCommand, ApiResponse<VisitPlanDto>>
{
    public async Task<ApiResponse<VisitPlanDto>> Handle(CreateVisitPlanCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var plan = new VisitPlan
        {
            VisitPlanName = r.Name,
            VisitPlanDescription = r.Description,
            UserId = r.UserId,
            VisitPlanStatus = r.Status,
            VisitPlanStartDate = r.StartDate,
            VisitPlanEndDate = r.EndDate,
            VisitPlanRecurrenceType = r.RecurrenceType,
            VisitPlanSelectedDays = r.SelectedDays,
            VisitPlanRepeatEvery = r.RepeatEvery,
            VisitPlanCreatedAt = DateTime.UtcNow
        };
        db.VisitPlans.Add(plan);
        await db.SaveChangesAsync(ct);
        return ApiResponse<VisitPlanDto>.Success(new VisitPlanDto(
            plan.VisitPlanId, plan.VisitPlanName, plan.VisitPlanDescription,
            plan.UserId, null, plan.VisitPlanStatus, plan.VisitPlanStartDate,
            plan.VisitPlanEndDate, plan.VisitPlanRecurrenceType, plan.VisitPlanSelectedDays,
            plan.VisitPlanRepeatEvery, plan.VisitPlanCreatedAt, []));
    }
}

public record UpdateVisitPlanCommand(int Id, UpsertVisitPlanRequest Req) : IRequest<ApiResponse<VisitPlanDto>>;

public class UpdateVisitPlanCommandHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateVisitPlanCommand, ApiResponse<VisitPlanDto>>
{
    public async Task<ApiResponse<VisitPlanDto>> Handle(UpdateVisitPlanCommand request, CancellationToken ct)
    {
        var plan = await db.VisitPlans.FindAsync([request.Id], ct);
        if (plan is null) return ApiResponse<VisitPlanDto>.Failure("Visit plan not found.");
        var r = request.Req;
        plan.VisitPlanName = r.Name;
        plan.VisitPlanDescription = r.Description;
        plan.UserId = r.UserId;
        plan.VisitPlanStatus = r.Status;
        plan.VisitPlanStartDate = r.StartDate;
        plan.VisitPlanEndDate = r.EndDate;
        plan.VisitPlanRecurrenceType = r.RecurrenceType;
        plan.VisitPlanSelectedDays = r.SelectedDays;
        plan.VisitPlanRepeatEvery = r.RepeatEvery;
        plan.VisitPlanUpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ApiResponse<VisitPlanDto>.Success(new VisitPlanDto(
            plan.VisitPlanId, plan.VisitPlanName, plan.VisitPlanDescription,
            plan.UserId, null, plan.VisitPlanStatus, plan.VisitPlanStartDate,
            plan.VisitPlanEndDate, plan.VisitPlanRecurrenceType, plan.VisitPlanSelectedDays,
            plan.VisitPlanRepeatEvery, plan.VisitPlanCreatedAt, []));
    }
}

public record DeleteVisitPlanCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteVisitPlanCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteVisitPlanCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteVisitPlanCommand request, CancellationToken ct)
    {
        var plan = await db.VisitPlans.FindAsync([request.Id], ct);
        if (plan is null) return ApiResponse<object>.Failure("Visit plan not found.");
        db.VisitPlans.Remove(plan);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Visit plan deleted.");
    }
}

public record AddClientToVisitPlanCommand(int PlanId, AddVisitPlanClientRequest Req) : IRequest<ApiResponse<VisitPlanClientDto>>;

public class AddClientToVisitPlanCommandHandler(IApplicationDbContext db)
    : IRequestHandler<AddClientToVisitPlanCommand, ApiResponse<VisitPlanClientDto>>
{
    public async Task<ApiResponse<VisitPlanClientDto>> Handle(AddClientToVisitPlanCommand request, CancellationToken ct)
    {
        var pc = new VisitPlanClient
        {
            VisitPlanId = request.PlanId,
            ClientId = request.Req.ClientId,
            VisitOrder = request.Req.VisitOrder,
            Notes = request.Req.Notes
        };
        db.VisitPlanClients.Add(pc);
        await db.SaveChangesAsync(ct);
        return ApiResponse<VisitPlanClientDto>.Success(
            new VisitPlanClientDto(pc.Id, pc.ClientId, null, pc.VisitOrder, pc.Notes));
    }
}

public record RemoveClientFromVisitPlanCommand(int PlanId, int ClientId) : IRequest<ApiResponse<object>>;

public class RemoveClientFromVisitPlanCommandHandler(IApplicationDbContext db)
    : IRequestHandler<RemoveClientFromVisitPlanCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(RemoveClientFromVisitPlanCommand request, CancellationToken ct)
    {
        var pc = await db.VisitPlanClients
            .FirstOrDefaultAsync(x => x.VisitPlanId == request.PlanId && x.ClientId == request.ClientId, ct);
        if (pc is null) return ApiResponse<object>.Failure("Client not in this plan.");
        db.VisitPlanClients.Remove(pc);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Client removed from plan.");
    }
}


