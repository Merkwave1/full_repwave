namespace RepWave.Api.Requests;

public record UpdateStatusRequest(string Status);
public record UpdateSalesReturnStatusRequest(string Status);
public record UpdatePurchaseReturnStatusRequest(string Status);
public record UpdateInvoiceStatusRequest(string Status);
