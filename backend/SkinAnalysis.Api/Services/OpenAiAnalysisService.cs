using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Options;

namespace SkinAnalysis.Api.Services;

public class OpenAiAnalysisService : IImageAnalysisService
{
    private readonly IHttpClientFactory httpClientFactory;
    private readonly OpenAiOptions options;
    private readonly ILogger<OpenAiAnalysisService> logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

                private const string Prompt = """
Voce e um assistente profissional de skincare e deve APENAS analisar a pele.

Regras de negocio obrigatorias:
- Nao gere rotina.
- Nao selecione produtos.
- Nao sugira marcas.
- Retorne somente os parametros estruturados de analise para o backend filtrar produtos no banco.

Retorne SOMENTE JSON valido com esta estrutura:

{
    "rosto_valido": true | false,
    "imagem_nitida": true | false,
    "conteudo_permitido": true | false,
    "motivo_bloqueio": "texto curto quando rosto_valido=false ou conteudo_permitido=false",
    "tipo_pele": "Oleosa | Seca | Sensível | Mista",
    "scores": {
        "acne": 0-10,
        "oiliness": 0-10,
        "dark_spots": 0-10,
        "hydration": 0-10,
        "sensitivity": 0-10
    },
    "condicoes": {
        "acne": true | false,
        "olheiras": true | false,
        "poros": true | false,
        "manchas": true | false,
        "labios_ressecados": true | false
    },
    "recomendacoes_adicionais": "texto curto em portugues com observacoes importantes"
}

Instrucoes adicionais:
- Responda em portugues do Brasil.
- Se a imagem estiver embaçada, desfocada, com baixa resolucao, sem iluminacao suficiente ou sem detalhes de pele: defina imagem_nitida=false, preencha motivo_bloqueio e nao tente analisar pele.
- Se nao houver rosto humano claro/frontal, se houver multiplos rostos, objetos, paisagens, texto, ilustrações, pornografia, violencia ou qualquer conteudo impróprio: defina rosto_valido=false ou conteudo_permitido=false, preencha motivo_bloqueio e nao tente analisar pele.
- Quando bloquear, mantenha tipo_pele="indefinido", todas condicoes=false e recomendacoes_adicionais curto explicando que a imagem foi recusada.
- Sempre preencha scores com inteiros de 0 a 10 (quanto maior, pior severidade). Quando bloquear, retorne todos scores como 0.
- Nunca retorne markdown, somente JSON puro.
""";

    public OpenAiAnalysisService(IHttpClientFactory httpClientFactory, IOptions<OpenAiOptions> openAiOptions, ILogger<OpenAiAnalysisService> logger)
    {
        this.httpClientFactory = httpClientFactory;
        this.options = openAiOptions.Value;
        this.logger = logger;
    }

    public async Task<OpenAiAnalysisDto> AnalyzeImageAsync(string imageUrl, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(options.ApiKey))
        {
            throw new InvalidOperationException("OpenAI API key is not configured.");
        }

        var payload = new
        {
            model = options.Model,
            input = new object[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "input_text", text = Prompt },
                        new { type = "input_image", image_url = imageUrl }
                    }
                }
            },
            text = new
            {
                format = new
                {
                    type = "json_schema",
                    name = "skin_analysis",
                    schema = new
                    {
                        type = "object",
                        additionalProperties = false,
                        required = new[]
                        {
                            "rosto_valido",
                            "imagem_nitida",
                            "conteudo_permitido",
                            "motivo_bloqueio",
                            "tipo_pele",
                            "scores",
                            "condicoes",
                            "recomendacoes_adicionais"
                        },
                        properties = new
                        {
                            rosto_valido = new { type = "boolean" },
                            imagem_nitida = new { type = "boolean" },
                            conteudo_permitido = new { type = "boolean" },
                            motivo_bloqueio = new { type = "string" },
                            tipo_pele = new { type = "string" },
                            scores = new
                            {
                                type = "object",
                                additionalProperties = false,
                                required = new[] { "acne", "oiliness", "dark_spots", "hydration", "sensitivity" },
                                properties = new
                                {
                                    acne = new { type = "integer", minimum = 0, maximum = 10 },
                                    oiliness = new { type = "integer", minimum = 0, maximum = 10 },
                                    dark_spots = new { type = "integer", minimum = 0, maximum = 10 },
                                    hydration = new { type = "integer", minimum = 0, maximum = 10 },
                                    sensitivity = new { type = "integer", minimum = 0, maximum = 10 }
                                }
                            },
                            condicoes = new
                            {
                                type = "object",
                                additionalProperties = false,
                                required = new[] { "acne", "olheiras", "poros", "manchas", "labios_ressecados" },
                                properties = new
                                {
                                    acne = new { type = "boolean" },
                                    olheiras = new { type = "boolean" },
                                    poros = new { type = "boolean" },
                                    manchas = new { type = "boolean" },
                                    labios_ressecados = new { type = "boolean" }
                                }
                            },
                            recomendacoes_adicionais = new { type = "string" }
                        }
                    }
                }
            }
        };

        var client = httpClientFactory.CreateClient("OpenAI");
        using var message = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/responses")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };

        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

        using var response = await client.SendAsync(message, cancellationToken);
        var raw = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("OpenAI request failed with status {StatusCode}: {Body}", response.StatusCode, raw);
            throw new InvalidOperationException(BuildOpenAiErrorDetail(response.StatusCode, raw));
        }

        var jsonContent = ExtractJsonContent(raw);
        var parsed = JsonSerializer.Deserialize<OpenAiAnalysisDto>(jsonContent, JsonOptions);
        if (parsed is null)
        {
            throw new InvalidOperationException("Could not parse OpenAI JSON response.");
        }

        return parsed;
    }

    private static string ExtractJsonContent(string raw)
    {
        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        if (root.TryGetProperty("output_text", out var outputText) && outputText.ValueKind == JsonValueKind.String)
        {
            return outputText.GetString() ?? throw new InvalidOperationException("OpenAI output_text was empty.");
        }

        if (root.TryGetProperty("output", out var output) && output.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in output.EnumerateArray())
            {
                if (!item.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var contentItem in content.EnumerateArray())
                {
                    if (contentItem.TryGetProperty("type", out var typeProp) &&
                        typeProp.ValueKind == JsonValueKind.String &&
                        typeProp.GetString() == "output_text" &&
                        contentItem.TryGetProperty("text", out var textProp) &&
                        textProp.ValueKind == JsonValueKind.String)
                    {
                        return textProp.GetString() ?? throw new InvalidOperationException("OpenAI output text was empty.");
                    }
                }
            }
        }

        throw new InvalidOperationException("OpenAI response did not contain JSON text output.");
    }

    private static string BuildOpenAiErrorDetail(System.Net.HttpStatusCode statusCode, string raw)
    {
        const int maxLen = 800;
        var body = string.IsNullOrWhiteSpace(raw) ? "(empty response body)" : raw;

        if (body.Length > maxLen)
        {
            body = body[..maxLen] + "...";
        }

        return $"OpenAI request failed. Status: {(int)statusCode} ({statusCode}). Body: {body}";
    }
}
