FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/RepWave.Api/RepWave.Api.csproj", "src/RepWave.Api/"]
COPY ["src/RepWave.Application/RepWave.Application.csproj", "src/RepWave.Application/"]
COPY ["src/RepWave.Domain/RepWave.Domain.csproj", "src/RepWave.Domain/"]
COPY ["src/RepWave.Infrastructure/RepWave.Infrastructure.csproj", "src/RepWave.Infrastructure/"]
RUN dotnet restore "src/RepWave.Api/RepWave.Api.csproj"
COPY . .
WORKDIR "/src/src/RepWave.Api"
RUN dotnet build "RepWave.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "RepWave.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "RepWave.Api.dll"]
