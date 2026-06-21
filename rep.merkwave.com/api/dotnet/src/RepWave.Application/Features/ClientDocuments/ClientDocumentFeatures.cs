using MediatR;
using Microsoft.EntityFrameworkCore;
using RepWave.Application.Common.Interfaces;
using RepWave.Application.Common.Models;
using RepWave.Domain.Entities;

namespace RepWave.Application.Features.ClientDocuments;

public record ClientDocumentDto(
    int ClientDocumentId,
    int? ClientDocumentClientId,
    string? ClientName,
    int? ClientDocumentTypeId,
    string? DocumentTypeName,
    string? ClientDocumentTitle,
    string? ClientDocumentFilePath,
    string? ClientDocumentFileMimeType,
    int? ClientDocumentFileSizeKb,
    int? ClientDocumentUploadedByUserId,
    string? ClientDocumentNotes,
    DateTime? ClientDocumentCreatedAt);

public record CreateClientDocumentRequest(
    int ClientId,
    int? DocumentTypeId,
    string? Title,
    string? FilePath,
    string? FileMimeType,
    int? FileSizeKb,
    int? UploadedByUserId,
    string? Notes);

public record GetClientDocumentsQuery(int ClientId) : IRequest<ApiResponse<List<ClientDocumentDto>>>;

public class GetClientDocumentsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetClientDocumentsQuery, ApiResponse<List<ClientDocumentDto>>>
{
    public async Task<ApiResponse<List<ClientDocumentDto>>> Handle(GetClientDocumentsQuery request, CancellationToken ct)
    {
        var list = await db.ClientDocuments.AsNoTracking()
            .Include(d => d.Client)
            .Include(d => d.DocumentType)
            .Where(d => d.ClientDocumentClientId == request.ClientId)
            .OrderByDescending(d => d.ClientDocumentCreatedAt)
            .Select(d => new ClientDocumentDto(
                d.ClientDocumentId, d.ClientDocumentClientId, d.Client != null ? d.Client.ClientsCompanyName : null,
                d.ClientDocumentTypeId, d.DocumentType != null ? d.DocumentType.DocumentTypeName : null,
                d.ClientDocumentTitle, d.ClientDocumentFilePath, d.ClientDocumentFileMimeType,
                d.ClientDocumentFileSizeKb, d.ClientDocumentUploadedByUserId,
                d.ClientDocumentNotes, d.ClientDocumentCreatedAt))
            .ToListAsync(ct);

        return ApiResponse<List<ClientDocumentDto>>.Success(list);
    }
}

public record CreateClientDocumentCommand(CreateClientDocumentRequest Req) : IRequest<ApiResponse<ClientDocumentDto>>;

public class CreateClientDocumentCommandHandler(IApplicationDbContext db)
    : IRequestHandler<CreateClientDocumentCommand, ApiResponse<ClientDocumentDto>>
{
    public async Task<ApiResponse<ClientDocumentDto>> Handle(CreateClientDocumentCommand request, CancellationToken ct)
    {
        var r = request.Req;
        var doc = new ClientDocument
        {
            ClientDocumentClientId = r.ClientId,
            ClientDocumentTypeId = r.DocumentTypeId,
            ClientDocumentTitle = r.Title,
            ClientDocumentFilePath = r.FilePath,
            ClientDocumentFileMimeType = r.FileMimeType,
            ClientDocumentFileSizeKb = r.FileSizeKb,
            ClientDocumentUploadedByUserId = r.UploadedByUserId,
            ClientDocumentNotes = r.Notes,
            ClientDocumentCreatedAt = DateTime.UtcNow
        };
        db.ClientDocuments.Add(doc);
        await db.SaveChangesAsync(ct);
        return ApiResponse<ClientDocumentDto>.Success(new ClientDocumentDto(
            doc.ClientDocumentId, doc.ClientDocumentClientId, null,
            doc.ClientDocumentTypeId, null, doc.ClientDocumentTitle,
            doc.ClientDocumentFilePath, doc.ClientDocumentFileMimeType,
            doc.ClientDocumentFileSizeKb, doc.ClientDocumentUploadedByUserId,
            doc.ClientDocumentNotes, doc.ClientDocumentCreatedAt));
    }
}

public record DeleteClientDocumentCommand(int Id) : IRequest<ApiResponse<object>>;

public class DeleteClientDocumentCommandHandler(IApplicationDbContext db)
    : IRequestHandler<DeleteClientDocumentCommand, ApiResponse<object>>
{
    public async Task<ApiResponse<object>> Handle(DeleteClientDocumentCommand request, CancellationToken ct)
    {
        var doc = await db.ClientDocuments.FindAsync([request.Id], ct);
        if (doc is null) return ApiResponse<object>.Failure("Document not found.");
        db.ClientDocuments.Remove(doc);
        await db.SaveChangesAsync(ct);
        return ApiResponse<object>.Success(null!, "Document deleted.");
    }
}


