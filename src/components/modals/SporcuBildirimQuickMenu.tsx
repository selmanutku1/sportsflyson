import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarClock,
  CreditCard,
  UserX,
  Trophy,
  PenLine,
  MessageCircle,
  Send,
  ChevronRight,
  Phone,
  X,
} from 'lucide-react';
import { SporcuItem } from '../../types';
import { addBildirimLog } from '../../data/karneBildirimData';
import {
  SPORCU_NOTIFICATION_TEMPLATES,
  SporcuWhatsAppNotificationType,
  buildQuickWhatsAppPayload,
  resolveAthleteNotificationContext,
} from './SporcuWhatsAppNotificationModal';

export interface BildirimQuickMenuAnchor {
  sporcu: SporcuItem;
  rect: DOMRect;
}

interface SporcuBildirimQuickMenuProps {
  anchor: BildirimQuickMenuAnchor | null;
  onClose: () => void;
  onSelectTemplate: (sporcu: SporcuItem, type: SporcuWhatsAppNotificationType) => void;
  onQuickSent?: (message: string) => void;
}

function renderTemplateIcon(type: SporcuWhatsAppNotificationType) {
  switch (type) {
    case 'training':
      return <CalendarClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case 'dues':
      return <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'attendance':
      return <UserX className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    case 'match':
      return <Trophy className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case 'custom':
    default:
      return <PenLine className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
  }
}

export const SporcuBildirimQuickMenu: React.FC<SporcuBildirimQuickMenuProps> = ({
  anchor,
  onClose,
  onSelectTemplate,
  onQuickSent,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; ready: boolean }>({
    top: 0,
    left: 0,
    ready: false,
  });

  useLayoutEffect(() => {
    if (!anchor) return;
    const menuWidth = Math.min(340, window.innerWidth - 24);
    const estimatedHeight = menuRef.current?.offsetHeight || 390;
    const margin = 12;

    let left = anchor.rect.right - menuWidth;
    if (left < margin) {
      left = Math.max(margin, anchor.rect.left);
    }
    if (left + menuWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - menuWidth - margin);
    }

    let top = anchor.rect.bottom + 8;
    if (top + estimatedHeight > window.innerHeight - margin) {
      const aboveTop = anchor.rect.top - estimatedHeight - 8;
      top = aboveTop >= margin ? aboveTop : Math.max(margin, window.innerHeight - estimatedHeight - margin);
    }

    setPosition({ top, left, ready: true });
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleWindowResizeOrScroll = () => {
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleWindowResizeOrScroll);
    window.addEventListener('scroll', handleWindowResizeOrScroll, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleWindowResizeOrScroll);
      window.removeEventListener('scroll', handleWindowResizeOrScroll, true);
    };
  }, [anchor, onClose]);

  if (!anchor) return null;

  const { sporcu } = anchor;
  const ctx = resolveAthleteNotificationContext(sporcu);

  const getDynamicSubtitle = (type: SporcuWhatsAppNotificationType): string => {
    switch (type) {
      case 'training':
        return `${ctx.trainingDays} • ${ctx.trainingTime}`;
      case 'dues':
        return `${ctx.duesAmount} ₺ • Son ödeme: ${ctx.duesDueDate}`;
      case 'attendance':
        return 'Antrenmana katılamama bilgisi gönder';
      case 'match':
        return `${sporcu.teamGroup || sporcu.branch || 'Takım'} müsabaka daveti`;
      case 'custom':
      default:
        return 'Kendi mesaj metninizi düzenleyerek gönderin';
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={`${sporcu.name} hızlı bildirim şablonları`}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: 'min(340px, calc(100vw - 24px))',
      }}
      className={`z-[70] bg-white dark:bg-[#111c2e] rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 overflow-hidden transition-opacity duration-100 ${
        position.ready ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-emerald-50/75 dark:bg-emerald-950/35 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{sporcu.name} — Hızlı Bildirim</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">
              {ctx.parentName} {ctx.parentPhone ? `• ${ctx.parentPhone}` : '• Telefon eksik'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Menüyü kapat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Template List */}
      <div className="p-1.5 space-y-1">
        <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>Hazır WhatsApp Şablonları</span>
          <span>Düzenle / Hızlı Gönder</span>
        </div>

        {SPORCU_NOTIFICATION_TEMPLATES.map((tpl) => {
          const payload = buildQuickWhatsAppPayload(sporcu, tpl.id);
          const allowInstantSend = tpl.id !== 'custom' && payload.isPhoneValid && !!payload.whatsappUrl;

          return (
            <div
              key={tpl.id}
              className="group flex items-center gap-1 rounded-xl hover:bg-slate-50 dark:hover:bg-[#162238] transition-colors pr-1"
            >
              {/* Primary click: open pre-filled modal with this template */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose();
                  onSelectTemplate(sporcu, tpl.id);
                }}
                className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2 text-left cursor-pointer"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${tpl.accentBg} ${tpl.accentBorder}`}
                >
                  {renderTemplateIcon(tpl.id)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      {tpl.label}
                    </span>
                    {tpl.id === 'dues' && ctx.hasOverdueDues && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 shrink-0">
                        Gecikmiş
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {getDynamicSubtitle(tpl.id)}
                  </div>
                </div>
                {!allowInstantSend && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                )}
              </button>

              {/* Direct 1-click WhatsApp send shortcut */}
              {allowInstantSend && (
                <a
                  href={payload.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    addBildirimLog({
                      karneId: sporcu.id,
                      sporcuAdSoyad: sporcu.name,
                      veliAdSoyad: payload.context.parentName,
                      telefon: payload.context.parentPhone,
                      kanal: 'whatsapp',
                      mesaj: payload.message,
                      durum: 'WhatsApp Açıldı',
                      raporKodu: tpl.logCode,
                    });
                    if (onQuickSent) {
                      onQuickSent(
                        `${sporcu.name} velisine hızlı WhatsApp ${tpl.label.toLowerCase()} başlatıldı.`
                      );
                    }
                    onClose();
                  }}
                  title={`Önizlemeden direkt WhatsApp ile ${tpl.label} gönder`}
                  className="shrink-0 w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-2xs active:scale-95 transition-all"
                  aria-label={`WhatsApp ile ${tpl.label} hemen gönder`}
                >
                  <Send className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Hint */}
      <div className="px-3.5 py-2 bg-slate-50/80 dark:bg-[#0d1626] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>Şablona tıklayıp düzenleyebilir veya</span>
        <span className="font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
          <Send className="w-2.5 h-2.5" /> ile direkt gönder
        </span>
      </div>
    </div>,
    document.body
  );
};
