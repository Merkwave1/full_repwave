using System.Text;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RepWave.Application;
using RepWave.Application.Features.TenantManagement;
using RepWave.Infrastructure;
using RepWave.Api.Middleware;
using RepWave.Infrastructure.Persistence;
using RepWave.Infrastructure.Storage;
using RepWave.Api.Hubs;
using RepWave.Application.Common.Interfaces;
using RepWave.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
        opt.JsonSerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
        opt.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();

var jwtKey = builder.Configuration["JwtSettings:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        opts.MapInboundClaims = false;
        // Allow token from query string or Authorization header for SignalR
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var path = ctx.HttpContext.Request.Path;
                if (!path.StartsWithSegments("/hubs")) return Task.CompletedTask;

                var accessToken = ctx.Request.Query["access_token"];
                if (string.IsNullOrEmpty(accessToken))
                {
                    var authHeader = ctx.Request.Headers.Authorization.FirstOrDefault();
                    if (!string.IsNullOrEmpty(authHeader) &&
                        authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                        accessToken = authHeader["Bearer ".Length..];
                }

                if (!string.IsNullOrEmpty(accessToken))
                    ctx.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opts => opts.AddPolicy("Default",
    p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "RepWave API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "JWT Bearer token",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            []
        }
    });
});

var app = builder.Build();

// Ensure master database and schema exist (creates tables if not present)
using (var startupScope = app.Services.CreateScope())
{
    var masterDb = startupScope.ServiceProvider.GetRequiredService<MasterDbContext>();
    await masterDb.Database.EnsureCreatedAsync();

    try
    {
        await masterDb.Database.ExecuteSqlRawAsync(
            """ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS "ContactCountry" character varying(100);""");
    }
    catch
    {
        /* non-Postgres or already applied */
    }

    try
    {
        await masterDb.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS "AdminUsers" (
                "AdminUserId" serial PRIMARY KEY,
                "Email" character varying(255) NOT NULL UNIQUE,
                "PasswordHash" text NOT NULL,
                "Name" character varying(200) NOT NULL,
                "IsActive" boolean NOT NULL DEFAULT true,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW()
            );
            """);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  AdminUsers table migration skipped: {ex.Message}");
    }

    try
    {
        await masterDb.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS "SubscriptionStartedAt" timestamp with time zone;
            ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS "RenewalCount" integer NOT NULL DEFAULT 0;
            ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS "LastRenewedAt" timestamp with time zone;
            UPDATE "Tenants" SET "SubscriptionStartedAt" = "CreatedAt" WHERE "SubscriptionStartedAt" IS NULL;
            """);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Tenant subscription columns migration skipped: {ex.Message}");
    }

    try
    {
        await masterDb.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS "AdminAuditLogs" (
                "Id" serial PRIMARY KEY,
                "AdminEmail" character varying(255) NOT NULL,
                "AdminName" character varying(200) NOT NULL,
                "Action" character varying(100) NOT NULL,
                "TenantId" character varying(100),
                "TargetUserId" integer,
                "TargetUserEmail" character varying(255),
                "Details" character varying(2000),
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS "IX_AdminAuditLogs_CreatedAt" ON "AdminAuditLogs" ("CreatedAt" DESC);
            CREATE INDEX IF NOT EXISTS "IX_AdminAuditLogs_TenantId" ON "AdminAuditLogs" ("TenantId");
            """);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  AdminAuditLogs table migration skipped: {ex.Message}");
    }

    // ── Auto-seed super-admin user ────────────────────────────────────────────
    const string adminEmail = "admin@repwave.io";
    const string adminPassword = "RepWaveAdmin123!";
    if (!await masterDb.AdminUsers.AnyAsync(u => u.Email == adminEmail))
    {
        masterDb.AdminUsers.Add(new AdminUser
        {
            Email = adminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Name = "RepWave Super Admin",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        });
        await masterDb.SaveChangesAsync();
        Console.WriteLine($"✅ Super-admin seeded: {adminEmail} / {adminPassword}");
    }

    // ── Auto-seed demo tenant ─────────────────────────────────────────────────
    const string demoTenantId = "demo";
    var demoUnlimitedExpiry = new DateTime(2099, 12, 31, 0, 0, 0, DateTimeKind.Utc);
    const string demoExpiryValue = "2099-12-31";

    if (!await masterDb.Tenants.AnyAsync(t => t.TenantId == demoTenantId))
    {
        var demoConnStr = app.Configuration["DemoTenant:ConnectionString"]
            ?? "Host=postgres;Port=5432;Database=repwave_demo;Username=repwave_user;Password=repwave_pass";

        var mediator = startupScope.ServiceProvider.GetRequiredService<IMediator>();
        var result = await mediator.Send(new RegisterTenantCommand(new RegisterTenantRequest(
            TenantId: demoTenantId,
            Name: "Demo Company",
            ConnectionString: demoConnStr,
            Plan: "enterprise",
            ExpirationDate: demoUnlimitedExpiry,
            ContactEmail: "admin@demo.com",
            ContactPhone: null,
            Notes: "Auto-provisioned demo tenant",
            AdminEmail: "admin@demo.com",
            AdminPassword: "Admin123!",
            AdminName: "Admin",
            AdminPhone: null)));

        Console.WriteLine(result.Status == "success"
            ? "✅ Demo tenant provisioned: tenantId=demo  email=admin@demo.com  password=Admin123!"
            : $"⚠️  Demo tenant seeding: {result.Message}");
    }

    // Keep demo tenant active with unlimited expiry (master DB + tenant settings)
    var demoTenant = await masterDb.Tenants.FirstOrDefaultAsync(t => t.TenantId == demoTenantId);
    if (demoTenant != null)
    {
        var masterChanged = false;
        if (demoTenant.ExpirationDate < demoUnlimitedExpiry)
        {
            demoTenant.ExpirationDate = demoUnlimitedExpiry;
            masterChanged = true;
        }
        if (!demoTenant.IsActive)
        {
            demoTenant.IsActive = true;
            masterChanged = true;
        }
        if (demoTenant.Plan != "enterprise")
        {
            demoTenant.Plan = "enterprise";
            masterChanged = true;
        }
        if (masterChanged)
            await masterDb.SaveChangesAsync();

        try
        {
            var dbFactory = startupScope.ServiceProvider.GetRequiredService<ITenantDbContextFactory>();
            using var tenantDb = dbFactory.Create(demoTenantId);
            var expirationSetting = await tenantDb.Settings
                .FirstOrDefaultAsync(s => s.SettingsKey == "expiration_date");
            if (expirationSetting == null)
            {
                tenantDb.Settings.Add(new Setting
                {
                    SettingsKey = "expiration_date",
                    SettingsValue = demoExpiryValue,
                    SettingsLabel = "Expiration Date",
                    SettingsCategory = "system",
                    CreatedAt = DateTime.UtcNow,
                });
                await tenantDb.SaveChangesAsync(CancellationToken.None);
            }
            else if (expirationSetting.SettingsValue != demoExpiryValue)
            {
                expirationSetting.SettingsValue = demoExpiryValue;
                expirationSetting.UpdatedAt = DateTime.UtcNow;
                await tenantDb.SaveChangesAsync(CancellationToken.None);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️  Demo tenant expiration sync skipped: {ex.Message}");
        }
    }
}

app.UseSwagger();
app.UseSwaggerUI();

var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(webRoot);
app.UseStaticFiles();

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors("Default");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
