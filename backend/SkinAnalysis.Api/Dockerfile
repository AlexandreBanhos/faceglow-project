FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y dotnet-sdk-8.0 && rm -rf /var/lib/apt/lists/*
WORKDIR /src

COPY backend/SkinAnalysis.Api/SkinAnalysis.Api.csproj ./
RUN dotnet restore ./SkinAnalysis.Api.csproj

COPY backend/SkinAnalysis.Api ./
RUN dotnet publish SkinAnalysis.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM debian:bookworm-slim AS final
RUN apt-get update && apt-get install -y dotnet-runtime-8.0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "SkinAnalysis.Api.dll"]
