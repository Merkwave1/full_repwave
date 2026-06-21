using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Payments;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/payments")]
public class PaymentsController(IMediator mediator) : BaseApiController
{
    [HttpGet] public async Task<IActionResult> GetAll([FromQuery] GetAllPaymentsQuery q) => Ok(await mediator.Send(q));
    [HttpPost] public async Task<IActionResult> Create([FromBody] CreatePaymentRequest req) => Ok(await mediator.Send(new CreatePaymentCommand(CurrentUserId, req)));
    [HttpDelete("{id:int}")] [Authorize(Roles = "admin")] public async Task<IActionResult> Delete(int id) => Ok(await mediator.Send(new DeletePaymentCommand(id)));
}
