namespace RepWave.Application.Common.Interfaces;

public interface ITokenService
{
    string GenerateToken(int userId, string email, string role, string name, string tenantId);
}
