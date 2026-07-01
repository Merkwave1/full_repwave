using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RepWave.Application.Features.ClientDocuments;
using System.Security.Claims;

namespace RepWave.Api.Controllers;

[Authorize]
[ApiController]
public class ClientDocumentsController(IMediator mediator) : ControllerBase
{
    [HttpGet("api/clients/{clientId:int}/documents")]
    public async Task<IActionResult> GetByClient(int clientId)
        => Ok(await mediator.Send(new GetClientDocumentsQuery(clientId)));

    [HttpGet("api/lookups/client-document-types")]
    public async Task<IActionResult> GetDocumentTypes()
        => Ok(await mediator.Send(new GetClientDocumentTypesQuery()));

    [HttpPost("api/client-documents")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<IActionResult> Create([FromForm] UploadClientDocumentForm form)
    {
        if (form.DocumentFile is null || form.DocumentFile.Length == 0)
            return BadRequest(new { status = "failure", message = "Document file is required." });

        var clientId = form.ClientId > 0 ? form.ClientId : form.ClientDocumentClientId;
        if (clientId <= 0)
            return BadRequest(new { status = "failure", message = "Client ID is required." });

        var title = !string.IsNullOrWhiteSpace(form.Title)
            ? form.Title
            : form.ClientDocumentTitle ?? string.Empty;
        var documentTypeId = form.DocumentTypeId ?? form.ClientDocumentTypeId;
        var notes = form.Notes ?? form.ClientDocumentNotes;

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("users_id")?.Value;
        int? uploadedBy = int.TryParse(userIdClaim, out var uid) ? uid : form.UploadedByUserId;

        await using var stream = form.DocumentFile.OpenReadStream();
        var result = await mediator.Send(new UploadClientDocumentCommand(
            clientId,
            documentTypeId,
            title,
            notes,
            uploadedBy,
            stream,
            form.DocumentFile.FileName,
            form.DocumentFile.ContentType,
            User.FindFirst("tenant")?.Value ?? "demo"));

        return Ok(result);
    }

    [HttpDelete("api/client-documents/{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await mediator.Send(new DeleteClientDocumentCommand(id)));
}

public class UploadClientDocumentForm
{
    [FromForm(Name = "client_id")]
    public int ClientId { get; set; }

    [FromForm(Name = "client_document_client_id")]
    public int ClientDocumentClientId { get; set; }

    [FromForm(Name = "document_type_id")]
    public int? DocumentTypeId { get; set; }

    [FromForm(Name = "client_document_type_id")]
    public int? ClientDocumentTypeId { get; set; }

    [FromForm(Name = "title")]
    public string? Title { get; set; }

    [FromForm(Name = "client_document_title")]
    public string? ClientDocumentTitle { get; set; }

    [FromForm(Name = "notes")]
    public string? Notes { get; set; }

    [FromForm(Name = "client_document_notes")]
    public string? ClientDocumentNotes { get; set; }

    [FromForm(Name = "uploaded_by_user_id")]
    public int? UploadedByUserId { get; set; }

    [FromForm(Name = "document_file")]
    public IFormFile? DocumentFile { get; set; }
}
