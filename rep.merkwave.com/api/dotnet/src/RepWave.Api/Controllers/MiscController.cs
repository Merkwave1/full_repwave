using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using RepWave.Application.Common.Models;
using RepWave.Application.Features.InventoryFeatures;
using RepWave.Api.Hubs;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api")]
public class MiscController(IMediator mediator, IHubContext<NotificationHub> hubContext) : ControllerBase
{
    [HttpGet("inventory")]
    public async Task<IActionResult> GetInventory([FromQuery] GetInventoryQuery q) => Ok(await mediator.Send(q));

    [HttpPost("inventory/repack")]
    public async Task<IActionResult> RepackInventory([FromBody] RepackInventoryRequest req) =>
        Ok(await mediator.Send(new RepackInventoryCommand(req)));

    [HttpPatch("inventory/{id:int}/removed")]
    public async Task<IActionResult> RemoveInventory(int id) => Ok(await mediator.Send(new RemoveInventoryItemCommand(id)));

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications([FromQuery] GetAllNotificationsQuery q) => Ok(await mediator.Send(q));

    [HttpPost("notifications")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationRequest req)
    {
        var result = await mediator.Send(new CreateNotificationCommand(req));
        if (result.Status == "success" && result.Data != null)
        {
            var tenantId = User.FindFirst("tenant")?.Value;
            var group = string.IsNullOrEmpty(tenantId) ? "tenant_demo" : $"tenant_{tenantId}";
            await hubContext.Clients.Group(group).SendAsync("ReceiveNotification", result.Data);
        }
        return Ok(result);
    }

    [HttpPatch("notifications/{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id) => Ok(await mediator.Send(new MarkNotificationReadCommand(id)));

    [HttpGet("settings")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetSettings([FromQuery] GetAllSettingsQuery q) => Ok(await mediator.Send(q));

    [HttpPatch("settings/{key}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateSetting(string key, [FromBody] SettingValueRequest req) =>
        Ok(await mediator.Send(new UpdateSettingCommand(key, req.Value)));

    [HttpGet("dashboard/stats")]
    public async Task<IActionResult> GetDashboardStats() =>
        Ok(await mediator.Send(new DashboardStatsQuery()));
}
