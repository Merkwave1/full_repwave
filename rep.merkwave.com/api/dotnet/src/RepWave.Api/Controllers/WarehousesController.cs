using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Warehouses;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/warehouses")]
public class WarehousesController(IMediator mediator) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> GetAll([FromQuery] GetAllWarehousesQuery q) => Ok(await mediator.Send(q));
    [HttpGet("{id:int}")] public async Task<IActionResult> GetById(int id) => Ok(await mediator.Send(new GetWarehouseByIdQuery(id)));
    [HttpPost] [Authorize(Roles = "admin")] public async Task<IActionResult> Create([FromBody] UpsertWarehouseRequest req) => Ok(await mediator.Send(new CreateWarehouseCommand(req)));
    [HttpPut("{id:int}")] [Authorize(Roles = "admin")] public async Task<IActionResult> Update(int id, [FromBody] UpsertWarehouseRequest req) => Ok(await mediator.Send(new UpdateWarehouseCommand(id, req)));
    [HttpDelete("{id:int}")] [Authorize(Roles = "admin")] public async Task<IActionResult> Delete(int id) => Ok(await mediator.Send(new DeleteWarehouseCommand(id)));
}
