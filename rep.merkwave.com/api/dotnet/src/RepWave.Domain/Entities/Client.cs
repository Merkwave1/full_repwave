namespace RepWave.Domain.Entities;

public class Client
{
    public int ClientsId { get; set; }
    public int? ClientsOdooPartnerId { get; set; }
    public string ClientsCompanyName { get; set; } = string.Empty;
    public string? ClientsEmail { get; set; }
    public string? ClientsWebsite { get; set; }
    public string? ClientsVatNumber { get; set; }
    public string? ClientsDescription { get; set; }
    public string? ClientsContactName { get; set; }
    public string? ClientsContactJobTitle { get; set; }
    public string? ClientsContactPhone1 { get; set; }
    public string? ClientsContactPhone2 { get; set; }
    public string? ClientsAddress { get; set; }
    public string? ClientsStreet2 { get; set; }
    public string? ClientsBuildingNumber { get; set; }
    public string? ClientsCity { get; set; }
    public string? ClientsZip { get; set; }
    public int? ClientsCountryId { get; set; }
    public int? ClientsGovernorateId { get; set; }
    public decimal? ClientsLatitude { get; set; }
    public decimal? ClientsLongitude { get; set; }
    public int? ClientsAreaTagId { get; set; }
    public int? ClientsClientTypeId { get; set; }
    public int? ClientsIndustryId { get; set; }
    public int? ClientsRepUserId { get; set; }
    public decimal ClientsCreditLimit { get; set; } = 0;
    public decimal ClientsCreditBalance { get; set; } = 0;
    public string ClientsStatus { get; set; } = "active";
    public string? ClientsType { get; set; }
    public DateTime? ClientsLastVisit { get; set; }
    public string? ClientsPaymentTerms { get; set; }
    public string? ClientsSource { get; set; }
    public string? ClientsReferenceNote { get; set; }
    public DateTime? ClientsCreatedAt { get; set; }
    public DateTime? ClientsUpdatedAt { get; set; }
    public string? ClientsImage { get; set; }

    // Navigation
    public Country? Country { get; set; }
    public Governorate? Governorate { get; set; }
    public ClientAreaTag? AreaTag { get; set; }
    public ClientType? ClientType { get; set; }
    public ClientIndustry? Industry { get; set; }
    public User? RepUser { get; set; }
    public ICollection<ClientDocument> Documents { get; set; } = [];
    public ICollection<ClientInterestedProduct> InterestedProducts { get; set; } = [];
    public ICollection<SalesOrder> SalesOrders { get; set; } = [];
    public ICollection<Visit> Visits { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<Refund> Refunds { get; set; } = [];
}
