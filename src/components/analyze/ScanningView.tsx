import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Image, FlipHorizontal, ScanFace, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import ScannerOverlay from "@/components/analyze/ScannerOverlay";
import PrivacyTermsModal from "@/components/analyze/PrivacyTermsModal";

type ScanningViewProps = {
  onBack: () => void;
  onCapture: (dataUrl: string) => void;
  onGalleryFile: (file: File) => void;
};

const ScanningView = ({ onBack, onCapture, onGalleryFile }: ScanningViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  useEffect(() => {
    let localStream: MediaStream | null = null;
    let mounted = true;

    const startCamera = async () => {
      try {
        setStreamError(null);

        const constraintsProgressive = [
          {
            video: {
              facingMode,
              width: { min: 720, ideal: 1280, max: 1920 },
              height: { min: 720, ideal: 1280, max: 1920 },
            },
            audio: false,
          },
          {
            video: {
              facingMode,
              width: { min: 480, ideal: 720, max: 1920 },
              height: { min: 480, ideal: 720, max: 1920 },
            },
            audio: false,
          },
          {
            video: { facingMode },
            audio: false,
          },
        ];

        let lastError: Error | null = null;

        for (const constraints of constraintsProgressive) {
          try {
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            if (localStream && mounted && videoRef.current) {
              videoRef.current.srcObject = localStream;
              await videoRef.current.play();
              return;
            }
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            continue;
          }
        }

        if (mounted && lastError) {
          const errorName = (lastError as DOMException).name;
          if (errorName === 'NotAllowedError' || errorName === 'PermissionDenied') {
            setStreamError("Permissão de câmera negada. Verifique as configurações do seu navegador e tente novamente.");
          } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
            setStreamError("Câmera não encontrada. Use a galeria para continuar.");
          } else {
            setStreamError("Não foi possível acessar a câmera. Use a galeria para continuar.");
          }
        }
      } catch {
        if (mounted) {
          setStreamError("Erro ao acessar câmera. Use a galeria para continuar.");
        }
      }
    };

    startCamera();

    const handleOrientationChange = () => {
      localStream?.getTracks().forEach((track) => track.stop());
      startCamera();
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      mounted = false;
      window.removeEventListener('orientationchange', handleOrientationChange);
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    // Efeito de flash
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 300);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    if (facingMode === "user") {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    onCapture(canvas.toDataURL("image/jpeg", 0.92));
  };

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-black">
      {/* Background gradient effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
      </div>

      {/* Camera Video - Preenchendo tela inteira */}
      <div 
        className={facingMode === "user" ? "absolute inset-0 scale-x-[-1] overflow-hidden" : "absolute inset-0 overflow-hidden"}
      >
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover" 
          playsInline 
          muted 
          autoPlay 
        />
        <ScannerOverlay className="absolute inset-0" />
      </div>

      {/* Flash Effect - Efeito de flash ao capturar */}
      <motion.div
        animate={{ opacity: flashActive ? 1 : 0 }}
        transition={{ duration: 0.1 }}
        className="pointer-events-none fixed inset-0 z-30 bg-white"
      />

      {/* Scanning Animation - Full Screen from Top to Bottom Buttons */}
      <motion.div
        animate={{ y: ["0vh", "calc(100vh)"] }}
        transition={{ 
          duration: 1.8, 
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut" 
        }}
        className="pointer-events-none fixed top-0 left-0 right-0 z-10 h-3 bg-gradient-to-b from-transparent via-pink-400 via-30% to-transparent shadow-[0_0_30px_rgba(244,114,182,0.9),0_0_50px_rgba(236,72,153,0.6)]"
      />

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-6 pb-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </motion.button>
        
        <h1 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
          <Sparkles size={20} className="text-pink-400" />
          Análise Facial
        </h1>
        
        <div className="h-11 w-11" />
      </div>

      {/* Scanning Status Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute top-20 left-0 right-0 z-20 flex items-center justify-center gap-2"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-2 w-2 rounded-full bg-pink-400"
        />
        <span className="text-xs font-semibold bg-gradient-to-r from-pink-400 to-rose-300 bg-clip-text text-transparent">Posicione rosto dentro da moldura</span>
      </motion.div>

      {streamError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 mx-6 mt-4 rounded-2xl border border-red-500/50 bg-red-500/20 backdrop-blur-xl px-4 py-3 text-sm font-medium text-red-200"
        >
          ⚠️ {streamError}
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-12 left-0 right-0 z-20 flex items-center justify-center gap-6 px-6"
      >
        {/* Gallery Button */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            const input = fileInputRef.current;
            if (!input) return;
            input.click();
            input.focus();
          }}
          className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/30 transition-colors shadow-lg"
          aria-label="Abrir galeria"
        >
          <Image size={22} />
        </motion.button>

        {/* Capture Button - Main CTA */}
        <motion.button
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setIsScanning(true);
            handleCapture();
            setTimeout(() => setIsScanning(false), 500);
          }}
          className="relative h-24 w-24 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center shadow-[0_20px_60px_rgba(244,114,182,0.5)] hover:shadow-[0_25px_70px_rgba(244,114,182,0.6)] transition-shadow"
          aria-label="Capturar rosto"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400/40 to-rose-500/40"
          />
          <ScanFace size={36} className="relative z-10" />
        </motion.button>

        {/* Switch Camera Button */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setFacingMode((previous) => (previous === "user" ? "environment" : "user"))}
          className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/30 transition-colors shadow-lg"
          aria-label="Inverter câmera"
        >
          <FlipHorizontal size={22} />
        </motion.button>
      </motion.div>

      {/* Bottom helpful text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-2 left-0 right-0 z-10 flex items-center justify-center gap-2 text-xs font-medium text-white/60"
      >
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <Camera size={11} />
        </motion.div>
        Centralize seu rosto para captura
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onGalleryFile(file);
          }
          event.currentTarget.value = "";
        }}
        onClick={(e) => {
          const input = e.currentTarget;
          input.value = "";
        }}
      />

      {/* Privacy Terms Modal */}
      {!privacyAccepted && (
        <PrivacyTermsModal onAccept={() => setPrivacyAccepted(true)} />
      )}
    </div>
  );
};

export default ScanningView;
