import { useLayoutEffect } from "react";

// Pinta a área do sistema (meta theme-color) e o fundo do html/body com uma cor sólida enquanto a tela está montada.
// O body global tem o gradiente aurora como background-image e padding-top da safe area (index.css); no PWA com
// status bar black-translucent essa faixa aparece clara no topo. Com `edgeToEdge`, a própria página cuida da safe area,
// então o padding do body é zerado. useLayoutEffect aplica antes da primeira pintura (sem piscar a faixa clara).
export function useThemeColor(color: string, { edgeToEdge = false }: { edgeToEdge?: boolean } = {}) {
  useLayoutEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevMeta = meta?.getAttribute("content") ?? null;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlBg: html.style.backgroundColor,
      htmlImg: html.style.backgroundImage,
      bodyBg: body.style.backgroundColor,
      bodyImg: body.style.backgroundImage,
      bodyPt: body.style.paddingTop,
    };

    meta?.setAttribute("content", color);
    html.style.backgroundColor = color;
    html.style.backgroundImage = "none";
    body.style.backgroundColor = color;
    body.style.backgroundImage = "none";
    if (edgeToEdge) body.style.paddingTop = "0px";

    return () => {
      if (meta && prevMeta !== null) meta.setAttribute("content", prevMeta);
      html.style.backgroundColor = prev.htmlBg;
      html.style.backgroundImage = prev.htmlImg;
      body.style.backgroundColor = prev.bodyBg;
      body.style.backgroundImage = prev.bodyImg;
      body.style.paddingTop = prev.bodyPt;
    };
  }, [color, edgeToEdge]);
}
