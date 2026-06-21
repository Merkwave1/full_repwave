using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Visits;
using System.Security.Claims;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/visits")]
public class VisitsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] GetAllVisitsQuery q) => Ok(await mediator.Send(q));

    [HttpPost]
    public async Task<IActionResult> Start([FromBody] CreateVisitRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await mediator.Send(new StartVisitCommand(userId, req)));
    }

    [HttpPut("{id:int}/end")]
    public async Task<IActionResult> End(int id, [FromBody] EndVisitRequest req) =>
        Ok(await mediator.Send(new EndVisitCommand(id, req)));
}
