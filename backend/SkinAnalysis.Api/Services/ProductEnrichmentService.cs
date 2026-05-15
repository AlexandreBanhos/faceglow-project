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
Você é um especialista em dermocosmética e skincare com foco no mercado brasileiro.
Dado o nome e a marca de um produto cosmético, analise com base no seu conhecimento e retorne
SOMENTE um JSON válido com os dados do produto conforme o schema abaixo.

REGRAS OBRIGATÓRIAS:
1. step_type_key DEVE ser UM destes valores exatos:
   cleanser | toner | serum | moisturizer | sunscreen | eye_cream | retinoid | acid | spot_treatment | oil | mask | exfoliant
2. compatible_skin_types DEVE conter apenas: oleosa, seca, mista, sensivel, normal
3. targets_concerns DEVE conter apenas: acne, cravos, manchas, rugas, olheiras, hidratacao, oleosidade, sensibilidade, poros, vermelhidao, firmeza
4. strength_level DEVE ser: mild (leve/suave), moderate (moderado), strong (ativo potente como retinol, ácidos em % alta)
5. suitable_periods: ["morning"] se só manhã, ["night"] se só noite, ["morning","night"] se ambos
6. price_range:
   - low: até R$35
   - medium: R$35-R$100
   - high: R$100-R$250
   - premium: acima de R$250
7. estimated_price_brl: estimativa realista do preço médio no Brasil em reais (farmácias/beleza na web)
8. key_ingredients: 5-8 principais ingredientes ativos em português (ex: Niacinamida, Ácido Hialurônico)
9. inci_list: lista INCI completa se conhecida (ex: "Aqua, Niacinamide, Zinc PCA, ...")
10. description: 3-4 frases em português: o que faz, ativos principais, para qual pele, como usar
11. tagline: frase curta de marketing em português (máx 10 palavras)
12. confidence: 0.0-1.0 indicando certeza. Use 0.9+ para produtos muito conhecidos, 0.6-0.8 para estimativas
13. NUNCA invente dados — use null se não souber

Retorne SOMENTE o JSON abaixo, sem markdown, sem texto adicional:
{
  "tagline": "...",
  "description": "...",
  "step_type_key": "...",
  "compatible_skin_types": ["..."],
  "targets_concerns": ["..."],
  "strength_level": "mild|moderate|strong",
  "suitable_periods": ["morning", "night"],
  "price_range": "low|medium|high|premium",
  "estimated_price_brl": 0.0,
  "key_ingredients": ["..."],
  "inci_list": "Aqua, ...",
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
