import { Bell, BellOff, Moon, Sun, Camera, ListChecks } from "lucide-react";
import { usePushNotifications, type PushStatus } from "@/hooks/usePushNotifications";
import type { NotifPref } from "@/lib/pushNotifications";

const PREFS: { key: NotifPref; icon: React.ReactNode; label: string; sub: string }[] = [
  { key: "routine_morning",  icon: <Sun  size={15} className="text-amber-500" />, label: "Rotina da manhã",    sub: "Lembrete às 8h para iniciar a rotina" },
  { key: "routine_night",    icon: <Moon size={15} className="text-indigo-500" />, label: "Rotina da noite",    sub: "Lembrete às 21h30 para a rotina noturna" },
  { key: "pending_steps",    icon: <ListChecks size={15} className="text-rose-500" />, label: "Passos pendentes",  sub: "Aviso às 15h se não completou a rotina" },
  { key: "analysis_weekly",  icon: <Camera size={15} className="text-violet-500" />, label: "Análise semanal",   sub: "Domingo: lembrete para nova análise" },
];

function statusLabel(status: PushStatus): { text: string; color: string } {
  switch (status) {
    case "granted_active":   return { text: "Ativadas",       color: "#81c1a7" };
    case "granted_inactive": return { text: "Permissão dada", color: "#f59e0b" };
    case "denied":           return { text: "Bloqueadas",      color: "#ef4444" };
    case "unsupported":      return { text: "Não suportado",   color: "#94a3b8" };
    default:                 return { text: "Desativadas",     color: "#94a3b8" };
  }
}

export function NotificationSettings() {
  const { status, loading, isActive, isDenied, isUnsupported, prefs, enable, disable, togglePref } = usePushNotifications();
  const sl = statusLabel(status);

  if (isUnsupported) return null;

  return (
    <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(232,116,138,0.1)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(232,116,138,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isActive ? <Bell size={16} color="white" /> : <BellOff size={16} color="white" />}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>Notificações</p>
            <p style={{ margin: 0, fontSize: 11, color: sl.color, fontWeight: 600 }}>{sl.text}</p>
          </div>
        </div>

        {/* Toggle principal */}
        {!loading && !isDenied && (
          <button
            onClick={isActive ? disable : enable}
            aria-label={isActive ? "Desativar notificações" : "Ativar notificações"}
            style={{
              width: 42, height: 24, borderRadius: 99, border: "none",
              cursor: "pointer", flexShrink: 0,
              background: isActive
                ? "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)"
                : "rgba(203,213,225,0.8)",
              position: "relative", transition: "background 0.2s",
            }}
          >
            <span style={{
              position: "absolute", top: 3,
              left: isActive ? 20 : 3,
              width: 18, height: 18, borderRadius: "50%",
              background: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              transition: "left 0.2s",
            }} />
          </button>
        )}
      </div>

      {/* Aviso se bloqueado */}
      {isDenied && (
        <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>
            Notificações bloqueadas no navegador. Para ativar, vá nas configurações do browser e permita notificações para este site.
          </p>
        </div>
      )}

      {/* Preferências — só visíveis quando ativo */}
      {isActive && (
        <div style={{ padding: "8px 0" }}>
          {PREFS.map(({ key, icon, label, sub }) => (
            <div
              key={key}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(248,250,252,0.9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{sub}</p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => togglePref(key, !prefs[key])}
                style={{
                  width: 42, height: 24, borderRadius: 99, border: "none",
                  cursor: "pointer", flexShrink: 0,
                  background: prefs[key] !== false
                    ? "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)"
                    : "rgba(203,213,225,0.8)",
                  position: "relative", transition: "background 0.2s",
                }}
                aria-label={`${prefs[key] !== false ? "Desativar" : "Ativar"} ${label}`}
              >
                <span style={{
                  position: "absolute", top: 3,
                  left: prefs[key] !== false ? 20 : 3,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "left 0.2s",
                }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
