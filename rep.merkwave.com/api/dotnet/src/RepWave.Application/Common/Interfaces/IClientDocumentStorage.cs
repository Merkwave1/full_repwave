namespace RepWave.Application.Common.Interfaces;

public interface IClientDocumentStorage
{
    Task<(string RelativePath, string MimeType, int SizeKb)> SaveClientDocumentAsync(
        Stream content,
        string originalFileName,
        string? contentType,
        string tenantKey,
        CancellationToken ct = default);
}
