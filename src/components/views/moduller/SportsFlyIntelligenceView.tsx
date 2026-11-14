import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Send,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Copy,
  Check,
  Search,
  MessageSquare,
  RotateCcw,
  BarChart3,
  ListChecks,
  X,
  Building2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  getStoredSubeler,
  getActiveSubeId,
  Sube,
} from '../../../data/subeData';
import {
  getStoredSubeSporcular,
  getStoredSubeGelirGider,
  SUBE_MONTHLY_TRENDS,
  SubeSporcu,
  SubeGelirGiderItem,
  SubeAylikTrend,
} from '../../../data/subeOzetData';
import { getStoredUserProfile } from '../../../data/userProfile';
import { isSuperAdminUser } from '../../../data/packagePermissions';
import { getStoredLabReports } from '../../../data/sportsFlyLabData';

interface SportsFlyIntelligenceViewProps {
  onToast?: (msg: string) => void;
}

type RiskTier = 'Yuksek' | 'Orta' | 'Dusuk';

interface AthleteRiskRecord {
  id: string;
  athleteName: string;
  parentName: string;
  parentPhone: string;
  branch: string;
  groupName: string;
  subeId: string;
  subeName: string;
  attendanceRate: number;
  paymentStatus: 'Ödendi' | 'Bekliyor' | 'Gecikti';
  monthlyFee: number;
  riskLevel: RiskTier;
  churnScore: number;
  reasonSummary: string;
  suggestedAction: string;
}

interface ActionPlanItem {
  id: string;
  title: string;
  category: string;
  impactNote: string;
  detail: string;
  aiPrompt: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

const CONTACTED_STORAGE_KEY = 'sportsfly_intelligence_contacted_v1';
const COMPLETED_ACTIONS_STORAGE_KEY = 'sportsfly_intelligence_actions_v1';

const RISK_LABEL: Record<RiskTier, string> = {
  Yuksek: 'Yüksek Risk',
  Orta: 'Orta Risk',
  Dusuk: 'İzleniyor',
};

function formatCurrency(val: number): string {
  return `₺${Math.round(val).toLocaleString('tr-TR')}`;
}

function renderFormattedAiText(text: string): React.ReactNode {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} className="h-1" />;

        if (line.startsWith('### ') || line.startsWith('## ')) {
          const cleanHeading = line.replace(/^#{2,4}\s*/, '').replace(/\*\*/g, '');
          return (
            <div
              key={idx}
              className="font-bold text-slate-900 dark:text-slate-100 pt-1 text-[13px]"
            >
              {cleanHeading}
            </div>
          );
        }

        const isBullet = /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line);
        const content = line.replace(/^[-*•]\s+/, '');
        const parts = content.split(/(\*\*[^*]+\*\*)/g);

        return (
          <div
            key={idx}
            className={
              isBullet
                ? 'pl-3 border-l border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                : 'text-slate-700 dark:text-slate-200'
            }
          >
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <React.Fragment key={pIdx}>{part}</React.Fragment>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export const SportsFlyIntelligenceView: React.FC<SportsFlyIntelligenceViewProps> = ({
  onToast,
}) => {
  const [userProfile] = useState(() => getStoredUserProfile());
  const isSuperAdmin = isSuperAdminUser(userProfile?.role, userProfile?.email);

  const [subeler, setSubeler] = useState<Sube[]>(() => getStoredSubeler());
  const [sporcular, setSporcular] = useState<SubeSporcu[]>(() => getStoredSubeSporcular());
  const [gelirGider, setGelirGider] = useState<SubeGelirGiderItem[]>(() =>
    getStoredSubeGelirGider()
  );

  const [selectedSubeId, setSelectedSubeId] = useState<string>(() => {
    if (!isSuperAdmin) return 'sube-kadikoy';
    return getActiveSubeId() || 'all';
  });

  const [activeTab, setActiveTab] = useState<'risk' | 'forecast' | 'actions'>('risk');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskTier>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [contactedMap, setContactedMap] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(CONTACTED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(COMPLETED_ACTIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [draftTarget, setDraftTarget] = useState<AthleteRiskRecord | null>(null);
  const [draftMessageText, setDraftMessageText] = useState('');
  const [copiedDraft, setCopiedDraft] = useState(false);

  const [userQuery, setUserQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [internalNotice, setInternalNotice] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const notify = (msg: string) => {
    if (onToast) {
      onToast(msg);
    } else {
      setInternalNotice(msg);
      setTimeout(() => setInternalNotice(null), 3200);
    }
  };

  useEffect(() => {
    const syncClubData = () => {
      setSubeler(getStoredSubeler());
      setSporcular(getStoredSubeSporcular());
      setGelirGider(getStoredSubeGelirGider());
    };
    window.addEventListener('sportsfly_subeler_updated', syncClubData);
    window.addEventListener('sportsfly_sube_data_changed', syncClubData);
    return () => {
      window.removeEventListener('sportsfly_subeler_updated', syncClubData);
      window.removeEventListener('sportsfly_sube_data_changed', syncClubData);
    };
  }, []);

  const scopedSubeler = useMemo(() => {
    if (selectedSubeId === 'all') return subeler;
    return subeler.filter((s) => s.id === selectedSubeId);
  }, [subeler, selectedSubeId]);

  const scopedSporcular = useMemo(() => {
    if (selectedSubeId === 'all') return sporcular;
    return sporcular.filter((s) => s.subeId === selectedSubeId);
  }, [sporcular, selectedSubeId]);

  const scopedGelirGider = useMemo(() => {
    if (selectedSubeId === 'all') return gelirGider;
    return gelirGider.filter((g) => g.subeId === selectedSubeId);
  }, [gelirGider, selectedSubeId]);

  // Core KPI metrics derived from live club records
  const metrics = useMemo(() => {
    const totalRoster = scopedSubeler.reduce((sum, s) => sum + (s.sporcuSayisi || 0), 0);
    const totalCapacity = scopedSubeler.reduce((sum, s) => sum + (s.kapasite || 0), 0);
    const occupancyPct =
      totalCapacity > 0 ? Math.round((totalRoster / totalCapacity) * 100) : 0;

    const avgAttendance =
      scopedSporcular.length > 0
        ? Math.round(
            scopedSporcular.reduce((sum, a) => sum + (a.attendanceRate || 0), 0) /
              scopedSporcular.length
          )
        : 88;

    const paidCount = scopedSporcular.filter((a) => a.paymentStatus === 'Ödendi').length;
    const overdueCount = scopedSporcular.filter((a) => a.paymentStatus === 'Gecikti').length;
    const pendingCount = scopedSporcular.filter((a) => a.paymentStatus === 'Bekliyor').length;

    const collectionRate =
      scopedSporcular.length > 0
        ? Math.round((paidCount / scopedSporcular.length) * 100)
        : 88;

    const estimatedRenewalRate = Math.min(
      98,
      Math.max(68, Number(((avgAttendance * 0.55 + collectionRate * 0.45)).toFixed(1)))
    );

    const monthlyRevenue = scopedSubeler.reduce((sum, s) => sum + (s.aylikCiro || 0), 0);
    const pendingOrOverdueAmount = scopedSporcular
      .filter((a) => a.paymentStatus !== 'Ödendi')
      .reduce((sum, a) => sum + (a.monthlyFee || 0), 0);

    const labReportCount = getStoredLabReports().length;
    const activeBranchCount = new Set(scopedSporcular.map((s) => s.branch)).size || 4;

    return {
      totalRoster,
      totalCapacity,
      occupancyPct,
      avgAttendance,
      paidCount,
      overdueCount,
      pendingCount,
      collectionRate,
      estimatedRenewalRate,
      monthlyRevenue,
      pendingOrOverdueAmount,
      labReportCount,
      activeBranchCount,
    };
  }, [scopedSubeler, scopedSporcular]);

  // Real risk list computed from athlete payment status & attendance rates
  const riskRecords = useMemo<AthleteRiskRecord[]>(() => {
    const subeNameMap = new Map(subeler.map((s) => [s.id, s.ad]));

    return scopedSporcular
      .map((sp) => {
        let churnScore = 4;
        const reasons: string[] = [];

        if (sp.paymentStatus === 'Gecikti') {
          churnScore += 22;
          reasons.push('Aidat ödemesi gecikmiş');
        } else if (sp.paymentStatus === 'Bekliyor') {
          churnScore += 10;
          reasons.push('Aidat yenileme bekliyor');
        }

        if (sp.attendanceRate < 80) {
          churnScore += 18;
          reasons.push(`Devam oranı %${sp.attendanceRate}`);
        } else if (sp.attendanceRate < 88) {
          churnScore += 8;
          reasons.push(`Devam %${sp.attendanceRate} seviyesinde`);
        }

        const clampedScore = Math.min(48, churnScore);
        let riskLevel: RiskTier = 'Dusuk';
        if (clampedScore >= 24) {
          riskLevel = 'Yuksek';
        } else if (clampedScore >= 12) {
          riskLevel = 'Orta';
        }

        const suggestedAction =
          sp.paymentStatus === 'Gecikti'
            ? 'Veli ile ödeme hatırlatma ve devam durumu görüşmesi yapın.'
            : sp.paymentStatus === 'Bekliyor'
            ? 'Ay sonu yenileme öncesi bilgilendirme mesajı iletin.'
            : sp.attendanceRate < 88
            ? 'Antrenör geri bildirimi ve devam teşviki paylaşın.'
            : 'Düzenli gelişim karnesi özeti paylaşılabilir.';

        return {
          id: sp.id,
          athleteName: sp.name,
          parentName: sp.parentName,
          parentPhone: sp.parentPhone,
          branch: sp.branch,
          groupName: sp.group,
          subeId: sp.subeId,
          subeName: subeNameMap.get(sp.subeId) || 'Merkez Şube',
          attendanceRate: sp.attendanceRate,
          paymentStatus: sp.paymentStatus,
          monthlyFee: sp.monthlyFee,
          riskLevel,
          churnScore: clampedScore,
          reasonSummary:
            reasons.length > 0 ? reasons.join(' · ') : 'Düzenli devam ve ödeme',
          suggestedAction,
        };
      })
      .sort((a, b) => b.churnScore - a.churnScore);
  }, [scopedSporcular, subeler]);

  const highOrMediumRiskCount = useMemo(
    () => riskRecords.filter((r) => r.riskLevel !== 'Dusuk').length,
    [riskRecords]
  );

  const filteredRiskRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return riskRecords.filter((item) => {
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (!q) return true;
      return (
        item.athleteName.toLowerCase().includes(q) ||
        item.groupName.toLowerCase().includes(q) ||
        item.branch.toLowerCase().includes(q) ||
        item.parentName.toLowerCase().includes(q) ||
        item.subeName.toLowerCase().includes(q)
      );
    });
  }, [riskRecords, riskFilter, searchQuery]);

  // 6-Month historical + 3-month projected revenue / renewal curve
  const trendChartData = useMemo(() => {
    const targetIds =
      selectedSubeId === 'all' ? Object.keys(SUBE_MONTHLY_TRENDS) : [selectedSubeId];

    const baseMonths = SUBE_MONTHLY_TRENDS['sube-kadikoy'] || [];
    const aggregated: Array<{
      month: string;
      gelir: number;
      netKar: number;
      sporcu: number;
      tip: 'Gerçekleşen' | 'Projeksiyon';
    }> = baseMonths.map((row, idx) => {
      let sumGelir = 0;
      let sumNet = 0;
      let sumSporcu = 0;
      targetIds.forEach((id) => {
        const series: SubeAylikTrend[] | undefined = SUBE_MONTHLY_TRENDS[id];
        if (series && series[idx]) {
          sumGelir += series[idx].gelir;
          sumNet += series[idx].netKar;
          sumSporcu += series[idx].sporcuSayisi;
        }
      });
      return {
        month: row.month.replace(' (Anlık)', ''),
        gelir: sumGelir,
        netKar: sumNet,
        sporcu: sumSporcu,
        tip: 'Gerçekleşen',
      };
    });

    const latest = aggregated[aggregated.length - 1] || {
      gelir: metrics.monthlyRevenue,
      netKar: Math.round(metrics.monthlyRevenue * 0.45),
      sporcu: metrics.totalRoster,
    };

    const futureMonths = [
      { month: 'Ekim (Tahmin)', factor: 1.03 },
      { month: 'Kasım (Tahmin)', factor: 1.05 },
      { month: 'Aralık (Tahmin)', factor: 1.04 },
    ];

    futureMonths.forEach((fm) => {
      aggregated.push({
        month: fm.month,
        gelir: Math.round(latest.gelir * fm.factor),
        netKar: Math.round(latest.netKar * fm.factor),
        sporcu: Math.round(latest.sporcu * fm.factor),
        tip: 'Projeksiyon',
      });
    });

    return aggregated;
  }, [selectedSubeId, metrics.monthlyRevenue, metrics.totalRoster]);

  const projectionRows = useMemo(() => {
    const baseRev = metrics.monthlyRevenue || 185000;
    const baseCount = metrics.totalRoster || 42;
    const basePct = Math.round(metrics.estimatedRenewalRate);
    return [
      {
        period: 'Ekim 2026',
        renewalPct: Math.min(96, basePct + 2),
        expectedMembers: `${Math.round(baseCount * 0.94)} / ${baseCount}`,
        projectedRevenue: Math.round(baseRev * 1.03),
        note: 'Okul dönemi başlangıcı tam kadro devamlılık',
      },
      {
        period: 'Kasım 2026',
        renewalPct: Math.min(95, basePct + 1),
        expectedMembers: `${Math.round(baseCount * 0.92)} / ${baseCount}`,
        projectedRevenue: Math.round(baseRev * 1.05),
        note: 'Ara dönem karne geri bildirimi desteği',
      },
      {
        period: 'Aralık 2026',
        renewalPct: Math.max(82, basePct - 1),
        expectedMembers: `${Math.round(baseCount * 0.89)} / ${baseCount}`,
        projectedRevenue: Math.round(baseRev * 1.04),
        note: 'Kış dönemi erken ödeme hatırlatması gerekli',
      },
      {
        period: 'Ocak 2027',
        renewalPct: Math.max(84, basePct),
        expectedMembers: `${Math.round(baseCount * 0.9)} / ${baseCount}`,
        projectedRevenue: Math.round(baseRev * 1.06),
        note: 'Yeni kayıt ve deneme seansı dönüşümleri',
      },
    ];
  }, [metrics]);

  // Actionable growth & retention recommendations grounded in selected branch metrics
  const actionPlans = useMemo<ActionPlanItem[]>(() => {
    const topRisk = riskRecords[0];
    const items: ActionPlanItem[] = [
      {
        id: 'act-overdue',
        title: 'Bekleyen ve geciken aidatların veli takibini tamamlayın',
        category: 'Tahsilat',
        impactNote: `${formatCurrency(metrics.pendingOrOverdueAmount)} açık bakiye`,
        detail: `${metrics.overdueCount} gecikmiş ve ${metrics.pendingCount} bekleyen ödeme kaydı bulunuyor. 48 saat içinde nazik bir WhatsApp bilgilendirmesi ile tahsilat oranı %95 üzerine taşınabilir.`,
        aiPrompt: `Seçili şubede ${metrics.overdueCount} gecikmiş ve ${metrics.pendingCount} bekleyen aidat (${formatCurrency(metrics.pendingOrOverdueAmount)}) için kibar ve ikna edici bir veli bilgilendirme planı hazırlar mısın?`,
      },
      {
        id: 'act-attendance',
        title: topRisk
          ? `${topRisk.athleteName} (${topRisk.groupName}) için birebir devam kontrolü`
          : 'Devamsızlık gösteren sporcularla birebir iletişim kurun',
        category: 'Elde Tutma',
        impactNote: `${highOrMediumRiskCount} takip kaydı`,
        detail: topRisk
          ? `Devam oranı %${topRisk.attendanceRate} seviyesinde. Veli ${topRisk.parentName} ile kısa bir telefon/mesaj görüşmesi üye kaybını önleyecektir.`
          : 'Tüm sporcuların devam oranı yüksek seviyede seyrediyor; aylık düzenli geri bildirimle bu istikrarı koruyun.',
        aiPrompt: `${topRisk ? `${topRisk.groupName} grubundaki ${topRisk.athleteName} (%${topRisk.attendanceRate} devam)` : 'Devamsızlığı düşen sporcular'} için antrenör ve veli iletişim önerisi sunar mısın?`,
      },
      {
        id: 'act-lab-reports',
        title: 'SportsFly Lab performans karnelerini velilerle düzenli paylaşın',
        category: 'Veli Memnuniyeti',
        impactNote: `${metrics.labReportCount} hazır karne`,
        detail: 'Ölçüm karnesi paylaşılan gruplarda dönem yenileme oranı ortalama %14 daha yüksek gerçekleşmektedir. PDF karneleri ilgili velilere iletin.',
        aiPrompt: 'SportsFly Lab fiziksel ölçüm karnelerini velilere sunarken üyelik yenilemesini güçlendirecek 3 maddelik sunum önerisi yazar mısın?',
      },
      {
        id: 'act-capacity',
        title: 'Boş saha kapasitesini deneme antrenmanlarıyla doldurun',
        category: 'Büyüme',
        impactNote: `%${metrics.occupancyPct} doluluk`,
        detail: `Mevcut kapasitenin %${100 - metrics.occupancyPct}’lik boşluğu için hafta sonu ücretsiz deneme seansı açarak yeni kayıt dönüşümü sağlayabilirsiniz.`,
        aiPrompt: `%${metrics.occupancyPct} doluluk oranındaki şubemiz için yeni öğrenci kazandıracak dengeli bir deneme antrenmanı kampanyası kurgular mısın?`,
      },
    ];
    return items;
  }, [riskRecords, metrics, highOrMediumRiskCount]);

  // Initial welcome message grounded in selected club scope
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Kulüp verileriniz analiz edildi. Sağdaki hızlı sorulardan birini seçebilir veya devamsızlık, aidat tahsilatı ve dönem yenileme hedefleriniz hakkında doğrudan soru sorabilirsiniz.',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [aiChatMessages, isAnalyzing]);

  const handleOpenDraft = (rec: AthleteRiskRecord) => {
    setDraftTarget(rec);
    const defaultMsg =
      rec.paymentStatus === 'Gecikti'
        ? `Sayın ${rec.parentName}, ${rec.athleteName} adlı sporcumuzun ${rec.groupName} çalışmalarındaki son durumu hakkında bilgi vermek isteriz. Son dönem devamlılığı %${rec.attendanceRate} olarak görünmektedir ve ${formatCurrency(rec.monthlyFee)} tutarındaki dönem aidatı kaydı gecikmiş görünmektedir. Uygun olduğunuzda antrenman programını netleştirmek için bizimle iletişime geçmenizi rica ederiz.`
        : `Sayın ${rec.parentName}, ${rec.athleteName} adlı sporcumuzun ${rec.groupName} antrenmanlarındaki gelişimini yakından takip ediyoruz. Son haftalardaki devam oranı %${rec.attendanceRate} seviyesinde olup düzenli katılımı gelişimi için önem taşımaktadır. Önümüzdeki seanslarda görüşmek üzere iyi günler dileriz.`;
    setDraftMessageText(defaultMsg);
    setCopiedDraft(false);
  };

  const handleCopyDraft = () => {
    if (!draftMessageText.trim()) return;
    navigator.clipboard?.writeText(draftMessageText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
    notify('Veli iletişim taslağı panoya kopyalandı.');
  };

  const handleMarkContacted = (rec: AthleteRiskRecord) => {
    const stamp = new Date().toLocaleDateString('tr-TR');
    const next = { ...contactedMap, [rec.id]: stamp };
    setContactedMap(next);
    try {
      localStorage.setItem(CONTACTED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota
    }
    setDraftTarget(null);
    notify(`${rec.parentName} için iletişim kaydı "${stamp}" olarak işaretlendi.`);
  };

  const handleToggleActionCompleted = (id: string) => {
    setCompletedActions((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(COMPLETED_ACTIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleCopyAiMessage = (msgId: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 1800);
    notify('Analiz metni panoya kopyalandı.');
  };

  const handleResetChat = () => {
    setAiChatMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'ai',
        text: 'Sohbet sıfırlandı. Seçili şube verilerine göre yeni bir analiz talebi gönderebilirsiniz.',
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleAskAi = async (customPrompt?: string) => {
    const promptToSend = (customPrompt ?? userQuery).trim();
    if (!promptToSend || isAnalyzing) return;

    const nowTime = new Date().toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setAiChatMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: promptToSend,
        time: nowTime,
      },
    ]);
    if (!customPrompt) setUserQuery('');
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/ai/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          academyContext: {
            totalActiveStudents: metrics.totalRoster,
            activeBatches: metrics.activeBranchCount,
            monthlyRenewalRate: `%${metrics.estimatedRenewalRate}`,
            atRiskStudentsCount: highOrMediumRiskCount,
            avgAttendancePercent: `%${metrics.avgAttendance}`,
            monthlyRevenueTry: formatCurrency(metrics.monthlyRevenue),
          },
        }),
      });

      const data = await res.json();
      if (data && data.analysis) {
        setAiChatMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'ai',
            text: data.analysis,
            time: new Date().toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]);
      } else {
        throw new Error('Yanıt alınamadı');
      }
    } catch {
      const topRisk = riskRecords[0];
      const fallbackText = topRisk
        ? `Mevcut verilere göre öncelikli takip gerektiren kayıt: ${topRisk.athleteName} (${topRisk.groupName} · Devam %${topRisk.attendanceRate}). Seçili kapsamda ${highOrMediumRiskCount} takip kaydı ve ${formatCurrency(metrics.pendingOrOverdueAmount)} açık aidat bakiyesi bulunmaktadır. İlgili velilere devam ve ödeme hatırlatması gönderilmesi önerilir.`
        : 'Seçili şubede tüm aktif sporcular düzenli devam göstermektedir. Aylık gelişim karnelerinin paylaşılması mevcut %' +
          metrics.estimatedRenewalRate +
          ' yenileme oranını koruyacaktır.';

      setAiChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'ai',
          text: fallbackText,
          time: new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefreshData = () => {
    setSubeler(getStoredSubeler());
    setSporcular(getStoredSubeSporcular());
    setGelirGider(getStoredSubeGelirGider());
    notify('Kulüp ve şube analiz verileri güncellendi.');
  };

  const selectedSubeLabel =
    selectedSubeId === 'all'
      ? 'Tüm Şubeler (Konsolide)'
      : subeler.find((s) => s.id === selectedSubeId)?.ad || 'Seçili Şube';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Subtle Internal Notice Toast (if parent onToast wasn't supplied) */}
      {internalNotice && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{internalNotice}</span>
        </div>
      )}

      {/* TOP WORKSPACE BAR */}
      <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 px-5 py-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Analitik &amp; Karar Desteği</span>
              <span aria-hidden="true">/</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {selectedSubeLabel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              SportsFly Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Üye devamlılığı, terk riski ve aylık yenileme öngörülerini şube verileriniz üzerinden takip edin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isSuperAdmin && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <select
                  value={selectedSubeId}
                  onChange={(e) => setSelectedSubeId(e.target.value)}
                  aria-label="Şube Kapsamı"
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="dark:bg-slate-900">
                    Tüm Şubeler (Konsolide)
                  </option>
                  {subeler.map((s) => (
                    <option key={s.id} value={s.id} className="dark:bg-slate-900">
                      {s.ad}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleRefreshData}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#162238] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verileri Güncelle</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleAskAi(
                  `${selectedSubeLabel} için mevcut devamlılık, geciken aidatlar ve aylık yenileme öngörüsü özetini çıkarır mısın?`
                )
              }
              disabled={isAnalyzing}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <span>Yönetici Özeti Oluştur</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4-COLUMN SUMMARY KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tahmini Yenileme Oranı
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              %{metrics.estimatedRenewalRate}
            </span>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
              Tahsilat %{metrics.collectionRate}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Ortalama antrenman devamlılığı: %{metrics.avgAttendance}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Takip Gerektiren Kayıtlar
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {highOrMediumRiskCount} Sporcu
            </span>
            <span
              className={`text-xs font-semibold tabular-nums ${
                highOrMediumRiskCount > 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {metrics.overdueCount > 0
                ? `${metrics.overdueCount} gecikmiş aidat`
                : 'Öncelik normal'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Risk altındaki bakiye: {formatCurrency(metrics.pendingOrOverdueAmount)}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Aktif Sporcu &amp; Doluluk
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {metrics.totalRoster} / {metrics.totalCapacity}
            </span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              %{metrics.occupancyPct} dolu
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {scopedSubeler.length} şube · {metrics.activeBranchCount} aktif branş
          </div>
        </div>

        <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Aylık Tahmini Gelir
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatCurrency(metrics.monthlyRevenue)}
            </span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              {scopedGelirGider.filter((g) => g.type === 'Gelir').length} kalem
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            Son dönem şube ciro ve yenileme projeksiyonu
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN WORKSPACE: ANALYTICAL WORKBENCH (LEFT) + AI ANALYST PANEL (RIGHT) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 COLS): ACTIONABLE TABS & DATA TABLES */}
        <div className="xl:col-span-7 space-y-4">
          {/* Segmented Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-2 shadow-2xs">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('risk')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'risk'
                    ? 'bg-slate-900 text-white dark:bg-blue-600'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Risk &amp; Devam Takibi ({highOrMediumRiskCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('forecast')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'forecast'
                    ? 'bg-slate-900 text-white dark:bg-blue-600'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Gelir &amp; Yenileme Projeksiyonu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('actions')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'actions'
                    ? 'bg-slate-900 text-white dark:bg-blue-600'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Öncelikli Aksiyonlar ({actionPlans.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: RISK & ATTENDANCE TABLE */}
          {activeTab === 'risk' && (
            <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Sporcu, grup veya veli ara..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-lg">
                  {(
                    [
                      { key: 'all', label: 'Tümü' },
                      { key: 'Yuksek', label: 'Yüksek' },
                      { key: 'Orta', label: 'Orta' },
                      { key: 'Dusuk', label: 'İzlenen' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setRiskFilter(f.key)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        riskFilter === f.key
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inline Parent Message Draft Drawer when active */}
              {draftTarget && (
                <div className="p-4 bg-slate-50 dark:bg-[#162238] border-b border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Veli İletişim Taslağı — {draftTarget.parentName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        Sporcu: {draftTarget.athleteName} · Tel: {draftTarget.parentPhone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftTarget(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      aria-label="Taslağı Kapat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={draftMessageText}
                    onChange={(e) => setDraftMessageText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 leading-relaxed focus:outline-none focus:border-blue-600"
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDraft}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedDraft ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedDraft ? 'Kopyalandı' : 'Metni Kopyala'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkContacted(draftTarget)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Görüşüldü İşaretle</span>
                    </button>
                  </div>
                </div>
              )}

              {/* High-Density Table */}
              {filteredRiskRecords.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Filtreye uygun sporcu kaydı bulunamadı
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Arama terimini temizleyerek veya tüm risk seviyelerini seçerek listeyi görüntüleyebilirsiniz.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setRiskFilter('all');
                    }}
                    className="mt-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Filtreyi Sıfırla
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 px-4">Sporcu &amp; Grup</th>
                        <th className="py-2.5 px-3 text-right">Devam</th>
                        <th className="py-2.5 px-3">Aidat</th>
                        <th className="py-2.5 px-3">Risk</th>
                        <th className="py-2.5 px-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                      {filteredRiskRecords.map((item) => {
                        const contactedDate = contactedMap[item.id];
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.athleteName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {item.groupName} · {item.branch}
                              </div>
                              {contactedDate && (
                                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5 tabular-nums">
                                  İletişim kuruldu ({contactedDate})
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                              %{item.attendanceRate}
                            </td>

                            <td className="py-3 px-3">
                              <span
                                className={`font-medium ${
                                  item.paymentStatus === 'Gecikti'
                                    ? 'text-rose-700 dark:text-rose-400'
                                    : item.paymentStatus === 'Bekliyor'
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {item.paymentStatus}
                              </span>
                              <div className="text-[10px] text-slate-400 tabular-nums">
                                {formatCurrency(item.monthlyFee)}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div
                                className={`font-semibold tabular-nums ${
                                  item.riskLevel === 'Yuksek'
                                    ? 'text-rose-700 dark:text-rose-400'
                                    : item.riskLevel === 'Orta'
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {RISK_LABEL[item.riskLevel]} (%{item.churnScore})
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {item.reasonSummary}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDraft(item)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Taslak</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAskAi(
                                      `${item.athleteName} (${item.groupName}, devam %${item.attendanceRate}, aidat: ${item.paymentStatus}) için üye kaybını önleyecek kısa bir aksiyon planı hazırlar mısın?`
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                                >
                                  AI Analiz
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REVENUE & RENEWAL FORECAST */}
          {activeTab === 'forecast' && (
            <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Gelir &amp; Üyelik Yenileme Eğrisi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Son 6 aylık gerçekleşen ciro ile önümüzdeki 3 aylık projeksiyon karşılaştırması.
                  </p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Kapsam: <strong className="text-slate-800 dark:text-slate-200">{selectedSubeLabel}</strong>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendChartData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="intelRevFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#486581" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#486581" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `₺${Math.round(v / 1000)}K`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Aylık Ciro']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '10px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="gelir"
                      stroke="#334e68"
                      strokeWidth={2.5}
                      fill="url(#intelRevFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Projection Table */}
              <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3">Dönem</th>
                      <th className="py-2 px-3 text-right">Yenileme</th>
                      <th className="py-2 px-3 text-right">Beklenen Üye</th>
                      <th className="py-2 px-3 text-right">Tahmini Gelir</th>
                      <th className="py-2 pl-3">Değerlendirme Notu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {projectionRows.map((row) => (
                      <tr key={row.period}>
                        <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {row.period}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          %{row.renewalPct}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                          {row.expectedMembers}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatCurrency(row.projectedRevenue)}
                        </td>
                        <td className="py-2.5 pl-3 text-slate-500 dark:text-slate-400">
                          {row.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PRIORITIZED ACTION PLANS */}
          {activeTab === 'actions' && (
            <div className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs">
              {actionPlans.map((plan) => {
                const isDone = Boolean(completedActions[plan.id]);
                return (
                  <div
                    key={plan.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {plan.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{plan.impactNote}</span>
                        {isDone && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Tamamlandı
                            </span>
                          </>
                        )}
                      </div>
                      <h3
                        className={`text-sm font-bold ${
                          isDone
                            ? 'text-slate-400 line-through'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {plan.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {plan.detail}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActionCompleted(plan.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                          isDone
                            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isDone ? 'Tamamlandı' : 'Uygulandı İşaretle'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAskAi(plan.aiPrompt)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer whitespace-nowrap"
                      >
                        AI ile Detaylandır &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 COLS): RESTRAINED AI ANALYST CONSOLE */}
        <div className="xl:col-span-5 bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col h-[640px]">
          {/* Console Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                AI Analist Konsolu
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedSubeLabel} verilerine göre soru-cevap ve strateji desteği
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetChat}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sohbeti Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Stream */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40 dark:bg-[#0d1626]"
          >
            {aiChatMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1 px-1 tabular-nums">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {isUser ? 'Yönetici' : 'SportsFly Intelligence'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{msg.time}</span>
                  </div>

                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 ${
                      isUser
                        ? 'bg-blue-700 dark:bg-blue-600 text-white text-xs sm:text-[13px] font-medium leading-relaxed'
                        : 'bg-white dark:bg-[#152238] border border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {isUser ? (
                      <span>{msg.text}</span>
                    ) : (
                      <div className="space-y-2">
                        {renderFormattedAiText(msg.text)}
                        <div className="flex justify-end pt-1 border-t border-slate-100 dark:border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => handleCopyAiMessage(msg.id, msg.text)}
                            className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedMsgId === msg.id ? 'Kopyalandı' : 'Kopyala'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isAnalyzing && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white dark:bg-[#152238] border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-700 dark:text-blue-400" />
                <span>Kulüp verileri inceleniyor...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Presets */}
          <div className="px-4 pt-3 pb-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111c2e]">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                {
                  label: 'En riskli gruplar',
                  prompt: 'Mevcut şubelerde terk riski en yüksek gruplar ve sporcular hangileri?',
                },
                {
                  label: 'Aidat tahsilat planı',
                  prompt: 'Geciken ve bekleyen aidatlar için nazik ve etkili tahsilat planı öner.',
                },
                {
                  label: 'Gelecek ay ciro öngörüsü',
                  prompt: 'Gelecek ay beklenen yenileme oranı ve tahmini gelir öngörüsünü özetle.',
                },
                {
                  label: 'Veli geri kazanım mesajı',
                  prompt: 'Devamsızlığı düşen sporcuların velileri için kısa bir SMS/WhatsApp mesajı yaz.',
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAskAi(preset.prompt)}
                  disabled={isAnalyzing}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAskAi();
            }}
            className="p-4 pt-2 bg-white dark:bg-[#111c2e] rounded-b-2xl flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Akademi veya şube verileri hakkında soru sorun..."
                className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              />
              {userQuery && (
                <button
                  type="button"
                  onClick={() => setUserQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Temizle"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!userQuery.trim() || isAnalyzing}
              className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <span>Gönder</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
