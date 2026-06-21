using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Suppliers;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/suppliers")]
public class SuppliersController(IMediator mediator) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> GetAll([FromQuery] GetAllSuppliersQuery q) => Ok(await mediator.Send(q));
    [HttpGet("{id:int}")] public async Task<IActionResult> GetById(int id) => Ok(await mediator.Send(new GetSupplierByIdQuery(id)));
    [HttpPost] public async Task<IActionResult> Create([FromBody] UpsertSupplierRequest req) => Ok(await mediator.Send(new CreateSupplierCommand(req)));
    [HttpPut("{id:int}")] public async Task<IActionResult> Update(int id, [FromBody] UpsertSupplierRequest req) => Ok(await mediator.Send(new UpdateSupplierCommand(id, req)));
    [HttpDelete("{id:int}")] [Authorize(Roles = "admin")] public async Task<IActionResult> Delete(int id) => Ok(await mediator.Send(new DeleteSupplierCommand(id)));
}
