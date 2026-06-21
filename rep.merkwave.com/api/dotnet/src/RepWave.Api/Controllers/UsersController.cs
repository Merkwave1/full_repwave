using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Users.Commands;
using RepWave.Application.Features.Users.Queries;
using RepWave.Application.Features.Users.DTOs;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/users")]
public class UsersController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] GetAllUsersQuery query) =>
        Ok(await mediator.Send(query));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id) =>
        Ok(await mediator.Send(new GetUserByIdQuery(id)));

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req) => Ok(await mediator.Send(new CreateUserCommand(req)));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest req) =>
        Ok(await mediator.Send(new UpdateUserCommand(id, req)));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id) =>
        Ok(await mediator.Send(new DeleteUserCommand(id)));
}
