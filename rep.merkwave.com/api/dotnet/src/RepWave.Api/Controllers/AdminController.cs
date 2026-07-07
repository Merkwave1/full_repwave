using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Admin;

namespace RepWave.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(IMediator mediator) : ControllerBase
{
    [HttpPost("auth/login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest req)
        => Ok(await mediator.Send(new AdminLoginCommand(req)));

    [HttpGet("stats/overview")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> StatsOverview()
        => Ok(await mediator.Send(new GetAdminStatsOverviewQuery()));

    [HttpGet("tenants")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> GetTenants(
        [FromQuery] string? plan,
        [FromQuery] string? status,
        [FromQuery] string? country,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery(Name = "include_usage")] bool includeUsage = true)
        => Ok(await mediator.Send(new GetAdminTenantsQuery(plan, status, country, search, page, pageSize, includeUsage)));

    [HttpGet("tenants/{tenantId}/health")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> GetTenantHealth(string tenantId)
        => Ok(await mediator.Send(new GetTenantHealthQuery(tenantId)));

    [HttpGet("usage/summary")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> GetAllTenantsUsage()
        => Ok(await mediator.Send(new GetAllTenantsUsageQuery()));

    [HttpGet("tenants/{tenantId}")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> GetTenant(string tenantId)
        => Ok(await mediator.Send(new GetAdminTenantByIdQuery(tenantId)));

    [HttpPut("tenants/{tenantId}")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> UpdateTenant(string tenantId, [FromBody] AdminUpdateTenantRequest req)
        => Ok(await mediator.Send(new AdminUpdateTenantCommand(tenantId, req)));

    [HttpPost("tenants/{tenantId}/subscription/close")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> CloseSubscription(string tenantId)
        => Ok(await mediator.Send(new CloseSubscriptionCommand(tenantId)));

    [HttpPost("tenants/{tenantId}/subscription/open")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> OpenSubscription(string tenantId, [FromBody] OpenSubscriptionRequest req)
        => Ok(await mediator.Send(new OpenSubscriptionCommand(tenantId, req)));

    [HttpPost("tenants/{tenantId}/trial/extend")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> ExtendTrial(string tenantId, [FromBody] ExtendTrialRequest req)
        => Ok(await mediator.Send(new ExtendTrialCommand(tenantId, req)));

    [HttpPost("tenants/{tenantId}/convert")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> ConvertTrial(string tenantId, [FromBody] ConvertTrialRequest req)
        => Ok(await mediator.Send(new ConvertTrialCommand(tenantId, req)));

    [HttpPost("tenants/{tenantId}/seed-sample")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> SeedSampleData(string tenantId)
        => Ok(await mediator.Send(new SeedTenantSampleDataCommand(tenantId)));

    // ── Admin-only monitoring (never exposed to tenants) ─────────────────────

    [HttpGet("users")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> GetGlobalUsers(
        [FromQuery] string? search,
        [FromQuery] string? tenant_id,
        [FromQuery] string? role,
        [FromQuery] bool? active_only,
        [FromQuery] int page = 1,
        [FromQuery] int page_size = 50)
        => Ok(await mediator.Send(new GetAdminGlobalUsersQuery(search, tenant_id, role, active_only, page, page_size)));

    [HttpPut("tenants/{tenantId}/users/{userId}/status")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> SetUserStatus(
        string tenantId, int userId, [FromBody] AdminSetUserStatusRequest req)
        => Ok(await mediator.Send(new AdminSetUserStatusCommand(tenantId, userId, req)));

    [HttpGet("monitor/subscriptions")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> SubscriptionsMonitor()
        => Ok(await mediator.Send(new GetAdminSubscriptionsMonitorQuery()));

    [HttpGet("monitor/activity")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> ActivityFeed([FromQuery] int limit = 50)
        => Ok(await mediator.Send(new GetAdminActivityFeedQuery(limit)));

    [HttpGet("monitor/engagement")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> EngagementMatrix()
        => Ok(await mediator.Send(new GetAdminEngagementMatrixQuery()));

    [HttpPost("tenants/{tenantId}/users/{userId}/reset-password")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> ResetUserPassword(string tenantId, int userId)
        => Ok(await mediator.Send(new AdminResetUserPasswordCommand(tenantId, userId)));

    [HttpPost("tenants/{tenantId}/impersonate")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> ImpersonateTenant(string tenantId, [FromBody] AdminImpersonateRequest? req)
        => Ok(await mediator.Send(new AdminImpersonateCommand(tenantId, req)));

    [HttpGet("audit-log")]
    [Authorize(Roles = "superadmin")]
    public async Task<IActionResult> GetAuditLog(
        [FromQuery] int limit = 50,
        [FromQuery(Name = "tenant_id")] string? tenantId = null)
        => Ok(await mediator.Send(new GetAdminAuditLogQuery(limit, tenantId)));
}
