type ScannerOverlayProps = {
  className?: string;
};

const ScannerOverlay = ({ className }: ScannerOverlayProps) => {
  return (
    <div className={className}>
      <div className="pointer-events-none absolute inset-0 bg-black/55" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[65vh] w-[72vw] max-h-[600px] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-pink-400/50 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
    </div>
  );
};

export default ScannerOverlay;
