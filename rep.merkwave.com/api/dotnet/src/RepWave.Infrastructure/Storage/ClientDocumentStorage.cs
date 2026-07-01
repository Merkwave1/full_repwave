using Microsoft.AspNetCore.Hosting;
using RepWave.Application.Common.Interfaces;

namespace RepWave.Infrastructure.Storage;

public class ClientDocumentStorage(IWebHostEnvironment env) : IClientDocumentStorage
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"
    };

    public async Task<(string RelativePath, string MimeType, int SizeKb)> SaveClientDocumentAsync(
        Stream content,
        string originalFileName,
        string? contentType,
        string tenantKey,
        CancellationToken ct = default)
    {
        var safeTenant = SanitizeSegment(tenantKey);
        var extension = Path.GetExtension(originalFileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            throw new InvalidOperationException("Unsupported file type.");

        var uploadsRoot = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", safeTenant, "documents", "client");
        Directory.CreateDirectory(uploadsRoot);

        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var absolutePath = Path.Combine(uploadsRoot, storedName);

        await using (var fs = File.Create(absolutePath))
        {
            await content.CopyToAsync(fs, ct);
        }

        var fileInfo = new FileInfo(absolutePath);
        var relativePath = $"/uploads/{safeTenant}/documents/client/{storedName}";
        var mime = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType;
        var sizeKb = (int)Math.Max(1, Math.Round(fileInfo.Length / 1024.0));

        return (relativePath, mime, sizeKb);
    }

    private static string SanitizeSegment(string value)
    {
        var cleaned = new string(value.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
        return string.IsNullOrWhiteSpace(cleaned) ? "default" : cleaned.ToLowerInvariant();
    }
}
