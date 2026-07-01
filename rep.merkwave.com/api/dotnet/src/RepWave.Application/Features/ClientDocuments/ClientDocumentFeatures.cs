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

public record ClientDocumentTypeDto(int DocumentTypeId, string DocumentTypeName);

public record CreateClientDocumentRequest(
    int ClientId,
    int? DocumentTypeId,
    string? Title,
    string? FilePath,
    string? FileMimeType,
    int? FileSizeKb,
    int? UploadedByUserId,
    string? Notes);

public record UploadClientDocumentCommand(
    int ClientId,
    int? DocumentTypeId,
    string Title,
    string? Notes,
    int? UploadedByUserId,
    Stream FileStream,
    string OriginalFileName,
    string? ContentType,
    string TenantKey) : IRequest<ApiResponse<ClientDocumentDto>>;

public record GetClientDocumentsQuery(int ClientId) : IRequest<ApiResponse<List<ClientDocumentDto>>>;

public record GetClientDocumentTypesQuery() : IRequest<ApiResponse<List<ClientDocumentTypeDto>>>;

public class GetClientDocumentTypesQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetClientDocumentTypesQuery, ApiResponse<List<ClientDocumentTypeDto>>>
{
    public async Task<ApiResponse<List<ClientDocumentTypeDto>>> Handle(GetClientDocumentTypesQuery request, CancellationToken ct)
    {
        await ClientDocumentSupport.EnsureDefaultDocumentTypesAsync(db, ct);
        var list = await db.ClientDocumentTypes.AsNoTracking()
            .OrderBy(t => t.DocumentTypeId)
            .Select(t => new ClientDocumentTypeDto(t.DocumentTypeId, t.DocumentTypeName))
            .ToListAsync(ct);
        return ApiResponse<List<ClientDocumentTypeDto>>.Success(list);
    }
}

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
        if (r.ClientId <= 0)
            return ApiResponse<ClientDocumentDto>.Failure("Client ID is required.");
        if (string.IsNullOrWhiteSpace(r.Title))
            return ApiResponse<ClientDocumentDto>.Failure("Document title is required.");

        var clientExists = await db.Clients.AnyAsync(c => c.ClientsId == r.ClientId, ct);
        if (!clientExists)
            return ApiResponse<ClientDocumentDto>.Failure("Client not found.");

        await ClientDocumentSupport.EnsureDefaultDocumentTypesAsync(db, ct);
        var typeId = await ClientDocumentSupport.ResolveDocumentTypeIdAsync(db, r.DocumentTypeId, ct);

        var doc = new ClientDocument
        {
            ClientDocumentClientId = r.ClientId,
            ClientDocumentTypeId = typeId,
            ClientDocumentTitle = r.Title.Trim(),
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

public class UploadClientDocumentCommandHandler(IApplicationDbContext db, IClientDocumentStorage storage)
    : IRequestHandler<UploadClientDocumentCommand, ApiResponse<ClientDocumentDto>>
{
    public async Task<ApiResponse<ClientDocumentDto>> Handle(UploadClientDocumentCommand request, CancellationToken ct)
    {
        if (request.ClientId <= 0)
            return ApiResponse<ClientDocumentDto>.Failure("Client ID is required.");
        if (string.IsNullOrWhiteSpace(request.Title))
            return ApiResponse<ClientDocumentDto>.Failure("Document title is required.");
        if (request.FileStream is null || request.FileStream.Length == 0)
            return ApiResponse<ClientDocumentDto>.Failure("Document file is required.");

        var clientExists = await db.Clients.AnyAsync(c => c.ClientsId == request.ClientId, ct);
        if (!clientExists)
            return ApiResponse<ClientDocumentDto>.Failure("Client not found.");

        string relativePath;
        string mimeType;
        int sizeKb;
        try
        {
            (relativePath, mimeType, sizeKb) = await storage.SaveClientDocumentAsync(
                request.FileStream,
                request.OriginalFileName,
                request.ContentType,
                request.TenantKey,
                ct);
        }
        catch (InvalidOperationException ex)
        {
            return ApiResponse<ClientDocumentDto>.Failure(ex.Message);
        }

        await ClientDocumentSupport.EnsureDefaultDocumentTypesAsync(db, ct);
        var typeId = await ClientDocumentSupport.ResolveDocumentTypeIdAsync(db, request.DocumentTypeId, ct);

        var doc = new ClientDocument
        {
            ClientDocumentClientId = request.ClientId,
            ClientDocumentTypeId = typeId,
            ClientDocumentTitle = request.Title.Trim(),
            ClientDocumentFilePath = relativePath,
            ClientDocumentFileMimeType = mimeType,
            ClientDocumentFileSizeKb = sizeKb,
            ClientDocumentUploadedByUserId = request.UploadedByUserId,
            ClientDocumentNotes = request.Notes,
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

internal static class ClientDocumentSupport
{
    private static readonly string[] DefaultTypeNames = ["عام", "عقد", "فاتورة", "شهادة", "أخرى"];

    public static async Task EnsureDefaultDocumentTypesAsync(IApplicationDbContext db, CancellationToken ct)
    {
        if (await db.ClientDocumentTypes.AnyAsync(ct)) return;

        foreach (var name in DefaultTypeNames)
            db.ClientDocumentTypes.Add(new ClientDocumentType { DocumentTypeName = name });

        await db.SaveChangesAsync(ct);
    }

    public static async Task<int?> ResolveDocumentTypeIdAsync(IApplicationDbContext db, int? requestedTypeId, CancellationToken ct)
    {
        if (!requestedTypeId.HasValue || requestedTypeId.Value <= 0)
            return null;

        var exists = await db.ClientDocumentTypes.AnyAsync(t => t.DocumentTypeId == requestedTypeId.Value, ct);
        if (exists) return requestedTypeId.Value;

        var types = await db.ClientDocumentTypes.AsNoTracking()
            .OrderBy(t => t.DocumentTypeId)
            .Select(t => t.DocumentTypeId)
            .ToListAsync(ct);

        if (types.Count == 0) return null;

        var index = requestedTypeId.Value - 1;
        return index >= 0 && index < types.Count ? types[index] : types[0];
    }
}

