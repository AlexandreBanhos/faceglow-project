import { DEFAULT_LOGOS } from '@/lib/logo';
import { LogoImageOptional } from '@/components/LogoImage';
import { useEffect, useState } from 'react';

/**
 * Debug component to test logo loading
 */
export function LogoDebug() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('[LogoDebug] Mounted');
    console.log('[LogoDebug] DEFAULT_LOGOS:', DEFAULT_LOGOS);
    console.log('[LogoDebug] FACEGLOW_SVG config:', DEFAULT_LOGOS.FACEGLOW_SVG);
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 border-2 border-red-500 bg-red-50">
      <h2 className="font-bold text-red-800 mb-4">🐛 Logo Debug</h2>
      
      <div className="mb-4 p-2 bg-white border border-red-300">
        <h3 className="font-semibold text-sm mb-2">Config:</h3>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-w-sm">
          {JSON.stringify(DEFAULT_LOGOS.FACEGLOW_SVG, null, 2)}
        </pre>
      </div>

      <div className="mb-4 p-2 bg-white border border-red-300">
        <h3 className="font-semibold text-sm mb-2">Rendered Logo:</h3>
        <div className="flex gap-4 items-center">
          <LogoImageOptional
            logo={DEFAULT_LOGOS.FACEGLOW_SVG}
            fallbackLogo={DEFAULT_LOGOS.TEXT}
            showSkeleton={false}
          />
          <span className="text-xs text-gray-600">(should see logo above)</span>
        </div>
      </div>

      <div className="mb-4 p-2 bg-white border border-red-300">
        <h3 className="font-semibold text-sm mb-2">Direct SVG path test:</h3>
        <div className="flex gap-2">
          <img 
            src={DEFAULT_LOGOS.FACEGLOW_SVG.src}
            alt="Direct SVG test"
            className="w-12 h-12"
            onLoad={() => console.log('[LogoDebug] Direct SVG loaded successfully')}
            onError={(e) => console.error('[LogoDebug] Direct SVG failed to load:', e)}
          />
          <code className="text-xs text-gray-600 self-center">
            src: {String(DEFAULT_LOGOS.FACEGLOW_SVG.src).substring(0, 50)}...
          </code>
        </div>
      </div>

      <div className="mb-4 p-2 bg-white border border-red-300">
        <h3 className="font-semibold text-sm mb-2">Fallback Text Logo:</h3>
        <LogoImageOptional
          logo={DEFAULT_LOGOS.TEXT}
          hideIfMissing={false}
        />
      </div>
    </div>
  );
}
