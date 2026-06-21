using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Refunds;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/refunds")]
public class RefundsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? clientId, [FromQuery] int? safeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await mediator.Send(new GetAllRefundsQuery(clientId, safeId, page, pageSize)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRefundRequest req) => Ok(await mediator.Send(new CreateRefundCommand(req)));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteRefundCommand(id)));
}
