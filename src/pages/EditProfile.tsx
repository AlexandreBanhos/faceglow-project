import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { getCurrentUser, updateProfileMetadata } from "@/lib/auth";
import { uploadProfileImage } from "@/lib/storage";
import { fetchDashboardSummary } from "@/lib/analysisClient";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";

const EditProfile = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("Usuario");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const user = await getCurrentUser();
      if (!mounted || !user) {
        return;
      }

      const metadataName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
        "";

      setUserId(user.id);
      setEmail(user.email ?? "");
      setDisplayName(metadataName || (user.email?.split("@")[0] ?? "Usuario"));
      setPhone(typeof user.user_metadata?.phone_number === "string" ? user.user_metadata.phone_number : "");
      
      const customAvatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "";
      setAvatarUrl(customAvatarUrl);
      setIsCustomAvatar(!!customAvatarUrl);
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Carregar imagem da Ãºltima anÃ¡lise como avatar padrÃ£o
  useEffect(() => {
    let mounted = true;

    const loadLastAnalysisImage = async () => {
      // Se tem avatar customizado, nÃ£o sobrescrever
      if (isCustomAvatar) {
        return;
      }

      try {
        const dashboard = await fetchDashboardSummary(false);
        if (!mounted) {
          return;
        }

        if (dashboard.latest?.imageUrl && !avatarUrl) {
          // PrÃ©-carregar a imagem para evitar piscar
          const img = new Image();
          img.onload = () => {
            if (mounted) {
              setAvatarUrl(dashboard.latest.imageUrl);
              setIsImageLoaded(false); // Reset para animaÃ§Ã£o
            }
          };
          img.onerror = () => {
            console.warn("[EditProfile] Erro ao prÃ©-carregar imagem:", dashboard.latest.imageUrl);
          };
          img.src = dashboard.latest.imageUrl;
        }
      } catch (error) {
        console.error("[EditProfile] Erro ao carregar imagem da Ãºltima anÃ¡lise:", error);
      }
    };

    if (userId && !isCustomAvatar) {
      loadLastAnalysisImage();
    }

    return () => {
      mounted = false;
    };
  }, [userId, isCustomAvatar]);

  const avatarLetter = useMemo(() => {
    const source = displayName.trim() || email.trim() || "U";
    return source.charAt(0).toUpperCase();
  }, [displayName, email]);

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !userId) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const localPreviewUrl = URL.createObjectURL(file);
      setAvatarUrl(localPreviewUrl);

      const publicUrl = await uploadProfileImage(file, userId);
      const { error } = await updateProfileMetadata({ avatarUrl: publicUrl });
      if (error) {
        throw new Error(error.message);
      }

      // PrÃ©-carregar a imagem antes de atualizar state
      const img = new Image();
      img.onload = () => {
        setAvatarUrl(publicUrl);
        setIsImageLoaded(false);
        setIsCustomAvatar(true);
        setMessage("Foto atualizada com sucesso.");
      };
      img.onerror = () => {
        console.warn("[EditProfile] Erro ao carregar imagem enviada:", publicUrl);
        setMessage("Erro ao carregar a foto enviada.");
      };
      img.src = publicUrl;
    } catch (error) {
      const text = error instanceof Error ? error.message : "Nao foi possivel atualizar a foto.";
      setMessage(text);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const nextName = displayName.trim() || "Usuario";
      const nextPhone = phone.trim();

      const { error } = await updateProfileMetadata({
        fullName: nextName,
        phoneNumber: nextPhone,
      });

      if (error) {
        throw new Error(error.message);
      }

      setDisplayName(nextName);
      setPhone(nextPhone);
      setMessage("Dados atualizados com sucesso.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Nao foi possivel atualizar seus dados.";
      setMessage(text);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaving) {
    return <LoadingSpinnerFullScreen message="Salvando seus dados..." />;
  }

  return (
    <div className="min-h-screen px-6 pt-4 pb-8 flex flex-col" style={{
      background: "linear-gradient(135deg, rgba(252, 231, 243, 0.6) 0%, rgba(254, 243, 199, 0.5) 50%, rgba(219, 234, 254, 0.5) 100%)",
      backgroundAttachment: "fixed"
    }}>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-2xl liquiglass-button flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-xl font-extrabold text-foreground">Alterar Dados</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 space-y-3"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow overflow-hidden relative">
              {/* Letra como background */}
              <span className="text-2xl font-extrabold text-primary-foreground">{avatarLetter}</span>
              
              {/* Imagem com fade-in suave */}
              {avatarUrl && (
                <motion.img 
                  key={avatarUrl}
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="absolute w-full h-full object-cover" 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isImageLoaded ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onLoad={() => {
                    setIsImageLoaded(true);
                  }}
                  onError={(e) => {
                    console.warn("[EditProfile] Erro ao carregar imagem do avatar:", avatarUrl);
                    setAvatarUrl(""); // Limpa para voltar Ã  letra
                  }}
                />
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer border border-background">
              <Camera size={13} />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{email}</p>
            <p className="text-xs text-muted-foreground">Altere sua foto e seus dados pessoais</p>
          </div>
        </div>

        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Nome"
          className="w-full h-11 rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground"
        />

        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Telefone"
          className="w-full h-11 rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground"
        />

        {message && <p className="text-xs font-semibold text-muted-foreground">{message}</p>}

        <button
          onClick={handleSave}
          className="w-full h-11 rounded-xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
        >
          <Save size={14} />
          Salvar dados
        </button>
      </motion.div>
    </div>
  );
};

export default EditProfile;
