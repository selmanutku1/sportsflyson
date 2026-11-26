import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageCircle,
  CalendarClock,
  CreditCard,
  Copy,
  Check,
  RotateCcw,
  Phone,
  User,
  Clock,
  MapPin,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  History,
  UserX,
  Trophy,
  PenLine,
} from 'lucide-react';
import { SporcuItem, GrupItem, OdemePlaniItem } from '../../types';
import { INITIAL_GRUPLAR, INITIAL_ODEME_PLANI } from '../../data/mockMuhasebeData';
import {
  addBildirimLog,
  cleanPhoneForWhatsApp,
  getStoredBildirimLogs,
  VeliBildirimLog,
} from '../../data/karneBildirimData';

export type SporcuWhatsAppNotificationType =
  | 'training'
  | 'dues'
  | 'attendance'
  | 'match'
  | 'custom';

export interface NotificationTemplateMeta {
  id: SporcuWhatsAppNotificationType;
  label: string;
  shortLabel: string;
  description: string;
  logCode: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
}

export const SPORCU_NOTIFICATION_TEMPLATES: NotificationTemplateMeta[] = [
  {
    id: 'training',
    label: 'Antrenman Hatırlatması',
    shortLabel: 'Antrenman',
    description: 'Gün, saat ve saha/tesis bilgisini veliye otomatik ilet',
    logCode: 'ANTRENMAN',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    accentBorder: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'dues',
    label: 'Aidat Ödemesi',
    shortLabel: 'Aidat',
    description: 'Ödeme tutarı, taksit ve son ödeme tarihini bildir',
    logCode: 'AIDAT',
    accentBg: 'bg-amber-50 dark:bg-amber-950/50',
    accentText: 'text-amber-700 dark:text-amber-300',
    accentBorder: 'border-amber-200 dark:border-amber-800',
  },
  {
    id: 'attendance',
    label: 'Devamsızlık Bildirimi',
    shortLabel: 'Devamsızlık',
    description: 'Bugünkü antrenmana katılamayan sporcu velisini bilgilendir',
    logCode: 'DEVAMSIZLIK',
    accentBg: 'bg-rose-50 dark:bg-rose-950/50',
    accentText: 'text-rose-700 dark:text-rose-300',
    accentBorder: 'border-rose-200 dark:border-rose-800',
  },
  {
    id: 'match',
    label: 'Maç / Turnuva Duyurusu',
    shortLabel: 'Maç / Turnuva',
    description: 'Müsabaka tarihi, toplanma saati ve lokasyonu paylaş',
    logCode: 'MAC',
    accentBg: 'bg-blue-50 dark:bg-blue-950/50',
    accentText: 'text-blue-700 dark:text-blue-300',
    accentBorder: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'custom',
    label: 'Özel Veli Mesajı',
    shortLabel: 'Özel Mesaj',
    description: 'Sporcu bilgilerini ekleyerek serbest WhatsApp mesajı yaz',
    logCode: 'OZEL',
    accentBg: 'bg-slate-100 dark:bg-slate-800/70',
    accentText: 'text-slate-700 dark:text-slate-300',
    accentBorder: 'border-slate-200 dark:border-slate-700',
  },
];

interface SporcuWhatsAppNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sporcu: SporcuItem | null;
  initialType?: SporcuWhatsAppNotificationType;
  onSuccess?: (message: string) => void;
}

export interface ResolvedParentContext {
  parentName: string;
  parentPhone: string;
  groupName: string;
  trainingDays: string;
  trainingTime: string;
  trainingLocation: string;
  duesAmount: string;
  duesDueDate: string;
  duesPlanName: string;
  duesStatusLabel: string;
  hasOverdueDues: boolean;
}

function getTodayDateString(): string {
  return new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getNextMonthDateString(): string {
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), Math.min(28, now.getDate() + 5));
  return due.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getNextWeekendDateString(): string {
  const d = new Date();
  const daysUntilSaturday = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSaturday);
  return d.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function resolveAthleteNotificationContext(sporcu: SporcuItem): ResolvedParentContext {
  const normalizedName = sporcu.name.trim().toLowerCase();
  const normalizedCode = (sporcu.code || '').trim();

  let matchedGroup: GrupItem | undefined;
  let matchedMember: NonNullable<GrupItem['members']>[number] | undefined;

  for (const grp of INITIAL_GRUPLAR) {
    const found = (grp.members || []).find(
      (m) =>
        (normalizedCode && m.code === normalizedCode) ||
        m.name.trim().toLowerCase() === normalizedName
    );
    if (found) {
      matchedGroup = grp;
      matchedMember = found;
      break;
    }
  }

  if (!matchedGroup && sporcu.branch) {
    matchedGroup = INITIAL_GRUPLAR.find(
      (g) => g.branch.toLowerCase() === sporcu.branch?.toLowerCase()
    );
  }

  const matchedPayments: OdemePlaniItem[] = INITIAL_ODEME_PLANI.filter(
    (p) =>
      (normalizedCode && p.athleteCode === normalizedCode) ||
      p.athleteName.trim().toLowerCase() === normalizedName
  );
  const priorityPayment =
    matchedPayments.find((p) => p.status === 'Gecikti') ||
    matchedPayments.find((p) => p.status === 'Bekliyor') ||
    matchedPayments[0];

  const parentName = matchedMember?.parentName || `${sporcu.name} Velisi`;
  const parentPhone = matchedMember?.parentPhone || sporcu.phone || '';
  const groupName = matchedGroup?.name || sporcu.teamGroup || `${sporcu.branch || 'Spor'} Gelişim Grubu`;
  const trainingDays = matchedGroup?.schedule?.days?.join(', ') || getTomorrowDateString();
  const trainingTime = matchedGroup?.schedule?.time || '17:30 - 19:00';
  const trainingLocation = matchedGroup?.schedule?.location || sporcu.facility || 'Kulüp Ana Tesis';

  const resolvedAmount = priorityPayment?.amount || matchedGroup?.monthlyFee || 3500;
  const duesAmount = resolvedAmount.toLocaleString('tr-TR');
  const duesDueDate = priorityPayment?.dueDate || getNextMonthDateString();
  const duesPlanName = priorityPayment
    ? `${priorityPayment.planName} (${priorityPayment.installment}. Taksit)`
    : `${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Aylık Kulüp Aidatı`;
  const duesStatusLabel =
    priorityPayment?.status === 'Gecikti'
      ? 'Gecikmiş Ödeme'
      : priorityPayment?.status === 'Bekliyor'
      ? 'Yaklaşan Taksit'
      : 'Aylık Aidat';

  return {
    parentName,
    parentPhone,
    groupName,
    trainingDays,
    trainingTime,
    trainingLocation,
    duesAmount,
    duesDueDate,
    duesPlanName,
    duesStatusLabel,
    hasOverdueDues: priorityPayment?.status === 'Gecikti',
  };
}

export function buildWhatsAppMessage(params: {
  type: SporcuWhatsAppNotificationType;
  sporcu: SporcuItem;
  parentName: string;
  trainingDate: string;
  trainingTime: string;
  trainingLocation: string;
  duesAmount: string;
  duesDueDate: string;
  duesPlanName: string;
  hasOverdueDues: boolean;
  attendanceDate?: string;
  matchDate?: string;
  matchTime?: string;
  matchLocation?: string;
  matchTitle?: string;
}): string {
  const {
    type,
    sporcu,
    parentName,
    trainingDate,
    trainingTime,
    trainingLocation,
    duesAmount,
    duesDueDate,
    duesPlanName,
    hasOverdueDues,
    attendanceDate = getTodayDateString(),
    matchDate = getNextWeekendDateString(),
    matchTime = '11:00 (Toplanma: 10:15)',
    matchLocation = trainingLocation,
    matchTitle = `${sporcu.teamGroup || sporcu.branch || 'Takım'} Hafta Sonu Müsabakası`,
  } = params;

  const clubTitle = sporcu.facility || 'SportsFly Spor Kulübü';
  const branchText = sporcu.branch || 'Genel Branş';
  const groupText = sporcu.teamGroup || 'Gelişim Grubu';

  if (type === 'training') {
    return `Sayın ${parentName},

Sporcumuz *${sporcu.name}* için yaklaşan antrenman programını hatırlatmak isteriz.

📅 *Antrenman Günü / Tarihi:* ${trainingDate}
⏰ *Saat:* ${trainingTime}
📍 *Tesis / Saha:* ${trainingLocation}
🏅 *Branş & Grup:* ${branchText} — ${groupText}

Sporcumuzun antrenmandan 10 dakika önce spor kıyafetleri ve su matarası ile hazır bulunmasını rica eder, iyi çalışmalar dileriz.

*${clubTitle}*`;
  }

  if (type === 'dues') {
    const introLine = hasOverdueDues
      ? `Sporcumuz *${sporcu.name}* adına vadesi geçmiş aidat ödemesini nazikçe hatırlatmak isteriz.`
      : `Sporcumuz *${sporcu.name}* adına yaklaşan aidat ödeme bilgilerini paylaşmak isteriz.`;

    return `Sayın ${parentName},

${introLine}

💳 *Ödeme Kalemi:* ${duesPlanName}
💰 *Tutar:* *${duesAmount} ₺*
📅 *Son Ödeme Tarihi:* ${duesDueDate}
🆔 *Sporcu Kodu:* ${sporcu.code}
🏫 *Kulüp / Tesis:* ${clubTitle}

Ödemenizi kulüp yönetimi üzerinden veya tanımlı banka/online ödeme kanallarından gerçekleştirebilirsiniz. Ödemeyi yaptıysanız bu mesajı dikkate almayınız. İlginiz için teşekkür ederiz.

*${clubTitle}*`;
  }

  if (type === 'attendance') {
    return `Sayın ${parentName},

Sporcumuz *${sporcu.name}*, *${attendanceDate}* tarihli ${branchText} (${groupText}) antrenmanına katılım sağlayamamıştır.

📍 *Tesis:* ${trainingLocation}
⏰ *Antrenman Saati:* ${trainingTime}

Sağlık veya mazeret durumu hakkında bilgi paylaşmak isterseniz bu mesaj üzerinden bize dönüş yapabilirsiniz.

*${clubTitle}*`;
  }

  if (type === 'match') {
    return `Sayın ${parentName},

Sporcumuz *${sporcu.name}* yaklaşan müsabaka kadrosunda yer almaktadır.

🏆 *Organizasyon:* ${matchTitle}
📅 *Tarih:* ${matchDate}
⏰ *Saat:* ${matchTime}
📍 *Tesis / Saha:* ${matchLocation}
🏅 *Branş & Grup:* ${branchText} — ${groupText}

Sporcumuzun maç forması, lisans/kimlik belgesi ve su matarası ile belirtilen toplanma saatinde hazır bulunmasını rica ederiz. Başarılar dileriz!

*${clubTitle}*`;
  }

  return `Sayın ${parentName},

Sporcumuz *${sporcu.name}* (${branchText} — ${groupText}) hakkında bilgilendirme:

[Mesajınızı buraya yazabilirsiniz]

Saygılarımızla,
*${clubTitle}*`;
}

export function buildQuickWhatsAppPayload(
  sporcu: SporcuItem,
  type: SporcuWhatsAppNotificationType
): {
  context: ResolvedParentContext;
  message: string;
  cleanedPhone: string;
  isPhoneValid: boolean;
  whatsappUrl?: string;
  templateMeta: NotificationTemplateMeta;
} {
  const context = resolveAthleteNotificationContext(sporcu);
  const message = buildWhatsAppMessage({
    type,
    sporcu,
    parentName: context.parentName,
    trainingDate: context.trainingDays,
    trainingTime: context.trainingTime,
    trainingLocation: context.trainingLocation,
    duesAmount: context.duesAmount,
    duesDueDate: context.duesDueDate,
    duesPlanName: context.duesPlanName,
    hasOverdueDues: context.hasOverdueDues,
  });
  const cleanedPhone = cleanPhoneForWhatsApp(context.parentPhone);
  const isPhoneValid = cleanedPhone.length >= 10;
  const whatsappUrl = isPhoneValid
    ? `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(message)}`
    : undefined;
  const templateMeta =
    SPORCU_NOTIFICATION_TEMPLATES.find((t) => t.id === type) ||
    SPORCU_NOTIFICATION_TEMPLATES[0];

  return {
    context,
    message,
    cleanedPhone,
    isPhoneValid,
    whatsappUrl,
    templateMeta,
  };
}

function getTemplateIcon(type: SporcuWhatsAppNotificationType, className = 'w-4 h-4') {
  switch (type) {
    case 'training':
      return <CalendarClock className={className} />;
    case 'dues':
      return <CreditCard className={className} />;
    case 'attendance':
      return <UserX className={className} />;
    case 'match':
      return <Trophy className={className} />;
    case 'custom':
    default:
      return <PenLine className={className} />;
  }
}

export const SporcuWhatsAppNotificationModal: React.FC<SporcuWhatsAppNotificationModalProps> = ({
  isOpen,
  onClose,
  sporcu,
  initialType = 'training',
  onSuccess,
}) => {
  const [notificationType, setNotificationType] =
    useState<SporcuWhatsAppNotificationType>(initialType);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Training reminder fields
  const [trainingDate, setTrainingDate] = useState('');
  const [trainingTime, setTrainingTime] = useState('');
  const [trainingLocation, setTrainingLocation] = useState('');

  // Dues notification fields
  const [duesAmount, setDuesAmount] = useState('');
  const [duesDueDate, setDuesDueDate] = useState('');
  const [duesPlanName, setDuesPlanName] = useState('');
  const [duesStatusLabel, setDuesStatusLabel] = useState('');
  const [hasOverdueDues, setHasOverdueDues] = useState(false);

  // Attendance & Match fields
  const [attendanceDate, setAttendanceDate] = useState('');
  const [matchTitle, setMatchTitle] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchLocation, setMatchLocation] = useState('');

  // Message state
  const [customMessage, setCustomMessage] = useState('');
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [justSentLabel, setJustSentLabel] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<VeliBildirimLog[]>([]);

  useEffect(() => {
    if (!isOpen || !sporcu) return;
    const ctx = resolveAthleteNotificationContext(sporcu);
    setNotificationType(initialType);
    setParentName(ctx.parentName);
    setParentPhone(ctx.parentPhone);
    setTrainingDate(ctx.trainingDays);
    setTrainingTime(ctx.trainingTime);
    setTrainingLocation(ctx.trainingLocation);
    setDuesAmount(ctx.duesAmount);
    setDuesDueDate(ctx.duesDueDate);
    setDuesPlanName(ctx.duesPlanName);
    setDuesStatusLabel(ctx.duesStatusLabel);
    setHasOverdueDues(ctx.hasOverdueDues);
    setAttendanceDate(getTodayDateString());
    setMatchTitle(`${sporcu.teamGroup || sporcu.branch || 'Takım'} Hafta Sonu Müsabakası`);
    setMatchDate(getNextWeekendDateString());
    setMatchTime('11:00 (Toplanma: 10:15)');
    setMatchLocation(ctx.trainingLocation);
    setIsManuallyEdited(false);
    setCopiedMessage(false);
    setJustSentLabel(null);

    const athleteLogs = getStoredBildirimLogs().filter(
      (l) =>
        l.karneId === sporcu.id ||
        l.sporcuAdSoyad.trim().toLowerCase() === sporcu.name.trim().toLowerCase()
    );
    setRecentLogs(athleteLogs.slice(0, 3));
  }, [isOpen, sporcu, initialType]);

  const generatedMessage = useMemo(() => {
    if (!sporcu) return '';
    return buildWhatsAppMessage({
      type: notificationType,
      sporcu,
      parentName: parentName.trim() || `${sporcu.name} Velisi`,
      trainingDate: trainingDate.trim() || getTomorrowDateString(),
      trainingTime: trainingTime.trim() || '17:30 - 19:00',
      trainingLocation: trainingLocation.trim() || sporcu.facility,
      duesAmount: duesAmount.trim() || '3.500',
      duesDueDate: duesDueDate.trim() || getNextMonthDateString(),
      duesPlanName: duesPlanName.trim() || 'Aylık Kulüp Aidatı',
      hasOverdueDues,
      attendanceDate: attendanceDate.trim() || getTodayDateString(),
      matchTitle: matchTitle.trim() || 'Hafta Sonu Müsabakası',
      matchDate: matchDate.trim() || getNextWeekendDateString(),
      matchTime: matchTime.trim() || '11:00 (Toplanma: 10:15)',
      matchLocation: matchLocation.trim() || sporcu.facility,
    });
  }, [
    sporcu,
    notificationType,
    parentName,
    trainingDate,
    trainingTime,
    trainingLocation,
    duesAmount,
    duesDueDate,
    duesPlanName,
    hasOverdueDues,
    attendanceDate,
    matchTitle,
    matchDate,
    matchTime,
    matchLocation,
  ]);

  useEffect(() => {
    if (!isManuallyEdited) {
      setCustomMessage(generatedMessage);
    }
  }, [generatedMessage, isManuallyEdited]);

  if (!isOpen || !sporcu) return null;

  const activeTemplate =
    SPORCU_NOTIFICATION_TEMPLATES.find((t) => t.id === notificationType) ||
    SPORCU_NOTIFICATION_TEMPLATES[0];

  const cleanedPhone = cleanPhoneForWhatsApp(parentPhone);
  const isPhoneValid = cleanedPhone.length >= 10;
  const activeMessage = customMessage.trim() || generatedMessage;
  const whatsappUrl = isPhoneValid
    ? `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(activeMessage)}`
    : undefined;

  const handleSelectType = (nextType: SporcuWhatsAppNotificationType) => {
    setNotificationType(nextType);
    setIsManuallyEdited(false);
    setJustSentLabel(null);
  };

  const handleResetTemplate = () => {
    setIsManuallyEdited(false);
    setCustomMessage(generatedMessage);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(activeMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      // Clipboard fallback ignored if blocked in iframe
    }
  };

  const handleWhatsAppSendClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isPhoneValid) {
      e.preventDefault();
      return;
    }

    const createdLog = addBildirimLog({
      karneId: sporcu.id,
      sporcuAdSoyad: sporcu.name,
      veliAdSoyad: parentName.trim() || `${sporcu.name} Velisi`,
      telefon: parentPhone.trim(),
      kanal: 'whatsapp',
      mesaj: activeMessage,
      durum: 'WhatsApp Açıldı',
      raporKodu: activeTemplate.logCode,
    });

    setRecentLogs((prev) => [createdLog, ...prev].slice(0, 3));
    setJustSentLabel(`${activeTemplate.label} WhatsApp üzerinden hazırlandı ve kaydedildi.`);
    if (onSuccess) {
      onSuccess(
        `${sporcu.name} velisine WhatsApp ${activeTemplate.label.toLowerCase()} başlatıldı.`
      );
    }
  };

  const resolveLogLabel = (code?: string) => {
    const matched = SPORCU_NOTIFICATION_TEMPLATES.find((t) => t.logCode === code);
    return matched ? matched.label : 'Veli Bildirimi';
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111c2e] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-emerald-50/60 dark:bg-emerald-950/25">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                WhatsApp Veli Bildirimi — {activeTemplate.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {sporcu.name} • {sporcu.branch || 'Genel'} • Kod: {sporcu.code}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* 1. Mesaj Şablonu Seçimi */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Hazır Mesaj Şablonları
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SPORCU_NOTIFICATION_TEMPLATES.map((tpl) => {
                const isSelected = notificationType === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectType(tpl.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/40'
                        : 'bg-slate-50/70 dark:bg-[#162238]/60 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {getTemplateIcon(tpl.id, 'w-3.5 h-3.5')}
                      </div>
                      {tpl.id === 'dues' && hasOverdueDues && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          Gecikmiş
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                      {tpl.shortLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Veli İletişim Bilgileri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#162238]/60 border border-slate-200/80 dark:border-slate-700/80">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Veli Adı Soyadı
              </label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Örn: Ahmet Yıldırım"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#111c2e] border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Veli WhatsApp Telefonu *
              </label>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="+90 532 000 00 00"
                className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-[#111c2e] border rounded-lg focus:outline-hidden focus:ring-2 text-slate-900 dark:text-slate-100 font-medium tabular-nums ${
                  isPhoneValid
                    ? 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                    : 'border-rose-400 focus:ring-rose-500'
                }`}
              />
              {!isPhoneValid && (
                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Geçerli bir cep telefonu numarası girin (örn: 05XX XXX XX XX).
                </p>
              )}
            </div>
          </div>

          {/* 3. Şablona Özel Detay Alanları */}
          {notificationType === 'training' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  <CalendarClock className="w-3 h-3 text-slate-400" />
                  Gün / Tarih
                </label>
                <input
                  type="text"
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Saat
                </label>
                <input
                  type="text"
                  value={trainingTime}
                  onChange={(e) => setTrainingTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Tesis / Saha
                </label>
                <input
                  type="text"
                  value={trainingLocation}
                  onChange={(e) => setTrainingLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {notificationType === 'dues' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tutar (₺)
                </label>
                <input
                  type="text"
                  value={duesAmount}
                  onChange={(e) => setDuesAmount(e.target.value)}
                  placeholder="3.500"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Son Ödeme Tarihi
                </label>
                <input
                  type="text"
                  value={duesDueDate}
                  onChange={(e) => setDuesDueDate(e.target.value)}
                  placeholder="15.10.2026"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Ödeme Kalemi ({duesStatusLabel})
                </label>
                <input
                  type="text"
                  value={duesPlanName}
                  onChange={(e) => setDuesPlanName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {notificationType === 'attendance' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Devamsızlık Tarihi
                </label>
                <input
                  type="text"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Antrenman Saati
                </label>
                <input
                  type="text"
                  value={trainingTime}
                  onChange={(e) => setTrainingTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tesis
                </label>
                <input
                  type="text"
                  value={trainingLocation}
                  onChange={(e) => setTrainingLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {notificationType === 'match' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Müsabaka / Turnuva Adı
                </label>
                <input
                  type="text"
                  value={matchTitle}
                  onChange={(e) => setMatchTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tarih
                </label>
                <input
                  type="text"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Saat / Toplanma
                </label>
                <input
                  type="text"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tesis / Saha
                </label>
                <input
                  type="text"
                  value={matchLocation}
                  onChange={(e) => setMatchLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* 4. Otomatik WhatsApp Mesaj Önizlemesi */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                WhatsApp Mesaj Metni (Düzenlenebilir)
              </label>
              <div className="flex items-center gap-2">
                {isManuallyEdited && (
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Şablonu Sıfırla
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3 h-3" />
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Metni Kopyala
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              rows={7}
              value={customMessage}
              onChange={(e) => {
                setCustomMessage(e.target.value);
                setIsManuallyEdited(true);
              }}
              className="w-full px-3.5 py-2.5 text-xs leading-relaxed bg-emerald-50/40 dark:bg-[#0d1829] border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-y"
            />
          </div>

          {/* Başarı Bildirimi */}
          {justSentLabel && (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{justSentLabel}</span>
            </div>
          )}

          {/* Son Gönderimler */}
          {recentLogs.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                <History className="w-3.5 h-3.5" />
                <span>Bu Sporcu İçin Son Bildirimler</span>
              </div>
              <div className="space-y-1.5">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#162238]/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {resolveLogLabel(log.raporKodu)}
                      </span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {log.telefon}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0 tabular-nums">
                      {log.tarih}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1626] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Kapat
          </button>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppSendClick}
              aria-disabled={!isPhoneValid}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shadow-xs transition-all ${
                isPhoneValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.98]'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed pointer-events-none'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp ile {activeTemplate.label} Gönder</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
