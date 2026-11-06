import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Check,
  Save,
  ExternalLink,
  Copy,
  Eye,
  Sparkles,
  Image,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Palette,
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Users,
  Trophy,
  Activity,
  QrCode,
  X,
  Share2,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  Layout,
  Award,
} from 'lucide-react';
import {
  ClubWebsiteConfig,
  WebsiteBranchItem,
  WebsiteCoachItem,
  WebsiteGalleryItem,
  WebsiteLayoutTheme,
  BranchFigureKey,
} from '../../../types/websiteTypes';
import {
  getStoredWebsiteConfig,
  saveWebsiteConfig,
  fetchWebsiteConfigFromFirestore,
  DEFAULT_WEBSITE_CONFIG,
} from '../../../services/clubWebsiteService';
import { PublicClubWebsite } from '../../website/PublicClubWebsite';
import {
  BranchVisualFigure,
  BRANCH_FIGURE_CATALOG,
  detectBranchFigure,
} from '../../website/BranchVisualFigure';

interface ClubWebsiteBuilderViewProps {
  onToast?: (msg: string) => void;
  onLogout?: () => void;
}

type BuilderTab = 'genel' | 'gorunum' | 'galeri' | 'branslar' | 'kadro' | 'iletisim' | 'onizleme';

export const ClubWebsiteBuilderView: React.FC<ClubWebsiteBuilderViewProps> = ({ onToast }) => {
  const [config, setConfig] = useState<ClubWebsiteConfig>(() => getStoredWebsiteConfig());
  const [activeTab, setActiveTab] = useState<BuilderTab>('genel');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullScreenPreview, setIsFullScreenPreview] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // File Upload Refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const coachInputRef = useRef<HTMLInputElement>(null);

  // Modals for adding items
  const [editingBranch, setEditingBranch] = useState<WebsiteBranchItem | null>(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  const [editingCoach, setEditingCoach] = useState<WebsiteCoachItem | null>(null);
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);

  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryCat, setNewGalleryCat] = useState<'Antrenman' | 'Maç & Turnuva' | 'Tesis' | 'Etkinlik'>('Antrenman');

  // Load from Firestore on mount
  useEffect(() => {
    fetchWebsiteConfigFromFirestore().then((fetched) => {
      if (fetched) {
        setConfig(fetched);
      }
    });
  }, []);

  const showNotification = (msg: string) => {
    if (onToast) onToast(msg);
  };

  const handleSave = async (overrideConfig?: ClubWebsiteConfig) => {
    const toSave = overrideConfig || config;
    setIsSaving(true);
    try {
      await saveWebsiteConfig(toSave);
      showNotification('Web sitesi ayarları ve içerikler başarıyla kaydedildi & yayınlandı!');
    } catch (err) {
      console.error(err);
      showNotification('Kayıt sırasında bir sorun oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const fullDomain = config.customDomain || `${config.subdomain}.sportsfly.com.tr`;

  const copyUrlToClipboard = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(`https://${fullDomain}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      showNotification(`Web sitesi adresi panoya kopyalandı: https://${fullDomain}`);
    }
  };

  // Upload handler helper
  const handleImageFile = (file: File, callback: (base64: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir görsel dosyası seçin (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('Görsel boyutu en fazla 4MB olmalıdır.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      callback(result);
    };
    reader.readAsDataURL(file);
  };

  // Branch CRUD
  const handleSaveBranch = () => {
    if (!editingBranch || !editingBranch.name.trim()) return;
    let updated: WebsiteBranchItem[];
    if (config.branches.some((b) => b.id === editingBranch.id)) {
      updated = config.branches.map((b) => (b.id === editingBranch.id ? editingBranch : b));
    } else {
      updated = [...config.branches, editingBranch];
    }
    const newCfg = { ...config, branches: updated };
    setConfig(newCfg);
    setIsBranchModalOpen(false);
    setEditingBranch(null);
    handleSave(newCfg);
  };

  const handleDeleteBranch = (id: string) => {
    const updated = config.branches.filter((b) => b.id !== id);
    const newCfg = { ...config, branches: updated };
    setConfig(newCfg);
    handleSave(newCfg);
  };

  // Coach CRUD
  const handleSaveCoach = () => {
    if (!editingCoach || !editingCoach.name.trim()) return;
    let updated: WebsiteCoachItem[];
    if (config.coaches.some((c) => c.id === editingCoach.id)) {
      updated = config.coaches.map((c) => (c.id === editingCoach.id ? editingCoach : c));
    } else {
      updated = [...config.coaches, editingCoach];
    }
    const newCfg = { ...config, coaches: updated };
    setConfig(newCfg);
    setIsCoachModalOpen(false);
    setEditingCoach(null);
    handleSave(newCfg);
  };

  const handleDeleteCoach = (id: string) => {
    const updated = config.coaches.filter((c) => c.id !== id);
    const newCfg = { ...config, coaches: updated };
    setConfig(newCfg);
    handleSave(newCfg);
  };

  // Gallery CRUD
  const handleAddGalleryPhoto = (url: string) => {
    const newItem: WebsiteGalleryItem = {
      id: `g-${Date.now()}`,
      url,
      title: newGalleryTitle.trim() || 'Spor Okulu Faaliyeti',
      category: newGalleryCat,
    };
    const newCfg = { ...config, gallery: [newItem, ...config.gallery] };
    setConfig(newCfg);
    setNewGalleryTitle('');
    handleSave(newCfg);
  };

  const handleDeleteGallery = (id: string) => {
    const updated = config.gallery.filter((g) => g.id !== id);
    const newCfg = { ...config, gallery: updated };
    setConfig(newCfg);
    handleSave(newCfg);
  };

  // 3 Farklı Hazır Renk Şeması ve Düzen Seçeneği (Modern, Klasik, Minimal)
  const readyThemePresets: Array<{
    id: WebsiteLayoutTheme;
    name: string;
    tagline: string;
    badge: string;
    badgeColor: string;
    description: string;
    primaryColor: string;
    secondaryColor: string;
    previewHeaderBg: string;
    previewHeroGrad: string;
    previewCardBg: string;
    previewAccentColor: string;
    highlights: string[];
  }> = [
    {
      id: 'modern',
      name: 'Modern Spor Okulu',
      tagline: 'Dinamik, Canlı & Enerjik',
      badge: 'Popüler & Dinamik',
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800',
      description: 'Cam efektli (glassmorphism) modern kartlar, yuvarlatılmış yumuşak hatlar (rounded-3xl), canlı spor gradyanları ve dinamik aksanlar.',
      primaryColor: '#0284c7', // SportsFly Okyanus Mavisi
      secondaryColor: '#f97316', // Enerjik Turuncu
      previewHeaderBg: 'bg-slate-900 border-b border-slate-800',
      previewHeroGrad: 'from-sky-950 via-slate-900 to-slate-950',
      previewCardBg: 'bg-white/10 backdrop-blur-xs border-white/20',
      previewAccentColor: '#0284c7',
      highlights: ['Glassmorphism Cam Kartlar', 'Yuvarlak Hatlar (rounded-3xl)', 'Okyanus & Turuncu Palet'],
    },
    {
      id: 'classic',
      name: 'Klasik Kulüp & Akademi',
      tagline: 'Resmi, Prestijli & Köklü',
      badge: 'Resmi & Prestijli',
      badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800',
      description: 'Geleneksel köklü spor kulübü kimliği; resmi tescil armaları, altın ve lacivert kurumsal tonlar, şampiyonluk kupaları ve prestijli kulüp mottosu.',
      primaryColor: '#1e3a8a', // Kraliyet Laciverti
      secondaryColor: '#d97706', // Şampiyonluk Altını
      previewHeaderBg: 'bg-blue-950 border-b-2 border-amber-500',
      previewHeroGrad: 'from-blue-950 via-slate-950 to-blue-950',
      previewCardBg: 'bg-amber-500/10 border-amber-500/30',
      previewAccentColor: '#d97706',
      highlights: ['Resmi Kulüp Arması & EST. Tescil', 'Kraliyet Laciverti & Altın', 'Yapılandırılmış Cetvel Çerçevesi'],
    },
    {
      id: 'minimal',
      name: 'Minimal Spor Stüdyosu',
      tagline: 'Sade, Ferah & Hızlı',
      badge: 'Sade & Yüksek Dönüşüm',
      badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
      description: 'İsviçre minimalist spor stüdyosu tarzı; ferah beyaz alanlar, yüksek kontrastlı monokrom tipografi, ince hatlar ve elektrik zümrüt aksanıyla doğrudan kayıt odaklı.',
      primaryColor: '#0f172a', // Obsidiyen Siyah
      secondaryColor: '#10b981', // Elektrik Zümrüt
      previewHeaderBg: 'bg-slate-950 border-b border-slate-800',
      previewHeroGrad: 'from-slate-950 via-slate-900 to-black',
      previewCardBg: 'bg-slate-900 border-slate-800',
      previewAccentColor: '#10b981',
      highlights: ['Monokrom & Zümrüt Yeşili', 'Sade, İnce & Keskin Çizgiler', 'Hızlı Ön Kayıt Dönüşümü'],
    },
  ];

  const handleApplyThemePreset = (preset: (typeof readyThemePresets)[0]) => {
    const updated: ClubWebsiteConfig = {
      ...config,
      layoutTheme: preset.id,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
    };
    setConfig(updated);
    handleSave(updated);
    showNotification(`"${preset.name}" tasarımı ve hazır renk şeması başarıyla uygulandı!`);
  };

  // Preset Color Palettes
  const colorPresets = [
    { name: 'SportsFly Okyanus', primary: '#0284c7', secondary: '#f97316' },
    { name: 'Kraliyet Mavisi', primary: '#1d4ed8', secondary: '#e11d48' },
    { name: 'Zümrüt Şampiyon', primary: '#059669', secondary: '#d97706' },
    { name: 'Ateş & Güç', primary: '#ea580c', secondary: '#0284c7' },
    { name: 'Gece Moru', primary: '#7c3aed', secondary: '#ec4899' },
    { name: 'Kırmızı Dinamik', primary: '#dc2626', secondary: '#2563eb' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Card: Subdomain Status & Actions */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex items-center justify-center shrink-0 shadow-lg text-sky-400">
              <Globe className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider">
                  SportsFly Web Sitesi Entegrasyonu
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{config.isPublished ? 'Web Sitesi Canlıda' : 'Taslak Modunda'}</span>
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white truncate">
                {config.siteTitle || 'Kulüp Web Sitesi Portalı'}
              </h1>

              {/* Subdomain Address Link */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 font-mono text-xs sm:text-sm font-bold text-sky-300 shadow-inner">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>https://{fullDomain}</span>
                </div>

                <button
                  onClick={copyUrlToClipboard}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Adresi Kopyala"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">QR Kod</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsFullScreenPreview(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Eye className="w-4 h-4 text-sky-400" />
              <span>Siteyi Canlı Önizle</span>
            </button>

            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Kaydediliyor...' : 'Yayınla & Kaydet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold">
        {[
          { key: 'genel', label: '1. Alan Adı & Yayın', icon: Globe },
          { key: 'gorunum', label: '2. Tasarım & Renk Şemaları', icon: Palette },
          { key: 'galeri', label: '3. Spor Okulu Galerisi', icon: Image },
          { key: 'branslar', label: '4. Branşlar & Saatler', icon: Trophy },
          { key: 'kadro', label: '5. Eğitmen Kadrosu', icon: Users },
          { key: 'iletisim', label: '6. İletişim & Harita', icon: Phone },
          { key: 'onizleme', label: '7. Cihaz Simülatörü', icon: Laptop },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as BuilderTab)}
              className={`py-3 px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Genel & Yayın Ayarları */}
      {activeTab === 'genel' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-sky-600" />
              <span>Web Sitesi Adresi &amp; Yayın Durumu</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kulübünüzün internet adresini ve yayın tercihlerini yapılandırın.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subdomain Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Kulüp Web Adresi *
              </label>
              <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-sky-500">
                <input
                  type="text"
                  value={config.subdomain}
                  onChange={(e) => {
                    const clean = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '')
                      .replace(/-+/g, '-');
                    setConfig({ ...config, subdomain: clean });
                  }}
                  placeholder="kulup-adi"
                  className="flex-1 px-3.5 py-3 bg-transparent text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <span className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold select-none border-l border-slate-300 dark:border-slate-600">
                  .sportsfly.com.tr
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Örnek: <strong>atasehir-basketbol</strong>.sportsfly.com.tr (Türkçe karaktersiz, küçük harf ve tire kullanınız).
              </p>
            </div>

            {/* Custom Domain Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Özel Alan Adı Bağlama (İsteğe Bağlı)
              </label>
              <input
                type="text"
                value={config.customDomain || ''}
                onChange={(e) => setConfig({ ...config, customDomain: e.target.value.toLowerCase().trim() })}
                placeholder="Örn: www.atasehirspor.com"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-400">
                Kendi aldığınız alan adını CNAME ile <code className="text-sky-500">cname.sportsfly.com.tr</code> adresine yönlendirerek kullanabilirsiniz.
              </p>
            </div>

            {/* Site Title */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Web Sitesi Başlığı (Kulüp Adı) *
              </label>
              <input
                type="text"
                value={config.siteTitle}
                onChange={(e) => setConfig({ ...config, siteTitle: e.target.value })}
                placeholder="Ataşehir Spor Kulübü & Akademi"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Kulüp Sloganı / Karşılama Cümlesi
              </label>
              <input
                type="text"
                value={config.tagline}
                onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                placeholder="Geleceğin Şampiyonlarını Yetiştiriyoruz"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Publishing Switch & Feature Toggles */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Web Sitesi Yayın Durumu</h4>
                <p className="text-[11px] text-slate-500">Site internete açık olsun mu?</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isPublished}
                  onChange={(e) => setConfig({ ...config, isPublished: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Online Ön Kayıt Formu</h4>
                <p className="text-[11px] text-slate-500">Sitede veli başvuru formu aktif</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.features?.showOnlineRegistration}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      features: { ...config.features, showOnlineRegistration: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Üst Kayan Duyuru Çubuğu</h4>
                <p className="text-[11px] text-slate-500">Önemli duyuru bandı</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.features?.showAnnouncementBar}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      features: { ...config.features, showAnnouncementBar: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
              </label>
            </div>
          </div>

          {/* Announcement text input if enabled */}
          {config.features?.showAnnouncementBar && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Duyuru Çubuğu Metni
              </label>
              <input
                type="text"
                value={config.features.announcementText || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    features: { ...config.features, announcementText: e.target.value },
                  })
                }
                placeholder="Örn: 📢 2026-2027 Kış Dönemi Erken Kayıt Avantajları Başladı!"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
              />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Logo, Renkler & Marka */}
      {activeTab === 'gorunum' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-sky-600" />
                <span>Hazır Tasarımlar, Kurumsal Renkler &amp; Marka Kimliği</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Modern, Klasik veya Minimal düzen seçeneklerinden birini seçerek sitenizi anında şekillendirin ve önizleyin.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFullScreenPreview(true)}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer self-start sm:self-auto transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Canlı Sitede Gör</span>
            </button>
          </div>

          {/* 3 HAZIR DÜZEN VE RENK ŞEMASI SEÇENEĞİ (Modern, Klasik, Minimal) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layout className="w-4 h-4 text-sky-600" />
                  <span>3 Farklı Hazır Tasarım &amp; Düzen Seçeneği</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kulübünüze uygun düzeni tıklayarak anında seçebilir, renk şemasını ve bileşen yapısını aktifleştirebilirsiniz.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {readyThemePresets.map((theme) => {
                const isCurrentActive = (config.layoutTheme || 'modern') === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => handleApplyThemePreset(theme)}
                    className={`rounded-3xl border-2 p-5 flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                      isCurrentActive
                        ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 shadow-lg ring-2 ring-sky-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Badge Row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${theme.badgeColor}`}>
                          {theme.badge}
                        </span>
                        {isCurrentActive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white flex items-center gap-1 shadow-xs">
                            <Check className="w-3 h-3" />
                            <span>Aktif Tasarım</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                            Seçmek için tıkla
                          </span>
                        )}
                      </div>

                      {/* Visual Mini Mockup Preview Window */}
                      <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 text-white shadow-inner mb-4 select-none">
                        {/* Mini Navbar */}
                        <div className={`px-3 py-2 flex items-center justify-between text-[9px] font-bold ${theme.previewHeaderBg}`}>
                          <div className="flex items-center gap-1.5 truncate">
                            <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center shrink-0">
                              {theme.id === 'classic' ? '🏆' : theme.id === 'minimal' ? '⚡' : '⚽'}
                            </div>
                            <span className="truncate">{theme.name}</span>
                          </div>
                          <div
                            style={{ backgroundColor: theme.primaryColor }}
                            className="px-2 py-0.5 rounded text-[8px] text-white shrink-0 font-extrabold"
                          >
                            Ön Kayıt
                          </div>
                        </div>

                        {/* Mini Hero */}
                        <div className={`p-4 bg-gradient-to-br ${theme.previewHeroGrad} text-center space-y-2`}>
                          <div
                            style={{ borderColor: `${theme.secondaryColor}60` }}
                            className="inline-block px-2 py-0.5 rounded-full text-[8px] font-mono font-bold bg-white/10 border text-slate-200"
                          >
                            {theme.id === 'classic'
                              ? 'FEDERASYON TESCİLLİ KULÜP'
                              : theme.id === 'minimal'
                              ? '[ 2026 AÇIK KONTENJAN ]'
                              : '2026 SPOR OKULU KAYITLARI'}
                          </div>
                          <div className="text-[12px] font-black tracking-tight leading-snug line-clamp-1 text-white">
                            {theme.tagline}
                          </div>
                          <div className="flex items-center justify-center gap-1.5 pt-1">
                            <div
                              style={{ backgroundColor: theme.secondaryColor }}
                              className="px-2 py-0.5 rounded text-[8px] font-bold text-white shadow-xs"
                            >
                              Deneme Başvurusu
                            </div>
                            <div className="px-2 py-0.5 rounded bg-white/10 text-[8px] text-slate-300 border border-white/20">
                              Branşlar
                            </div>
                          </div>
                        </div>

                        {/* Mini Cards Strip */}
                        <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
                          <div className={`flex-1 p-1.5 rounded-lg text-left ${theme.previewCardBg} flex items-center gap-1.5 overflow-hidden`}>
                            <BranchVisualFigure
                              figureKey="basketbol"
                              layoutTheme={theme.id}
                              primaryColor={theme.primaryColor}
                              secondaryColor={theme.secondaryColor}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="text-[9px] font-black text-slate-200 truncate">Basketbol</div>
                              <div className="text-[7px] text-slate-400 truncate">U8 - U14 Yaş</div>
                            </div>
                          </div>
                          <div className={`flex-1 p-1.5 rounded-lg text-left ${theme.previewCardBg} flex items-center gap-1.5 overflow-hidden`}>
                            <BranchVisualFigure
                              figureKey="voleybol"
                              layoutTheme={theme.id}
                              primaryColor={theme.primaryColor}
                              secondaryColor={theme.secondaryColor}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="text-[9px] font-black text-slate-200 truncate">Voleybol</div>
                              <div className="text-[7px] text-slate-400 truncate">Kız &amp; Erkek</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Title & Tagline & Description */}
                      <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                        {theme.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {theme.description}
                      </p>

                      {/* Style Highlights */}
                      <div className="mt-3.5 space-y-1.5">
                        {theme.highlights.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      {/* Color Palette Swatches */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">Hazır Renkler:</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5" title="Birincil Renk">
                            <div className="w-5 h-5 rounded-full shadow-xs border border-white" style={{ backgroundColor: theme.primaryColor }} />
                            <span className="text-[10px] font-mono text-slate-500 font-bold">{theme.primaryColor}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title="İkincil / Eylem Rengi">
                            <div className="w-5 h-5 rounded-full shadow-xs border border-white" style={{ backgroundColor: theme.secondaryColor }} />
                            <span className="text-[10px] font-mono text-slate-500 font-bold">{theme.secondaryColor}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyThemePreset(theme);
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          isCurrentActive
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                        }`}
                      >
                        {isCurrentActive ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Seçili Tasarım</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Bu Tasarımı Uygula</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCurrentActive) {
                            handleApplyThemePreset(theme);
                          }
                          setIsFullScreenPreview(true);
                        }}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        title="Bu Tasarımı Tam Ekranda Önizle"
                      >
                        <Eye className="w-4 h-4 text-sky-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo Upload Box */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span>Kulüp Resmi Logosu</span>
              </h3>

              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-white p-2 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Trophy className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageFile(file, (base64) => {
                          const newCfg = { ...config, logoUrl: base64 };
                          setConfig(newCfg);
                          handleSave(newCfg);
                        });
                      }
                    }}
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Logo Görseli Yükle</span>
                  </button>
                  {config.logoUrl && (
                    <button
                      onClick={() => {
                        const newCfg = { ...config, logoUrl: '' };
                        setConfig(newCfg);
                        handleSave(newCfg);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors block cursor-pointer"
                    >
                      Logoyu Kaldır
                    </button>
                  )}
                  <p className="text-[11px] text-slate-400">PNG (şeffaf), SVG veya JPG. En fazla 4MB.</p>
                </div>
              </div>
            </div>

            {/* Hero Background Banner */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Image className="w-4 h-4 text-sky-600" />
                <span>Anasayfa Hero Karşılama Görseli</span>
              </h3>

              <div className="h-24 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700 bg-slate-200">
                <img src={config.heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageFile(file, (base64) => {
                          const newCfg = { ...config, heroImageUrl: base64 };
                          setConfig(newCfg);
                          handleSave(newCfg);
                        });
                      }
                    }}
                  />
                  <button
                    onClick={() => heroInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-900 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-600" />
                    <span>Görseli Değiştir</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">Geniş açılı spor salonu, antrenman veya takım fotoğrafı önerilir (1920x1080).</p>
            </div>
          </div>

          {/* Color Palettes Presets */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Hazır Kurumsal Renk Temaları
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {colorPresets.map((palette) => {
                const isSelected = config.primaryColor === palette.primary && config.secondaryColor === palette.secondary;
                return (
                  <button
                    key={palette.name}
                    onClick={() => {
                      const newCfg = { ...config, primaryColor: palette.primary, secondaryColor: palette.secondary };
                      setConfig(newCfg);
                      handleSave(newCfg);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-5 h-5 rounded-full shadow-xs" style={{ backgroundColor: palette.primary }} />
                      <div className="w-5 h-5 rounded-full shadow-xs" style={{ backgroundColor: palette.secondary }} />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{palette.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Hex Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Özel Birincil Renk (Ana Butonlar &amp; Başlıklar)</span>
                  <span className="text-xs font-mono font-bold text-slate-500">{config.primaryColor}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Özel İkincil Renk (Vurgu &amp; Rozetler)</span>
                  <span className="text-xs font-mono font-bold text-slate-500">{config.secondaryColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* About us text */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Kulüp Hakkında Açıklaması
            </label>
            <textarea
              rows={4}
              value={config.aboutText}
              onChange={(e) => setConfig({ ...config, aboutText: e.target.value })}
              className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Görsel Ayarları Kaydet</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Spor Okulu Galerisi */}
      {activeTab === 'galeri' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Image className="w-5 h-5 text-sky-600" />
                <span>Spor Okulu Tesis &amp; Antrenman Galerisi ({config.gallery.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Velilerin ve öğrencilerin görebileceği antrenman ve tesis fotoğraflarını yönetin.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageFile(file, (base64) => {
                      handleAddGalleryPhoto(base64);
                    });
                  }
                }}
              />
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Fotoğraf Yükle</span>
              </button>
            </div>
          </div>

          {/* Quick upload input row for title & category */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Yüklenecek Fotoğraf Başlığı
              </label>
              <input
                type="text"
                value={newGalleryTitle}
                onChange={(e) => setNewGalleryTitle(e.target.value)}
                placeholder="Örn: U12 Takımımız Isınma Antrenmanı"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Kategori
              </label>
              <select
                value={newGalleryCat}
                onChange={(e) => setNewGalleryCat(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="Antrenman">Antrenman</option>
                <option value="Maç & Turnuva">Maç &amp; Turnuva</option>
                <option value="Tesis">Tesis</option>
                <option value="Etkinlik">Etkinlik</option>
              </select>
            </div>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {config.gallery.map((photo) => (
              <div
                key={photo.id}
                className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-sm"
              >
                <div className="h-44 w-full overflow-hidden">
                  <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 block">
                      {photo.category || 'Galeri'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {photo.title}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleDeleteGallery(photo.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                    title="Fotoğrafı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Branşlar & Antrenman Grupları */}
      {activeTab === 'branslar' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-sky-600" />
                <span>Spor Okulu Branşları &amp; Grupları ({config.branches.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sitede sergilenen spor branşlarını, yaş sınırlarını ve antrenman gün/saatlerini yönetin.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingBranch({
                  id: `b-${Date.now()}`,
                  name: '',
                  ageGroup: '7 - 14 Yaş',
                  schedule: 'Hafta Sonu: 10:00 - 12:00',
                  description: 'Temel teknik, koordinasyon ve oyun becerileri eğitimi.',
                  fee: '2.500 ₺ / Ay',
                  isActive: true,
                });
                setIsBranchModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Branş Ekle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.branches.map((branch) => (
              <div
                key={branch.id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <BranchVisualFigure
                        figureKey={branch.figureKey}
                        branchName={branch.name}
                        layoutTheme={config.layoutTheme}
                        primaryColor={config.primaryColor}
                        secondaryColor={config.secondaryColor}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="font-black text-base text-slate-900 dark:text-white truncate">{branch.name}</h3>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {branch.ageGroup}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-black text-sky-600 dark:text-sky-400">{branch.fee}</span>
                      {branch.badge && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                          {branch.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 space-y-0.5">
                    <div>Antrenmanlar: <strong className="text-slate-700 dark:text-slate-300">{branch.schedule}</strong></div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {branch.description}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                  <button
                    onClick={() => {
                      setEditingBranch(branch);
                      setIsBranchModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-sky-500" />
                    <span>Düzenle</span>
                  </button>
                  <button
                    onClick={() => handleDeleteBranch(branch.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                    title="Branşı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Eğitmen Kadrosu */}
      {activeTab === 'kadro' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                <span>Antrenör &amp; Eğitmen Kadrosu ({config.coaches.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kulübünüzün antrenör kadrosunu, deneyimlerini ve biyografilerini yönetin.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingCoach({
                  id: `c-${Date.now()}`,
                  name: '',
                  role: 'Antrenör',
                  experience: '5 Yıl Deneyim',
                  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                  bio: 'Sporcularımızın fiziksel ve pedagojik gelişimini desteklemektedir.',
                });
                setIsCoachModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Antrenör Ekle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {config.coaches.map((coach) => (
              <div
                key={coach.id}
                className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col justify-between text-center shadow-2xs"
              >
                <div>
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md mb-3 bg-slate-200">
                    <img src={coach.photoUrl} alt={coach.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{coach.name}</h3>
                  <div className="text-xs font-bold text-sky-600 mt-0.5">{coach.role}</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">
                    {coach.bio}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                  <button
                    onClick={() => {
                      setEditingCoach(coach);
                      setIsCoachModalOpen(true);
                    }}
                    className="px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-sky-500" />
                    <span>Düzenle</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCoach(coach.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Antrenörü Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: İletişim, Konum & Sosyal Medya */}
      {activeTab === 'iletisim' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-sky-600" />
              <span>İletişim Bilgileri, Adres &amp; Sosyal Medya</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Velilerin sizinle iletişime geçeceği telefon, WhatsApp, adres ve sosyal medya hesapları.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Kulüp Telefon Numarası
              </label>
              <input
                type="text"
                value={config.contact.phone}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, phone: e.target.value } })
                }
                placeholder="Örn: 0216 850 1907"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                WhatsApp Destek Hattı Numarası (Ülke kodu ile, başında + olmadan)
              </label>
              <input
                type="text"
                value={config.contact.whatsapp}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, whatsapp: e.target.value.replace(/[^0-9]/g, '') } })
                }
                placeholder="Örn: 905321234567"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Resmi E-Posta Adresi
              </label>
              <input
                type="email"
                value={config.contact.email}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, email: e.target.value } })
                }
                placeholder="bilgi@kulup.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Çalışma &amp; Antrenman Saatleri
              </label>
              <input
                type="text"
                value={config.contact.workingHours}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, workingHours: e.target.value } })
                }
                placeholder="Hafta içi: 09:00 - 19:30 | Hafta sonu: 08:30 - 18:00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Açık Tesis Adresi (Google Harita &amp; Yol Tarifi İçin)
              </label>
              <input
                type="text"
                value={config.contact.address}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, address: e.target.value } })
                }
                placeholder="Atatürk Mahallesi, Spor Caddesi No: 12, Ataşehir, İstanbul"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Sosyal Medya Hesapları
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-pink-600 shrink-0" />
                <input
                  type="text"
                  value={config.social?.instagram || ''}
                  onChange={(e) =>
                    setConfig({ ...config, social: { ...config.social, instagram: e.target.value } })
                  }
                  placeholder="https://instagram.com/kulubunuz"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>

              <div className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-600 shrink-0" />
                <input
                  type="text"
                  value={config.social?.youtube || ''}
                  onChange={(e) =>
                    setConfig({ ...config, social: { ...config.social, youtube: e.target.value } })
                  }
                  placeholder="https://youtube.com/@kulubunuz"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>İletişim Bilgilerini Kaydet</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 7: Cihaz Simülatörü & Canlı Önizleme */}
      {activeTab === 'onizleme' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Cihaz Modu:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'desktop' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-2xs' : 'text-slate-500'
                  }`}
                  title="Masaüstü Görünüm"
                >
                  <Laptop className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'tablet' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-2xs' : 'text-slate-500'
                  }`}
                  title="Tablet Görünüm"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'mobile' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-2xs' : 'text-slate-500'
                  }`}
                  title="Mobil Görünüm"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsFullScreenPreview(true)}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Tam Ekranda Aç</span>
            </button>
          </div>

          {/* Simulated Frame */}
          <div className="flex justify-center bg-slate-200 dark:bg-slate-950 p-4 sm:p-8 rounded-3xl overflow-x-auto min-h-[600px]">
            <div
              className={`transition-all duration-300 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-white dark:bg-slate-900 ${
                previewDevice === 'mobile'
                  ? 'w-[375px] max-h-[750px] overflow-y-auto'
                  : previewDevice === 'tablet'
                  ? 'w-[768px] max-h-[850px] overflow-y-auto'
                  : 'w-full max-w-6xl max-h-[850px] overflow-y-auto'
              }`}
            >
              <PublicClubWebsite config={config} />
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN PREVIEW MODAL */}
      {isFullScreenPreview && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-y-auto">
          <PublicClubWebsite
            config={config}
            isStandalone={true}
            onClose={() => setIsFullScreenPreview(false)}
          />
        </div>
      )}

      {/* QR CODE MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Kulüp Web Sitesi QR Kodu
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Velilerin salon girişinde cep telefonlarıyla okutup web sitenize ve başvuru formunuza ulaşması için:
            </p>

            <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 inline-block shadow-inner mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://${fullDomain}`)}`}
                alt="QR Kod"
                className="w-44 h-44 object-contain mx-auto"
              />
            </div>

            <div className="font-mono text-xs font-bold text-sky-600">
              https://{fullDomain}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* BRANCH EDIT/ADD MODAL */}
      {isBranchModalOpen && editingBranch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingBranch.name ? 'Branş Bilgilerini Düzenle' : 'Yeni Spor Branşı Ekle'}
              </h3>
              <button onClick={() => setIsBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Branş Adı *</label>
                <input
                  type="text"
                  value={editingBranch.name}
                  onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                  placeholder="Örn: Basketbol Okulu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Spor Dalı Figürü &amp; Görsel Teması
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {BRANCH_FIGURE_CATALOG.map((item) => {
                    const isSelected = (editingBranch.figureKey || detectBranchFigure(editingBranch.name)) === item.key;
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => setEditingBranch({ ...editingBranch, figureKey: item.key })}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <BranchVisualFigure
                          figureKey={item.key}
                          layoutTheme={config.layoutTheme}
                          primaryColor={config.primaryColor}
                          secondaryColor={config.secondaryColor}
                          size="sm"
                        />
                        <span className="text-[10px] font-black leading-tight line-clamp-1">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Seçilen temaya ({config.layoutTheme === 'classic' ? 'Klasik Arma' : config.layoutTheme === 'minimal' ? 'Minimal Neon' : 'Modern Aura'}) göre sitenizde otomatik adapte olur.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Yaş Grubu</label>
                  <input
                    type="text"
                    value={editingBranch.ageGroup}
                    onChange={(e) => setEditingBranch({ ...editingBranch, ageGroup: e.target.value })}
                    placeholder="6 - 15 Yaş"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Aylık Aidat</label>
                  <input
                    type="text"
                    value={editingBranch.fee || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, fee: e.target.value })}
                    placeholder="2.500 ₺ / Ay"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Gün &amp; Saatler</label>
                <input
                  type="text"
                  value={editingBranch.schedule}
                  onChange={(e) => setEditingBranch({ ...editingBranch, schedule: e.target.value })}
                  placeholder="Cumartesi & Pazar: 10:00 - 12:00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  value={editingBranch.description}
                  onChange={(e) => setEditingBranch({ ...editingBranch, description: e.target.value })}
                  placeholder="Antrenman içeriği, hedefler ve temel beceriler."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSaveBranch}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COACH EDIT/ADD MODAL */}
      {isCoachModalOpen && editingCoach && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingCoach.name ? 'Antrenör Bilgilerini Düzenle' : 'Yeni Antrenör Ekle'}
              </h3>
              <button onClick={() => setIsCoachModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ad Soyad *</label>
                <input
                  type="text"
                  value={editingCoach.name}
                  onChange={(e) => setEditingCoach({ ...editingCoach, name: e.target.value })}
                  placeholder="Örn: Caner Erkin"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Unvan / Branş</label>
                  <input
                    type="text"
                    value={editingCoach.role}
                    onChange={(e) => setEditingCoach({ ...editingCoach, role: e.target.value })}
                    placeholder="Baş Antrenör"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deneyim</label>
                  <input
                    type="text"
                    value={editingCoach.experience || ''}
                    onChange={(e) => setEditingCoach({ ...editingCoach, experience: e.target.value })}
                    placeholder="8 Yıl · 2. Kademe"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Fotoğraf URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingCoach.photoUrl}
                    onChange={(e) => setEditingCoach({ ...editingCoach, photoUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  />
                  <input
                    ref={coachInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageFile(file, (base64) => {
                          setEditingCoach({ ...editingCoach, photoUrl: base64 });
                        });
                      }
                    }}
                  />
                  <button
                    onClick={() => coachInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Yükle
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Biyografi &amp; Başarılar</label>
                <textarea
                  rows={2}
                  value={editingCoach.bio}
                  onChange={(e) => setEditingCoach({ ...editingCoach, bio: e.target.value })}
                  placeholder="Kariyer geçmişi, uzmanlık alanları ve mezuniyet bilgisi."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsCoachModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSaveCoach}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
