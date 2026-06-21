namespace RepWave.Domain.Entities;

public class RepLocationTracking
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public DateTime TrackingTime { get; set; }
    public byte? BatteryLevel { get; set; }
    public string? PhoneInfo { get; set; }

    public User? User { get; set; }
}
