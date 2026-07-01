using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.VisitPlans;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/visit-plans")]
public class VisitPlansController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? userId, [FromQuery] string? status)
        => Ok(await mediator.Send(new GetAllVisitPlansQuery(userId, status)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertVisitPlanRequest req) => Ok(await mediator.Send(new CreateVisitPlanCommand(req)));

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertVisitPlanRequest req)
        => Ok(await mediator.Send(new UpdateVisitPlanCommand(id, req)));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteVisitPlanCommand(id)));

    [HttpPost("{planId:int}/clients")]
    public async Task<IActionResult> AddClient(int planId, [FromBody] AddVisitPlanClientRequest req)
        => Ok(await mediator.Send(new AddClientToVisitPlanCommand(planId, req)));

    [HttpPut("{planId:int}/clients")]
    public async Task<IActionResult> SyncClients(int planId, [FromBody] SyncVisitPlanClientsRequest req)
        => Ok(await mediator.Send(new SyncVisitPlanClientsCommand(planId, req)));

    [HttpDelete("{planId:int}/clients/{clientId:int}")]
    public async Task<IActionResult> RemoveClient(int planId, int clientId)
        => Ok(await mediator.Send(new RemoveClientFromVisitPlanCommand(planId, clientId)));
}
