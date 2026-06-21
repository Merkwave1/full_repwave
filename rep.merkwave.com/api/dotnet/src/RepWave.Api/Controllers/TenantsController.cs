using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.TenantManagement;

namespace RepWave.Api.Controllers;

[ApiController]
[Route("api/tenants")]
public class TenantsController(IMediator mediator, IConfiguration config) : ControllerBase
{
    private bool IsAuthorized()
    {
        var apiKey = config["TenantRegistration:ApiKey"];
        Request.Headers.TryGetValue("X-Api-Key", out var provided);
        return !string.IsNullOrEmpty(apiKey) && provided == apiKey;
    }

    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterTenantRequest req)
    {
        if (!IsAuthorized()) return Unauthorized("Invalid API key.");
        return Ok(await mediator.Send(new RegisterTenantCommand(req)));
    }

    [HttpPost("trial")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterTrial([FromBody] TrialRegistrationRequest req)
    {
        return Ok(await mediator.Send(new RegisterTrialCommand(req)));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? isActive)
    {
        if (!IsAuthorized()) return Unauthorized("Invalid API key.");
        return Ok(await mediator.Send(new GetAllTenantsQuery(isActive)));
    }

    [HttpPut("{tenantId}")]
    public async Task<IActionResult> Update(string tenantId, [FromBody] UpdateTenantRequest req)
    {
        if (!IsAuthorized()) return Unauthorized("Invalid API key.");
        return Ok(await mediator.Send(new UpdateTenantCommand(tenantId, req)));
    }

    [HttpDelete("{tenantId}")]
    public async Task<IActionResult> Delete(string tenantId)
    {
        if (!IsAuthorized()) return Unauthorized("Invalid API key.");
        return Ok(await mediator.Send(new DeleteTenantCommand(tenantId)));
    }
}
