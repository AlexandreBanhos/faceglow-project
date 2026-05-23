import { useEffect, useState } from "react";

/**
 * Hook para obter ou criar um container portal para modais.
 * Garante que modais sejam renderizados no topo do DOM, evitando problemas
 * de stacking context causados por containers com `overflow: auto/hidden`.
 */
export function useModalPortal(id = "modal-root"): HTMLElement {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el = document.getElementById(id);

    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.style.position = "relative";
      el.style.zIndex = "9999";
      document.body.appendChild(el);
    }

    setContainer(el);

    return () => {
      // Não remover container na desmontagem para reutilizar em outros componentes
    };
  }, [id]);

  return container || document.body;
}
