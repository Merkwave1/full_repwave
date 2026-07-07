using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using RepWave.Application.Common.Interfaces;

namespace RepWave.Infrastructure.Services;

public class AdminActorProvider(IHttpContextAccessor httpContext) : IAdminActorProvider
{
    public (string Email, string Name) GetCurrentAdmin()
    {
        var user = httpContext.HttpContext?.User;
        var email = user?.FindFirst(ClaimTypes.Email)?.Value
            ?? user?.FindFirst("email")?.Value
            ?? "unknown";
        var name = user?.FindFirst(ClaimTypes.Name)?.Value ?? "Admin";
        return (email, name);
    }
}
