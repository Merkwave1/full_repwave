using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.FinancialTransactions;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/financial-transactions")]
public class FinancialTransactionsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? type, [FromQuery] int? safeId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await mediator.Send(new GetAllFinancialTransactionsQuery(type, safeId, fromDate, toDate, page, pageSize)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFinancialTransactionRequest req) => Ok(await mediator.Send(new CreateFinancialTransactionCommand(req)));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteFinancialTransactionCommand(id)));
}
