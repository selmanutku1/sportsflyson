import React, { useEffect } from 'react';

export const SPORTSFLY_DEFAULT_LOGO = '/sportsfly-logo.png';
export const SPORTSFLY_DEFAULT_SVG = '/sportsfly-logo.png';

export const useSportsFlyLogo = () => {
  useEffect(() => {
    try {
      // Remove any legacy cached custom logo (e.g. Rota Performans base64) so SportsFly always shows its official logo
      if (localStorage.getItem('sportsfly_custom_logo')) {
        localStorage.removeItem('sportsfly_custom_logo');
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  return SPORTSFLY_DEFAULT_LOGO;
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
  return (
    <img
      src={SPORTSFLY_DEFAULT_LOGO}
      alt="SportsFly Logo"
      className={`object-contain shrink-0 align-middle ${className}`}
    />
  );
};

export const SportsFlyLogo: React.FC<SportsFlyLogoProps> = ({
  className = 'w-9 h-9',
  size,
  showText = false,
}) => {
  useSportsFlyLogo();
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
          src={SPORTSFLY_DEFAULT_LOGO}
          alt="SportsFly Logo"
          className="w-full h-full object-contain"
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

export const SportsFlyIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  return (
    <span className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}>
      <img
        src={SPORTSFLY_DEFAULT_LOGO}
        alt="SportsFly Logo"
        className="w-full h-full object-contain"
      />
    </span>
  );
};

