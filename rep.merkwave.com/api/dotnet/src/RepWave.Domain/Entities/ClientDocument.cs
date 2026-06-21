namespace RepWave.Domain.Entities;

public class ClientDocument
{
    public int ClientDocumentId { get; set; }
    public int? ClientDocumentClientId { get; set; }
    public int? ClientDocumentTypeId { get; set; }
    public string? ClientDocumentTitle { get; set; }
    public string? ClientDocumentFilePath { get; set; }
    public string? ClientDocumentFileMimeType { get; set; }
    public int? ClientDocumentFileSizeKb { get; set; }
    public int? ClientDocumentUploadedByUserId { get; set; }
    public string? ClientDocumentNotes { get; set; }
    public DateTime? ClientDocumentCreatedAt { get; set; }
    public DateTime? ClientDocumentUpdatedAt { get; set; }

    public Client? Client { get; set; }
    public ClientDocumentType? DocumentType { get; set; }
}
