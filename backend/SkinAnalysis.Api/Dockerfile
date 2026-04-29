FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/SkinAnalysis.Api/SkinAnalysis.Api.csproj ./
RUN dotnet restore ./SkinAnalysis.Api.csproj

COPY backend/SkinAnalysis.Api ./
RUN dotnet publish SkinAnalysis.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000
COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "SkinAnalysis.Api.dll"]
