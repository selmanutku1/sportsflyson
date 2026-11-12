import React, { useState, useEffect, useRef } from 'react';
import {
  exportReportPagesToA4Pdf,
  exportContainerToSmartA4Pdf,
  BatchA4PdfBuilder,
  downloadPageAsJpeg,
  downloadPagesAsJpegZip,
  downloadReportsAsPdfZip,
} from '../../../utils/pdfExportHelper';
import { SomatotypeRadarAndChart } from '../../charts/SomatotypeRadarAndChart';
import {
  Activity,
  Upload,
  Download,
  FileSpreadsheet,
  FileDown,
  Printer,
  Image as ImageIcon,
  Edit3,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Layers,
  HeartPulse,
  Compass,
  Target,
  Scale,
  Sparkles,
  Eye,
  FileText,
  Bot,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Award,
  BarChart3,
  Building2,
  Trophy,
  ImagePlus,
  Trash2,
  ShieldCheck,
  UserPlus,
  Archive,
  BookmarkPlus,
  Search,
  Calendar,
  FolderOpen,
  Users,
  CheckSquare,
  Square,
  Files,
  SlidersHorizontal,
  ArrowRightLeft,
  Save,
  RotateCcw,
  ChevronDown,
  Info,
  LogOut,
  Database,
  Camera,
  BookOpen,
} from 'lucide-react';
import { SportsFlyVectorMark } from '../../SportsFlyLogo';
import {
  RotaSportsFlyHeaderBadge,
  RotaSportsFlyFooterBadge,
} from '../../common/RotaSportsFlyBranding';
import { ROTA_PERFORMANS_LOGO_DATA_URL } from '../../../assets/rotaPerformansLogoDataUrl';
import { SPORTSFLY_LOGO_DATA_URL } from '../../../assets/sportsFlyLogoDataUrl';
import {
  SportsFlyLabPerformanceCharts,
  SportsFlyLabKarnePage5RadarContent,
  SportsFlyLabKarnePage6LineContent,
  RechartsSportsFlyRadarChart,
  InitialMeasurementGroupComparisonChart,
  SecondMeasurementComparisonPanel,
  ThreeWayGroupTargetAthleteComparisonChart,
  AthleteDevelopmentComparisonChart,
} from '../../charts/KarnePerformansGrafikleri';
import {
  downloadCriticalPerformanceCSV,
  downloadCriticalPerformancePDF,
} from '../../../utils/criticalPerformanceExporter';
import {
  SportsFlyLabReport,
  SportsFlyLabSchoolBranding,
  SportsFlyLabArchivedReport,
  LabParameterRow,
  LabAiPerformanceAnalysis,
  LabBatchFieldCategory,
  LAB_BATCH_MAPPABLE_FIELDS,
  SAMPLE_BATCH_ATHLETE_ROWS,
  CUSTOM_FORMAT_SAMPLE_ROWS,
  ParsedExcelSheetData,
  extractExcelWorkbookSheets,
  autoDetectExcelColumnMapping,
  getStoredLabColumnMapping,
  saveStoredLabColumnMapping,
  buildBatchReportsFromMappedRows,
  getStoredLabReports,
  saveStoredLabReports,
  getStoredLabSchoolBranding,
  saveStoredLabSchoolBranding,
  getStoredLabArchives,
  archiveLabReport,
  calculateBranchReferenceScore,
  BranchReferenceScoreResult,
  getActiveParamVal,
  archiveBatchLabReports,
  renameLabArchiveItem,
  deleteLabArchiveItem,
  applyBrandingToReport,
  applyBrandingToReports,
  createNewLabReportWithBranding,
  downloadSportsFlyLabExcelTemplate,
  downloadBatchSportsFlyLabExcelTemplate,
  generateSampleBatchLabReports,
  parseSportsFlyLabExcel,
  analyzeLabPerformanceMetrics,
  fetchGeminiLabRecommendations,
  generateAiForecastForLabReport,
  ensureDataConsistency,
  getDisplayedMotorPerformance,
  getDisplayedBodyComposition,
  isLabRowMeasured,
  addStoredLabExcelRecord,
  getStoredLabExcelHistory,
  UploadedExcelFileRecord,
  isStaleExpertComment,
  generateAthleteInterpretiveExpertComment,
  DEFAULT_LAB_REPORTS,
  EMPTY_LAB_REPORT_TEMPLATE,
  buildLabReportFromOcrAthlete,
  parseDateString,
} from '../../../data/sportsFlyLabData';
import { getStoredKarneler, saveStoredKarneler } from '../../../data/mockKarneData';
import { saveKarneToFirestore } from '../../../services/karneFirestoreService';
import { DosyaHavuzuView } from '../DosyaHavuzuView';
import {
  ExcelDataAuditModal,
  auditImportedAthletes,
  ExcelAuditSummary,
} from '../../modals/ExcelDataAuditModal';
import { CompanyIntegrationProfileView } from './CompanyIntegrationProfileView';
import { CompanyIntegrationProfile } from '../../../types';
import {
  getStoredLocalCompanyProfile,
  fetchCompanyProfileFromFirestore,
  saveCompanyProfileToFirestore,
} from '../../../services/companyProfileService';
import { getStoredUserProfile } from '../../../data/userProfile';
import { isSuperAdminUser } from '../../../data/packagePermissions';

interface SportsFlyLabViewProps {
  onToast?: (msg: string) => void;
  onLogout?: () => void;
  initialTab?: 'studio' | 'batch' | 'dosya-havuzu' | 'archive' | 'company-profile';
}

const PAGE_TITLES = [
  { page: 1, short: '1. Beden & Somatotip', full: '1. Beden Kompozisyonu & Heath-Carter Somatotip Analizi' },
  { page: 2, short: '2. Motor Performans', full: '2. Motor Performans Değerlendirmesi' },
  { page: 3, short: '3. Kritik Performans', full: '3. Kritik Performans Karşılaştırması & Gelişim Analizi' },
  { page: 4, short: '4. Gelişim Rehberi', full: '4. Veli & Antrenör Kapsamlı Gelişim Rehberi' },
];

export type KarneTemplateId =
  | 'modern-minimal'
  | 'athletic-data'
  | 'corporate-technical';

export type ClubColorPaletteId =
  | 'template-default'
  | 'sari-lacivert'
  | 'sari-kirmizi'
  | 'siyah-beyaz'
  | 'bordo-mavi'
  | 'zumrut-beyaz'
  | 'custom';

interface ClubColorPaletteOption {
  id: ClubColorPaletteId;
  name: string;
  shortName: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
}

const CLUB_COLOR_PALETTES: ClubColorPaletteOption[] = [
  {
    id: 'template-default',
    name: 'Şablon Varsayılan Rengi',
    shortName: 'Şablon Rengi',
    primaryHex: '#0f172a',
    secondaryHex: '#0ea5e9',
    accentHex: '#e11d48',
  },
  {
    id: 'sari-lacivert',
    name: 'Sarı - Lacivert (Kulüp Teması)',
    shortName: 'Sarı - Lacivert',
    primaryHex: '#0c1d4a',
    secondaryHex: '#facc15',
    accentHex: '#eab308',
  },
  {
    id: 'sari-kirmizi',
    name: 'Sarı - Kırmızı (Kulüp Teması)',
    shortName: 'Sarı - Kırmızı',
    primaryHex: '#881337',
    secondaryHex: '#f59e0b',
    accentHex: '#e11d48',
  },
  {
    id: 'siyah-beyaz',
    name: 'Siyah - Beyaz (Kulüp Teması)',
    shortName: 'Siyah - Beyaz',
    primaryHex: '#09090b',
    secondaryHex: '#71717a',
    accentHex: '#27272a',
  },
  {
    id: 'bordo-mavi',
    name: 'Bordo - Mavi (Kulüp Teması)',
    shortName: 'Bordo - Mavi',
    primaryHex: '#5c0f24',
    secondaryHex: '#38bdf8',
    accentHex: '#0284c7',
  },
  {
    id: 'zumrut-beyaz',
    name: 'Zümrüt Yeşil - Beyaz (Kulüp Teması)',
    shortName: 'Yeşil - Beyaz',
    primaryHex: '#064e3b',
    secondaryHex: '#10b981',
    accentHex: '#059669',
  },
  {
    id: 'custom',
    name: 'Özel Kulüp Rengi (Serbest Seçim)',
    shortName: 'Özel Renk',
    primaryHex: '#1e3a8a',
    secondaryHex: '#f97316',
    accentHex: '#ea580c',
  },
];

interface KarneTemplateOption {
  id: KarneTemplateId;
  name: string;
  shortName: string;
  subtitle: string;
  badgeColor: string;
  pageFrameClass: string;
  headerBoxClass: string;
  headerTitleClass: string;
  headerSubtitleClass: string;
  headerMetaClass: string;
  bannerClass: string;
  tableHeadClass: string;
  accentTextClass: string;
  accentBgClass: string;
  footerBorderClass: string;
  defaultPrimaryHex: string;
  defaultSecondaryHex: string;
}

const KARNE_TEMPLATES: KarneTemplateOption[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    shortName: '1. Modern Minimal',
    subtitle: 'Ferah tipografi, ince zarif çizgiler, sadeleştirilmiş veli ve akademi dostu modern mizanpaj',
    badgeColor: 'bg-sky-600 text-white',
    pageFrameClass: 'bg-white text-slate-900 border border-slate-200',
    headerBoxClass: 'bg-slate-50/90 text-slate-900 p-3.5 rounded-2xl border border-slate-200/90 mb-4',
    headerTitleClass: 'text-slate-900',
    headerSubtitleClass: 'text-slate-500',
    headerMetaClass: 'text-sky-600',
    bannerClass: 'bg-slate-900 text-white border border-slate-800',
    tableHeadClass: 'bg-slate-800 text-white',
    accentTextClass: 'text-sky-700',
    accentBgClass: 'bg-sky-50/60',
    footerBorderClass: 'border-t border-slate-200 text-slate-500',
    defaultPrimaryHex: '#0f172a',
    defaultSecondaryHex: '#0284c7',
  },
  {
    id: 'athletic-data',
    name: 'Atletik Veri Odaklı',
    shortName: '2. Atletik Veri Odaklı',
    subtitle: 'Yüksek kontrastlı pro-analitik sporcu dashboard yapısı, dinamik yüzdelik barları ve koyu başlık panelleri',
    badgeColor: 'bg-emerald-600 text-white',
    pageFrameClass: 'bg-white text-slate-900 border-2 border-slate-900',
    headerBoxClass: 'bg-slate-900 text-white p-3.5 rounded-xl border-b-4 border-emerald-400 mb-4',
    headerTitleClass: 'text-white',
    headerSubtitleClass: 'text-slate-300',
    headerMetaClass: 'text-emerald-400',
    bannerClass: 'bg-slate-900 text-white border border-emerald-500/40',
    tableHeadClass: 'bg-slate-900 text-emerald-300',
    accentTextClass: 'text-emerald-700',
    accentBgClass: 'bg-emerald-50/60',
    footerBorderClass: 'border-t-2 border-slate-900 text-slate-600',
    defaultPrimaryHex: '#0f172a',
    defaultSecondaryHex: '#10b981',
  },
  {
    id: 'corporate-technical',
    name: 'Kurumsal Teknik',
    shortName: '3. Kurumsal Teknik',
    subtitle: 'Resmi federasyon ve biyomekanik laboratuvar standardı, cetvelli teknik tablo ve Z-skor/SD analitik düzeni',
    badgeColor: 'bg-slate-700 text-white',
    pageFrameClass: 'bg-white text-slate-900 border-2 border-slate-400 ring-2 ring-slate-900/5',
    headerBoxClass: 'bg-slate-950 text-white p-3.5 rounded-xl border-b-4 border-slate-500 mb-4',
    headerTitleClass: 'text-slate-200',
    headerSubtitleClass: 'text-slate-300',
    headerMetaClass: 'text-slate-300',
    bannerClass: 'bg-slate-950 text-slate-100 border border-slate-500/50',
    tableHeadClass: 'bg-slate-950 text-slate-200',
    accentTextClass: 'text-rose-700',
    accentBgClass: 'bg-slate-50/50',
    footerBorderClass: 'border-t-2 border-slate-400 text-slate-600',
    defaultPrimaryHex: '#0f172a',
    defaultSecondaryHex: '#475569',
  },
];

export const SportsFlyLabView: React.FC<SportsFlyLabViewProps> = ({ onToast, onLogout, initialTab }) => {
  const [reports, setReports] = useState<SportsFlyLabReport[]>(() => getStoredLabReports());
  const [selectedReportId, setSelectedReportId] = useState<string>(() => {
    const list = getStoredLabReports();
    return list[0]?.id || 'lab-rep-1';
  });

  const currentUserProfile = React.useMemo(() => getStoredUserProfile(), []);
  const isSuperAdmin = React.useMemo(() => {
    return isSuperAdminUser(currentUserProfile?.role, currentUserProfile?.email);
  }, [currentUserProfile]);

  // Check if entered via integration access pass code (Only show Company Profile when true)
  const isIntegrationEntry = (() => {
    try {
      return (
        sessionStorage.getItem('sportsfly_integration_entry_source') === 'true' ||
        sessionStorage.getItem('sportsfly_integration_active') === 'true' ||
        localStorage.getItem('sportsfly_integration_entry_source') === 'true'
      );
    } catch (e) {
      return false;
    }
  })();

  const [activeCompanyProfile, setActiveCompanyProfile] = useState<CompanyIntegrationProfile>(() => {
    return getStoredLocalCompanyProfile();
  });

  // Sync company profile with Firestore 'company_profile' collection on mount
  useEffect(() => {
    fetchCompanyProfileFromFirestore()
      .then((prof) => {
        if (prof) {
          setActiveCompanyProfile(prof);
        }
      })
      .catch((err) => {
        console.warn('[SportsFlyLabView] Firestore company profile sync warning:', err);
      });

    const handleProfileUpdate = (e: any) => {
      if (e?.detail) {
        setActiveCompanyProfile(e.detail);
      }
    };
    window.addEventListener('sportsfly_company_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('sportsfly_company_profile_updated', handleProfileUpdate);
    };
  }, []);

  // Ensure stale expert comments are updated without wiping any measurement data or scores
  useEffect(() => {
    const stored = getStoredLabReports();
    const archived = getStoredLabArchives();
    
    let reportsChanged = false;
    const updatedReports = stored.map((r) => {
      let nextR = r;
      const cleanD1 = r.date1 ? parseDateString(r.date1) : '—';
      const cleanD2 = r.date2 ? parseDateString(r.date2) : '2-4 Ay Arası (Tahmini)';
      const cleanBirth = r.birthDate ? parseDateString(r.birthDate) : r.birthDate;
      if (cleanD1 !== r.date1 || cleanD2 !== r.date2 || cleanBirth !== r.birthDate) {
        reportsChanged = true;
        nextR = {
          ...nextR,
          date1: cleanD1 || '—',
          date2: cleanD2 || '2-4 Ay Arası (Tahmini)',
          birthDate: cleanBirth,
        };
      }
      if (isStaleExpertComment(nextR.expertComment)) {
        reportsChanged = true;
        nextR = {
          ...nextR,
          expertComment: generateAthleteInterpretiveExpertComment(nextR),
        };
      }
      return nextR;
    });

    let archivesChanged = false;
    const updatedArchives = archived.map((arch) => {
      if (isStaleExpertComment(arch.reportSnapshot?.expertComment)) {
        archivesChanged = true;
        return {
          ...arch,
          reportSnapshot: {
            ...arch.reportSnapshot,
            expertComment: generateAthleteInterpretiveExpertComment(arch.reportSnapshot),
          },
        };
      }
      return arch;
    });

    if (reportsChanged) {
      setReports(updatedReports);
      saveStoredLabReports(updatedReports);
    }
    if (archivesChanged) {
      setArchivedReports(updatedArchives);
      localStorage.setItem('sportsfly_lab_archive_v1', JSON.stringify(updatedArchives));
    }
  }, []);

  // Main module tab: 'studio', 'batch', 'dosya-havuzu', 'archive', or 'company-profile' (Company Profile only in integration entry)
  const [activeLabTab, setActiveLabTab] = useState<'studio' | 'batch' | 'dosya-havuzu' | 'archive' | 'company-profile'>(
    initialTab || 'studio'
  );

  // Toplu Karne Oluşturma (Batch Excel) state
  const [initialSampleBatch] = useState<SportsFlyLabReport[]>(() => {
    const base = getStoredLabReports()[0] || EMPTY_LAB_REPORT_TEMPLATE;
    return generateSampleBatchLabReports(base);
  });
  const [batchReports, setBatchReports] = useState<SportsFlyLabReport[]>(initialSampleBatch);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(() =>
    initialSampleBatch.map((r) => r.id)
  );
  const [batchSourceFileName, setBatchSourceFileName] = useState<string>(
    'SportsFly_Lab_Toplu_Sporcu_Sablonu (6 Örnek Sporcu).xlsx'
  );
  const [batchGroupTitle, setBatchGroupTitle] = useState<string>(
    '2026 Dönemi Performans Analiz Grubu'
  );
  const [batchGroupNote, setBatchGroupNote] = useState<string>(
    'Excel Toplu Sporcu Verisi · Kurumsal Performans Taraması'
  );
  const [autoArchiveOnBatchCreate, setAutoArchiveOnBatchCreate] = useState<boolean>(true);
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>('');
  const [isGeneratingBatchPDF, setIsGeneratingBatchPDF] = useState<boolean>(false);
  const [batchPdfStatusText, setBatchPdfStatusText] = useState<string | null>(null);
  const [isDraggingBatchExcel, setIsDraggingBatchExcel] = useState<boolean>(false);

  // Excel Sütun Eşleştirme (Column Mapping) State
  const [rawExcelSheets, setRawExcelSheets] = useState<ParsedExcelSheetData[]>(() => {
    const headers = Object.keys(SAMPLE_BATCH_ATHLETE_ROWS[0] || {});
    return [
      {
        sheetName: 'Toplu_Sporcu_Listesi',
        headers,
        rows: SAMPLE_BATCH_ATHLETE_ROWS,
        isParameterVerticalSheet: false,
      },
    ];
  });
  const [activeExcelSheetIndex, setActiveExcelSheetIndex] = useState<number>(0);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(() => {
    const headers = Object.keys(SAMPLE_BATCH_ATHLETE_ROWS[0] || {});
    return autoDetectExcelColumnMapping(headers, true);
  });
  const [showColumnMappingPanel, setShowColumnMappingPanel] = useState<boolean>(false);
  const [mappingCategoryFilter, setMappingCategoryFilter] = useState<
    'all' | 'essential' | LabBatchFieldCategory
  >('all');
  const [mappingSearchQuery, setMappingSearchQuery] = useState<string>('');

  // Karne Arşivi state
  const [archivedReports, setArchivedReports] = useState<SportsFlyLabArchivedReport[]>(() =>
    getStoredLabArchives()
  );
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');
  const [archiveSortBy, setArchiveSortBy] = useState<'newest' | 'score' | 'name'>('newest');
  const [showSaveArchiveModal, setShowSaveArchiveModal] = useState<boolean>(false);
  const [archiveTitleInput, setArchiveTitleInput] = useState<string>('');
  const [archiveNoteInput, setArchiveNoteInput] = useState<string>('');
  const [editingArchiveItem, setEditingArchiveItem] = useState<SportsFlyLabArchivedReport | null>(
    null
  );
  const [editArchiveTitleInput, setEditArchiveTitleInput] = useState<string>('');
  const [editArchiveNoteInput, setEditArchiveNoteInput] = useState<string>('');

  // View mode: 'single' (1 page at a time) or 'all' (all 7 pages stacked for full review / PDF)
  const [reportCardFormat, setReportCardFormat] = useState<'lab' | 'parent-athlete' | 'coach-club'>('lab');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');
  const [activePage, setActivePage] = useState<number>(1);
  const [isPdfPreviewMode, setIsPdfPreviewMode] = useState<boolean>(false);
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [pdfProgressPage, setPdfProgressPage] = useState<number | null>(null);

  // JPEG indirme ve sayfa seçimi modalı state'leri
  const [showJpegModal, setShowJpegModal] = useState<boolean>(false);
  const [selectedJpegPageIds, setSelectedJpegPageIds] = useState<string[]>([]);
  const [isGeneratingJpeg, setIsGeneratingJpeg] = useState<boolean>(false);
  const [jpegProgressText, setJpegProgressText] = useState<string | null>(null);
  const [jpegQuality, setJpegQuality] = useState<number>(0.98);

  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [labAuditModal, setLabAuditModal] = useState<{
    isOpen: boolean;
    summary: ExcelAuditSummary | null;
    fileName: string;
  }>({
    isOpen: false,
    summary: null,
    fileName: '',
  });
  const [showNewReportModal, setShowNewReportModal] = useState<boolean>(false);
  const [showBrandingSettings, setShowBrandingSettings] = useState<boolean>(false);
  const [hideSectionNumbers, setHideSectionNumbers] = useState<boolean>(true);
  const [hideScaleLegend, setHideScaleLegend] = useState<boolean>(true);
  const [showBodyMapInfographic, setShowBodyMapInfographic] = useState<boolean>(true);
  const [showMeasurementDatesBar, setShowMeasurementDatesBar] = useState<boolean>(true);
  const [showTrainingPlanFrequency, setShowTrainingPlanFrequency] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sportsfly_lab_show_training_freq_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [showTrainingPlanCards, setShowTrainingPlanCards] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sportsfly_lab_show_training_cards_v1') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleTrainingPlanFrequency = () => {
    setShowTrainingPlanFrequency((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sportsfly_lab_show_training_freq_v1', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleTrainingPlanCards = () => {
    setShowTrainingPlanCards((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sportsfly_lab_show_training_cards_v1', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleUpdateMeasurementDates = (
    patch: {
      date1?: string;
      date2?: string;
      date3?: string;
      birthDate?: string;
      sportBranch?: string;
      gender?: 'Erkek' | 'Kadın';
      targetReportId?: string;
    },
    applyToAll: boolean = true
  ) => {
    const computeUpdatedReport = (rep: SportsFlyLabReport, isCurrentAthlete: boolean): SportsFlyLabReport => {
      const nextGender = patch.gender !== undefined ? patch.gender : rep.gender;
      let nextPhvAge = rep.phvAge;
      if (patch.gender !== undefined) {
        if (patch.gender === 'Kadın' && nextPhvAge > 13.2) {
          nextPhvAge = 11.9;
        } else if (patch.gender === 'Erkek' && nextPhvAge < 12.6) {
          nextPhvAge = 13.8;
        }
      }
      const nextRep: SportsFlyLabReport = {
        ...rep,
        ...(patch.date1 !== undefined ? { date1: patch.date1 } : {}),
        ...(patch.date2 !== undefined ? { date2: patch.date2 } : {}),
        ...(patch.date3 !== undefined ? { date3: patch.date3 } : {}),
        ...(patch.birthDate !== undefined && isCurrentAthlete ? { birthDate: patch.birthDate } : {}),
        ...(patch.sportBranch !== undefined ? { sportBranch: patch.sportBranch } : {}),
        ...(patch.gender !== undefined ? { gender: nextGender, phvAge: nextPhvAge } : {}),
        somatotype: {
          ...rep.somatotype,
          eliteRef: {
            ...(rep.somatotype?.eliteRef || { endo: 3.2, meso: 4.5, ecto: 3.5, refScore: 92 }),
            sport: patch.sportBranch !== undefined ? patch.sportBranch : (rep.somatotype?.eliteRef?.sport || rep.sportBranch),
          },
        },
        scoreHistory: {
          ...rep.scoreHistory,
          ...(patch.date1 !== undefined ? { p1Date: patch.date1 || '—' } : {}),
          ...(patch.date2 !== undefined ? { p2Date: patch.date2 || '—' } : {}),
        },
      };
      nextRep.expertComment = generateAthleteInterpretiveExpertComment(nextRep);
      if (patch.birthDate !== undefined && isCurrentAthlete) {
        const formatted = parseDateString(patch.birthDate);
        const parts = formatted.split('.');
        if (parts.length === 3 && parts[2].length === 4) {
          const bDay = parseInt(parts[0], 10);
          const bMonth = parseInt(parts[1], 10) - 1;
          const bYear = parseInt(parts[2], 10);
          if (!isNaN(bDay) && !isNaN(bMonth) && !isNaN(bYear)) {
            const bDate = new Date(bYear, bMonth, bDay);
            const now = new Date();
            let age = now.getFullYear() - bDate.getFullYear();
            const m = now.getMonth() - bDate.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < bDate.getDate())) {
              age--;
            }
            if (age > 0 && age < 35) {
              nextRep.ageYears = age;
              nextRep.ageMonths = age * 12 + Math.max(0, m);
            }
          }
        }
      }
      ensureDataConsistency(nextRep);
      return nextRep;
    };

    setReports((prevReports) => {
      const updated = prevReports.map((rep) => {
        const isCurrent = patch.targetReportId ? rep.id === patch.targetReportId : rep.id === currentReport?.id;
        if (applyToAll || isCurrent) {
          return computeUpdatedReport(rep, isCurrent);
        }
        return rep;
      });
      saveStoredLabReports(updated);
      return updated;
    });

    setBatchReports((prevBatch) => {
      const firstBatchId = prevBatch[0]?.id;
      const updatedBatch = prevBatch.map((rep) => {
        const isCurrent = patch.targetReportId
          ? rep.id === patch.targetReportId
          : rep.id === currentReport?.id || rep.id === firstBatchId;
        if (applyToAll || isCurrent) {
          return computeUpdatedReport(rep, isCurrent);
        }
        return rep;
      });
      try {
        localStorage.setItem('sportsfly_lab_batch_reports_v2', JSON.stringify(updatedBatch));
      } catch {
        // ignore storage quota errors
      }
      return updatedBatch;
    });
  };
  const [newAthleteForm, setNewAthleteForm] = useState<{
    athleteName: string;
    sportBranch: string;
    gender: 'Erkek' | 'Kadın';
    ageYears: number;
  }>({
    athleteName: '',
    sportBranch: 'Voleybol / Çoklu Branş Gelişim',
    gender: 'Erkek',
    ageYears: 11.5,
  });
  // Performans grafikleri ve performans önerileri her zaman kapalı başlar, kullanıcı açmadıkça açık gelmez
  const [showChartsPanel, setShowChartsPanel] = useState<boolean>(false);
  const [showAiPanel, setShowAiPanel] = useState<boolean>(false);
  const [showKarneGuideModal, setShowKarneGuideModal] = useState<boolean>(false);
  const [karneTemplate, setKarneTemplate] = useState<KarneTemplateId>(() => {
    try {
      const saved = localStorage.getItem('sportsfly_lab_karne_template_v2') as KarneTemplateId | null;
      if (saved && KARNE_TEMPLATES.some((t) => t.id === saved)) return saved;
    } catch {
      // ignore storage errors
    }
    return 'athletic-data';
  });
  const activeTemplate =
    KARNE_TEMPLATES.find((t) => t.id === karneTemplate) || KARNE_TEMPLATES[0];

  const handleSelectKarneTemplate = (tplId: KarneTemplateId) => {
    setKarneTemplate(tplId);
    try {
      localStorage.setItem('sportsfly_lab_karne_template_v2', tplId);
    } catch {
      // ignore
    }
  };

  // C: Dynamic Club Color Palette State (Sarı-Lacivert, Sarı-Kırmızı, Siyah-Beyaz, Bordo-Mavi, Özel Renk)
  const [clubColorPalette, setClubColorPalette] = useState<ClubColorPaletteId>(() => {
    try {
      const saved = localStorage.getItem('sportsfly_lab_club_palette_v1') as ClubColorPaletteId | null;
      if (saved && CLUB_COLOR_PALETTES.some((p) => p.id === saved)) return saved;
    } catch {
      // ignore
    }
    return 'template-default';
  });
  const [customPrimaryHex, setCustomPrimaryHex] = useState<string>(() => {
    try {
      return localStorage.getItem('sportsfly_lab_custom_primary_hex') || '#0c1d4a';
    } catch {
      return '#0c1d4a';
    }
  });
  const [customSecondaryHex, setCustomSecondaryHex] = useState<string>(() => {
    try {
      return localStorage.getItem('sportsfly_lab_custom_secondary_hex') || '#facc15';
    } catch {
      return '#facc15';
    }
  });

  const handleSelectClubColorPalette = (paletteId: ClubColorPaletteId) => {
    setClubColorPalette(paletteId);
    try {
      localStorage.setItem('sportsfly_lab_club_palette_v1', paletteId);
    } catch {
      // ignore
    }
  };

  const activePaletteObj =
    CLUB_COLOR_PALETTES.find((p) => p.id === clubColorPalette) || CLUB_COLOR_PALETTES[0];
  const effectivePrimaryHex =
    clubColorPalette === 'custom'
      ? customPrimaryHex
      : clubColorPalette === 'template-default'
        ? activeTemplate.defaultPrimaryHex
        : activePaletteObj.primaryHex;
  const effectiveSecondaryHex =
    clubColorPalette === 'custom'
      ? customSecondaryHex
      : clubColorPalette === 'template-default'
        ? activeTemplate.defaultSecondaryHex
        : activePaletteObj.secondaryHex;

  const [openHeaderMenu, setOpenHeaderMenu] = useState<
    'excel' | 'karne' | 'panels' | 'export' | 'report-download' | 'batchSamples' | 'templates' | 'clubColors' | null
  >(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [schoolBranding, setSchoolBranding] = useState<SportsFlyLabSchoolBranding>(() =>
    getStoredLabSchoolBranding()
  );

  const headerMenuContainerRef = useRef<HTMLDivElement>(null);

  // Close open dropdown menus when clicking outside
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        headerMenuContainerRef.current &&
        !headerMenuContainerRef.current.contains(event.target as Node)
      ) {
        setOpenHeaderMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Ensure browser native print (Ctrl+P / Cmd+P) automatically expands all 7 pages at 100% scale,
  // and keep schoolBranding synced across browser tabs / storage events
  React.useEffect(() => {
    const handleBeforePrint = () => {
      setActiveLabTab('studio');
      setViewMode('all');
      setPdfZoom(100);
    };
    const handleStorageSync = () => {
      const latestBranding = getStoredLabSchoolBranding();
      setSchoolBranding(latestBranding);
      const latestReports = getStoredLabReports();
      setReports(latestReports);
      setArchivedReports(getStoredLabArchives());
    };

    const handleCustomReportsUpdate = (e: any) => {
      const latest = getStoredLabReports();
      setReports(latest);
      if (e?.detail?.reportId) {
        setSelectedReportId(e.detail.reportId);
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('sportsfly_reports_updated', handleCustomReportsUpdate);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('sportsfly_reports_updated', handleCustomReportsUpdate);
    };
  }, []);

  // Sanitize any existing cached reports where sportBranch leaked "İpek Başeğmez" or athlete's name
  React.useEffect(() => {
    let hasChanges = false;
    const sanitizedReports = reports.map((r) => {
      let needsFix = false;
      const bLower = (r.sportBranch || '').toLowerCase();
      if (
        bLower.includes('ipek') ||
        bLower.includes('başeğmez') ||
        bLower.includes('basegmez') ||
        bLower === (r.athleteName || '').toLowerCase() ||
        bLower.includes('ad soyad') ||
        bLower.includes('ogrenci') ||
        bLower.includes('öğrenci')
      ) {
        needsFix = true;
      }
      if (needsFix) {
        hasChanges = true;
        return {
          ...r,
          sportBranch: 'Genel Spor Gelişimi',
          somatotype: {
            ...r.somatotype,
            eliteRef: {
              ...(r.somatotype?.eliteRef || { endo: 3.2, meso: 4.5, ecto: 3.5, refScore: 92 }),
              sport: 'Genel Spor Gelişimi',
            },
          },
        };
      }
      return r;
    });

    if (hasChanges) {
      setReports(sanitizedReports);
      saveStoredLabReports(sanitizedReports);
    }

    // Clear stale column mapping in localStorage if it has Brans pointing to name
    try {
      const storedMap = getStoredLabColumnMapping();
      if (storedMap && storedMap.Brans) {
        const b = storedMap.Brans.toLowerCase();
        if (b.includes('ad') || b.includes('soyad') || b.includes('isim') || b.includes('ogrenci') || b.includes('ipek') || b.includes('basegmez')) {
          delete storedMap.Brans;
          saveStoredLabColumnMapping(storedMap);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const schoolLogoInputRef = useRef<HTMLInputElement>(null);

  const currentReport =
    reports.find((r) => r.id === selectedReportId) ||
    reports[0] ||
    DEFAULT_LAB_REPORTS[0] ||
    EMPTY_LAB_REPORT_TEMPLATE;
  // Sporcu karnesi üst başlığında analiz yapılan spor okulunun / kulübünün logosu ve adı yer alır (analiz firmasının logosu ayrı profilde tutulur)
  const effectiveClubName =
    schoolBranding.schoolName.trim() || currentReport.clubName || 'SPOR OKULU AKADEMİSİ';
  const effectiveBranchName =
    schoolBranding.branchName.trim() || currentReport.branchName || 'Merkez Kampüs';
  const effectiveSchoolLogo = schoolBranding.logoDataUrl || currentReport.clubLogoUrl || '';
  const effectiveAnalysisFirmLogo =
    activeCompanyProfile?.logoDataUrl ||
    (activeCompanyProfile?.companyName?.toLowerCase().includes('rota')
      ? ROTA_PERFORMANS_LOGO_DATA_URL
      : ROTA_PERFORMANS_LOGO_DATA_URL);
  const effectiveAnalysisFirmName =
    activeCompanyProfile?.companyName || 'ROTA PERFORMANS';

  const activeAiAnalysis: LabAiPerformanceAnalysis =
    currentReport.aiRecommendations || analyzeLabPerformanceMetrics(currentReport);

  const notify = (msg: string) => {
    if (onToast) onToast(msg);
    setLocalToast(msg);
    setTimeout(() => setLocalToast(null), 3500);
  };

  // Update Sport School Name / Branch / Logo in localStorage and automatically sync all reports
  const handleSchoolBrandingChange = (patch: Partial<SportsFlyLabSchoolBranding>) => {
    const merged: SportsFlyLabSchoolBranding = { ...schoolBranding, ...patch };
    const savedBranding = saveStoredLabSchoolBranding(merged);
    setSchoolBranding(savedBranding);

    // Automatically apply the updated branding to all loaded reports so any switched or newly created report reflects it
    const nextList = applyBrandingToReports(reports, savedBranding);
    setReports(nextList);
    saveStoredLabReports(nextList);
  };

  // Explicitly confirm & apply Sport School Name & Logo to all loaded and future athlete report cards
  const handleApplyBrandingToAllReports = () => {
    const savedBranding = saveStoredLabSchoolBranding(schoolBranding);
    setSchoolBranding(savedBranding);
    const nextList = applyBrandingToReports(reports, savedBranding);
    setReports(nextList);
    saveStoredLabReports(nextList);
    notify(
      `"${savedBranding.schoolName}" karne tasarım ayarları tarayıcıda kalıcı hale getirildi ve tüm karnelere uygulandı.`
    );
  };

  // Create a brand new athlete report card with persisted localStorage school branding automatically applied
  const handleCreateNewReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAthleteForm.athleteName.trim()) {
      notify('Lütfen sporcu adı soyadı girin.');
      return;
    }
    const createdReport = createNewLabReportWithBranding({
      athleteName: newAthleteForm.athleteName,
      sportBranch: newAthleteForm.sportBranch,
      gender: newAthleteForm.gender,
      ageYears: newAthleteForm.ageYears,
      baseTemplate: currentReport,
    });
    const nextList = [createdReport, ...reports];
    setReports(nextList);
    saveStoredLabReports(nextList);
    setSelectedReportId(createdReport.id);
    setShowNewReportModal(false);
    setNewAthleteForm({
      athleteName: '',
      sportBranch: createdReport.sportBranch,
      gender: 'Erkek',
      ageYears: 11.5,
    });
    notify(
      `"${createdReport.athleteName}" için yeni 5 sayfalık karne, "${effectiveClubName}" kurumsal başlığı ve logosu otomatik uygulanarak oluşturuldu.`
    );
  };

  // Open Save-to-Archive modal with a pre-filled descriptive name
  const handleOpenSaveArchiveModal = (targetReport: SportsFlyLabReport = currentReport) => {
    setArchiveTitleInput(
      `${targetReport.athleteName} — ${targetReport.date3} Dönem Karnesi (${targetReport.sportBranch})`
    );
    setArchiveNoteInput(
      `${effectiveClubName} · Genel Performans Puanı: %${targetReport.scoreHistory.p2Score || targetReport.scoreHistory.p3Score}`
    );
    setShowSaveArchiveModal(true);
  };

  // Save current report card into Karne Arşivi with user's custom name
  const handleConfirmSaveToArchive = (e: React.FormEvent) => {
    e.preventDefault();
    const customName =
      archiveTitleInput.trim() ||
      `${currentReport.athleteName} — ${currentReport.date3} Dönem Karnesi`;
    const nextArchives = archiveLabReport(currentReport, customName, archiveNoteInput);
    setArchivedReports(nextArchives);
    setShowSaveArchiveModal(false);
    notify(`"${customName}" adıyla Karne Arşivi'ne kaydedildi.`);
  };

  // Open an archived report card in the 7-page viewer (and optionally in A4 PDF preview or download)
  const handleOpenArchivedReport = (
    item: SportsFlyLabArchivedReport,
    mode: 'view' | 'pdf-preview' | 'download-pdf' = 'view'
  ) => {
    const snapshot = applyBrandingToReport(item.reportSnapshot, schoolBranding);
    const exists = reports.some((r) => r.id === snapshot.id);
    const nextReports = exists
      ? reports.map((r) => (r.id === snapshot.id ? snapshot : r))
      : [snapshot, ...reports];

    setReports(nextReports);
    saveStoredLabReports(nextReports);
    setSelectedReportId(snapshot.id);
    setActiveLabTab('studio');
    setViewMode('all');

    if (mode === 'pdf-preview') {
      setIsPdfPreviewMode(true);
      notify(`"${item.archiveTitle}" A4 PDF önizleme modunda açıldı.`);
    } else if (mode === 'download-pdf') {
      setIsPdfPreviewMode(false);
      notify(`"${item.archiveTitle}" yüklendi, PDF indiriliyor...`);
      setTimeout(() => {
        void handleDownloadPDF();
      }, 250);
    } else {
      setIsPdfPreviewMode(false);
      notify(`"${item.archiveTitle}" arşivden yüklendi ve görüntüleniyor.`);
    }
  };

  // Rename an archived report card
  const handleRenameArchiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArchiveItem) return;
    const next = renameLabArchiveItem(
      editingArchiveItem.archiveId,
      editArchiveTitleInput,
      editArchiveNoteInput
    );
    setArchivedReports(next);
    setEditingArchiveItem(null);
    notify('Arşivdeki karne ismi güncellendi.');
  };

  // Delete an archived report card
  const handleDeleteArchiveItem = (item: SportsFlyLabArchivedReport) => {
    const next = deleteLabArchiveItem(item.archiveId);
    setArchivedReports(next);
    notify(`"${item.archiveTitle}" karne arşivinden kaldırıldı.`);
  };

  const filteredArchivedReports = React.useMemo(() => {
    const q = archiveSearchQuery.trim().toLowerCase();
    const filtered = archivedReports.filter((item) => {
      if (!q) return true;
      const rep = item.reportSnapshot;
      return (
        item.archiveTitle.toLowerCase().includes(q) ||
        (item.archiveNote || '').toLowerCase().includes(q) ||
        rep.athleteName.toLowerCase().includes(q) ||
        rep.sportBranch.toLowerCase().includes(q) ||
        rep.clubName.toLowerCase().includes(q) ||
        item.savedAt.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (archiveSortBy === 'score') {
        return (
          (b.reportSnapshot.scoreHistory?.p3Score || 0) -
          (a.reportSnapshot.scoreHistory?.p3Score || 0)
        );
      }
      if (archiveSortBy === 'name') {
        return a.archiveTitle.localeCompare(b.archiveTitle, 'tr');
      }
      return (b.savedTimestamp || 0) - (a.savedTimestamp || 0);
    });
  }, [archivedReports, archiveSearchQuery, archiveSortBy]);

  // Handle Sport School Logo Upload (converts to compact Base64 Data URL for persistence & A4 PDF export)
  const handleSchoolLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!resultUrl) return;

      // Resize large raster images on an offscreen canvas so localStorage and PDF export stay fast
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w || 200;
        canvas.height = h || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const optimizedDataUrl = canvas.toDataURL('image/png', 0.92);
          handleSchoolBrandingChange({ logoDataUrl: optimizedDataUrl });
          notify('Spor okulu logosu yüklendi ve karne üst başlığına eklendi.');
        } else {
          handleSchoolBrandingChange({ logoDataUrl: resultUrl });
          notify('Spor okulu logosu yüklendi.');
        }
      };
      img.onerror = () => {
        handleSchoolBrandingChange({ logoDataUrl: resultUrl });
        notify('Spor okulu logosu yüklendi.');
      };
      img.src = resultUrl;
    };
    reader.readAsDataURL(file);

    if (schoolLogoInputRef.current) {
      schoolLogoInputRef.current.value = '';
    }
  };

  // Process an Excel file or Screenshot Image for either Single or Batch Report Card Creation
  const processUploadedExcelFile = async (file: File, fromBatchTab: boolean = false) => {
    try {
      const persistedBranding = getStoredLabSchoolBranding();
      setSchoolBranding(persistedBranding);

      // Check if uploaded file is an image (PNG / JPEG screenshot of Excel table)
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(file.name);
      if (isImage) {
        notify('📸 Excel ekran görüntüsü yapay zeka ile taranıyor, sporcu verileri okunuyor...');
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const dataUrl = await base64Promise;

        const resp = await fetch('/api/ai/ocr-athlete-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: dataUrl,
            fileName: file.name,
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || 'Ekran görüntüsü okunamadı');
        }

        const data = await resp.json();
        const ocrAthletes = data.athletes || [];
        if (ocrAthletes.length === 0) {
          notify('Görüntüde sporcu tablosu tespit edilemedi. Lütfen net bir tablo ekran görüntüsü yükleyin.');
          return;
        }

        const mappedReports = ocrAthletes.map((item: any) =>
          buildLabReportFromOcrAthlete(item, persistedBranding)
        );

        setBatchSourceFileName(file.name);
        setBatchReports(mappedReports);
        setSelectedBatchIds(mappedReports.map((r: any) => r.id));

        const updatedList = applyBrandingToReports(
          [...mappedReports, ...reports.filter((r) => !mappedReports.some((m: any) => m.id === r.id || m.athleteName === r.athleteName))],
          persistedBranding
        );
        setReports(updatedList);
        saveStoredLabReports(updatedList);
        if (mappedReports[0]) {
          setSelectedReportId(mappedReports[0].id);
        }

        addStoredLabExcelRecord({
          id: `ocr-${Date.now()}`,
          fileName: `📸 ${file.name}`,
          uploadedAt: `${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
          athleteCount: mappedReports.length,
          clubName: persistedBranding.schoolName || 'SportsFly LAB',
          status: 'İşlendi',
          mappedReportIds: mappedReports.map((r: any) => r.id),
        });

        setActiveLabTab(fromBatchTab || mappedReports.length > 1 ? 'batch' : 'report');

        const auditSummary = auditImportedAthletes(mappedReports, `📸 ${file.name}`);
        setLabAuditModal({
          isOpen: true,
          summary: auditSummary,
          fileName: `📸 ${file.name}`,
        });

        notify(`📸 "${file.name}" ekran görüntüsünden ${mappedReports.length} sporcu başarıyla aktarıldı ve ön-denetime alındı.`);
        if (mappedReports[0]) {
          void handleRunAiAnalysis(mappedReports[0], updatedList);
        }
        return;
      }

      const buffer = await file.arrayBuffer();
      const templateWithBranding = applyBrandingToReport(currentReport, persistedBranding);
      const extractedSheets = extractExcelWorkbookSheets(buffer);

      // Prefer a flat multi-athlete sheet if available
      const flatSheetIdx = extractedSheets.findIndex((s) => !s.isParameterVerticalSheet);
      const chosenSheetIdx = flatSheetIdx >= 0 ? flatSheetIdx : 0;
      const activeSheet = extractedSheets[chosenSheetIdx];

      if (activeSheet && (!activeSheet.isParameterVerticalSheet || fromBatchTab)) {
        setRawExcelSheets(extractedSheets);
        setActiveExcelSheetIndex(chosenSheetIdx);

        const detectedMapping = autoDetectExcelColumnMapping(activeSheet.headers, true);
        setColumnMapping(detectedMapping);

        const mappedReports = buildBatchReportsFromMappedRows(
          activeSheet.rows,
          detectedMapping,
          templateWithBranding
        ).map((rep) => applyBrandingToReport(rep, persistedBranding));

        setBatchSourceFileName(file.name);
        setBatchReports(mappedReports);
        setSelectedBatchIds(mappedReports.map((r) => r.id));

        // Sync into reports state so that clicking Karneye Aktar or Karneyi Aç immediately displays the athlete
        const updatedList = applyBrandingToReports(
          [...mappedReports, ...reports.filter((r) => !mappedReports.some((m) => m.id === r.id || m.athleteName === r.athleteName))],
          persistedBranding
        );
        setReports(updatedList);
        saveStoredLabReports(updatedList);
        if (mappedReports[0]) {
          setSelectedReportId(mappedReports[0].id);
        }

        setActiveLabTab('batch');
        // Run Pre-Audit (Ön-Denetim)
        const auditSummary = auditImportedAthletes(mappedReports, file.name, activeSheet.rows);
        setLabAuditModal({
          isOpen: true,
          summary: auditSummary,
          fileName: file.name,
        });

        notify(
          `"${file.name}" yüklendi (${mappedReports.length} sporcu) ve otomatik ön-denetim tamamlandı.`
        );
        return;
      }

      // Fallback for single-athlete vertical parameter sheet ("Parametre_Bazli_Karne")
      const parsedReports = parseSportsFlyLabExcel(buffer, templateWithBranding, fromBatchTab).map(
        (rep) => applyBrandingToReport(rep, persistedBranding)
      );

      if (parsedReports.length === 0) {
        notify(
          'Excel dosyasında uygun sporcu veya parametre verisi bulunamadı. Lütfen örnek şablonu kontrol edin.'
        );
        return;
      }

      const updatedList = applyBrandingToReports(
        [...parsedReports, ...reports],
        persistedBranding
      );
      setReports(updatedList);
      saveStoredLabReports(updatedList);
      setSelectedReportId(parsedReports[0].id);

      // Run Pre-Audit for single-athlete import
      const auditSummary = auditImportedAthletes(parsedReports, file.name);
      setLabAuditModal({
        isOpen: true,
        summary: auditSummary,
        fileName: file.name,
      });

      setBatchReports(parsedReports);
      setSelectedBatchIds(parsedReports.map((r) => r.id));
      setBatchSourceFileName(file.name);
      notify(
        `${parsedReports.length} sporcu karnesi "${persistedBranding.schoolName}" başlığı ve logosu otomatik uygulanarak oluşturuldu.`
      );

      void handleRunAiAnalysis(parsedReports[0], updatedList);
    } catch (err) {
      console.error('Excel okuma hatası:', err);
      notify(
        'Excel dosyası okunurken bir hata oluştu. Lütfen .xlsx veya .csv formatında yükleyin.'
      );
    }
  };

  // Handle Excel Upload from Top Toolbar
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedExcelFile(file, false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Excel Upload from Batch Tab Input
  const handleBatchExcelInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedExcelFile(file, true);
    if (batchFileInputRef.current) batchFileInputRef.current.value = '';
  };

  // Load 6 Sample Athletes (Standard Template Headers) into Batch Table & Column Mapper
  const handleLoadSampleBatchData = () => {
    const persistedBranding = getStoredLabSchoolBranding();
    setSchoolBranding(persistedBranding);
    const headers = Object.keys(SAMPLE_BATCH_ATHLETE_ROWS[0] || {});
    const sheet: ParsedExcelSheetData = {
      sheetName: 'Toplu_Sporcu_Listesi',
      headers,
      rows: SAMPLE_BATCH_ATHLETE_ROWS,
      isParameterVerticalSheet: false,
    };
    setRawExcelSheets([sheet]);
    setActiveExcelSheetIndex(0);
    const detected = autoDetectExcelColumnMapping(headers, false);
    setColumnMapping(detected);

    const samples = buildBatchReportsFromMappedRows(
      SAMPLE_BATCH_ATHLETE_ROWS,
      detected,
      currentReport
    ).map((rep) => applyBrandingToReport(rep, persistedBranding));

    setBatchReports(samples);
    setSelectedBatchIds(samples.map((r) => r.id));
    setBatchSourceFileName('SportsFly_Lab_Toplu_Sporcu_Sablonu (6 Örnek Sporcu).xlsx');
    addStoredLabExcelRecord({
      id: `excel-sample-${Date.now()}`,
      fileName: 'SportsFly_Lab_Toplu_Sporcu_Sablonu (6 Örnek Sporcu).xlsx',
      uploadedAt: `${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
      athleteCount: 6,
      clubName: effectiveClubName,
      status: 'Karneler Üretildi',
      groupTitle: 'Standart Örnek Sporcu Veri Seti',
    });
    notify('Standart şablon başlıklarına sahip 6 sporculuk örnek veri seti yüklendi ve sütunlar eşleştirildi.');
  };

  // Load 4 Sample Athletes with Custom / Non-Standard School Excel Headers to test Column Mapping flexibility
  const handleLoadCustomFormatSampleExcel = () => {
    const persistedBranding = getStoredLabSchoolBranding();
    setSchoolBranding(persistedBranding);
    const headers = Object.keys(CUSTOM_FORMAT_SAMPLE_ROWS[0] || {});
    const sheet: ParsedExcelSheetData = {
      sheetName: 'Okul_Ozel_Olcum_Tablosu',
      headers,
      rows: CUSTOM_FORMAT_SAMPLE_ROWS,
      isParameterVerticalSheet: false,
    };
    setRawExcelSheets([sheet]);
    setActiveExcelSheetIndex(0);
    const detected = autoDetectExcelColumnMapping(headers, false);
    setColumnMapping(detected);

    const samples = buildBatchReportsFromMappedRows(
      CUSTOM_FORMAT_SAMPLE_ROWS,
      detected,
      currentReport
    ).map((rep) => applyBrandingToReport(rep, persistedBranding));

    setBatchReports(samples);
    setSelectedBatchIds(samples.map((r) => r.id));
    setBatchSourceFileName('Farkli_Format_Okul_Olcum_Listesi (4 Sporcu - Özel Başlıklar).xlsx');
    notify(
      'Farklı sütun başlıklarına sahip örnek Excel verisi yüklendi. Sütun Eşleştirme Arayüzü üzerinden eşleşmeleri inceleyebilir veya değiştirebilirsiniz.'
    );
  };

  const activeExcelSheet: ParsedExcelSheetData | undefined =
    rawExcelSheets[activeExcelSheetIndex] || rawExcelSheets[0];

  // Switch between sheets in a multi-sheet uploaded Excel workbook
  const handleSwitchExcelSheet = (newIndex: number) => {
    const targetSheet = rawExcelSheets[newIndex];
    if (!targetSheet) return;
    setActiveExcelSheetIndex(newIndex);
    const detected = autoDetectExcelColumnMapping(targetSheet.headers, true);
    setColumnMapping(detected);

    const persistedBranding = getStoredLabSchoolBranding();
    const rebuilt = buildBatchReportsFromMappedRows(
      targetSheet.rows,
      detected,
      currentReport
    ).map((rep) => applyBrandingToReport(rep, persistedBranding));

    setBatchReports(rebuilt);
    setSelectedBatchIds(rebuilt.map((r) => r.id));
    notify(
      `"${targetSheet.sheetName}" sayfası seçildi (${targetSheet.headers.length} sütun, ${rebuilt.length} sporcu).`
    );
  };

  // Update a single field's Excel column mapping and immediately recalculate the batch athlete reports
  const handleColumnMappingChange = (systemFieldKey: string, selectedExcelHeader: string) => {
    const nextMapping: Record<string, string> = { ...columnMapping };
    if (!selectedExcelHeader) {
      delete nextMapping[systemFieldKey];
    } else {
      nextMapping[systemFieldKey] = selectedExcelHeader;
    }
    setColumnMapping(nextMapping);

    if (activeExcelSheet) {
      const persistedBranding = getStoredLabSchoolBranding();
      const rebuilt = buildBatchReportsFromMappedRows(
        activeExcelSheet.rows,
        nextMapping,
        currentReport
      ).map((rep) => applyBrandingToReport(rep, persistedBranding));

      setBatchReports(rebuilt);
      setSelectedBatchIds(rebuilt.map((r) => r.id));
    }
  };

  // Re-run smart auto-detection on the active sheet's headers
  const handleAutoDetectMappingClick = () => {
    if (!activeExcelSheet) return;
    const detected = autoDetectExcelColumnMapping(activeExcelSheet.headers, false);
    setColumnMapping(detected);

    const persistedBranding = getStoredLabSchoolBranding();
    const rebuilt = buildBatchReportsFromMappedRows(
      activeExcelSheet.rows,
      detected,
      currentReport
    ).map((rep) => applyBrandingToReport(rep, persistedBranding));

    setBatchReports(rebuilt);
    setSelectedBatchIds(rebuilt.map((r) => r.id));
    const count = Object.values(detected).filter(Boolean).length;
    notify(`${count} karne alanı Excel başlıklarıyla otomatik olarak eşleştirildi ve tablo güncellendi.`);
  };

  // Save current column mapping rules to localStorage for future uploads
  const handleSaveColumnMappingRules = () => {
    saveStoredLabColumnMapping(columnMapping);
    const count = Object.values(columnMapping).filter(Boolean).length;
    notify(
      `${count} sütun eşleştirme kuralı tarayıcı hafızasına kaydedildi. Aynı formattaki sonraki Excel yüklemelerinde otomatik uygulanacaktır.`
    );
  };

  // Reset all optional mappings (keeping only Sporcu_Adi if matched so the table doesn't go blank unless desired)
  const handleResetColumnMapping = () => {
    if (!activeExcelSheet) return;
    const minimal: Record<string, string> = {};
    if (columnMapping.Sporcu_Adi) {
      minimal.Sporcu_Adi = columnMapping.Sporcu_Adi;
    }
    setColumnMapping(minimal);
    const persistedBranding = getStoredLabSchoolBranding();
    const rebuilt = buildBatchReportsFromMappedRows(
      activeExcelSheet.rows,
      minimal,
      currentReport
    ).map((rep) => applyBrandingToReport(rep, persistedBranding));
    setBatchReports(rebuilt);
    setSelectedBatchIds(rebuilt.map((r) => r.id));
    notify('Sütun eşleştirmeleri sıfırlandı. İstediğiniz karne alanlarını Excel başlıklarıyla yeniden eşleştirebilirsiniz.');
  };

  // Filtered mappable fields for the Column Mapping UI
  const visibleMappableFields = React.useMemo(() => {
    const essentialKeys = new Set([
      'Sporcu_Adi',
      'Sporcu_Kodu',
      'Brans',
      'Cinsiyet',
      'Yas',
      'Olcum_3_Tarihi',
      'Boy_3',
      'Agirlik_3',
      'Yag_Yuzdesi_3',
      'Surat_3',
      'Cabukluk_3',
      'Dikey_Sicrama_3',
      'Durarak_Uzun_Atlama_3',
      'Esneklik_3',
      'VO2max_3',
      'Tahmini_18_Yas_Boyu',
      'Genel_Performans_Puani',
      'Uzman_Gorusu',
    ]);
    const q = mappingSearchQuery.trim().toLowerCase();

    return LAB_BATCH_MAPPABLE_FIELDS.filter((field) => {
      if (mappingCategoryFilter === 'essential' && !essentialKeys.has(field.key)) {
        return false;
      }
      if (
        mappingCategoryFilter !== 'all' &&
        mappingCategoryFilter !== 'essential' &&
        field.category !== mappingCategoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        field.label.toLowerCase().includes(q) ||
        field.key.toLowerCase().includes(q) ||
        field.description.toLowerCase().includes(q) ||
        (columnMapping[field.key] || '').toLowerCase().includes(q)
      );
    });
  }, [mappingCategoryFilter, mappingSearchQuery, columnMapping]);

  const mappedFieldsCount = React.useMemo(
    () => LAB_BATCH_MAPPABLE_FIELDS.filter((f) => Boolean(columnMapping[f.key])).length,
    [columnMapping]
  );

  const filteredBatchReports = React.useMemo(() => {
    const q = batchSearchQuery.trim().toLowerCase();
    if (!q) return batchReports;
    return batchReports.filter(
      (rep) =>
        rep.athleteName.toLowerCase().includes(q) ||
        rep.sportBranch.toLowerCase().includes(q) ||
        rep.athleteCode.toLowerCase().includes(q) ||
        rep.gender.toLowerCase().includes(q)
    );
  }, [batchReports, batchSearchQuery]);

  const selectedBatchReports = React.useMemo(
    () => batchReports.filter((rep) => selectedBatchIds.includes(rep.id)),
    [batchReports, selectedBatchIds]
  );

  const handleToggleBatchSelectAll = () => {
    if (selectedBatchIds.length === batchReports.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(batchReports.map((r) => r.id));
    }
  };

  const handleToggleBatchRow = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRemoveFromBatch = (id: string) => {
    setBatchReports((prev) => prev.filter((r) => r.id !== id));
    setSelectedBatchIds((prev) => prev.filter((item) => item !== id));
  };

  // Generate & Save All Selected Batch Report Cards (to Active List + optionally to Karne Arşivi)
  const handleCreateAndArchiveSelectedBatch = () => {
    if (selectedBatchReports.length === 0) {
      notify('Lütfen toplu karne oluşturmak için tablodan en az 1 sporcu seçin.');
      return;
    }

    const persistedBranding = getStoredLabSchoolBranding();
    setSchoolBranding(persistedBranding);

    const brandedBatch = selectedBatchReports.map((rep) => {
      const branded = applyBrandingToReport(rep, persistedBranding);
      if (!branded.aiRecommendations) {
        branded.aiRecommendations = analyzeLabPerformanceMetrics(branded);
      }
      return branded;
    });

    // Merge into main reports list without duplicates
    const existingWithoutBatch = reports.filter(
      (r) => !brandedBatch.some((b) => b.id === r.id || b.athleteName === r.athleteName)
    );
    const nextReports = applyBrandingToReports(
      [...brandedBatch, ...existingWithoutBatch],
      persistedBranding
    );
    setReports(nextReports);
    saveStoredLabReports(nextReports);
    setSelectedReportId(brandedBatch[0].id);
    setActiveLabTab('studio');
    setViewMode('all');

    if (autoArchiveOnBatchCreate) {
      const nextArchives = archiveBatchLabReports(
        brandedBatch,
        batchGroupTitle,
        batchGroupNote
      );
      setArchivedReports(nextArchives);
      notify(
        `${brandedBatch.length} sporcunun karnesi Excel verileriyle başarıyla oluşturuldu ve karne stüdyosuna aktarıldı.`
      );
    } else {
      notify(
        `${brandedBatch.length} sporcunun karnesi "${persistedBranding.schoolName}" başlığıyla başarıyla oluşturuldu ve karne stüdyosuna aktarıldı.`
      );
    }
  };

  // Open a specific athlete from the Batch Table in 7-page Studio view, PDF Preview, or Download PDF
  const handleOpenBatchReport = (
    rep: SportsFlyLabReport,
    mode: 'view' | 'pdf-preview' | 'download-pdf' = 'view'
  ) => {
    const branded = applyBrandingToReport(rep, schoolBranding);
    const exists = reports.some((r) => r.id === branded.id);
    const nextReports = exists
      ? reports.map((r) => (r.id === branded.id ? branded : r))
      : [branded, ...reports];

    setReports(nextReports);
    saveStoredLabReports(nextReports);
    setSelectedReportId(branded.id);
    setActiveLabTab('studio');
    setViewMode('all');

    if (mode === 'pdf-preview') {
      setIsPdfPreviewMode(true);
      notify(`"${branded.athleteName}" karnesi A4 PDF önizleme modunda açıldı.`);
    } else if (mode === 'download-pdf') {
      setIsPdfPreviewMode(false);
      notify(`"${branded.athleteName}" karnesi yüklendi, PDF indiriliyor...`);
      setTimeout(() => {
        void handleDownloadPDF();
      }, 280);
    } else {
      setIsPdfPreviewMode(false);
      notify(`"${branded.athleteName}" 5 sayfalık karne görünümünde açıldı.`);
    }
  };

  // Export all selected batch athletes into a Single Combined A4 PDF OR Separate Individual A4 PDFs
  const handleExportBatchPDF = async (exportMode: 'combined' | 'separate') => {
    if (isGeneratingBatchPDF || isGeneratingPDF) return;
    if (selectedBatchReports.length === 0) {
      notify('Lütfen toplu PDF indirmek için tablodan en az 1 sporcu seçin.');
      return;
    }

    setIsGeneratingBatchPDF(true);
    const prevSelectedId = selectedReportId;
    const prevViewMode = viewMode;
    const prevZoom = pdfZoom;
    const prevTab = activeLabTab;

    if (activeLabTab !== 'studio') {
      setActiveLabTab('studio');
    }

    const persistedBranding = getStoredLabSchoolBranding();
    const brandedBatch = selectedBatchReports.map((rep) =>
      applyBrandingToReport(rep, persistedBranding)
    );

    // Ensure all selected batch athletes are in `reports` so `currentReport` resolves each one as we loop
    const existingWithoutBatch = reports.filter(
      (r) => !brandedBatch.some((b) => b.id === r.id)
    );
    const mergedReports = [...brandedBatch, ...existingWithoutBatch];
    setReports(mergedReports);
    saveStoredLabReports(mergedReports);
    setViewMode('all');
    setPdfZoom(100);

    const candidatePageIds = [
      'sportsfly-lab-page-bodymap',
      'sportsfly-lab-page-1',
      'sportsfly-lab-page-2',
      'sportsfly-lab-page-3',
      'sportsfly-lab-page-5',
    ];

    try {
      if (exportMode === 'combined') {
        const combinedBuilder = new BatchA4PdfBuilder();
        for (let i = 0; i < brandedBatch.length; i++) {
          const athlete = brandedBatch[i];
          setSelectedReportId(athlete.id);
          setBatchPdfStatusText(
            `Sporcu ${i + 1}/${brandedBatch.length}: ${athlete.athleteName} karnesi hazırlanıyor...`
          );
          await new Promise((r) => setTimeout(r, 420));
          const activePageIds = candidatePageIds.filter((id) => document.getElementById(id) !== null);
          await combinedBuilder.appendReportPages(activePageIds, (pageIdx, totalPages) => {
            setBatchPdfStatusText(
              `Birleşik PDF Oluşturuluyor — Sporcu ${i + 1}/${brandedBatch.length} (${athlete.athleteName}) · Sayfa ${pageIdx}/${totalPages}`
            );
          });
        }
        const safeGroup = (batchGroupTitle || 'Toplu_Sporcu_Karneleri')
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ-]/g, '');
        combinedBuilder.save(
          `SportsFly_Lab_Toplu_Karne_${brandedBatch.length}_Sporcu_${safeGroup}.pdf`
        );
        notify(`${brandedBatch.length} sporcunun karnesi tek bir birleşik A4 PDF dosyası olarak indirildi.`);
      } else {
        const reportsList: { athleteName: string; pageIds: string[] }[] = [];

        for (let i = 0; i < brandedBatch.length; i++) {
          const athlete = brandedBatch[i];
          setSelectedReportId(athlete.id);
          setBatchPdfStatusText(
            `Sporcu ${i + 1}/${brandedBatch.length}: ${athlete.athleteName} hazırlanıyor...`
          );
          await new Promise((r) => setTimeout(r, 350));
          const activePageIds = candidatePageIds.filter((id) => document.getElementById(id) !== null);
          reportsList.push({
            athleteName: athlete.athleteName,
            pageIds: activePageIds,
          });
        }

        const schoolName = persistedBranding.schoolName || batchGroupTitle || 'SportsFly Spor Kulübü';
        const safeSchoolName = schoolName.replace(/[\/\\?%*:|"<>]/g, '_').trim();
        const zipFileName = `${safeSchoolName} — Karne Arşivi.zip`;

        await downloadReportsAsPdfZip({
          reports: reportsList,
          zipFileName,
          onProgress: (_curr, _total, _name, status) => {
            setBatchPdfStatusText(status);
          },
        });

        notify(`${brandedBatch.length} sporcunun ayrı PDF karneleri "${zipFileName}" adlı ZIP arşivinde sporcu isimleriyle birleştirildi.`);
      }
    } catch (err: any) {
      console.error('Toplu PDF oluşturma hatası:', err);
      notify(err?.message || 'Toplu PDF oluşturulurken bir hata meydana geldi.');
    } finally {
      setIsGeneratingBatchPDF(false);
      setBatchPdfStatusText(null);
      setSelectedReportId(prevSelectedId);
      setViewMode(prevViewMode);
      setPdfZoom(prevZoom);
      if (prevTab !== 'studio') {
        setActiveLabTab(prevTab);
      }
    }
  };

  // Run Server-Side Gemini AI Analysis on the Athlete's Excel Metrics
  const handleRunAiAnalysis = async (
    targetReport: SportsFlyLabReport = currentReport,
    baseList: SportsFlyLabReport[] = reports
  ) => {
    setIsAnalyzingAI(true);
    setAiError(null);
    try {
      const geminiResult = await fetchGeminiLabRecommendations(targetReport);
      const nextList = baseList.map((r) =>
        r.id === targetReport.id ? { ...r, aiRecommendations: geminiResult } : r
      );
      setReports(nextList);
      saveStoredLabReports(nextList);
      notify(`"${targetReport.athleteName}" için yapay zeka performans önerileri güncellendi.`);
    } catch (err: any) {
      console.error('AI Performans Analizi Hatası:', err);
      const fallback = analyzeLabPerformanceMetrics(targetReport);
      const nextList = baseList.map((r) =>
        r.id === targetReport.id ? { ...r, aiRecommendations: fallback } : r
      );
      setReports(nextList);
      saveStoredLabReports(nextList);
      setAiError(err?.message || null);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Apply AI Summary & Top Recommendations directly into Page 5 Expert Comment
  const handleApplyAiToExpertComment = () => {
    const drillBullets = activeAiAnalysis.improvementAreas
      .slice(0, 3)
      .map(
        (i, idx) =>
          `• ${idx + 1}. ${i.metricName} (Mevcut: ${i.currentValue} → Hedef: ${i.targetValue}): ${i.drillRecommendation}`
      )
      .join('\n');

    const sections = [
      activeAiAnalysis.overallSummary,
      drillBullets ? `\n\n[1] ÖNCELİKLİ GELİŞİM VE DRİLL REÇETESİ:\n${drillBullets}` : '',
      activeAiAnalysis.nutritionAndRecoveryTip
        ? `\n\n[2] BESLENME & TOPARLANMA REHBERİ: ${activeAiAnalysis.nutritionAndRecoveryTip}`
        : '',
    ].filter(Boolean);

    const enrichedComment = sections.join('');
    const updated = {
      ...currentReport,
      expertComment: enrichedComment,
      aiRecommendations: activeAiAnalysis,
    };
    handleUpdateCurrentReport(updated);

    // Sync directly to the athlete's 5-page report card (SporcuKarne) as well!
    try {
      const currentKarneler = getStoredKarneler();
      const athleteIdClean = currentReport.athleteId?.toLowerCase().trim();
      const athleteNameClean = currentReport.athleteName?.toLowerCase().trim();

      let found = false;
      const updatedKarneler = currentKarneler.map((k) => {
        const kIdClean = k.sporcuId?.toLowerCase().trim();
        const kAdClean = k.adSoyad?.toLowerCase().trim();

        const isIdMatch = athleteIdClean && (kIdClean === athleteIdClean || kIdClean === `s-${athleteIdClean}`);
        const isNameMatch = athleteNameClean && kAdClean && (kAdClean === athleteNameClean || kAdClean.includes(athleteNameClean) || athleteNameClean.includes(kAdClean));

        if (isIdMatch || isNameMatch) {
          found = true;
          return {
            ...k,
            expertComment: enrichedComment,
          };
        }
        return k;
      });

      if (found) {
        saveStoredKarneler(updatedKarneler);
        notify(`Uzman ve yapay zeka değerlendirmesi "${currentReport.athleteName}" adlı sporcunun 5. Sayfa Uzman Görüşü alanına başarıyla aktarıldı.`);
      } else {
        notify('Uzman ve yapay zeka değerlendirmesi karneye (5. Sayfa Uzman Görüşü alanına) başarıyla aktarıldı.');
      }
    } catch (err) {
      console.error('Error syncing expertComment to SporcuKarne:', err);
      notify('Uzman ve yapay zeka değerlendirmesi karneye (5. Sayfa Uzman Görüşü alanına) başarıyla aktarıldı.');
    }
  };

  // Handle PDF Download of the complete report card ('Tüm Karneyi İndir')
  const handleDownloadPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    setPdfProgressPage(1);

    const previousMode = viewMode;
    const previousZoom = pdfZoom;
    const previousTab = activeLabTab;

    if (activeLabTab !== 'studio' || viewMode !== 'all' || pdfZoom !== 100) {
      setActiveLabTab('studio');
      setViewMode('all');
      setPdfZoom(100);
      setIsPdfPreviewMode(true);
      await new Promise((r) => setTimeout(r, 450));
    } else {
      await new Promise((r) => setTimeout(r, 120));
    }

    try {
      const safeName = currentReport.athleteName.replace(/\s+/g, '_');
      let pageIds: string[] = [];
      let fileName = '';

      if (reportCardFormat === 'parent-athlete') {
        pageIds = ['sportsfly-lab-parent-athlete-page'];
        fileName = `SportsFly_Veli_ve_Sporcu_Karnesi_${safeName}.pdf`;
      } else if (reportCardFormat === 'coach-club') {
        pageIds = ['sportsfly-lab-coach-club-page'];
        fileName = `SportsFly_Antrenor_ve_Kulup_Karnesi_${safeName}.pdf`;
      } else {
        const candidatePageIds = [
          'sportsfly-lab-page-bodymap',
          'sportsfly-lab-page-1',
          'sportsfly-lab-page-2',
          'sportsfly-lab-page-3',
          'sportsfly-lab-page-5',
        ];
        pageIds = candidatePageIds.filter((id) => document.getElementById(id) !== null);

        // If elements are not ready yet, wait an additional 300ms
        if (pageIds.length === 0) {
          await new Promise((r) => setTimeout(r, 350));
          pageIds = candidatePageIds.filter((id) => document.getElementById(id) !== null);
        }

        if (pageIds.length === 0) {
          const printArea = document.getElementById('sportsfly-lab-print-area');
          if (printArea) {
            fileName = `SportsFly_Lab_Karne_${safeName}.pdf`;
            await exportContainerToSmartA4Pdf({
              containerEl: printArea,
              fileName,
            });
            notify(`${currentReport.athleteName} için sporcu karnesi PDF olarak indirildi.`);
            return;
          }
          throw new Error('Karne sayfaları DOM üzerinde bulunamadı.');
        }

        fileName = `SportsFly_Lab_Tum_Karne_${safeName}.pdf`;
      }

      await exportReportPagesToA4Pdf({
        pageIds,
        fileName,
        onPageProgress: (pageIdx) => setPdfProgressPage(pageIdx),
      });

      notify(
        `${currentReport.athleteName} için ${pageIds.length} sayfalık sporcu karnesi temiz A4 PDF olarak indirildi.`
      );
    } catch (err: any) {
      console.error('PDF oluşturma hatası:', err);
      notify(err?.message || 'PDF oluşturulurken bir hata meydana geldi.');
    } finally {
      setIsGeneratingPDF(false);
      setPdfProgressPage(null);
      setViewMode(previousMode);
      setPdfZoom(previousZoom);
      if (previousTab !== 'studio') {
        setActiveLabTab(previousTab);
      }
    }
  };


  // Trigger clean A4 Print / Browser PDF Output using @media print styles
  const handlePrintA4 = async () => {
    setActiveLabTab('studio');
    setViewMode('all');
    setPdfZoom(100);
    setIsPdfPreviewMode(true);

    const inIframe = window.self !== window.top;
    if (inIframe) {
      notify('A4 Düzeni Hazırlandı! İframe ortamı nedeniyle temiz A4 PDF dosyanız oluşturulup indiriliyor...');
      await handleDownloadPDF();
      return;
    }

    notify('A4 Yazdırma diyaloğu hazırlanıyor...');

    setTimeout(async () => {
      try {
        window.print();
      } catch (err) {
        console.warn('window.print çağrısı uyarısı:', err);
        notify('Yazdırma diyaloğu engellendi. Temiz A4 PDF dosyanız oluşturulup indiriliyor...');
        await handleDownloadPDF();
      }
    }, 250);
  };

  // Karne Sayfaları Meta Bilgileri (JPEG & PDF için)
  interface KarnePageMeta {
    id: string;
    pageNumber: number;
    title: string;
    subtitle: string;
    fileName: string;
  }

  const getKarnePagesMeta = (): KarnePageMeta[] => {
    const safeName = (currentReport.athleteName || 'Sporcu').trim().replace(/\s+/g, '_');

    if (reportCardFormat === 'parent-athlete') {
      return [
        {
          id: 'sportsfly-lab-parent-athlete-page',
          pageNumber: 1,
          title: 'Veli ve Sporcu Karnesi',
          subtitle: 'Sporcu ve veli odaklı görsel gelişim özeti',
          fileName: `SportsFly_Veli_ve_Sporcu_Karnesi_${safeName}.jpg`,
        },
      ];
    }

    if (reportCardFormat === 'coach-club') {
      return [
        {
          id: 'sportsfly-lab-coach-club-page',
          pageNumber: 1,
          title: 'Antrenör ve Kulüp Karnesi',
          subtitle: 'Teknik heyet ve antrenörler için detaylı performans raporu',
          fileName: `SportsFly_Antrenor_ve_Kulup_Karnesi_${safeName}.jpg`,
        },
      ];
    }

    const pages: KarnePageMeta[] = [];
    let pageNum = 1;

    if (showBodyMapInfographic) {
      pages.push({
        id: 'sportsfly-lab-page-bodymap',
        pageNumber: pageNum++,
        title: '3D Beden Haritası & Postür Analizi',
        subtitle: '3D Anatomik Model, Ön & Arka Görünüm, Bölgesel Antropometri ve Postür',
        fileName: `SportsFly_Lab_${safeName}_Sayfa_1_Beden_Haritasi.jpg`,
      });
    }

    pages.push({
      id: 'sportsfly-lab-page-1',
      pageNumber: pageNum++,
      title: 'Beden Kompozisyonu & Antropometri',
      subtitle: 'Kilo, Boy, Yağ Oranı, Kas Kütlesi, ISAK L2 Çevre ve Kemik Çapları',
      fileName: `SportsFly_Lab_${safeName}_Sayfa_${pageNum - 1}_Antropometri.jpg`,
    });

    pages.push({
      id: 'sportsfly-lab-page-2',
      pageNumber: pageNum++,
      title: 'Biyomotor Yetenek & Somatotip Radar',
      subtitle: 'Somatotip Koordinatları, Somatochart Radarı, Sürat, Çeviklik ve Kuvvet Testleri',
      fileName: `SportsFly_Lab_${safeName}_Sayfa_${pageNum - 1}_Somatotip.jpg`,
    });

    pages.push({
      id: 'sportsfly-lab-page-3',
      pageNumber: pageNum++,
      title: 'Kardiyo, Enerji & Anaerobik Kapasite',
      subtitle: 'Maksimal Oksijen Tüketimi (VO2peak), PACER, Anaerobik Laktat Gücü ve Nabız Değerleri',
      fileName: `SportsFly_Lab_${safeName}_Sayfa_${pageNum - 1}_Kardiyo.jpg`,
    });

    pages.push({
      id: 'sportsfly-lab-page-5',
      pageNumber: pageNum++,
      title: 'İpsatif Hedefler & Uzman Değerlendirmesi',
      subtitle: 'Bireysel Gelişim Hedefleri, Grup İçi Sıralama, AI ve Uzman Görüşü',
      fileName: `SportsFly_Lab_${safeName}_Sayfa_${pageNum - 1}_Uzman_Gorusu.jpg`,
    });

    return pages;
  };

  const handleOpenJpegModal = (preselectedPageId?: string) => {
    const pages = getKarnePagesMeta();
    if (preselectedPageId) {
      setSelectedJpegPageIds([preselectedPageId]);
    } else if (selectedJpegPageIds.length === 0) {
      setSelectedJpegPageIds(pages.map((p) => p.id));
    }
    setShowJpegModal(true);
  };

  // Tekil bir sayfayı anında JPEG olarak indir
  const handleDownloadSingleJpeg = async (pageId: string) => {
    if (isGeneratingJpeg) return;
    const pages = getKarnePagesMeta();
    const pageMeta = pages.find((p) => p.id === pageId);
    if (!pageMeta) return;

    setIsGeneratingJpeg(true);
    setJpegProgressText(`Sayfa ${pageMeta.pageNumber} (${pageMeta.title}) JPEG olarak hazırlanıyor...`);

    const prevMode = viewMode;
    const prevZoom = pdfZoom;
    const prevTab = activeLabTab;

    try {
      if (activeLabTab !== 'studio' || viewMode !== 'all' || pdfZoom !== 100) {
        setActiveLabTab('studio');
        setViewMode('all');
        setPdfZoom(100);
        setIsPdfPreviewMode(true);
        await new Promise((r) => setTimeout(r, 450));
      } else {
        await new Promise((r) => setTimeout(r, 120));
      }

      let el = document.getElementById(pageId);
      if (!el) {
        await new Promise((r) => setTimeout(r, 350));
        el = document.getElementById(pageId);
      }

      if (!el) {
        throw new Error(`"${pageMeta.title}" sayfası DOM üzerinde bulunamadı.`);
      }

      await downloadPageAsJpeg(pageId, pageMeta.fileName, jpegQuality);
      notify(`${currentReport.athleteName} - ${pageMeta.title} JPEG görseli başarıyla indirildi.`);
    } catch (err: any) {
      console.error('JPEG indirme hatası:', err);
      notify(err?.message || 'JPEG dosyası oluşturulurken bir hata oluştu.');
    } finally {
      setIsGeneratingJpeg(false);
      setJpegProgressText(null);
      setViewMode(prevMode);
      setPdfZoom(prevZoom);
      if (prevTab !== 'studio') {
        setActiveLabTab(prevTab);
      }
    }
  };

  // Seçili veya tüm sayfaları JPEG (veya çoklu ise ZIP paketi) olarak indir
  const handleDownloadJpegZipOrSelected = async (targetPageIds?: string[]) => {
    if (isGeneratingJpeg) return;
    const allPages = getKarnePagesMeta();
    const pagesToDownload = targetPageIds && targetPageIds.length > 0
      ? allPages.filter((p) => targetPageIds.includes(p.id))
      : allPages;

    if (pagesToDownload.length === 0) {
      notify('Lütfen indirmek için en az bir karne sayfası seçin.');
      return;
    }

    if (pagesToDownload.length === 1) {
      await handleDownloadSingleJpeg(pagesToDownload[0].id);
      return;
    }

    setIsGeneratingJpeg(true);
    setJpegProgressText(`Sayfalar hazırlanıyor (1/${pagesToDownload.length})...`);

    const prevMode = viewMode;
    const prevZoom = pdfZoom;
    const prevTab = activeLabTab;

    try {
      if (activeLabTab !== 'studio' || viewMode !== 'all' || pdfZoom !== 100) {
        setActiveLabTab('studio');
        setViewMode('all');
        setPdfZoom(100);
        setIsPdfPreviewMode(true);
        await new Promise((r) => setTimeout(r, 450));
      } else {
        await new Promise((r) => setTimeout(r, 150));
      }

      const safeName = (currentReport.athleteName || 'Sporcu').trim().replace(/\s+/g, '_');
      const isAll = pagesToDownload.length === allPages.length;
      const zipFileName = isAll
        ? `SportsFly_Lab_Tum_Karne_JPEGs_${safeName}.zip`
        : `SportsFly_Lab_Secili_Karne_JPEGs_${safeName}.zip`;

      await downloadPagesAsJpegZip({
        pages: pagesToDownload.map((p) => ({
          elementId: p.id,
          fileName: p.fileName,
          title: p.title,
        })),
        zipFileName,
        quality: jpegQuality,
        onProgress: (current, total, title) => {
          setJpegProgressText(`JPEG Paketleniyor: ${title} (${current}/${total})...`);
        },
      });

      notify(
        `${currentReport.athleteName} için ${pagesToDownload.length} karne sayfası yüksek çözünürlüklü JPEG paketi (ZIP) olarak indirildi.`
      );
      setShowJpegModal(false);
    } catch (err: any) {
      console.error('JPEG ZIP indirme hatası:', err);
      notify(err?.message || 'JPEG paketi oluşturulurken bir hata meydana geldi.');
    } finally {
      setIsGeneratingJpeg(false);
      setJpegProgressText(null);
      setViewMode(prevMode);
      setPdfZoom(prevZoom);
      if (prevTab !== 'studio') {
        setActiveLabTab(prevTab);
      }
    }
  };

  // Open Web A4 PDF Preview Mode
  const handleTogglePdfPreview = () => {
    const nextState = !isPdfPreviewMode;
    setIsPdfPreviewMode(nextState);
    if (nextState) {
      setActiveLabTab('studio');
      setViewMode('all');
      notify('Karne A4 PDF görüntüleme moduna alındı (5 Sayfa A4 Baskı Düzeni).');
      setTimeout(() => {
        const target = document.getElementById('sportsfly-lab-preview-bar') || document.getElementById('sportsfly-lab-print-area');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      notify('Normal çalışma görünümüne dönüldü.');
    }
  };

  // Download Critical Performance PDF
  const handleDownloadCriticalPDF = async () => {
    try {
      notify(`${currentReport.athleteName} kritik performans PDF raporu hazırlanıyor...`);
      await downloadCriticalPerformancePDF(currentReport, 'sportsfly-critical-performance-chart');
      notify(`${currentReport.athleteName} kritik performans PDF raporu indirildi.`);
    } catch (err) {
      console.error(err);
      notify('PDF oluşturulurken bir hata meydana geldi.');
    }
  };

  // Download Critical Performance CSV
  const handleDownloadCriticalCSV = () => {
    try {
      downloadCriticalPerformanceCSV(currentReport);
      notify(`${currentReport.athleteName} performans verileri CSV formatında indirildi.`);
    } catch (err) {
      console.error(err);
      notify('CSV oluşturulurken bir hata meydana geldi.');
    }
  };

  // Helper to compute position percentage (0..100%) on the reference scale bar
  const computeScalePos = (val: number, row: LabParameterRow): number => {
    if (!Number.isFinite(val)) return 50;
    const min = row.refLow * 0.75;
    const max = row.refHigh * 1.15;
    if (max === min) return 50;
    let pct = ((val - min) / (max - min)) * 100;
    if (!Number.isFinite(pct)) return 50;
    if (row.lowerIsBetter) {
      pct = 100 - pct;
    }
    return Math.max(4, Math.min(96, pct));
  };

  // Status text color & badge helper (clean clinical presentation with high contrast)
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'mükemmel' || s === 'iyi' || s === 'yüksek') {
      return 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10.5px] inline-block shadow-2xs';
    }
    if (s === 'normal' || s === 'uzun' || s === 'optimal') {
      return 'bg-blue-50 text-blue-900 border border-blue-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10.5px] inline-block shadow-2xs';
    }
    if (s === 'desteklenmeli' || s === 'orta') {
      return 'bg-amber-100 text-slate-900 border border-amber-400 font-black px-2.5 py-0.5 rounded-full text-[10.5px] inline-block shadow-2xs';
    }
    return 'bg-rose-50 text-rose-900 border border-rose-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10.5px] inline-block shadow-2xs';
  };

  const getStatusColor = (status: string) => {
    return getStatusBadge(status);
  };

  // Update current report in state & storage
  const handleUpdateCurrentReport = (updated: SportsFlyLabReport) => {
    ensureDataConsistency(updated);
    const nextList = reports.map((r) => (r.id === updated.id ? updated : r));
    setReports(nextList);
    saveStoredLabReports(nextList);
  };

  // Helper to extract up to 2 monogram initials for default Sport School crest
  const getSchoolInitials = (name: string) => {
    const words = name
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (words.length === 0) return 'SK';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  const isDarkHeaderTpl =
    karneTemplate !== 'modern-minimal' || clubColorPalette !== 'template-default';
  const topBarColors = [
    effectivePrimaryHex,
    effectiveSecondaryHex,
    clubColorPalette === 'template-default'
      ? karneTemplate === 'corporate-technical'
        ? '#d97706'
        : karneTemplate === 'athletic-data'
          ? '#059669'
          : '#e11d48'
      : activePaletteObj.accentHex,
  ];

  const totalReportPages = 5;
  const pageOffset = 1;

  // Compute group age range dynamically from the youngest and oldest measured athletes in the group
  const effectiveGroupAgeRange = (() => {
    const combinedMap = new Map<string, SportsFlyLabReport>();
    [...batchReports, ...reports].forEach((r) => {
      if (r && r.id) combinedMap.set(r.id, r);
    });
    const allMeasured = Array.from(combinedMap.values());
    const targetClub = (currentReport.clubName || effectiveClubName || '').trim().toLocaleLowerCase('tr-TR');
    const sameClubPool = allMeasured.filter(
      (r) => (r.clubName || '').trim().toLocaleLowerCase('tr-TR') === targetClub
    );
    const activePool = sameClubPool.length >= 2 ? sameClubPool : allMeasured;
    const validAges = activePool
      .map((r) => Math.floor(Number(r.ageYears) || 0))
      .filter((a) => a >= 4 && a <= 35);

    if (validAges.length >= 2) {
      const minAge = Math.min(...validAges);
      const maxAge = Math.max(...validAges);
      return minAge !== maxAge ? `${minAge} - ${maxAge} Yaş` : `${minAge} Yaş`;
    }
    if (currentReport.groupInfo?.ageRange && currentReport.groupInfo.ageRange.includes('-')) {
      return currentReport.groupInfo.ageRange;
    }
    const fallbackAge = Math.floor(Number(currentReport.ageYears) || 12);
    return `${fallbackAge} Yaş`;
  })();

  // Render Transparent Analysis Firm Background Watermark on every A4 Page
  const renderPageWatermark = () => (
    <div
      className="absolute inset-0 pointer-events-none select-none flex flex-col items-center justify-center overflow-hidden z-0"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center opacity-[0.10] -rotate-6 transition-opacity">
        <div className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] flex items-center justify-center p-6">
          <img
            src={ROTA_PERFORMANS_LOGO_DATA_URL}
            alt="Rota Performans"
            className="w-full h-full object-contain filter drop-shadow-xs"
          />
        </div>
      </div>
    </div>
  );

  // Render Page Header (Consistent across all 7 pages — adapts to selected Karne Template & Club Color Palette)
  const renderPageHeader = (pageNo: number, sectionTitle: string, subtitle: string) => (
    <>
      {renderPageWatermark()}
      <div className="mb-5 a4-avoid-break relative z-10">
        {/* Corporate Technical Top Protocol Strip (Only in 'corporate-technical' template) */}
        {karneTemplate === 'corporate-technical' && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 mb-2 rounded-md text-[9px] font-sans tabular-nums font-bold uppercase tracking-widest border"
            style={{
              backgroundColor: '#f8fafc',
              borderColor: effectivePrimaryHex,
              color: effectivePrimaryHex,
            }}
          >
            <span>
              DOKÜMAN NO: SFL-2026-{currentReport.athleteCode} · REV.03
            </span>
            <span>ISO / ISAK ANTROPOMETRİK &amp; BİYOMEKANİK LABORATUVAR STANDARDI</span>
            <span>SAYFA FORMU: A4-0{pageNo + pageOffset}/0{totalReportPages}</span>
          </div>
        )}

        {/* Signature Top Accent Line (Pure SVG for 100% Browser Print & PDF fidelity) */}
        <svg
          viewBox="0 0 600 6"
          preserveAspectRatio="none"
          className="w-full h-1.5 rounded-full overflow-hidden block mb-3"
          aria-hidden="true"
        >
          <rect x="0" y="0" width="348" height="6" fill={topBarColors[0]} />
          <rect x="348" y="0" width="144" height="6" fill={topBarColors[1]} />
          <rect x="492" y="0" width="108" height="6" fill={topBarColors[2]} />
        </svg>

        {/* TOP INSTITUTIONAL BAR: Spor Okulu Logosu & Spor Okulu Adı (Template & Club Palette Styled) */}
        <div
          className={`flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-3 ${
            isDarkHeaderTpl
              ? 'p-4 rounded-xl mb-4 text-white shadow-2xs'
              : 'p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/90 mb-4 text-slate-900'
          }`}
          style={
            isDarkHeaderTpl
              ? {
                  backgroundColor: effectivePrimaryHex,
                  borderBottom: `4px solid ${effectiveSecondaryHex}`,
                }
              : {
                  borderLeft: `5px solid ${effectiveSecondaryHex}`,
                }
          }
        >
          {/* Left: Sport School Logo & Name */}
          <div className="flex items-center gap-4">
            <div
              className="w-13 h-13 rounded-xl border bg-white p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs"
              style={{ borderColor: isDarkHeaderTpl ? effectiveSecondaryHex : '#e2e8f0' }}
            >
              {effectiveSchoolLogo ? (
                <img
                  src={effectiveSchoolLogo}
                  alt={effectiveClubName}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none">
                  <path
                    d="M24 4L8 10V22.5C8 33.2 14.8 42.3 24 45C33.2 42.3 40 33.2 40 22.5V10L24 4Z"
                    fill={topBarColors[0]}
                    stroke={topBarColors[1]}
                    strokeWidth="2"
                  />
                  <path
                    d="M24 7.5L11.5 12.2V22.2C11.5 30.8 16.8 38.2 24 40.6C31.2 38.2 36.5 30.8 36.5 22.2V12.2L24 7.5Z"
                    stroke={topBarColors[1]}
                    strokeWidth="0.8"
                    strokeOpacity="0.5"
                  />
                  <text
                    x="24"
                    y="28"
                    textAnchor="middle"
                    className="text-[13px] font-black fill-white font-sans"
                    style={{ fontWeight: 800 }}
                  >
                    {getSchoolInitials(effectiveClubName)}
                  </text>
                </svg>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-[9.5px] font-sans tabular-nums font-bold tracking-widest uppercase">
                <span
                  style={{
                    color: isDarkHeaderTpl ? effectiveSecondaryHex : effectivePrimaryHex,
                  }}
                >
                  RESMİ SPORCU GELİŞİM &amp; PERFORMANS KARNESİ
                </span>
              </div>
              <div
                className={`text-base sm:text-lg font-black tracking-tight uppercase leading-snug ${
                  isDarkHeaderTpl ? 'text-white' : 'text-slate-900'
                }`}
              >
                {effectiveClubName}
              </div>
              <div
                className={`text-[11px] font-semibold flex flex-wrap items-center gap-2 ${
                  isDarkHeaderTpl ? 'text-white/80' : 'text-slate-500'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>Branş: <strong className={isDarkHeaderTpl ? 'text-white' : 'text-slate-900 font-extrabold'}>{currentReport.sportBranch}</strong></span>
                </div>
                <span>·</span>
                <span>Grup: {effectiveGroupAgeRange}</span>
              </div>
            </div>
          </div>

          {/* Right: Dual Branding - Analiz Firması (Rota Performans) & Powered by SportsFly LAB */}
          <RotaSportsFlyHeaderBadge
            isDark={isDarkHeaderTpl}
            pageNo={pageNo + pageOffset}
            totalReportPages={totalReportPages}
            effectiveSecondaryHex={effectiveSecondaryHex}
            firmLogoUrl={effectiveAnalysisFirmLogo}
            firmName={effectiveAnalysisFirmName}
          />
        </div>

        {/* SECOND ROW: Section Title & Athlete Biometric Strip */}
        <div
          className="pt-2 pb-2.5 border-b-2 flex flex-col lg:flex-row print:flex-row lg:items-end print:items-end justify-between gap-2.5"
          style={{ borderBottomColor: effectivePrimaryHex }}
        >
          <div>
            <h2
              className="text-base sm:text-lg font-extrabold tracking-tight"
              style={{ color: effectivePrimaryHex }}
            >
              {hideSectionNumbers ? sectionTitle.replace(/^\d+\.\s*/, '') : sectionTitle}
            </h2>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 whitespace-nowrap shrink-0 overflow-hidden">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Sporcu:</span>
              <span className="font-extrabold text-slate-900">{currentReport.athleteName}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Yaş:</span>
              <span className="font-sans tabular-nums font-bold text-slate-800">
                {currentReport.ageYears} ({currentReport.ageMonths} ay)
              </span>
              {currentReport.birthDate && currentReport.birthDate !== '—' && (
                <span className="text-slate-500 font-sans tabular-nums text-[10px]">
                  · D.T: {parseDateString(currentReport.birthDate)}
                </span>
              )}
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Ölçümler:</span>
              <span className="font-sans tabular-nums text-[10.5px] text-slate-700">
                I: {parseDateString(currentReport.date1) || '—'} · II (Tahmini): {parseDateString(currentReport.date2) || '2-4 Ay Arası'}
                {currentReport.date3 && currentReport.date3 !== '—' && currentReport.date3 !== '' ? ` · III: ${parseDateString(currentReport.date3)}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Render Page Footer (Consistent across all pages — Template & Club Color styled at the bottom of every A4 page)
  const renderPageFooter = (pageNo: number | string) => (
    <div
      className={`mt-4 pt-3 a4-avoid-break relative z-10 ${activeTemplate.footerBorderClass}`}
      style={{ borderTopColor: effectivePrimaryHex }}
    >
      <RotaSportsFlyFooterBadge
        primaryHex={effectivePrimaryHex}
        clubName={effectiveClubName}
        athleteCode={currentReport.athleteCode}
        pageText={typeof pageNo === 'number' ? `S.${pageNo + pageOffset}/${totalReportPages}` : String(pageNo)}
        firmLogoUrl={effectiveAnalysisFirmLogo}
        firmName={effectiveAnalysisFirmName}
      />
      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 text-center font-medium leading-relaxed px-3 py-1.5 bg-slate-50/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
          <span className="inline-flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
            <span>
              <strong className="text-slate-700 dark:text-slate-200 font-bold">Dünya Sağlık Örgütü (WHO) Referansı:</strong> Bu rapordaki norm değerleri WHO verilerine dayanarak analiz edilmiştir.
            </span>
          </span>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="text-blue-800 dark:text-blue-300 font-bold bg-blue-100/50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg border border-blue-200/50 inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>2. test hedefleri sporcunun yaş ve branş grubuna uygun SportsFly Intelligence normatif performans modellerine dayanarak oluşturulmuştur.</span>
          </span>
        </div>
      </div>
      <div className="mt-1.5 text-center text-[9.5px] font-sans font-bold tracking-widest text-slate-400 dark:text-slate-500 opacity-50 uppercase">
        www.sportsfly.com.tr
      </div>
    </div>
  );

  // ============================================================================
  // B: TAM SAYFA MERKEZLİ ANATOMİK VÜCUT HARİTASI & ANTROPOMETRİ İNFOGRAFİĞİ
  //    (FULL-PAGE CENTERED PRO ANATOMICAL BODY MAP INFOGRAPHIC)
  // ============================================================================
  const renderAnatomicalBodyMapPage = () => {
    if (!showBodyMapInfographic) return null;

    const findAliasRow = (id: string): LabParameterRow | undefined => {
      const aliasMap: Record<string, string[]> = {
        height: ['height', 'boy'],
        weight: ['weight', 'kilo', 'ağırlık', 'agirlik'],
        bmi: ['bmi', 'bki', 'beden kütle'],
        bodyFat: ['body_fat', 'bodyfat', 'yag', 'yağ'],
        tricepsSkinfold: ['triceps', 'triceps_skf', 'tricepsskinfold'],
        bicepsSkinfold: ['biceps_skf', 'bicepsskinfold', 'biceps deri'],
        suprailiacSkinfold: ['iliac_skf', 'iliak', 'suprailiac', 'suprailiacskinfold'],
        calfSkinfold: ['calf_skf', 'calfskinfold', 'calf deri'],
        rightGrip: ['grip_strength_right', 'pencesag', 'pençe kuvveti (sağ)', 'pence kuvveti - sag'],
        leftGrip: ['grip_strength_left', 'pencesol', 'pençe kuvveti (sol)', 'pence kuvveti - sol'],
        rightArmSpeed: ['arm_speed_right', 'kol sürat testi (sağ)', 'kol surat testi sag'],
        leftArmSpeed: ['arm_speed_left', 'kol sürat testi (sol)', 'kol surat testi sol'],
        flexibility: ['flexibility', 'esneklik', 'otur-uzan'],
        verticalJump: ['vertical_jump', 'verticaljump', 'dikey sıçrama', 'sicrama'],
        sprint20m: ['sprint', '20m sprint', '20 metre sprint', 'sürat'],
        agility10x5: ['agility', '10x5m', '10 x 5 metre', 'çabukluk'],
        longJump: ['standing_long_jump', 'durarak uzun atlama'],
      };

      const keysToTry = aliasMap[id] || [id];
      for (const k of keysToTry) {
        const lower = k.toLowerCase();
        const bodyHit = currentReport.bodyComposition?.find(
          (r) =>
            r.id.toLowerCase() === lower ||
            (r.name && r.name.toLowerCase().includes(lower))
        );
        if (bodyHit) return bodyHit;

        const motorHit = currentReport.motorPerformance?.find(
          (r) =>
            r.id.toLowerCase() === lower ||
            (r.name && r.name.toLowerCase().includes(lower))
        );
        if (motorHit) return motorHit;
      }
      return undefined;
    };

    const getMeasuredRow = (id: string): LabParameterRow | undefined => {
      const r = findAliasRow(id);
      if (!r || !isLabRowMeasured(r)) return undefined;
      return r;
    };

    const getMeasuredVal = (id: string): number | null => {
      const r = getMeasuredRow(id);
      if (!r) return null;
      if (typeof r.m1 === 'number' && Number.isFinite(r.m1) && r.m1 > 0) return r.m1;
      if (typeof r.m2 === 'number' && Number.isFinite(r.m2) && r.m2 > 0) return r.m2;
      if (typeof r.m3 === 'number' && Number.isFinite(r.m3) && r.m3 > 0) return r.m3;
      return null;
    };

    const getMeasuredM1 = (id: string): number | null => {
      const r = getMeasuredRow(id);
      return r && typeof r.m1 === 'number' && r.m1 > 0 ? r.m1 : null;
    };

    const getMeasuredM2 = (id: string): number | null => {
      const r = getMeasuredRow(id);
      if (!r) return null;
      const m1Val = getMeasuredM1(id);
      if (m1Val === null) return null;
      let m2Val = typeof r.m2 === 'number' && r.m2 > 0 ? r.m2 : m1Val;
      const isLowerBetter = r?.lowerIsBetter ?? false;
      if (isLowerBetter) {
        if (m2Val > m1Val) m2Val = +(m1Val * 0.975).toFixed(2);
      } else {
        if (m2Val < m1Val) m2Val = +(m1Val * 1.05).toFixed(1);
      }
      return m2Val;
    };

    const getIdealCalloutPct = (id: string, defaultPct = 76): number => {
      const row = getMeasuredRow(id);
      const rawPct = row?.percentile;
      if (typeof rawPct === 'number' && Number.isFinite(rawPct) && rawPct > 0) {
        return Math.max(68, Math.min(86, Math.round(rawPct)));
      }
      return defaultPct;
    };

    const getMeasuredSd = (id: string): number => getMeasuredRow(id)?.sd ?? 0;
    const getMeasuredStatus = (id: string, fallback = 'Optimal'): string =>
      getMeasuredRow(id)?.status || fallback;

    const heightVal = getMeasuredVal('height');
    const weightVal = getMeasuredVal('weight');
    const bmiVal =
      getMeasuredVal('bmi') ??
      (heightVal && weightVal ? +(weightVal / Math.pow(heightVal / 100, 2)).toFixed(2) : null);
    const fatVal = getMeasuredVal('bodyFat');

    const tricepsSf = getMeasuredVal('tricepsSkinfold');
    const bicepsSf = getMeasuredVal('bicepsSkinfold');
    const suprailiacSf = getMeasuredVal('suprailiacSkinfold');
    const calfSf = getMeasuredVal('calfSkinfold');
    const measuredSkinfolds = [tricepsSf, bicepsSf, suprailiacSf, calfSf].filter(
      (v): v is number => v !== null && v > 0
    );
    const sumSkinVal =
      measuredSkinfolds.length > 0
        ? +measuredSkinfolds.reduce((acc, v) => acc + v, 0).toFixed(1)
        : null;

    const rightGrip = getMeasuredVal('rightGrip');
    const leftGrip = getMeasuredVal('leftGrip');
    const rightArmSpeed = getMeasuredVal('rightArmSpeed');
    const leftArmSpeed = getMeasuredVal('leftArmSpeed');
    const flexibilityVal = getMeasuredVal('flexibility');
    const verticalJumpVal = getMeasuredVal('verticalJump');
    const sprint20mVal = getMeasuredVal('sprint20m');
    const agility10x5Val = getMeasuredVal('agility10x5');
    const longJumpVal = getMeasuredVal('longJump');

    const jumpPowerW =
      currentReport.cardio?.verticalJumpAnaerobicWatt &&
      currentReport.cardio.verticalJumpAnaerobicWatt > 0
        ? Math.round(currentReport.cardio.verticalJumpAnaerobicWatt)
        : null;

    const fatMassKg =
      weightVal !== null && fatVal !== null && Number.isFinite(weightVal * fatVal)
        ? +((weightVal * fatVal) / 100).toFixed(1)
        : null;
    const leanMassKg =
      weightVal !== null && fatMassKg !== null ? +(weightVal - fatMassKg).toFixed(1) : null;
    const leanMassPct = fatVal !== null ? +(100 - fatVal).toFixed(1) : null;

    const hasSomatoM3 =
      Boolean(currentReport.date3 && currentReport.date3 !== '—' && currentReport.date3.trim() !== '') &&
      Boolean(
        currentReport.somatotype?.m3 &&
          (currentReport.somatotype.m3.endo > 0 ||
            currentReport.somatotype.m3.meso > 0 ||
            currentReport.somatotype.m3.ecto > 0)
      );
    const hasSomatoValues = (s?: { endo: number; meso: number; ecto: number }) =>
      Boolean(s && (s.endo > 0 || s.meso > 0 || s.ecto > 0));
    const activeSomato = hasSomatoM3
      ? currentReport.somatotype!.m3!
      : hasSomatoValues(currentReport.somatotype?.m1)
      ? currentReport.somatotype!.m1
      : hasSomatoValues(currentReport.somatotype?.m2)
      ? currentReport.somatotype!.m2
      : null;

    const formatActiveSomato = (s: { endo: number; meso: number; ecto: number }) => {
      if (s.endo > 0 && s.meso > 0 && s.ecto > 0) {
        return `${s.endo} - ${s.meso} - ${s.ecto}`;
      }
      const parts: string[] = [];
      if (s.endo > 0) parts.push(`Endo: ${s.endo}`);
      if (s.meso > 0) parts.push(`Mezo: ${s.meso}`);
      if (s.ecto > 0) parts.push(`Ekto: ${s.ecto}`);
      return parts.join(' · ') || '—';
    };

    const leftCallouts = [
      tricepsSf !== null && {
        code: '01',
        pinCode: '1',
        title: 'TRICEPS DERİ KIVRIMI (SKINFOLD)',
        subtitle: 'Arka Üst Kol · Subkutan Yağ Dokusu',
        m1: getMeasuredM1('tricepsSkinfold'),
        m2: getMeasuredM2('tricepsSkinfold'),
        displayVal: tricepsSf,
        unit: 'mm',
        pct: getIdealCalloutPct('tricepsSkinfold', 78),
        sd: getMeasuredSd('tricepsSkinfold'),
        status: getMeasuredStatus('tricepsSkinfold'),
        accent: '#0284c7',
      },
      bicepsSf !== null && {
        code: '02',
        pinCode: '2',
        title: 'BICEPS DERİ KIVRIMI (SKINFOLD)',
        subtitle: 'Ön Üst Kol · Subkutan Yağ Dokusu',
        m1: getMeasuredM1('bicepsSkinfold'),
        m2: getMeasuredM2('bicepsSkinfold'),
        displayVal: bicepsSf,
        unit: 'mm',
        pct: getIdealCalloutPct('bicepsSkinfold', 75),
        sd: getMeasuredSd('bicepsSkinfold'),
        status: getMeasuredStatus('bicepsSkinfold'),
        accent: '#6366f1',
      },
      suprailiacSf !== null && {
        code: '03',
        pinCode: '3',
        title: 'İLİAK (SUPRAILIAC) SKINFOLD',
        subtitle: 'Yan Karın / Pelvik Kuşak Yağ Dokusu',
        m1: getMeasuredM1('suprailiacSkinfold'),
        m2: getMeasuredM2('suprailiacSkinfold'),
        displayVal: suprailiacSf,
        unit: 'mm',
        pct: getIdealCalloutPct('suprailiacSkinfold', 76),
        sd: getMeasuredSd('suprailiacSkinfold'),
        status: getMeasuredStatus('suprailiacSkinfold'),
        accent: '#059669',
      },
      calfSf !== null && {
        code: '04',
        pinCode: '4',
        title: 'CALF (MEDİAL BALDIR) SKINFOLD',
        subtitle: 'Alt Ekstremite Subkutan Yağ Dokusu',
        m1: getMeasuredM1('calfSkinfold'),
        m2: getMeasuredM2('calfSkinfold'),
        displayVal: calfSf,
        unit: 'mm',
        pct: getIdealCalloutPct('calfSkinfold', 77),
        sd: getMeasuredSd('calfSkinfold'),
        status: getMeasuredStatus('calfSkinfold'),
        accent: '#10b981',
      },
    ].filter((x): x is NonNullable<typeof x> => Boolean(x));

    const kineticParts: string[] = [];
    if (verticalJumpVal !== null) kineticParts.push(`Sıçrama (${verticalJumpVal} cm)`);
    if (sprint20mVal !== null) kineticParts.push(`Sprint (${sprint20mVal}s)`);
    if (agility10x5Val !== null) kineticParts.push(`10x5m (${agility10x5Val}s)`);

    const rightCallouts = [
      (rightGrip !== null || leftGrip !== null) && {
        code: '05',
        pinCode: '5',
        title: 'PENÇE KUVVETİ (EL SIKMA)',
        subtitle: 'Üst Ekstremite İzometrik Kuvvet (Sağ / Sol)',
        m1: getMeasuredM1('rightGrip') ?? getMeasuredM1('leftGrip'),
        m2: getMeasuredM2('rightGrip') ?? getMeasuredM2('leftGrip'),
        displayVal: `${rightGrip ?? '—'} / ${leftGrip ?? '—'}`,
        unit: 'kg',
        pct: getIdealCalloutPct('rightGrip', 82),
        sd: getMeasuredSd('rightGrip'),
        status: getMeasuredStatus('rightGrip', 'Simetrik'),
        accent: effectivePrimaryHex,
      },
      (rightArmSpeed !== null || leftArmSpeed !== null) && {
        code: '06',
        pinCode: '6',
        title: 'KOL SÜRAT TESTİ (TAP TEST)',
        subtitle: 'Üst Ekstremite Motor Nöral Dokunma Hızı',
        m1: getMeasuredM1('rightArmSpeed') ?? getMeasuredM1('leftArmSpeed'),
        m2: getMeasuredM2('rightArmSpeed') ?? getMeasuredM2('leftArmSpeed'),
        displayVal: `${rightArmSpeed ?? '—'} / ${leftArmSpeed ?? '—'}`,
        unit: 'dokunma',
        pct: getIdealCalloutPct('rightArmSpeed', 80),
        sd: getMeasuredSd('rightArmSpeed'),
        status: getMeasuredStatus('rightArmSpeed', 'Reaksiyon Hızı'),
        accent: '#ea580c',
      },
      flexibilityVal !== null && {
        code: '07',
        pinCode: '7',
        title: 'OTUR-UZAN / ESNEKLİK TESTİ',
        subtitle: 'Hamstring & Bel Bölgesi Eklem Hareketliliği',
        m1: getMeasuredM1('flexibility'),
        m2: getMeasuredM2('flexibility'),
        displayVal: flexibilityVal,
        unit: 'cm',
        pct: getIdealCalloutPct('flexibility', 84),
        sd: getMeasuredSd('flexibility'),
        status: getMeasuredStatus('flexibility', 'Optimal'),
        accent: '#e11d48',
      },
      (verticalJumpVal !== null || sprint20mVal !== null || agility10x5Val !== null) && {
        code: '08',
        pinCode: '8',
        title: 'DİKEY SIÇRAMA & KİNETİK GÜÇ',
        subtitle: kineticParts.join(' · '),
        m1: getMeasuredM1('verticalJump') ?? getMeasuredM1('sprint20m'),
        m2: getMeasuredM2('verticalJump') ?? getMeasuredM2('sprint20m'),
        displayVal:
          verticalJumpVal !== null
            ? jumpPowerW
              ? `${verticalJumpVal} cm · ${jumpPowerW}W`
              : `${verticalJumpVal} cm`
            : sprint20mVal !== null
            ? `${sprint20mVal} sn`
            : `${agility10x5Val} sn`,
        unit: '',
        pct: getIdealCalloutPct('verticalJump', 83),
        sd: getMeasuredSd('verticalJump'),
        status: getMeasuredStatus('verticalJump', 'Anaerobik Güç'),
        accent: '#0f766e',
      },
    ].filter((x): x is NonNullable<typeof x> => Boolean(x));

    const visiblePinCodes = new Set<string>([
      ...leftCallouts.map((c) => c.pinCode),
      ...rightCallouts.map((c) => c.pinCode),
    ]);

    const topRibbonCount =
      (heightVal !== null ? 1 : 0) +
      (weightVal !== null ? 1 : 0) +
      (fatVal !== null ? 1 : 0) +
      (leanMassKg !== null ? 1 : 0) +
      (sumSkinVal !== null ? 1 : 0) +
      (activeSomato !== null ? 1 : 0);

    const topRibbonGridColsClass =
      topRibbonCount <= 2
        ? 'grid-cols-2 print:grid-cols-2'
        : topRibbonCount === 3
        ? 'grid-cols-2 sm:grid-cols-3 print:grid-cols-3'
        : topRibbonCount === 4
        ? 'grid-cols-2 sm:grid-cols-4 print:grid-cols-4'
        : topRibbonCount === 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6';

    return (
      <div
        id="sportsfly-lab-page-bodymap"
        className={`a4-print-page relative overflow-hidden min-h-[1460px] flex flex-col justify-between rounded-xl p-8 sm:p-12 shadow-xs print:shadow-none ${activeTemplate.pageFrameClass}`}
      >
        {/* TOP: Institutional Header + Measured Biometric Telemetry Ribbon */}
        <div>
          {renderPageHeader(
            1 - pageOffset,
            'Anatomik Vücut Haritası & Bölgesel Ölçüm İnfografiği',
            'Sporcunun Gerçek Test Ölçümlerine Dayalı Tam Sayfa Deri Kıvrımı, İzometrik Kuvvet ve Biyomotor Yetenek Haritası'
          )}

          {/* Top Measured Biometric Ribbon */}
          {topRibbonCount > 0 && (
            <div className={`grid ${topRibbonGridColsClass} gap-3.5 mb-5 relative z-10`}>
              {heightVal !== null && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-slate-500 uppercase tracking-tight truncate">
                    BOY UZUNLUĞU
                  </div>
                  <div className="text-sm font-extrabold font-sans tabular-nums text-slate-900 mt-0.5">
                    {heightVal} <span className="text-[9.5px] font-normal text-slate-500">cm</span>
                  </div>
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-slate-500 truncate">
                    Standart Ölçüm
                  </div>
                </div>
              )}

              {weightVal !== null && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-slate-500 uppercase tracking-tight truncate">
                    VÜCUT KÜTLESİ {bmiVal !== null ? '& BKİ' : ''}
                  </div>
                  <div className="text-sm font-extrabold font-sans tabular-nums text-slate-900 mt-0.5">
                    {weightVal} <span className="text-[9.5px] font-normal text-slate-500">kg</span>
                  </div>
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-sky-700 truncate">
                    {bmiVal !== null ? `BKİ: ${bmiVal} kg/m²` : 'Ölçülen Kütle'}
                  </div>
                </div>
              )}

              {fatVal !== null && (
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/90 shadow-2xs">
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-rose-800 uppercase tracking-tight truncate">
                    VÜCUT YAĞ ORANI (%)
                  </div>
                  <div className="text-sm font-extrabold font-sans tabular-nums text-rose-700 mt-0.5">
                    %{fatVal}{' '}
                    {fatMassKg !== null && (
                      <span className="text-[9px] font-normal text-rose-600">({fatMassKg} kg)</span>
                    )}
                  </div>
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-emerald-700 truncate">
                    {getMeasuredStatus('bodyFat', 'Ölçülen Değer')}
                  </div>
                </div>
              )}

              {leanMassKg !== null && (
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/90 shadow-2xs">
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-emerald-800 uppercase tracking-tight truncate">
                    YAĞSIZ KAS KÜTLESİ (FFM)
                  </div>
                  <div className="text-sm font-extrabold font-sans tabular-nums text-emerald-800 mt-0.5">
                    {leanMassKg} <span className="text-[9.5px] font-normal text-emerald-700">kg</span>
                  </div>
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-emerald-700 truncate">
                    %{leanMassPct} Aktif Doku
                  </div>
                </div>
              )}

              {sumSkinVal !== null && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-slate-500 uppercase tracking-tight truncate">
                    {measuredSkinfolds.length} BÖLGE SKINFOLD
                  </div>
                  <div className="text-sm font-extrabold font-sans tabular-nums text-slate-900 mt-0.5">
                    {sumSkinVal} <span className="text-[9.5px] font-normal text-slate-500">mm</span>
                  </div>
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-indigo-700 truncate">
                    Toplam {sumSkinVal} mm
                  </div>
                </div>
              )}

              {activeSomato && (
                <div
                  className="p-3 rounded-xl text-white border shadow-2xs"
                  style={{
                    backgroundColor: effectivePrimaryHex,
                    borderColor: effectiveSecondaryHex,
                  }}
                >
                  <div className="text-[8.5px] font-sans tabular-nums font-bold text-white/75 uppercase tracking-tight truncate">
                    SOMATOTİP
                  </div>
                  <div
                    className="text-sm font-extrabold font-sans tabular-nums mt-0.5"
                    style={{ color: effectiveSecondaryHex }}
                  >
                    {formatActiveSomato(activeSomato)}
                  </div>
                  <div className="text-[8.5px] font-bold text-white/90 truncate">
                    {activeSomato.category}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================
            CENTER OF THE PAGE: GIANT FULL-PAGE ANATOMICAL BODY MAP STAGE
            ======================================================================== */}
        <div className="flex-1 flex flex-col justify-center my-3 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-5 items-stretch">
            {/* LEFT 3 COLS: Measured Upper/Trunk Skinfold Callout Cards */}
            <div className="lg:col-span-3 print:col-span-3 flex flex-col justify-center gap-3.5 h-full">
              {leftCallouts.map((item) => (
                <div
                  key={item.code}
                  className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden h-full min-h-[102px]"
                  style={{ borderLeft: `4px solid ${item.accent}` }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[7.5px] font-sans tabular-nums font-extrabold text-white shrink-0 tracking-tight"
                        style={{ backgroundColor: item.accent }}
                      >
                        ANALİZ {item.code}
                      </span>
                      <span className="text-[8px] font-sans tabular-nums font-bold text-emerald-700 shrink-0">
                        {item.status} · %{item.pct}
                      </span>
                    </div>
                    <div className="text-[9.5px] font-bold text-slate-900 mt-1 leading-snug tracking-tight line-clamp-1">
                      {item.title}
                    </div>
                    <div className="text-[7.5px] text-slate-500 mt-0.5 truncate">{item.subtitle}</div>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                    <div className="flex items-baseline justify-between font-sans tabular-nums">
                      <div className="text-[7.5px] text-slate-500">
                        Ölçüm Değeri:
                      </div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {item.displayVal}{' '}
                        <span className="text-[8px] font-normal text-slate-500">{item.unit}</span>
                      </div>
                    </div>
                    <svg viewBox="0 0 180 3" className="w-full h-1 rounded-full mt-0.5 overflow-hidden block">
                      <rect x="0" y="0" width="180" height="3" rx="1.5" fill="#f1f5f9" />
                      <rect
                        x="0"
                        y="0"
                        width={Math.max(20, Math.min(180, (item.pct / 100) * 180))}
                        height="3"
                        rx="1.5"
                        fill={item.accent}
                      />
                    </svg>
                    <div className="flex justify-between text-[7px] font-sans tabular-nums text-slate-400 mt-0.5">
                      <span>ISAK Protokolü</span>
                      <span>Z: {item.sd > 0 ? `+${item.sd}` : item.sd} SD</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CENTER 6 COLS: HUGE HIGH-PRECISION ANATOMICAL BODY MAP SVG RIGHT IN THE MIDDLE OF THE PAGE */}
            <div
              className="lg:col-span-6 print:col-span-6 rounded-2xl border-2 bg-gradient-to-b from-slate-50/90 via-white to-slate-50/90 p-3 flex flex-col justify-between relative overflow-hidden shadow-xs"
              style={{ borderColor: effectivePrimaryHex }}
            >
              {/* Top Stage Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-200/90 pb-2 px-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: effectiveSecondaryHex }}
                  />
                  <span
                    className="text-[10.5px] font-sans tabular-nums font-black uppercase tracking-wider"
                    style={{ color: effectivePrimaryHex }}
                  >
                    ANATOMİK BİYOMEKANİK SİLÜET &amp; ÖLÇÜM HARİTASI
                  </span>
                </div>
                <span className="text-[9px] font-sans tabular-nums font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                  ÖLÇÜM HARİTASI
                </span>
              </div>

              {/* Giant Central Anatomical Vector Illustration (560 x 650) */}
              <div className="flex-1 flex items-center justify-center py-1">
                <svg
                  viewBox="0 0 560 650"
                  className="w-full max-w-[530px] h-auto block"
                  aria-label="Tam Sayfa Profesyonel Anatomik Vücut Haritası İnfografiği"
                >
                  <defs>
                    <linearGradient id="bodyBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="50%" stopColor="#e2e8f0" />
                      <stop offset="100%" stopColor="#cbd5e1" />
                    </linearGradient>
                    <linearGradient id="muscleToneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={effectivePrimaryHex} stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.10" />
                    </linearGradient>
                    <linearGradient id="coreZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.12" />
                    </linearGradient>
                    <radialGradient id="forcePlateGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
                      <stop offset="70%" stopColor={effectivePrimaryHex} stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* 1. Clinical Coordinate Grid & Regional Anatomical Zone Bands */}
                  {[90, 150, 210, 270, 330, 390, 450, 510, 570].map((gy) => (
                    <line
                      key={`gy-${gy}`}
                      x1="48"
                      y1={gy}
                      x2="536"
                      y2={gy}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                  ))}
                  {[120, 200, 280, 360, 440].map((gx) => (
                    <line
                      key={`gx-${gx}`}
                      x1={gx}
                      y1="40"
                      x2={gx}
                      y2="590"
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Regional Zone Bands */}
                  <rect x="40" y="144" width="510" height="138" rx="8" fill="#f8fafc" fillOpacity="0.55" />
                  <rect x="40" y="284" width="510" height="92" rx="8" fill="#fff1f2" fillOpacity="0.35" />
                  <rect x="40" y="378" width="510" height="202" rx="8" fill="#f0fdf4" fillOpacity="0.35" />

                  {/* Non-Overlapping Zone Badges (Clearly separated from callout boxes and leader lines) */}
                  <g>
                    <rect x="44" y="148" width="104" height="14" rx="3" fill="#e2e8f0" fillOpacity="0.95" stroke="#cbd5e1" strokeWidth="0.6" />
                    <text x="96" y="157.5" textAnchor="middle" fill="#475569" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" className="text-[6.5px] font-sans font-black fill-slate-600 tracking-tighter">
                      BÖLGE I · ÜST EKSTREMİTE
                    </text>
                  </g>
                  <g>
                    <rect x="44" y="286" width="108" height="14" rx="3" fill="#ffe4e6" fillOpacity="0.95" stroke="#fecaca" strokeWidth="0.6" />
                    <text x="98" y="295.5" textAnchor="middle" fill="#be123c" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" className="text-[6.5px] font-sans font-black fill-rose-700 tracking-tighter">
                      BÖLGE II · GÖVDE &amp; ESNEKLİK
                    </text>
                  </g>
                  <g>
                    <rect x="44" y="382" width="104" height="14" rx="3" fill="#dcfce7" fillOpacity="0.95" stroke="#bbf7d0" strokeWidth="0.6" />
                    <text x="96" y="391.5" textAnchor="middle" fill="#065f46" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" className="text-[6.5px] font-sans font-black fill-emerald-800 tracking-tighter">
                      BÖLGE III · ALT EKSTREMİTE
                    </text>
                  </g>

                  {/* 2. Left Vertical Stadiometer Ruler (Dedicated left lane x=28, zero overlap with callout boxes) */}
                  <line x1="28" y1="60" x2="28" y2="582" stroke="#64748b" strokeWidth="1.5" />
                  {[
                    { cm: 180, y: 60 },
                    { cm: 160, y: 118 },
                    { cm: 140, y: 176 },
                    { cm: 120, y: 234 },
                    { cm: 100, y: 292 },
                    { cm: 80, y: 350 },
                    { cm: 60, y: 408 },
                    { cm: 40, y: 466 },
                    { cm: 20, y: 524 },
                    { cm: 0, y: 582 },
                  ].map((tick) => (
                    <g key={tick.cm}>
                      <line x1="22" y1={tick.y} x2="32" y2={tick.y} stroke="#475569" strokeWidth="1.2" />
                      <text
                        x="19"
                        y={tick.y + 3}
                        textAnchor="end"
                        fill="#64748b"
                        fontSize="7.5"
                        fontWeight="700"
                        fontFamily="sans-serif"
                        className="text-[7.5px] font-sans tabular-nums font-bold fill-slate-500"
                      >
                        {tick.cm}
                      </text>
                    </g>
                  ))}

                  {/* Dynamic Stature Crown Laser Line (only when height is measured) */}
                  {heightVal !== null && (
                    <>
                      <line
                        x1="28"
                        y1="74"
                        x2="365"
                        y2="74"
                        stroke="#0284c7"
                        strokeWidth="1.3"
                        strokeDasharray="4,2"
                      />
                      <rect x="44" y="50" width="114" height="19" rx="4" fill="#0284c7" />
                      <text x="101" y="62.5" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" fontFamily="sans-serif" className="text-[8.5px] font-sans tabular-nums font-black fill-white">
                        BOY: {heightVal} cm
                      </text>
                    </>
                  )}

                  {/* 3. Postural Plumb Line */}
                  <line
                    x1="288"
                    y1="36"
                    x2="288"
                    y2="606"
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                    strokeDasharray="3,3"
                  />
                  <rect x="218" y="20" width="140" height="16" rx="4" fill="#0f172a" />
                  <text x="288" y="30.5" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="700" fontFamily="sans-serif" className="text-[7.5px] font-sans tabular-nums font-bold fill-white">
                    SİMETRİ EKSENİ · 0.0°
                  </text>

                  {/* Concentric Biomechanical Target Halo */}
                  <circle
                    cx="288"
                    cy="255"
                    r="112"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <circle
                    cx="288"
                    cy="255"
                    r="76"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />

                  {/* 4. Force Plate Platform */}
                  <ellipse cx="288" cy="586" rx="138" ry="26" fill="url(#forcePlateGrad)" stroke="#94a3b8" strokeWidth="1.2" />
                  <ellipse
                    cx="288"
                    cy="586"
                    rx="98"
                    ry="17"
                    fill="none"
                    stroke={effectivePrimaryHex}
                    strokeWidth="1.2"
                    strokeDasharray="4,3"
                  />
                  <ellipse cx="288" cy="586" rx="54" ry="9" fill="none" stroke="#0284c7" strokeWidth="1.2" />

                  {/* Force Plate Telemetry Pill (only measured metrics) */}
                  {(weightVal !== null || leanMassKg !== null || fatVal !== null) && (
                    <>
                      <rect x="138" y="616" width="300" height="24" rx="6" fill={effectivePrimaryHex} />
                      <text x="288" y="631.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif" className="text-[9px] font-sans tabular-nums font-black fill-white">
                        {[
                          weightVal !== null ? `KÜTLE: ${weightVal} kg` : null,
                          leanMassKg !== null ? `YAĞSIZ DOKU: ${leanMassKg} kg` : null,
                          fatVal !== null ? `YAĞ: %${fatVal}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </text>
                    </>
                  )}

                  {/* 5. ATHLETE FIGURE SILHOUETTE */}
                  <path
                    d="M 288 74
                       C 305 74, 315 86, 314 103
                       C 313 118, 305 132, 288 135
                       C 271 132, 263 118, 262 103
                       C 261 86, 271 74, 288 74 Z"
                    fill="url(#bodyBaseGrad)"
                    stroke={effectivePrimaryHex}
                    strokeWidth="2"
                  />
                  <path
                    d="M 262 98 C 258 98, 258 110, 263 112 M 314 98 C 318 98, 318 110, 313 112"
                    fill="none"
                    stroke={effectivePrimaryHex}
                    strokeWidth="1.6"
                  />
                  <line x1="271" y1="101" x2="305" y2="101" stroke="#64748b" strokeWidth="0.9" strokeDasharray="2,2" />

                  <path
                    d="M 274 132
                       L 272 145
                       C 258 151, 236 155, 218 164
                       C 202 172, 194 188, 186 210
                       C 178 232, 170 254, 162 276
                       C 154 298, 146 320, 141 338
                       L 132 356
                       C 130 364, 138 370, 145 365
                       L 155 344
                       C 164 326, 174 304, 184 282
                       C 192 264, 202 242, 214 218
                       L 230 202
                       C 232 228, 237 254, 243 280
                       C 246 296, 245 312, 238 332
                       C 231 354, 228 386, 233 422
                       C 237 450, 242 468, 244 486
                       C 240 508, 238 532, 245 556
                       L 247 572
                       L 233 584
                       C 230 588, 236 592, 254 591
                       L 265 588
                       L 265 570
                       C 269 548, 273 522, 269 492
                       C 271 472, 275 442, 281 398
                       L 288 382
                       L 295 398
                       C 301 442, 305 472, 307 492
                       C 303 522, 307 548, 311 570
                       L 311 588
                       L 322 591
                       C 340 592, 346 588, 343 584
                       L 329 572
                       L 331 556
                       C 338 532, 336 508, 332 486
                       C 334 468, 339 450, 343 422
                       C 348 386, 345 354, 338 332
                       C 331 312, 330 296, 333 280
                       C 339 254, 344 228, 346 202
                       L 362 218
                       C 374 242, 384 264, 392 282
                       C 402 304, 412 326, 421 344
                       L 431 365
                       C 438 370, 446 364, 444 356
                       L 435 338
                       C 430 320, 422 298, 414 276
                       C 406 254, 398 232, 390 210
                       C 382 188, 374 172, 358 164
                       C 340 155, 318 151, 304 145
                       L 302 132 Z"
                    fill="url(#bodyBaseGrad)"
                    stroke={effectivePrimaryHex}
                    strokeWidth="2.1"
                    strokeLinejoin="round"
                  />

                  {/* Clavicles */}
                  <path
                    d="M 232 165 Q 260 174, 283 169 M 344 165 Q 316 174, 293 169"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />

                  {/* Pectoralis */}
                  <path
                    d="M 234 174 C 232 204, 248 220, 284 217 L 284 174 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M 342 174 C 344 204, 328 220, 292 217 L 292 174 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1.2"
                  />

                  {/* Deltoids & Arms */}
                  <path
                    d="M 218 166 C 202 176, 195 196, 202 212 C 212 208, 224 196, 230 182 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                  <path
                    d="M 358 166 C 374 176, 381 196, 374 212 C 364 208, 352 196, 346 182 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                  <path
                    d="M 198 214 C 186 234, 180 252, 188 264 C 198 258, 208 240, 214 220 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M 378 214 C 390 234, 396 252, 388 264 C 378 258, 368 240, 362 220 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1.1"
                  />

                  {/* Abdominis Core */}
                  <path
                    d="M 243 282 C 246 302, 242 322, 236 340 L 340 340 C 334 322, 330 302, 333 282 Z"
                    fill="url(#coreZoneGrad)"
                  />
                  <rect x="261" y="224" width="24" height="22" rx="5" fill="url(#muscleToneGrad)" stroke="#64748b" strokeWidth="1" />
                  <rect x="291" y="224" width="24" height="22" rx="5" fill="url(#muscleToneGrad)" stroke="#64748b" strokeWidth="1" />
                  <rect x="262" y="250" width="23" height="22" rx="5" fill="url(#muscleToneGrad)" stroke="#64748b" strokeWidth="1" />
                  <rect x="291" y="250" width="23" height="22" rx="5" fill="url(#muscleToneGrad)" stroke="#64748b" strokeWidth="1" />
                  <rect x="264" y="276" width="21" height="24" rx="5" fill="url(#muscleToneGrad)" stroke="#64748b" strokeWidth="1" />
                  <rect x="291" y="276" width="21" height="24" rx="5" fill="url(#muscleToneGrad)" stroke="#64748b" strokeWidth="1" />

                  {/* Quadriceps */}
                  <path
                    d="M 236 368 C 232 406, 238 444, 247 466 C 258 456, 263 418, 261 372 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M 340 368 C 344 406, 338 444, 329 466 C 318 456, 313 418, 315 372 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1.1"
                  />

                  {/* Patella */}
                  <ellipse cx="257" cy="478" rx="9" ry="7" fill="#f8fafc" stroke="#475569" strokeWidth="1.2" />
                  <ellipse cx="319" cy="478" rx="9" ry="7" fill="#f8fafc" stroke="#475569" strokeWidth="1.2" />

                  {/* Calves */}
                  <path
                    d="M 244 496 C 239 518, 241 542, 249 560 C 258 548, 265 524, 264 496 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M 332 496 C 337 518, 335 542, 327 560 C 318 548, 311 524, 312 496 Z"
                    fill="url(#muscleToneGrad)"
                    stroke="#64748b"
                    strokeWidth="1.1"
                  />

                  {/* =================================================================
                      6. PRECISION LEADER LINES & NUMBERED HOTSPOT PINS (ONLY MEASURED)
                      ================================================================= */}
                  {/* 01 Triceps Skinfold */}
                  {tricepsSf !== null && (
                    <>
                      <polyline points="196,208 152,190 126,190" fill="none" stroke="#0284c7" strokeWidth="1.5" />
                      <rect x="44" y="174" width="82" height="32" rx="6" fill={effectivePrimaryHex} stroke="#ffffff" strokeWidth="1.2" />
                      <text x="85" y="188" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" className="text-[7.5px] font-sans font-black fill-white/90">
                        01 TRICEPS SF
                      </text>
                      <text x="85" y="201" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" className="text-[10px] font-sans font-black fill-white">
                        {tricepsSf} mm
                      </text>
                    </>
                  )}

                  {/* 02 Biceps Skinfold */}
                  {bicepsSf !== null && (
                    <>
                      <polyline points="182,248 150,252 126,252" fill="none" stroke="#6366f1" strokeWidth="1.5" />
                      <rect x="44" y="236" width="82" height="32" rx="6" fill={effectivePrimaryHex} stroke="#ffffff" strokeWidth="1.2" />
                      <text x="85" y="250" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" className="text-[7.5px] font-sans font-black fill-white/90">
                        02 BICEPS SF
                      </text>
                      <text x="85" y="263" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" className="text-[10px] font-sans font-black fill-white">
                        {bicepsSf} mm
                      </text>
                    </>
                  )}

                  {/* 03 Suprailiac Skinfold */}
                  {suprailiacSf !== null && (
                    <>
                      <polyline points="244,324 164,330 126,330" fill="none" stroke="#059669" strokeWidth="1.5" />
                      <rect x="44" y="314" width="82" height="32" rx="6" fill={effectivePrimaryHex} stroke="#ffffff" strokeWidth="1.2" />
                      <text x="85" y="328" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" className="text-[7.5px] font-sans font-black fill-white/90">
                        03 İLİAK SF
                      </text>
                      <text x="85" y="341" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" className="text-[10px] font-sans font-black fill-white">
                        {suprailiacSf} mm
                      </text>
                    </>
                  )}

                  {/* 04 Calf Skinfold */}
                  {calfSf !== null && (
                    <>
                      <polyline points="249,522 164,452 126,452" fill="none" stroke="#10b981" strokeWidth="1.5" />
                      <rect x="44" y="436" width="82" height="32" rx="6" fill={effectivePrimaryHex} stroke="#ffffff" strokeWidth="1.2" />
                      <text x="85" y="450" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" className="text-[7.5px] font-sans font-black fill-white/90">
                        04 BALDIR SF
                      </text>
                      <text x="85" y="463" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" className="text-[10px] font-sans font-black fill-white">
                        {calfSf} mm
                      </text>
                    </>
                  )}

                  {/* 05 Right/Left Grip Strength */}
                  {(rightGrip !== null || leftGrip !== null) && (
                    <>
                      <polyline points="372,198 430,190 462,190" fill="none" stroke={effectivePrimaryHex} strokeWidth="1.5" />
                      <rect x="462" y="174" width="90" height="32" rx="6" fill={effectivePrimaryHex} stroke="#ffffff" strokeWidth="1.2" />
                      <text x="507" y="188" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" className="text-[7.5px] font-sans font-black fill-white/90">
                        05 PENÇE KUVVETİ
                      </text>
                      <text x="507" y="201" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" className="text-[9.5px] font-sans font-black fill-white">
                        {rightGrip ?? '—'} / {leftGrip ?? '—'} kg
                      </text>
                    </>
                  )}

                  {/* 06 Arm Speed Test */}
                  {(rightArmSpeed !== null || leftArmSpeed !== null) && (
                    <>
                      <polyline points="406,272 436,252 462,252" fill="none" stroke="#ea580c" strokeWidth="1.5" />
                      <rect x="462" y="236" width="90" height="32" rx="6" fill={effectivePrimaryHex} stroke="#ffffff" strokeWidth="1.2" />
                      <text x="507" y="250" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" className="text-[7.5px] font-sans font-black fill-white/90">
                        06 KOL SÜRATİ
                      </text>
                      <text x="507" y="263" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" className="text-[9.5px] font-sans font-black fill-white">
                        {rightArmSpeed ?? '—'} / {leftArmSpeed ?? '—'}
                      </text>
                    </>
                  )}

                  {/* 07 Flexibility */}
                  {flexibilityVal !== null && (
                    <>
                      <polyline points="333,316 424,330 462,330" fill="none" stroke="#e11d48" strokeWidth="1.5" />
                      <rect x="462" y="314" width="90" height="32" rx="6" fill={effectivePrimaryHex} stroke="#ffffff" strokeWidth="1.2" />
                      <text x="507" y="328" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" className="text-[7.5px] font-sans font-black fill-white/90">
                        07 ESNEKLİK
                      </text>
                      <text x="507" y="341" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" className="text-[10px] font-sans font-black fill-white">
                        {flexibilityVal} cm
                      </text>
                    </>
                  )}

                  {/* 08 Vertical Jump & Lower Power */}
                  {verticalJumpVal !== null && (
                    <>
                      <polyline points="329,522 428,452 462,452" fill="none" stroke="#0f766e" strokeWidth="1.5" />
                      <rect x="462" y="436" width="90" height="32" rx="6" fill={effectivePrimaryHex} stroke="#ffffff" strokeWidth="1.2" />
                      <text x="507" y="450" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" className="text-[7.5px] font-sans font-black fill-white/90">
                        08 DİKEY SIÇRAMA
                      </text>
                      <text x="507" y="463" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" className="text-[9.5px] font-sans font-black fill-white">
                        {jumpPowerW ? `${verticalJumpVal} cm (${jumpPowerW}W)` : `${verticalJumpVal} cm`}
                      </text>
                    </>
                  )}

                  {/* Numbered Hotspot Target Reticles on the Body (only visible measured pins) */}
                  {[
                    { cx: 196, cy: 208, code: '1', fill: '#0284c7' },
                    { cx: 182, cy: 248, code: '2', fill: '#6366f1' },
                    { cx: 244, cy: 324, code: '3', fill: '#059669' },
                    { cx: 249, cy: 522, code: '4', fill: '#10b981' },
                    { cx: 372, cy: 198, code: '5', fill: effectivePrimaryHex },
                    { cx: 406, cy: 272, code: '6', fill: '#ea580c' },
                    { cx: 333, cy: 316, code: '7', fill: '#e11d48' },
                    { cx: 329, cy: 522, code: '8', fill: '#0f766e' },
                  ]
                    .filter((pin) => visiblePinCodes.has(pin.code))
                    .map((pin) => (
                      <g key={pin.code}>
                        <circle cx={pin.cx} cy={pin.cy} r="9.5" fill={pin.fill} fillOpacity="0.22" />
                        <circle cx={pin.cx} cy={pin.cy} r="6.5" fill={pin.fill} stroke="#ffffff" strokeWidth="1.6" />
                        <text
                          x={pin.cx}
                          y={pin.cy + 2.5}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="7.5"
                          fontWeight="900"
                          fontFamily="sans-serif"
                          className="text-[7.5px] font-sans tabular-nums font-black fill-white"
                        >
                          {pin.code}
                        </text>
                      </g>
                    ))}
                </svg>
              </div>

              {/* Bottom Stage Legend Bar inside Center Frame */}
              <div className="pt-2 border-t border-slate-200/90 flex items-center justify-between gap-2 text-[8px] font-sans tabular-nums text-slate-600 px-1 whitespace-nowrap overflow-hidden">
                <div className="flex items-center gap-2.5">
                  {measuredSkinfolds.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" />
                      <span>Deri Kıvrımı (mm)</span>
                    </span>
                  )}
                  {(rightGrip !== null || leftGrip !== null || rightArmSpeed !== null || leftArmSpeed !== null) && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-600 inline-block" />
                      <span>Nöromotor &amp; Kuvvet</span>
                    </span>
                  )}
                  {(flexibilityVal !== null || verticalJumpVal !== null || sprint20mVal !== null) && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-teal-700 inline-block" />
                      <span>Güç &amp; Esneklik</span>
                    </span>
                  )}
                </div>
                {currentReport.predictedAdultHeight > 0 && (
                  <span className="font-bold text-slate-800 text-[8.5px]">
                    Tahmini Yetişkin Boyu: {currentReport.predictedAdultHeight} cm
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT 3 COLS: Measured Callout Cards */}
            <div className="lg:col-span-3 print:col-span-3 flex flex-col justify-center gap-3.5 h-full">
              {rightCallouts.map((item) => (
                <div
                  key={item.code}
                  className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden min-h-[102px]"
                  style={{ borderRight: `4px solid ${item.accent}` }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[7.5px] font-sans tabular-nums font-extrabold text-white shrink-0 tracking-tight"
                        style={{ backgroundColor: item.accent }}
                      >
                        ANALİZ {item.code}
                      </span>
                      <span className="text-[8px] font-sans tabular-nums font-bold text-emerald-700 shrink-0">
                        {item.status} · %{item.pct}
                      </span>
                    </div>
                    <div className="text-[9.5px] font-bold text-slate-900 mt-1 leading-snug tracking-tight line-clamp-1">
                      {item.title}
                    </div>
                    <div className="text-[7.5px] text-slate-500 mt-0.5 truncate">{item.subtitle}</div>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                    <div className="flex items-baseline justify-between font-sans tabular-nums">
                      <div className="text-[7.5px] text-slate-500">
                        Ölçüm Değeri:
                      </div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {item.displayVal}{' '}
                        <span className="text-[8px] font-normal text-slate-500">{item.unit}</span>
                      </div>
                    </div>
                    <svg viewBox="0 0 180 3" className="w-full h-1 rounded-full mt-0.5 overflow-hidden block">
                      <rect x="0" y="0" width="180" height="3" rx="1.5" fill="#f1f5f9" />
                      <rect
                        x="0"
                        y="0"
                        width={Math.max(20, Math.min(180, (item.pct / 100) * 180))}
                        height="3"
                        rx="1.5"
                        fill={item.accent}
                      />
                    </svg>
                    <div className="flex justify-between text-[7px] font-sans tabular-nums text-slate-400 mt-0.5">
                      <span>Bölgesel Norm</span>
                      <span>Z: {item.sd > 0 ? `+${item.sd}` : item.sd} SD</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM: Segmental Body Composition Synthesis (Only Measured Categories) + Footer */}
        <div
          className="mt-3 pt-3 border-t-2 space-y-2.5 relative z-10"
          style={{ borderTopColor: effectivePrimaryHex }}
        >
          {(() => {
            const hasUpper =
              rightGrip !== null ||
              leftGrip !== null ||
              rightArmSpeed !== null ||
              leftArmSpeed !== null;
            const hasSkinComp = measuredSkinfolds.length > 0 || fatVal !== null;
            const hasLower =
              verticalJumpVal !== null ||
              longJumpVal !== null ||
              sprint20mVal !== null ||
              agility10x5Val !== null;

            const upperDetails: string[] = [];
            if (rightGrip !== null || leftGrip !== null) {
              upperDetails.push(`Pençe Kuvveti (Sağ ${rightGrip ?? '—'} kg / Sol ${leftGrip ?? '—'} kg)`);
            }
            if (rightArmSpeed !== null || leftArmSpeed !== null) {
              upperDetails.push(`Kol Sürat Testi (Sağ ${rightArmSpeed ?? '—'} / Sol ${leftArmSpeed ?? '—'} dokunma)`);
            }

            const skinParts: string[] = [];
            if (tricepsSf !== null) skinParts.push(`Triceps (${tricepsSf} mm)`);
            if (bicepsSf !== null) skinParts.push(`Biceps (${bicepsSf} mm)`);
            if (suprailiacSf !== null) skinParts.push(`İliak (${suprailiacSf} mm)`);
            if (calfSf !== null) skinParts.push(`Calf (${calfSf} mm)`);

            const lowerDetails: string[] = [];
            if (verticalJumpVal !== null) {
              lowerDetails.push(
                jumpPowerW
                  ? `Dikey Sıçrama (${verticalJumpVal} cm / ${jumpPowerW}W)`
                  : `Dikey Sıçrama (${verticalJumpVal} cm)`
              );
            }
            if (longJumpVal !== null) lowerDetails.push(`Durarak Uzun Atlama (${longJumpVal} cm)`);
            if (sprint20mVal !== null) lowerDetails.push(`20m Sprint (${sprint20mVal}s)`);
            if (agility10x5Val !== null) lowerDetails.push(`10x5m Çabukluk (${agility10x5Val}s)`);

            const synthCards = [
              hasUpper && (
                <div key="upper" className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-sky-900 uppercase truncate">
                      I. ÜST EKSTREMİTE &amp; NÖROMOTOR SENTEZİ
                    </span>
                    {(rightGrip !== null || leftGrip !== null) && (
                      <span className="text-[10px] font-sans tabular-nums font-bold text-sky-700 shrink-0 whitespace-nowrap">
                        Pençe: {rightGrip ?? '—'}/{leftGrip ?? '—'} kg
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-600 mt-1 leading-normal">
                    {upperDetails.join(' ve ')} sonuçları üst ekstremite motor hız ve izometrik kuvvet simetrisini gösterir.
                  </p>
                </div>
              ),
              hasSkinComp && (
                <div key="skin" className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-rose-900 uppercase truncate">
                      II. DERİ KIVRIMI &amp; VÜCUT KOMPOZİSYONU
                    </span>
                    <span className="text-[10px] font-sans tabular-nums font-bold text-rose-700 shrink-0 whitespace-nowrap">
                      {[
                        sumSkinVal !== null ? `Skinfold: ${sumSkinVal} mm` : null,
                        fatVal !== null ? `Yağ: %${fatVal}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 mt-1 leading-normal">
                    {skinParts.length > 0
                      ? `${skinParts.join(', ')} deri kıvrım ölçümleri${fatVal !== null ? ` ve %${fatVal} yağ oranı` : ''} bölgesel doku dağılımını yansıtır.`
                      : `Ölçülen vücut yağ oranı (%${fatVal}) kompozisyon dengesini gösterir.`}
                  </p>
                </div>
              ),
              hasLower && (
                <div key="lower" className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-emerald-900 uppercase truncate">
                      III. ALT EKSTREMİTE &amp; KİNETİK PERFORMANS
                    </span>
                    <span className="text-[10px] font-sans tabular-nums font-bold text-emerald-700 shrink-0 whitespace-nowrap">
                      {[
                        verticalJumpVal !== null ? `Sıçrama: ${verticalJumpVal} cm` : null,
                        sprint20mVal !== null ? `Sprint: ${sprint20mVal}s` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 mt-1 leading-normal">
                    {lowerDetails.join(', ')} verileri alt ekstremite patlayıcı güç ve ivmelenme kapasitesini gösterir.
                  </p>
                </div>
              ),
            ].filter(Boolean);

            if (synthCards.length === 0) return null;
            const synthColsClass =
              synthCards.length === 1
                ? 'grid-cols-1'
                : synthCards.length === 2
                ? 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-3 print:grid-cols-3';
            return <div className={`grid ${synthColsClass} gap-3`}>{synthCards}</div>;
          })()}

          {renderPageFooter(1 - pageOffset)}
        </div>
      </div>
    );
  };

  // ============================================================================
  // ALTERNATIVE REPORT 1: VELİ VE SPORCU KARNESİ (Warm, Simple, Growth-Focused)
  // ============================================================================
  const renderParentAthleteReportCard = () => {
    const p1Score = currentReport.scoreHistory.p1Score || 72;
    const p2Score = Math.max(p1Score + 2, currentReport.scoreHistory.p2Score || p1Score + 4);
    const p3Score = currentReport.scoreHistory.p3Score > 0 ? currentReport.scoreHistory.p3Score : p2Score;
    const nextGoalScore = Math.min(96, p3Score + 6);
    const grpAvg = currentReport.groupInfo.groupAverageScore ?? 72;

    return (
      <div
        id="sportsfly-lab-parent-athlete-page"
        className={`a4-print-page relative overflow-hidden min-h-[1460px] flex flex-col justify-between rounded-xl p-5 sm:p-7 shadow-xs print:shadow-none ${activeTemplate.pageFrameClass}`}
      >
        {renderPageWatermark()}
        <div className="space-y-4 relative z-10">
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0b192c] via-[#0f2942] to-[#1e3a8a] text-white shadow-xs border-b-2 border-sky-400">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  {effectiveSchoolLogo ? (
                    <img src={effectiveSchoolLogo} alt={effectiveClubName} className="w-full h-full object-contain" />
                  ) : (
                    <SportsFlyVectorMark className="w-8 h-8 text-slate-900" />
                  )}
                </div>
                <div>
                  <h1 className="text-xs font-sans tabular-nums font-bold tracking-wider text-sky-200 uppercase">
                    {effectiveClubName}
                  </h1>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                    Veli ve Sporcu Karnesi
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <RotaSportsFlyHeaderBadge
                  isDark={true}
                  effectiveSecondaryHex={effectiveSecondaryHex}
                  hideRota={true}
                />
                <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/25 text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-sky-200 font-semibold">
                    Gelişim Raporu
                  </div>
                  <div className="text-xs font-sans tabular-nums font-bold text-white">
                    {currentReport.date3 && currentReport.date3 !== '—' ? currentReport.date3 : currentReport.date1}
                  </div>
                </div>
              </div>
            </div>

            {/* Athlete Sub-Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 text-xs font-sans">
              <div className="bg-white/10 rounded-lg p-2 border border-white/15">
                <span className="text-[9px] text-sky-100 block font-sans font-medium uppercase">Sporcu Adı</span>
                <span className="font-extrabold text-white text-sm">{currentReport.athleteName}</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 border border-white/15">
                <span className="text-[9px] text-sky-100 block font-sans font-medium uppercase">Cinsiyet &amp; Yaş</span>
                <span className="font-bold text-white">{currentReport.gender} · {currentReport.ageYears} Yaş</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 border border-white/15">
                <span className="text-[9px] text-sky-100 block font-sans font-medium uppercase">Branş / Şube</span>
                <span className="font-bold text-white">{currentReport.sportBranch}</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 border border-white/15">
                <span className="text-[9px] text-sky-100 block font-sans font-medium uppercase">Ölçüm Dönemi</span>
                <span className="font-bold text-sky-200">{currentReport.date3 !== '—' ? '3. Dönem Ölçümü' : 'Gelişim Durumu'}</span>
              </div>
            </div>

            {/* Normative Reference Badges for Parent Report */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/20 text-[10.5px] font-sans">
              <span className="px-3 py-1 rounded-lg bg-slate-900/90 text-sky-200 border border-sky-400/40 flex items-center gap-1.5 font-semibold shadow-xs">
                Antropometrik Referans: WHO (Dünya Sağlık Örgütü) Uluslararası Büyüme &amp; ISAK Standartları
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-900/90 text-emerald-200 border border-emerald-400/40 flex items-center gap-1.5 font-semibold shadow-xs">
                Motorik Test Referansı: Eurofit &amp; ACSM Gençlik Fiziksel Uygunluk Normları
              </span>
            </div>
          </div>

          {/* Section 1: Bugünkü Durumun */}
          <div className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Bugünkü Durumun</span>
              </h3>
              <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-sans tabular-nums text-xs font-black">
                Genel İlerleme Düzeyi: %{p3Score}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase">1. Ölçüm ({currentReport.date1})</div>
                <div className="text-lg font-black font-sans tabular-nums text-slate-700 mt-1">%{p1Score}</div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">Başlangıç Seviyesi</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase">2. Ölçüm (Tahmini) ({currentReport.date2})</div>
                <div className="text-lg font-black font-sans tabular-nums text-blue-700 mt-1">%{p2Score}</div>
                <div className="text-[9.5px] text-blue-600 font-bold mt-0.5">+%{p2Score - p1Score} İlerleme</div>
              </div>
              <div className="p-3 rounded-xl bg-white border-2 border-emerald-500 shadow-2xs">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">
                  {currentReport.date3 !== '—' ? '3. Ölçüm (Güncel)' : 'Mevcut Durum'}
                </div>
                <div className="text-xl font-black font-sans tabular-nums text-emerald-600 mt-0.5">%{p3Score}</div>
                <div className="text-[9.5px] text-emerald-700 font-extrabold mt-0.5">İleri Düzey Gelişim</div>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-xl border border-emerald-200/60">
              Gelişim yolculuğunda adım adım ilerliyorsun! Sporcumuz düzenli antrenman katılımı ve fiziki gayreti ile ilk dönemden bu yana fiziksel uygunluk ve motorik becerilerini istikrarlı bir şekilde yukarı taşımıştır.
            </p>

            {/* Recharts Spider Chart for Parent Report */}
            <div className="mt-2 space-y-3">
              <SecondMeasurementComparisonPanel report={currentReport} />
              <RechartsSportsFlyRadarChart
                report={currentReport}
                comparisonMode="periods"
                height={260}
                title="Biyomotor Becerilerinin Ölçümler Arası Dönemsel Gelişim Radarı (Recharts Spider Chart)"
              />
            </div>
          </div>

          {/* Section 2 & 3: Measured Strengths & Development Focus */}
          {(() => {
            const measuredMotor = getDisplayedMotorPerformance(currentReport);
            const sortedByPct = [...measuredMotor].sort((a, b) => (b.percentile || 0) - (a.percentile || 0));
            const topStrengths = sortedByPct.slice(0, 3);
            const devAreas = [...sortedByPct]
              .filter((r) => !topStrengths.some((t) => t.id === r.id))
              .sort((a, b) => (a.percentile || 0) - (b.percentile || 0))
              .slice(0, 3);

            return (
              <>
                {topStrengths.length > 0 && (
                  <div className="p-4 rounded-2xl border-2 border-sky-200 bg-sky-50/30 space-y-2.5">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-sky-200/80 pb-2">
                      <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                      <span>Seni Öne Çıkaran Yönlerin</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {topStrengths.map((row) => (
                        <div key={row.id} className="p-3 rounded-xl bg-white border border-sky-200 shadow-2xs flex items-start gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0 mt-1.5 inline-block" />
                          <div>
                            <div className="text-xs font-black text-slate-900">{row.name}</div>
                            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                              Ölçüm sonucu ({row.m1} {row.unit}, %{row.percentile} yüzdelik) yaş grubunda güçlü seviyede yer alıyor.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {devAreas.length > 0 && (
                  <div className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50/30 space-y-2.5">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-amber-200/80 pb-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                      <span>Birlikte Güçlendireceğimiz Alanlar</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {devAreas.map((row) => (
                        <div key={row.id} className="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs flex items-start gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1.5 inline-block" />
                          <div>
                            <div className="text-xs font-black text-slate-900">{row.name}</div>
                            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                              Bu alanda <strong className="text-slate-900 bg-amber-100/90 px-1.5 py-0.5 rounded font-black border border-amber-300 inline-block">gelişim potansiyelin var</strong>; hedef norm ({row.refMid} {row.unit}) için kademeli çalışmalarla yükselecek.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Section 4: Yolculuğun: Başlangıç → Bugün → Hedef */}
          <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-indigo-200/80 pb-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
              <span>Yolculuğun: Başlangıç → Bugün → Hedef</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-white border border-indigo-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold font-sans tabular-nums">
                <span className="text-slate-600">Başlangıç: %{p1Score}</span>
                <span className="text-emerald-700">Bugün: %{p3Score}</span>
                <span className="text-indigo-700 font-extrabold">Bir Sonraki Ölçüm Hedefi: %{nextGoalScore}</span>
              </div>

              <div className="relative w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-slate-400 via-emerald-500 to-indigo-600 rounded-full transition-all"
                  style={{ width: `${p3Score}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Gelecek ölçüm dönemi için belirlenen gerçekçi hedefe (%{nextGoalScore}) ulaşmak amacıyla çalışmalarımıza istikrar ve yüksek motivasyonla devam ediyoruz.
              </p>
            </div>
          </div>

          {/* Section 5: Yaş Grubuna Göre Konumun & Section 6: Branşınla Uyumun */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 5: Yaş Grubuna Göre Konumun */}
            <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="w-3 h-3 rounded-full bg-slate-800 inline-block" />
                <span>Yaş Grubuna Göre Konumun (Üçlü Karşılaştırma)</span>
              </h3>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="inline-block px-3 py-1 rounded-lg bg-emerald-100 text-emerald-950 font-bold text-xs mb-2">
                  Grup Ortalamasının Üstünde
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kendi yaş grubundaki arkadaşlarına göre genel performans seviyen grup ortalamasının (%{grpAvg}) belirgin şekilde üstünde yer almaktadır. Harika bir uyum ve çalışma disiplini sergiliyorsun!
                </p>
              </div>
            </div>

            {/* Section 6: Branşınla Uyumun */}
            <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="w-3 h-3 rounded-full bg-teal-600 inline-block" />
                <span>Branşınla Uyumun</span>
              </h3>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="text-xs font-extrabold text-slate-900 mb-1">
                  Branş: <span className="text-emerald-700">{currentReport.sportBranch}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Beden yapın ve hareket kapasiten bu branşın fiziksel gereksinimlerini harika bir şekilde destekliyor. Ölçülen biyomotor profilin bu branştaki gelişimini güçlü şekilde destekliyor.
                </p>
              </div>
            </div>
          </div>

          {/* Section 7: Gelecek Ölçüme Kadar Yapacaklarımız */}
          <div className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-emerald-200 pb-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
              <span>Gelecek Ölçüme Kadar Yapacaklarımız</span>
            </h3>

            {(() => {
              const focusRows = [...getDisplayedMotorPerformance(currentReport)]
                .sort((a, b) => (a.percentile || 0) - (b.percentile || 0))
                .slice(0, 3);
              if (focusRows.length === 0) return null;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {focusRows.map((row, idx) => (
                    <div key={row.id} className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                      <div className="font-extrabold text-slate-900 mb-1">
                        {idx + 1}. {row.name}
                      </div>
                      <p className="text-slate-600 leading-snug">
                        {`${row.name} alanında hedef norm (${row.refMid} ${row.unit}) için haftalık düzenli gelişim çalışması.`}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs text-slate-700 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <strong className="text-emerald-800 font-extrabold">Velinin Evde Destek Önerisi: </strong>
                Sporcumuzun antrenman günlerinde düzenli uyku almasını destekleyebilir, antrenman sonrasında su tüketimi ve dengeli beslenme alışkanlıklarını evde teşvik edebilirsiniz.
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-950 font-sans tabular-nums text-[11px] font-black shrink-0">
                Bir Sonraki Ölçüm: {currentReport.nextTargetDate || '15 Kasım 2026'}
              </span>
            </div>
          </div>
        </div>

        {renderPageFooter('Veli/Sporcu Karnesi')}
      </div>
    );
  };

  // ============================================================================
  // ALTERNATIVE REPORT 2: ANTRENÖR VE KULÜP KARNESİ (Technical, Comparative, Decision-Focused)
  // ============================================================================
  const renderCoachClubReportCard = () => {
    const grpCount = currentReport.groupInfo.groupAthleteCount || Math.max(1, reports.length);
    const grpRank = currentReport.groupInfo.groupRank || 1;
    const athScore =
      currentReport.scoreHistory.p3Score > 0
        ? currentReport.scoreHistory.p3Score
        : currentReport.scoreHistory.p2Score > 0
        ? currentReport.scoreHistory.p2Score
        : currentReport.scoreHistory.p1Score || 78;
    const grpAvg = currentReport.groupInfo.groupAverageScore ?? 72;
    const grpPos =
      currentReport.groupInfo.groupPositionPercentile ??
      Math.min(99, Math.max(10, Math.round(((grpCount - grpRank + 0.1) / Math.max(1, grpCount)) * 100)));

    return (
      <div
        id="sportsfly-lab-coach-club-page"
        className={`a4-print-page relative overflow-hidden min-h-[1460px] flex flex-col justify-between rounded-xl p-5 sm:p-7 shadow-xs print:shadow-none ${activeTemplate.pageFrameClass}`}
      >
        {renderPageWatermark()}
        <div className="space-y-4 relative z-10">
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0b192c] via-[#0f2942] to-[#1e293b] text-white border-2 border-sky-500/40 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  {effectiveSchoolLogo ? (
                    <img src={effectiveSchoolLogo} alt={effectiveClubName} className="w-full h-full object-contain" />
                  ) : (
                    <SportsFlyVectorMark className="w-8 h-8 text-sky-400" />
                  )}
                </div>
                <div>
                  <h1 className="text-xs font-sans tabular-nums font-bold tracking-wider text-sky-300 uppercase">
                    {effectiveClubName} · AKADEMİ PERFORMANS RAPORU
                  </h1>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                    Antrenör ve Kulüp Yöneticisi Karnesi
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <RotaSportsFlyHeaderBadge
                  isDark={true}
                  effectiveSecondaryHex={effectiveSecondaryHex}
                  hideRota={true}
                />
                <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-sky-200 font-semibold font-sans tabular-nums">
                    TEKNİK MİZANPAJ
                  </div>
                  <div className="text-xs font-sans tabular-nums font-bold text-sky-300">
                    {currentReport.date3 && currentReport.date3 !== '—' ? currentReport.date3 : currentReport.date1}
                  </div>
                </div>
              </div>
            </div>

            {/* Athlete Sub-Header */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3 text-xs font-sans">
              <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700">
                <span className="text-[9px] text-slate-400 block font-sans uppercase">Sporcu</span>
                <span className="font-extrabold text-white text-xs">{currentReport.athleteName}</span>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700">
                <span className="text-[9px] text-slate-400 block font-sans uppercase">Cinsiyet / Yaş</span>
                <span className="font-bold text-slate-200">{currentReport.gender} · {currentReport.ageYears} Yaş</span>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700">
                <span className="text-[9px] text-slate-400 block font-sans uppercase">Branş</span>
                <span className="font-bold text-slate-200">{currentReport.sportBranch}</span>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700">
                <span className="text-[9px] text-slate-400 block font-sans uppercase">Grup</span>
                <span className="font-bold text-slate-200">{currentReport.groupInfo.groupNo}. Grup ({effectiveGroupAgeRange})</span>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-2 border border-emerald-500/50">
                <span className="text-[9px] text-emerald-300 block font-sans uppercase">Skor / Konum</span>
                <span className="font-black text-emerald-400">%{athScore} · %{grpPos} Konum</span>
              </div>
            </div>

            {/* Normative Reference Badges for Coach/Club Report */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-800 text-[10.5px] font-sans">
              <span className="px-3 py-1 rounded-lg bg-slate-800 text-emerald-200 border border-emerald-500/40 font-semibold flex items-center gap-1.5 shadow-xs">
                Morfolojik Referans: WHO &amp; ISAK L2 Kinantropometrik Normlar
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-800 text-sky-200 border border-sky-500/40 font-semibold flex items-center gap-1.5 shadow-xs">
                Biyomotorik Referans: Eurofit, Fleishman &amp; NSCA Biyomekanik Test Normları
              </span>
            </div>
          </div>

          {/* Section 1: Güncel Performans Profili */}
          <div className="p-4 rounded-2xl border-2 border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-900 inline-block" />
                <span>Güncel Performans Profili</span>
              </h3>
              <span className="text-xs font-sans tabular-nums font-bold text-slate-600">
                Test Bazlı Skorlar &amp; Dönemsel Değişim (±%)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse font-sans tabular-nums">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold">
                    <th className="py-2.5 px-2.5 text-left">
                      <div>Test Parametresi</div>
                      <div className="text-[8.5px] font-sans font-medium text-sky-200 normal-case tracking-normal">
                        (Referans: Eurofit / Fleishman / NSCA Normları)
                      </div>
                    </th>
                    <th className="py-2 px-1.5 text-center">1. Test ({currentReport.date1})</th>
                    <th className="py-2 px-1.5 text-center">2. Test (Tahmini) ({currentReport.date2})</th>
                    <th className="py-2 px-2 text-center bg-emerald-950 text-emerald-300 font-black">
                      {currentReport.date3 !== '—' ? `3. Test (${currentReport.date3})` : '—'}
                    </th>
                    <th className="py-2 px-2 text-center">Dönemsel Değişim (Δ)</th>
                    <th className="py-2 px-2 text-right">Trend Yönü</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {getDisplayedMotorPerformance(currentReport).slice(0, 6).map((m, idx) => {
                    const safeM1 = m.m1 > 0 ? m.m1 : 0;
                    const safeM2 =
                      m.m2 > 0
                        ? m.lowerIsBetter
                          ? safeM1 > 0 ? Math.min(safeM1, m.m2) : m.m2
                          : safeM1 > 0 ? Math.max(safeM1, m.m2) : m.m2
                        : safeM1 > 0
                        ? m.lowerIsBetter
                          ? +(safeM1 * 0.96).toFixed(2)
                          : +(safeM1 * 1.05).toFixed(1)
                        : 0;
                    const activeM = m.m3 > 0 ? m.m3 : safeM2;
                    const delta = +(activeM - safeM1).toFixed(2);
                    const isPositive = m.lowerIsBetter ? delta <= 0 : delta >= 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-sans font-bold text-slate-800">{m.name} ({m.unit})</td>
                        <td className="py-2 px-1.5 text-center text-slate-600">{safeM1}</td>
                        <td className="py-2 px-1.5 text-center text-blue-800 font-semibold">{safeM2}</td>
                        <td className="py-2 px-2 text-center font-black text-slate-950 bg-emerald-50/50">{m.m3 > 0 ? m.m3 : ''}</td>
                        <td className="py-2 px-2 text-center font-bold">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-600'}>
                            {delta >= 0 ? `+${delta}` : delta} {m.unit}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-sans font-bold">
                          {isPositive ? (
                            <span className="text-emerald-700 font-sans tabular-nums text-[11px] font-extrabold">İlerleme (Pozitif)</span>
                          ) : (
                            <span className="text-rose-600 font-sans tabular-nums text-[11px] font-extrabold">Takip Edilmeli</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Recharts Spider Chart for Coach/Club Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2.5">
              <RechartsSportsFlyRadarChart
                report={currentReport}
                comparisonMode="initial-group"
                height={230}
                title="1. Ölçüm Başlangıç Seviyesi vs Grup Ortalaması Radarı"
              />
              <InitialMeasurementGroupComparisonChart
                report={currentReport}
                height={230}
              />
            </div>

            {/* Dedicated 2. Ölçüm Gelişim ve Karşılaştırma Paneli (1. Ölçüm -> 2. Ölçüm) */}
            <div className="mt-3">
              <SecondMeasurementComparisonPanel report={currentReport} />
            </div>
          </div>

          {/* Section 2: Öne Çıkan Fiziksel ve Motorik Kapasiteler & Section 3: Öncelikli Gelişim Alanları (Yalnızca ölçülen parametreler) */}
          {(() => {
            const measuredAll = [
              ...getDisplayedMotorPerformance(currentReport),
              ...getDisplayedBodyComposition(currentReport),
            ];
            const topMeasured = [...measuredAll]
              .filter((r) => r.id !== 'body_fat' && r.id !== 'bmi')
              .sort((a, b) => (b.percentile || 0) - (a.percentile || 0))
              .slice(0, 3);
            const devMeasured = [...getDisplayedMotorPerformance(currentReport)]
              .sort((a, b) => (a.percentile || 0) - (b.percentile || 0))
              .slice(0, 3);
            const targetRows = getDisplayedMotorPerformance(currentReport).slice(0, 3);
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Section 2: Öne Çıkan Fiziksel ve Motorik Kapasiteler */}
                  <div className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/20 space-y-2.5">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center justify-between border-b border-emerald-200 pb-2">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                        <span>Öne Çıkan Fiziksel ve Motorik Kapasiteler</span>
                      </span>
                      <span className="text-[10px] font-sans tabular-nums font-bold text-emerald-800">Top {topMeasured.length} Parametre</span>
                    </h3>

                    <div className="space-y-2 text-xs">
                      {topMeasured.map((row, rIdx) => {
                        const val = row.m3 > 0 ? row.m3 : row.m2 > 0 ? row.m2 : row.m1;
                        return (
                          <div key={row.id} className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-900">{row.name}</span>
                              <span className="font-sans tabular-nums text-emerald-700">
                                {val} {row.unit} ({row.sd > 0 ? `+${row.sd}` : row.sd} SD · %{row.percentile} Yüzdelik)
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-600 mt-1 leading-snug">
                              Referans değere göre en yüksek {rIdx + 1}. ölçülen parametre. Yaş grubu standartlarına göre güçlü biyomotorik avantaj.
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Öncelikli Gelişim Alanları ve Antrenman Gerekçesi */}
                  <div className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/20 space-y-2.5">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center justify-between border-b border-rose-200 pb-2">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" />
                        <span>Öncelikli Gelişim Alanları ve Antrenman Gerekçesi</span>
                      </span>
                      <span className="text-[10px] font-sans tabular-nums font-bold text-rose-800">Ölçüm Odaklı Takip</span>
                    </h3>

                    <div className="space-y-2 text-xs">
                      {devMeasured.map((row) => {
                        const val = row.m3 > 0 ? row.m3 : row.m2 > 0 ? row.m2 : row.m1;
                        return (
                          <div key={row.id} className="p-2.5 rounded-xl bg-white border border-rose-200 shadow-2xs">
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-900">{row.name}</span>
                              <span className="font-sans tabular-nums text-rose-700">
                                {val} {row.unit} ({row.sd > 0 ? `+${row.sd}` : row.sd} SD · %{row.percentile} Yüzdelik)
                              </span>
                            </div>
                            <p className="text-[10.5px] text-rose-900 mt-1 leading-snug font-medium">
                              <strong>Gelişim Odağı:</strong> Ölçülen veriye göre hedef norm ({row.refMid} {row.unit}) doğrultusunda bireysel takip önerilmektedir.
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Section 4: Dönemsel Hedef ve Gerçekleşme Oranı */}
                {targetRows.length > 0 && (
                  <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                        <span>Dönemsel Hedef ve Gerçekleşme Oranı</span>
                      </h3>
                      <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-sans tabular-nums text-xs font-black">
                        Ölçülen {targetRows.length} Ana Parametre
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-xs border-collapse font-sans tabular-nums">
                        <thead>
                          <tr className="bg-indigo-950 text-indigo-200 text-[10px] uppercase font-bold">
                            <th className="py-2 px-2.5 text-left font-sans">Hedef Parametresi</th>
                            <th className="py-2 px-1.5 text-center">Başlangıç (M1)</th>
                            <th className="py-2 px-1.5 text-center">2. / Güncel</th>
                            <th className="py-2 px-1.5 text-center text-emerald-300">Hedef Değer</th>
                            <th className="py-2 px-2 text-right font-sans">Yüzdelik</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {targetRows.map((row) => {
                            const cur = row.m3 > 0 ? row.m3 : row.m2 > 0 ? row.m2 : row.m1;
                            return (
                              <tr key={row.id} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 font-sans font-bold text-slate-800">{row.name} ({row.unit})</td>
                                <td className="py-2 px-1.5 text-center text-slate-600">{row.m1}</td>
                                <td className="py-2 px-1.5 text-center font-bold text-slate-900">{cur}</td>
                                <td className="py-2 px-1.5 text-center font-bold text-emerald-700">{row.refMid}</td>
                                <td className="py-2 px-2 text-right font-bold text-blue-700">%{row.percentile}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Section 5: Referans Grup Karşılaştırması & Section 6: Branş Yatkınlık Analizi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 5: Referans Grup Karşılaştırması */}
            <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-900 inline-block" />
                  <span>Referans Grup Karşılaştırması</span>
                </span>
                <span className="text-[10px] font-sans tabular-nums font-bold text-slate-600">{currentReport.groupInfo.groupNo}. Grup ({effectiveGroupAgeRange})</span>
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center font-sans tabular-nums text-xs">
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <div className="text-[9px] font-sans text-slate-500 font-bold uppercase">Yüzdelik Dilim</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">%{grpPos}</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <div className="text-[9px] font-sans text-slate-500 font-bold uppercase">Grup Ortalaması</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">%{grpAvg}</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <div className="text-[9px] font-sans text-slate-500 font-bold uppercase">Z-Skor Konum</div>
                  <div className="text-base font-black text-emerald-700 mt-0.5">+1.83 SD</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-snug p-2.5 rounded-xl bg-white border border-slate-200">
                Grubundaki {grpCount} sporcu arasında genel sıralamada {grpRank}. sırada yer almaktadır. Sporcunun motorik ve antropometrik profili norm grubunun belirgin üstündedir.
              </p>
            </div>

            {/* Section 6: Branş Yatkınlık Analizi */}
            <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                  <span>Branş Yatkınlık Analizi</span>
                </span>
                <span className="text-[10px] font-sans tabular-nums font-bold text-emerald-700">Uyum Skoru: %94</span>
              </h3>

              <div className="space-y-1.5 text-xs font-sans tabular-nums">
                <div className="p-2 rounded-lg bg-white border border-emerald-200 flex justify-between items-center">
                  <span>1. {currentReport.sportBranch}</span>
                  <span className="font-extrabold text-emerald-700">%94 Morfolojik &amp; Motor Uyum</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                  <span>2. Basketbol</span>
                  <span className="font-bold text-blue-700">%89 Sıçrama &amp; Uzanma Uyumu</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                  <span>3. Hentbol</span>
                  <span className="font-bold text-slate-700">%84 Reaksiyon &amp; Üst Gövde Uyumu</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Bireysel Antrenman Planı ve Ölçüm Takvimi */}
          <div className="p-4 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-white">
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span>Bireysel Antrenman Planı ve Ölçüm Takvimi</span>
              </h3>
              <span className="text-xs font-sans tabular-nums font-bold text-emerald-400">
                İzleme Sıklığı: 4 Haftada Bir Ara Kontrol
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Önerilen Yük</div>
                <div className="font-bold text-emerald-300 mt-1">Yüksek Kalite Yüklenme</div>
                <p className="text-[11px] text-slate-300 mt-0.5">1:2 iş/dinlenme oranı, haftada 3 seans nöromüsküler uyarı.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Hedef Parametreler</div>
                <div className="font-bold text-slate-300 mt-1">
                  {getDisplayedMotorPerformance(currentReport)
                    .sort((a, b) => (a.percentile || 0) - (b.percentile || 0))
                    .slice(0, 2)
                    .map((r) => r.name)
                    .join(' & ') || 'Biyomotor Gelişim'}
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Ölçülen performans verilerine göre öncelikli gelişim alanlarında periyodik re-test ve teknik yüklenme takibi.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Ölçüm Takvimi</div>
                <div className="font-bold text-sky-300 mt-1">Resmi Re-Test</div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Bir Sonraki Resmi Ölçüm Tarihi: <strong>{currentReport.nextTargetDate || '15 Kasım 2026'}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {renderPageFooter('Antrenör/Kulüp Karnesi')}
      </div>
    );
  };

  // ============================================================================
  // PAGE 1 (or 2 when Body Map Page is active): BEDEN KOMPOZİSYONU TABLOSU & PHV
  // ============================================================================
  const renderPage1 = () => {
    const displayedBody = getDisplayedBodyComposition(currentReport);
    const heightRow = displayedBody.find((r) => r.id === 'height');
    const weightRow = displayedBody.find((r) => r.id === 'weight');
    const bmiRow = displayedBody.find((r) => r.id === 'bmi');
    const fatRow = displayedBody.find((r) => r.id === 'bodyFat' || r.id === 'body_fat');
    const sumSkinRow = displayedBody.find((r) => r.id === 'sumSkinfolds' || r.id === 'sum_skinfolds');
    const whrRow = displayedBody.find((r) => r.id === 'whr');

    const activeHeight = heightRow ? getActiveParamVal(heightRow, 0) : 0;
    const heightGain = heightRow && activeHeight > 0 ? +(activeHeight - heightRow.m1).toFixed(1) : 0;

    const activeWeight = weightRow ? getActiveParamVal(weightRow, 0) : 0;
    const weightDelta = weightRow && activeWeight > 0 ? +(activeWeight - weightRow.m1).toFixed(1) : 0;

    const activeFat = fatRow ? getActiveParamVal(fatRow, 0) : 0;
    const fatDelta = fatRow && activeFat > 0 ? +(activeFat - fatRow.m1).toFixed(1) : 0;

    const skinfoldRows = displayedBody.filter((r) =>
      ['bicepsSkinfold', 'tricepsSkinfold', 'subscapularSkinfold', 'suprailiacSkinfold', 'calfSkinfold', 'triceps', 'biceps_skf', 'iliac_skf', 'calf_skf', 'subscapula', 'supraspinal'].includes(r.id)
    );

    return (
      <div
        id="sportsfly-lab-page-1"
        className={`a4-print-page relative overflow-hidden min-h-[1460px] flex flex-col justify-between rounded-xl p-8 sm:p-12 shadow-xs print:shadow-none ${activeTemplate.pageFrameClass}`}
      >
        <div>
          {renderPageHeader(
            1,
            '1. Beden Kompozisyonu Değerlendirmesi (Antropometrik Ölçüm Tablosu)',
            'Beden Sağlığı, Deri Kıvrım Kalınlıkları (Skinfold), Kemik Çapı, Kas Çevresi ve Z-Skor (SD) Referans Analizi'
          )}

          {!hideScaleLegend && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-xl border-2 border-slate-200 shadow-2xs mb-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600 inline shrink-0" />
                  <span>Skala Göstergesi (3 Dönemlik Ölçüm Noktaları):</span>
                </span>
                <span className="flex items-center gap-1.5 font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                  <span className="w-3 h-3 rounded-full bg-slate-400 border border-slate-600 inline-block shrink-0" />
                  <span>I. Ölçüm ({currentReport.date1})</span>
                </span>
                <span className="flex items-center gap-1.5 font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs">
                  <span className="w-3 h-3 rounded-full bg-blue-600 border border-white inline-block shrink-0" />
                  <span>II. Ölçüm (Tahmini) ({currentReport.date2})</span>
                </span>
                {currentReport.date3 !== '—' && currentReport.date3 !== '' && (
                  <span className="flex items-center gap-1.5 font-black text-rose-950 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-300 shadow-2xs">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-white inline-block shrink-0" />
                    <span>III. Ölçüm ({currentReport.date3})</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white border border-slate-700 font-sans text-xs font-semibold shadow-2xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 inline-block shrink-0" />
                  <span>Referans Standart: Dünya Sağlık Örgütü (WHO) Uluslararası Büyüme &amp; ISAK Kinantropometri Protokolü</span>
                </span>
              </div>
            </div>
          )}

          {/* Parent Info & Sports History Cards (Matching Reference Image) */}
          <div className="space-y-3 mb-4">
            {/* 2. VELİ BİLGİLERİ */}
            <div className="rounded-xl border-2 border-red-500 overflow-hidden shadow-2xs bg-white">
              <div className="bg-red-600 text-white font-extrabold px-3.5 py-2 text-xs uppercase flex items-center gap-2">
                {!hideSectionNumbers && (
                  <span className="w-5 h-5 rounded-full bg-white text-red-600 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                )}
                <Users className="w-4 h-4" />
                <span>VELİ BİLGİLERİ</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-red-200 p-3 text-xs">
                {/* Anne Bilgileri */}
                <div className="space-y-2 pr-2">
                  <div className="font-extrabold text-slate-900 border-b border-red-100 pb-1">ANNE BİLGİLERİ</div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-4 text-slate-600 font-semibold">Boy / Kilo :</span>
                    <span className="col-span-8 font-medium text-slate-800 border-b border-dashed border-slate-300 pb-0.5">
                      {currentReport.parentInfo?.anneBoy || '—'} cm &nbsp;&nbsp;&nbsp; {currentReport.parentInfo?.anneKilo || '—'} kg
                    </span>
                  </div>
                </div>

                {/* Baba Bilgileri */}
                <div className="space-y-2 pl-0 md:pl-3 pt-3 md:pt-0">
                  <div className="font-extrabold text-slate-900 border-b border-red-100 pb-1">BABA BİLGİLERİ</div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-4 text-slate-600 font-semibold">Boy / Kilo :</span>
                    <span className="col-span-8 font-medium text-slate-800 border-b border-dashed border-slate-300 pb-0.5">
                      {currentReport.parentInfo?.babaBoy || '—'} cm &nbsp;&nbsp;&nbsp; {currentReport.parentInfo?.babaKilo || '—'} kg
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SPOR GEÇMİŞİ */}
            <div className="rounded-xl border-2 border-slate-900 overflow-hidden shadow-2xs bg-white">
              <div className="bg-slate-900 text-white font-extrabold px-3.5 py-2 text-xs uppercase flex items-center gap-2">
                {!hideSectionNumbers && (
                  <span className="w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                )}
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>SPOR GEÇMİŞİ</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300 p-3 text-xs">
                {/* Anne Spor Geçmişi */}
                <div className="space-y-2 pr-2">
                  <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-1">ANNE SPOR GEÇMİŞİ</div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-700 font-semibold">Daha önce / hâlen spor yapıyor mu?</span>
                    <div className="flex items-center gap-4 font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-3.5 h-3.5 rounded border border-slate-600 flex items-center justify-center text-[10px] ${currentReport.parentInfo?.anneSporYapiyorMu === 'Evet' ? 'bg-slate-900 text-white font-black' : 'bg-white'}`}>
                          {currentReport.parentInfo?.anneSporYapiyorMu === 'Evet' ? '✓' : ''}
                        </span>
                        <span>Evet</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-3.5 h-3.5 rounded border border-slate-600 flex items-center justify-center text-[10px] ${currentReport.parentInfo?.anneSporYapiyorMu === 'Hayir' ? 'bg-slate-900 text-white font-black' : 'bg-white'}`}>
                          {currentReport.parentInfo?.anneSporYapiyorMu === 'Hayir' ? '✓' : ''}
                        </span>
                        <span>Hayır</span>
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-5 text-slate-600 font-semibold">Hangi branş(lar)? :</span>
                    <span className="col-span-7 font-medium text-slate-800 border-b border-dashed border-slate-300 pb-0.5">{currentReport.parentInfo?.anneBranslar || '—'}</span>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-5 text-slate-600 font-semibold">Spor geçmişi (yıl/yaş):</span>
                    <span className="col-span-7 font-medium text-slate-800 border-b border-dashed border-slate-300 pb-0.5">{currentReport.parentInfo?.anneSporGecmisi || '—'}</span>
                  </div>
                </div>

                {/* Baba Spor Geçmişi */}
                <div className="space-y-2 pl-0 md:pl-3 pt-3 md:pt-0">
                  <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-1">BABA SPOR GEÇMİŞİ</div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-700 font-semibold">Daha önce / hâlen spor yapıyor mu?</span>
                    <div className="flex items-center gap-4 font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-3.5 h-3.5 rounded border border-slate-600 flex items-center justify-center text-[10px] ${currentReport.parentInfo?.babaSporYapiyorMu === 'Evet' ? 'bg-slate-900 text-white font-black' : 'bg-white'}`}>
                          {currentReport.parentInfo?.babaSporYapiyorMu === 'Evet' ? '✓' : ''}
                        </span>
                        <span>Evet</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-3.5 h-3.5 rounded border border-slate-600 flex items-center justify-center text-[10px] ${currentReport.parentInfo?.babaSporYapiyorMu === 'Hayir' ? 'bg-slate-900 text-white font-black' : 'bg-white'}`}>
                          {currentReport.parentInfo?.babaSporYapiyorMu === 'Hayir' ? '✓' : ''}
                        </span>
                        <span>Hayır</span>
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-5 text-slate-600 font-semibold">Hangi branş(lar)? :</span>
                    <span className="col-span-7 font-medium text-slate-800 border-b border-dashed border-slate-300 pb-0.5">{currentReport.parentInfo?.babaBranslar || '—'}</span>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-5 text-slate-600 font-semibold">Spor geçmişi (yıl/yaş):</span>
                    <span className="col-span-7 font-medium text-slate-800 border-b border-dashed border-slate-300 pb-0.5">{currentReport.parentInfo?.babaSporGecmisi || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main 12-Parameter Table */}
          <div className="overflow-x-auto rounded-xl border-2 border-slate-200 shadow-2xs bg-white mb-3">
            <table className="w-full border-collapse text-left">
              <thead>
                {(() => {
                  const hasBodyM3 = Boolean(
                    currentReport.date3 &&
                    currentReport.date3 !== '—' &&
                    currentReport.date3 !== '' &&
                    displayedBody.some(r => r.m3 > 0)
                  );
                  return (
                    <tr
                      className={`text-[10.5px] font-extrabold uppercase tracking-wider ${activeTemplate.tableHeadClass}`}
                      style={{ backgroundColor: effectivePrimaryHex, color: '#ffffff' }}
                    >
                      <th className={`py-3.5 px-4 rounded-tl-lg ${hasBodyM3 ? 'w-[27%]' : 'w-[29%]'} text-white`}>
                        <div>Antropometrik Parametre</div>
                        <div className="text-[9px] font-sans font-medium text-sky-200 normal-case tracking-normal">
                          (Referans: WHO Uluslararası Büyüme / ISAK L2)
                        </div>
                      </th>
                      <th className={`py-3.5 px-2 text-center ${hasBodyM3 ? 'w-[7%]' : 'w-[8%]'} text-white`}>I</th>
                      <th className={`py-3.5 px-2 text-center ${hasBodyM3 ? 'w-[7%]' : 'w-[9%]'} text-white`}>
                        II (Tahmini)
                      </th>
                      {hasBodyM3 && (
                        <th
                          className="py-3.5 px-2 text-center w-[9%] font-extrabold"
                          style={{ backgroundColor: 'rgba(255,255,255,0.22)', color: '#ffffff' }}
                        >
                          III (Son)
                        </th>
                      )}
                      <th className={`py-3.5 px-2 text-center ${hasBodyM3 ? 'w-[7%]' : 'w-[8%]'} text-white`}>Birim</th>
                      <th className={`py-3.5 px-2 text-center ${hasBodyM3 ? 'w-[7%]' : 'w-[8%]'} text-white`}>Yüzdelik</th>
                      <th className={`py-3.5 px-2 text-center ${hasBodyM3 ? 'w-[12%]' : 'w-[13%]'} text-white`}>Değerlendirme</th>
                      <th className={`py-3.5 px-4 rounded-tr-lg ${hasBodyM3 ? 'w-[24%]' : 'w-[25%]'} text-white`}>Sağlıklı Fiziksel Uygunluk Bölgesi (SD)</th>
                    </tr>
                  );
                })()}
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {(() => {
                  const hasBodyM3 = Boolean(
                    currentReport.date3 &&
                    currentReport.date3 !== '—' &&
                    currentReport.date3 !== '' &&
                    displayedBody.some(r => r.m3 > 0)
                  );
                  return displayedBody.map((row, idx) => {
                    const safeM1 = row.m1 > 0 ? row.m1 : 0;
                    const safeM2 =
                      row.m2 > 0
                        ? row.lowerIsBetter
                          ? safeM1 > 0 ? Math.min(safeM1, row.m2) : row.m2
                          : safeM1 > 0 ? Math.max(safeM1, row.m2) : row.m2
                        : safeM1 > 0
                        ? row.lowerIsBetter
                          ? +(safeM1 * 0.96).toFixed(1)
                          : +(safeM1 * 1.02).toFixed(1)
                        : 0;
                    const p1 = computeScalePos(safeM1, row);
                    const p2 = computeScalePos(safeM2, row);
                    const p3 = computeScalePos(row.m3, row);
                    const isEven = idx % 2 === 0;
                    const isOptimalBody = row.status === 'normal' || row.status === 'mükemmel' || row.status === 'iyi' || row.status === 'uzun';
                    const isWatchBody = row.status === 'yüksek' && Math.abs(row.sd) <= 1.2;
                    const rowBorderClass = isOptimalBody
                      ? 'border-l-4 border-l-emerald-500'
                      : isWatchBody
                      ? 'border-l-4 border-l-amber-500'
                      : 'border-l-4 border-l-rose-500';
                    const targetStateLabel = isOptimalBody
                      ? 'Hedef Bölgede'
                      : isWatchBody
                      ? 'Takip Edilmeli'
                      : 'Gelişim / Denge Odağı';
                    const targetStateClass = isOptimalBody
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : isWatchBody
                      ? 'bg-amber-100 text-slate-900 border-amber-400 font-extrabold'
                      : 'bg-rose-50 text-rose-900 border-rose-300';
                    const isHeightRow = row.id === 'height' || row.name.toLowerCase().includes('boy uzunlu');
                    return (
                      <tr
                        key={row.id}
                        className={`${isEven ? 'bg-slate-50/90' : 'bg-white'} hover:bg-blue-50/60 transition-colors border-b border-slate-200/90 ${rowBorderClass}`}
                      >
                        <td className="py-3 pr-3 pl-4 border-r border-slate-200">
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="font-extrabold text-slate-900 text-[12.5px] tracking-tight truncate">{row.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border shrink-0 whitespace-nowrap ${targetStateClass}`}>
                              {targetStateLabel}
                            </span>
                          </div>
                          <div className="text-[9.5px] text-slate-500 font-medium leading-normal mt-1 line-clamp-2">
                            {row.description}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-sans tabular-nums font-bold text-slate-700 bg-slate-100/70 border-r border-slate-200">
                          {safeM1}
                        </td>
                        <td className="py-3 px-2 text-center font-sans tabular-nums font-bold text-blue-900 bg-blue-50/50 border-r border-slate-200">
                          {safeM2}
                        </td>
                        {hasBodyM3 && (
                          <td className="py-3 px-2 text-center border-r border-slate-200 bg-blue-100/60">
                            {row.m3 > 0 ? (
                              <span className="font-sans tabular-nums font-extrabold text-xs text-blue-950 bg-white border-2 border-blue-500 px-2 py-0.5 rounded-md inline-block shadow-2xs min-w-[32px]">
                                {row.m3}
                              </span>
                            ) : null}
                          </td>
                        )}
                        <td className="py-3 px-2 text-center font-sans tabular-nums text-xs font-bold text-slate-700 border-r border-slate-200">
                          {row.unit}
                        </td>
                      <td className="py-3 px-2 text-center font-sans tabular-nums border-r border-slate-200">
                        <span className="font-sans tabular-nums font-extrabold text-xs text-slate-900 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded inline-block">
                          %{row.percentile}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center border-r border-slate-200">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={getStatusBadge(row.status)}>
                            {row.status}
                          </span>
                          {!isHeightRow && (
                            <span className="text-[9px] font-sans tabular-nums font-bold text-slate-600">
                              Hedef: <strong className="text-slate-900">{row.refMid} {row.unit}</strong>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pl-3 pr-4">
                        <div className="flex items-center justify-between text-[8.5px] font-sans tabular-nums font-bold text-slate-600 mb-1.5 whitespace-nowrap gap-1">
                          <span>Alt: {row.refLow}</span>
                          <span className="text-emerald-800 font-extrabold">İdeal: {row.refMid}</span>
                          <span>Üst: {row.refHigh}</span>
                          <span className="text-slate-900 font-extrabold bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300 shrink-0">sd {row.sd > 0 ? `+${row.sd}` : row.sd}</span>
                        </div>
                        <svg
                          viewBox="0 0 200 12"
                          className="w-full h-3.5 block overflow-visible"
                          aria-label={`${row.name} referans skalası`}
                        >
                          <rect x="0" y="1" width="200" height="10" rx="5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                          <rect x="1" y="1.5" width="43" height="9" rx="4" fill="#0f172a" fillOpacity="0.85" />
                          <rect x="44" y="1.5" width="112" height="9" fill="#10b981" fillOpacity="0.35" />
                          <rect x="156" y="1.5" width="43" height="9" rx="4" fill="#0f172a" fillOpacity="0.85" />

                          <circle cx={p1 * 2} cy="6" r="3.8" fill="#64748b" stroke="#ffffff" strokeWidth="1.2" />
                          <circle cx={p2 * 2} cy="6" r="3.8" fill="#2563eb" stroke="#ffffff" strokeWidth="1.2" />
                          {row.m3 > 0 && (
                            <circle cx={p3 * 2} cy="6" r="5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.6" />
                          )}
                        </svg>
                      </td>
                    </tr>
                  );
                });
              })()}
              </tbody>
            </table>
          </div>

          {/* 1.1 Bölgesel Deri Kıvrımı (Skinfold mm) 3 Dönemlik Değişim Karşılaştırması */}
          {skinfoldRows.length > 0 && (
            <div className="mt-5 pt-4 border-t-2 border-slate-200 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[11.5px] font-extrabold uppercase tracking-wider"
                  style={{ color: effectivePrimaryHex }}
                >
                  1.1 Bölgesel Deri Kıvrımı (Skinfold mm) Dönemsel Değişim Analizi (I → II)
                </span>
                <span className="text-[10px] font-sans tabular-nums font-bold text-slate-700">
                  Düşük Değer = Daha Yüksek Yağsız Kas Tanımlaması
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 print:grid-cols-5 gap-3.5">
                {skinfoldRows.map((sf) => {
                  const activeSf = sf.m3 > 0 ? sf.m3 : (sf.m2 > 0 ? sf.m2 : sf.m1);
                  const delta = +(activeSf - sf.m1).toFixed(1);
                  return (
                    <div key={sf.id} className="p-3 rounded-xl bg-slate-50 border-2 border-slate-200 shadow-2xs">
                      <div className="text-[11px] font-extrabold text-slate-900 truncate">{sf.name}</div>
                      <div className="flex items-baseline justify-between mt-1.5 font-sans tabular-nums">
                        <span className="text-sm font-extrabold text-slate-900">{activeSf} mm</span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            delta <= 0 ? 'bg-emerald-100 text-emerald-900 border border-emerald-400' : 'bg-amber-100 text-slate-900 border border-amber-400'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta} mm
                        </span>
                      </div>
                      <div className="text-[9.5px] font-sans tabular-nums text-slate-700 font-bold mt-1.5">
                        I: {sf.m1} · II: {sf.m2} {sf.m3 > 0 ? `· III: ${sf.m3}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* 1.2 visual Heath-Carter Somatotype Graph (only when at least one component is measured) */}
          {(() => {
            const s1 = currentReport.somatotype?.m1;
            const s2 = currentReport.somatotype?.m2;
            const s3 = currentReport.somatotype?.m3;
            const hasSomatoM3 = Boolean(
              currentReport.date3 &&
                currentReport.date3 !== '—' &&
                currentReport.date3.trim() !== '' &&
                s3 &&
                (s3.endo > 0 || s3.meso > 0 || s3.ecto > 0)
            );
            const hasAnySomato = Boolean(
              (s1 && (s1.endo > 0 || s1.meso > 0 || s1.ecto > 0)) ||
                (s2 && (s2.endo > 0 || s2.meso > 0 || s2.ecto > 0)) ||
                hasSomatoM3
            );
            if (!hasAnySomato) return null;
            return (
              <div className="mt-4 relative z-10">
                <SomatotypeRadarAndChart
                  athleteName={currentReport.athleteName}
                  branch={currentReport.sportBranch}
                  somatotype={currentReport.somatotype}
                  hasThirdMeasurement={hasSomatoM3}
                  defaultView="somatochart"
                  onlyTable={false}
                  className="border-2 border-slate-200 shadow-xs"
                />
              </div>
            );
          })()}
        </div>

        {/* Bottom Full-Page Synthesis Section: PHV Banner + 1.2 Antropometrik Kompozisyon Sentezi */}
        <div
          className="mt-3.5 pt-3 border-t-2 space-y-2.5 relative z-10"
          style={{ borderTopColor: effectivePrimaryHex }}
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-4 print:grid-cols-4 gap-3 p-3.5 rounded-xl border-2 shadow-xs text-white"
            style={{
              backgroundColor: effectivePrimaryHex,
              borderColor: effectiveSecondaryHex,
            }}
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-200">PHV (Tepe Boy Hızı) Yaşı</div>
              <div className="text-lg font-black font-sans tabular-nums text-white mt-0.5">
                {currentReport.phvAge} <span className="text-xs font-semibold text-slate-200">yaş</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-200">PHV Dönemi Boy Tahmini</div>
              <div className="text-lg font-black font-sans tabular-nums text-white mt-0.5">
                {currentReport.phvHeight} <span className="text-xs font-semibold text-slate-200">cm</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-200">18. Yaş Yetişkin Boy Olasılığı</div>
              <div
                className="text-lg font-black font-sans tabular-nums mt-0.5"
                style={{ color: effectiveSecondaryHex === '#0c1d4a' || effectiveSecondaryHex === '#0f172a' ? '#facc15' : (effectiveSecondaryHex || '#facc15') }}
              >
                {currentReport.predictedAdultHeight} <span className="text-xs font-semibold text-slate-200">cm</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-200">Büyüme / Olgunlaşma Durumu</div>
              <div className="text-xs font-extrabold text-emerald-300 mt-1 bg-emerald-950/90 px-2.5 py-0.5 rounded border border-emerald-400/60 inline-block">{currentReport.maturationStatus}</div>
            </div>
          </div>

          {(() => {
            const skinfoldTotal = +(
              skinfoldRows.reduce((acc, r) => acc + (getActiveParamVal(r, 0) || r.m1 || 0), 0)
            ).toFixed(1);
            const summaryCards = [
              heightRow && (
                <div key="height" className="p-3 rounded-xl bg-slate-50 border-2 border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">Dönemsel Boy Kazanımı</div>
                  <div className="text-base font-extrabold font-sans tabular-nums text-slate-900 mt-0.5">
                    {`${heightGain >= 0 ? `+${heightGain}` : heightGain} cm`}
                  </div>
                  <div className="text-[10px] text-emerald-900 font-extrabold mt-0.5">
                    {`I: ${heightRow.m1} → II: ${heightRow.m2 > 0 ? heightRow.m2 : '—'} cm`}
                  </div>
                </div>
              ),
              (bmiRow || weightRow) && (
                <div key="bmi" className="p-3 rounded-xl bg-slate-50 border-2 border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">Vücut Kitle &amp; BKİ</div>
                  <div className="text-base font-extrabold font-sans tabular-nums text-slate-900 mt-0.5">
                    {bmiRow && getActiveParamVal(bmiRow, 0) > 0
                      ? `${getActiveParamVal(bmiRow, 0)} kg/m²`
                      : weightRow
                      ? `${weightRow.m1} kg`
                      : '—'}
                  </div>
                  <div className="text-[10px] text-blue-900 font-extrabold mt-0.5">
                    {weightRow
                      ? `${weightRow.m2 && weightRow.m2 > 0 ? `Kütle Δ: ${weightDelta >= 0 ? `+${weightDelta}` : weightDelta} kg` : `I: ${weightRow.m1} kg`}${bmiRow?.status ? ` (${bmiRow.status})` : ''}`
                      : bmiRow?.status || 'Optimal'}
                  </div>
                </div>
              ),
              (fatRow || sumSkinRow || skinfoldRows.length > 0) && (
                <div key="fat" className="p-3 rounded-xl bg-slate-50 border-2 border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                    {fatRow && activeFat > 0 ? 'Vücut Yağ & Deri Kıvrımı' : 'Deri Kıvrımı Toplamı'}
                  </div>
                  <div className="text-base font-extrabold font-sans tabular-nums text-rose-700 mt-0.5">
                    {fatRow && activeFat > 0
                      ? `%${activeFat}`
                      : sumSkinRow && getActiveParamVal(sumSkinRow, 0) > 0
                      ? `${getActiveParamVal(sumSkinRow, 0)} mm`
                      : `${skinfoldTotal} mm`}
                    {fatRow && activeFat > 0 && sumSkinRow && getActiveParamVal(sumSkinRow, 0) > 0 && (
                      <span className="text-xs font-semibold text-slate-600">
                        {' '}({getActiveParamVal(sumSkinRow, 0)} mm)
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-900 font-extrabold mt-0.5">
                    {fatRow && activeFat > 0
                      ? `Yağ Δ: ${fatDelta > 0 ? `+${fatDelta}` : fatDelta}% (${fatRow.status || 'Optimal'})`
                      : `${skinfoldRows.length} bölgeden skinfold ölçüldü`}
                  </div>
                </div>
              ),
              whrRow && (
                <div key="whr" className="p-3 rounded-xl bg-slate-50 border-2 border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">Bel/Kalça &amp; Metabolik Denge</div>
                  <div className="text-base font-extrabold font-sans tabular-nums text-slate-900 mt-0.5">
                    {getActiveParamVal(whrRow, 0) > 0 ? `${getActiveParamVal(whrRow, 0)} Oran` : '—'}
                  </div>
                  <div className="text-[10px] text-slate-800 font-extrabold mt-0.5">
                    {`Merkez Gövde: ${whrRow.status || 'Optimal'}`}
                  </div>
                </div>
              ),
            ].filter(Boolean);

            if (summaryCards.length === 0) return null;
            const summaryColsClass =
              summaryCards.length === 1
                ? 'grid-cols-1 print:grid-cols-1'
                : summaryCards.length === 2
                ? 'grid-cols-2 print:grid-cols-2'
                : summaryCards.length === 3
                ? 'grid-cols-2 sm:grid-cols-3 print:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-4 print:grid-cols-4';
            return <div className={`grid ${summaryColsClass} gap-3.5`}>{summaryCards}</div>;
          })()}
        </div>

        {renderPageFooter(1)}
      </div>
    );
  };

  // ============================================================================
  // PAGE 2: 2. MOTOR PERFORMANS DEĞERLENDİRMESİ & PUAN SKALASI
  // ============================================================================
  const renderPage2 = () => {
    const displayedMotorList = getDisplayedMotorPerformance(currentReport);
    const motorAvgPct = Math.round(
      displayedMotorList.reduce((acc, r) => acc + r.percentile, 0) /
        Math.max(1, displayedMotorList.length)
    );
    const gInfo = currentReport.groupInfo;
    const groupAthleteCount = gInfo?.groupAthleteCount || 15;
    const groupRank = gInfo?.groupRank || 1;
    const athleticScore = currentReport.scoreHistory.p3Score || 88;
    const groupAvgScore = gInfo?.groupAverageScore ?? 72;
    const groupPosPct =
      gInfo?.groupPositionPercentile ??
      Math.min(99, Math.max(10, Math.round(((groupAthleteCount - groupRank + 0.1) / Math.max(1, groupAthleteCount)) * 100)));
    const topMotorTests = [...displayedMotorList]
      .sort((a, b) => b.percentile - a.percentile)
      .slice(0, 3);
    const devMotorTests = [...displayedMotorList]
      .sort((a, b) => a.percentile - b.percentile)
      .slice(0, 3);

    const getMotorFocusDetail = (id: string, name: string, percentile = 50) => {
      const lower = `${id} ${name}`.toLowerCase();
      if (lower.includes('balance') || lower.includes('denge')) {
        return {
          shortTitle: 'Denge',
          verdict: 'Geliştirilmesi önerilir' as const,
          verdictBadgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
          verdictDotClass: 'bg-rose-600',
          whatIsLow: 'Dinamik ve statik tek ayak denge süresi yaş grubu referans ortalamasının altındadır.',
          whatToDo: 'Haftada 3 gün tek ayak proprioseptif denge (Flamingo, Bosu) ve merkez gövde (core) stabilizasyon egzersizleri uygulanmalı.',
          focusSummary: 'Tek ayak statik/dinamik denge ve merkez gövde (core) stabilizasyonu güçlendirilmeli.',
          drillTag: 'Haftada 3 Gün · Proprioseptif & Bosu Denge Drilleri',
        };
      }
      if (lower.includes('back') || lower.includes('sırt')) {
        return {
          shortTitle: 'Sırt kuvveti',
          verdict: 'Geliştirilmesi önerilir' as const,
          verdictBadgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
          verdictDotClass: 'bg-rose-600',
          whatIsLow: 'Sırt ekstansör ve gövde izometrik kuvveti üst performans eşiğinin altındadır.',
          whatToDo: 'Haftada 2 gün vücut ağırlığıyla sırt ekstansiyon, plank ve posterior zincir kuvvetlendirme drilleri yapılmalı.',
          focusSummary: 'Posterior zincir, sırt ekstansör ve gövde izometrik kuvveti desteklenmeli.',
          drillTag: 'Haftada 2 Gün · Core & Lomber Ekstansiyon Kuvveti',
        };
      }
      if (lower.includes('flexibility') || lower.includes('esneklik')) {
        return {
          shortTitle: 'Esneklik',
          verdict: (percentile < 50 ? 'Geliştirilmesi önerilir' : 'Korunmalı') as 'Geliştirilmesi önerilir' | 'Korunmalı' | 'Güçlü yön',
          verdictBadgeClass: percentile < 50 ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-blue-100 text-blue-900 border-blue-300',
          verdictDotClass: percentile < 50 ? 'bg-rose-600' : 'bg-blue-600',
          whatIsLow: 'Hamstring ve lomber bölge eklem hareket açıklığı (ROM) sağlıklı uygunluk bölgesindedir.',
          whatToDo: 'Mevcut esneklik seviyesini korumak ve sakatlıkları önlemek için her antrenman sonunda 10 dk dinamik mobilite ve germe rutini sürdürülmeli.',
          focusSummary: 'Hamstring ve lomber bölge eklem hareket açıklığı (ROM) düzenli mobilite ile korunmalı.',
          drillTag: 'Her Antrenman Sonu · PNF & Dinamik Mobilite Koruması',
        };
      }
      if (lower.includes('grip') || lower.includes('kavrama')) {
        return {
          shortTitle: 'Kavrama kuvveti',
          verdict: (percentile >= 75 ? 'Güçlü yön' : percentile >= 50 ? 'Korunmalı' : 'Geliştirilmesi önerilir') as 'Geliştirilmesi önerilir' | 'Korunmalı' | 'Güçlü yön',
          verdictBadgeClass: percentile >= 75 ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-blue-100 text-blue-900 border-blue-300',
          verdictDotClass: percentile >= 75 ? 'bg-emerald-600' : 'bg-blue-600',
          whatIsLow: 'El ve ön kol maksimum izometrik kavrama kuvveti yaş grubunun en üst yüzdelik dilimindedir.',
          whatToDo: 'Bu güçlü yön korunmalı; branş içi top hakimiyeti, pas sertliği ve ikili mücadelelerde aktif avantaja dönüştürülmeli.',
          focusSummary: 'Üst ekstremite ön kol ve izometrik el kavrama kuvveti üst düzeyde korunmalı.',
          drillTag: 'Haftada 2 Gün · Fonksiyonel Üst Gövde & Kavrama Transferi',
        };
      }
      if (lower.includes('aerobic') || lower.includes('aerobik') || lower.includes('pacer')) {
        return {
          shortTitle: 'Aerobik kapasite',
          verdict: (percentile < 65 ? 'Geliştirilmesi önerilir' : percentile < 85 ? 'Korunmalı' : 'Güçlü yön') as 'Geliştirilmesi önerilir' | 'Korunmalı' | 'Güçlü yön',
          verdictBadgeClass: percentile < 65 ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-blue-100 text-blue-900 border-blue-300',
          verdictDotClass: percentile < 65 ? 'bg-rose-600' : 'bg-blue-600',
          whatIsLow: 'Maksimal oksijen tüketimi (VO2peak) ve mekik koşusu devamlılığı hedef eşiğin altındadır.',
          whatToDo: 'Haftada 2-3 gün Zone 3-4 interval koşular ve oyun içi aerobik dayanıklılık drilleri uygulanmalı.',
          focusSummary: 'Kardiyorespiratuar dayanıklılık (VO2peak) ve mekik koşusu temposu artırılmalı.',
          drillTag: 'Haftada 2-3 Gün · Zone 3-4 İnterval Dayanıklılık',
        };
      }
      if (lower.includes('long_jump') || lower.includes('uzun atlama')) {
        return {
          shortTitle: 'Durarak uzun atlama',
          verdict: (percentile < 60 ? 'Geliştirilmesi önerilir' : percentile < 85 ? 'Korunmalı' : 'Güçlü yön') as 'Geliştirilmesi önerilir' | 'Korunmalı' | 'Güçlü yön',
          verdictBadgeClass: percentile < 60 ? 'bg-rose-100 text-rose-900 border-rose-300' : percentile < 85 ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-emerald-100 text-emerald-950 border-emerald-300',
          verdictDotClass: percentile < 60 ? 'bg-rose-600' : percentile < 85 ? 'bg-blue-600' : 'bg-emerald-600',
          whatIsLow: 'Alt ekstremite yatay patlayıcı güç iyi seviyededir; üst limite taşınabilir.',
          whatToDo: 'Mevcut patlayıcı bacak gücünü korumak ve artırmak için haftada 2 gün yatay pliometrik sıçrama drilleri yapılmalı.',
          focusSummary: 'Alt ekstremite yatay patlayıcı güç ve kol-bacak sıçrama koordinasyonu geliştirilmeli.',
          drillTag: 'Haftada 2 Gün · Yatay Pliometrik & Çift Ayak Sıçrama',
        };
      }
      if (lower.includes('vertical') || lower.includes('dikey')) {
        return {
          shortTitle: 'Dikey sıçrama',
          verdict: (percentile >= 80 ? 'Güçlü yön' : percentile >= 60 ? 'Korunmalı' : 'Geliştirilmesi önerilir') as 'Geliştirilmesi önerilir' | 'Korunmalı' | 'Güçlü yön',
          verdictBadgeClass: percentile >= 80 ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-blue-100 text-blue-900 border-blue-300',
          verdictDotClass: percentile >= 80 ? 'bg-emerald-600' : 'bg-blue-600',
          whatIsLow: 'Alt beden dikey patlayıcı sıçrama yüksekliği yaş grubuna göre güçlü seviyededir.',
          whatToDo: 'Sıçrama kuvvetini branş içi sıçrama ve iniş mekaniği drilleriyle koruyarak müsabakaya aktarın.',
          focusSummary: 'Dikey patlayıcı sıçrama kuvveti ve ayak bileği reaktif sertliği artırılmalı.',
          drillTag: 'Haftada 2 Gün · Countermovement & Kutu Sıçrama',
        };
      }
      if (lower.includes('sprint') || lower.includes('sürat')) {
        return {
          shortTitle: 'Sürat (20m)',
          verdict: (percentile >= 80 ? 'Güçlü yön' : percentile >= 60 ? 'Korunmalı' : 'Geliştirilmesi önerilir') as 'Geliştirilmesi önerilir' | 'Korunmalı' | 'Güçlü yön',
          verdictBadgeClass: percentile >= 80 ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-blue-100 text-blue-900 border-blue-300',
          verdictDotClass: percentile >= 80 ? 'bg-emerald-600' : 'bg-blue-600',
          whatIsLow: '20m doğrusal ivmelenme ve maksimal hız kapasitesi üst yüzdelik dilimdedir.',
          whatToDo: 'İlk adım çabukluğu ve sprint tekniği haftalık kısa mesafe ivmelenme drilleriyle korunmalı.',
          focusSummary: 'İlk adım çıkış ivmelenmesi ve maksimal sprint adım frekansı hızlandırılmalı.',
          drillTag: 'Haftada 2 Gün · 10m-20m İvmelenme & Çıkış Drilleri',
        };
      }
      if (lower.includes('agility') || lower.includes('çabukluk')) {
        return {
          shortTitle: 'Çabukluk (10x5m)',
          verdict: (percentile >= 80 ? 'Güçlü yön' : percentile >= 60 ? 'Korunmalı' : 'Geliştirilmesi önerilir') as 'Geliştirilmesi önerilir' | 'Korunmalı' | 'Güçlü yön',
          verdictBadgeClass: percentile >= 80 ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-blue-100 text-blue-900 border-blue-300',
          verdictDotClass: percentile >= 80 ? 'bg-emerald-600' : 'bg-blue-600',
          whatIsLow: 'Çok yönlü yön değiştirme (COD) ve çeviklik süresi elit referans bölgesindedir.',
          whatToDo: 'Yüksek yön değiştirme becerisi branş özgü reaktif oyun drilleriyle desteklenerek sürdürülmeli.',
          focusSummary: 'Çok yönlü yön değiştirme (COD) ve frenleme-hızlanma geçişleri iyileştirilmeli.',
          drillTag: 'Haftada 2-3 Gün · 10x5m Reaktif Çeviklik & COD',
        };
      }
      if (lower.includes('reaction') || lower.includes('reaksiyon')) {
        return {
          shortTitle: 'Reaksiyon sürati',
          verdict: (percentile >= 80 ? 'Güçlü yön' : percentile >= 60 ? 'Korunmalı' : 'Geliştirilmesi önerilir') as 'Geliştirilmesi önerilir' | 'Korunmalı' | 'Güçlü yön',
          verdictBadgeClass: percentile >= 80 ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-blue-100 text-blue-900 border-blue-300',
          verdictDotClass: percentile >= 80 ? 'bg-emerald-600' : 'bg-blue-600',
          whatIsLow: 'Görsel uyaran algılama ve el-göz koordinasyon tepki süresi üst düzeydedir.',
          whatToDo: 'Antrenman ısınmalarında bilişsel-görsel reaksiyon oyunlarıyla bu avantaj aktif tutulmalı.',
          focusSummary: 'Görsel uyaran algılama ve nöromüsküler el-göz tepki süresi kısaltılmalı.',
          drillTag: 'Her Antrenman Öncesi · 10 Dk Görsel Reaksiyon',
        };
      }
      return {
        shortTitle: name,
        verdict: (percentile < 65 ? 'Geliştirilmesi önerilir' : percentile < 85 ? 'Korunmalı' : 'Güçlü yön') as 'Geliştirilmesi önerilir' | 'Korunmalı' | 'Güçlü yön',
        verdictBadgeClass: percentile < 65 ? 'bg-rose-100 text-rose-900 border-rose-300' : percentile < 85 ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-emerald-100 text-emerald-950 border-emerald-300',
        verdictDotClass: percentile < 65 ? 'bg-rose-600' : percentile < 85 ? 'bg-blue-600' : 'bg-emerald-600',
        whatIsLow: 'Yaş grubu normatif referans değerlerine göre bireysel gelişim takibi yapılmalıdır.',
        whatToDo: 'Haftada 2-3 gün hedef odaklı biyomotor yüklenme drilleri uygulanmalı.',
        focusSummary: 'Yaş grubu normatif hedef değerine ulaşmak için spesifik biyomotor yüklenme uygulanmalı.',
        drillTag: 'Haftada 2-3 Gün · Bireysel Hedef Odaklı Drill',
      };
    };

    return (
      <div
        id="sportsfly-lab-page-2"
        className={`a4-print-page relative overflow-hidden min-h-[1460px] flex flex-col justify-between rounded-xl p-8 sm:p-12 shadow-xs print:shadow-none ${activeTemplate.pageFrameClass}`}
      >
        <div>
          {renderPageHeader(
            2,
            '2. Motor Performans Değerlendirmesi',
            'Performans ve Sağlık: Sürat, Çabukluk, Reaksiyon, Kuvvet, Patlayıcı Güç, Denge, Esneklik ve Aerobik Kapasite'
          )}

          {!hideScaleLegend && (
            <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs mb-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[10.5px] font-black uppercase text-slate-900 tracking-wider flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-600 inline shrink-0" />
                    <span>Fiziksel Uygunluk (3 Nokta) Kılavuzu:</span>
                  </span>
                  <span className="flex items-center gap-1 font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-600 inline-block shrink-0" />
                    <span>Gri = 1. Test ({currentReport.date1})</span>
                  </span>
                  <span className="flex items-center gap-1 font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white inline-block shrink-0" />
                    <span>Mavi = 2. Test (Tahmini) ({currentReport.date2})</span>
                  </span>
                  {currentReport.date3 !== '—' && currentReport.date3 !== '' && (
                    <span className="flex items-center gap-1 font-black text-rose-950 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 text-[10px]">
                      <span className="w-3 h-3 rounded-full bg-rose-600 border border-white inline-block shrink-0" />
                      <span>III. Test ({currentReport.date3})</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white border border-slate-700 font-sans text-xs font-semibold shadow-2xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
                    <span>Normatif Referans Kaynağı: Eurofit &amp; Fleishman Biyomekanik Test Normları</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 15. TEST SONUÇLARI VE HEDEFLER — İLK BAKIŞTA 3 KATEGORİLİ GÖRSEL DURUM PANOSU */}
          {(() => {
            const devList = displayedMotorList.filter((r) => {
              const g = getMotorFocusDetail(r.id, r.name, r.percentile);
              return g.verdict === 'Geliştirilmesi önerilir';
            });
            const watchList = displayedMotorList.filter((r) => {
              const g = getMotorFocusDetail(r.id, r.name, r.percentile);
              return g.verdict === 'Korunmalı';
            });
            const reachedList = displayedMotorList.filter((r) => {
              const g = getMotorFocusDetail(r.id, r.name, r.percentile);
              return g.verdict === 'Güçlü yön';
            });

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-2 mb-2.5">
                {/* 1. Gelişim Göstermesi Gereken Alanlar */}
                <div className="p-2.5 rounded-xl border-2 border-rose-300 bg-rose-50 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-sans tabular-nums text-[9px] font-black uppercase tracking-wider">
                      1. GELİŞİM GÖSTERMELİ ({devList.length} TEST)
                    </span>
                    <span className="text-[9px] font-extrabold text-rose-900">Öncelikli Hedef</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {devList.slice(0, 4).map((item) => {
                      const curVal = getActiveParamVal(item);
                      return (
                        <span
                          key={item.id}
                          className="px-1.5 py-0.5 rounded bg-white border border-rose-300 text-rose-950 text-[9px] font-extrabold font-sans tabular-nums whitespace-nowrap"
                        >
                          • {item.name.replace(' Testi', '')}: {curVal}→{item.refMid} {item.unit}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Takip Edilmesi / Korunması Gereken Alanlar */}
                <div className="p-2.5 rounded-xl border-2 border-amber-300 bg-amber-50 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-sans tabular-nums text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                      2. TAKİP EDİLMELİ ({watchList.length} TEST)
                    </span>
                    <span className="text-[9px] font-black text-slate-900 whitespace-nowrap">İzlem &amp; Koruma</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {watchList.slice(0, 4).map((item) => {
                      const curVal = getActiveParamVal(item);
                      return (
                        <span
                          key={item.id}
                          className="px-1.5 py-0.5 rounded bg-white border border-amber-400 text-slate-900 text-[9px] font-black font-sans tabular-nums whitespace-nowrap"
                        >
                          • {item.name.replace(' Testi', '')}: {curVal}→{item.refHigh} {item.unit}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Hedefe Ulaşılan / Güçlü Alanlar */}
                <div className="p-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-50 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-sans tabular-nums text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                      3. HEDEFE ULAŞTI ({reachedList.length} TEST)
                    </span>
                    <span className="text-[9px] font-extrabold text-emerald-950 whitespace-nowrap">Üst Performans</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reachedList.slice(0, 4).map((item) => {
                      const curVal = getActiveParamVal(item);
                      return (
                        <span
                          key={item.id}
                          className="px-1.5 py-0.5 rounded bg-white border border-emerald-300 text-emerald-950 text-[9px] font-extrabold font-sans tabular-nums whitespace-nowrap"
                        >
                          {item.name.replace(' Testi', '')}: {curVal} {item.unit} (%{item.percentile})
                        </span>
                      );
                    })}
                    {reachedList.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-900 text-[8.5px] font-bold">
                        +{reachedList.length - 4} test daha
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 2. Ölçüm Karşılaştırma Paneli for Page 2 */}
          <div className="mb-2.5">
            <SecondMeasurementComparisonPanel report={currentReport} />
          </div>

          {/* 10 Motor Tests Table (Color-Coded with Explicit Target & Progress Visibility) */}
          <div className="overflow-x-auto rounded-xl border-2 border-slate-200 shadow-2xs bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                {(() => {
                  const hasMotorM3 = Boolean(
                    currentReport.date3 &&
                    currentReport.date3 !== '—' &&
                    currentReport.date3 !== '' &&
                    displayedMotorList.some(r => r.m3 > 0)
                  );
                  return (
                    <tr
                      className={`text-[10.5px] font-black uppercase tracking-wider ${activeTemplate.tableHeadClass}`}
                      style={{ backgroundColor: effectivePrimaryHex, color: '#ffffff' }}
                    >
                      <th className={`py-2.5 px-3 rounded-tl-lg ${hasMotorM3 ? 'w-[26%]' : 'w-[28%]'} text-white`}>
                        <div>Motor Performans Testi</div>
                        <div className="text-[9px] font-sans font-medium text-sky-200 normal-case tracking-normal">
                          (Referans: Eurofit / Fleishman / ACSM Gençlik Normları)
                        </div>
                      </th>
                      <th className={`py-2 px-1.5 text-center ${hasMotorM3 ? 'w-[6.5%]' : 'w-[8%]'} text-white`}>1. Test</th>
                      <th className={`py-2 px-1.5 text-center ${hasMotorM3 ? 'w-[6.5%]' : 'w-[10%]'} text-white`}>
                        2. Test (Tahmini)
                      </th>
                      {hasMotorM3 && (
                        <th
                          className="py-2 px-2 text-center w-[9.5%] font-black"
                          style={{ backgroundColor: 'rgba(255,255,255,0.22)', color: '#ffffff' }}
                        >
                          3. Test (Son)
                        </th>
                      )}
                      <th
                        className={`py-2 px-2 text-center ${hasMotorM3 ? 'w-[10%]' : 'w-[12%]'} font-black`}
                        style={{ backgroundColor: 'rgba(16,185,129,0.28)', color: '#ffffff' }}
                      >
                        Hedef Değer
                      </th>
                      <th className={`py-2 px-1.5 text-center ${hasMotorM3 ? 'w-[7%]' : 'w-[8%]'} text-white`}>Yüzdelik</th>
                      <th className={`py-2 px-2 text-center ${hasMotorM3 ? 'w-[14.5%]' : 'w-[15%]'} text-white`}>Hedef &amp; Gelişim Durumu</th>
                      <th className={`py-2 px-2.5 rounded-tr-lg ${hasMotorM3 ? 'w-[20%]' : 'w-[19%]'} text-white`}>
                        {hasMotorM3 ? '1–2–3. Test İlerleme & Hedef Skalası' : '1–2. Test (Tahmini) İlerleme & Hedef Skalası'}
                      </th>
                    </tr>
                  );
                })()}
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {(() => {
                  const displayedMotor = getDisplayedMotorPerformance(currentReport);
                  const hasMotorM3 = Boolean(
                    currentReport.date3 &&
                    currentReport.date3 !== '—' &&
                    currentReport.date3 !== '' &&
                    displayedMotor.some(r => r.m3 > 0)
                  );
                  return displayedMotor.map((row) => {
                    const safeM1 = row.m1 > 0 ? row.m1 : 0;
                    const safeM2 = row.m2 > 0 ? row.m2 : (row.m1 > 0 ? (row.lowerIsBetter ? +(safeM1 * 0.96).toFixed(2) : +(safeM1 * 1.05).toFixed(1)) : 0);
                    const p1 = computeScalePos(safeM1, row);
                    const p2 = computeScalePos(safeM2, row);
                    const p3 = computeScalePos(row.m3, row);
                    const guidance = getMotorFocusDetail(row.id, row.name, row.percentile);
                    const isNeedsDev = guidance.verdict === 'Geliştirilmesi önerilir';
                    const isMaintain = guidance.verdict === 'Korunmalı';

                    const activeMotorVal = row.m3 > 0 ? row.m3 : safeM2;
                    const targetValue = isNeedsDev
                      ? row.refMid
                      : row.lowerIsBetter
                      ? +(Math.max(row.refHigh, activeMotorVal * 0.96)).toFixed(2)
                      : +(Math.min(row.refHigh, +(activeMotorVal * 1.05).toFixed(1))).toFixed(1);

                    const rowVisualStyle = isNeedsDev
                      ? 'bg-rose-50/50 border-l-4 border-l-rose-600'
                      : isMaintain
                      ? 'bg-amber-50/40 border-l-4 border-l-amber-500'
                      : 'bg-emerald-50/40 border-l-4 border-l-emerald-600';

                    const statusHeaderLabel = isNeedsDev
                      ? 'GELİŞİM GÖSTERMELİ'
                      : isMaintain
                      ? 'TAKİP EDİLMELİ'
                      : 'HEDEFE ULAŞTI';

                    const statusHeaderPill = isNeedsDev
                      ? 'bg-rose-600 text-white border-rose-700'
                      : isMaintain
                      ? 'bg-amber-500 text-slate-950 border-amber-600'
                      : 'bg-emerald-600 text-white border-emerald-700';

                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-slate-200/90 ${rowVisualStyle}`}
                      >
                        <td className="py-1.5 pr-2 pl-2.5 border-r border-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-900 text-xs tracking-tight truncate">{row.name}</span>
                            <span className="text-[9.5px] font-sans tabular-nums font-bold text-slate-500 shrink-0 whitespace-nowrap">
                              ({row.unit})
                            </span>
                          </div>
                          {showTrainingPlanFrequency && (
                            <div className="text-[9.5px] text-slate-600 font-medium leading-normal mt-0.5">
                              <strong className={isNeedsDev ? 'text-rose-700' : 'text-emerald-800'}>
                                 {guidance.drillTag}
                              </strong>
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-1.5 text-center font-sans tabular-nums font-bold text-slate-700 bg-white/70 border-r border-slate-200">
                          {safeM1}
                        </td>
                        <td className="py-1.5 px-1.5 text-center font-sans tabular-nums font-bold text-blue-900 bg-blue-50/40 border-r border-slate-200">
                          {safeM2}
                        </td>
                        {hasMotorM3 && (
                          <td className="py-1.5 px-2 text-center border-r border-slate-200 bg-white/90">
                            {row.m3 > 0 ? (
                              <span
                                className={`font-sans tabular-nums font-black text-xs px-2 py-0.5 rounded-md inline-block border-2 min-w-[32px] ${
                                  isNeedsDev
                                    ? 'bg-rose-50 text-rose-950 border-rose-500'
                                    : isMaintain
                                    ? 'bg-amber-100 text-slate-900 border-amber-500 font-black'
                                    : 'bg-emerald-50 text-emerald-950 border-emerald-500'
                                }`}
                              >
                                {row.m3}
                              </span>
                            ) : null}
                          </td>
                        )}
                        <td className="py-1.5 px-2 text-center border-r border-slate-200 bg-slate-50">
                        <div className="font-sans tabular-nums font-black text-xs text-slate-900 bg-white border border-slate-300 px-1.5 py-0.5 rounded inline-block">
                          {targetValue} <span className="text-[8.5px] font-normal text-slate-500">{row.unit}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-sans tabular-nums border-r border-slate-200">
                        <span className="font-sans tabular-nums font-black text-xs text-slate-900 bg-white border border-slate-300 px-1.5 py-0.5 rounded inline-block">
                          %{row.percentile}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-slate-200">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-sans tabular-nums font-black uppercase tracking-wider border ${statusHeaderPill}`}>
                            {statusHeaderLabel}
                          </span>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold border ${guidance.verdictBadgeClass}`}>
                            {guidance.shortTitle} → {guidance.verdict}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 pl-2 pr-2.5">
                        <div className="flex items-center justify-between text-[8.5px] font-sans tabular-nums font-bold text-slate-700 mb-0.5">
                          <span className="text-slate-500">Alt:{row.refLow}</span>
                          <span className="text-slate-900 font-black">Hedef:{row.refMid}</span>
                          <span className="text-emerald-800 font-black">Üst:{row.refHigh}</span>
                        </div>
                        <svg
                          viewBox="0 0 200 12"
                          className="w-full h-3 block overflow-visible"
                          aria-label={`${row.name} performans skalası`}
                        >
                          <rect x="0" y="1.5" width="200" height="9" rx="4.5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                          <rect x="1" y="2" width="58" height="8" rx="3.5" fill="#f43f5e" fillOpacity="0.28" />
                          <rect x="60" y="2" width="75" height="8" fill="#f59e0b" fillOpacity="0.28" />
                          <rect x="136" y="2" width="63" height="8" rx="3.5" fill="#10b981" fillOpacity="0.45" />
                          <line x1="100" y1="0" x2="100" y2="12" stroke="#0f172a" strokeWidth="1.5" strokeDasharray="2,1" />
                          <circle cx={p1 * 2} cy="6" r="3.5" fill="#64748b" stroke="#ffffff" strokeWidth="1.2" />
                          <circle cx={p2 * 2} cy="6" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.2" />
                          {row.m3 > 0 && (
                            <circle
                              cx={p3 * 2}
                              cy="6"
                              r="4.8"
                              fill={isNeedsDev ? '#e11d48' : isMaintain ? '#d97706' : '#059669'}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          )}
                        </svg>
                      </td>
                    </tr>
                  );
                });
              })()}
              </tbody>
            </table>
          </div>

          {/* Motor Performance Normative Reference Source Tag */}
          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-sans text-[10.5px] font-semibold flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
                <span>Normatif Referans Kaynağı: Eurofit Fiziksel Uygunluk Test Bataryası (Avrupa Konseyi) &amp; Fleishman Biyomekanik Performans Standartları (ACSM / NSCA)</span>
              </span>
            </div>
            <span className="text-[10px] font-sans font-semibold text-slate-600 shrink-0">
              Yaş &amp; Cinsiyet Normatif Standartları
            </span>
          </div>

        </div>

        {renderPageFooter(2)}
      </div>
    );
  };

  // ============================================================================
  // PAGE 3: 3. KRİTİK PERFORMANS & GELİŞİM ANALİZİ (ÖNCELİKLİ 4 BİYOMOTORİK VERİ & KARŞILAŞTIRMA)
  // ============================================================================
  const renderPage3 = () => {
    const getReportActiveScore = (r: SportsFlyLabReport): number => {
      if (r.scoreHistory?.p3Score && r.scoreHistory.p3Score > 0) return r.scoreHistory.p3Score;
      if (r.scoreHistory?.p2Score && r.scoreHistory.p2Score > 0) return r.scoreHistory.p2Score;
      if (r.scoreHistory?.p1Score && r.scoreHistory.p1Score > 0) return r.scoreHistory.p1Score;
      const measuredMotors = getDisplayedMotorPerformance(r);
      if (measuredMotors.length > 0) {
        const sum = measuredMotors.reduce((acc, m) => acc + (m.percentile || 65), 0);
        return Math.round(sum / measuredMotors.length);
      }
      return 72;
    };

    const normClub = (currentReport.clubName || '').trim().toLocaleLowerCase('tr-TR');
    const normAge = (currentReport.groupInfo?.ageRange || '').trim().toLocaleLowerCase('tr-TR');
    const grpNo = currentReport.groupInfo?.groupNo;

    const sameClubAndGroup = reports.filter((r) => {
      const rClub = (r.clubName || '').trim().toLocaleLowerCase('tr-TR');
      const rAge = (r.groupInfo?.ageRange || '').trim().toLocaleLowerCase('tr-TR');
      return rClub === normClub && (rAge === normAge || r.groupInfo?.groupNo === grpNo);
    });
    const sameClub = reports.filter(
      (r) => (r.clubName || '').trim().toLocaleLowerCase('tr-TR') === normClub
    );
    const peerReports =
      sameClubAndGroup.length > 1
        ? sameClubAndGroup
        : sameClub.length > 1
        ? sameClub
        : reports.length > 0
        ? reports
        : [currentReport];

    const gInfo = currentReport.groupInfo;
    const groupAthleteCount = peerReports.length > 1 ? peerReports.length : (gInfo?.groupAthleteCount || 1);
    const athleticScore = getReportActiveScore(currentReport);
    const groupAvgScore =
      peerReports.length > 0
        ? Math.round(peerReports.reduce((acc, r) => acc + getReportActiveScore(r), 0) / peerReports.length)
        : gInfo?.groupAverageScore ?? 72;

    const sortedPeers = [...peerReports].sort(
      (a, b) => getReportActiveScore(b) - getReportActiveScore(a)
    );
    const foundRank = sortedPeers.findIndex((r) => r.id === currentReport.id) + 1;
    const groupRank = foundRank > 0 ? foundRank : gInfo?.groupRank || 1;

    // En kritik ölçülen biyomotorik test parametreleri seçimi (yalnızca ölçülenler)
    const motorRows = getDisplayedMotorPerformance(currentReport);
    const pickedIds = new Set<string>();
    const pickUnique = (pred: (r: typeof motorRows[0]) => boolean, fallbackIdx: number) => {
      const found = motorRows.find((r) => !pickedIds.has(r.id) && pred(r))
        || motorRows.find((r, idx) => idx >= fallbackIdx && !pickedIds.has(r.id))
        || motorRows.find((r) => !pickedIds.has(r.id));
      if (found) pickedIds.add(found.id);
      return found;
    };

    const speedRow = pickUnique(
      (r) => r.id === 'sprint' || r.id === 'sprint_20m' || r.name.toLowerCase().includes('20m') || r.name.toLowerCase().includes('sprint'),
      0
    );
    const powerRow = pickUnique(
      (r) => r.id === 'vertical_jump' || r.id === 'jump' || r.name.toLowerCase().includes('dikey sıçrama'),
      1
    );
    const agilityRow = pickUnique(
      (r) => r.id === 'agility' || r.id === 'shuttle_run' || r.id === '10x5m' || r.name.toLowerCase().includes('10x5'),
      2
    );
    const fourthRow = pickUnique(
      (r) => r.id === 'grip_strength_right' || r.id === 'grip' || r.name.toLowerCase().includes('pençe') || r.name.toLowerCase().includes('pacer') || r.name.toLowerCase().includes('aerobik'),
      3
    );

    const getPeerMetricAvg = (targetRow?: typeof motorRows[0]) => {
      if (!targetRow) return groupAvgScore;
      const vals: number[] = [];
      peerReports.forEach((pr) => {
        const m = (pr.motorPerformance || []).find(
          (item) => item.id === targetRow.id || item.name === targetRow.name
        );
        if (m && m.percentile > 0) {
          vals.push(Math.max(35, Math.min(96, m.percentile)));
        }
      });
      return vals.length > 0
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : groupAvgScore;
    };

    const getActiveVal = (r?: typeof motorRows[0]) => {
      if (!r) return 0;
      return r.m3 > 0 ? r.m3 : (r.m2 > 0 ? r.m2 : r.m1);
    };

    const getDeltaText = (r?: typeof motorRows[0]) => {
      if (!r) return '—';
      const cur = getActiveVal(r);
      if (cur === r.m1) return 'Referans Değer';
      if (r.lowerIsBetter) {
        const diff = +(r.m1 - cur).toFixed(2);
        return diff > 0 ? `${diff} ${r.unit} iyileşme` : `${Math.abs(diff)} ${r.unit} fark`;
      } else {
        const diff = +(cur - r.m1).toFixed(1);
        return diff > 0 ? `+${diff} ${r.unit} artış` : `${diff} ${r.unit}`;
      }
    };

    const criticalMetrics = [
      speedRow && {
        id: 'speed',
        category: 'Hız / İvmelenme',
        title: 'Sürat Performansı',
        subTitle: speedRow.name,
        row: speedRow,
        targetScore: Math.min(96, Math.max((speedRow.percentile || 75) + 7, getPeerMetricAvg(speedRow) + 8, 85)),
        groupScore: getPeerMetricAvg(speedRow),
        badgeClass: 'bg-blue-600 text-white',
        borderClass: 'border-blue-200',
        bgClass: 'bg-blue-50/30',
        deltaText: getDeltaText(speedRow),
      },
      powerRow && {
        id: 'power',
        category: 'Patlayıcı Güç',
        title: 'Dikey Sıçrama & Güç',
        subTitle: powerRow.name,
        row: powerRow,
        targetScore: Math.min(96, Math.max((powerRow.percentile || 75) + 7, getPeerMetricAvg(powerRow) + 8, 85)),
        groupScore: getPeerMetricAvg(powerRow),
        badgeClass: 'bg-indigo-600 text-white',
        borderClass: 'border-indigo-200',
        bgClass: 'bg-indigo-50/30',
        deltaText: getDeltaText(powerRow),
      },
      agilityRow && {
        id: 'agility',
        category: 'Yön Değiştirme',
        title: 'Çeviklik & Koordinasyon',
        subTitle: agilityRow.name,
        row: agilityRow,
        targetScore: Math.min(96, Math.max((agilityRow.percentile || 75) + 7, getPeerMetricAvg(agilityRow) + 8, 85)),
        groupScore: getPeerMetricAvg(agilityRow),
        badgeClass: 'bg-emerald-600 text-white',
        borderClass: 'border-emerald-200',
        bgClass: 'bg-emerald-50/30',
        deltaText: getDeltaText(agilityRow),
      },
      fourthRow && {
        id: 'fourth',
        category: fourthRow.name.toLowerCase().includes('pençe') ? 'İzometrik Kuvvet' : 'Biyomotorik Kapasite',
        title: fourthRow.name.toLowerCase().includes('pençe') ? 'El Pençe Kuvveti' : fourthRow.name,
        subTitle: fourthRow.name,
        row: fourthRow,
        targetScore: Math.min(96, Math.max((fourthRow.percentile || 75) + 7, getPeerMetricAvg(fourthRow) + 8, 85)),
        groupScore: getPeerMetricAvg(fourthRow),
        badgeClass: 'bg-slate-700 text-white',
        borderClass: 'border-slate-300',
        bgClass: 'bg-slate-50',
        deltaText: getDeltaText(fourthRow),
      },
    ].filter((x): x is NonNullable<typeof x> => Boolean(x));

    return (
      <div
        id="sportsfly-lab-page-3"
        className={`a4-print-page relative overflow-hidden min-h-[1460px] flex flex-col justify-between rounded-xl p-8 sm:p-12 shadow-xs print:shadow-none font-sans ${activeTemplate.pageFrameClass}`}
      >
        <div className="space-y-4 font-sans">
          {renderPageHeader(
            3,
            '3. Kritik Performans & Gelişim Analizi',
            'En Kritik Biyomotorik Parametreler, Mevcut Değer vs Hedef vs Akran Grubu Karşılaştırması'
          )}

          {/* 1. SECTION: EN KRİTİK 4 PERFORMANS VERİSİ (TEMİZ, FERAH, EMOJİSİZ, DAKTİLOSUZ KARTLAR) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                  Kritik Performans Odakları
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  En yüksek biyomotorik korelasyona sahip 4 temel test parametresi
                </span>
              </div>
              <span className="text-xs text-slate-700 font-semibold hidden sm:inline-block">
                Ölçüm Tarihi: {currentReport.date3 !== '—' && currentReport.date3 ? currentReport.date3 : currentReport.date1}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {criticalMetrics.map((item) => {
                const activeVal = item.row ? (item.row.m3 > 0 ? item.row.m3 : (item.row.m2 > 0 ? item.row.m2 : item.row.m1)) : null;
                const currentPercentile = Math.max(35, Math.min(96, item.row?.percentile || 78));
                const isAheadOfGroup = currentPercentile >= item.groupScore;
                const progressToTarget = Math.min(100, Math.round((currentPercentile / item.targetScore) * 100));

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border ${item.borderClass} ${item.bgClass} bg-white shadow-2xs space-y-2.5 transition-all`}
                  >
                    {/* Card Category & Title */}
                    <div className="flex items-center justify-between gap-1.5 border-b border-slate-200/80 pb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${item.badgeClass}`}>
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                        {item.subTitle}
                      </span>
                    </div>

                    {/* Main Current Value */}
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">Mevcut Ölçüm Sonucu</div>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="text-xl font-black text-slate-900 tabular-nums">
                          {activeVal !== null ? activeVal : '—'} <span className="text-[10px] font-semibold text-slate-500">{item.row?.unit}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10.5px] font-extrabold tabular-nums">
                          %{currentPercentile}
                        </span>
                      </div>
                    </div>

                    {/* Target & Group Average Reference Values */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 text-xs">
                      <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                        <span className="text-[9px] text-blue-700 font-bold block uppercase">Hedef</span>
                        <span className="text-[11px] font-extrabold text-blue-900 tabular-nums">
                          %{item.targetScore}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Grup Ort.</span>
                        <span className="text-[11px] font-extrabold text-slate-700 tabular-nums">
                          %{item.groupScore}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Status Pill */}
                    <div className="pt-0.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Hedefe Ulaşım</span>
                        <span className="text-slate-800 font-bold tabular-nums">%{progressToTarget}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progressToTarget >= 95 ? 'bg-emerald-500' : progressToTarget >= 80 ? 'bg-blue-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, progressToTarget)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9.5px] pt-0.5">
                        <span className={`font-semibold ${isAheadOfGroup ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {isAheadOfGroup ? 'Grup Ortalamasının Üzerinde' : 'Grup Normuna Yakın'}
                        </span>
                        <span className="text-emerald-700 font-bold tabular-nums">
                          {item.deltaText}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. SECTION: BİRLEŞİK GELİŞİM VE KARŞILAŞTIRMA GRAFİĞİ BİLEŞENİ (SABİT KURUMSAL GÖRÜNÜM) */}
          <AthleteDevelopmentComparisonChart
            report={currentReport}
            allReports={reports}
            height={320}
            onToast={notify}
            defaultChartType="bar"
            initialFilterMode="critical"
          />

          {/* 3. SECTION: DÖNEMSEL İLERLEME, BAŞARI SKALASI VE YÖNETİCİ ÖZETİ */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 font-sans">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider">
                  Genel Performans Skalası (%{athleticScore})
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {groupAthleteCount} Sporcu Arasında {groupRank}. Sırada (Grup Ortalaması: %{groupAvgScore} · Fark: {athleticScore - groupAvgScore >= 0 ? `+${athleticScore - groupAvgScore}` : athleticScore - groupAvgScore} Puan)
                </span>
              </div>
              {(() => {
                const p1BaseScore = currentReport.scoreHistory?.p1Score && currentReport.scoreHistory.p1Score > 0
                  ? currentReport.scoreHistory.p1Score
                  : Math.max(45, athleticScore - 4);
                const totalDelta = Math.max(2, athleticScore - p1BaseScore);
                return (
                  <span className="text-xs text-emerald-800 font-bold tabular-nums">
                    Toplam Gelişim: +{totalDelta} Puan
                  </span>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-4 items-center">
              {/* Left: 0-100 Progress Scale */}
              <div className="lg:col-span-7 print:col-span-7 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                    0–100 Biyomotorik Yetenek İndeksi
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 tabular-nums">
                    %{athleticScore} Başarı Düzeyi
                  </span>
                </div>
                <div className="relative w-full h-3 rounded-full bg-slate-200 overflow-hidden flex">
                  <div className="w-[30%] bg-slate-400 h-full" title="Düşük (0-30)" />
                  <div className="w-[40%] bg-slate-300 h-full" title="Ortalama (30-70)" />
                  <div className="w-[30%] bg-emerald-600 h-full" title="Yüksek Performans (70-100)" />
                  <div
                    className="absolute top-0 bottom-0 w-2.5 bg-slate-950 rounded-full border-2 border-white shadow-sm"
                    style={{ left: `calc(${Math.min(98, Math.max(2, athleticScore))}% - 5px)` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                  <span>Temel Gelişim (0–30)</span>
                  <span>Grup Normu (30–70)</span>
                  <span className="text-emerald-700 font-bold">İleri Düzey Atletik Kapasite (70–100)</span>
                </div>
              </div>

              {/* Right: Test Cycle Progression Badges */}
              <div className="lg:col-span-5 print:col-span-5 flex items-center justify-end gap-3">
                {(() => {
                  const s1 =
                    currentReport.scoreHistory?.p1Score && currentReport.scoreHistory.p1Score > 0
                      ? currentReport.scoreHistory.p1Score
                      : Math.max(45, athleticScore - 4);
                  const s2 =
                    currentReport.scoreHistory?.p2Score && currentReport.scoreHistory.p2Score > s1
                      ? currentReport.scoreHistory.p2Score
                      : Math.min(95, s1 + 4);
                  const s3 =
                    currentReport.scoreHistory?.p3Score && currentReport.scoreHistory.p3Score > 0
                      ? Math.max(s2, currentReport.scoreHistory.p3Score)
                      : s2;
                  return [
                    { label: 'I. Test', date: currentReport.scoreHistory?.p1Date || currentReport.date1, score: s1, ringClass: 'border-slate-300 bg-slate-50 text-slate-700' },
                    { label: 'II. Test (Tahmini)', date: currentReport.scoreHistory?.p2Date || currentReport.date2 || '2–4 Ay Arası (Tahmini)', score: s2, ringClass: 'border-blue-300 bg-blue-50 text-blue-800' },
                    ...(currentReport.date3 !== '—' && currentReport.date3 !== '' ? [{ label: 'III. Test (Son)', date: currentReport.scoreHistory?.p3Date || currentReport.date3, score: s3, ringClass: 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200' }] : []),
                  ];
                })().map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl border ${item.ringClass} flex flex-col items-center justify-center font-sans shrink-0`}>
                      <span className="text-xs font-extrabold tabular-nums">%{item.score}</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-800">{item.label}</div>
                      <div className="text-[9px] text-slate-500 font-medium tabular-nums">{item.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* Executive Evaluator Guidance Note */}
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                <span className="font-bold text-slate-900">Antrenör & Laboratuvar Notu:</span> Sporcumuz, incelenen kritik biyomotorik parametrelerde dönem boyunca istikrarlı bir ilerleme göstermiş ve genel performans düzeyini akran grubu ortalamasının üzerine taşımıştır.
              </p>
            </div>
          </div>
        </div>

        {renderPageFooter(3)}
      </div>
    );
  };

  // ============================================================================
  // PAGE 4 / 5: VELİ, SPORCU VE ANTRENÖR / KULÜP İÇİN KAPSAMLI GELİŞİM REHBERİ
  // ============================================================================
  const renderPage5 = () => {
    const rawAreas = activeAiAnalysis?.improvementAreas || [];
    const motorList = getDisplayedMotorPerformance(currentReport);

    const findMatchingMotorRow = (metricName: string) => {
      const lower = (metricName || '').toLowerCase();
      return motorList.find(
        (m) =>
          m.name.toLowerCase() === lower ||
          m.name.toLowerCase().includes(lower) ||
          lower.includes(m.name.toLowerCase()) ||
          (lower.includes('flamingo') && (m.id === 'balance' || m.name.toLowerCase().includes('denge'))) ||
          (lower.includes('denge') && m.id === 'balance')
      );
    };

    const resolveAreaValues = (
      rawItem: (typeof rawAreas)[number] | undefined,
      matchedRow: (typeof motorList)[number]
    ) => {
      const safeM1 = matchedRow.m1 > 0 ? matchedRow.m1 : 0;
      const safeM2 =
        matchedRow.m2 > 0
          ? matchedRow.lowerIsBetter
            ? safeM1 > 0 ? Math.min(safeM1, matchedRow.m2) : matchedRow.m2
            : safeM1 > 0 ? Math.max(safeM1, matchedRow.m2) : matchedRow.m2
          : safeM1 > 0
          ? matchedRow.lowerIsBetter
            ? +(safeM1 * 0.96).toFixed(2)
            : +(safeM1 * 1.05).toFixed(1)
          : 0;
      const activeVal = matchedRow.m3 > 0 ? matchedRow.m3 : safeM1;
      const tgtVal = matchedRow.lowerIsBetter
        ? +(Math.min(matchedRow.refMid, safeM2 > 0 ? safeM2 * 0.96 : matchedRow.refMid)).toFixed(2)
        : +(Math.max(matchedRow.refMid, safeM2 > 0 ? safeM2 * 1.05 : matchedRow.refMid)).toFixed(1);

      return {
        metricName: matchedRow.name,
        currentValue: `${activeVal} ${matchedRow.unit}`,
        estimated2ndValue: `${safeM2} ${matchedRow.unit}`,
        targetValue: `${tgtVal} ${matchedRow.unit}`,
        percentile: Math.max(35, Math.min(96, matchedRow.percentile || 65)),
        drillRecommendation:
          rawItem?.drillRecommendation ||
          `${matchedRow.name} odaklı spesifik koordinasyon, kuvvet ve nöromüsküler gelişim drilleri`,
        weeklyFrequency: rawItem?.weeklyFrequency || 'Haftada 2-3 Gün · 3 Set',
      };
    };

    // Yalnızca Excel'de / raporda ölçülmüş olan motor testlerden en fazla 4 kart oluştur (ölçülmeyen kategorileri ekleme)
    const areas: ReturnType<typeof resolveAreaValues>[] = [];
    const seenIds = new Set<string>();
    rawAreas.forEach((raw) => {
      if (areas.length >= 4) return;
      const matched = findMatchingMotorRow(raw.metricName);
      if (matched && !seenIds.has(matched.id)) {
        seenIds.add(matched.id);
        areas.push(resolveAreaValues(raw, matched));
      }
    });
    if (areas.length < 4) {
      [...motorList]
        .sort((a, b) => (a.percentile || 0) - (b.percentile || 0))
        .forEach((m) => {
          if (areas.length >= 4 || seenIds.has(m.id)) return;
          seenIds.add(m.id);
          areas.push(resolveAreaValues(undefined, m));
        });
    }

    const finalComment =
      !currentReport.expertComment || isStaleExpertComment(currentReport.expertComment)
        ? generateAthleteInterpretiveExpertComment(currentReport)
        : currentReport.expertComment;

    return (
      <div
        id="sportsfly-lab-page-5"
        className={`a4-print-page relative overflow-hidden min-h-[1460px] flex flex-col justify-between rounded-xl p-8 sm:p-12 shadow-xs print:shadow-none font-sans ${activeTemplate.pageFrameClass}`}
      >
        <div>
          {renderPageHeader(
            4,
            'Yapay Zeka Tabanlı Performans Önerileri & Gelişim Rehberi',
            'Otomatik Metrik & SD Sapma Analizi ile Sporcuya Özel Antrenman ve Gelişim Tavsiyeleri'
          )}
          <div className="space-y-6 font-sans relative z-10">

          {/* Quick Inline Controls for Training Plan Recommendation Toggle & Measurement Dates (Hidden in Print/PDF) */}
          <div className="print:hidden flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleToggleTrainingPlanFrequency();
                  notify(
                    !showTrainingPlanFrequency
                      ? 'Antrenman planı sıklık tavsiyesi (Haftalık Gün / Set) karneye eklendi.'
                      : 'Antrenman planı sıklık tavsiyesi (Haftalık Gün / Set) karneden gizlendi.'
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-2 border transition-all cursor-pointer ${
                  showTrainingPlanFrequency
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {showTrainingPlanFrequency ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span>Antrenman Planı Tavsiyesi (Sıklık / Set) Ekle</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleToggleTrainingPlanCards();
                  notify(
                    !showTrainingPlanCards
                      ? 'Antrenman ve gelişim tavsiye kartları karneye eklendi.'
                      : 'Antrenman ve gelişim tavsiye kartları karneden gizlendi.'
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  showTrainingPlanCards
                    ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {showTrainingPlanCards ? (
                  <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span>Antrenman Tavsiye Kartlarını Göster</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>1. Ölçüm:</span>
              </span>
              <input
                type="text"
                value={parseDateString(currentReport.date1)}
                onChange={(e) => handleUpdateMeasurementDates({ date1: e.target.value }, true)}
                placeholder="GG.AA.YYYY"
                className="w-28 px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="font-bold text-slate-600">2. Ölçüm (Tahmini):</span>
              <div className="px-2.5 py-1 rounded-lg border border-slate-300 bg-sky-50 text-xs font-black text-sky-800 flex items-center gap-1">
                <span>2-4 Ay Arası (Tahmini)</span>
              </div>
              <span className="font-bold text-slate-600">Branş:</span>
              <input
                type="text"
                value={currentReport.sportBranch}
                onChange={(e) => handleUpdateMeasurementDates({ sportBranch: e.target.value }, true)}
                placeholder="Örn: Voleybol"
                className="w-36 px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* 4 Minimal Improvement Areas Cards Side-by-Side (Including Flamingo Balance Test) */}
          {showTrainingPlanCards && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-2.5">
              {areas.map((item, idx) => {
                const isFlamingo = item.metricName.toLowerCase().includes('flamingo') || item.metricName.toLowerCase().includes('denge');
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border ${
                      isFlamingo ? 'border-indigo-200 bg-indigo-50/25' : 'border-slate-200/90 bg-white'
                    } p-3 shadow-2xs flex flex-col justify-between transition-all`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1">
                        <h3 className="font-extrabold text-slate-800 text-[10.5px] tracking-tight truncate">
                          {item.metricName}
                        </h3>
                        <span
                          className={`text-[8.5px] font-black px-1.5 py-0.5 rounded border shrink-0 ${
                            isFlamingo
                              ? 'text-indigo-950 bg-indigo-100 border-indigo-300'
                              : 'text-slate-900 bg-amber-100 border-amber-300'
                          }`}
                        >
                          {isFlamingo ? 'Denge & Kontrol' : 'Gelişim Takibi'}
                        </span>
                      </div>

                      <div className="text-[9.5px] font-sans font-bold text-slate-700 flex flex-wrap items-center justify-between gap-1 bg-slate-50/90 px-2 py-1 rounded-lg border border-slate-100">
                        <span>
                          I: <strong className="text-slate-900">{item.currentValue}</strong> · II:{' '}
                          <strong className="text-blue-800">{item.estimated2ndValue}</strong>
                        </span>
                        <span className="text-emerald-700 font-black">
                          Hedef: {item.targetValue}{' '}
                          <span className="text-slate-500 font-semibold">(%{item.percentile})</span>
                        </span>
                      </div>

                      <p className="text-[9.5px] leading-snug text-slate-600 font-normal line-clamp-2">
                        {item.drillRecommendation}
                      </p>
                    </div>

                    {showTrainingPlanFrequency && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[9px] font-semibold text-slate-600 flex items-center gap-1 truncate">
                        <span className="text-slate-400 uppercase font-bold text-[8.5px]">Sıklık:</span>
                        <span className="truncate">{item.weeklyFrequency}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Branş Referans Puanı (Sade, Açık Renk, Profesyonel Tasarım) */}
          {(() => {
            const branchRefData = calculateBranchReferenceScore(currentReport);
            return (
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 sm:p-5 shadow-2xs space-y-3 font-sans">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 pb-3">
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-slate-500 block mb-0.5">
                      BİLİMSEL BRANŞ UYUMU &amp; PERFORMANS KATSAYISI
                    </span>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">
                      {branchRefData.branchTitle}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
                        %{branchRefData.scorePercentage}
                      </div>
                      <div className="text-[10px] font-bold text-sky-800 mt-1 uppercase tracking-wider bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200/80 inline-block shadow-2xs">
                        {branchRefData.statusLabel}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-breakdown progress bars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {branchRefData.breakdown.map((item, bIdx) => (
                    <div key={bIdx} className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
                      <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-700 mb-1">
                        <span>{item.label}</span>
                        <span className="text-sky-700 font-extrabold">%{item.percent}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-sky-600 h-1.5 rounded-full"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Uzman Görüşü */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/25 p-4 shadow-3xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Uzman Görüşü
            </h3>
            <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-3xs text-[11px] sm:text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap min-h-[120px]">
              {finalComment}
            </div>
          </div>

          {/* Footer Methodology Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3.5 border-t border-slate-150 text-[10.5px] leading-relaxed text-slate-500 font-normal">
            <div className="space-y-1">
              <span className="font-extrabold text-slate-700 uppercase tracking-wide block">
                Bilimsel Metodoloji:
              </span>
              <p>
                Sportif performansın bileşenlerinin ölçümlendiği 10 test protokolü; sürat, kuvvet, denge, esneklik, reaksiyon sürati, 10x5m çabukluk, durarak uzun atlama ve PACER (dayanıklılık) bataryalarından oluşturulmuştur.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-extrabold text-slate-700 uppercase tracking-wide block">
                İpsatif Gelişim Yaklaşımı:
              </span>
              <p>
                İpsatif değerlendirme sporcu merkezlidir; gelişim için önceki performansların aşılmasını odaklanır.{' '}
                <span className="text-emerald-600 font-black">
                  Farkındalık, gelişimi yönetmek için ilk adımdır.
                </span>
              </p>
            </div>
          </div>

          {/* Corporate Rota Performans Text */}
          <div className="pt-3 border-t border-slate-200/60 text-[9.5px] sm:text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-semibold italic text-center flex flex-wrap items-center justify-center gap-1.5">
            <span>Bu karnedeki teknik analizler ve ölçümler</span>
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs not-italic uppercase tracking-wider">
              ROTA PERFORMANS
            </span>
            <span>tarafından gelişim takibi amacıyla hassasiyetle yapılmıştır; kesinlikle tıbbi tanı, teşhis, tedavi veya bir hekim raporu niteliği taşımamaktadır.</span>
          </div>
          </div>
        </div>

        {renderPageFooter(4)}
      </div>
    );
  };
  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {localToast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{localToast}</span>
        </div>
      )}

      {/* Hidden File Input for Excel Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg"
        onChange={handleExcelUpload}
        className="hidden"
      />

      {/* Hidden File Input for Batch Excel Upload */}
      <input
        ref={batchFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg"
        onChange={handleBatchExcelInputChange}
        className="hidden"
      />

      {/* Hidden File Input for Sport School Logo Upload */}
      <input
        ref={schoolLogoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        onChange={handleSchoolLogoUpload}
        className="hidden"
      />

      {/* Top Studio Control Bar (Clean, Grouped & Uncluttered - Sticky & Pinned) */}
      <div
        ref={headerMenuContainerRef}
        className={`bg-white/95 dark:bg-[#111c2e]/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm print:hidden relative transition-all ${
          openHeaderMenu ? 'z-[9990]' : 'z-20'
        }`}
      >
        {/* Click-away backdrop overlay to close any open dropdown smoothly */}
        {openHeaderMenu && (
          <div
            className="fixed inset-0 z-[9990] bg-black/5 dark:bg-black/20 cursor-default"
            onClick={() => setOpenHeaderMenu(null)}
          />
        )}

        {/* ROW 1: Brand Title + Primary Workspace Mode Tabs + Grouped PDF/Print Menu */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: Brand & Active School Summary (Dynamic: Integration Company Identity vs SportsFly LAB Default) */}
          {isIntegrationEntry && activeCompanyProfile ? (
            <div className="flex items-center gap-3 min-w-0">
              <div
                onClick={() => setActiveLabTab(activeLabTab === 'company-profile' ? 'studio' : 'company-profile')}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 p-1 shadow-xs cursor-pointer hover:border-indigo-400 transition-colors overflow-hidden group"
                title="Firma Profilini Görüntüle / Kapat"
              >
                {effectiveAnalysisFirmLogo ? (
                  <img
                    src={effectiveAnalysisFirmLogo}
                    alt={activeCompanyProfile.companyName}
                    className="w-full h-full object-contain"
                  />
                ) : activeCompanyProfile.companyType === 'spor_kulubu' ? (
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug truncate">
                    {activeCompanyProfile.companyName}
                  </h1>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                      activeCompanyProfile.companyType === 'spor_kulubu'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : activeCompanyProfile.companyType === 'spor_okulu'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    }`}
                  >
                    {activeCompanyProfile.companyType === 'spor_kulubu'
                      ? 'Spor Kulübü'
                      : activeCompanyProfile.companyType === 'spor_okulu'
                      ? 'Spor Okulu'
                      : 'Analiz Firması'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Doğrulanmış Entegrasyon
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">·</span>
                  <span className="text-slate-500 dark:text-slate-400 hidden sm:inline font-medium">
                    SportsFly LAB Performans Altyapısı
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <SportsFlyVectorMark className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug truncate">
                  SportsFly Lab — Atletik Performans &amp; Beden Kompozisyonu Karnesi
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px] sm:max-w-xs">
                    {effectiveClubName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[140px] sm:max-w-[160px]">{effectiveBranchName}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setShowBrandingSettings((prev) => !prev)}
                    className="text-sky-600 dark:text-sky-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showBrandingSettings ? 'Okul Ayarlarını Gizle' : 'Okul & Logo Ayarları'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Right: Workspace Mode Tabs + Primary Action Buttons + Logout */}
          <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2 shrink-0">
            {/* Primary Module Section Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700 overflow-x-auto scrollbar-none max-w-full">
              <button
                type="button"
                onClick={() => {
                  const latest = getStoredLabReports();
                  setReports(latest);
                  setActiveLabTab('studio');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeLabTab === 'studio'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Karne Görünümü</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLabTab('batch')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeLabTab === 'batch'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Excel'den toplu sporcu verisi yükleyerek toplu karne ve toplu PDF oluşturun"
              >
                <Users className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span>Toplu Karne</span>
                <span className="text-[11px] font-sans tabular-nums text-slate-500 dark:text-slate-400">
                  ({batchReports.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLabTab('dosya-havuzu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeLabTab === 'dosya-havuzu'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Spor okullarından gelen Excel dosyalarını havuzda toplayın, onaylayın ve karne oluşturun"
              >
                <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Dosya Havuzu</span>
              </button>

              {/* Arşiv Sekmesi (Yalnızca Süper Admin veya kayıtlı arşiv raporları varsa) */}
              {(isSuperAdmin || (!isIntegrationEntry && archivedReports.length > 0)) && (
                <button
                  type="button"
                  onClick={() => setActiveLabTab('archive')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeLabTab === 'archive'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="İsimlendirilerek kaydedilmiş tüm sporcu karnelerini görüntüleyin"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Arşiv</span>
                  <span className="text-[11px] font-sans tabular-nums text-slate-500 dark:text-slate-400">
                    ({archivedReports.length})
                  </span>
                </button>
              )}

              {/* FİRMA PROFİLİ BUTONU */}
              {activeCompanyProfile && (
                <button
                  type="button"
                  onClick={() => setActiveLabTab(activeLabTab === 'company-profile' ? 'studio' : 'company-profile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeLabTab === 'company-profile'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  }`}
                  title={activeLabTab === 'company-profile' ? 'Karnelere Geri Dön' : 'Firma & Kulüp Profilinizi İnceleyin'}
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300 shrink-0" />
                  <span>{activeLabTab === 'company-profile' ? 'Karnelere Dön' : 'Firma Profili'}</span>
                </button>
              )}
            </div>

            {/* Primary Action Buttons: PDF Preview + A4 Print + Download PDF + Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleTogglePdfPreview}
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap ${
                  isPdfPreviewMode
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400/40'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100'
                }`}
                title="Sporcu karnesini web üzerinde gerçek A4 baskı formatında inceleyin"
              >
                <Eye className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPdfPreviewMode ? 'text-white' : 'text-rose-600'} shrink-0`} />
                <span className="hidden sm:inline">{isPdfPreviewMode ? 'PDF Görünümünü Kapat' : 'PDF Olarak Görüntüle'}</span>
                <span className="sm:hidden">{isPdfPreviewMode ? 'PDF Kapat' : 'PDF'}</span>
                {isPdfPreviewMode && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-sans tabular-nums font-black bg-white/20 text-white hidden sm:inline">
                    Açık
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowKarneGuideModal(true)}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title="SportsFly Lab karne kılavuzu, terimler sözlüğü ve başlık açıklamaları"
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 shrink-0" />
                <span className="hidden sm:inline">Karne Kılavuzu</span>
                <span className="sm:hidden">Kılavuz</span>
              </button>


              <button
                type="button"
                onClick={handlePrintA4}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title="A4 formatında yazdırın veya tarayıcıdan PDF olarak kaydedin"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">A4 Yazdır</span>
                <span className="sm:hidden">Yazdır</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenJpegModal()}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title="Karne sayfalarını tek tek seçerek veya tümünü birden yüksek çözünürlüklü JPEG olarak indirin"
              >
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-200 shrink-0" />
                <span className="hidden sm:inline">JPEG İndir</span>
                <span className="sm:hidden">JPEG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shadow-xs"
                title="5 sayfalık sporcu karnesinin tamamını yüksek çözünürlüklü A4 PDF olarak indirin"
              >
                {isGeneratingPDF ? (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin shrink-0" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 dark:text-white shrink-0" />
                )}
                <span>
                  {isGeneratingPDF
                    ? `İndiriliyor (${pdfProgressPage || 1}/5)...`
                    : (
                      <>
                        <span className="hidden sm:inline">Tüm Karneyi İndir</span>
                        <span className="sm:hidden">İndir</span>
                      </>
                    )}
                </span>
              </button>

              {/* Entegrasyon Oturumundan Çıkış Yap Butonu (SportsFly Lab Başlığına Entegre) */}
              {isIntegrationEntry && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs border border-red-200/60 dark:border-red-900/40"
                  title="Entegrasyon Oturumunu Kapat"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Çıkış Yap</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ROW 2: Athlete Selector + Action Dropdowns */}
        <div className="mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-2xs">
          {/* Left: Active Athlete Selector + Action Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Athlete Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 min-w-0 max-w-full">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Sporcu:
              </span>
              <select
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="min-w-0 max-w-[150px] xs:max-w-[190px] sm:max-w-[260px] bg-transparent text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none truncate cursor-pointer"
              >
                {reports.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.athleteName} — {rep.ageYears} Yaş ({rep.branchName})
                  </option>
                ))}
              </select>
            </div>

            {/* DROPDOWN 1: Excel & Veri İşlemleri */}
            <div className={`relative ${openHeaderMenu === 'excel' ? 'z-[9995]' : ''}`}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenHeaderMenu((prev) => (prev === 'excel' ? null : 'excel'))
                  }
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    openHeaderMenu === 'excel'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline">Excel &amp; Veri İşlemleri</span>
                  <span className="sm:hidden">Excel</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {openHeaderMenu === 'excel' && (
                  <div className="absolute left-0 top-full mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 z-[9999] space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Excel Yükleme &amp; Şablon İşlemleri
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div>Excel Verisi Yükle (.xlsx / .csv)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Mevcut karne içeriğine uygun parametre veya çoklu sporcu dosyası yükle
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <div>Ekran Görüntüsü Yükle (PNG / JPEG)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Excel tablosu ekran görüntüsünü yapay zeka ile tara ve aktar
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        setActiveLabTab('batch');
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-violet-600 shrink-0" />
                      <div>
                        <div>Toplu Karne Oluşturma Alanı</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Çoklu sporcu tablosu, sütun eşleştirme ve toplu PDF üretimi
                        </div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        downloadSportsFlyLabExcelTemplate(currentReport);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <div>Örnek Excel Şablonu İndir (.xlsx)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Mevcut karne parametreleri + Toplu sporcu listesi (3 Sayfa)
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        downloadBatchSportsFlyLabExcelTemplate(currentReport);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div>Toplu Sporcu Excel Şablonu İndir (.xlsx)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Her satırda 1 sporcunun tüm karne verileri (Çoklu liste)
                        </div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        setActiveLabTab('batch');
                        handleLoadSampleBatchData();
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-violet-600 shrink-0" />
                      <div>
                        <div>Örnek Sporcu Veri Seti Yükle (6 Sporcu)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Farklı branşlardan hazır karne verileri ile hemen test et
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

            {/* DROPDOWN 2: Karne İşlemleri (Yeni Karne, Düzenle, Arşive Kaydet) */}
            <div className={`relative ${openHeaderMenu === 'karne' ? 'z-[9995]' : ''}`}>
              <button
                type="button"
                onClick={() =>
                  setOpenHeaderMenu((prev) => (prev === 'karne' ? null : 'karne'))
                }
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  openHeaderMenu === 'karne'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200'
                    : 'border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Karne İşlemleri</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {openHeaderMenu === 'karne' && (
                <div className="absolute left-0 top-full mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 z-[9999] space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sporcu &amp; Karne Yönetimi
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenHeaderMenu(null);
                      setShowNewReportModal(true);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <div>Yeni Karne Oluştur</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        Yeni sporcu profili ve karne ekle
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenHeaderMenu(null);
                      setShowEditModal(true);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div>Verileri Düzenle</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        Aktif sporcunun ölçümlerini güncelle
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenHeaderMenu(null);
                      handleOpenSaveArchiveModal(currentReport);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <BookmarkPlus className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div>Arşive İsimle Kaydet</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        Karne Arşivi&apos;ne dönem adıyla sakla
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* DROPDOWN 3: Karne Tasarım Şablonu Seçici */}
            <div className={`relative ${openHeaderMenu === 'templates' ? 'z-[9995]' : ''}`}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenHeaderMenu((prev) => (prev === 'templates' ? null : 'templates'))
                  }
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    openHeaderMenu === 'templates'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">PDF Şablonu: {activeTemplate.name}</span>
                  <span className="sm:hidden">Şablon</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {openHeaderMenu === 'templates' && (
                  <div className="absolute left-0 top-full mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 z-[9999] space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      3 Profesyonel PDF Karne Şablonu (Tam A4)
                    </div>
                    {KARNE_TEMPLATES.map((tpl) => {
                      const isSelected = tpl.id === karneTemplate;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            handleSelectKarneTemplate(tpl.id);
                            setOpenHeaderMenu(null);
                            notify(`Karne PDF şablonu "${tpl.name}" olarak güncellendi.`);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs font-bold flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-slate-800'
                              : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{tpl.shortName}</span>
                            </div>
                            <div
                              className={`text-[10px] font-normal mt-0.5 ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {tpl.subtitle}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}

                    <div className="pt-1.5 mt-1 border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Anatomik Vücut Haritası (B)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBodyMapInfographic((prev) => !prev);
                          notify(
                            !showBodyMapInfographic
                              ? 'Sayfa 1 Anatomik Vücut Haritası İnfografiği aktif edildi.'
                              : 'Anatomik Vücut Haritası gizlendi.'
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-sans tabular-nums font-bold cursor-pointer ${
                          showBodyMapInfographic
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {showBodyMapInfographic ? 'AÇIK' : 'KAPALI'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            {/* DROPDOWN 3.5 (C): Dinamik Kulüp Renk Paleti Seçici */}
            <div className={`relative ${openHeaderMenu === 'clubColors' ? 'z-[9995]' : ''}`}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenHeaderMenu((prev) => (prev === 'clubColors' ? null : 'clubColors'))
                  }
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    openHeaderMenu === 'clubColors'
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="flex items-center -space-x-1 shrink-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs inline-block"
                      style={{ backgroundColor: effectivePrimaryHex }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs inline-block"
                      style={{ backgroundColor: effectiveSecondaryHex }}
                    />
                  </span>
                  <span className="hidden sm:inline">Kulüp Rengi: {activePaletteObj.shortName}</span>
                  <span className="sm:hidden">Renk</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {openHeaderMenu === 'clubColors' && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-2 z-[9999] space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Dinamik Kulüp Renk Paleti (C)
                    </div>
                    {CLUB_COLOR_PALETTES.map((pal) => {
                      const isSelected = pal.id === clubColorPalette;
                      const pHex =
                        pal.id === 'custom'
                          ? customPrimaryHex
                          : pal.id === 'template-default'
                            ? activeTemplate.defaultPrimaryHex
                            : pal.primaryHex;
                      const sHex =
                        pal.id === 'custom'
                          ? customSecondaryHex
                          : pal.id === 'template-default'
                            ? activeTemplate.defaultSecondaryHex
                            : pal.secondaryHex;

                      return (
                        <button
                          key={pal.id}
                          type="button"
                          onClick={() => {
                            handleSelectClubColorPalette(pal.id);
                            if (pal.id !== 'custom') {
                              setOpenHeaderMenu(null);
                            }
                            notify(`Kulüp renk teması "${pal.name}" olarak uygulandı.`);
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-slate-800'
                              : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center -space-x-1 shrink-0">
                              <span
                                className="w-4 h-4 rounded-full border border-white shadow-2xs inline-block"
                                style={{ backgroundColor: pHex }}
                              />
                              <span
                                className="w-4 h-4 rounded-full border border-white shadow-2xs inline-block"
                                style={{ backgroundColor: sHex }}
                              />
                            </span>
                            <span>{pal.name}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}

                    {clubColorPalette === 'custom' && (
                      <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Ana Kulüp Rengi
                          </label>
                          <input
                            type="color"
                            value={customPrimaryHex}
                            onChange={(e) => {
                              setCustomPrimaryHex(e.target.value);
                              try {
                                localStorage.setItem('sportsfly_lab_custom_primary_hex', e.target.value);
                              } catch {
                                // ignore
                              }
                            }}
                            className="w-full h-8 rounded cursor-pointer border border-slate-300"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Vurgu Rengi
                          </label>
                          <input
                            type="color"
                            value={customSecondaryHex}
                            onChange={(e) => {
                              setCustomSecondaryHex(e.target.value);
                              try {
                                localStorage.setItem('sportsfly_lab_custom_secondary_hex', e.target.value);
                              } catch {
                                // ignore
                              }
                            }}
                            className="w-full h-8 rounded cursor-pointer border border-slate-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            {/* DROPDOWN 4: Görünüm, Analiz & Ayarlar (Her zaman net açılır, ekrandan taşmaz) */}
            <div className={`relative ${openHeaderMenu === 'panels' ? 'z-[9995]' : ''}`}>
              <button
                type="button"
                onClick={() =>
                  setOpenHeaderMenu((prev) => (prev === 'panels' ? null : 'panels'))
                }
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  openHeaderMenu === 'panels' || showBrandingSettings
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Analiz &amp; Ayarlar</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {openHeaderMenu === 'panels' && (
                <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 z-[9999] space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Gelişmiş Analiz &amp; Paneller
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenHeaderMenu(null);
                      setShowBrandingSettings((prev) => !prev);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <div>Okul Adı, Logo &amp; Şablon Ayarları</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Kulüp başlığı, logo ve 4 karne tasarım şablonu
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-sans tabular-nums text-slate-500">
                      {showBrandingSettings ? 'Açık' : 'Kapalı'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenHeaderMenu(null);
                      setActiveLabTab('studio');
                      setShowChartsPanel((prev) => !prev);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div>Performans Grafikleri</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          D3 Radar &amp; Gelişim Çizgi Grafikleri
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-sans tabular-nums font-bold ${
                        showChartsPanel ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {showChartsPanel ? 'Açık' : 'Kapalı'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenHeaderMenu(null);
                      setActiveLabTab('studio');
                      setShowAiPanel((prev) => !prev);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div>Performans Önerileri (AI)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Yapay zeka gelişim ve antrenman analizi
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-sans tabular-nums font-bold ${
                        showAiPanel ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    >
                      {showAiPanel ? 'Açık' : 'Kapalı'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Clean Single-Line Page Switcher (without duplicate mode tabs) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl overflow-x-auto scrollbar-none max-w-full">
            <button
              type="button"
              onClick={() => {
                setActiveLabTab('studio');
                setViewMode('all');
              }}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeLabTab === 'studio' && viewMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{totalReportPages} Sayfa Tam Görünüm</span>
              <span className="sm:hidden">Tam Görünüm</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveLabTab('studio');
                setViewMode('single');
                setActivePage(1);
              }}
              title="Endomorfi, Mezomorfi, Ektomorfi Somatotip Değişim Tablosuna Git"
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                activeLabTab === 'studio' && viewMode === 'single' && activePage === 1
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="hidden sm:inline">Somatotip Değişim Tablosu</span>
              <span className="sm:hidden">Somatotip</span>
            </button>
            {showBodyMapInfographic && (
              <button
                type="button"
                onClick={() => {
                  setActiveLabTab('studio');
                  setViewMode('single');
                  setActivePage(0);
                }}
                title="Tam Sayfa Anatomik Vücut Haritası & Bölgesel Antropometri İnfografiği"
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeLabTab === 'studio' && viewMode === 'single' && activePage === 0
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                1. Vücut Haritası
              </button>
            )}
            {PAGE_TITLES.map((p) => (
              <button
                key={p.page}
                type="button"
                onClick={() => {
                  setActiveLabTab('studio');
                  setViewMode('single');
                  setActivePage(p.page);
                }}
                title={p.full}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeLabTab === 'studio' && viewMode === 'single' && activePage === p.page
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {showBodyMapInfographic
                  ? `${p.page + 1}. ${p.short.replace(/^\d+\.\s*/, '')}`
                  : p.short}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowMeasurementDatesBar((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
                showMeasurementDatesBar
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                  : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100'
              }`}
              title="Ölçüm tarihlerini manuel düzenle ve antrenman planı tavsiyesini aç/kapat"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Ölçüm Tarihleri &amp; Plan Tavsiyesi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                let targetId: string | undefined;
                if (viewMode === 'single') {
                  if (activePage === 0 && showBodyMapInfographic) targetId = 'sportsfly-lab-page-bodymap';
                  else if (activePage === 1) targetId = 'sportsfly-lab-page-1';
                  else if (activePage === 2) targetId = 'sportsfly-lab-page-2';
                  else if (activePage === 3) targetId = 'sportsfly-lab-page-3';
                  else if (activePage === 4) targetId = 'sportsfly-lab-page-5';
                }
                handleOpenJpegModal(targetId);
              }}
              className="ml-auto px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-800 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              title="Karne sayfalarını JPEG formatında indir (tekil sayfa veya toplu ZIP)"
            >
              <ImageIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">JPEG İndir</span>
            </button>
          </div>
        </div>

        {/* MANUEL ÖLÇÜM TARİHLERİ, SPOR BRANŞI & ANTRENMAN PLANI TAVSİYESİ ALANI */}
        {activeLabTab === 'studio' && showMeasurementDatesBar && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-sky-50/70 dark:bg-slate-800/70 rounded-xl border border-sky-200/80 dark:border-slate-700 p-3 sm:p-3.5 space-y-3">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                {/* Left: Manual Measurement Date, Sport Branch & Gender Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 flex-1">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                      1. Ölçüm Tarihi (I) — Manuel Giriş
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={parseDateString(currentReport.date1)}
                        onChange={(e) => handleUpdateMeasurementDates({ date1: e.target.value }, true)}
                        placeholder="Örn: 15.10.2026"
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const todayStr = new Date().toLocaleDateString('tr-TR');
                          handleUpdateMeasurementDates({ date1: todayStr }, true);
                          notify(`1. Ölçüm tarihi "${todayStr}" olarak tüm gruba uygulandı.`);
                        }}
                        className="px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[10px] font-bold text-slate-800 dark:text-slate-200 shrink-0 cursor-pointer"
                        title="Bugünün tarihini tüm gruba yaz"
                      >
                        Bugün
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                      2. Ölçüm Tarihi / Dönemi (II) — Manuel Giriş
                    </label>
                    <div className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-sky-50/80 dark:bg-sky-950/40 text-xs font-black text-sky-800 dark:text-sky-200 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>2-4 Ay Arası (Tahmini)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                      Sporcu Doğum Tarihi (GG.AA.YYYY)
                    </label>
                    <input
                      type="text"
                      value={parseDateString(currentReport.birthDate || '')}
                      onChange={(e) => handleUpdateMeasurementDates({ birthDate: e.target.value }, true)}
                      placeholder="Örn: 02.07.2014"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                      Spor Branşı — Manuel Giriş / Değiştir
                    </label>
                    <input
                      type="text"
                      list="sportsfly-branch-options"
                      value={currentReport.sportBranch}
                      onChange={(e) => handleUpdateMeasurementDates({ sportBranch: e.target.value }, true)}
                      placeholder="Örn: Voleybol / Çoklu Branş"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <datalist id="sportsfly-branch-options">
                      <option value="Voleybol / Çoklu Branş Gelişim" />
                      <option value="Basketbol / Atletik Gelişim" />
                      <option value="Futbol / Hız & Çeviklik" />
                      <option value="Yüzme / Kardiyovasküler" />
                      <option value="Genel Spor Gelişimi" />
                      <option value="Tenis / Reaksiyon & Koordinasyon" />
                      <option value="Jimnastik / Esneklik & Denge" />
                      <option value="Hentbol / Çeviklik & Güç" />
                      <option value="Atletizm / Sürat & Patlayıcı Güç" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                      Sporcu Cinsiyeti — Seçim / Değiştir
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Kadın', 'Erkek'] as const).map((gOption) => {
                        const isSelected = currentReport.gender === gOption;
                        return (
                          <button
                            key={gOption}
                            type="button"
                            onClick={() => {
                              handleUpdateMeasurementDates({ gender: gOption }, true);
                              notify(`Cinsiyet bilgisi "${gOption}" olarak tüm karnelere uygulandı.`);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                              isSelected
                                ? gOption === 'Kadın'
                                  ? 'bg-pink-600 border-pink-600 text-white shadow-2xs'
                                  : 'bg-sky-600 border-sky-600 text-white shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {gOption === 'Kadın' ? 'Kadın (Kız)' : 'Erkek'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Apply Dates to All Reports & Training Plan Recommendation Checkbox Toggle */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateMeasurementDates(
                        {
                          date1: parseDateString(currentReport.date1),
                          date2: parseDateString(currentReport.date2),
                          birthDate: parseDateString(currentReport.birthDate || ''),
                          sportBranch: currentReport.sportBranch,
                          gender: currentReport.gender,
                        },
                        true
                      );
                      notify('Girilen ölçüm tarihleri, branş ve cinsiyet listedeki tüm sporcu karnelerine uygulandı.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                    title="Yazılan ölçüm tarihlerini, spor branşını ve cinsiyeti listedeki tüm sporcu karnelerine uygula"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Tarih &amp; Branşı Tümüne Uygula</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleToggleTrainingPlanFrequency();
                      notify(
                        !showTrainingPlanFrequency
                          ? 'Antrenman planı tavsiyesi (Sıklık / Set) karneye eklendi.'
                          : 'Antrenman planı tavsiyesi (Sıklık / Set) karneden kaldırıldı.'
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap ${
                      showTrainingPlanFrequency
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                    title="Motor performans tablosundaki antrenman önerilerini karnede göster veya gizle"
                  >
                    {showTrainingPlanFrequency ? (
                      <CheckSquare className="w-4 h-4 text-white shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>Motor Performans Antrenman Önerileri</span>
                  </button>
                </div>
              </div>

              {/* Quick Branch Preset Badges */}
              <div className="pt-2 border-t border-sky-200/60 dark:border-slate-700/60 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mr-1">
                  Hızlı Branş Seçimi:
                </span>
                {[
                  'Voleybol',
                  'Basketbol',
                  'Futbol',
                  'Yüzme',
                  'Genel Spor Gelişimi',
                  'Tenis',
                  'Jimnastik',
                  'Atletizm',
                ].map((branch) => {
                  const isActive = currentReport.sportBranch.toLowerCase().startsWith(branch.toLowerCase());
                  return (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => {
                        handleUpdateMeasurementDates({ sportBranch: branch }, true);
                        notify(`Spor branşı "${branch}" olarak tüm gruba ve toplu karnelere uygulandı.`);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      {branch}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* COLLAPSIBLE DRAWER: Spor Okulu Adı, Logo & 4 Karne Şablonu Ayarları */}
        {showBrandingSettings && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="bg-slate-50/90 dark:bg-slate-800/50 rounded-xl border border-slate-200/90 dark:border-slate-700/80 p-3 sm:p-3.5 space-y-3.5">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
                {/* Left: School Logo Preview + Upload Controls */}
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    onClick={() => schoolLogoInputRef.current?.click()}
                    className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-sky-500 bg-white dark:bg-slate-900 p-1 flex items-center justify-center shrink-0 cursor-pointer transition-colors overflow-hidden group relative"
                    title="Spor Okulu Logosunu Yüklemek İçin Tıklayın"
                  >
                    {effectiveSchoolLogo ? (
                      <img
                        src={effectiveSchoolLogo}
                        alt={effectiveClubName}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-sky-600">
                        <ImagePlus className="w-4 h-4" />
                        <span className="text-[9px] font-bold mt-0.5">LOGO</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Karne Tasarım Ayarları — Spor Okulu Adı, Logosu &amp; Şablonu
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        · Tarayıcıda Kalıcı
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => schoolLogoInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <ImagePlus className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {effectiveSchoolLogo ? 'Logoyu Değiştir' : 'Okul Logosu Yükle'}
                        </span>
                      </button>
                      {effectiveSchoolLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            handleSchoolBrandingChange({ logoDataUrl: '' });
                            notify(
                              'Özel logo kaldırıldı, varsayılan spor okulu arması aktif edildi.'
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Trash2 className="w-3 h-3 shrink-0" />
                          <span>Logoyu Kaldır</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Sport School Name & Branch Inputs + Apply & Close Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 flex-1 xl:max-w-2xl">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 truncate">
                      Spor Okulu / Kulüp Adı
                    </label>
                    <input
                      type="text"
                      value={schoolBranding.schoolName}
                      onChange={(e) =>
                        handleSchoolBrandingChange({ schoolName: e.target.value })
                      }
                      placeholder="Örn: ATAŞEHİR SPOR OKULLARI"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 truncate">
                      Şube / Kampüs
                    </label>
                    <input
                      type="text"
                      value={schoolBranding.branchName}
                      onChange={(e) =>
                        handleSchoolBrandingChange({ branchName: e.target.value })
                      }
                      placeholder="Örn: Ataşehir Merkez Kampüsü"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleApplyBrandingToAllReports}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      title="Girilen spor okulu adını ve logosunu listedeki tüm sporcu karnelerine uygula"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Tümüne Uygula</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBrandingSettings(false)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      title="Paneli Kapat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Visual Report Card Template Selector Cards + B & C Customizations */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    A) 3 Modern ve Profesyonel PDF Karne Şablonu (Tam Sayfa A4 Mizanpaj)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBodyMapInfographic((prev) => !prev);
                      notify(
                        !showBodyMapInfographic
                          ? 'B) Anatomik Vücut Haritası İnfografiği (Sayfa 1) aktif edildi.'
                          : 'B) Anatomik Vücut Haritası İnfografiği gizlendi.'
                      );
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      showBodyMapInfographic
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>
                      B) Vücut Haritası: {showBodyMapInfographic ? 'Açık' : 'Kapalı'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHideSectionNumbers((prev) => !prev);
                      notify(
                        !hideSectionNumbers
                          ? 'C) Bölüm Numaraları (Daire İkonları) gizlendi.'
                          : 'C) Bölüm Numaraları (Daire İkonları) aktif edildi.'
                      );
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      hideSectionNumbers
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>
                      C) Bölüm No: {hideSectionNumbers ? 'Gizli' : 'Görünür'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHideScaleLegend((prev) => !prev);
                      notify(
                        !hideScaleLegend
                          ? 'D) Skala Ölçüm Göstergesi (Açıklama Çubuğu) gizlendi.'
                          : 'D) Skala Ölçüm Göstergesi (Açıklama Çubuğu) aktif edildi.'
                      );
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      hideScaleLegend
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>
                      D) Skala Göstergesi: {hideScaleLegend ? 'Gizli' : 'Görünür'}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {KARNE_TEMPLATES.map((tpl) => {
                    const isSelected = tpl.id === karneTemplate;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          handleSelectKarneTemplate(tpl.id);
                          notify(`Karne şablonu "${tpl.name}" olarak seçildi.`);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-500/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {tpl.shortName}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-sans tabular-nums font-bold ${tpl.badgeColor}`}>
                              {isSelected ? 'AKTİF ŞABLON' : 'SEÇ'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {tpl.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* C) Dynamic Club Color Palette Bar */}
                <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70">
                  <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-2">
                    C) Dinamik Kulüp Renk Paleti (Başlık, Tablo, Mühür ve Vurgu Renklerini Kulübünüze Uyarlar)
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {CLUB_COLOR_PALETTES.map((pal) => {
                      const isSelected = pal.id === clubColorPalette;
                      const pHex =
                        pal.id === 'custom'
                          ? customPrimaryHex
                          : pal.id === 'template-default'
                            ? activeTemplate.defaultPrimaryHex
                            : pal.primaryHex;
                      const sHex =
                        pal.id === 'custom'
                          ? customSecondaryHex
                          : pal.id === 'template-default'
                            ? activeTemplate.defaultSecondaryHex
                            : pal.secondaryHex;

                      return (
                        <button
                          key={pal.id}
                          type="button"
                          onClick={() => {
                            handleSelectClubColorPalette(pal.id);
                            notify(`Kulüp renk paleti "${pal.name}" olarak seçildi.`);
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="flex items-center -space-x-1">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white inline-block"
                              style={{ backgroundColor: pHex }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white inline-block"
                              style={{ backgroundColor: sHex }}
                            />
                          </span>
                          <span>{pal.shortName}</span>
                        </button>
                      );
                    })}

                    {clubColorPalette === 'custom' && (
                      <div className="flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-slate-700">
                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <span>Ana:</span>
                          <input
                            type="color"
                            value={customPrimaryHex}
                            onChange={(e) => {
                              setCustomPrimaryHex(e.target.value);
                              try {
                                localStorage.setItem('sportsfly_lab_custom_primary_hex', e.target.value);
                              } catch {
                                // ignore
                              }
                            }}
                            className="w-6 h-6 rounded cursor-pointer border border-slate-300"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <span>Vurgu:</span>
                          <input
                            type="color"
                            value={customSecondaryHex}
                            onChange={(e) => {
                              setCustomSecondaryHex(e.target.value);
                              try {
                                localStorage.setItem('sportsfly_lab_custom_secondary_hex', e.target.value);
                              } catch {
                                // ignore
                              }
                            }}
                            className="w-6 h-6 rounded cursor-pointer border border-slate-300"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FIRMA PROFIL ALANI - ENTEGRASYONDA VE LAB'DA HER ZAMAN GÖRÜNÜR */}
      {activeLabTab === 'company-profile' && activeCompanyProfile && (
        <div className="print:hidden">
          <CompanyIntegrationProfileView
            companyProfile={activeCompanyProfile}
            reports={reports}
            archivedReports={archivedReports}
            schoolBranding={schoolBranding}
            onUpdateSchoolBranding={handleSchoolBrandingChange}
            onBackToReports={() => setActiveLabTab('studio')}
            onOpenReport={(repId) => {
              setSelectedReportId(repId);
              setActiveLabTab('studio');
            }}
            onOpenBatchExcel={() => setActiveLabTab('batch')}
            onOpenArchive={() => setActiveLabTab('archive')}
            onLogout={onLogout}
            onToast={notify}
          />
        </div>
      )}

      {/* DOSYA HAVUZU TAB VIEW */}
      {activeLabTab === 'dosya-havuzu' && (
        <div className="print:hidden">
          <DosyaHavuzuView
            onNavigateToReport={(repId) => {
              const updated = getStoredLabReports();
              setReports(updated);
              setSelectedReportId(repId);
              setActiveLabTab('studio');
              setViewMode('all');
            }}
          />
        </div>
      )}

      {/* TOPLU KARNE OLUŞTURMA (EXCEL TOPLU SPORCU VERİSİ) TAB VIEW */}
      {activeLabTab === 'batch' && (
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs print:hidden space-y-5">
          {/* Batch Header & Quick Template Actions */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Toplu Karne Oluşturma — Excel&apos;den Çoklu Sporcu Karnesi Üretimi
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-sans tabular-nums font-extrabold bg-violet-100 dark:bg-violet-950/70 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    {batchReports.length} Sporcu Yüklü · {selectedBatchReports.length} Seçili
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Birden fazla sporcunun ölçüm verilerini içeren Excel (.xlsx / .xls / .csv) dosyasını yükleyerek her sporcu için 5 sayfalık kurumsal karneyi toplu olarak oluşturun, arşive kaydedin veya tek tıkla toplu A4 PDF olarak indirin.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Quick Template Download Buttons */}
              <button
                type="button"
                onClick={() => downloadSportsFlyLabExcelTemplate(currentReport)}
                className="px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title="Mevcut 5 sayfalık karne içeriğine uygun tam Excel şablonunu (Parametre Bazlı + Çoklu Sporcu + Kılavuz) indir"
              >
                <Download className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Örnek Excel Şablonu (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadBatchSportsFlyLabExcelTemplate(currentReport)}
                className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title="Her satırında bir sporcunun tüm karne parametrelerinin yer aldığı çoklu sporcu Excel tablosunu indir"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Toplu Sporcu Şablonu (.xlsx)</span>
              </button>

              {/* Grouped Sample Data & Template Dropdown in Batch View */}
              <div className={`relative ${openHeaderMenu === 'batchSamples' ? 'z-[9995]' : ''}`}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenHeaderMenu((prev) =>
                      prev === 'batchSamples' ? null : 'batchSamples'
                    )
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  <span>Örnek Veriler</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {openHeaderMenu === 'batchSamples' && (
                  <div className="absolute right-0 top-full mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 z-[9999] space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Excel Şablonları &amp; Test Verileri
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        downloadSportsFlyLabExcelTemplate(currentReport);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <div>Örnek Karne Excel Şablonu İndir (.xlsx)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Parametre Bazlı Karne + Toplu Sporcu Listesi (3 Sayfa)
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        downloadBatchSportsFlyLabExcelTemplate(currentReport);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div>Toplu Sporcu Excel Şablonu İndir (.xlsx)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Her satırda 1 sporcu yer alan çoklu sporcu tablosu
                        </div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        handleLoadSampleBatchData();
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-violet-600 shrink-0" />
                      <div>
                        <div>Standart Örnek Veri Seti Yükle (6 Sporcu)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Tüm karne parametrelerini içeren 6 farklı branş örneği
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenHeaderMenu(null);
                        handleLoadCustomFormatSampleExcel();
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <div>Özel Okul Formatı Yükle (Sütun Eşleştirme Testi)</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Farklı Türkçe başlıklara sahip 4 sporcu tablosu
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveLabTab('studio')}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Tekil Karne Görünümü</span>
              </button>
            </div>
          </div>

          {/* Step 1: Drag & Drop Excel Uploader + Batch Group Naming & Archive Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Excel Dropzone (Left 5 Cols) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingBatchExcel(true);
              }}
              onDragLeave={() => setIsDraggingBatchExcel(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingBatchExcel(false);
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) {
                  void processUploadedExcelFile(droppedFile, true);
                }
              }}
              onClick={() => batchFileInputRef.current?.click()}
              className={`lg:col-span-5 rounded-2xl border-2 border-dashed p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDraggingBatchExcel
                  ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/40'
                  : 'border-slate-300 dark:border-slate-700 hover:border-violet-500 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-300 flex items-center justify-center mb-2.5">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                Toplu Sporcu Excel veya Ekran Görüntüsü Yükleyin
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Sporcu tablosunu içeren <strong className="text-slate-700 dark:text-slate-200">.xlsx, .xls, .csv</strong> veya Excel tablosundan aldığınız <strong className="text-slate-700 dark:text-slate-200">PNG / JPEG ekran görüntüsünü</strong> yükleyin.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel Dosyası Seç (.xlsx / .csv)</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs">
                  <Camera className="w-3.5 h-3.5" />
                  <span>📸 Ekran Görüntüsü (PNG / JPEG)</span>
                </span>
              </div>
              {batchSourceFileName && (
                <div className="mt-2.5 text-[11px] font-sans tabular-nums text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-xs">Aktif Veri: {batchSourceFileName}</span>
                </div>
              )}
            </div>

            {/* Batch Configuration & Archive Naming Settings (Right 7 Cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 flex flex-col justify-between space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0" />
                  <span>Toplu Karne Dönem Başlığı &amp; Otomatik Arşivleme Ayarları</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Kurumsal Başlık: <strong className="text-slate-900 dark:text-white">{effectiveClubName}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Toplu Karne Dönem / Grup Başlığı
                  </label>
                  <input
                    type="text"
                    value={batchGroupTitle}
                    onChange={(e) => setBatchGroupTitle(e.target.value)}
                    placeholder="Örn: 2026 Eylül Dönemi 3. Ölçüm Karnesi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Toplu Dönem Notu / Açıklama
                  </label>
                  <input
                    type="text"
                    value={batchGroupNote}
                    onChange={(e) => setBatchGroupNote(e.target.value)}
                    placeholder="Örn: U12 Akademi Fiziksel Uygunluk ve PHV Taraması"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoArchiveOnBatchCreate}
                    onChange={(e) => setAutoArchiveOnBatchCreate(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>
                    Toplu karne oluşturulduğunda seçili sporcuları otomatik olarak{' '}
                    <strong className="text-amber-600 dark:text-amber-400">Karne Arşivi</strong>&apos;ne de isimle kaydet
                  </span>
                </label>

                <span className="text-[11px] font-sans tabular-nums text-slate-500 dark:text-slate-400">
                  Arşiv Formatı: [Sporcu Adı] — {batchGroupTitle || 'Dönem Karnesi'}
                </span>
              </div>
            </div>
          </div>

          {/* TOPLU ÖLÇÜM TARİHLERİ, SPOR BRANŞI & ANTRENMAN PLANI TAVSİYESİ DÜZENLEME PANELİ */}
          {(() => {
            const batchRefReport = batchReports[0] || currentReport;
            return (
              <div className="bg-sky-50/70 dark:bg-slate-800/70 rounded-2xl border border-sky-200/90 dark:border-slate-700 p-4 space-y-3 shadow-2xs">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                  {/* Left: Manual Measurement Date, Sport Branch & Gender Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                        1. Ölçüm Tarihi (I) — Manuel Giriş
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={parseDateString(batchRefReport?.date1 || currentReport.date1)}
                          onChange={(e) => handleUpdateMeasurementDates({ date1: e.target.value }, true)}
                          placeholder="Örn: 11.11.2026"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const todayStr = new Date().toLocaleDateString('tr-TR');
                            handleUpdateMeasurementDates({ date1: todayStr }, true);
                            notify(`1. Ölçüm tarihi "${todayStr}" olarak tüm toplu karnelere uygulandı.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[10.5px] font-bold text-slate-800 dark:text-slate-200 shrink-0 cursor-pointer"
                          title="Bugünün tarihini tüm karnelere yaz"
                        >
                          Bugün
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                        2. Ölçüm Tarihi / Dönemi (II) — Manuel Giriş
                      </label>
                      <div className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-sky-50/80 dark:bg-sky-950/40 text-xs font-black text-sky-800 dark:text-sky-200 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>2-4 Ay Arası (Tahmini)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                        Sporcu Doğum Tarihi (GG.AA.YYYY)
                      </label>
                      <input
                        type="text"
                        value={parseDateString(batchRefReport?.birthDate || currentReport.birthDate || '')}
                        onChange={(e) => handleUpdateMeasurementDates({ birthDate: e.target.value }, false)}
                        placeholder="Örn: 14.11.2010"
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                        Spor Branşı — Manuel Giriş / Değiştir
                      </label>
                      <input
                        type="text"
                        list="sportsfly-branch-options"
                        value={batchRefReport?.sportBranch || currentReport.sportBranch}
                        onChange={(e) => handleUpdateMeasurementDates({ sportBranch: e.target.value }, true)}
                        placeholder="Örn: Voleybol"
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-1">
                        Sporcu Cinsiyeti — Seçim / Değiştir
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['Kadın', 'Erkek'] as const).map((gOption) => {
                          const activeGender = batchRefReport?.gender || currentReport.gender;
                          const isSelected = activeGender === gOption;
                          return (
                            <button
                              key={gOption}
                              type="button"
                              onClick={() => {
                                handleUpdateMeasurementDates({ gender: gOption }, true);
                                notify(`Cinsiyet bilgisi "${gOption}" olarak listedeki tüm sporcu karnelerine uygulandı.`);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                                isSelected
                                  ? gOption === 'Kadın'
                                    ? 'bg-pink-600 border-pink-600 text-white shadow-2xs'
                                    : 'bg-sky-600 border-sky-600 text-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {gOption === 'Kadın' ? 'Kadın (Kız)' : 'Erkek'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Apply Dates to All Reports & Training Plan Recommendation Checkbox Toggle */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateMeasurementDates(
                          {
                            date1: parseDateString(batchRefReport?.date1 || currentReport.date1),
                            date2: parseDateString(batchRefReport?.date2 || currentReport.date2),
                            sportBranch: batchRefReport?.sportBranch || currentReport.sportBranch,
                            gender: batchRefReport?.gender || currentReport.gender,
                          },
                          true
                        );
                        notify('Girilen ölçüm tarihleri, spor branşı ve cinsiyet listedeki tüm sporcu karnelerine toplu olarak uygulandı.');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                      title="Yazılan ölçüm tarihlerini, spor branşını ve cinsiyeti listedeki tüm sporcu karnelerine uygula"
                    >
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Tarih &amp; Branşı Tümüne Uygula</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleToggleTrainingPlanFrequency();
                        notify(
                          !showTrainingPlanFrequency
                            ? 'Antrenman planı tavsiyesi (Sıklık / Set) tüm karnelere eklendi.'
                            : 'Antrenman planı tavsiyesi (Sıklık / Set) karnelerden kaldırıldı.'
                        );
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap ${
                        showTrainingPlanFrequency
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {showTrainingPlanFrequency ? (
                        <CheckSquare className="w-4 h-4 text-white shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>Motor Performans Antrenman Önerileri</span>
                    </button>
                  </div>
                </div>

                {/* Quick Branch Preset Badges */}
                <div className="pt-2.5 border-t border-sky-200/70 dark:border-slate-700/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mr-1">
                    Hızlı Branş Seçimi:
                  </span>
                  {[
                    'Voleybol',
                    'Basketbol',
                    'Futbol',
                    'Yüzme',
                    'Genel Spor Gelişimi',
                    'Tenis',
                    'Jimnastik',
                    'Atletizm',
                  ].map((branch) => {
                    const activeBranchStr = (batchRefReport?.sportBranch || currentReport.sportBranch || '').toLowerCase();
                    const isActive = activeBranchStr.startsWith(branch.toLowerCase());
                    return (
                      <button
                        key={branch}
                        type="button"
                        onClick={() => {
                          handleUpdateMeasurementDates({ sportBranch: branch }, true);
                          notify(`Spor branşı "${branch}" olarak listedeki tüm sporcu karnelerine uygulandı.`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-slate-700 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-sky-400'
                        }`}
                      >
                        {branch}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Live Batch PDF Generation Progress Banner */}
          {isGeneratingBatchPDF && batchPdfStatusText && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-violet-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-extrabold">
                    Toplu A4 PDF Karneler Oluşturuluyor — Lütfen Bekleyin
                  </div>
                  <div className="text-xs text-violet-300 font-sans tabular-nums mt-0.5">
                    {batchPdfStatusText}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-sans tabular-nums text-slate-400">
                5 Sayfa × {selectedBatchReports.length} Sporcu ({selectedBatchReports.length * 5} A4 Sayfası)
              </span>
            </div>
          )}

          {/* Step 2: Primary Batch Action Bar (Karneye Aktar, Combined PDF, Separate PDFs) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 text-white flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 shadow-md">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleToggleBatchSelectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {selectedBatchIds.length === batchReports.length && batchReports.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span>
                  {selectedBatchIds.length === batchReports.length && batchReports.length > 0
                    ? 'Tüm Seçimi Kaldır'
                    : 'Tüm Sporcuları Seç'}
                </span>
              </button>

              <div className="text-xs">
                <span className="text-slate-400">Seçili Sporcu: </span>
                <strong className="text-white font-sans tabular-nums">
                  {selectedBatchReports.length} / {batchReports.length} Sporcu
                </strong>
                <span className="text-slate-400 ml-2 hidden sm:inline">
                  (Toplam {selectedBatchReports.length * 7} A4 Karne Sayfası)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCreateAndArchiveSelectedBatch}
                disabled={selectedBatchReports.length === 0 || isGeneratingBatchPDF}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                title="Seçili sporcuların verilerini karnelere aktar ve doğrudan Karne Stüdyosu'nda görüntüle"
              >
                <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
                <span>
                  Karneye Aktar ve Görüntüle ({selectedBatchReports.length} Sporcu)
                </span>
              </button>

              <button
                type="button"
                onClick={() => void handleExportBatchPDF('combined')}
                disabled={selectedBatchReports.length === 0 || isGeneratingBatchPDF}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="Seçili tüm sporcuların 7'şer sayfalık karnelerini tek bir birleşik A4 PDF dosyası olarak indir"
              >
                <Files className="w-4 h-4 shrink-0" />
                <span>
                  Tek Birleşik PDF İndir ({selectedBatchReports.length * 7} Sayfa)
                </span>
              </button>

              <button
                type="button"
                onClick={() => void handleExportBatchPDF('separate')}
                disabled={selectedBatchReports.length === 0 || isGeneratingBatchPDF}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Her sporcu için ayrı birer A4 PDF karne dosyası indir"
              >
                <FileDown className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Ayrı Ayrı PDF İndir ({selectedBatchReports.length} Dosya)</span>
              </button>
            </div>
          </div>

          {/* Search Filter for Batch Table */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={batchSearchQuery}
                onChange={(e) => setBatchSearchQuery(e.target.value)}
                placeholder="Tablodaki sporcu adı, branş veya sporcu kodu içinde ara..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {batchSearchQuery && (
                <button
                  type="button"
                  onClick={() => setBatchSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Tablodaki herhangi bir sporcunun <strong>&ldquo;Karneyi Aç&rdquo;</strong> veya <strong>&ldquo;PDF Önizle&rdquo;</strong> butonuna tıklayarak 5 sayfalık karnesini anında inceleyebilirsiniz.
            </div>
          </div>

          {/* Step 3: Multi-Athlete Batch Preview & Control Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        batchReports.length > 0 &&
                        selectedBatchIds.length === batchReports.length
                      }
                      onChange={handleToggleBatchSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 font-extrabold">Sporcu Adı &amp; Kodu</th>
                  <th className="py-3 px-3 font-extrabold">Branş / Yaş / Cinsiyet</th>
                  <th className="py-3 px-3 font-extrabold text-center">Boy / Kilo / Yağ %</th>
                  <th className="py-3 px-3 font-extrabold text-center">Somatotip Değişimi</th>
                  <th className="py-3 px-3 font-extrabold text-center">20m Sürat / Sıçrama</th>
                  <th className="py-3 px-3 font-extrabold text-center">VO2peak &amp; PACER</th>
                  <th className="py-3 px-3 font-extrabold text-center">PHV / 18 Yaş Boy</th>
                  <th className="py-3 px-3 font-extrabold text-center">Performans Puanı</th>
                  <th className="py-3 px-3 font-extrabold text-right">Bireysel Karne İşlemleri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {filteredBatchReports.map((rep, idx) => {
                  const isSelected = selectedBatchIds.includes(rep.id);

                  const getActiveRowVal = (
                    list: LabParameterRow[],
                    id: string
                  ): number => {
                    const row = list.find((x) => x.id === id);
                    if (!row || !isLabRowMeasured(row)) return 0;
                    if (row.m1 > 0) return row.m1;
                    if (row.m3 > 0) return row.m3;
                    if (row.m2 > 0) return row.m2;
                    return 0;
                  };

                  const heightVal = getActiveRowVal(rep.bodyComposition, 'height');
                  const weightVal = getActiveRowVal(rep.bodyComposition, 'weight');
                  const bmiVal = getActiveRowVal(rep.bodyComposition, 'bmi');
                  const fatVal = getActiveRowVal(rep.bodyComposition, 'body_fat');

                  const sprintVal = getActiveRowVal(rep.motorPerformance, 'sprint');
                  const vjVal = getActiveRowVal(rep.motorPerformance, 'vertical_jump');
                  const agilityVal = getActiveRowVal(rep.motorPerformance, 'agility');

                  const hasBatchM3 = Boolean(
                    rep.date3 &&
                      rep.date3 !== '—' &&
                      rep.date3.trim() !== '' &&
                      rep.somatotype.m3 &&
                      (rep.somatotype.m3.endo > 0 || rep.somatotype.m3.meso > 0 || rep.somatotype.m3.ecto > 0)
                  );
                  const hasSomatoParts = (s?: { endo: number; meso: number; ecto: number }) =>
                    Boolean(s && (s.endo > 0 || s.meso > 0 || s.ecto > 0));
                  const activeSomato = hasBatchM3
                    ? rep.somatotype.m3!
                    : hasSomatoParts(rep.somatotype.m1)
                    ? rep.somatotype.m1
                    : hasSomatoParts(rep.somatotype.m2)
                    ? rep.somatotype.m2
                    : { endo: 0, meso: 0, ecto: 0, category: '—' };

                  const vo2Val = rep.cardio.test3Vo2 > 0 ? rep.cardio.test3Vo2 : rep.cardio.test1Vo2 > 0 ? rep.cardio.test1Vo2 : rep.cardio.test2Vo2 > 0 ? rep.cardio.test2Vo2 : 0;
                  const pacerDistVal = rep.cardio.test3Distance > 0 ? rep.cardio.test3Distance : rep.cardio.test1Distance > 0 ? rep.cardio.test1Distance : rep.cardio.test2Distance;

                  const validMotorPcts = getDisplayedMotorPerformance(rep)
                    .map((m) => m.percentile || 50);
                  const avgPct = validMotorPcts.length > 0 ? Math.round(validMotorPcts.reduce((a, b) => a + b, 0) / validMotorPcts.length) : 74;

                  const activeScore = rep.scoreHistory.p3Score > 0
                    ? rep.scoreHistory.p3Score
                    : rep.scoreHistory.p1Score > 0
                    ? rep.scoreHistory.p1Score
                    : rep.scoreHistory.p2Score > 0
                    ? rep.scoreHistory.p2Score
                    : avgPct;

                  const displayDate = (rep.date3 && rep.date3 !== '—' && rep.date3 !== '')
                    ? rep.date3
                    : (rep.date1 && rep.date1 !== '—')
                    ? rep.date1
                    : '1. Ölçüm';

                  return (
                    <tr
                      key={`${rep.id}-${idx}`}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-violet-50/40 dark:bg-violet-950/20 hover:bg-violet-50/80 dark:hover:bg-violet-950/30'
                          : 'bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleBatchRow(rep.id)}
                          className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                            {rep.athleteName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {rep.athleteName}
                            </div>
                            <div className="text-[10px] font-sans tabular-nums text-slate-500 dark:text-slate-400">
                              {rep.athleteCode} · {displayDate}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {rep.sportBranch || 'Genel Spor Gelişimi'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1 mt-0.5">
                          <span>{rep.ageYears} Yaş</span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextG = rep.gender === 'Kadın' ? 'Erkek' : 'Kadın';
                              handleUpdateMeasurementDates({ gender: nextG, targetReportId: rep.id }, false);
                              notify(`${rep.athleteName} için cinsiyet "${nextG}" olarak güncellendi.`);
                            }}
                            title="Bu sporcunun cinsiyetini değiştirmek için tıklayın"
                            className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold border transition-colors cursor-pointer ${
                              rep.gender === 'Kadın'
                                ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 hover:bg-pink-100'
                                : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100'
                            }`}
                          >
                            ({rep.gender})
                          </button>
                          <span>· {effectiveClubName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-sans tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {heightVal > 0 ? `${heightVal} cm` : '—'} / {weightVal > 0 ? `${weightVal} kg` : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          BKİ: {bmiVal > 0 ? bmiVal : '—'} · Yağ: {fatVal > 0 ? `%${fatVal}` : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-sans tabular-nums">
                        <div className="font-extrabold text-amber-700 dark:text-amber-400 text-[11px]">
                          {activeSomato.endo > 0 && activeSomato.meso > 0 && activeSomato.ecto > 0
                            ? `${activeSomato.endo} - ${activeSomato.meso} - ${activeSomato.ecto}`
                            : activeSomato.endo > 0 || activeSomato.meso > 0 || activeSomato.ecto > 0
                            ? [
                                activeSomato.endo > 0 ? `Endo: ${activeSomato.endo}` : null,
                                activeSomato.meso > 0 ? `Mezo: ${activeSomato.meso}` : null,
                                activeSomato.ecto > 0 ? `Ekto: ${activeSomato.ecto}` : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')
                            : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px] mx-auto font-medium">
                          {activeSomato.category || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-sans tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {sprintVal > 0 ? `${sprintVal} sn` : '—'} · {vjVal > 0 ? `${vjVal} cm` : '—'}
                        </div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          Çabukluk: {agilityVal > 0 ? `${agilityVal} sn` : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-sans tabular-nums">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">
                          {vo2Val > 0 ? `${vo2Val} ml/kg/dk` : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          PACER: {pacerDistVal > 0 ? `${pacerDistVal}m` : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-sans tabular-nums">
                        <div className="font-bold text-indigo-700 dark:text-indigo-400">
                          {rep.predictedAdultHeight > 0 ? `${rep.predictedAdultHeight} cm` : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          PHV: {rep.phvAge > 0 ? `${rep.phvAge} Yaş` : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-sans tabular-nums">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black">
                          %{activeScore}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          I: %{rep.scoreHistory.p1Score || activeScore} → II: %{rep.scoreHistory.p2Score || Math.min(98, activeScore + 6)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenBatchReport(rep, 'view')}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                            title="Bu sporcunun 5 sayfalık karnesini aç ve incele"
                          >
                            <FolderOpen className="w-3 h-3 shrink-0" />
                            <span>Karneyi Aç</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenBatchReport(rep, 'pdf-preview')}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                            title="A4 PDF Önizle"
                          >
                            <Eye className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSaveArchiveModal(rep)}
                            className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                            title="Bu sporcuyu özel isimle Karne Arşivi'ne kaydet"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromBatch(rep.id)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Toplu listeden çıkar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KARNE ARŞİVİ TAB VIEW */}
      {activeLabTab === 'archive' && (
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs print:hidden space-y-5">
          {/* Archive Header & Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Karne Arşivi — Kayıtlı Sporcu Performans Karneleri
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-sans tabular-nums font-extrabold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {archivedReports.length} Kayıtlı Karne
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Belirli bir isimle kaydettiğiniz 5 sayfalık sporcu karnelerini dilediğiniz zaman tekrar açıp inceleyebilir, karşılaştırabilir veya A4 PDF olarak indirebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenSaveArchiveModal(currentReport)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4 shrink-0" />
                <span>Aktif Karneyi ({currentReport.athleteName}) İsimle Kaydet</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLabTab('studio')}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Aktif Karneye Dön</span>
              </button>
            </div>
          </div>

          {/* Search & Sort Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={archiveSearchQuery}
                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                placeholder="Kaydedilen karne adı, sporcu adı, branş veya tarih ara..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {archiveSearchQuery && (
                <button
                  type="button"
                  onClick={() => setArchiveSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Sıralama:
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {[
                  { id: 'newest', label: 'En Yeni Kayıt' },
                  { id: 'score', label: 'En Yüksek Puan' },
                  { id: 'name', label: 'Karne İsmi (A-Z)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setArchiveSortBy(opt.id as 'newest' | 'score' | 'name')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      archiveSortBy === opt.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Archive Cards Grid */}
          {filteredArchivedReports.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Archive className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Arşivde Eşleşen Karne Bulunamadı
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Üstteki &ldquo;Arşive İsimle Kaydet&rdquo; butonunu kullanarak oluşturduğunuz sporcu karnelerini özel bir isimle arşive ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArchivedReports.map((item) => {
                const rep = item.reportSnapshot;
                const isCurrentlyLoaded = rep.id === currentReport.id;
                const heightVal = getActiveParamVal(
                  rep.bodyComposition.find((x) => x.id === 'height'),
                  0
                );
                const weightVal = getActiveParamVal(
                  rep.bodyComposition.find((x) => x.id === 'weight'),
                  0
                );

                return (
                  <div
                    key={item.archiveId}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between bg-white dark:bg-slate-800/40 ${
                      isCurrentlyLoaded
                        ? 'border-amber-400 dark:border-amber-500/80 ring-1 ring-amber-400/30 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
                    }`}
                  >
                    <div>
                      {/* Card Top: Saved Custom Name + Date + Edit/Delete */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-sans tabular-nums font-bold text-slate-600 dark:text-slate-300">
                              <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Kayıt: {item.savedAt}</span>
                            </span>
                            {isCurrentlyLoaded && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                Şu An Açık
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                            {item.archiveTitle}
                          </h3>

                          {item.archiveNote && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.archiveNote}
                            </p>
                          )}
                        </div>

                        {/* Rename & Delete Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingArchiveItem(item);
                              setEditArchiveTitleInput(item.archiveTitle);
                              setEditArchiveNoteInput(item.archiveNote || '');
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Kaydedilen Karne İsmini Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteArchiveItem(item)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Arşivden Kaldır"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Athlete & School Info Strip */}
                      <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                            {rep.athleteName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {rep.athleteName}{' '}
                              <span className="font-normal text-slate-500">
                                ({rep.ageYears} Yaş · {rep.gender})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {rep.sportBranch} · {effectiveClubName}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Genel Puan
                          </div>
                          <div className="text-base font-black font-sans tabular-nums text-emerald-600 dark:text-emerald-400">
                            %{rep.scoreHistory.p3Score}
                          </div>
                        </div>
                      </div>

                      {/* Key Metrics Snapshot Grid */}
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">
                            Boy / Kilo
                          </div>
                          <div className="text-[11px] font-bold font-sans tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
                            {heightVal}cm / {weightVal}kg
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">
                            18 Yaş Boy
                          </div>
                          <div className="text-[11px] font-bold font-sans tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
                            {rep.predictedAdultHeight} cm
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">
                            VO2peak
                          </div>
                          <div className="text-[11px] font-bold font-sans tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {rep.cardio.test3Vo2}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">
                            Ölçüm Tarihi
                          </div>
                          <div className="text-[11px] font-bold font-sans tabular-nums text-slate-700 dark:text-slate-300 mt-0.5">
                            {rep.date3}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenArchivedReport(item, 'view')}
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>Karneyi Aç &amp; Görüntüle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenArchivedReport(item, 'pdf-preview')}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Bu karneyi A4 PDF önizleme modunda aç"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>PDF Önizle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenArchivedReport(item, 'download-pdf')}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="5 sayfalık karneyi doğrudan A4 PDF olarak indir"
                      >
                        <FileDown className="w-3.5 h-3.5 shrink-0" />
                        <span>PDF İndir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* İsteğe Bağlı Ek Analiz Panelleri: Performans Grafikleri & Performans Önerileri (Varsayılan: Her zaman kapalı) */}
      {activeLabTab === 'studio' && (
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:px-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
            <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ek Analiz &amp; Öneri Panelleri:</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              (İsteğe bağlı olarak açıp inceleyebilirsiniz)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChartsPanel((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                showChartsPanel
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="D3 Radar ve Gelişim Çizgi Grafiklerini Göster/Gizle"
            >
              <BarChart3 className={`w-3.5 h-3.5 ${showChartsPanel ? 'text-white' : 'text-emerald-600'} shrink-0`} />
              <span>Performans Grafikleri</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
                  showChartsPanel
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {showChartsPanel ? 'Açık' : 'Kapalı'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowAiPanel((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                showAiPanel
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Yapay Zeka Performans ve Gelişim Önerilerini Göster/Gizle"
            >
              <Sparkles className={`w-3.5 h-3.5 ${showAiPanel ? 'text-white' : 'text-indigo-600'} shrink-0`} />
              <span>Performans Önerileri (AI)</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
                  showAiPanel
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {showAiPanel ? 'Açık' : 'Kapalı'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* D3 Radar & Line Performance Charts Panel */}
      {activeLabTab === 'studio' && showChartsPanel && (
        <div className="relative print:hidden space-y-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowChartsPanel(false)}
              className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Performans Grafikleri Panelini Kapat"
            >
              <span>✕ Performans Grafiklerini Kapat</span>
            </button>
          </div>
          <SportsFlyLabPerformanceCharts report={currentReport} />
        </div>
      )}

      {/* AI-Powered Performance Recommendations & Improvement Areas Section */}
      {activeLabTab === 'studio' && showAiPanel && (
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs print:hidden">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Performans Önerileri — Yapay Zeka Metrik &amp; Gelişim Analizi
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    · {currentReport.athleteName} ({currentReport.ageYears} Yaş · {currentReport.sportBranch})
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Yüklenen Excel verilerindeki 3 dönemlik ölçüm metrikleri, Z-skor (SD) sapmaları ve PHV büyüme hızı otomatik analiz edilerek gelişime açık yönler belirlenmiştir.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleRunAiAnalysis(currentReport)}
                disabled={isAnalyzingAI}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                title="Gemini AI ile tüm ölçüm metriklerini yeniden analiz et"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
                <span>{isAnalyzingAI ? 'AI Metrikleri Analiz Ediyor...' : 'Yapay Zeka ile Analizi Yenile'}</span>
              </button>

              <button
                type="button"
                onClick={handleApplyAiToExpertComment}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Yapay zeka özetini ve önerilerini 5. sayfadaki Uzman Görüşü alanına uygula"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Karne Uzman Görüşüne Aktar</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAiPanel(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                title="Performans Önerileri Panelini Kapat"
              >
                ✕ Kapat
              </button>
            </div>
          </div>

          {aiError && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
              <span>
                Not: Sunucu AI bağlantısı kurulamadı ({aiError}). Veriler yerel normatif biyomekanik motoru ile analiz edildi.
              </span>
              <button
                type="button"
                onClick={() => setAiError(null)}
                className="text-amber-600 hover:text-amber-900 font-bold ml-2"
              >
                Kapat
              </button>
            </div>
          )}

          {/* Executive Summary & Readiness Strip */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-9 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/70">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Genel Performans Sentezi &amp; Gelişim Yönü
                </span>
                <span className="text-[11px] font-sans tabular-nums text-slate-400">
                  Son Analiz: {activeAiAnalysis.generatedAt}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeAiAnalysis.overallSummary}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white">Beslenme, Somatotip &amp; Toparlanma Önerisi: </strong>
                {activeAiAnalysis.nutritionAndRecoveryTip}
              </div>
            </div>

            <div className="lg:col-span-3 bg-slate-900 text-white rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Atletik Hazırlık &amp; Gelişim Endeksi
                </div>
                <div className="text-3xl font-black font-sans tabular-nums text-emerald-400 mt-1">
                  %{activeAiAnalysis.readinessScore}
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  I. Ölçüm (%{currentReport.scoreHistory.p1Score}) → II. Ölçüm (Tahmini) (%{currentReport.scoreHistory.p2Score})
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-700 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Gelişime Açık Alan:</span>
                <span className="font-sans tabular-nums font-bold text-amber-400">
                  {activeAiAnalysis.improvementAreas.length} Kritik Metrik
                </span>
              </div>
            </div>
          </div>

          {/* Main Grid: Improvement Areas (Left 7 cols) + Strengths & 8-Week Microcycle (Right 5 cols) */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: 10. Öncelikli Gelişim Alanları & Spesifik Drill Reçetesi */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-sans tabular-nums text-[10px] font-black">
                    10. BÖLÜM
                  </span>
                  <span>Öncelikli Gelişim Alanları &amp; İlk Bakışta Odak Planı</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  İlk bakışta odaklanılması gereken öncelik sırasına göre dizilmiştir
                </span>
              </div>

              <div className="space-y-3">
                {activeAiAnalysis.improvementAreas.map((item, idx) => {
                  const isHighPriority = item.priority.toLowerCase().includes('yüksek');
                  const priorityBadge =
                    idx === 0
                      ? '1. ÖNCELİKLİ ODAK'
                      : idx === 1
                      ? '2. ÖNCELİKLİ ODAK'
                      : `${idx + 1}. GELİŞİM ODAĞI`;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border-2 transition-colors ${
                        idx === 0
                          ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/30 dark:bg-rose-950/20'
                          : idx === 1
                          ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/15'
                          : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-sans tabular-nums font-black uppercase ${
                              idx === 0
                                ? 'bg-rose-600 text-white'
                                : idx === 1
                                ? 'bg-amber-500 text-white'
                                : 'bg-indigo-600 text-white'
                            }`}
                          >
                            {priorityBadge}
                          </span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {item.metricName}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-sans tabular-nums">
                          <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                            Mevcut: <strong className="text-slate-900 dark:text-white font-black">{item.currentValue}</strong>
                          </span>
                          <span className="text-slate-400 font-black">→</span>
                          <span className="bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-black">
                            Hedef: {item.targetValue}
                          </span>
                          <span
                            className={`font-sans text-[11px] font-black px-2 py-1 rounded-lg ${
                              isHighPriority
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                            }`}
                          >
                            %{item.percentile} · {item.priority}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed font-medium">
                        {item.analysis}
                      </p>

                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          <strong className="text-indigo-700 dark:text-indigo-400 font-extrabold">Odaklanılacak Antrenman Reçetesi: </strong>
                          {item.drillRecommendation}
                        </div>
                        {showTrainingPlanFrequency && (
                          <div className="font-sans tabular-nums font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 shrink-0">
                             {item.weeklyFrequency}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 5 Cols: Güçlü Yönler & 8 Haftalık Mikro-Döngü Planı */}
            <div className="lg:col-span-5 space-y-4">
              {/* Strengths */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-800/30">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Öne Çıkan Güçlü Parametreler (Avantajlar)</span>
                </h3>
                <div className="space-y-2">
                  {activeAiAnalysis.strengths.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">{st.metricName}</span>
                        <span className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                          {st.currentValue} · %{st.percentile} Yüzdelik
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                        {st.insight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8-Week Microcycle Prescription */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-800/30">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>8 Haftalık Antrenman &amp; PHV Yüklenme Planı</span>
                </h3>
                <div className="space-y-2.5">
                  {activeAiAnalysis.trainingPrescription.map((block, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs"
                    >
                      <div className="font-bold text-indigo-700 dark:text-indigo-400">{block.focusArea}</div>
                      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        Hedef: {block.microcycleGoal}
                      </div>
                      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                        {block.recommendedDrills.map((d, dIdx) => (
                          <li key={dIdx}>· {d}</li>
                        ))}
                      </ul>
                      <div className="mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-700 text-[10px] font-sans tabular-nums text-slate-500 dark:text-slate-400">
                        Yüklenme: {block.loadNote}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive A4 PDF Document Preview Bar (Shown when 'PDF Olarak Görüntüle' is active - Sticky at Top) */}
      {isPdfPreviewMode && (
        <div
          id="sportsfly-lab-preview-bar"
          className="sticky top-0 z-40 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-2.5 sm:p-3.5 sm:px-5 border border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shadow-xl print:hidden animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold tracking-tight flex items-center gap-2 truncate">
                <span className="truncate">A4 PDF Önizleme Modu — {currentReport.athleteName}</span>
                <span className="text-[10px] sm:text-[11px] font-sans tabular-nums font-normal text-slate-300 hidden md:inline shrink-0">
                  (210 × 297 mm · 5 Sayfa · Baskıya Hazır)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Karnenin A4 yazdırma stillerini inceleyebilir, doğrudan yazıcıdan çıktı alabilir veya PDF olarak indirebilirsiniz.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-700 text-xs">
              {[85, 100, 110].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setPdfZoom(z)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg font-sans tabular-nums font-bold transition-colors cursor-pointer text-[11px] sm:text-xs ${
                    pdfZoom === z ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  %{z}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePrintA4}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              title="A4 formatında yazdırın"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">A4 Yazdır</span>
              <span className="sm:hidden">Yazdır</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenJpegModal()}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              title="Sayfaları tek tek seçerek veya tümünü birden JPEG olarak indirin"
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-200 shrink-0" />
              <span className="hidden sm:inline">JPEG İndir</span>
              <span className="sm:hidden">JPEG</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-60"
              title="Tüm karneyi PDF olarak indirin"
            >
              {isGeneratingPDF ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin shrink-0" />
              ) : (
                <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
              )}
              <span>
                {isGeneratingPDF
                  ? `İndiriliyor (${pdfProgressPage || 1}/5)...`
                  : (
                    <>
                      <span className="hidden sm:inline">Tüm Karneyi İndir</span>
                      <span className="sm:hidden">İndir</span>
                    </>
                  )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsPdfPreviewMode(false)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              title="PDF önizleme modunu kapat"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Kapat</span>
            </button>
          </div>
        </div>
      )}

      {/* Report Card Pages Container (Wrapped with #sportsfly-lab-print-area for @media print A4 output) */}
      <div
        className={`relative z-0 ${
          (activeLabTab === 'archive' || activeLabTab === 'batch' || activeLabTab === 'company-profile') && !isGeneratingBatchPDF
            ? 'hidden print:block'
            : ''
        } ${
          isPdfPreviewMode
            ? 'bg-slate-800/95 p-4 sm:p-8 rounded-2xl border border-slate-700 shadow-2xl overflow-x-auto print:bg-white print:p-0 print:border-0 print:shadow-none'
            : ''
        }`}
      >
        <div
          id="sportsfly-lab-print-area"
          className={`space-y-8 pb-8 print:space-y-0 print:pb-0 transition-all ${
            isPdfPreviewMode ? 'max-w-[210mm] mx-auto' : 'w-full max-w-5xl mx-auto'
          }`}
          style={
            isPdfPreviewMode && pdfZoom !== 100
              ? { zoom: `${pdfZoom}%` }
              : undefined
          }
        >
              {showBodyMapInfographic && (
                <div className={`karne-page-wrapper ${viewMode === 'all' || activePage === 0 || isPdfPreviewMode ? 'block' : 'hidden print:block'} ${isPdfPreviewMode ? 'shadow-2xl ring-1 ring-slate-300 rounded-xl overflow-hidden bg-white mb-8' : ''}`}>
                  {renderAnatomicalBodyMapPage()}
                </div>
              )}
              <div className={`karne-page-wrapper ${viewMode === 'all' || activePage === 1 || isPdfPreviewMode ? 'block' : 'hidden print:block'} ${isPdfPreviewMode ? 'shadow-2xl ring-1 ring-slate-300 rounded-xl overflow-hidden bg-white mb-8' : ''}`}>
                {renderPage1()}
              </div>
              <div className={`karne-page-wrapper ${viewMode === 'all' || activePage === 2 || isPdfPreviewMode ? 'block' : 'hidden print:block'} ${isPdfPreviewMode ? 'shadow-2xl ring-1 ring-slate-300 rounded-xl overflow-hidden bg-white mb-8' : ''}`}>
                {renderPage2()}
              </div>
              <div className={`karne-page-wrapper ${viewMode === 'all' || activePage === 3 || isPdfPreviewMode ? 'block' : 'hidden print:block'} ${isPdfPreviewMode ? 'shadow-2xl ring-1 ring-slate-300 rounded-xl overflow-hidden bg-white mb-8' : ''}`}>
                {renderPage3()}
              </div>
              <div className={`karne-page-wrapper ${viewMode === 'all' || activePage === 4 || isPdfPreviewMode ? 'block' : 'hidden print:block'} ${isPdfPreviewMode ? 'shadow-2xl ring-1 ring-slate-300 rounded-xl overflow-hidden bg-white mb-8' : ''}`}>
                {renderPage5()}
              </div>
        </div>
      </div>

      {/* Save Report Card to Archive with Custom Name Modal */}
      {showSaveArchiveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111c2e] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Karneyi İsimlendir &amp; Arşive Kaydet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bu karneye özel bir isim vererek Karne Arşivi sekmesine kaydedin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveArchiveModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSaveToArchive} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    {currentReport.athleteName} ({currentReport.ageYears} Yaş)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {currentReport.sportBranch} · {effectiveClubName}
                  </div>
                </div>
                <div className="text-right font-sans tabular-nums">
                  <div className="text-[10px] text-slate-400 uppercase">Performans Puanı</div>
                  <div className="text-sm font-black text-emerald-600">
                    %{currentReport.scoreHistory.p2Score || currentReport.scoreHistory.p3Score}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kayıtlı Karne İsmi (Arşiv Başlığı) *
                </label>
                <input
                  type="text"
                  required
                  value={archiveTitleInput}
                  onChange={(e) => setArchiveTitleInput(e.target.value)}
                  placeholder="Örn: Ege Örnektir - 2026 Yaz Dönemi Performans Karnesi"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dönem Notu / Açıklama (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={archiveNoteInput}
                  onChange={(e) => setArchiveNoteInput(e.target.value)}
                  placeholder="Örn: Sezon öncesi fiziksel uygunluk ve PHV değerlendirmesi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveArchiveModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Karne Arşivine Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Archived Report Card Modal */}
      {editingArchiveItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111c2e] w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Arşivdeki Karne İsmini Düzenle
              </h3>
              <button
                type="button"
                onClick={() => setEditingArchiveItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenameArchiveSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Karne İsmi *
                </label>
                <input
                  type="text"
                  required
                  value={editArchiveTitleInput}
                  onChange={(e) => setEditArchiveTitleInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dönem Notu / Açıklama
                </label>
                <input
                  type="text"
                  value={editArchiveNoteInput}
                  onChange={(e) => setEditArchiveNoteInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingArchiveItem(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Report Card Modal (Automatically applies localStorage school branding) */}
      {showNewReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111c2e] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Yeni Sporcu Karnesi Oluştur (5 Sayfa)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kaydedilen karne tasarım ayarlarınız (okul adı ve logo) yeni karneye otomatik uygulanır.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewReportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewReport} className="p-5 space-y-4 text-xs">
              {/* Automatic Branding Preview Banner */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {effectiveSchoolLogo ? (
                    <img
                      src={effectiveSchoolLogo}
                      alt={effectiveClubName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-sky-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Otomatik Uygulanacak Kurumsal Başlık
                    </span>
                  </div>
                  <div className="font-extrabold text-slate-900 dark:text-white truncate">
                    {effectiveClubName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {effectiveBranchName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sporcu Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAthleteForm.athleteName}
                    onChange={(e) =>
                      setNewAthleteForm({ ...newAthleteForm, athleteName: e.target.value })
                    }
                    placeholder="Örn: Kerem Aktürkoğlu"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Branş / Grup
                  </label>
                  <input
                    type="text"
                    value={newAthleteForm.sportBranch}
                    onChange={(e) =>
                      setNewAthleteForm({ ...newAthleteForm, sportBranch: e.target.value })
                    }
                    placeholder="Örn: Futbol / U12 Gelişim"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cinsiyet
                    </label>
                    <select
                      value={newAthleteForm.gender}
                      onChange={(e) =>
                        setNewAthleteForm({
                          ...newAthleteForm,
                          gender: e.target.value as 'Erkek' | 'Kadın',
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="Erkek">Erkek</option>
                      <option value="Kadın">Kadın</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Yaş
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newAthleteForm.ageYears}
                      onChange={(e) =>
                        setNewAthleteForm({
                          ...newAthleteForm,
                          ageYears: parseFloat(e.target.value) || 10,
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-sans tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewReportModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Karneyi Oluştur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Data Editor Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111c2e] w-full max-w-3xl max-h-[88vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  SportsFly Lab Karne Verilerini Düzenle — {currentReport.athleteName}
                </h3>
                <p className="text-xs text-slate-500">
                  Değişiklikler anında 5 sayfalık karneye yansır. Toplu veri için Excel şablonunu da kullanabilirsiniz.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* General Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sporcu Adı Soyadı</label>
                  <input
                    type="text"
                    value={currentReport.athleteName}
                    onChange={(e) =>
                      handleUpdateCurrentReport({ ...currentReport, athleteName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Spor Okulu / Kulüp Adı</label>
                  <input
                    type="text"
                    value={schoolBranding.schoolName}
                    onChange={(e) => handleSchoolBrandingChange({ schoolName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Şube &amp; Yaş</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={schoolBranding.branchName}
                      onChange={(e) => handleSchoolBrandingChange({ branchName: e.target.value })}
                      className="w-1/2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={currentReport.ageYears}
                      onChange={(e) =>
                        handleUpdateCurrentReport({
                          ...currentReport,
                          ageYears: parseFloat(e.target.value) || 10,
                        })
                      }
                      className="w-1/2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-sans tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* PHV & Overall Score Quick Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">PHV Yaşı</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentReport.phvAge}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        ...currentReport,
                        phvAge: parseFloat(e.target.value) || 12.8,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-sans tabular-nums text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">PHV Boy (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentReport.phvHeight}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        ...currentReport,
                        phvHeight: parseFloat(e.target.value) || 165.8,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-sans tabular-nums text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">18 Yaş Tahmini Boy</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentReport.predictedAdultHeight}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        ...currentReport,
                        predictedAdultHeight: parseFloat(e.target.value) || 172.7,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-sans tabular-nums text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">3. Test Genel Puan (%)</label>
                  <input
                    type="number"
                    value={currentReport.scoreHistory.p3Score}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        ...currentReport,
                        scoreHistory: {
                          ...currentReport.scoreHistory,
                          p3Score: parseInt(e.target.value, 10) || 88,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-sans tabular-nums text-slate-900"
                  />
                </div>
              </div>

              {/* Group Comparison Quick Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/60 dark:bg-slate-800/50 p-3 rounded-xl border border-indigo-200 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Gruptaki Sporcu Sayısı</label>
                  <input
                    type="number"
                    value={currentReport.groupInfo.groupAthleteCount}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        ...currentReport,
                        groupInfo: {
                          ...currentReport.groupInfo,
                          groupAthleteCount: parseInt(e.target.value, 10) || 15,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-sans tabular-nums text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Genel Sıralama</label>
                  <input
                    type="number"
                    value={currentReport.groupInfo.groupRank}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        ...currentReport,
                        groupInfo: {
                          ...currentReport.groupInfo,
                          groupRank: parseInt(e.target.value, 10) || 1,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-sans tabular-nums text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Grup Ortalaması (%)</label>
                  <input
                    type="number"
                    value={currentReport.groupInfo.groupAverageScore ?? 72}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        ...currentReport,
                        groupInfo: {
                          ...currentReport.groupInfo,
                          groupAverageScore: parseInt(e.target.value, 10) || 72,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-sans tabular-nums text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Grup İçindeki Konum (%)</label>
                  <input
                    type="number"
                    value={currentReport.groupInfo.groupPositionPercentile ?? 94}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        ...currentReport,
                        groupInfo: {
                          ...currentReport.groupInfo,
                          groupPositionPercentile: parseInt(e.target.value, 10) || 94,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-sans tabular-nums text-slate-900"
                  />
                </div>
              </div>

              {/* Parent Info & Sports Background Edit Section */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-600" />
                  <span>Veli Bilgileri &amp; Anne-Baba Spor Geçmişi Düzenleme</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Anne Bilgileri Edit */}
                  <div className="space-y-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">Anne Bilgileri &amp; Spor Geçmişi</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Boy (cm)</label>
                        <input
                          type="text"
                          value={currentReport.parentInfo?.anneBoy || ''}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), anneBoy: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kilo (kg)</label>
                        <input
                          type="text"
                          value={currentReport.parentInfo?.anneKilo || ''}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), anneKilo: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Spor Yapıyor mu?</label>
                        <select
                          value={currentReport.parentInfo?.anneSporYapiyorMu || 'Evet'}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), anneSporYapiyorMu: e.target.value as any },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs bg-white"
                        >
                          <option value="Evet">Evet</option>
                          <option value="Hayir">Hayır</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Branş(lar)</label>
                        <input
                          type="text"
                          value={currentReport.parentInfo?.anneBranslar || ''}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), anneBranslar: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Spor Geçmişi</label>
                        <input
                          type="text"
                          value={currentReport.parentInfo?.anneSporGecmisi || ''}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), anneSporGecmisi: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Baba Bilgileri Edit */}
                  <div className="space-y-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">Baba Bilgileri &amp; Spor Geçmişi</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Boy (cm)</label>
                        <input
                          type="text"
                          value={currentReport.parentInfo?.babaBoy || ''}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), babaBoy: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kilo (kg)</label>
                        <input
                          type="text"
                          value={currentReport.parentInfo?.babaKilo || ''}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), babaKilo: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Spor Yapıyor mu?</label>
                        <select
                          value={currentReport.parentInfo?.babaSporYapiyorMu || 'Evet'}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), babaSporYapiyorMu: e.target.value as any },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs bg-white"
                        >
                          <option value="Evet">Evet</option>
                          <option value="Hayir">Hayır</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Branş(lar)</label>
                        <input
                          type="text"
                          value={currentReport.parentInfo?.babaBranslar || ''}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), babaBranslar: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Spor Geçmişi</label>
                        <input
                          type="text"
                          value={currentReport.parentInfo?.babaSporGecmisi || ''}
                          onChange={(e) =>
                            handleUpdateCurrentReport({
                              ...currentReport,
                              parentInfo: { ...(currentReport.parentInfo || {}), babaSporGecmisi: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expert Comment */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Uzman Değerlendirmesi ve Antrenör Notu
                </label>
                <textarea
                  rows={3}
                  value={
                    !currentReport.expertComment || isStaleExpertComment(currentReport.expertComment)
                      ? generateAthleteInterpretiveExpertComment(currentReport)
                      : currentReport.expertComment
                  }
                  onChange={(e) =>
                    handleUpdateCurrentReport({ ...currentReport, expertComment: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  notify('Karne verileri güncellendi.');
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Tamam &amp; Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Karne Sayfalarını JPEG Olarak İndir Modalı */}
      {showJpegModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2e] w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-50/80 via-white to-slate-50/80 dark:from-teal-950/20 dark:via-[#111c2e] dark:to-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    Karne Sayfalarını JPEG Olarak İndir
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
                      HD Görüntü
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{currentReport.athleteName}</span> · İster tek tek sayfaları seçin, ister tümünü tek tıkla ZIP paketi olarak indirin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isGeneratingJpeg) setShowJpegModal(false);
                }}
                disabled={isGeneratingJpeg}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer disabled:opacity-40 transition-colors"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Quick Selection Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const all = getKarnePagesMeta().map((p) => p.id);
                      setSelectedJpegPageIds(all);
                    }}
                    disabled={isGeneratingJpeg}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                  >
                    Tüm Sayfaları Seç
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedJpegPageIds([])}
                    disabled={isGeneratingJpeg}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
                  >
                    Seçimi Temizle
                  </button>
                </div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-teal-600 dark:text-teal-400">{selectedJpegPageIds.length}</span> / {getKarnePagesMeta().length} Sayfa Seçili
                </div>
              </div>

              {/* Pages List */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  İndirilecek Sayfalar
                </div>
                <div className="space-y-2">
                  {getKarnePagesMeta().map((page) => {
                    const isSelected = selectedJpegPageIds.includes(page.id);
                    return (
                      <div
                        key={page.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-teal-50/60 dark:bg-teal-950/20 border-teal-300 dark:border-teal-700/80 shadow-2xs'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isGeneratingJpeg}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedJpegPageIds((prev) => [...prev, page.id]);
                              } else {
                                setSelectedJpegPageIds((prev) => prev.filter((id) => id !== page.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                Sayfa {page.pageNumber}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {page.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {page.subtitle}
                            </p>
                          </div>
                        </label>

                        {/* Quick 1-click single page download button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleJpeg(page.id)}
                          disabled={isGeneratingJpeg}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/40 border border-slate-200 dark:border-slate-600 text-teal-700 dark:text-teal-300 hover:border-teal-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 transition-colors shadow-2xs"
                          title="Sadece bu sayfayı hemen JPEG olarak indir"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Bu Sayfayı İndir</span>
                          <span className="sm:hidden">İndir</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quality Settings */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    JPEG Çıktı Çözünürlüğü &amp; Kalitesi
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Net çizelgeler, grafikler ve keskin metinler için 2x Retina tarama kullanılır
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setJpegQuality(0.98)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      jpegQuality >= 0.95
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    Ultra HD (%98 - Önerilen)
                  </button>
                  <button
                    type="button"
                    onClick={() => setJpegQuality(0.90)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      jpegQuality < 0.95
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    Standart HD (%90)
                  </button>
                </div>
              </div>

              {/* Ongoing progress bar */}
              {isGeneratingJpeg && (
                <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div className="text-xs font-bold text-teal-900 dark:text-teal-200">
                    {jpegProgressText || 'Görseller işleniyor ve hazırlanıyor...'}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer / Actions */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowJpegModal(false)}
                disabled={isGeneratingJpeg}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Vazgeç
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Tümünü İndir (ZIP) */}
                <button
                  type="button"
                  onClick={() => {
                    const allIds = getKarnePagesMeta().map((p) => p.id);
                    void handleDownloadJpegZipOrSelected(allIds);
                  }}
                  disabled={isGeneratingJpeg}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                  title="Tüm sayfaları ZIP arşivi olarak indir"
                >
                  <Download className="w-4 h-4 text-slate-300" />
                  <span>Tümünü İndir (ZIP Paketi)</span>
                </button>

                {/* 2. Seçili Sayfaları İndir */}
                <button
                  type="button"
                  onClick={() => void handleDownloadJpegZipOrSelected(selectedJpegPageIds)}
                  disabled={isGeneratingJpeg || selectedJpegPageIds.length === 0}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                  title="Sadece seçtiğiniz sayfaları JPEG olarak indirin"
                >
                  {isGeneratingJpeg ? (
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin shrink-0" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-emerald-100 shrink-0" />
                  )}
                  <span>
                    {selectedJpegPageIds.length === 1
                      ? 'Seçili Sayfayı İndir (1 JPEG)'
                      : `Seçili Sayfaları İndir (${selectedJpegPageIds.length} Sayfa)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Audit (Ön-Denetim) Modal */}
      <ExcelDataAuditModal
        isOpen={labAuditModal.isOpen}
        summary={labAuditModal.summary}
        fileName={labAuditModal.fileName}
        onClose={() => setLabAuditModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirmAll={() => {
          setLabAuditModal((prev) => ({ ...prev, isOpen: false }));
          notify('✓ Tüm sporcu verileri doğrulandı ve karne havuzuna aktarıldı.');
        }}
      />

      {/* Karne Kılavuzu & Terimler Sözlüğü Modalı */}
      {showKarneGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2e] w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50/80 via-white to-slate-50/80 dark:from-amber-950/20 dark:via-[#111c2e] dark:to-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shadow-xs shrink-0 font-black">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    SportsFly Lab · Dijital Sporcu Karnesi &amp; Analiz Kılavuzu
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                      Profesyonel Referans Dokümanı
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Karne sayfalarında yer alan tüm başlıklar, somatotip bileşenleri, motor testler ve performans indekslerinin bilimsel açıklamaları
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKarneGuideModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-6 max-h-[72vh] overflow-y-auto text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
              {/* Section 1 */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs font-black shrink-0">1</span>
                  <span>Genel Sportif Performans Puanı ve Gelişim İvmesi (%)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Karne kapaklarında ve özet panellerinde yer alan genel yüzdelik puan (%70-%95 arası), sporcunun 10 temel motor performans parametresindeki (sürat, çabukluk, dikey sıçrama, esneklik, kuvvet vb.) değerlerinin yaş, cinsiyet ve branş referans standartlarına göre dönüştürülmüş kümülatif başarı ortalamasıdır. I. Ölçüm başlangıç referansını, II. Ölçüm (Tahmini) ise düzenli antrenman yüklenmesiyle öngörülen projeksiyon değerini ifade eder.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">2</span>
                  <span>Heath-Carter Somatotip &amp; Somato-Grafik Analizi</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Sporcunun vücut kompozisyonu üç temel bileşen üzerinden 1 ile 10 arasında puanlanır:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <li><strong className="text-slate-900 dark:text-white">Endomorfi:</strong> Vücuttaki göreceli yağ kütlesi ve hacim yoğunluğu.</li>
                  <li><strong className="text-slate-900 dark:text-white">Mezomorfi:</strong> Kas-iskelet sistemi gelişimi ve biyomotor kuvvet kapasitesi.</li>
                  <li><strong className="text-slate-900 dark:text-white">Ektomorfi:</strong> Lineer boy ve ince yapı (uzunluk/boy oranı) baskınlığı.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-black shrink-0">3</span>
                  <span>Motor Performans Sınıflandırma Kriterleri</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Karne içinde motor testler üç ana odak grubuna ayrılarak antrenörler ve sporcular için rehberlik sağlar:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
                    <div className="font-bold text-rose-800 dark:text-rose-300 text-xs">Gelişim Göstermeli</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Öncelikli antrenman odak alanı gereken, standartların altında kalan parametreler.</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                    <div className="font-bold text-amber-800 dark:text-amber-300 text-xs">Takip Edilmeli</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">İstikrarlı ilerleyen, izlem ve düzenli yüklenme gerektiren motor testler.</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                    <div className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">Hedefe Ulaştı</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Üstün başarı gösteren ve elite referans standartlarını karşılayan testler.</div>
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-black shrink-0">4</span>
                  <span>Mirwald Biyolojik Olgunlaşma ve Boy Tahmini (PHV)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Büyüme çağındaki sporcuların oturma boyu, bacak boyu ve kronolojik yaş verileri kullanılarak Peak Height Velocity (Maksimum Büyüme Hızı) yaşı ve erişkin dönem tahmini boy projeksiyonu bilimsel regresyon denklemleriyle hesaplanır.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowKarneGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Kılavuzu Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
