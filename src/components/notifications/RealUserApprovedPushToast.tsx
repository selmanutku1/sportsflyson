import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  X,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Building2,
  UserCheck,
} from 'lucide-react';
import { NavPage } from '../../types';

interface RealApprovedUserDetail {
  notification: {
    id: string;
    title: string;
    description: string;
    time: string;
    actionUrl?: string;
  };
  user: {
    userId: string;
    email: string;
    managerName: string;
    clubName: string;
    role?: string;
    phone?: string;
    approvedAt?: string;
  };
}

interface RealUserApprovedPushToastProps {
  onNavigate?: (page: NavPage) => void;
}

export const RealUserApprovedPushToast: React.FC<RealUserApprovedPushToastProps> = ({
  onNavigate,
}) => {
  const [activeAlert, setActiveAlert] = useState<RealApprovedUserDetail | null>(null);
  const [progress, setProgress] = useState<number>(100);
  const timerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  // Play subtle high-quality chime for verified approved users
  const playApprovalChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.25); // D6

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.55);
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 700);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([70, 50, 120]);
      } catch (e) {}
    }
  };

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setActiveAlert(null);
  };

  const handleOpenAccess = () => {
    if (onNavigate) {
      onNavigate('yetkilendirmeler');
    }
    handleDismiss();
  };

  useEffect(() => {
    const handleApprovedEvent = (e: any) => {
      const data: RealApprovedUserDetail = e.detail;
      if (!data || !data.user) return;

      playApprovalChime();
      triggerHaptic();

      setActiveAlert(data);
      setProgress(100);

      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      const duration = 6500;
      const stepInterval = 50;
      const totalSteps = duration / stepInterval;
      let currentStep = totalSteps;

      progressIntervalRef.current = setInterval(() => {
        currentStep -= 1;
        const newProgress = Math.max(0, (currentStep / totalSteps) * 100);
        setProgress(newProgress);
        if (currentStep <= 0) {
          clearInterval(progressIntervalRef.current);
        }
      }, stepInterval);

      timerRef.current = setTimeout(() => {
        setActiveAlert(null);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }, duration);
    };

    window.addEventListener('sportsfly_real_user_approved', handleApprovedEvent);
    return () => {
      window.removeEventListener('sportsfly_real_user_approved', handleApprovedEvent);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  if (!activeAlert) return null;

  return (
    <div
      className="fixed top-3 sm:top-5 left-3 right-3 sm:left-auto sm:right-5 sm:w-[420px] z-[120] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-slate-900/95 dark:bg-[#090d16]/95 text-white rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md overflow-hidden ring-1 ring-black/20">
        {/* Top Header */}
        <div className="px-3.5 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <ShieldCheck className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            </div>
            <span className="font-bold text-slate-200">SportsFly Doğrulanmış Bildirim</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-medium">Veritabanı</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[9px] uppercase tracking-wider border border-emerald-500/30">
              ONAYLANDI
            </span>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20">
            <UserCheck className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-white truncate">
                {activeAlert.user.managerName}
              </h4>
              <span className="text-slate-400 text-xs">({activeAlert.user.clubName})</span>
            </div>

            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Kullanıcı hesabı veritabanında başarıyla onaylandı ve erişim yetkisi tanımlandı.
            </p>

            {/* Quick Action Button */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleOpenAccess}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Yetkilendirmeleri Gör</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Auto-Dismiss Progress Bar */}
        <div className="h-0.5 w-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
