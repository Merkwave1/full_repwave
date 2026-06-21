namespace RepWave.Domain.Entities;

public class ClientInterestedProduct
{
    public int ClientId { get; set; }
    public int ProductsId { get; set; }

    public Client? Client { get; set; }
    public Product? Product { get; set; }
}
