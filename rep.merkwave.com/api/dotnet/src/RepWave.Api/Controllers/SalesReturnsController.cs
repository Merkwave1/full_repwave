using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.SalesReturns;
using RepWave.Api.Requests;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/sales-returns")]
public class SalesReturnsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? clientId, [FromQuery] int? salesOrderId, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await mediator.Send(new GetAllSalesReturnsQuery(clientId, salesOrderId, status, page, pageSize)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSalesReturnRequest req) => Ok(await mediator.Send(new CreateSalesReturnCommand(req)));

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateSalesReturnStatusRequest req)
        => Ok(await mediator.Send(new UpdateSalesReturnStatusCommand(id, req.Status)));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteSalesReturnCommand(id)));
}
