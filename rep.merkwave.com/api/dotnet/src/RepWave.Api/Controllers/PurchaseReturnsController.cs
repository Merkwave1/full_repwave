using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.PurchaseReturns;
using RepWave.Api.Requests;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/purchase-returns")]
public class PurchaseReturnsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? supplierId, [FromQuery] string? status)
        => Ok(await mediator.Send(new GetAllPurchaseReturnsQuery(supplierId, status)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetPurchaseReturnByIdQuery(id)));

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePurchaseReturnRequest req)
        => Ok(await mediator.Send(new UpdatePurchaseReturnCommand(id, req)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseReturnRequest req) => Ok(await mediator.Send(new CreatePurchaseReturnCommand(req)));

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdatePurchaseReturnStatusRequest req)
        => Ok(await mediator.Send(new UpdatePurchaseReturnStatusCommand(id, req.Status)));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeletePurchaseReturnCommand(id)));
}
