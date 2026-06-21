using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Location;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/location")]
public class LocationController(IMediator mediator) : ControllerBase
{
    [HttpPost("track")]
    public async Task<IActionResult> Track([FromBody] TrackLocationRequest req) => Ok(await mediator.Send(new TrackLocationCommand(req)));

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] int userId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] int limit = 100)
        => Ok(await mediator.Send(new GetTrackingHistoryQuery(userId, fromDate, toDate, limit)));

    [HttpGet("latest")]
    public async Task<IActionResult> Latest()
        => Ok(await mediator.Send(new GetAllRepsLastLocationQuery()));
}
