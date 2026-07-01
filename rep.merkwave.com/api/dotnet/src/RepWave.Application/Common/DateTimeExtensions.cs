namespace RepWave.Application.Common;

public static class DateTimeExtensions
{
    /// <summary>
    /// PostgreSQL timestamptz requires UTC. JSON deserializes local datetimes as Unspecified.
    /// </summary>
    public static DateTime ToUtc(this DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

    public static DateTime? ToUtc(this DateTime? value) =>
        value.HasValue ? value.Value.ToUtc() : null;
}
