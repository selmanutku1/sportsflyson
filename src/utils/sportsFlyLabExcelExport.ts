import * as XLSX from 'xlsx';
import {
  SportsFlyLabReport,
  LabParameterRow,
  getDisplayedBodyComposition,
  getDisplayedMotorPerformance,
  evaluateMotorRowTargetAndStatus,
  calculateBranchReferenceScore,
  generateAthleteInterpretiveExpertComment,
  isStaleExpertComment,
  isLabRowMeasured,
  getStoredLabSchoolBranding,
  applyBrandingToReport,
} from '../data/sportsFlyLabData';

type CellVal = string | number;

function safeCell(value: unknown, maxLen = 2500): CellVal {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/\r\n/g, '\n').trim().slice(0, maxLen);
  if (!str) return '';
  if (/^[=+\-@\t]/.test(str) && !/^-[0-9]+([.,][0-9]+)?$/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function getLocalDateSlug(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sanitizeFileSlug(raw: string): string {
  return (raw || 'Sporcu')
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'Sporcu';
}

function getActiveValue(row: LabParameterRow): number {
  if (row.m3 > 0) return row.m3;
  if (row.m2 > 0) return row.m2;
  return row.m1 > 0 ? row.m1 : 0;
}

function getSafeM2Body(row: LabParameterRow): number {
  const safeM1 = row.m1 > 0 ? row.m1 : 0;
  if (row.m2 > 0) {
    if (safeM1 > 0) {
      return row.lowerIsBetter ? Math.min(safeM1, row.m2) : Math.max(safeM1, row.m2);
    }
    return row.m2;
  }
  if (safeM1 > 0) {
    return row.lowerIsBetter ? +(safeM1 * 0.96).toFixed(1) : +(safeM1 * 1.02).toFixed(1);
  }
  return 0;
}

function getSafeM2Motor(row: LabParameterRow): number {
  const safeM1 = row.m1 > 0 ? row.m1 : 0;
  if (row.m2 > 0) return row.m2;
  if (safeM1 > 0) {
    if (row.lowerIsBetter) return +(safeM1 * 0.96).toFixed(2);
    if (row.unit === 'atım' || row.unit === 'vuruş' || row.unit === 'dokunma') {
      return Math.round(safeM1 * 1.06);
    }
    return +(safeM1 * 1.05).toFixed(1);
  }
  return 0;
}

function getBodySubCategory(row: LabParameterRow): string {
  const id = row.id.toLowerCase();
  if (
    [
      'bicepsskinfold',
      'tricepsskinfold',
      'subscapularskinfold',
      'suprailiacskinfold',
      'calfskinfold',
      'triceps',
      'biceps_skf',
      'iliac_skf',
      'calf_skf',
      'subscapula',
      'supraspinal',
      'sumskinfolds',
      'sum_skinfolds',
    ].includes(id)
  ) {
    return 'Deri Kıvrımı (Skinfold)';
  }
  if (
    id.includes('girth') ||
    id.includes('cevre') ||
    id.includes('circumference') ||
    id.includes('waist') ||
    id.includes('hip') ||
    id === 'whr'
  ) {
    return 'Çevre & Oran Ölçümleri';
  }
  if (id.includes('breadth') || id.includes('humerus') || id.includes('femur') || id.includes('cap')) {
    return 'Kemik Çapı Ölçümleri';
  }
  if (id.includes('fat') || id.includes('muscle') || id.includes('yag') || id.includes('kas')) {
    return 'Vücut Kompozisyonu';
  }
  return 'Temel Antropometri';
}

function getBodyTargetAssessment(row: LabParameterRow): string {
  const activeVal = row.m3 > 0 ? row.m3 : getSafeM2Body(row) > 0 ? getSafeM2Body(row) : row.m1;
  const isOptimal =
    row.status === 'normal' ||
    row.status === 'mükemmel' ||
    row.status === 'iyi' ||
    row.status === 'uzun';
  if (isOptimal) return 'Hedef Bölgede';
  const isWatch =
    (row.status === 'yüksek' && activeVal <= row.refHigh && row.sd <= 2.05) ||
    (row.status === 'düşük' && activeVal >= row.refLow && row.sd >= -2.05);
  return isWatch ? 'Takip Edilmeli' : 'Gelişim / Denge Odağı';
}

function getReportActiveScore(report: SportsFlyLabReport): number {
  if (report.scoreHistory?.p3Score && report.scoreHistory.p3Score > 0) {
    return report.scoreHistory.p3Score;
  }
  if (report.scoreHistory?.p2Score && report.scoreHistory.p2Score > 0) {
    return report.scoreHistory.p2Score;
  }
  if (report.scoreHistory?.p1Score && report.scoreHistory.p1Score > 0) {
    return report.scoreHistory.p1Score;
  }
  const measuredMotors = getDisplayedMotorPerformance(report);
  if (measuredMotors.length > 0) {
    const sum = measuredMotors.reduce((acc, m) => acc + (m.percentile || 65), 0);
    return Math.round(sum / measuredMotors.length);
  }
  return 72;
}

function computeAutoCols(rows: CellVal[][], minWidth = 11, maxWidth = 46): XLSX.ColInfo[] {
  const colCount = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const widths: number[] = new Array(colCount).fill(minWidth);
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val === undefined || val === null) continue;
      const str = String(val);
      const longestLine = str
        .split('\n')
        .reduce((m, line) => Math.max(m, line.length), 0);
      const candidate = Math.min(maxWidth, Math.max(minWidth, longestLine + 3));
      if (candidate > widths[c]) widths[c] = candidate;
    }
  }
  return widths.map((wch) => ({ wch }));
}

function buildCriticalMetricsForReport(
  report: SportsFlyLabReport,
  peerReports: SportsFlyLabReport[]
) {
  const motorRows = getDisplayedMotorPerformance(report);
  const pickedIds = new Set<string>();
  const pickUnique = (pred: (r: LabParameterRow) => boolean, fallbackIdx: number) => {
    const found =
      motorRows.find((r) => !pickedIds.has(r.id) && pred(r)) ||
      motorRows.find((_, idx) => idx >= fallbackIdx && !pickedIds.has(motorRows[idx].id)) ||
      motorRows.find((r) => !pickedIds.has(r.id));
    if (found) pickedIds.add(found.id);
    return found;
  };

  const speedRow = pickUnique(
    (r) =>
      r.id === 'sprint' ||
      r.id === 'sprint_20m' ||
      r.name.toLowerCase().includes('20m') ||
      r.name.toLowerCase().includes('sprint'),
    0
  );
  const powerRow = pickUnique(
    (r) =>
      r.id === 'vertical_jump' ||
      r.id === 'jump' ||
      r.name.toLowerCase().includes('dikey sıçrama'),
    1
  );
  const agilityRow = pickUnique(
    (r) =>
      r.id === 'agility' ||
      r.id === 'shuttle_run' ||
      r.id === '10x5m' ||
      r.name.toLowerCase().includes('10x5'),
    2
  );
  const fourthRow = pickUnique(
    (r) =>
      r.id === 'grip_strength_right' ||
      r.id === 'grip' ||
      r.name.toLowerCase().includes('pençe') ||
      r.name.toLowerCase().includes('pacer') ||
      r.name.toLowerCase().includes('aerobik'),
    3
  );

  const peers = peerReports.length > 0 ? peerReports : [report];
  const groupAvgScore = Math.round(
    peers.reduce((acc, r) => acc + getReportActiveScore(r), 0) / Math.max(1, peers.length)
  );

  const getPeerMetricAvg = (targetRow?: LabParameterRow) => {
    if (!targetRow) return groupAvgScore;
    const vals: number[] = [];
    peers.forEach((pr) => {
      const m = (pr.motorPerformance || []).find(
        (item) => item.id === targetRow.id || item.name === targetRow.name
      );
      if (m && isLabRowMeasured(m)) {
        vals.push(evaluateMotorRowTargetAndStatus(m).percentile);
      }
    });
    return vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : groupAvgScore;
  };

  const candidates: Array<{ category: string; title: string; row?: LabParameterRow }> = [
    { category: 'Hız / İvmelenme', title: 'Sürat Performansı', row: speedRow },
    { category: 'Patlayıcı Güç', title: 'Dikey Sıçrama / Güç', row: powerRow },
    { category: 'Çeviklik & Yön Değiştirme', title: 'Çabukluk Performansı', row: agilityRow },
    { category: 'Kuvvet / Dayanıklılık', title: 'Kuvvet & Kondisyon', row: fourthRow },
  ];

  return {
    groupAvgScore,
    items: candidates
      .filter((c): c is { category: string; title: string; row: LabParameterRow } => Boolean(c.row))
      .map((c) => {
        const evalRes = evaluateMotorRowTargetAndStatus(c.row);
        const grp = getPeerMetricAvg(c.row);
        const targetPct = Math.min(97, Math.max(evalRes.percentile + 6, grp + 5, 65));
        const progressToTarget = Math.min(100, Math.round((evalRes.percentile / targetPct) * 100));
        return {
          category: c.category,
          title: c.title,
          metricName: c.row.name,
          activeValue: evalRes.activeVal,
          unit: c.row.unit,
          currentPercentile: evalRes.percentile,
          targetPercentile: targetPct,
          groupAvgPercentile: grp,
          progressToTarget,
          comparisonStatus:
            evalRes.percentile >= grp ? 'Grup Ortalamasının Üzerinde' : 'Grup Normuna Yakın',
        };
      }),
  };
}

export interface CategorizedKarneExcelOptions {
  peerReports?: SportsFlyLabReport[];
  fileNameOverride?: string;
}

/**
 * Generates and downloads a multi-sheet, categorized Excel workbook (.xlsx)
 * built strictly from the data rendered in the downloadable SportsFly Lab report card layout:
 *  - Sheet 1: Kategorili_Karne_Ozeti (Unified categorized master table matching all karne pages)
 *  - Sheet 2: 1_Kimlik_Veli_PHV (Athlete identity, parent info/sports history, somatotype & PHV)
 *  - Sheet 3: 2_Beden_Kompozisyonu (Page 1 measured anthropometric & skinfold table)
 *  - Sheet 4: 3_Motor_Performans (Page 2 measured motor tests grouped by target status tier)
 *  - Sheet 5: 4_Kritik_Skor_Uzman (Page 3 critical 4 metrics, period scores, branch compatibility & Page 4 expert guide)
 */
export function downloadCategorizedKarneExcel(
  rawReport: SportsFlyLabReport,
  options?: CategorizedKarneExcelOptions
): string {
  const activeBranding = getStoredLabSchoolBranding();
  const report = applyBrandingToReport(rawReport, activeBranding);
  const peerReports = options?.peerReports?.length ? options.peerReports : [report];

  const displayedBody = getDisplayedBodyComposition(report);
  const displayedMotor = getDisplayedMotorPerformance(report);
  const branchRef = calculateBranchReferenceScore(report);
  const activeScore = getReportActiveScore(report);
  const { groupAvgScore, items: criticalItems } = buildCriticalMetricsForReport(report, peerReports);

  const hasBodyM3 = Boolean(
    report.date3 && report.date3 !== '—' && report.date3 !== '' && displayedBody.some((r) => r.m3 > 0)
  );
  const hasMotorM3 = Boolean(
    report.date3 && report.date3 !== '—' && report.date3 !== '' && displayedMotor.some((r) => r.m3 > 0)
  );

  const finalComment =
    !report.expertComment || isStaleExpertComment(report.expertComment, report)
      ? generateAthleteInterpretiveExpertComment(report)
      : report.expertComment;

  const skinfoldRows = displayedBody.filter((r) =>
    [
      'bicepsSkinfold',
      'tricepsSkinfold',
      'subscapularSkinfold',
      'suprailiacSkinfold',
      'calfSkinfold',
      'triceps',
      'biceps_skf',
      'iliac_skf',
      'calf_skf',
      'subscapula',
      'supraspinal',
    ].includes(r.id)
  );

  const s1 = report.somatotype?.m1;
  const s2 = report.somatotype?.m2;
  const s3 = report.somatotype?.m3;
  const hasAnySomato = Boolean(
    (s1 && (s1.endo > 0 || s1.meso > 0 || s1.ecto > 0)) ||
      (s2 && (s2.endo > 0 || s2.meso > 0 || s2.ecto > 0)) ||
      (s3 && (s3.endo > 0 || s3.meso > 0 || s3.ecto > 0))
  );

  const wb = XLSX.utils.book_new();

  // =========================================================================
  // SHEET 1: KATEGORİLİ KARNE ÖZETİ (Tüm Karne Yerleşimi Tek Kategorili Tablo)
  // =========================================================================
  const masterRows: CellVal[][] = [
    [
      safeCell(`SPORTSFLY LAB — KATEGORİLİ SPORCU PERFORMANS KARNESİ (${report.athleteName})`),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      safeCell(
        `Kulüp / Spor Okulu: ${report.clubName} (${report.branchName}) · Branş: ${report.sportBranch} · Rapor Tarihi: ${getLocalDateSlug()}`
      ),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [],
    [
      'Karne Sayfası',
      'Kategori',
      'Alt Kategori',
      'Parametre / Başlık',
      `1. Ölçüm (${report.date1 || 'I'})`,
      `2. Ölçüm (${report.date2 || 'II'})`,
      `3. Ölçüm (${report.date3 || '—'})`,
      'Güncel / Son Değer',
      'Birim',
      'Hedef / İdeal',
      'Yüzdelik (%) / SD',
      'Durum & Değerlendirme',
    ],
  ];

  // Category 1: Sporcu Kimlik & Kulüp Bilgileri
  const identityEntries: Array<[string, CellVal, string]> = [
    ['Sporcu Adı Soyadı', safeCell(report.athleteName), 'Metin'],
    ['Sporcu / Lisans Kodu', safeCell(report.athleteCode || '—'), 'Kod'],
    ['Kulüp / Spor Okulu', safeCell(report.clubName), 'Metin'],
    ['Şube / Grup', safeCell(report.branchName), 'Metin'],
    ['Spor Branşı', safeCell(report.sportBranch), 'Metin'],
    ['Cinsiyet', safeCell(report.gender), 'Metin'],
    ['Yaş (Yıl / Ay)', safeCell(`${report.ageYears} Yıl ${report.ageMonths} Ay`), 'Yaş'],
    ['Doğum Tarihi', safeCell(report.birthDate || '—'), 'Tarih'],
    ['1. Ölçüm Tarihi', safeCell(report.date1 || '—'), 'Tarih'],
    ['2. Ölçüm Tarihi', safeCell(report.date2 || '—'), 'Tarih'],
    ['3. Ölçüm Tarihi', safeCell(report.date3 || '—'), 'Tarih'],
    ['Sonraki Hedef Test Tarihi', safeCell(report.nextTargetDate || '—'), 'Tarih'],
  ];
  identityEntries.forEach(([label, val, unit]) => {
    masterRows.push([
      'Sayfa 1',
      '1. Sporcu Kimlik & Kulüp',
      'Genel Bilgiler',
      label,
      '—',
      '—',
      '—',
      val,
      unit,
      '—',
      '—',
      'Kayıtlı',
    ]);
  });

  // Category 2: Veli Bilgileri & Spor Geçmişi (Page 1 Cards)
  const pInfo = report.parentInfo;
  const parentEntries: Array<[string, string, CellVal, string]> = [
    ['Anne Bilgileri', 'Anne Boy / Kilo', safeCell(`${pInfo?.anneBoy || '—'} cm / ${pInfo?.anneKilo || '—'} kg`), 'cm / kg'],
    ['Anne Spor Geçmişi', 'Anne Spor Yapıyor mu?', safeCell(pInfo?.anneSporYapiyorMu || 'Belirtilmedi'), 'Durum'],
    ['Anne Spor Geçmişi', 'Anne Branş / Spor Geçmişi', safeCell(pInfo?.anneSporGecmisi || pInfo?.anneBranslar || '—'), 'Metin'],
    ['Baba Bilgileri', 'Baba Boy / Kilo', safeCell(`${pInfo?.babaBoy || '—'} cm / ${pInfo?.babaKilo || '—'} kg`), 'cm / kg'],
    ['Baba Spor Geçmişi', 'Baba Spor Yapıyor mu?', safeCell(pInfo?.babaSporYapiyorMu || 'Belirtilmedi'), 'Durum'],
    ['Baba Spor Geçmişi', 'Baba Branş / Spor Geçmişi', safeCell(pInfo?.babaSporGecmisi || pInfo?.babaBranslar || '—'), 'Metin'],
  ];
  parentEntries.forEach(([sub, label, val, unit]) => {
    masterRows.push([
      'Sayfa 1',
      '2. Veli & Spor Geçmişi',
      sub,
      label,
      '—',
      '—',
      '—',
      val,
      unit,
      '—',
      '—',
      'Veli Beyanı',
    ]);
  });

  // Category 3: Beden Kompozisyonu & Antropometri (Page 1 Table)
  displayedBody.forEach((row) => {
    const m1 = row.m1 > 0 ? row.m1 : 0;
    const m2 = getSafeM2Body(row);
    const m3 = hasBodyM3 && row.m3 > 0 ? row.m3 : '—';
    const activeVal = getActiveValue(row);
    masterRows.push([
      'Sayfa 1',
      '3. Beden Kompozisyonu & Antropometri',
      getBodySubCategory(row),
      safeCell(row.name),
      m1,
      m2,
      m3,
      activeVal,
      safeCell(row.unit),
      row.refMid,
      `%${row.percentile} (SD: ${row.sd > 0 ? `+${row.sd}` : row.sd})`,
      `${safeCell(row.status)} · ${getBodyTargetAssessment(row)}`,
    ]);
  });

  // Category 4: Heath-Carter Somatotip (Page 1.2)
  if (hasAnySomato) {
    const somatoRows: Array<[string, number, number, number | string, number | string]> = [
      ['Endomorfi (Göreceli Yağlılık)', s1?.endo ?? 0, s2?.endo ?? 0, s3?.endo ?? '—', report.somatotype.eliteRef?.endo ?? '—'],
      ['Mezomorfi (Kas-İskelet Gelişimi)', s1?.meso ?? 0, s2?.meso ?? 0, s3?.meso ?? '—', report.somatotype.eliteRef?.meso ?? '—'],
      ['Ektomorfi (İncelik / Doğrusallık)', s1?.ecto ?? 0, s2?.ecto ?? 0, s3?.ecto ?? '—', report.somatotype.eliteRef?.ecto ?? '—'],
    ];
    somatoRows.forEach(([label, v1, v2, v3, refVal]) => {
      const activeV = typeof v3 === 'number' && v3 > 0 ? v3 : v2 > 0 ? v2 : v1;
      masterRows.push([
        'Sayfa 1',
        '4. Heath-Carter Somatotip',
        safeCell(s3?.category || s2?.category || s1?.category || 'Somatotip'),
        label,
        v1,
        v2,
        v3,
        activeV,
        'Puan',
        refVal,
        '—',
        safeCell(`Elit Referans (${report.somatotype.eliteRef?.sport || report.sportBranch})`),
      ]);
    });
  }

  // Category 5: Biyolojik Olgunlaşma & PHV (Page 1 Bottom Banner)
  const phvEntries: Array<[string, CellVal, string, string]> = [
    ['PHV (Tepe Boy Hızı) Yaşı', report.phvAge, 'Yaş', report.maturationStatus || 'Zamanında'],
    ['PHV Dönemi Boy Tahmini', report.phvHeight, 'cm', 'Büyüme Atağı Projeksiyonu'],
    ['18. Yaş Yetişkin Boy Olasılığı', report.predictedAdultHeight, 'cm', 'Genetik & Antropometrik Projeksiyon'],
    ['Oturma Yüksekliği', report.sittingHeight, 'cm', 'Gövde-Bacak Oranı'],
    ['Büyüme / Olgunlaşma Durumu', safeCell(report.maturationStatus || '—'), 'Durum', 'Mirwald Biyolojik Olgunlaşma'],
  ];
  phvEntries.forEach(([label, val, unit, note]) => {
    masterRows.push([
      'Sayfa 1',
      '5. Biyolojik Olgunlaşma & PHV',
      'Büyüme Projeksiyonu',
      label,
      '—',
      '—',
      '—',
      val,
      unit,
      '—',
      '—',
      safeCell(note),
    ]);
  });

  // Category 6: Motor Performans Testleri (Page 2 Table)
  displayedMotor.forEach((row) => {
    const m1 = row.m1 > 0 ? row.m1 : 0;
    const m2 = getSafeM2Motor(row);
    const m3 = hasMotorM3 && row.m3 > 0 ? row.m3 : '—';
    const evalRes = evaluateMotorRowTargetAndStatus(row);
    masterRows.push([
      'Sayfa 2',
      '6. Motor Performans Testleri',
      evalRes.statusHeaderLabel,
      safeCell(row.name),
      m1,
      m2,
      m3,
      evalRes.activeVal,
      safeCell(row.unit),
      evalRes.targetValue,
      `%${evalRes.percentile} (SD: ${evalRes.sd > 0 ? `+${evalRes.sd}` : evalRes.sd})`,
      `${evalRes.statusHeaderLabel} · ${evalRes.verdict}`,
    ]);
  });

  // Category 7: Kritik Performans & Grup Kıyaslaması (Page 3)
  masterRows.push([
    'Sayfa 3',
    '7. Kritik Performans & Dönemsel Skorlar',
    'Genel Performans Skalası',
    '0-100 Biyomotorik Yetenek İndeksi',
    report.scoreHistory?.p1Score || activeScore,
    report.scoreHistory?.p2Score || activeScore,
    hasMotorM3 ? report.scoreHistory?.p3Score || activeScore : '—',
    activeScore,
    '% Puan',
    groupAvgScore,
    `Grup Ort: %${groupAvgScore}`,
    activeScore >= groupAvgScore
      ? `Grup Ortalamasının +${activeScore - groupAvgScore} Puan Üzerinde`
      : `Grup Ortalamasına ${activeScore - groupAvgScore} Puan Fark`,
  ]);

  criticalItems.forEach((c) => {
    masterRows.push([
      'Sayfa 3',
      '7. Kritik Performans & Dönemsel Skorlar',
      c.category,
      safeCell(c.metricName),
      '—',
      '—',
      '—',
      c.activeValue,
      safeCell(c.unit),
      `%${c.targetPercentile} (Hedef)`,
      `%${c.currentPercentile} (Grup: %${c.groupAvgPercentile})`,
      `Hedefe Ulaşım: %${c.progressToTarget} · ${c.comparisonStatus}`,
    ]);
  });

  // Category 8: Kardiyorespiratuar & Anaerobik Kapasite (if available)
  if (report.cardio && (report.cardio.test3Distance > 0 || report.cardio.test3Vo2 > 0)) {
    masterRows.push([
      'Sayfa 3',
      '8. Kardiyorespiratuar & Enerji',
      'Aerobik Dayanıklılık',
      'PACER Mekik Koşusu Mesafesi',
      report.cardio.test1Distance,
      report.cardio.test2Distance,
      report.cardio.test3Distance,
      report.cardio.test3Distance,
      'm',
      report.cardio.test3Distance + 160,
      `${report.cardio.test3Shuttles} Tur`,
      safeCell(report.cardio.test3Status || 'İyi'),
    ]);
    masterRows.push([
      'Sayfa 3',
      '8. Kardiyorespiratuar & Enerji',
      'Aerobik Dayanıklılık',
      'VO2peak Maksimal Oksijen Tüketimi',
      report.cardio.test1Vo2,
      report.cardio.test2Vo2,
      report.cardio.test3Vo2,
      report.cardio.test3Vo2,
      'ml/kg/dk',
      45,
      `${report.cardio.functionalCapacityMet} MET`,
      `BMR: ${report.cardio.basalMetabolicRate} kcal · Maks Nabız: ${report.cardio.maxHeartRate} bpm`,
    ]);
  }

  // Category 9: Branş Uyum Katsayısı & Gelişim Rehberi (Page 4)
  masterRows.push([
    'Sayfa 4',
    '9. Branş Uyumu & Gelişim Rehberi',
    'Branş Referans Skoru',
    safeCell(branchRef.branchTitle),
    '—',
    '—',
    '—',
    branchRef.scorePercentage,
    '%',
    100,
    `%${branchRef.scorePercentage}`,
    safeCell(branchRef.statusLabel),
  ]);
  branchRef.breakdown.forEach((b) => {
    masterRows.push([
      'Sayfa 4',
      '9. Branş Uyumu & Gelişim Rehberi',
      'Branş Alt Kırılımı',
      safeCell(b.label),
      '—',
      '—',
      '—',
      b.percent,
      '%',
      85,
      `%${b.percent}`,
      b.percent >= 75 ? 'Güçlü Uyum' : 'Gelişim Alanı',
    ]);
  });

  masterRows.push([
    'Sayfa 4',
    '10. Uzman Görüşü',
    'Antrenör & Laboratuvar Değerlendirmesi',
    'Nihai Uzman Görüşü',
    '—',
    '—',
    '—',
    safeCell(finalComment),
    'Metin',
    '—',
    '—',
    'Onaylı Karne Değerlendirmesi',
  ]);

  const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
  wsMaster['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
  ];
  wsMaster['!autofilter'] = {
    ref: `A4:L${masterRows.length}`,
  };
  wsMaster['!cols'] = computeAutoCols(masterRows, 11, 44);
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Kategorili_Karne_Ozeti');

  // =========================================================================
  // SHEET 2: 1_Kimlik_Veli_PHV
  // =========================================================================
  const profileSheetRows: CellVal[][] = [
    ['Kategori', 'Alan', 'Değer', 'Birim / Not'],
    ...identityEntries.map(([label, val, unit]): CellVal[] => ['Sporcu Kimlik & Kulüp', label, val, unit]),
    ...parentEntries.map(([sub, label, val, unit]): CellVal[] => [`Veli Bilgileri (${sub})`, label, val, unit]),
    ...phvEntries.map(([label, val, unit, note]): CellVal[] => ['Biyolojik Olgunlaşma & PHV', label, val, `${unit} · ${note}`]),
  ];
  if (hasAnySomato) {
    profileSheetRows.push([
      'Heath-Carter Somatotip',
      '1. Ölçüm (Endo / Mezo / Ekto)',
      `${s1?.endo ?? 0} / ${s1?.meso ?? 0} / ${s1?.ecto ?? 0}`,
      safeCell(s1?.category || ''),
    ]);
    profileSheetRows.push([
      'Heath-Carter Somatotip',
      '2. Ölçüm (Endo / Mezo / Ekto)',
      `${s2?.endo ?? 0} / ${s2?.meso ?? 0} / ${s2?.ecto ?? 0}`,
      safeCell(s2?.category || ''),
    ]);
    if (s3 && (s3.endo > 0 || s3.meso > 0 || s3.ecto > 0)) {
      profileSheetRows.push([
        'Heath-Carter Somatotip',
        '3. Ölçüm (Endo / Mezo / Ekto)',
        `${s3.endo} / ${s3.meso} / ${s3.ecto}`,
        safeCell(s3.category || ''),
      ]);
    }
    profileSheetRows.push([
      'Heath-Carter Somatotip',
      `Elit Referans (${report.somatotype.eliteRef?.sport || report.sportBranch})`,
      `${report.somatotype.eliteRef?.endo ?? 0} / ${report.somatotype.eliteRef?.meso ?? 0} / ${report.somatotype.eliteRef?.ecto ?? 0}`,
      'Hedef Referans Profil',
    ]);
  }
  const wsProfile = XLSX.utils.aoa_to_sheet(profileSheetRows);
  wsProfile['!autofilter'] = { ref: `A1:D${profileSheetRows.length}` };
  wsProfile['!cols'] = computeAutoCols(profileSheetRows, 14, 48);
  XLSX.utils.book_append_sheet(wb, wsProfile, '1_Kimlik_Veli_PHV');

  // =========================================================================
  // SHEET 3: 2_Beden_Kompozisyonu (Sayfa 1 Ölçülen Antropometri & Skinfold)
  // =========================================================================
  const bodySheetRows: CellVal[][] = [
    [
      'Alt Kategori',
      'Parametre',
      'Açıklama',
      `1. Ölçüm (${report.date1 || 'I'})`,
      `2. Ölçüm (${report.date2 || 'II'})`,
      `3. Ölçüm (${report.date3 || '—'})`,
      'Güncel Değer',
      'Birim',
      'Yüzdelik (%)',
      'SD Skoru',
      'Referans Alt',
      'İdeal / Hedef',
      'Referans Üst',
      'Durum',
      'Hedef Değerlendirmesi',
    ],
    ...displayedBody.map((row): CellVal[] => [
      getBodySubCategory(row),
      safeCell(row.name),
      safeCell(row.description),
      row.m1 > 0 ? row.m1 : 0,
      getSafeM2Body(row),
      hasBodyM3 && row.m3 > 0 ? row.m3 : '—',
      getActiveValue(row),
      safeCell(row.unit),
      row.percentile,
      row.sd,
      row.refLow,
      row.refMid,
      row.refHigh,
      safeCell(row.status),
      getBodyTargetAssessment(row),
    ]),
  ];

  if (skinfoldRows.length > 0) {
    bodySheetRows.push([]);
    bodySheetRows.push([
      'Bölgesel Skinfold Özeti',
      'Bölge',
      'Dönemsel Değişim Analizi',
      '1. Ölçüm (mm)',
      '2. Ölçüm (mm)',
      '3. Ölçüm (mm)',
      'Güncel (mm)',
      'Değişim (mm)',
    ]);
    skinfoldRows.forEach((sf) => {
      const activeSf = sf.m3 > 0 ? sf.m3 : sf.m2 > 0 ? sf.m2 : sf.m1;
      const delta = +(activeSf - sf.m1).toFixed(1);
      bodySheetRows.push([
        'Deri Kıvrımı (Skinfold)',
        safeCell(sf.name),
        delta <= 0 ? 'Yağsız kas tanımlaması olumlu' : 'Takip önerilir',
        sf.m1,
        sf.m2,
        sf.m3 > 0 ? sf.m3 : '—',
        activeSf,
        delta,
      ]);
    });
  }

  const wsBody = XLSX.utils.aoa_to_sheet(bodySheetRows);
  wsBody['!autofilter'] = { ref: `A1:O${displayedBody.length + 1}` };
  wsBody['!cols'] = computeAutoCols(bodySheetRows, 11, 40);
  XLSX.utils.book_append_sheet(wb, wsBody, '2_Beden_Kompozisyonu');

  // =========================================================================
  // SHEET 4: 3_Motor_Performans (Sayfa 2 Motor Testler — 3 Hedef Kategorisi)
  // =========================================================================
  const motorSheetRows: CellVal[][] = [
    [
      'Hedef Kategorisi',
      'Motor Performans Testi',
      `1. Test (${report.date1 || 'I'})`,
      `2. Test (${report.date2 || 'II'})`,
      `3. Test (${report.date3 || '—'})`,
      'Güncel Değer',
      'Hedef Değer',
      'Birim',
      'Yüzdelik (%)',
      'SD Skoru',
      'Referans Alt',
      'Referans Hedef',
      'Referans Üst',
      'Değerlendirme Kararı',
    ],
  ];

  const tierOrder: Record<string, number> = {
    needs_dev: 1,
    watch: 2,
    reached: 3,
  };
  const sortedMotor = [...displayedMotor].sort(
    (a, b) =>
      tierOrder[evaluateMotorRowTargetAndStatus(a).tier] -
      tierOrder[evaluateMotorRowTargetAndStatus(b).tier]
  );

  sortedMotor.forEach((row) => {
    const evalRes = evaluateMotorRowTargetAndStatus(row);
    motorSheetRows.push([
      evalRes.statusHeaderLabel,
      safeCell(row.name),
      row.m1 > 0 ? row.m1 : 0,
      getSafeM2Motor(row),
      hasMotorM3 && row.m3 > 0 ? row.m3 : '—',
      evalRes.activeVal,
      evalRes.targetValue,
      safeCell(row.unit),
      evalRes.percentile,
      evalRes.sd,
      row.lowerIsBetter ? row.refHigh : row.refLow,
      row.refMid,
      row.lowerIsBetter ? row.refLow : row.refHigh,
      evalRes.verdict,
    ]);
  });

  const wsMotor = XLSX.utils.aoa_to_sheet(motorSheetRows);
  wsMotor['!autofilter'] = { ref: `A1:N${motorSheetRows.length}` };
  wsMotor['!cols'] = computeAutoCols(motorSheetRows, 11, 36);
  XLSX.utils.book_append_sheet(wb, wsMotor, '3_Motor_Performans');

  // =========================================================================
  // SHEET 5: 4_Kritik_Skor_Uzman (Sayfa 3 & 4 Kritik, Branş Uyumu, Öneriler, Uzman)
  // =========================================================================
  const summarySheetRows: CellVal[][] = [
    ['Bölüm', 'Kategori', 'Başlık / Metrik', 'Değer', 'Hedef / Grup Ort.', 'Durum / Tavsiye'],
    [
      'Dönemsel Skorlar',
      'Genel İndeks',
      '1. Test Dönemi Puanı',
      report.scoreHistory?.p1Score || activeScore,
      `Tarih: ${report.scoreHistory?.p1Date || report.date1 || '—'}`,
      'Başlangıç Referansı',
    ],
    [
      'Dönemsel Skorlar',
      'Genel İndeks',
      '2. Test Dönemi Puanı (Tahmini)',
      report.scoreHistory?.p2Score || activeScore,
      `Tarih: ${report.scoreHistory?.p2Date || report.date2 || '—'}`,
      'Gelişim Projeksiyonu',
    ],
    [
      'Dönemsel Skorlar',
      'Genel İndeks',
      'Güncel Biyomotorik Yetenek İndeksi',
      activeScore,
      `Grup Ort: %${groupAvgScore}`,
      activeScore >= groupAvgScore ? 'Grup Ortalamasının Üzerinde' : 'Gelişim Takibinde',
    ],
    ...criticalItems.map((c): CellVal[] => [
      'Kritik 4 Performans',
      c.category,
      safeCell(c.metricName),
      `${c.activeValue} ${c.unit} (%${c.currentPercentile})`,
      `Hedef: %${c.targetPercentile} · Grup: %${c.groupAvgPercentile}`,
      `Hedefe Ulaşım: %${c.progressToTarget} · ${c.comparisonStatus}`,
    ]),
    [
      'Branş Uyumu',
      'Genel Katsayı',
      safeCell(branchRef.branchTitle),
      `%${branchRef.scorePercentage}`,
      'Hedef: %85+',
      safeCell(branchRef.statusLabel),
    ],
    ...branchRef.breakdown.map((b): CellVal[] => [
      'Branş Uyumu',
      'Alt Kırılım',
      safeCell(b.label),
      `%${b.percent}`,
      'Referans: %75+',
      b.percent >= 75 ? 'Güçlü Uyum' : 'Desteklenmeli',
    ]),
  ];

  // Gelişim Öncelikleri (Page 4)
  const rawAreas = report.aiRecommendations?.improvementAreas || [];
  const topDevAreas =
    rawAreas.length > 0
      ? rawAreas.slice(0, 4).map((a) => ({
          metric: a.metricName,
          current: a.currentValue,
          target: a.targetValue,
          rec: `${a.drillRecommendation} (${a.weeklyFrequency})`,
        }))
      : [...displayedMotor]
          .sort((a, b) => a.percentile - b.percentile)
          .slice(0, 4)
          .map((m) => {
            const ev = evaluateMotorRowTargetAndStatus(m);
            return {
              metric: m.name,
              current: `${ev.activeVal} ${m.unit}`,
              target: `${ev.targetValue} ${m.unit}`,
              rec: `${m.name} odaklı spesifik koordinasyon, kuvvet ve nöromüsküler gelişim drilleri (Haftada 2-3 Gün · 3 Set)`,
            };
          });

  topDevAreas.forEach((area) => {
    summarySheetRows.push([
      'Gelişim Rehberi (Sayfa 4)',
      'Öncelikli Gelişim Alanı',
      safeCell(area.metric),
      safeCell(area.current),
      `Hedef: ${safeCell(area.target)}`,
      safeCell(area.rec),
    ]);
  });

  summarySheetRows.push([
    'Uzman Görüşü (Sayfa 4)',
    'Değerlendirme',
    'Antrenör & Laboratuvar Nihai Notu',
    safeCell(finalComment),
    safeCell(`Sonraki Test: ${report.nextTargetDate || '—'}`),
    'Rota Performans / SportsFly Lab',
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetRows);
  wsSummary['!autofilter'] = { ref: `A1:F${summarySheetRows.length}` };
  wsSummary['!cols'] = computeAutoCols(summarySheetRows, 14, 52);
  XLSX.utils.book_append_sheet(wb, wsSummary, '4_Kritik_Skor_Uzman');

  const fileName =
    options?.fileNameOverride ||
    `SportsFly_Lab_Kategorili_Karne_${sanitizeFileSlug(report.athleteName)}_${getLocalDateSlug()}.xlsx`;

  XLSX.writeFile(wb, fileName);
  return fileName;
}

/**
 * Downloads a multi-athlete categorized Excel workbook (.xlsx) for Batch / Group Report Cards,
 * organized into 4 categorized sheets matching the downloadable karne layout across all selected athletes:
 *  - Sheet 1: Kategorili_Genel_Ozet
 *  - Sheet 2: 1_Antropometri_ve_PHV
 *  - Sheet 3: 2_Motor_Performans_Karsilastirma
 *  - Sheet 4: 3_Skor_Brans_ve_Uzman_Notlari
 */
export function downloadBatchCategorizedKarneExcel(
  rawReports: SportsFlyLabReport[],
  groupTitle?: string
): string {
  const activeBranding = getStoredLabSchoolBranding();
  const reports = rawReports.map((r) => applyBrandingToReport(r, activeBranding));
  const wb = XLSX.utils.book_new();

  // Collect union of all measured body & motor parameters across the group
  const bodyParamMap = new Map<string, { id: string; name: string; unit: string }>();
  const motorParamMap = new Map<string, { id: string; name: string; unit: string }>();

  reports.forEach((rep) => {
    getDisplayedBodyComposition(rep).forEach((b) => {
      if (!bodyParamMap.has(b.id)) {
        bodyParamMap.set(b.id, { id: b.id, name: b.name, unit: b.unit });
      }
    });
    getDisplayedMotorPerformance(rep).forEach((m) => {
      if (!motorParamMap.has(m.id)) {
        motorParamMap.set(m.id, { id: m.id, name: m.name, unit: m.unit });
      }
    });
  });

  const bodyParams = Array.from(bodyParamMap.values());
  const motorParams = Array.from(motorParamMap.values());

  // =========================================================================
  // SHEET 1: Kategorili_Genel_Ozet
  // =========================================================================
  const overviewHeaders: CellVal[] = [
    'Sporcu Adı',
    'Sporcu Kodu',
    'Kulüp / Şube',
    'Branş',
    'Cinsiyet',
    'Yaş',
    'Ölçüm Tarihi',
    'Boy (cm)',
    'Ağırlık (kg)',
    'BKİ (kg/m²)',
    'PHV Yaşı',
    '18 Yaş Boy Tahmini (cm)',
    'Olgunlaşma Durumu',
    'Genel Skor (%)',
    'Branş Uyumu (%)',
    'Hedefe Ulaştı (Test)',
    'Takip Edilmeli (Test)',
    'Gelişim Göstermeli (Test)',
  ];

  const overviewRows: CellVal[][] = [
    [
      safeCell(
        `SPORTSFLY LAB — TOPLU KATEGORİLİ KARNE TABLOSU (${groupTitle || `${reports.length} Sporcu`})`
      ),
    ],
    overviewHeaders,
  ];

  reports.forEach((rep) => {
    const body = getDisplayedBodyComposition(rep);
    const motor = getDisplayedMotorPerformance(rep);
    const getB = (id: string) => {
      const row = body.find((x) => x.id === id);
      return row ? getActiveValue(row) : '—';
    };
    const evals = motor.map((m) => evaluateMotorRowTargetAndStatus(m));
    const reached = evals.filter((e) => e.tier === 'reached').length;
    const watch = evals.filter((e) => e.tier === 'watch').length;
    const needsDev = evals.filter((e) => e.tier === 'needs_dev').length;
    const branchRef = calculateBranchReferenceScore(rep);

    overviewRows.push([
      safeCell(rep.athleteName),
      safeCell(rep.athleteCode || '—'),
      safeCell(`${rep.clubName} / ${rep.branchName}`),
      safeCell(rep.sportBranch),
      safeCell(rep.gender),
      rep.ageYears,
      safeCell(rep.date3 && rep.date3 !== '—' ? rep.date3 : rep.date1 || '—'),
      getB('height'),
      getB('weight'),
      getB('bmi'),
      rep.phvAge,
      rep.predictedAdultHeight,
      safeCell(rep.maturationStatus || '—'),
      getReportActiveScore(rep),
      branchRef.scorePercentage,
      reached,
      watch,
      needsDev,
    ]);
  });

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
  wsOverview['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: overviewHeaders.length - 1 } }];
  wsOverview['!autofilter'] = { ref: `A2:R${overviewRows.length}` };
  wsOverview['!cols'] = computeAutoCols(overviewRows, 12, 32);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Kategorili_Genel_Ozet');

  // =========================================================================
  // SHEET 2: 1_Antropometri_ve_PHV
  // =========================================================================
  const anthroHeaders: CellVal[] = [
    'Sporcu Adı',
    'Branş',
    'Cinsiyet',
    'Yaş',
    ...bodyParams.map((p) => `${p.name} (${p.unit})`),
    'PHV Yaşı',
    'Tahmini 18 Yaş Boyu (cm)',
    'Anne Boy/Kilo',
    'Baba Boy/Kilo',
  ];
  const anthroRows: CellVal[][] = [anthroHeaders];
  reports.forEach((rep) => {
    const body = getDisplayedBodyComposition(rep);
    anthroRows.push([
      safeCell(rep.athleteName),
      safeCell(rep.sportBranch),
      safeCell(rep.gender),
      rep.ageYears,
      ...bodyParams.map((p) => {
        const found = body.find((b) => b.id === p.id);
        return found ? getActiveValue(found) : '—';
      }),
      rep.phvAge,
      rep.predictedAdultHeight,
      safeCell(`${rep.parentInfo?.anneBoy || '—'} cm / ${rep.parentInfo?.anneKilo || '—'} kg`),
      safeCell(`${rep.parentInfo?.babaBoy || '—'} cm / ${rep.parentInfo?.babaKilo || '—'} kg`),
    ]);
  });
  const wsAnthro = XLSX.utils.aoa_to_sheet(anthroRows);
  wsAnthro['!cols'] = computeAutoCols(anthroRows, 12, 28);
  XLSX.utils.book_append_sheet(wb, wsAnthro, '1_Antropometri_ve_PHV');

  // =========================================================================
  // SHEET 3: 2_Motor_Performans_Tablosu
  // =========================================================================
  const motorHeaders: CellVal[] = [
    'Sporcu Adı',
    'Branş',
    'Genel Skor (%)',
    ...motorParams.flatMap((p) => [`${p.name} (${p.unit})`, `${p.name} (%)`]),
  ];
  const motorRows: CellVal[][] = [motorHeaders];
  reports.forEach((rep) => {
    const motor = getDisplayedMotorPerformance(rep);
    motorRows.push([
      safeCell(rep.athleteName),
      safeCell(rep.sportBranch),
      getReportActiveScore(rep),
      ...motorParams.flatMap<CellVal>((p): CellVal[] => {
        const found = motor.find((m) => m.id === p.id);
        if (!found) return ['—', '—'];
        const ev = evaluateMotorRowTargetAndStatus(found);
        return [ev.activeVal, ev.percentile];
      }),
    ]);
  });
  const wsMotorBatch = XLSX.utils.aoa_to_sheet(motorRows);
  wsMotorBatch['!cols'] = computeAutoCols(motorRows, 12, 28);
  XLSX.utils.book_append_sheet(wb, wsMotorBatch, '2_Motor_Performans_Tablosu');

  // =========================================================================
  // SHEET 4: 3_Skor_Brans_ve_Uzman
  // =========================================================================
  const expertHeaders: CellVal[] = [
    'Sporcu Adı',
    'Branş',
    '1. Dönem (%)',
    '2. Dönem (%)',
    'Güncel Skor (%)',
    'Branş Uyum Skoru (%)',
    'Branş Uyum Durumu',
    'Uzman Görüşü',
  ];
  const expertRows: CellVal[][] = [expertHeaders];
  reports.forEach((rep) => {
    const branchRef = calculateBranchReferenceScore(rep);
    const activeScore = getReportActiveScore(rep);
    const comment =
      !rep.expertComment || isStaleExpertComment(rep.expertComment, rep)
        ? generateAthleteInterpretiveExpertComment(rep)
        : rep.expertComment;
    expertRows.push([
      safeCell(rep.athleteName),
      safeCell(rep.sportBranch),
      rep.scoreHistory?.p1Score || activeScore,
      rep.scoreHistory?.p2Score || activeScore,
      activeScore,
      branchRef.scorePercentage,
      safeCell(branchRef.statusLabel),
      safeCell(comment),
    ]);
  });
  const wsExpert = XLSX.utils.aoa_to_sheet(expertRows);
  wsExpert['!autofilter'] = { ref: `A1:H${expertRows.length}` };
  wsExpert['!cols'] = computeAutoCols(expertRows, 14, 54);
  XLSX.utils.book_append_sheet(wb, wsExpert, '3_Skor_Brans_ve_Uzman');

  const safeGroupSlug = sanitizeFileSlug(groupTitle || `${reports.length}_Sporcu`);
  const fileName = `SportsFly_Lab_Toplu_Kategorili_Karne_${safeGroupSlug}_${getLocalDateSlug()}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
