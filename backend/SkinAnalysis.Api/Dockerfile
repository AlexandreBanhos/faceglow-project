FROM docker.io/library/buildpack-deps:jammy AS build
WORKDIR /src

RUN apt-get update && apt-get install -y dotnet-sdk-8.0 && rm -rf /var/lib/apt/lists/*

COPY backend/SkinAnalysis.Api/SkinAnalysis.Api.csproj ./
RUN dotnet restore ./SkinAnalysis.Api.csproj

COPY backend/SkinAnalysis.Api ./
RUN dotnet publish SkinAnalysis.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM docker.io/library/ubuntu:jammy AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000

RUN apt-get update && apt-get install -y dotnet-runtime-8.0 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "SkinAnalysis.Api.dll"]
