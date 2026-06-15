FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y wget ca-certificates libicu72 libssl3 zlib1g && rm -rf /var/lib/apt/lists/*
RUN wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh && chmod +x dotnet-install.sh
RUN ./dotnet-install.sh --channel 8.0 --install-dir /usr/local/dotnet
ENV PATH="/usr/local/dotnet:${PATH}"
WORKDIR /src

COPY backend/SkinAnalysis.Api/SkinAnalysis.Api.csproj ./
RUN dotnet restore ./SkinAnalysis.Api.csproj

COPY backend/SkinAnalysis.Api ./
RUN dotnet publish SkinAnalysis.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM debian:bookworm-slim AS final
RUN apt-get update && apt-get install -y wget ca-certificates libicu72 libssl3 zlib1g && rm -rf /var/lib/apt/lists/*
RUN wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh && chmod +x dotnet-install.sh
RUN ./dotnet-install.sh --channel 8.0 --install-dir /usr/local/dotnet --runtime aspnetcore
ENV PATH="/usr/local/dotnet:${PATH}"
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "SkinAnalysis.Api.dll"]
