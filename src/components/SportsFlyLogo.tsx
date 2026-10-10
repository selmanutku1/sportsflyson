import React, { useState, useEffect } from 'react';

export const useSportsFlyLogo = () => {
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('sportsfly_custom_logo') : null;
  });

  useEffect(() => {
    const handleStorage = () => {
      setCustomLogo(localStorage.getItem('sportsfly_custom_logo'));
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('sportsfly-logo-changed', handleStorage as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sportsfly-logo-changed', handleStorage as EventListener);
    };
  }, []);

  return customLogo;
};

interface SportsFlyLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

/**
 * Exact user-provided photographic logo for SportsFly.
 */
export const SportsFlyVectorMark: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => {
  const customLogo = useSportsFlyLogo();
  return (
    <img
      src={customLogo || "/sportsfly-logo.jpg"}
      alt="SportsFly Logo"
      className={`object-contain shrink-0 ${className}`}
    />
  );
};

export const SportsFlyLogo: React.FC<SportsFlyLogoProps> = ({
  className = 'w-9 h-9',
  size,
  showText = false,
}) => {
  const customLogo = useSportsFlyLogo();
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
          src={customLogo || "/sportsfly-logo.jpg"}
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

export const SportsFlyIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => {
  const customLogo = useSportsFlyLogo();
  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={customLogo || "/sportsfly-logo.jpg"}
        alt="SportsFly Logo"
        className="w-full h-full object-contain"
      />
    </span>
  );
};
