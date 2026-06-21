namespace RepWave.Domain.Entities;

public class Account
{
    public int AccountsId { get; set; }
    public string AccountsCode { get; set; } = string.Empty;
    public string AccountsName { get; set; } = string.Empty;
    public string AccountsType { get; set; } = string.Empty;
    public int AccountsSortId { get; set; }
}
