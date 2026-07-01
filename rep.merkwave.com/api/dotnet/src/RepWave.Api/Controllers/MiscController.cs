using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using RepWave.Application.Common.Models;
using RepWave.Application.Features.InventoryFeatures;
using RepWave.Api.Hubs;
using System.Net;
using System.Text.RegularExpressions;

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
        Ok(await mediator.Send(new UpdateSettingCommand(key, req.Value, req.Description, req.Type)));

    [HttpGet("dashboard/stats")]
    public async Task<IActionResult> GetDashboardStats() =>
        Ok(await mediator.Send(new DashboardStatsQuery()));

    public record ResolveMapsLinkRequest(string Url);
    public record ResolvedMapsLinkDto(string ResolvedUrl, decimal? Latitude, decimal? Longitude);

    [HttpPost("utils/resolve-maps-link")]
    [Authorize]
    public async Task<IActionResult> ResolveMapsLink([FromBody] ResolveMapsLinkRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Url))
            return Ok(ApiResponse<ResolvedMapsLinkDto>.Failure("URL is required."));

        var input = req.Url.Trim();
        if (!Uri.TryCreate(input, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return Ok(ApiResponse<ResolvedMapsLinkDto>.Failure("Invalid URL."));

        var host = uri.Host.ToLowerInvariant();
        if (!host.Contains("google.") && !host.Contains("goo.gl"))
            return Ok(ApiResponse<ResolvedMapsLinkDto>.Failure("Only Google Maps links are supported."));

        string resolvedUrl;
        try
        {
            using var handler = new HttpClientHandler { AllowAutoRedirect = true };
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(12) };
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            request.Headers.TryAddWithoutValidation("User-Agent", "RepWave/1.0");
            using var response = await client.SendAsync(request);
            resolvedUrl = response.RequestMessage?.RequestUri?.ToString() ?? input;
        }
        catch (Exception ex)
        {
            return Ok(ApiResponse<ResolvedMapsLinkDto>.Failure($"Could not resolve link: {ex.Message}"));
        }

        var coords = TryParseMapCoordinates(resolvedUrl) ?? TryParseMapCoordinates(input);
        return Ok(ApiResponse<ResolvedMapsLinkDto>.Success(
            new ResolvedMapsLinkDto(resolvedUrl, coords?.Lat, coords?.Lng)));
    }

    private static (decimal Lat, decimal Lng)? TryParseMapCoordinates(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var decoded = WebUtility.UrlDecode(text);

        var d3d4 = Regex.Match(decoded, @"!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)");
        if (d3d4.Success && TryCoordPair(d3d4.Groups[1].Value, d3d4.Groups[2].Value, out var p1))
            return p1;

        var at = Regex.Match(decoded, @"@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)");
        if (at.Success && TryCoordPair(at.Groups[1].Value, at.Groups[2].Value, out var p2))
            return p2;

        foreach (var param in new[] { "q", "query", "ll", "center" })
        {
            var m = Regex.Match(decoded, $@"(?:[?&]){param}=([^&]+)", RegexOptions.IgnoreCase);
            if (!m.Success) continue;
            var val = WebUtility.UrlDecode(m.Groups[1].Value.Replace("+", " "));
            var cm = Regex.Match(val, @"^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$");
            if (cm.Success && TryCoordPair(cm.Groups[1].Value, cm.Groups[2].Value, out var p3))
                return p3;
        }

        return null;
    }

    private static bool TryCoordPair(string latStr, string lngStr, out (decimal Lat, decimal Lng) pair)
    {
        pair = default;
        if (!decimal.TryParse(latStr, out var lat) || !decimal.TryParse(lngStr, out var lng))
            return false;
        if (lat is < -90 or > 90 || lng is < -180 or > 180) return false;
        pair = (lat, lng);
        return true;
    }
}
