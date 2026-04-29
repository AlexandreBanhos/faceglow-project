type MetricGlassCardProps = {
  label: string;
  value: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const MetricGlassCard = ({ label, value }: MetricGlassCardProps) => {
  const normalized = clamp(value);
  const radius = 24;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (normalized / 100) * circumference;

  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/10 p-2.5 sm:p-3 text-white shadow-[0_8px_24px_rgba(0,0,0,0.20)] backdrop-blur-2xl">
      <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-white/90">{label}</p>
      <div className="relative mt-2 flex items-center justify-center">
        <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${label} ${normalized}%`}>
          <circle cx="32" cy="32" r={radius} stroke="rgba(255,255,255,0.22)" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="rgba(255,255,255,0.98)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="absolute text-sm font-extrabold text-white">{normalized}%</span>
      </div>
    </div>
  );
};

export default MetricGlassCard;
