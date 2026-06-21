using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using RepWave.Application.Common.Interfaces;
using RepWave.Infrastructure.Persistence;

namespace RepWave.Infrastructure.Services;

/// <summary>
/// Resolves tenant connection strings from the repwave_master database.
/// Results are cached in IMemoryCache (5-minute sliding window) to avoid
/// hitting the master DB on every authenticated request.
/// </summary>
public sealed class TenantService(
    IHttpContextAccessor httpContextAccessor,
    MasterDbContext masterDb,
    IMemoryCache cache) : ITenantService
{
    private const string TenantClaimType = "tenant";
    private const int CacheTtlMinutes = 5;

    public string GetTenantId()
    {
        var id = httpContextAccessor.HttpContext?.User?.Claims
            .FirstOrDefault(c => c.Type == TenantClaimType)?.Value;

        if (string.IsNullOrWhiteSpace(id))
            throw new UnauthorizedAccessException(
                "Tenant claim is missing from the JWT. Ensure you pass a valid Bearer token.");

        return id;
    }

    public string GetConnectionString(string tenantId)
    {
        var cacheKey = ConnCacheKey(tenantId);

        if (cache.TryGetValue(cacheKey, out string? cached) && cached is not null)
            return cached;

        var tenant = masterDb.Tenants
            .AsNoTracking()
            .FirstOrDefault(t => t.TenantId == tenantId)
            ?? throw new InvalidOperationException(
                $"Tenant '{tenantId}' is not registered in the master database.");

        if (!tenant.IsActive)
            throw new InvalidOperationException($"Tenant '{tenantId}' is inactive.");

        if (tenant.ExpirationDate.HasValue && tenant.ExpirationDate.Value < DateTime.UtcNow)
            throw new InvalidOperationException($"Tenant '{tenantId}' subscription has expired.");

        cache.Set(cacheKey, tenant.ConnectionString,
            new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromMinutes(CacheTtlMinutes) });

        return tenant.ConnectionString;
    }

    public string GetCurrentConnectionString() => GetConnectionString(GetTenantId());

    public bool TenantExists(string tenantId)
    {
        var cacheKey = ExistsCacheKey(tenantId);

        if (cache.TryGetValue(cacheKey, out bool cached))
            return cached;

        var exists = masterDb.Tenants.Any(t => t.TenantId == tenantId && t.IsActive);
        cache.Set(cacheKey, exists,
            new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromMinutes(CacheTtlMinutes) });

        return exists;
    }

    public void InvalidateTenantCache(string tenantId)
    {
        cache.Remove(ConnCacheKey(tenantId));
        cache.Remove(ExistsCacheKey(tenantId));
    }

    private static string ConnCacheKey(string tenantId) => $"tenant_conn_{tenantId}";
    private static string ExistsCacheKey(string tenantId) => $"tenant_exists_{tenantId}";
}
