/**
 * Logo Management System
 * Handles optional, lazy-loaded logos with fallback support
 */

export type LogoType = 'svg' | 'image' | 'text';

export interface LogoConfig {
  /** Type of logo (svg file, image URL, or text) */
  type: LogoType;
  /** Source: file path for SVG, URL for images, or text content */
  src: string;
  /** Alt text or text label */
  alt: string;
  /** CSS classes for styling */
  className?: string;
  /** Whether to lazy-load */
  lazy?: boolean;
  /** Fallback logo when main fails to load */
  fallback?: LogoConfig;
  /** Cache logo in sessionStorage */
  cache?: boolean;
}

export interface LogoLoadState {
  isLoading: boolean;
  isError: boolean;
  data?: string;
  error?: Error;
}

/**
 * Default logos for fallback
 */
export const DEFAULT_LOGOS = {
  TEXT: {
    type: 'text' as const,
    src: 'FaceGlow',
    alt: 'FaceGlow Logo',
    className: 'font-display font-bold text-xl bg-gradient-to-r from-coral via-pink to-lavender bg-clip-text text-transparent',
  },
  FACEGLOW_SVG: {
    type: 'svg' as const,
    src: '/logo-faceglow.svg',
    alt: 'FaceGlow',
    className: 'h-40',
    fallback: {
      type: 'text' as const,
      src: 'FaceGlow',
      alt: 'FaceGlow Logo',
    },
  },
} as const;

/**
 * Resolve logo source (handle imports, dynamic paths, etc.)
 */
export async function resolveLogoSource(logo: LogoConfig): Promise<string> {
  if (logo.type === 'text') {
    return logo.src;
  }

  if (logo.type === 'svg') {
    // For SVG files in public/, return as-is for img src
    return logo.src;
  }

  if (logo.type === 'image') {
    // Already a URL
    return logo.src;
  }

  throw new Error(`Unknown logo type: ${logo.type}`);
}

/**
 * Check if logo should use cache
 */
export function getLogoCacheKey(logo: LogoConfig): string | null {
  if (logo.cache) {
    return `logo:${logo.src}`;
  }
  return null;
}

/**
 * Validate logo config
 */
export function validateLogoConfig(logo: LogoConfig): boolean {
  if (!logo.type || !logo.src || !logo.alt) {
    console.warn('[Logo] Invalid config:', logo);
    return false;
  }
  return true;
}
