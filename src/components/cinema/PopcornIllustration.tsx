import popcornUrl from "@/assets/icones/balde-pipoca-transparente.webp";

// Balde de pipoca tombado (imagem com fundo removido) com confetes ao redor — tela de erro do cinema
export function PopcornIllustration() {
  return (
    <div style={{ position: "relative", width: 280, height: 260 }} aria-hidden="true">
      <svg width="280" height="260" viewBox="0 0 280 260" style={{ position: "absolute", inset: 0 }}>
        <path d="M150 14h16l-8 12z" fill="#E8261D" />
        <path d="M36 38l13 7-13 7z" fill="#3A3A3A" />
        <circle cx="244" cy="52" r="8" fill="#B80000" />
        <circle cx="255" cy="172" r="8" fill="#D10000" />
        <path d="M38 192l-13 6 13 7z" fill="#B30000" />
        <circle cx="150" cy="228" r="8" fill="#262626" />
        <path d="M222 228l-13 6 13 7z" fill="#E8261D" />
      </svg>
      <img
        src={popcornUrl}
        alt=""
        width={150}
        style={{ position: "absolute", left: 62, top: 48, filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.5))" }}
      />
    </div>
  );
}
