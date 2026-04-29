using System.Text.Json.Serialization;

namespace SkinAnalysis.Api.DTOs;

public class OpenAiAnalysisDto
{
    [JsonPropertyName("rosto_valido")]
    public bool? RostoValido { get; set; }

    [JsonPropertyName("imagem_nitida")]
    public bool? ImagemNitida { get; set; }

    [JsonPropertyName("conteudo_permitido")]
    public bool? ConteudoPermitido { get; set; }

    [JsonPropertyName("motivo_bloqueio")]
    public string MotivoBloqueio { get; set; } = string.Empty;

    [JsonPropertyName("tipo_pele")]
    public string TipoPele { get; set; } = string.Empty;

    [JsonPropertyName("condicoes")]
    public AnalysisConditionsDto Condicoes { get; set; } = new();

    [JsonPropertyName("recomendacoes_adicionais")]
    public string RecomendacoesAdicionais { get; set; } = string.Empty;

    // Facial points and top factors
    [JsonPropertyName("pontos_faciais")]
    public AnalysisPointsDto PontosFaciais { get; set; } = new();

    // Backward-compatible fields (legacy format)
    [JsonPropertyName("skin_type")]
    public string SkinType { get; set; } = string.Empty;

    [JsonPropertyName("scores")]
    public AnalysisScoresDto Scores { get; set; } = new();

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("routine")]
    public AnalysisRoutineDto Routine { get; set; } = new();

    [JsonPropertyName("recommendations")]
    public List<OpenAiRecommendationDto> Recommendations { get; set; } = new();
}

public class AnalysisConditionsDto
{
    [JsonPropertyName("acne")]
    public bool Acne { get; set; }

    [JsonPropertyName("olheiras")]
    public bool Olheiras { get; set; }

    [JsonPropertyName("poros")]
    public bool Poros { get; set; }

    [JsonPropertyName("manchas")]
    public bool Manchas { get; set; }

    [JsonPropertyName("labios_ressecados")]
    public bool LabiosRessecados { get; set; }

    [JsonPropertyName("linhas_finas")]
    public bool LinhasFinas { get; set; }

    [JsonPropertyName("vermelhidao")]
    public bool Vermelhidao { get; set; }

    [JsonPropertyName("espinhas_ativas")]
    public bool EspinhasAtivas { get; set; }

    [JsonPropertyName("cravos")]
    public bool Cravos { get; set; }

    [JsonPropertyName("ressecamento")]
    public bool Ressecamento { get; set; }
}

public class AnalysisScoresDto
{
    [JsonPropertyName("acne")]
    public int Acne { get; set; }

    [JsonPropertyName("oiliness")]
    public int Oiliness { get; set; }

    [JsonPropertyName("dark_spots")]
    public int DarkSpots { get; set; }

    [JsonPropertyName("hydration")]
    public int Hydration { get; set; }

    [JsonPropertyName("sensitivity")]
    public int Sensitivity { get; set; }

    [JsonPropertyName("poros")]
    public int Poros { get; set; }

    [JsonPropertyName("olheiras")]
    public int Olheiras { get; set; }

    [JsonPropertyName("linhas_finas")]
    public int LinhasFinas { get; set; }

    [JsonPropertyName("vermelhidao")]
    public int Vermelhidao { get; set; }

    [JsonPropertyName("espinhas_ativas")]
    public int EspinhasAtivas { get; set; }

    [JsonPropertyName("cravos")]
    public int Cravos { get; set; }
}

public class FacialPointDto
{
    [JsonPropertyName("x")]
    public float X { get; set; }

    [JsonPropertyName("y")]
    public float Y { get; set; }

    [JsonPropertyName("factor")]
    public string Factor { get; set; } = string.Empty;

    [JsonPropertyName("severity")]
    public int Severity { get; set; }
}

public class AnalysisPointsDto
{
    [JsonPropertyName("top_3_factors")]
    public List<string> Top3Factors { get; set; } = new();

    [JsonPropertyName("detected_points")]
    public List<FacialPointDto> DetectedPoints { get; set; } = new();

    [JsonPropertyName("image_width")]
    public int ImageWidth { get; set; } = 100;

    [JsonPropertyName("image_height")]
    public int ImageHeight { get; set; } = 140;
}

public class AnalysisRoutineDto
{
    [JsonPropertyName("morning")]
    public List<string> Morning { get; set; } = new();

    [JsonPropertyName("night")]
    public List<string> Night { get; set; } = new();
}

public class OpenAiRecommendationDto
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("product")]
    public string Product { get; set; } = string.Empty;

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }
}
