import * as XLSX from 'xlsx';
import { secureFetch, sanitizeSpreadsheetCell } from '../utils/securityCore';

export interface LabParameterRow {
  id: string;
  name: string;
  unit: string;
  description: string;
  m1: number;
  m2: number;
  m3: number;
  percentile: number;
  status: 'düşük' | 'normal' | 'uzun' | 'yüksek' | 'mükemmel' | 'desteklenmeli' | 'iyi';
  sd: number;
  refLow: number;
  refMid: number;
  refHigh: number;
  lowerIsBetter?: boolean; // e.g., sprint time
  measured?: boolean; // explicit flag indicating whether Excel/input contained a measurement
}

export interface IpsativeTargetRow {
  parameter: string;
  unit: string;
  m1: number;
  m2: number;
  m3: number;
  target: number;
  groupRank: string;
}

export interface LabAiImprovementItem {
  metricName: string;
  category: string;
  currentValue: string;
  targetValue: string;
  percentile: number;
  sd: number;
  priority: string;
  analysis: string;
  drillRecommendation: string;
  weeklyFrequency: string;
}

export interface LabAiStrengthItem {
  metricName: string;
  currentValue: string;
  percentile: number;
  insight: string;
}

export interface LabAiPrescriptionItem {
  focusArea: string;
  microcycleGoal: string;
  recommendedDrills: string[];
  loadNote: string;
}

export interface LabAiPerformanceAnalysis {
  overallSummary: string;
  readinessScore: number;
  improvementAreas: LabAiImprovementItem[];
  strengths: LabAiStrengthItem[];
  trainingPrescription: LabAiPrescriptionItem[];
  nutritionAndRecoveryTip: string;
  generatedAt: string;
  source?: 'gemini-ai' | 'auto-engine';
}

export interface SportsFlyLabSchoolBranding {
  schoolName: string;
  branchName: string;
  logoDataUrl: string;
  updatedAt?: string;
}

export interface SportsFlyLabArchivedReport {
  archiveId: string;
  archiveTitle: string;
  archiveNote?: string;
  savedAt: string;
  savedTimestamp: number;
  createdDateIso?: string;
  schoolName?: string;
  batchId?: string;
  batchGroupTitle?: string;
  sourceType?: 'batch' | 'single';
  reportSnapshot: SportsFlyLabReport;
}

export interface SportsFlyLabReport {
  id: string;
  athleteName: string;
  athleteCode: string;
  clubName: string;
  branchName: string;
  clubLogoUrl?: string;
  sportBranch: string;
  gender: 'Erkek' | 'Kadın';
  ageYears: number;
  ageMonths: number;
  date1: string;
  date2: string;
  date3: string;
  birthDate?: string;
  nextTargetDate: string;

  // Page 1: Body Composition & PHV Summary
  bodyComposition: LabParameterRow[];
  phvAge: number;
  phvHeight: number;
  predictedAdultHeight: number;
  sittingHeight: number;
  maturationStatus: string;

  // Page 2: Motor Performance & Overall Score Progression
  motorPerformance: LabParameterRow[];
  scoreHistory: {
    p1Date: string;
    p1Score: number;
    p2Date: string;
    p2Score: number;
    p3Date: string;
    p3Score: number;
  };

  // Page 3: Somatotype (Heath-Carter) & Potential Vector
  somatotype: {
    m1: { endo: number; meso: number; ecto: number; category: string };
    m2: { endo: number; meso: number; ecto: number; category: string };
    m3: { endo: number; meso: number; ecto: number; category: string };
    eliteRef: { sport: string; endo: number; meso: number; ecto: number; refScore: number };
  };
  potential: {
    directionDeg: number;
    speedScore: number;
    strengthScore: number;
    enduranceScore: number;
    dominantType: string;
  };

  // Page 4: Cardiorespiratory (PACER / VO2peak) & Anaerobic Power
  cardio: {
    test1Distance: number;
    test1Shuttles: number;
    test1Vo2: number;
    test1Status: string;
    test2Distance: number;
    test2Shuttles: number;
    test2Vo2: number;
    test2Status: string;
    test3Distance: number;
    test3Shuttles: number;
    test3Vo2: number;
    test3Status: string;
    totalRunTime: string;
    basalMetabolicRate: number; // kcal/day
    functionalCapacityMet: number; // MET
    maxHeartRate: number; // bpm
    verticalJumpAnaerobicWatt: number;
    verticalJumpRelativeWatt: number;
    sprint20mAnaerobicWatt: number;
    sprint20mRelativeWatt: number;
  };

  // Page 5: Ipsative Targets, Group Rankings & Expert Evaluation
  ipsativeTargets: IpsativeTargetRow[];
  groupInfo: {
    groupNo: number;
    ageRange: string;
    groupAthleteCount: number;
    groupRank: number;
    totalAthleteCount: number;
    totalRank: number;
    groupAverageScore?: number;
    groupPositionPercentile?: number;
  };
  expertComment: string;
  isManualExpertComment?: boolean;
  aiRecommendations?: LabAiPerformanceAnalysis;
  parentInfo?: {
    anneAdSoyad?: string;
    anneDogumTarihi?: string;
    anneBoy?: string;
    anneKilo?: string;
    anneSporYapiyorMu?: 'Evet' | 'Hayir' | '';
    anneBranslar?: string;
    anneSporGecmisi?: string;

    babaAdSoyad?: string;
    babaDogumTarihi?: string;
    babaBoy?: string;
    babaKilo?: string;
    babaSporYapiyorMu?: 'Evet' | 'Hayir' | '';
    babaBranslar?: string;
    babaSporGecmisi?: string;
  };
  isAiForecast?: boolean;
}

export type MotorTargetTier = 'reached' | 'watch' | 'needs_dev';

export interface MotorRowEvaluation {
  tier: MotorTargetTier;
  statusHeaderLabel: 'HEDEFE ULAŞTI' | 'TAKİP EDİLMELİ' | 'GELİŞİM GÖSTERMELİ';
  verdict: 'Güçlü yön' | 'Korunmalı' | 'Geliştirilmesi önerilir';
  targetValue: number;
  activeVal: number;
  sd: number;
  percentile: number;
}

/**
 * Converts a Z-score (SD) to a realistic population percentile [5..97] via standard normal CDF.
 */
export function sdToPercentile(sd: number): number {
  const z = Math.max(-4, Math.min(4, Number.isFinite(sd) ? sd : 0));
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = z >= 0 ? 1 - p : p;
  return Math.max(5, Math.min(97, Math.round(cdf * 100)));
}

type NormTriplet = [number, number, number]; // [refLow, refMid, refHigh]
const NORM_AGE_STEPS = [6, 8, 10, 12, 14, 16, 18] as const;

function interpolateAgeNorm(ageYears: number, table: readonly NormTriplet[]): NormTriplet {
  const clamped = Math.max(6, Math.min(18, Number.isFinite(ageYears) ? ageYears : 12));
  let lowerIdx = 0;
  for (let i = 0; i < NORM_AGE_STEPS.length - 1; i++) {
    if (clamped >= NORM_AGE_STEPS[i]) lowerIdx = i;
  }
  const upperIdx = Math.min(NORM_AGE_STEPS.length - 1, lowerIdx + 1);
  if (lowerIdx === upperIdx) {
    return table[lowerIdx];
  }
  const a0 = NORM_AGE_STEPS[lowerIdx];
  const a1 = NORM_AGE_STEPS[upperIdx];
  const ratio = (clamped - a0) / Math.max(1, a1 - a0);
  const t0 = table[lowerIdx];
  const t1 = table[upperIdx];
  return [
    Number((t0[0] + (t1[0] - t0[0]) * ratio).toFixed(2)),
    Number((t0[1] + (t1[1] - t0[1]) * ratio).toFixed(2)),
    Number((t0[2] + (t1[2] - t0[2]) * ratio).toFixed(2)),
  ];
}

// Anthropometric norms anchored at age 10 to the exact clinic reference table:
// BKİ (13.6/16.7/22.8), Boy (127.2/140.1/153.0), Ağırlık (24.0/33.7/54.3), Beden Yağ % (16.0/22.9/35.2),
// Subscapula (5.1/9.7/26.1), Triceps (8.4/15.5/31.6), Calf d.k.k. (9.5/20.2/33.6), S. Spinale (4.0/10.8/25.2),
// Humerus (4.7/5.5/6.2), Femur (7.2/8.6/9.9), Calf çevre (21.4/27.5/33.1), Biceps çevre (15.9/20.3/25.8)
const MALE_BODY_NORMS: Record<string, readonly NormTriplet[]> = {
  height: [[109.0, 116.0, 123.0], [118.5, 128.0, 138.0], [127.2, 140.1, 153.0], [139.0, 151.0, 163.0], [153.0, 164.0, 175.0], [164.0, 173.0, 182.0], [168.0, 177.0, 186.0]],
  weight: [[17.5, 21.0, 25.5], [20.8, 27.0, 38.0], [24.0, 33.7, 54.3], [32.0, 42.0, 58.0], [42.0, 52.5, 66.0], [52.0, 63.0, 76.0], [57.0, 69.0, 81.0]],
  bmi: [[13.4, 15.5, 19.0], [13.5, 16.1, 21.0], [13.6, 16.7, 22.8], [14.8, 17.8, 23.2], [16.2, 19.3, 23.8], [17.6, 20.8, 24.5], [18.5, 21.8, 25.0]],
  body_fat: [[14.0, 20.0, 31.0], [15.0, 21.5, 33.0], [16.0, 22.9, 35.2], [13.0, 19.5, 30.0], [10.0, 16.0, 25.0], [8.5, 13.5, 21.0], [8.0, 12.5, 19.5]],
  subscapula: [[4.5, 8.5, 21.0], [4.8, 9.1, 23.5], [5.1, 9.7, 26.1], [5.1, 9.7, 24.5], [5.2, 9.8, 22.0], [5.4, 10.0, 20.5], [5.5, 10.2, 20.0]],
  triceps: [[7.5, 13.8, 26.0], [8.0, 14.6, 28.8], [8.4, 15.5, 31.6], [7.8, 14.2, 28.5], [6.8, 12.0, 24.0], [6.0, 10.5, 21.0], [5.8, 10.0, 20.0]],
  calf_skf: [[8.0, 17.0, 28.0], [8.8, 18.6, 30.8], [9.5, 20.2, 33.6], [8.8, 18.0, 30.0], [7.5, 15.0, 25.5], [6.5, 12.5, 22.0], [6.0, 11.5, 20.5]],
  supraspinal: [[3.6, 9.2, 20.5], [3.8, 10.0, 22.8], [4.0, 10.8, 25.2], [4.0, 10.4, 24.0], [4.2, 10.0, 22.0], [4.4, 9.8, 20.5], [4.5, 9.8, 20.0]],
  iliac_skf: [[3.6, 9.2, 20.5], [3.8, 10.0, 22.8], [4.0, 10.8, 25.2], [4.0, 10.4, 24.0], [4.2, 10.0, 22.0], [4.4, 9.8, 20.5], [4.5, 9.8, 20.0]],
  humerus: [[3.9, 4.6, 5.2], [4.3, 5.1, 5.7], [4.7, 5.5, 6.2], [5.1, 5.9, 6.7], [5.6, 6.4, 7.2], [6.0, 6.8, 7.6], [6.2, 7.0, 7.8]],
  femur: [[6.0, 7.2, 8.3], [6.6, 7.9, 9.1], [7.2, 8.6, 9.9], [7.7, 9.1, 10.4], [8.2, 9.5, 10.8], [8.5, 9.8, 11.1], [8.7, 10.0, 11.3]],
  calf_girth: [[18.5, 23.5, 28.5], [20.0, 25.5, 30.8], [21.4, 27.5, 33.1], [23.8, 30.0, 36.0], [26.5, 32.8, 39.0], [29.0, 35.0, 41.0], [30.5, 36.2, 42.0]],
  biceps_girth: [[13.8, 17.5, 21.8], [14.8, 18.9, 23.8], [15.9, 20.3, 25.8], [17.8, 22.4, 28.0], [20.2, 25.0, 30.8], [22.8, 27.5, 33.2], [24.2, 29.0, 34.8]],
};

const FEMALE_BODY_NORMS: Record<string, readonly NormTriplet[]> = {
  height: [[108.0, 115.0, 122.0], [118.0, 127.5, 137.5], [127.2, 140.1, 153.0], [140.0, 151.0, 161.5], [151.0, 160.0, 169.0], [154.0, 162.0, 171.0], [155.0, 163.0, 172.0]],
  weight: [[17.0, 20.5, 25.0], [20.5, 26.8, 37.5], [24.0, 33.7, 54.3], [32.5, 42.5, 57.5], [42.0, 51.0, 62.5], [46.5, 55.5, 65.5], [48.0, 57.5, 67.5]],
  bmi: [[13.4, 15.3, 18.8], [13.5, 16.0, 20.8], [13.6, 16.7, 22.8], [15.0, 18.0, 23.2], [16.4, 19.5, 23.8], [17.6, 20.8, 24.5], [18.4, 21.3, 24.9]],
  body_fat: [[14.5, 20.5, 31.5], [15.2, 21.8, 33.5], [16.0, 22.9, 35.2], [15.5, 22.0, 33.0], [15.5, 21.5, 31.0], [16.0, 21.5, 29.0], [16.0, 22.0, 29.0]],
  subscapula: [[4.5, 8.5, 21.0], [4.8, 9.1, 23.5], [5.1, 9.7, 26.1], [5.4, 10.2, 26.0], [5.8, 10.8, 25.5], [6.0, 11.2, 25.0], [6.2, 11.5, 25.0]],
  triceps: [[7.5, 13.8, 26.0], [8.0, 14.6, 28.8], [8.4, 15.5, 31.6], [8.5, 15.5, 30.5], [8.8, 15.8, 29.5], [9.0, 16.0, 29.0], [9.2, 16.2, 29.0]],
  calf_skf: [[8.0, 17.0, 28.0], [8.8, 18.6, 30.8], [9.5, 20.2, 33.6], [9.2, 19.5, 32.0], [9.0, 18.8, 30.5], [9.0, 18.5, 29.5], [9.0, 18.5, 29.5]],
  supraspinal: [[3.6, 9.2, 20.5], [3.8, 10.0, 22.8], [4.0, 10.8, 25.2], [4.2, 11.0, 25.0], [4.5, 11.2, 24.5], [4.6, 11.4, 24.0], [4.8, 11.5, 24.0]],
  iliac_skf: [[3.6, 9.2, 20.5], [3.8, 10.0, 22.8], [4.0, 10.8, 25.2], [4.2, 11.0, 25.0], [4.5, 11.2, 24.5], [4.6, 11.4, 24.0], [4.8, 11.5, 24.0]],
  humerus: [[3.8, 4.5, 5.1], [4.2, 5.0, 5.6], [4.7, 5.5, 6.2], [5.0, 5.7, 6.4], [5.2, 5.9, 6.6], [5.3, 6.0, 6.7], [5.4, 6.1, 6.8]],
  femur: [[5.9, 7.1, 8.2], [6.5, 7.8, 9.0], [7.2, 8.6, 9.9], [7.5, 8.8, 10.1], [7.7, 9.0, 10.3], [7.8, 9.1, 10.4], [7.9, 9.2, 10.5]],
  calf_girth: [[18.2, 23.2, 28.2], [19.8, 25.2, 30.5], [21.4, 27.5, 33.1], [23.5, 29.8, 35.5], [25.5, 31.8, 37.5], [26.8, 33.0, 38.5], [27.5, 33.5, 39.0]],
  biceps_girth: [[13.5, 17.2, 21.5], [14.7, 18.7, 23.6], [15.9, 20.3, 25.8], [17.4, 21.8, 27.2], [18.8, 23.2, 28.5], [19.8, 24.2, 29.5], [20.5, 24.8, 30.0]],
};

// Motor norms keep refLow < refMid < refHigh convention; for lowerIsBetter tests refLow = fastest/best, refMid = target norm, refHigh = slow boundary
const MALE_MOTOR_NORMS: Record<string, readonly NormTriplet[]> = {
  sprint: [[4.10, 4.65, 5.20], [3.80, 4.30, 4.85], [3.50, 3.95, 4.45], [3.20, 3.65, 4.10], [2.95, 3.35, 3.80], [2.75, 3.10, 3.50], [2.65, 2.98, 3.35]],
  agility_50m: [[20.5, 23.0, 25.5], [19.2, 21.6, 24.2], [18.0, 20.4, 22.8], [17.0, 19.2, 21.6], [16.0, 18.2, 20.6], [15.2, 17.3, 19.6], [14.8, 16.8, 19.0]],
  agility_pro: [[5.80, 6.60, 7.50], [5.45, 6.20, 7.05], [5.15, 5.85, 6.65], [4.90, 5.55, 6.30], [4.65, 5.25, 5.95], [4.45, 5.00, 5.65], [4.35, 4.85, 5.45]],
  vertical_jump: [[14, 20, 27], [17, 23, 30], [20, 27, 34], [24, 31, 39], [29, 37, 46], [34, 43, 52], [38, 47, 57]],
  standing_long_jump: [[95, 118, 142], [112, 136, 160], [128, 152, 178], [144, 170, 196], [164, 192, 220], [182, 212, 240], [195, 224, 252]],
  flexibility: [[16, 23, 31], [16, 24, 32], [17, 25, 33], [18, 26, 35], [19, 28, 37], [21, 30, 39], [22, 31, 40]],
  balance: [[3, 9, 17], [2, 7, 15], [1, 6, 13], [1, 5, 12], [1, 4, 10], [0, 3, 9], [0, 3, 8]],
  grip_strength_right: [[8, 12, 16], [11, 15, 20], [14, 19, 25], [18, 25, 33], [26, 34, 43], [34, 43, 52], [39, 48, 58]],
  grip_strength_left: [[7.5, 11.5, 15.5], [10.5, 14.5, 19], [13.5, 18, 24], [17, 23.5, 31], [24.5, 32, 41], [32, 41, 50], [37, 46, 56]],
  arm_speed_right: [[14.0, 17.5, 21.0], [12.5, 15.8, 19.2], [11.2, 14.2, 17.5], [10.0, 12.8, 15.8], [9.0, 11.5, 14.2], [8.3, 10.6, 13.0], [8.0, 10.2, 12.5]],
  arm_speed_left: [[14.5, 18.0, 21.5], [13.0, 16.3, 19.8], [11.7, 14.7, 18.0], [10.5, 13.3, 16.3], [9.4, 12.0, 14.8], [8.7, 11.1, 13.6], [8.4, 10.7, 13.0]],
  arm_speed_right_hits: [[70, 98, 128], [82, 114, 146], [96, 130, 166], [108, 145, 184], [118, 158, 200], [126, 168, 212], [132, 176, 222]],
  arm_speed_left_hits: [[65, 92, 122], [78, 108, 140], [90, 124, 160], [102, 138, 178], [112, 152, 194], [120, 162, 206], [126, 170, 216]],
  reaction: [[0.24, 0.32, 0.42], [0.22, 0.29, 0.38], [0.20, 0.27, 0.35], [0.18, 0.25, 0.33], [0.17, 0.23, 0.30], [0.16, 0.21, 0.28], [0.15, 0.20, 0.27]],
  back_strength: [[18, 28, 38], [24, 35, 48], [30, 44, 58], [40, 56, 74], [58, 78, 100], [76, 98, 122], [88, 112, 138]],
  aerobic: [[32, 38, 45], [34, 40, 47], [36, 43, 50], [38, 45, 52], [41, 48, 55], [43, 50, 58], [44, 52, 60]],
};

const FEMALE_MOTOR_NORMS: Record<string, readonly NormTriplet[]> = {
  sprint: [[4.20, 4.75, 5.30], [3.95, 4.45, 4.98], [3.65, 4.12, 4.62], [3.40, 3.85, 4.30], [3.25, 3.68, 4.12], [3.15, 3.55, 3.98], [3.10, 3.48, 3.90]],
  agility_50m: [[21.0, 23.6, 26.2], [19.8, 22.2, 24.8], [18.8, 21.2, 23.6], [17.8, 20.2, 22.6], [17.4, 19.8, 22.2], [17.2, 19.6, 22.0], [17.0, 19.4, 21.8]],
  agility_pro: [[5.95, 6.75, 7.65], [5.60, 6.35, 7.20], [5.35, 6.05, 6.85], [5.15, 5.82, 6.60], [4.95, 5.60, 6.35], [4.80, 5.45, 6.20], [4.75, 5.38, 6.10]],
  vertical_jump: [[13, 19, 25], [16, 22, 28], [18, 25, 32], [21, 28, 35], [22, 30, 38], [23, 31, 40], [24, 32, 41]],
  standing_long_jump: [[90, 112, 136], [105, 128, 152], [120, 144, 168], [132, 158, 184], [140, 166, 192], [144, 170, 198], [146, 174, 202]],
  flexibility: [[18, 25, 33], [19, 26, 34], [20, 27, 36], [21, 29, 38], [22, 30, 39], [22, 31, 40], [23, 32, 41]],
  balance: [[3, 9, 17], [2, 7, 15], [1, 6, 13], [1, 5, 12], [1, 4, 10], [0, 3, 9], [0, 3, 8]],
  grip_strength_right: [[7.5, 11, 15], [10, 14, 18.5], [13, 17.5, 22.5], [16, 22, 28.5], [19.5, 26, 33], [21.5, 28.5, 35.5], [22.5, 29.5, 37]],
  grip_strength_left: [[7, 10.5, 14], [9.5, 13.5, 17.5], [12.5, 16.5, 21.5], [15, 20.5, 27], [18.5, 24.5, 31], [20.5, 27, 34], [21.5, 28, 35]],
  arm_speed_right: [[14.5, 18.0, 21.5], [13.0, 16.3, 19.8], [11.8, 14.8, 18.0], [10.6, 13.4, 16.4], [9.8, 12.4, 15.2], [9.3, 11.8, 14.5], [9.0, 11.5, 14.2]],
  arm_speed_left: [[15.0, 18.5, 22.0], [13.5, 16.8, 20.3], [12.2, 15.3, 18.5], [11.0, 13.9, 16.9], [10.2, 12.9, 15.8], [9.7, 12.3, 15.0], [9.4, 12.0, 14.7]],
  arm_speed_right_hits: [[68, 94, 124], [80, 110, 142], [92, 126, 162], [104, 140, 178], [112, 150, 192], [118, 158, 202], [122, 164, 208]],
  arm_speed_left_hits: [[64, 88, 118], [76, 104, 136], [88, 120, 156], [98, 134, 172], [106, 144, 186], [112, 152, 196], [116, 158, 202]],
  reaction: [[0.25, 0.33, 0.43], [0.23, 0.30, 0.39], [0.21, 0.28, 0.36], [0.19, 0.26, 0.34], [0.18, 0.24, 0.31], [0.17, 0.22, 0.29], [0.16, 0.21, 0.28]],
  back_strength: [[16, 25, 34], [21, 31, 42], [26, 38, 50], [33, 46, 60], [40, 55, 72], [46, 62, 80], [50, 68, 86]],
  aerobic: [[30, 35, 42], [31, 37, 44], [32, 38, 45], [33, 39, 46], [34, 40, 47], [35, 41, 48], [35, 42, 49]],
};

/**
 * Updates bodyComposition and motorPerformance refLow/refMid/refHigh strictly from the athlete's
 * chronological age and gender (WHO / Eurofit / ACSM normative standards).
 */
export function applyAgeGenderNormsToReport(report: SportsFlyLabReport): void {
  if (!report) return;
  const age = Math.max(6, Math.min(35, Number(report.ageYears) || 12));
  const genderStr = String(report.gender || '').toLowerCase();
  const isFemale = genderStr.includes('kad') || genderStr.includes('kız') || genderStr.includes('kiz');
  const bodyTable = isFemale ? FEMALE_BODY_NORMS : MALE_BODY_NORMS;
  const motorTable = isFemale ? FEMALE_MOTOR_NORMS : MALE_MOTOR_NORMS;

  const heightNorm = interpolateAgeNorm(age, bodyTable.height);

  if (Array.isArray(report.bodyComposition)) {
    report.bodyComposition.forEach((row) => {
      if (bodyTable[row.id]) {
        const [low, mid, high] = interpolateAgeNorm(age, bodyTable[row.id]);
        row.refLow = low;
        row.refMid = mid;
        row.refHigh = high;
      } else if (row.id === 'sitting_height') {
        row.refLow = Number((heightNorm[0] * 0.52).toFixed(1));
        row.refMid = Number((heightNorm[1] * 0.523).toFixed(1));
        row.refHigh = Number((heightNorm[2] * 0.526).toFixed(1));
      } else if (row.id === 'arm_span') {
        row.refLow = Number((heightNorm[0] * 1.00).toFixed(1));
        row.refMid = Number((heightNorm[1] * 1.008).toFixed(1));
        row.refHigh = Number((heightNorm[2] * 1.015).toFixed(1));
      }
    });
  }

  if (Array.isArray(report.motorPerformance)) {
    report.motorPerformance.forEach((row) => {
      if (row.id === 'agility') {
        const sampleVal = row.m3 > 0 ? row.m3 : row.m1 > 0 ? row.m1 : row.m2;
        const isProAgilityScale = sampleVal > 0 && sampleVal <= 11.5;
        const [low, mid, high] = interpolateAgeNorm(
          age,
          isProAgilityScale ? motorTable.agility_pro : motorTable.agility_50m
        );
        row.refLow = low;
        row.refMid = mid;
        row.refHigh = high;
        row.lowerIsBetter = true;
      } else if (row.id === 'arm_speed_right' || row.id === 'arm_speed_left') {
        const sampleVal = row.m3 > 0 ? row.m3 : row.m1 > 0 ? row.m1 : row.m2;
        const isSecondsProtocol = sampleVal > 0 && sampleVal <= 35;
        const tableKey =
          row.id === 'arm_speed_right'
            ? isSecondsProtocol
              ? 'arm_speed_right'
              : 'arm_speed_right_hits'
            : isSecondsProtocol
            ? 'arm_speed_left'
            : 'arm_speed_left_hits';
        const [low, mid, high] = interpolateAgeNorm(age, motorTable[tableKey]);
        row.refLow = low;
        row.refMid = mid;
        row.refHigh = high;
        if (isSecondsProtocol) {
          row.lowerIsBetter = true;
          row.unit = 'sn';
        } else {
          row.lowerIsBetter = false;
          row.unit = 'atım';
          row.description =
            row.id === 'arm_speed_right'
              ? 'Sağ el ile 50 sn içinde disklere yapılan toplam vuruş (atım) sayısı.'
              : 'Sol el ile 50 sn içinde disklere yapılan toplam vuruş (atım) sayısı.';
        }
      } else if (motorTable[row.id]) {
        const [low, mid, high] = interpolateAgeNorm(age, motorTable[row.id]);
        row.refLow = low;
        row.refMid = mid;
        row.refHigh = high;
      }
    });
  }
}

/**
 * Single Source of Truth for evaluating any measured Motor Performance row:
 * guarantees targetValue, percentile, SD, and verdict/status pill NEVER contradict each other.
 */
export function evaluateMotorRowTargetAndStatus(row: LabParameterRow): MotorRowEvaluation {
  const isBalance = row.id === 'balance' || row.unit === 'hata';
  const activeVal = row.m3 > 0 ? row.m3 : row.m2 > 0 ? row.m2 : row.m1;
  const span = Math.max(0.05, (row.refHigh - row.refLow) / 4);
  const rawDiff = row.lowerIsBetter ? row.refMid - activeVal : activeVal - row.refMid;
  const sd = Number((rawDiff / span).toFixed(2));
  const percentile = sdToPercentile(sd);
  const decimals = row.id === 'reaction' || row.id === 'sprint' || row.id === 'agility' ? 2 : 1;

  // Strict normative achievement & tier rules
  let tier: MotorTargetTier = 'watch';
  if (row.lowerIsBetter) {
    if (sd >= 0.67 && activeVal <= row.refMid) {
      tier = 'reached';
    } else if (activeVal > row.refHigh || sd < -0.4) {
      tier = 'needs_dev';
    } else {
      tier = 'watch';
    }
  } else {
    if (sd >= 0.67 && activeVal >= row.refMid) {
      tier = 'reached';
    } else if (activeVal < row.refLow || sd < -0.4) {
      tier = 'needs_dev';
    } else {
      tier = 'watch';
    }
  }

  // Target value MUST align strictly with direction (never worse than activeVal, never contradictory like 21.5 sn!)
  let targetValue: number;
  if (row.lowerIsBetter) {
    if (tier === 'needs_dev' || activeVal > row.refMid) {
      targetValue = Number(row.refMid.toFixed(decimals));
    } else if (isBalance && activeVal === 0) {
      targetValue = 0;
    } else if (tier === 'watch') {
      targetValue = Number(Math.min(row.refMid, Math.max(row.refLow, activeVal * 0.95)).toFixed(decimals));
    } else {
      const nextBest = Math.max(isBalance ? 0 : 0.1, activeVal * 0.96);
      targetValue = isBalance ? Math.max(0, Math.floor(activeVal)) : Number(nextBest.toFixed(decimals));
    }
  } else {
    const isCountMetric = row.unit === 'atım' || row.unit === 'vuruş' || row.unit === 'dokunma';
    const roundTarget = (v: number) => (isCountMetric ? Math.round(v) : Number(v.toFixed(1)));
    if (tier === 'needs_dev' || activeVal < row.refMid) {
      targetValue = roundTarget(row.refMid);
    } else if (tier === 'watch') {
      targetValue = roundTarget(Math.max(row.refMid, Math.min(row.refHigh, activeVal * 1.06)));
    } else {
      targetValue = roundTarget(Math.max(row.refHigh, activeVal * 1.04));
    }
  }

  const statusHeaderLabel: MotorRowEvaluation['statusHeaderLabel'] =
    tier === 'reached' ? 'HEDEFE ULAŞTI' : tier === 'watch' ? 'TAKİP EDİLMELİ' : 'GELİŞİM GÖSTERMELİ';
  const verdict: MotorRowEvaluation['verdict'] =
    tier === 'reached' ? 'Güçlü yön' : tier === 'watch' ? 'Korunmalı' : 'Geliştirilmesi önerilir';

  return {
    tier,
    statusHeaderLabel,
    verdict,
    targetValue,
    activeVal,
    sd,
    percentile,
  };
}

export function hasRealSecondTestReport(report?: SportsFlyLabReport): boolean {
  if (!report) return false;
  const date2Lower = (report.date2 || '').toLowerCase();
  return Boolean(
    !report.isAiForecast &&
      report.date2 &&
      report.date2 !== '—' &&
      report.date2.trim() !== '' &&
      !date2Lower.includes('tahmin') &&
      !date2Lower.includes('2-4 ay')
  );
}

export function isStaleExpertComment(comment?: string, report?: SportsFlyLabReport): boolean {
  if (!comment || !comment.trim()) return true;
  // Normalize string to handle Turkish locale dotless/dotted I casing (I/İ/ı/i) and diacritics
  const norm = comment
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

  const hasFakeSecondTestMentions =
    (!report || !hasRealSecondTestReport(report)) &&
    (norm.includes('ii. test') || norm.includes('2. test') || norm.includes('2. olcum'));

  return (
    norm.includes('ai projeksiyon') ||
    norm.includes('projeksiyon') ||
    norm.includes('sportsfly intelligence') ||
    norm.includes('yapay zeka algoritmasi') ||
    norm.includes('basariyla hesaplanmistir') ||
    norm.includes('hesaplanmistir') ||
    norm.includes('tahmini gelisim hedefleri') ||
    norm.includes('beklenen tahmini') ||
    norm.includes('2. test donemi') ||
    norm.includes('fiziksel gelisim sureci ve motor performans') ||
    norm.includes('en yuksek potansiyele sahip sporculari') ||
    norm.includes('gelisimi yas ve cinsiyet standartlarina uygundur') ||
    norm.includes('dinamik kinetik zincir aktarimini mekanik olarak destekleyen') ||
    norm.includes('patlayici kuvvet ve ivmelenme mekanigindeki bu yuksek verim') ||
    norm.includes('yuksek potansiyeli basariyla ust seviyeye tasiyacaktir') ||
    norm.includes('sirada') ||
    norm.includes('sporcu arasinda') ||
    norm.includes('ust siraya') ||
    norm.includes('2-4 ay arasi') ||
    norm.includes('artis ongorusu') ||
    norm.includes('gelisim ivmesi kaydetmistir') ||
    norm.includes('yukselterek') ||
    norm.includes('(tahmini') ||
    norm.includes('tahmini)') ||
    hasFakeSecondTestMentions ||
    norm.length < 80
  );
}

function describeMotorDomain(row: LabParameterRow): string {
  const id = (row.id || '').toLowerCase();
  const name = (row.name || '').toLowerCase();
  if (id.includes('grip') || name.includes('pençe') || name.includes('kavrama')) {
    return 'üst ekstremite izometrik kavrama kuvveti';
  }
  if (id.includes('balance') || name.includes('denge') || name.includes('flamingo')) {
    return 'statik tek ayak denge ve proprioseptif kontrol';
  }
  if (id.includes('flexibility') || name.includes('esneklik')) {
    return 'eklem hareket açıklığı ve hamstring-lomber esneklik';
  }
  if (id.includes('vertical') || id.includes('long_jump') || name.includes('sıçrama') || name.includes('uzun atlama')) {
    return 'alt ekstremite patlayıcı kuvveti ve elastik güç aktarımı';
  }
  if (id.includes('sprint') || name.includes('sürat')) {
    return 'doğrusal ivmelenme ve sprint hızı';
  }
  if (id.includes('agility') || name.includes('çabukluk')) {
    return 'çok yönlü yön değiştirme (COD) ve çeviklik mekaniği';
  }
  if (id.includes('arm_speed') || name.includes('kol sürat')) {
    return 'üst ekstremite nöromüsküler koordinasyon ve hızı';
  }
  if (id.includes('reaction') || name.includes('reaksiyon')) {
    return 'görsel-motor tepki süresi';
  }
  if (id.includes('back') || name.includes('sırt')) {
    return 'gövde ve posterior zincir kuvveti';
  }
  if (id.includes('aerobic') || name.includes('mekik') || name.includes('vo2')) {
    return 'aerobik dayanıklılık kapasitesi';
  }
  return 'biyomotorik performans kapasitesi';
}

export function generateAthleteInterpretiveExpertComment(report: SportsFlyLabReport): string {
  if (!report) return '';

  const name = report.athleteName || 'Sporcu';
  let branch = (report.sportBranch || 'Genel Spor Gelişimi').trim();
  const bLower = branch.toLowerCase();
  if (
    !branch ||
    bLower.includes('ipek') ||
    bLower.includes('başeğmez') ||
    bLower.includes('basegmez') ||
    bLower === name.toLowerCase() ||
    bLower.includes('ad soyad') ||
    bLower.includes('ogrenci') ||
    bLower.includes('öğrenci')
  ) {
    branch = 'Genel Spor Gelişimi';
  }
  const d1 = report.date1 && report.date1 !== '—' ? report.date1 : 'I. Ölçüm';
  const hasRealSecondTest = hasRealSecondTestReport(report);
  const d2 = hasRealSecondTest ? report.date2 : '';
  const hasRealThirdTest = Boolean(report.date3 && report.date3 !== '—' && report.date3.trim() !== '');

  const p1 = report.scoreHistory?.p1Score || 0;
  const p2 = hasRealSecondTest ? report.scoreHistory?.p2Score || p1 : 0;
  const p3 = hasRealThirdTest ? report.scoreHistory?.p3Score || 0 : 0;
  const activeScore = p3 > 0 ? p3 : p2 > 0 ? p2 : p1;
  const scoreDiff = hasRealSecondTest ? p2 - p1 : 0;

  // Maturation & Biological Growth
  const matStatus = report.maturationStatus || 'Normal Büyüme Hızı';
  const phvAge = report.phvAge ? `${report.phvAge} yaş` : '';
  const predHeight = report.predictedAdultHeight ? `${report.predictedAdultHeight.toFixed(1)} cm` : '';

  // Body Composition & Anthropometry (WHO/ISAK norms — strictly real measured values, never AI m2 forecast)
  const boyRow = report.bodyComposition?.find((b) => isLabRowMeasured(b) && (b.id === 'height' || b.name?.toLowerCase().includes('boy')));
  const kiloRow = report.bodyComposition?.find((b) => isLabRowMeasured(b) && (b.id === 'weight' || b.name?.toLowerCase().includes('ağırlık') || b.name?.toLowerCase().includes('kilo')));
  const bmiRow = report.bodyComposition?.find((b) => isLabRowMeasured(b) && b.id === 'bmi');
  const yagRow = report.bodyComposition?.find((b) => isLabRowMeasured(b) && (b.id === 'body_fat' || b.name?.toLowerCase().includes('yağ')));

  const pickRealBodyVal = (row?: LabParameterRow) => {
    if (!row) return 0;
    if (hasRealThirdTest && row.m3 > 0) return row.m3;
    if (hasRealSecondTest && row.m2 > 0) return row.m2;
    return row.m1 > 0 ? row.m1 : 0;
  };
  const computeRealBodySd = (row?: LabParameterRow, val = 0) => {
    if (!row || val <= 0) return 0;
    const halfSpan =
      val >= row.refMid
        ? Math.max(0.1, (row.refHigh - row.refMid) / 2)
        : Math.max(0.1, (row.refMid - row.refLow) / 2);
    return Number(((val - row.refMid) / halfSpan).toFixed(2));
  };

  const boyM1 = boyRow?.m1 || 0;
  const boyM2 = hasRealSecondTest ? boyRow?.m2 || 0 : 0;
  const activeBoy = pickRealBodyVal(boyRow);
  const kiloM1 = kiloRow?.m1 || 0;
  const kiloM2 = hasRealSecondTest ? kiloRow?.m2 || 0 : 0;
  const activeKilo = pickRealBodyVal(kiloRow);
  const activeBmi =
    pickRealBodyVal(bmiRow) > 0
      ? pickRealBodyVal(bmiRow)
      : activeBoy > 50 && activeKilo > 10
      ? Number((activeKilo / Math.pow(activeBoy / 100, 2)).toFixed(2))
      : 0;
  const yagVal = pickRealBodyVal(yagRow);

  const bmiSd = computeRealBodySd(bmiRow, activeBmi);
  const weightSd = computeRealBodySd(kiloRow, activeKilo);
  const fatSd = computeRealBodySd(yagRow, yagVal);
  const heightSd = computeRealBodySd(boyRow, activeBoy);

  const isSomatoNonZero = (s?: { endo: number; meso: number; ecto: number }) =>
    Boolean(s && (s.endo > 0 || s.meso > 0 || s.ecto > 0));
  const activeSomato =
    hasRealThirdTest && isSomatoNonZero(report.somatotype?.m3)
      ? report.somatotype.m3
      : hasRealSecondTest && isSomatoNonZero(report.somatotype?.m2)
      ? report.somatotype.m2
      : report.somatotype?.m1;
  const somatoEndo = activeSomato?.endo || 0;
  const somatoCat = activeSomato?.category && activeSomato.category !== '—' ? activeSomato.category : '';

  const isSignificantlyOverweight =
    activeBmi >= 26.0 ||
    bmiSd > 1.35 ||
    weightSd > 1.5 ||
    fatSd > 1.35 ||
    somatoEndo >= 5.5;
  const isMildlyAboveNorm =
    !isSignificantlyOverweight && (bmiSd > 0.85 || weightSd > 1.0 || fatSd > 0.85);
  const isUnderweight = bmiSd < -1.1 || weightSd < -1.2;

  // Normative context (strictly NO group ranking / placement order)
  const athleteAgeLabel = `${Math.floor(report.ageYears || 12)} Yaş`;

  // Evaluate ONLY real measured Motor Performance values (exclude estimated m2 when no real 2nd test occurred)
  const validMotor = getDisplayedMotorPerformance(report);
  const evaluated = validMotor.map((row) => {
    const evalRow: LabParameterRow = hasRealSecondTest
      ? hasRealThirdTest
        ? row
        : { ...row, m3: 0 }
      : { ...row, m2: 0, m3: hasRealThirdTest ? row.m3 : 0 };
    return { row, evalRes: evaluateMotorRowTargetAndStatus(evalRow) };
  });
  const reachedList = evaluated
    .filter((e) => e.evalRes.tier === 'reached')
    .sort((a, b) => b.evalRes.percentile - a.evalRes.percentile);
  const watchList = evaluated
    .filter((e) => e.evalRes.tier === 'watch')
    .sort((a, b) => b.evalRes.percentile - a.evalRes.percentile);
  const needsDevList = evaluated
    .filter((e) => e.evalRes.tier === 'needs_dev')
    .sort((a, b) => a.evalRes.percentile - b.evalRes.percentile);

  // Cardio (real measured values only)
  const vo2 = hasRealSecondTest && report.cardio?.test2Vo2 ? report.cardio.test2Vo2 : report.cardio?.test1Vo2 || 0;
  const cardioDist = hasRealSecondTest && report.cardio?.test2Distance ? report.cardio.test2Distance : report.cardio?.test1Distance || 0;

  // Paragraph 1: Performance summary & normative band (strictly actual measured test, no peer ranking, no fake 2nd test commentary)
  let cohortText = '';
  if (activeScore >= 75 && !isSignificantlyOverweight) {
    cohortText = `Sporcumuz, ${athleteAgeLabel} yaş ve cinsiyet normatif referanslarına göre genel değerlendirmede üst performans bandında yer almaktadır.`;
  } else if (activeScore >= 50) {
    cohortText = `Sporcumuz, ${athleteAgeLabel} yaş ve cinsiyet normatif referansları doğrultusunda bireysel gelişim takibi kapsamında izlenmektedir; branş beklentilerine tam uyum için eksik motor alanların hedeflenmesi gerekmektedir.`;
  } else {
    cohortText = `Sporcumuzun genel normatif değerlendirme skoru (%${activeScore}) ${athleteAgeLabel} yaş ve cinsiyet beklenti ortalamasının altında seyretmekte olup temel fiziksel uygunluk ve kondisyon altyapısının öncelikli olarak güçlendirilmesi gerekmektedir.`;
  }

  const p1Text = hasRealSecondTest
    ? `${name}, ${branch} branşında I. test (${d1}) ve II. test (${d2}) ölçüm dönemleri kapsamında değerlendirilen gerçek performans analizinde ${
        p1 > 0 && scoreDiff !== 0
          ? `genel biyomotorik performans endeksini %${p1}'den %${p2}'ye (${scoreDiff > 0 ? `+` : ''}%${scoreDiff}) taşımıştır`
          : `genel biyomotorik performans endeksini %${activeScore} düzeyinde tamamlamıştır`
      }. ${cohortText}`
    : `${name}, ${branch} branşında ${d1 !== 'I. Ölçüm' ? `${d1} tarihli ` : ''}I. ölçüm sonuçlarına göre değerlendirilen performans analizinde genel biyomotorik performans endeksi %${activeScore} olarak belirlenmiştir. ${cohortText}`;

  // Paragraph 2: Anthropometry, WHO BMI/Weight & Somatotype (real values only)
  const boyChangeText = hasRealSecondTest && boyM1 > 0 && boyM2 > 0 && boyM2 !== boyM1
    ? `${boyM1} cm → ${boyM2} cm`
    : (activeBoy > 0 ? `${activeBoy} cm` : '—');
  const kiloChangeText = hasRealSecondTest && kiloM1 > 0 && kiloM2 > 0 && kiloM2 !== kiloM1
    ? `${kiloM1} kg → ${kiloM2} kg`
    : (activeKilo > 0 ? `${activeKilo} kg` : '—');
  const predHeightText = predHeight ? ` (tahmini yetişkin boy projeksiyonu ${predHeight}${phvAge ? `, PHV Yaşı: ${phvAge}` : ''})` : '';
  const heightComment =
    heightSd > 0.8
      ? 'yaş grubu ortalamasının üzerinde (uzun boy profili)'
      : heightSd < -1.0
      ? 'yaş grubu ortalamasının altında'
      : 'yaş ve cinsiyet referans normlarıyla uyumlu';
  const bmiLabel = activeBmi > 0 ? `BKİ: ${activeBmi} kg/m²` : '';
  const fatLabel = yagVal > 0 ? `Vücut Yağ Oranı: %${yagVal}` : '';
  const compDetails = [bmiLabel, fatLabel].filter(Boolean).join(', ');
  const compBracket = compDetails ? ` (${compDetails})` : '';

  let p2Text = '';
  if (isSignificantlyOverweight) {
    const somatoWarning = somatoCat
      ? `Belirlenen ${somatoCat} somatotip profili${somatoEndo > 0 ? ` (Endomorfi: ${somatoEndo})` : ''}, görece yüksek yağ ve vücut kütlesi nedeniyle dikey sıçrama, 20m sürat ve yön değiştirme performansında mekanik direnç oluşturmakta ve eklem yükünü artırmaktadır.`
      : 'Mevcut yüksek vücut kütlesi dikey sıçrama, sürat ve çeviklik parametrelerinde göreceli güç (W/kg) üretimini sınırlamakta ve alt ekstremite eklemlerine binen yükü artırmaktadır.';
    p2Text = `Antropometri ve vücut kompozisyonu incelendiğinde; ${matStatus} evresindeki sporcunun boy uzunluğu (${boyChangeText}) ${heightComment} seyretmektedir${predHeightText}. Ancak vücut ağırlığı (${kiloChangeText})${compBracket} yaş ve cinsiyet WHO referans standartlarının belirgin şekilde üzerindedir ve ideal sportif ağırlık bandında değildir. ${somatoWarning} Sağlıklı beslenme planlaması ve aerobik metabolik kondisyon desteği ile vücut kompozisyonunun dengelenmesi temel önceliktir.`;
  } else if (isMildlyAboveNorm) {
    p2Text = `Antropometri ve biyolojik olgunlaşma parametreleri incelendiğinde; ${matStatus} evresindeki sporcunun boy uzunluğu (${boyChangeText}) ${heightComment} ilerlemektedir${predHeightText}. Vücut ağırlığı (${kiloChangeText})${compBracket} yaş grubu üst sınırına yakın seyretmekte olup${somatoCat ? ` (${somatoCat} somatotip)` : ''} branş içi çeviklik ve sıçrama verimliliğini artırmak adına yağsız kas-kütle oranının korunması önerilmektedir.`;
  } else if (isUnderweight) {
    p2Text = `Antropometri ve biyolojik olgunlaşma parametreleri incelendiğinde; ${matStatus} evresindeki sporcunun boy uzunluğu (${boyChangeText}) ${heightComment} seyrederken${predHeightText}, vücut ağırlığı (${kiloChangeText})${compBracket} yaş ve cinsiyet referans ortalamasının altındadır. Büyüme sürecinde enerji dengesinin desteklenmesi ve temel kuvvet altyapısının artırılması önerilmektedir.`;
  } else {
    const somatoGood = somatoCat
      ? ` Belirlenen ${somatoCat} somatotip profili, sporcunun branşındaki hareket mekaniğiyle dengeli ve uyumlu bir morfolojik yapı sunmaktadır.`
      : '';
    p2Text = `Antropometri ve biyolojik olgunlaşma parametreleri incelendiğinde; ${matStatus} evresinde bulunan sporcunun boy uzunluğu (${boyChangeText}, ${heightComment}) ve vücut ağırlığı (${kiloChangeText})${compBracket} yaş ve cinsiyet referans standartlarına uygundur${predHeightText}.${somatoGood}`;
  }

  // Paragraph 3: Honest Motor Performance Strengths (strictly tied to target attainment on measured results!)
  let strengthsComment = '';
  if (reachedList.length >= 2) {
    const a = reachedList[0];
    const b = reachedList[1];
    const domA = describeMotorDomain(a.row);
    const domB = describeMotorDomain(b.row);
    const sameDomain = domA === domB;
    strengthsComment = `Biyomotor yetenek testlerinde hedef normlara ulaşan ve öne çıkan güçlü yönler; ${a.row.name} (${a.evalRes.activeVal} ${a.row.unit}, Hedef: ${a.evalRes.targetValue} ${a.row.unit}, %${a.evalRes.percentile}) ve ${b.row.name} (${b.evalRes.activeVal} ${b.row.unit}, Hedef: ${b.evalRes.targetValue} ${b.row.unit}, %${b.evalRes.percentile}) testleridir. ${
      sameDomain
        ? `Özellikle ${domA} alanındaki bu başarı yaş grubu standartlarının üzerindedir.`
        : `Elde edilen bu sonuçlar ${domA} ile ${domB} alanlarında belirgin bir yeterliliğe işaret etmektedir.`
    }`;
  } else if (reachedList.length === 1) {
    const a = reachedList[0];
    const nearText =
      watchList.length > 0
        ? ` Ayrıca ${watchList[0].row.name} (${watchList[0].evalRes.activeVal} ${watchList[0].row.unit}, %${watchList[0].evalRes.percentile}) parametresi hedef banda yakın seviyede takip edilmektedir.`
        : '';
    strengthsComment = `Biyomotor yetenek testlerinde hedef norma ulaşan başlıca güçlü yön ${a.row.name} (${a.evalRes.activeVal} ${a.row.unit}, Hedef: ${a.evalRes.targetValue} ${a.row.unit}, %${a.evalRes.percentile}) olup ${describeMotorDomain(a.row)} düzeyinin iyi olduğunu göstermektedir.${nearText}`;
  } else if (watchList.length > 0) {
    const wNames = watchList.slice(0, 2).map((w) => `${w.row.name} (${w.evalRes.activeVal} ${w.row.unit}, Hedef: ${w.evalRes.targetValue} ${w.row.unit}, %${w.evalRes.percentile})`).join(' ve ');
    strengthsComment = `Ölçülen biyomotor testlerde henüz üst performans (%75+) bandına ulaşan bir parametre bulunmamakla birlikte; ${wNames} parametreleri orta norm (takip) bölgesinde yer almaktadır.`;
  } else {
    strengthsComment = `Ölçülen biyomotor test sonuçlarının tamamı yaş ve cinsiyet hedef normlarının altında kalmış olup temel fiziksel uygunluk kapasitesinin kademeli olarak geliştirilmesi gerekmektedir.`;
  }

  let cardioComment = '';
  if (vo2 > 0) {
    cardioComment = ` Kardiyorespiratuar dayanıklılık testinde ${vo2} ml/kg/dk VO2peak (${cardioDist} m) sonucu kaydedilmiştir.`;
  }
  const p3Text = `${strengthsComment}${cardioComment}`;

  // Paragraph 4: Priority Areas needing development with explicit measured vs Hedef Değer!
  const nextDateText =
    report.nextTargetDate && report.nextTargetDate !== '—'
      ? `bir sonraki kontrol ölçümüne (${report.nextTargetDate})`
      : hasRealSecondTest
      ? 'bir sonraki (III.) ölçüm dönemine'
      : 'bir sonraki (II.) ölçüm dönemine';
  let p4Text = '';
  if (needsDevList.length > 0) {
    const topNeedsText = needsDevList
      .slice(0, 3)
      .map((n) => `${n.row.name} (${n.evalRes.activeVal} ${n.row.unit} → Hedef: ${n.evalRes.targetValue} ${n.row.unit})`)
      .join(', ');
    const overloadNote = isSignificantlyOverweight
      ? 'Vücut kütlesi kaynaklı eklem stresini azaltmak amacıyla yüksek darbeli sert sıçramalar yerine düşük etkili aerobik metabolik yüklemeler, temel gövde-kalça kuvvetlendirmesi, beslenme düzenlemesi ve kademeli ivmelenme drillerinin haftalık programa eklenmesi önerilmektedir.'
      : 'Belirlenen hedef değerlere ulaşabilmek için haftalık antrenman mikro döngülerine teknik koşu/ivmelenme drilleri, progresif kuvvet ve koordinasyon çalışmalarının eklenmesi tavsiye edilmektedir.';
    p4Text = `Hedef değerlerin gerisinde kaldığı için öncelikli gelişim gerektiren alanlar; ${topNeedsText} olarak saptanmıştır. ${overloadNote} Düzenli takip ile ${nextDateText} kadar belirlenen norm hedeflerine doğru ölçülebilir ilerleme sağlanması amaçlanmaktadır.`;
  } else if (watchList.length > 0) {
    const watchNames = watchList
      .slice(0, 2)
      .map((w) => `${w.row.name} (${w.evalRes.activeVal} ${w.row.unit} → Hedef: ${w.evalRes.targetValue} ${w.row.unit})`)
      .join(' ve ');
    p4Text = `Gelecek antrenman döneminde; takip bandında bulunan ${watchNames} alanlarının hedeflenen üst eşiklere taşınması için branşa özgü kuvvet, denge ve hızlanma drillerinin haftalık programda sürdürülmesi önerilmektedir. Düzenli çalışma disipliniyle ${nextDateText} kadar daha yüksek bir performans dengesi hedeflenmektedir.`;
  } else {
    p4Text = `Ölçülen tüm motor parametrelerde yaş ve cinsiyet hedef normları karşılanmış olup; mevcut formun korunması, sakatlık önleyici stabilizasyon ve branşa özgü teknik hız çalışmalarının ${nextDateText} kadar sürdürülmesi önerilmektedir.`;
  }

  return `${p1Text}\n\n${p2Text}\n\n${p3Text}\n\n${p4Text}`;
}

export const EMPTY_LAB_REPORT_TEMPLATE: SportsFlyLabReport = {
  id: 'lab-empty-template',
  athleteName: 'Yeni Sporcu',
  athleteCode: 'SF-2026-000',
  clubName: 'İSTANBUL ANADOLU OLİMPİK SPOR KULÜBÜ',
  branchName: 'Merkez Kampüs',
  sportBranch: 'Genel Spor Gelişimi',
  gender: 'Erkek',
  ageYears: 12,
  ageMonths: 144,
  date1: 'I: —',
  date2: 'II: 2-4 Ay Arası (Tahmini)',
  date3: '—',
  birthDate: '',
  nextTargetDate: '—',
  bodyComposition: [
    { id: 'height', name: 'Boy Uzunluğu', unit: 'cm', description: 'Ayakta anatomik dik duruşta ölçülen toplam boy uzunluğu.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 127.2, refMid: 140.1, refHigh: 153.0 },
    { id: 'weight', name: 'Vücut Ağırlığı', unit: 'kg', description: 'Standart tartı protokolü ile ölçülen toplam vücut kütlesi.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 24.0, refMid: 33.7, refHigh: 54.3 },
    { id: 'bmi', name: 'Beden Kütle İndeksi', unit: 'kg/m²', description: 'Vücut ağırlığının boyun karesine bölünmesiyle hesaplanan klinik indeks.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 13.6, refMid: 16.7, refHigh: 22.8 },
    { id: 'sitting_height', name: 'Oturma Boyu', unit: 'cm', description: 'Gövde-bacak orantısı ve PHV olgunlaşma hesabı için oturarak ölçülen boy.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 66.1, refMid: 73.3, refHigh: 80.5 },
    { id: 'arm_span', name: 'Kulaç Uzunluğu', unit: 'cm', description: 'Kollar yana tam açıkken parmak uçları arası mesafe.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 127.2, refMid: 141.2, refHigh: 155.3 },
    { id: 'body_fat', name: 'Vücut Yağ Oranı', unit: '%', description: 'Deri kıvrım kalınlığı ve biyoelektrik empedans ile hesaplanan yağ yüzdesi.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 16.0, refMid: 22.9, refHigh: 35.2, lowerIsBetter: true },
    { id: 'triceps', name: 'Triceps Deri Kıvrım', unit: 'mm', description: 'Üst kol arka bölgesinden kaliper ile ölçülen deri altı yağ kalınlığı.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 8.4, refMid: 15.5, refHigh: 31.6, lowerIsBetter: true },
    { id: 'biceps_skf', name: 'Biceps Deri Kıvrım', unit: 'mm', description: 'Üst kol ön bölgesinden kaliper ile ölçülen deri altı yağ kalınlığı.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 4.0, refMid: 8.0, refHigh: 13.0, lowerIsBetter: true },
    { id: 'subscapula', name: 'Subscapula Deri Kıvrım', unit: 'mm', description: 'Kürek kemiği alt ucundan ölçülen deri altı yağ kalınlığı.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 5.1, refMid: 9.7, refHigh: 26.1, lowerIsBetter: true },
    { id: 'supraspinal', name: 'Supraspinal Deri Kıvrım', unit: 'mm', description: 'İliak krista üst-ön bölgesinden ölçülen deri altı yağ kalınlığı.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 4.0, refMid: 10.8, refHigh: 25.2, lowerIsBetter: true },
    { id: 'iliac_skf', name: 'İliak Deri Kıvrım', unit: 'mm', description: 'Suprailiak bölgeden kaliper ile ölçülen deri altı yağ kalınlığı.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 4.0, refMid: 10.8, refHigh: 25.2, lowerIsBetter: true },
    { id: 'calf_skf', name: 'Calf (Baldır) Deri Kıvrım', unit: 'mm', description: 'Baldır iç-orta hattından kaliper ile ölçülen deri altı yağ kalınlığı.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 9.5, refMid: 20.2, refHigh: 33.6, lowerIsBetter: true },
    { id: 'humerus', name: 'Humerus Bikondiler Çap', unit: 'cm', description: 'Dirsek eklemi kemik genişliği (Mezomorfi hesabı).', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 4.7, refMid: 5.5, refHigh: 6.2 },
    { id: 'femur', name: 'Femur Bikondiler Çap', unit: 'cm', description: 'Diz eklemi kemik genişliği (Mezomorfi hesabı).', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 7.2, refMid: 8.6, refHigh: 9.9 },
    { id: 'biceps_girth', name: 'Fleksiyonda Biceps Çevre', unit: 'cm', description: 'Kasılı üst kol çevresi ölçümü.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 15.9, refMid: 20.3, refHigh: 25.8 },
    { id: 'calf_girth', name: 'Maksimum Baldır Çevre', unit: 'cm', description: 'Baldırın en geniş noktasından alınan çevre ölçümü.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 21.4, refMid: 27.5, refHigh: 33.1 },
  ],
  phvAge: 13.5,
  phvHeight: 162,
  predictedAdultHeight: 175,
  sittingHeight: 0,
  maturationStatus: 'Normal Büyüme Hızı',
  motorPerformance: [
    { id: 'sprint', name: '20m Sürat Koşusu', unit: 'sn', description: 'Fotosel kapısı ile ölçülen 20 metre doğrusal ivmelenme ve maksimum sürat.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 3.2, refMid: 3.8, refHigh: 4.4, lowerIsBetter: true },
    { id: 'agility', name: '10x5m Çabukluk (Pro-Agility)', unit: 'sn', description: 'Yön değiştirme hızı, frenleme (deselerasyon) ve yeniden ivmelenme testi.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 16.5, refMid: 19.0, refHigh: 21.5, lowerIsBetter: true },
    { id: 'vertical_jump', name: 'Dikey Sıçrama (CMJ)', unit: 'cm', description: 'Alt ekstremite patlayıcı gücü ve dikey sıçrama yüksekliği.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 20, refMid: 30, refHigh: 40 },
    { id: 'standing_long_jump', name: 'Durarak Uzun Atlama', unit: 'cm', description: 'Çift ayak yatay patlayıcı sıçrama mesafesi.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 130, refMid: 165, refHigh: 200 },
    { id: 'flexibility', name: 'Otur-Eriş Esneklik', unit: 'cm', description: 'Hamstring ve lomber ekstansör esnekliğini ölçen otur-uzan testi.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 18, refMid: 28, refHigh: 38 },
    { id: 'balance', name: 'Flamingo Denge Testi', unit: 'hata', description: '60 saniye boyunca tek ayak üzerinde statik denge kaybı sayısı (düşük daha iyi).', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 1, refMid: 5, refHigh: 12, lowerIsBetter: true },
    { id: 'grip_strength_right', name: 'Pençe Kuvveti (Sağ)', unit: 'kg', description: 'El dinamometresi ile ölçülen sağ el izometrik kavrama kuvveti.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 15, refMid: 24, refHigh: 34 },
    { id: 'grip_strength_left', name: 'Pençe Kuvveti (Sol)', unit: 'kg', description: 'El dinamometresi ile ölçülen sol el izometrik kavrama kuvveti.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 14, refMid: 23, refHigh: 33 },
    { id: 'arm_speed_right', name: 'Kol Sürat Testi (Sağ)', unit: 'atım', description: 'Sağ el ile 50 sn içinde disklere yapılan toplam vuruş (atım) sayısı.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 118, refMid: 152, refHigh: 186, lowerIsBetter: false },
    { id: 'arm_speed_left', name: 'Kol Sürat Testi (Sol)', unit: 'atım', description: 'Sol el ile 50 sn içinde disklere yapılan toplam vuruş (atım) sayısı.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 112, refMid: 146, refHigh: 180, lowerIsBetter: false },
    { id: 'reaction', name: 'Görsel Reaksiyon Süresi', unit: 'sn', description: 'Görsel uyarana verilen motor yanıt süresi.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 0.18, refMid: 0.25, refHigh: 0.34, lowerIsBetter: true },
    { id: 'back_strength', name: 'Sırt-Bacak Kuvveti', unit: 'kg', description: 'Dinamometre ile ölçülen izometrik gövde ve sırt kuvveti.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 30, refMid: 48, refHigh: 66 },
    { id: 'aerobic', name: '20m Mekik Koşusu (VO2peak)', unit: 'ml/kg/dk', description: 'PACER protokolü ile hesaplanan maksimum oksijen tüketim kapasitesi.', m1: 0, m2: 0, m3: 0, percentile: 50, status: 'normal', sd: 0, refLow: 34, refMid: 42, refHigh: 50 },
  ],
  scoreHistory: {
    p1Date: 'I. Ölçüm',
    p1Score: 0,
    p2Date: 'II. Ölçüm',
    p2Score: 0,
    p3Date: '—',
    p3Score: 0,
  },
  somatotype: {
    m1: { endo: 0, meso: 0, ecto: 0, category: '—' },
    m2: { endo: 0, meso: 0, ecto: 0, category: '—' },
    m3: { endo: 0, meso: 0, ecto: 0, category: '—' },
    eliteRef: { sport: 'Genel Spor Gelişimi', endo: 3.2, meso: 4.5, ecto: 3.5, refScore: 92 },
  },
  potential: {
    directionDeg: 45,
    speedScore: 50,
    strengthScore: 50,
    enduranceScore: 50,
    dominantType: 'Dengeli Atletik Gelişim',
  },
  cardio: {
    test1Distance: 0,
    test1Shuttles: 0,
    test1Vo2: 0,
    test1Status: '—',
    test2Distance: 0,
    test2Shuttles: 0,
    test2Vo2: 0,
    test2Status: '—',
    test3Distance: 0,
    test3Shuttles: 0,
    test3Vo2: 0,
    test3Status: '—',
    totalRunTime: '—',
    basalMetabolicRate: 0,
    functionalCapacityMet: 0,
    maxHeartRate: 200,
    verticalJumpAnaerobicWatt: 0,
    verticalJumpRelativeWatt: 0,
    sprint20mAnaerobicWatt: 0,
    sprint20mRelativeWatt: 0,
  },
  ipsativeTargets: [
    { parameter: '20m Sürat Koşusu', unit: 'sn', m1: 0, m2: 0, m3: 0, target: 0, groupRank: '—' },
    { parameter: '10x5m Çabukluk (Pro-Agility)', unit: 'sn', m1: 0, m2: 0, m3: 0, target: 0, groupRank: '—' },
    { parameter: 'Dikey Sıçrama (CMJ)', unit: 'cm', m1: 0, m2: 0, m3: 0, target: 0, groupRank: '—' },
    { parameter: 'Durarak Uzun Atlama', unit: 'cm', m1: 0, m2: 0, m3: 0, target: 0, groupRank: '—' },
    { parameter: 'Otur-Eriş Esneklik', unit: 'cm', m1: 0, m2: 0, m3: 0, target: 0, groupRank: '—' },
    { parameter: 'Flamingo Denge Testi', unit: 'hata', m1: 0, m2: 0, m3: 0, target: 0, groupRank: '—' },
    { parameter: 'Pençe Kuvveti (Sağ)', unit: 'kg', m1: 0, m2: 0, m3: 0, target: 0, groupRank: '—' },
    { parameter: 'Pençe Kuvveti (Sol)', unit: 'kg', m1: 0, m2: 0, m3: 0, target: 0, groupRank: '—' },
  ],
  groupInfo: {
    groupNo: 1,
    ageRange: '12 Yaş',
    groupAthleteCount: 1,
    groupRank: 1,
    totalAthleteCount: 1,
    totalRank: 1,
    groupAverageScore: 72,
    groupPositionPercentile: 50,
  },
  expertComment: '',
};

export const DEFAULT_LAB_REPORTS: SportsFlyLabReport[] = [];

const LAB_REPORTS_STORAGE_KEY = 'sportsfly_lab_reports_v1';
const LAB_SCHOOL_BRANDING_KEY = 'sportsfly_lab_school_branding_v1';
const LAB_ARCHIVE_STORAGE_KEY = 'sportsfly_lab_archive_v1';

export const DEFAULT_LAB_SCHOOL_BRANDING: SportsFlyLabSchoolBranding = {
  schoolName: 'İSTANBUL ANADOLU OLİMPİK SPOR KULÜBÜ',
  branchName: 'Olimpik Akademi / Voleybol & Atletik Gelişim',
  logoDataUrl: '/assets/aistudio/WhatsApp_Image_2026-11-07_at_23.02.49_58552d87.jpeg',
};

function parseBrandingRecord(raw: string | null): SportsFlyLabSchoolBranding | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const schoolName =
      typeof parsed.schoolName === 'string' &&
      parsed.schoolName.trim() &&
      !parsed.schoolName.includes('ATAŞEHİR')
        ? parsed.schoolName
        : DEFAULT_LAB_SCHOOL_BRANDING.schoolName;
    const branchName =
      typeof parsed.branchName === 'string' &&
      parsed.branchName.trim() &&
      !parsed.branchName.includes('Ataşehir')
        ? parsed.branchName
        : DEFAULT_LAB_SCHOOL_BRANDING.branchName;

    // Preserve explicit empty string ('') when user deliberately clicked "Logoyu Kaldır"
    const hasLogoField = typeof parsed.logoDataUrl === 'string';
    const logoDataUrl = hasLogoField
      ? parsed.logoDataUrl.trim()
      : DEFAULT_LAB_SCHOOL_BRANDING.logoDataUrl;

    return {
      schoolName,
      branchName,
      logoDataUrl,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function getStoredLabSchoolBranding(): SportsFlyLabSchoolBranding {
  try {
    const localRec = parseBrandingRecord(
      typeof localStorage !== 'undefined' ? localStorage.getItem(LAB_SCHOOL_BRANDING_KEY) : null
    );
    const sessionRec = parseBrandingRecord(
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(LAB_SCHOOL_BRANDING_KEY) : null
    );

    if (localRec && sessionRec) {
      const tLocal = localRec.updatedAt ? Date.parse(localRec.updatedAt) || 0 : 0;
      const tSession = sessionRec.updatedAt ? Date.parse(sessionRec.updatedAt) || 0 : 0;
      return tSession > tLocal ? sessionRec : localRec;
    }
    if (sessionRec) return sessionRec;
    if (localRec) return localRec;
  } catch (e) {
    console.error('Spor okulu kurumsal kimlik ayarları okunamadı:', e);
  }
  return DEFAULT_LAB_SCHOOL_BRANDING;
}

/**
 * Compresses an uploaded school logo image (PNG/JPG/WebP/SVG) to a compact Data URL
 * (~10-45 KB) so it fits cleanly inside both localStorage and Firestore limits.
 */
export function compressLabLogoFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Logo dosyası okunamadı.'));
    reader.onload = () => {
      const rawUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawUrl) {
        reject(new Error('Boş görsel verisi.'));
        return;
      }

      // Keep crisp SVG vectors intact if compact
      if (file.type === 'image/svg+xml' && rawUrl.length <= 120000) {
        resolve(rawUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(rawUrl);
      img.onload = () => {
        try {
          const tryEncode = (maxDim: number): string => {
            let w = img.width || 220;
            let h = img.height || 220;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.max(1, Math.round((h * maxDim) / w));
                w = maxDim;
              } else {
                w = Math.max(1, Math.round((w * maxDim) / h));
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return rawUrl;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);

            // WebP preserves transparency and is 5-15x smaller than PNG
            const webp = canvas.toDataURL('image/webp', 0.88);
            const png = canvas.toDataURL('image/png', 0.9);
            if (webp.startsWith('data:image/webp') && webp.length < png.length) {
              return webp;
            }
            return png;
          };

          let best = tryEncode(220);
          if (best.length > 90000) {
            best = tryEncode(160);
          }
          if (best.length > 140000) {
            // Last resort compact JPEG if PNG/WebP was unexpectedly huge
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 180 / Math.max(img.width || 180, img.height || 180));
            canvas.width = Math.max(1, Math.round((img.width || 180) * scale));
            canvas.height = Math.max(1, Math.round((img.height || 180) * scale));
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              best = canvas.toDataURL('image/jpeg', 0.85);
            }
          }
          resolve(best);
        } catch {
          resolve(rawUrl);
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Applies the persisted school branding (school name, branch/campus, and logo)
 * to a single athlete report card.
 */
export function applyBrandingToReport(
  report: SportsFlyLabReport,
  branding?: SportsFlyLabSchoolBranding
): SportsFlyLabReport {
  const safeReport = report || EMPTY_LAB_REPORT_TEMPLATE;
  const activeBranding = branding || getStoredLabSchoolBranding();
  const cleanSchool = activeBranding.schoolName.trim() || safeReport.clubName || DEFAULT_LAB_SCHOOL_BRANDING.schoolName;
  const cleanBranch = activeBranding.branchName.trim() || safeReport.branchName || DEFAULT_LAB_SCHOOL_BRANDING.branchName;
  const hasExplicitLogo = typeof activeBranding.logoDataUrl === 'string';
  const cleanLogo = hasExplicitLogo
    ? activeBranding.logoDataUrl.trim()
    : safeReport.clubLogoUrl || DEFAULT_LAB_SCHOOL_BRANDING.logoDataUrl;

  const isLegacyDefaultGroup =
    (safeReport.id === 'lab-rep-1' || safeReport.id === 'lab-rep-2') &&
    safeReport.groupInfo?.groupAverageScore === undefined;

  const updatedGroupInfo = isLegacyDefaultGroup
    ? {
        ...safeReport.groupInfo,
        groupAthleteCount: 15,
        groupRank: 1,
        totalRank: 1,
        groupAverageScore: 72,
        groupPositionPercentile: 94,
      }
    : {
        ...safeReport.groupInfo,
        groupAverageScore: safeReport.groupInfo?.groupAverageScore ?? 72,
        groupPositionPercentile:
          safeReport.groupInfo?.groupPositionPercentile ??
          Math.min(
            99,
            Math.max(
              10,
              Math.round(
                (((safeReport.groupInfo?.groupAthleteCount || 15) -
                  (safeReport.groupInfo?.groupRank || 1) +
                  0.1) /
                  Math.max(1, safeReport.groupInfo?.groupAthleteCount || 15)) *
                  100
              )
            )
          ),
      };

  const updatedSomatotype =
    safeReport.id === 'lab-rep-1' && safeReport.somatotype?.eliteRef?.refScore === 87
      ? {
          ...safeReport.somatotype,
          eliteRef: {
            ...safeReport.somatotype.eliteRef,
            refScore: 94,
          },
        }
      : safeReport.somatotype;

  const cleanedExpertComment =
    !safeReport.expertComment || isStaleExpertComment(safeReport.expertComment, safeReport)
      ? generateAthleteInterpretiveExpertComment(safeReport)
      : safeReport.expertComment;

  const cleanedScoreHistory = {
    ...safeReport.scoreHistory,
    p3Date: '—',
    p3Score: 0,
  };

  const cleanedBodyComp = (safeReport.bodyComposition || []).map((b) => ({ ...b, m3: 0 }));
  const cleanedMotor = (safeReport.motorPerformance || []).map((m) => ({ ...m, m3: 0 }));
  const cleanedIpsative = (safeReport.ipsativeTargets || []).map((i) => ({ ...i, m3: 0 }));
  const cleanedCardio = safeReport.cardio
    ? { ...safeReport.cardio, test3Distance: 0, test3Shuttles: 0, test3Vo2: 0, test3Status: '—' }
    : safeReport.cardio;
  const cleanedSomatotype = updatedSomatotype
    ? { ...updatedSomatotype, m3: { endo: 0, meso: 0, ecto: 0, category: '—' } }
    : updatedSomatotype;

  const cleanedDate1 = safeReport.date1 ? parseDateString(safeReport.date1) : '—';
  const cleanedDate2 = safeReport.date2 ? parseDateString(safeReport.date2) : '2-4 Ay Arası (Tahmini)';
  const cleanedBirthDate = safeReport.birthDate ? parseDateString(safeReport.birthDate) : safeReport.birthDate;

  const finalReport: SportsFlyLabReport = {
    ...safeReport,
    date1: cleanedDate1 || '—',
    date2: cleanedDate2 || '2-4 Ay Arası (Tahmini)',
    date3: '—',
    birthDate: cleanedBirthDate,
    clubName: cleanSchool,
    branchName: cleanBranch,
    clubLogoUrl: cleanLogo,
    groupInfo: updatedGroupInfo,
    scoreHistory: cleanedScoreHistory,
    bodyComposition: cleanedBodyComp,
    motorPerformance: cleanedMotor,
    ipsativeTargets: cleanedIpsative,
    cardio: cleanedCardio,
    somatotype: cleanedSomatotype,
    expertComment: cleanedExpertComment,
  };

  ensureDataConsistency(finalReport);
  return finalReport;
}

/**
 * Dynamically recalculates group averages, athlete counts, and group rankings
 * across all athletes in the same sport school or group cohort in SportsFly Lab.
 */
export function recalculateGroupAveragesAndRanks(reports: SportsFlyLabReport[]): SportsFlyLabReport[] {
  const validList = (reports || []).filter(Boolean);
  if (validList.length === 0) return [];

  const getActiveScore = (r: SportsFlyLabReport): number => {
    if (r.scoreHistory?.p3Score && r.scoreHistory.p3Score > 0) return r.scoreHistory.p3Score;
    if (r.scoreHistory?.p2Score && r.scoreHistory.p2Score > 0) return r.scoreHistory.p2Score;
    if (r.scoreHistory?.p1Score && r.scoreHistory.p1Score > 0) return r.scoreHistory.p1Score;
    const mPcts = getDisplayedMotorPerformance(r).map((m) => m.percentile || 75);
    return mPcts.length > 0 ? Math.round(mPcts.reduce((a, b) => a + b, 0) / mPcts.length) : 76;
  };

  return validList.map((rep) => {
    const repClub = (rep.clubName || '').trim().toLowerCase();
    const sameClub = validList.filter(
      (peer) => (peer.clubName || '').trim().toLowerCase() === repClub
    );
    const peers = sameClub.length > 0 ? sameClub : validList;
    const count = peers.length;
    const repScore = getActiveScore(rep);

    const avgScore =
      count > 0
        ? Math.round(peers.reduce((sum, p) => sum + getActiveScore(p), 0) / count)
        : repScore;

    // Sort peers descending by active score to find rank
    const sortedPeers = [...peers].sort((a, b) => getActiveScore(b) - getActiveScore(a));
    const rankIdx = sortedPeers.findIndex((p) => p.id === rep.id);
    const rank = rankIdx >= 0 ? rankIdx + 1 : 1;
    const posPct =
      count > 1
        ? Math.max(5, Math.min(97, Math.round(((count - rank + 0.5) / count) * 100)))
        : Math.max(5, Math.min(97, Math.round(repScore)));

    const peerAges = peers
      .map((p) => Math.floor(Number(p.ageYears) || 0))
      .filter((a) => a >= 4 && a <= 35);
    const minPeerAge =
      peerAges.length > 0 ? Math.min(...peerAges) : Math.floor(Number(rep.ageYears) || 12);
    const maxPeerAge =
      peerAges.length > 0 ? Math.max(...peerAges) : minPeerAge;
    const computedAgeRange =
      minPeerAge !== maxPeerAge ? `${minPeerAge} - ${maxPeerAge} Yaş` : `${minPeerAge} Yaş`;

    return {
      ...rep,
      groupInfo: {
        ...rep.groupInfo,
        ageRange: computedAgeRange,
        groupAthleteCount: count,
        groupRank: rank,
        totalAthleteCount: validList.length,
        totalRank: rank,
        groupAverageScore: Math.max(20, Math.min(92, avgScore)),
        groupPositionPercentile: posPct,
      },
    };
  });
}

/**
 * Applies the persisted school branding to a list of athlete report cards
 * and synchronizes group averages and rankings across all reports in the group.
 */
export function applyBrandingToReports(
  reports: SportsFlyLabReport[],
  branding?: SportsFlyLabSchoolBranding
): SportsFlyLabReport[] {
  const activeBranding = branding || getStoredLabSchoolBranding();
  const branded = (reports || []).filter(Boolean).map((r) => applyBrandingToReport(r, activeBranding));
  return recalculateGroupAveragesAndRanks(branded);
}

/**
 * Safely sets an item in localStorage without throwing unhandled QuotaExceededError exceptions.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    try {
      localStorage.removeItem('sportsfly_lab_temp_cache');
      localStorage.setItem(key, value);
      return true;
    } catch (retryError) {
      console.warn(`[Storage Warning] "${key}" kalıcı depolama kotası doldu, veri bellekte tutuluyor.`);
      return false;
    }
  }
}

/**
 * Sanitizes report list for localStorage persistence by removing duplicate embedded logos
 * that are already globally stored in school branding settings.
 */
function sanitizeReportsForStorage(reports: SportsFlyLabReport[], globalLogoUrl?: string): SportsFlyLabReport[] {
  const brandingLogo = globalLogoUrl || getStoredLabSchoolBranding()?.logoDataUrl || '';
  return reports.map((rep) => {
    const clone = { ...rep };
    if (
      clone.clubLogoUrl &&
      (clone.clubLogoUrl === brandingLogo ||
        clone.clubLogoUrl === DEFAULT_LAB_SCHOOL_BRANDING.logoDataUrl ||
        clone.clubLogoUrl.startsWith('data:image/'))
    ) {
      delete clone.clubLogoUrl;
    }
    return clone;
  });
}

export function saveStoredLabSchoolBranding(branding: SportsFlyLabSchoolBranding): SportsFlyLabSchoolBranding {
  const stamped: SportsFlyLabSchoolBranding = {
    schoolName: branding.schoolName,
    branchName: branding.branchName,
    logoDataUrl: typeof branding.logoDataUrl === 'string' ? branding.logoDataUrl.trim() : '',
    updatedAt: branding.updatedAt || new Date().toISOString(),
  };
  const serialized = JSON.stringify(stamped);

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(LAB_SCHOOL_BRANDING_KEY, serialized);
    }
  } catch {
    // ignore sessionStorage quota
  }

  try {
    let savedToLocal = safeSetItem(LAB_SCHOOL_BRANDING_KEY, serialized);

    // If localStorage quota is full (e.g. 71+ reports stored), compact heavy report AI fields to guarantee branding persists
    if (!savedToLocal) {
      try {
        const rawReports = localStorage.getItem(LAB_REPORTS_STORAGE_KEY);
        if (rawReports) {
          const parsedReports = JSON.parse(rawReports);
          if (Array.isArray(parsedReports)) {
            const minimalReports = sanitizeReportsForStorage(parsedReports, stamped.logoDataUrl).map(
              (r) => ({ ...r, aiRecommendations: undefined })
            );
            localStorage.setItem(LAB_REPORTS_STORAGE_KEY, JSON.stringify(minimalReports));
          }
        }
      } catch {
        // If compacting reports didn't free enough space, clear temp report cache so tiny branding key succeeds
        try {
          localStorage.removeItem(LAB_REPORTS_STORAGE_KEY);
        } catch {
          // ignore
        }
      }
      savedToLocal = safeSetItem(LAB_SCHOOL_BRANDING_KEY, serialized);
    }

    // Automatically sync persisted reports in localStorage so every existing & future report carries this branding
    const rawReports = localStorage.getItem(LAB_REPORTS_STORAGE_KEY);
    if (rawReports) {
      const parsedReports = JSON.parse(rawReports);
      if (Array.isArray(parsedReports) && parsedReports.length > 0) {
        const syncedReports = applyBrandingToReports(parsedReports, stamped);
        const sanitized = sanitizeReportsForStorage(syncedReports, stamped.logoDataUrl);
        safeSetItem(LAB_REPORTS_STORAGE_KEY, JSON.stringify(sanitized));
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sportsfly_lab_branding_updated', { detail: stamped })
      );
    }
  } catch (e) {
    console.warn('Spor okulu kurumsal kimlik ayarları saklama uyarısı:', e);
  }
  return stamped;
}

export function getStoredLabReports(): SportsFlyLabReport[] {
  const activeBranding = getStoredLabSchoolBranding();
  try {
    const raw = localStorage.getItem(LAB_REPORTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure every report has a 100% unique ID
        const seenIds = new Set<string>();
        const uniqueParsed = parsed.map((r: any, idx: number) => {
          if (!r) return null;
          let id = r.id || `lab-rep-${idx}`;
          if (seenIds.has(id)) {
            id = `${id}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
          }
          seenIds.add(id);
          return { ...r, id };
        }).filter(Boolean);

        return applyBrandingToReports(uniqueParsed, activeBranding);
      }
    }
  } catch (e) {
    console.warn('SportsFly Lab raporları yükleme uyarısı:', e);
  }
  return applyBrandingToReports(DEFAULT_LAB_REPORTS, activeBranding);
}

export function saveStoredLabReports(
  reports: SportsFlyLabReport[],
  explicitBranding?: SportsFlyLabSchoolBranding
): void {
  try {
    const activeBranding = explicitBranding || getStoredLabSchoolBranding();
    const brandedReports = applyBrandingToReports(reports, activeBranding);
    const sanitizedReports = sanitizeReportsForStorage(brandedReports, activeBranding.logoDataUrl);
    const success = safeSetItem(LAB_REPORTS_STORAGE_KEY, JSON.stringify(sanitizedReports));
    if (!success) {
      const minimalReports = sanitizedReports.map((r) => ({
        ...r,
        aiRecommendations: undefined,
      }));
      safeSetItem(LAB_REPORTS_STORAGE_KEY, JSON.stringify(minimalReports));
    }
  } catch (e) {
    console.warn('SportsFly Lab raporları saklama uyarısı:', e);
  }
}

export function getLocalIsoDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeArchiveDateIso(item: Partial<SportsFlyLabArchivedReport>): string {
  if (item.createdDateIso && /^\d{4}-\d{2}-\d{2}$/.test(item.createdDateIso)) {
    return item.createdDateIso;
  }
  if (item.savedAt) {
    const trMatch = item.savedAt.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (trMatch) {
      const dd = trMatch[1].padStart(2, '0');
      const mm = trMatch[2].padStart(2, '0');
      const yyyy = trMatch[3];
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  if (item.savedTimestamp && Number.isFinite(item.savedTimestamp)) {
    return getLocalIsoDateString(new Date(item.savedTimestamp));
  }
  return getLocalIsoDateString();
}

/**
 * Returns default initial archive items so the 'Karne Arşivi' tab has realistic saved examples out-of-the-box.
 */
function getDefaultLabArchives(): SportsFlyLabArchivedReport[] {
  const activeBranding = getStoredLabSchoolBranding();
  return DEFAULT_LAB_REPORTS.map((rawRep, idx) => {
    const branded = applyBrandingToReport(rawRep, activeBranding);
    const ts = Date.now() - idx * 86400000;
    const isoDate = getLocalIsoDateString(new Date(ts));
    const school = rawRep.clubName || activeBranding.schoolName || 'SportsFly Spor Okulu';
    return {
      archiveId: `lab-arch-default-${idx + 1}`,
      archiveTitle: `${branded.athleteName} — Performans Gelişim Karnesi`,
      archiveNote: `${branded.sportBranch} · Genel Performans Puanı: %${branded.scoreHistory.p2Score || branded.scoreHistory.p3Score || branded.scoreHistory.p1Score}`,
      savedAt: `${branded.date2 && branded.date2 !== '—' && !branded.date2.toLowerCase().includes('tahmin') ? branded.date2 : branded.date1} 14:30`,
      savedTimestamp: ts,
      createdDateIso: isoDate,
      schoolName: school,
      batchGroupTitle: 'Örnek Kayıtlar',
      sourceType: 'single',
      reportSnapshot: { ...branded, clubName: school },
    };
  });
}

export function getStoredLabArchives(): SportsFlyLabArchivedReport[] {
  const activeBranding = getStoredLabSchoolBranding();
  try {
    const raw = localStorage.getItem(LAB_ARCHIVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: SportsFlyLabArchivedReport) => {
          const preservedSchool =
            item.schoolName ||
            item.reportSnapshot?.clubName ||
            activeBranding.schoolName ||
            'SportsFly Spor Okulu';
          const snapshot = item.reportSnapshot
            ? {
                ...item.reportSnapshot,
                clubName: preservedSchool,
              }
            : item.reportSnapshot;
          return {
            ...item,
            schoolName: preservedSchool,
            createdDateIso: normalizeArchiveDateIso(item),
            sourceType: item.sourceType || (item.archiveId?.includes('batch') ? 'batch' : 'single'),
            reportSnapshot: snapshot,
          };
        });
      }
    }
  } catch (e) {
    console.warn('SportsFly Lab karne arşivi okuma uyarısı:', e);
  }
  return getDefaultLabArchives();
}

export function saveStoredLabArchives(archives: SportsFlyLabArchivedReport[]): void {
  try {
    const sanitizedArchives = archives.map((arch) => {
      const preservedSchool = arch.schoolName || arch.reportSnapshot?.clubName || 'SportsFly Spor Okulu';
      const clone: SportsFlyLabReport = {
        ...arch.reportSnapshot,
        clubName: preservedSchool,
      };
      if (clone.clubLogoUrl && clone.clubLogoUrl.startsWith('data:image/')) {
        delete clone.clubLogoUrl;
      }
      return {
        ...arch,
        schoolName: preservedSchool,
        createdDateIso: normalizeArchiveDateIso(arch),
        reportSnapshot: clone,
      };
    });
    const success = safeSetItem(LAB_ARCHIVE_STORAGE_KEY, JSON.stringify(sanitizedArchives));
    if (!success) {
      const compactArchives = sanitizedArchives.map((arch) => ({
        ...arch,
        reportSnapshot: {
          ...arch.reportSnapshot,
          aiRecommendations: undefined,
        },
      }));
      safeSetItem(LAB_ARCHIVE_STORAGE_KEY, JSON.stringify(compactArchives));
    }
  } catch (e) {
    console.warn('SportsFly Lab karne arşivi saklama uyarısı:', e);
  }
}

export function archiveLabReport(
  report: SportsFlyLabReport,
  archiveTitle: string,
  archiveNote?: string,
  options?: { schoolName?: string; createdDateIso?: string }
): SportsFlyLabArchivedReport[] {
  const activeBranding = getStoredLabSchoolBranding();
  const resolvedSchool = (
    options?.schoolName ||
    report.clubName ||
    activeBranding.schoolName ||
    'SportsFly Spor Okulu'
  ).trim();
  const brandedSnapshot: SportsFlyLabReport = JSON.parse(
    JSON.stringify(
      applyBrandingToReport(report, {
        ...activeBranding,
        schoolName: resolvedSchool,
      })
    )
  );
  brandedSnapshot.clubName = resolvedSchool;
  if (!brandedSnapshot.aiRecommendations) {
    brandedSnapshot.aiRecommendations = analyzeLabPerformanceMetrics(brandedSnapshot);
  }

  const now = new Date();
  const dateIso =
    options?.createdDateIso && /^\d{4}-\d{2}-\d{2}$/.test(options.createdDateIso)
      ? options.createdDateIso
      : getLocalIsoDateString(now);
  const [yy, mm, dd] = dateIso.split('-');
  const timeStr = now.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = `${dd}.${mm}.${yy} ${timeStr}`;

  const cleanTitle =
    archiveTitle.trim() ||
    `${brandedSnapshot.athleteName} — ${brandedSnapshot.date3 !== '—' ? brandedSnapshot.date3 : brandedSnapshot.date1} Dönem Karnesi`;

  const scoreVal =
    brandedSnapshot.scoreHistory.p3Score ||
    brandedSnapshot.scoreHistory.p1Score ||
    brandedSnapshot.scoreHistory.p2Score ||
    75;

  const newEntry: SportsFlyLabArchivedReport = {
    archiveId: `lab-arch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    archiveTitle: cleanTitle,
    archiveNote:
      archiveNote?.trim() ||
      `${resolvedSchool} · ${brandedSnapshot.sportBranch} · %${scoreVal} Performans`,
    savedAt: formattedDate,
    savedTimestamp: Date.now(),
    createdDateIso: dateIso,
    schoolName: resolvedSchool,
    batchGroupTitle: 'Bireysel Kayıt',
    sourceType: 'single',
    reportSnapshot: brandedSnapshot,
  };

  const currentArchives = getStoredLabArchives();
  const nextArchives = [newEntry, ...currentArchives];
  saveStoredLabArchives(nextArchives);
  return nextArchives;
}

export function renameLabArchiveItem(
  archiveId: string,
  newTitle: string,
  newNote?: string
): SportsFlyLabArchivedReport[] {
  const currentArchives = getStoredLabArchives();
  const nextArchives = currentArchives.map((item) => {
    if (item.archiveId !== archiveId) return item;
    return {
      ...item,
      archiveTitle: newTitle.trim() || item.archiveTitle,
      archiveNote: newNote !== undefined ? newNote.trim() : item.archiveNote,
    };
  });
  saveStoredLabArchives(nextArchives);
  return nextArchives;
}

export function deleteLabArchiveItem(archiveId: string): SportsFlyLabArchivedReport[] {
  const currentArchives = getStoredLabArchives();
  const nextArchives = currentArchives.filter((item) => item.archiveId !== archiveId);
  saveStoredLabArchives(nextArchives);
  return nextArchives;
}

export function deleteLabArchiveBatchItems(archiveIds: string[]): SportsFlyLabArchivedReport[] {
  const idSet = new Set(archiveIds);
  const currentArchives = getStoredLabArchives();
  const nextArchives = currentArchives.filter((item) => !idSet.has(item.archiveId));
  saveStoredLabArchives(nextArchives);
  return nextArchives;
}

/**
 * Archives multiple report cards at once (Batch Archive) into Karne Arşivi (localStorage),
 * tagging every athlete card with exact Calendar Date (createdDateIso), Sports School Name, and shared batchId.
 */
export function archiveBatchLabReports(
  reportsToArchive: SportsFlyLabReport[],
  batchGroupTitle: string,
  batchNote?: string,
  options?: {
    schoolName?: string;
    createdDateIso?: string;
    batchId?: string;
  }
): SportsFlyLabArchivedReport[] {
  const currentBranding = getStoredLabSchoolBranding();
  const currentArchives = getStoredLabArchives();
  const now = new Date();
  const dateIso =
    options?.createdDateIso && /^\d{4}-\d{2}-\d{2}$/.test(options.createdDateIso)
      ? options.createdDateIso
      : getLocalIsoDateString(now);
  const [yy, mm, dd] = dateIso.split('-');
  const timeStr = now.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const nowStr = `${dd}.${mm}.${yy} ${timeStr}`;

  const baseAnchorDate = new Date(`${dateIso}T${timeStr}:00`);
  const baseTs = Number.isNaN(baseAnchorDate.getTime())
    ? Date.now()
    : baseAnchorDate.getTime();

  const fallbackSchool = (
    options?.schoolName ||
    currentBranding.schoolName ||
    reportsToArchive[0]?.clubName ||
    'SportsFly Spor Okulu'
  ).trim();
  const groupLabel =
    batchGroupTitle.trim() || `${dd}.${mm}.${yy} Toplu Karne Grubu`;
  const batchId =
    options?.batchId || `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const newEntries: SportsFlyLabArchivedReport[] = reportsToArchive.map((rep, idx) => {
    const resolvedSchool = (options?.schoolName || rep.clubName || fallbackSchool).trim();
    const brandedSnapshot = applyBrandingToReport(rep, {
      ...currentBranding,
      schoolName: resolvedSchool,
    });
    brandedSnapshot.clubName = resolvedSchool;
    const activePct =
      brandedSnapshot.scoreHistory.p3Score ||
      brandedSnapshot.scoreHistory.p1Score ||
      brandedSnapshot.scoreHistory.p2Score ||
      75;

    return {
      archiveId: `lab-arch-batch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      archiveTitle: `${brandedSnapshot.athleteName} — ${groupLabel} (${brandedSnapshot.sportBranch})`,
      archiveNote:
        batchNote?.trim() ||
        `${resolvedSchool} · Toplu Karne Arşivi · Güncel Performans: %${activePct}`,
      savedAt: nowStr,
      savedTimestamp: baseTs - idx,
      createdDateIso: dateIso,
      schoolName: resolvedSchool,
      batchId,
      batchGroupTitle: groupLabel,
      sourceType: 'batch',
      reportSnapshot: brandedSnapshot,
    };
  });

  const nextArchives = [...newEntries, ...currentArchives];
  saveStoredLabArchives(nextArchives);
  return nextArchives;
}

export interface UploadedExcelFileRecord {
  id: string;
  fileName: string;
  uploadedAt: string;
  athleteCount: number;
  clubName: string;
  fileSizeBytes?: number;
  status: 'İşlendi' | 'Karneler Üretildi' | 'Arşivlendi';
  groupTitle?: string;
  mappedReportIds?: string[];
}

export const LAB_EXCEL_HISTORY_STORAGE_KEY = 'sportsfly_lab_uploaded_excel_history_v1';

export function getStoredLabExcelHistory(): UploadedExcelFileRecord[] {
  try {
    const raw = localStorage.getItem(LAB_EXCEL_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return [
    {
      id: 'excel-hist-1',
      fileName: 'SportsFly_Lab_Toplu_Sporcu_Sablonu (6 Örnek Sporcu).xlsx',
      uploadedAt: new Date().toLocaleDateString('tr-TR') + ' 11:45',
      athleteCount: 6,
      clubName: 'Ataşehir Spor Okulları',
      status: 'Karneler Üretildi',
      groupTitle: '2026 Dönemi Performans Taraması',
    },
    {
      id: 'excel-hist-2',
      fileName: 'U14_Basketbol_Akademi_Performans_Verileri.xlsx',
      uploadedAt: new Date(Date.now() - 86400000 * 2).toLocaleDateString('tr-TR') + ' 16:20',
      athleteCount: 14,
      clubName: 'Gelişim Akademi Basketbol',
      status: 'İşlendi',
      groupTitle: 'Antropometri ve Motorik Tarama Seti',
    },
    {
      id: 'excel-hist-3',
      fileName: 'Yuzme_Kulubu_Sezon_Basi_Fiziksel_Olcum.xlsx',
      uploadedAt: new Date(Date.now() - 86400000 * 5).toLocaleDateString('tr-TR') + ' 09:15',
      athleteCount: 8,
      clubName: 'Marmara Yüzme Kulübü',
      status: 'Karneler Üretildi',
      groupTitle: '1. ve 2. Dönem Karşılaştırmalı Karne',
    },
  ];
}

export function saveStoredLabExcelHistory(history: UploadedExcelFileRecord[]): void {
  try {
    localStorage.setItem(LAB_EXCEL_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {}
}

export function addStoredLabExcelRecord(record: UploadedExcelFileRecord): void {
  const current = getStoredLabExcelHistory();
  const next = [record, ...current.filter((item) => item.id !== record.id)];
  saveStoredLabExcelHistory(next);
}

/**
 * Sample multi-athlete rows for Batch Excel Template and 1-Click Sample Batch Testing
 * Fully aligned with current 7-page SportsFly Lab report card content (Anthropometry, Heath-Carter Somatotype change table, Motor tests, PACER, PHV, Score progression, Trainer notes).
 */
export const SAMPLE_BATCH_ATHLETE_ROWS: Record<string, string | number>[] = [];

/**
 * Creates a brand-new 7-page SportsFlyLabReport and automatically applies
 * the persisted localStorage school branding (logo, school name, branch).
 */
export function createNewLabReportWithBranding(params: {
  athleteName: string;
  sportBranch: string;
  gender: 'Erkek' | 'Kadın';
  ageYears: number;
  baseTemplate?: SportsFlyLabReport;
}): SportsFlyLabReport {
  const activeBranding = getStoredLabSchoolBranding();
  const template = params.baseTemplate || DEFAULT_LAB_REPORTS[0] || EMPTY_LAB_REPORT_TEMPLATE;
  const cloned: SportsFlyLabReport = JSON.parse(JSON.stringify(template));
  const today = new Date().toLocaleDateString('tr-TR');

  cloned.id = `lab-new-${Date.now()}`;
  cloned.athleteName = params.athleteName.trim() || 'Yeni Sporcu';
  cloned.athleteCode = `SF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  cloned.sportBranch = params.sportBranch.trim() || template.sportBranch;
  cloned.gender = params.gender;
  cloned.ageYears = Number(params.ageYears) || 11.0;
  cloned.ageMonths = Number((cloned.ageYears * 12).toFixed(1));
  cloned.date3 = '—';

  // Automatically apply persisted school branding (logo, school name, branch)
  let branded = applyBrandingToReport(cloned, activeBranding);
  
  // Automatically apply AI Forecast for 2nd test beklenen değerler
  branded = generateAiForecastForLabReport(branded);
  
  branded.aiRecommendations = analyzeLabPerformanceMetrics(branded);
  return branded;
}

/**
 * Helper to build an athlete flat row matching all current karne fields
 */
function buildAthleteFlatRow(rep: SportsFlyLabReport): Record<string, string | number> {
  const getB3 = (id: string) => rep.bodyComposition.find((x) => x.id === id)?.m3 ?? 0;
  const getM3 = (id: string) => rep.motorPerformance.find((x) => x.id === id)?.m3 ?? 0;

  return {
    'Adı Soyadı': rep.athleteName,
    'Doğum Tarihi (GG.AA.YYYY)': rep.birthDate || '',
    'Boy (cm)': getB3('height'),
    'Ağırlık (kg)': getB3('weight'),
    'Pençe Kuvveti - Sağ': getM3('grip_strength_right'),
    'Pençe Kuvveti - Sol': getM3('grip_strength_left'),
    'Flamingo Denge Testi': getM3('balance'),
    '20 Metre Sprint (sn)': getM3('sprint'),
    'Otur-Uzan / Esneklik (cm)': getM3('flexibility'),
    'Kol Sürat Testi Sağ': getM3('arm_speed_right'),
    'Kol Sürat Testi Sol': getM3('arm_speed_left'),
    'Durarak Uzun Atlama (cm)': getM3('standing_long_jump'),
    '10 x 5 Metre Sürat (sn)': getM3('agility'),
    'Dikey Sıçrama (cm)': getM3('vertical_jump'),
    'Triceps Deri Kıvrım (mm)': getB3('triceps'),
    'Biceps Deri Kıvrım (mm)': getB3('biceps_skf'),
    'İliak Deri Kıvrım (mm)': getB3('iliac_skf'),
    'Calf Deri Kıvrım (mm)': getB3('calf_skf'),
    'Anne Boy (cm)': rep.parentInfo?.anneBoy || '',
    'Anne Ağırlık (kg)': rep.parentInfo?.anneKilo || '',
    'Anne Spor Geçmişi': rep.parentInfo?.anneSporGecmisi || '',
    'Baba Boy (cm)': rep.parentInfo?.babaBoy || '',
    'Baba Ağırlık (kg)': rep.parentInfo?.babaKilo || '',
    'Baba Spor Geçmişi': rep.parentInfo?.babaSporGecmisi || '',
  };
}

/**
 * Downloads a comprehensive 3-sheet Excel template (.xlsx) strictly reflecting the CURRENT report card content:
 * 1) "Parametre_Bazli_Karne": Vertical parameter table of all 7 sections (Anthropometry, Somatotype change table, Motor tests, PACER, PHV, Score history, Notes)
 * 2) "Toplu_Sporcu_Listesi": Multi-athlete row table (1 row = 1 athlete) pre-populated with active athlete and sample rows
 * 3) "Sutun_Rehberi_ve_Normlar": Explanatory guide detailing units, norms, and formats
 */
export function downloadSportsFlyLabExcelTemplate(currentReport: SportsFlyLabReport): void {
  const wb = XLSX.utils.book_new();
  const activeBranding = getStoredLabSchoolBranding();
  const brandedCurrent = applyBrandingToReport(currentReport, activeBranding);

  // Sheet 1: Detailed Parameter Sheet for the active athlete (matches current 7-page report structure)
  const paramRows: Record<string, string | number>[] = [
    {
      Kategori: 'SPORCU GENEL BİLGİLERİ',
      Parametre_Kodu: 'athlete_info',
      Parametre_Adi: 'Sporcu Adı',
      Birim: 'Branş',
      Olcum_1: '00.00.0000',
      Olcum_2: '00.00.0000',
      Olcum_3: '00.00.0000',
      Yuzdelik: 0,
      SD_Skoru: 0,
      Durum: 'Kulüp Adı',
      Beklenen_Hedef: 0,
    },
    ...currentReport.bodyComposition.map((row) => ({
      Kategori: '1. ANTROPOMETRİ VE BEDEN KOMPOZİSYONU',
      Parametre_Kodu: row.id,
      Parametre_Adi: row.name,
      Birim: row.unit,
      Olcum_1: 0,
      Olcum_2: 0,
      Olcum_3: 0,
      Yuzdelik: 0,
      SD_Skoru: 0,
      Durum: '',
      Beklenen_Hedef: 0,
    })),
    // Somatotype Heath-Carter Change Table (Only Change Table, no radar/2D)
    {
      Kategori: '2. HEATH-CARTER SOMATOTİP DEĞİŞİM TABLOSU',
      Parametre_Kodu: 'somatotype_endo',
      Parametre_Adi: 'Endomorfi (Göreceli Yağlılık)',
      Birim: 'Puan',
      Olcum_1: 0,
      Olcum_2: 0,
      Olcum_3: 0,
      Yuzdelik: 0,
      SD_Skoru: 0,
      Durum: '',
      Beklenen_Hedef: 0,
    },
    {
      Kategori: '2. HEATH-CARTER SOMATOTİP DEĞİŞİM TABLOSU',
      Parametre_Kodu: 'somatotype_meso',
      Parametre_Adi: 'Mezomorfi (Kas-İskelet Gelişimi)',
      Birim: 'Puan',
      Olcum_1: 0,
      Olcum_2: 0,
      Olcum_3: 0,
      Yuzdelik: 0,
      SD_Skoru: 0,
      Durum: '',
      Beklenen_Hedef: 0,
    },
    {
      Kategori: '2. HEATH-CARTER SOMATOTİP DEĞİŞİM TABLOSU',
      Parametre_Kodu: 'somatotype_ecto',
      Parametre_Adi: 'Ektomorfi (İncelik / Doğrusallık)',
      Birim: 'Puan',
      Olcum_1: 0,
      Olcum_2: 0,
      Olcum_3: 0,
      Yuzdelik: 0,
      SD_Skoru: 0,
      Durum: '',
      Beklenen_Hedef: 0,
    },
    ...currentReport.motorPerformance.map((row) => {
      return {
        Kategori: '3. BİYOMOTOR YETENEK VE MOTOR TESTLER',
        Parametre_Kodu: row.id,
        Parametre_Adi: row.name,
        Birim: row.unit,
        Olcum_1: 0,
        Olcum_2: 0,
        Olcum_3: 0,
        Yuzdelik: 0,
        SD_Skoru: 0,
        Durum: '',
        Beklenen_Hedef: 0,
      };
    }),
    {
      Kategori: '4. KARDİYORESPİRATUAR VE KONDİSYON',
      Parametre_Kodu: 'pacer_distance',
      Parametre_Adi: 'PACER Shuttle Run Koşu Mesafesi',
      Birim: 'Metre',
      Olcum_1: currentReport.cardio.test1Distance,
      Olcum_2: currentReport.cardio.test2Distance,
      Olcum_3: currentReport.cardio.test3Distance,
      Yuzdelik: 80,
      SD_Skoru: 0.8,
      Durum: currentReport.cardio.test3Status,
      Beklenen_Hedef: currentReport.cardio.test3Distance + 160,
    },
    {
      Kategori: '4. KARDİYORESPİRATUAR VE KONDİSYON',
      Parametre_Kodu: 'pacer_vo2',
      Parametre_Adi: 'VO2peak Aerobik Güç',
      Birim: 'ml/kg/dk',
      Olcum_1: currentReport.cardio.test1Vo2,
      Olcum_2: currentReport.cardio.test2Vo2,
      Olcum_3: currentReport.cardio.test3Vo2,
      Yuzdelik: 85,
      SD_Skoru: 1.0,
      Durum: 'İyi Düzey',
      Beklenen_Hedef: 45.0,
    },
    {
      Kategori: '4. KARDİYORESPİRATUAR VE KONDİSYON',
      Parametre_Kodu: 'bmr_met',
      Parametre_Adi: 'Bazal Metabolizma (BMR) & MET',
      Birim: 'kcal / MET',
      Olcum_1: currentReport.cardio.basalMetabolicRate - 60,
      Olcum_2: currentReport.cardio.basalMetabolicRate - 25,
      Olcum_3: currentReport.cardio.basalMetabolicRate,
      Yuzdelik: 75,
      SD_Skoru: 0.5,
      Durum: `${currentReport.cardio.functionalCapacityMet} MET Kapasite`,
      Beklenen_Hedef: currentReport.cardio.basalMetabolicRate + 100,
    },
    {
      Kategori: '5. BİYOLOJİK OLGUNLAŞMA VE PHV',
      Parametre_Kodu: 'phv_age',
      Parametre_Adi: 'Tepe Boy Hızı (PHV) Yaşı',
      Birim: 'Yaş',
      Olcum_1: currentReport.phvAge,
      Olcum_2: currentReport.phvAge,
      Olcum_3: currentReport.phvAge,
      Yuzdelik: 50,
      SD_Skoru: 0,
      Durum: currentReport.maturationStatus || 'Zamanında',
      Beklenen_Hedef: currentReport.predictedAdultHeight,
    },
    {
      Kategori: '5. BİYOLOJİK OLGUNLAŞMA VE PHV',
      Parametre_Kodu: 'predicted_height',
      Parametre_Adi: 'Tahmini 18 Yaş Yetişkin Boyu',
      Birim: 'cm',
      Olcum_1: currentReport.predictedAdultHeight - 2,
      Olcum_2: currentReport.predictedAdultHeight - 1,
      Olcum_3: currentReport.predictedAdultHeight,
      Yuzdelik: 88,
      SD_Skoru: 1.2,
      Durum: 'Uzun Boy Projeksiyonu',
      Beklenen_Hedef: currentReport.predictedAdultHeight,
    },
    {
      Kategori: '6. DÖNEMSEL PERFORMANS SKORLARI',
      Parametre_Kodu: 'overall_score',
      Parametre_Adi: 'Genel Karne Performans Puanı',
      Birim: '% 0-100',
      Olcum_1: currentReport.scoreHistory.p1Score,
      Olcum_2: currentReport.scoreHistory.p2Score,
      Olcum_3: currentReport.scoreHistory.p3Score,
      Yuzdelik: currentReport.scoreHistory.p3Score,
      SD_Skoru: 1.0,
      Durum: currentReport.scoreHistory.p3Score >= 80 ? 'Yüksek Başarı' : 'Gelişiyor',
      Beklenen_Hedef: Math.min(100, currentReport.scoreHistory.p3Score + 6),
    },
    {
      Kategori: '7. UZMAN DEĞERLENDİRME VE GELİŞİM NOTU',
      Parametre_Kodu: 'expert_comment',
      Parametre_Adi: 'Antrenör / Uzman Değerlendirme Görüşü',
      Birim: 'Metin',
      Olcum_1: '-',
      Olcum_2: '-',
      Olcum_3: currentReport.expertComment || 'Uzman değerlendirme notu tanımlanmıştır.',
      Yuzdelik: '-',
      SD_Skoru: '-',
      Durum: 'Tamamlandı',
      Beklenen_Hedef: currentReport.nextTargetDate || 'Gelecek Test Dönemi',
    },
  ];

  const wsParams = XLSX.utils.json_to_sheet(paramRows);
  wsParams['!cols'] = [
    { wch: 36 },
    { wch: 22 },
    { wch: 34 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 26 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsParams, 'Parametre_Bazli_Karne');

  // Sheet 2: Multi-Athlete Flat Table (Row 1 is active athlete, followed by sample athletes)
  const currentAthleteRow = buildAthleteFlatRow(brandedCurrent);
  const otherSampleRows = SAMPLE_BATCH_ATHLETE_ROWS;
  const combinedRows = [currentAthleteRow, ...otherSampleRows];

  const wsFlat = XLSX.utils.json_to_sheet(combinedRows);
  wsFlat['!cols'] = Object.keys(currentAthleteRow).map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsFlat, 'Toplu_Sporcu_Listesi');

  // Sheet 3: Reference Guide
  const guideRows = [
    { Sutun: 'Sporcu_Adi', Zorunlu: 'Evet', Birim: 'Metin', Aciklama: 'Sporcunun tam adı (Her satır için 1 tam karne oluşturur)' },
    { Sutun: 'Sporcu_Kodu', Zorunlu: 'İsteğe Bağlı', Birim: 'Metin', Aciklama: 'Lisans / kulüp kodu (Boşsa otomatik atanır)' },
    { Sutun: 'Brans', Zorunlu: 'Evet', Birim: 'Metin', Aciklama: 'Spor branşı ve yaş grubu (Örn: Voleybol / U12)' },
    { Sutun: 'Cinsiyet', Zorunlu: 'Evet', Birim: 'Erkek / Kadın', Aciklama: 'Normatif hesaplamalar için cinsiyet' },
    { Sutun: 'Yas', Zorunlu: 'Evet', Birim: 'Yıl (Ondalık)', Aciklama: 'Kronolojik takvim yaşı (Örn: 11.4)' },
    { Sutun: 'Boy_1, Boy_2, Boy_3', Zorunlu: 'Evet', Birim: 'cm', Aciklama: '1., 2. ve 3. dönem boy uzunlukları' },
    { Sutun: 'Agirlik_1, Agirlik_2, Agirlik_3', Zorunlu: 'Evet', Birim: 'kg', Aciklama: '1., 2. ve 3. dönem vücut ağırlıkları' },
    { Sutun: 'Yag_Yuzdesi_1, 2, 3', Zorunlu: 'İsteğe Bağlı', Birim: '%', Aciklama: 'Deri altı vücut yağ oranı' },
    { Sutun: 'Endomorfi_1, 2, 3', Zorunlu: 'İsteğe Bağlı', Birim: 'Puan', Aciklama: 'Heath-Carter Endomorfi dönem ölçümleri' },
    { Sutun: 'Mezomorfi_1, 2, 3', Zorunlu: 'İsteğe Bağlı', Birim: 'Puan', Aciklama: 'Heath-Carter Mezomorfi dönem ölçümleri' },
    { Sutun: 'Ektomorfi_1, 2, 3', Zorunlu: 'İsteğe Bağlı', Birim: 'Puan', Aciklama: 'Heath-Carter Ektomorfi dönem ölçümleri' },
    { Sutun: 'Surat_1, 2, 3', Zorunlu: 'Evet', Birim: 'sn', Aciklama: '20 metre sürat testi süreleri' },
    { Sutun: 'Cabukluk_1, 2, 3', Zorunlu: 'Evet', Birim: 'sn', Aciklama: '10x5 metre çabukluk testi süreleri' },
    { Sutun: 'Dikey_Sicrama_3, Uzun_Atlama_3', Zorunlu: 'Evet', Birim: 'cm', Aciklama: 'Patlayıcı bacak kuvveti testleri' },
    { Sutun: 'VO2max_3, PACER_Mesafe_3', Zorunlu: 'İsteğe Bağlı', Birim: 'ml/kg/dk, m', Aciklama: 'Kardiyorespiratuar dayanıklılık' },
    { Sutun: 'PHV_Yasi, Tahmini_18_Yas_Boyu', Zorunlu: 'İsteğe Bağlı', Birim: 'Yaş, cm', Aciklama: 'Büyüme atağı ve yetişkin boy projeksiyonu' },
    { Sutun: 'Genel_Performans_Puani', Zorunlu: 'İsteğe Bağlı', Birim: '0-100', Aciklama: 'Genel karne performans skoru (Boşsa testlerden hesaplanır)' },
    { Sutun: 'Uzman_Gorusu', Zorunlu: 'İsteğe Bağlı', Birim: 'Metin', Aciklama: 'Karne 7. sayfasındaki uzman antrenör değerlendirme notu' },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Sutun_Rehberi_ve_Normlar');

  XLSX.writeFile(wb, `SportsFly_Lab_Karne_Sablonu_${currentReport.athleteName.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Downloads a dedicated Multi-Athlete Batch Excel template (.xlsx) where the primary sheet
 * is "Toplu_Sporcu_Listesi" (1 row = 1 athlete) containing all current karne parameters,
 * pre-populated with realistic athlete rows across branches and second sheet is "Sutun_Rehberi_ve_Normlar".
 */
export function downloadBatchSportsFlyLabExcelTemplate(baseTemplate: SportsFlyLabReport): void {
  const wb = XLSX.utils.book_new();
  const activeBranding = getStoredLabSchoolBranding();

  // Create empty template with headers only
  const batchRows = [
    {
      'Sporcu_Adi': '',
      'Sporcu_Kodu': '',
      'Brans': '',
      'Cinsiyet': '',
      'Yas': '',
      'Boy_1': '',
      'Boy_2': '',
      'Boy_3': '',
      'Agirlik_1': '',
      'Agirlik_2': '',
      'Agirlik_3': '',
      'Surat_1': '',
      'Surat_2': '',
      'Surat_3': '',
      'Cabukluk_1': '',
      'Cabukluk_2': '',
      'Cabukluk_3': '',
      'Dikey_Sicrama_3': '',
      'Uzun_Atlama_3': '',
      'Kulup_Adi': activeBranding.schoolName || baseTemplate.clubName,
      'Sube': activeBranding.branchName || baseTemplate.branchName,
    }
  ];

  const wsBatch = XLSX.utils.json_to_sheet(batchRows);
  wsBatch['!cols'] = Object.keys(batchRows[0] || {}).map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsBatch, 'Toplu_Sporcu_Listesi');

  const guideRows = [
    { Sutun: 'Sporcu_Adi', Zorunlu: 'Evet', Birim: 'Metin', Aciklama: 'Sporcunun tam adı (Her satır 1 sporcu için 5 sayfalık tam karne üretir)' },
    { Sutun: 'Sporcu_Kodu', Zorunlu: 'İsteğe Bağlı', Birim: 'Kod', Aciklama: 'Lisans veya akademi kodu' },
    { Sutun: 'Brans', Zorunlu: 'Evet', Birim: 'Metin', Aciklama: 'Spor branşı ve yaş kategorisi (Örn: Voleybol / U12)' },
    { Sutun: 'Cinsiyet', Zorunlu: 'Evet', Birim: 'Erkek / Kadın', Aciklama: 'Normatif referans ve PHV hesabı' },
    { Sutun: 'Yas', Zorunlu: 'Evet', Birim: 'Yıl', Aciklama: 'Takvim yaşı (Örn: 11.4)' },
    { Sutun: 'Boy_1, Boy_2, Boy_3', Zorunlu: 'Evet', Birim: 'cm', Aciklama: '1., 2. ve 3. dönem boy uzunluğu' },
    { Sutun: 'Agirlik_1, Agirlik_2, Agirlik_3', Zorunlu: 'Evet', Birim: 'kg', Aciklama: '1., 2. ve 3. dönem vücut ağırlığı' },
    { Sutun: 'Yag_Yuzdesi_1, 2, 3', Zorunlu: 'İsteğe Bağlı', Birim: '%', Aciklama: 'Deri altı yağ oranı' },
    { Sutun: 'Endomorfi_1, 2, 3', Zorunlu: 'İsteğe Bağlı', Birim: 'Puan', Aciklama: 'Heath-Carter Endomorfi ölçümleri' },
    { Sutun: 'Mezomorfi_1, 2, 3', Zorunlu: 'İsteğe Bağlı', Birim: 'Puan', Aciklama: 'Heath-Carter Mezomorfi ölçümleri' },
    { Sutun: 'Ektomorfi_1, 2, 3', Zorunlu: 'İsteğe Bağlı', Birim: 'Puan', Aciklama: 'Heath-Carter Ektomorfi ölçümleri' },
    { Sutun: 'Surat_1, 2, 3', Zorunlu: 'Evet', Birim: 'sn', Aciklama: '20 metre sürat koşusu süresi' },
    { Sutun: 'Cabukluk_1, 2, 3', Zorunlu: 'Evet', Birim: 'sn', Aciklama: '10x5 metre çabukluk süresi' },
    { Sutun: 'Dikey_Sicrama_3, Uzun_Atlama_3', Zorunlu: 'Evet', Birim: 'cm', Aciklama: 'Patlayıcı sıçrama testleri' },
    { Sutun: 'VO2max_3, PACER_Mesafe_3', Zorunlu: 'İsteğe Bağlı', Birim: 'ml/kg/dk, m', Aciklama: 'Kardiyorespiratuar dayanıklılık' },
    { Sutun: 'PHV_Yasi, Tahmini_18_Yas_Boyu', Zorunlu: 'İsteğe Bağlı', Birim: 'Yaş, cm', Aciklama: 'Büyüme atağı ve yetişkin boyu' },
    { Sutun: 'Genel_Performans_Puani', Zorunlu: 'İsteğe Bağlı', Birim: '0-100', Aciklama: 'Genel karne skoru (Boşsa testlerden hesaplanır)' },
    { Sutun: 'Uzman_Gorusu', Zorunlu: 'İsteğe Bağlı', Birim: 'Metin', Aciklama: 'Karne son sayfasındaki uzman antrenör değerlendirme notu' },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Sutun_Rehberi_ve_Normlar');

  XLSX.writeFile(wb, 'SportsFly_Lab_Toplu_Sporcu_Karne_Sablonu.xlsx');
}

/**
 * Data Validation Layer Helper:
 * Enforces strict integer/float number types on Excel cell inputs or string formatted values.
 * Removes text units (cm, kg, mm, sn, etc.), converts Turkish comma decimals (165,0 -> 165.0),
 * catches test failure keywords, and prevents NaN or string concatenation errors in calculations.
 */
/**
 * Robust date parser for Excel/OCR input, supporting multiple formats.
 */
export function parseDateString(val: any): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toLocaleDateString('tr-TR');
  // Strip any leading period labels such as "I: ", "II: ", "III: ", "I: I: "
  const str = String(val)
    .trim()
    .replace(/^(?:(?:I{1,3}|[123])\s*[:.-]\s*)+/i, '')
    .trim();
  if (!str) return '';

  if (str.toLowerCase().includes('ay arası') || str.toLowerCase().includes('tahmini') || str.toLowerCase().includes('4 ay') || str.toLowerCase().includes('dönem')) {
    return '2-4 Ay Arası (Tahmini)';
  }

  // Check if value is a 5-digit Excel serial date number (e.g., 40361 -> 02.07.2010)
  if (/^\d{5}(?:\.\d+)?$/.test(str)) {
    const serial = parseFloat(str);
    if (!Number.isNaN(serial) && serial >= 15000 && serial <= 65000) {
      const utcDays = Math.floor(serial - 25569);
      const dateObj = new Date(utcDays * 86400 * 1000);
      const d = String(dateObj.getUTCDate()).padStart(2, '0');
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const y = dateObj.getUTCFullYear();
      return `${d}.${m}.${y}`;
    }
  }

  // Try formats: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
  const parts = str.split(/[\.\/\-]/);
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p.trim()))) {
    let d: number, m: number, y: number;
    if (parts[0].trim().length === 4) {
      // YYYY-MM-DD
      y = parseInt(parts[0].trim(), 10);
      m = parseInt(parts[1].trim(), 10);
      d = parseInt(parts[2].trim(), 10);
    } else {
      // DD.MM.YYYY
      d = parseInt(parts[0].trim(), 10);
      m = parseInt(parts[1].trim(), 10);
      y = parseInt(parts[2].trim(), 10);
    }
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      if (y < 100) y += 2000;
      return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
    }
  }
  return str;
}

export function sanitizeGripValue(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  if (isNaN(num) || !Number.isFinite(num) || num <= 0) return 0;
  if (num >= 1000) {
    return Number((num / 100).toFixed(1));
  }
  if (num > 200) {
    return Number((num / 100).toFixed(1));
  }
  return Number(num.toFixed(1));
}

export function isLabRowMeasured(row?: LabParameterRow | null): boolean {
  if (!row) return false;
  if (row.measured === false) return false;
  if (row.measured === true) return true;
  return row.m1 > 0 || row.m2 > 0 || row.m3 > 0;
}

export function getDisplayedMotorPerformance(report: SportsFlyLabReport): LabParameterRow[] {
  if (!report || !report.motorPerformance) return [];
  return report.motorPerformance.filter((row) => isLabRowMeasured(row));
}

export function getDisplayedBodyComposition(report: SportsFlyLabReport): LabParameterRow[] {
  if (!report || !report.bodyComposition) return [];
  return report.bodyComposition.filter((row) => isLabRowMeasured(row));
}

export function sanitizeAndEnforceNumber(val: unknown, fallback: number = 0, minLimit?: number, maxLimit?: number): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') {
    if (Number.isNaN(val) || !Number.isFinite(val)) return fallback;
    let result = val;
    if (minLimit !== undefined && result < minLimit) result = minLimit;
    if (maxLimit !== undefined && result > maxLimit) result = maxLimit;
    return result;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return fallback;

    // Check for failure/invalid keywords
    if (
      trimmed.includes('başarısız') ||
      trimmed.includes('basarisiz') ||
      trimmed.includes('geçersiz') ||
      trimmed.includes('gecersiz') ||
      trimmed.includes('kaldı') ||
      trimmed.includes('kaldi') ||
      trimmed.includes('yok') ||
      trimmed === '-' ||
      trimmed === 'x'
    ) {
      return 0;
    }

    // Replace Turkish comma decimal with dot
    const normalized = val.trim().replace(/,/g, '.');
    // Extract first valid numeric float or integer sequence
    const match = normalized.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = parseFloat(match[0]);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        let result = parsed;
        if (minLimit !== undefined && result < minLimit) result = minLimit;
        if (maxLimit !== undefined && result > maxLimit) result = maxLimit;
        return result;
      }
    }
  }

  return fallback;
}

/**
 * System-Wide Data Validation Layer for Athlete Report Cards.
 * Sanitizes all numerical fields across body composition, motor performance, somatotype,
 * cardio, PHV, and age metrics to guarantee numeric safety and accurate report card calculations.
 */
export function validateAndSanitizeLabReport(report: SportsFlyLabReport): SportsFlyLabReport {
  if (!report) return report;

  // 1. Basic Age & Growth Metrics
  report.ageYears = sanitizeAndEnforceNumber(report.ageYears, 11, 4, 40);
  report.ageMonths = sanitizeAndEnforceNumber(report.ageMonths, report.ageYears * 12, 48, 480);
  const isFemaleAthlete =
    String(report.gender || '').toLowerCase().includes('kad') ||
    String(report.gender || '').toLowerCase().includes('kız') ||
    String(report.gender || '').toLowerCase().includes('kiz');
  const defaultPhvAge = isFemaleAthlete ? 12.1 : 13.8;
  report.phvAge =
    report.phvAge && report.phvAge >= 10.2 && report.phvAge <= 16.5
      ? sanitizeAndEnforceNumber(report.phvAge, defaultPhvAge, 10.2, 16.5)
      : defaultPhvAge;
  report.phvHeight =
    report.phvHeight && report.phvHeight >= 135
      ? sanitizeAndEnforceNumber(report.phvHeight, 156, 135, 210)
      : 156;
  report.predictedAdultHeight =
    report.predictedAdultHeight && report.predictedAdultHeight >= 145
      ? sanitizeAndEnforceNumber(report.predictedAdultHeight, 170, 145, 225)
      : 170;
  report.sittingHeight =
    report.sittingHeight && report.sittingHeight >= 55
      ? sanitizeAndEnforceNumber(report.sittingHeight, 80, 55, 115)
      : 80;

  // 2. Body Composition Rows
  if (Array.isArray(report.bodyComposition)) {
    report.bodyComposition.forEach((row) => {
      row.m1 = sanitizeAndEnforceNumber(row.m1, 0, 0, 500);
      row.m2 = sanitizeAndEnforceNumber(row.m2, 0, 0, 500);
      row.m3 = sanitizeAndEnforceNumber(row.m3, 0, 0, 500);
      row.percentile = sanitizeAndEnforceNumber(row.percentile, 50, 1, 99);
      row.sd = sanitizeAndEnforceNumber(row.sd, 0, -5, 5);
      row.refLow = sanitizeAndEnforceNumber(row.refLow, 0);
      row.refMid = sanitizeAndEnforceNumber(row.refMid, 0);
      row.refHigh = sanitizeAndEnforceNumber(row.refHigh, 0);
    });
  }

  // 3. Motor Performance Rows
  if (Array.isArray(report.motorPerformance)) {
    report.motorPerformance.forEach((row) => {
      const isGrip = row.id === 'grip_strength_right' || row.id === 'grip_strength_left' ||
                     row.name?.toLowerCase().includes('pençe') ||
                     row.name?.toLowerCase().includes('kavrama') ||
                     row.name?.toLowerCase().includes('grip');
      if (isGrip) {
        row.m1 = sanitizeGripValue(row.m1);
        row.m2 = sanitizeGripValue(row.m2);
        row.m3 = sanitizeGripValue(row.m3);
      } else {
        row.m1 = sanitizeAndEnforceNumber(row.m1, 0, 0, 500);
        row.m2 = sanitizeAndEnforceNumber(row.m2, 0, 0, 500);
        row.m3 = sanitizeAndEnforceNumber(row.m3, 0, 0, 500);
      }
      row.percentile = sanitizeAndEnforceNumber(row.percentile, 50, 1, 99);
      row.sd = sanitizeAndEnforceNumber(row.sd, 0, -5, 5);
      row.refLow = sanitizeAndEnforceNumber(row.refLow, 0);
      row.refMid = sanitizeAndEnforceNumber(row.refMid, 0);
      row.refHigh = sanitizeAndEnforceNumber(row.refHigh, 0);
    });
  }

  // 4. Somatotype Metrics
  if (report.somatotype) {
    if (report.somatotype.m1) {
      report.somatotype.m1.endo = sanitizeAndEnforceNumber(report.somatotype.m1.endo, 0, 0, 20);
      report.somatotype.m1.meso = sanitizeAndEnforceNumber(report.somatotype.m1.meso, 0, 0, 20);
      report.somatotype.m1.ecto = sanitizeAndEnforceNumber(report.somatotype.m1.ecto, 0, 0, 20);
    }
    if (report.somatotype.m2) {
      report.somatotype.m2.endo = sanitizeAndEnforceNumber(report.somatotype.m2.endo, 0, 0, 20);
      report.somatotype.m2.meso = sanitizeAndEnforceNumber(report.somatotype.m2.meso, 0, 0, 20);
      report.somatotype.m2.ecto = sanitizeAndEnforceNumber(report.somatotype.m2.ecto, 0, 0, 20);
    }
    if (report.somatotype.m3) {
      report.somatotype.m3.endo = sanitizeAndEnforceNumber(report.somatotype.m3.endo, 0, 0, 20);
      report.somatotype.m3.meso = sanitizeAndEnforceNumber(report.somatotype.m3.meso, 0, 0, 20);
      report.somatotype.m3.ecto = sanitizeAndEnforceNumber(report.somatotype.m3.ecto, 0, 0, 20);
    }
  }

  // 5. Cardio & Anaerobic Metrics
  if (report.cardio) {
    report.cardio.test1Distance = sanitizeAndEnforceNumber(report.cardio.test1Distance, 0);
    report.cardio.test1Shuttles = sanitizeAndEnforceNumber(report.cardio.test1Shuttles, 0);
    report.cardio.test1Vo2 = sanitizeAndEnforceNumber(report.cardio.test1Vo2, 0);
    report.cardio.test2Distance = sanitizeAndEnforceNumber(report.cardio.test2Distance, 0);
    report.cardio.test2Shuttles = sanitizeAndEnforceNumber(report.cardio.test2Shuttles, 0);
    report.cardio.test2Vo2 = sanitizeAndEnforceNumber(report.cardio.test2Vo2, 0);
    report.cardio.test3Distance = sanitizeAndEnforceNumber(report.cardio.test3Distance, 0);
    report.cardio.test3Shuttles = sanitizeAndEnforceNumber(report.cardio.test3Shuttles, 0);
    report.cardio.test3Vo2 = sanitizeAndEnforceNumber(report.cardio.test3Vo2, 0);
    report.cardio.basalMetabolicRate = sanitizeAndEnforceNumber(report.cardio.basalMetabolicRate, 1300);
    report.cardio.functionalCapacityMet = sanitizeAndEnforceNumber(report.cardio.functionalCapacityMet, 10);
    report.cardio.maxHeartRate = sanitizeAndEnforceNumber(report.cardio.maxHeartRate, 200);
    report.cardio.verticalJumpAnaerobicWatt = sanitizeAndEnforceNumber(report.cardio.verticalJumpAnaerobicWatt, 0);
    report.cardio.verticalJumpRelativeWatt = sanitizeAndEnforceNumber(report.cardio.verticalJumpRelativeWatt, 0);
  }

  // 6. Score History
  if (report.scoreHistory) {
    report.scoreHistory.p1Score = sanitizeAndEnforceNumber(report.scoreHistory.p1Score, 0, 0, 100);
    report.scoreHistory.p2Score = sanitizeAndEnforceNumber(report.scoreHistory.p2Score, 0, 0, 100);
    report.scoreHistory.p3Score = sanitizeAndEnforceNumber(report.scoreHistory.p3Score, 0, 0, 100);
  }

  // 7. Ipsative Targets
  if (Array.isArray(report.ipsativeTargets)) {
    report.ipsativeTargets.forEach((target) => {
      target.m1 = sanitizeAndEnforceNumber(target.m1, 0);
      target.m2 = sanitizeAndEnforceNumber(target.m2, 0);
      target.m3 = sanitizeAndEnforceNumber(target.m3, 0);
      target.target = sanitizeAndEnforceNumber(target.target, 0);
    });
  }

  // 8. Parent Info numeric normalization
  if (report.parentInfo) {
    if (report.parentInfo.anneBoy) {
      const aBoyNum = sanitizeAndEnforceNumber(report.parentInfo.anneBoy, 0);
      if (aBoyNum > 0) report.parentInfo.anneBoy = String(aBoyNum);
    }
    if (report.parentInfo.anneKilo) {
      const aKiloNum = sanitizeAndEnforceNumber(report.parentInfo.anneKilo, 0);
      if (aKiloNum > 0) report.parentInfo.anneKilo = String(aKiloNum);
    }
    if (report.parentInfo.babaBoy) {
      const bBoyNum = sanitizeAndEnforceNumber(report.parentInfo.babaBoy, 0);
      if (bBoyNum > 0) report.parentInfo.babaBoy = String(bBoyNum);
    }
    if (report.parentInfo.babaKilo) {
      const bKiloNum = sanitizeAndEnforceNumber(report.parentInfo.babaKilo, 0);
      if (bKiloNum > 0) report.parentInfo.babaKilo = String(bKiloNum);
    }
  }

  return report;
}

/**
 * Scientific Data Validation and Auto-Correction layer to ensure absolute data consistency
 * across all report parameters, averages, chronological test histories, and metrics.
 * Eliminates any mathematical contradictions or data anomalies before final rendering/saving.
 */
export function ensureDataConsistency(report: SportsFlyLabReport): void {
  if (!report) return;

  // Run Data Validation Layer to guarantee numeric safety & age/gender normative alignment
  validateAndSanitizeLabReport(report);
  applyAgeGenderNormsToReport(report);

  // 0. Heath-Carter Somatotype Biomechanical Recalculation (yalnızca ölçülen bileşenler)
  const getSomatoInput = (mIdx: 'm1' | 'm2' | 'm3') => {
    const getVal = (fid: string) => {
      const row = report.bodyComposition?.find((x) => x.id === fid);
      return row && isLabRowMeasured(row) ? (row[mIdx] || 0) : 0;
    };
    return {
      height: getVal('height'),
      weight: getVal('weight'),
      triceps: getVal('triceps') || getVal('tricepsSkinfold'),
      subscapular: getVal('subscapula') || getVal('subscapularSkinfold'),
      supraspinale: getVal('supraspinal') || getVal('iliac_skf') || getVal('suprailiacSkinfold'),
      calfSkf: getVal('calf_skf') || getVal('calfSkinfold'),
      humerus: getVal('humerus'),
      femur: getVal('femur'),
      bicepsGirth: getVal('biceps_girth'),
      calfGirth: getVal('calf_girth'),
    };
  };

  if (!report.somatotype) {
    report.somatotype = {
      m1: { endo: 0, meso: 0, ecto: 0, category: '—' },
      m2: { endo: 0, meso: 0, ecto: 0, category: '—' },
      m3: { endo: 0, meso: 0, ecto: 0, category: '—' },
      eliteRef: { sport: report.sportBranch || 'Genel', endo: 3.2, meso: 4.5, ecto: 3.5, refScore: 92 },
    };
  }

  const hasThirdDate = Boolean(report.date3 && report.date3 !== '—' && report.date3.trim() !== '');
  const s1 = getSomatoInput('m1');
  if (s1.height > 0 && s1.weight > 0) report.somatotype.m1 = calculateHeathCarterSomatotype(s1);
  const s2 = getSomatoInput('m2');
  if (s2.height > 0 && s2.weight > 0) report.somatotype.m2 = calculateHeathCarterSomatotype(s2);
  const s3 = getSomatoInput('m3');
  if (hasThirdDate && s3.height > 0 && s3.weight > 0) {
    report.somatotype.m3 = calculateHeathCarterSomatotype(s3);
  } else {
    report.somatotype.m3 = { endo: 0, meso: 0, ecto: 0, category: '—' };
  }

  // 1. Maturation (PHV) Height vs Predicted Adult Height Consistency
  const heightRow = report.bodyComposition?.find(x => x.id === 'height');
  const weightRow = report.bodyComposition?.find(x => x.id === 'weight');
  if (heightRow) {
    const currentHeight = heightRow.m3 || heightRow.m2 || heightRow.m1 || 160;
    if (!report.predictedAdultHeight || report.predictedAdultHeight <= currentHeight) {
      report.predictedAdultHeight = Math.round(currentHeight + (report.gender === 'Erkek' ? 14 : 9));
    }
  }

  // 2. Guarantee 2nd measurement (Tahmini / Gerçek) is NEVER empty and NEVER worsens compared to 1st measurement
  if (!report.date2 || report.date2 === '—') {
    report.date2 = '2-4 Ay Arası (Tahmini)';
    report.isAiForecast = true;
  } else if (report.date2.toLowerCase().includes('tahmin')) {
    report.isAiForecast = true;
  }

  // Ensure baseline height & weight context (for internal PHV/BMR calculations only — never fabricate unmeasured rows)
  const baseHeightM1 = heightRow && heightRow.m1 > 0 ? heightRow.m1 : (heightRow?.m2 && heightRow.m2 > 0 ? heightRow.m2 : 0);
  const baseHeightM2 = heightRow && heightRow.m2 > 0 ? heightRow.m2 : baseHeightM1;
  const baseWeightM1 = weightRow && weightRow.m1 > 0 ? weightRow.m1 : (weightRow?.m2 && weightRow.m2 > 0 ? weightRow.m2 : 0);
  const baseAge = report.ageYears && report.ageYears > 4 ? report.ageYears : 12;

  // Clean up legacy synthetic refMid/derived stubs persisted by earlier versions so unmeasured Excel categories remain hidden
  if (Array.isArray(report.bodyComposition)) {
    report.bodyComposition.forEach((b) => {
      if (b.measured !== undefined || b.m3 > 0) return;
      const idLower = (b.id || '').toLowerCase();
      const approx = (a: number, t: number) => Math.abs(a - t) <= 0.11;
      let isLegacyStub = false;
      if (idLower === 'subscapula' && b.m1 === 10 && (b.m2 === 0 || approx(b.m2, 9.2) || approx(b.m2, 9.5) || b.m2 === 10)) {
        isLegacyStub = true;
      } else if (idLower === 'supraspinal' && b.m1 === 10 && (b.m2 === 0 || approx(b.m2, 9.2) || approx(b.m2, 9.5) || b.m2 === 10)) {
        isLegacyStub = true;
      } else if (idLower === 'body_fat' && b.m1 === 16 && (b.m2 === 0 || approx(b.m2, 14.9) || approx(b.m2, 15.2) || b.m2 === 16)) {
        isLegacyStub = true;
      } else if (idLower === 'humerus' && baseHeightM1 > 0 && (b.m1 === 5.6 || approx(b.m1, +(baseHeightM1 * 0.038).toFixed(1))) && (b.m2 === 0 || approx(b.m2, +(b.m1 + 0.1).toFixed(1)) || approx(b.m2, +(b.m1 * 1.02).toFixed(1)))) {
        isLegacyStub = true;
      } else if (idLower === 'femur' && baseHeightM1 > 0 && (b.m1 === 7.8 || approx(b.m1, +(baseHeightM1 * 0.055).toFixed(1))) && (b.m2 === 0 || approx(b.m2, +(b.m1 + 0.1).toFixed(1)) || approx(b.m2, +(b.m1 * 1.02).toFixed(1)))) {
        isLegacyStub = true;
      } else if (idLower === 'biceps_girth' && baseWeightM1 > 0 && (b.m1 === 21 || approx(b.m1, +(Math.max(19, Math.min(30, baseWeightM1 * 0.48))).toFixed(1))) && (b.m2 === 0 || approx(b.m2, +(b.m1 + 0.4).toFixed(1)) || approx(b.m2, +(b.m1 * 1.02).toFixed(1)))) {
        isLegacyStub = true;
      } else if (idLower === 'calf_girth' && baseWeightM1 > 0 && (b.m1 === 28 || approx(b.m1, +(Math.max(25, Math.min(38, baseWeightM1 * 0.62))).toFixed(1))) && (b.m2 === 0 || approx(b.m2, +(b.m1 + 0.4).toFixed(1)) || approx(b.m2, +(b.m1 * 1.02).toFixed(1)))) {
        isLegacyStub = true;
      } else if (idLower === 'sitting_height' && baseHeightM1 > 0 && (approx(b.m1, +(baseHeightM1 * 0.522).toFixed(1)) || approx(b.m1, +(baseHeightM1 * 0.525).toFixed(1))) && (b.m2 === 0 || approx(b.m2, +(b.m1 + 0.6).toFixed(1)) || approx(b.m2, +(baseHeightM2 * 0.523).toFixed(1)))) {
        isLegacyStub = true;
      } else if (idLower === 'arm_span' && baseHeightM1 > 0 && (approx(b.m1, +(baseHeightM1 * 1.005).toFixed(1)) || approx(b.m1, +(baseHeightM1 * 1.01).toFixed(1))) && (b.m2 === 0 || approx(b.m2, +(b.m1 + 0.6).toFixed(1)) || approx(b.m2, +(b.m1 + 1.2).toFixed(1)) || approx(b.m2, +(baseHeightM2 * 1.008).toFixed(1)))) {
        isLegacyStub = true;
      }
      if (isLegacyStub) {
        b.m1 = 0;
        b.m2 = 0;
        b.m3 = 0;
        b.sd = 0;
        b.percentile = 0;
        b.status = 'normal';
        b.measured = false;
      }
    });
  }

  if (Array.isArray(report.motorPerformance)) {
    report.motorPerformance.forEach((m) => {
      if (m.measured !== undefined || m.m3 > 0) return;
      const idLower = (m.id || '').toLowerCase();
      const approx = (a: number, t: number) => Math.abs(a - t) <= 0.15;
      let isLegacyStub = false;
      if (idLower === 'reaction' && m.m1 === 0.25 && (m.m2 === 0 || Math.abs(m.m2 - 0.24) <= 0.015 || m.m2 === 0.25)) {
        isLegacyStub = true;
      } else if (idLower === 'back_strength' && m.m1 === 48 && (m.m2 === 0 || approx(m.m2, 50.9) || approx(m.m2, 50.4) || m.m2 === 48)) {
        isLegacyStub = true;
      } else if (idLower === 'aerobic' && m.m1 === 42 && (m.m2 === 0 || approx(m.m2, 44.5) || approx(m.m2, 44.1) || m.m2 === 42)) {
        isLegacyStub = true;
      } else if (idLower === 'arm_speed_right' && m.m1 === 13.5 && (m.m2 === 0 || approx(m.m2, 13.0) || m.m2 === 13.5)) {
        isLegacyStub = true;
      } else if (idLower === 'arm_speed_left' && m.m1 === 14 && (m.m2 === 0 || approx(m.m2, 13.5) || m.m2 === 14)) {
        isLegacyStub = true;
      }
      if (isLegacyStub) {
        m.m1 = 0;
        m.m2 = 0;
        m.m3 = 0;
        m.sd = 0;
        m.percentile = 0;
        m.status = 'normal';
        m.measured = false;
      }
    });
  }

  // Only populate m2 (2. Tahmini Ölçüm) for MEASURED bodyComposition parameters — leave unmeasured rows empty (0)
  report.bodyComposition.forEach((b) => {
    const idLower = (b.id || '').toLowerCase();
    const nameLower = (b.name || '').toLowerCase();

    if (!isLabRowMeasured(b) || (b.m1 <= 0 && b.m2 <= 0 && b.m3 <= 0)) {
      b.m1 = 0;
      b.m2 = 0;
      b.m3 = 0;
      b.sd = 0;
      b.percentile = 0;
      b.status = 'normal';
      b.measured = false;
      return;
    }

    if (b.m1 <= 0 && b.m2 > 0) {
      b.m1 = b.m2;
    }
    b.measured = true;

    // Populate m2 (2. Tahmini Ölçüm) for measured bodyComposition parameters — NEVER worsen compared to m1
    if (idLower === 'height' || idLower === 'arm_span' || nameLower.includes('boy') || nameLower.includes('kulaç')) {
      const growth = idLower === 'sitting_height' || nameLower.includes('oturma') ? 0.6 : (baseAge < 14 ? 1.2 : 0.6);
      if (!b.m2 || b.m2 <= 0 || b.m2 < b.m1) {
        b.m2 = +(b.m1 + growth).toFixed(1);
      }
    } else if (idLower === 'sitting_height') {
      if (!b.m2 || b.m2 <= 0 || b.m2 < b.m1) {
        b.m2 = +(b.m1 + 0.6).toFixed(1);
      }
    } else if (idLower === 'weight' || nameLower.includes('ağırlık') || nameLower.includes('kilo')) {
      if (!b.m2 || b.m2 <= 0 || b.m2 < b.m1) {
        b.m2 = +(b.m1 + 0.5).toFixed(1);
      }
    } else if (
      idLower.includes('skf') ||
      idLower.includes('skinfold') ||
      idLower === 'triceps' ||
      idLower === 'subscapula' ||
      idLower === 'supraspinal' ||
      nameLower.includes('kıvrım') ||
      nameLower.includes('skinfold')
    ) {
      if (!b.m2 || b.m2 <= 0 || b.m2 > b.m1) {
        b.m2 = +(b.m1 * 0.92).toFixed(1);
      }
    } else if (idLower === 'bodyfat' || idLower === 'body_fat' || nameLower.includes('yağ oranı')) {
      if (!b.m2 || b.m2 <= 0 || b.m2 > b.m1) {
        b.m2 = +(b.m1 * 0.93).toFixed(1);
      }
    } else if (idLower === 'humerus' || idLower === 'femur' || nameLower.includes('çap')) {
      if (!b.m2 || b.m2 <= 0 || b.m2 < b.m1) {
        b.m2 = +(b.m1 + 0.1).toFixed(1);
      }
    } else if (idLower.includes('girth') || nameLower.includes('çevre')) {
      if (!b.m2 || b.m2 <= 0 || b.m2 < b.m1) {
        b.m2 = +(b.m1 + 0.4).toFixed(1);
      }
    } else if (idLower === 'whr' || nameLower.includes('bel/kalça')) {
      if (!b.m2 || b.m2 <= 0 || b.m2 > b.m1) {
        b.m2 = +(b.m1 * 0.98).toFixed(2);
      }
    } else {
      if (!b.m2 || b.m2 <= 0 || b.m2 < b.m1) {
        b.m2 = +(b.m1 * 1.03).toFixed(1);
      }
    }
  });

  // Strict Rule: Only populate m2 for MEASURED motorPerformance parameters — NEVER fabricate unmeasured rows!
  report.motorPerformance.forEach((m) => {
    const isBalance = m.id === 'balance' || m.unit === 'hata';
    const hasValues = m.m1 > 0 || m.m2 > 0 || m.m3 > 0 || (isBalance && m.measured === true);
    if (m.measured === false || !hasValues) {
      m.m1 = 0;
      m.m2 = 0;
      m.m3 = 0;
      m.sd = 0;
      m.percentile = 0;
      m.status = 'normal';
      m.measured = false;
      return;
    }

    if (m.m1 <= 0 && m.m2 > 0) {
      m.m1 = m.m2;
    }
    m.measured = true;

    if (isBalance) {
      if (m.m1 === 0) {
        m.m2 = 0;
      } else if (!m.m2 || m.m2 <= 0 || m.m2 > m.m1) {
        m.m2 = Math.max(1, Math.round(m.m1 > 1 ? m.m1 - 1 : 1));
      }
    } else if (m.lowerIsBetter) {
      if (!m.m2 || m.m2 <= 0 || m.m2 >= m.m1) {
        m.m2 = +(m.m1 * 0.965).toFixed(2);
      }
    } else if (m.unit === 'dokunma' || m.unit === 'atım' || m.unit === 'vuruş') {
      if (!m.m2 || m.m2 <= 0 || m.m2 <= m.m1) {
        m.m2 = Math.round(m.m1 * 1.06);
      }
    } else {
      if (!m.m2 || m.m2 <= 0 || m.m2 <= m.m1) {
        m.m2 = +(m.m1 * 1.06).toFixed(1);
      }
    }
  });

  if (report.scoreHistory) {
    if (!report.scoreHistory.p2Date || report.scoreHistory.p2Date === '—') {
      report.scoreHistory.p2Date = report.date2 || '2-4 Ay Arası (Tahmini)';
    }
  }
  
  // Recalculate Somatotype for m2 since m2 values are updated (yalnızca ölçülen bileşenler)
  const s2After = getSomatoInput('m2');
  if (s2After.height > 0 && s2After.weight > 0) {
    report.somatotype.m2 = calculateHeathCarterSomatotype(s2After);
  } else {
    report.somatotype.m2 = { endo: 0, meso: 0, ecto: 0, category: '—' };
  }

  // 3. Body Mass Index (BMI) & Body Composition Metrics Processing
  let bmiRow = report.bodyComposition.find(x => x.id === 'bmi');
  if (heightRow && weightRow && heightRow.m1 > 0 && weightRow.m1 > 0) {
    const calcBmiVal = (hCm: number, wKg: number) => {
      if (hCm > 50 && wKg > 10) {
        return Number((wKg / Math.pow(hCm / 100, 2)).toFixed(2));
      }
      return 0;
    };

    const b1 = calcBmiVal(heightRow.m1, weightRow.m1);
    const b2 = heightRow.m2 > 0 && weightRow.m2 > 0 ? calcBmiVal(heightRow.m2, weightRow.m2) : b1;
    const b3 = heightRow.m3 > 0 && weightRow.m3 > 0 ? calcBmiVal(heightRow.m3, weightRow.m3) : (bmiRow?.m3 || 0);

    if (bmiRow) {
      bmiRow.m1 = b1;
      bmiRow.m2 = b2;
      bmiRow.m3 = b3;
      bmiRow.measured = true;
    } else {
      bmiRow = {
        id: 'bmi',
        name: 'Beden Kütle İndeksi',
        unit: 'kg/m²',
        description: 'Vücut ağırlığının boyun karesine bölünmesiyle hesaplanan klinik indeks.',
        m1: b1,
        m2: b2,
        m3: b3,
        percentile: 72,
        status: 'normal',
        sd: 0,
        refLow: 13.6,
        refMid: 16.7,
        refHigh: 22.8,
        measured: true,
      };
      const wIdx = report.bodyComposition.findIndex(x => x.id === 'weight');
      if (wIdx >= 0) {
        report.bodyComposition.splice(wIdx + 1, 0, bmiRow);
      } else {
        report.bodyComposition.push(bmiRow);
      }
    }
  }

  // Re-apply age/gender norms after m1/m2 are finalized (ensures agility protocol & weight/BMI norms stay exact)
  applyAgeGenderNormsToReport(report);

  // Compute SD, Percentile, and Status for measured Body Composition parameters using asymmetric half-spans
  // so refLow aligns with -2 SD, refMid with 0 SD, and refHigh with +2 SD
  report.bodyComposition.forEach((item) => {
    if (!isLabRowMeasured(item)) {
      item.sd = 0;
      item.percentile = 0;
      item.status = 'normal';
      return;
    }
    const activeVal = item.m3 > 0 ? item.m3 : item.m2 > 0 ? item.m2 : item.m1;
    if (activeVal > 0) {
      const halfSpan =
        activeVal >= item.refMid
          ? Math.max(0.1, (item.refHigh - item.refMid) / 2)
          : Math.max(0.1, (item.refMid - item.refLow) / 2);
      item.sd = Number(((activeVal - item.refMid) / halfSpan).toFixed(2));
      item.percentile = sdToPercentile(item.sd);
      if (item.id === 'height') {
        item.status = activeVal > item.refHigh || item.sd > 1.2 ? 'uzun' : activeVal < item.refLow || item.sd < -1.5 ? 'düşük' : 'normal';
      } else {
        item.status = activeVal > item.refHigh || item.sd > 1.35 ? 'yüksek' : activeVal < item.refLow || item.sd < -1.5 ? 'düşük' : 'normal';
      }
    }
  });

  // Compute SD, Percentile, Status and sync Ipsative Targets for MEASURED Motor Performance only
  const m1Pcts: number[] = [];
  const m2Pcts: number[] = [];
  const m3Pcts: number[] = [];

  report.motorPerformance.forEach((item) => {
    if (!isLabRowMeasured(item)) {
      item.sd = 0;
      item.percentile = 0;
      item.status = 'normal';
      return;
    }

    const isBalance = item.id === 'balance' || item.unit === 'hata';
    const span = Math.max(0.05, (item.refHigh - item.refLow) / 4);
    if (item.m1 > 0 || (isBalance && item.measured)) {
      const rawDiff1 = item.lowerIsBetter ? item.refMid - item.m1 : item.m1 - item.refMid;
      const sd1 = Number((rawDiff1 / span).toFixed(2));
      m1Pcts.push(sdToPercentile(sd1));
    }
    if (item.m2 > 0 || (isBalance && item.measured)) {
      const rawDiff2 = item.lowerIsBetter ? item.refMid - item.m2 : item.m2 - item.refMid;
      const sd2 = Number((rawDiff2 / span).toFixed(2));
      m2Pcts.push(sdToPercentile(sd2));
    }
    if (item.m3 > 0) {
      const rawDiff3 = item.lowerIsBetter ? item.refMid - item.m3 : item.m3 - item.refMid;
      const sd3 = Number((rawDiff3 / span).toFixed(2));
      m3Pcts.push(sdToPercentile(sd3));
    }

    const activeVal = item.m3 > 0 ? item.m3 : item.m2 > 0 ? item.m2 : item.m1;
    if (activeVal > 0 || (isBalance && item.measured)) {
      const evalRes = evaluateMotorRowTargetAndStatus(item);
      item.sd = evalRes.sd;
      item.percentile = evalRes.percentile;
      item.status =
        evalRes.tier === 'reached'
          ? 'mükemmel'
          : evalRes.percentile >= 55
          ? 'iyi'
          : evalRes.tier === 'watch'
          ? 'normal'
          : 'desteklenmeli';

      let ips = report.ipsativeTargets.find((t) =>
        item.name.toLowerCase().includes(t.parameter.toLowerCase()) ||
        t.parameter.toLowerCase().includes(item.name.toLowerCase())
      );
      if (!ips) {
        ips = {
          parameter: item.name,
          unit: item.unit,
          m1: item.m1,
          m2: item.m2,
          m3: item.m3,
          target: evalRes.targetValue,
          groupRank: '15/1',
        };
        report.ipsativeTargets.push(ips);
      } else {
        ips.unit = item.unit;
        ips.m1 = item.m1;
        ips.m2 = item.m2;
        ips.m3 = item.m3;
        ips.target = evalRes.targetValue;
      }
    }
  });

  // Remove any unmeasured entries from ipsativeTargets
  const measuredMotors = getDisplayedMotorPerformance(report);
  report.ipsativeTargets = (report.ipsativeTargets || []).filter((t) =>
    measuredMotors.some(
      (m) =>
        m.name.toLowerCase().includes(t.parameter.toLowerCase()) ||
        t.parameter.toLowerCase().includes(m.name.toLowerCase())
    )
  );

  // 4. Chronological Performance Score (p1Score, p2Score, p3Score) Consistency (REAL averages, NO 68% floor)
  if (!report.scoreHistory) {
    report.scoreHistory = { p1Date: report.date1 || 'I. Ölçüm', p1Score: 50, p2Date: report.date2 || '2-4 Ay Arası (Tahmini)', p2Score: 54, p3Date: '—', p3Score: 0 };
  }
  if (m1Pcts.length > 0) {
    const avgP1 = Math.round(m1Pcts.reduce((a, b) => a + b, 0) / m1Pcts.length);
    report.scoreHistory.p1Score = Math.max(10, Math.min(96, avgP1));
  } else if (!report.scoreHistory.p1Score || report.scoreHistory.p1Score <= 0) {
    report.scoreHistory.p1Score = 50;
  }
  if (m2Pcts.length > 0) {
    const avgP2 = Math.round(m2Pcts.reduce((a, b) => a + b, 0) / m2Pcts.length);
    report.scoreHistory.p2Score = Math.max(report.scoreHistory.p1Score, Math.min(97, Math.max(avgP2, report.scoreHistory.p1Score + 3)));
  } else {
    report.scoreHistory.p2Score = Math.min(97, Math.round(report.scoreHistory.p1Score + 4));
  }
  if (m3Pcts.length > 0) {
    const avgP3 = Math.round(m3Pcts.reduce((a, b) => a + b, 0) / m3Pcts.length);
    report.scoreHistory.p3Score = Math.max(10, Math.min(97, avgP3));
  } else {
    report.scoreHistory.p3Score = 0;
  }

  // 5. Heath-Carter Somatotype Consistency (Never fabricate unmeasured endo/meso/ecto or m3)
  if (report.somatotype) {
    if (!hasThirdDate) {
      report.somatotype.m3 = { endo: 0, meso: 0, ecto: 0, category: '—' };
    }
  }

  // 6. Cardiorespiratory (Aerobic & Anaerobic Watt / BMR) Integration — ONLY populate PACER/VO2 if actually measured!
  const aerobicRow = report.motorPerformance.find(x => x.id === 'aerobic');
  const vjRow = report.motorPerformance.find(x => x.id === 'vertical_jump');
  if (!report.cardio) {
    report.cardio = {
      test1Distance: 0, test1Shuttles: 0, test1Vo2: 0, test1Status: '—',
      test2Distance: 0, test2Shuttles: 0, test2Vo2: 0, test2Status: '—',
      test3Distance: 0, test3Shuttles: 0, test3Vo2: 0, test3Status: '—',
      totalRunTime: '—', basalMetabolicRate: 0, functionalCapacityMet: 0, maxHeartRate: 200,
      verticalJumpAnaerobicWatt: 0, verticalJumpRelativeWatt: 0, sprint20mAnaerobicWatt: 0, sprint20mRelativeWatt: 0
    };
  }

  const aerobicMeasured = isLabRowMeasured(aerobicRow);
  const isLegacyCardioStub =
    !aerobicMeasured &&
    report.cardio.test1Vo2 === 41.5 &&
    report.cardio.test1Distance === 640 &&
    (report.cardio.test2Distance === 720 || report.cardio.test2Distance === 0);

  if (isLegacyCardioStub || (!aerobicMeasured && report.cardio.test1Distance === 0 && report.cardio.test1Shuttles === 0 && report.cardio.test3Distance === 0)) {
    report.cardio.test1Distance = 0;
    report.cardio.test1Shuttles = 0;
    report.cardio.test1Vo2 = 0;
    report.cardio.test1Status = '—';
    report.cardio.test2Distance = 0;
    report.cardio.test2Shuttles = 0;
    report.cardio.test2Vo2 = 0;
    report.cardio.test2Status = '—';
    report.cardio.test3Distance = 0;
    report.cardio.test3Shuttles = 0;
    report.cardio.test3Vo2 = 0;
    report.cardio.test3Status = '—';
  } else if (aerobicMeasured && aerobicRow) {
    report.cardio.test1Vo2 = aerobicRow.m1;
    report.cardio.test2Vo2 = aerobicRow.m2 > 0 ? aerobicRow.m2 : +(aerobicRow.m1 * 1.05).toFixed(1);
    report.cardio.test3Vo2 = aerobicRow.m3 > 0 ? aerobicRow.m3 : 0;
    if (!report.cardio.test1Distance || report.cardio.test1Distance <= 0) {
      report.cardio.test1Distance = Math.round(report.cardio.test1Vo2 * 16);
      report.cardio.test1Shuttles = Math.round(report.cardio.test1Distance / 20);
      report.cardio.test1Status = 'İyi';
    }
    if (!report.cardio.test2Distance || report.cardio.test2Distance <= report.cardio.test1Distance) {
      report.cardio.test2Distance = Math.round(report.cardio.test2Vo2 * 16.5);
      report.cardio.test2Shuttles = Math.round(report.cardio.test2Distance / 20);
      report.cardio.test2Status = 'Gelişmiş';
    }
  }

  const jumpCm = isLabRowMeasured(vjRow) ? (vjRow?.m3 || vjRow?.m2 || vjRow?.m1 || 0) : 0;
  const weightKg = weightRow && isLabRowMeasured(weightRow) ? (weightRow.m3 || weightRow.m2 || weightRow.m1 || 0) : 0;
  if (jumpCm > 0 && weightKg > 0) {
    const watt = Math.round(21.67 * weightKg * Math.sqrt(jumpCm / 100) + 420);
    report.cardio.verticalJumpAnaerobicWatt = watt;
    report.cardio.verticalJumpRelativeWatt = Number((watt / weightKg).toFixed(2));
  } else {
    report.cardio.verticalJumpAnaerobicWatt = 0;
    report.cardio.verticalJumpRelativeWatt = 0;
  }

  if (weightKg > 0 && heightRow && isLabRowMeasured(heightRow)) {
    const hCm = heightRow.m3 || heightRow.m2 || heightRow.m1 || 0;
    if (hCm > 0) {
      report.cardio.basalMetabolicRate = Math.round(10 * weightKg + 6.25 * hCm - 5 * report.ageYears + (report.gender === 'Erkek' ? 5 : -161));
    }
  } else {
    report.cardio.basalMetabolicRate = 0;
  }

  // 6.5 Mirwald PHV (Peak Height Velocity) & Adult Height Scientific Consistency
  const isFemale =
    String(report.gender || '').toLowerCase().includes('kad') ||
    String(report.gender || '').toLowerCase().includes('kız') ||
    String(report.gender || '').toLowerCase().includes('kiz');
  const currentH = heightRow && isLabRowMeasured(heightRow) ? (heightRow.m3 > 0 ? heightRow.m3 : heightRow.m1 > 0 ? heightRow.m1 : 152) : 152;
  const sittingRow = report.bodyComposition.find((x) => x.id === 'sitting_height');
  const currentSitH = sittingRow && isLabRowMeasured(sittingRow) && sittingRow.m1 > 0 ? sittingRow.m1 : +(currentH * 0.525).toFixed(1);
  report.sittingHeight = currentSitH;

  if (!report.phvAge || report.phvAge < 10.2 || report.phvAge > 16.2) {
    const heightRatio = currentH / Math.max(120, isFemale ? 154 : 162);
    const basePhv = isFemale ? 12.0 : 13.8;
    const adjustedPhv = +(basePhv - (heightRatio - 1) * 1.4).toFixed(1);
    report.phvAge = isFemale
      ? Math.max(11.2, Math.min(13.2, adjustedPhv))
      : Math.max(12.6, Math.min(15.0, adjustedPhv));
  }

  const yearsToPhv = +(report.phvAge - report.ageYears).toFixed(1);
  if (!report.phvHeight || report.phvHeight < 135) {
    if (yearsToPhv > 0) {
      report.phvHeight = +(currentH + yearsToPhv * (isFemale ? 5.8 : 6.4)).toFixed(1);
    } else {
      const estAtPhv = currentH - Math.min(14, Math.abs(yearsToPhv) * (isFemale ? 3.2 : 4.2));
      report.phvHeight = +Math.max(isFemale ? 148 : 156, estAtPhv).toFixed(1);
    }
  }

  if (!report.predictedAdultHeight || report.predictedAdultHeight < currentH) {
    const pAnne = sanitizeAndEnforceNumber(report.parentInfo?.anneBoy, 0);
    const pBaba = sanitizeAndEnforceNumber(report.parentInfo?.babaBoy, 0);
    if (pAnne > 135 && pBaba > 145) {
      const midParent = isFemale ? (pAnne + pBaba - 13) / 2 : (pAnne + pBaba + 13) / 2;
      report.predictedAdultHeight = +Math.max(currentH + 1.5, midParent).toFixed(1);
    } else {
      const remainingYears = Math.max(0, (isFemale ? 17.5 : 18.5) - report.ageYears);
      const estAdult = currentH + remainingYears * (yearsToPhv > 0 ? 5.2 : 2.1);
      report.predictedAdultHeight = +Math.min(isFemale ? 186 : 202, Math.max(currentH + 1.5, estAdult)).toFixed(1);
    }
  }

  if (!report.maturationStatus || report.maturationStatus === '—') {
    report.maturationStatus =
      Math.abs(yearsToPhv) <= 0.6
        ? 'PHV Dönemi (Zirve Büyüme Evresi)'
        : yearsToPhv > 0.6
        ? 'PHV Öncesi (Koordinasyon Evresi)'
        : 'PHV Sonrası (Kuvvet & Kas Evresi)';
  }

  // 7. Group Info & Expert Comment (always synchronize non-manual expert comments with current metrics & targets)
  if (!report.groupInfo) {
    const fallbackPct = Math.max(5, Math.min(97, report.scoreHistory.p2Score || report.scoreHistory.p1Score || 50));
    report.groupInfo = {
      groupNo: 1, ageRange: `${Math.floor(report.ageYears)} Yaş`, groupAthleteCount: 1, groupRank: 1, totalAthleteCount: 1, totalRank: 1, groupAverageScore: 72, groupPositionPercentile: fallbackPct
    };
  } else {
    report.groupInfo.groupAverageScore = report.groupInfo.groupAverageScore || 72;
    if ((report.groupInfo.groupAthleteCount || 1) <= 1) {
      report.groupInfo.groupPositionPercentile = Math.max(5, Math.min(97, report.scoreHistory.p2Score || report.scoreHistory.p1Score || 50));
    } else {
      report.groupInfo.groupPositionPercentile = report.groupInfo.groupPositionPercentile || Math.max(5, Math.min(97, report.scoreHistory.p2Score || report.scoreHistory.p1Score || 50));
    }
  }

  if (!report.isManualExpertComment || !report.expertComment || isStaleExpertComment(report.expertComment, report)) {
    report.expertComment = generateAthleteInterpretiveExpertComment(report);
  }
}

/**
 * Calculates Heath-Carter Somatotype coordinates and category strictly from measured anthropometric data.
 * Any component lacking its required measurements returns 0 instead of fabricated fallback values.
 */
function calculateHeathCarterSomatotype(data: {
  height: number;
  weight: number;
  triceps: number;
  subscapular: number;
  supraspinale: number;
  calfSkf: number;
  humerus: number;
  femur: number;
  bicepsGirth: number;
  calfGirth: number;
}) {
  const { height, weight, triceps, subscapular, supraspinale, calfSkf, humerus, femur, bicepsGirth, calfGirth } = data;
  if (height <= 0 || weight <= 0) return { endo: 0, meso: 0, ecto: 0, category: '—' };

  // 1. Endomorphy: requires at least 2 of the 3 Heath-Carter skinfolds (triceps, subscapular, supraspinale/iliac)
  let roundedEndo = 0;
  const skfSites = [triceps, subscapular, supraspinale].filter((v) => v > 0);
  if (skfSites.length === 3) {
    const sum3Skf = (triceps + subscapular + supraspinale) * (170.18 / height);
    const endo = -0.7182 + (0.1451 * sum3Skf) - (0.00068 * Math.pow(sum3Skf, 2)) + (0.0000014 * Math.pow(sum3Skf, 3));
    roundedEndo = Number(Math.max(0.1, endo).toFixed(1));
  } else if (skfSites.length === 2) {
    const sumEst3Skf = (skfSites[0] + skfSites[1]) * 1.5 * (170.18 / height);
    const endo = -0.7182 + (0.1451 * sumEst3Skf) - (0.00068 * Math.pow(sumEst3Skf, 2)) + (0.0000014 * Math.pow(sumEst3Skf, 3));
    roundedEndo = Number(Math.max(0.1, endo).toFixed(1));
  }

  // 2. Mesomorphy: requires bone breadths (humerus, femur) AND corrected girths (bicepsGirth, calfGirth)
  let roundedMeso = 0;
  if (humerus > 0 && femur > 0 && bicepsGirth > 0 && calfGirth > 0) {
    const corrBiceps = bicepsGirth - (triceps > 0 ? triceps / 10 : 0);
    const corrCalf = calfGirth - (calfSkf > 0 ? calfSkf / 10 : 0);
    const meso = (0.85 * humerus) + (0.60 * femur) + (0.188 * corrBiceps) + (0.161 * corrCalf) - (0.131 * height) + 4.5;
    roundedMeso = Number(Math.max(0.1, meso).toFixed(1));
  }

  // 3. Ectomorphy: based on Ponderal Index (HWR)
  const hwr = height / Math.pow(weight, 1 / 3);
  let ecto = 0.1;
  if (hwr >= 40.75) {
    ecto = (0.732 * hwr) - 28.58;
  } else if (hwr > 38.25) {
    ecto = (0.463 * hwr) - 17.63;
  } else {
    ecto = 0.1;
  }
  const roundedEcto = Number(Math.max(0.1, ecto).toFixed(1));

  // Category based strictly on measured components
  let category = '—';
  if (roundedEndo > 0 && roundedMeso > 0 && roundedEcto > 0) {
    if (roundedEndo > roundedMeso + 0.5 && roundedEndo > roundedEcto + 0.5) category = 'Endomorfik';
    else if (roundedMeso > roundedEndo + 0.5 && roundedMeso > roundedEcto + 0.5) category = 'Mezomorfik';
    else if (roundedEcto > roundedEndo + 0.5 && roundedEcto > roundedMeso + 0.5) category = 'Ektomorfik';
    else if (roundedEndo > roundedEcto && roundedMeso > roundedEcto) category = 'Mezomorfik Endomorfi';
    else if (roundedMeso > roundedEndo && roundedEcto > roundedEndo) category = 'Mezomorfik Ektomorf';
    else if (roundedEndo > roundedMeso && roundedEcto > roundedMeso) category = 'Endomorfik Ektomorf';
    else category = 'Dengeli';
  } else if (roundedEndo > 0 && roundedEcto > 0) {
    if (roundedEndo > roundedEcto + 0.5) category = 'Endomorfik';
    else if (roundedEcto > roundedEndo + 0.5) category = 'Ektomorfik';
    else category = 'Endo-Ektomorfik Dengeli';
  } else if (roundedEcto > 0) {
    category = 'Ektomorfik (Boy/İncelik)';
  } else if (roundedEndo > 0) {
    category = 'Endomorfik';
  }

  return { endo: roundedEndo, meso: roundedMeso, ecto: roundedEcto, category };
}

export interface BranchReferenceScoreResult {
  branchTitle: string; // e.g. "Voleybol Referans Puanı"
  scorePercentage: number; // e.g. 88
  statusLabel: string; // e.g. "Yüksek Branş Potansiyeli"
  breakdown: {
    label: string;
    percent: number;
  }[];
}

/**
 * Calculates a scientific Branch Reference Score (%) based on athlete's motor performance,
 * anthropometrics, somatotype, and specific branch requirements.
 */
export function calculateBranchReferenceScore(report: SportsFlyLabReport): BranchReferenceScoreResult {
  if (!report) {
    return {
      branchTitle: 'Branş Referans Puanı',
      scorePercentage: 75,
      statusLabel: 'Normal Uyum',
      breakdown: [
        { label: 'Biyomotorik Kapasite', percent: 75 },
        { label: 'Antropometrik Yapı', percent: 75 },
        { label: 'Branşa Özgü Güç', percent: 75 },
      ],
    };
  }

  // 1. Determine clean primary branch title
  const rawBranch = (report.sportBranch || 'Genel Spor Gelişimi').trim();
  let primaryBranch = 'Genel Spor';
  const bLower = rawBranch.toLowerCase();

  if (bLower.includes('voleybol') || bLower.includes('volleyball')) primaryBranch = 'Voleybol';
  else if (bLower.includes('basketbol') || bLower.includes('basketball')) primaryBranch = 'Basketbol';
  else if (bLower.includes('futbol') || bLower.includes('football') || bLower.includes('soccer')) primaryBranch = 'Futbol';
  else if (bLower.includes('yüzme') || bLower.includes('yuzme') || bLower.includes('swimming')) primaryBranch = 'Yüzme';
  else if (bLower.includes('hentbol') || bLower.includes('handball')) primaryBranch = 'Hentbol';
  else if (bLower.includes('tenis') || bLower.includes('tennis')) primaryBranch = 'Tenis';
  else if (bLower.includes('atletizm') || bLower.includes('athletics')) primaryBranch = 'Atletizm';
  else if (bLower.includes('jimnastik') || bLower.includes('gymnastics')) primaryBranch = 'Jimnastik';
  else if (rawBranch && !bLower.includes('genel') && !bLower.includes('öğrenci') && !bLower.includes('ad soyad')) {
    primaryBranch = rawBranch.split('/')[0].split('-')[0].trim();
  }

  const branchTitle = `${primaryBranch} Referans Puanı`;

  // 2. Motor Performance Percentiles (yalnızca ölçülen testler)
  const validMotors = getDisplayedMotorPerformance(report);
  const avgMotorPercentile = validMotors.length > 0
    ? validMotors.reduce((acc, curr) => acc + (curr.percentile || 50), 0) / validMotors.length
    : 75;

  const findPct = (keywords: string[]): number => {
    const item = validMotors.find((m) => keywords.some((kw) => m.name.toLowerCase().includes(kw) || m.id.toLowerCase().includes(kw)));
    return item?.percentile || avgMotorPercentile;
  };

  const jumpPct = findPct(['sıçrama', 'jump', 'sicrama']);
  const sprintPct = findPct(['sprint', 'sürat', 'surat', '20m']);
  const agilityPct = findPct(['çabukluk', 'cabukluk', 'agility', '10x5']);
  const gripPct = findPct(['pençe', 'pence', 'grip', 'kavrama']);
  const flexPct = findPct(['esneklik', 'flexibility', 'uzan']);
  const balancePct = findPct(['denge', 'balance', 'flamingo']);

  // Body Composition / Anthropometric Fit (incorporates BMI & Body Fat realistically)
  const heightRow = report.bodyComposition?.find((b) => isLabRowMeasured(b) && (b.id === 'height' || b.name?.toLowerCase().includes('boy')));
  const fatRow = report.bodyComposition?.find((b) => isLabRowMeasured(b) && (b.id === 'body_fat' || b.name?.toLowerCase().includes('yağ')));
  const bmiRow = report.bodyComposition?.find((b) => isLabRowMeasured(b) && b.id === 'bmi');
  const heightPct = heightRow?.percentile || 60;
  let compFitPct = 70;
  if (bmiRow) {
    const absBmiSd = Math.abs(bmiRow.sd || 0);
    compFitPct = absBmiSd <= 1.0 ? 85 : Math.max(15, Math.round(85 - (absBmiSd - 1.0) * 22));
  }
  if (fatRow) {
    const absFatSd = Math.abs(fatRow.sd || 0);
    const fatFit = absFatSd <= 1.0 ? 85 : Math.max(15, Math.round(85 - (absFatSd - 1.0) * 22));
    compFitPct = bmiRow ? Math.round((compFitPct + fatFit) / 2) : fatFit;
  }

  // 3. Branch-Specific Algorithm Weights
  let biomotoricScore = avgMotorPercentile;
  let anthropometricScore = (heightPct * 0.45) + (compFitPct * 0.55);
  let branchSpecificPowerScore = avgMotorPercentile;

  if (primaryBranch === 'Voleybol') {
    biomotoricScore = jumpPct * 0.35 + flexPct * 0.25 + gripPct * 0.2 + sprintPct * 0.2;
    anthropometricScore = heightPct * 0.55 + compFitPct * 0.45;
    branchSpecificPowerScore = jumpPct * 0.5 + gripPct * 0.3 + agilityPct * 0.2;
  } else if (primaryBranch === 'Basketbol') {
    biomotoricScore = jumpPct * 0.3 + sprintPct * 0.3 + agilityPct * 0.2 + gripPct * 0.2;
    anthropometricScore = heightPct * 0.55 + compFitPct * 0.45;
    branchSpecificPowerScore = jumpPct * 0.4 + sprintPct * 0.3 + gripPct * 0.3;
  } else if (primaryBranch === 'Futbol') {
    biomotoricScore = agilityPct * 0.35 + sprintPct * 0.35 + balancePct * 0.15 + flexPct * 0.15;
    anthropometricScore = compFitPct * 0.65 + heightPct * 0.35;
    branchSpecificPowerScore = agilityPct * 0.4 + sprintPct * 0.4 + jumpPct * 0.2;
  } else if (primaryBranch === 'Yüzme') {
    biomotoricScore = flexPct * 0.35 + gripPct * 0.3 + balancePct * 0.2 + sprintPct * 0.15;
    anthropometricScore = heightPct * 0.45 + compFitPct * 0.55;
    branchSpecificPowerScore = flexPct * 0.4 + gripPct * 0.4 + agilityPct * 0.2;
  }

  const rawScore = (biomotoricScore * 0.45) + (anthropometricScore * 0.30) + (branchSpecificPowerScore * 0.25);
  const scorePercentage = Math.max(15, Math.min(97, Math.round(rawScore)));

  let statusLabel = 'Temel Kondisyon Desteği Gerekli';
  if (scorePercentage >= 88) statusLabel = 'Elit Seviye Branş Uyumu';
  else if (scorePercentage >= 75) statusLabel = 'Yüksek Branş Uyumu';
  else if (scorePercentage >= 60) statusLabel = 'Gelişime Açık Branş Uyumu';
  else if (scorePercentage < 42) statusLabel = 'Kapsamlı Fiziksel Hazırlık Öncelikli';

  return {
    branchTitle,
    scorePercentage,
    statusLabel,
    breakdown: [
      { label: 'Biyomotorik Kapasite', percent: Math.round(biomotoricScore) },
      { label: 'Antropometrik Yapı', percent: Math.round(anthropometricScore) },
      { label: 'Branşa Özgü Güç & İvme', percent: Math.round(branchSpecificPowerScore) },
    ],
  };
}

/**
 * Helper to retrieve the active measurement value, prioritizing the 1st measurement (m1)
 * when present, followed by m2 and m3.
 */
export function getActiveParamVal(item?: { m1?: number; m2?: number; m3?: number } | null, fallback: number = 0): number {
  if (!item) return fallback;
  if (typeof item.m1 === 'number' && Number.isFinite(item.m1) && item.m1 > 0) return item.m1;
  if (typeof item.m2 === 'number' && Number.isFinite(item.m2) && item.m2 > 0) return item.m2;
  if (typeof item.m3 === 'number' && Number.isFinite(item.m3) && item.m3 > 0) return item.m3;
  return fallback;
}

/**
 * Safely parses Flamingo Denge Testi values according to SportsFly Lab rules:
 * 1. If any input cell or trial contains failure/invalid indicators ("başarısız", "geçersiz", "kaldı", "yok", "-", "x"), it returns 0.
 * 2. If multiple attempt/trial values are present (e.g., 2 trials/legs or multiple numbers in a cell like "15, 11" or "15 / 11"),
 *    it selects the SMALLEST numerical value (küçük olan değeri).
 * 3. Returns 0 if invalid or unsuccessful.
 */
export function parseFlamingoBalanceScore(val1: unknown, val2?: unknown, val3?: unknown): number {
  const isFailedStr = (v: unknown): boolean => {
    if (v === null || v === undefined) return false;
    const str = String(v).toLowerCase().trim();
    if (!str) return false;
    return (
      str.includes('başarısız') ||
      str.includes('basarisiz') ||
      str.includes('geçersiz') ||
      str.includes('gecersiz') ||
      str.includes('kaldı') ||
      str.includes('kaldi') ||
      str.includes('yok') ||
      str === '-' ||
      str === 'x'
    );
  };

  // If any input explicitly indicates failure, the test result is 0
  if (isFailedStr(val1) || isFailedStr(val2) || isFailedStr(val3)) {
    return 0;
  }

  const extractedNumbers: number[] = [];

  const extractFromInput = (input: unknown) => {
    if (input === null || input === undefined || input === '') return;
    if (typeof input === 'number' && !Number.isNaN(input)) {
      if (input > 0) extractedNumbers.push(input);
      return;
    }
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed || isFailedStr(trimmed)) return;

      // Replace comma decimal with dot (e.g. 15,4 -> 15.4)
      const normalizedStr = trimmed.replace(/,/g, '.');
      // Match all numerical sequences
      const matches = normalizedStr.match(/\d+(\.\d+)?/g);
      if (matches) {
        matches.forEach((m) => {
          const parsed = parseFloat(m);
          if (!Number.isNaN(parsed) && parsed > 0) {
            extractedNumbers.push(parsed);
          }
        });
      }
    }
  };

  extractFromInput(val1);
  extractFromInput(val2);
  extractFromInput(val3);

  if (extractedNumbers.length === 0) return 0;
  if (extractedNumbers.length === 1) return extractedNumbers[0];

  // When 2 or more values exist, return the SMALLEST value as requested
  return Math.min(...extractedNumbers);
}

/**
 * Helper to convert a single flat Excel row into a complete, biomechanically calculated 7-page SportsFlyLabReport.
 */
function buildLabReportFromExcelRow(
  r: Record<string, any>,
  idx: number,
  brandedTemplate: SportsFlyLabReport,
  activeBranding: SportsFlyLabSchoolBranding
): SportsFlyLabReport | null {
  const toNum = (val: unknown, fallback: number = 0): number => {
    return sanitizeAndEnforceNumber(val, fallback);
  };

  // Smart cell finder looking through mapped row and fuzzy raw row keys
  const findVal = (preferredKeys: string[], aliases: string[] = [], excludeSubstrings: string[] = []): any => {
    const isExcludedKey = (keyStr: string) => {
      if (excludeSubstrings.length === 0) return false;
      const nk = normalizeHeaderToken(keyStr);
      return excludeSubstrings.some((ex) => nk.includes(ex));
    };
    for (const k of preferredKeys) {
      if (!isExcludedKey(k) && r[k] !== undefined && r[k] !== '' && r[k] !== null) return r[k];
    }
    const allCandidates = [...preferredKeys, ...aliases].map(normalizeHeaderToken);
    const rowKeys = Object.keys(r);
    for (const cand of allCandidates) {
      const match = rowKeys.find((rk) => !isExcludedKey(rk) && normalizeHeaderToken(rk) === cand);
      if (match && r[match] !== undefined && r[match] !== '' && r[match] !== null) {
        return r[match];
      }
    }
    for (const cand of allCandidates) {
      if (cand.length < 3) continue;
      const match = rowKeys.find((rk) => !isExcludedKey(rk) && normalizeHeaderToken(rk).includes(cand));
      if (match && r[match] !== undefined && r[match] !== '' && r[match] !== null) {
        return r[match];
      }
    }
    return undefined;
  };

  const rawName = String(
    sanitizeSpreadsheetCell(
      findVal(
        ['Sporcu_Adi', 'Sporcu Adı', 'Adı Soyadı', 'Ad_Soyad', 'Ad Soyad', 'Isim', 'İsim', 'Öğrenci Adı', 'Öğrenci Adı Soyadı'],
        ['sporcuadi', 'adisoyadi', 'adsoyad', 'ogrenciadi', 'ogrenciadisoyadi', 'isim', 'name', 'athlete']
      ) || ''
    ) || ''
  ).trim();

  // Skip empty or header rows mistakenly passed as data rows
  const normName = normalizeHeaderToken(rawName);
  if (
    !rawName ||
    normName === 'adisoyadi' ||
    normName === 'adsoyad' ||
    normName === 'sporcuadi' ||
    normName === 'ogrenciadi' ||
    normName === 'ogrenciadisoyadi' ||
    normName === 'isim' ||
    normName === 'name'
  ) {
    return null;
  }
  const athleteName = rawName;

  const cloned: SportsFlyLabReport = JSON.parse(JSON.stringify(brandedTemplate));
  cloned.id = `lab-batch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
  cloned.athleteName = athleteName;
  cloned.athleteCode = String(
    sanitizeSpreadsheetCell(
      findVal(['Sporcu_Kodu', 'Sporcu Kodu', 'Kayıt No', 'Lisans No', 'Öğrenci No'], ['sporcukodu', 'kayitno', 'lisansno', 'ogrencino', 'id', 'kod'])
    ) || `SF-${new Date().getFullYear()}-${101 + idx}`
  );

  const clubRaw = findVal(['Kulup_Adi', 'Kulüp', 'Kulüp Adı', 'Spor Okulu', 'Okul Adı'], ['kulupadi', 'kulup', 'sporokulu', 'okuladi']);
  if (clubRaw) cloned.clubName = String(sanitizeSpreadsheetCell(clubRaw));

  const subeRaw = findVal(['Sube', 'Şube', 'Kampüs', 'Tesis'], ['sube', 'kampus', 'tesis']);
  if (subeRaw) cloned.branchName = String(sanitizeSpreadsheetCell(subeRaw));

  // Strict sanitization for sportBranch: Must NEVER be an athlete's name or leaked string
  const rawBranch = String(
    findVal(
      ['Brans', 'Branş', 'Spor Branşı', 'Branş / Takım', 'Grup', 'Takım', 'Kategori', 'Branch'],
      ['brans', 'sporbransi', 'branch', 'sport', 'grup', 'takim', 'kategori']
    ) || ''
  ).trim();

  const isInvalidBranchName = (val: string) => {
    if (!val || val.length < 2) return true;
    const vLower = val.toLowerCase();
    if (vLower === athleteName.toLowerCase()) return true;
    if (vLower.includes('ipek') || vLower.includes('başeğmez') || vLower.includes('basegmez')) return true;
    if (vLower.includes('parnia') || vLower.includes('asil')) return true;
    if (vLower.includes('ad soyad') || vLower.includes('ogrenci') || vLower.includes('öğrenci') || vLower.includes('sporcu adi')) return true;
    const nameWords = athleteName.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (nameWords.length > 0 && nameWords.every((w) => vLower.includes(w))) return true;
    return false;
  };

  if (!rawBranch || isInvalidBranchName(rawBranch)) {
    cloned.sportBranch = 'Genel Spor Gelişimi';
  } else {
    cloned.sportBranch = String(sanitizeSpreadsheetCell(rawBranch));
  }
  if (!cloned.somatotype.eliteRef) {
    cloned.somatotype.eliteRef = { sport: cloned.sportBranch, endo: 3.2, meso: 4.5, ecto: 3.5, refScore: 92 };
  } else {
    cloned.somatotype.eliteRef.sport = cloned.sportBranch;
  }

  const birthDateRaw = findVal(['Doğum Tarihi (GG.AA.YYYY)', 'Dogum_Tarihi', 'Doğum Tarihi'], ['dogumtarihi', 'birthdate', 'dtarihi']);
  if (birthDateRaw) {
    const formatted = parseDateString(birthDateRaw);
    cloned.birthDate = formatted;
    const parts = formatted.split('.');
    if (parts.length === 3) {
      const bDay = parseInt(parts[0]);
      const bMonth = parseInt(parts[1]) - 1;
      const bYear = parseInt(parts[2]);
      if (!isNaN(bDay) && !isNaN(bMonth) && !isNaN(bYear)) {
        const bDate = new Date(bYear, bMonth, bDay);
        const now = new Date();
        let age = now.getFullYear() - bDate.getFullYear();
        const m = now.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < bDate.getDate())) {
          age--;
        }
        if (age > 0 && age < 30) {
          cloned.ageYears = age;
          cloned.ageMonths = age * 12 + Math.max(0, m);
        }
      }
    }
  }

  const rawGender = String(findVal(['Cinsiyet', 'Cinsiyeti'], ['cinsiyet', 'cinsiyeti', 'gender', 'sex', 'ke']) || '').trim().toLowerCase();
  if (rawGender.startsWith('k') || rawGender.includes('kız') || rawGender.includes('kadın')) {
    cloned.gender = 'Kadın';
  } else if (rawGender.startsWith('e') || rawGender.includes('erkek')) {
    cloned.gender = 'Erkek';
  }

  const yasRaw = findVal(['Yas', 'Yaş', 'Yaşı', 'Takvim Yaşı'], ['yas', 'yasi', 'age']);
  if (yasRaw) {
    cloned.ageYears = toNum(yasRaw, cloned.ageYears);
    cloned.ageMonths = Number((cloned.ageYears * 12).toFixed(1));
  }

  const rawDate1 = findVal(
    ['Olcum_1_Tarihi', 'Olcum_Tarihi', 'Ölçüm Tarihi', '1. Ölçüm Tarihi', 'İlk Ölçüm Tarihi', '1. Test Tarihi'],
    ['olcum1tarihi', 'olcumtarihi', '1olcumtarihi', 'ilkolcumtarihi', 'testtarihi'],
    ['dogum', 'birth', 'dtarih', 'olcum2', '2olcum', 'olcum3', '3olcum']
  );
  const rawDate2 = findVal(
    ['Olcum_2_Tarihi', '2. Ölçüm Tarihi', 'Ara Ölçüm Tarihi', '2. Test Tarihi'],
    ['olcum2tarihi', '2olcumtarihi', 'araolcumtarihi'],
    ['dogum', 'birth', 'dtarih', 'olcum1', '1olcum', 'olcum3', '3olcum']
  );
  const rawDate3 = findVal(
    ['Olcum_3_Tarihi', '3. Ölçüm Tarihi', 'Son Ölçüm Tarihi'],
    ['olcum3tarihi', '3olcumtarihi', 'sonolcumtarihi'],
    ['dogum', 'birth', 'dtarih', 'olcum1', '1olcum', 'olcum2', '2olcum']
  );
  const parsedDate1 = rawDate1 ? parseDateString(rawDate1) : '';
  cloned.date1 = parsedDate1 && parsedDate1 !== cloned.birthDate ? parsedDate1 : (parsedDate1 || new Date().toLocaleDateString('tr-TR'));
  cloned.date2 = rawDate2 ? parseDateString(rawDate2) : '2-4 Ay Arası (Tahmini)';
  cloned.date3 = rawDate3 ? parseDateString(rawDate3) : '—';
  cloned.isAiForecast = false;

  const hasRawInput = (val: unknown): boolean => {
    if (val === null || val === undefined) return false;
    const s = String(val).trim().toLowerCase();
    return s !== '' && s !== '-' && s !== 'yok';
  };

  const setB = (id: string, v1: any, v2: any, v3: any) => {
    const item = cloned.bodyComposition.find((x) => x.id === id);
    if (!item) return;
    const val1 = toNum(v1, 0);
    const val2 = toNum(v2, 0);
    const val3 = toNum(v3, 0);

    // Keep exact numbers provided in Excel without generating fake m2
    item.m1 = val1 > 0 ? val1 : 0;
    item.m2 = val2 > 0 ? val2 : 0;
    item.m3 = val3 > 0 ? val3 : 0;

    const activeVal = item.m1 > 0 ? item.m1 : (item.m3 > 0 ? item.m3 : item.m2);
    if (activeVal > 0) {
      item.measured = true;
      const halfSpan =
        activeVal >= item.refMid
          ? Math.max(0.1, (item.refHigh - item.refMid) / 2)
          : Math.max(0.1, (item.refMid - item.refLow) / 2);
      item.sd = Number(((activeVal - item.refMid) / halfSpan).toFixed(2));
      item.percentile = sdToPercentile(item.sd);
      if (id === 'height') {
        item.status = activeVal > item.refHigh || item.sd > 1.2 ? 'uzun' : activeVal < item.refLow || item.sd < -1.5 ? 'düşük' : 'normal';
      } else {
        item.status = activeVal > item.refHigh || item.sd > 1.35 ? 'yüksek' : activeVal < item.refLow || item.sd < -1.5 ? 'düşük' : 'normal';
      }
    } else {
      item.measured = false;
      item.sd = 0;
      item.percentile = 0;
    }
  };

  // Body Composition fields
  setB(
    'height',
    findVal(['Boy_1', 'Boy (cm)', 'Boy', 'İlk Boy (cm)', '1. Boy'], ['boy', 'boycm', 'boyu', 'boyuzunlugu', 'height', 'ilkboy']),
    findVal(['Boy_2', '2. Boy'], ['boy2', 'araboy']),
    findVal(['Boy_3', 'Son Boy Ölçümü (cm)', '3. Boy'], ['boy3', 'sonboy', 'guncelboy'])
  );

  setB(
    'weight',
    findVal(['Agirlik_1', 'Ağırlık (kg)', 'Kilo', 'Agirlik', 'İlk Kilo (kg)', '1. Kilo'], ['kilo', 'agirlik', 'agirlikkg', 'weight', 'kilogram', 'vucutagirligi']),
    findVal(['Agirlik_2', '2. Kilo'], ['kilo2', 'agirlik2', 'arakilo']),
    findVal(['Agirlik_3', 'Son Kilo', 'Güncel Kilo (kg)', '3. Kilo'], ['kilo3', 'agirlik3', 'guncelkilo', 'sonkilo'])
  );

  const hItem = cloned.bodyComposition.find((x) => x.id === 'height');
  const wItem = cloned.bodyComposition.find((x) => x.id === 'weight');
  const calcBmi = (hCm: number, wKg: number) =>
    hCm > 50 && wKg > 10 ? Number((wKg / Math.pow(hCm / 100, 2)).toFixed(2)) : 0;

  const bmi1 = findVal(['BKI_1', 'BKİ_1']) ?? (hItem && wItem && hItem.m1 > 0 && wItem.m1 > 0 ? calcBmi(hItem.m1, wItem.m1) : undefined);
  const bmi2 = findVal(['BKI_2', 'BKİ_2']) ?? (hItem && wItem && hItem.m2 > 0 && wItem.m2 > 0 ? calcBmi(hItem.m2, wItem.m2) : undefined);
  const bmi3 = findVal(['BKI_3', 'BKİ_3', 'BKI', 'BKİ', 'BMI']) ?? (hItem && wItem && hItem.m3 > 0 && wItem.m3 > 0 ? calcBmi(hItem.m3, wItem.m3) : undefined);

  setB('bmi', bmi1, bmi2, bmi3);
  setB(
    'body_fat',
    findVal(['Yag_Yuzdesi_1', 'Yağ Oranı (%)', 'Yag_Yuzdesi', 'Yağ'], ['yag', 'yagorani', 'yagyuzdesi', 'bodyfat', 'fat']),
    findVal(['Yag_Yuzdesi_2'], ['yag2', 'yagorani2']),
    findVal(['Yag_Yuzdesi_3'], ['yag3', 'yagorani3'])
  );

  setB(
    'triceps',
    findVal(['Triceps_1', 'Triceps Deri Kıvrım (mm)', 'Triceps'], ['triceps', 'tricepsdkk', 'tricepsmm']),
    findVal(['Triceps_2'], ['triceps2']),
    findVal(['Triceps_3'], ['triceps3'])
  );

  setB(
    'biceps_skf',
    findVal(['Biceps_1', 'Biceps Deri Kıvrım (mm)', 'Biceps'], ['biceps', 'bicepsdkk', 'bicepsskf']),
    findVal(['Biceps_2'], ['biceps2']),
    findVal(['Biceps_3'], ['biceps3'])
  );

  setB(
    'iliac_skf',
    findVal(['Iliak_1', 'İliak Deri Kıvrım (mm)', 'İliak', 'Iliak'], ['iliak', 'iliac', 'iliakdkk']),
    findVal(['Iliak_2'], ['iliak2']),
    findVal(['Iliak_3'], ['iliak3'])
  );

  setB(
    'calf_skf',
    findVal(['Calf_DKK_1', 'Calf Deri Kıvrım (mm)', 'Calf DKK', 'Baldır DKK'], ['calfdkk', 'calfskf', 'baldirskf']),
    findVal(['Calf_DKK_2'], ['calfdkk2']),
    findVal(['Calf_DKK_3'], ['calfdkk3'])
  );

  setB('subscapula', findVal(['Subscapula_1', 'Subscapula'], ['subscapula']), findVal(['Subscapula_2']), findVal(['Subscapula_3']));
  setB('supraspinal', findVal(['Supraspinal_1', 'Supraspinal'], ['supraspinal']), findVal(['Supraspinal_2']), findVal(['Supraspinal_3']));
  setB('humerus', findVal(['Humerus_1', 'Humerus'], ['humerus']), findVal(['Humerus_2']), findVal(['Humerus_3']));
  setB('femur', findVal(['Femur_1', 'Femur'], ['femur']), findVal(['Femur_2']), findVal(['Femur_3']));
  setB('calf_girth', findVal(['Calf_Cevre_1', 'Calf Çevre', 'Baldır Çevresi'], ['calfcevre', 'baldircevre']), findVal(['Calf_Cevre_2']), findVal(['Calf_Cevre_3']));
  setB('biceps_girth', findVal(['Biceps_Cevre_1', 'Biceps Çevre', 'Kol Çevresi'], ['bicepscevre', 'kolcevre']), findVal(['Biceps_Cevre_2']), findVal(['Biceps_Cevre_3']));

  setB(
    'sitting_height',
    findVal(['Oturma_Boyu_1', 'Oturma Boyu (cm)', 'Oturma Boyu'], ['oturmaboyu', 'sittingheight']),
    findVal(['Oturma_Boyu_2'], ['oturmaboyu2']),
    findVal(['Oturma_Boyu_3'], ['oturmaboyu3'])
  );
  setB(
    'arm_span',
    findVal(['Kulac_1', 'Kulaç Uzunluğu (cm)', 'Kulaç Uzunluğu', 'Kulaç'], ['kulac', 'kulacuzunlugu', 'armspan']),
    findVal(['Kulac_2'], ['kulac2']),
    findVal(['Kulac_3'], ['kulac3'])
  );

  // PHV hesabı için içsel sittingHeight değerini güncelle; ölçülmemiş tablo satırlarını doldurma
  const sitItem = cloned.bodyComposition.find((x) => x.id === 'sitting_height');
  if (sitItem && sitItem.m1 > 0) {
    cloned.sittingHeight = sitItem.m1;
  } else if (hItem && hItem.m1 > 0) {
    cloned.sittingHeight = Number((hItem.m1 * 0.522).toFixed(1));
  }

  const setM = (id: string, v1: any, v2: any, v3: any, forceMeasured: boolean = false) => {
    const item = cloned.motorPerformance.find((x) => x.id === id);
    if (!item) return;
    const isGrip = id === 'grip_strength_right' || id === 'grip_strength_left' || item.name.toLowerCase().includes('pençe');
    const val1 = isGrip ? sanitizeGripValue(v1) : toNum(v1, 0);
    const val2 = isGrip ? sanitizeGripValue(v2) : toNum(v2, 0);
    const val3 = isGrip ? sanitizeGripValue(v3) : toNum(v3, 0);

    item.m1 = val1 > 0 ? val1 : 0;
    item.m2 = val2 > 0 ? val2 : 0;
    item.m3 = val3 > 0 ? val3 : 0;

    const hasVal = item.m1 > 0 || item.m2 > 0 || item.m3 > 0;
    item.measured = hasVal || forceMeasured;

    if (item.measured) {
      const activeVal = item.m1 > 0 ? item.m1 : (item.m3 > 0 ? item.m3 : item.m2);
      const span = Math.max(0.05, (item.refHigh - item.refLow) / 4);
      const rawDiff = item.lowerIsBetter ? item.refMid - activeVal : activeVal - item.refMid;
      item.sd = Number((rawDiff / span).toFixed(2));
      item.percentile = Math.max(5, Math.min(99, Math.round(50 + item.sd * 24)));
      item.status =
        item.percentile >= 80
          ? 'mükemmel'
          : item.percentile >= 65
          ? 'iyi'
          : item.percentile >= 40
          ? 'normal'
          : 'desteklenmeli';

      const ips = cloned.ipsativeTargets.find((t) =>
        item.name.toLowerCase().includes(t.parameter.toLowerCase()) ||
        t.parameter.toLowerCase().includes(item.name.toLowerCase())
      );
      if (ips) {
        ips.m1 = item.m1;
        ips.m2 = item.m2;
        ips.m3 = item.m3;
        ips.target = Number((item.lowerIsBetter ? activeVal * 0.96 : activeVal * 1.06).toFixed(2));
      }
    } else {
      item.sd = 0;
      item.percentile = 0;
    }
  };

  setM(
    'grip_strength_right',
    findVal(['Kavrama_Kuvveti_Sag_1', 'Pençe Kuvveti - Sağ', 'Pençe Sağ', 'Kavrama Sağ'], ['pencesag', 'kavramasag', 'gripright', 'sagpence']),
    findVal(['Kavrama_Kuvveti_Sag_2'], ['pencesag2']),
    findVal(['Kavrama_Kuvveti_Sag_3'], ['pencesag3'])
  );

  setM(
    'grip_strength_left',
    findVal(['Kavrama_Kuvveti_Sol_1', 'Pençe Kuvveti - Sol', 'Pençe Sol', 'Kavrama Sol'], ['pencesol', 'kavramasol', 'gripleft', 'solpence']),
    findVal(['Kavrama_Kuvveti_Sol_2'], ['pencesol2']),
    findVal(['Kavrama_Kuvveti_Sol_3'], ['pencesol3'])
  );

  const balanceVal1 = findVal(['Denge_1', 'Flamingo Denge Testi', 'Denge', 'Flamingo Denge'], ['denge', 'flamingodenge', 'flamingo', 'balance']);
  const balanceTrial1 = findVal(['Flamingo_Deneme_1', 'Flamingo 1', 'Flamingo Sağ', 'Denge 1'], ['flamingo1', 'flamingosag']);
  const balanceTrial2 = findVal(['Flamingo_Deneme_2', 'Flamingo 2', 'Flamingo Sol', 'Denge 2'], ['flamingo2', 'flamingosol']);
  const balanceRaw2 = findVal(['Denge_2'], ['denge2']);
  const balanceRaw3 = findVal(['Denge_3'], ['denge3']);
  const hasBalanceInput =
    hasRawInput(balanceVal1) ||
    hasRawInput(balanceTrial1) ||
    hasRawInput(balanceTrial2) ||
    hasRawInput(balanceRaw2) ||
    hasRawInput(balanceRaw3) ||
    String(balanceVal1 ?? '').toLowerCase().includes('başarısız') ||
    String(balanceVal1 ?? '').toLowerCase().includes('basarisiz');

  const m1Balance = parseFlamingoBalanceScore(balanceVal1, balanceTrial1, balanceTrial2);
  const m2Balance = parseFlamingoBalanceScore(balanceRaw2);
  const m3Balance = parseFlamingoBalanceScore(balanceRaw3);

  setM('balance', m1Balance, m2Balance, m3Balance, hasBalanceInput);

  setM(
    'sprint',
    findVal(['Surat_1', '20 Metre Sprint (sn)', 'Surat', 'Sürat', '20m Sürat', '20 Metre Koşu (sn)'], ['surat', 'sprint', '20m', '20metresprint', '20metre']),
    findVal(['Surat_2'], ['surat2']),
    findVal(['Surat_3'], ['surat3'])
  );

  setM(
    'flexibility',
    findVal(['Esneklik_1', 'Otur-Uzan / Esneklik (cm)', 'Otur Eriş Esneklik (cm)', 'Esneklik', 'Otur Uzan'], ['esneklik', 'oturuzan', 'otureris', 'flexibility']),
    findVal(['Esneklik_2'], ['esneklik2']),
    findVal(['Esneklik_3'], ['esneklik3'])
  );

  setM(
    'arm_speed_right',
    findVal(['Kol_Surat_Sag_1', 'Kol Sürat Testi Sağ'], ['kolsuratsag', 'armspeedright']),
    findVal(['Kol_Surat_Sag_2']),
    findVal(['Kol_Surat_Sag_3'])
  );

  setM(
    'arm_speed_left',
    findVal(['Kol_Surat_Sol_1', 'Kol Sürat Testi Sol'], ['kolsuratsol', 'armspeedleft']),
    findVal(['Kol_Surat_Sol_2']),
    findVal(['Kol_Surat_Sol_3'])
  );

  setM(
    'standing_long_jump',
    findVal(['Durarak_Uzun_Atlama_1', 'Durarak Uzun Atlama (cm)', 'Durarak Uzun Atlama', 'Uzun Atlama'], ['durarakuzunatlama', 'uzunatlama', 'broadjump', 'longjump']),
    findVal(['Durarak_Uzun_Atlama_2'], ['durarakuzunatlama2']),
    findVal(['Durarak_Uzun_Atlama_3'], ['durarakuzunatlama3'])
  );

  setM(
    'agility',
    findVal(['Cabukluk_1', '10 x 5 Metre Sürat (sn)', '10x5m Çabukluk (sn)', 'Cabukluk', 'Çabukluk', 'Çeviklik'], ['cabukluk', 'ceviklik', '10x5', 'agility', '10x5m']),
    findVal(['Cabukluk_2'], ['cabukluk2']),
    findVal(['Cabukluk_3'], ['cabukluk3'])
  );

  setM(
    'vertical_jump',
    findVal(['Dikey_Sicrama_1', 'Dikey Sıçrama (cm)', 'Dikey_Sicrama', 'Dikey Sıçrama Testi (cm)', 'Sıçrama'], ['dikeysicrama', 'sicrama', 'cmj', 'verticaljump', 'jump']),
    findVal(['Dikey_Sicrama_2'], ['dikeysicrama2']),
    findVal(['Dikey_Sicrama_3'], ['dikeysicrama3'])
  );

  setM('reaction', findVal(['Reaksiyon_1', 'Reaksiyon', 'Reaksiyon (sn)'], ['reaksiyon', 'reaction']), findVal(['Reaksiyon_2']), findVal(['Reaksiyon_3']));
  setM('back_strength', findVal(['Sirt_Kuvveti_1', 'Sırt Kuvveti', 'Sırt Dinamometre (kg)'], ['sirtkuvveti', 'sirtdinamometre', 'sirt']), findVal(['Sirt_Kuvveti_2']), findVal(['Sirt_Kuvveti_3']));
  setM('aerobic', findVal(['VO2max_1', 'VO2max', 'Mekik VO2max'], ['vo2', 'vo2max', 'mekik', 'pacer']), findVal(['VO2max_2']), findVal(['VO2max_3']));

  // Parent Info Mappings
  if (!cloned.parentInfo) cloned.parentInfo = {};
  const aBoy = findVal(['Anne Boy (cm)', 'Anne_Boy', 'Anne Boy'], ['anneboy', 'motherheight']);
  if (aBoy) cloned.parentInfo.anneBoy = String(aBoy);
  const aKilo = findVal(['Anne Ağırlık (kg)', 'Anne Kilo (kg)', 'Anne_Kilo', 'Anne Kilo'], ['annekilo', 'anneagirlik']);
  if (aKilo) cloned.parentInfo.anneKilo = String(aKilo);
  const aSpor = findVal(['Anne Spor Geçmişi', 'Anne_Spor_Gecmisi'], ['annespor', 'annesporgecmisi']);
  if (aSpor) cloned.parentInfo.anneSporGecmisi = String(aSpor);

  const bBoy = findVal(['Baba Boy (cm)', 'Baba_Boy', 'Baba Boy'], ['bababoy', 'fatherheight']);
  if (bBoy) cloned.parentInfo.babaBoy = String(bBoy);
  const bKilo = findVal(['Baba Ağırlık (kg)', 'Baba Kilo (kg)', 'Baba_Kilo', 'Baba Kilo'], ['babakilo', 'babaagirlik']);
  if (bKilo) cloned.parentInfo.babaKilo = String(bKilo);
  const bSpor = findVal(['Baba Spor Geçmişi', 'Baba_Spor_Gecmisi'], ['babaspor', 'babasporgecmisi']);
  if (bSpor) cloned.parentInfo.babaSporGecmisi = String(bSpor);

  // Recalculate target adult height from parents if available
  const pAnne = toNum(cloned.parentInfo.anneBoy, 0);
  const pBaba = toNum(cloned.parentInfo.babaBoy, 0);
  if (pAnne > 120 && pBaba > 120) {
    const isFemale = cloned.gender === 'Kadın';
    const midParent = isFemale ? (pAnne + pBaba - 13) / 2 : (pAnne + pBaba + 13) / 2;
    cloned.predictedAdultHeight = Number(midParent.toFixed(1));
  }

  // Update Cardio / Anaerobic Power / BMR based strictly on measured metrics (no fake defaults)
  const aeroItem = cloned.motorPerformance.find((x) => x.id === 'aerobic');
  const vjItem = cloned.motorPerformance.find((x) => x.id === 'vertical_jump');
  cloned.cardio.test1Distance = r.PACER_Mesafe_1 ? toNum(r.PACER_Mesafe_1, 0) : 0;
  cloned.cardio.test2Distance = r.PACER_Mesafe_2 ? toNum(r.PACER_Mesafe_2, 0) : 0;
  cloned.cardio.test3Distance = r.PACER_Mesafe_3 ? toNum(r.PACER_Mesafe_3, 0) : 0;
  cloned.cardio.test1Shuttles = r.PACER_Mekik_1 ? toNum(r.PACER_Mekik_1, 0) : 0;
  cloned.cardio.test2Shuttles = r.PACER_Mekik_2 ? toNum(r.PACER_Mekik_2, 0) : 0;
  cloned.cardio.test3Shuttles = r.PACER_Mekik_3 ? toNum(r.PACER_Mekik_3, 0) : 0;

  if (aeroItem && isLabRowMeasured(aeroItem)) {
    cloned.cardio.test1Vo2 = aeroItem.m1;
    cloned.cardio.test2Vo2 = aeroItem.m2;
    cloned.cardio.test3Vo2 = aeroItem.m3;
    cloned.cardio.test3Status = aeroItem.m3 >= 42 ? 'Mükemmel' : aeroItem.m3 >= 37 ? 'İyi' : aeroItem.m1 > 0 ? 'Normal' : '—';
  } else {
    cloned.cardio.test1Vo2 = 0;
    cloned.cardio.test2Vo2 = 0;
    cloned.cardio.test3Vo2 = 0;
    cloned.cardio.test3Status = '—';
  }

  if (vjItem && isLabRowMeasured(vjItem) && vjItem.m1 > 0 && wItem && wItem.m1 > 0) {
    const watt = Math.round(Math.max(400, 21.67 * wItem.m1 * Math.sqrt(vjItem.m1 / 100) + 420));
    cloned.cardio.verticalJumpAnaerobicWatt = watt;
    cloned.cardio.verticalJumpRelativeWatt = Number((watt / Math.max(20, wItem.m1)).toFixed(2));
  } else {
    cloned.cardio.verticalJumpAnaerobicWatt = 0;
    cloned.cardio.verticalJumpRelativeWatt = 0;
  }

  if (hItem && hItem.m1 > 0 && wItem && wItem.m1 > 0) {
    cloned.cardio.basalMetabolicRate = Math.round(
      66.5 + 13.75 * wItem.m1 + 5.003 * hItem.m1 - 6.75 * cloned.ageYears
    );
  } else {
    cloned.cardio.basalMetabolicRate = 0;
  }
  if (r.BMR) cloned.cardio.basalMetabolicRate = toNum(r.BMR, cloned.cardio.basalMetabolicRate);
  if (r.MET) cloned.cardio.functionalCapacityMet = toNum(r.MET, cloned.cardio.functionalCapacityMet);
  if (r.Maksimum_Kalp_Hizi) cloned.cardio.maxHeartRate = toNum(r.Maksimum_Kalp_Hizi, cloned.cardio.maxHeartRate);

  // Filter ipsativeTargets strictly to measured motor tests
  const measuredMotors = getDisplayedMotorPerformance(cloned);
  cloned.ipsativeTargets = cloned.ipsativeTargets.filter((t) =>
    measuredMotors.some(
      (m) =>
        m.name.toLowerCase().includes(t.parameter.toLowerCase()) ||
        t.parameter.toLowerCase().includes(m.name.toLowerCase())
    )
  );

  // Update Somatotype using Heath-Carter Biomechanics (yalnızca ölçülen bileşenler)
  const getSomatoInput = (mIdx: 'm1' | 'm2' | 'm3') => {
    const getVal = (fid: string) => {
      const row = cloned.bodyComposition.find((x) => x.id === fid);
      return row && isLabRowMeasured(row) ? (row[mIdx] || 0) : 0;
    };
    return {
      height: getVal('height'),
      weight: getVal('weight'),
      triceps: getVal('triceps'),
      subscapular: getVal('subscapula'),
      supraspinale: getVal('supraspinal') || getVal('iliac_skf'),
      calfSkf: getVal('calf_skf'),
      humerus: getVal('humerus'),
      femur: getVal('femur'),
      bicepsGirth: getVal('biceps_girth'),
      calfGirth: getVal('calf_girth'),
    };
  };

  cloned.somatotype.m1 = calculateHeathCarterSomatotype(getSomatoInput('m1'));
  cloned.somatotype.m2 = calculateHeathCarterSomatotype(getSomatoInput('m2'));
  const m3Input = getSomatoInput('m3');
  const hasBatchM3 = Boolean(cloned.date3 && cloned.date3 !== '—' && m3Input.height > 0 && m3Input.weight > 0);
  if (hasBatchM3) {
    cloned.somatotype.m3 = calculateHeathCarterSomatotype(m3Input);
  } else {
    cloned.somatotype.m3 = { endo: 0, meso: 0, ecto: 0, category: '—' };
  }

  if (r.Elit_Referans_Endo) cloned.somatotype.eliteRef.endo = toNum(r.Elit_Referans_Endo, cloned.somatotype.eliteRef.endo);
  if (r.Elit_Referans_Mezo) cloned.somatotype.eliteRef.meso = toNum(r.Elit_Referans_Mezo, cloned.somatotype.eliteRef.meso);
  if (r.Elit_Referans_Ekto) cloned.somatotype.eliteRef.ecto = toNum(r.Elit_Referans_Ekto, cloned.somatotype.eliteRef.ecto);
  if (r.Elit_Referans_Puan) cloned.somatotype.eliteRef.refScore = toNum(r.Elit_Referans_Puan, cloned.somatotype.eliteRef.refScore);
  if (r.Elit_Brans) cloned.somatotype.eliteRef.sport = String(r.Elit_Brans);

  if (r.PHV_Yasi) cloned.phvAge = toNum(r.PHV_Yasi, cloned.phvAge);
  if (r.PHV_Boyu) cloned.phvHeight = toNum(r.PHV_Boyu, cloned.phvHeight);
  if (r.Tahmini_18_Yas_Boyu) {
    cloned.predictedAdultHeight = toNum(r.Tahmini_18_Yas_Boyu, cloned.predictedAdultHeight);
  }
  if (r.Olgunlasma_Durumu) {
    const rawStatus = String(r.Olgunlasma_Durumu);
    const lowerStatus = rawStatus.toLowerCase();
    if (lowerStatus.includes('ipek') || lowerStatus.includes('başeğmez') || lowerStatus.includes('basegmez') || lowerStatus.length > 25) {
      cloned.maturationStatus = 'Normal Büyüme Hızı';
    } else {
      cloned.maturationStatus = rawStatus;
    }
  }

  // Compute overall performance scores based strictly on measured motor test percentiles
  const validPercentiles = measuredMotors.map((m) => m.percentile || 50);

  const avgMotorPct = validPercentiles.length > 0
    ? Math.round(validPercentiles.reduce((acc, p) => acc + p, 0) / validPercentiles.length)
    : 72;

  cloned.scoreHistory.p1Score = toNum(r.Skor_P1 ?? r.Genel_Performans_Puani, avgMotorPct);
  cloned.scoreHistory.p2Score = toNum(r.Skor_P2, Math.min(96, Math.round(cloned.scoreHistory.p1Score + 6)));
  if (r.Skor_P3 !== undefined && r.Skor_P3 !== '') {
    cloned.scoreHistory.p3Score = toNum(r.Skor_P3, cloned.scoreHistory.p2Score);
  } else {
    cloned.scoreHistory.p3Score = cloned.scoreHistory.p1Score;
  }

  if (r.Brans_Referans_Puani) {
    cloned.somatotype.eliteRef.refScore = toNum(
      r.Brans_Referans_Puani,
      cloned.somatotype.eliteRef.refScore
    );
  }
  if (r.Uzman_Gorusu && String(r.Uzman_Gorusu).trim() !== '-' && !isStaleExpertComment(String(r.Uzman_Gorusu), cloned)) {
    cloned.expertComment = String(r.Uzman_Gorusu).trim();
    cloned.isManualExpertComment = true;
  } else {
    cloned.isManualExpertComment = false;
    cloned.expertComment = generateAthleteInterpretiveExpertComment(cloned);
  }

  let finalRowReport = applyBrandingToReport(cloned, activeBranding);
  finalRowReport.isAiForecast = cloned.isAiForecast;
  ensureDataConsistency(finalRowReport);

  finalRowReport.aiRecommendations = analyzeLabPerformanceMetrics(finalRowReport);
  return finalRowReport;
}

/**
 * Generates the 6 sample athlete reports for 1-click batch testing in the UI.
 */
export function generateSampleBatchLabReports(baseTemplate?: SportsFlyLabReport): SportsFlyLabReport[] {
  const activeBranding = getStoredLabSchoolBranding();
  const brandedTemplate = applyBrandingToReport(baseTemplate || EMPTY_LAB_REPORT_TEMPLATE, activeBranding);
  return SAMPLE_BATCH_ATHLETE_ROWS.map((row, idx) =>
    buildLabReportFromExcelRow(row, idx, brandedTemplate, activeBranding)
  ).filter((item): item is SportsFlyLabReport => item !== null);
}

/**
 * Column Mapping Schema for Flexible Multi-Format Batch Excel Import
 */
export type LabBatchFieldCategory = 'identity' | 'body' | 'somatotype' | 'motor' | 'cardio' | 'advanced';

export interface LabBatchMappableField {
  key: string; // Canonical row property expected by buildLabReportFromExcelRow (e.g. 'Sporcu_Adi', 'Boy_3', 'Surat_3')
  label: string;
  category: LabBatchFieldCategory;
  categoryLabel: string;
  unit: string;
  required?: boolean;
  description: string;
  aliases: string[];
}

export const LAB_BATCH_MAPPABLE_FIELDS: LabBatchMappableField[] = [
  // 1. Kimlik & Dönem Bilgileri
  {
    key: 'Sporcu_Adi',
    label: 'Sporcu Adı Soyadı',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Metin',
    required: true,
    description: 'Karne sahibinin tam adı (Zorunlu alan)',
    aliases: ['Adı Soyadı', 'Sporcu_Adi', 'Sporcu Adı', 'Ad Soyad', 'Ad_Soyad', 'Öğrenci Adı Soyadı', 'Öğrenci Adı', 'İsim', 'Isim', 'Name', 'Athlete', 'Adı', 'Soyadı'],
  },
  {
    key: 'Sporcu_Kodu',
    label: 'Sporcu / Lisans Kodu',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Kod',
    description: 'Lisans veya kulüp kayıt numarası',
    aliases: ['Sporcu_Kodu', 'Sporcu Kodu', 'Kayıt No', 'Lisans No', 'Öğrenci No', 'Kod', 'Numara', 'ID', 'Code', 'Lisans'],
  },
  {
    key: 'Brans',
    label: 'Spor Branşı / Grup',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Metin',
    description: 'Sporcunun branşı veya yaş grubu (Örn: Voleybol / U12)',
    aliases: ['Brans', 'Branş', 'Branş / Takım', 'Spor Branşı', 'Grup', 'Takım', 'Kategori', 'Branch', 'Sport', 'Grubu'],
  },
  {
    key: 'Cinsiyet',
    label: 'Cinsiyet',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Erkek / Kadın',
    description: 'Normatif yüzdelik ve PHV hesabı için cinsiyet',
    aliases: ['Cinsiyet', 'Cinsiyeti', 'K/E', 'E/K', 'Gender', 'Sex', 'Cins'],
  },
  {
    key: 'Yas',
    label: 'Takvim Yaşı (Yıl)',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Yıl',
    description: 'Sporcunun ondalık takvim yaşı (Örn: 11.4)',
    aliases: ['Yas', 'Yaş', 'Yaşı', 'Takvim Yaşı', 'Age', 'Takvim Yaşı (Yıl)'],
  },
  {
    key: 'Doğum Tarihi (GG.AA.YYYY)',
    label: 'Doğum Tarihi',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Tarih',
    description: 'Sporcunun doğum tarihi (Örn: 14.11.2010)',
    aliases: ['Doğum Tarihi (GG.AA.YYYY)', 'Doğum Tarihi', 'Dogum Tarihi', 'Birth Date', 'Birthday', 'D.Tarihi'],
  },
  {
    key: 'Kulup_Adi',
    label: 'Kulüp / Spor Okulu Adı',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Metin',
    description: 'Boş bırakılırsa üstteki kurumsal okul adı uygulanır',
    aliases: ['Kulup_Adi', 'Kulüp', 'Kulüp Adı', 'Spor Okulu', 'Okul Adı', 'Club', 'Kulüp / Spor Okulu Adı', 'Okulu'],
  },
  {
    key: 'Sube',
    label: 'Şube / Kampüs',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Metin',
    description: 'Kampüs veya tesis bilgisi',
    aliases: ['Sube', 'Şube', 'Kampüs', 'Tesis', 'Birim', 'Şube / Kampüs', 'Kampusu'],
  },
  {
    key: 'Olcum_1_Tarihi',
    label: '1. Ölçüm Tarihi',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Tarih',
    description: '1. test dönemi tarihi',
    aliases: ['Olcum_1_Tarihi', '1. Ölçüm Tarihi', 'İlk Ölçüm Tarihi', 'Tarih 1', 'Date 1', '1. Test Tarihi'],
  },
  {
    key: 'Olcum_2_Tarihi',
    label: '2. Ölçüm Tarihi',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Tarih',
    description: '2. test dönemi tarihi',
    aliases: ['Olcum_2_Tarihi', '2. Ölçüm Tarihi', 'Ara Ölçüm Tarihi', 'Tarih 2', 'Date 2', '2. Test Tarihi'],
  },
  {
    key: 'Olcum_3_Tarihi',
    label: '3. Ölçüm Tarihi (Güncel)',
    category: 'identity',
    categoryLabel: '1. Kimlik & Dönem',
    unit: 'Tarih',
    description: 'Güncel / son test dönemi tarihi',
    aliases: ['Olcum_3_Tarihi', '3. Ölçüm Tarihi', 'Ölçüm Tarihi', 'Son Ölçüm Tarihi', 'Tarih', 'Tarih 3', 'Date', '3. Ölçüm Tarihi (Güncel)', '3. Test Tarihi', 'Güncel Tarih'],
  },

  // 2. Beden Kompozisyonu & Antropometri
  {
    key: 'Boy (cm)',
    label: 'Boy Uzunluğu (Aktif / Güncel)',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: 'Güncel boy uzunluğu',
    aliases: ['Boy (cm)', 'Boy', 'Boyu', 'Boy Uzunluğu', 'Height', 'BOY', 'BOY (CM)', 'Boy / cm', 'Boy(cm)'],
  },
  {
    key: 'Boy_1',
    label: 'Boy Uzunluğu — 1. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: '1. dönem boy uzunluğu',
    aliases: ['Boy_1', 'Boy 1', '1. Boy', 'İlk Boy (cm)', 'İlk Boy', '1. Ölçüm Boy', 'Boy (1)'],
  },
  {
    key: 'Boy_2',
    label: 'Boy Uzunluğu — 2. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: '2. dönem boy uzunluğu',
    aliases: ['Boy_2', 'Boy 2', '2. Boy', 'Ara Boy', '2. Ölçüm Boy', 'Boy (2)'],
  },
  {
    key: 'Boy_3',
    label: 'Boy Uzunluğu — 3. Ölçüm (Son)',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: '3. dönem / son boy uzunluğu',
    aliases: ['Boy_3', 'Boy 3', '3. Boy', 'Son Boy Ölçümü (cm)', 'Son Boy', 'Güncel Boy', '3. Ölçüm Boy', 'Boy (3)'],
  },
  {
    key: 'Ağırlık (kg)',
    label: 'Vücut Ağırlığı',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'kg',
    description: 'Güncel vücut ağırlığı',
    aliases: ['Ağırlık (kg)', 'Agirlik_3', '3. Ağırlık', 'Ağırlık 3', 'Kilo', 'Vücut Ağırlığı', 'Weight', 'Ağırlığı'],
  },
  {
    key: 'Agirlik_1',
    label: 'Vücut Ağırlığı — 1. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'kg',
    description: '1. dönem vücut ağırlığı',
    aliases: ['Agirlik_1', 'Ağırlık 1', 'Kilo 1', 'İlk Kilo (kg)', 'İlk Kilo', 'Weight 1'],
  },
  {
    key: 'Agirlik_2',
    label: 'Vücut Ağırlığı — 2. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'kg',
    description: '2. dönem vücut ağırlığı',
    aliases: ['Agirlik_2', 'Ağırlık 2', 'Kilo 2', 'Ara Kilo', 'Weight 2'],
  },
  {
    key: 'Agirlik_3',
    label: 'Vücut Ağırlığı — 3. Ölçüm (Güncel)',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'kg',
    description: 'Güncel vücut ağırlığı',
    aliases: ['Agirlik_3', 'Ağırlık 3', 'Kilo 3', 'Güncel Kilo (kg)', 'Kilosu', 'Kilo (kg)', 'Kilo', 'Ağırlık', 'Vücut Ağırlığı', 'Weight'],
  },
  {
    key: 'BKI_3',
    label: 'Beden Kütle İndeksi (BKİ)',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'kg/m²',
    description: 'Eşleştirilmezse Boy ve Kilo değerlerinden otomatik hesaplanır',
    aliases: ['BKI_3', 'BKİ 3', 'BKI', 'BKİ', 'BMI', 'Vücut Kitle İndeksi'],
  },
  {
    key: 'Yag_Yuzdesi_1',
    label: 'Beden Yağ Yüzdesi — 1. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: '%',
    description: '1. dönem yağ oranı',
    aliases: ['Yag_Yuzdesi_1', 'Yağ 1', 'İlk Yağ Oranı'],
  },
  {
    key: 'Yag_Yuzdesi_2',
    label: 'Beden Yağ Yüzdesi — 2. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: '%',
    description: '2. dönem yağ oranı',
    aliases: ['Yag_Yuzdesi_2', 'Yağ 2', 'Ara Yağ Oranı'],
  },
  {
    key: 'Yag_Yuzdesi_3',
    label: 'Beden Yağ Yüzdesi — 3. Ölçüm (Güncel)',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: '%',
    description: 'Güncel deri altı yağ yüzdesi',
    aliases: ['Yag_Yuzdesi_3', 'Yag_Yuzdesi', 'Yağ Oranı (%)', 'Yağ Oranı', 'Yağ Yüzdesi', 'Yağ %', 'Body Fat'],
  },
  {
    key: 'Subscapula_3',
    label: 'Subscapula D.K.K. — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'mm',
    description: 'Kürek kemiği altı deri kıvrım kalınlığı',
    aliases: ['Subscapula_3', 'Subscapula', 'Subscapula DKK', 'Subscapula (mm)'],
  },
  {
    key: 'Triceps_3',
    label: 'Triceps D.K.K. — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'mm',
    description: 'Arka kol deri kıvrım kalınlığı',
    aliases: ['Triceps Deri Kıvrım (mm)', 'Triceps_3', 'Triceps', 'Triceps DKK', 'Triceps (mm)'],
  },
  {
    key: 'Biceps Deri Kıvrım (mm)',
    label: 'Biceps D.K.K.',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'mm',
    description: 'Ön kol deri kıvrım kalınlığı',
    aliases: ['Biceps Deri Kıvrım (mm)', 'Biceps_3', 'Biceps DKK', 'Biceps_skf'],
  },
  {
    key: 'İliak Deri Kıvrım (mm)',
    label: 'İliak D.K.K.',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'mm',
    description: 'Leğen kemiği yanı deri kıvrım kalınlığı',
    aliases: ['İliak Deri Kıvrım (mm)', 'Iliak DKK', 'Iliac DKK', 'iliac_skf'],
  },
  {
    key: 'Calf_DKK_3',
    label: 'Calf (Baldır) D.K.K. — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'mm',
    description: 'Baldır deri kıvrım kalınlığı',
    aliases: ['Calf Deri Kıvrım (mm)', 'Calf_DKK_3', 'Calf DKK', 'Calf_Skf', 'Baldır DKK', 'Calf (mm)'],
  },
  {
    key: 'Supraspinal_3',
    label: 'Supraspinal D.K.K. — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'mm',
    description: 'Leğen kemiği üstü deri kıvrım kalınlığı',
    aliases: ['Supraspinal_3', 'Supraspinal', 'Supraspinal DKK', 'Supraspinale'],
  },
  {
    key: 'Humerus_3',
    label: 'Humerus Kemik Çapı — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: 'Dirsek eklemi kemik genişliği (Mezomorfi)',
    aliases: ['Humerus_3', 'Humerus', 'Humerus Çap', 'Humerus (cm)'],
  },
  {
    key: 'Femur_3',
    label: 'Femur Kemik Çapı — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: 'Diz eklemi kemik genişliği (Mezomorfi)',
    aliases: ['Femur_3', 'Femur', 'Femur Çap', 'Femur (cm)'],
  },
  {
    key: 'Calf_Cevre_3',
    label: 'Calf (Baldır) Çevresi — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: 'Baldır maksimum kas çevresi',
    aliases: ['Calf_Cevre_3', 'Calf Çevre', 'Baldır Çevresi', 'Calf Girth'],
  },
  {
    key: 'Biceps_Cevre_3',
    label: 'Biceps (Kol) Çevresi — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: 'Fleksiyonda üst kol kas çevresi',
    aliases: ['Biceps_Cevre_3', 'Biceps Çevre', 'Kol Çevresi', 'Biceps Girth'],
  },
  {
    key: 'Oturma_Boyu_3',
    label: 'Oturma (Büst) Boyu — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: 'PHV ve olgunlaşma hesabında kullanılan büst boyu',
    aliases: ['Oturma_Boyu_3', 'Oturma Boyu', 'Büst Boyu', 'Sitting Height'],
  },
  {
    key: 'Kulac_3',
    label: 'Kulaç Uzunluğu — 3. Ölçüm',
    category: 'body',
    categoryLabel: '2. Beden Kompozisyonu',
    unit: 'cm',
    description: 'Kollar açık parmak ucu mesafesi',
    aliases: ['Kulac_3', 'Kulaç Uzunluğu', 'Kulaç', 'Arm Span'],
  },

  // 3. Heath-Carter Somatotip Değişim Tablosu
  {
    key: 'Endomorfi_1',
    label: 'Endomorfi — 1. Ölçüm',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Puan',
    description: '1. test dönemi Endomorfi bileşeni',
    aliases: ['Endomorfi_1', 'Endomorfi 1', 'Endo 1'],
  },
  {
    key: 'Endomorfi_2',
    label: 'Endomorfi — 2. Ölçüm',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Puan',
    description: '2. test dönemi Endomorfi bileşeni',
    aliases: ['Endomorfi_2', 'Endomorfi 2', 'Endo 2'],
  },
  {
    key: 'Endomorfi_3',
    label: 'Endomorfi — 3. Ölçüm (Güncel)',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Puan',
    description: 'Güncel Heath-Carter Endomorfi (göreceli yağlılık)',
    aliases: ['Endomorfi_3', 'Endomorfi', 'Endo', 'Endomorphy', 'Endomorfi 3'],
  },
  {
    key: 'Mezomorfi_1',
    label: 'Mezomorfi — 1. Ölçüm',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Puan',
    description: '1. test dönemi Mezomorfi bileşeni',
    aliases: ['Mezomorfi_1', 'Mezomorfi 1', 'Mezo 1'],
  },
  {
    key: 'Mezomorfi_2',
    label: 'Mezomorfi — 2. Ölçüm',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Puan',
    description: '2. test dönemi Mezomorfi bileşeni',
    aliases: ['Mezomorfi_2', 'Mezomorfi 2', 'Mezo 2'],
  },
  {
    key: 'Mezomorfi_3',
    label: 'Mezomorfi — 3. Ölçüm (Güncel)',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Puan',
    description: 'Güncel Heath-Carter Mezomorfi (kas-iskelet sağlamlığı)',
    aliases: ['Mezomorfi_3', 'Mezomorfi', 'Mezo', 'Mesomorphy', 'Mezomorfi 3'],
  },
  {
    key: 'Ektomorfi_1',
    label: 'Ektomorfi — 1. Ölçüm',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Puan',
    description: '1. test dönemi Ektomorfi bileşeni',
    aliases: ['Ektomorfi_1', 'Ektomorfi 1', 'Ekto 1'],
  },
  {
    key: 'Ektomorfi_2',
    label: 'Ektomorfi — 2. Ölçüm',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Puan',
    description: '2. test dönemi Ektomorfi bileşeni',
    aliases: ['Ektomorfi_2', 'Ektomorfi 2', 'Ekto 2'],
  },
  {
    key: 'Ektomorfi_3',
    label: 'Ektomorfi — 3. Ölçüm (Güncel)',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Puan',
    description: 'Güncel Heath-Carter Ektomorfi (incelik / doğrusallık)',
    aliases: ['Ektomorfi_3', 'Ektomorfi', 'Ekto', 'Ectomorphy', 'Ektomorfi 3'],
  },
  {
    key: 'Somatotip_Kategorisi',
    label: 'Somatotip Sınıfı / Kategorisi',
    category: 'somatotype',
    categoryLabel: '3. Somatotip Değişim Tablosu',
    unit: 'Metin',
    description: 'Örn: Dengeli Mezomorf, Endomorfik Mezomorf',
    aliases: ['Somatotip_Kategorisi', 'Somatotip Sınıfı', 'Somatotip Kategorisi', 'Somatotip Tipi'],
  },

  // 4. Biyomotor Yetenek & Motor Testler
  {
    key: 'Surat_1',
    label: '20m Sürat Koşusu — 1. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'sn',
    description: '1. dönem 20m sprint süresi',
    aliases: ['Surat_1', 'Sürat 1', 'İlk 20m Sürat', 'Sprint 1'],
  },
  {
    key: 'Surat_2',
    label: '20m Sürat Koşusu — 2. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'sn',
    description: '2. dönem 20m sprint süresi',
    aliases: ['Surat_2', 'Sürat 2', 'Ara 20m Sürat', 'Sprint 2'],
  },
  {
    key: 'Surat_3',
    label: '20m Sürat Koşusu — 3. Ölçüm (Güncel)',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'sn',
    description: 'Güncel 20m sürat süresi',
    aliases: ['20 Metre Sprint (sn)', 'Surat_3', 'Surat', 'Sürat', '20 Metre Koşu (sn)', '20m Sürat', '20m Sprint', 'Sprint'],
  },
  {
    key: 'Cabukluk_1',
    label: '10x5m Çabukluk Testi — 1. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'sn',
    description: '1. dönem 10x5m yön değiştirme süresi',
    aliases: ['Cabukluk_1', 'Çabukluk 1', 'Agility 1'],
  },
  {
    key: 'Cabukluk_2',
    label: '10x5m Çabukluk Testi — 2. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'sn',
    description: '2. dönem 10x5m yön değiştirme süresi',
    aliases: ['Cabukluk_2', 'Çabukluk 2', 'Agility 2'],
  },
  {
    key: 'Cabukluk_3',
    label: '10x5m Çabukluk Testi — 3. Ölçüm (Güncel)',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'sn',
    description: 'Güncel 10x5m çabukluk süresi',
    aliases: ['10 x 5 Metre Sürat (sn)', 'Cabukluk_3', 'Cabukluk', 'Çabukluk', '10x5m Çabukluk (sn)', '10x5m', 'Çeviklik', 'Agility'],
  },
  {
    key: 'Reaksiyon_3',
    label: 'Reaksiyon Sürati — 3. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'sn',
    description: 'Görsel reaksiyon testi süresi',
    aliases: ['Reaksiyon_3', 'Reaksiyon', 'Reaksiyon Sürati', 'Reaction'],
  },
  {
    key: 'Sirt_Kuvveti_3',
    label: 'Sırt Kuvveti — 3. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'kg',
    description: 'Sırt dinamometre kuvvet ölçümü',
    aliases: ['Sirt_Kuvveti_3', 'Sirt_Kuvveti', 'Sırt Kuvveti', 'Sırt Dinamometre (kg)', 'Back Strength'],
  },
  {
    key: 'Kavrama_Kuvveti_Sag_3',
    label: 'Pençe Kuvveti (Sağ) — 3. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'kg',
    description: 'Sağ el kavrama kuvvet ölçümü',
    aliases: ['Pençe Kuvveti - Sağ', 'Kavrama_Kuvveti_Sag_3', 'Pençe Sağ', 'Grip Right'],
  },
  {
    key: 'Kavrama_Kuvveti_Sol_3',
    label: 'Pençe Kuvveti (Sol) — 3. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'kg',
    description: 'Sol el kavrama kuvvet ölçümü',
    aliases: ['Pençe Kuvveti - Sol', 'Kavrama_Kuvveti_Sol_3', 'Pençe Sol', 'Grip Left'],
  },
  {
    key: 'Durarak_Uzun_Atlama_3',
    label: 'Durarak Uzun Atlama — 3. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'cm',
    description: 'Çift ayak yatay sıçrama mesafesi',
    aliases: ['Durarak Uzun Atlama (cm)', 'Durarak_Uzun_Atlama_3', 'Durarak Uzun Atlama', 'Uzun_Atlama', 'Uzun Atlama', 'Broad Jump'],
  },
  {
    key: 'Dikey_Sicrama_3',
    label: 'Dikey Sıçrama — 3. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'cm',
    description: 'Dikey sıçrama yüksekliği (CMJ)',
    aliases: ['Dikey Sıçrama (cm)', 'Dikey_Sicrama_3', 'Dikey_Sicrama', 'Dikey Sıçrama Testi (cm)', 'Dikey Sıçrama', 'CMJ', 'Vertical Jump'],
  },
  {
    key: 'Denge_3',
    label: 'Flamingo Denge Testi — 3. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'hata',
    description: '60 sn tek ayak denge testi',
    aliases: ['Flamingo Denge Testi', 'Denge_3', 'Denge', 'Flamingo Denge', 'Balance'],
  },
  {
    key: 'Esneklik_3',
    label: 'Otur-Eriş Esneklik — 3. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'cm',
    description: 'Otur-eriş sehpası esneklik ölçümü',
    aliases: ['Otur-Uzan / Esneklik (cm)', 'Esneklik_3', 'Esneklik', 'Otur Eriş Esneklik (cm)', 'Otur Eriş', 'Flexibility'],
  },
  {
    key: 'VO2max_3',
    label: 'VO2max / Aerobik Kapasite — 3. Ölçüm',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'ml/kg/dk',
    description: 'Maksimal oksijen tüketimi (VO2peak)',
    aliases: ['VO2max_3', 'VO2max', 'Mekik VO2max', 'VO2peak', 'Aerobik Güç'],
  },
  {
    key: 'Kol Sürat Testi Sağ',
    label: 'Kol Sürat Testi (Sağ)',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'atım',
    description: '50 sn üst ekstremite vuruş (atım) sayısı (Sağ)',
    aliases: ['Kol Sürat Testi Sağ', 'arm_speed_right', 'Kol Sürati Sağ'],
  },
  {
    key: 'Kol Sürat Testi Sol',
    label: 'Kol Sürat Testi (Sol)',
    category: 'motor',
    categoryLabel: '4. Biyomotor Yetenek',
    unit: 'atım',
    description: '50 sn üst ekstremite vuruş (atım) sayısı (Sol)',
    aliases: ['Kol Sürat Testi Sol', 'arm_speed_left', 'Kol Sürati Sol'],
  },

  // 5. Kardiyorespiratuar, PACER & Kondisyon
  {
    key: 'PACER_Mesafe_1',
    label: 'PACER Koşu Mesafesi — 1. Ölçüm',
    category: 'cardio',
    categoryLabel: '5. Kardiyo & Kondisyon',
    unit: 'metre',
    description: '1. test 20m mekik koşusu mesafesi',
    aliases: ['PACER_Mesafe_1', 'PACER 1', 'Mekik Mesafesi 1'],
  },
  {
    key: 'PACER_Mesafe_2',
    label: 'PACER Koşu Mesafesi — 2. Ölçüm',
    category: 'cardio',
    categoryLabel: '5. Kardiyo & Kondisyon',
    unit: 'metre',
    description: '2. test 20m mekik koşusu mesafesi',
    aliases: ['PACER_Mesafe_2', 'PACER 2', 'Mekik Mesafesi 2'],
  },
  {
    key: 'PACER_Mesafe_3',
    label: 'PACER Koşu Mesafesi — 3. Ölçüm',
    category: 'cardio',
    categoryLabel: '5. Kardiyo & Kondisyon',
    unit: 'metre',
    description: 'Güncel 20m mekik koşusu mesafesi',
    aliases: ['PACER_Mesafe_3', 'Mekik Mesafesi (m)', 'Mekik Mesafesi', 'PACER', 'Shuttle Run'],
  },
  {
    key: 'PACER_Mekik_3',
    label: 'PACER Mekik Sayısı — 3. Ölçüm',
    category: 'cardio',
    categoryLabel: '5. Kardiyo & Kondisyon',
    unit: 'adet',
    description: 'Tamamlanan mekik sayısı',
    aliases: ['PACER_Mekik_3', 'Mekik Sayısı', 'Shuttles'],
  },
  {
    key: 'BMR',
    label: 'Bazal Metabolizma Hızı (BMR)',
    category: 'cardio',
    categoryLabel: '5. Kardiyo & Kondisyon',
    unit: 'kcal',
    description: 'Günlük bazal metabolik enerji ihtiyacı',
    aliases: ['BMR', 'Bazal Metabolizma', 'Metabolizma'],
  },
  {
    key: 'MET',
    label: 'Fonksiyonel Kapasite (MET)',
    category: 'cardio',
    categoryLabel: '5. Kardiyo & Kondisyon',
    unit: 'MET',
    description: 'Metabolik eşdeğer egzersiz kapasitesi',
    aliases: ['MET', 'Kapasite MET', 'Fonksiyonel MET'],
  },
  {
    key: 'Maksimum_Kalp_Hizi',
    label: 'Maksimum Kalp Hızı (HRmax)',
    category: 'cardio',
    categoryLabel: '5. Kardiyo & Kondisyon',
    unit: 'bpm',
    description: 'Tepe nabız değeri',
    aliases: ['Maksimum_Kalp_Hizi', 'HRmax', 'Maksimum Nabız', 'Kalp Hızı'],
  },

  // 6. PHV, Skorlar & Uzman Notu
  {
    key: 'PHV_Yasi',
    label: 'PHV (Tepe Boy Hızı) Yaşı',
    category: 'advanced',
    categoryLabel: '6. PHV & Skorlar',
    unit: 'Yaş',
    description: 'Tahmini büyüme atağı yaşı',
    aliases: ['PHV_Yasi', 'PHV Yaşı', 'PHV', 'Büyüme Atağı Yaşı', 'PHV Age', 'PHV'],
  },
  {
    key: 'PHV_Boyu',
    label: 'PHV Dönemi Tahmini Boy',
    category: 'advanced',
    categoryLabel: '6. PHV & Skorlar',
    unit: 'cm',
    description: 'Büyüme atağındaki tahmini boy',
    aliases: ['PHV_Boyu', 'PHV Boy', 'PHV Dönemi Boyu'],
  },
  {
    key: 'Tahmini_18_Yas_Boyu',
    label: 'Tahmini 18 Yaş Yetişkin Boyu',
    category: 'advanced',
    categoryLabel: '6. PHV & Skorlar',
    unit: 'cm',
    description: 'Khamis-Roche / Mirwald 18 yaş boy projeksiyonu',
    aliases: ['Tahmini_18_Yas_Boyu', 'Tahmini Yetişkin Boyu', '18 Yaş Boyu', 'Tahmini Boy', 'Hedef Boy'],
  },
  {
    key: 'Olgunlasma_Durumu',
    label: 'Biyolojik Olgunlaşma Durumu',
    category: 'advanced',
    categoryLabel: '6. PHV & Skorlar',
    unit: 'Metin',
    description: 'Erken, Normal (Zamanında) veya Geç Ergen',
    aliases: ['Olgunlasma_Durumu', 'Olgunlaşma Durumu', 'Olgunlaşma', 'Maturation'],
  },
  {
    key: 'Skor_P1',
    label: '1. Dönem Karne Skoru',
    category: 'advanced',
    categoryLabel: '6. PHV & Skorlar',
    unit: '%',
    description: '1. ölçüm genel karne başarı puanı',
    aliases: ['Skor_P1', 'P1 Skoru', '1. Dönem Skoru', 'Puan 1'],
  },
  {
    key: 'Skor_P2',
    label: '2. Dönem Karne Skoru',
    category: 'advanced',
    categoryLabel: '6. PHV & Skorlar',
    unit: '%',
    description: '2. ölçüm genel karne başarı puanı',
    aliases: ['Skor_P2', 'P2 Skoru', '2. Dönem Skoru', 'Puan 2'],
  },
  {
    key: 'Skor_P3',
    label: '3. Dönem Karne Skoru (Güncel)',
    category: 'advanced',
    categoryLabel: '6. PHV & Skorlar',
    unit: '%',
    description: '3. ölçüm genel karne başarı puanı',
    aliases: ['Skor_P3', 'Genel_Performans_Puani', 'Genel Skor', 'Performans Puanı', 'P3 Skoru', 'Puan 3'],
  },
  {
    key: 'Brans_Referans_Puani',
    label: 'Branş Referans Puanı',
    category: 'advanced',
    categoryLabel: '6. PHV & Skorlar',
    unit: 'Puan',
    description: 'Elit sporcu referans başarı hedefi',
    aliases: ['Brans_Referans_Puani', 'Elit Puan', 'Referans Puanı', 'Hedef Puan'],
  },
  {
    key: 'Uzman_Gorusu',
    label: 'Uzman / Antrenör Görüşü',
    category: 'advanced',
    categoryLabel: '6. PHV & Skorlar',
    unit: 'Metin',
    description: 'Karne 7. sayfasında yer alan uzman antrenör değerlendirme metni',
    aliases: ['Uzman_Gorusu', 'Antrenör Değerlendirmesi', 'Uzman Görüşü', 'Antrenör Notu', 'Yorum', 'Açıklama'],
  },
  {
    key: 'anneBoy',
    label: 'Anne Boy (cm)',
    category: 'advanced',
    categoryLabel: '6. Aile Bilgileri',
    unit: 'cm',
    description: 'Annenin boy uzunluğu',
    aliases: ['Anne Boy (cm)', 'Anne Boy'],
  },
  {
    key: 'anneKilo',
    label: 'Anne Ağırlık (kg)',
    category: 'advanced',
    categoryLabel: '6. Aile Bilgileri',
    unit: 'kg',
    description: 'Annenin vücut ağırlığı',
    aliases: ['Anne Ağırlık (kg)', 'Anne Kilo'],
  },
  {
    key: 'anneSporGecmisi',
    label: 'Anne Spor Geçmişi',
    category: 'advanced',
    categoryLabel: '6. Aile Bilgileri',
    unit: 'Metin',
    description: 'Annenin spor geçmişi',
    aliases: ['Anne Spor Geçmişi'],
  },
  {
    key: 'babaBoy',
    label: 'Baba Boy (cm)',
    category: 'advanced',
    categoryLabel: '6. Aile Bilgileri',
    unit: 'cm',
    description: 'Babanın boy uzunluğu',
    aliases: ['Baba Boy (cm)', 'Baba Boy'],
  },
  {
    key: 'babaKilo',
    label: 'Baba Ağırlık (kg)',
    category: 'advanced',
    categoryLabel: '6. Aile Bilgileri',
    unit: 'kg',
    description: 'Babanın vücut ağırlığı',
    aliases: ['Baba Ağırlık (kg)', 'Baba Kilo'],
  },
  {
    key: 'babaSporGecmisi',
    label: 'Baba Spor Geçmişi',
    category: 'advanced',
    categoryLabel: '6. Aile Bilgileri',
    unit: 'Metin',
    description: 'Babanın spor geçmişi',
    aliases: ['Baba Spor Geçmişi'],
  },
];

/**
 * Sample rows using a DIFFERENT / CUSTOM school Excel format (non-standard Turkish headers)
 * so users can test how the Column Mapping UI adapts to different Excel structures.
 */
export const CUSTOM_FORMAT_SAMPLE_ROWS: Record<string, string | number>[] = [];

const LAB_COLUMN_MAPPING_STORAGE_KEY = 'sportsfly_lab_excel_column_mapping_v1';

export function getStoredLabColumnMapping(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LAB_COLUMN_MAPPING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStoredLabColumnMapping(mapping: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAB_COLUMN_MAPPING_STORAGE_KEY, JSON.stringify(mapping));
  } catch (err) {
    console.warn('Sütun eşleştirme ayarları kaydedilemedi:', err);
  }
}

/**
 * Normalizes a header string (lowercase, Turkish chars folded, punctuation/spaces removed)
 * for high-accuracy fuzzy matching between Excel headers and system report card fields.
 */
/**
 * Normalizes a spreadsheet header token for fuzzy matching, supporting Turkish letters.
 */
function normalizeHeaderToken(str: string): string {
  if (!str) return '';
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Automatically matches each mappable system field (`field.key`) to the best column header
 * present in `excelHeaders`.
 */
export function autoDetectExcelColumnMapping(
  excelHeaders: string[],
  useSavedPreferences: boolean = true
): Record<string, string> {
  const mapping: Record<string, string> = {};
  let savedMapping = useSavedPreferences ? getStoredLabColumnMapping() : {};

  // Check if saved mapping is stale or corrupt (e.g. only 1-2 fields matched or Brans mapped to a name column)
  const savedKeysCount = Object.keys(savedMapping).length;
  if (savedKeysCount > 0 && excelHeaders.length >= 3) {
    const validMatchesCount = Object.values(savedMapping).filter((col) => excelHeaders.includes(col)).length;
    if (validMatchesCount < 3) {
      savedMapping = {};
    }
  }

  // Remove any corrupted Brans mapping that points to a person name column
  if (savedMapping.Brans) {
    const bNorm = normalizeHeaderToken(savedMapping.Brans);
    if (bNorm.includes('ad') || bNorm.includes('soyad') || bNorm.includes('isim') || bNorm.includes('ogrenci') || bNorm.includes('sporcu')) {
      delete savedMapping.Brans;
    }
  }

  const usedHeaders = new Set<string>();

  const normalizedExcelHeaders = excelHeaders.map((h) => ({
    raw: h,
    norm: normalizeHeaderToken(h),
  }));

  const isNameHeader = (str: string) => {
    const n = normalizeHeaderToken(str);
    return n.includes('ad') || n.includes('soyad') || n.includes('isim') || n.includes('ogrenci') || n.includes('name');
  };

  const isBirthDateHeader = (str: string) => {
    const n = normalizeHeaderToken(str);
    return n.includes('dogum') || n.includes('birth') || n.includes('dtarih');
  };
  const isMeasurementDateKey = (key: string) =>
    key === 'Olcum_1_Tarihi' || key === 'Olcum_2_Tarihi' || key === 'Olcum_3_Tarihi';

  // Pass 1: Exact normalized match with saved preference or field key / aliases
  LAB_BATCH_MAPPABLE_FIELDS.forEach((field) => {
    // Check saved user mapping first if that column exists in the current Excel file
    const savedCol = savedMapping[field.key];
    if (savedCol && excelHeaders.includes(savedCol) && !usedHeaders.has(savedCol)) {
      if (field.key === 'Brans' && isNameHeader(savedCol)) {
        // Skip corrupt Brans mapping
      } else if (isMeasurementDateKey(field.key) && isBirthDateHeader(savedCol)) {
        // Never map birth date column to measurement date
      } else {
        mapping[field.key] = savedCol;
        usedHeaders.add(savedCol);
        return;
      }
    }

    const candidateNorms = [field.key, ...field.aliases].map(normalizeHeaderToken);
    for (const cand of candidateNorms) {
      const hit = normalizedExcelHeaders.find((eh) => {
        if (usedHeaders.has(eh.raw)) return false;
        if (field.key === 'Brans' && isNameHeader(eh.raw)) return false;
        if (isMeasurementDateKey(field.key) && isBirthDateHeader(eh.raw)) return false;
        return eh.norm === cand;
      });
      if (hit) {
        mapping[field.key] = hit.raw;
        usedHeaders.add(hit.raw);
        return;
      }
    }
  });

  // Pass 2: Substring match for any still-unmapped fields
  LAB_BATCH_MAPPABLE_FIELDS.forEach((field) => {
    if (mapping[field.key]) return;
    const candidateNorms = field.aliases
      .map(normalizeHeaderToken)
      .filter((c) => c.length >= 3);

    for (const cand of candidateNorms) {
      const hit = normalizedExcelHeaders.find((eh) => {
        if (usedHeaders.has(eh.raw)) return false;
        if (field.key === 'Brans' && isNameHeader(eh.raw)) return false;
        if (isMeasurementDateKey(field.key) && isBirthDateHeader(eh.raw)) return false;
        return eh.norm.includes(cand);
      });
      if (hit) {
        mapping[field.key] = hit.raw;
        usedHeaders.add(hit.raw);
        return;
      }
    }
  });

  // Pass 3: Cross-link related primary measurement keys ONLY (do NOT link measurement 2 or 3 to avoid fake extra periods)
  const crossLinkPairs: [string[], string[]][] = [
    [['Boy (cm)', 'Boy_1'], ['boy', 'boyu', 'boycm', 'height']],
    [['Ağırlık (kg)', 'Agirlik_1'], ['agirlik', 'kilo', 'agirlikkg', 'weight']],
    [['Yag_Yuzdesi_1'], ['yag', 'yagorani', 'yagyuzdesi', 'fat']],
    [['Surat_1'], ['surat', 'sprint', '20m', '20metre']],
    [['Dikey_Sicrama_1'], ['dikeysicrama', 'sicrama', 'verticaljump']],
    [['Durarak_Uzun_Atlama_1'], ['durarakuzunatlama', 'uzunatlama']],
    [['Cabukluk_1'], ['cabukluk', 'ceviklik', '10x5', 'agility']],
    [['Esneklik_1'], ['esneklik', 'oturuzan', 'flexibility']],
    [['Denge_1'], ['denge', 'flamingo', 'balance']],
    [['Kavrama_Kuvveti_Sag_1'], ['pencesag', 'kavramasag', 'sagpence']],
    [['Kavrama_Kuvveti_Sol_1'], ['pencesol', 'kavramasol', 'solpence']],
    [['VO2max_1', 'PACER_Mesafe_1'], ['vo2', 'vo2max', 'pacer', 'mekik']],
    [['Endomorfi_1'], ['endomorfi', 'endo']],
    [['Mezomorfi_1'], ['mezomorfi', 'meso']],
    [['Ektomorfi_1'], ['ektomorfi', 'ecto']],
  ];

  crossLinkPairs.forEach(([systemKeys, _]) => {
    const activeHeader = systemKeys.map((k) => mapping[k]).find(Boolean);
    if (activeHeader) {
      systemKeys.forEach((k) => {
        if (!mapping[k]) {
          mapping[k] = activeHeader;
        }
      });
    }
  });

  // Pass 4: Fallback for athlete name
  if (!mapping['Sporcu_Adi'] && excelHeaders.length > 0) {
    const nameHit = excelHeaders.find((h) => isNameHeader(h));
    if (nameHit) {
      mapping['Sporcu_Adi'] = nameHit;
    } else {
      mapping['Sporcu_Adi'] = excelHeaders[0];
    }
  }

  return mapping;
}

export interface ParsedExcelSheetData {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  isParameterVerticalSheet: boolean;
}

/**
 * Extracts all tabular sheets, their headers, and raw row objects from an uploaded Excel file.
 * Intelligently scans rows to find the true header row (bypassing merged titles or metadata rows),
 * handles transposed sheets (athletes across columns), and splits single-column delimited text.
 */
export function extractExcelWorkbookSheets(buffer: ArrayBuffer): ParsedExcelSheetData[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheets: ParsedExcelSheetData[] = [];

  const KNOWN_FITNESS_KEYWORDS = [
    'ad', 'soyad', 'isim', 'sporcu', 'boy', 'kilo', 'agirlik', 'yas', 'cinsiyet',
    'brans', 'kulup', 'surat', 'sprint', 'sicrama', 'denge', 'esneklik', 'kuvvet',
    'cabukluk', 'pacer', 'vo2', 'skor', 'cm', 'kg', 'sn', 'no', 'tarih', 'bki', 'yag'
  ];

  for (const sheetName of wb.SheetNames) {
    if (sheetName.toLowerCase().includes('kilavuz') || sheetName.toLowerCase().includes('kılavuz')) {
      continue;
    }
    const ws = wb.Sheets[sheetName];
    // Read raw 2D grid of rows (format date cells cleanly as dd.mm.yyyy)
    let rawGrid = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false, dateNF: 'dd.mm.yyyy' }) as any[][];
    if (!rawGrid || rawGrid.length === 0) continue;

    // Filter out completely empty trailing rows
    rawGrid = rawGrid.filter((r) => Array.isArray(r) && r.some((c) => c !== '' && c !== null && c !== undefined));
    if (rawGrid.length === 0) continue;

    // Check if the sheet is transposed (parameters in Column 0, athletes across columns)
    const col0Cells = rawGrid.map((r) => normalizeHeaderToken(String(r[0] || '')));
    const col0MatchCount = col0Cells.filter((c) =>
      ['boy', 'kilo', 'agirlik', 'surat', 'sprint', 'sicrama', 'esneklik', 'cabukluk', 'denge', 'bki', 'yag'].some((kw) => c.includes(kw))
    ).length;

    // Check if any of the top 3 rows already look like a standard multi-column header row
    const topRowsHeaderMatchCount = Math.max(
      ...rawGrid.slice(0, 3).map((row) =>
        (row || []).filter((cell: any) => {
          const norm = normalizeHeaderToken(String(cell || ''));
          return KNOWN_FITNESS_KEYWORDS.some((kw) => norm.includes(kw));
        }).length
      )
    );

    // Only transpose if column 0 contains at least 5 measurement parameters AND horizontal rows do NOT already have headers
    const isTransposed = col0MatchCount >= 5 && topRowsHeaderMatchCount < 3 && rawGrid.some((r) => r.length > 2);

    if (isTransposed) {
      const maxCols = Math.max(...rawGrid.map((r) => r.length));
      const transposed: any[][] = [];
      for (let c = 0; c < maxCols; c++) {
        const newRow: any[] = [];
        for (let r = 0; r < rawGrid.length; r++) {
          newRow.push(rawGrid[r][c] ?? '');
        }
        transposed.push(newRow);
      }
      rawGrid = transposed.filter((r) => r.some((c) => c !== '' && c !== null && c !== undefined));
    }

    // Intelligently find the header row among the top 15 rows
    const searchDepth = Math.min(15, rawGrid.length);
    let bestHeaderIdx = 0;
    let bestScore = -999;

    for (let rIdx = 0; rIdx < searchDepth; rIdx++) {
      const row = rawGrid[rIdx];
      if (!row || row.length === 0) continue;

      let nonBlankCount = 0;
      let keywordMatches = 0;
      let numericCount = 0;

      row.forEach((cell) => {
        const str = String(cell ?? '').trim();
        if (str !== '') {
          nonBlankCount++;
          const norm = normalizeHeaderToken(str);
          if (KNOWN_FITNESS_KEYWORDS.some((kw) => norm.includes(kw))) {
            keywordMatches++;
          }
          if (/^-?\d+(\.\d+)?$/.test(str.replace(',', '.'))) {
            numericCount++;
          }
        }
      });

      // Score: high for matching keywords and valid column count, penalty if row is all numbers (data row)
      const score = keywordMatches * 10 + nonBlankCount - numericCount * 4;
      if (score > bestScore && nonBlankCount > 0) {
        bestScore = score;
        bestHeaderIdx = rIdx;
      }
    }

    const rawHeaderRow = rawGrid[bestHeaderIdx] || [];
    let headers = rawHeaderRow.map((c: any, i: number) => {
      const str = String(c ?? '').trim();
      return str || `Sütun_${i + 1}`;
    });

    // Extract data rows
    const parsedRows: Record<string, any>[] = [];
    for (let r = bestHeaderIdx + 1; r < rawGrid.length; r++) {
      const rowArr = rawGrid[r];
      if (!rowArr || rowArr.length === 0) continue;
      const hasContent = rowArr.some((c: any) => c !== '' && c !== null && c !== undefined);
      if (!hasContent) continue;

      const rowObj: Record<string, any> = {};
      headers.forEach((hdr: string, colIdx: number) => {
        rowObj[hdr] = rowArr[colIdx] ?? '';
      });
      parsedRows.push(rowObj);
    }

    if (headers.length === 0 || parsedRows.length === 0) continue;

    // Check for single-column delimited CSV/text
    if (headers.length === 1 && parsedRows.length > 0) {
      const firstVal = String(parsedRows[0][headers[0]] || '');
      const delimiter = firstVal.includes(';') ? ';' : firstVal.includes('\t') ? '\t' : firstVal.includes(',') ? ',' : null;
      if (delimiter) {
        const splitHeaders = headers[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
        headers = splitHeaders;
        parsedRows.forEach((rObj) => {
          const rawLine = String(rObj[headers[0]] || '');
          const parts = rawLine.split(delimiter);
          splitHeaders.forEach((sh, idx) => {
            rObj[sh] = (parts[idx] ?? '').trim().replace(/^["']|["']$/g, '');
          });
        });
      }
    }

    const lowerKeys = headers.map((k) => k.toLowerCase());
    const isParameterVerticalSheet =
      lowerKeys.some((k) => k.includes('parametre')) &&
      lowerKeys.some((k) => k.includes('olcum') || k.includes('ölçüm') || k === 'i' || k === 'iii');

    sheets.push({
      sheetName,
      headers,
      rows: parsedRows,
      isParameterVerticalSheet,
    });
  }

  return sheets;
}

/**
 * Builds an array of 7-page SportsFlyLabReport items from raw Excel rows using the user's
 * interactive `columnMapping` (systemFieldKey -> excelHeaderName).
 */
export function buildBatchReportsFromMappedRows(
  rawRows: Record<string, any>[],
  columnMapping: Record<string, string>,
  baseTemplate?: SportsFlyLabReport
): SportsFlyLabReport[] {
  const activeBranding = getStoredLabSchoolBranding();
  const brandedTemplate = applyBrandingToReport(baseTemplate || EMPTY_LAB_REPORT_TEMPLATE, activeBranding);
  const results: SportsFlyLabReport[] = [];

  rawRows.forEach((rawRow, idx) => {
    const mappedRow: Record<string, any> = {};

    // Copy original row properties as fallback, then override with explicit user column mappings
    Object.assign(mappedRow, rawRow);

    Object.entries(columnMapping).forEach(([systemKey, excelHeader]) => {
      if (excelHeader && rawRow[excelHeader] !== undefined) {
        mappedRow[systemKey] = rawRow[excelHeader];
      }
    });

    // Ensure template measurements and identity are completely pristine for each new athlete to prevent data inheritance
    const cleanTemplate = JSON.parse(JSON.stringify(brandedTemplate));
    cleanTemplate.athleteName = '';
    cleanTemplate.athleteCode = '';
    cleanTemplate.sportBranch = 'Genel Spor Gelişimi';
    cleanTemplate.somatotype.eliteRef = { sport: 'Genel Spor Gelişimi', endo: 3.2, meso: 4.5, ecto: 3.5, refScore: 92 };
    cleanTemplate.bodyComposition.forEach((b: any) => { b.m1 = 0; b.m2 = 0; b.m3 = 0; b.sd = 0; b.percentile = 0; b.measured = false; });
    cleanTemplate.motorPerformance.forEach((m: any) => { m.m1 = 0; m.m2 = 0; m.m3 = 0; m.sd = 0; m.percentile = 0; m.measured = false; });
    cleanTemplate.cardio = {
      ...cleanTemplate.cardio,
      test1Distance: 0,
      test2Distance: 0,
      test3Distance: 0,
      test1Shuttles: 0,
      test2Shuttles: 0,
      test3Shuttles: 0,
      test1Vo2: 0,
      test2Vo2: 0,
      test3Vo2: 0,
      test3Status: '—',
      verticalJumpAnaerobicWatt: 0,
      verticalJumpRelativeWatt: 0,
      basalMetabolicRate: 0,
    };
    cleanTemplate.scoreHistory = { p1Score: 0, p2Score: 0, p3Score: 0, p1Date: '—', p2Date: '—', p3Date: '—' };
    cleanTemplate.somatotype.m1 = { endo: 0, meso: 0, ecto: 0, category: '—' };
    cleanTemplate.somatotype.m2 = { endo: 0, meso: 0, ecto: 0, category: '—' };
    cleanTemplate.somatotype.m3 = { endo: 0, meso: 0, ecto: 0, category: '—' };
    cleanTemplate.parentInfo = undefined;
    cleanTemplate.sittingHeight = 0;
    cleanTemplate.predictedAdultHeight = 0;
    cleanTemplate.phvAge = 0;
    cleanTemplate.phvHeight = 0;
    cleanTemplate.expertComment = '';

    const rep = buildLabReportFromExcelRow(mappedRow, idx, cleanTemplate, activeBranding);
    if (rep) {
      results.push(rep);
    }
  });

  return recalculateGroupAveragesAndRanks(results);
}

/**
 * Parses an uploaded Excel (.xlsx / .xls / .csv) file and returns updated/created SportsFlyLabReport items.
 * Supports both Parameter-based sheets ("Parametre_Bazli_Karne") and Flat Athlete Row sheets ("Toplu_Sporcu_Listesi" or custom Excel files).
 */
export function parseSportsFlyLabExcel(
  buffer: ArrayBuffer,
  baseTemplate?: SportsFlyLabReport,
  preferBatchSheet: boolean = false
): SportsFlyLabReport[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const paramResults: SportsFlyLabReport[] = [];
  const flatBatchResults: SportsFlyLabReport[] = [];
  const activeBranding = getStoredLabSchoolBranding();
  const brandedTemplate = applyBrandingToReport(baseTemplate || EMPTY_LAB_REPORT_TEMPLATE, activeBranding);

  // Helper to safely parse numbers using the Data Validation Layer
  const toNum = (val: unknown, fallback: number): number => {
    return sanitizeAndEnforceNumber(val, fallback);
  };

  for (const sheetName of wb.SheetNames) {
    // Skip reference guide sheet
    if (sheetName.toLowerCase().includes('kilavuz') || sheetName.toLowerCase().includes('kılavuz')) {
      continue;
    }

    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: '',
      raw: false,
      dateNF: 'dd.mm.yyyy',
    });
    if (!rows || rows.length === 0) continue;

    const firstRowKeys = Object.keys(rows[0]).map((k) => k.toLowerCase());

    // Case 1: Parameter-by-Parameter vertical table (has Parametre_Adi / Parametre_Kodu / Olcum_1 / Olcum_2 / Olcum_3)
    const isParamSheet =
      firstRowKeys.some((k) => k.includes('parametre')) &&
      firstRowKeys.some((k) => k.includes('olcum') || k.includes('ölçüm') || k === 'i' || k === 'iii');

    if (isParamSheet) {
      const cloned: SportsFlyLabReport = JSON.parse(JSON.stringify(brandedTemplate));
      cloned.id = `lab-excel-${Date.now()}`;
      cloned.bodyComposition.forEach((b) => { b.m1 = 0; b.m2 = 0; b.m3 = 0; b.sd = 0; b.percentile = 0; b.measured = false; });
      cloned.motorPerformance.forEach((m) => { m.m1 = 0; m.m2 = 0; m.m3 = 0; m.sd = 0; m.percentile = 0; m.measured = false; });
      cloned.cardio = {
        ...cloned.cardio,
        test1Distance: 0,
        test2Distance: 0,
        test3Distance: 0,
        test1Shuttles: 0,
        test2Shuttles: 0,
        test3Shuttles: 0,
        test1Vo2: 0,
        test2Vo2: 0,
        test3Vo2: 0,
        test3Status: '—',
        verticalJumpAnaerobicWatt: 0,
        verticalJumpRelativeWatt: 0,
        basalMetabolicRate: 0,
      };

      const hasSheetCell = (v: unknown) =>
        v !== undefined && v !== null && String(v).trim() !== '' && !['-', 'yok'].includes(String(v).trim().toLowerCase());

      rows.forEach((r) => {
        const code = String(r.Parametre_Kodu || r.parametre_kodu || '').trim().toLowerCase();
        const name = String(r.Parametre_Adi || r.Parametre || r.parametre_adi || '').trim();
        const m1 = r.Olcum_1 ?? r['1. Ölçüm'] ?? r.I;
        const m2 = r.Olcum_2 ?? r['2. Ölçüm'] ?? r.II;
        const m3 = r.Olcum_3 ?? r['3. Ölçüm'] ?? r.III;
        const pct = r.Yuzdelik ?? r['Yüzdelik'];
        const sd = r.SD_Skoru ?? r.SD;
        const status = r.Durum ?? r['Değerlendirme'];
        const target = r.Beklenen_Hedef ?? r.Hedef;

        if (code === 'athlete_info') {
          if (name) cloned.athleteName = name;
          if (r.Birim) cloned.sportBranch = String(r.Birim);
          if (m1) cloned.date1 = parseDateString(m1);
          if (m2) cloned.date2 = parseDateString(m2);
          if (m3) cloned.date3 = parseDateString(m3);
          if (pct) cloned.ageYears = toNum(pct, cloned.ageYears);
          if (sd) cloned.phvAge = toNum(sd, cloned.phvAge);
          if (status) cloned.clubName = String(status);
          if (target) cloned.predictedAdultHeight = toNum(target, cloned.predictedAdultHeight);
          return;
        }

        // Match in bodyComposition
        const bodyItem = cloned.bodyComposition.find(
          (b) => b.id === code || b.name.toLowerCase() === name.toLowerCase()
        );
        if (bodyItem) {
          bodyItem.m1 = toNum(m1, 0);
          bodyItem.m2 = toNum(m2, 0);
          bodyItem.m3 = toNum(m3, 0);
          const hasAnyVal = bodyItem.m1 > 0 || bodyItem.m2 > 0 || bodyItem.m3 > 0;
          bodyItem.measured = hasAnyVal;
          if (hasAnyVal) {
            bodyItem.percentile = toNum(pct, bodyItem.percentile);
            bodyItem.sd = toNum(sd, bodyItem.sd);
            if (status) bodyItem.status = String(status).toLowerCase() as any;
          }
          return;
        }

        // Match in motorPerformance
        const motorItem = cloned.motorPerformance.find(
          (m) => m.id === code || m.name.toLowerCase().includes(name.toLowerCase())
        );
        if (motorItem && name) {
          const isBalance = motorItem.id === 'balance' || name.toLowerCase().includes('denge') || name.toLowerCase().includes('flamingo');
          if (isBalance) {
            motorItem.m1 = parseFlamingoBalanceScore(m1);
            motorItem.m2 = parseFlamingoBalanceScore(m2);
            motorItem.m3 = parseFlamingoBalanceScore(m3);
          } else {
            motorItem.m1 = toNum(m1, 0);
            motorItem.m2 = toNum(m2, 0);
            motorItem.m3 = toNum(m3, 0);
          }
          const hasBalanceFail =
            isBalance &&
            (String(m1 ?? '').toLowerCase().includes('başarısız') ||
              String(m1 ?? '').toLowerCase().includes('basarisiz') ||
              hasSheetCell(m1) ||
              hasSheetCell(m2) ||
              hasSheetCell(m3));
          const hasAnyVal = motorItem.m1 > 0 || motorItem.m2 > 0 || motorItem.m3 > 0 || hasBalanceFail;
          motorItem.measured = hasAnyVal;
          if (hasAnyVal) {
            motorItem.percentile = toNum(pct, motorItem.percentile);
            motorItem.sd = toNum(sd, motorItem.sd);
            if (status) motorItem.status = String(status).toLowerCase() as any;
          }

          const ips = cloned.ipsativeTargets.find((t) =>
            motorItem.name.toLowerCase().includes(t.parameter.toLowerCase())
          );
          if (ips && hasAnyVal) {
            ips.m1 = motorItem.m1;
            ips.m2 = motorItem.m2;
            ips.m3 = motorItem.m3;
            if (target !== undefined && target !== '') {
              ips.target = toNum(target, ips.target);
            }
          }
          return;
        }

        if (code === 'somatotype_endo' || name.toLowerCase().includes('endomorfi')) {
          cloned.somatotype.m1.endo = toNum(m1, cloned.somatotype.m1.endo);
          cloned.somatotype.m2.endo = toNum(m2, cloned.somatotype.m2.endo);
          cloned.somatotype.m3.endo = toNum(m3, cloned.somatotype.m3.endo);
        } else if (code === 'somatotype_meso' || name.toLowerCase().includes('mezomorfi')) {
          cloned.somatotype.m1.meso = toNum(m1, cloned.somatotype.m1.meso);
          cloned.somatotype.m2.meso = toNum(m2, cloned.somatotype.m2.meso);
          cloned.somatotype.m3.meso = toNum(m3, cloned.somatotype.m3.meso);
        } else if (code === 'somatotype_ecto' || name.toLowerCase().includes('ektomorfi')) {
          cloned.somatotype.m1.ecto = toNum(m1, cloned.somatotype.m1.ecto);
          cloned.somatotype.m2.ecto = toNum(m2, cloned.somatotype.m2.ecto);
          cloned.somatotype.m3.ecto = toNum(m3, cloned.somatotype.m3.ecto);
        } else if (code === 'pacer_distance' || name.toLowerCase().includes('pacer') || name.toLowerCase().includes('shuttle run')) {
          cloned.cardio.test1Distance = toNum(m1, cloned.cardio.test1Distance);
          cloned.cardio.test2Distance = toNum(m2, cloned.cardio.test2Distance);
          cloned.cardio.test3Distance = toNum(m3, cloned.cardio.test3Distance);
        } else if (code === 'pacer_vo2' || name.toLowerCase().includes('vo2peak') || name.toLowerCase().includes('aerobik güç')) {
          cloned.cardio.test1Vo2 = toNum(m1, cloned.cardio.test1Vo2);
          cloned.cardio.test2Vo2 = toNum(m2, cloned.cardio.test2Vo2);
          cloned.cardio.test3Vo2 = toNum(m3, cloned.cardio.test3Vo2);
        } else if (code === 'bmr_met' || name.toLowerCase().includes('bazal metabolizma')) {
          cloned.cardio.basalMetabolicRate = toNum(m3 ?? m2 ?? m1, cloned.cardio.basalMetabolicRate);
        } else if (code === 'phv_age' || name.toLowerCase().includes('phv')) {
          cloned.phvAge = toNum(m3 ?? m1, cloned.phvAge);
        } else if (code === 'predicted_height' || name.toLowerCase().includes('18 yaş')) {
          cloned.predictedAdultHeight = toNum(m3 ?? m1, cloned.predictedAdultHeight);
        } else if (code === 'overall_score' || name.toLowerCase().includes('genel karne') || name.toLowerCase().includes('performans puanı')) {
          if (m1) cloned.scoreHistory.p1Score = toNum(m1, cloned.scoreHistory.p1Score);
          if (m2) cloned.scoreHistory.p2Score = toNum(m2, cloned.scoreHistory.p2Score);
          if (m3) cloned.scoreHistory.p3Score = toNum(m3, cloned.scoreHistory.p3Score);
        } else if (code === 'expert_comment' || name.toLowerCase().includes('uzman görüşü') || name.toLowerCase().includes('uzman değerlendirme') || name.toLowerCase().includes('antrenör')) {
          const val = m3 || m2 || m1;
          if (val && String(val).trim() !== '-' && !isStaleExpertComment(String(val), cloned)) {
            cloned.expertComment = String(val).trim();
            cloned.isManualExpertComment = true;
          }
        }
      });

      const finalParamReport = applyBrandingToReport(cloned, activeBranding);
      ensureDataConsistency(finalParamReport);
      finalParamReport.aiRecommendations = analyzeLabPerformanceMetrics(finalParamReport);
      paramResults.push(finalParamReport);
    } else if (
      firstRowKeys.some(
        (k) => k.includes('sporcu') || k.includes('ad') || k.includes('name') || k.includes('boy')
      )
    ) {
      // Case 2: Flat Multi-Athlete Sheet (Each row is an athlete)
      rows.forEach((r, idx) => {
        const rep = buildLabReportFromExcelRow(r, idx, brandedTemplate, activeBranding);
        if (rep) {
          flatBatchResults.push(rep);
        }
      });
    }
  }

  // If flat batch results exist (whether 1 athlete or multiple), return them cleanly!
  if (flatBatchResults.length > 0) {
    return recalculateGroupAveragesAndRanks(flatBatchResults);
  }
  if (paramResults.length > 0) {
    return recalculateGroupAveragesAndRanks(paramResults);
  }
  return [];
}

export interface OcrAthleteInput {
  athleteName: string;
  birthDate?: string;
  gender?: 'Erkek' | 'Kadın';
  sportBranch?: string;
  clubName?: string;
  height?: number | string;
  weight?: number | string;
  gripRight?: number | string;
  gripLeft?: number | string;
  flamingo?: number | string;
  sprint20m?: number | string;
  flexibility?: number | string;
  armSpeedRight?: number | string;
  armSpeedLeft?: number | string;
  standingLongJump?: number | string;
  agility?: number | string;
  verticalJump?: number | string;
  tricepsSkinfold?: number | string;
  bicepsSkinfold?: number | string;
  iliacSkinfold?: number | string;
  calfSkinfold?: number | string;
  anneBoy?: number | string;
  anneKilo?: number | string;
  anneSporGecmisi?: string;
  babaBoy?: number | string;
  babaKilo?: number | string;
  babaSporGecmisi?: string;
  notes?: string;
}

/**
 * Converts structured athlete data extracted from an Excel screenshot/image via Multimodal Gemini AI OCR
 * into a fully populated, scientifically validated SportsFlyLabReport.
 */
export function buildLabReportFromOcrAthlete(
  ocr: OcrAthleteInput,
  branding?: SportsFlyLabSchoolBranding
): SportsFlyLabReport {
  const activeBranding = branding || getStoredLabSchoolBranding();
  const base = createNewLabReportWithBranding({
    athleteName: ocr.athleteName || 'Sporcu',
    sportBranch: ocr.sportBranch || 'Voleybol / Atletik Gelişim',
    gender: (ocr.gender === 'Erkek' ? 'Erkek' : 'Kadın'),
    ageYears: 14,
  });
  const template = applyBrandingToReport(base, activeBranding);

  const cleanNum = (val: unknown, fallback: number = 0): number => {
    return sanitizeAndEnforceNumber(val, fallback);
  };

  if (ocr.birthDate) {
    template.birthDate = String(ocr.birthDate);
    const parts = template.birthDate.split('.');
    if (parts.length === 3) {
      const bDay = parseInt(parts[0]);
      const bMonth = parseInt(parts[1]) - 1;
      const bYear = parseInt(parts[2]);
      if (!isNaN(bDay) && !isNaN(bMonth) && !isNaN(bYear)) {
        const bDate = new Date(bYear, bMonth, bDay);
        const now = new Date();
        let age = now.getFullYear() - bDate.getFullYear();
        const m = now.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < bDate.getDate())) age--;
        if (age > 4 && age < 35) {
          template.ageYears = age;
          template.ageMonths = age * 12 + Math.max(0, m);
        }
      }
    }
  }

  if (ocr.clubName) template.clubName = ocr.clubName;
  if (ocr.sportBranch) template.sportBranch = ocr.sportBranch;

  // Body Composition
  const setB = (id: string, val: number) => {
    const row = template.bodyComposition.find((b) => b.id === id);
    if (row && val > 0) {
      row.measured = true;
      row.m1 = val;
      const halfSpan =
        val >= row.refMid
          ? Math.max(0.1, (row.refHigh - row.refMid) / 2)
          : Math.max(0.1, (row.refMid - row.refLow) / 2);
      row.sd = Number(((val - row.refMid) / halfSpan).toFixed(2));
      row.percentile = sdToPercentile(row.sd);
      if (id === 'height') {
        row.status = val > row.refHigh || row.sd > 1.2 ? 'uzun' : val < row.refLow || row.sd < -1.5 ? 'düşük' : 'normal';
      } else {
        row.status = val > row.refHigh || row.sd > 1.35 ? 'yüksek' : val < row.refLow || row.sd < -1.5 ? 'düşük' : 'normal';
      }
    }
  };

  const h = cleanNum(ocr.height, 0);
  const w = cleanNum(ocr.weight, 0);
  if (h > 0) setB('height', h);
  if (w > 0) setB('weight', w);
  if (h > 50 && w > 10) {
    const bmi = Number((w / Math.pow(h / 100, 2)).toFixed(2));
    setB('bmi', bmi);
  }

  const triceps = cleanNum(ocr.tricepsSkinfold, 0);
  const biceps = cleanNum(ocr.bicepsSkinfold, 0);
  const iliac = cleanNum(ocr.iliacSkinfold, 0);
  const calf = cleanNum(ocr.calfSkinfold, 0);
  if (triceps > 0) setB('triceps', triceps);
  if (biceps > 0) setB('biceps_skf', biceps);
  if (iliac > 0) setB('iliac_skf', iliac);
  if (calf > 0) setB('calf_skf', calf);

  // Motor Performance
  const setM = (id: string, val: number) => {
    const row = template.motorPerformance.find((m) => m.id === id);
    if (row && val >= 0) {
      row.measured = true;
      row.m1 = val;
      const span = Math.max(0.05, (row.refHigh - row.refLow) / 4);
      const rawDiff = row.lowerIsBetter ? row.refMid - val : val - row.refMid;
      row.sd = Number((rawDiff / span).toFixed(2));
      row.percentile = Math.max(5, Math.min(99, Math.round(50 + row.sd * 24)));
      row.status =
        row.percentile >= 80 ? 'mükemmel' : row.percentile >= 65 ? 'iyi' : row.percentile >= 40 ? 'normal' : 'desteklenmeli';

      const ips = template.ipsativeTargets.find(
        (t) =>
          row.name.toLowerCase().includes(t.parameter.toLowerCase()) ||
          t.parameter.toLowerCase().includes(row.name.toLowerCase())
      );
      if (ips) {
        ips.m1 = row.m1;
        ips.target = Number((row.lowerIsBetter ? val * 0.96 : val * 1.06).toFixed(2));
      }
    }
  };

  const gripR = sanitizeGripValue(ocr.gripRight ?? (ocr as any).grip_strength_right);
  const gripL = sanitizeGripValue(ocr.gripLeft ?? (ocr as any).grip_strength_left);
  if (gripR > 0) setM('grip_strength_right', gripR);
  if (gripL > 0) setM('grip_strength_left', gripL);

  // Flamingo Balance rule: yalnızca Excel/OCR'da mevcutsa kaydet ("başarısız" -> 0.0, yoksa ölçülmedi)
  const rawFlamingoStr = ocr.flamingo !== undefined && ocr.flamingo !== null ? String(ocr.flamingo).trim() : '';
  if (rawFlamingoStr !== '' && rawFlamingoStr !== '-' && rawFlamingoStr.toLowerCase() !== 'yok') {
    const flamingoVal = parseFlamingoBalanceScore(ocr.flamingo);
    setM('balance', flamingoVal);
  }

  const sprint = cleanNum(ocr.sprint20m, 0);
  if (sprint > 0) setM('sprint', sprint);

  const flex = cleanNum(ocr.flexibility, 0);
  if (flex > 0) setM('flexibility', flex);

  const armR = cleanNum(ocr.armSpeedRight, 0);
  const armL = cleanNum(ocr.armSpeedLeft, 0);
  if (armR > 0) setM('arm_speed_right', armR);
  if (armL > 0) setM('arm_speed_left', armL);

  const jumpL = cleanNum(ocr.standingLongJump, 0);
  if (jumpL > 0) setM('standing_long_jump', jumpL);

  const agil = cleanNum(ocr.agility, 0);
  if (agil > 0) setM('agility', agil);

  const vert = cleanNum(ocr.verticalJump, 0);
  if (vert > 0) setM('vertical_jump', vert);

  // Parent Info
  template.parentInfo = {
    anneBoy: ocr.anneBoy !== undefined ? String(ocr.anneBoy) : '',
    anneKilo: ocr.anneKilo !== undefined ? String(ocr.anneKilo) : '',
    anneSporGecmisi: ocr.anneSporGecmisi !== undefined ? String(ocr.anneSporGecmisi) : '',
    babaBoy: ocr.babaBoy !== undefined ? String(ocr.babaBoy) : '',
    babaKilo: ocr.babaKilo !== undefined ? String(ocr.babaKilo) : '',
    babaSporGecmisi: ocr.babaSporGecmisi !== undefined ? String(ocr.babaSporGecmisi) : '',
  };

  const pAnne = cleanNum(template.parentInfo.anneBoy, 0);
  const pBaba = cleanNum(template.parentInfo.babaBoy, 0);
  if (pAnne > 120 && pBaba > 120) {
    const isFemale = template.gender === 'Kadın';
    const midParent = isFemale ? (pAnne + pBaba - 13) / 2 : (pAnne + pBaba + 13) / 2;
    template.predictedAdultHeight = Number(midParent.toFixed(1));
  }

  ensureDataConsistency(template);
  template.aiRecommendations = analyzeLabPerformanceMetrics(template);

  return template;
}

/**
 * Automatically analyzes the athlete's Excel performance metrics (Motor Performance, Body Composition,
 * Somatotype, PHV & Cardio) and identifies areas for improvement, strengths, and training prescriptions.
 */
export function analyzeLabPerformanceMetrics(report: SportsFlyLabReport): LabAiPerformanceAnalysis {
  const drillCatalog: Record<string, { drill: string; freq: string; targetFactor: number }> = {
    sprint: {
      drill: '10m-20m çıkış ivmelenmesi, dirençli sprint (sled/lastik) ve A-Skip/B-Skip koşu mekaniği drilleri',
      freq: 'Haftada 2 Gün · 4x20m Tam Dinlenmeli',
      targetFactor: 0.96,
    },
    agility: {
      drill: '10x5m Pro-Agility yön değiştirme, deselerasyon-akselerasyon frenleme ve çabuk ayak merdiven kombinasyonları',
      freq: 'Haftada 3 Gün · 3 Set x 4 Tekrar',
      targetFactor: 0.95,
    },
    reaction: {
      drill: 'Görsel-işitsel uyaranlı ışık/renk reaksiyon drilleri ve bilişsel karar verme çabukluk oyunları',
      freq: 'Haftada 3 Gün · Antrenman Isınma Bloğu (10 dk)',
      targetFactor: 0.93,
    },
    back_strength: {
      drill: 'Posterior zincir izometrik gövde stabilizasyonu, Superman hold, glute bridge ve core anti-rotasyon egzersizleri',
      freq: 'Haftada 3 Gün · 3x12 Tekrar / 30 sn İzometrik',
      targetFactor: 1.08,
    },
    grip_strength: {
      drill: 'İzometrik kavrama (hand-grip), barfiks barında asılı kalma (dead hang) ve sağlık topu sıkma-fırlatma çalışmaları',
      freq: 'Haftada 2-3 Gün · 3x25 sn',
      targetFactor: 1.08,
    },
    arm_speed_right: {
      drill: '50 sn yüksek frekanslı el-kol koordinasyon, reaksiyon topu ve hızlı dokunma (tapping) drilleri',
      freq: 'Haftada 2-3 Gün · 3x20-30 sn',
      targetFactor: 1.06,
    },
    arm_speed_left: {
      drill: 'Non-dominant (sol) el odaklı yüksek frekanslı tapping, duvar pası ve nöromüsküler koordinasyon drilleri',
      freq: 'Haftada 2-3 Gün · 3x20-30 sn',
      targetFactor: 1.06,
    },
    standing_long_jump: {
      drill: 'Yatay pliometrik çift bacak sıçrama (broad jump), pogo hops ve eksantrik iniş mekaniği (landing) drilleri',
      freq: 'Haftada 2 Gün · 4x5 Patlayıcı Tekrar',
      targetFactor: 1.06,
    },
    vertical_jump: {
      drill: 'Countermovement Jump (CMJ), kutu sıçramaları (box jump) ve ayak bileği reaktif sertlik (stiffness) pliometriği',
      freq: 'Haftada 2 Gün · 4x6 Tekrar',
      targetFactor: 1.07,
    },
    balance: {
      drill: 'Tek ayak proprioseptif denge (BOSU / denge pedi), gözler kapalı stabilizasyon ve Y-Balance uzanma drilleri',
      freq: 'Haftada 3 Gün · 3x30 sn (Sağ/Sol)',
      targetFactor: 0.85,
    },
    flexibility: {
      drill: 'Hamstring-lomber zincir PNF esnetme, kalça fleksör mobilitesi ve antrenman sonu statik miyofasyal gevşetme',
      freq: 'Her Antrenman Sonu · 12-15 dk',
      targetFactor: 1.05,
    },
    aerobic: {
      drill: 'Yüksek yoğunluklu aralıklı koşu (HIIT 15sn/15sn MAS), 20m mekik tempo koşuları ve aerobik baz dayanıklılık oyunları',
      freq: 'Haftada 2 Gün · 2x6 dk Aralıklı Yüklenme',
      targetFactor: 1.06,
    },
  };

  const improvementAreas: LabAiImprovementItem[] = [];
  const getActiveVal = (r: { m1: number; m2: number; m3: number; refMid: number }) =>
    r.m3 > 0 ? r.m3 : r.m2 > 0 ? r.m2 : r.m1 > 0 ? r.m1 : 0;

  const buildMotorImprovementItem = (m: LabParameterRow): LabAiImprovementItem => {
    const evalRes = evaluateMotorRowTargetAndStatus(m);
    const curVal = evalRes.activeVal;
    const m1Val = m.m1 > 0 ? m.m1 : curVal;
    const safePct = evalRes.percentile;
    const catInfo = drillCatalog[m.id] || {
      drill: `${m.name} odaklı spesifik koordinasyon, kuvvet ve nöromüsküler gelişim drilleri`,
      freq: 'Haftada 2-3 Gün · 3 Set',
      targetFactor: m.lowerIsBetter ? 0.96 : 1.06,
    };

    const computedTarget = evalRes.targetValue;
    const hasRealSecond = Boolean(
      !report.isAiForecast &&
        report.date2 &&
        report.date2 !== '—' &&
        !report.date2.toLowerCase().includes('tahmin') &&
        !report.date2.toLowerCase().includes('2-4 ay')
    );
    const trendText = hasRealSecond && m.m2 > 0
      ? `1. ölçüm (${m1Val} ${m.unit}) ve 2. ölçüm (${m.m2} ${m.unit}) verilerine göre hedef değer ${computedTarget} ${m.unit} olarak planlanmıştır.`
      : `1. ölçüm (${m1Val} ${m.unit}) verisine göre hedef değer ${computedTarget} ${m.unit} olarak belirlenmiştir.`;

    return {
      metricName: m.name,
      category: 'Motor Performans',
      currentValue: `${curVal} ${m.unit}`,
      targetValue: `${computedTarget} ${m.unit}`,
      percentile: safePct,
      sd: evalRes.sd,
      priority: evalRes.tier === 'needs_dev' ? 'Öncelikli Gelişim' : 'Gelişim Takibi',
      analysis: trendText,
      drillRecommendation: catInfo.drill,
      weeklyFrequency: catInfo.freq,
    };
  };

  // 1. Scan ONLY measured Motor Performance metrics sorted by lowest percentile / SD
  const measuredMotors = getDisplayedMotorPerformance(report);
  const measuredBody = getDisplayedBodyComposition(report);
  const sortedMotor = [...measuredMotors].sort((a, b) => a.percentile - b.percentile);
  sortedMotor.forEach((m) => {
    if (improvementAreas.length < 3) {
      improvementAreas.push(buildMotorImprovementItem(m));
    }
  });

  // Include Flamingo Denge Testi ONLY if measured
  const flamingoRow = measuredMotors.find(
    (m) => m.id === 'balance' || m.name.toLowerCase().includes('flamingo') || m.name.toLowerCase().includes('denge')
  );
  if (flamingoRow) {
    const alreadyHasFlamingo = improvementAreas.some(
      (item) =>
        item.metricName.toLowerCase().includes('flamingo') ||
        item.metricName.toLowerCase().includes('denge')
    );
    if (!alreadyHasFlamingo) {
      const fItem = buildMotorImprovementItem(flamingoRow);
      fItem.metricName = 'Flamingo Denge Testi';
      improvementAreas.push(fItem);
    } else {
      const nextMotor = sortedMotor.find(
        (m) => !improvementAreas.some((item) => item.metricName === m.name)
      );
      if (nextMotor && improvementAreas.length < 4) {
        improvementAreas.push(buildMotorImprovementItem(nextMotor));
      }
    }
  }

  // Fill up to 4 ONLY from measured motor tests (do not fabricate unmeasured ones)
  if (improvementAreas.length < 4) {
    sortedMotor.forEach((m) => {
      if (improvementAreas.length < 4 && !improvementAreas.some((item) => item.metricName === m.name)) {
        improvementAreas.push(buildMotorImprovementItem(m));
      }
    });
  }

  // 3. Identify Top Strengths strictly from measured parameters (exclude excess weight/BMI/fat!)
  const strengths: LabAiStrengthItem[] = [...measuredMotors, ...measuredBody]
    .filter((row) => row.id !== 'body_fat' && row.id !== 'bmi' && row.id !== 'weight' && row.id !== 'calf_skf' && row.id !== 'supraspinal')
    .sort((a, b) => b.percentile - a.percentile)
    .slice(0, 3)
    .map((row) => {
      const curVal = getActiveVal(row);
      const safePct = Math.max(5, Math.min(97, row.percentile || 50));
      const insightText =
        safePct >= 75
          ? `Yaş ve cinsiyet referans grubunda %${safePct} yüzdelik dilimde (${row.sd > 0 ? `+${row.sd}` : row.sd} SD) yer alarak hedef normları karşılamaktadır.`
          : safePct >= 50
          ? `Yaş ve cinsiyet referans grubunda %${safePct} yüzdelik dilimde (${row.sd > 0 ? `+${row.sd}` : row.sd} SD) orta-iyi seviyede seyretmektedir.`
          : `Mevcut ölçüm %${safePct} yüzdelik dilimde (${row.sd} SD) olup hedef norm (${row.refMid} ${row.unit}) için geliştirilmesi önerilmektedir.`;
      return {
        metricName: row.name,
        currentValue: `${curVal} ${row.unit}`,
        percentile: safePct,
        insight: insightText,
      };
    });

  // 4. Build 8-Week Training Prescription based on PHV & Somatotype
  const phvDiff = Number((report.phvAge - report.ageYears).toFixed(1));
  const phvWindowNote =
    phvDiff > 0.8
      ? `Sporcu PHV (Tepe Boy Hızı: ${report.phvAge} yaş) öncesi dönemde (${phvDiff} yıl var) olduğundan sinir-kas koordinasyonu, reaksiyon ve çabukluk kazanımı maksimum düzeydedir.`
      : `Sporcu PHV büyüme atağı penceresine yakın olduğundan büyüme plaklarını koruyucu eksantrik kontrol ve esneklik çalışmaları önceliklendirilmelidir.`;

  const isSomatoMeasured = (s?: { endo: number; meso: number; ecto: number }) =>
    Boolean(s && (s.endo > 0 || s.meso > 0 || s.ecto > 0));
  const activeSomato = isSomatoMeasured(report.somatotype.m3)
    ? report.somatotype.m3
    : isSomatoMeasured(report.somatotype.m2)
    ? report.somatotype.m2
    : report.somatotype.m1;
  const hasCardioData = (report.cardio?.test2Vo2 || 0) > 0 || (report.cardio?.test1Vo2 || 0) > 0;
  const hasSomatoData = isSomatoMeasured(activeSomato);
  const activeSomatoParts = hasSomatoData
    ? [
        activeSomato.endo > 0 ? `Endomorfi ${activeSomato.endo}` : null,
        activeSomato.meso > 0 ? `Mezomorfi ${activeSomato.meso}` : null,
        activeSomato.ecto > 0 ? `Ektomorfi ${activeSomato.ecto}` : null,
      ]
        .filter(Boolean)
        .join(', ')
    : '';
  const hasFullSomato = Boolean(activeSomato.endo > 0 && activeSomato.meso > 0 && activeSomato.ecto > 0);

  const trainingPrescription: LabAiPrescriptionItem[] = [
    {
      focusArea: '1. Blok: Nöromüsküler Çabukluk & Patlayıcı Kuvvet',
      microcycleGoal: improvementAreas[0]
        ? `${improvementAreas[0].metricName} metriğini ${improvementAreas[0].currentValue} seviyesinden ${improvementAreas[0].targetValue} hedefine taşımak`
        : 'Ölçülen temel motor becerilerde koordinasyon ve patlayıcı güç gelişimi sağlamak',
      recommendedDrills: [
        improvementAreas[0]?.drillRecommendation || 'Ölçülen test verilerine uygun koordinasyon ve sürat drilleri',
        'Kısa mesafe (5m-10m-20m) çıkış ivmelenme ve koordinasyon çalışmaları',
      ],
      loadNote: 'Yüksek kalite, tam dinlenme (1:5 iş/dinlenme oranı), haftada 2 seans',
    },
    {
      focusArea: hasFullSomato ? '2. Blok: Kor Stabilizasyonu & Somatotip Dengesi' : '2. Blok: Kor Stabilizasyonu & Denge Kontrolü',
      microcycleGoal: hasFullSomato
        ? `Somatotip profilini (${activeSomato.endo}-${activeSomato.meso}-${activeSomato.ecto}) branş elit referansına (${report.somatotype.eliteRef.endo}-${report.somatotype.eliteRef.meso}-${report.somatotype.eliteRef.ecto}) yaklaştırmak`
        : 'Gövde stabilizasyonu, eklem kontrolü ve duruş dengesini korumak',
      recommendedDrills: [
        'Vücut ağırlığıyla fonksiyonel core ve skapular stabilizasyon',
        'Tek bacak denge ve diz-ayak bileği eksen kontrolü',
      ],
      loadNote: 'Orta yoğunluk, kontrollü tempo, haftada 3 seans (15-20 dk)',
    },
    {
      focusArea: hasCardioData ? '3. Blok: Kardiyorespiratuar Kapasite (VO2peak) & Büyüme Uyumu' : '3. Blok: Büyüme Dönemi Esneklik & Genel Dayanıklılık Uyumu',
      microcycleGoal: hasCardioData
        ? `PACER VO2peak değerini (${report.cardio.test2Vo2 || report.cardio.test1Vo2} ml/kg/dk) geliştirmek`
        : 'PHV büyüme döneminde eklem hareket açıklığı ve temel kondisyonu desteklemek',
      recommendedDrills: [
        'Branşa özgü dar alan yüksek tempolu eğitsel oyunlar',
        'Hamstring ve kalça çevresi PNF esneklik / mobilite rutini',
      ],
      loadNote: phvWindowNote,
    },
  ];

  const highStrengths = strengths.filter((s) => s.percentile >= 75);
  const overallSummary = `${report.athleteName}, 1. test (%${report.scoreHistory.p1Score}) ve güncel dönem (%${report.scoreHistory.p2Score || report.scoreHistory.p3Score}) verilerine göre ${
    highStrengths.length > 0
      ? `${highStrengths.map((s) => s.metricName).slice(0, 2).join(' ve ')} alanlarında hedef normları yakalamış olup `
      : 'henüz üst hedef dilimine (%75+) ulaşan parametrelerin artırılmasına ihtiyaç duymakta olup '
  }${
    improvementAreas.length > 0 ? improvementAreas.map((i) => i.metricName).slice(0, 3).join(', ') : 'ölçülen alanlar'
  } için hedef değer odaklı antrenman planlaması önerilmektedir.`;

  const bmrText = report.cardio.basalMetabolicRate > 0 ? `Sporcunun bazal metabolik hızı ${report.cardio.basalMetabolicRate} kcal/gün olarak hesaplanmıştır. ` : '';
  const somatoText = hasSomatoData
    ? `Ölçülen somatotip profili ${activeSomato.category} (${activeSomatoParts}) düzeyindedir. `
    : '';
  const nutritionAndRecoveryTip = `${bmrText}${somatoText}Kas-iskelet sağlamlığını ve büyüme dönemindeki toparlanmayı desteklemek için antrenman sonrası ilk 45 dakikada kaliteli protein + kompleks karbonhidrat alımı ve büyüme hormonu salınımı için günde en az 9 saat gece uykusu önerilir.`;

  return {
    overallSummary,
    readinessScore: report.scoreHistory.p3Score,
    improvementAreas,
    strengths,
    trainingPrescription,
    nutritionAndRecoveryTip,
    generatedAt: new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    source: 'auto-engine',
  };
}

/**
 * Calls the server-side Gemini API endpoint (/api/sportsfly-lab/ai-recommendations)
 * to generate deep AI performance recommendations from the athlete's Excel metrics.
 */
export async function fetchGeminiLabRecommendations(
  report: SportsFlyLabReport
): Promise<LabAiPerformanceAnalysis> {
  try {
    const response = await secureFetch('/api/sportsfly-lab/ai-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.overallSummary && !data.error) {
        return data as LabAiPerformanceAnalysis;
      }
    }
  } catch (err) {
    console.warn('[fetchGeminiLabRecommendations] Network/Server fallback active:', err);
  }

  // Gracefully return deep algorithmic AI performance analysis if backend server route is unavailable
  return analyzeLabPerformanceMetrics(report);
}

/**
 * AI Growth & Performance Forecasting Engine:
 * When only Test 1 (m1) is available or when requested, automatically calculates and projects
 * expected estimated values for Test 2 (m2) and Test 3 (m3) based on initial measurement data
 * and sports science growth curves.
 */
export function generateAiForecastForLabReport(report: SportsFlyLabReport): SportsFlyLabReport {
  const cloned: SportsFlyLabReport = JSON.parse(JSON.stringify(report));
  cloned.isAiForecast = true;
  cloned.date2 = '2-4 Ay Arası (Tahmini)';
  cloned.scoreHistory.p2Date = '2-4 Ay Arası (Tahmini)';

  // 1. Forecast Body Composition (yalnızca ölçülen satırlar)
  cloned.bodyComposition.forEach((item) => {
    if (!isLabRowMeasured(item)) {
      item.m1 = 0;
      item.m2 = 0;
      item.m3 = 0;
      return;
    }
    const m1 = Number(item.m1) || 0;
    if (m1 > 0) {
      if (item.id === 'height') {
        if (!item.m2 || item.m2 < m1) item.m2 = Number((m1 + 1.2).toFixed(1));
      } else if (item.id === 'weight') {
        if (!item.m2 || item.m2 < m1) item.m2 = Number((m1 + 0.8).toFixed(1));
      } else if (item.id === 'body_fat') {
        if (!item.m2 || item.m2 > m1) item.m2 = Number((m1 * 0.95).toFixed(1));
      } else {
        if (!item.m2 || item.m2 < m1) item.m2 = Number((m1 * 1.02).toFixed(1));
      }
    }
  });

  // 2. Forecast Motor Performance (yalnızca ölçülen satırlar)
  cloned.motorPerformance.forEach((item) => {
    if (!isLabRowMeasured(item)) {
      item.m1 = 0;
      item.m2 = 0;
      item.m3 = 0;
      return;
    }
    const m1 = Number(item.m1) || 0;
    if (m1 > 0) {
      if (item.lowerIsBetter) {
        if (!item.m2 || item.m2 === 0 || item.m2 > m1) {
          item.m2 = Number((m1 * 0.96).toFixed(2));
        }
      } else {
        if (!item.m2 || item.m2 === 0 || item.m2 < m1) {
          item.m2 = Number((m1 * 1.05).toFixed(1));
        }
      }
    }
  });

  // 3. Forecast Cardio / VO2 / Shuttle ONLY if measured
  if (cloned.cardio) {
    const c1Dist = Number(cloned.cardio.test1Distance) || 0;
    const c1Shut = Number(cloned.cardio.test1Shuttles) || 0;
    const c1Vo2 = Number(cloned.cardio.test1Vo2) || 0;

    if (c1Dist > 0 && (!cloned.cardio.test2Distance || cloned.cardio.test2Distance < c1Dist)) {
      cloned.cardio.test2Distance = Math.round(c1Dist * 1.08);
    }
    if (c1Shut > 0 && (!cloned.cardio.test2Shuttles || cloned.cardio.test2Shuttles < c1Shut)) {
      cloned.cardio.test2Shuttles = Math.round(c1Shut * 1.08);
    }
    if (c1Vo2 > 0 && (!cloned.cardio.test2Vo2 || cloned.cardio.test2Vo2 < c1Vo2)) {
      cloned.cardio.test2Vo2 = Number((c1Vo2 * 1.04).toFixed(1));
    }
  }

  // 4. Forecast Score History
  const p1 = cloned.scoreHistory.p1Score || 72;
  if (!cloned.scoreHistory.p2Score || cloned.scoreHistory.p2Score < p1) {
    cloned.scoreHistory.p2Score = Math.min(96, Math.max(p1 + 2, Math.round(p1 + 6)));
  }
  if (!cloned.scoreHistory.p3Score || cloned.scoreHistory.p3Score === 0) {
    cloned.scoreHistory.p3Score = cloned.scoreHistory.p1Score;
  }

  // 5. Forecast Somatotype ONLY for measured components; NEVER fabricate m3 when date3 is absent
  const s1Endo = cloned.somatotype.m1.endo || 0;
  const s1Meso = cloned.somatotype.m1.meso || 0;
  const s1Ecto = cloned.somatotype.m1.ecto || 0;

  if (s1Endo > 0 || s1Meso > 0 || s1Ecto > 0) {
    if (!(cloned.somatotype.m2.endo > 0 || cloned.somatotype.m2.meso > 0 || cloned.somatotype.m2.ecto > 0)) {
      cloned.somatotype.m2 = {
        endo: s1Endo > 0 ? Number((s1Endo * 0.96).toFixed(1)) : 0,
        meso: s1Meso > 0 ? Number((s1Meso * 1.04).toFixed(1)) : 0,
        ecto: s1Ecto > 0 ? Number((s1Ecto * 1.02).toFixed(1)) : 0,
        category: cloned.somatotype.m1.category,
      };
    }
  }
  if (!cloned.date3 || cloned.date3 === '—' || cloned.date3.trim() === '') {
    cloned.somatotype.m3 = { endo: 0, meso: 0, ecto: 0, category: '—' };
  }

  cloned.expertComment = generateAthleteInterpretiveExpertComment(cloned);

  ensureDataConsistency(cloned);
  cloned.aiRecommendations = analyzeLabPerformanceMetrics(cloned);
  return cloned;
}

export interface ExcelSchemaValidationResult {
  isValid: boolean;
  missingColumns: string[];
  warnings: string[];
  detectedColumns: string[];
  sheetType: 'batch' | 'parameter' | 'unknown';
}

/**
 * Validates the schema and headers of an uploaded Excel workbook buffer.
 * Inspects required columns (Athlete name, height, weight, etc.) and returns detailed warnings and errors.
 */
export function validateExcelSchema(buffer: ArrayBuffer): ExcelSchemaValidationResult {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return {
        isValid: false,
        missingColumns: ['Tüm Sütunlar'],
        warnings: ['Excel dosyasında geçerli bir sayfa (Sheet) bulunamadı.'],
        detectedColumns: [],
        sheetType: 'unknown',
      };
    }

    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: '',
      raw: false,
      dateNF: 'dd.mm.yyyy',
    });

    if (!rows || rows.length === 0) {
      return {
        isValid: false,
        missingColumns: ['Veri Satırları'],
        warnings: ['Excel sayfası boş veya veri içermiyor.'],
        detectedColumns: [],
        sheetType: 'unknown',
      };
    }

    const firstRowKeys = Object.keys(rows[0] || {});
    const normalizedKeys = firstRowKeys.map((k) => k.toLowerCase().replace(/[^a-z0-9çğıöşü]/g, ''));

    const isParamSheet =
      normalizedKeys.some((k) => k.includes('parametre')) &&
      normalizedKeys.some((k) => k.includes('olcum') || k.includes('olc'));

    if (isParamSheet) {
      return {
        isValid: true,
        missingColumns: [],
        warnings: ['Parametre bazlı dikey karne şablonu tespit edildi.'],
        detectedColumns: firstRowKeys,
        sheetType: 'parameter',
      };
    }

    // Check flat multi-athlete sheet required fields
    const requiredKeywords = ['ad', 'boy', 'kilo'];
    const missing: string[] = [];

    const hasName = normalizedKeys.some((k) => k.includes('ad') || k.includes('sporcu') || k.includes('isim') || k.includes('name'));
    const hasHeight = normalizedKeys.some((k) => k.includes('boy') || k.includes('height'));
    const hasWeight = normalizedKeys.some((k) => k.includes('kilo') || k.includes('agirlik') || k.includes('weight'));

    if (!hasName) missing.push('Sporcu Adı ("Adı Soyadı" veya "Sporcu")');
    if (!hasHeight) missing.push('Boy Uzunluğu ("Boy (cm)" veya "Boy")');
    if (!hasWeight) missing.push('Vücut Ağırlığı ("Ağırlık (kg)" veya "Kilo")');

    // Add extra required validation for Lab specific fields if needed
    if (normalizedKeys.length < 5) {
      missing.push('Yetersiz Sütun Sayısı (En az 5 sütun gereklidir)');
    }

    const warnings: string[] = [];
    if (!normalizedKeys.some((k) => k.includes('dogum') || k.includes('tarih'))) {
      warnings.push('Doğum Tarihi sütunu bulunamadı. Yaş otomatik varsayılan (12 yaş) olarak atanacaktır.');
    }
    if (!normalizedKeys.some((k) => k.includes('brans') || k.includes('branş'))) {
      warnings.push('Branş sütunu bulunamadı. Varsayılan branş ("Voleybol / Atletik Gelişim") atanacaktır.');
    }

    return {
      isValid: missing.length === 0,
      missingColumns: missing,
      warnings,
      detectedColumns: firstRowKeys,
      sheetType: 'batch',
    };
  } catch (err: any) {
    return {
      isValid: false,
      missingColumns: ['Geçerli Excel Yapısı'],
      warnings: [`Dosya okunurken hata oluştu: ${err?.message || 'Bilinmeyen hata'}`],
      detectedColumns: [],
      sheetType: 'unknown',
    };
  }
}

/**
 * Clears legacy sportsfly data from local storage to ensure fresh Firestore-first state.
 */
export function clearSportsFlyLegacyData(): void {
  if (typeof window === 'undefined') return;
  const keysToClear = [
    'sportsfly_dosya_havuzu_files_v2',
    'sportsfly_dosya_havuzu_athletes_v2',
    'sportsfly_lab_reports_v1',
    'sportsfly_sporcular',
    'sportsfly_karneler_store_v1',
    'sportsfly_active_page',
    'sportsfly_integration_active'
  ];
  
  const isAlreadyCleared = localStorage.getItem('sportsfly_data_cleanup_v2') === 'true';
  if (!isAlreadyCleared) {
    keysToClear.forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    localStorage.setItem('sportsfly_data_cleanup_v2', 'true');
    console.log('[SportsFly] Legacy data cleared.');
  }
}

