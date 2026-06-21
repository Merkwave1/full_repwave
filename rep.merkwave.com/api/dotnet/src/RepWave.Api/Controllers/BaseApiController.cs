using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace RepWave.Api.Controllers;

/// <summary>
/// Base controller with helpers for authenticated endpoints.
/// </summary>
public abstract class BaseApiController : ControllerBase
{
    /// <summary>
    /// Returns the authenticated user's ID from the JWT <c>sub</c> claim.
    /// Returns 0 if the claim is missing or cannot be parsed.
    /// </summary>
    protected int CurrentUserId =>
        int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("sub")?.Value, out var id)
            ? id : 0;
}
