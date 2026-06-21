using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Invoices;
using RepWave.Api.Requests;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/invoices")]
public class InvoicesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? clientId, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await mediator.Send(new GetAllInvoicesQuery(clientId, status, page, pageSize)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetInvoiceByIdQuery(id)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest req) => Ok(await mediator.Send(new CreateInvoiceCommand(req)));

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateInvoiceStatusRequest req)
        => Ok(await mediator.Send(new UpdateInvoiceStatusCommand(id, req.Status)));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteInvoiceCommand(id)));
}
