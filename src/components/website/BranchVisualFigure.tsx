import React from 'react';
import { BranchFigureKey, WebsiteLayoutTheme } from '../../types/websiteTypes';

export interface BranchVisualFigureProps {
  figureKey?: BranchFigureKey | string;
  branchName?: string;
  layoutTheme?: WebsiteLayoutTheme;
  primaryColor?: string;
  secondaryColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

/**
 * Intelligent branch detection from name or key
 */
export function detectBranchFigure(name?: string, explicitKey?: string): BranchFigureKey {
  if (explicitKey && isValidFigureKey(explicitKey)) {
    return explicitKey as BranchFigureKey;
  }
  if (!name) return 'genel';

  const n = name.toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

  if (n.includes('basket')) return 'basketbol';
  if (n.includes('futbol') || n.includes('soccer') || n.includes('hali saha')) return 'futbol';
  if (n.includes('voley')) return 'voleybol';
  if (n.includes('yuzme') || n.includes('su spor') || n.includes('havuz')) return 'yuzme';
  if (n.includes('cimnastik') || n.includes('jimnastik') || n.includes('akrobasi') || n.includes('bale')) return 'cimnastik';
  if (n.includes('tenis') || n.includes('kort') || n.includes('padel')) return 'tenis';
  if (n.includes('atletizm') || n.includes('kosu') || n.includes('sprint') || n.includes('maraton')) return 'atletizm';
  if (n.includes('dovus') || n.includes('taekwondo') || n.includes('karate') || n.includes('judo') || n.includes('boks') || n.includes('kick')) return 'dovus';
  if (n.includes('okcu') || n.includes('yay')) return 'okculuk';
  if (n.includes('fitness') || n.includes('kondisyon') || n.includes('pilates') || n.includes('crossfit') || n.includes('agirlik')) return 'fitness';

  return 'genel';
}

function isValidFigureKey(key: string): boolean {
  return [
    'basketbol',
    'futbol',
    'voleybol',
    'yuzme',
    'cimnastik',
    'tenis',
    'atletizm',
    'dovus',
    'okculuk',
    'fitness',
    'genel',
  ].includes(key);
}

export const BRANCH_FIGURE_CATALOG: Array<{
  key: BranchFigureKey;
  label: string;
  shortDesc: string;
}> = [
  { key: 'basketbol', label: 'Basketbol', shortDesc: 'Smaç & Şut Figürü' },
  { key: 'futbol', label: 'Futbol', shortDesc: 'Vole & Şut Çeken Figür' },
  { key: 'voleybol', label: 'Voleybol', shortDesc: 'Smaçör & Blok Figürü' },
  { key: 'yuzme', label: 'Yüzme & Su Sporları', shortDesc: 'Kulaç Atan Yüzücü' },
  { key: 'cimnastik', label: 'Jimnastik & Koordinasyon', shortDesc: 'Akrobatik Denge Figürü' },
  { key: 'tenis', label: 'Tenis & Raket Sporları', shortDesc: 'Servis Atan Tenisçi' },
  { key: 'atletizm', label: 'Atletizm & Koşu', shortDesc: 'Sprint & Depar Figürü' },
  { key: 'dovus', label: 'Dövüş & Savunma Sanatları', shortDesc: 'Taekwondo Yüksek Tekme' },
  { key: 'okculuk', label: 'Okçuluk', shortDesc: 'Nişan Alan Okçu' },
  { key: 'fitness', label: 'Fitness & Atletik Performans', shortDesc: 'Kuvvet & Halter Figürü' },
  { key: 'genel', label: 'Genel Spor Okulu', shortDesc: 'Şampiyonluk & Başarı Figürü' },
];

/**
 * Pure SVG Silhouette Figures for each sport branch
 */
const SportSilhouette: React.FC<{
  type: BranchFigureKey;
  fillColor: string;
  secondaryFill: string;
}> = ({ type, fillColor, secondaryFill }) => {
  switch (type) {
    case 'basketbol':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Basket Pota Ring & Net Guide */}
          <path d="M72 24 H92 M74 24 L78 44 H86 L90 24 M76 34 H88" stroke={secondaryFill} strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
          {/* Basketball with Seams */}
          <circle cx="68" cy="18" r="9" fill={secondaryFill} />
          <path d="M60 18 Q68 18 76 18 M68 10 Q68 18 68 26 M62 13 Q68 18 74 23" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          {/* Airborne Basketball Player Body */}
          <circle cx="38" cy="22" r="5.5" fill={fillColor} />
          {/* Torso & Arms reaching for the rim */}
          <path d="M38 28 L44 48 L48 62 M38 32 L58 22 L66 18 M38 34 L28 42 L24 50" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Athletic Legs bent mid-flight */}
          <path d="M44 48 L32 64 L26 78 M44 48 L56 60 L68 62" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Dynamic motion lines */}
          <path d="M22 68 Q28 62 34 68 M18 74 Q24 68 30 74" stroke={secondaryFill} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
      );

    case 'futbol':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Soccer Ball with Hexagonal Pattern Accent */}
          <circle cx="78" cy="56" r="8.5" fill={secondaryFill} />
          <polygon points="78,50 82,53 81,58 75,58 74,53" fill="#ffffff" opacity="0.9" />
          <path d="M78 50 L78 47.5 M82 53 L85 52 M81 58 L83 61 M75 58 L73 61 M74 53 L71 52" stroke="#ffffff" strokeWidth="1.2" />
          {/* Striker Player Head */}
          <circle cx="28" cy="26" r="5.5" fill={fillColor} />
          {/* Torso leaning back for maximum power */}
          <path d="M29 32 L36 50 M29 36 L18 42 L12 48 M29 36 L44 38 L54 34" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Left Plant Leg */}
          <path d="M36 50 L34 68 L28 84" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Right Kicking Leg extended towards the ball */}
          <path d="M36 50 L56 56 L70 56" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Speed Arc */}
          <path d="M64 44 Q76 48 84 52" stroke={secondaryFill} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        </svg>
      );

    case 'voleybol':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Volleyball Net Line */}
          <path d="M8 68 H92" stroke={secondaryFill} strokeWidth="3" strokeDasharray="4 3" opacity="0.5" />
          <line x1="50" y1="68" x2="50" y2="92" stroke={secondaryFill} strokeWidth="3" opacity="0.5" />
          {/* Volleyball High in Air */}
          <circle cx="72" cy="20" r="8" fill={secondaryFill} />
          <path d="M64 20 Q72 20 80 20 M72 12 Q72 20 72 28 M66 15 Q72 20 78 25" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          {/* Spiker Player Head */}
          <circle cx="36" cy="28" r="5.5" fill={fillColor} />
          {/* Torso Arched Back */}
          <path d="M36 34 L38 52 M36 38 L24 44 L18 40 M36 36 L52 26 L64 22" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Legs Bent Back in Jump */}
          <path d="M38 52 L30 64 L22 62 M38 52 L36 68 L42 76" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Impact Sparks */}
          <path d="M78 12 L84 8 M82 22 L88 22 M80 28 L86 32" stroke={secondaryFill} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'yuzme':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Water Surface Waves */}
          <path d="M10 60 Q25 54 40 60 T70 60 T100 60" stroke={secondaryFill} strokeWidth="3" strokeLinecap="round" />
          <path d="M5 72 Q20 66 35 72 T65 72 T95 72" stroke={secondaryFill} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          <path d="M12 84 Q27 78 42 84 T72 84 T102 84" stroke={secondaryFill} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          {/* Swimmer Head with Goggles */}
          <circle cx="58" cy="42" r="5.5" fill={fillColor} />
          <path d="M59 40 L63 41" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          {/* Horizontal Torso */}
          <path d="M54 46 L34 50 L18 52" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Right Arm Recovering Over Water */}
          <path d="M50 46 L62 30 L76 34" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Left Arm Pulling Under */}
          <path d="M46 48 L40 60 L48 66" stroke={fillColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          {/* Flutter Kicking Legs */}
          <path d="M18 52 L10 48 L4 46 M18 52 L8 56 L2 58" stroke={fillColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Water Splash Droplets */}
          <circle cx="78" cy="38" r="1.8" fill={secondaryFill} />
          <circle cx="84" cy="34" r="1.5" fill={secondaryFill} />
        </svg>
      );

    case 'cimnastik':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Gymnastic Ribbon Wave / Balance Beam Accent */}
          <path d="M12 82 Q30 70 50 82 T88 78" stroke={secondaryFill} strokeWidth="3" strokeLinecap="round" />
          {/* Gymnast Head */}
          <circle cx="50" cy="22" r="5.5" fill={fillColor} />
          {/* Graceful Torso */}
          <path d="M50 28 L50 48" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Elegant Extended Arms (V-Shape or Horizon) */}
          <path d="M50 32 L32 20 L22 16 M50 32 L68 20 L78 16" stroke={fillColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {/* Split Jump (Grand Jeté) Legs */}
          <path d="M50 48 L32 60 L14 66 M50 48 L68 58 L86 64" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Sparkles of Elegance */}
          <path d="M24 38 L26 42 L30 44 L26 46 L24 50 L22 46 L18 44 L22 42 Z" fill={secondaryFill} opacity="0.8" />
          <path d="M78 36 L79 39 L82 40 L79 41 L78 44 L77 41 L74 40 L77 39 Z" fill={secondaryFill} opacity="0.8" />
        </svg>
      );

    case 'tenis':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Tennis Court Baseline Arc */}
          <path d="M10 84 Q50 74 90 84" stroke={secondaryFill} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
          {/* Tennis Ball with Curved Line */}
          <circle cx="82" cy="24" r="6" fill={secondaryFill} />
          <path d="M78 20 Q82 24 78 28 M86 20 Q82 24 86 28" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
          {/* Tennis Player Head */}
          <circle cx="34" cy="30" r="5.5" fill={fillColor} />
          {/* Athletic Torso in Serve Follow-Through */}
          <path d="M34 36 L38 54 M34 40 L22 46 L16 42" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Right Arm Reaching High with Racquet */}
          <path d="M34 38 L52 28 L68 22" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Racquet Head & Strings */}
          <ellipse cx="74" cy="18" rx="8" ry="11" transform="rotate(35 74 18)" stroke={secondaryFill} strokeWidth="2.5" />
          <line x1="72" y1="12" x2="76" y2="24" stroke={secondaryFill} strokeWidth="1" opacity="0.7" />
          <line x1="68" y1="17" x2="80" y2="19" stroke={secondaryFill} strokeWidth="1" opacity="0.7" />
          {/* Dynamic Planted Legs */}
          <path d="M38 54 L30 70 L26 84 M38 54 L48 68 L56 78" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'atletizm':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Track Running Lanes */}
          <path d="M12 88 L88 88 M16 93 L84 93" stroke={secondaryFill} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
          {/* Sprinter Head */}
          <circle cx="58" cy="26" r="5.5" fill={fillColor} />
          {/* Torso Leaning Forward in Full Acceleration */}
          <path d="M56 32 L44 48 M54 36 L66 42 L76 38 M52 38 L40 34 L32 38" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* High Knee Drive Forward */}
          <path d="M44 48 L58 54 L56 68" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Trailing Power Extension Leg */}
          <path d="M44 48 L28 58 L16 68" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Wind Speed Motion Trails */}
          <path d="M18 36 H30 M12 44 H26 M14 52 H24" stroke={secondaryFill} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        </svg>
      );

    case 'dovus':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Mat / Ring Arc */}
          <path d="M10 86 Q50 76 90 86" stroke={secondaryFill} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
          {/* Martial Artist Head */}
          <circle cx="36" cy="34" r="5.5" fill={fillColor} />
          {/* Torso in High Spinning / Roundhouse Kick */}
          <path d="M36 40 L40 56 M36 44 L26 46 L20 40 M36 44 L44 44 L46 36" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Standing Support Leg */}
          <path d="M40 56 L38 72 L36 86" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Extended High Kick Leg */}
          <path d="M40 56 L62 42 L84 26" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Dynamic Impact Swoosh */}
          <path d="M74 16 Q88 22 90 34" stroke={secondaryFill} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          {/* Belt knot accent */}
          <path d="M40 56 L44 62 L48 60" stroke={secondaryFill} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'okculuk':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Target Rings Guide */}
          <circle cx="86" cy="40" r="10" stroke={secondaryFill} strokeWidth="2" strokeDasharray="3 2" opacity="0.6" />
          <circle cx="86" cy="40" r="4" fill={secondaryFill} opacity="0.7" />
          {/* Archer Head with Cap/Visor */}
          <circle cx="28" cy="28" r="5.5" fill={fillColor} />
          {/* Torso in Steady Drawn Posture */}
          <path d="M28 34 L28 56 M28 38 L20 42 L24 38 M28 38 L48 38 L58 38" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Bow Curved Arc */}
          <path d="M58 14 Q66 38 58 64" stroke={secondaryFill} strokeWidth="3" strokeLinecap="round" />
          {/* Bow String Pulled to Cheek */}
          <path d="M58 14 L28 38 L58 64" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          {/* Arrow */}
          <line x1="28" y1="38" x2="76" y2="38" stroke={secondaryFill} strokeWidth="2.5" strokeLinecap="round" />
          <polygon points="76,38 70,35 70,41" fill={secondaryFill} />
          {/* Ground Stance Legs */}
          <path d="M28 56 L20 74 L16 86 M28 56 L36 74 L42 86" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'fitness':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Barbell Overhead */}
          <line x1="16" y1="20" x2="84" y2="20" stroke={secondaryFill} strokeWidth="3.5" strokeLinecap="round" />
          {/* Barbell Plates */}
          <rect x="18" y="10" width="5" height="20" rx="2" fill={secondaryFill} />
          <rect x="24" y="13" width="4" height="14" rx="1.5" fill={secondaryFill} />
          <rect x="77" y="10" width="5" height="20" rx="2" fill={secondaryFill} />
          <rect x="72" y="13" width="4" height="14" rx="1.5" fill={secondaryFill} />
          {/* Athlete Head */}
          <circle cx="50" cy="30" r="5.5" fill={fillColor} />
          {/* Arms Pressed Overhead */}
          <path d="M50 36 L50 56 M50 38 L36 26 L30 20 M50 38 L64 26 L70 20" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Power Squat Legs */}
          <path d="M50 56 L36 68 L28 84 M50 56 L64 68 L72 84" stroke={fillColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Core Energy Pulse */}
          <circle cx="50" cy="46" r="3" fill={secondaryFill} opacity="0.8" />
        </svg>
      );

    case 'genel':
    default:
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Championship Trophy Cup with Laurel Wreath */}
          <path d="M32 24 H68 V46 C68 56 58 64 50 64 C42 64 32 56 32 46 Z" fill={secondaryFill} />
          {/* Trophy Handles */}
          <path d="M32 28 C20 28 20 44 33 46 M68 28 C80 28 80 44 67 46" stroke={secondaryFill} strokeWidth="3" strokeLinecap="round" />
          {/* Trophy Stem & Base */}
          <path d="M47 64 H53 V76 H47 Z M36 76 H64 V84 H36 Z" fill={fillColor} />
          {/* Star on Cup */}
          <polygon points="50,30 53,37 60,37 54,41 57,48 50,44 43,48 46,41 40,37 47,37" fill="#ffffff" />
          {/* Laurel Wreath Silhouette */}
          <path d="M22 62 C16 48 18 32 26 22 M78 62 C84 48 82 32 74 22" stroke={fillColor} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 4" opacity="0.7" />
        </svg>
      );
  }
};

export const BranchVisualFigure: React.FC<BranchVisualFigureProps> = ({
  figureKey,
  branchName,
  layoutTheme = 'modern',
  primaryColor = '#0284c7',
  secondaryColor = '#f97316',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const detectedKey = detectBranchFigure(branchName, figureKey);

  // Size specifications
  const sizeMap = {
    sm: { box: 'w-10 h-10', svg: 'w-6 h-6', border: 'border-2' },
    md: { box: 'w-14 h-14 sm:w-16 sm:h-16', svg: 'w-9 h-9 sm:w-10 sm:h-10', border: 'border-2' },
    lg: { box: 'w-20 h-20 sm:w-24 sm:h-24', svg: 'w-13 h-13 sm:w-16 sm:h-16', border: 'border-3' },
    xl: { box: 'w-28 h-28 sm:w-32 sm:h-32', svg: 'w-20 h-20 sm:w-22 sm:h-22', border: 'border-4' },
  };

  const sz = sizeMap[size];

  // Theme-specific colors and framing
  let frameClasses = '';
  let athleteColor = primaryColor;
  let accentColor = secondaryColor;

  if (layoutTheme === 'classic') {
    // Prestigious Royal Navy & Gold Laurel Heraldry
    athleteColor = '#1e3a8a'; // Royal Navy
    accentColor = '#d97706'; // Champion Gold
    frameClasses = `rounded-2xl bg-gradient-to-br from-amber-500/15 via-white to-amber-500/10 dark:from-blue-950 dark:to-slate-900 border-2 border-amber-500/40 shadow-md shadow-amber-500/10`;
  } else if (layoutTheme === 'minimal') {
    // Sharp Swiss Minimalist High-Contrast
    athleteColor = '#0f172a'; // Obsidian Black
    accentColor = '#10b981'; // Electric Emerald
    frameClasses = `rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xs hover:border-emerald-500 transition-colors`;
  } else {
    // Modern Energetic Glassmorphism & Vibrant Glow
    athleteColor = primaryColor || '#0284c7';
    accentColor = secondaryColor || '#f97316';
    frameClasses = `rounded-3xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-2 border-white/40 dark:border-slate-700 shadow-lg hover:scale-105 transition-all`;
  }

  const catalogEntry = BRANCH_FIGURE_CATALOG.find((c) => c.key === detectedKey);

  return (
    <div className={`inline-flex flex-col items-center justify-center shrink-0 ${className}`}>
      <div
        className={`${sz.box} ${frameClasses} flex items-center justify-center relative p-1 overflow-hidden group`}
        title={catalogEntry?.label || branchName}
      >
        {/* Modern Theme Aura Glow */}
        {layoutTheme === 'modern' && (
          <div
            className="absolute inset-0 opacity-15 rounded-3xl blur-md pointer-events-none transition-opacity group-hover:opacity-30"
            style={{ backgroundColor: accentColor }}
          />
        )}

        {/* Classic Theme Gold Laurel Star Accent */}
        {layoutTheme === 'classic' && (
          <div className="absolute top-1 right-1 text-[9px] text-amber-500 font-black select-none pointer-events-none">
            ★
          </div>
        )}

        {/* Minimal Theme Emerald Dot Indicator */}
        {layoutTheme === 'minimal' && (
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        )}

        <div className={sz.svg}>
          <SportSilhouette
            type={detectedKey}
            fillColor={athleteColor}
            secondaryFill={accentColor}
          />
        </div>
      </div>

      {showLabel && (
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1 text-center truncate max-w-[90px]">
          {catalogEntry?.label || branchName}
        </span>
      )}
    </div>
  );
};
