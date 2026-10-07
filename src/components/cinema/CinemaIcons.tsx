import { useId } from "react";

type IconProps = { size?: number; className?: string };

// Ingresso com entalhes semicirculares e estrela central (src/assets/icones/icone clube.png)
export function ClubIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 2.5H9A3 3 0 0 0 15 2.5H19.5V21.5H15A3 3 0 0 0 9 21.5H4.5Z"
        stroke="currentColor" strokeWidth={1.8} strokeLinejoin="miter"
      />
      <path
        d="M12 8.3L13.03 11.08L15.99 11.2L13.66 13.04L14.47 15.9L12 14.25L9.53 15.9L10.34 13.04L8.01 11.2L10.97 11.08Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Marcador preenchido com recorte em arco (src/assets/icones/icone-pedido.jpg)
export function OrdersIcon({ size = 24, className }: IconProps) {
  const maskId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <mask id={maskId}>
        <rect width="24" height="24" fill="#fff" />
        <path d="M9.8 9.6Q12 10.6 14.2 9.6" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      </mask>
      <path
        d="M8 4H16A3 3 0 0 1 19 7V18.4C19 20.2 17.7 20.9 16.1 20.1L13.1 18.3Q12 17.7 10.9 18.3L7.9 20.1C6.3 20.9 5 20.2 5 18.4V7A3 3 0 0 1 8 4Z"
        fill="currentColor" mask={`url(#${maskId})`}
      />
    </svg>
  );
}

// Eva Icons "arrow-back" (akveo, MIT)
export function BackIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 11H7.14l3.63-4.36a1 1 0 1 0-1.54-1.28l-5 6a1.19 1.19 0 0 0-.09.15c0 .05 0 .08-.07.13A1 1 0 0 0 4 12a1 1 0 0 0 .07.36c0 .05 0 .08.07.13a1.19 1.19 0 0 0 .09.15l5 6A1 1 0 0 0 10 19a1 1 0 0 0 .64-.23 1 1 0 0 0 .13-1.41L7.14 13H19a1 1 0 0 0 0-2Z" />
    </svg>
  );
}

// Iconsax "bag-happy" (linear)
export function SnackIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path d="M8.5 14.25c0 1.92 1.58 3.5 3.5 3.5s3.5-1.58 3.5-3.5M8.81 2 5.19 5.63M15.19 2l3.62 3.63" strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 7.85c0-1.85.99-2 2.22-2h15.56c1.23 0 2.22.15 2.22 2 0 2.15-.99 2-2.22 2H4.22C2.99 9.85 2 10 2 7.85Z" />
      <path d="m3.5 10 1.41 8.64C5.23 20.58 6 22 8.86 22h6.03c3.11 0 3.57-1.36 3.93-3.24L20.5 10" strokeLinecap="round" />
    </svg>
  );
}

// Iconsax "video-vertical" (linear)
export function FilmsIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 22h6c5 0 7-2 7-7V9c0-5-2-7-7-7H9C4 2 2 4 2 9v6c0 5 2 7 7 7ZM6.89 2.52v18.96M16.89 2.52v18.96M6.89 6.97H2.54M6.89 12H2.03M6.89 16.97H2.48M21.89 6.97h-4.35M21.89 12h-4.86M16.97 12h-11M21.89 16.97h-4.41" />
    </svg>
  );
}

// Check em círculo (K. Lyn) — src/assets/icones/icone-check.svg
export function CheckIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeMiterlimit={10} className={className} aria-hidden="true">
      <path d="M8.5 14L11.1 16.6" />
      <path d="M18.2 10L11.6 16.6" />
      <path d="M13 25C19.6274 25 25 19.6274 25 13C25 6.37258 19.6274 1 13 1C6.37258 1 1 6.37258 1 13C1 19.6274 6.37258 25 13 25Z" />
    </svg>
  );
}
