import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Activity,
  Trophy,
  Copy,
  CheckCheck,
  ShieldCheck,
  Phone,
  Mail,
  User,
  MapPin,
  Calendar,
  Layers,
  FileText,
  LogOut,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Eye,
  Archive,
  ArrowRight,
  Info,
  ImagePlus,
  Trash2,
  Plus,
  Check,
  Printer,
  ChevronRight,
  School,
} from 'lucide-react';
import { CompanyIntegrationProfile } from '../../../types';
import {
  SportsFlyLabReport,
  SportsFlyLabArchivedReport,
  UploadedExcelFileRecord,
  SportsFlyLabSchoolBranding,
  getStoredLabExcelHistory,
  getStoredLabArchives,
  downloadBatchSportsFlyLabExcelTemplate,
} from '../../../data/sportsFlyLabData';
import { SportsFlyVectorMark } from '../../SportsFlyLogo';

interface PartnerSchoolItem {
  id: string;
  name: string;
  branchName: string;
  logoDataUrl?: string;
  description?: string;
}

const PARTNER_SCHOOLS_KEY = 'sportsfly_lab_partner_schools_v1';

const DEFAULT_PARTNER_SCHOOLS: PartnerSchoolItem[] = [
  {
    id: 'school-1',
    name: 'Ataşehir Spor Okulları',
    branchName: 'Merkez Kampüs',
    logoDataUrl: '',
    description: 'Basketbol & Cimnastik Gelişim Akademisi',
  },
  {
    id: 'school-2',
    name: 'Kadıköy Basketbol Akademi',
    branchName: 'Kalamış Tesisleri',
    logoDataUrl: '',
    description: 'Altyapı Performans & PHV Tarama Grubu',
  },
  {
    id: 'school-3',
    name: 'Marmara Atletik Kulübü',
    branchName: 'Olimpik Gelişim Merkezi',
    logoDataUrl: '',
    description: 'Fiziksel Uygunluk & Motor Testleri',
  },
];

interface CompanyIntegrationProfileViewProps {
  companyProfile: CompanyIntegrationProfile;
  reports?: SportsFlyLabReport[];
  archivedReports?: SportsFlyLabArchivedReport[];
  schoolBranding?: SportsFlyLabSchoolBranding;
  onUpdateSchoolBranding?: (branding: Partial<SportsFlyLabSchoolBranding>) => void;
  onBackToReports?: () => void;
  onOpenReport?: (reportId: string) => void;
  onOpenBatchExcel?: () => void;
  onOpenArchive?: () => void;
  onLogout?: () => void;
  onToast?: (msg: string) => void;
}

export const CompanyIntegrationProfileView: React.FC<CompanyIntegrationProfileViewProps> = ({
  companyProfile,
  reports = [],
  archivedReports = [],
  schoolBranding,
  onUpdateSchoolBranding,
  onBackToReports,
  onOpenReport,
  onOpenBatchExcel,
  onOpenArchive,
  onLogout,
  onToast,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [excelHistory, setExcelHistory] = useState<UploadedExcelFileRecord[]>(() =>
    getStoredLabExcelHistory()
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Sports School / Club Branding Form States (for the school being analyzed)
  const [targetSchoolName, setTargetSchoolName] = useState(
    schoolBranding?.schoolName || 'Ataşehir Spor Okulları'
  );
  const [targetBranchName, setTargetBranchName] = useState(
    schoolBranding?.branchName || 'Merkez Kampüs'
  );
  const [targetSchoolLogo, setTargetSchoolLogo] = useState(
    schoolBranding?.logoDataUrl || ''
  );
  const schoolLogoFileInputRef = useRef<HTMLInputElement>(null);

  // Partner / Saved Schools List
  const [partnerSchools, setPartnerSchools] = useState<PartnerSchoolItem[]>(() => {
    try {
      const raw = localStorage.getItem(PARTNER_SCHOOLS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PARTNER_SCHOOLS;
  });

  // Keep state synced with schoolBranding prop if it changes externally
  useEffect(() => {
    if (schoolBranding) {
      if (schoolBranding.schoolName) setTargetSchoolName(schoolBranding.schoolName);
      if (schoolBranding.branchName) setTargetBranchName(schoolBranding.branchName);
      if (schoolBranding.logoDataUrl !== undefined) setTargetSchoolLogo(schoolBranding.logoDataUrl);
    }
  }, [schoolBranding]);

  // Keep Excel history synced
  useEffect(() => {
    setExcelHistory(getStoredLabExcelHistory());
  }, []);

  const handleCopyCode = () => {
    if (navigator?.clipboard && companyProfile.accessCode) {
      navigator.clipboard.writeText(companyProfile.accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      if (onToast) onToast(`Geçiş kodu "${companyProfile.accessCode}" panoya kopyalandı.`);
    }
  };

  // Upload Sport School Logo
  const handleUploadTargetSchoolLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir görsel dosyası (PNG, JPG, SVG, WebP) seçiniz.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo görsel boyutu en fazla 2MB olmalıdır.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setTargetSchoolLogo(result);
      if (onUpdateSchoolBranding) {
        onUpdateSchoolBranding({ logoDataUrl: result });
      }
      if (onToast) onToast('Spor okulu logosu yüklendi ve karne üst başlığına uygulandı.');
    };
    reader.readAsDataURL(file);
  };

  // Remove Sport School Logo
  const handleRemoveTargetSchoolLogo = () => {
    setTargetSchoolLogo('');
    if (onUpdateSchoolBranding) {
      onUpdateSchoolBranding({ logoDataUrl: '' });
    }
    if (onToast) onToast('Spor okulu logosu kaldırıldı, varsayılan arma aktif edildi.');
    if (schoolLogoFileInputRef.current) schoolLogoFileInputRef.current.value = '';
  };

  // Apply Sport School Name & Logo to All Report Cards
  const handleApplyTargetSchoolBranding = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetSchoolName.trim()) {
      alert('Lütfen spor okulu / kulüp adını giriniz.');
      return;
    }

    const patch = {
      schoolName: targetSchoolName.trim(),
      branchName: targetBranchName.trim(),
      logoDataUrl: targetSchoolLogo,
    };

    if (onUpdateSchoolBranding) {
      onUpdateSchoolBranding(patch);
    }

    // Save or update in partner schools list
    const existingIdx = partnerSchools.findIndex(
      (s) => s.name.toLowerCase() === targetSchoolName.trim().toLowerCase()
    );
    let updatedPartners: PartnerSchoolItem[];
    if (existingIdx >= 0) {
      updatedPartners = partnerSchools.map((s, idx) =>
        idx === existingIdx
          ? { ...s, branchName: targetBranchName.trim(), logoDataUrl: targetSchoolLogo }
          : s
      );
    } else {
      updatedPartners = [
        {
          id: `school-${Date.now()}`,
          name: targetSchoolName.trim(),
          branchName: targetBranchName.trim(),
          logoDataUrl: targetSchoolLogo,
          description: 'Analiz Yapılan Spor Kulübü',
        },
        ...partnerSchools,
      ];
    }
    setPartnerSchools(updatedPartners);
    try {
      localStorage.setItem(PARTNER_SCHOOLS_KEY, JSON.stringify(updatedPartners));
    } catch (err) {}

    if (onToast) {
      onToast(`"${targetSchoolName}" spor okulu adı ve logosu tüm karnelere başarıyla uygulandı.`);
    }
  };

  // Switch to an existing Partner School with 1-Click
  const handleSelectPartnerSchool = (partner: PartnerSchoolItem) => {
    setTargetSchoolName(partner.name);
    setTargetBranchName(partner.branchName);
    setTargetSchoolLogo(partner.logoDataUrl || '');

    if (onUpdateSchoolBranding) {
      onUpdateSchoolBranding({
        schoolName: partner.name,
        branchName: partner.branchName,
        logoDataUrl: partner.logoDataUrl || '',
      });
    }

    if (onToast) {
      onToast(`"${partner.name}" karne analiz okulu olarak aktif edildi ve başlığa yansıtıldı.`);
    }
  };

  const isClub = companyProfile.companyType === 'spor_kulubu';
  const isSchool = companyProfile.companyType === 'spor_okulu';
  const typeLabel = isClub
    ? 'Spor Kulübü / Altyapı'
    : isSchool
    ? 'Spor Okulu / Akademi'
    : 'Analiz & Performans Değerlendirme Firması';

  const typeBadgeColor = isClub
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    : isSchool
    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800'
    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';

  // Filter created report cards based on search query
  const allCreatedReports = reports.length > 0 ? reports : [];
  const filteredReports = allCreatedReports.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.athleteName.toLowerCase().includes(q) ||
      (r.clubName && r.clubName.toLowerCase().includes(q)) ||
      r.sportBranch.toLowerCase().includes(q)
    );
  });

  // Calculate unique sports clubs / schools analyzed
  const uniqueClubsCount = new Set(
    allCreatedReports.map((r) => r.clubName?.trim() || 'Spor Okulu')
  ).size;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hidden File Input for Sport School Logo Upload */}
      <input
        ref={schoolLogoFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
        onChange={handleUploadTargetSchoolLogo}
        className="hidden"
      />

      {/* Top Banner Card: Analysis Firm Identity & Integration Credentials */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Logo & Identity */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* Analysis Firm Logo Box */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-2 border-2 border-white/20 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden">
              {companyProfile.logoDataUrl ? (
                <img
                  src={companyProfile.logoDataUrl}
                  alt={companyProfile.companyName}
                  className="w-full h-full object-contain"
                />
              ) : isClub ? (
                <Trophy className="w-10 h-10 text-emerald-600" />
              ) : isSchool ? (
                <Building2 className="w-10 h-10 text-sky-600" />
              ) : (
                <Activity className="w-10 h-10 text-indigo-600" />
              )}
            </div>

            {/* Name, Type & Badges */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${typeBadgeColor}`}>
                  {typeLabel}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Doğrulanmış Entegrasyon Profili</span>
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white truncate">
                {companyProfile.companyName}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5">
                {companyProfile.branchName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{companyProfile.branchName}</span>
                  </span>
                )}
                {companyProfile.city && <span>· {companyProfile.city}</span>}
                {companyProfile.authorizedPerson && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Yetkili: {companyProfile.authorizedPerson}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Sabit Co-Branding */}
          <div className="flex flex-wrap items-center gap-2.5 lg:self-center">
            {/* Rota Performans & SportsFly LAB Rozeti */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 text-white border border-white/20 shadow-sm shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-white p-0.5 overflow-hidden border border-cyan-400 shrink-0 flex items-center justify-center">
                  <img
                    src="/rota-performans-logo.png"
                    alt="Rota Performans Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10.5px] font-black uppercase tracking-tight text-white hidden sm:inline">
                  ROTA <span className="text-cyan-400">PERFORMANS</span>
                </span>
              </div>
              <div className="h-3.5 w-px bg-white/20" />
              <div className="flex items-center gap-1">
                <SportsFlyVectorMark className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-black tracking-tight text-white">
                  SportsFly <span className="text-sky-400">LAB</span>
                </span>
              </div>
            </div>

            {onBackToReports && (
              <button
                type="button"
                onClick={onBackToReports}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <FileText className="w-4 h-4 text-sky-300" />
                <span>Karne Görünümüne Dön</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Oturumu Kapat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-2xl border border-sky-200 dark:border-sky-800/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
          <strong className="font-extrabold block mb-0.5">Sporcu Karnesi Kurumsal Kimlik &amp; Logo Kuralı:</strong>
          Sporcu karnelerinin ve A4 PDF çıktılarının üst başlığında, analiz hazırladığınız spor kulübünün/okulunun logosu ve ismi yer alır.
          Analiz firmanızın kurumsal logosu ise entegrasyon profilinizde ve sistem yönetiminizde ayrı olarak saklanır.
        </div>
      </div>

      {/* YENİ ALAN: KARNE ANALİZİ YAPILACAK SPOR OKULU & LOGO TANIMLAMA ALANI */}
      <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <School className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Karne Analizi Yapılacak Spor Okulu İsmi &amp; Logosu
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hangi spor okulu veya spor kulübü için karne oluşturacaksanız, o kurumun adını ve resmi logosunu buradan belirleyin.
              Burada girdiğiniz bilgiler sporcu karnesi üst başlıklarına ve A4 PDF çıktılarına anında uygulanır.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0 self-start sm:self-center">
            Karne Üst Başlığına Yansır
          </span>
        </div>

        {/* 2-Column Grid: Form Inputs (Left) vs Live Report Header Simulation (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: Input Form */}
          <form
            onSubmit={handleApplyTargetSchoolBranding}
            className="lg:col-span-7 space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Spor Okulu / Kulüp Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={targetSchoolName}
                    onChange={(e) => setTargetSchoolName(e.target.value)}
                    placeholder="Örn: Ataşehir Spor Okulları"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Şube / Kampüs
                  </label>
                  <input
                    type="text"
                    value={targetBranchName}
                    onChange={(e) => setTargetBranchName(e.target.value)}
                    placeholder="Örn: Ataşehir Merkez Kampüsü"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sport School Logo Upload Box */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    onClick={() => schoolLogoFileInputRef.current?.click()}
                    className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1 cursor-pointer transition-colors shrink-0 overflow-hidden group"
                    title="Spor Okulu Logosunu Yükle"
                  >
                    {targetSchoolLogo ? (
                      <img
                        src={targetSchoolLogo}
                        alt={targetSchoolName || 'Spor Okulu'}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-400 group-hover:text-blue-500">
                        <ImagePlus className="w-5 h-5 mx-auto" />
                        <span className="text-[9px] font-bold block mt-0.5">LOGO</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block truncate">
                      Spor Okulu Kurumsal Logosu
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {targetSchoolLogo ? '✓ Özel logo tanımlı' : 'Varsayılan arma aktif'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => schoolLogoFileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{targetSchoolLogo ? 'Değiştir' : 'Logo Yükle'}</span>
                  </button>
                  {targetSchoolLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveTargetSchoolLogo}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                      title="Logoyu Kaldır"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Bu Spor Okulunu Karnelere Uygula &amp; Kaydet</span>
              </button>
            </div>
          </form>

          {/* Right: Live Report Header Preview Simulation */}
          <div className="lg:col-span-5 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span>Canlı Karne Üst Başlığı Önizlemesi</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  A4 Baskı Formatı
                </span>
              </div>

              {/* Simulated Report Card Header Bar */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Simulated School Logo */}
                    <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      {targetSchoolLogo ? (
                        <img
                          src={targetSchoolLogo}
                          alt={targetSchoolName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <School className="w-6 h-6 text-slate-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase text-white truncate max-w-[180px]">
                        {targetSchoolName || 'SPOR OKULU ADI'}
                      </div>
                      <div className="text-[10px] text-slate-300 truncate">
                        {targetBranchName || 'Merkez Kampüs'}
                      </div>
                    </div>
                  </div>

                  {/* Dual branding: Rota Performans & SportsFly LAB */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 text-[9px] font-extrabold text-white shrink-0">
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-white p-0.5 overflow-hidden border border-cyan-400 shrink-0 flex items-center justify-center">
                        <img
                          src="/rota-performans-logo.png"
                          alt="Rota Performans"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[9px] font-black uppercase text-cyan-300">ROTA</span>
                    </div>
                    <div className="h-2.5 w-px bg-white/20" />
                    <div className="flex items-center gap-1 text-sky-300">
                      <SportsFlyVectorMark className="w-3 h-3" />
                      <span>SportsFly LAB</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Atletik Performans &amp; Beden Kompozisyonu Karnesi</span>
                  <span className="text-emerald-400 font-bold">Sayfa 1 / 7</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400 leading-normal">
              Sporcu karnelerinin üstünde analiz hizmeti verilen bu spor okulunun kurumsal kimliği basılır.
            </div>
          </div>
        </div>

        {/* Quick Partner Schools Switcher */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span>Hızlı Seçilebilir Spor Okulları / Partnerler:</span>
            </span>
            <span className="text-[11px] text-slate-400">Tek tıkla aktif et</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {partnerSchools.map((partner) => {
              const isCurrentlyActive =
                partner.name.toLowerCase() === targetSchoolName.toLowerCase();
              return (
                <div
                  key={partner.id}
                  onClick={() => handleSelectPartnerSchool(partner)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    isCurrentlyActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-200 ring-1 ring-blue-400'
                      : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                      {partner.logoDataUrl ? (
                        <img
                          src={partner.logoDataUrl}
                          alt={partner.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <School className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{partner.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {partner.branchName}
                      </div>
                    </div>
                  </div>

                  {isCurrentlyActive ? (
                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold shrink-0">
                      Aktif
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Üretilen Karneler</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {allCreatedReports.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Sistemde aktif sporcu karnesi</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Yüklenen Excel Dosyaları</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {excelHistory.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">İşlenen ölçüm veri seti</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Hizmet Verilen Kulüpler</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {uniqueClubsCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Farklı spor okulu / akademi</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Geçiş Kodu</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-mono font-black text-blue-700 dark:text-blue-300">
              {companyProfile.accessCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 cursor-pointer"
              title="Kopyala"
            >
              {copiedCode ? (
                <CheckCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
            ✓ Aktif Entegrasyon Oturumu
          </span>
        </div>
      </div>

      {/* SECTION 1: YÜKLENEN EXCEL DOSYALARI VE ANALİZ SETLERİ ALANI */}
      <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Yüklenen Excel Dosyaları ve Analiz Setleri ({excelHistory.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Analiz firmanız tarafından SportsFly LAB'a aktarılmış Excel dosyaları ve toplu sporcu veri setleri.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadBatchSportsFlyLabExcelTemplate}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="SportsFly Lab standart Excel şablonunu indirin"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Örnek Excel Şablonu</span>
            </button>

            {onOpenBatchExcel && (
              <button
                type="button"
                onClick={onOpenBatchExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Yeni Excel Yükle</span>
              </button>
            )}
          </div>
        </div>

        {excelHistory.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-500">Henüz yüklenmiş Excel dosyası bulunmuyor.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Toplu karne sekmesinden sporcu ölçümlerini içeren Excel dosyasını yükleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase text-slate-400">
                  <th className="py-2.5 px-3">Excel Dosyası Adı</th>
                  <th className="py-2.5 px-3">İlgili Spor Kulübü / Grup</th>
                  <th className="py-2.5 px-3">Sporcu Sayısı</th>
                  <th className="py-2.5 px-3">Yüklenme Tarihi</th>
                  <th className="py-2.5 px-3">Durum</th>
                  <th className="py-2.5 px-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                {excelHistory.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                          {rec.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      <div>
                        <span>{rec.clubName || 'Spor Okulu'}</span>
                        {rec.groupTitle && (
                          <span className="text-[10px] text-slate-400 block">{rec.groupTitle}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold font-mono">
                        {rec.athleteCount} Sporcu
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {rec.uploadedAt}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        ✓ {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {onOpenBatchExcel && (
                        <button
                          type="button"
                          onClick={onOpenBatchExcel}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Karneleri Aç</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: OLUŞTURULAN VE KAYDEDİLEN SPORCU KARNELERİ ALANI */}
      <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Oluşturulan ve Kaydedilen Sporcu Karneleri ({allCreatedReports.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Analiz firmanız tarafından ilgili spor kulüpleri için üretilmiş 7 sayfalık atletik performans karneleri.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Sporcu veya kulüp ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 w-48 sm:w-56"
              />
            </div>

            {onOpenArchive && (
              <button
                type="button"
                onClick={onOpenArchive}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>Karne Arşivi ({archivedReports.length})</span>
              </button>
            )}
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-500">Aramanıza uygun karne bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-700 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
              >
                <div>
                  {/* Athlete Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate group-hover:text-sky-600 transition-colors">
                        {report.athleteName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {report.sportBranch} · {report.gender} · {report.ageYears} Yaş
                      </div>
                    </div>
                    {/* Score Badge */}
                    <span className="px-2 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-xs font-mono font-black shrink-0">
                      %{report.scoreHistory?.p3Score || 85}
                    </span>
                  </div>

                  {/* Sport Club Analyzed (Club Logo & Name) */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/70 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                      {report.clubLogoUrl ? (
                        <img
                          src={report.clubLogoUrl}
                          alt={report.clubName || 'Kulüp'}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Building2 className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                      {report.clubName || 'Spor Kulübü'}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      · {report.date3 || 'Güncel'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {report.id}
                  </span>
                  {onOpenReport && (
                    <button
                      type="button"
                      onClick={() => onOpenReport(report.id)}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Karneyi İncele</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: İLETİŞİM VE ENTEGRASYON YETKİLERİ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* İletişim Detayları */}
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Firma İletişim Bilgileri</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Yetkili Kişi</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {companyProfile.authorizedPerson || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Telefon</span>
              {companyProfile.phone ? (
                <a
                  href={`tel:${companyProfile.phone}`}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {companyProfile.phone}
                </a>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">E-posta</span>
              {companyProfile.email ? (
                <a
                  href={`mailto:${companyProfile.email}`}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {companyProfile.email}
                </a>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Lokasyon / Şube</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {companyProfile.branchName} {companyProfile.city && `(${companyProfile.city})`}
              </span>
            </div>
          </div>
        </div>

        {/* Tanımlı Modül Yetkileri */}
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Tanımlı Entegrasyon Modülleri</span>
          </h3>
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-100">
                SportsFly LAB (Atletik Performans Karnesi)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white">
                Aktif
              </span>
            </div>
            {companyProfile.activeModules &&
              Object.entries(companyProfile.activeModules).map(([modId, active]) => {
                if (modId === 'int-sportsfly-lab' || !active) return null;
                const labelMap: Record<string, string> = {
                  'int-sporpuan': 'SporPuan (Sporcu Değerlendirme)',
                  'int-turnuva': 'Turnuva Yönetimi',
                  'int-envanter': 'Kulüp Envanteri',
                  'int-referans': 'Referans Programı',
                };
                return (
                  <div
                    key={modId}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {labelMap[modId] || modId}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                      Yetkili
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
