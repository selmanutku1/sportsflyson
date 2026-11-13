import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Filter,
  Check,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  SportsFlyLabReport,
  sanitizeAndEnforceNumber,
  isLabRowMeasured,
  ensureDataConsistency,
  analyzeLabPerformanceMetrics,
} from '../../data/sportsFlyLabData';

export type AuditSeverity = 'error' | 'warning' | 'info';

export interface AuditIssueEditTarget {
  section: 'profile' | 'body' | 'motor' | 'parent';
  key: string;
  inputType?: 'text' | 'number';
}

export interface AuditIssue {
  fieldId: string;
  fieldName: string;
  category: 'Kimlik' | 'Beden Kompozisyonu' | 'Motor Performans' | 'Ebeveyn' | 'Diğer';
  rawVal: any;
  cleanedVal: any;
  severity: AuditSeverity;
  message: string;
  fixRecommendation?: string;
  editTarget?: AuditIssueEditTarget;
}

export interface AthleteAuditResult {
  athlete: SportsFlyLabReport;
  athleteIndex: number;
  fileName?: string;
  issues: AuditIssue[];
  errorCount: number;
  warningCount: number;
  hasCriticalErrors: boolean;
  score: number; // 0 - 100 validation score
}

export interface ExcelAuditSummary {
  totalAthletes: number;
  cleanAthletesCount: number;
  warningAthletesCount: number;
  errorAthletesCount: number;
  totalIssuesCount: number;
  results: AthleteAuditResult[];
  rawRows?: Record<string, any>[];
}

function inferEditTargetFromRawKey(rawKey: string): AuditIssueEditTarget | undefined {
  const k = (rawKey || '').toLowerCase();
  if (k.includes('anne') && k.includes('boy')) return { section: 'parent', key: 'anneBoy', inputType: 'number' };
  if (k.includes('baba') && k.includes('boy')) return { section: 'parent', key: 'babaBoy', inputType: 'number' };
  if (k.includes('flamingo') || k.includes('denge')) return { section: 'motor', key: 'balance', inputType: 'number' };
  if (k.includes('20m') || k.includes('sprint') || k.includes('sürat')) {
    if (k.includes('kol')) {
      return { section: 'motor', key: k.includes('sol') ? 'arm_speed_left' : 'arm_speed_right', inputType: 'number' };
    }
    return { section: 'motor', key: 'sprint', inputType: 'number' };
  }
  if (k.includes('kol') && (k.includes('sürat') || k.includes('tap'))) {
    return { section: 'motor', key: k.includes('sol') ? 'arm_speed_left' : 'arm_speed_right', inputType: 'number' };
  }
  if (k.includes('10x5') || k.includes('çabukluk') || k.includes('çeviklik')) return { section: 'motor', key: 'agility', inputType: 'number' };
  if (k.includes('dikey') && k.includes('sıçrama')) return { section: 'motor', key: 'vertical_jump', inputType: 'number' };
  if (k.includes('uzun atlama')) return { section: 'motor', key: 'standing_long_jump', inputType: 'number' };
  if (k.includes('esneklik') || k.includes('otur')) return { section: 'motor', key: 'flexibility', inputType: 'number' };
  if (k.includes('reaksiyon')) return { section: 'motor', key: 'reaction', inputType: 'number' };
  if (k.includes('pençe') || k.includes('kavrama')) {
    return { section: 'motor', key: k.includes('sol') ? 'grip_strength_left' : 'grip_strength_right', inputType: 'number' };
  }
  if (k.includes('sırt')) return { section: 'motor', key: 'back_strength', inputType: 'number' };
  if (k.includes('boy')) return { section: 'body', key: 'height', inputType: 'number' };
  if (k.includes('kilo') || k.includes('ağırlık')) return { section: 'body', key: 'weight', inputType: 'number' };
  if (k.includes('yağ')) return { section: 'body', key: 'body_fat', inputType: 'number' };
  if (k.includes('triceps')) return { section: 'body', key: 'triceps', inputType: 'number' };
  if (k.includes('subscapula')) return { section: 'body', key: 'subscapula', inputType: 'number' };
  return undefined;
}

export function applyAuditFieldEdit(
  athlete: SportsFlyLabReport,
  target: AuditIssueEditTarget,
  rawNewValue: string
): SportsFlyLabReport {
  const cloned: SportsFlyLabReport = JSON.parse(JSON.stringify(athlete));
  const trimmed = rawNewValue.trim();

  if (target.section === 'profile') {
    if (target.key === 'athleteName') {
      cloned.athleteName = trimmed || cloned.athleteName;
    } else if (target.key === 'sportBranch') {
      cloned.sportBranch = trimmed || 'Genel Spor Gelişimi';
      if (cloned.somatotype?.eliteRef) {
        cloned.somatotype.eliteRef.sport = cloned.sportBranch;
      }
    } else if (target.key === 'ageYears') {
      const n = sanitizeAndEnforceNumber(trimmed, cloned.ageYears);
      if (n > 0) {
        cloned.ageYears = n;
        cloned.ageMonths = Math.round(n * 12);
      }
    }
  } else if (target.section === 'body') {
    const numVal = sanitizeAndEnforceNumber(trimmed, 0);
    const row = cloned.bodyComposition?.find((b) => b.id === target.key);
    if (row) {
      row.m1 = numVal;
      row.measured = numVal > 0;
    }
    const hRow = cloned.bodyComposition?.find((b) => b.id === 'height');
    const wRow = cloned.bodyComposition?.find((b) => b.id === 'weight');
    const bmiRow = cloned.bodyComposition?.find((b) => b.id === 'bmi');
    if (bmiRow && hRow && wRow && hRow.m1 > 50 && wRow.m1 > 5) {
      bmiRow.m1 = Number((wRow.m1 / Math.pow(hRow.m1 / 100, 2)).toFixed(2));
      bmiRow.measured = true;
    }
  } else if (target.section === 'motor') {
    const numVal = sanitizeAndEnforceNumber(trimmed, 0);
    const row = cloned.motorPerformance?.find((m) => m.id === target.key);
    if (row) {
      row.m1 = Math.max(0, numVal);
      row.measured = target.key === 'balance' ? trimmed !== '' : numVal > 0;
    }
  } else if (target.section === 'parent') {
    if (!cloned.parentInfo) {
      cloned.parentInfo = {};
    }
    if (target.key === 'anneBoy') {
      cloned.parentInfo.anneBoy = trimmed;
    } else if (target.key === 'babaBoy') {
      cloned.parentInfo.babaBoy = trimmed;
    }
    const pAnne = sanitizeAndEnforceNumber(cloned.parentInfo.anneBoy, 0);
    const pBaba = sanitizeAndEnforceNumber(cloned.parentInfo.babaBoy, 0);
    if (pAnne > 120 && pBaba > 120) {
      const isFemale = cloned.gender === 'Kadın';
      const midParent = isFemale ? (pAnne + pBaba - 13) / 2 : (pAnne + pBaba + 13) / 2;
      cloned.predictedAdultHeight = Number(midParent.toFixed(1));
    } else {
      cloned.predictedAdultHeight = 0;
    }
  }

  ensureDataConsistency(cloned);
  cloned.aiRecommendations = analyzeLabPerformanceMetrics(cloned);
  return cloned;
}

/**
 * Runs an in-depth audit on athletes imported from Excel.
 * Inspects numeric validity, text-based values, missing parameters, and biomechanical boundaries.
 */
export function auditImportedAthletes(
  athletes: SportsFlyLabReport[],
  sourceFileName?: string,
  rawRows?: Record<string, any>[],
  editedKeysByAthleteId?: Record<string, string[]>
): ExcelAuditSummary {
  const results: AthleteAuditResult[] = athletes.map((athlete, idx) => {
    const rawRow = rawRows && rawRows[idx] ? rawRows[idx] : undefined;
    const editedKeys = editedKeysByAthleteId?.[athlete.id] || [];
    const issues: AuditIssue[] = [];

    // 1. Identity & Profile
    if (!athlete.athleteName || athlete.athleteName.trim().length < 2 || athlete.athleteName.toLowerCase().includes('geçici')) {
      issues.push({
        fieldId: 'athleteName',
        fieldName: 'Sporcu Adı',
        category: 'Kimlik',
        rawVal: athlete.athleteName,
        cleanedVal: athlete.athleteName,
        severity: 'error',
        message: 'Sporcu adı eksik veya geçersiz görünüyor.',
        fixRecommendation: 'Excel dosyasında "Adı Soyadı" sütununu kontrol edin.',
        editTarget: { section: 'profile', key: 'athleteName', inputType: 'text' },
      });
    }

    if (!athlete.sportBranch || athlete.sportBranch === 'Genel' || athlete.sportBranch === 'Genel Spor Gelişimi') {
      issues.push({
        fieldId: 'sportBranch',
        fieldName: 'Spor Branşı',
        category: 'Kimlik',
        rawVal: athlete.sportBranch,
        cleanedVal: athlete.sportBranch,
        severity: 'info',
        message: 'Belirli bir branş belirtilmemiş, genel gelişim şablonu uygulandı.',
        fixRecommendation: 'Excelde "Branş" sütununa (örn. Voleybol) değer girilebilir.',
        editTarget: { section: 'profile', key: 'sportBranch', inputType: 'text' },
      });
    }

    if (!athlete.ageYears || athlete.ageYears < 5 || athlete.ageYears > 35) {
      issues.push({
        fieldId: 'ageYears',
        fieldName: 'Takvim Yaşı',
        category: 'Kimlik',
        rawVal: athlete.ageYears,
        cleanedVal: athlete.ageYears,
        severity: 'warning',
        message: `Yaş değeri (${athlete.ageYears}) standart altyapı yaş normlarının (5-30 yaş) dışında.`,
        fixRecommendation: 'Doğum tarihi veya yaş sütununu kontrol edin.',
        editTarget: { section: 'profile', key: 'ageYears', inputType: 'number' },
      });
    }

    // 2. Body Composition Audits
    const findBody = (id: string) => athlete.bodyComposition?.find((b) => b.id === id);
    const heightRow = findBody('height');
    const weightRow = findBody('weight');
    const bmiRow = findBody('bmi');

    const hVal = heightRow?.m1 || 0;
    if (hVal <= 0) {
      issues.push({
        fieldId: 'height',
        fieldName: 'Boy Uzunluğu (cm)',
        category: 'Beden Kompozisyonu',
        rawVal: hVal,
        cleanedVal: 0,
        severity: 'error',
        message: 'Boy ölçümü (1. Dönem) boş veya 0 olarak okundu.',
        fixRecommendation: 'Boy değeri olmadan PHV, BKİ ve somatotip hesaplanamaz.',
        editTarget: { section: 'body', key: 'height', inputType: 'number' },
      });
    } else if (hVal < 100 || hVal > 225) {
      issues.push({
        fieldId: 'height',
        fieldName: 'Boy Uzunluğu (cm)',
        category: 'Beden Kompozisyonu',
        rawVal: hVal,
        cleanedVal: hVal,
        severity: 'warning',
        message: `Boy değeri (${hVal} cm) olağandışı aralıkta (100 - 225 cm).`,
        fixRecommendation: 'Metre yerine santimetre cinsinden girildiğinden emin olun.',
        editTarget: { section: 'body', key: 'height', inputType: 'number' },
      });
    }

    const wVal = weightRow?.m1 || 0;
    if (wVal <= 0) {
      issues.push({
        fieldId: 'weight',
        fieldName: 'Vücut Ağırlığı (kg)',
        category: 'Beden Kompozisyonu',
        rawVal: wVal,
        cleanedVal: 0,
        severity: 'error',
        message: 'Vücut ağırlığı ölçümü (1. Dönem) boş veya 0.',
        fixRecommendation: 'Kilo değeri olmadan BKİ ve kuvvet katsayıları hesaplanamaz.',
        editTarget: { section: 'body', key: 'weight', inputType: 'number' },
      });
    } else if (wVal < 15 || wVal > 160) {
      issues.push({
        fieldId: 'weight',
        fieldName: 'Vücut Ağırlığı (kg)',
        category: 'Beden Kompozisyonu',
        rawVal: wVal,
        cleanedVal: wVal,
        severity: 'warning',
        message: `Vücut ağırlığı (${wVal} kg) sınır değerlerin dışında.`,
        fixRecommendation: 'Excel hücresindeki değeri teyit edin.',
        editTarget: { section: 'body', key: 'weight', inputType: 'number' },
      });
    }

    // Skinfold sanity checks
    const tricepsRow = findBody('triceps');
    if (tricepsRow && tricepsRow.m1 > 50) {
      issues.push({
        fieldId: 'triceps',
        fieldName: 'Triceps Deri Kıvrımı (mm)',
        category: 'Beden Kompozisyonu',
        rawVal: tricepsRow.m1,
        cleanedVal: tricepsRow.m1,
        severity: 'warning',
        message: `Triceps deri kıvrımı ${tricepsRow.m1} mm çok yüksek bir değer.`,
        editTarget: { section: 'body', key: 'triceps', inputType: 'number' },
      });
    }

    // 3. Motor Performance Audits
    const findMotor = (id: string) => athlete.motorPerformance?.find((m) => m.id === id);
    const sprintRow = findMotor('sprint');
    const jumpRow = findMotor('vertical_jump');
    const balanceRow = findMotor('balance');

    if (sprintRow && sprintRow.m1 > 0) {
      if (sprintRow.m1 < 2.0 || sprintRow.m1 > 9.0) {
        issues.push({
          fieldId: 'sprint',
          fieldName: '20 Metre Sprint (sn)',
          category: 'Motor Performans',
          rawVal: sprintRow.m1,
          cleanedVal: sprintRow.m1,
          severity: 'warning',
          message: `20m Sprint süresi (${sprintRow.m1} sn) fizyolojik sınırların dışında (2.0 - 9.0 sn).`,
          fixRecommendation: 'Dakika veya salise formatı yerine saniye girildiğinden emin olun.',
          editTarget: { section: 'motor', key: 'sprint', inputType: 'number' },
        });
      }
    } else {
      issues.push({
        fieldId: 'sprint',
        fieldName: '20 Metre Sprint',
        category: 'Motor Performans',
        rawVal: 'Ölçülmedi',
        cleanedVal: '—',
        severity: 'info',
        message: '20m sprint ölçümü Excelde yer almıyor (karnede boş bırakılacak).',
        editTarget: { section: 'motor', key: 'sprint', inputType: 'number' },
      });
    }

    if (jumpRow && jumpRow.m1 > 0) {
      if (jumpRow.m1 < 5 || jumpRow.m1 > 95) {
        issues.push({
          fieldId: 'vertical_jump',
          fieldName: 'Dikey Sıçrama (cm)',
          category: 'Motor Performans',
          rawVal: jumpRow.m1,
          cleanedVal: jumpRow.m1,
          severity: 'warning',
          message: `Dikey sıçrama (${jumpRow.m1} cm) beklenenden çok farklı (5 - 95 cm aralığı).`,
          editTarget: { section: 'motor', key: 'vertical_jump', inputType: 'number' },
        });
      }
    }

    if (balanceRow && isLabRowMeasured(balanceRow) && balanceRow.m1 === 0 && !editedKeys.includes('motor:balance')) {
      issues.push({
        fieldId: 'balance',
        fieldName: 'Flamingo Denge Testi',
        category: 'Motor Performans',
        rawVal: 'Başarısız / 0 hata',
        cleanedVal: 0,
        severity: 'info',
        message: 'Flamingo denge testi 0 (başarısız veya hatasız) olarak işlendi.',
        editTarget: { section: 'motor', key: 'balance', inputType: 'number' },
      });
    }

    // 4. Raw Row Inspection (detect Turkish commas, text strings, units)
    if (rawRow) {
      Object.entries(rawRow).forEach(([key, val]) => {
        const inferredTarget = inferEditTargetFromRawKey(key);
        const targetTrackKey = inferredTarget ? `${inferredTarget.section}:${inferredTarget.key}` : key;
        if (editedKeys.includes(targetTrackKey) || editedKeys.includes(key)) return;

        if (typeof val === 'string' && val.trim() !== '') {
          const lower = val.toLowerCase().trim();
          if (lower.includes('başarısız') || lower.includes('geçersiz') || lower.includes('kaldı')) {
            issues.push({
              fieldId: key,
              fieldName: key,
              category: 'Motor Performans',
              rawVal: val,
              cleanedVal: 0,
              severity: 'info',
              message: `"${val}" metni tespit edildi; otomatik olarak 0 (başarısız) değerine çevrildi.`,
              editTarget: inferredTarget,
            });
          } else if (/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(val) && /\d/.test(val)) {
            const num = sanitizeAndEnforceNumber(val, 0);
            issues.push({
              fieldId: key,
              fieldName: key,
              category: 'Diğer',
              rawVal: val,
              cleanedVal: num,
              severity: 'info',
              message: `Hücre metin içeriyordu ("${val}"); sayısal "${num}" olarak temizlendi.`,
              editTarget: inferredTarget,
            });
          }
        }
      });
    }

    // 5. Parent Info Audits
    if (athlete.parentInfo) {
      const aBoy = sanitizeAndEnforceNumber(athlete.parentInfo.anneBoy, 0);
      const bBoy = sanitizeAndEnforceNumber(athlete.parentInfo.babaBoy, 0);
      if (aBoy > 0 && (aBoy < 130 || aBoy > 210)) {
        issues.push({
          fieldId: 'anneBoy',
          fieldName: 'Anne Boy (cm)',
          category: 'Ebeveyn',
          rawVal: athlete.parentInfo.anneBoy,
          cleanedVal: aBoy,
          severity: 'warning',
          message: `Anne boyu (${aBoy} cm) standart dışı aralıkta.`,
          editTarget: { section: 'parent', key: 'anneBoy', inputType: 'number' },
        });
      }
      if (bBoy > 0 && (bBoy < 140 || bBoy > 225)) {
        issues.push({
          fieldId: 'babaBoy',
          fieldName: 'Baba Boy (cm)',
          category: 'Ebeveyn',
          rawVal: athlete.parentInfo.babaBoy,
          cleanedVal: bBoy,
          severity: 'warning',
          message: `Baba boyu (${bBoy} cm) standart dışı aralıkta.`,
          editTarget: { section: 'parent', key: 'babaBoy', inputType: 'number' },
        });
      }
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const score = Math.max(20, Math.round(100 - errorCount * 25 - warningCount * 8));

    return {
      athlete,
      athleteIndex: idx,
      fileName: sourceFileName || 'Excel Dosyası',
      issues,
      errorCount,
      warningCount,
      hasCriticalErrors: errorCount > 0,
      score,
    };
  });

  const cleanAthletesCount = results.filter((r) => r.errorCount === 0 && r.warningCount === 0).length;
  const warningAthletesCount = results.filter((r) => r.errorCount === 0 && r.warningCount > 0).length;
  const errorAthletesCount = results.filter((r) => r.errorCount > 0).length;
  const totalIssuesCount = results.reduce((acc, r) => acc + r.issues.length, 0);

  return {
    totalAthletes: athletes.length,
    cleanAthletesCount,
    warningAthletesCount,
    errorAthletesCount,
    totalIssuesCount,
    results,
    rawRows,
  };
}

export interface ExcelDataAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmAll: (updatedAthletes?: SportsFlyLabReport[]) => void;
  summary: ExcelAuditSummary | null;
  fileName?: string;
}

export const ExcelDataAuditModal: React.FC<ExcelDataAuditModalProps> = ({
  isOpen,
  onClose,
  onConfirmAll,
  summary,
  fileName,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning' | 'clean'>('all');
  const [searchAthlete, setSearchAthlete] = useState('');
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [editedAthletesMap, setEditedAthletesMap] = useState<Record<string, SportsFlyLabReport>>({});
  const [editedKeysByAthleteId, setEditedKeysByAthleteId] = useState<Record<string, string[]>>({});
  const [justSavedKey, setJustSavedKey] = useState<string | null>(null);

  React.useEffect(() => {
    setDraftValues({});
    setEditedAthletesMap({});
    setEditedKeysByAthleteId({});
    setJustSavedKey(null);
    if (summary) {
      const firstIssueRow =
        summary.results.find((r) => r.errorCount > 0) ||
        summary.results.find((r) => r.warningCount > 0);
      setExpandedAthleteId(firstIssueRow ? firstIssueRow.athlete.id : null);
    }
  }, [summary]);

  const liveSummary = useMemo(() => {
    if (!summary) return null;
    if (Object.keys(editedAthletesMap).length === 0) return summary;
    const mergedAthletes = summary.results.map(
      (r) => editedAthletesMap[r.athlete.id] || r.athlete
    );
    return auditImportedAthletes(
      mergedAthletes,
      fileName || summary.results[0]?.fileName,
      summary.rawRows,
      editedKeysByAthleteId
    );
  }, [summary, editedAthletesMap, editedKeysByAthleteId, fileName]);

  if (!isOpen || !liveSummary) return null;

  const handleApplyIssueFix = (
    athlete: SportsFlyLabReport,
    issue: AuditIssue,
    issueKey: string,
    overrideVal?: string
  ) => {
    if (!issue.editTarget) return;
    const valStr =
      overrideVal !== undefined
        ? overrideVal
        : draftValues[issueKey] ?? String(issue.cleanedVal ?? '');
    const updatedAthlete = applyAuditFieldEdit(athlete, issue.editTarget, valStr);
    const trackKey = `${issue.editTarget.section}:${issue.editTarget.key}`;
    setEditedAthletesMap((prev) => ({ ...prev, [athlete.id]: updatedAthlete }));
    setEditedKeysByAthleteId((prev) => ({
      ...prev,
      [athlete.id]: Array.from(
        new Set([...(prev[athlete.id] || []), trackKey, issue.fieldId])
      ),
    }));
    setJustSavedKey(issueKey);
    setTimeout(() => setJustSavedKey((cur) => (cur === issueKey ? null : cur)), 1800);
  };

  const editedCount = Object.keys(editedAthletesMap).length;

  const filteredResults = liveSummary.results.filter((res) => {
    if (filterSeverity === 'error' && res.errorCount === 0) return false;
    if (filterSeverity === 'warning' && (res.errorCount > 0 || res.warningCount === 0)) return false;
    if (filterSeverity === 'clean' && (res.errorCount > 0 || res.warningCount > 0)) return false;

    if (searchAthlete.trim()) {
      const q = searchAthlete.toLowerCase().trim();
      const matchName = res.athlete.athleteName?.toLowerCase().includes(q);
      const matchBranch = res.athlete.sportBranch?.toLowerCase().includes(q);
      if (!matchName && !matchBranch) return false;
    }
    return true;
  });

  const overallClean = liveSummary.errorAthletesCount === 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              overallClean ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              {overallClean ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Otomatik Veri Doğrulama Katmanı
                </span>
                {fileName && (
                  <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[220px]">
                    • {fileName}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                <span>Excel Yükleme Ön-Denetim Raporu</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Stats Summary Cards */}
        <div className="p-5 bg-slate-50/60 border-b border-slate-200/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Toplam Sporcu</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{liveSummary.totalAthletes}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Taranan satır sayısı</div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Kusursuz Veri</span>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{liveSummary.cleanAthletesCount}</div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">Hata veya uyarı yok</div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Düzeltilen / Uyarı</span>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{liveSummary.warningAthletesCount}</div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">Uyarıları aşağıdan düzenleyebilirsiniz</div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" />
                <span>Kritik Eksik</span>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-0.5">{liveSummary.errorAthletesCount}</div>
              <div className="text-[11px] text-rose-700/80 mt-0.5">Eksik boy / kilo vb.</div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="mt-3.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950 font-medium leading-relaxed">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong>Akıllı Veri Koruma &amp; Yerinde Düzeltme Aktif:</strong> Uyarı veya eksik veri tespit edilen satırları açarak <strong>&ldquo;İşlenen Veri&rdquo;</strong> alanından doğrudan düzeltebilir ve <strong>&ldquo;Düzelt&rdquo;</strong> butonuyla karneye yansıtabilirsiniz.
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtre:</span>
            </span>
            <button
              type="button"
              onClick={() => setFilterSeverity('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterSeverity === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Tümü ({liveSummary.totalAthletes})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity('error')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filterSeverity === 'error'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Kritik ({liveSummary.errorAthletesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity('warning')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filterSeverity === 'warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Uyarılar ({liveSummary.warningAthletesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity('clean')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filterSeverity === 'clean'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Temiz ({liveSummary.cleanAthletesCount})</span>
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchAthlete}
              onChange={(e) => setSearchAthlete(e.target.value)}
              placeholder="Sporcu adı veya branş ara..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 transition"
            />
          </div>
        </div>

        {/* Audit Details List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-100/40">
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <div className="font-bold text-slate-800 text-sm">Seçilen filtrede kayıt bulunamadı.</div>
              <div className="text-xs text-slate-400 mt-0.5">Tüm sporcuların doğrulaması başarıyla tamamlandı.</div>
            </div>
          ) : (
            filteredResults.map((res) => {
              const isExpanded = expandedAthleteId === res.athlete.id;
              const hasErrors = res.errorCount > 0;
              const hasWarnings = res.warningCount > 0;

              return (
                <div
                  key={res.athlete.id}
                  className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                    hasErrors
                      ? 'border-rose-300'
                      : hasWarnings
                      ? 'border-amber-300'
                      : 'border-slate-200/90'
                  }`}
                >
                  {/* Athlete Summary Row */}
                  <div
                    onClick={() => setExpandedAthleteId(isExpanded ? null : res.athlete.id)}
                    className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-sm">{res.athlete.athleteName}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {res.athlete.athleteCode || `SF-${res.athleteIndex + 101}`}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{res.athlete.sportBranch}</span>
                          <span>•</span>
                          <span>{res.athlete.gender}</span>
                          <span>•</span>
                          <span>{res.athlete.ageYears} Yaş</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Metric pills */}
                      <div className="hidden sm:flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold text-[11px]">
                          Boy: <strong>{res.athlete.bodyComposition?.find((b) => b.id === 'height')?.m1 || 0} cm</strong>
                        </span>
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold text-[11px]">
                          Kilo: <strong>{res.athlete.bodyComposition?.find((b) => b.id === 'weight')?.m1 || 0} kg</strong>
                        </span>
                      </div>

                      {/* Status badge */}
                      {hasErrors ? (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{res.errorCount} Kritik Eksik</span>
                        </span>
                      ) : hasWarnings ? (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{res.warningCount} Uyarı</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Doğrulandı</span>
                        </span>
                      )}

                      {/* Quality Score */}
                      <div className="w-10 text-right">
                        <span className={`text-xs font-black ${
                          res.score >= 90 ? 'text-emerald-600' : res.score >= 70 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          %{res.score}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Issues Drawer */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2.5 text-xs animate-in fade-in duration-100">
                      <div className="font-bold text-slate-700 text-xs mb-2">Denetim Bulguları ve Düzeltmeler:</div>
                      {res.issues.length === 0 ? (
                        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-800 font-medium flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Bu sporcunun tüm veri alanları geçerli, format kurallarına uygun ve eksiksizdir.</span>
                        </div>
                      ) : (
                        res.issues.map((issue, iIdx) => {
                          const issueKey = `${res.athlete.id}::${issue.fieldId}::${iIdx}`;
                          const currentDraft =
                            draftValues[issueKey] !== undefined
                              ? draftValues[issueKey]
                              : issue.cleanedVal === '—'
                              ? ''
                              : String(issue.cleanedVal ?? '');
                          const isSaved = justSavedKey === issueKey;
                          return (
                            <div
                              key={iIdx}
                              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                issue.severity === 'error'
                                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                  : issue.severity === 'warning'
                                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-900">{issue.fieldName}</span>
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    issue.severity === 'error'
                                      ? 'bg-rose-200 text-rose-900'
                                      : issue.severity === 'warning'
                                      ? 'bg-amber-200 text-amber-900'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {issue.category}
                                  </span>
                                </div>
                                <p className="text-[11.5px] leading-relaxed font-medium">{issue.message}</p>
                                {issue.fixRecommendation && (
                                  <p className="text-[11px] text-slate-500 italic mt-0.5">
                                    Öneri: {issue.fixRecommendation}
                                  </p>
                                )}
                              </div>

                              {issue.editTarget ? (
                                <div className="shrink-0 bg-white px-2.5 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-end gap-1">
                                  <span className="text-slate-400 text-[9.5px] uppercase font-sans font-bold">
                                    İşlenen Veri (Düzenlenebilir)
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={currentDraft}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) =>
                                        setDraftValues((prev) => ({
                                          ...prev,
                                          [issueKey]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleApplyIssueFix(res.athlete, issue, issueKey);
                                        }
                                      }}
                                      placeholder="Değer girin"
                                      className="w-24 px-2 py-1 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-xs font-black text-slate-900 font-sans tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyIssueFix(res.athlete, issue, issueKey);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer shrink-0 ${
                                        isSaved
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                      }`}
                                    >
                                      {isSaved ? 'Düzeltildi ✓' : 'Düzelt'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-right shrink-0 bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200/60 font-mono text-[11px]">
                                  <span className="text-slate-400 block text-[9.5px] uppercase font-sans font-bold">İşlenen Veri</span>
                                  <strong className="text-slate-900 font-black">{String(issue.cleanedVal)}</strong>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Toplam <strong className="text-slate-800">{liveSummary.totalAthletes} sporcu</strong> taranmıştır.{' '}
            {editedCount > 0 && (
              <span className="text-emerald-700 font-bold ml-1">
                ({editedCount} sporcuda veri düzeltildi)
              </span>
            )}
            {liveSummary.errorAthletesCount > 0 && (
              <span className="text-rose-600 font-bold ml-1">
                ({liveSummary.errorAthletesCount} sporcuda eksik veri bulunuyor)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => {
                // Commit any un-clicked draft inputs smoothly before closing
                let finalAthletes = liveSummary.results.map((r) => r.athlete);
                const pendingEntries = Object.entries(draftValues);
                if (pendingEntries.length > 0) {
                  finalAthletes = liveSummary.results.map((r) => {
                    let cur = r.athlete;
                    r.issues.forEach((iss, iIdx) => {
                      const k = `${r.athlete.id}::${iss.fieldId}::${iIdx}`;
                      if (iss.editTarget && draftValues[k] !== undefined) {
                        cur = applyAuditFieldEdit(cur, iss.editTarget, draftValues[k]);
                      }
                    });
                    return cur;
                  });
                }
                onConfirmAll(finalAthletes);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Verileri Onayla ve Havuzda İlerle</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
