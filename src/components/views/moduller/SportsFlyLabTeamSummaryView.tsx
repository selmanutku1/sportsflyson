import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  FileDown,
  FileSpreadsheet,
  Smartphone,
  Users,
  TrendingUp,
  Award,
  AlertTriangle,
  Search,
  Building2,
  ArrowUpRight,
  SlidersHorizontal,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import {
  SportsFlyLabReport,
  SportsFlyLabArchivedReport,
  SportsFlyLabSchoolBranding,
  getDisplayedMotorPerformance,
  getDisplayedBodyComposition,
  getActiveParamVal,
} from '../../../data/sportsFlyLabData';
import {
  exportContainerToMobileSmartA4Pdf,
  exportContainerToSmartA4Pdf,
} from '../../../utils/pdfExportHelper';
import { downloadBatchCategorizedKarneExcel } from '../../../utils/sportsFlyLabExcelExport';

type SummarySourceKey = 'batch' | 'studio' | 'archive' | 'all';

interface SportsFlyLabTeamSummaryViewProps {
  batchReports: SportsFlyLabReport[];
  studioReports: SportsFlyLabReport[];
  archivedReports: SportsFlyLabArchivedReport[];
  schoolBranding: SportsFlyLabSchoolBranding;
  onOpenReport: (report: SportsFlyLabReport) => void;
  onGoToBatch: () => void;
  onNotify: (msg: string) => void;
}

interface AthleteExecutiveRow {
  report: SportsFlyLabReport;
  schoolLabel: string;
  currentScore: number;
  initialScore: number;
  scoreDelta: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  avgPercentile: number | null;
  strongestMetric: string;
  weakestMetric: string;
  phvCategory: 'Pre-PHV' | 'Circa-PHV' | 'Post-PHV' | 'Belirsiz';
  normTier: 'high' | 'normal' | 'support';
}

interface MetricCohortStat {
  key: string;
  name: string;
  unit: string;
  count: number;
  avgValue: number;
  avgPercentile: number;
  highRatioPct: number;
  supportCount: number;
  lowerIsBetter: boolean;
}

function resolveAthleteScore(report: SportsFlyLabReport): {
  current: number;
  initial: number;
  delta: number | null;
} {
  const p1 = Number(report.scoreHistory?.p1Score || 0);
  const p2 = Number(report.scoreHistory?.p2Score || 0);
  const p3 = Number(report.scoreHistory?.p3Score || 0);

  const motorRows = getDisplayedMotorPerformance(report);
  const motorAvgPct =
    motorRows.length > 0
      ? Math.round(
          motorRows.reduce((sum, r) => sum + (Number(r.percentile) || 50), 0) / motorRows.length
        )
      : 0;

  let current = 0;
  if (p3 > 0) current = p3;
  else if (p2 > 0) current = p2;
  else if (p1 > 0) current = p1;
  else current = motorAvgPct;

  const initial = p1 > 0 ? p1 : current;
  const hasSecondPeriod = (p3 > 0 && p1 > 0) || (p2 > 0 && p1 > 0 && p2 !== p1);
  const delta = hasSecondPeriod ? Number((current - initial).toFixed(1)) : null;

  return {
    current: Number(current.toFixed(1)),
    initial: Number(initial.toFixed(1)),
    delta,
  };
}

function classifyPhv(report: SportsFlyLabReport): 'Pre-PHV' | 'Circa-PHV' | 'Post-PHV' | 'Belirsiz' {
  const status = (report.maturationStatus || '').toLowerCase();
  if (status.includes('zirve') || status.includes('circa') || status.includes('hızlı') || status.includes('atak')) {
    return 'Circa-PHV';
  }
  if (status.includes('sonra') || status.includes('post') || status.includes('tamamla')) {
    return 'Post-PHV';
  }
  if (status.includes('önce') || status.includes('pre') || status.includes('erken')) {
    return 'Pre-PHV';
  }
  if (report.phvAge > 0 && report.ageYears > 0) {
    const diff = report.ageYears - report.phvAge;
    if (Math.abs(diff) <= 0.75) return 'Circa-PHV';
    return diff < -0.75 ? 'Pre-PHV' : 'Post-PHV';
  }
  return 'Belirsiz';
}

function findBodyMetric(report: SportsFlyLabReport, keywords: string[]): number | null {
  const rows = getDisplayedBodyComposition(report);
  for (const row of rows) {
    const label = `${row.id} ${row.name}`.toLowerCase();
    if (keywords.some((k) => label.includes(k))) {
      const val = getActiveParamVal(row, 0);
      if (val > 0) return val;
    }
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const SportsFlyLabTeamSummaryView: React.FC<SportsFlyLabTeamSummaryViewProps> = ({
  batchReports,
  studioReports,
  archivedReports,
  schoolBranding,
  onOpenReport,
  onGoToBatch,
  onNotify,
}) => {
  const defaultSource: SummarySourceKey =
    batchReports.length > 0
      ? 'batch'
      : studioReports.length > 0
      ? 'studio'
      : archivedReports.length > 0
      ? 'archive'
      : 'all';

  const [sourceKey, setSourceKey] = useState<SummarySourceKey>(defaultSource);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Erkek' | 'Kadın'>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportingMobilePdf, setIsExportingMobilePdf] = useState<boolean>(false);
  const [isExportingStdPdf, setIsExportingStdPdf] = useState<boolean>(false);

  // Build deduplicated source pool with school labels
  const sourceEntries = useMemo(() => {
    const items: { report: SportsFlyLabReport; schoolLabel: string }[] = [];
    const seen = new Set<string>();

    const pushUnique = (report: SportsFlyLabReport, schoolLabel: string) => {
      const key = `${report.id || ''}_${report.athleteName}_${report.date1 || ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ report, schoolLabel });
    };

    if (sourceKey === 'batch' || sourceKey === 'all') {
      batchReports.forEach((r) =>
        pushUnique(r, r.clubName || schoolBranding.schoolName || 'Toplu Karne Grubu')
      );
    }
    if (sourceKey === 'studio' || sourceKey === 'all') {
      studioReports.forEach((r) =>
        pushUnique(r, r.clubName || schoolBranding.schoolName || 'Aktif Karne Stüdyosu')
      );
    }
    if (sourceKey === 'archive' || sourceKey === 'all') {
      archivedReports.forEach((a) =>
        pushUnique(
          a.reportSnapshot,
          a.schoolName || a.reportSnapshot.clubName || schoolBranding.schoolName || 'Karne Arşivi'
        )
      );
    }

    return items;
  }, [sourceKey, batchReports, studioReports, archivedReports, schoolBranding.schoolName]);

  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    sourceEntries.forEach(({ report }) => {
      if (report.sportBranch) set.add(report.sportBranch);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [sourceEntries]);

  const availableSchools = useMemo(() => {
    const set = new Set<string>();
    sourceEntries.forEach(({ schoolLabel }) => {
      if (schoolLabel) set.add(schoolLabel);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [sourceEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sourceEntries.filter(({ report, schoolLabel }) => {
      if (branchFilter !== 'all' && report.sportBranch !== branchFilter) return false;
      if (genderFilter !== 'all' && report.gender !== genderFilter) return false;
      if (schoolFilter !== 'all' && schoolLabel !== schoolFilter) return false;
      if (q) {
        const hay = `${report.athleteName} ${report.sportBranch} ${schoolLabel} ${report.branchName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sourceEntries, branchFilter, genderFilter, schoolFilter, searchQuery]);

  // Compute all real cohort analytics
  const analytics = useMemo(() => {
    const athleteRows: AthleteExecutiveRow[] = [];
    const metricBuckets = new Map<
      string,
      {
        name: string;
        unit: string;
        lowerIsBetter: boolean;
        values: number[];
        percentiles: number[];
        highCount: number;
        supportCount: number;
      }
    >();

    const ageBuckets = new Map<string, { label: string; minAge: number; count: number; scoreSum: number }>();
    const phvCounts: Record<'Pre-PHV' | 'Circa-PHV' | 'Post-PHV' | 'Belirsiz', number> = {
      'Pre-PHV': 0,
      'Circa-PHV': 0,
      'Post-PHV': 0,
      Belirsiz: 0,
    };
    const normCounts = { high: 0, normal: 0, support: 0 };

    let maleCount = 0;
    let femaleCount = 0;
    let ageSum = 0;
    let ageCount = 0;
    let heightSum = 0;
    let heightCount = 0;
    let weightSum = 0;
    let weightCount = 0;
    let bmiSum = 0;
    let bmiCount = 0;
    let predAdultHeightSum = 0;
    let predAdultHeightCount = 0;

    filteredEntries.forEach(({ report, schoolLabel }) => {
      if (report.gender === 'Kadın') femaleCount++;
      else maleCount++;

      if (report.ageYears > 0) {
        ageSum += report.ageYears;
        ageCount++;
      }

      const heightCm = findBodyMetric(report, ['boy', 'height']);
      const weightKg = findBodyMetric(report, ['kilo', 'ağırlık', 'agirlik', 'weight']);
      let bmi = findBodyMetric(report, ['vki', 'bmi', 'vücut kitle']);
      if (!bmi && heightCm && weightKg && heightCm > 50) {
        const hm = heightCm / 100;
        bmi = Number((weightKg / (hm * hm)).toFixed(1));
      }

      if (heightCm) {
        heightSum += heightCm;
        heightCount++;
      }
      if (weightKg) {
        weightSum += weightKg;
        weightCount++;
      }
      if (bmi) {
        bmiSum += bmi;
        bmiCount++;
      }
      if (report.predictedAdultHeight > 0) {
        predAdultHeightSum += report.predictedAdultHeight;
        predAdultHeightCount++;
      }

      const motorRows = getDisplayedMotorPerformance(report);
      let strongestMetric = '—';
      let weakestMetric = '—';
      let avgPercentile: number | null = null;

      if (motorRows.length > 0) {
        const sortedByPct = [...motorRows].sort(
          (a, b) => (Number(b.percentile) || 0) - (Number(a.percentile) || 0)
        );
        strongestMetric = sortedByPct[0]?.name || '—';
        weakestMetric = sortedByPct[sortedByPct.length - 1]?.name || '—';
        avgPercentile = Math.round(
          motorRows.reduce((s, r) => s + (Number(r.percentile) || 50), 0) / motorRows.length
        );

        motorRows.forEach((row) => {
          const val = getActiveParamVal(row, 0);
          if (val <= 0) return;
          const pct = Number(row.percentile) || 50;
          const key = row.id || row.name;
          const bucket = metricBuckets.get(key) || {
            name: row.name,
            unit: row.unit || '',
            lowerIsBetter: Boolean(row.lowerIsBetter),
            values: [],
            percentiles: [],
            highCount: 0,
            supportCount: 0,
          };
          bucket.values.push(val);
          bucket.percentiles.push(pct);
          if (pct >= 70 || row.status === 'mükemmel' || row.status === 'yüksek' || row.status === 'iyi') {
            bucket.highCount++;
          }
          if (pct < 40 || row.status === 'desteklenmeli' || row.status === 'düşük') {
            bucket.supportCount++;
          }
          metricBuckets.set(key, bucket);
        });
      }

      const { current, initial, delta } = resolveAthleteScore(report);
      const phvCategory = classifyPhv(report);
      phvCounts[phvCategory]++;

      const evalMetric = avgPercentile ?? current;
      let normTier: 'high' | 'normal' | 'support' = 'normal';
      if (evalMetric >= 70) {
        normTier = 'high';
        normCounts.high++;
      } else if (evalMetric < 45) {
        normTier = 'support';
        normCounts.support++;
      } else {
        normTier = 'normal';
        normCounts.normal++;
      }

      // Age grouping
      const age = Math.floor(report.ageYears || 0);
      let ageGroupKey = 'Diğer';
      let minAge = 99;
      if (age > 0 && age <= 9) {
        ageGroupKey = '7–9 Yaş';
        minAge = 7;
      } else if (age >= 10 && age <= 12) {
        ageGroupKey = '10–12 Yaş';
        minAge = 10;
      } else if (age >= 13 && age <= 15) {
        ageGroupKey = '13–15 Yaş';
        minAge = 13;
      } else if (age >= 16) {
        ageGroupKey = '16+ Yaş';
        minAge = 16;
      }
      const ab = ageBuckets.get(ageGroupKey) || { label: ageGroupKey, minAge, count: 0, scoreSum: 0 };
      ab.count++;
      ab.scoreSum += current;
      ageBuckets.set(ageGroupKey, ab);

      athleteRows.push({
        report,
        schoolLabel,
        currentScore: current,
        initialScore: initial,
        scoreDelta: delta,
        heightCm,
        weightKg,
        bmi,
        avgPercentile,
        strongestMetric,
        weakestMetric,
        phvCategory,
        normTier,
      });
    });

    const metricStats: MetricCohortStat[] = Array.from(metricBuckets.entries())
      .map(([key, b]) => ({
        key,
        name: b.name,
        unit: b.unit,
        count: b.values.length,
        avgValue: Number((b.values.reduce((s, v) => s + v, 0) / b.values.length).toFixed(2)),
        avgPercentile: Math.round(b.percentiles.reduce((s, v) => s + v, 0) / b.percentiles.length),
        highRatioPct: Math.round((b.highCount / b.values.length) * 100),
        supportCount: b.supportCount,
        lowerIsBetter: b.lowerIsBetter,
      }))
      .sort((a, b) => b.avgPercentile - a.avgPercentile);

    const topStrengthMetrics = metricStats.slice(0, 3);
    const priorityDevMetrics = [...metricStats]
      .sort((a, b) => a.avgPercentile - b.avgPercentile)
      .slice(0, 3);

    const topPerformers = [...athleteRows]
      .sort((a, b) => b.currentScore - a.currentScore)
      .slice(0, 5);

    const improversWithDelta = athleteRows
      .filter((r) => r.scoreDelta !== null && r.scoreDelta > 0)
      .sort((a, b) => (b.scoreDelta || 0) - (a.scoreDelta || 0))
      .slice(0, 5);

    const deltaList = athleteRows
      .map((r) => r.scoreDelta)
      .filter((d): d is number => d !== null);
    const avgDelta =
      deltaList.length > 0
        ? Number((deltaList.reduce((s, v) => s + v, 0) / deltaList.length).toFixed(1))
        : null;

    const total = athleteRows.length;
    const avgScore =
      total > 0
        ? Number((athleteRows.reduce((s, r) => s + r.currentScore, 0) / total).toFixed(1))
        : 0;

    const ageDistribution = Array.from(ageBuckets.values())
      .sort((a, b) => a.minAge - b.minAge)
      .map((g) => ({
        label: g.label,
        count: g.count,
        sharePct: total > 0 ? Math.round((g.count / total) * 100) : 0,
        avgScore: g.count > 0 ? Number((g.scoreSum / g.count).toFixed(1)) : 0,
      }));

    return {
      total,
      maleCount,
      femaleCount,
      avgAge: ageCount > 0 ? Number((ageSum / ageCount).toFixed(1)) : null,
      avgScore,
      avgDelta,
      avgHeight: heightCount > 0 ? Number((heightSum / heightCount).toFixed(1)) : null,
      avgWeight: weightCount > 0 ? Number((weightSum / weightCount).toFixed(1)) : null,
      avgBmi: bmiCount > 0 ? Number((bmiSum / bmiCount).toFixed(1)) : null,
      avgPredAdultHeight:
        predAdultHeightCount > 0
          ? Number((predAdultHeightSum / predAdultHeightCount).toFixed(1))
          : null,
      highNormPct: total > 0 ? Math.round((normCounts.high / total) * 100) : 0,
      normCounts,
      phvCounts,
      ageDistribution,
      topStrengthMetrics,
      priorityDevMetrics,
      topPerformers,
      improversWithDelta,
      athleteRows: [...athleteRows].sort((a, b) => b.currentScore - a.currentScore),
    };
  }, [filteredEntries]);

  const activeClubTitle =
    schoolFilter !== 'all'
      ? schoolFilter
      : schoolBranding.schoolName || 'SportsFly Spor Akademisi';

  const todayFormatted = new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const handleDownloadMobileExecutivePdf = async () => {
    if (isExportingMobilePdf || analytics.total === 0) return;
    const container = document.getElementById('sportsfly-lab-team-summary-a4');
    if (!container) return;

    setIsExportingMobilePdf(true);
    try {
      const res = await exportContainerToMobileSmartA4Pdf({
        containerEl: container,
        rawName: `${activeClubTitle}_Yonetici_Ozet_Raporu`,
        filePrefix: 'SportsFly_Takim_Mobil',
        pixelRatio: 1.75,
        jpegQuality: 0.86,
      });
      onNotify(
        `Mobil/WhatsApp uyumlu Takım Yönetici Özeti indirildi: ${res.fileName} (${formatFileSize(
          res.sizeBytes
        )}, ${res.pageCount} sayfa)`
      );
    } catch (err: any) {
      console.error('Takım özeti mobil PDF hatası:', err);
      onNotify(err?.message || 'Mobil PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsExportingMobilePdf(false);
    }
  };

  const handleDownloadStandardExecutivePdf = async () => {
    if (isExportingStdPdf || analytics.total === 0) return;
    const container = document.getElementById('sportsfly-lab-team-summary-a4');
    if (!container) return;

    setIsExportingStdPdf(true);
    try {
      const safeClub = activeClubTitle.replace(/\s+/g, '_').replace(/[\/\\?%*:|"<>]/g, '');
      await exportContainerToSmartA4Pdf({
        containerEl: container,
        fileName: `SportsFly_Takim_Yonetici_Ozeti_${safeClub}.pdf`,
      });
      onNotify('Takım / Kulüp Yönetici Özet Raporu standart yüksek çözünürlüklü PDF olarak indirildi.');
    } catch (err: any) {
      console.error('Takım özeti standart PDF hatası:', err);
      onNotify(err?.message || 'Standart PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsExportingStdPdf(false);
    }
  };

  const handleDownloadExecutiveExcel = () => {
    if (analytics.total === 0) return;
    const reportsList = filteredEntries.map((e) => e.report);
    const fileName = downloadBatchCategorizedKarneExcel(reportsList, activeClubTitle);
    onNotify(`Takım kadrosu kategorili Excel olarak indirildi: ${fileName}`);
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Top Filter & Export Control Surface */}
      <div className="print:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>SportsFly Lab</span>
              <span aria-hidden="true">·</span>
              <span>Yönetici ve Baş Antrenör Raporlaması</span>
            </div>
            <h2 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Takım / Kulüp Yönetici Özet Raporu
            </h2>
          </div>

          {/* Dedicated Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadMobileExecutivePdf}
              disabled={isExportingMobilePdf || analytics.total === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="JPEG sıkıştırmalı, düşük boyutlu ve Türkçe karaktersiz dosya adıyla WhatsApp'ta anında açılan PDF indir"
            >
              {isExportingMobilePdf ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-200 border-t-white rounded-full animate-spin shrink-0" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{isExportingMobilePdf ? 'Hazırlanıyor...' : 'Mobil / WhatsApp PDF İndir'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadStandardExecutivePdf}
              disabled={isExportingStdPdf || analytics.total === 0}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Yüksek çözünürlüklü baskı PDF'i indir"
            >
              <FileDown className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>{isExportingStdPdf ? 'Hazırlanıyor...' : 'Standart PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExecutiveExcel}
              disabled={analytics.total === 0}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Filtrelenmiş takım verisini 4 sayfalı kategorili Excel olarak indir"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Takım Excel</span>
            </button>
          </div>
        </div>

        {/* Source Segmented Control + Live Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(
              [
                { id: 'batch', label: `Toplu Liste (${batchReports.length})` },
                { id: 'studio', label: `Aktif Stüdyo (${studioReports.length})` },
                { id: 'archive', label: `Arşiv (${archivedReports.length})` },
                { id: 'all', label: 'Tümü' },
              ] as { id: SummarySourceKey; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSourceKey(opt.id);
                  setBranchFilter('all');
                  setSchoolFilter('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                  sourceKey === opt.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sporcu veya branş ara..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 w-44 sm:w-52"
              />
            </div>

            {availableSchools.length > 1 && (
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer max-w-[180px]"
              >
                <option value="all">Tüm Okul / Kulüpler</option>
                {availableSchools.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            {availableBranches.length > 1 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value="all">Tüm Branşlar</option>
                {availableBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}

            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'all' | 'Erkek' | 'Kadın')}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">Tüm Cinsiyetler</option>
              <option value="Erkek">Erkek</option>
              <option value="Kadın">Kadın</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {analytics.total === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Seçili kaynak ve filtrelerde sporcu ölçümü bulunamadı
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Yönetici özet raporunu oluşturmak için farklı bir veri kaynağı seçin veya Toplu Karne
            sekmesinden takım Excel listesi yükleyin.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSourceKey('all');
                setBranchFilter('all');
                setGenderFilter('all');
                setSchoolFilter('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Filtreleri Sıfırla
            </button>
            <button
              type="button"
              onClick={onGoToBatch}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-sky-600 text-white text-xs font-bold hover:opacity-90 cursor-pointer"
            >
              Toplu Karne Yükle
            </button>
          </div>
        </div>
      ) : (
        /* A4-READY EXECUTIVE REPORT CANVAS (Crisp White for Screen & PDF Fidelity) */
        <div
          id="sportsfly-lab-team-summary-a4"
          className="bg-white text-slate-900 rounded-2xl border border-slate-200 p-6 sm:p-8 max-w-5xl mx-auto space-y-7"
        >
          {/* Executive Report Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-4 min-w-0">
              {schoolBranding.logoDataUrl ? (
                <img
                  src={schoolBranding.logoDataUrl}
                  alt={activeClubTitle}
                  className="w-14 h-14 object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span>{activeClubTitle}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {branchFilter === 'all'
                      ? availableBranches.length === 1
                        ? availableBranches[0]
                        : 'Çoklu Branş Kadrosu'
                      : branchFilter}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{todayFormatted}</span>
                </div>
                <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">
                  Takım &amp; Kulüp Yönetici Özet Raporu
                </h1>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs text-slate-500">Ölçülen Kadro</div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {analytics.total} Sporcu
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {analytics.maleCount} Erkek · {analytics.femaleCount} Kadın
              </div>
            </div>
          </div>

          {/* 4-Column Executive KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-500">Takım Performans Ortalaması</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {analytics.avgScore}
                </span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <div className="mt-1 text-xs text-slate-600 tabular-nums">
                {analytics.avgDelta !== null
                  ? `Dönem değişimi: ${analytics.avgDelta >= 0 ? '+' : ''}${analytics.avgDelta} puan`
                  : 'İlk ölçüm temel profili'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-500">Norm Üstü Sporcu Oranı</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">
                  %{analytics.highNormPct}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  ({analytics.normCounts.high} sporcu)
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-600 tabular-nums">
                Normal: {analytics.normCounts.normal} · Destek: {analytics.normCounts.support}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-500">Antropometrik Ortalama</div>
              <div className="mt-1.5 flex items-baseline gap-1.5 text-lg font-extrabold text-slate-900 tabular-nums">
                <span>{analytics.avgHeight ? `${analytics.avgHeight} cm` : '—'}</span>
                <span className="text-slate-400 font-normal">/</span>
                <span>{analytics.avgWeight ? `${analytics.avgWeight} kg` : '—'}</span>
              </div>
              <div className="mt-1 text-xs text-slate-600 tabular-nums">
                Ortalama Yaş: {analytics.avgAge ?? '—'} · VKİ: {analytics.avgBmi ?? '—'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-500">Büyüme Atağı (Circa-PHV)</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-amber-700 tabular-nums">
                  {analytics.phvCounts['Circa-PHV']}
                </span>
                <span className="text-xs text-slate-500">sporcu aktif yüklenme takibinde</span>
              </div>
              <div className="mt-1 text-xs text-slate-600 tabular-nums">
                Tahmini Yetişkin Boy Ort.:{' '}
                {analytics.avgPredAdultHeight ? `${analytics.avgPredAdultHeight} cm` : '—'}
              </div>
            </div>
          </div>

          {/* Section 1: Team Top 3 Strengths vs Top 3 Priority Development Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Takımın En Güçlü 3 Motor Özelliği</span>
                </h3>
                <span className="text-xs text-slate-500">Yaş Normu Persentili</span>
              </div>

              {analytics.topStrengthMetrics.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  Ölçülmüş motor performans parametresi bulunmuyor.
                </p>
              ) : (
                <div className="space-y-3">
                  {analytics.topStrengthMetrics.map((m, idx) => (
                    <div key={m.key} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-800 truncate">
                          {idx + 1}. {m.name}
                        </span>
                        <span className="font-mono tabular-nums text-slate-700 shrink-0">
                          Ort. {m.avgValue} {m.unit} · <strong className="text-emerald-700">P{m.avgPercentile}</strong>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${Math.min(100, Math.max(8, m.avgPercentile))}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {m.count} sporcu ölçüldü · %{m.highRatioPct} norm üstü performans
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Öncelikli Gelişim Gerektiren 3 Alan</span>
                </h3>
                <span className="text-xs text-slate-500">Antrenman Odak Önceliği</span>
              </div>

              {analytics.priorityDevMetrics.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  Ölçülmüş motor performans parametresi bulunmuyor.
                </p>
              ) : (
                <div className="space-y-3">
                  {analytics.priorityDevMetrics.map((m, idx) => (
                    <div key={m.key} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-800 truncate">
                          {idx + 1}. {m.name}
                        </span>
                        <span className="font-mono tabular-nums text-slate-700 shrink-0">
                          Ort. {m.avgValue} {m.unit} · <strong className="text-amber-700">P{m.avgPercentile}</strong>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${Math.min(100, Math.max(8, m.avgPercentile))}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {m.supportCount} sporcu norm altında · Haftalık mikro döngüde öncelikli
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Age Group Distribution & PHV Maturation Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Yaş Gruplarına Göre Kadro &amp; Skor Dağılımı</span>
              </h3>
              <div className="space-y-2.5">
                {analytics.ageDistribution.map((grp) => (
                  <div key={grp.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{grp.label}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {grp.count} sporcu (%{grp.sharePct}) · Ort.{' '}
                        <strong className="text-slate-900">{grp.avgScore}</strong>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-600"
                        style={{ width: `${Math.max(6, grp.sharePct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Biyolojik Olgunlaşma (PHV) &amp; Yüklenme Profili</span>
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    {
                      key: 'Pre-PHV' as const,
                      title: 'Pre-PHV',
                      sub: 'Büyüme Öncesi · Koordinasyon & Teknik',
                      accent: 'text-sky-700',
                    },
                    {
                      key: 'Circa-PHV' as const,
                      title: 'Circa-PHV',
                      sub: 'Zirve Büyüme · Yüklenme Kontrollü',
                      accent: 'text-amber-700',
                    },
                    {
                      key: 'Post-PHV' as const,
                      title: 'Post-PHV',
                      sub: 'Büyüme Sonrası · Kuvvet & Güç',
                      accent: 'text-emerald-700',
                    },
                  ]
                ).map((phase) => {
                  const count = analytics.phvCounts[phase.key];
                  const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                  return (
                    <div
                      key={phase.key}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <div className="text-xs font-bold text-slate-700">{phase.title}</div>
                      <div className={`mt-1 text-xl font-extrabold tabular-nums ${phase.accent}`}>
                        {count}
                        <span className="ml-1 text-xs font-semibold text-slate-500">
                          (%{pct})
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-snug text-slate-500">
                        {phase.sub}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Top Performers & Biggest Improvers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Genel Performans Liderleri (İlk 5)</span>
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left font-semibold">Sporcu</th>
                      <th className="py-2 px-2 text-left font-semibold">Güçlü Alan</th>
                      <th className="py-2 px-3 text-right font-semibold">Skor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.topPerformers.map((item, idx) => (
                      <tr key={item.report.id + idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">
                            {idx + 1}. {item.report.athleteName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.report.ageYears} Yaş · {item.report.sportBranch}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-slate-600">{item.strongestMetric}</td>
                        <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                          {item.currentScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {analytics.improversWithDelta.length > 0
                    ? 'En Çok Gelişim Gösteren Sporcular'
                    : 'Öncelikli Takip Gerektiren Sporcular'}
                </span>
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {analytics.improversWithDelta.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold">Sporcu</th>
                        <th className="py-2 px-2 text-right font-semibold">1. → Son</th>
                        <th className="py-2 px-3 text-right font-semibold">Artış</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.improversWithDelta.map((item, idx) => (
                        <tr key={item.report.id + idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">
                              {idx + 1}. {item.report.athleteName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.report.ageYears} Yaş · {item.report.sportBranch}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-600 tabular-nums">
                            {item.initialScore} → {item.currentScore}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-700 tabular-nums">
                            +{item.scoreDelta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold">Sporcu</th>
                        <th className="py-2 px-2 text-left font-semibold">Gelişim Alanı</th>
                        <th className="py-2 px-3 text-right font-semibold">Skor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...analytics.athleteRows]
                        .sort((a, b) => a.currentScore - b.currentScore)
                        .slice(0, 5)
                        .map((item, idx) => (
                          <tr key={item.report.id + idx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900">
                                {item.report.athleteName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {item.report.ageYears} Yaş · {item.phvCategory}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-slate-600">{item.weakestMetric}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 tabular-nums">
                              {item.currentScore}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Compact Full Squad Executive Roster Table */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Kadro Yönetici Özet Listesi ({analytics.total} Sporcu)</span>
              </h3>
              <span className="text-xs text-slate-500">Performans skoruna göre sıralı</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-left font-bold">#</th>
                    <th className="py-2.5 px-3 text-left font-bold">Sporcu</th>
                    <th className="py-2.5 px-2 text-left font-bold">Yaş / Cinsiyet</th>
                    <th className="py-2.5 px-2 text-right font-bold">Boy / Kilo</th>
                    <th className="py-2.5 px-2 text-left font-bold">PHV Fazı</th>
                    <th className="py-2.5 px-2 text-left font-bold">Öncelikli Gelişim</th>
                    <th className="py-2.5 px-3 text-right font-bold">Skor</th>
                    <th className="py-2.5 px-3 text-right font-bold pdf-export-hide print:hidden">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.athleteRows.map((row, index) => (
                    <tr key={`${row.report.id}_${index}`} className="hover:bg-slate-50/90">
                      <td className="py-2 px-3 font-mono text-slate-400 tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{row.report.athleteName}</div>
                        <div className="text-[11px] text-slate-500">{row.report.sportBranch}</div>
                      </td>
                      <td className="py-2 px-2 text-slate-700 tabular-nums whitespace-nowrap">
                        {row.report.ageYears} Yaş · {row.report.gender}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {row.heightCm ? `${row.heightCm} cm` : '—'} /{' '}
                        {row.weightKg ? `${row.weightKg} kg` : '—'}
                      </td>
                      <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                        {row.phvCategory}
                      </td>
                      <td className="py-2 px-2 text-slate-600">{row.weakestMetric}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={`font-extrabold ${
                            row.normTier === 'high'
                              ? 'text-emerald-700'
                              : row.normTier === 'support'
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {row.currentScore}
                        </span>
                        {row.scoreDelta !== null && (
                          <span
                            className={`ml-1 text-[11px] font-bold ${
                              row.scoreDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            ({row.scoreDelta >= 0 ? '+' : ''}
                            {row.scoreDelta})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right pdf-export-hide print:hidden">
                        <button
                          type="button"
                          onClick={() => onOpenReport(row.report)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 cursor-pointer whitespace-nowrap"
                        >
                          <span>Karneyi Aç</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clean Executive Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>
              {activeClubTitle} · SportsFly Lab Yönetici Özet Raporu
            </span>
            <span className="tabular-nums">
              Oluşturulma Tarihi: {todayFormatted} · Toplam {analytics.total} Sporcu
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
