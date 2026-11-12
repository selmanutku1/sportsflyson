import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import {
  TrendingUp,
  CheckCircle2,
  Target,
  Users,
  Filter,
} from 'lucide-react';
import {
  SportsFlyLabReport,
  getStoredLabReports,
  getDisplayedMotorPerformance,
} from '../../data/sportsFlyLabData';

export interface AthleteDevelopmentComparisonChartProps {
  report: SportsFlyLabReport;
  allReports?: SportsFlyLabReport[];
  className?: string;
  height?: number;
  onToast?: (message: string) => void;
  defaultChartType?: 'bar' | 'line';
  initialFilterMode?: 'critical' | 'all';
}

const cleanSubjectName = (rawName: string): string => {
  const lower = rawName.toLowerCase();
  if (lower.includes('kol sürat') || lower.includes('arm speed')) {
    return lower.includes('sağ') ? 'Kol Sürati (Sağ)' : lower.includes('sol') ? 'Kol Sürati (Sol)' : 'Kol Sürati';
  }
  if (lower.includes('10x5') || lower.includes('çabukluk') || lower.includes('çeviklik') || lower.includes('agility')) {
    return 'Çeviklik (10x5m)';
  }
  if (lower.includes('20m') || lower.includes('sprint')) {
    return '20m Sprint';
  }
  if (lower.includes('dikey') || lower.includes('vertical')) {
    return 'Dikey Sıçrama';
  }
  if (lower.includes('uzun atlama') || lower.includes('long jump')) {
    return 'Uzun Atlama';
  }
  if (lower.includes('pençe') || lower.includes('kavrama') || lower.includes('grip')) {
    return lower.includes('sağ') ? 'Pençe (Sağ)' : lower.includes('sol') ? 'Pençe (Sol)' : 'Pençe Kuvveti';
  }
  if (lower.includes('denge') || lower.includes('flamingo') || lower.includes('balance')) {
    return 'Flamingo Denge';
  }
  if (lower.includes('esneklik') || lower.includes('otur-uzan') || lower.includes('flexibility')) {
    return 'Esneklik (Otur-Uzan)';
  }
  if (lower.includes('aerobik') || lower.includes('dayanıklılık') || lower.includes('pacer')) {
    return 'Dayanıklılık (Pacer)';
  }
  return rawName.replace(/testi/gi, '').replace(/ölçümü/gi, '').trim();
};

// Determines if a test is considered one of the top critical motor metrics
const isCriticalMetric = (name: string): boolean => {
  const lower = name.toLowerCase();
  return (
    lower.includes('sprint') ||
    lower.includes('20m') ||
    lower.includes('dikey') ||
    lower.includes('sıçrama') ||
    lower.includes('10x5') ||
    lower.includes('çabukluk') ||
    lower.includes('pençe') ||
    lower.includes('kavrama') ||
    lower.includes('kol sürat')
  );
};

const getReportActiveScore = (r: SportsFlyLabReport): number => {
  if (r.scoreHistory?.p3Score && r.scoreHistory.p3Score > 0) return r.scoreHistory.p3Score;
  if (r.scoreHistory?.p2Score && r.scoreHistory.p2Score > 0) return r.scoreHistory.p2Score;
  if (r.scoreHistory?.p1Score && r.scoreHistory.p1Score > 0) return r.scoreHistory.p1Score;
  const displayedMotors = getDisplayedMotorPerformance(r);
  if (displayedMotors.length > 0) {
    const sum = displayedMotors.reduce((acc, m) => acc + (m.percentile || 65), 0);
    return Math.round(sum / displayedMotors.length);
  }
  return 72;
};

export const AthleteDevelopmentComparisonChart: React.FC<AthleteDevelopmentComparisonChartProps> = ({
  report,
  allReports,
  className = '',
  height = 320,
  onToast,
  defaultChartType = 'bar',
  initialFilterMode = 'critical',
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>(defaultChartType);
  const [filterMode, setFilterMode] = useState<'critical' | 'all'>(initialFilterMode);

  // SportsFly Lab içindeki aynı spor okulu veya aynı grup sporcularını bul
  const peerReports = useMemo(() => {
    const pool = allReports && allReports.length > 0 ? allReports : getStoredLabReports();
    if (!pool || pool.length === 0) return [report];

    const normClub = (report.clubName || '').trim().toLocaleLowerCase('tr-TR');
    const normAge = (report.groupInfo?.ageRange || '').trim().toLocaleLowerCase('tr-TR');
    const grpNo = report.groupInfo?.groupNo;

    // 1. Aynı spor okulu + aynı grup
    const sameClubAndGroup = pool.filter((r) => {
      const rClub = (r.clubName || '').trim().toLocaleLowerCase('tr-TR');
      const rAge = (r.groupInfo?.ageRange || '').trim().toLocaleLowerCase('tr-TR');
      return rClub === normClub && (rAge === normAge || r.groupInfo?.groupNo === grpNo);
    });
    if (sameClubAndGroup.length > 1) return sameClubAndGroup;

    // 2. Aynı spor okulu
    const sameClub = pool.filter(
      (r) => (r.clubName || '').trim().toLocaleLowerCase('tr-TR') === normClub
    );
    if (sameClub.length > 1) return sameClub;

    // 3. Tüm SportsFly Lab sporcuları
    return pool;
  }, [report, allReports]);

  const athleticScore = getReportActiveScore(report);

  const grpAvgScore = useMemo(() => {
    if (peerReports.length > 0) {
      const sum = peerReports.reduce((acc, r) => acc + getReportActiveScore(r), 0);
      return Math.round(sum / peerReports.length);
    }
    return report.groupInfo?.groupAverageScore ?? 72;
  }, [peerReports, report]);

  const targetScore = Math.min(96, Math.max(athleticScore + 6, 85));
  const groupDifference = athleticScore - grpAvgScore;
  const targetRemaining = targetScore - athleticScore;

  // Process and filter chart data with real group averages from peer athletes
  const chartData = useMemo(() => {
    const displayedMotor = getDisplayedMotorPerformance(report);
    if (displayedMotor.length === 0) return [];

    const rows = displayedMotor.map((row) => {
      const activeVal = row.m3 > 0 ? row.m3 : (row.m2 > 0 ? row.m2 : row.m1);
      const pVal = Math.max(35, Math.min(96, row.percentile || Math.round(activeVal)));
      const label = cleanSubjectName(row.name);

      // Aynı grup / spor okulundaki tüm sporcuların bu testteki gerçek yüzdelik ortalaması
      const peerPercentiles: number[] = [];
      peerReports.forEach((pr) => {
        const matchedRow = getDisplayedMotorPerformance(pr).find(
          (m) => m.id === row.id || cleanSubjectName(m.name) === label
        );
        if (matchedRow && matchedRow.percentile > 0) {
          peerPercentiles.push(Math.max(35, Math.min(96, matchedRow.percentile)));
        }
      });

      const grpVal =
        peerPercentiles.length > 0
          ? Math.round(peerPercentiles.reduce((a, b) => a + b, 0) / peerPercentiles.length)
          : Math.max(40, Math.min(88, grpAvgScore));

      const targetVal = Math.min(96, Math.max(pVal + 7, grpVal + 8, 85));
      const isCritical = isCriticalMetric(row.name);

      return {
        subject: label,
        fullName: row.name,
        isCritical,
        'Mevcut Değer': pVal,
        'Hedef Değer': targetVal,
        'Grup Ortalaması': grpVal,
        rawM3: activeVal,
        unit: row.unit,
        deltaGroup: pVal - grpVal,
        deltaTarget: targetVal - pVal,
      };
    });

    if (filterMode === 'critical') {
      const distinct: typeof rows = [];
      const seen = new Set<string>();
      rows.forEach((r) => {
        if (!seen.has(r.subject) && distinct.length < 4) {
          seen.add(r.subject);
          distinct.push(r);
        }
      });
      return distinct.length >= 4 ? distinct : rows.slice(0, 4);
    }

    return rows.slice(0, 10);
  }, [report, peerReports, grpAvgScore, filterMode]);

  return (
    <div
      id="sportsfly-critical-performance-chart"
      className={`bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs text-slate-900 space-y-4 font-sans ${className}`}
    >
      {/* 1. Header Toolbar: Title and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-md bg-slate-900 text-white font-sans text-xs font-bold uppercase tracking-wider">
              Gelişim Takip Modeli
            </span>
            <span className="text-sm text-slate-500 font-medium">
              Mevcut Değer vs Hedef vs Grup Ortalaması
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            Performans Gelişim ve Karşılaştırma Analizi
          </h3>
        </div>

        {/* Fixed Non-Variable Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200/90 text-sm font-extrabold text-slate-800 flex items-center gap-2 shadow-2xs font-sans">
            <Filter className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Kritik 4 Veri Analizi</span>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Chips (Clean, High Contrast Sans Typography without Collision) */}
      <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">
            <span>Grup Ortalaması</span>
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-slate-800 my-1 font-sans tabular-nums leading-none">
            %{grpAvgScore}
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-tight">
            Grup Normu ({peerReports.length} Sporcu Ortalaması)
          </p>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-blue-900 uppercase tracking-wider">
            <span>Hedef Değer</span>
            <Target className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="text-2xl font-black text-blue-800 my-1 font-sans tabular-nums leading-none">
            %{targetScore}
          </div>
          <p className="text-[10px] text-blue-700 font-medium leading-tight">Biyomotorik Gelişim Eşiği</p>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-300 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-emerald-950 uppercase tracking-wider">
            <span>Mevcut Değer</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl font-black text-emerald-700 my-1 font-sans tabular-nums leading-none">
            %{athleticScore}
          </div>
          <p className="text-[10px] text-emerald-800 font-bold leading-tight">O Anki Güncel Başarı</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-200 uppercase tracking-wider">
            <span>Gelişim Farkı</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-emerald-400 my-1 font-sans tabular-nums leading-none">
            {groupDifference >= 0 ? `+${groupDifference}` : groupDifference}%
          </div>
          <p className="text-[10px] text-slate-300 font-medium leading-tight">
            Grup Önünde · Hedefe %{Math.max(0, targetRemaining)}
          </p>
        </div>
      </div>

      {/* 3. Recharts Container: Single Clear Bar Chart or Line Chart */}
      <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-3.5 pt-4">
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="subject"
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                  interval={0}
                  textAnchor="middle"
                />
                <YAxis
                  domain={[0, 108]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(val) => `%${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 shadow-xl space-y-1.5 font-sans min-w-[210px]">
                          <div className="font-extrabold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                            <span>{data.fullName}</span>
                            <span className="text-[10.5px] text-slate-400 tabular-nums">({data.unit})</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              <span>Grup Ortalaması:</span>
                            </span>
                            <strong className="tabular-nums">%{data['Grup Ortalaması']}</strong>
                          </div>
                          <div className="flex items-center justify-between text-blue-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>Hedef Değer:</span>
                            </span>
                            <strong className="tabular-nums">%{data['Hedef Değer']}</strong>
                          </div>
                          <div className="flex items-center justify-between text-emerald-300 font-bold pt-1 border-t border-slate-800">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>Mevcut Değer:</span>
                            </span>
                            <span className="font-bold tabular-nums">
                              {data.rawM3} {data.unit} (%{data['Mevcut Değer']})
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
                />
                <Line
                  type="monotone"
                  name="Grup Ortalaması"
                  dataKey="Grup Ortalaması"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3.5, fill: '#64748b' }}
                />
                <Line
                  type="monotone"
                  name="Hedef Değer"
                  dataKey="Hedef Değer"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4.5, fill: '#2563eb' }}
                />
                <Line
                  type="monotone"
                  name="Mevcut Değer"
                  dataKey="Mevcut Değer"
                  stroke="#059669"
                  strokeWidth={3.5}
                  dot={{ r: 5.5, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 24, right: 20, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="subject"
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                  interval={0}
                  textAnchor="middle"
                />
                <YAxis
                  domain={[0, 108]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(val) => `%${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 shadow-xl space-y-1.5 font-sans min-w-[210px]">
                          <div className="font-extrabold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                            <span>{data.fullName}</span>
                            <span className="text-[10.5px] text-slate-400 tabular-nums">({data.unit})</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              <span>Grup Ortalaması:</span>
                            </span>
                            <strong className="tabular-nums">%{data['Grup Ortalaması']}</strong>
                          </div>
                          <div className="flex items-center justify-between text-blue-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>Hedef Değer:</span>
                            </span>
                            <strong className="tabular-nums">%{data['Hedef Değer']}</strong>
                          </div>
                          <div className="flex items-center justify-between text-emerald-300 font-bold pt-1 border-t border-slate-800">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>Mevcut Değer:</span>
                            </span>
                            <span className="font-bold tabular-nums">
                              {data.rawM3} {data.unit} (%{data['Mevcut Değer']})
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="rect"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
                />
                <Bar
                  name="Grup Ortalaması"
                  dataKey="Grup Ortalaması"
                  fill="#94a3b8"
                  radius={[3, 3, 0, 0]}
                >
                  <LabelList
                    dataKey="Grup Ortalaması"
                    position="top"
                    formatter={(val: any) => `%${val}`}
                    style={{ fill: '#475569', fontSize: 10.5, fontWeight: 800 }}
                  />
                </Bar>
                <Bar
                  name="Hedef Değer"
                  dataKey="Hedef Değer"
                  fill="#3b82f6"
                  radius={[3, 3, 0, 0]}
                >
                  <LabelList
                    dataKey="Hedef Değer"
                    position="top"
                    formatter={(val: any) => `%${val}`}
                    style={{ fill: '#1d4ed8', fontSize: 10.5, fontWeight: 800 }}
                  />
                </Bar>
                <Bar
                  name="Mevcut Değer"
                  dataKey="Mevcut Değer"
                  fill="#059669"
                  radius={[3, 3, 0, 0]}
                >
                  <LabelList
                    dataKey="Mevcut Değer"
                    position="top"
                    formatter={(val: any) => `%${val}`}
                    style={{ fill: '#047857', fontSize: 10.5, fontWeight: 900 }}
                  />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Mini Summary of Top Strengths vs Focus Areas (Zero Typewriter Font, Clean Professional Badges) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-sm">
        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
          <div className="text-xs font-bold text-emerald-950 uppercase">
            Hedefe Ulaşılan / Üst Düzey
          </div>
          <div className="text-sm font-extrabold text-emerald-900 mt-1 tabular-nums">
            {chartData.filter((d) => d['Mevcut Değer'] >= d['Hedef Değer']).length} Motor Test
          </div>
          <p className="text-xs text-emerald-800 mt-0.5">
            Hedef norm eşiğini geçen biyomotor parametreler
          </p>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200">
          <div className="text-xs font-bold text-blue-950 uppercase">
            Grup Üzeri Gelişim
          </div>
          <div className="text-sm font-extrabold text-blue-900 mt-1 tabular-nums">
            {chartData.filter((d) => d['Mevcut Değer'] >= d['Grup Ortalaması']).length} Motor Test
          </div>
          <p className="text-xs text-blue-800 mt-0.5">
            Akran grubu ortalamasının üzerinde seyreden alanlar
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
          <div className="text-xs font-bold text-slate-900 uppercase">
            Öncelikli Gelişim Odakları
          </div>
          <div className="text-sm font-extrabold text-slate-800 mt-1 tabular-nums">
            {chartData.filter((d) => d['Mevcut Değer'] < d['Hedef Değer']).length} Gelişim Hedefi
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Antrenman drilleriyle geliştirilmesi hedeflenen testler
          </p>
        </div>
      </div>
    </div>
  );
};
