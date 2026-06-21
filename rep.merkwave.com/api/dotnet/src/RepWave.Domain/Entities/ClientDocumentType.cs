namespace RepWave.Domain.Entities;

public class ClientDocumentType
{
    public int DocumentTypeId { get; set; }
    public string DocumentTypeName { get; set; } = string.Empty;

    public ICollection<ClientDocument> ClientDocuments { get; set; } = [];
}
