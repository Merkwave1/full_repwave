using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Common.Models;
using RepWave.Application.Features.Versions;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/versions")]
public class VersionsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? entity)
        => Ok(await mediator.Send(new GetVersionsQuery(entity)));

    [HttpPost("increment")]
    public async Task<IActionResult> Increment([FromBody] IncrementVersionRequest req)
        => Ok(await mediator.Send(new IncrementVersionCommand(req.Entity)));
}
