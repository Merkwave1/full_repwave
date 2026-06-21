using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Accounts;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/accounts")]
public class AccountsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await mediator.Send(new GetAllAccountsQuery()));

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] UpsertAccountRequest req) =>
        Ok(await mediator.Send(new CreateAccountCommand(req)));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertAccountRequest req) =>
        Ok(await mediator.Send(new UpdateAccountCommand(id, req)));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id) =>
        Ok(await mediator.Send(new DeleteAccountCommand(id)));
}
