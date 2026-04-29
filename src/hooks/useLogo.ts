import { useEffect, useState, useCallback } from 'react';
import { 
  LogoConfig, 
  LogoLoadState, 
  resolveLogoSource, 
  getLogoCacheKey,
  validateLogoConfig 
} from '@/lib/logo';

/**
 * Hook to load a logo with optional caching and error handling
 * Supports SVG files, images, and text fallback
 */
export function useLogo(logo: LogoConfig | null): LogoLoadState {
  const [loadState, setLoadState] = useState<LogoLoadState>({
    isLoading: !!logo,
    isError: false,
  });

  useEffect(() => {
    if (!logo) {
      setLoadState({ isLoading: false, isError: false });
      return;
    }

    if (!validateLogoConfig(logo)) {
      setLoadState({ 
        isLoading: false, 
        isError: true,
        error: new Error('Invalid logo config') 
      });
      return;
    }

    let mounted = true;

    async function loadLogo() {
      const cacheKey = getLogoCacheKey(logo);
      
      // Check cache
      if (cacheKey) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached && mounted) {
          setLoadState({ 
            isLoading: false, 
            isError: false,
            data: cached 
          });
          return;
        }
      }

      try {
        const source = await resolveLogoSource(logo);
        
        if (!mounted) return;

        // For text logos, just use as-is
        if (logo.type === 'text') {
          if (cacheKey) {
            sessionStorage.setItem(cacheKey, source);
          }
          setLoadState({ 
            isLoading: false, 
            isError: false,
            data: source 
          });
          return;
        }

        // For SVG/image imports (from Vite), URL is already valid
        // Skip Image validation for performance
        if (cacheKey) {
          sessionStorage.setItem(cacheKey, source);
        }
        setLoadState({ 
          isLoading: false, 
          isError: false,
          data: source 
        });
      } catch (error) {
        if (mounted) {
          setLoadState({ 
            isLoading: false, 
            isError: true,
            error: error instanceof Error ? error : new Error(String(error)) 
          });
        }
      }
    }

    loadLogo();

    return () => {
      mounted = false;
    };
  }, [logo]);

  return loadState;
}

/**
 * Hook to load a logo with automatic fallback chain
 * Falls back through: logo -> fallback logo -> null
 */
export function useOptionalLogo(logo: LogoConfig | null): LogoLoadState & { 
  logoToRender: LogoConfig | null 
} {
  const primaryLoad = useLogo(logo);
  
  // Determine which logo to render
  const shouldUseFallback = primaryLoad.isError && logo?.fallback;
  const logoToRender = shouldUseFallback ? logo.fallback : logo;
  
  // Load fallback only if needed
  const fallbackLoad = useLogo(shouldUseFallback ? logoToRender : null);

  return {
    isLoading: primaryLoad.isLoading || fallbackLoad.isLoading,
    isError: primaryLoad.isError && fallbackLoad.isError,
    data: primaryLoad.data || fallbackLoad.data,
    error: primaryLoad.error || fallbackLoad.error,
    logoToRender,
  };
}

/**
 * Hook to manage multiple logos with lazy-loading
 * Useful for logo grids, carousels, etc.
 */
export function useLogos(logos: LogoConfig[]): {
  logos: Array<LogoConfig & LogoLoadState>;
  isLoadingAny: boolean;
  loadedCount: number;
  failedCount: number;
} {
  const loadStates = logos.map(logo => useLogo(logo));

  return {
    logos: logos.map((logo, idx) => ({
      ...logo,
      ...loadStates[idx],
    })),
    isLoadingAny: loadStates.some(state => state.isLoading),
    loadedCount: loadStates.filter(state => !state.isError && !state.isLoading).length,
    failedCount: loadStates.filter(state => state.isError).length,
  };
}
