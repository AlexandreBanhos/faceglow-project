using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SkinAnalysis.Api.Options;

namespace SkinAnalysis.Api.Services;

public record ProductEnrichmentResult(
    string? Tagline,
    string? Description,
    string? StepTypeKey,
    string[] CompatibleSkinTypes,
    string[] TargetsConcerns,
    string? StrengthLevel,
    string[] SuitablePeriods,
    string? PriceRange,
    decimal? EstimatedPriceBRL,
    string[] KeyIngredients,
    string? InciList,
    double Confidence
);

public record EnrichmentRequest(string Name, string Brand);

public class ProductEnrichmentService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GeminiOptions _options;
    private readonly ILogger<ProductEnrichmentService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    // Step type keys válidos no sistema
    private static readonly string[] ValidStepTypes = [
        "cleanser", "toner", "serum", "moisturizer", "sunscreen",
        "eye_cream", "retinoid", "acid", "spot_treatment", "oil",
        "mask", "exfoliant"
    ];

    private const string EnrichmentPrompt = """
Você é um especialista em skincare brasileiro. Dado o nome e a marca de um produto cosmético,
retorne SOMENTE um JSON válido com os dados do produto conforme o schema abaixo.

REGRAS OBRIGATÓRIAS:
1. step_type_key DEVE ser um destes valores exatos: cleanser, toner, serum, moisturizer, sunscreen, eye_cream, retinoid, acid, spot_treatment, oil, mask, exfoliant
2. compatible_skin_types DEVE conter apenas: oleosa, seca, mista, sensivel, normal
3. targets_concerns DEVE conter apenas: acne, cravos, manchas, rugas, olheiras, hidratacao, oleosidade, sensibilidade, poros, vermelhidao, firmeza
4. strength_level DEVE ser: mild, moderate, strong
5. suitable_periods DEVE ser: morning, night, ou ambos
6. price_range DEVE ser: low (até R$30), medium (R$30-80), high (R$80-200), premium (acima R$200)
7. Se não souber um dado, use null, nunca invente
8. ingredients_inci: lista dos principais ingredientes INCI em ordem (máx 10 principais)
9. confidence: seu nível de certeza sobre os dados (0.0 a 1.0)

Retorne SOMENTE este JSON, sem texto adicional:
{
  "tagline": "frase curta de marketing do produto em português",
  "description": "descrição completa em 2-4 frases: para que serve, ingredientes ativos, como usar, pra qual tipo de pele",
  "step_type_key": "tipo_do_step",
  "compatible_skin_types": ["tipo1", "tipo2"],
  "targets_concerns": ["preocupacao1", "preocupacao2"],
  "strength_level": "mild|moderate|strong",
  "suitable_periods": ["morning", "night"],
  "price_range": "low|medium|high|premium",
  "estimated_price_brl": 0.0,
  "key_ingredients": ["ingrediente1", "ingrediente2"],
  "inci_list": "Aqua, Niacinamide, ...",
  "confidence": 0.0
}
""";

    public ProductEnrichmentService(
        IHttpClientFactory httpClientFactory,
        IOptions<GeminiOptions> options,
        ILogger<ProductEnrichmentService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ProductEnrichmentResult?> EnrichAsync(string productName, string brand, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogError("[Enrich] Gemini API key not configured");
            throw new InvalidOperationException("Gemini API key não configurada.");
        }

        var prompt = $"{EnrichmentPrompt}\n\nProduto: {productName}\nMarca: {brand}";

        var payload = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } }
            },
            generationConfig = new
            {
                temperature = 0.1,
                maxOutputTokens = 2048,
                responseMimeType = "application/json"
            }
        };

        var client = _httpClientFactory.CreateClient("Gemini");
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}";

        using var message = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(20));

        try
        {
            using var response = await client.SendAsync(message, cts.Token);
            var raw = await response.Content.ReadAsStringAsync(cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[Enrich] Gemini error {Status}: {Body}", response.StatusCode, raw);
                throw new InvalidOperationException($"Gemini retornou {response.StatusCode}");
            }

            var geminiResponse = JsonSerializer.Deserialize<JsonElement>(raw, JsonOptions);
            var text = geminiResponse
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Parse Gemini JSON response
            var data = JsonSerializer.Deserialize<JsonElement>(text, JsonOptions);

            var stepTypeKey = GetString(data, "step_type_key");
            // Valida step_type_key
            if (!ValidStepTypes.Contains(stepTypeKey ?? ""))
                stepTypeKey = null;

            return new ProductEnrichmentResult(
                Tagline: GetString(data, "tagline"),
                Description: GetString(data, "description"),
                StepTypeKey: stepTypeKey,
                CompatibleSkinTypes: GetStringArray(data, "compatible_skin_types"),
                TargetsConcerns: GetStringArray(data, "targets_concerns"),
                StrengthLevel: GetString(data, "strength_level"),
                SuitablePeriods: GetStringArray(data, "suitable_periods") is { Length: > 0 } p ? p : ["morning", "night"],
                PriceRange: GetString(data, "price_range"),
                EstimatedPriceBRL: GetDecimal(data, "estimated_price_brl"),
                KeyIngredients: GetStringArray(data, "key_ingredients"),
                InciList: GetString(data, "inci_list"),
                Confidence: GetDouble(data, "confidence")
            );
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("[Enrich] Timeout ao enriquecer produto '{Name}' ({Brand})", productName, brand);
            throw new TimeoutException("Gemini demorou mais de 20s. Tente novamente.");
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "[Enrich] Falha ao parsear resposta Gemini para '{Name}'", productName);
            return null;
        }
    }

    private static string? GetString(JsonElement el, string key) =>
        el.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static string[] GetStringArray(JsonElement el, string key)
    {
        if (!el.TryGetProperty(key, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return [];
        return arr.EnumerateArray()
            .Where(e => e.ValueKind == JsonValueKind.String)
            .Select(e => e.GetString()!)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToArray();
    }

    private static decimal? GetDecimal(JsonElement el, string key) =>
        el.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.Number
            ? (decimal?)v.GetDecimal() : null;

    private static double GetDouble(JsonElement el, string key) =>
        el.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetDouble() : 0.0;
}
