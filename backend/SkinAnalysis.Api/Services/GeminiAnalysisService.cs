using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SkinAnalysis.Api.DTOs;
using SkinAnalysis.Api.Options;

namespace SkinAnalysis.Api.Services;

public class GeminiAnalysisService : IImageAnalysisService
{
    private const int InlineImageMaxBytes = 20 * 1024 * 1024;

    private readonly IHttpClientFactory httpClientFactory;
    private readonly GeminiOptions options;
    private readonly ILogger<GeminiAnalysisService> logger;

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
- Retorne SOMENTE os parametros estruturados de analise para o backend filtrar produtos no banco.
- Sempre retorne os 3 maiores problemas detectados na lista "top_3_factors".
- Para cada fator detectado, forneça coordenadas x,y (0-100) indicando a localizacao na face.

Retorne SOMENTE JSON valido com ESTA ESTRUTURA COMPLETA:

{
    "rosto_valido": true | false,
    "imagem_nitida": true | false,
    "conteudo_permitido": true | false,
    "motivo_bloqueio": "texto curto quando bloqueado",
    "tipo_pele": "Oleosa | Seca | Sensível | Mista",
    "scores": {
        "acne": 0-10,
        "oiliness": 0-10,
        "dark_spots": 0-10,
        "hydration": 0-10,
        "sensitivity": 0-10,
        "poros": 0-10,
        "olheiras": 0-10,
        "linhas_finas": 0-10,
        "vermelhidao": 0-10,
        "espinhas_ativas": 0-10,
        "cravos": 0-10
    },
    "condicoes": {
        "acne": true | false,
        "olheiras": true | false,
        "poros": true | false,
        "manchas": true | false,
        "labios_ressecados": true | false,
        "linhas_finas": true | false,
        "vermelhidao": true | false,
        "espinhas_ativas": true | false,
        "cravos": true | false,
        "ressecamento": true | false
    },
    "recomendacoes_adicionais": "texto curto em portugues com observacoes importantes",
    "pontos_faciais": {
        "top_3_factors": ["fator1", "fator2", "fator3"],
        "detected_points": [
            {"x": 0-100, "y": 0-100, "factor": "nome_do_fator", "severity": 1-10},
            ...mais pontos...
        ],
        "image_width": 100,
        "image_height": 140
    }
}

Instrucoes de analise detalhada:
- Responda SOMENTE em portugues do Brasil.
- Analise todos os 11 fatores: acne, oleosidade, manchas, hidratacao, sensibilidade, poros, olheiras, linhas_finas, vermelhidao, espinhas_ativas, cravos.
- Para scores: use inteiros 0-10 onde 10 = severidade MAXIMA e 0 = ausente/perfeito.
- Identifique as 3 MAIORES severidades e liste em "top_3_factors" por ordem descendente.
- Para cada condicao VERDADEIRA detectada, adicione um ponto em "detected_points" com coordenadas x,y precisas (0-100 normalizado).
- Coordenadas: x=0 (esquerda), x=100 (direita); y=0 (topo), y=100 (base do rosto).
- Se area com multiplos problemas, forneça multiplos pontos para a mesma area.
- Severidade em detected_points deve corresponder ao score da condicao.
- Bloqueio: defina rosto_valido=false, condicoes_all=false, scores_all=0, pontos_detected_points=[], top_3_factors=[].
- Quando houver bloqueio, nao tente detectar pontos faciais.
- NUNCA retorne markdown ou comentarios, SOMENTE JSON puro valido.
""";

    public GeminiAnalysisService(IHttpClientFactory httpClientFactory, IOptions<GeminiOptions> geminiOptions, ILogger<GeminiAnalysisService> logger)
    {
        this.httpClientFactory = httpClientFactory;
        this.options = geminiOptions.Value;
        this.logger = logger;
    }

    public async Task<OpenAiAnalysisDto> AnalyzeImageAsync(string imageUrl, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(options.ApiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured.");
        }

        var imagePart = await FetchImagePartAsync(imageUrl, cancellationToken);

        var client = httpClientFactory.CreateClient("Gemini");
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{options.Model}:generateContent?key={options.ApiKey}";
        Exception? lastParseException = null;

        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);
        var requestToken = linkedCts.Token;

        for (var attempt = 1; attempt <= 3; attempt++)
        {
            logger.LogInformation("[GEMINI] Attempt {Attempt}/3 - Sending request at {Timestamp}", attempt, DateTime.UtcNow);

            // Increase token budget on each retry so truncation is less likely to repeat.
            var maxTokens = attempt == 1 ? 4096 : attempt == 2 ? 6144 : 8192;

            var payload = new
            {
                contents = new object[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new
                            {
                                inlineData = new
                                {
                                    mimeType = imagePart.MimeType,
                                    data = imagePart.Base64Data
                                }
                            },
                            new { text = Prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.0,
                    topP = 0.9,
                    maxOutputTokens = maxTokens,
                    responseMimeType = "application/json"
                }
            };

            using var message = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };

            try
            {
                using var response = await client.SendAsync(message, requestToken);
                var raw = await response.Content.ReadAsStringAsync(requestToken);

                logger.LogInformation("[GEMINI] Response received - StatusCode: {StatusCode}, ContentLength: {Length}", response.StatusCode, raw.Length);

                if (!response.IsSuccessStatusCode)
                {
                    logger.LogError("[GEMINI] Attempt {Attempt} failed with status {StatusCode}: {Body}", attempt, response.StatusCode, raw);
                    if (attempt == 3)
                        throw new InvalidOperationException(BuildGeminiErrorDetail(response.StatusCode, raw));

                    if (IsRetryableStatusCode(response.StatusCode))
                    {
                        var backoffMs = GetRetryBackoffMs(attempt);
                        logger.LogWarning("[GEMINI] Attempt {Attempt} transient failure ({StatusCode}). Waiting {BackoffMs}ms before retry.", attempt, response.StatusCode, backoffMs);
                        await Task.Delay(backoffMs, requestToken);
                    }

                    continue;
                }

                try
                {
                    var (jsonContent, finishReason) = ExtractJsonContentWithReason(raw);
                    var normalizedJson = NormalizePotentiallyWrappedJson(jsonContent);

                    if (finishReason.Equals("MAX_TOKENS", StringComparison.OrdinalIgnoreCase))
                    {
                        logger.LogWarning("[GEMINI] Attempt {Attempt} hit MAX_TOKENS (limit={Limit}). Trying JSON repair before retry.", attempt, maxTokens);
                        var repaired = TryRepairTruncatedJson(normalizedJson);
                        if (repaired is not null)
                        {
                            try
                            {
                                var repairedParsed = JsonSerializer.Deserialize<OpenAiAnalysisDto>(repaired, JsonOptions);
                                if (repairedParsed is not null)
                                {
                                    logger.LogWarning("[GEMINI] Attempt {Attempt} - JSON repair succeeded (MAX_TOKENS).", attempt);
                                    return repairedParsed;
                                }
                            }
                            catch { /* repair didn't work, fall through to retry */ }
                        }
                        // Don't try to parse the broken JSON below — retry with higher token limit.
                        continue;
                    }

                    var parsed = JsonSerializer.Deserialize<OpenAiAnalysisDto>(normalizedJson, JsonOptions);
                    if (parsed is null)
                    {
                        throw new InvalidOperationException("Could not parse Gemini JSON response.");
                    }

                    logger.LogInformation("[PERF] Gemini parsed at {Timestamp:yyyy-MM-dd HH:mm:ss.fff}. SkinType={SkinType}, Acne={AcneScore}", DateTime.UtcNow, parsed.TipoPele, parsed.Scores?.Acne ?? -1);
                    return parsed;
                }
                catch (Exception ex) when (ex is JsonException || ex is InvalidOperationException)
                {
                    lastParseException = ex;
                    var rawSnippet = raw.Length > 300 ? raw[..300] + "..." : raw;
                    logger.LogWarning("[GEMINI] Attempt {Attempt} - Parse error: {Message}. Raw snippet: {Snippet}", attempt, ex.Message, rawSnippet);
                    if (attempt == 3)
                        throw;
                }
            }
            catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                logger.LogError("[GEMINI] Attempt {Attempt} - Timeout: {Message}", attempt, ex.Message);
                if (attempt == 3)
                    throw;
            }
            catch (HttpRequestException ex)
            {
                logger.LogError("[GEMINI] Attempt {Attempt} - Network error: {Message}", attempt, ex.Message);
                if (attempt == 3)
                    throw;
            }
        }

        throw new InvalidOperationException(
            $"Gemini returned malformed JSON after retries. {lastParseException?.Message}",
            lastParseException);
    }

    /// <summary>
    /// Closes any open JSON braces/brackets to make a truncated JSON parseable.
    /// Returns null if the string doesn't look like a JSON object at all.
    /// </summary>
    private static string? TryRepairTruncatedJson(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;

        var sb = new StringBuilder(text.TrimEnd());

        // Remove trailing incomplete token: e.g. partial key like `"conteudo_pe`
        // Walk back to the last character that could end a valid JSON value.
        while (sb.Length > 0 && sb[^1] is not ('}' or ']' or '"' or 'e' or 'l'))
        {
            // 'e' → true/false, 'l' → null
            var last = sb[^1];
            if (char.IsDigit(last)) break;
            sb.Remove(sb.Length - 1, 1);
        }

        // Remove trailing comma or colon that's no longer followed by a value.
        while (sb.Length > 0 && sb[^1] is (',' or ':'))
        {
            sb.Remove(sb.Length - 1, 1);
        }

        // Count unclosed braces/brackets.
        var stack = new Stack<char>();
        var inString = false;
        var escaped = false;

        foreach (var c in sb.ToString())
        {
            if (escaped) { escaped = false; continue; }
            if (c == '\\' && inString) { escaped = true; continue; }
            if (c == '"') { inString = !inString; continue; }
            if (inString) continue;

            if (c == '{') stack.Push('}');
            else if (c == '[') stack.Push(']');
            else if ((c == '}' || c == ']') && stack.Count > 0 && stack.Peek() == c)
                stack.Pop();
        }

        // Close open structures in reverse order.
        while (stack.Count > 0)
            sb.Append(stack.Pop());

        var result = sb.ToString();
        return result.Contains('{') ? result : null;
    }

    private static string NormalizePotentiallyWrappedJson(string text)
    {
        var trimmed = text.Trim();

        // Sometimes the model returns a JSON object wrapped as a JSON string.
        if (trimmed.Length >= 2 && trimmed[0] == '"' && trimmed[^1] == '"')
        {
            try
            {
                var unwrapped = JsonSerializer.Deserialize<string>(trimmed);
                if (!string.IsNullOrWhiteSpace(unwrapped))
                {
                    trimmed = unwrapped.Trim();
                }
            }
            catch
            {
                // keep original
            }
        }

        var firstBrace = trimmed.IndexOf('{');
        var lastBrace = trimmed.LastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace)
        {
            return trimmed[firstBrace..(lastBrace + 1)];
        }

        return trimmed;
    }

    private static (string JsonContent, string FinishReason) ExtractJsonContentWithReason(string raw)
    {
        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        if (root.TryGetProperty("candidates", out var candidates) && candidates.ValueKind == JsonValueKind.Array)
        {
            foreach (var candidate in candidates.EnumerateArray())
            {
                var finishReason = candidate.TryGetProperty("finishReason", out var fr)
                    ? fr.GetString() ?? string.Empty
                    : string.Empty;

                if (!candidate.TryGetProperty("content", out var content) || !content.TryGetProperty("parts", out var parts) || parts.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("text", out var textProp) && textProp.ValueKind == JsonValueKind.String)
                    {
                        var text = (textProp.GetString() ?? string.Empty)
                            .Replace("```json", "").Replace("```", "")
                            .Trim();

                        return (text, finishReason);
                    }
                }
            }
        }

        throw new InvalidOperationException("Gemini response did not contain expected JSON content.");
    }

    private async Task<(string Base64Data, string MimeType)> FetchImagePartAsync(string imageUrl, CancellationToken cancellationToken)
    {
        if (imageUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) ||
            imageUrl.StartsWith("data:application/", StringComparison.OrdinalIgnoreCase))
        {
            var parts = imageUrl.Split(',');
            if (parts.Length == 2)
            {
                var mimeStart = imageUrl.IndexOf(':') + 1;
                var mimeEnd = imageUrl.IndexOf(';');
                var dataUrlMimeType = mimeStart > 0 && mimeEnd > mimeStart
                    ? imageUrl[mimeStart..mimeEnd]
                    : "image/jpeg";

                return (parts[1], dataUrlMimeType);
            }

            throw new ArgumentException("Invalid data URL format for image.");
        }

        if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out _))
        {
            throw new ArgumentException("Invalid image URL or format.");
        }

        var client = httpClientFactory.CreateClient("Gemini");
        using var response = await client.GetAsync(imageUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Could not fetch image. Status: {(int)response.StatusCode} ({response.StatusCode}).");
        }

        var imageBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        if (imageBytes.Length > InlineImageMaxBytes)
        {
            throw new InvalidOperationException("Image is larger than 20MB inline limit for Gemini. Use file upload API for larger images.");
        }

        var mimeType = response.Content.Headers.ContentType?.MediaType;
        if (string.IsNullOrWhiteSpace(mimeType))
        {
            mimeType = "image/jpeg";
        }

        return (Convert.ToBase64String(imageBytes), mimeType);
    }

    private static string BuildGeminiErrorDetail(System.Net.HttpStatusCode statusCode, string raw)
    {
        if (statusCode is System.Net.HttpStatusCode.ServiceUnavailable or System.Net.HttpStatusCode.TooManyRequests)
        {
            return "A IA de análise está temporariamente indisponível por alta demanda. Tente novamente em alguns instantes.";
        }

        const int maxLen = 800;
        var body = string.IsNullOrWhiteSpace(raw) ? "(empty response body)" : raw;

        if (body.Length > maxLen)
        {
            body = body[..maxLen] + "...";
        }

        return $"Gemini request failed. Status: {(int)statusCode} ({statusCode}). Body: {body}";
    }

    private static bool IsRetryableStatusCode(System.Net.HttpStatusCode statusCode) =>
        statusCode is System.Net.HttpStatusCode.ServiceUnavailable
            or System.Net.HttpStatusCode.TooManyRequests
            or System.Net.HttpStatusCode.GatewayTimeout
            or System.Net.HttpStatusCode.BadGateway;

    private static int GetRetryBackoffMs(int attempt)
    {
        // Exponential-ish backoff para absorver picos temporários do provider.
        return attempt switch
        {
            1 => 1200,
            2 => 2800,
            _ => 4500,
        };
    }
}
