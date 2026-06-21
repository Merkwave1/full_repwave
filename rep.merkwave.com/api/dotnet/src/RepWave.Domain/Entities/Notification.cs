namespace RepWave.Domain.Entities;

public class Notification
{
    public int NotificationsId { get; set; }
    public string? NotificationsTitle { get; set; }
    public string? NotificationsBody { get; set; }
    public string? NotificationsData { get; set; }
    public string? NotificationsChannel { get; set; }
    public string NotificationsPriority { get; set; } = "normal";
    public bool NotificationsIsRead { get; set; } = false;
    public DateTime? NotificationsReadAt { get; set; }
    public DateTime? NotificationsSentAt { get; set; }
    public string? NotificationsReferenceTable { get; set; }
    public int? NotificationsReferenceId { get; set; }
    public DateTime? NotificationsCreatedAt { get; set; }
    public string? NotificationsRole { get; set; }
}
