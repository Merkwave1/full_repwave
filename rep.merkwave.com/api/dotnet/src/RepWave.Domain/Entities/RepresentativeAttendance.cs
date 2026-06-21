namespace RepWave.Domain.Entities;

/// <summary>Daily attendance / check-in record for a sales representative.</summary>
public class RepresentativeAttendance
{
    public int AttendanceId { get; set; }
    public int? UserId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
    public decimal? CheckInLatitude { get; set; }
    public decimal? CheckInLongitude { get; set; }
    public decimal? CheckOutLatitude { get; set; }
    public decimal? CheckOutLongitude { get; set; }
    public string Status { get; set; } = "Present";    // Present, Absent, Late
    public string? Notes { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
