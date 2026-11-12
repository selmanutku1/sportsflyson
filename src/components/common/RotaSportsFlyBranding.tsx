import React from 'react';
import { SportsFlyVectorMark } from '../SportsFlyLogo';
import { ROTA_PERFORMANS_LOGO_DATA_URL } from '../../assets/rotaPerformansLogoDataUrl';

export interface RotaSportsFlyHeaderBadgeProps {
  isDark?: boolean;
  pageNo?: number;
  totalReportPages?: number;
  effectiveSecondaryHex?: string;
  hideRota?: boolean;
  hideSportsFly?: boolean;
  firmLogoUrl?: string;
  firmName?: string;
}

/**
 * Co-branding header badge:
 * - Analysis Firm: Rota Performans / Analiz Firması (with official circular logo)
 * - Infrastructure Provider: Powered by SportsFly LAB (links to https://sportsfly.com.tr)
 */
export const RotaSportsFlyHeaderBadge: React.FC<RotaSportsFlyHeaderBadgeProps> = ({
  isDark = false,
  pageNo,
  totalReportPages,
  effectiveSecondaryHex,
  hideRota = false,
  hideSportsFly = false,
  firmLogoUrl,
  firmName,
}) => {
  const effectiveFirmName = firmName || 'ROTA PERFORMANS';

  return (
    <div
      className={`flex items-center justify-between sm:justify-end print:justify-end gap-2.5 px-3 py-1.5 rounded-xl border shrink-0 transition-colors ${
        isDark
          ? 'bg-white/10 border-white/20 text-white'
          : 'bg-white border-slate-200/90 text-slate-900 shadow-2xs'
      }`}
    >
      {!hideRota && (
        <>
          {/* 1. Analiz Firması Logosu & İsmi */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white p-0.5 border border-sky-400/60 shadow-xs flex items-center justify-center shrink-0">
              <img
                src={firmLogoUrl || ROTA_PERFORMANS_LOGO_DATA_URL}
                alt={effectiveFirmName}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left">
              <div
                className={`text-[11px] font-black tracking-tight leading-tight uppercase ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {effectiveFirmName.includes(' ') ? (
                  <>
                    {effectiveFirmName.split(' ')[0]}{' '}
                    <span className="text-cyan-400">
                      {effectiveFirmName.split(' ').slice(1).join(' ')}
                    </span>
                  </>
                ) : (
                  effectiveFirmName
                )}
              </div>
            </div>
          </div>
          {!hideSportsFly && <div className={`h-6 w-px ${isDark ? 'bg-white/20' : 'bg-slate-200'}`} />}
        </>
      )}

      {!hideSportsFly && (
        /* 2. Official SportsFly LAB Badge (Top-Right of all Report Pages) */
        <a
          href="https://sportsfly.com.tr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer group"
          title="SportsFly LAB"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
            <img
              src="/sportsfly-logo.png"
              alt="SportsFly LAB"
              className="w-full h-full object-contain scale-135"
            />
          </div>
          <div className="text-left flex items-center">
            <div className="flex items-center gap-1.5 leading-none">
              <span
                className={`text-[13px] sm:text-[13.5px] font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                SportsFly
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-sky-600 text-white shadow-3xs">
                LAB
              </span>
            </div>
          </div>
        </a>
      )}

      {/* Note: Page numbers removed per user request */}
    </div>
  );
};

export interface RotaSportsFlyFooterBadgeProps {
  primaryHex?: string;
  clubName?: string;
  athleteCode?: string;
  pageText?: string;
  hideRota?: boolean;
  hideSportsFly?: boolean;
  firmLogoUrl?: string;
  firmName?: string;
}

/**
 * Co-branding footer badge for bottom of A4 reports
 * Links SportsFly to https://sportsfly.com.tr
 */
export const RotaSportsFlyFooterBadge: React.FC<RotaSportsFlyFooterBadgeProps> = ({
  primaryHex = '#0284c7',
  clubName,
  athleteCode,
  pageText,
  hideRota = false,
  hideSportsFly = false,
  firmLogoUrl,
  firmName,
}) => {
  return (
    <div className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2.5 bg-slate-50/95 px-3.5 py-2 rounded-xl border border-slate-200 text-left">
      {/* Left: Dual Brand Attribution */}
      <div className="flex flex-wrap items-center gap-3">
        {!hideRota && (
          /* Rota Performans */
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-white p-0.5 border border-sky-400 shadow-2xs shrink-0 flex items-center justify-center">
              <img
                src={firmLogoUrl || ROTA_PERFORMANS_LOGO_DATA_URL}
                alt={firmName || "Rota Performans"}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-[12px] font-black tracking-tight text-slate-900 leading-tight">
                {firmName ? (
                  firmName.includes(' ') ? (
                    <>
                      {firmName.split(' ')[0]} <span className="text-sky-600">{firmName.split(' ').slice(1).join(' ')}</span>
                    </>
                  ) : (
                    firmName
                  )
                ) : (
                  <>
                    ROTA <span className="text-sky-600">PERFORMANS</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!hideRota && !hideSportsFly && <span className="text-slate-300 hidden sm:inline print:inline">|</span>}

        {!hideSportsFly && (
          /* Official SportsFly LAB Attribution */
          <a
            href="https://sportsfly.com.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            title="SportsFly LAB"
          >
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
              <img
                src="/sportsfly-logo.png"
                alt="SportsFly LAB"
                className="w-full h-full object-contain scale-135"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-[12px] font-black tracking-tight text-slate-900">
                  SportsFly <span style={{ color: primaryHex }}>LAB</span>
                </span>
              </div>
            </div>
          </a>
        )}
      </div>

      {/* Right: Verification & Page Index */}
      {(clubName || athleteCode || pageText) && (
        <div className="flex items-center justify-between sm:justify-end print:justify-end gap-2.5 text-[11px] shrink-0 font-sans">
          {clubName && (
            <div className="text-right hidden sm:block print:block font-bold text-slate-700 uppercase tracking-tight text-[11px]">
              {clubName}
            </div>
          )}
          {athleteCode && pageText && (
            <div
              className="font-bold px-2.5 py-1 rounded-lg text-white text-[11px]"
              style={{ backgroundColor: primaryHex }}
            >
              {athleteCode} · {pageText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
