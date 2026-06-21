using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using RepWave.Application.Features.Auth.Commands;
using RepWave.Application.Features.Auth.DTOs;

namespace RepWave.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IMediator mediator) : BaseApiController
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req) =>
        Ok(await mediator.Send(new LoginCommand(req)));

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req) =>
        Ok(await mediator.Send(new ChangePasswordCommand(CurrentUserId, req.OldPassword, req.NewPassword)));
}
