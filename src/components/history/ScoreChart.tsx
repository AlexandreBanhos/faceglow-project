import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { AnalysisResponse } from "@/lib/analysis";

interface ScoreChartProps {
  analyses: AnalysisResponse[]; // qualquer ordem — o componente ordena
}

// Formata o label do eixo X de acordo com o span real dos dados
function makeLabelFn(chronological: AnalysisResponse[]) {
  if (chronological.length < 2) {
    return (d: string) =>
      new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  const spanDays =
    (new Date(chronological.at(-1)!.createdAtUtc).getTime() -
      new Date(chronological[0].createdAtUtc).getTime()) /
    86_400_000;

  if (spanDays < 90) {
    // dias → "15 Mai"
    return (d: string) =>
      new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  // meses → "Mai 25"
  return (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function ScoreChart({ analyses }: ScoreChartProps) {
  const chronological = [...analyses].sort(
    (a, b) =>
      new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime()
  );

  // ── Estado: sem dados ──
  if (chronological.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <p className="text-sm text-muted-foreground">
          Nenhuma análise registrada ainda.
        </p>
      </div>
    );
  }

  // ── Estado: análise única — não dá para traçar linha ──
  if (chronological.length === 1) {
    const only = chronological[0];
    return (
      <div className="flex flex-col items-center gap-2 py-5 text-center">
        <p
          className="font-extrabold text-foreground"
          style={{ fontSize: 40, lineHeight: 1 }}
        >
          {only.overallScore}
        </p>
        <p className="text-xs text-muted-foreground max-w-[220px]">
          Faça mais análises para acompanhar sua evolução ao longo do tempo.
        </p>
      </div>
    );
  }

  const data = chronological.map((a) => ({
    date: a.createdAtUtc,
    score: a.overallScore,
  }));

  const first = chronological[0].overallScore;
  const last = chronological.at(-1)!.overallScore;
  const delta = last - first;
  const formatLabel = makeLabelFn(chronological);

  return (
    <div>
      {/* Delta contextual */}
      <div className="flex items-center gap-1.5 mb-3 px-1">
        <span
          className="text-xs font-semibold"
          style={{ color: delta > 0 ? "#16A34A" : delta < 0 ? "#DC2626" : "var(--fg-ink-3)" }}
        >
          {delta > 0 ? "+" : ""}{delta} pts
        </span>
        <span className="text-xs text-muted-foreground">
          em {chronological.length} análises
          {chronological.length >= 2 && (() => {
            const spanDays = Math.round(
              (new Date(chronological.at(-1)!.createdAtUtc).getTime() -
                new Date(chronological[0].createdAtUtc).getTime()) /
                86_400_000
            );
            if (spanDays === 0) return null;
            const weeks = Math.round(spanDays / 7);
            return (
              <> · {weeks > 0 ? `${weeks} sem.` : `${spanDays} dias`}</>
            );
          })()}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={148}>
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="hScoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8547A" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#E8A882" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,0,0,0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatLabel}
            tick={{ fontSize: 10, fill: "var(--fg-ink-4)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
          />

          <YAxis
            domain={[
              (min: number) => Math.max(0, Math.floor(min) - 5),
              (max: number) => Math.min(100, Math.ceil(max) + 5),
            ]}
            tick={{ fontSize: 10, fill: "var(--fg-ink-4)" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />

          <Tooltip
            cursor={{ stroke: "rgba(232,84,122,0.2)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { date: string; score: number };
              return (
                <div
                  style={{
                    background: "var(--glass-bg-strong)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 10,
                    padding: "6px 10px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--fg-ink)",
                      lineHeight: 1,
                    }}
                  >
                    {d.score} pts
                  </p>
                  <p style={{ fontSize: 10, color: "var(--fg-ink-3)", marginTop: 3 }}>
                    {new Date(d.date).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="score"
            stroke="#E8547A"
            strokeWidth={2.5}
            fill="url(#hScoreGrad)"
            dot={{ r: 4, fill: "#E8547A", stroke: "white", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#E8547A", stroke: "white", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
