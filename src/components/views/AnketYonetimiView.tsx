import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  BarChart2, 
  Plus, 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock, 
  PieChart, 
  Star,
  MessageSquare,
  ArrowLeft,
  Share2,
  MessageCircle,
  Smartphone,
  Mail,
  Link2,
  Send,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { INITIAL_ANKETLER, AnketItem, AnketQuestion } from '../../data/mockAnketData';
import { auth } from '../../firebase';
import { anketlerService } from '../../services/operationsFirestoreService';

type TabType = 'list' | 'report' | 'send';

export const AnketYonetimiView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [selectedAnket, setSelectedAnket] = useState<AnketItem | null>(null);
  const [anketler, setAnketler] = useState<AnketItem[]>(INITIAL_ANKETLER);
  const [filterAudience, setFilterAudience] = useState<string>('Hepsi');
  
  // States for Sending Flow
  const [selectedChannel, setSelectedChannel] = useState<string>('whatsapp');
  const [isSending, setIsSending] = useState(false);
  const [showSendSuccess, setShowSendSuccess] = useState(false);

  // Create / Edit Modal States
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingAnket, setEditingAnket] = useState<AnketItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAudience, setFormAudience] = useState<AnketItem['targetAudience']>('Veli');
  const [formStatus, setFormStatus] = useState<AnketItem['status']>('Aktif');
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [formQuestionText, setFormQuestionText] = useState('');
  const [formQuestionType, setFormQuestionType] = useState<AnketQuestion['type']>('rating');

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = anketlerService.subscribe((items) => {
      if (items.length > 0) {
        setAnketler(items);
      }
    });
    return () => unsub();
  }, []);

  const openCreateModal = (fromTemplate = false) => {
    setEditingAnket(null);
    setFormTitle(fromTemplate ? 'Dönem Sonu Veli & Sporcu Memnuniyet Anketi' : '');
    setFormDesc(
      fromTemplate
        ? 'Kulüp tesisleri, antrenman kalitesi ve iletişim memnuniyetini ölçmeye yönelik hazır dönem anketi.'
        : ''
    );
    setFormAudience('Veli');
    setFormStatus('Aktif');
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setFormDueDate(d.toISOString().split('T')[0]);
    setFormQuestionText(
      fromTemplate ? 'Genel antrenman ve kulüp iletişiminden ne kadar memnunsunuz?' : ''
    );
    setFormQuestionType('rating');
    setShowEditorModal(true);
  };

  const openEditModal = (anket: AnketItem) => {
    setEditingAnket(anket);
    setFormTitle(anket.title);
    setFormDesc(anket.description);
    setFormAudience(anket.targetAudience);
    setFormStatus(anket.status);
    setFormDueDate(anket.dueDate);
    setFormQuestionText(anket.questions?.[0]?.text || '');
    setFormQuestionType(anket.questions?.[0]?.type || 'rating');
    setShowEditorModal(true);
  };

  const handleSaveAnket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const firstQuestion: AnketQuestion = {
      id: editingAnket?.questions?.[0]?.id || `q-${Date.now()}`,
      text: formQuestionText.trim() || 'Genel memnuniyet değerlendirmeniz nedir?',
      type: formQuestionType,
      stats: editingAnket?.questions?.[0]?.stats,
    };

    const nextQuestions =
      editingAnket && editingAnket.questions.length > 0
        ? [firstQuestion, ...editingAnket.questions.slice(1)]
        : [firstQuestion];

    const savedItem: AnketItem = editingAnket
      ? {
          ...editingAnket,
          title: formTitle.trim(),
          description: formDesc.trim(),
          targetAudience: formAudience,
          status: formStatus,
          dueDate: formDueDate,
          questions: nextQuestions,
        }
      : {
          id: `ank-${Date.now()}`,
          title: formTitle.trim(),
          description: formDesc.trim(),
          targetAudience: formAudience,
          status: formStatus,
          responseCount: 0,
          totalSent: formStatus === 'Taslak' ? 0 : 120,
          createdAt: new Date().toISOString().split('T')[0],
          dueDate: formDueDate,
          questions: nextQuestions,
        };

    setAnketler((prev) =>
      editingAnket
        ? prev.map((a) => (a.id === savedItem.id ? savedItem : a))
        : [savedItem, ...prev]
    );
    setShowEditorModal(false);

    if (auth.currentUser) {
      try {
        await anketlerService.upsert(savedItem);
      } catch (err) {
        console.error('Anket Firestore kaydı hatası:', err);
      }
    }
  };

  const handleDeleteAnket = async (anketId: string) => {
    if (!window.confirm('Bu anketi silmek istediğinize emin misiniz?')) return;
    setAnketler((prev) => prev.filter((a) => a.id !== anketId));
    setShowEditorModal(false);
    if (auth.currentUser) {
      try {
        await anketlerService.delete(anketId);
      } catch (err) {
        console.error('Anket silme Firestore hatası:', err);
      }
    }
  };

  const handleViewReport = (anket: AnketItem) => {
    setSelectedAnket(anket);
    setActiveTab('report');
  };

  const handleSendSurvey = (anket: AnketItem) => {
    setSelectedAnket(anket);
    setActiveTab('send');
    setShowSendSuccess(false);
    setSelectedChannel('whatsapp'); // default
  };

  const simulateSend = () => {
    setIsSending(true);
    setTimeout(async () => {
      setIsSending(false);
      setShowSendSuccess(true);
      if (selectedAnket) {
        const updatedAnket: AnketItem = {
          ...selectedAnket,
          status: selectedAnket.status === 'Taslak' ? 'Aktif' : selectedAnket.status,
          totalSent: selectedAnket.totalSent > 0 ? selectedAnket.totalSent : 120,
        };
        setSelectedAnket(updatedAnket);
        setAnketler((prev) => prev.map((a) => (a.id === updatedAnket.id ? updatedAnket : a)));
        if (auth.currentUser) {
          try {
            await anketlerService.upsert(updatedAnket);
          } catch (err) {
            console.error('Anket gönderim güncelleme Firestore hatası:', err);
          }
        }
      }
      setTimeout(() => {
        setActiveTab('list');
      }, 2500);
    }, 1200);
  };

  const filteredAnketler = anketler.filter(a => 
    filterAudience === 'Hepsi' ? true : a.targetAudience === filterAudience
  );

  const renderProgressBar = (percent: number, colorClass: string) => (
    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1 overflow-hidden flex">
      <div 
        className={`h-2.5 rounded-full ${colorClass}`} 
        style={{ width: `${percent}%` }}
      ></div>
    </div>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aktif':
        return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Aktif</span>;
      case 'Tamamlandı':
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Tamamlandı</span>;
      case 'Taslak':
        return <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"><FileText className="w-3 h-3" /> Taslak</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-8 pt-6 overflow-y-auto w-full h-full">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Anket Yönetimi
          </h1>
        </div>
        
        {activeTab === 'list' && (
          <button
            onClick={() => openCreateModal(false)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Anket Oluştur</span>
          </button>
        )}
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['Hepsi', 'Sporcu', 'Veli', 'Eğitmen'].map(aud => (
              <button
                key={aud}
                onClick={() => setFilterAudience(aud)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  filterAudience === aud 
                    ? 'bg-slate-800 text-white border-slate-800' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {aud === 'Hepsi' ? 'Tüm Anketler' : `${aud} Anketleri`}
              </button>
            ))}
          </div>

          {/* Survey List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnketler.map(anket => (
              <div key={anket.id} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col relative group">
                <div className="flex justify-between items-start mb-4">
                  {getStatusBadge(anket.status)}
                  <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {anket.targetAudience}
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2">{anket.title}</h3>
                <p className="text-sm text-slate-500 mb-6 line-clamp-2 flex-1">{anket.description}</p>
                
                <div className="flex items-center justify-between text-sm mb-6 pb-5 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs font-semibold mb-1">Katılım</span>
                    <span className="font-bold text-slate-700">
                      {anket.responseCount} <span className="text-slate-400 font-normal">/ {anket.totalSent || '-'}</span>
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-slate-400 text-xs font-semibold mb-1">Bitiş Tarihi</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(anket.dueDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewReport(anket)}
                    disabled={anket.status === 'Taslak' || anket.responseCount === 0}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2.5 rounded-xl font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <BarChart2 className="w-4 h-4" />
                    Raporlar
                  </button>
                  <button 
                    onClick={() => handleSendSurvey(anket)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-100 transition-colors text-sm border border-emerald-100"
                    title="Paylaş / Gönder"
                  >
                    <Share2 className="w-4 h-4" />
                    Gönder
                  </button>
                  <button 
                    onClick={() => openEditModal(anket)}
                    className="px-3 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl font-semibold hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer" 
                    title="Düzenle"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Template Card */}
            <div 
              onClick={() => openCreateModal(true)}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer min-h-[280px]"
            >
              <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                <Plus className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Şablondan Oluştur</h3>
              <p className="text-sm text-slate-500 max-w-[200px]">
                Hazır şablonlarımızı kullanarak hızlıca yeni bir anket başlatın.
              </p>
            </div>
          </div>
        </>
      ) : activeTab === 'send' && selectedAnket ? (
        /* Send / Share View */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button 
            onClick={() => setActiveTab('list')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Anket Listesine Dön
          </button>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/60 overflow-hidden mb-8 max-w-3xl mx-auto">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Anket Gönderimi</h2>
                  <p className="text-sm text-slate-500">Hedef Kitle: <strong className="text-slate-700">{selectedAnket.targetAudience}</strong></p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="mb-8">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Gönderim Kanalı Seçin</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WhatsApp */}
                  <button 
                    onClick={() => setSelectedChannel('whatsapp')}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      selectedChannel === 'whatsapp' 
                        ? 'border-green-500 bg-green-50 ring-1 ring-green-500 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-green-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      selectedChannel === 'whatsapp' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`block font-semibold ${selectedChannel === 'whatsapp' ? 'text-green-800' : 'text-slate-700'}`}>WhatsApp</span>
                      <span className="text-xs text-slate-500">Doğrudan mesaj ile gönderin</span>
                    </div>
                    {selectedChannel === 'whatsapp' && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 text-green-500">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                  </button>

                  {/* SMS */}
                  <button 
                    onClick={() => setSelectedChannel('sms')}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      selectedChannel === 'sms' 
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      selectedChannel === 'sms' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`block font-semibold ${selectedChannel === 'sms' ? 'text-blue-800' : 'text-slate-700'}`}>SMS</span>
                      <span className="text-xs text-slate-500">Kısa mesaj olarak iletin</span>
                    </div>
                    {selectedChannel === 'sms' && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 text-blue-500">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                  </button>

                  {/* Mail */}
                  <button 
                    onClick={() => setSelectedChannel('mail')}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      selectedChannel === 'mail' 
                        ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      selectedChannel === 'mail' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`block font-semibold ${selectedChannel === 'mail' ? 'text-amber-800' : 'text-slate-700'}`}>E-Posta</span>
                      <span className="text-xs text-slate-500">Detaylı HTML şablonu ile</span>
                    </div>
                    {selectedChannel === 'mail' && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 text-amber-500">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                  </button>

                  {/* Link Copy */}
                  <button 
                    onClick={() => setSelectedChannel('link')}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      selectedChannel === 'link' 
                        ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      selectedChannel === 'link' ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Link2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`block font-semibold ${selectedChannel === 'link' ? 'text-purple-800' : 'text-slate-700'}`}>Bağlantı</span>
                      <span className="text-xs text-slate-500">Manuel paylaşım için kopyala</span>
                    </div>
                    {selectedChannel === 'link' && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 text-purple-500">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider">Mesaj İçeriği</h3>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    Şablon Düzenleyici
                  </div>
                  <textarea 
                    className="w-full bg-transparent p-4 min-h-[140px] outline-none text-slate-700 text-sm resize-none leading-relaxed"
                    defaultValue={`Sayın ${selectedAnket.targetAudience}imiz,\n\n"${selectedAnket.title}" anketimize katılımınız bizim için değerlidir. Hizmet kalitemizi artırmak için lütfen aşağıdaki bağlantıya tıklayarak anketi doldurunuz.\n\nKatılmak için tıklayın: https://sportsfly.com/anket/${selectedAnket.id}\n\nİlginiz için teşekkür ederiz.`}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" /> 
                  Değişkenler (ad, soyad, link vb.) gönderim anında sistem tarafından otomatik doldurulacaktır.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-2">
                <div className="text-sm font-medium text-slate-500">
                  Tahmini Gönderim: <strong className="text-slate-700">120 Kişi</strong>
                </div>
                <button
                  onClick={simulateSend}
                  disabled={isSending || showSendSuccess}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${
                    showSendSuccess 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-70`}
                >
                  {isSending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Gönderiliyor...</span>
                    </>
                  ) : showSendSuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Başarıyla Gönderildi!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Gönderimi Başlat</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Report View */
        selectedAnket && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button 
              onClick={() => setActiveTab('list')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Anket Listesine Dön
            </button>

            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/60 overflow-hidden mb-8">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusBadge(selectedAnket.status)}
                      <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md">
                        Hedef: {selectedAnket.targetAudience}
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedAnket.title}</h2>
                    <p className="text-slate-500 max-w-2xl">{selectedAnket.description}</p>
                  </div>
                  
                  <div className="flex gap-6 bg-white p-4 rounded-xl shadow-xs border border-slate-100">
                    <div className="text-center px-4 border-r border-slate-100">
                      <div className="text-3xl font-black text-blue-600 mb-1">{selectedAnket.responseCount}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Yanıt</div>
                    </div>
                    <div className="text-center px-4">
                      <div className="text-3xl font-black text-slate-700 mb-1">
                        {selectedAnket.totalSent > 0 ? Math.round((selectedAnket.responseCount / selectedAnket.totalSent) * 100) : 0}%
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Katılım Oranı</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-slate-400" />
                  Soru Bazlı Raporlar
                </h3>

                <div className="space-y-8">
                  {selectedAnket.questions.map((q, idx) => (
                    <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-6">
                      <h4 className="font-semibold text-slate-800 mb-5 text-base flex gap-3">
                        <span className="text-slate-400 font-normal">{idx + 1}.</span>
                        {q.text}
                      </h4>

                      {/* Boolean Type */}
                      {q.type === 'boolean' && q.stats && (
                        <div className="space-y-4">
                          {q.stats.distribution?.map((dist, i) => (
                            <div key={i}>
                              <div className="flex justify-between text-sm font-medium mb-1.5">
                                <span className="text-slate-700">{dist.label}</span>
                                <span className="text-slate-500">{dist.count} Yanıt ({dist.percent}%)</span>
                              </div>
                              {renderProgressBar(dist.percent, i === 0 ? 'bg-emerald-500' : 'bg-rose-400')}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rating Type */}
                      {q.type === 'rating' && q.stats && (
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                          <div className="w-32 h-32 rounded-full border-[8px] border-amber-100 flex flex-col items-center justify-center shrink-0">
                            <span className="text-3xl font-black text-amber-500">{q.stats.avgRating}</span>
                            <div className="flex text-amber-400 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < Math.round(q.stats!.avgRating!) ? 'fill-current' : 'text-slate-200'}`} />
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex-1 w-full space-y-3">
                            {q.stats.distribution?.map((dist, i) => (
                              <div key={i} className="flex items-center gap-4">
                                <div className="w-16 text-xs font-semibold text-slate-500 text-right shrink-0">{dist.label}</div>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${dist.percent}%` }}></div>
                                </div>
                                <div className="w-12 text-xs font-medium text-slate-400">{dist.percent}%</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Text Type */}
                      {q.type === 'text' && q.stats && (
                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 max-h-[200px] overflow-y-auto">
                          {q.stats.answers?.map((ans, i) => (
                            <div key={i} className="flex gap-3 bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
                              <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <p className="text-sm text-slate-600">{ans}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Create / Edit Survey Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800">
                {editingAnket ? 'Anketi Düzenle' : 'Yeni Anket Oluştur'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAnket} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Anket Başlığı *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Örn: Yaz Dönemi Veli Memnuniyet Anketi"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Katılımcılara gösterilecek kısa bilgilendirme metni..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Hedef Kitle</label>
                  <select
                    value={formAudience}
                    onChange={(e) => setFormAudience(e.target.value as AnketItem['targetAudience'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="Veli">Veli</option>
                    <option value="Sporcu">Sporcu</option>
                    <option value="Eğitmen">Eğitmen</option>
                    <option value="Genel">Genel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Durum</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AnketItem['status'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Taslak">Taslak</option>
                    <option value="Tamamlandı">Tamamlandı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Ana Anket Sorusu</label>
                  <input
                    type="text"
                    value={formQuestionText}
                    onChange={(e) => setFormQuestionText(e.target.value)}
                    placeholder="Örn: Antrenman kalitesini nasıl değerlendiriyorsunuz?"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Soru Tipi</label>
                  <select
                    value={formQuestionType}
                    onChange={(e) => setFormQuestionType(e.target.value as AnketQuestion['type'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="rating">Yıldız (1-5)</option>
                    <option value="boolean">Evet / Hayır</option>
                    <option value="text">Açık Uçlu</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {editingAnket ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteAnket(editingAnket.id)}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Sil</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditorModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    {editingAnket ? 'Değişiklikleri Kaydet' : 'Anketi Kaydet'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
