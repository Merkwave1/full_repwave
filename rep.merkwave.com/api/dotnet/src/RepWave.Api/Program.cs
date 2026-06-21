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
using RepWave.Api.Hubs;

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
        // Allow token from query string for SignalR WebSocket connections
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                var path = ctx.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
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

    // ── Auto-seed demo tenant ─────────────────────────────────────────────────
    if (!await masterDb.Tenants.AnyAsync(t => t.TenantId == "demo"))
    {
        var demoConnStr = app.Configuration["DemoTenant:ConnectionString"]
            ?? "Host=postgres;Port=5432;Database=repwave_demo;Username=repwave_user;Password=repwave_pass";

        var mediator = startupScope.ServiceProvider.GetRequiredService<IMediator>();
        var result = await mediator.Send(new RegisterTenantCommand(new RegisterTenantRequest(
            TenantId: "demo",
            Name: "Demo Company",
            ConnectionString: demoConnStr,
            Plan: "enterprise",
            ExpirationDate: DateTime.UtcNow.AddYears(10),
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
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors("Default");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
