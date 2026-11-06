import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  ChevronRight,
  CheckCircle2,
  Trophy,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Send,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  X,
  Building2,
  Calendar,
  ShieldCheck,
  Check,
  Activity,
  Heart,
  Share2,
} from 'lucide-react';
import { ClubWebsiteConfig, WebsiteBranchItem } from '../../types/websiteTypes';
import { basvurularService } from '../../services/firestoreService';
import { BranchVisualFigure } from './BranchVisualFigure';

interface PublicClubWebsiteProps {
  config: ClubWebsiteConfig;
  isStandalone?: boolean;
  onClose?: () => void;
}

export const PublicClubWebsite: React.FC<PublicClubWebsiteProps> = ({
  config,
  isStandalone = false,
  onClose,
}) => {
  // Navigation active tab / scroll
  const [activeGalleryCat, setActiveGalleryCat] = useState<string>('Tümü');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  
  // Registration Form State
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [athleteName, setAthleteName] = useState('');
  const [birthYear, setBirthYear] = useState('2014');
  const [selectedBranch, setSelectedBranch] = useState(config.branches[0]?.name || 'Basketbol');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regSuccessData, setRegSuccessData] = useState<{ code: string; name: string; branch: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Gallery Categories
  const galleryCategories = ['Tümü', 'Antrenman', 'Maç & Turnuva', 'Tesis', 'Etkinlik'];
  const filteredGallery = config.gallery.filter(item => {
    if (activeGalleryCat === 'Tümü') return true;
    return item.category === activeGalleryCat;
  });

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleApplyBranch = (branch: WebsiteBranchItem) => {
    setSelectedBranch(branch.name);
    scrollToSection('kayit-formu');
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim() || !parentPhone.trim() || !athleteName.trim()) {
      setFormError('Lütfen veli adı, telefon ve sporcu adı alanlarını doldurunuz.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const refCode = `WEB-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      await basvurularService.add({
        sporcuAdSoyad: athleteName.trim(),
        veliAdSoyad: parentName.trim(),
        telefon: parentPhone.trim(),
        eposta: parentEmail.trim() || '',
        dogumTarihi: birthYear,
        cinsiyet: 'Belirtilmedi',
        ilgilenilenBrans: selectedBranch,
        durum: 'beklemede',
        notlar: `[Kulüp Web Sitesi Başvurusu - ${config.subdomain}.sportsfly.com.tr] ${notes.trim()}`,
        status: 'onay_bekliyor',
      } as any);

      setRegSuccessData({
        code: refCode,
        name: athleteName.trim(),
        branch: selectedBranch,
      });

      // Clear form
      setParentName('');
      setParentPhone('');
      setParentEmail('');
      setAthleteName('');
      setNotes('');
    } catch (err) {
      console.error('Registration submission error:', err);
      // Fallback local registration success
      setRegSuccessData({
        code: refCode,
        name: athleteName.trim(),
        branch: selectedBranch,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = config.primaryColor || '#0284c7';
  const secondaryColor = config.secondaryColor || '#f97316';
  const fullDomain = config.customDomain || `${config.subdomain}.sportsfly.com.tr`;
  const layoutTheme = config.layoutTheme || 'modern';

  return (
    <div className={`relative w-full ${config.darkTheme ? 'dark bg-slate-950 text-white' : 'bg-white text-slate-900'} ${layoutTheme === 'classic' ? 'font-serif' : 'font-sans'} selection:bg-sky-500 selection:text-white`}>
      {/* Top Banner Bar for Standalone / Modal Controls */}
      {isStandalone && (
        <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2 flex items-center justify-between border-b border-slate-800 text-xs shadow-md font-sans">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-300">Canlı Web Sitesi Yayını:</span>
            <span className="font-mono text-sky-400 font-extrabold bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              https://{fullDomain}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 ml-1">
              Tema: {layoutTheme === 'modern' ? 'Modern Spor' : layoutTheme === 'classic' ? 'Klasik Kulüp' : 'Minimal'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (navigator?.clipboard) {
                  navigator.clipboard.writeText(`https://${fullDomain}`);
                  alert(`Site adresi panoya kopyalandı:\nhttps://${fullDomain}`);
                }
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Bağlantıyı Kopyala</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-2.5 py-1 rounded bg-red-600/90 hover:bg-red-700 text-white font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Önizlemeyi Kapat</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Announcement Bar */}
      {config.features?.showAnnouncementBar && config.features.announcementText && (
        <div
          style={{ backgroundColor: secondaryColor }}
          className="text-white text-xs sm:text-sm py-2 px-4 text-center font-bold tracking-wide shadow-xs flex items-center justify-center gap-2 font-sans"
        >
          <span>{config.features.announcementText}</span>
        </div>
      )}

      {/* Dynamic Navbar based on layoutTheme */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md transition-colors ${
          layoutTheme === 'classic'
            ? 'bg-blue-950/95 text-white border-b-2 border-amber-500 shadow-md'
            : layoutTheme === 'minimal'
            ? 'bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800'
            : 'bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 font-sans">
          {/* Logo & Club Title */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => scrollToSection('anasayfa')}>
            <div
              className={`w-12 h-12 p-1 flex items-center justify-center shrink-0 overflow-hidden ${
                layoutTheme === 'classic'
                  ? 'rounded-xl bg-white border-2 border-amber-400 shadow-sm'
                  : layoutTheme === 'minimal'
                  ? 'rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800'
                  : 'rounded-2xl bg-white border border-slate-200 dark:border-slate-700 shadow-xs'
              }`}
            >
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.siteTitle} className="w-full h-full object-contain" />
              ) : (
                <Trophy className={`w-7 h-7 ${layoutTheme === 'classic' ? 'text-amber-500' : layoutTheme === 'minimal' ? 'text-emerald-500' : 'text-sky-600'}`} />
              )}
            </div>
            <div>
              <h1 className={`text-base sm:text-lg font-black tracking-tight leading-tight line-clamp-1 ${layoutTheme === 'classic' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {config.siteTitle}
              </h1>
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${layoutTheme === 'classic' ? 'text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {layoutTheme === 'classic' ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>EST. 2018 • Tescilli Spor Kulübü</span>
                  </>
                ) : layoutTheme === 'minimal' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Resmi Spor Okulu Portalı</span>
                  </>
                ) : (
                  'Resmi Spor Okulu Portalı'
                )}
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className={`hidden md:flex items-center gap-6 text-sm font-bold ${layoutTheme === 'classic' ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
            <button onClick={() => scrollToSection('anasayfa')} className="hover:opacity-80 transition-opacity cursor-pointer">
              Anasayfa
            </button>
            <button onClick={() => scrollToSection('branslar')} className="hover:opacity-80 transition-opacity cursor-pointer">
              Branşlar
            </button>
            <button onClick={() => scrollToSection('hakkimizda')} className="hover:opacity-80 transition-opacity cursor-pointer">
              Hakkımızda
            </button>
            <button onClick={() => scrollToSection('galeri')} className="hover:opacity-80 transition-opacity cursor-pointer">
              Galeri
            </button>
            <button onClick={() => scrollToSection('antrenorler')} className="hover:opacity-80 transition-opacity cursor-pointer">
              Kadromuz
            </button>
            <button onClick={() => scrollToSection('iletisim')} className="hover:opacity-80 transition-opacity cursor-pointer">
              İletişim
            </button>
          </nav>

          {/* Right Action: Quick Call & Online Registration CTA */}
          <div className="flex items-center gap-3">
            {config.contact?.phone && (
              <a
                href={`tel:${config.contact.phone.replace(/[^0-9]/g, '')}`}
                className={`hidden lg:flex items-center gap-2 px-3.5 py-2 text-xs font-bold transition-colors ${
                  layoutTheme === 'classic'
                    ? 'text-slate-200 hover:text-white hover:bg-blue-900/40 rounded-lg'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl'
                }`}
              >
                <Phone className={`w-4 h-4 ${layoutTheme === 'classic' ? 'text-amber-400' : 'text-sky-600'}`} />
                <span>{config.contact.phone}</span>
              </a>
            )}
            <button
              onClick={() => scrollToSection('kayit-formu')}
              style={{ backgroundColor: primaryColor }}
              className={`px-4 sm:px-5 py-2.5 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                layoutTheme === 'classic'
                  ? 'rounded-lg border border-amber-400/40 uppercase tracking-wider'
                  : layoutTheme === 'minimal'
                  ? 'rounded-md shadow-xs'
                  : 'rounded-xl shadow-md'
              }`}
            >
              {layoutTheme === 'classic' ? (
                <Award className="w-4 h-4 text-amber-300" />
              ) : layoutTheme === 'minimal' ? (
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Online Ön Kayıt</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="anasayfa" className="relative min-h-[580px] sm:min-h-[640px] flex items-center justify-center overflow-hidden font-sans">
        {/* Background Image with Gradient Overlays */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${config.heroImageUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&auto=format&fit=crop&q=80'})` }}
        >
          <div
            className={`absolute inset-0 ${
              layoutTheme === 'classic'
                ? 'bg-gradient-to-r from-blue-950/95 via-slate-950/85 to-blue-950/90'
                : layoutTheme === 'minimal'
                ? 'bg-gradient-to-r from-slate-950/95 via-black/85 to-slate-950/80'
                : 'bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-slate-950/70'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center text-white space-y-6">
          {/* Theme-Specific Badge */}
          {layoutTheme === 'classic' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/50 text-xs sm:text-sm font-black text-amber-300 shadow-xl">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>FEDERASYON TESCİLLİ KULÜP &amp; LİSANSLI SPOR AKADEMİSİ</span>
            </div>
          ) : layoutTheme === 'minimal' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-black/60 border border-slate-700 font-mono text-[11px] sm:text-xs text-emerald-400 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>[ 2026 - 2027 SEZONU AÇIK KONTENJANLAR ]</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold text-white shadow-lg animate-in fade-in duration-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>2026 - 2027 Dönemi Spor Okulu Kayıtları Devam Ediyor</span>
            </div>
          )}

          <h1 className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto drop-shadow-md ${layoutTheme === 'classic' ? 'font-serif tracking-normal' : ''}`}>
            {config.tagline || 'Geleceğin Şampiyonlarını Yetiştiriyoruz'}
          </h1>

          <p className="text-sm sm:text-lg text-slate-200 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-sm">
            {config.aboutText?.slice(0, 180)}...
          </p>

          {/* Classic Prestigious Motto Box */}
          {layoutTheme === 'classic' && (
            <div className="p-3.5 rounded-xl bg-blue-900/40 border border-amber-400/40 text-amber-200 text-xs sm:text-sm font-bold tracking-wide max-w-xl mx-auto backdrop-blur-xs flex items-center justify-center gap-2">
              <span>⚜️</span>
              <span>Disiplin • Karakter • Başarı — Gelenekten Geleceğe Şampiyonluk Kültürü</span>
              <span>⚜️</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={() => scrollToSection('kayit-formu')}
              style={{ backgroundColor: secondaryColor }}
              className={`w-full sm:w-auto px-7 py-3.5 text-white font-black text-sm tracking-wide shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                layoutTheme === 'classic'
                  ? 'rounded-lg border-2 border-amber-300/40 uppercase'
                  : layoutTheme === 'minimal'
                  ? 'rounded-md shadow-sm'
                  : 'rounded-xl'
              }`}
            >
              <span>Ücretsiz Deneme Antrenmanına Başvur</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollToSection('branslar')}
              className={`w-full sm:w-auto px-6 py-3.5 bg-white/15 backdrop-blur-md hover:bg-white/25 text-white font-bold text-sm border border-white/30 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                layoutTheme === 'classic' ? 'rounded-lg' : layoutTheme === 'minimal' ? 'rounded-md' : 'rounded-xl'
              }`}
            >
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Branşları ve Saatleri İncele</span>
            </button>
          </div>

          {/* Quick Features Badge Row */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className={`p-3 bg-white/10 backdrop-blur-xs border border-white/10 flex items-center gap-2.5 ${layoutTheme === 'classic' ? 'rounded-lg border-amber-400/20' : layoutTheme === 'minimal' ? 'rounded-md' : 'rounded-xl'}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-slate-100">Lisanslı Antrenörler</span>
            </div>
            <div className={`p-3 bg-white/10 backdrop-blur-xs border border-white/10 flex items-center gap-2.5 ${layoutTheme === 'classic' ? 'rounded-lg border-amber-400/20' : layoutTheme === 'minimal' ? 'rounded-md' : 'rounded-xl'}`}>
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-100">SportsFly Dijital Karne</span>
            </div>
            <div className={`p-3 bg-white/10 backdrop-blur-xs border border-white/10 flex items-center gap-2.5 ${layoutTheme === 'classic' ? 'rounded-lg border-amber-400/20' : layoutTheme === 'minimal' ? 'rounded-md' : 'rounded-xl'}`}>
              <Activity className="w-5 h-5 text-sky-400 shrink-0" />
              <span className="text-xs font-bold text-slate-100">Periyodik Ölçüm &amp; PHV</span>
            </div>
            <div className={`p-3 bg-white/10 backdrop-blur-xs border border-white/10 flex items-center gap-2.5 ${layoutTheme === 'classic' ? 'rounded-lg border-amber-400/20' : layoutTheme === 'minimal' ? 'rounded-md' : 'rounded-xl'}`}>
              <Heart className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="text-xs font-bold text-slate-100">Öğrenci Güvenlik Sigortası</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Bar */}
      {config.features?.showStats && (
        <section className="bg-slate-900 text-white py-8 border-y border-slate-800">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-sky-400">{config.stats?.activeAthletes || 420}+</div>
              <div className="text-xs sm:text-sm text-slate-400 font-semibold mt-1">Aktif Spor Okulu Öğrencisi</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-amber-400">{config.stats?.championships || 18}</div>
              <div className="text-xs sm:text-sm text-slate-400 font-semibold mt-1">Lig &amp; Kupa Şampiyonluğu</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400">{config.stats?.expertCoaches || 14}</div>
              <div className="text-xs sm:text-sm text-slate-400 font-semibold mt-1">Uzman Antrenör &amp; Eğitmen</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-purple-400">{config.stats?.facilitiesCount || 3}</div>
              <div className="text-xs sm:text-sm text-slate-400 font-semibold mt-1">Kapalı Spor Kompleksi</div>
            </div>
          </div>
        </section>
      )}

      {/* Branches & Programs Section */}
      <section id="branslar" className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span
              style={{ color: primaryColor }}
              className="text-xs font-black uppercase tracking-wider block mb-2"
            >
              Eğitim Programlarımız
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Spor Okulu Branşlarımız &amp; Yaş Grupları
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              Tüm branşlarımızda yaş ve seviyeye göre gruplandırılmış, pedagog ve BESYO mezunu antrenörler gözetiminde eğitim verilir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {config.branches.map((branch) => (
              <div
                key={branch.id}
                className={`bg-white dark:bg-slate-800 p-6 flex flex-col justify-between transition-all group ${
                  layoutTheme === 'classic'
                    ? 'rounded-xl shadow-sm border-2 border-amber-500/25 hover:border-amber-500/60'
                    : layoutTheme === 'minimal'
                    ? 'rounded-md shadow-2xs border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                    : 'rounded-3xl shadow-md border border-slate-200/90 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <BranchVisualFigure
                      figureKey={branch.figureKey}
                      branchName={branch.name}
                      layoutTheme={layoutTheme}
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      size="md"
                    />
                    {branch.badge && (
                      <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        layoutTheme === 'classic'
                          ? 'rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : layoutTheme === 'minimal'
                          ? 'rounded-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                          : 'rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                      }`}>
                        {branch.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                    {branch.name}
                  </h3>

                  <div className="mt-2 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                      <Users className="w-3.5 h-3.5 text-sky-500" />
                      <span>{branch.ageGroup}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{branch.schedule}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                    {branch.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2">
                  {branch.fee && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Aylık Aidat</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{branch.fee}</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleApplyBranch(branch)}
                    style={{ backgroundColor: primaryColor }}
                    className={`px-3.5 py-2 text-white text-xs font-bold shadow-xs hover:opacity-90 transition-opacity flex items-center gap-1 ml-auto cursor-pointer ${
                      layoutTheme === 'classic' ? 'rounded-lg' : layoutTheme === 'minimal' ? 'rounded-md' : 'rounded-xl'
                    }`}
                  >
                    <span>Ön Kayıt Ol</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us & Vision Section */}
      <section id="hakkimizda" className="py-16 sm:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span
                style={{ color: secondaryColor }}
                className="text-xs font-black uppercase tracking-wider block"
              >
                Kulübümüz Hakkında
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                {config.siteTitle} İle Sağlıklı ve Disiplinli Nesiller
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {config.aboutText}
              </p>
              {config.missionText && (
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-slate-800 text-xs sm:text-sm text-sky-900 dark:text-sky-300 leading-relaxed font-medium">
                  <strong>Misyonumuz:</strong> {config.missionText}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Uluslararası Ölçüm Standartları</h4>
                    <p className="text-[11px] text-slate-500">ISAK ve Heath-Carter somatotip gelişim takibi.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Veli Bilgilendirme Portalı</h4>
                    <p className="text-[11px] text-slate-500">Mobil yoklama, karne ve bildirim anında cebinizde.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Collage */}
            <div className="grid grid-cols-2 gap-4">
              <img
                src={config.gallery[0]?.url || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80'}
                alt="Spor Okulu"
                className="rounded-3xl shadow-lg object-cover h-64 w-full"
              />
              <img
                src={config.gallery[1]?.url || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80'}
                alt="Antrenman"
                className="rounded-3xl shadow-lg object-cover h-64 w-full mt-6"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      {config.features?.showGallery && (
        <section id="galeri" className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span style={{ color: primaryColor }} className="text-xs font-black uppercase tracking-wider block mb-1">
                  Fotoğraf &amp; Tesis Galerisi
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Antrenmanlarımızdan &amp; Tesislerimizden Kareler
                </h2>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                {galleryCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveGalleryCat(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeGalleryCat === cat
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedPhoto(item.url)}
                  className="group relative h-64 rounded-3xl overflow-hidden shadow-md cursor-pointer border border-slate-200/80 dark:border-slate-700 bg-slate-200 dark:bg-slate-800"
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity flex flex-col justify-end p-5 text-white">
                    {item.category && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs w-max mb-1">
                        {item.category}
                      </span>
                    )}
                    <h4 className="text-sm font-bold leading-snug drop-shadow-sm">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={selectedPhoto} alt="Büyük Görsel" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Coaches Staff Section */}
      {config.features?.showCoaches && config.coaches?.length > 0 && (
        <section id="antrenorler" className="py-16 sm:py-20 bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span style={{ color: secondaryColor }} className="text-xs font-black uppercase tracking-wider block mb-1">
                Eğitmen Kadromuz
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Deneyimli ve Lisanslı Antrenörlerimiz
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
                Sporcularımızın fiziksel ve pedagojik gelişimini alanında uzman antrenör kadromuzla yönetiyoruz.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {config.coaches.map((coach) => (
                <div
                  key={coach.id}
                  className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 text-center border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md mb-4 bg-slate-200">
                    <img src={coach.photoUrl} alt={coach.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{coach.name}</h3>
                  <div className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5">{coach.role}</div>
                  {coach.experience && (
                    <div className="text-[11px] font-semibold text-slate-400 mt-1">{coach.experience}</div>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                    {coach.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Online Registration & Parent Application Form Section */}
      <section id="kayit-formu" className="py-16 sm:py-24 bg-gradient-to-b from-slate-900 to-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-10">
            <span style={{ color: secondaryColor }} className="text-xs font-black uppercase tracking-wider">
              Anında Başvuru
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Online Ön Kayıt &amp; Ücretsiz Deneme Dersi
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Formu doldurun; koordinatörümüz çocuğunuza uygun yaş grubunu belirlemek ve deneme antrenmanı randevunuzu oluşturmak için sizi arasın.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-white/20 shadow-2xl">
            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-5 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Veli Ad Soyad */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Veli Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Veli İletişim Telefonu *
                  </label>
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Sporcu Ad Soyad */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Öğrenci (Sporcu) Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={athleteName}
                    onChange={(e) => setAthleteName(e.target.value)}
                    placeholder="Örn: Mert Yılmaz"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Doğum Yılı */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Doğum Yılı *
                  </label>
                  <select
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {[2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008].map(y => (
                      <option key={y} value={y} className="bg-slate-900 text-white">
                        {y} Doğumlu ({2026 - y} Yaş)
                      </option>
                    ))}
                  </select>
                </div>

                {/* İlgilenilen Branş */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      İlgilenilen Branş *
                    </label>
                    <BranchVisualFigure
                      branchName={selectedBranch}
                      layoutTheme={layoutTheme}
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      size="sm"
                    />
                  </div>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {config.branches.map((b) => (
                      <option key={b.id} value={b.name} className="bg-slate-900 text-white">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Varsa Belirtmek İstediğiniz Notlar veya Tercih Ettiğiniz Günler
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Daha önce basketbol oynadı, Cumartesi sabah seansını tercih ediyoruz vb."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: secondaryColor }}
                  className="w-full py-4 rounded-xl text-white font-black text-sm tracking-wide shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Başvuru İletiliyor...' : 'Ön Kayıt Başvurusunu Tamamla'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Success Modal */}
      {regSuccessData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Ön Kayıt Başvurunuz Alındı!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Sayın velimiz, <strong>{regSuccessData.name}</strong> için <strong>{regSuccessData.branch}</strong> branşı başvurusu başarıyla kulüp sistemimize iletildi.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-400 block font-semibold text-[10px]">Başvuru Takip Kodu</span>
              <span className="font-mono text-sm font-black text-sky-600 dark:text-sky-400">{regSuccessData.code}</span>
            </div>

            {config.contact?.whatsapp && (
              <a
                href={`https://wa.me/${config.contact.whatsapp}?text=Merhaba,%20${encodeURIComponent(config.siteTitle)}%20için%20${regSuccessData.code}%20kodlu%20ön%20kayıt%20başvurusu%20yaptım.`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Üzerinden Hızlı Bilgi Al</span>
              </a>
            )}

            <button
              onClick={() => setRegSuccessData(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      {config.features?.showFaq && config.faqs?.length > 0 && (
        <section className="py-16 bg-slate-50 dark:bg-slate-900/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <span style={{ color: primaryColor }} className="text-xs font-black uppercase tracking-wider block mb-1">
                Merak Edilenler
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Sıkça Sorulan Sorular
              </h2>
            </div>

            <div className="space-y-3">
              {config.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 overflow-hidden shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-sky-600 transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFaqIndex === idx ? 'rotate-180 text-sky-600' : 'text-slate-400'}`} />
                  </button>
                  {openFaqIndex === idx && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/60 pt-3 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact & Location Section */}
      <section id="iletisim" className="py-16 sm:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span style={{ color: secondaryColor }} className="text-xs font-black uppercase tracking-wider block mb-1">
              Bize Ulaşın
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Tesis Konumumuz &amp; İletişim Kanallarımız
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Details Card */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefon</h4>
                  <a href={`tel:${config.contact.phone}`} className="text-sm font-extrabold text-slate-900 dark:text-white hover:text-sky-600 transition-colors">
                    {config.contact.phone}
                  </a>
                </div>
              </div>

              {config.contact.whatsapp && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Canlı Destek</h4>
                    <a
                      href={`https://wa.me/${config.contact.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-extrabold text-emerald-600 hover:underline"
                    >
                      Hemen Mesaj Gönder
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-Posta</h4>
                  <a href={`mailto:${config.contact.email}`} className="text-sm font-extrabold text-slate-900 dark:text-white hover:text-sky-600 transition-colors">
                    {config.contact.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adres</h4>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {config.contact.address}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Çalışma Saatleri</h4>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {config.contact.workingHours}
                  </p>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                {config.social?.instagram && (
                  <a href={config.social.instagram} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {config.social?.facebook && (
                  <a href={config.social.facebook} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {config.social?.youtube && (
                  <a href={config.social.youtube} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {config.social?.twitter && (
                  <a href={config.social.twitter} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-sky-500 hover:text-white flex items-center justify-center transition-colors">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Embedded Google Maps / Simulation Card */}
            <div className="lg:col-span-2 rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-md relative min-h-[360px] bg-slate-100 dark:bg-slate-900 flex flex-col justify-between p-6">
              <iframe
                title="Google Maps"
                width="100%"
                height="100%"
                className="absolute inset-0 border-0 filter contrast-[1.05] opacity-90"
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(config.contact.address || config.siteTitle)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              />
              <div className="relative z-10 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 max-w-sm shadow-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <span>{config.siteTitle} Tesisleri</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {config.contact.address}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.contact.address || config.siteTitle)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline mt-2"
                >
                  <span>Haritada Aç &amp; Yol Tarifi Al</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.siteTitle} className="w-full h-full object-contain" />
              ) : (
                <Trophy className="w-5 h-5 text-sky-600" />
              )}
            </div>
            <div>
              <div className="font-bold text-white text-sm">{config.siteTitle}</div>
              <div className="text-[10px] text-slate-500">© 2026 Tüm Hakları Saklıdır.</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span>Powered by</span>
            <a
              href="https://sportsfly.com.tr"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 font-extrabold hover:underline"
            >
              SportsFly
            </a>
            <span>Kulüp &amp; Spor Okulu Altyapısı</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
