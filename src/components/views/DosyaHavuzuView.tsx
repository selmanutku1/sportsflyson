import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  Trash2,
  FilePlus,
  AlertCircle,
  Database,
  Building2,
  Check,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Award,
  Layers,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import {
  SportsFlyLabReport,
  parseSportsFlyLabExcel,
  createNewLabReportWithBranding,
  getStoredLabSchoolBranding,
  applyBrandingToReport,
  getStoredLabReports,
  saveStoredLabReports,
  DEFAULT_LAB_REPORTS,
  ensureDataConsistency,
  analyzeLabPerformanceMetrics,
  buildLabReportFromOcrAthlete,
  validateExcelSchema,
} from '../../data/sportsFlyLabData';
import {
  ExcelDataAuditModal,
  auditImportedAthletes,
  ExcelAuditSummary,
} from '../modals/ExcelDataAuditModal';
import {
  subscribeUploadedFiles,
  updateUploadedFileStatus,
  saveUploadedFileToFirestore,
  deleteUploadedFileFromFirestore,
  UploadedFileDoc,
} from '../../services/karneFirestoreService';

interface DosyaHavuzuViewProps {
  onNavigateToReport?: (reportId: string) => void;
  onNavigate?: (page: string) => void;
}

export interface PoolFileItem {
  id: string;
  name: string;
  athleteCount: number;
  status: 'Bekliyor' | 'İşlendi' | 'Onaylandı';
  schoolName: string;
  uploadDate: string;
  ownerId?: string;
}

export interface PoolAthleteItem extends SportsFlyLabReport {
  fileId: string;
  fileName: string;
  approvalStatus: 'Bekliyor' | 'Onaylandı' | 'Karne Oluşturuldu';
}

const LOCAL_FILES_KEY = 'sportsfly_dosya_havuzu_files_v2';
const LOCAL_ATHLETES_KEY = 'sportsfly_dosya_havuzu_athletes_v2';

// Seed sample files so the user immediately sees populated data
const INITIAL_SAMPLE_FILES: PoolFileItem[] = [];

const INITIAL_SAMPLE_ATHLETES: PoolAthleteItem[] = [];

export const DosyaHavuzuView: React.FC<DosyaHavuzuViewProps> = ({ onNavigate, onNavigateToReport }) => {
  // Local state initialized empty so no legacy cached or sample files appear automatically
  const [uploadedFiles, setUploadedFiles] = useState<PoolFileItem[]>([]);
  const [poolAthletes, setPoolAthletes] = useState<PoolAthleteItem[]>([]);

  // Auto-migrate any legacy items to Onaylandı status so no athlete is trapped with 'Dosya Onayı Bekliyor'
  useEffect(() => {
    setUploadedFiles((prev) => {
      let changed = false;
      const next = prev.map((f) => {
        if (f.status === 'Bekliyor') {
          changed = true;
          return { ...f, status: 'Onaylandı' as const };
        }
        return f;
      });
      if (changed) {
        try { localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(next)); } catch (e) {}
      }
      return next;
    });

    setPoolAthletes((prev) => {
      let changed = false;
      const next = prev.map((a) => {
        if (a.approvalStatus === 'Bekliyor') {
          changed = true;
          return { ...a, approvalStatus: 'Onaylandı' as const };
        }
        return a;
      });
      if (changed) {
        try { localStorage.setItem(LOCAL_ATHLETES_KEY, JSON.stringify(next)); } catch (e) {}
      }
      return next;
    });
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileFilter, setSelectedFileFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'Tümü' | 'Bekliyor' | 'Onaylandı'>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; action?: () => void; actionText?: string } | null>(null);

  // Custom Delete Confirmation Modal State (replaces window.confirm)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Pre-Audit (Ön-Denetim) Modal State
  const [auditModal, setAuditModal] = useState<{
    isOpen: boolean;
    summary: ExcelAuditSummary | null;
    fileName: string;
    pendingAction?: () => void;
  }>({
    isOpen: false,
    summary: null,
    fileName: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(uploadedFiles));
    } catch (e) {}
  }, [uploadedFiles]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_ATHLETES_KEY, JSON.stringify(poolAthletes));
    } catch (e) {}
  }, [poolAthletes]);

  // Realtime sync from Firestore collection 'uploadedFiles'
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeUploadedFiles((fsFiles) => {
        if (fsFiles && fsFiles.length > 0) {
          setUploadedFiles((prev) => {
            const map = new Map<string, PoolFileItem>();
            // Keep existing local files first
            prev.forEach((f) => map.set(f.id, f));
            // Merge Firestore files
            fsFiles.forEach((ff) => {
              if (ff.id && !map.has(ff.id)) {
                map.set(ff.id, {
                  id: ff.id,
                  name: ff.name,
                  athleteCount: ff.athleteCount || 1,
                  status: ff.status || 'Bekliyor',
                  schoolName: ff.schoolName || 'Spor Okulu',
                  uploadDate: ff.uploadDate || new Date().toLocaleDateString('tr-TR'),
                });
              } else if (map.has(ff.id)) {
                const existing = map.get(ff.id)!;
                map.set(ff.id, { ...existing, status: ff.status || existing.status });
              }
            });
            return Array.from(map.values());
          });
        }
      });
    } catch (e) {
      console.warn('[DosyaHavuzuView] Firestore realtime subscribe error:', e);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const showToast = (text: string, actionText?: string, action?: () => void) => {
    setToastMessage({ text, actionText, action });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Upload & parse Excel or Image (PNG/JPEG) files via Multimodal AI
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const branding = getStoredLabSchoolBranding();
    const newFiles: PoolFileItem[] = [];
    const newAthletes: PoolAthleteItem[] = [];

    const nowFormatted = new Date().toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let brandedReports: SportsFlyLabReport[] = [];
        const isImage = file.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(file.name);

        if (isImage) {
          setIsOcrProcessing(true);
          const base64Str = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          try {
            const res = await fetch('/api/ai/ocr-athlete-sheet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: base64Str,
                mimeType: file.type || 'image/png',
                fileName: file.name,
              }),
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.athletes) && data.athletes.length > 0) {
              brandedReports = data.athletes.map((ocrItem: any) =>
                applyBrandingToReport(buildLabReportFromOcrAthlete(ocrItem, branding), branding)
              );
            }
          } catch (ocrErr) {
            console.error('OCR API error:', ocrErr);
          } finally {
            setIsOcrProcessing(false);
          }
        } else {
          const buffer = await file.arrayBuffer();
          const schemaValidation = validateExcelSchema(buffer);
          if (!schemaValidation.isValid) {
            showToast(
              `⚠️ Excel Şema Hatası (${file.name}): Eksik zorunlu sütunlar -> ${schemaValidation.missingColumns.join(', ')}`
            );
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          if (schemaValidation.warnings.length > 0) {
            console.warn(`Excel Uyarıları (${file.name}):`, schemaValidation.warnings);
          }

          const template = createNewLabReportWithBranding({
            athleteName: 'Geçici',
            sportBranch: 'Genel',
            gender: 'Erkek',
            ageYears: 12,
          });

          const reports = parseSportsFlyLabExcel(buffer, template, false);
          brandedReports = reports.map((r) => applyBrandingToReport(r, branding));
        }

        // If single file upload returned 0 reports, do not generate fake mock data
        if (brandedReports.length === 0) {
          showToast(`⚠️ Uyarı: "${file.name}" dosyasından geçerli sporcu satırı okunamadı. Lütfen Excel formatını kontrol edin.`);
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const fileId = `file-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
        const schoolName =
          brandedReports[0]?.clubName ||
          branding.schoolName ||
          'İSTANBUL ANADOLU OLİMPİK SPOR KULÜBÜ';

        const fileItem: PoolFileItem = {
          id: fileId,
          name: isImage ? `📸 ${file.name}` : file.name,
          athleteCount: brandedReports.length,
          status: 'Onaylandı',
          schoolName,
          uploadDate: nowFormatted,
        };

        newFiles.push(fileItem);

        // Async save metadata to Firestore collection 'uploadedFiles'
        saveUploadedFileToFirestore({
          id: fileId,
          name: fileItem.name,
          athleteCount: brandedReports.length,
          status: 'Onaylandı',
          schoolName,
          uploadDate: new Date().toISOString(),
          ownerId: 'system-user',
        }).catch((err) => console.warn('Firestore saveUploadedFileToFirestore error:', err));

        brandedReports.forEach((report) => {
          newAthletes.push({
            ...report,
            fileId,
            fileName: fileItem.name,
            approvalStatus: 'Onaylandı',
          });
        });
      } catch (err) {
        console.error(`Dosya okuma hatası (${file.name}):`, err);
      }
    }

    const normalizeName = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

    // UPSERT Files: If file already exists in pool with same name, update it; otherwise append
    setUploadedFiles((prev) => {
      const updated = [...prev];
      newFiles.forEach((newF) => {
        const idx = updated.findIndex((oldF) => oldF.name.toLowerCase() === newF.name.toLowerCase());
        if (idx >= 0) {
          updated[idx] = newF;
        } else {
          updated.push(newF);
        }
      });
      return updated;
    });

    // UPSERT Athletes: If athlete already exists in pool with matching name, update with latest Excel data!
    setPoolAthletes((prev) => {
      const updated = [...prev];
      newAthletes.forEach((newA) => {
        const normNew = normalizeName(newA.athleteName);
        const idx = updated.findIndex((oldA) => normalizeName(oldA.athleteName) === normNew);
        if (idx >= 0) {
          updated[idx] = {
            ...newA,
            approvalStatus: 'Onaylandı',
          };
        } else {
          updated.push(newA);
        }
      });
      return updated;
    });

    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';

    // Run Pre-Audit (Ön-Denetim) on the imported athletes
    if (newAthletes.length > 0) {
      const summary = auditImportedAthletes(
        newAthletes,
        files.length === 1 ? files[0].name : `${files.length} Adet Dosya`
      );
      setAuditModal({
        isOpen: true,
        summary,
        fileName: files.length === 1 ? files[0].name : `${files.length} Dosya`,
      });
    }

    showToast(
      `✓ ${newFiles.length} dosya ve ${newAthletes.length} sporcu verisi havuza eklendi ve doğrulandı.`
    );
  };

  // APPROVE FILE: Triggers system processing & unlocks "Karne Oluştur" for that file's athletes
  const handleApproveFile = async (fileId: string) => {
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (!file) return;

    // 1. Update file status to Onaylandı
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: 'Onaylandı' as const } : f)),
    );

    // 2. Update all athletes belonging to this fileId
    setPoolAthletes((prev) =>
      prev.map((a) =>
        a.fileId === fileId
          ? { ...a, approvalStatus: a.approvalStatus === 'Karne Oluşturuldu' ? 'Karne Oluşturuldu' : 'Onaylandı' }
          : a,
      ),
    );

    // 3. Persist to Firestore
    try {
      await saveUploadedFileToFirestore({
        id: file.id,
        name: file.name,
        athleteCount: file.athleteCount,
        status: 'Onaylandı',
        schoolName: file.schoolName,
        uploadDate: file.uploadDate,
        ownerId: 'system-user',
      });
    } catch (e) {
      console.warn('saveUploadedFileToFirestore firestore error:', e);
    }

    showToast(
      `✓ "${file.name}" dosyası onaylandı. ${file.athleteCount} sporcu verisi başarıyla işlendi ve 'Karne Oluştur' butonları aktifleşti!`,
    );
  };

  // APPROVE ALL FILES
  const handleApproveAll = async () => {
    const pendingFiles = uploadedFiles.filter((f) => f.status === 'Bekliyor');
    if (pendingFiles.length === 0) {
      showToast('Onay bekleyen dosya bulunmuyor.');
      return;
    }

    const pendingIds = new Set(pendingFiles.map((f) => f.id));

    setUploadedFiles((prev) =>
      prev.map((f) => (pendingIds.has(f.id) ? { ...f, status: 'Onaylandı' as const } : f)),
    );

    setPoolAthletes((prev) =>
      prev.map((a) =>
        pendingIds.has(a.fileId)
          ? { ...a, approvalStatus: a.approvalStatus === 'Karne Oluşturuldu' ? 'Karne Oluşturuldu' : 'Onaylandı' }
          : a,
      ),
    );

    for (const f of pendingFiles) {
      saveUploadedFileToFirestore({
        id: f.id,
        name: f.name,
        athleteCount: f.athleteCount,
        status: 'Onaylandı',
        schoolName: f.schoolName,
        uploadDate: f.uploadDate,
        ownerId: 'system-user',
      }).catch(() => {});
    }

    showToast(`✓ Tüm bekleyen ${pendingFiles.length} dosya onaylandı. Sporcu karneleri oluşturulmaya hazır!`);
  };

  // DELETE FILE FROM POOL
  const handleDeleteFile = (fileId: string, fileName: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Dosyayı Sil',
      message: `"${fileName}" dosyasını ve havuza eklenen tüm sporcu verilerini silmek istediğinize emin misiniz?`,
      onConfirm: () => executeDeleteFile(fileId, fileName),
    });
  };

  const executeDeleteFile = (fileId: string, fileName: string) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      try { localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setPoolAthletes((prev) => {
      const next = prev.filter((a) => a.fileId !== fileId);
      try { localStorage.setItem(LOCAL_ATHLETES_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
    deleteUploadedFileFromFirestore(fileId).catch(() => {});
    if (selectedFileFilter === fileId) setSelectedFileFilter(null);
    showToast(`"${fileName}" dosyası ve ilişkili sporcu verileri havuzdan silindi.`);
    setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // DELETE SINGLE ATHLETE FROM POOL
  const handleDeleteAthlete = (athleteId: string, athleteName: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Sporcuyu Sil',
      message: `"${athleteName}" isimli sporcuyu havuzdan silmek istediğinize emin misiniz?`,
      onConfirm: () => executeDeleteAthlete(athleteId, athleteName),
    });
  };

  const executeDeleteAthlete = (athleteId: string, athleteName: string) => {
    setPoolAthletes((prev) => {
      const next = prev.filter((a) => a.id !== athleteId);
      try { localStorage.setItem(LOCAL_ATHLETES_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
    showToast(`"${athleteName}" sporcusu havuzdan silindi.`);
    setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // DELETE ALL FILES BELONGING TO A SPORTS SCHOOL
  const handleDeleteSchoolFiles = (schoolName: string) => {
    const schoolFiles = uploadedFiles.filter((f) => (f.schoolName || 'Spor Okulu') === schoolName);
    if (schoolFiles.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Kulüp Dosyalarını Sil',
      message: `"${schoolName}" kurumuna ait ${schoolFiles.length} Excel dosyasını ve tüm sporcularını havuzdan silmek istediğinize emin misiniz?`,
      onConfirm: () => executeDeleteSchoolFiles(schoolName, schoolFiles),
    });
  };

  const executeDeleteSchoolFiles = (schoolName: string, schoolFiles: PoolFileItem[]) => {
    const fileIds = new Set<string>(schoolFiles.map((f) => f.id));
    setUploadedFiles((prev) => {
      const next = prev.filter((f) => !fileIds.has(f.id));
      try { localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setPoolAthletes((prev) => {
      const next = prev.filter((a) => !fileIds.has(a.fileId));
      try { localStorage.setItem(LOCAL_ATHLETES_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
    fileIds.forEach((id: string) => deleteUploadedFileFromFirestore(id).catch(() => {}));
    if (selectedFileFilter && fileIds.has(selectedFileFilter)) setSelectedFileFilter(null);
    showToast(`"${schoolName}" kurumuna ait tüm dosyalar ve sporcular silindi.`);
    setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // CLEAR ENTIRE POOL
  const handleClearAllPool = () => {
    if (uploadedFiles.length === 0 && poolAthletes.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Tüm Havuzu Temizle',
      message: 'Tüm dosya havuzunu ve yüklenen tüm sporcu verilerini tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      onConfirm: () => executeClearAllPool(),
    });
  };

  const executeClearAllPool = () => {
    uploadedFiles.forEach((f) => deleteUploadedFileFromFirestore(f.id).catch(() => {}));
    setUploadedFiles([]);
    setPoolAthletes([]);
    try {
      localStorage.removeItem(LOCAL_FILES_KEY);
      localStorage.removeItem(LOCAL_ATHLETES_KEY);
    } catch (e) {}
    setSelectedFileFilter(null);
    showToast('Tüm dosya havuzu ve yüklenen veriler temizlendi.');
    setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // CREATE OR UPDATE REPORT CARD FOR AN APPROVED ATHLETE (Saved to SportsFly LAB reports)
  const handleCreateKarne = async (athlete: PoolAthleteItem) => {
    const branding = getStoredLabSchoolBranding();
    const labReport = applyBrandingToReport(athlete, branding);
    const existingLabReports = getStoredLabReports();
    
    const normalizeName = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
    const targetName = normalizeName(athlete.athleteName);

    // Check if already exists by ID or Normalized Name
    const existsIndex = existingLabReports.findIndex(
      (k) => (k.id && athlete.id && k.id === athlete.id) || (k.athleteName && normalizeName(k.athleteName) === targetName)
    );

    let updatedReports = [...existingLabReports];
    let targetReportId = labReport.id;

    if (existsIndex >= 0) {
      const existing = existingLabReports[existsIndex];
      // CRITICAL: Preserve existing report ID so that current active views/links don't become stale/orphaned
      targetReportId = existing.id;
      labReport.id = targetReportId;

      if (existing.athleteCode && !labReport.athleteCode) {
        labReport.athleteCode = existing.athleteCode;
      }

      // Re-run consistency and recalculation on the updated report
      ensureDataConsistency(labReport);
      labReport.aiRecommendations = analyzeLabPerformanceMetrics(labReport);

      updatedReports[existsIndex] = labReport;
    } else {
      ensureDataConsistency(labReport);
      labReport.aiRecommendations = analyzeLabPerformanceMetrics(labReport);
      updatedReports.unshift(labReport);
    }

    // 1. Save to local storage
    saveStoredLabReports(updatedReports);

    // 2. Update pool athlete status so the badge immediately reflects 'Karne Oluşturuldu'
    setPoolAthletes((prev) =>
      prev.map((a) =>
        a.id === athlete.id || normalizeName(a.athleteName) === targetName
          ? { ...a, ...labReport, approvalStatus: 'Karne Oluşturuldu' as const }
          : a
      )
    );

    // 3. Dispatch a global CustomEvent to immediately update any listening mounted views (SportsFlyLabView, etc.)
    window.dispatchEvent(
      new CustomEvent('sportsfly_reports_updated', {
        detail: { reportId: targetReportId, report: labReport },
      })
    );

    // 4. Instantly notify & transition to the active live report card view
    if (onNavigateToReport) {
      onNavigateToReport(targetReportId);
    } else if (onNavigate) {
      onNavigate('sportsfly-lab');
    }

    showToast(
      `✓ "${athlete.athleteName}" için karne en son Excel verileriyle güncellendi ve anlık ekrana yüklendi!`
    );
  };

  const existingReportNames = useMemo(() => {
    try {
      const list = getStoredLabReports();
      return new Set(
        list.map((r) => (r.athleteName || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR'))
      );
    } catch (e) {
      return new Set<string>();
    }
  }, [poolAthletes]);

  // Filtered Athletes
  const filteredAthletes = useMemo(() => {
    return poolAthletes.filter((athlete) => {
      // File filter
      if (selectedFileFilter && athlete.fileId !== selectedFileFilter) return false;

      // Status filter
      if (statusFilter === 'Bekliyor' && athlete.approvalStatus !== 'Bekliyor') return false;
      if (statusFilter === 'Onaylandı' && athlete.approvalStatus === 'Bekliyor') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = athlete.athleteName?.toLowerCase().includes(q);
        const matchBranch = athlete.sportBranch?.toLowerCase().includes(q);
        const matchClub = athlete.clubName?.toLowerCase().includes(q);
        const matchFile = athlete.fileName?.toLowerCase().includes(q);
        if (!matchName && !matchBranch && !matchClub && !matchFile) return false;
      }

      return true;
    });
  }, [poolAthletes, selectedFileFilter, statusFilter, searchQuery]);

  // Group files by sports school name
  const groupedFiles = useMemo<Record<string, PoolFileItem[]>>(() => {
    const map: Record<string, PoolFileItem[]> = {};
    uploadedFiles.forEach((file) => {
      const school = file.schoolName || 'Spor Okulu';
      if (!map[school]) map[school] = [];
      map[school].push(file);
    });
    return map;
  }, [uploadedFiles]);

  const pendingFilesCount = uploadedFiles.filter((f) => f.status === 'Bekliyor').length;
  const approvedFilesCount = uploadedFiles.filter((f) => f.status === 'Onaylandı').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
          {toastMessage.action && (
            <button
              onClick={toastMessage.action}
              className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
            >
              {toastMessage.actionText || 'Görüntüle'}
            </button>
          )}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Dosya Havuzu (Performans Veri Havuzu)</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Spor okullarından toplu yüklenen Excel ölçüm dosyalarını onaylayın, sporcu verilerini işleyin ve karneler oluşturun.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('sporcu-karnesi')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Award className="w-4 h-4 text-blue-600" />
              <span>Kulüp Karneleri</span>
            </button>
          )}

          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition cursor-pointer"
            title="Excel tablosundan aldığınız ekran görüntüsünü (JPEG veya PNG) yükleyin; yapay zeka tüm sporcu verilerini piksellerden anında okur."
          >
            {isOcrProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <span>{isOcrProcessing ? 'Görsel Taranıyor...' : '📸 Ekran Görüntüsü Yükle (PNG / JPEG)'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            {isProcessing && !isOcrProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isProcessing && !isOcrProcessing ? 'Yükleniyor...' : 'Excel Dosyası Yükle'}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv, .png, .jpg, .jpeg"
            className="hidden"
            multiple
          />

          <input
            type="file"
            ref={imageInputRef}
            onChange={handleFileUpload}
            accept=".png, .jpg, .jpeg, image/png, image/jpeg"
            className="hidden"
            multiple
          />
        </div>
      </div>

      {/* Overview Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toplam Dosya</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{uploadedFiles.length} Dosya</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Onay Bekleyenler</span>
            <div className="text-xl font-black text-amber-600 mt-0.5">{pendingFilesCount} Dosya</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Onaylanan & İşlenen</span>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{approvedFilesCount} Dosya</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: UPLOADED FILES GROUPED BY SPORTS SCHOOL */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>1. Yüklenen Excel Dosyaları (Spor Okuluna Göre Gruplu)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tüm yüklenen Excel dosyaları burada listelenir. 'Onayla' butonuna tıklayarak sporcu verilerinin işlenmesini başlatabilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {pendingFilesCount > 0 && (
              <button
                onClick={handleApproveAll}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Tüm Bekleyenleri Onayla ({pendingFilesCount})</span>
              </button>
            )}

            {uploadedFiles.length > 0 && (
              <button
                onClick={handleClearAllPool}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Tüm yüklenen dosyaları ve sporcu verilerini havuzdan tamamen silin"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Tüm Havuzu Temizle</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Dosya Adı</th>
                <th className="px-4 py-3">Yükleme Tarihi</th>
                <th className="px-4 py-3">Sporcu Sayısı</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.entries(groupedFiles) as [string, PoolFileItem[]][]).map(([schoolName, files]) => (
                <React.Fragment key={schoolName}>
                  {/* Sports School Header Row */}
                  <tr className="bg-slate-100/90 border-t border-b border-slate-200">
                    <td colSpan={5} className="px-4 py-2 font-black text-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-600" />
                          <span>{schoolName}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 ml-2">
                            {files.length} Dosya
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteSchoolFiles(schoolName)}
                          className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100/70 rounded-md font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          title="Bu kuruma ait tüm Excel dosyalarını ve sporcuları sil"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Kulüp Dosyalarını Sil</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* File Rows */}
                  {files.map((file) => {
                    const isApproved = file.status === 'Onaylandı' || file.status === 'İşlendi';
                    const isSelected = selectedFileFilter === file.id;

                    return (
                      <tr
                        key={file.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{file.name}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-sans tabular-nums">{file.uploadDate}</td>
                        <td className="px-4 py-3 font-bold text-slate-700 font-sans tabular-nums">
                          {file.athleteCount} Sporcu
                        </td>
                        <td className="px-4 py-3">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>İşlendi & Onaylandı</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Onay Bekliyor</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Preview Button */}
                            <button
                              onClick={() => {
                                if (isSelected) setSelectedFileFilter(null);
                                else setSelectedFileFilter(file.id);
                              }}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                              title="Bu dosyadaki sporcuları listede filtreleyin"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isSelected ? 'Filtreyi Kaldır' : 'Önizle'}</span>
                            </button>

                            {/* Approve Button */}
                            {!isApproved && (
                              <button
                                onClick={() => handleApproveFile(file.id)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                title="Dosyayı onaylayın ve sporcular için karne oluşturmayı aktifleştirin"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Onayla</span>
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteFile(file.id, file.name)}
                              className="px-2.5 py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200/80 hover:border-rose-300 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                              title="Bu Excel dosyasını ve ilişkili sporcularını havuzdan tamamen silin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Sil</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}

              {uploadedFiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <FilePlus className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-400" />
                    <p className="font-bold text-slate-700 text-sm">Henüz havuzda Excel dosyası bulunmuyor.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Yukarıdaki 'Yeni Excel Dosyası Yükle' butonuna tıklayarak spor okullarından gelen verileri havuza ekleyebilirsiniz.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: ATHLETE PREVIEW & KARNE CREATION TABLE */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>2. Sporcu Önizleme & Karne Oluşturma</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              İlgili dosya onaylandığında 'Karne Oluştur' butonu aktifleşir ve sporcu karnesi sistemine kaydedilir.
            </p>
          </div>

          {/* Status & Search Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedFileFilter && (
              <button
                onClick={() => setSelectedFileFilter(null)}
                className="px-2.5 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <span>Filtreli Dosya</span>
                <span className="font-black">×</span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter('Tümü')}
                className={`px-3 py-1 rounded-lg transition ${
                  statusFilter === 'Tümü' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Tümü ({poolAthletes.length})
              </button>
              <button
                onClick={() => setStatusFilter('Bekliyor')}
                className={`px-3 py-1 rounded-lg transition ${
                  statusFilter === 'Bekliyor' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                Bekleyenler
              </button>
              <button
                onClick={() => setStatusFilter('Onaylandı')}
                className={`px-3 py-1 rounded-lg transition ${
                  statusFilter === 'Onaylandı' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                Onaylananlar
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Sporcu veya kulüp ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none w-48"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Sporcu Adı</th>
                <th className="px-4 py-3">Spor Okulu & Branş</th>
                <th className="px-4 py-3">Kaynak Dosya</th>
                <th className="px-4 py-3">Onay Durumu</th>
                <th className="px-4 py-3 text-right">Karne İşlemi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAthletes.map((athlete, index) => {
                const parentFile = uploadedFiles.find(
                  (f) =>
                    f.id === athlete.fileId ||
                    f.name.toLowerCase() === (athlete.fileName || '').toLowerCase()
                );
                const isFileApproved = parentFile
                  ? parentFile.status === 'Onaylandı' || parentFile.status === 'İşlendi'
                  : true;
                const normAthName = (athlete.athleteName || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
                const isKarneCreated = athlete.approvalStatus === 'Karne Oluşturuldu' || existingReportNames.has(normAthName);

                return (
                  <tr key={`${athlete.id}-${index}`} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div>{athlete.athleteName}</div>
                      <div className="text-[10px] font-normal text-slate-400">{athlete.athleteCode || 'SF-2026'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{athlete.clubName || 'Spor Okulu'}</div>
                      <div className="text-[10px] text-indigo-600 font-bold">{athlete.sportBranch || 'Genel Spor'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      <div className="truncate max-w-xs">{athlete.fileName}</div>
                    </td>
                    <td className="px-4 py-3">
                      {isKarneCreated ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          <span>Karne Oluşturuldu</span>
                        </span>
                      ) : isFileApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>İşleme Hazır (Onaylı)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Dosya Onayı Bekliyor</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isFileApproved ? (
                          <>
                            <button
                              onClick={() => handleCreateKarne(athlete)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                                isKarneCreated
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              title={
                                isKarneCreated
                                  ? 'Bu sporcunun karnesini en son Excel verileriyle güncelle ve anlık karnede aç'
                                  : 'Bu sporcu için karne oluştur ve anlık karnede aç'
                              }
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              <span>{isKarneCreated ? 'Karneyi Güncelle' : 'Karne Oluştur'}</span>
                            </button>
                            {isKarneCreated && (
                              <button
                                onClick={() => {
                                  const existingList = getStoredLabReports();
                                  const normalizeName = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
                                  const targetName = normalizeName(athlete.athleteName);
                                  const match = existingList.find(
                                    (r) => (r.id && athlete.id && r.id === athlete.id) || normalizeName(r.athleteName) === targetName
                                  );
                                  const targetId = match ? match.id : athlete.id;
                                  if (onNavigateToReport) onNavigateToReport(targetId);
                                  else if (onNavigate) onNavigate('sportsfly-lab');
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Anlık karneyi görüntüle"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Görüntüle</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            disabled
                            className="px-3.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed opacity-75"
                            title="Bu sporcunun karnesini oluşturabilmek için yukarıdaki listeden ait olduğu dosyayı 'Onayla' butonuna tıklayarak onaylayın."
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Önce Dosyayı Onayla</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteAthlete(athlete.id, athlete.athleteName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200/80 hover:border-rose-200 transition cursor-pointer"
                          title="Bu sporcuyu havuzdan kaldır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAthletes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <FilePlus className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-400" />
                    <p className="font-bold text-slate-700 text-sm">Filtrenize uygun sporcu verisi bulunamadı.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Custom Confirmation Modal for Deletion */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{deleteConfirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Lütfen silme işlemini onaylayın.</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {deleteConfirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={deleteConfirmModal.onConfirm}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Evet, Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Audit (Ön-Denetim) Modal */}
      <ExcelDataAuditModal
        isOpen={auditModal.isOpen}
        summary={auditModal.summary}
        fileName={auditModal.fileName}
        onClose={() => setAuditModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirmAll={() => {
          setAuditModal((prev) => ({ ...prev, isOpen: false }));
          showToast('✓ Tüm sporcu verileri doğrulandı ve karne havuzunda onaylandı.');
        }}
      />
    </div>
  );
};
