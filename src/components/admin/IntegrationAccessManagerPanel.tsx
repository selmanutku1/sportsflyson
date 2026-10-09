import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import {
  Plus,
  Trash2,
  Key,
  Check,
  Building2,
  Activity,
  Trophy,
  Upload,
  Image as ImageIcon,
  Edit2,
  Copy,
  CheckCheck,
  X,
  Phone,
  Mail,
  User,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { getStoredIntegrations } from '../../data/entegrasyonlarData';
import { CompanyIntegrationProfile, CompanyIntegrationType } from '../../types';

const allStored = getStoredIntegrations();
const ALL_MODULES = allStored.map((item) => ({ id: item.id, name: item.name }));
const defaultActiveModules: Record<string, boolean> = {};
allStored.forEach((item) => {
  defaultActiveModules[item.id] = true;
});

export const IntegrationAccessManagerPanel: React.FC = () => {
  const [integrations, setIntegrations] = useState<CompanyIntegrationProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [companyName, setCompanyName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [companyType, setCompanyType] = useState<CompanyIntegrationType>('analiz_firmasi');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [branchName, setBranchName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>(defaultActiveModules);

  // UI state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchIntegrations = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'integrations'));
      const data = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      }));
      setIntegrations(data);
      localStorage.setItem('sportsfly_integration_access_list', JSON.stringify(data));
    } catch (e) {
      // Fallback to localStorage if offline/Firestore error
      const stored = localStorage.getItem('sportsfly_integration_access_list');
      if (stored) {
        try {
          setIntegrations(JSON.parse(stored));
        } catch (err) {}
      }
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const generateAccessCode = () => {
    const prefix = companyType === 'analiz_firmasi' ? 'LAB' : 'KLP';
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    setAccessCode(`${prefix}-${random}`);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir görsel dosyası (PNG, JPG, SVG, WebP) seçiniz.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo görsel boyutu en fazla 2MB olmalıdır.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoDataUrl(result);
      showToast('Logo başarıyla yüklendi.');
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setEditingId(null);
    setCompanyName('');
    setAccessCode('');
    setCompanyType('analiz_firmasi');
    setAuthorizedPerson('');
    setPhone('');
    setEmail('');
    setCity('');
    setBranchName('');
    setLogoDataUrl('');
    setNotes('');
    setActiveModules(defaultActiveModules);
    if (logoFileInputRef.current) logoFileInputRef.current.value = '';
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyName.trim() || !accessCode.trim()) {
      alert('Lütfen Firma / Kulüp Adı ve Geçiş Kodunu eksiksiz giriniz.');
      return;
    }

    const entryData: CompanyIntegrationProfile = {
      companyName: companyName.trim(),
      accessCode: accessCode.trim().toUpperCase(),
      companyType,
      authorizedPerson: authorizedPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      branchName: branchName.trim(),
      logoDataUrl: logoDataUrl || '',
      notes: notes.trim(),
      activeModules,
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      // Update existing
      try {
        await updateDoc(doc(db, 'integrations', editingId), entryData as any);
      } catch (err) {}

      const updated = integrations.map((item) =>
        item.id === editingId ? { ...item, ...entryData } : item
      );
      setIntegrations(updated);
      localStorage.setItem('sportsfly_integration_access_list', JSON.stringify(updated));
      showToast(`"${entryData.companyName}" bilgileri ve logosu güncellendi.`);
      resetForm();
    } else {
      // Add new
      const withCreated = {
        ...entryData,
        createdAt: new Date().toISOString(),
      };

      let newId = Date.now().toString();
      try {
        const docRef = await addDoc(collection(db, 'integrations'), withCreated as any);
        newId = docRef.id;
      } catch (err) {}

      const updated = [...integrations, { id: newId, ...withCreated }];
      setIntegrations(updated);
      localStorage.setItem('sportsfly_integration_access_list', JSON.stringify(updated));
      showToast(`"${entryData.companyName}" geçiş kodu ve firma profili başarıyla oluşturuldu.`);
      resetForm();
    }
  };

  const handleStartEdit = (int: CompanyIntegrationProfile) => {
    setEditingId(int.id || null);
    setCompanyName(int.companyName || '');
    setAccessCode(int.accessCode || '');
    setCompanyType(int.companyType || 'analiz_firmasi');
    setAuthorizedPerson(int.authorizedPerson || '');
    setPhone(int.phone || '');
    setEmail(int.email || '');
    setCity(int.city || '');
    setBranchName(int.branchName || '');
    setLogoDataUrl(int.logoDataUrl || '');
    setNotes(int.notes || '');
    setActiveModules(int.activeModules || defaultActiveModules);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" firma entegrasyon erişimini ve geçiş kodunu silmek istediğinizden emin misiniz?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'integrations', id));
    } catch (e) {}
    const updated = integrations.filter((i) => i.id !== id);
    setIntegrations(updated);
    localStorage.setItem('sportsfly_integration_access_list', JSON.stringify(updated));
    showToast(`"${name}" erişim kaydı silindi.`);
    if (editingId === id) resetForm();
  };

  const handleCopyCode = (code: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      showToast(`Geçiş kodu "${code}" panoya kopyalandı.`);
    }
  };

  const toggleModule = (modId: string) => {
    setActiveModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  return (
    <div className="bg-white dark:bg-[#111c2e] p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6 relative">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Analiz Firmaları &amp; Spor Kulüpleri Entegrasyon Yönetimi
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SportsFly LAB'ı kullanacak analiz firmaları veya spor kulüpleri için firma profili ve geçiş kodu oluşturun.
            Yüklediğiniz logo, firmanın entegrasyon profilinde yer alır; sporcu karnelerinde ise analiz yapılan spor kulübünün kendi logosu görüntülenir.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSave}
        className="space-y-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            {editingId ? (
              <>
                <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Firma Bilgilerini &amp; Logoyu Güncelle</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-blue-500" />
                <span>Yeni Firma / Kulüp Geçiş Kodu &amp; Profil Oluştur</span>
              </>
            )}
          </span>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Vazgeç
            </button>
          )}
        </div>

        {/* Kurum Türü Seçimi */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Kurum / Firma Türü:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCompanyType('analiz_firmasi')}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                companyType === 'analiz_firmasi'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs font-bold">Analiz Firması</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Sporcu test ve performans analiz merkezi
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCompanyType('spor_kulubu')}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                companyType === 'spor_kulubu'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold">Spor Kulübü</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Federe spor kulübü ve altyapı
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCompanyType('spor_okulu')}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                companyType === 'spor_okulu'
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 text-sky-900 dark:text-sky-200 ring-1 ring-sky-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
              <div>
                <div className="text-xs font-bold">Spor Okulu / Akademi</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Spor okulu veya gelişim akademisi
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Temel Bilgiler: Firma Adı, Geçiş Kodu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Firma / Kulüp Adı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Örn: Rota Performans Analiz veya Fenerbahçe Gelişim"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Geçiş Kodu (Giriş Şifresi) <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Örn: ROTA2026 veya LAB-9X2Y"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                required
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold uppercase font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={generateAccessCode}
                className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl cursor-pointer transition-colors text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shrink-0"
                title="Otomatik Kod Oluştur"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kod Üret</span>
              </button>
            </div>
          </div>
        </div>

        {/* LOGO YÜKLEME ALANI (SÜPER ADMİN TARAFINDAN EKLENEBİLİR) */}
        <div className="p-3.5 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {/* Logo Preview Box */}
              <div
                onClick={() => logoFileInputRef.current?.click()}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1 cursor-pointer transition-colors shrink-0 overflow-hidden group"
                title="Logo yüklemek için tıklayın"
              >
                {logoDataUrl ? (
                  <img
                    src={logoDataUrl}
                    alt={companyName || 'Logo'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-400 group-hover:text-blue-500">
                    <ImageIcon className="w-5 h-5 mx-auto" />
                    <span className="text-[9px] font-bold block mt-0.5">LOGO</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Firma / Kulüp Logosu (Süper Admin)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Bu logo, analiz firmasının entegrasyon profilinde yer alır. Sporcu karnelerinde ise analiz yapılan spor kulübünün kendi logosu kullanılır.
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{logoDataUrl ? 'Logoyu Değiştir' : 'Logo Yükle'}</span>
                  </button>
                  {logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoDataUrl('')}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Logoyu Kaldır</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {logoDataUrl && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 self-start sm:self-center">
                ✓ Kurumsal Logo Tanımlı
              </span>
            )}
          </div>
        </div>

        {/* Detay Bilgiler: Yetkili, Telefon, E-posta, Şehir, Şube */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Yetkili Kişi
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Ad Soyad / Unvan"
                value={authorizedPerson}
                onChange={(e) => setAuthorizedPerson(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Telefon Numarası
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Örn: 0532 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                placeholder="iletisim@firma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Şube / Kampüs &amp; İl
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Örn: Kadıköy Şube, İstanbul"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Aktif Modüller */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Bu Geçiş Kodu İçin Aktif Edilecek Modüller / Yetkiler:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_MODULES.map((mod) => {
              const isActive = activeModules[mod.id] ?? true;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="truncate">{mod.name}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Aksiyon Butonları */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              İptal
            </button>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
          >
            {editingId ? (
              <>
                <Check className="w-4 h-4" /> Değişiklikleri Kaydet
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Geçiş Kodu ve Firma Profilini Kaydet
              </>
            )}
          </button>
        </div>
      </form>

      {/* Tanımlı Firmalar Listesi */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Tanımlı Firma &amp; Kulüp Entegrasyon Erişimleri ({integrations.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            Geçiş koduyla giriş yapan firmalar SportsFly LAB'da kendi profillerini görür
          </span>
        </div>

        {integrations.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-500">Henüz tanımlı firma veya spor kulübü erişimi bulunmuyor.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Yukarıdaki formu kullanarak analiz firmaları veya spor kulüpleri için geçiş kodu ve profil oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {integrations.map((int: CompanyIntegrationProfile) => {
              const isLabActive = int.activeModules?.['int-sportsfly-lab'] ?? true;
              return (
                <div
                  key={int.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 flex flex-col justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-2xs"
                >
                  <div>
                    {/* Top row: Logo + Name + Badge */}
                    <div className="flex items-start gap-3">
                      {/* Logo or Default Icon */}
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                        {int.logoDataUrl ? (
                          <img
                            src={int.logoDataUrl}
                            alt={int.companyName}
                            className="w-full h-full object-contain"
                          />
                        ) : int.companyType === 'spor_kulubu' ? (
                          <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        ) : int.companyType === 'spor_okulu' ? (
                          <Building2 className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                        ) : (
                          <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                            {int.companyName}
                          </p>
                          {/* Type Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              int.companyType === 'spor_kulubu'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : int.companyType === 'spor_okulu'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                            }`}
                          >
                            {int.companyType === 'spor_kulubu'
                              ? 'Spor Kulübü'
                              : int.companyType === 'spor_okulu'
                              ? 'Spor Okulu'
                              : 'Analiz Firması'}
                          </span>
                        </div>

                        {/* Pass code with copy button */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Geçiş Kodu:
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-mono font-black tracking-wider">
                            {int.accessCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(int.accessCode)}
                            className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Kodu Kopyala"
                          >
                            {copiedCode === int.accessCode ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Branch Info */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/70 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                      {(int.authorizedPerson || int.phone) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {int.authorizedPerson && (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Yetkili: {int.authorizedPerson}
                            </span>
                          )}
                          {int.phone && (
                            <span className="text-slate-500">· {int.phone}</span>
                          )}
                        </div>
                      )}
                      {(int.branchName || int.city) && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>
                            {int.branchName} {int.city && `(${int.city})`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Active Modules Pills */}
                    {int.activeModules && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {Object.entries(int.activeModules).map(([modId, active]) => {
                          if (!active) return null;
                          const modMeta = ALL_MODULES.find((m) => m.id === modId);
                          if (!modMeta) return null;
                          const isLab = modId === 'int-sportsfly-lab';
                          return (
                            <span
                              key={modId}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                isLab
                                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-bold'
                                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              ✓ {modMeta.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions: Edit & Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                    <span className="text-[10px] text-slate-400">
                      {isLabActive ? 'SportsFly LAB Yetkili' : 'LAB Pasif'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(int)}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Düzenle</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(int.id!, int.companyName)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg cursor-pointer transition-colors"
                        title="Erişimi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


