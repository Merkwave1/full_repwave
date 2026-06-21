using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.ClientDocuments;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
public class ClientDocumentsController(IMediator mediator) : ControllerBase
{
    [HttpGet("api/clients/{clientId:int}/documents")]
    public async Task<IActionResult> GetByClient(int clientId)
        => Ok(await mediator.Send(new GetClientDocumentsQuery(clientId)));

    [HttpPost("api/client-documents")]
    public async Task<IActionResult> Create([FromBody] CreateClientDocumentRequest req) => Ok(await mediator.Send(new CreateClientDocumentCommand(req)));

    [HttpDelete("api/client-documents/{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteClientDocumentCommand(id)));
}
