import { useLogo, useOptionalLogo } from '@/hooks/useLogo';
import { LogoConfig, DEFAULT_LOGOS } from '@/lib/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface LogoImageProps {
  /** Logo configuration */
  logo: LogoConfig;
  /** Show skeleton while loading */
  showSkeleton?: boolean;
  /** Fallback element when loading fails */
  fallbackElement?: React.ReactNode;
  /** On load callback */
  onLoad?: () => void;
  /** On error callback */
  onError?: (error: Error) => void;
}

/**
 * Renders a single logo with lazy-loading and error handling
 * Supports SVG, images, and text
 */
export function LogoImage({
  logo,
  showSkeleton = true,
  fallbackElement,
  onLoad,
  onError,
}: LogoImageProps) {
  const { isLoading, isError, data, error } = useLogo(logo);

  if (isLoading && showSkeleton) {
    return <Skeleton className={logo.className || 'w-8 h-8 rounded'} />;
  }

  if (isError) {
    if (error && onError) onError(error);
    if (fallbackElement) return <>{fallbackElement}</>;
    
    return (
      <div className={`${logo.className || 'w-8 h-8'} flex items-center justify-center bg-muted rounded`}>
        <AlertCircle className="w-4 h-4 text-destructive" />
      </div>
    );
  }

  if (logo.type === 'text' && data) {
    return (
      <span className={logo.className}>
        {data}
      </span>
    );
  }

  if ((logo.type === 'svg' || logo.type === 'image') && data) {
    return (
      <img
        src={data}
        alt={logo.alt}
        className={logo.className}
        onLoad={onLoad}
        onError={() => onError?.(new Error(`Failed to load: ${data}`))}
      />
    );
  }

  return null;
}

interface LogoImageOptionalProps extends Omit<LogoImageProps, 'logo'> {
  /** Logo configuration or null */
  logo: LogoConfig | null;
  /** Fallback logo config when primary fails */
  fallbackLogo?: LogoConfig;
  /** Show nothing if no logo available */
  hideIfMissing?: boolean;
}

/**
 * Renders a logo with automatic fallback chain
 * Use this when logo might fail to load or be optional
 */
export function LogoImageOptional({
  logo,
  fallbackLogo = DEFAULT_LOGOS.TEXT,
  hideIfMissing = false,
  showSkeleton = true,
  fallbackElement,
  onLoad,
  onError,
}: LogoImageOptionalProps) {
  const logoWithFallback: LogoConfig | null = logo
    ? { ...logo, fallback: fallbackLogo }
    : null;

  const { isLoading, isError, logoToRender } = useOptionalLogo(logoWithFallback);

  if (!logoToRender && hideIfMissing) {
    return null;
  }

  if (!logoToRender) {
    return fallbackElement || null;
  }

  return (
    <LogoImage
      logo={logoToRender}
      showSkeleton={showSkeleton}
      fallbackElement={fallbackElement}
      onLoad={onLoad}
      onError={onError}
    />
  );
}

interface LogoGridProps {
  /** Array of logos to display */
  logos: LogoConfig[];
  /** Grid columns (tailwind class) */
  gridCols?: string;
  /** Container className */
  containerClassName?: string;
  /** Individual logo className override */
  logoClassName?: string;
  /** Show skeletons while loading */
  showSkeleton?: boolean;
  /** Fallback element for failed logos */
  fallbackElement?: React.ReactNode;
}

/**
 * Renders multiple logos in a grid with lazy-loading
 */
export function LogoGrid({
  logos,
  gridCols = 'grid-cols-3 md:grid-cols-6',
  containerClassName = 'gap-4',
  logoClassName,
  showSkeleton = true,
  fallbackElement,
}: LogoGridProps) {
  return (
    <div className={`grid ${gridCols} ${containerClassName}`}>
      {logos.map((logo, idx) => (
        <div key={`${logo.src}-${idx}`} className="flex items-center justify-center">
          <LogoImageOptional
            logo={logo}
            hideIfMissing={true}
            showSkeleton={showSkeleton}
            fallbackElement={fallbackElement}
          />
        </div>
      ))}
    </div>
  );
}
