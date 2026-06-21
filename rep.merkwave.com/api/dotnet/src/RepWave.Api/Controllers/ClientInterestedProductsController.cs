using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.ClientInterestedProducts;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
public class ClientInterestedProductsController(IMediator mediator) : ControllerBase
{
    [HttpGet("api/clients/{clientId:int}/interested-products")]
    public async Task<IActionResult> GetByClient(int clientId)
        => Ok(await mediator.Send(new GetClientInterestedProductsQuery(clientId)));

    [HttpPost("api/clients/{clientId:int}/interested-products/{productId:int}")]
    public async Task<IActionResult> Add(int clientId, int productId)
        => Ok(await mediator.Send(new AddClientInterestedProductCommand(clientId, productId)));

    [HttpDelete("api/clients/{clientId:int}/interested-products/{productId:int}")]
    public async Task<IActionResult> Remove(int clientId, int productId)
        => Ok(await mediator.Send(new RemoveClientInterestedProductCommand(clientId, productId)));
}
