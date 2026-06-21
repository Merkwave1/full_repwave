using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.Attendance;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/attendance")]
public class AttendanceController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? userId, [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await mediator.Send(new GetAttendanceQuery(userId, fromDate, toDate, page, pageSize)));

    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInRequest req) => Ok(await mediator.Send(new CheckInCommand(req)));

    [HttpPut("{userId:int}/check-out")]
    public async Task<IActionResult> CheckOut(int userId, [FromBody] CheckOutRequest req)
        => Ok(await mediator.Send(new CheckOutCommand(userId, req)));
}
