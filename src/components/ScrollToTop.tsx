import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Garantir que o scroll é feito após o DOM estar completamente renderizado
    // Usar requestAnimationFrame para executar após o próximo paint do navegador
    const scrollTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto", // Use "auto" para scroll instantâneo, não "smooth"
      });
    };

    // Executar imediatamente
    scrollTop();

    // Executar também após um pequeno delay como fallback
    const timeoutId = setTimeout(scrollTop, 0);

    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
};
