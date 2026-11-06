import React, { useState, useEffect } from 'react';

export const SPORTSFLY_DEFAULT_LOGO = '/sportsfly-logo.png';
export const SPORTSFLY_DEFAULT_SVG = '/sportsfly-logo.svg';

export const useSportsFlyLogo = () => {
  const [customLogo, setCustomLogo] = useState<string>(() => {
    if (typeof window === 'undefined') return SPORTSFLY_DEFAULT_LOGO;
    try {
      const stored = localStorage.getItem('sportsfly_custom_logo');
      if (stored && (stored.toLowerCase().includes('rota') || stored.includes('rota-performans'))) {
        localStorage.removeItem('sportsfly_custom_logo');
        return SPORTSFLY_DEFAULT_LOGO;
      }
      return stored || SPORTSFLY_DEFAULT_LOGO;
    } catch (e) {
      return SPORTSFLY_DEFAULT_LOGO;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('sportsfly_custom_logo');
        if (stored && (stored.toLowerCase().includes('rota') || stored.includes('rota-performans'))) {
          localStorage.removeItem('sportsfly_custom_logo');
          setCustomLogo(SPORTSFLY_DEFAULT_LOGO);
          return;
        }
        setCustomLogo(stored || SPORTSFLY_DEFAULT_LOGO);
      } catch (e) {
        setCustomLogo(SPORTSFLY_DEFAULT_LOGO);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sportsfly-logo-changed', handleStorage as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sportsfly-logo-changed', handleStorage as EventListener);
    };
  }, []);

  return customLogo || SPORTSFLY_DEFAULT_LOGO;
};

interface SportsFlyLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

/**
 * Exact user-provided photographic and brand logo for SportsFly.
 */
export const SportsFlyVectorMark: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => {
  const customLogo = useSportsFlyLogo();
  const effectiveSrc = (!customLogo || customLogo.toLowerCase().includes('rota'))
    ? SPORTSFLY_DEFAULT_LOGO
    : customLogo;
  
  return (
    <img
      src={effectiveSrc}
      alt="SportsFly Logo"
      className={`object-contain shrink-0 align-middle ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = SPORTSFLY_DEFAULT_SVG;
      }}
    />
  );
};

export const SportsFlyLogo: React.FC<SportsFlyLogoProps> = ({
  className = 'w-9 h-9',
  size,
  showText = false,
}) => {
  const customLogo = useSportsFlyLogo();
  const effectiveSrc = (!customLogo || customLogo.toLowerCase().includes('rota'))
    ? SPORTSFLY_DEFAULT_LOGO
    : customLogo;
  const dimensionStyle = size
    ? { width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size }
    : undefined;

  return (
    <div className={`inline-flex items-center gap-2.5 ${showText ? '' : 'shrink-0'}`}>
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
        style={dimensionStyle}
      >
        <img
          src={effectiveSrc}
          alt="SportsFly Logo"
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = SPORTSFLY_DEFAULT_SVG;
          }}
        />
      </div>
      {showText && (
        <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">
          SportsFly
        </span>
      )}
    </div>
  );
};

export const SportsFlyIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => {
  const customLogo = useSportsFlyLogo();
  const effectiveSrc = (!customLogo || customLogo.toLowerCase().includes('rota'))
    ? SPORTSFLY_DEFAULT_SVG
    : customLogo;

  return (
    <span className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}>
      <img
        src={effectiveSrc}
        alt="SportsFly Logo"
        className="w-full h-full object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).src = SPORTSFLY_DEFAULT_SVG;
        }}
      />
    </span>
  );
};

