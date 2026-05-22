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
import { AlertCircle, CheckCircle2, Sparkles, RotateCcw, Loader2 } from "lucide-react";
import ScanningView from "@/components/analyze/ScanningView";
import LoadingAnalysisView from "@/components/analyze/LoadingAnalysisView";
import { AnalysisInfoPage } from "@/components/analyze/AnalysisInfoPage";
import { ScanInstructionsPage } from "@/components/analyze/ScanInstructionsPage";
import { AnalysisTermsModal } from "@/components/analyze/AnalysisTermsModal";
import { type LifestyleAnswers } from "@/components/analyze/LifestyleQuestionnaire";
import SkinQuiz from "@/components/quiz/SkinQuiz";
import { PRE_ANALYSIS_QUESTIONS, ROUTINE_QUESTIONS, quizToLifestyle } from "@/components/quiz/quizQuestions";
import { updateLifestyle } from "@/lib/lifestyle";

const MAX_IMAGE_BYTES = 1600 * 1024;
const MAX_IMAGE_DIMENSION = 1280;
// POST /analysis returns quickly (202), but in unstable DB/network scenarios we allow more headroom.
const ANALYSIS_SUBMIT_TIMEOUT_MS = 45_000;
const PENDING_ANALYZE_IMAGE_KEY = "faceglow-pending-analyze-image";
const PENDING_ANALYZE_FACE_KEY = "faceglow-pending-analyze-face-validation";
const PENDING_ANALYZE_AT_KEY = "faceglow-pending-analyze-at";
const PENDING_ANALYZE_TTL_MS = 30 * 60 * 1000;

const QUIZ_COMPLETED_KEY = "faceglow-quiz-completed";
const QUIZ_ANSWERS_KEY   = "faceglow-quiz-answers";

function advanceToLifestyleOrInstructions(
  setPhase: (p: AnalyzePhase) => void,
  setLifestyleAnswers: (a: LifestyleAnswers) => void,
) {
  const done = localStorage.getItem(QUIZ_COMPLETED_KEY);
  if (done) {
    try {
      const saved = JSON.parse(localStorage.getItem(QUIZ_ANSWERS_KEY) ?? "null") as LifestyleAnswers | null;
      if (saved) setLifestyleAnswers(saved);
    } catch { /* usa perfil salvo no backend */ }
    setPhase("instructions"); // retornando: pula quiz direto para câmera
  } else {
    setPhase("lifestyle_pre"); // primeira vez: começa pelo quiz pré-análise
  }
}

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

type AnalyzePhase = "info" | "lifestyle_pre" | "instructions" | "scanner" | "preview" | "loading";
const TERMS_ACCEPTED_KEY = "faceglow-analysis-terms-accepted";
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
  const [phase, setPhase] = useState<AnalyzePhase>("info");
  const [isStarting, setIsStarting] = useState(false);
  const [preAnswers, setPreAnswers] = useState<LifestyleAnswers | null>(null);
  const [routineAnswers, setRoutineAnswers] = useState<LifestyleAnswers | null>(null);
  // Se já fez o quiz completo antes, não mostra o quiz de rotina durante o loading
  const [routineQuizDone, setRoutineQuizDone] = useState(
    () => !!localStorage.getItem(QUIZ_COMPLETED_KEY)
  );
  // Mantido para compatibilidade com startAnalysis
  const [lifestyleAnswers, setLifestyleAnswers] = useState<LifestyleAnswers | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [loadingFinished, setLoadingFinished] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [faceValidation, setFaceValidation] = useState<FaceValidationState>("unknown");
  const [pendingAnalysisId, setPendingAnalysisId] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const termsAccepted = () => !!localStorage.getItem(TERMS_ACCEPTED_KEY);

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
  }, [image]);

  useEffect(() => {
    if (phase === "loading" && loadingFinished && analysisResult && routineQuizDone) {
      // Salva respostas de rotina em background (não bloqueia navegação)
      if (routineAnswers) {
        updateLifestyle({
          usesMakeup: routineAnswers.makeupUsage === "daily" || routineAnswers.makeupUsage === "sometimes",
          budgetRange: routineAnswers.budgetRange || null,
          pregnancySafe: false,
          lifestyleData: { ...preAnswers, ...routineAnswers } as LifestyleAnswers,
        }).catch(() => {});
      }
      navigate("/results", { state: { analysis: analysisResult } });
    }
  }, [analysisResult, loadingFinished, navigate, phase, routineQuizDone, routineAnswers, preAnswers]);



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
    setIsStarting(false);
  };

  const startAnalysis = async () => {
    if (!image || isStarting) {
      return;
    }
    setIsStarting(true);

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
            // Apenas dados pré-análise (ajudam a IA a interpretar a foto)
            usesMakeup: false,
            budgetRange: null,
            pregnancySafe: false,
            lifestyleData: preAnswers ?? null,
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

      // 402 = sem créditos → redireciona para premium
      if (status === 402) {
        navigate("/premium");
        return;
      }

      // 429 = muitas requisições → mensagem específica
      const message = status === 429
        ? "Muitas análises em pouco tempo. Aguarde alguns minutos e tente novamente."
        : status === 503
        ? "O servidor está temporariamente sobrecarregado. Aguarde alguns segundos e tente novamente."
        : getFriendlyErrorMessage(error, { detail, status });

      setAnalysisError(message);
      setPhase("preview");
    } finally {
      setIsStarting(false);
    }
  };

  // ── 1. Página informativa ─────────────────────────────────────────────────
  if (phase === "info") {
    const handleStart = () => {
      // Usuário autenticado sem créditos → bloqueia antes do fluxo
      if (isAuthenticated && !canAnalyze) {
        navigate("/premium");
        return;
      }
      if (!termsAccepted()) { setShowTerms(true); return; }
      advanceToLifestyleOrInstructions(setPhase, setLifestyleAnswers);
    };

    return (
      <>
        <AnalysisInfoPage
          onStart={handleStart}
          onClose={() => navigate(isAuthenticated ? "/dashboard" : "/")}
          noCredits={isAuthenticated && !canAnalyze}
          creditsRemaining={creditsRemaining}
          onGetCredits={() => navigate("/premium")}
        />
        <AnalysisTermsModal
          open={showTerms}
          onAccept={() => {
            localStorage.setItem(TERMS_ACCEPTED_KEY, "1");
            setShowTerms(false);
            advanceToLifestyleOrInstructions(setPhase, setLifestyleAnswers);
          }}
          onDecline={() => setShowTerms(false)}
        />
      </>
    );
  }

  // ── 2. Quiz pré-análise — contexto para a IA (faixa etária + preocupações) ──
  if (phase === "lifestyle_pre") {
    return (
      <SkinQuiz
        questions={PRE_ANALYSIS_QUESTIONS}
        onComplete={(raw) => {
          const answers = quizToLifestyle(raw);
          setPreAnswers(answers);
          setLifestyleAnswers(answers); // compatibilidade
          setPhase("instructions");
        }}
        onBack={() => setPhase("info")}
      />
    );
  }

  // ── 3. Instruções de câmera ────────────────────────────────────────────────
  if (phase === "instructions") {
    return (
      <ScanInstructionsPage
        onContinue={() => setPhase("scanner")}
        onBack={() => setPhase("info")}
      />
    );
  }

  // ── 3. Câmera ─────────────────────────────────────────────────────────────
  if (phase === "scanner") {
    return (
      <ScanningView
        onBack={() => setPhase("instructions")}
        onCapture={handleCapture}
        onGalleryFile={handleGalleryFile}
      />
    );
  }

  // ── 4. Loading / polling ──────────────────────────────────────────────────
  if (phase === "loading" && image) {
    return (
      <div style={{ position: "relative", minHeight: "100svh" }}>
        {/* Polling sempre ativo em background */}
        <LoadingAnalysisView
          imageUrl={image}
          analysisId={pendingAnalysisId ?? ""}
          isDone={Boolean(analysisResult)}
          onComplete={() => setLoadingFinished(true)}
          onResult={handleAnalysisResult}
          onError={handleAnalysisError}
        />

        {/* Quiz de rotina — aparece sobre o loading apenas na primeira análise */}
        {!routineQuizDone && (
          <div style={{ position: "fixed", inset: 0, zIndex: 40, overflow: "hidden" }}>
            <SkinQuiz
              questions={ROUTINE_QUESTIONS}
              analysisInProgress={!analysisResult}
              onComplete={(raw) => {
                const answers = quizToLifestyle(raw);
                setRoutineAnswers(answers);
                setRoutineQuizDone(true);
                // Persiste no localStorage para futuras análises não precisarem repetir
                try {
                  const merged = { ...(preAnswers ?? {}), ...answers } as LifestyleAnswers;
                  localStorage.setItem(QUIZ_ANSWERS_KEY, JSON.stringify(merged));
                  localStorage.setItem(QUIZ_COMPLETED_KEY, "1");
                } catch { /* quota */ }
              }}
              onBack={() => {/* não permite voltar durante o loading */}}
            />
          </div>
        )}
      </div>
    );
  }

  // ── 5. Preview da imagem capturada ────────────────────────────────────────
  const resetCapture = () => {
    setImage(null);
    localStorage.removeItem(PENDING_ANALYZE_IMAGE_KEY);
    localStorage.removeItem(PENDING_ANALYZE_FACE_KEY);
    localStorage.removeItem(PENDING_ANALYZE_AT_KEY);
    setPhase("scanner");
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#FAFAF8" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={resetCapture}
          className="flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "#6B6B6B", background: "none", border: "none", cursor: "pointer" }}
        >
          <RotateCcw size={15} /> Nova captura
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A" }}>Pré-visualização</span>
        <button
          onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
          style={{ color: "#6B6B6B", background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Fechar
        </button>
      </div>

      {/* Image preview */}
      <div className="px-5 mb-5">
        <div style={{ borderRadius: 24, overflow: "hidden", aspectRatio: "3/4", background: "#F0EDE8", boxShadow: "0 8px 32px rgba(244,168,199,0.2)" }}>
          <img src={image ?? ""} alt="Imagem capturada" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </div>

      <div className="flex-1 px-5 pb-6 space-y-3">
        {/* Error */}
        {analysisError && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(232,116,138,0.08)", border: "1px solid rgba(232,116,138,0.25)" }}>
            <div className="flex items-start gap-3 p-4">
              <AlertCircle size={17} style={{ color: "#E8748A", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: "#E8748A", fontWeight: 500, lineHeight: 1.5 }}>{analysisError}</p>
            </div>
            {faceValidation !== "invalid" && (
              <button
                onClick={() => { setAnalysisError(null); void startAnalysis(); }}
                style={{ width: "100%", padding: "10px 16px", background: "rgba(232,116,138,0.12)", borderTop: "1px solid rgba(232,116,138,0.2)", fontSize: 13, fontWeight: 700, color: "#E8748A", cursor: "pointer", border: "none" }}
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {/* Credits info */}
        {creditsRemaining > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "#FFF", border: "1px solid #F0EDE8" }}>
            <CheckCircle2 size={15} style={{ color: "#E8748A", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#6B6B6B" }}>
              <strong style={{ color: "#1A1A1A" }}>{creditsRemaining} crédito{creditsRemaining !== 1 ? "s" : ""}</strong> disponíve{creditsRemaining !== 1 ? "is" : "l"}
            </span>
          </div>
        )}

        {/* No credits warning */}
        {isAuthenticated && !canAnalyze && (
          <div className="px-4 py-3 rounded-2xl text-sm text-center font-medium" style={{ background: "rgba(232,116,138,0.08)", border: "1px solid rgba(232,116,138,0.25)", color: "#E8748A" }}>
            Sem créditos disponíveis.{" "}
            <button style={{ textDecoration: "underline", fontWeight: 700, background: "none", border: "none", color: "inherit", cursor: "pointer" }} onClick={() => navigate("/premium")}>Adquirir</button>
          </div>
        )}

        {/* Face invalid warning */}
        {faceValidation === "invalid" && (
          <div className="px-4 py-3 rounded-2xl text-sm font-medium" style={{ background: "rgba(232,116,138,0.08)", border: "1px solid rgba(232,116,138,0.25)", color: "#E8748A" }}>
            Nenhum rosto detectado. Capture novamente com o rosto centralizado.
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 pb-8 pt-3 space-y-3" style={{ borderTop: "1px solid #F0EDE8", background: "#FAFAF8" }}>
        {faceValidation !== "invalid" && (
          <button
            onClick={() => { void startAnalysis(); }}
            disabled={faceValidation === "checking" || (isAuthenticated && !canAnalyze) || isStarting}
            className="w-full flex items-center justify-center gap-2 font-bold text-white"
            style={{ height: 54, borderRadius: 14, background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)", fontSize: 16, border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(232,116,138,0.3)", opacity: (faceValidation === "checking" || (isAuthenticated && !canAnalyze) || isStarting) ? 0.75 : 1, transition: "opacity 200ms" }}
          >
            {isStarting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
            {isStarting ? "Iniciando..." : faceValidation === "checking" ? "Validando rosto..." : "Iniciar análise"}
          </button>
        )}
        <button
          onClick={resetCapture}
          className="w-full font-semibold"
          style={{ height: 46, borderRadius: 14, background: "#FFF", border: "1.5px solid #F0EDE8", color: "#6B6B6B", fontSize: 15, cursor: "pointer" }}
        >
          Capturar novamente
        </button>
      </div>
    </div>
  );
};

export default Analyze;
