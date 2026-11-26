import React, { useState, useEffect } from 'react';
import {
  Award,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Globe,
  Trophy,
  Sparkles,
  Check,
  Cake,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  STUDIO_ASPECT_RATIOS,
  StudioDesignState,
} from '../../../../data/sportsFlyStudioData';

interface StudioCanvasPreviewProps {
  design: StudioDesignState;
  exportRef?: React.RefObject<HTMLDivElement | null>;
  zoom?: number;
  showSafeGuides?: boolean;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string | null) => void;
  onUpdateLayerPosition?: (layerId: string, x: number, y: number) => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return `rgba(29, 78, 216, ${alpha})`;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(29, 78, 216, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const StudioCanvasPreview: React.FC<StudioCanvasPreviewProps> = ({
  design,
  exportRef,
  zoom = 1,
  showSafeGuides = false,
  selectedLayerId = null,
  onSelectLayer,
  onUpdateLayerPosition,
}) => {
  const ratioMeta =
    STUDIO_ASPECT_RATIOS.find((r) => r.id === design.aspectRatio) ||
    STUDIO_ASPECT_RATIOS[1];

  const [heroImgError, setHeroImgError] = useState(false);
  const [featureImgError, setFeatureImgError] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);
  const [dragState, setDragState] = useState<{
    layerId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    setHeroImgError(false);
  }, [design.heroPhotoUrl]);

  useEffect(() => {
    setFeatureImgError(false);
  }, [design.featureImageUrl]);

  useEffect(() => {
    setAvatarImgError(false);
  }, [design.athleteAvatarUrl]);

  useEffect(() => {
    setLogoImgError(false);
  }, [design.clubLogoUrl]);

  useEffect(() => {
    if (!dragState || !onUpdateLayerPosition) return;
    const handlePointerMove = (ev: PointerEvent) => {
      const dxPx = (ev.clientX - dragState.startClientX) / Math.max(0.25, zoom);
      const dyPx = (ev.clientY - dragState.startClientY) / Math.max(0.25, zoom);
      const nextX = Math.max(4, Math.min(96, Math.round((dragState.startX + (dxPx / ratioMeta.stageWidth) * 100) * 10) / 10));
      const nextY = Math.max(4, Math.min(96, Math.round((dragState.startY + (dyPx / ratioMeta.stageHeight) * 100) * 10) / 10));
      onUpdateLayerPosition(dragState.layerId, nextX, nextY);
    };
    const handlePointerUp = () => setDragState(null);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, onUpdateLayerPosition, ratioMeta.stageHeight, ratioMeta.stageWidth, zoom]);

  const isWide = design.aspectRatio === '16:9';
  const isSquare = design.aspectRatio === '1:1';
  const isStory = design.aspectRatio === '9:16';
  const hasVisibleFeatureImage = Boolean(
    design.showFeatureImage && design.featureImageUrl && !featureImgError
  );
  const compactSquare = isSquare && hasVisibleFeatureImage;
  const isLightSurface =
    design.themeId === 'editorial-light' ||
    design.backgroundColor.toLowerCase() === '#f8fafc' ||
    design.backgroundColor.toLowerCase() === '#ffffff';

  const cardSurfaceRgba = isLightSurface
    ? 'rgba(255, 255, 255, 0.94)'
    : hexToRgba(design.surfaceColor, 0.88);
  const subtleBorder = isLightSurface
    ? 'rgba(15, 23, 42, 0.12)'
    : 'rgba(255, 255, 255, 0.14)';
  const accentSoftBg = hexToRgba(design.accentColor, isLightSurface ? 0.12 : 0.18);
  const primarySoftBg = hexToRgba(design.primaryColor, isLightSurface ? 0.1 : 0.24);

  const getCrossOrigin = (url: string): 'anonymous' | undefined => {
    if (!url || url.startsWith('data:') || url.startsWith('/')) return undefined;
    if (typeof window !== 'undefined' && url.startsWith(window.location.origin)) {
      return undefined;
    }
    return 'anonymous';
  };

  const scaleFactor = Math.max(0.8, Math.min(1.25, design.headlineScale / 100));
  const baseHeadlinePx = isWide ? 27 : compactSquare ? 26 : isStory ? 34 : 32;
  const computedHeadlinePx = Math.round(baseHeadlinePx * scaleFactor);

  const alignClass =
    design.textAlign === 'center' ? 'text-center items-center' : 'text-left items-start';

  const athleteInitials = (design.athleteName || 'SP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const clubInitials = (design.clubName || 'SF')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const renderPatternLayer = () => {
    const strokeCol = isLightSurface
      ? hexToRgba(design.primaryColor, 0.08)
      : 'rgba(255, 255, 255, 0.07)';
    const accentGlow = hexToRgba(design.accentColor, isLightSurface ? 0.1 : 0.16);
    const primaryGlow = hexToRgba(design.primaryColor, isLightSurface ? 0.12 : 0.28);

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient radial accents */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full"
          style={{
            background: `radial-gradient(circle, ${accentGlow} 0%, transparent 72%)`,
          }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full"
          style={{
            background: `radial-gradient(circle, ${primaryGlow} 0%, transparent 72%)`,
          }}
        />

        {design.patternStyle === 'court-lines' && (
          <svg
            viewBox="0 0 600 600"
            preserveAspectRatio="none"
            className="w-full h-full opacity-90"
          >
            <rect
              x="28"
              y="28"
              width="544"
              height="544"
              rx="18"
              fill="none"
              stroke={strokeCol}
              strokeWidth="2"
            />
            <line
              x1="28"
              y1="300"
              x2="572"
              y2="300"
              stroke={strokeCol}
              strokeWidth="1.5"
            />
            <circle
              cx="300"
              cy="300"
              r="76"
              fill="none"
              stroke={strokeCol}
              strokeWidth="2"
            />
            <path
              d="M 160 28 A 140 140 0 0 0 440 28"
              fill="none"
              stroke={strokeCol}
              strokeWidth="1.5"
            />
            <path
              d="M 160 572 A 140 140 0 0 1 440 572"
              fill="none"
              stroke={strokeCol}
              strokeWidth="1.5"
            />
          </svg>
        )}

        {design.patternStyle === 'dot-grid' && (
          <svg
            viewBox="0 0 400 400"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <pattern
                id={`dot-pattern-${design.id}`}
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="4" cy="4" r="1.4" fill={strokeCol} />
              </pattern>
            </defs>
            <rect width="400" height="400" fill={`url(#dot-pattern-${design.id})`} />
          </svg>
        )}

        {design.patternStyle === 'diagonal-stripes' && (
          <svg
            viewBox="0 0 600 600"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <g stroke={strokeCol} strokeWidth="1.5">
              <line x1="-100" y1="600" x2="320" y2="-60" />
              <line x1="20" y1="600" x2="440" y2="-60" />
              <line x1="140" y1="600" x2="560" y2="-60" />
              <line x1="260" y1="600" x2="680" y2="-60" />
              <line x1="380" y1="600" x2="800" y2="-60" />
            </g>
          </svg>
        )}
      </div>
    );
  };

  const renderHeroBackgroundPhoto = () => {
    if (!design.showHeroPhoto || !design.heroPhotoUrl || heroImgError) {
      return null;
    }
    const scrimAlpha = Math.max(0.25, Math.min(0.92, design.photoScrimOpacity / 100));
    return (
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={design.heroPhotoUrl}
          alt={design.designName}
          referrerPolicy="no-referrer"
          crossOrigin={getCrossOrigin(design.heroPhotoUrl)}
          onError={() => setHeroImgError(true)}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: isLightSurface
              ? `linear-gradient(180deg, rgba(248,250,252,${scrimAlpha}) 0%, rgba(248,250,252,${Math.min(
                  0.96,
                  scrimAlpha + 0.14
                )}) 100%)`
              : `linear-gradient(180deg, rgba(11,22,44,${Math.max(
                  0.35,
                  scrimAlpha - 0.18
                )}) 0%, rgba(11,22,44,${scrimAlpha}) 55%, rgba(11,22,44,${Math.min(
                  0.96,
                  scrimAlpha + 0.15
                )}) 100%)`,
          }}
        />
      </div>
    );
  };

  const renderFeatureVisualFrame = (maxHOverride?: number) => {
    if (!design.showFeatureImage || !design.featureImageUrl || featureImgError) {
      return null;
    }
    const rawH = design.featureImageHeight || 156;
    const clampedH = maxHOverride !== undefined ? Math.min(rawH, maxHOverride) : rawH;
    const targetH = Math.max(84, Math.min(240, clampedH));
    const isContain = design.featureImageFit === 'contain';
    return (
      <div
        className="w-full rounded-2xl overflow-hidden shrink-0"
        style={{
          height: `${targetH}px`,
          backgroundColor: isContain ? cardSurfaceRgba : 'rgba(15,23,42,0.18)',
          border: `1px solid ${subtleBorder}`,
        }}
      >
        <img
          src={design.featureImageUrl}
          alt={design.headline || design.designName}
          referrerPolicy="no-referrer"
          crossOrigin={getCrossOrigin(design.featureImageUrl)}
          onError={() => setFeatureImgError(true)}
          className={`w-full h-full ${isContain ? 'object-contain p-2' : 'object-cover'}`}
        />
      </div>
    );
  };

  const renderCustomImageLayers = () => {
    const layers = Array.isArray(design.customImages) ? design.customImages : [];
    if (layers.length === 0) return null;

    return layers.map((layer) => {
      const isSelected = selectedLayerId === layer.id;
      const canDrag = Boolean(onUpdateLayerPosition);
      return (
        <div
          key={layer.id}
          onPointerDown={(e) => {
            if (!canDrag) return;
            e.stopPropagation();
            onSelectLayer?.(layer.id);
            setDragState({
              layerId: layer.id,
              startClientX: e.clientX,
              startClientY: e.clientY,
              startX: layer.x,
              startY: layer.y,
            });
          }}
          style={{
            left: `${layer.x}%`,
            top: `${layer.y}%`,
            width: `${layer.width}px`,
            transform: 'translate(-50%, -50%)',
            opacity: Math.max(0.2, Math.min(1, (layer.opacity ?? 100) / 100)),
            borderRadius: `${layer.borderRadius ?? 12}px`,
            boxShadow: layer.shadow ? '0 10px 26px rgba(15, 23, 42, 0.28)' : 'none',
            touchAction: 'none',
          }}
          className={`absolute z-20 overflow-hidden ${canDrag ? 'cursor-move' : ''}`}
          title={canDrag ? 'Konumlandırmak için sürükleyin' : layer.label}
        >
          <img
            src={layer.url}
            alt={layer.label}
            draggable={false}
            referrerPolicy="no-referrer"
            crossOrigin={getCrossOrigin(layer.url)}
            style={{ borderRadius: `${layer.borderRadius ?? 12}px` }}
            className={`w-full h-auto block select-none ${
              layer.fit === 'contain' ? 'object-contain' : 'object-cover'
            }`}
          />
          {isSelected && (
            <div
              data-studio-guide="true"
              style={{ borderRadius: `${layer.borderRadius ?? 12}px` }}
              className="absolute inset-0 border-2 border-dashed border-sky-400 pointer-events-none"
            />
          )}
        </div>
      );
    });
  };

  const renderClubHeader = () => (
    <div className="relative z-10 flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-2.5 min-w-0">
        {design.showClubLogo && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              backgroundColor: isLightSurface ? design.primaryColor : 'rgba(255,255,255,0.12)',
              border: `1px solid ${subtleBorder}`,
            }}
          >
            {design.clubLogoUrl && !logoImgError ? (
              <img
                src={design.clubLogoUrl}
                alt={design.clubName}
                referrerPolicy="no-referrer"
                crossOrigin={getCrossOrigin(design.clubLogoUrl)}
                onError={() => setLogoImgError(true)}
                className="w-full h-full object-contain p-1 bg-white"
              />
            ) : (
              <span className="text-xs font-extrabold tracking-tight text-white">
                {clubInitials || 'SF'}
              </span>
            )}
          </div>
        )}
        <div className="min-w-0">
          <div
            className="text-xs font-extrabold tracking-tight truncate"
            style={{ color: design.textColor }}
          >
            {design.clubName}
          </div>
          <div
            className="text-[10px] font-semibold tracking-wider uppercase truncate"
            style={{ color: design.accentColor }}
          >
            {design.kicker}
          </div>
        </div>
      </div>

      {design.highlightBadge && (
        <div
          className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase shrink-0"
          style={{
            backgroundColor: accentSoftBg,
            color: design.accentColor,
            border: `1px solid ${hexToRgba(design.accentColor, 0.35)}`,
          }}
        >
          {design.highlightBadge}
        </div>
      )}
    </div>
  );

  const renderStatsStrip = (compact = false) => {
    if (!design.stats || design.stats.length === 0) return null;
    return (
      <div
        className={`grid grid-cols-3 gap-2 w-full ${compact ? 'mt-0.5' : 'mt-1.5'}`}
      >
        {design.stats.slice(0, 3).map((stat, idx) => (
          <div
            key={`${stat.label}-${idx}`}
            className={`rounded-xl ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}
            style={{
              backgroundColor: cardSurfaceRgba,
              border: `1px solid ${subtleBorder}`,
            }}
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-wide truncate"
              style={{ color: design.mutedTextColor }}
            >
              {stat.label}
            </div>
            <div
              className="text-sm font-extrabold tabular-nums mt-0.5 truncate"
              style={{ color: idx === 1 ? design.accentColor : design.textColor }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMetaStrip = () => (
    <div
      className={`w-full rounded-xl px-3.5 ${compactSquare || isWide ? 'py-2' : 'py-2.5'} flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold`}
      style={{
        backgroundColor: primarySoftBg,
        border: `1px solid ${subtleBorder}`,
        color: design.textColor,
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: design.accentColor }} />
        <span className="truncate">{design.dateText}</span>
      </div>
      {design.timeText && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: design.accentColor }} />
          <span className="tabular-nums">{design.timeText}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 min-w-0">
        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: design.accentColor }} />
        <span className="truncate">{design.locationText}</span>
      </div>
    </div>
  );

  const renderFooterStrip = () => (
    <div
      className="relative z-10 w-full pt-3 flex items-center justify-between gap-3 text-[11px] font-semibold"
      style={{
        borderTop: `1px solid ${subtleBorder}`,
        color: design.mutedTextColor,
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: design.accentColor }} />
        <span className="tabular-nums truncate">{design.footerContact}</span>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: design.accentColor }} />
        <span className="truncate">{design.footerWeb}</span>
      </div>
    </div>
  );

  const renderBodyContent = () => {
    // 1. MATCH & TOURNAMENT VARIANTS
    if (design.layoutVariant === 'matchday-vs' || design.layoutVariant === 'final-score') {
      const isFinalScore = design.layoutVariant === 'final-score';
      return (
        <div className={`relative z-10 flex-1 flex flex-col justify-center ${compactSquare || isWide ? 'gap-2' : 'gap-3'} w-full ${alignClass}`}>
          {design.tournamentTitle && (
            <div
              className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: design.mutedTextColor }}
            >
              {design.tournamentTitle}
            </div>
          )}

          <h2
            className="font-black tracking-tight leading-[1.06]"
            style={{
              fontSize: `${computedHeadlinePx}px`,
              color: design.textColor,
            }}
          >
            {design.headline}
          </h2>

          {/* Scoreboard / VS Card */}
          <div
            className={`w-full rounded-2xl ${compactSquare || isWide ? 'p-3' : 'p-4'} grid grid-cols-[1fr_auto_1fr] items-center gap-3`}
            style={{
              backgroundColor: cardSurfaceRgba,
              border: `1px solid ${subtleBorder}`,
            }}
          >
            <div className="text-left min-w-0">
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: design.accentColor }}
              >
                EV SAHİBİ
              </div>
              <div
                className="text-sm sm:text-base font-extrabold leading-tight break-words"
                style={{ color: design.textColor }}
              >
                {design.homeTeamName}
              </div>
            </div>

            <div
              className="px-3.5 py-2 rounded-xl flex items-center justify-center font-black tabular-nums tracking-tight"
              style={{
                backgroundColor: design.primaryColor,
                color: '#FFFFFF',
                fontSize: isFinalScore ? (compactSquare || isWide ? '22px' : '26px') : '16px',
              }}
            >
              {isFinalScore ? (
                <span>
                  {design.homeScore} — {design.awayScore}
                </span>
              ) : (
                <span>VS</span>
              )}
            </div>

            <div className="text-right min-w-0">
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: design.mutedTextColor }}
              >
                DEPLASMAN
              </div>
              <div
                className="text-sm sm:text-base font-extrabold leading-tight break-words"
                style={{ color: design.textColor }}
              >
                {design.awayTeamName}
              </div>
            </div>
          </div>

          {renderFeatureVisualFrame(isWide ? 84 : compactSquare ? 104 : undefined)}

          <p
            className="text-xs leading-relaxed max-w-[95%]"
            style={{ color: design.mutedTextColor }}
          >
            {design.subheadline}
          </p>

          {renderMetaStrip()}
          {isFinalScore && renderStatsStrip(compactSquare || isWide)}
        </div>
      );
    }

    if (design.layoutVariant === 'championship-podium') {
      return (
        <div className={`relative z-10 flex-1 flex flex-col justify-center gap-3.5 w-full ${alignClass}`}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: accentSoftBg,
                border: `1px solid ${hexToRgba(design.accentColor, 0.4)}`,
              }}
            >
              <Trophy className="w-6 h-6" style={{ color: design.accentColor }} />
            </div>
            <div className="min-w-0">
              <div
                className="text-[11px] font-bold uppercase tracking-widest truncate"
                style={{ color: design.accentColor }}
              >
                {design.tournamentTitle}
              </div>
              <div
                className="text-xs font-semibold truncate"
                style={{ color: design.mutedTextColor }}
              >
                {design.homeTeamName} · {design.awayTeamName}
              </div>
            </div>
          </div>

          <h2
            className="font-black tracking-tight leading-[1.06]"
            style={{
              fontSize: `${computedHeadlinePx}px`,
              color: design.textColor,
            }}
          >
            {design.headline}
          </h2>

          {renderFeatureVisualFrame(isWide ? 96 : 132)}

          <p
            className="text-xs sm:text-[13px] leading-relaxed"
            style={{ color: design.mutedTextColor }}
          >
            {design.subheadline}
          </p>

          {renderStatsStrip()}
          {renderMetaStrip()}
        </div>
      );
    }

    // 2. ATHLETE CARDS (SPORCU KARTLARI)
    if (
      design.layoutVariant === 'athlete-mvp' ||
      design.layoutVariant === 'athlete-achievement' ||
      design.layoutVariant === 'athlete-birthday'
    ) {
      const isBirthday = design.layoutVariant === 'athlete-birthday';
      const isAchievement = design.layoutVariant === 'athlete-achievement';

      return (
        <div className={`relative z-10 flex-1 flex flex-col justify-center gap-3.5 w-full ${alignClass}`}>
          {/* Athlete Identity Card */}
          <div
            className="w-full rounded-2xl p-4 flex items-center gap-4"
            style={{
              backgroundColor: cardSurfaceRgba,
              border: `1px solid ${subtleBorder}`,
            }}
          >
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
              style={{
                backgroundColor: design.primaryColor,
                border: `2px solid ${design.accentColor}`,
              }}
            >
              {design.athleteAvatarUrl && !avatarImgError ? (
                <img
                  src={design.athleteAvatarUrl}
                  alt={design.athleteName}
                  referrerPolicy="no-referrer"
                  crossOrigin={getCrossOrigin(design.athleteAvatarUrl)}
                  onError={() => setAvatarImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-black text-white tracking-tight">
                  {athleteInitials || 'SP'}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-1.5 mb-1">
                {isBirthday ? (
                  <Cake className="w-3.5 h-3.5 shrink-0" style={{ color: design.accentColor }} />
                ) : isAchievement ? (
                  <Award className="w-3.5 h-3.5 shrink-0" style={{ color: design.accentColor }} />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: design.accentColor }} />
                )}
                <span
                  className="text-[10px] font-bold uppercase tracking-wider truncate"
                  style={{ color: design.accentColor }}
                >
                  {design.athleteBranch} · {design.athleteCode}
                </span>
              </div>
              <div
                className="text-xl font-black tracking-tight leading-tight truncate"
                style={{ color: design.textColor }}
              >
                {design.athleteName}
              </div>
              <div
                className="text-xs font-medium mt-0.5 truncate"
                style={{ color: design.mutedTextColor }}
              >
                {design.athleteGroup}
              </div>
            </div>
          </div>

          <h2
            className="font-black tracking-tight leading-[1.08]"
            style={{
              fontSize: `${Math.max(22, computedHeadlinePx - 4)}px`,
              color: design.textColor,
            }}
          >
            {design.headline}
          </h2>

          {renderFeatureVisualFrame(isWide ? 84 : 108)}

          {design.athleteQuote && (
            <div
              className="w-full rounded-xl px-3.5 py-2.5 text-xs italic leading-relaxed"
              style={{
                backgroundColor: primarySoftBg,
                color: design.textColor,
                border: `1px solid ${subtleBorder}`,
              }}
            >
              “{design.athleteQuote}”
            </div>
          )}

          {renderStatsStrip(compactSquare)}

          {design.ctaText && (
            <div
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold"
              style={{
                backgroundColor: design.accentColor,
                color: '#0F172A',
              }}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{design.ctaText}</span>
            </div>
          )}
        </div>
      );
    }

    // 3. SOCIAL SCHEDULE / STATS / STORY / ANNOUNCEMENT
    if (design.layoutVariant === 'social-schedule') {
      return (
        <div className={`relative z-10 flex-1 flex flex-col justify-center ${compactSquare || isWide ? 'gap-2' : 'gap-3'} w-full ${alignClass}`}>
          <h2
            className="font-black tracking-tight leading-[1.08]"
            style={{
              fontSize: `${computedHeadlinePx}px`,
              color: design.textColor,
            }}
          >
            {design.headline}
          </h2>

          <p
            className="text-xs leading-relaxed"
            style={{ color: design.mutedTextColor }}
          >
            {design.subheadline}
          </p>

          {renderFeatureVisualFrame(isWide ? 84 : compactSquare ? 104 : undefined)}

          <div className="w-full space-y-1.5">
            {design.stats.slice(0, 3).map((row, idx) => (
              <div
                key={`${row.label}-${idx}`}
                className="w-full rounded-xl px-4 py-2 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: cardSurfaceRgba,
                  border: `1px solid ${subtleBorder}`,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: design.accentColor }}
                  />
                  <span
                    className="text-xs font-bold truncate"
                    style={{ color: design.textColor }}
                  >
                    {row.label}
                  </span>
                </div>
                <span
                  className="text-xs font-extrabold tabular-nums px-2.5 py-1 rounded-lg shrink-0"
                  style={{
                    backgroundColor: accentSoftBg,
                    color: design.accentColor,
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {renderMetaStrip()}
        </div>
      );
    }

    // DEFAULT: ANNOUNCEMENT POSTER / CAMP SPLIT / TRIAL INVITE / SOCIAL STORY / CLUB STATS
    if (isWide && hasVisibleFeatureImage) {
      return (
        <div className="relative z-10 flex-1 grid grid-cols-[1.22fr_0.82fr] gap-4 items-center w-full">
          <div className={`flex flex-col justify-center gap-2 min-w-0 ${alignClass}`}>
            <div
              className="w-10 h-1 rounded-full"
              style={{ backgroundColor: design.accentColor }}
            />
            <h2
              className="font-black tracking-tight leading-[1.06]"
              style={{
                fontSize: `${computedHeadlinePx}px`,
                color: design.textColor,
              }}
            >
              {design.headline}
            </h2>
            <p
              className="text-[11px] leading-relaxed line-clamp-2"
              style={{ color: design.mutedTextColor }}
            >
              {design.subheadline}
            </p>
            {renderStatsStrip(true)}
            {renderMetaStrip()}
          </div>
          <div className="flex flex-col justify-center gap-2.5 h-full">
            {renderFeatureVisualFrame(184)}
            {design.ctaText && (
              <div
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-extrabold shadow-xs"
                style={{
                  backgroundColor: design.accentColor,
                  color: '#0F172A',
                }}
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{design.ctaText}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`relative z-10 flex-1 flex flex-col justify-center ${compactSquare ? 'gap-2' : 'gap-3'} w-full ${alignClass}`}>
        <div
          className="w-12 h-1.5 rounded-full"
          style={{ backgroundColor: design.accentColor }}
        />

        <h2
          className="font-black tracking-tight leading-[1.06] max-w-[96%]"
          style={{
            fontSize: `${computedHeadlinePx}px`,
            color: design.textColor,
          }}
        >
          {design.headline}
        </h2>

        {renderFeatureVisualFrame(isWide ? 88 : compactSquare ? 114 : undefined)}

        <p
          className="text-xs sm:text-[13px] leading-relaxed max-w-[94%]"
          style={{ color: design.mutedTextColor }}
        >
          {design.subheadline}
        </p>

        {renderStatsStrip(compactSquare || isWide)}

        {renderMetaStrip()}

        {design.ctaText && (
          <div
            className={`inline-flex items-center gap-2 px-4 ${compactSquare ? 'py-2' : 'py-2.5'} rounded-xl text-xs font-extrabold shadow-xs`}
            style={{
              backgroundColor: design.accentColor,
              color: '#0F172A',
            }}
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{design.ctaText}</span>
          </div>
        )}
      </div>
    );
  };

  const activePosterPhoto =
    design.featureImageUrl || design.heroPhotoUrl || design.athleteAvatarUrl || '';
  const visualMode = design.visualMode || 'diagonal-campaign';

  const renderModeClubLogoMark = (sizePx = 36, darkBg = true) => {
    if (!design.showClubLogo) return null;
    if (design.clubLogoUrl && !logoImgError) {
      return (
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-white p-1 shadow-xs"
          style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
        >
          <img
            src={design.clubLogoUrl}
            alt={design.clubName}
            referrerPolicy="no-referrer"
            crossOrigin={getCrossOrigin(design.clubLogoUrl)}
            onError={() => setLogoImgError(true)}
            className="w-full h-full object-contain"
          />
        </div>
      );
    }
    return (
      <div
        className="rounded-xl flex items-center justify-center shrink-0 font-black tracking-tight"
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          backgroundColor: darkBg ? 'rgba(255,255,255,0.14)' : design.primaryColor,
          color: '#FFFFFF',
          border: darkBg ? '1px solid rgba(255,255,255,0.28)' : 'none',
          fontSize: `${Math.round(sizePx * 0.34)}px`,
        }}
      >
        {clubInitials || 'SF'}
      </div>
    );
  };

  // POSTER MODE 1: Dinamik Şerit (Diagonal Campaign — inspired by Sportive Kasım)
  const renderDiagonalCampaignStage = () => {
    const headlineSize = Math.round((isWide ? 42 : isSquare ? 46 : isStory ? 56 : 52) * scaleFactor);
    return (
      <div
        className="relative w-full h-full flex flex-col justify-between overflow-hidden"
        style={{
          backgroundColor: '#071B34',
          padding: isWide ? '22px 30px' : isStory ? '36px 26px 28px' : '28px 26px 22px',
        }}
      >
        {/* Full-bleed sports action photo */}
        {activePosterPhoto && (
          <img
            src={activePosterPhoto}
            alt={design.designName}
            referrerPolicy="no-referrer"
            crossOrigin={getCrossOrigin(activePosterPhoto)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Angled geometric color wedges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: 'polygon(0 0, 56% 0, 35% 100%, 0 100%)',
            background: 'linear-gradient(160deg, rgba(6, 26, 56, 0.86) 0%, rgba(10, 42, 74, 0.58) 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 14% 100%)',
            background: `linear-gradient(135deg, ${hexToRgba(design.primaryColor, 0.52)} 0%, ${hexToRgba(
              design.accentColor === '#F97316' ? '#10B981' : design.accentColor,
              0.45
            )} 100%)`,
            mixBlendMode: 'multiply',
          }}
        />

        {/* Top gradient for ultra-crisp display title */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: isWide ? '55%' : '46%',
            background:
              'linear-gradient(180deg, rgba(5, 18, 38, 0.78) 0%, rgba(5, 18, 38, 0.28) 65%, transparent 100%)',
          }}
        />

        {/* Bottom angled dark ribbon */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: isWide ? '26%' : '20%',
            clipPath: 'polygon(0 28%, 100% 0, 100% 100%, 0 100%)',
            backgroundColor: 'rgba(6, 18, 36, 0.90)',
          }}
        />

        {/* Top Headline Block */}
        <div className={`relative z-10 flex flex-col ${design.textAlign === 'left' ? 'items-start text-left' : 'items-center text-center'} w-full`}>
          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center gap-2">
              {renderModeClubLogoMark(30, true)}
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-white/90">
                {design.clubName}
              </span>
            </div>
            {design.highlightBadge && (
              <span
                className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider"
                style={{
                  backgroundColor: design.accentColor,
                  color: '#0F172A',
                }}
              >
                {design.highlightBadge}
              </span>
            )}
          </div>

          <h2
            className="uppercase tracking-tight text-white w-full mt-1"
            style={{
              fontFamily: "'Barlow Condensed', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 900,
              fontSize: `${headlineSize}px`,
              lineHeight: 0.93,
              textShadow: '0 6px 22px rgba(0, 0, 0, 0.45)',
            }}
          >
            {design.headline}
          </h2>

          <p
            className={`text-white/95 font-bold mt-2 leading-snug ${
              isWide ? 'text-xs max-w-[78%]' : 'text-sm sm:text-base max-w-[88%]'
            }`}
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
          >
            {design.subheadline}
          </p>
        </div>

        {/* Center Match / Athlete Info pill only when match/athlete data is primary */}
        {design.categoryId === 'mac-turnuva' && (
          <div className="relative z-10 my-auto flex justify-center">
            <div
              className="px-4 py-2 rounded-xl flex items-center gap-3 text-white font-black tracking-wide"
              style={{
                backgroundColor: 'rgba(6, 18, 36, 0.82)',
                border: `1px solid ${hexToRgba(design.accentColor, 0.55)}`,
              }}
            >
              <span className="text-xs uppercase">{design.homeTeamName}</span>
              <span
                className="px-2.5 py-0.5 rounded-lg text-sm tabular-nums"
                style={{ backgroundColor: design.accentColor, color: '#0F172A' }}
              >
                {design.layoutVariant === 'final-score'
                  ? `${design.homeScore} : ${design.awayScore}`
                  : 'VS'}
              </span>
              <span className="text-xs uppercase">{design.awayTeamName}</span>
            </div>
          </div>
        )}

        {/* Bottom Callout + Contact Strip */}
        <div className="relative z-10 flex flex-col gap-2 w-full mt-auto">
          <div
            className="text-center font-extrabold italic tracking-tight text-white"
            style={{
              fontSize: isWide ? '18px' : '22px',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}
          >
            {design.ctaText}
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 pt-1.5 border-t border-white/15">
            <span className="truncate">
              {design.dateText}
              {design.locationText ? ` · ${design.locationText}` : ''}
            </span>
            <span className="tabular-nums shrink-0">{design.footerContact}</span>
          </div>
        </div>
      </div>
    );
  };

  // POSTER MODE 2: Editoryal Duotone (Full-bleed tinted photography + massive display type + clean brand bottom)
  const renderDuotoneEditorialStage = () => {
    const headlineSize = Math.round((isWide ? 36 : isSquare ? 38 : isStory ? 46 : 42) * scaleFactor);
    const duotoneHue = design.primaryColor === '#1D4ED8' ? '#047857' : design.primaryColor;
    return (
      <div
        className="relative w-full h-full flex flex-col justify-between overflow-hidden"
        style={{
          backgroundColor: duotoneHue,
          padding: isWide ? '24px 32px' : isStory ? '40px 28px 34px' : '30px 28px 26px',
        }}
      >
        {/* High-contrast B&W photo base + duotone multiply wash */}
        {activePosterPhoto && (
          <img
            src={activePosterPhoto}
            alt={design.designName}
            referrerPolicy="no-referrer"
            crossOrigin={getCrossOrigin(activePosterPhoto)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'grayscale(100%) contrast(1.16) brightness(1.04)' }}
          />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(160deg, ${duotoneHue} 0%, ${design.accentColor} 160%)`,
            mixBlendMode: 'multiply',
            opacity: 0.84,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.06) 36%, rgba(0,0,0,0.08) 58%, rgba(0,0,0,0.68) 100%)',
          }}
        />

        {/* Top Oversized Editorial Headline */}
        <div className="relative z-10 w-full">
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/80 mb-1.5">
            {design.kicker}
          </div>
          <h2
            className="uppercase text-white tracking-tight"
            style={{
              fontFamily: "'Barlow Condensed', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: `${headlineSize}px`,
              lineHeight: 0.96,
              textShadow: '0 4px 18px rgba(0,0,0,0.35)',
            }}
          >
            {design.headline}
          </h2>
        </div>

        {/* Bottom Statement + Bold Centered Brand Lockup */}
        <div className="relative z-10 w-full mt-auto space-y-4">
          {design.categoryId === 'mac-turnuva' && (
            <div className="text-right text-white font-black tracking-tight text-xl tabular-nums">
              {design.homeTeamName}{' '}
              {design.layoutVariant === 'final-score'
                ? `${design.homeScore} — ${design.awayScore}`
                : 'VS'}{' '}
              {design.awayTeamName}
            </div>
          )}

          {design.categoryId === 'sporcu-kartlari' && (
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-white/85">
                {design.athleteBranch} · {design.athleteGroup}
              </div>
              <div className="text-2xl font-black uppercase text-white tracking-tight">
                {design.athleteName}
              </div>
            </div>
          )}

          <p
            className={`text-white uppercase font-extrabold leading-[1.08] tracking-tight ${
              design.textAlign === 'center' ? 'text-center' : 'text-right'
            }`}
            style={{
              fontFamily: "'Barlow Condensed', 'Plus Jakarta Sans', sans-serif",
              fontSize: `${Math.round((isWide ? 24 : 30) * scaleFactor)}px`,
              textShadow: '0 3px 14px rgba(0,0,0,0.4)',
            }}
          >
            {design.subheadline}
          </p>

          {/* Iconic Bottom Club Lockup */}
          <div className="flex items-center justify-center gap-2.5 pt-2">
            {renderModeClubLogoMark(32, true)}
            <span
              className="font-black italic uppercase tracking-wider text-white"
              style={{ fontSize: isWide ? '20px' : '24px' }}
            >
              {design.clubName}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // POSTER MODE 3: Spot Işık & Vurgu Kartı (Club Neon Spotlight — inspired by Uni Athletic)
  const renderClubNeonSpotlightStage = () => {
    const headlineSize = Math.round((isWide ? 36 : isSquare ? 40 : isStory ? 48 : 44) * scaleFactor);
    const neonColor =
      design.accentColor === '#F97316' || design.accentColor === '#0F2444'
        ? '#FACC15'
        : design.accentColor;

    return (
      <div
        className="relative w-full h-full flex flex-col justify-between overflow-hidden"
        style={{
          backgroundColor: '#05142E',
          padding: isWide ? '20px 28px' : isStory ? '36px 24px 28px' : '26px 24px 22px',
        }}
      >
        {activePosterPhoto && (
          <img
            src={activePosterPhoto}
            alt={design.designName}
            referrerPolicy="no-referrer"
            crossOrigin={getCrossOrigin(activePosterPhoto)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Deep Midnight Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(4, 15, 38, 0.92) 0%, rgba(4, 15, 38, 0.36) 34%, rgba(4, 15, 38, 0.18) 62%, rgba(4, 15, 38, 0.92) 100%)',
          }}
        />

        {/* Top Dual-Font Header: Script kicker + Vivid Neon Condensed Headline */}
        <div className="relative z-10 text-center w-full">
          <div
            className="text-white leading-none"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: isWide ? '24px' : '32px',
              fontWeight: 700,
              textShadow: '0 2px 10px rgba(0,0,0,0.45)',
            }}
          >
            {design.kicker.toLowerCase()}
          </div>
          <h2
            className="uppercase tracking-tight mt-0.5"
            style={{
              fontFamily: "'Barlow Condensed', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 900,
              fontSize: `${headlineSize}px`,
              lineHeight: 0.95,
              color: neonColor,
              textShadow: '0 6px 20px rgba(0, 0, 0, 0.55)',
            }}
          >
            {design.headline}
          </h2>
        </div>

        {/* Mid-Left Angled Callout Box */}
        <div className={`relative z-10 my-auto flex ${isWide ? 'justify-start' : 'justify-start'}`}>
          <div
            className="relative px-4 py-3.5 shadow-xl"
            style={{
              maxWidth: isWide ? '54%' : '66%',
              backgroundColor: 'rgba(8, 22, 48, 0.92)',
              border: `2px solid ${neonColor}`,
              transform: 'skewY(-1.5deg)',
            }}
          >
            <div style={{ transform: 'skewY(1.5deg)' }}>
              <p className="text-xs sm:text-[13px] font-bold text-white leading-snug">
                {design.subheadline}
              </p>
              <div
                className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider"
                style={{ color: neonColor }}
              >
                <span>{design.dateText}</span>
                {design.timeText && <span>· {design.timeText}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Club Lockup & Contact Pill */}
        <div className="relative z-10 flex flex-col items-center gap-2 w-full mt-auto">
          <div className="flex items-center gap-2.5">
            {renderModeClubLogoMark(32, true)}
            <div className="text-left">
              <div className="text-base font-black tracking-tight text-white leading-none">
                {design.clubName}
              </div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-slate-300 mt-0.5">
                {design.locationText}
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white text-[#071836] text-[11px] font-extrabold tabular-nums">
            <Phone className="w-3 h-3 shrink-0" />
            <span>{design.footerContact}</span>
            {design.footerWeb && (
              <>
                <span className="opacity-40">|</span>
                <span>{design.footerWeb}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // POSTER MODE 4: Akademi Kayıt & Bilgi (Academy Info Poster — inspired by Sivas Yüzme Kursu)
  const renderAcademyInfoPosterStage = () => {
    const brandBlue =
      design.primaryColor === '#1D4ED8' || design.primaryColor === '#0F2444'
        ? '#0A3E96'
        : design.primaryColor;
    const headlineSize = Math.round((isWide ? 24 : isSquare ? 26 : isStory ? 33 : 30) * scaleFactor);
    const statIcons = [Users, Award, Sparkles];

    return (
      <div
        className="relative w-full h-full flex flex-col justify-between overflow-hidden"
        style={{
          backgroundColor: '#F8FAFC',
          padding: isWide ? '16px 24px' : isStory ? '26px 22px 22px' : '20px 22px 18px',
        }}
      >
        {/* Top/Mid Full-Bleed Bright Photo smoothly melting into clean light bottom */}
        {activePosterPhoto && (
          <img
            src={activePosterPhoto}
            alt={design.designName}
            referrerPolicy="no-referrer"
            crossOrigin={getCrossOrigin(activePosterPhoto)}
            className="absolute inset-x-0 top-0 w-full object-cover"
            style={{
              height: isWide ? '100%' : '68%',
              objectPosition: 'center 25%',
            }}
          />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isWide
              ? 'linear-gradient(90deg, rgba(248,250,252,0.96) 0%, rgba(248,250,252,0.88) 46%, rgba(248,250,252,0.22) 72%, rgba(248,250,252,0.05) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.68) 22%, rgba(255,255,255,0.05) 38%, rgba(255,255,255,0.0) 50%, rgba(248,250,252,0.94) 61%, #F8FAFC 70%, #F8FAFC 100%)',
          }}
        />

        {/* Top Header + Brushed Banner Headline */}
        <div className="relative z-10 flex flex-col items-center text-center w-full">
          <div className="text-sm font-black tracking-tight" style={{ color: brandBlue }}>
            {design.clubName}
          </div>
          {design.footerWeb && (
            <div className="text-[10px] font-semibold text-slate-600 -mt-0.5 mb-2">
              {design.footerWeb}
            </div>
          )}

          {/* Tilted Blue Banner */}
          <div
            className="px-5 py-1.5 rounded-lg shadow-sm"
            style={{
              backgroundColor: brandBlue,
              transform: 'rotate(-1.2deg)',
            }}
          >
            <h2
              className="uppercase tracking-tight text-white leading-none"
              style={{
                fontFamily: "'Barlow Condensed', 'Plus Jakarta Sans', sans-serif",
                fontWeight: 900,
                fontSize: `${headlineSize}px`,
              }}
            >
              {design.headline}
            </h2>
          </div>

          {/* Tilted Yellow Accent Script Ribbon */}
          {design.highlightBadge && (
            <div
              className="px-4 py-0.5 rounded-md shadow-xs -mt-1"
              style={{
                backgroundColor: '#FACC15',
                transform: 'rotate(1deg)',
              }}
            >
              <span
                className="text-[#0A2558] leading-none block"
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: isWide ? '20px' : '24px',
                  fontWeight: 700,
                }}
              >
                {design.highlightBadge}
              </span>
            </div>
          )}

          <p className="text-[11px] font-bold italic text-[#0F2444] mt-1.5 max-w-[86%] line-clamp-2">
            {design.subheadline}
          </p>
        </div>

        {/* Lower Structured Info Grid (3 Icon Stat Cards + 2 Schedule Boxes + Navy Contact Bar) */}
        <div className="relative z-10 w-full mt-auto space-y-2">
          {/* 3 Icon Cards */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {design.stats.slice(0, 3).map((st, idx) => {
              const IconComp = statIcons[idx % statIcons.length];
              return (
                <div
                  key={`${st.label}-${idx}`}
                  className="relative bg-white rounded-xl border border-sky-100 px-2 pt-4 pb-2 text-center shadow-xs"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white mx-auto -mt-7 mb-1 shadow-xs"
                    style={{ backgroundColor: brandBlue }}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500 truncate">
                    {st.label}
                  </div>
                  <div
                    className="text-xs font-black tabular-nums truncate mt-0.5"
                    style={{ color: idx === 2 ? '#B45309' : '#0F172A' }}
                  >
                    {st.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2 Schedule / Location Boxes */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl border border-sky-100 px-2.5 py-1.5 flex items-center gap-2 shadow-xs">
              <Calendar className="w-4 h-4 shrink-0" style={{ color: brandBlue }} />
              <div className="min-w-0">
                <div className="text-[9px] font-bold text-slate-400 uppercase">Tarih</div>
                <div className="text-[11px] font-extrabold text-slate-900 truncate">
                  {design.dateText}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-sky-100 px-2.5 py-1.5 flex items-center gap-2 shadow-xs">
              <Clock className="w-4 h-4 shrink-0" style={{ color: brandBlue }} />
              <div className="min-w-0">
                <div className="text-[9px] font-bold text-slate-400 uppercase">Saat & Tesis</div>
                <div className="text-[11px] font-extrabold text-slate-900 truncate">
                  {design.timeText || design.locationText}
                </div>
              </div>
            </div>
          </div>

          {/* Dark Navy Rounded Contact Bar + Club Mark */}
          <div className="flex items-center gap-2 pt-0.5">
            {design.showClubLogo && (
              <div className="shrink-0">{renderModeClubLogoMark(34, false)}</div>
            )}
            <div
              className="flex-1 rounded-full px-4 py-2 text-white flex items-center justify-between gap-2 text-[11px] font-bold shadow-xs"
              style={{ backgroundColor: '#0A2C6B' }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Phone className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="tabular-nums truncate">{design.footerContact}</span>
              </div>
              <span className="opacity-35">|</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-sky-300" />
                <span className="truncate">{design.locationText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const scaledWidth = Math.round(ratioMeta.stageWidth * zoom);
  const scaledHeight = Math.round(ratioMeta.stageHeight * zoom);

  return (
    <div
      className="mx-auto transition-all duration-200"
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
      }}
    >
      <div
        style={{
          width: `${ratioMeta.stageWidth}px`,
          height: `${ratioMeta.stageHeight}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Export Target Node (Always captured cleanly without wrapper transform distortion) */}
        <div
          ref={exportRef}
          onPointerDown={() => onSelectLayer?.(null)}
          className="relative overflow-hidden flex flex-col justify-between select-none"
          style={{
            width: `${ratioMeta.stageWidth}px`,
            height: `${ratioMeta.stageHeight}px`,
            backgroundColor: design.backgroundColor,
            color: design.textColor,
            padding:
              visualMode !== 'classic-card'
                ? '0px'
                : isWide
                ? '24px 32px'
                : isStory
                ? '34px 28px'
                : '28px',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          {visualMode === 'diagonal-campaign' && renderDiagonalCampaignStage()}
          {visualMode === 'duotone-editorial' && renderDuotoneEditorialStage()}
          {visualMode === 'club-neon-spotlight' && renderClubNeonSpotlightStage()}
          {visualMode === 'academy-info-poster' && renderAcademyInfoPosterStage()}

          {visualMode === 'classic-card' && (
            <>
              {renderHeroBackgroundPhoto()}
              {renderPatternLayer()}
              {renderClubHeader()}
              <div className="my-2 flex-1 flex flex-col justify-center">
                {renderBodyContent()}
              </div>
              {renderFooterStrip()}
            </>
          )}

          {renderCustomImageLayers()}

          {/* Optional Safe-Zone Alignment Guides */}
          {showSafeGuides && (
            <div
              data-studio-guide="true"
              className="absolute inset-4 border border-dashed border-sky-400/50 rounded-lg pointer-events-none z-30"
            />
          )}
        </div>
      </div>
    </div>
  );
};
