using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Safes;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/safes")]
public class SafesController(IMediator mediator) : BaseApiController
{
    [HttpGet] public async Task<IActionResult> GetAll([FromQuery] bool? isActive) => Ok(await mediator.Send(new GetAllSafesQuery(isActive)));
    [HttpGet("{id:int}")] public async Task<IActionResult> GetById(int id) => Ok(await mediator.Send(new GetSafeByIdQuery(id)));
    [HttpPost] public async Task<IActionResult> Create([FromBody] UpsertSafeRequest req) => Ok(await mediator.Send(new CreateSafeCommand(req)));
    [HttpPut("{id:int}")] public async Task<IActionResult> Update(int id, [FromBody] UpsertSafeRequest req) => Ok(await mediator.Send(new UpdateSafeCommand(id, req)));
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int id) => Ok(await mediator.Send(new DeleteSafeCommand(id)));

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions([FromQuery] int? safeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await mediator.Send(new GetSafeTransactionsQuery(safeId, page, pageSize)));

    [HttpPost("transactions")]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateSafeTransactionRequest req)
        => Ok(await mediator.Send(new CreateSafeTransactionCommand(req, CurrentUserId)));

    [HttpGet("transfers")]
    public async Task<IActionResult> GetTransfers([FromQuery] int? safeId)
        => Ok(await mediator.Send(new GetSafeTransfersQuery(safeId)));

    [HttpPost("transfers")]
    public async Task<IActionResult> CreateTransfer([FromBody] CreateSafeTransferRequest req)
        => Ok(await mediator.Send(new CreateSafeTransferCommand(req, CurrentUserId)));
}
