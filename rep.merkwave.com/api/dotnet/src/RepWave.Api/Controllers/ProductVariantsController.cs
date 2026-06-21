using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.ProductVariants;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
public class ProductVariantsController(IMediator mediator) : ControllerBase
{
    // ── Variants ──────────────────────────────────────────────────────────────
    [HttpGet("api/products/{productId:int}/variants")]
    public async Task<IActionResult> GetVariants(int productId)
        => Ok(await mediator.Send(new GetProductVariantsQuery(productId)));

    [HttpGet("api/variants/{id:int}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetProductVariantByIdQuery(id)));

    [HttpPost("api/variants")]
    public async Task<IActionResult> Create([FromBody] UpsertProductVariantRequest req) => Ok(await mediator.Send(new CreateProductVariantCommand(req)));

    [HttpPut("api/variants/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertProductVariantRequest req)
        => Ok(await mediator.Send(new UpdateProductVariantCommand(id, req)));

    [HttpDelete("api/variants/{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteProductVariantCommand(id)));

    // ── Attributes ────────────────────────────────────────────────────────────
    [HttpGet("api/product-attributes")]
    public async Task<IActionResult> GetAttributes()
        => Ok(await mediator.Send(new GetProductAttributesQuery()));

    [HttpPost("api/product-attributes")]
    public async Task<IActionResult> CreateAttribute([FromBody] UpsertProductAttributeRequest req) => Ok(await mediator.Send(new CreateProductAttributeCommand(req)));

    [HttpPut("api/product-attributes/{id:int}")]
    public async Task<IActionResult> UpdateAttribute(int id, [FromBody] UpsertProductAttributeRequest req)
        => Ok(await mediator.Send(new UpdateProductAttributeCommand(id, req)));

    [HttpDelete("api/product-attributes/{id:int}")]
    public async Task<IActionResult> DeleteAttribute(int id)
        => Ok(await mediator.Send(new DeleteProductAttributeCommand(id)));

    // ── Attribute Values ──────────────────────────────────────────────────────
    [HttpGet("api/product-attributes/{attributeId:int}/values")]
    public async Task<IActionResult> GetValues(int attributeId)
        => Ok(await mediator.Send(new GetAttributeValuesQuery(attributeId)));

    [HttpPost("api/attribute-values")]
    public async Task<IActionResult> CreateValue([FromBody] UpsertAttributeValueRequest req) => Ok(await mediator.Send(new CreateAttributeValueCommand(req)));

    [HttpDelete("api/attribute-values/{id:int}")]
    public async Task<IActionResult> DeleteValue(int id)
        => Ok(await mediator.Send(new DeleteAttributeValueCommand(id)));

    // ── Packaging Types ───────────────────────────────────────────────────────
    [HttpGet("api/packaging-types")]
    public async Task<IActionResult> GetPackagingTypes()
        => Ok(await mediator.Send(new GetPackagingTypesQuery()));

    [HttpPost("api/packaging-types")]
    public async Task<IActionResult> CreatePackagingType([FromBody] UpsertPackagingTypeRequest req) => Ok(await mediator.Send(new CreatePackagingTypeCommand(req)));

    [HttpPut("api/packaging-types/{id:int}")]
    public async Task<IActionResult> UpdatePackagingType(int id, [FromBody] UpsertPackagingTypeRequest req)
        => Ok(await mediator.Send(new UpdatePackagingTypeCommand(id, req)));

    [HttpDelete("api/packaging-types/{id:int}")]
    public async Task<IActionResult> DeletePackagingType(int id)
        => Ok(await mediator.Send(new DeletePackagingTypeCommand(id)));
}
