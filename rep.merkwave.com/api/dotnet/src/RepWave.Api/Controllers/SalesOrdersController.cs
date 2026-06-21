using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Common.Models;
using RepWave.Application.Features.SalesOrders;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/sales-orders")]
public class SalesOrdersController(IMediator mediator) : BaseApiController
{
    [HttpGet] public async Task<IActionResult> GetAll([FromQuery] GetAllSalesOrdersQuery q) => Ok(await mediator.Send(q));
    [HttpGet("{id:int}")] public async Task<IActionResult> GetById(int id) => Ok(await mediator.Send(new GetSalesOrderByIdQuery(id)));
    [HttpPost] public async Task<IActionResult> Create([FromBody] CreateSalesOrderRequest req) => Ok(await mediator.Send(new CreateSalesOrderCommand(CurrentUserId, req)));
    [HttpPut("{id:int}")] public async Task<IActionResult> Update(int id, [FromBody] UpdateSalesOrderRequest req) => Ok(await mediator.Send(new UpdateSalesOrderCommand(id, req)));
    [HttpPatch("{id:int}/status")][Authorize(Roles = "admin")] public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusUpdateRequest req) => Ok(await mediator.Send(new UpdateSalesOrderStatusCommand(id, req.Status)));
    [HttpDelete("{id:int}")][Authorize(Roles = "admin")] public async Task<IActionResult> Delete(int id) => Ok(await mediator.Send(new DeleteSalesOrderCommand(id)));
}
