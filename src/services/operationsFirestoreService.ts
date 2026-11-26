import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
  QueryConstraint,
  Unsubscribe,
  DocumentData,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  db,
  auth,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import {
  ensureValidDocumentId,
  getAuthenticatedOwnerId,
  isSuperAdminSession,
} from './firestoreService';
import { sanitizeAvatarUrl } from './firestoreCollectionsSchema';
import {
  GelirGiderItem,
  GelirGiderKategoriItem,
  OdemePlaniItem,
  AntrenmanItem,
  OnKayitItem,
  YoneticiItem,
  KulupSozlesmesi,
} from '../types';
import { AnketItem, INITIAL_ANKETLER } from '../data/mockAnketData';
import { SupportTicketFull } from '../types/destek';
import { INITIAL_SUPPORT_TICKETS_FULL } from '../data/mockDestekData';
import { Sube, INITIAL_SUBELER } from '../data/subeData';
import {
  INITIAL_KATEGORILER,
  INITIAL_GELIR_GIDER,
  INITIAL_ODEME_PLANI,
} from '../data/mockMuhasebeData';
import { INITIAL_ON_KAYITLAR, INITIAL_YONETICILER } from '../data/mockData';
import { INITIAL_ANTRENMANLAR } from '../data/mockAntrenmanlar';
import { TrainingPlan } from '../types/egitimPlanlama';
import { TEMPLATE_TRAINING_PLANS } from '../data/egitimPlanlamaData';
import {
  ReminderLogItem,
  AutomationRuleConfig,
  DEFAULT_AUTOMATION_CONFIG,
} from './yoklamaHatirlaticiService';

export interface YoklamaMemberRecord {
  memberId: string;
  memberName: string;
  code?: string;
  status: 'present' | 'absent' | 'excused' | null;
  note?: string;
}

export interface YoklamaKaydiDoc {
  id: string;
  groupId: string;
  groupName: string;
  date: string;
  records: YoklamaMemberRecord[];
  presentCount?: number;
  absentCount?: number;
  excusedCount?: number;
}

export interface SporPuanLogItem {
  id: string;
  sporcuId: string;
  sporcuName?: string;
  ruleId?: string;
  category: string;
  ruleName: string;
  points: number;
  date: string;
  source: 'Otomatik' | 'Koç Onayı';
  note?: string;
}

export interface ClubSettingDoc {
  id: string;
  settingKey: string;
  config?: Record<string, unknown>;
  rulesList?: Record<string, unknown>[];
  activeValue?: string;
}

export interface AthleteContractDoc {
  id: string;
  athleteName: string;
  parentName: string;
  birthDate: string;
  tcNo: string;
  phone: string;
  email: string;
  branch: string;
  sube: string;
  signedAt: string;
  ipAddress: string;
  status: 'Onaylandı' | 'Bekliyor';
  signature: string;
  kvkkApproved: boolean;
  taahhutnameApproved: boolean;
  photoVideoApproved: boolean;
  hash: string;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      cleaned[k] = v;
    }
  }
  return cleaned as T;
}

function cleanStr(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.trim().slice(0, maxLen) || fallback;
}

function cleanNum(val: unknown, min = 0, max = 1000000000, fallback = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function createTenantQuery(collectionName: string, extraConstraints: QueryConstraint[] = []) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Firestore işlemi için aktif oturum gereklidir.');
  }
  if (isSuperAdminSession()) {
    return query(collection(db, collectionName), ...extraConstraints);
  }
  return query(
    collection(db, collectionName),
    where('ownerId', '==', currentUser.uid),
    ...extraConstraints
  );
}

// ============================================================================
// SANITIZERS PER COLLECTION (Strictly aligned with firestore.rules validators)
// ============================================================================

function sanitizeYoklamaPayload(item: YoklamaKaydiDoc, ownerId: string, docId: string) {
  const records = (Array.isArray(item.records) ? item.records : []).slice(0, 150).map((r) =>
    stripUndefined({
      memberId: cleanStr(r.memberId, 64, 'm-0'),
      memberName: cleanStr(r.memberName, 140, 'Sporcu'),
      code: r.code ? cleanStr(r.code, 32) : undefined,
      status: r.status || null,
      note: r.note ? cleanStr(r.note, 300) : undefined,
    })
  );
  return stripUndefined({
    id: docId,
    ownerId,
    groupId: ensureValidDocumentId(item.groupId || 'grp-1'),
    groupName: cleanStr(item.groupName, 160, 'Antrenman Grubu'),
    date: cleanStr(item.date, 32, new Date().toISOString().split('T')[0]),
    records,
    presentCount: cleanNum(item.presentCount ?? records.filter((r) => r.status === 'present').length, 0),
    absentCount: cleanNum(item.absentCount ?? records.filter((r) => r.status === 'absent').length, 0),
    excusedCount: cleanNum(item.excusedCount ?? records.filter((r) => r.status === 'excused').length, 0),
  });
}

function sanitizeMuhasebeHareketPayload(item: GelirGiderItem, ownerId: string, docId: string) {
  const validMethods = ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'POS'];
  const validStatuses = ['Tamamlandı', 'Beklemede', 'İptal'];
  return stripUndefined({
    id: docId,
    ownerId,
    type: item.type === 'Gider' ? 'Gider' : 'Gelir',
    title: cleanStr(item.title, 200, 'Muhasebe İşlemi'),
    category: cleanStr(item.category, 120, 'Genel'),
    amount: cleanNum(item.amount, 0),
    date: cleanStr(item.date, 32, new Date().toLocaleDateString('tr-TR')),
    payerOrPayee: cleanStr(item.payerOrPayee, 160, 'Kulüp'),
    paymentMethod: validMethods.includes(item.paymentMethod) ? item.paymentMethod : 'Nakit',
    status: validStatuses.includes(item.status) ? item.status : 'Tamamlandı',
    description: item.description ? cleanStr(item.description, 600) : undefined,
  });
}

function sanitizeMuhasebeKategoriPayload(item: GelirGiderKategoriItem, ownerId: string, docId: string) {
  return stripUndefined({
    id: docId,
    ownerId,
    name: cleanStr(item.name, 120, 'Kategori'),
    type: item.type === 'Gider' ? 'Gider' : 'Gelir',
    itemCount: cleanNum(item.itemCount, 0),
    totalAmount: cleanNum(item.totalAmount, 0),
    color: cleanStr(item.color, 32, 'emerald'),
  });
}

function sanitizeOdemePlaniPayload(item: OdemePlaniItem, ownerId: string, docId: string) {
  const validStatuses = ['Ödendi', 'Bekliyor', 'Gecikti'];
  return stripUndefined({
    id: docId,
    ownerId,
    athleteName: cleanStr(item.athleteName, 140, 'Sporcu'),
    athleteCode: cleanStr(item.athleteCode, 32, '000000'),
    planName: cleanStr(item.planName, 160, 'Aidat Planı'),
    installment: cleanStr(item.installment, 32, '1/1'),
    dueDate: cleanStr(item.dueDate, 32, new Date().toLocaleDateString('tr-TR')),
    amount: cleanNum(item.amount, 0),
    status: validStatuses.includes(item.status) ? item.status : 'Bekliyor',
    paidDate: item.paidDate ? cleanStr(item.paidDate, 32) : undefined,
    receiptNumber: item.receiptNumber ? cleanStr(item.receiptNumber, 32) : undefined,
    receiptDate: item.receiptDate ? cleanStr(item.receiptDate, 32) : undefined,
  });
}

function sanitizeAntrenmanPayload(item: AntrenmanItem, ownerId: string, docId: string) {
  const validStatuses = ['Planlandı', 'Devam Ediyor', 'Tamamlandı', 'İptal'];
  const validColors = ['blue', 'emerald', 'amber', 'purple', 'rose', 'indigo', 'sky'];
  const attendees = (Array.isArray(item.attendees) ? item.attendees : []).slice(0, 100).map((a) =>
    stripUndefined({
      id: cleanStr(a.id, 64, 'att-1'),
      name: cleanStr(a.name, 140, 'Sporcu'),
      phone: a.phone ? cleanStr(a.phone, 32) : undefined,
      present: typeof a.present === 'boolean' ? a.present : undefined,
    })
  );
  return stripUndefined({
    id: docId,
    ownerId,
    title: cleanStr(item.title, 180, 'Antrenman Seansı'),
    branch: cleanStr(item.branch, 80, 'Genel'),
    groupName: item.groupName ? cleanStr(item.groupName, 140) : undefined,
    sube: item.sube ? cleanStr(item.sube, 140) : undefined,
    date: cleanStr(item.date, 32, new Date().toISOString().split('T')[0]),
    startTime: cleanStr(item.startTime, 16, '17:00'),
    endTime: cleanStr(item.endTime, 16, '18:30'),
    trainerName: cleanStr(item.trainerName, 120, 'Antrenör'),
    facilityName: cleanStr(item.facilityName, 160, 'Ana Tesis'),
    capacity: cleanNum(item.capacity, 1, 500, 20),
    enrolledCount: cleanNum(item.enrolledCount, 0, 500, attendees.length),
    status: validStatuses.includes(item.status) ? item.status : 'Planlandı',
    color: validColors.includes(item.color) ? item.color : 'blue',
    notes: item.notes ? cleanStr(item.notes, 800) : undefined,
    attendees,
    googleCalendarEventId: item.googleCalendarEventId
      ? cleanStr(item.googleCalendarEventId, 160)
      : undefined,
    googleCalendarLink: item.googleCalendarLink
      ? cleanStr(item.googleCalendarLink, 500)
      : undefined,
  });
}

function sanitizeAnketPayload(item: AnketItem, ownerId: string, docId: string) {
  const validAudiences = ['Sporcu', 'Veli', 'Eğitmen', 'Genel'];
  const validStatuses = ['Aktif', 'Taslak', 'Tamamlandı'];
  const questions = (Array.isArray(item.questions) ? item.questions : []).slice(0, 30).map((q) =>
    stripUndefined({
      id: cleanStr(q.id, 64, 'q-1'),
      text: cleanStr(q.text, 500, 'Soru'),
      type: q.type === 'boolean' || q.type === 'text' ? q.type : 'rating',
      stats: q.stats ? q.stats : undefined,
    })
  );
  return stripUndefined({
    id: docId,
    ownerId,
    title: cleanStr(item.title, 200, 'Anket'),
    description: cleanStr(item.description, 800, ''),
    targetAudience: validAudiences.includes(item.targetAudience) ? item.targetAudience : 'Genel',
    status: validStatuses.includes(item.status) ? item.status : 'Aktif',
    responseCount: cleanNum(item.responseCount, 0),
    totalSent: cleanNum(item.totalSent, 0),
    createdDate: cleanStr(item.createdAt, 32, new Date().toISOString().split('T')[0]),
    dueDate: cleanStr(item.dueDate, 32, new Date().toISOString().split('T')[0]),
    questions,
  });
}

function mapDocToAnket(data: Record<string, unknown>): AnketItem {
  return {
    id: String(data.id || ''),
    title: String(data.title || ''),
    description: String(data.description || ''),
    targetAudience: (data.targetAudience as AnketItem['targetAudience']) || 'Genel',
    status: (data.status as AnketItem['status']) || 'Aktif',
    responseCount: Number(data.responseCount || 0),
    totalSent: Number(data.totalSent || 0),
    createdAt: String(data.createdDate || new Date().toISOString().split('T')[0]),
    dueDate: String(data.dueDate || new Date().toISOString().split('T')[0]),
    questions: Array.isArray(data.questions) ? (data.questions as AnketItem['questions']) : [],
  };
}

function sanitizeDestekPayload(item: SupportTicketFull, ownerId: string, docId: string) {
  const validCategories = ['teknik', 'muhasebe', 'paket', 'egitim-planlama', 'veli-karne', 'entegrasyon', 'oneri'];
  const validPriorities = ['Dusuk', 'Normal', 'Yuksek', 'Acil'];
  const validStatuses = ['Acik', 'Yanitlandi', 'MusteriYaniti', 'Beklemede', 'Cozuldu', 'Kapali'];
  const validContacts = ['panel', 'whatsapp', 'email', 'phone'];
  const messages = (Array.isArray(item.messages) ? item.messages : []).slice(0, 100).map((m) =>
    stripUndefined({
      id: cleanStr(m.id, 64, `msg-${Date.now()}`),
      ticketId: docId,
      senderType: m.senderType || 'club_admin',
      senderName: cleanStr(m.senderName, 160, 'Kullanıcı'),
      senderRole: cleanStr(m.senderRole, 100, 'Yönetici'),
      senderAvatar: sanitizeAvatarUrl(m.senderAvatar),
      message: cleanStr(m.message, 4000, ''),
      createdAt: cleanStr(m.createdAt, 64, ''),
      attachments: Array.isArray(m.attachments) ? m.attachments.slice(0, 10) : undefined,
    })
  );
  return stripUndefined({
    id: docId,
    ownerId,
    ticketNumber: cleanNum(item.ticketNumber, 0),
    subject: cleanStr(item.subject, 240, 'Destek Talebi'),
    category: validCategories.includes(item.category) ? item.category : 'teknik',
    priority: validPriorities.includes(item.priority) ? item.priority : 'Normal',
    status: validStatuses.includes(item.status) ? item.status : 'Acik',
    clubName: cleanStr(item.clubName, 160, 'SportsFly Kulübü'),
    clubPackage: cleanStr(item.clubPackage, 100, 'Pro Akademi & Çoklu Şube'),
    clubBranch: item.clubBranch ? cleanStr(item.clubBranch, 140) : undefined,
    creatorName: cleanStr(item.creatorName, 140, 'Kulüp Yöneticisi'),
    creatorEmail: cleanStr(item.creatorEmail, 160, ''),
    creatorPhone: cleanStr(item.creatorPhone, 32, ''),
    createdDateStr: cleanStr(item.createdAt, 64, ''),
    updatedDateStr: cleanStr(item.updatedAt, 64, ''),
    closedAt: item.closedAt ? cleanStr(item.closedAt, 64) : undefined,
    preferredContact: validContacts.includes(item.preferredContact) ? item.preferredContact : 'panel',
    messages,
    assignedAgent: item.assignedAgent
      ? stripUndefined({
          name: cleanStr(item.assignedAgent.name, 140, 'Destek Uzmanı'),
          title: cleanStr(item.assignedAgent.title, 140, 'Uzman'),
          avatar: sanitizeAvatarUrl(item.assignedAgent.avatar),
          status: item.assignedAgent.status || 'online',
        })
      : undefined,
    feedback: item.feedback ? item.feedback : undefined,
  });
}

function mapDocToDestek(data: Record<string, unknown>): SupportTicketFull {
  return {
    id: String(data.id || ''),
    ticketNumber: Number(data.ticketNumber || 1000),
    subject: String(data.subject || ''),
    category: (data.category as SupportTicketFull['category']) || 'teknik',
    priority: (data.priority as SupportTicketFull['priority']) || 'Normal',
    status: (data.status as SupportTicketFull['status']) || 'Acik',
    clubName: String(data.clubName || ''),
    clubPackage: (data.clubPackage as SupportTicketFull['clubPackage']) || 'Pro Akademi & Çoklu Şube',
    clubBranch: data.clubBranch ? String(data.clubBranch) : undefined,
    creatorName: String(data.creatorName || ''),
    creatorEmail: String(data.creatorEmail || ''),
    creatorPhone: String(data.creatorPhone || ''),
    createdAt: String(data.createdDateStr || ''),
    updatedAt: String(data.updatedDateStr || ''),
    closedAt: data.closedAt ? String(data.closedAt) : undefined,
    preferredContact: (data.preferredContact as SupportTicketFull['preferredContact']) || 'panel',
    messages: Array.isArray(data.messages) ? (data.messages as SupportTicketFull['messages']) : [],
    assignedAgent: data.assignedAgent as SupportTicketFull['assignedAgent'],
    feedback: data.feedback as SupportTicketFull['feedback'],
  };
}

function sanitizeOnKayitPayload(item: OnKayitItem, ownerId: string, docId: string) {
  const validStatuses = [
    'Ön Kayıt',
    'Görüşme Yapıldı',
    'Deneme Antrenmanı',
    'Sözleşme Bekleniyor',
    'Kayıt Oldu',
    'Kayıt Olmadı',
    'İptal',
  ];
  const extraFields = stripUndefined({
    bagliOnKayit: item.bagliOnKayit,
    boy: item.boy,
    kilo: item.kilo,
    veliMeslek: item.veliMeslek,
    veliEgitimDurumu: item.veliEgitimDurumu,
    saglikDurumu: item.saglikDurumu,
    alerjiDurumu: item.alerjiDurumu,
    kronikRahatsizlik: item.kronikRahatsizlik,
    davranissalOzelDurum: item.davranissalOzelDurum,
    duzenliKullanilanIlac: item.duzenliKullanilanIlac,
    referansVerenKisi: item.referansVerenKisi,
    ekAciklama: item.ekAciklama,
    gorusmeYapan: item.gorusmeYapan,
    gorusmeTuru: item.gorusmeTuru,
    gorusmeTarihi: item.gorusmeTarihi,
    gorusmeNotlari: item.gorusmeNotlari,
    ilgilenilenBrans: item.ilgilenilenBrans,
    tercihEdilenGunler: item.tercihEdilenGunler,
    tercihEdilenSaatler: item.tercihEdilenSaatler,
    beklenenSozlesmeTutari: item.beklenenSozlesmeTutari,
    sozlesmeOlasiligi: item.sozlesmeOlasiligi,
    gerceklesenSozlesmeTutari: item.gerceklesenSozlesmeTutari,
    sozlesmeTarihi: item.sozlesmeTarihi,
    odemeDurumu: item.odemeDurumu,
    odemeYontemi: item.odemeYontemi,
    indirimKampanya: item.indirimKampanya,
    kaybedilmeNedeni: item.kaybedilmeNedeni,
  });

  return stripUndefined({
    id: docId,
    ownerId,
    onKayitNo: cleanStr(item.onKayitNo, 64, `OK-${Date.now()}`),
    onKayitTarihi: cleanStr(item.onKayitTarihi, 32, new Date().toISOString().split('T')[0]),
    sube: cleanStr(item.sube, 140, 'Merkez Şube'),
    brans: cleanStr(item.brans, 80, 'Basketbol'),
    sporcuAdSoyad: cleanStr(item.sporcuAdSoyad, 140, 'Sporcu'),
    cinsiyet: item.cinsiyet === 'Kız' ? 'Kız' : 'Erkek',
    tcKimlikNo: item.tcKimlikNo ? cleanStr(item.tcKimlikNo, 20) : undefined,
    dogumTarihi: item.dogumTarihi ? cleanStr(item.dogumTarihi, 32) : undefined,
    telefon: item.telefon ? cleanStr(item.telefon, 32) : undefined,
    il: item.il ? cleanStr(item.il, 80) : undefined,
    ilce: item.ilce ? cleanStr(item.ilce, 80) : undefined,
    adres: item.adres ? cleanStr(item.adres, 300) : undefined,
    veliAdSoyad: cleanStr(item.veliAdSoyad, 140, ''),
    veliTelefon: cleanStr(item.veliTelefon, 32, ''),
    veliEposta: item.veliEposta ? cleanStr(item.veliEposta, 160) : undefined,
    acilDurumAranacakKisi: item.acilDurumAranacakKisi
      ? cleanStr(item.acilDurumAranacakKisi, 140)
      : undefined,
    acilDurumTelefonu: item.acilDurumTelefonu
      ? cleanStr(item.acilDurumTelefonu, 32)
      : undefined,
    ulasmaTuru: item.ulasmaTuru ? cleanStr(item.ulasmaTuru, 80) : undefined,
    kayitDurumu: validStatuses.includes(item.kayitDurumu) ? item.kayitDurumu : 'Ön Kayıt',
    kayitTarihi: item.kayitTarihi ? cleanStr(item.kayitTarihi, 32) : undefined,
    sonGuncellemeTarihi: item.sonGuncellemeTarihi
      ? cleanStr(item.sonGuncellemeTarihi, 32)
      : undefined,
    kayitOlusturanKullanici: item.kayitOlusturanKullanici
      ? cleanStr(item.kayitOlusturanKullanici, 120)
      : undefined,
    kvkkAydinlatmaOnay: Boolean(item.kvkkAydinlatmaOnay),
    acikRizaOnay: Boolean(item.acikRizaOnay),
    fotografVideoIzni: Boolean(item.fotografVideoIzni),
    iletisimKampanyaIzni: Boolean(item.iletisimKampanyaIzni),
    veliOnayi: Boolean(item.veliOnayi),
    extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
  });
}

function mapDocToOnKayit(data: Record<string, unknown>): OnKayitItem {
  const extra = (data.extraFields && typeof data.extraFields === 'object'
    ? data.extraFields
    : {}) as Partial<OnKayitItem>;
  return {
    ...extra,
    id: String(data.id || ''),
    onKayitNo: String(data.onKayitNo || ''),
    onKayitTarihi: String(data.onKayitTarihi || ''),
    sube: String(data.sube || ''),
    brans: String(data.brans || ''),
    sporcuAdSoyad: String(data.sporcuAdSoyad || ''),
    cinsiyet: data.cinsiyet === 'Kız' ? 'Kız' : 'Erkek',
    tcKimlikNo: String(data.tcKimlikNo || ''),
    dogumTarihi: String(data.dogumTarihi || ''),
    telefon: data.telefon ? String(data.telefon) : undefined,
    il: data.il ? String(data.il) : undefined,
    ilce: data.ilce ? String(data.ilce) : undefined,
    adres: String(data.adres || ''),
    veliAdSoyad: String(data.veliAdSoyad || ''),
    veliTelefon: String(data.veliTelefon || ''),
    veliEposta: String(data.veliEposta || ''),
    acilDurumAranacakKisi: String(data.acilDurumAranacakKisi || ''),
    acilDurumTelefonu: String(data.acilDurumTelefonu || ''),
    ulasmaTuru: (data.ulasmaTuru as OnKayitItem['ulasmaTuru']) || 'Diğer',
    kayitDurumu: (data.kayitDurumu as OnKayitItem['kayitDurumu']) || 'Ön Kayıt',
    kayitTarihi: String(data.kayitTarihi || ''),
    sonGuncellemeTarihi: String(data.sonGuncellemeTarihi || ''),
    kayitOlusturanKullanici: String(data.kayitOlusturanKullanici || 'Sistem Yöneticisi'),
    kvkkAydinlatmaOnay: Boolean(data.kvkkAydinlatmaOnay),
    acikRizaOnay: Boolean(data.acikRizaOnay),
    fotografVideoIzni: Boolean(data.fotografVideoIzni),
    iletisimKampanyaIzni: Boolean(data.iletisimKampanyaIzni),
    veliOnayi: Boolean(data.veliOnayi),
  };
}

function sanitizeSubePayload(item: Sube, ownerId: string, docId: string) {
  const validStatuses = ['Aktif', 'Pasif', 'Tadilatta'];
  return stripUndefined({
    id: docId,
    ownerId,
    ad: cleanStr(item.ad, 160, 'Şube'),
    kod: cleanStr(item.kod, 32, 'SB-01'),
    sehir: cleanStr(item.sehir, 80, 'İstanbul'),
    ilce: cleanStr(item.ilce, 80, 'Merkez'),
    adres: item.adres ? cleanStr(item.adres, 300) : undefined,
    telefon: item.telefon ? cleanStr(item.telefon, 32) : undefined,
    eposta: item.eposta ? cleanStr(item.eposta, 160) : undefined,
    sorumluYonetici: item.sorumluYonetici ? cleanStr(item.sorumluYonetici, 120) : undefined,
    sorumluAntrenor: item.sorumluAntrenor ? cleanStr(item.sorumluAntrenor, 120) : undefined,
    antrenorSayisi: cleanNum(item.antrenorSayisi, 0),
    sporcuSayisi: cleanNum(item.sporcuSayisi, 0),
    kapasite: cleanNum(item.kapasite, 0),
    branslar: (Array.isArray(item.branslar) ? item.branslar : []).slice(0, 20).map((b) => String(b).slice(0, 64)),
    tesisTipi: item.tesisTipi ? cleanStr(item.tesisTipi, 80) : undefined,
    durum: validStatuses.includes(item.durum) ? item.durum : 'Aktif',
    acilisTarihi: item.acilisTarihi ? cleanStr(item.acilisTarihi, 32) : undefined,
    aylikCiro: typeof item.aylikCiro === 'number' ? cleanNum(item.aylikCiro, 0) : undefined,
    ozellikler: (Array.isArray(item.ozellikler) ? item.ozellikler : []).slice(0, 20).map((o) => String(o).slice(0, 64)),
  });
}

function sanitizeSporPuanLogPayload(item: SporPuanLogItem, ownerId: string, docId: string) {
  return stripUndefined({
    id: docId,
    ownerId,
    sporcuId: cleanStr(item.sporcuId, 128, 's-1'),
    sporcuName: item.sporcuName ? cleanStr(item.sporcuName, 140) : undefined,
    ruleId: item.ruleId ? cleanStr(item.ruleId, 64) : undefined,
    category: cleanStr(item.category, 64, 'Genel'),
    ruleName: cleanStr(item.ruleName, 160, 'SporPuan Ödülü'),
    points: cleanNum(item.points, 0, 10000),
    date: cleanStr(item.date, 32, 'Bugün'),
    source: item.source === 'Otomatik' ? 'Otomatik' : 'Koç Onayı',
    note: item.note ? cleanStr(item.note, 500) : undefined,
  });
}

function sanitizeReminderLogPayload(item: ReminderLogItem, ownerId: string, docId: string) {
  const validAudiences = ['parent', 'trainer', 'both'];
  const validStatuses = ['sent', 'pending', 'failed'];
  return stripUndefined({
    id: docId,
    ownerId,
    timestamp: cleanStr(item.timestamp, 64, 'Bugün'),
    groupName: cleanStr(item.groupName, 160, 'Grup'),
    trainingDate: cleanStr(item.trainingDate, 32, new Date().toISOString().split('T')[0]),
    targetAudience: validAudiences.includes(item.targetAudience) ? item.targetAudience : 'parent',
    totalRecipientCount: cleanNum(item.totalRecipientCount, 0),
    channels: (Array.isArray(item.channels) ? item.channels : []).slice(0, 10).map((c) => String(c).slice(0, 40)),
    messagePreview: cleanStr(item.messagePreview, 800, ''),
    status: validStatuses.includes(item.status) ? item.status : 'sent',
    triggeredBy: cleanStr(item.triggeredBy, 160, 'Sistem'),
    recipientsSummary: (Array.isArray(item.recipientsSummary) ? item.recipientsSummary : [])
      .slice(0, 100)
      .map((r) => String(r).slice(0, 160)),
  });
}

function sanitizeClubSettingPayload(item: ClubSettingDoc, ownerId: string, docId: string) {
  return stripUndefined({
    id: docId,
    ownerId,
    settingKey: cleanStr(item.settingKey, 80, docId),
    config: item.config || undefined,
    rulesList: Array.isArray(item.rulesList) ? item.rulesList.slice(0, 50) : undefined,
    activeValue: item.activeValue ? cleanStr(item.activeValue, 128) : undefined,
  });
}

function sanitizeEgitimPlaniPayload(item: TrainingPlan, ownerId: string, docId: string) {
  const sections = (Array.isArray(item.drills) ? item.drills : []).slice(0, 20).map((d) =>
    stripUndefined({
      id: cleanStr(d.id, 64, 'drill-1'),
      title: cleanStr(d.title, 180, 'Dril'),
      phase: cleanStr(d.phase, 80, 'Temel Teknik (Dril 1)'),
      durationMinutes: cleanNum(d.durationMinutes, 1, 180, 15),
      intensity: cleanStr(d.intensity, 32, 'Orta'),
      playerCount: cleanStr(d.playerCount, 64, '12 Sporcu'),
      spaceRequired: cleanStr(d.spaceRequired, 80, 'Tam Saha'),
      equipment: Array.isArray(d.equipment) ? d.equipment.slice(0, 15) : [],
      objective: cleanStr(d.objective, 500, ''),
      instructions: Array.isArray(d.instructions) ? d.instructions.slice(0, 15) : [],
      coachingPoints: Array.isArray(d.coachingPoints) ? d.coachingPoints.slice(0, 15) : [],
    })
  );
  return stripUndefined({
    id: docId,
    ownerId,
    code: cleanStr(item.code, 64, `PLN-${Date.now()}`),
    title: cleanStr(item.title, 200, 'Antrenman Planı'),
    branch: cleanStr(item.branch, 80, 'Futbol'),
    ageCategory: cleanStr(item.ageCategory, 64, 'U12-U14'),
    difficulty: cleanStr(item.difficulty, 64, 'Orta'),
    durationMinutes: cleanNum(item.totalDurationMinutes, 5, 360, 60),
    summary: cleanStr(item.summary, 1000, ''),
    focusTags: (Array.isArray(item.focusTags) ? item.focusTags : ['Teknik']).slice(0, 20).map((t) => String(t).slice(0, 64)),
    objectives: Array.isArray(item.learningOutcomes)
      ? item.learningOutcomes.slice(0, 20).map((o) => String(o).slice(0, 300))
      : undefined,
    equipment: Array.isArray(item.equipmentList)
      ? item.equipmentList.slice(0, 30).map((e) => String(e).slice(0, 100))
      : undefined,
    sections: sections.length > 0 ? sections : undefined,
    coachNotes: item.coachTips ? cleanStr(item.coachTips, 1000) : undefined,
    isCustom: Boolean(item.isCustom),
    assignedGroups: Array.isArray(item.assignedGroups)
      ? item.assignedGroups.slice(0, 30).map((g) => String(g).slice(0, 120))
      : undefined,
  });
}

function mapDocToEgitimPlani(data: Record<string, unknown>): TrainingPlan {
  const id = String(data.id || '');
  const baseTemplate = TEMPLATE_TRAINING_PLANS.find((t) => t.id === id);
  const branch = (data.branch as TrainingPlan['branch']) || baseTemplate?.branch || 'Futbol';
  const ageCategory = (data.ageCategory as TrainingPlan['ageCategory']) || baseTemplate?.ageCategory || 'U12-U14';
  const rawSections = Array.isArray(data.sections) ? (data.sections as TrainingPlan['drills']) : [];

  return {
    id,
    code: String(data.code || baseTemplate?.code || id),
    title: String(data.title || baseTemplate?.title || 'Antrenman Planı'),
    branch,
    ageCategory,
    ageGroupTitle: baseTemplate?.ageGroupTitle || `${branch} • ${ageCategory} Gelişim Grubu`,
    periodWeek: baseTemplate?.periodWeek || 1,
    sessionNumber: baseTemplate?.sessionNumber || 1,
    difficulty: (data.difficulty as TrainingPlan['difficulty']) || baseTemplate?.difficulty || 'Orta',
    totalDurationMinutes: Number(data.durationMinutes || baseTemplate?.totalDurationMinutes || 60),
    seasonPhase: baseTemplate?.seasonPhase || 'Temel Gelişim Dönemi',
    focusTags: Array.isArray(data.focusTags) ? (data.focusTags as string[]) : baseTemplate?.focusTags || [],
    summary: String(data.summary || baseTemplate?.summary || ''),
    learningOutcomes: Array.isArray(data.objectives)
      ? (data.objectives as string[])
      : baseTemplate?.learningOutcomes || [],
    drills:
      rawSections.length > 0
        ? rawSections.map((sec, idx) => ({
            ...sec,
            tacticalData: baseTemplate?.drills?.[idx]?.tacticalData || sec.tacticalData,
          }))
        : baseTemplate?.drills || [],
    equipmentList: Array.isArray(data.equipment)
      ? (data.equipment as string[])
      : baseTemplate?.equipmentList || [],
    coachTips: String(data.coachNotes || baseTemplate?.coachTips || ''),
    assignedGroups: Array.isArray(data.assignedGroups) ? (data.assignedGroups as string[]) : [],
    isCustom: typeof data.isCustom === 'boolean' ? data.isCustom : Boolean(baseTemplate?.isCustom),
    authorName: baseTemplate?.authorName || 'SportsFly Akademi',
    rating: baseTemplate?.rating || 4.8,
    downloadCount: baseTemplate?.downloadCount || 0,
  };
}

function sanitizeYoneticiPayload(item: YoneticiItem, ownerId: string, docId: string) {
  return stripUndefined({
    id: docId,
    ownerId,
    name: cleanStr(item.name, 140, 'Yönetici'),
    email: cleanStr(item.email, 160, ''),
    code: cleanStr(item.code, 32, '000000'),
    createdDate: cleanStr(item.createdAt, 32, new Date().toLocaleDateString('tr-TR')),
    phone: cleanStr(item.phone, 32, ''),
    role: cleanStr(item.role, 80, 'Kulüp Yöneticisi'),
    schoolName: cleanStr(item.schoolName, 160, 'SportsFly Kulübü'),
    accessibility: item.accessibility === 'Erişilemez' ? 'Erişilemez' : 'Erişilebilir',
    packageType: item.packageType ? cleanStr(item.packageType, 80) : undefined,
    avatarUrl: sanitizeAvatarUrl(item.avatarUrl),
    authProvider: item.authProvider === 'email' || item.authProvider === 'google' ? item.authProvider : undefined,
    activeStudents: typeof item.activeStudents === 'number' ? cleanNum(item.activeStudents, 0) : undefined,
    activeTrainers: typeof item.activeTrainers === 'number' ? cleanNum(item.activeTrainers, 0) : undefined,
    branches: Array.isArray(item.branches) ? item.branches.slice(0, 20).map((b) => String(b).slice(0, 64)) : undefined,
    lastLogin: item.lastLogin ? cleanStr(item.lastLogin, 64) : undefined,
  });
}

function mapDocToYonetici(data: Record<string, unknown>): YoneticiItem {
  return {
    id: String(data.id || ''),
    name: String(data.name || ''),
    email: String(data.email || ''),
    code: String(data.code || ''),
    createdAt: String(data.createdDate || ''),
    phone: String(data.phone || ''),
    role: String(data.role || ''),
    schoolName: String(data.schoolName || ''),
    accessibility: data.accessibility === 'Erişilemez' ? 'Erişilemez' : 'Erişilebilir',
    packageType: data.packageType as YoneticiItem['packageType'],
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
    authProvider: data.authProvider as YoneticiItem['authProvider'],
    activeStudents: typeof data.activeStudents === 'number' ? data.activeStudents : undefined,
    activeTrainers: typeof data.activeTrainers === 'number' ? data.activeTrainers : undefined,
    branches: Array.isArray(data.branches) ? (data.branches as string[]) : undefined,
    lastLogin: data.lastLogin ? String(data.lastLogin) : undefined,
  };
}

function sanitizeKulupSozlesmesiPayload(item: KulupSozlesmesi, ownerId: string, docId: string) {
  const validStatuses = ['Onaylandı', 'İmza Bekliyor', 'İnceleniyor'];
  return stripUndefined({
    id: docId,
    ownerId,
    sozlesmeNo: cleanStr(item.sozlesmeNo, 64, `KS-${Date.now()}`),
    yonetici: cleanStr(item.yonetici, 140, ''),
    firmaTip: cleanStr(item.firmaTip, 80, 'Spor Kulübü'),
    tcKimlik: cleanStr(item.tcKimlik, 20, ''),
    dogumTarihi: cleanStr(item.dogumTarihi, 32, ''),
    il: cleanStr(item.il, 80, ''),
    ilce: cleanStr(item.ilce, 80, ''),
    eposta: item.eposta ? cleanStr(item.eposta, 160) : undefined,
    vergiDairesi: cleanStr(item.vergiDairesi, 120, ''),
    ibanUnvan: cleanStr(item.ibanUnvan, 200, ''),
    adSoyad: cleanStr(item.adSoyad, 140, ''),
    firmaUnvani: cleanStr(item.firmaUnvani, 200, ''),
    telefon: cleanStr(item.telefon, 32, ''),
    website: item.website ? cleanStr(item.website, 200) : undefined,
    iban: cleanStr(item.iban, 64, ''),
    status: validStatuses.includes(item.status) ? item.status : 'İnceleniyor',
    createdDate: cleanStr(item.createdAt, 32, new Date().toLocaleDateString('tr-TR')),
  });
}

function mapDocToKulupSozlesmesi(data: Record<string, unknown>): KulupSozlesmesi {
  return {
    id: String(data.id || ''),
    sozlesmeNo: String(data.sozlesmeNo || ''),
    yonetici: String(data.yonetici || ''),
    firmaTip: String(data.firmaTip || ''),
    tcKimlik: String(data.tcKimlik || ''),
    dogumTarihi: String(data.dogumTarihi || ''),
    il: String(data.il || ''),
    ilce: String(data.ilce || ''),
    eposta: data.eposta ? String(data.eposta) : undefined,
    vergiDairesi: String(data.vergiDairesi || ''),
    ibanUnvan: String(data.ibanUnvan || ''),
    adSoyad: String(data.adSoyad || ''),
    firmaUnvani: String(data.firmaUnvani || ''),
    telefon: String(data.telefon || ''),
    website: data.website ? String(data.website) : undefined,
    iban: String(data.iban || ''),
    status: (data.status as KulupSozlesmesi['status']) || 'İnceleniyor',
    createdAt: String(data.createdDate || ''),
  };
}

function sanitizeSporcuSozlesmesiPayload(item: AthleteContractDoc, ownerId: string, docId: string) {
  return stripUndefined({
    id: docId,
    ownerId,
    athleteName: cleanStr(item.athleteName, 140, ''),
    parentName: cleanStr(item.parentName, 140, ''),
    birthDate: item.birthDate ? cleanStr(item.birthDate, 32) : undefined,
    tcNo: item.tcNo ? cleanStr(item.tcNo, 20) : undefined,
    phone: item.phone ? cleanStr(item.phone, 32) : undefined,
    email: item.email ? cleanStr(item.email, 160) : undefined,
    branch: cleanStr(item.branch, 80, ''),
    sube: cleanStr(item.sube, 140, ''),
    signedAt: item.signedAt ? cleanStr(item.signedAt, 64) : undefined,
    ipAddress: item.ipAddress ? cleanStr(item.ipAddress, 64) : undefined,
    status: item.status === 'Onaylandı' ? 'Onaylandı' : 'Bekliyor',
    signature: item.signature ? cleanStr(item.signature, 200) : undefined,
    kvkkApproved: Boolean(item.kvkkApproved),
    taahhutnameApproved: Boolean(item.taahhutnameApproved),
    photoVideoApproved: Boolean(item.photoVideoApproved),
    hash: item.hash ? cleanStr(item.hash, 160) : undefined,
  });
}

// ============================================================================
// GENERIC CRUD FACTORY FOR OPERATIONAL COLLECTIONS
// ============================================================================

function createCollectionService<TUI extends { id: string }>(options: {
  collectionName: string;
  sanitize: (item: TUI, ownerId: string, docId: string) => Record<string, unknown>;
  fromDoc?: (data: Record<string, unknown>) => TUI;
  immutableUpdateKeys?: string[];
}) {
  const { collectionName, sanitize, fromDoc, immutableUpdateKeys = [] } = options;

  const toUI = (snapData: DocumentData, snapId: string): TUI => {
    const merged = { ...snapData, id: snapId };
    return fromDoc ? fromDoc(merged) : (merged as TUI);
  };

  return {
    async getAll(extraConstraints: QueryConstraint[] = []): Promise<TUI[]> {
      if (!auth.currentUser) return [];
      try {
        const q = createTenantQuery(collectionName, extraConstraints);
        const snap = await getDocs(q);
        return snap.docs.map((d) => toUI(d.data(), d.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      }
    },

    async getById(id: string): Promise<TUI | null> {
      const validId = ensureValidDocumentId(id);
      const path = `${collectionName}/${validId}`;
      try {
        const snap = await getDoc(doc(db, collectionName, validId));
        if (!snap.exists()) return null;
        return toUI(snap.data(), snap.id);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    },

    async upsert(item: TUI): Promise<TUI> {
      const ownerId = getAuthenticatedOwnerId();
      const docId = ensureValidDocumentId(item.id || doc(collection(db, collectionName)).id);
      const path = `${collectionName}/${docId}`;
      const ref = doc(db, collectionName, docId);

      try {
        const existingSnap = await getDoc(ref);
        if (!existingSnap.exists()) {
          const payload = {
            ...sanitize(item, ownerId, docId),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(ref, payload);
        } else {
          const existingOwner = existingSnap.data()?.ownerId || ownerId;
          const sanitized = sanitize(item, existingOwner, docId);
          delete sanitized.id;
          delete sanitized.ownerId;
          delete sanitized.createdAt;
          immutableUpdateKeys.forEach((k) => delete sanitized[k]);
          await updateDoc(ref, {
            ...sanitized,
            updatedAt: serverTimestamp(),
          } as DocumentData);
        }
        return { ...item, id: docId };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    },

    async updatePartial(id: string, fullNextItem: TUI): Promise<void> {
      const validId = ensureValidDocumentId(id);
      const path = `${collectionName}/${validId}`;
      const ownerId = getAuthenticatedOwnerId();
      const ref = doc(db, collectionName, validId);
      try {
        const existingSnap = await getDoc(ref);
        if (!existingSnap.exists()) {
          const payload = {
            ...sanitize(fullNextItem, ownerId, validId),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(ref, payload);
          return;
        }
        const existingOwner = existingSnap.data()?.ownerId || ownerId;
        const sanitized = sanitize(fullNextItem, existingOwner, validId);
        delete sanitized.id;
        delete sanitized.ownerId;
        delete sanitized.createdAt;
        immutableUpdateKeys.forEach((k) => delete sanitized[k]);
        await updateDoc(ref, {
          ...sanitized,
          updatedAt: serverTimestamp(),
        } as DocumentData);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },

    async delete(id: string): Promise<void> {
      const validId = ensureValidDocumentId(id);
      const path = `${collectionName}/${validId}`;
      try {
        await deleteDoc(doc(db, collectionName, validId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },

    subscribe(
      onData: (items: TUI[]) => void,
      extraConstraints: QueryConstraint[] = [],
      onErrorCallback?: (error: unknown) => void
    ): Unsubscribe {
      let disposed = false;
      let snapshotUnsub: Unsubscribe | null = null;

      const authUnsub = onAuthStateChanged(auth, (currentUser) => {
        if (snapshotUnsub) {
          snapshotUnsub();
          snapshotUnsub = null;
        }
        if (disposed || !currentUser) return;

        const q = createTenantQuery(collectionName, extraConstraints);
        snapshotUnsub = onSnapshot(
          q,
          (snapshot) => {
            onData(snapshot.docs.map((d) => toUI(d.data(), d.id)));
          },
          (error) => {
            if (onErrorCallback) onErrorCallback(error);
            handleFirestoreError(error, OperationType.LIST, collectionName);
          }
        );
      });

      return () => {
        disposed = true;
        authUnsub();
        if (snapshotUnsub) {
          snapshotUnsub();
          snapshotUnsub = null;
        }
      };
    },

    async seedIfEmpty(initialItems: TUI[]): Promise<boolean> {
      if (!auth.currentUser || initialItems.length === 0) return false;
      try {
        const existingSnap = await getDocs(createTenantQuery(collectionName));
        if (!existingSnap.empty) {
          return false;
        }
        const ownerId = getAuthenticatedOwnerId();
        const superAdmin = isSuperAdminSession();
        const uidPrefix = `u_${ensureValidDocumentId(ownerId).slice(0, 12)}_`;
        const batch = writeBatch(db);
        initialItems.forEach((item) => {
          const baseId = item.id || doc(collection(db, collectionName)).id;
          const alreadyScoped = baseId.includes(ownerId);
          const rawId = superAdmin || alreadyScoped ? baseId : `${uidPrefix}${baseId}`;
          const docId = ensureValidDocumentId(rawId);
          const payload = {
            ...sanitize(item, ownerId, docId),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          batch.set(doc(db, collectionName, docId), payload);
        });
        await batch.commit();
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${collectionName}/seedIfEmpty`);
      }
    },
  };
}

// ============================================================================
// EXPORTED SERVICES FOR ALL 16 OPERATIONAL COLLECTIONS
// ============================================================================

export const yoklamalarService = createCollectionService<YoklamaKaydiDoc>({
  collectionName: 'yoklamalar',
  sanitize: sanitizeYoklamaPayload,
});

export const muhasebeHareketlerService = createCollectionService<GelirGiderItem>({
  collectionName: 'muhasebe_hareketler',
  sanitize: sanitizeMuhasebeHareketPayload,
});

export const muhasebeKategorilerService = createCollectionService<GelirGiderKategoriItem>({
  collectionName: 'muhasebe_kategoriler',
  sanitize: sanitizeMuhasebeKategoriPayload,
});

export const odemePlanlariService = createCollectionService<OdemePlaniItem>({
  collectionName: 'odeme_planlari',
  sanitize: sanitizeOdemePlaniPayload,
});

export const antrenmanlarService = createCollectionService<AntrenmanItem>({
  collectionName: 'antrenmanlar',
  sanitize: sanitizeAntrenmanPayload,
});

export const anketlerService = createCollectionService<AnketItem>({
  collectionName: 'anketler',
  sanitize: sanitizeAnketPayload,
  fromDoc: mapDocToAnket,
});

export const destekTalepleriService = createCollectionService<SupportTicketFull>({
  collectionName: 'destek_talepleri',
  sanitize: sanitizeDestekPayload,
  fromDoc: mapDocToDestek,
  immutableUpdateKeys: [
    'ticketNumber',
    'clubName',
    'clubPackage',
    'creatorName',
    'creatorEmail',
    'creatorPhone',
    'createdDateStr',
  ],
});

export const onKayitlarService = createCollectionService<OnKayitItem>({
  collectionName: 'on_kayitlar',
  sanitize: sanitizeOnKayitPayload,
  fromDoc: mapDocToOnKayit,
});

export const subelerService = createCollectionService<Sube>({
  collectionName: 'subeler',
  sanitize: sanitizeSubePayload,
});

export const sporpuanLogsService = createCollectionService<SporPuanLogItem>({
  collectionName: 'sporpuan_logs',
  sanitize: sanitizeSporPuanLogPayload,
});

export const yoklamaHatirlaticiLogsService = createCollectionService<ReminderLogItem>({
  collectionName: 'yoklama_hatirlatici_logs',
  sanitize: sanitizeReminderLogPayload,
  immutableUpdateKeys: [
    'timestamp',
    'groupName',
    'trainingDate',
    'targetAudience',
    'totalRecipientCount',
    'channels',
    'messagePreview',
    'triggeredBy',
    'recipientsSummary',
  ],
});

export const clubSettingsService = createCollectionService<ClubSettingDoc>({
  collectionName: 'club_settings',
  sanitize: sanitizeClubSettingPayload,
});

export const egitimPlanlariService = createCollectionService<TrainingPlan>({
  collectionName: 'egitim_planlari',
  sanitize: sanitizeEgitimPlaniPayload,
  fromDoc: mapDocToEgitimPlani,
});

export const yoneticilerService = createCollectionService<YoneticiItem>({
  collectionName: 'yoneticiler',
  sanitize: sanitizeYoneticiPayload,
  fromDoc: mapDocToYonetici,
});

export const kulupSozlesmeleriService = createCollectionService<KulupSozlesmesi>({
  collectionName: 'kulup_sozlesmeleri',
  sanitize: sanitizeKulupSozlesmesiPayload,
  fromDoc: mapDocToKulupSozlesmesi,
});

export const sporcuSozlesmeleriService = createCollectionService<AthleteContractDoc>({
  collectionName: 'sporcu_sozlesmeleri',
  sanitize: sanitizeSporcuSozlesmesiPayload,
});

// ============================================================================
// CONVENIENCE HELPERS FOR CLUB SETTINGS & INITIAL SEEDING
// ============================================================================

export async function saveYoklamaConfigToFirestore(config: AutomationRuleConfig): Promise<void> {
  if (!auth.currentUser) return;
  const uid = ensureValidDocumentId(auth.currentUser.uid);
  await clubSettingsService.upsert({
    id: `yoklama_automation_config_${uid}`.slice(0, 128),
    settingKey: 'yoklama_automation_config',
    config: config as unknown as Record<string, unknown>,
  });
}

export async function saveActiveSubeSettingToFirestore(subeId: string): Promise<void> {
  if (!auth.currentUser) return;
  const uid = ensureValidDocumentId(auth.currentUser.uid);
  await clubSettingsService.upsert({
    id: `active_sube_id_${uid}`.slice(0, 128),
    settingKey: 'active_sube_id',
    activeValue: cleanStr(subeId, 128, 'all'),
  });
}

export async function saveSporpuanRulesToFirestore(rulesList: Record<string, unknown>[]): Promise<void> {
  if (!auth.currentUser) return;
  const uid = ensureValidDocumentId(auth.currentUser.uid);
  await clubSettingsService.upsert({
    id: `sporpuan_rules_${uid}`.slice(0, 128),
    settingKey: 'sporpuan_rules',
    rulesList,
  });
}

let operationalSeedInFlight: Promise<void> | null = null;

export async function seedAllOperationalCollectionsIfEmpty(): Promise<void> {
  if (!auth.currentUser) return;
  if (operationalSeedInFlight) {
    return operationalSeedInFlight;
  }
  const uid = ensureValidDocumentId(auth.currentUser.uid);

  const tasks: Promise<unknown>[] = [
    muhasebeKategorilerService.seedIfEmpty(INITIAL_KATEGORILER),
    muhasebeHareketlerService.seedIfEmpty(INITIAL_GELIR_GIDER),
    odemePlanlariService.seedIfEmpty(INITIAL_ODEME_PLANI),
    anketlerService.seedIfEmpty(INITIAL_ANKETLER),
    destekTalepleriService.seedIfEmpty(INITIAL_SUPPORT_TICKETS_FULL),
    subelerService.seedIfEmpty(INITIAL_SUBELER),
    onKayitlarService.seedIfEmpty(INITIAL_ON_KAYITLAR),
    antrenmanlarService.seedIfEmpty(INITIAL_ANTRENMANLAR),
    yoneticilerService.seedIfEmpty(INITIAL_YONETICILER),
    egitimPlanlariService.seedIfEmpty(TEMPLATE_TRAINING_PLANS.slice(0, 12)),
    clubSettingsService.seedIfEmpty([
      {
        id: `yoklama_automation_config_${uid}`.slice(0, 128),
        settingKey: 'yoklama_automation_config',
        config: DEFAULT_AUTOMATION_CONFIG as unknown as Record<string, unknown>,
      },
      {
        id: `active_sube_id_${uid}`.slice(0, 128),
        settingKey: 'active_sube_id',
        activeValue: 'all',
      },
    ]),
  ];

  operationalSeedInFlight = Promise.allSettled(tasks)
    .then(() => undefined)
    .finally(() => {
      operationalSeedInFlight = null;
    });

  return operationalSeedInFlight;
}
