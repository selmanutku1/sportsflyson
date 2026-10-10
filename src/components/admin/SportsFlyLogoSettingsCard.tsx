import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SportsFlyLogoSettingsCard: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const [currentLogo, setCurrentLogo] = useState<string>(() => {
    return localStorage.getItem('sportsfly_custom_logo') || '/sportsfly-logo.jpg';
  });
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir görsel dosyası seçiniz.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("Dosya boyutu 3MB'dan küçük olmalıdır.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCurrentLogo(result);
        localStorage.setItem('sportsfly_custom_logo', result);
        window.dispatchEvent(new Event('sportsfly-logo-changed'));
        onToast('SportsFly platform logosu başarıyla güncellendi!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSave = () => {
    if (!urlInput.trim()) return;
    setCurrentLogo(urlInput.trim());
    localStorage.setItem('sportsfly_custom_logo', urlInput.trim());
    window.dispatchEvent(new Event('sportsfly-logo-changed'));
    setUrlInput('');
    onToast('SportsFly platform logosu URL ile güncellendi!');
  };

  const handleReset = () => {
    localStorage.removeItem('sportsfly_custom_logo');
    setCurrentLogo('/sportsfly-logo.jpg');
    window.dispatchEvent(new Event('sportsfly-logo-changed'));
    onToast('SportsFly platform logosu varsayılana sıfırlandı.');
  };

  return (
    <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              SportsFly Platform Logosu Ayarları
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Giriş ekranı, üst menü, kenar çubuğu ve raporlarda kullanılan ana SportsFly logosunu değiştirin.
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
          <span>Varsayılana Sıfırla</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Logo Preview */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 p-3 shadow-md border border-slate-200/80 dark:border-slate-700 flex items-center justify-center mb-3">
            <img src={currentLogo} alt="SportsFly Aktif Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Aktif Platform Logosu</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Tüm sayfalarda anında güncellenir</span>
        </div>

        {/* Upload options */}
        <div className="md:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Bilgisayardan Logo Dosyası Yükle (PNG, JPG, SVG)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Görsel Dosyası Seç ve Yükle</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[11px] font-semibold">VEYA URL GİRİN</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
            <button
              onClick={handleUrlSave}
              disabled={!urlInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              URL Uygula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
