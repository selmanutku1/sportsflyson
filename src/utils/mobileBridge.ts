import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

const DEFAULT_NATIVE_API_BASE = 'https://webapp.sportsfly.com.tr';

let bridgeInitialized = false;

export function isNativeCapacitorApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getCapacitorPlatform(): 'ios' | 'android' | 'web' {
  try {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios' || platform === 'android') return platform;
    return 'web';
  } catch {
    return 'web';
  }
}

/**
 * Resolves the API origin:
 * - On web/Vercel/local dev: '' (relative /api/... calls) unless VITE_API_BASE_URL is explicitly configured
 * - Inside native iOS/Android Capacitor bundle: VITE_API_BASE_URL or production https://webapp.sportsfly.com.tr
 */
export function getApiBaseUrl(): string {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env || {} : {};
  const configuredBase = (metaEnv.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configuredBase) {
    return configuredBase;
  }
  if (isNativeCapacitorApp()) {
    return DEFAULT_NATIVE_API_BASE;
  }
  return '';
}

export function resolveApiUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl();
  if (!base) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Opens external URLs safely across Web and Native iOS/Android WebViews.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;
  if (isNativeCapacitorApp()) {
    try {
      await Browser.open({ url });
      return;
    } catch {
      // Fallback below
    }
  }
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
}

/**
 * Initializes native mobile integrations (StatusBar, SplashScreen hide, Android hardware back button).
 * Safe no-op on standard web browsers.
 */
export async function initCapacitorMobileBridge(onBackRequested?: () => boolean): Promise<void> {
  if (typeof window === 'undefined' || !isNativeCapacitorApp()) return;

  const platform = getCapacitorPlatform();
  document.documentElement.classList.add('is-capacitor-native', `capacitor-${platform}`);

  if (bridgeInitialized) return;
  bridgeInitialized = true;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#1e40af' });
    }
  } catch {
    // Ignore on platforms where StatusBar plugin is unavailable
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    // Ignore
  }

  try {
    await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (onBackRequested && onBackRequested()) {
        return;
      }
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        CapacitorApp.minimizeApp().catch(() => {});
      }
    });
  } catch {
    // Ignore
  }
}
