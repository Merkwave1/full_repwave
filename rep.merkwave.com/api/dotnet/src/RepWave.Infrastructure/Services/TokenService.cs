using Microsoft.Extensions.Configuration;
using RepWave.Application.Common.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace RepWave.Infrastructure.Services;

public class TokenService(IConfiguration config) : ITokenService
{
    private const string TenantClaimType = "tenant";
    public const string AdminSupportClaimType = "admin_support";

    public string GenerateToken(int userId, string email, string role, string name, string tenantId, bool adminSupport = false)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["JwtSettings:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddDays(int.TryParse(config["JwtSettings:ExpiryDays"], out var d) ? d : 30);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.Role, role),
            new(ClaimTypes.Name, name),
            new(TenantClaimType, tenantId),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        if (adminSupport)
            claims.Add(new Claim(AdminSupportClaimType, "true"));

        var token = new JwtSecurityToken(
            issuer: config["JwtSettings:Issuer"],
            audience: config["JwtSettings:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
