using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.GoodsReceipts;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/goods-receipts")]
public class GoodsReceiptsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? warehouseId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await mediator.Send(new GetAllGoodsReceiptsQuery(warehouseId, page, pageSize)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetGoodsReceiptByIdQuery(id)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGoodsReceiptRequest req) => Ok(await mediator.Send(new CreateGoodsReceiptCommand(req)));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteGoodsReceiptCommand(id)));
}
