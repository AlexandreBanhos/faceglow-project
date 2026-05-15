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
    string? ImageUrlSuggestion,
    double Confidence
);

public record EnrichmentRequest(string Name, string Brand);

public class ProductEnrichmentService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GeminiOptions _options;
    private readonly ILogger<ProductEnrichmentService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    // Valores válidos do banco — todas as comparações são feitas após lowercase + trim
    private static readonly HashSet<string> ValidStepTypes = [
        "cleanser", "toner", "serum", "moisturizer", "sunscreen",
        "eye_cream", "retinoid", "acid", "spot_treatment", "oil",
        "mask", "exfoliant"
    ];
    private static readonly HashSet<string> ValidSkinTypes = [
        "oleosa", "seca", "mista", "sensivel", "normal"
    ];
    private static readonly HashSet<string> ValidConcerns = [
        "acne", "cravos", "manchas", "rugas", "olheiras",
        "hidratacao", "oleosidade", "sensibilidade", "poros",
        "vermelhidao", "firmeza"
    ];
    private static readonly HashSet<string> ValidStrengthLevels = ["mild", "moderate", "strong"];
    private static readonly HashSet<string> ValidPriceRanges   = ["low", "medium", "high", "premium"];
    private static readonly HashSet<string> ValidPeriods        = ["morning", "night"];

    private const string EnrichmentPrompt = """
Você é um especialista em dermocosmética e skincare com foco no mercado brasileiro.
Dado o nome e a marca de um produto cosmético, analise com base no seu conhecimento e retorne
SOMENTE um JSON válido com os dados do produto conforme o schema abaixo.

REGRAS CRÍTICAS — OS VALORES DEVEM SER EXATAMENTE ASSIM (sem tradução, sem maiúsculas):

1. step_type_key — exatamente um destes (lowercase, sem espaço):
   cleanser | toner | serum | moisturizer | sunscreen | eye_cream | retinoid | acid | spot_treatment | oil | mask | exfoliant

2. compatible_skin_types — array com apenas estes valores (lowercase):
   "oleosa" | "seca" | "mista" | "sensivel" | "normal"
   PROIBIDO: "Oleosa", "oily", "dry", "combination" — somente os valores acima

3. targets_concerns — array com apenas estes valores (lowercase, sem acentos):
   "acne" | "cravos" | "manchas" | "rugas" | "olheiras" | "hidratacao" | "oleosidade" | "sensibilidade" | "poros" | "vermelhidao" | "firmeza"
   PROIBIDO: qualquer outro valor, qualquer maiúscula, qualquer acento

4. strength_level — exatamente: "mild" ou "moderate" ou "strong" (lowercase)
   mild = leve/suave, moderate = moderado, strong = potente (retinol, ácidos >5%)

5. suitable_periods — array: ["morning"] | ["night"] | ["morning","night"]
   PROIBIDO: "manhã", "noite", "both", "day"

6. price_range — exatamente: "low" | "medium" | "high" | "premium" (lowercase)
   low=até R$35, medium=R$35-100, high=R$100-250, premium=acima R$250

7. estimated_price_brl — número decimal (preço real em farmácias/lojas BR)

8. key_ingredients — 5-8 ingredientes ativos em PORTUGUÊS (Niacinamida, Ácido Hialurônico, etc)

9. inci_list — lista INCI completa em inglês técnico se conhecida ("Aqua, Niacinamide, ...")

10. image_url_suggestion — URL direta da imagem do produto no site oficial da marca SE você conhece
    com certeza. Exemplos de padrões confiáveis:
    - La Roche-Posay: https://www.laroche-posay.com.br/...
    - CeraVe: https://www.cerave.com.br/...
    - Neutrogena: https://www.neutrogena.com.br/...
    Use null se não tiver certeza absoluta — melhor null do que URL errada

11. description — 3-4 frases em PORTUGUÊS: função principal, ativos, tipo de pele alvo, como usar

12. tagline — frase marketing em PORTUGUÊS (máx 10 palavras)

13. confidence — 0.0 a 1.0 (0.9+ para produtos muito conhecidos como La Roche-Posay Effaclar)

NUNCA invente — use null para campos desconhecidos.

Retorne SOMENTE o JSON abaixo, sem markdown, sem texto adicional:
{
  "tagline": "...",
  "description": "...",
  "step_type_key": "moisturizer",
  "compatible_skin_types": ["oleosa", "mista"],
  "targets_concerns": ["acne", "oleosidade"],
  "strength_level": "mild",
  "suitable_periods": ["morning", "night"],
  "price_range": "medium",
  "estimated_price_brl": 79.90,
  "key_ingredients": ["Niacinamida", "Zinco PCA"],
  "inci_list": "Aqua, Niacinamide, Zinc PCA, ...",
  "image_url_suggestion": null,
  "confidence": 0.9
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

    private static readonly int[] RetryDelaysMs = [0, 600, 1200];

    public async Task<ProductEnrichmentResult?> EnrichAsync(string productName, string brand, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogError("[Enrich] Gemini API key not configured");
            throw new InvalidOperationException("Gemini API key não configurada.");
        }

        var payloadJson = JsonSerializer.Serialize(new
        {
            contents = new[] { new { parts = new[] { new { text = $"{EnrichmentPrompt}\n\nProduto: {productName}\nMarca: {brand}" } } } },
            generationConfig = new { temperature = 0.1, maxOutputTokens = 2048, responseMimeType = "application/json" }
        });

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}";

        for (int attempt = 1; attempt <= RetryDelaysMs.Length; attempt++)
        {
            if (attempt > 1)
            {
                _logger.LogInformation("[Enrich] Retry {Attempt}/{Max} para '{Name}' ({Brand})", attempt, RetryDelaysMs.Length, productName, brand);
                await Task.Delay(RetryDelaysMs[attempt - 1], cancellationToken);
            }

            try
            {
                var result = await AttemptEnrichAsync(url, payloadJson, productName, brand, cancellationToken);
                if (result is not null) return result;
                // null = resposta vazia ou JSON inválido → retry
            }
            catch (TimeoutException) when (attempt < RetryDelaysMs.Length)
            {
                _logger.LogWarning("[Enrich] Timeout na tentativa {Attempt}, retentando...", attempt);
            }
            // InvalidOperationException (HTTP error, API key) propaga imediatamente
        }

        _logger.LogError("[Enrich] Todas as tentativas falharam para '{Name}' ({Brand})", productName, brand);
        return null;
    }

    private async Task<ProductEnrichmentResult?> AttemptEnrichAsync(string url, string payloadJson, string productName, string brand, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("Gemini");

        using var message = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(payloadJson, Encoding.UTF8, "application/json")
        };

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(25));

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
            {
                _logger.LogWarning("[Enrich] Gemini retornou texto vazio para '{Name}' ({Brand})", productName, brand);
                return null;
            }

            // Remove markdown code fences se Gemini as incluir (```json ... ```)
            var jsonText = text.Trim();
            if (jsonText.StartsWith("```"))
            {
                var firstNewline = jsonText.IndexOf('\n');
                var lastFence = jsonText.LastIndexOf("```");
                if (firstNewline > 0 && lastFence > firstNewline)
                    jsonText = jsonText[(firstNewline + 1)..lastFence].Trim();
                else
                    jsonText = jsonText.TrimStart('`').Trim();
            }

            _logger.LogDebug("[Enrich] JSON recebido ({Length} chars): {Preview}",
                jsonText.Length, jsonText[..Math.Min(200, jsonText.Length)]);

            var data = JsonSerializer.Deserialize<JsonElement>(jsonText, JsonOptions);

            var stepTypeKey   = Normalize(GetString(data, "step_type_key"), ValidStepTypes);
            var strengthLevel = Normalize(GetString(data, "strength_level"), ValidStrengthLevels);
            var priceRange    = Normalize(GetString(data, "price_range"), ValidPriceRanges);

            var skinTypes = NormalizeArray(data, "compatible_skin_types", ValidSkinTypes);
            var concerns  = NormalizeArray(data, "targets_concerns", ValidConcerns);
            var periods   = NormalizeArray(data, "suitable_periods", ValidPeriods);

            var imageUrl = GetString(data, "image_url_suggestion");
            if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out _)) imageUrl = null;

            return new ProductEnrichmentResult(
                Tagline: GetString(data, "tagline"),
                Description: GetString(data, "description"),
                StepTypeKey: stepTypeKey,
                CompatibleSkinTypes: skinTypes,
                TargetsConcerns: concerns,
                StrengthLevel: strengthLevel,
                SuitablePeriods: periods.Length > 0 ? periods : ["morning", "night"],
                PriceRange: priceRange,
                EstimatedPriceBRL: GetDecimal(data, "estimated_price_brl"),
                KeyIngredients: GetStringArray(data, "key_ingredients"),
                InciList: GetString(data, "inci_list"),
                ImageUrlSuggestion: imageUrl,
                Confidence: GetDouble(data, "confidence")
            );
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("[Enrich] Timeout na tentativa para '{Name}' ({Brand})", productName, brand);
            throw new TimeoutException("Gemini demorou mais de 25s.");
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "[Enrich] JSON inválido do Gemini para '{Name}' ({Brand})", productName, brand);
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

    /// <summary>
    /// Normaliza um valor escalar: lowercase + trim, depois valida contra o conjunto de valores permitidos.
    /// Retorna null se inválido ou não reconhecido.
    /// </summary>
    private static string? Normalize(string? raw, HashSet<string> allowed)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var normalized = raw.Trim().ToLowerInvariant()
            // remove acentos comuns que Gemini pode introduzir
            .Replace("ç", "c").Replace("ã", "a").Replace("ão", "ao")
            .Replace("é", "e").Replace("ê", "e").Replace("á", "a")
            .Replace("í", "i").Replace("ó", "o").Replace("ú", "u");
        return allowed.Contains(normalized) ? normalized : null;
    }

    /// <summary>
    /// Normaliza e filtra um array de strings contra os valores permitidos.
    /// Elimina duplicatas e valores não reconhecidos.
    /// </summary>
    private static string[] NormalizeArray(JsonElement el, string key, HashSet<string> allowed)
    {
        var raw = GetStringArray(el, key);
        return raw
            .Select(s => Normalize(s, allowed))
            .Where(s => s is not null)
            .Distinct()
            .ToArray()!;
    }
}
