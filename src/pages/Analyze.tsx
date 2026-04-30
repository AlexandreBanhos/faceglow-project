import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRoutes, apiBaseUrl } from "@/lib/api";
import { getAccessToken, getSessionUser } from "@/lib/auth";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { normalizeAnalysis, type AnalysisResponse } from "@/lib/analysis";
import { uploadAnalysisImage } from "@/lib/storage";
import { invalidateAnalysisCache } from "@/lib/analysisClient";
import { useIsPremium } from "@/hooks/useIsPremium";
import { useUserContext } from "@/hooks/useUserContext";
import { useUserStatus } from "@/hooks/useUserStatus";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import ScanningView from "@/components/analyze/ScanningView";
import SelfieGuidelines from "@/components/analyze/SelfieGuidelines";
import LoadingAnalysisView from "@/components/analyze/LoadingAnalysisView";
import { AuroraBackdrop } from "@/components/shared";

const MAX_IMAGE_BYTES = 1600 * 1024;
const MAX_IMAGE_DIMENSION = 1280;
// POST /analysis returns quickly (202), but in unstable DB/network scenarios we allow more headroom.
const ANALYSIS_SUBMIT_TIMEOUT_MS = 45_000;
const PENDING_ANALYZE_IMAGE_KEY = "faceglow-pending-analyze-image";
const PENDING_ANALYZE_FACE_KEY = "faceglow-pending-analyze-face-validation";
const PENDING_ANALYZE_AT_KEY = "faceglow-pending-analyze-at";
const PENDING_ANALYZE_TTL_MS = 30 * 60 * 1000;

const estimateDataUrlBytes = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve((ev.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("Falha ao ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Formato de imagem inválido."));
    img.src = src;
  });

const canvasToJpegDataUrl = (canvas: HTMLCanvasElement, quality: number) =>
  canvas.toDataURL("image/jpeg", quality);

const optimizeImageDataUrl = async (originalDataUrl: string): Promise<string> => {
  if (estimateDataUrlBytes(originalDataUrl) <= MAX_IMAGE_BYTES) {
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  const initialScale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível processar a imagem no navegador.");
  }

  let scale = initialScale;
  let best = "";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (let quality = 0.9; quality >= 0.55; quality -= 0.1) {
      const candidate = canvasToJpegDataUrl(canvas, quality);
      best = candidate;
      if (estimateDataUrlBytes(candidate) <= MAX_IMAGE_BYTES) {
        return candidate;
      }
    }

    scale *= 0.85;
  }

  if (best) {
    return best;
  }

  throw new Error("Não foi possível preparar a imagem para análise.");
};

const optimizeImageForUpload = async (file: File): Promise<string> => {
  const originalDataUrl = await readFileAsDataUrl(file);
  return optimizeImageDataUrl(originalDataUrl);
};

type AnalyzePhase = "scanner" | "preview" | "loading";
type FaceValidationState = "unknown" | "checking" | "valid" | "invalid" | "unsupported";

const validateFaceInImage = async (dataUrl: string): Promise<FaceValidationState> => {
  const FaceDetectorCtor = (window as Window & { FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect(image: ImageBitmapSource): Promise<Array<unknown>> } }).FaceDetector;

  if (!FaceDetectorCtor) {
    return "unsupported";
  }

  const image = await loadImage(dataUrl);
  const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 2 });
  const faces = await detector.detect(image);

  return faces.length >= 1 ? "valid" : "invalid";
};

const Analyze = () => {
  const navigate = useNavigate();
  const { creditsRemaining, canAnalyze } = useIsPremium();
  const { setUserStatus } = useUserContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useUserStatus(isAuthenticated);
  const [phase, setPhase] = useState<AnalyzePhase>("scanner");
  const [image, setImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [loadingFinished, setLoadingFinished] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [faceValidation, setFaceValidation] = useState<FaceValidationState>("unknown");
  const [pendingAnalysisId, setPendingAnalysisId] = useState<string | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const user = await getSessionUser();
      if (!mounted) return;
      setIsAuthenticated(Boolean(user));
    };

    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (image) return;

    const savedAtRaw = localStorage.getItem(PENDING_ANALYZE_AT_KEY);
    const savedAt = savedAtRaw ? Number(savedAtRaw) : 0;

    if (!savedAt || Number.isNaN(savedAt) || Date.now() - savedAt > PENDING_ANALYZE_TTL_MS) {
      localStorage.removeItem(PENDING_ANALYZE_IMAGE_KEY);
      localStorage.removeItem(PENDING_ANALYZE_FACE_KEY);
      localStorage.removeItem(PENDING_ANALYZE_AT_KEY);
      return;
    }

    const savedImage = localStorage.getItem(PENDING_ANALYZE_IMAGE_KEY);
    const savedFace = localStorage.getItem(PENDING_ANALYZE_FACE_KEY) as FaceValidationState | null;

    if (!savedImage) return;

    setImage(savedImage);
    setFaceValidation(savedFace ?? "unknown");
    setPhase("preview");
    setShowGuidelines(false);
  }, [image]);

  useEffect(() => {
    if (phase === "loading" && loadingFinished && analysisResult) {
      navigate("/results", { state: { analysis: analysisResult } });
    }
  }, [analysisResult, loadingFinished, navigate, phase]);



  const handleGalleryFile = async (file: File) => {
    try {
      setAnalysisError(null);
      const optimized = await optimizeImageForUpload(file);
      setImage(optimized);
      localStorage.setItem(PENDING_ANALYZE_IMAGE_KEY, optimized);
      localStorage.setItem(PENDING_ANALYZE_AT_KEY, String(Date.now()));
      setFaceValidation("checking");
      const validation = await validateFaceInImage(optimized);
      setFaceValidation(validation);
      localStorage.setItem(PENDING_ANALYZE_FACE_KEY, validation);
      if (validation === "invalid") {
        setAnalysisError("Nenhum rosto foi detectado na imagem. Capture novamente com o rosto centralizado.");
      }
      setPhase("preview");
    } catch {
      setImage(null);
      setFaceValidation("unknown");
      setAnalysisError("Nao foi possivel preparar essa foto. Tente outra imagem ou reduza a resolucao.");
    }
  };

  const handleCapture = async (dataUrl: string) => {
    try {
      setAnalysisError(null);
      const optimized = await optimizeImageDataUrl(dataUrl);
      setImage(optimized);
      localStorage.setItem(PENDING_ANALYZE_IMAGE_KEY, optimized);
      localStorage.setItem(PENDING_ANALYZE_AT_KEY, String(Date.now()));
      setFaceValidation("checking");
      const validation = await validateFaceInImage(optimized);
      setFaceValidation(validation);
      localStorage.setItem(PENDING_ANALYZE_FACE_KEY, validation);
      if (validation === "invalid") {
        setAnalysisError("Nenhum rosto foi detectado na imagem. Capture novamente com o rosto centralizado.");
      }
      setPhase("preview");
    } catch {
      setImage(null);
      setFaceValidation("unknown");
      setAnalysisError("Nao foi possivel preparar essa foto. Tente outra imagem ou reduza a resolucao.");
    }
  };

  const handleAnalysisResult = (result: AnalysisResponse) => {
    setAnalysisResult(result);
    invalidateAnalysisCache();
    localStorage.removeItem(PENDING_ANALYZE_IMAGE_KEY);
    localStorage.removeItem(PENDING_ANALYZE_FACE_KEY);
    localStorage.removeItem(PENDING_ANALYZE_AT_KEY);
    // Decremento otimista: reflete o débito que o backend já fez
    setUserStatus((prev) => ({ ...prev, creditsRemaining: Math.max(0, prev.creditsRemaining - 1) }));
    try {
      localStorage.setItem("faceglow-last-analysis", JSON.stringify(result));
    } catch {
      // Ignore storage quota issues.
    }
  };

  const handleAnalysisError = (message: string) => {
    setAnalysisError(message);
    setPhase("preview");
  };

  const startAnalysis = async () => {
    if (!image) {
      return;
    }

    // Se não está autenticado, redirecionar para cadastro com redirect back para /analyze
    const user = await getSessionUser();
    const token = await getAccessToken();
    if (!user || !token) {
      if (image) {
        localStorage.setItem(PENDING_ANALYZE_IMAGE_KEY, image);
        localStorage.setItem(PENDING_ANALYZE_FACE_KEY, faceValidation);
        localStorage.setItem(PENDING_ANALYZE_AT_KEY, String(Date.now()));
      }
      navigate("/auth", { state: { redirectTo: "/analyze" } });
      return;
    }

    setIsAuthenticated(true);

    if (isAuthenticated && !canAnalyze) {
      setAnalysisError("Você não tem créditos de análise disponíveis. Adquira mais créditos para continuar.");
      return;
    }

    setAnalysisError(null);
    setPhase("loading");
    setLoadingFinished(false);
    setAnalysisResult(null);
    setPendingAnalysisId(null);

    try {
      const uploadedImage = await uploadAnalysisImage(image, user.id);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort("analysis-request-timeout"), ANALYSIS_SUBMIT_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(`${apiBaseUrl}${apiRoutes.analysis}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageUrl: uploadedImage.imageUrl,
            analyzerImageUrl: uploadedImage.analyzerImageUrl,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        const abortedByTimeout = controller.signal.aborted && controller.signal.reason === "analysis-request-timeout";
        if (abortedByTimeout) {
          throw new Error("O servidor demorou para responder. Verifique sua conexão e tente novamente em alguns segundos.");
        }
        throw error;
      } finally {
        window.clearTimeout(timeout);
      }

      if (!response.ok) {
        let errorDetail = `Falha ao iniciar análise (HTTP ${response.status}).`;
        try {
          const problem = (await response.json()) as { detail?: string; error?: string };
          errorDetail = problem.detail || problem.error || errorDetail;
        } catch { /* keep fallback */ }
        const httpError = new Error(errorDetail) as Error & { status?: number };
        httpError.status = response.status;
        throw httpError;
      }

      if (response.status === 202) {
        // Async path: backend accepted the job, LoadingAnalysisView will poll for completion
        const job = (await response.json()) as { id: string; status: string };
        setPendingAnalysisId(job.id);
        return;
      }

      // Synchronous fallback (201/200) — handle old-style response gracefully
      const result = normalizeAnalysis((await response.json()) as unknown);
      if (result) {
        handleAnalysisResult(result);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro inesperado ao analisar imagem.";
      const maybeStatus = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;
      const status = Number.isFinite(maybeStatus) ? maybeStatus : undefined;

      // 503 = banco lento → mensagem específica com sugestão de retry
      const message = status === 503
        ? "O servidor está temporariamente sobrecarregado. Aguarde alguns segundos e tente novamente."
        : getFriendlyErrorMessage(error, { detail, status });

      setAnalysisError(message);
      setPhase("preview");
    }
  };

  if (showGuidelines) {
    return (
      <SelfieGuidelines
        onStartCamera={() => setShowGuidelines(false)}
        onBack={() => navigate(isAuthenticated ? "/dashboard" : "/")}
      />
    );
  }

  if (phase === "scanner") {
    return (
      <ScanningView
        onBack={() => setShowGuidelines(true)}
        onCapture={handleCapture}
        onGalleryFile={handleGalleryFile}
      />
    );
  }

  if (phase === "loading" && image) {
    return (
      <LoadingAnalysisView
        imageUrl={image}
        analysisId={pendingAnalysisId ?? ""}
        isDone={Boolean(analysisResult)}
        onComplete={() => setLoadingFinished(true)}
        onResult={handleAnalysisResult}
        onError={handleAnalysisError}
      />
    );
  }

  return (
    <div className="relative w-full min-h-screen pb-8 overflow-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />
      <div className="relative z-10 mx-auto flex h-screen w-full max-w-md flex-col px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => setPhase("scanner")} className="text-sm font-semibold text-[var(--fg-ink-2)]">
            Nova captura
          </button>
          <p className="text-base font-bold text-[var(--fg-ink)]">Pré-visualização</p>
          <button onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")} className="text-sm font-semibold text-[var(--fg-ink-2)]">
            Fechar
          </button>
        </div>

        <div className="relative mb-6 overflow-hidden rounded-[2rem] lg-surface-strong shadow-glow" style={{ height: "52vh" }}>
          <img src={image ?? ""} alt="Imagem capturada" className="h-full w-full object-cover" />
        </div>

        {analysisError && (
          <div className="mb-4 rounded-2xl lg-surface px-4 py-4 flex gap-3 border border-coral/20">
            <AlertCircle size={18} className="text-coral flex-shrink-0 mt-0.5" />
            <p className="text-sm text-coral font-medium leading-relaxed">{analysisError}</p>
          </div>
        )}

        <div className="mt-auto space-y-3 pb-4">
          {faceValidation !== "invalid" && (
            <button
              onClick={startAnalysis}
              disabled={faceValidation === "checking" || (isAuthenticated && !canAnalyze)}
              className="coral-button w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Sparkles size={18} />
              {faceValidation === "checking" ? "Validando rosto..." : "Iniciar análise"}
            </button>
          )}
          {isAuthenticated && !canAnalyze && (
            <div className="rounded-2xl lg-surface px-4 py-3 text-sm text-coral font-medium text-center border border-coral/20">
              Sem créditos disponíveis.{" "}
              <button className="underline font-bold" onClick={() => navigate("/billing")}>Adquirir créditos</button>
            </div>
          )}
          {faceValidation === "invalid" && (
            <div className="rounded-2xl lg-surface px-4 py-3 text-sm text-coral font-medium border border-coral/20">
              Sem rosto válido na foto. Use "Capturar novamente" para tirar outra imagem.
            </div>
          )}
          <button
            onClick={() => {
              setImage(null);
              localStorage.removeItem(PENDING_ANALYZE_IMAGE_KEY);
              localStorage.removeItem(PENDING_ANALYZE_FACE_KEY);
              localStorage.removeItem(PENDING_ANALYZE_AT_KEY);
              setPhase("scanner");
            }}
            className="liquiglass-button w-full py-4 rounded-2xl text-foreground font-semibold text-base"
          >
            Capturar novamente
          </button>
          <div className="flex items-center gap-2 rounded-2xl lg-surface px-4 py-3 text-sm text-[var(--fg-ink-3)]">
            <CheckCircle2 size={16} className="shrink-0 text-coral flex-shrink-0" />
            <span>
              A análise usa enquadramento facial, textura e sinais de pele para gerar seu plano.
              {creditsRemaining > 0 && <> · <strong>{creditsRemaining} crédito{creditsRemaining !== 1 ? "s" : ""}</strong> disponíve{creditsRemaining !== 1 ? "is" : "l"}</>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analyze;
