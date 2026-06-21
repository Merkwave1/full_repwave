using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.SalesDeliveries;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/sales-deliveries")]
public class SalesDeliveriesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? salesOrderId, [FromQuery] string? status)
        => Ok(await mediator.Send(new GetAllSalesDeliveriesQuery(salesOrderId, status)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetSalesDeliveryByIdQuery(id)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSalesDeliveryRequest req) => Ok(await mediator.Send(new CreateSalesDeliveryCommand(req)));

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateDeliveryStatusRequest req)
        => Ok(await mediator.Send(new UpdateDeliveryStatusCommand(id, req.Status)));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteSalesDeliveryCommand(id)));
}
