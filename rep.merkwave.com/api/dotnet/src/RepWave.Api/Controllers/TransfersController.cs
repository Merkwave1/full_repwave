using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Transfers;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
public class TransfersController(IMediator mediator) : ControllerBase
{
    // ── Transfer Requests ─────────────────────────────────────────────────────
    [HttpGet("api/transfer-requests")]
    public async Task<IActionResult> GetRequests([FromQuery] string? status)
        => Ok(await mediator.Send(new GetAllTransferRequestsQuery(status)));

    [HttpPost("api/transfer-requests")]
    public async Task<IActionResult> CreateRequest([FromBody] CreateTransferRequestRequest req) => Ok(await mediator.Send(new CreateTransferRequestCommand(req)));

    [HttpPatch("api/transfer-requests/{id:int}/status")]
    public async Task<IActionResult> UpdateRequestStatus(int id, [FromBody] UpdateTransferStatusRequest req)
        => Ok(await mediator.Send(new UpdateTransferRequestStatusCommand(id, req.Status)));

    [HttpDelete("api/transfer-requests/{id:int}")]
    public async Task<IActionResult> DeleteRequest(int id)
        => Ok(await mediator.Send(new DeleteTransferRequestCommand(id)));

    // ── Transfers ─────────────────────────────────────────────────────────────
    [HttpGet("api/transfers")]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
        => Ok(await mediator.Send(new GetAllTransfersQuery(status)));

    [HttpGet("api/transfers/{id:int}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetTransferByIdQuery(id)));

    [HttpPost("api/transfers")]
    public async Task<IActionResult> Create([FromBody] CreateTransferRequest req) => Ok(await mediator.Send(new CreateTransferCommand(req)));

    [HttpPut("api/transfers/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTransferRequest req) => Ok(await mediator.Send(new UpdateTransferCommand(id, req)));

    [HttpPatch("api/transfers/{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTransferStatusRequest req)
        => Ok(await mediator.Send(new UpdateTransferStatusCommand(id, req.Status)));

    [HttpDelete("api/transfers/{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteTransferCommand(id)));
}
