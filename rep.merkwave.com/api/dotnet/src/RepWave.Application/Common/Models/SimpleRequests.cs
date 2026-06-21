namespace RepWave.Application.Common.Models;

/// <summary>Simple body DTO for any endpoint that takes a single status string.</summary>
public record StatusUpdateRequest(string Status);

/// <summary>Simple body DTO for PATCH settings/{key}.</summary>
public record SettingValueRequest(string? Value);

/// <summary>Simple body DTO for POST versions/increment.</summary>
public record IncrementVersionRequest(string Entity);

/// <summary>Simple body DTO for POST user-safes.</summary>
public record UserSafeAssignRequest(int UserId, int SafeId);

/// <summary>Simple body DTO for POST user-warehouses.</summary>
public record UserWarehouseAssignRequest(int UserId, int WarehouseId);
