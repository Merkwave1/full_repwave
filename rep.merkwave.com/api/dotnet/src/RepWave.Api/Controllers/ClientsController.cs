using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Clients;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/clients")]
public class ClientsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] GetAllClientsQuery query) =>
        Ok(await mediator.Send(query));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id) =>
        Ok(await mediator.Send(new GetClientByIdQuery(id)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClientRequest req) => Ok(await mediator.Send(new CreateClientCommand(req)));

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateClientRequest req) =>
        Ok(await mediator.Send(new UpdateClientCommand(id, req)));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id) =>
        Ok(await mediator.Send(new DeleteClientCommand(id)));
}
