import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './firebase';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { sanitizeCorruptedStorageOnBoot } from './utils/safeStorage';

// Sanitize corrupted localStorage / sessionStorage items before mounting
try {
  sanitizeCorruptedStorageOnBoot();
} catch (e) {
  console.warn('[SportsFly Boot] Storage sanitation warning:', e);
}

// Reset chunk reload counter once app successfully executes main.tsx
try {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('sportsfly_chunk_reload_count');
    if (typeof (window as any).__sportsfly_clear_preloader_timer === 'function') {
      (window as any).__sportsfly_clear_preloader_timer();
    }
  }
} catch (_) {}

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <AppErrorBoundary fallbackTitle="Sistem arayüzü yeniden başlatılıyor">
          <ThemeProvider>
            <LanguageProvider>
              <App />
            </LanguageProvider>
          </ThemeProvider>
        </AppErrorBoundary>
      </StrictMode>,
    );
  } catch (renderError) {
    console.error('[SportsFly Fatal] Root render failed:', renderError);
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b1320;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;">
        <div style="max-width:440px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <div style="font-size:32px;margin-bottom:12px;">⚠️</div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;">SportsFly Başlatılamadı</h2>
          <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-bottom:20px;">Tarayıcı önbelleğindeki eski veriler veya geçici ağ kesintisi arayüzün açılmasını engelledi.</p>
          <button onclick="localStorage.clear();sessionStorage.clear();window.location.reload();" style="width:100%;padding:12px 20px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;">
            Önbelleği Sıfırla & Paneli Yeniden Aç
          </button>
        </div>
      </div>
    `;
  }
}
