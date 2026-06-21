using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.PurchaseOrders;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/purchase-orders")]
public class PurchaseOrdersController(IMediator mediator) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> GetAll([FromQuery] GetAllPurchaseOrdersQuery q) => Ok(await mediator.Send(q));
    [HttpGet("{id:int}")] public async Task<IActionResult> GetById(int id) => Ok(await mediator.Send(new GetPurchaseOrderByIdQuery(id)));
    [HttpPost][Authorize(Roles = "admin")] public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderRequest req) => Ok(await mediator.Send(new CreatePurchaseOrderCommand(req)));
    [HttpPatch("{id:int}/status")][Authorize(Roles = "admin")] public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdatePurchaseOrderStatusCommand cmd) => Ok(await mediator.Send(cmd with { Id = id }));
    [HttpDelete("{id:int}")][Authorize(Roles = "admin")] public async Task<IActionResult> Delete(int id) => Ok(await mediator.Send(new DeletePurchaseOrderCommand(id)));
}
