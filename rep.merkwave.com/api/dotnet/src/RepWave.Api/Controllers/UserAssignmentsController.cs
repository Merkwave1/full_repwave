using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Common.Models;
using RepWave.Application.Features.UserAssignments;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
public class UserAssignmentsController(IMediator mediator) : ControllerBase
{
    // ── Safe Assignments ──────────────────────────────────────────────────────
    [HttpGet("api/user-safes")]
    public async Task<IActionResult> GetUserSafes([FromQuery] int? userId)
        => Ok(await mediator.Send(new GetUserSafesQuery(userId)));

    [HttpPost("api/user-safes")]
    public async Task<IActionResult> AssignSafe([FromBody] UserSafeAssignRequest req)
        => Ok(await mediator.Send(new AssignUserToSafeCommand(req.UserId, req.SafeId)));

    [HttpDelete("api/user-safes")]
    public async Task<IActionResult> UnassignSafe([FromQuery] int userId, [FromQuery] int safeId)
        => Ok(await mediator.Send(new UnassignUserFromSafeCommand(userId, safeId)));

    // ── Warehouse Assignments ─────────────────────────────────────────────────
    [HttpGet("api/user-warehouses")]
    public async Task<IActionResult> GetUserWarehouses([FromQuery] int? userId)
        => Ok(await mediator.Send(new GetUserWarehousesQuery(userId)));

    [HttpPost("api/user-warehouses")]
    public async Task<IActionResult> AssignWarehouse([FromBody] UserWarehouseAssignRequest req)
        => Ok(await mediator.Send(new AssignUserToWarehouseCommand(req.UserId, req.WarehouseId)));

    [HttpDelete("api/user-warehouses")]
    public async Task<IActionResult> UnassignWarehouse([FromQuery] int userId, [FromQuery] int warehouseId)
        => Ok(await mediator.Send(new UnassignUserFromWarehouseCommand(userId, warehouseId)));
}
