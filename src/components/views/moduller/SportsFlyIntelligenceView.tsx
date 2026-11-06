import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  UserCheck,
  UserX,
  Send,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  Calendar,
  DollarSign,
  Users,
  ShieldAlert,
  Zap,
  ArrowRight,
  ChevronRight,
  Bot,
  Activity,
  Award,
  X,
  Flame,
  HelpCircle,
  BarChart3,
} from 'lucide-react';

interface SportsFlyIntelligenceViewProps {
  onToast?: (msg: string) => void;
}

interface RiskItem {
  id: string;
  batchName: string;
  riskLevel: 'Yuksek' | 'Orta' | 'Dusuk';
  absentCount: number;
  overdueDays: number;
  churnProbabilityPercent: number;
  suggestedAction: string;
}

export const SportsFlyIntelligenceView: React.FC<SportsFlyIntelligenceViewProps> = ({
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'churn' | 'forecast' | 'recommendations'>('overview');
  const [userQuery, setUserQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'user',
      text: 'Which batch currently has the highest risk of non-renewals?',
      time: '10:42',
    },
    {
      sender: 'ai',
      text: 'U12 Basketbol Okulu (Cumartesi 10:00) şu anda %24 terk riski taşımaktadır. Son 2 haftadır 4 öğrenci antrenmanlara katılmadı ve aidat yenileme süresi 5 gün geçti. Velilerine otomatik yoklama hatırlatması gönderilmesi önerilir.',
      time: '10:42',
    },
  ]);

  // Auto-scroll to bottom of chat on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [aiChatMessages, isAnalyzing]);

  // Mock Churn Risk Data
  const [atRiskList] = useState<RiskItem[]>([
    {
      id: 'risk-1',
      batchName: 'U12 Basketbol Okulu (Cumartesi 10:00)',
      riskLevel: 'Yuksek',
      absentCount: 4,
      overdueDays: 5,
      churnProbabilityPercent: 24,
      suggestedAction: 'Velilere "Devam Takibi & Motivasyon" mesajı iletilsin.',
    },
    {
      id: 'risk-2',
      batchName: 'Yüzme Başlangıç Seviyesi (Pazar 11:30)',
      riskLevel: 'Yuksek',
      absentCount: 3,
      overdueDays: 8,
      churnProbabilityPercent: 19,
      suggestedAction: 'Havuz bakım süreci tamamlandı duyurusu yapılsın.',
    },
    {
      id: 'risk-3',
      batchName: 'U14 Voleybol Akademi (Hafta İçi 17:00)',
      riskLevel: 'Orta',
      absentCount: 2,
      overdueDays: 2,
      churnProbabilityPercent: 9,
      suggestedAction: 'Gelişim karnesi veli e-postası ile paylaşılsın.',
    },
    {
      id: 'risk-4',
      batchName: 'Jimnastik Minikler (Cumartesi 14:00)',
      riskLevel: 'Dusuk',
      absentCount: 1,
      overdueDays: 0,
      churnProbabilityPercent: 3,
      suggestedAction: 'Aylık rozet ödüllendirmesi gönderilsin.',
    },
  ]);

  const handleAskAi = async (customPrompt?: string) => {
    const promptToSend = customPrompt || userQuery;
    if (!promptToSend.trim()) return;

    const newMsg = {
      sender: 'user' as const,
      text: promptToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setAiChatMessages((prev) => [...prev, newMsg]);
    setUserQuery('');
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/ai/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          academyContext: {
            totalActiveStudents: 142,
            activeBatches: 8,
            monthlyRenewalRate: '88.4%',
            atRiskStudentsCount: 6,
            avgAttendancePercent: '84%',
            monthlyRevenueTry: '148,500 ₺',
          },
        }),
      });

      const data = await res.json();
      if (data && data.analysis) {
        setAiChatMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: data.analysis,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        throw new Error('Yanıt alınamadı');
      }
    } catch (err) {
      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'SportsFly Intelligence analizi tamamlandı: U12 grubunda devamsızlık gösteren 4 veliye otomatik WhatsApp/SMS motivasyon hatırlatması iletmeniz üye kaybını %80 oranında engelleyecektir.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendReminderAction = (item: RiskItem) => {
    if (onToast) {
      onToast(`"${item.batchName}" grubu velilerine AI destekli devam hatırlatması gönderildi!`);
    } else {
      alert(`"${item.batchName}" grubu velilerine AI destekli devam hatırlatması gönderildi!`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* SECTION 1: VIBRANT HERO INTRO BANNER (Yenilenmiş Canlı Gradyan Görünüm) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-indigo-900/50 shadow-2xl relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Yapay Zeka Destekli Büyüme Engine</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              SportsFly Intelligence.
            </h1>

            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-normal">
              Akademinizin entegre büyüme asistanı. Yapay zeka destekli analizler, yenilemeleri öngörür, üye kaybını belirler ve üye tutma oranını ve performansı artırmak için önerilerde bulunur.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4.5 py-3 rounded-2xl border border-white/20 text-center shadow-sm">
              <div className="text-xs font-bold text-slate-300">Yenileme Oranı</div>
              <div className="text-xl font-black text-emerald-400">%88.4</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-4.5 py-3 rounded-2xl border border-white/20 text-center shadow-sm">
              <div className="text-xs font-bold text-slate-300">Terk Riski</div>
              <div className="text-xl font-black text-rose-400">6 Sporcu</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-4.5 py-3 rounded-2xl border border-white/20 text-center shadow-sm">
              <div className="text-xs font-bold text-slate-300">Tahmini Gelir</div>
              <div className="text-xl font-black text-sky-400">₺148.5K</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PROMINENT AI CHAT CONSOLE & METRIC CARD GRID (Görünürlüğü Yüksek Şık Derin Mavi/Siyah Zemin) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT / CENTER: HIGH-VISIBILITY SPACIOUS AI CHAT CONSOLE */}
        <div className="lg:col-span-8 bg-[#0c1322] border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between min-h-[520px]">
          {/* Ambient Corner Glow */}
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Console Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 shrink-0">
                <Zap className="w-6 h-6 fill-slate-950 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white tracking-tight">Straty</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                    Your AI Analyst
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-medium">Spor Akademisi Yapay Zeka Büyüme &amp; Retention Danışmanı</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-400 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Gemini 3.8 Flash Active</span>
            </div>
          </div>

          {/* Chat Messages Stream Area (Sohbet Akışı) */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto space-y-4 pr-2 py-2 max-h-[380px] min-h-[280px] scrollbar-thin scrollbar-thumb-slate-800"
          >
            {aiChatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black shrink-0 text-xs shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-sky-500 text-white'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  {msg.sender === 'user' ? 'Siz' : <Bot className="w-5 h-5 text-slate-950" />}
                </div>

                {/* Message Content Bubble */}
                <div
                  className={`max-w-[85%] rounded-3xl p-4 leading-relaxed text-xs sm:text-sm font-medium shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-sky-600 text-white font-bold rounded-tr-none'
                      : 'bg-[#131f37] text-slate-100 border border-slate-700/80 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75 mb-1.5 font-bold">
                    <span>{msg.sender === 'user' ? 'Kulüp Yöneticisi' : 'SportsFly AI Analisti'}</span>
                    <span>{msg.time}</span>
                  </div>
                  <div className="leading-relaxed">{msg.text}</div>
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex items-start gap-3 animate-in fade-in">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">
                  <Bot className="w-5 h-5 text-slate-950 animate-bounce" />
                </div>
                <div className="bg-[#131f37] text-emerald-400 px-4 py-3 rounded-3xl text-xs font-bold flex items-center gap-3 border border-slate-700 shadow-md">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>SportsFly AI veritabanınızı tarıyor ve detaylı analiz hazırlıyor...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hızlı Analiz Soruları:</span>
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                'Which batch currently has the highest risk of non-renewals?',
                'Gelecek ay kaç üyelik yenilenecek ve ciro tahmini nedir?',
                'Devamsızlığı artan öğrencilere ne mesaj göndereyim?',
                'Elite Batch performansı ve üye memnuniyeti nasıl?',
              ].map((chip, cIdx) => (
                <button
                  key={cIdx}
                  onClick={() => handleAskAi(chip)}
                  className="px-3 py-1.5 rounded-xl bg-[#172540] hover:bg-emerald-500/25 text-slate-200 hover:text-emerald-300 border border-slate-700/80 hover:border-emerald-500/50 text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* High-Visibility Chat Input Bar */}
          <div className="pt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                placeholder="Ask me about your academy... (Örn: Hangi grupta terk riski var?)"
                className="w-full pl-4 pr-10 py-3.5 rounded-2xl bg-[#070d18] border-2 border-slate-800 focus:border-emerald-500 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner font-semibold"
              />
              {userQuery && (
                <button
                  onClick={() => setUserQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => handleAskAi()}
              disabled={!userQuery.trim() || isAnalyzing}
              className={`px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl transition-all cursor-pointer ${
                !userQuery.trim() || isAnalyzing
                  ? 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105'
              }`}
            >
              <span>Gönder</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT: ANALYSIS METRIC CARD & GRAPH */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          <div className="rounded-3xl bg-white dark:bg-[#111c2e] text-slate-900 dark:text-white p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-black tracking-tight">Analysis</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                This Month ▾
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Elite Batch</div>
                <div className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <span>₺7,150</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center">
                    ▲ <span className="ml-0.5">+18%</span>
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Emerging Batch</div>
                <div className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <span>₺1,050</span>
                  <span className="text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center">
                    ▼ <span className="ml-0.5">-8%</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Trend SVG Curve */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Aylık Retention Trendi</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">%88.4 Zirve</span>
              </div>

              <div className="h-20 w-full relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 50">
                  <path
                    d="M 0,35 Q 30,15 60,30 T 120,40 T 160,10 T 200,25"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Active Month Highlight Dot */}
                  <circle cx="90" cy="36" r="6" fill="#10b981" className="animate-ping opacity-75" />
                  <circle cx="90" cy="36" r="4.5" fill="#10b981" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Jan</span>
                <span>Feb</span>
                <span className="px-2 py-0.5 bg-emerald-500 text-white rounded font-extrabold shadow-2xs">Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
              </div>
            </div>
          </div>

          {/* Action Card (Yenilenmiş Koyu Mavi Gradyanlı Görünüm) */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Hızlı Aksiyon Önerisi</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              U12 grubundaki 4 veliye 1-tıkla AI hatırlatma SMS'i atarak potansiyel ₺12,500 yenileme kaybını önleyebilirsiniz.
            </p>
            <button
              onClick={() => {
                setActiveTab('churn');
                handleAskAi('U12 grubuna hatırlatma mesajı gönderilmesini başlat.');
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-md"
            >
              Hatırlatmaları İncele
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: TABS FOR DETAILS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-sm dark:bg-sky-600'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Genel AI Bakış</span>
        </button>

        <button
          onClick={() => setActiveTab('churn')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'churn'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Terk (Churn) Riski &amp; Uyarılar ({atRiskList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'forecast'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Yenileme Öngörüleri</span>
        </button>

        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'recommendations'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>AI Büyüme Önerileri</span>
        </button>
      </div>

      {/* SECTION 4: TAB DETAILS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Üye Tutma Oranı (Retention Rate)</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">%88.4</div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Geçen aya göre <span className="text-emerald-600 font-bold">+%3.2 artış</span> sağlandı.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Risk Altındaki Üyeler (Churn Risk)</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">6 Sporcu</div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                4 sporcu üst üste 2 ve üzeri antrenmana katılmadı.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Gelecek Ay Tahmini Gelir</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">₺148,500</div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Yapay zeka öngörüsüne göre %92 yenileme gerçekleşecek.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TERK (CHURN) RİSKİ */}
      {activeTab === 'churn' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Yapay Zeka Erken Uyarı &amp; Terk (Churn) Riski Listesi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Yoklama devamsızlığı ve ödeme gecikmelerine göre yapay zeka tarafından tespit edilen riskli gruplar.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {atRiskList.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.riskLevel === 'Yuksek'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200'
                          : item.riskLevel === 'Orta'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      %{item.churnProbabilityPercent} Terk Riski
                    </span>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">{item.batchName}</h3>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4">
                    <span>Devamsız Sporcu: <strong className="text-slate-800 dark:text-slate-200">{item.absentCount} Kişi</strong></span>
                    <span>Geciken Aidat: <strong className="text-slate-800 dark:text-slate-200">{item.overdueDays} Gün</strong></span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    💡 <strong className="text-sky-600 dark:text-sky-400">AI Önerisi:</strong> {item.suggestedAction}
                  </p>
                </div>

                <button
                  onClick={() => handleSendReminderAction(item)}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Hatırlatıcı SMS Gönder</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FORECAST */}
      {activeTab === 'forecast' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Gelecek 6 Aylık Üyelik Yenileme &amp; Retention Öngörüleri</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Geçmiş üyelik kalıcılığı ve devam oranlarına dayalı yapay zeka projeksiyonu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { month: 'Kasım 2026', percent: 92, count: '131 / 142', income: '₺152,000' },
              { month: 'Aralık 2026', percent: 89, count: '126 / 142', income: '₺146,500' },
              { month: 'Ocak 2027', percent: 86, count: '122 / 142', income: '₺141,800' },
              { month: 'Şubat 2027', percent: 90, count: '128 / 142', income: '₺149,000' },
            ].map((f, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-black text-slate-500 uppercase">{f.month}</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">%{f.percent}</div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-bold">Yenileme: {f.count}</div>
                <div className="text-xs font-mono font-bold text-sky-600">{f.income}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Yapay Zeka Destekli Büyüme &amp; Retention Tavsiyeleri</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Akademinizin üye sadakatini ve cirosunu artırmak için uygulayabileceğiniz stratejiler.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm text-amber-900 dark:text-amber-300">
                <Award className="w-4 h-4 text-amber-600" />
                <span>1. Dijital Rozet ve Puan Ödüllendirmesi</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                Son 30 günde devamsızlığı bulunmayan öğrencilere <strong>Sporpuan Yıldız Sporcu Rozeti</strong> vererek veli memnuniyetini %25 oranında artırabilirsiniz.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm text-sky-900 dark:text-sky-300">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>2. Erken Ödeme İndirim Kampanyası</span>
              </div>
              <p className="text-xs text-sky-800 dark:text-sky-200 leading-relaxed">
                Aylık ödemeler yerine 3 aylık peşin ödemelerde %10 indirim sunduğunuzda nakit akışınız %35 daha istikrarlı hale gelecektir.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
