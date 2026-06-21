namespace RepWave.Domain.Entities;

public class SalesReturnItem
{
    public int ReturnItemsId { get; set; }
    public int ReturnItemsReturnId { get; set; }
    public int? ReturnItemsSalesOrderItemId { get; set; }
    public int ReturnItemsQuantity { get; set; } = 0;
    public decimal ReturnItemsUnitPrice { get; set; } = 0;
    public decimal ReturnItemsTotalPrice { get; set; } = 0;
    public string? ReturnItemsNotes { get; set; }
    public decimal ReturnItemsTaxAmount { get; set; } = 0;
    public decimal ReturnItemsTaxRate { get; set; } = 0;
    public bool ReturnItemsHasTax { get; set; } = false;

    public SalesReturn? Return { get; set; }
    public SalesOrderItem? SalesOrderItem { get; set; }
}
