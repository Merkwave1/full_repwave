using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Lookups;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/lookups")]
public class LookupsController(IMediator mediator) : ControllerBase
{
    // Categories
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories([FromQuery] GetAllCategoriesQuery q) => Ok(await mediator.Send(q));
    [HttpPost("categories")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateCategory([FromBody] UpsertCategoryRequest req) => Ok(await mediator.Send(new CreateCategoryCommand(req)));
    [HttpPut("categories/{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpsertCategoryRequest req) => Ok(await mediator.Send(new UpdateCategoryCommand(id, req)));
    [HttpDelete("categories/{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteCategory(int id) => Ok(await mediator.Send(new DeleteCategoryCommand(id)));

    // Base Units
    [HttpGet("base-units")]
    public async Task<IActionResult> GetBaseUnits([FromQuery] GetAllBaseUnitsQuery q) => Ok(await mediator.Send(q));
    [HttpPost("base-units")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateBaseUnit([FromBody] UpsertBaseUnitRequest req) => Ok(await mediator.Send(new CreateBaseUnitCommand(req)));
    [HttpPut("base-units/{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateBaseUnit(int id, [FromBody] UpsertBaseUnitRequest req) => Ok(await mediator.Send(new UpdateBaseUnitCommand(id, req)));
    [HttpDelete("base-units/{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteBaseUnit(int id) => Ok(await mediator.Send(new DeleteBaseUnitCommand(id)));

    // Countries & Governorates
    [HttpGet("countries")]
    public async Task<IActionResult> GetCountries([FromQuery] GetAllCountriesQuery q) => Ok(await mediator.Send(q));
    [HttpGet("governorates")]
    public async Task<IActionResult> GetGovernorates([FromQuery] GetAllGovernoratesQuery q) => Ok(await mediator.Send(q));

    // Client lookups
    [HttpGet("client-area-tags")]
    public async Task<IActionResult> GetClientAreaTags() => Ok(await mediator.Send(new GetAllClientAreaTagsQuery()));
    [HttpGet("client-types")]
    public async Task<IActionResult> GetClientTypes() => Ok(await mediator.Send(new GetAllClientTypesQuery()));
    [HttpGet("client-industries")]
    public async Task<IActionResult> GetClientIndustries() => Ok(await mediator.Send(new GetAllClientIndustriesQuery()));
    [HttpGet("payment-methods")]
    public async Task<IActionResult> GetPaymentMethods() => Ok(await mediator.Send(new GetAllPaymentMethodsQuery()));
}
