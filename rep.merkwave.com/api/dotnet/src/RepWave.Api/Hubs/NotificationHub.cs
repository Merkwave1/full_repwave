using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RepWave.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
  public override async Task OnConnectedAsync()
  {
    var tenantId = Context.User?.FindFirst("tenant")?.Value;
    if (!string.IsNullOrEmpty(tenantId))
      await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant_{tenantId}");
    await base.OnConnectedAsync();
  }
}
