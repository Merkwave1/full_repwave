using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Products;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/products")]
public class ProductsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] GetAllProductsQuery query) =>
        Ok(await mediator.Send(query));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id) =>
        Ok(await mediator.Send(new GetProductByIdQuery(id)));

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest req) => Ok(await mediator.Send(new CreateProductCommand(req)));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateProductRequest req) =>
        Ok(await mediator.Send(new UpdateProductCommand(id, req)));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id) =>
        Ok(await mediator.Send(new DeleteProductCommand(id)));
}
