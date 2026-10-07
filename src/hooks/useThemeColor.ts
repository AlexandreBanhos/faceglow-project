import { useEffect } from "react";

// Troca a cor da barra do sistema (meta theme-color) e o fundo do html/body enquanto a tela está montada.
// No PWA a área de status mostra essa cor; sem isso, telas escuras ficam com a faixa clara do FaceGlow no topo.
export function useThemeColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevMeta = meta?.getAttribute("content") ?? null;
    const html = document.documentElement;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = document.body.style.backgroundColor;

    meta?.setAttribute("content", color);
    html.style.backgroundColor = color;
    document.body.style.backgroundColor = color;

    return () => {
      if (meta && prevMeta !== null) meta.setAttribute("content", prevMeta);
      html.style.backgroundColor = prevHtmlBg;
      document.body.style.backgroundColor = prevBodyBg;
    };
  }, [color]);
}
