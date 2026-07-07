namespace RepWave.Application.Common.Interfaces;

public interface IAdminActorProvider
{
    (string Email, string Name) GetCurrentAdmin();
}
