using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.SupplierPayments;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/supplier-payments")]
public class SupplierPaymentsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? supplierId, [FromQuery] int? purchaseOrderId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await mediator.Send(new GetSupplierPaymentsQuery(supplierId, purchaseOrderId, page, pageSize)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSupplierPaymentRequest req) => Ok(await mediator.Send(new CreateSupplierPaymentCommand(req)));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteSupplierPaymentCommand(id)));
}
