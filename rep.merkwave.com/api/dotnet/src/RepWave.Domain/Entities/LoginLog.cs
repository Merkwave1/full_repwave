namespace RepWave.Domain.Entities;

public class LoginLog
{
    public int LoginLogsId { get; set; }
    public int? LoginLogsUsersId { get; set; }
    public string? LoginLogsUsersName { get; set; }
    public string? LoginLogsUsersRole { get; set; }
    public string? LoginLogsUsersUuid { get; set; }
    public string? LoginLogsUsersIp { get; set; }
    public string? LoginLogsUsersHwid { get; set; }
    public string LoginLogsStatus { get; set; } = "failure";
    public string? LoginLogsReason { get; set; }
    public DateTime? LoginLogsCreatedAt { get; set; }
}
