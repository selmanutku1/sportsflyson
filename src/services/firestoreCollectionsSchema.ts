import {
  Timestamp,
  serverTimestamp,
  FieldValue,
} from 'firebase/firestore';
import { SporcuItem, EgitmenItem, GrupItem, GrupMember } from '../types';

/**
 * 1. /sporcular/{sporcuId} Koleksiyonu Doküman Şeması
 * Çapraz Referanslar:
 * - groupId   -> /gruplar/{groupId}
 * - trainerId -> /egitmenler/{trainerId}
 */
export interface FirestoreSporcuDoc {
  id: string;                 // Örn: "s-1"
  ownerId: string;            // Kulüp yöneticisi UID (Multi-tenant izolasyon)
  code: string;               // Örn: "422162" (6 haneli sporcu kodu)
  name: string;               // Örn: "Selman Utku"
  email: string;              // Örn: "selmanutkumarmara@gmail.com"
  phone?: string;             // Örn: "+90 538 597 92 22"
  birthDate?: string;         // Örn: "12.04.2011"
  facility: string;           // Örn: "DigiMondi"
  branch: string;             // Örn: "Basketbol"
  groupId: string;            // ÇAPRAZ REFERANS: /gruplar/{groupId} (Örn: "grp-1")
  teamGroup?: string;         // Denormalize grup adı (Örn: "Anadolu Efes Altyapı Hazırlık")
  trainerId: string;          // ÇAPRAZ REFERANS: /egitmenler/{trainerId} (Örn: "e-2")
  trainerName?: string;       // Denormalize eğitmen adı (Örn: "Berkan Saraç")
  isActive: boolean;          // Aktif / Pasif durumu
  avatarUrl?: string;         // Profil fotoğrafı URL
  registrationDate: string;   // Örn: "04.09.2023"
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * 2. /egitmenler/{egitmenId} Koleksiyonu Doküman Şeması
 * Çapraz Referanslar:
 * - assignedGroupIds -> /gruplar/{grupId}[] (Sorumlu olduğu grupların ID listesi, maks 20)
 */
export interface FirestoreEgitmenDoc {
  id: string;                 // Örn: "e-2"
  ownerId: string;            // Kulüp yöneticisi UID
  code: string;               // Örn: "016165"
  name: string;               // Örn: "Berkan Saraç"
  email: string;              // Örn: "berkansarac@gmail.com"
  phone: string;              // Örn: "+90 538 597 92 22"
  facility: string;           // Örn: "Saraçgym"
  branch: string;             // Örn: "Basketbol"
  assignedGroupIds: string[]; // ÇAPRAZ REFERANS: Sorumlu olduğu grup ID'leri (Örn: ["grp-1", "grp-6"])
  assignedGroups?: string[];  // Denormalize grup adları (Örn: ["Anadolu Efes Altyapı Hazırlık"])
  title?: string;             // Örn: "TBF 2. Kademe Başantrenör"
  licenseLevel?: string;      // Örn: "TBF 2. Kademe Kıdemli Antrenör"
  status: 'Aktif' | 'İzinli' | 'Ayrıldı';
  experienceYears?: number;   // Örn: 6
  rating?: number;            // Örn: 4.8
  activeGroupsCount?: number; // Örn: 2
  activeAthletesCount?: number; // Örn: 30
  weeklyHours?: number;       // Örn: 18
  hourlyRate?: number;        // Örn: 700
  monthlySalary?: number;     // Örn: 34000
  city?: string;              // Örn: "İstanbul"
  avatarUrl?: string;
  bio?: string;
  gender?: string;
  address?: string;
  accountDuration?: string;
  mailEnabled?: boolean;
  smsEnabled?: boolean;
  specialties?: string[];
  joinDate?: string;
  reviewCount?: number;
  documents?: {
    id: string;
    name: string;
    type: string;
    date: string;
    size: string;
  }[];
  appointments?: {
    id: string;
    title: string;
    date: string;
    time: string;
    student: string;
    status: string;
  }[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * 3. /gruplar/{grupId} Koleksiyonu Doküman Şeması
 * Çapraz Referanslar:
 * - instructorId      -> /egitmenler/{instructorId} (Grubun sorumlu eğitmen ID'si)
 * - primaryAthleteIds -> /sporcular/{sporcuId}[] (Gruptaki sporcuların hızlı erişim ID listesi, maks 50)
 * - Detaylı üye kayıtları -> /gruplar/{grupId}/uyeler/{uyeId} alt koleksiyonu
 */
export interface FirestoreGrupDoc {
  id: string;                 // Örn: "grp-1"
  ownerId: string;            // Kulüp yöneticisi UID
  name: string;               // Örn: "Anadolu Efes Altyapı Hazırlık"
  instructorId: string;       // ÇAPRAZ REFERANS: /egitmenler/{instructorId} (Örn: "e-2")
  instructorName: string;     // Denormalize eğitmen adı (Örn: "Berkan Saraç")
  primaryAthleteIds?: string[]; // ÇAPRAZ REFERANS: /sporcular/{sporcuId}[] (Örn: ["s-1", "s-3"])
  facility: string;           // Örn: "SportsFly Ana Yerleşke"
  branch: string;             // Örn: "Basketbol"
  category?: string;          // Örn: "Altyapı Takımı"
  ageGroup?: string;          // Örn: "U14 (2010-2011)"
  memberCount: number;        // Örn: 7
  maxCapacity: number;        // Örn: 15
  monthlyFee: number;         // Örn: 3500
  status: 'Aktif' | 'Dolu' | 'Askıda';
  scheduleDays?: string[];    // En fazla 7 elemanlı dizi: ["Pazartesi", "Çarşamba", "Cuma"]
  scheduleTime?: string;      // Örn: "17:30 - 19:00"
  scheduleLocation?: string;  // Örn: "Kapalı Basketbol Sahası A"
  description?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * 4. /gruplar/{grupId}/uyeler/{uyeId} Alt Koleksiyonu Doküman Şeması
 * Çapraz Referanslar:
 * - grupId       -> /gruplar/{grupId}
 * - sporcuId     -> /sporcular/{sporcuId}
 * - instructorId -> /egitmenler/{instructorId}
 */
export interface FirestoreGrupUyesiDoc {
  id: string;                 // Örn: "m-1"
  grupId: string;             // ÇAPRAZ REFERANS: Üst grup ID'si (Örn: "grp-1")
  sporcuId: string;           // ÇAPRAZ REFERANS: /sporcular/{sporcuId} (Örn: "s-3")
  instructorId: string;       // ÇAPRAZ REFERANS: /egitmenler/{instructorId} (Örn: "e-2")
  ownerId: string;            // Kulüp yöneticisi UID
  name: string;               // Örn: "Kaan Yıldırım"
  code: string;               // Örn: "108392"
  phone?: string;             // Örn: "+90 532 101 20 30"
  birthYear?: number;         // Örn: 2010
  parentName?: string;        // Örn: "Ahmet Yıldırım"
  parentPhone?: string;       // Örn: "+90 532 111 22 33"
  attendanceRate?: number;    // Örn: 94
  licenseNumber?: string;     // Örn: "TBF-34-10839"
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * ÇAPRAZ REFERANSLI ÖRNEK DOKÜMANLAR (Referans ve Seed İşlemleri İçin)
 */
export const SAMPLE_SPORCU_DOC = {
  id: 's-1',
  ownerId: 'club_admin_uid_01',
  code: '422162',
  name: 'Selman Utku',
  email: 'selmanutkumarmara@gmail.com',
  phone: '+90 538 597 92 22',
  birthDate: '12.04.2011',
  facility: 'DigiMondi',
  branch: 'Basketbol',
  groupId: 'grp-1',
  teamGroup: 'Anadolu Efes Altyapı Hazırlık',
  trainerId: 'e-2',
  trainerName: 'Berkan Saraç',
  isActive: true,
  avatarUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
  registrationDate: '04.09.2023',
};

export const SAMPLE_EGITMEN_DOC = {
  id: 'e-2',
  ownerId: 'club_admin_uid_01',
  code: '016165',
  name: 'Berkan Saraç',
  email: 'berkansarac@gmail.com',
  phone: '+90 538 597 92 22',
  facility: 'Saraçgym',
  branch: 'Basketbol',
  assignedGroupIds: ['grp-1', 'grp-5'],
  assignedGroups: ['Anadolu Efes Altyapı Hazırlık', 'Küçük Erkekler Basketbol'],
  title: 'TBF 2. Kademe Başantrenör',
  licenseLevel: 'TBF 2. Kademe Kıdemli Antrenör',
  status: 'Aktif' as const,
  experienceYears: 6,
  rating: 4.8,
  activeGroupsCount: 2,
  activeAthletesCount: 30,
  weeklyHours: 18,
  hourlyRate: 700,
  monthlySalary: 34000,
  city: 'İstanbul',
};

export const SAMPLE_GRUP_DOC = {
  id: 'grp-1',
  ownerId: 'club_admin_uid_01',
  name: 'Anadolu Efes Altyapı Hazırlık',
  instructorId: 'e-2',
  instructorName: 'Berkan Saraç',
  primaryAthleteIds: ['s-1', 's-3'],
  facility: 'SportsFly Ana Yerleşke',
  branch: 'Basketbol',
  category: 'Altyapı Takımı',
  ageGroup: 'U14 (2010-2011)',
  memberCount: 7,
  maxCapacity: 15,
  monthlyFee: 3500,
  status: 'Aktif' as const,
  scheduleDays: ['Pazartesi', 'Çarşamba', 'Cuma'],
  scheduleTime: '17:30 - 19:00',
  scheduleLocation: 'Kapalı Basketbol Sahası A',
  description: 'TBF İstanbul Ligi ve Gelişim Turnuvalarına hazırlanan lisanslı ve aday sporcu kadrosu.',
};

/**
 * Mevcut Mock Verileri Çapraz Referanslı Firestore Dokümanlarına Dönüştürücüler
 */
const BRANCH_TO_DEFAULT_GROUP_ID: Record<string, string> = {
  Basketbol: 'grp-1',
  Futbol: 'grp-2',
  Yüzme: 'grp-3',
  Tenis: 'grp-4',
  Voleybol: 'grp-5',
  Jimnastik: 'grp-2',
};

const BRANCH_TO_DEFAULT_TRAINER: Record<string, { id: string; name: string }> = {
  Futbol: { id: 'e-1', name: 'Ali Özcan' },
  Basketbol: { id: 'e-2', name: 'Berkan Saraç' },
  Yüzme: { id: 'e-3', name: 'Berke Kaan Durdu' },
  Tenis: { id: 'e-4', name: 'Deniz Aktaş' },
  Pilates: { id: 'e-5', name: 'Zeynep Koç' },
  Voleybol: { id: 'e-6', name: 'Merve Aydın' },
  Jimnastik: { id: 'e-5', name: 'Zeynep Koç' },
};

export function sanitizeAvatarUrl(url?: string): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.length > 500) {
    return undefined;
  }
  return trimmed;
}

export function mapSporcuToFirestoreDoc(
  item: SporcuItem,
  ownerId: string,
  overrides?: { groupId?: string; trainerId?: string; trainerName?: string }
): FirestoreSporcuDoc {
  const branch = (item.branch || 'Basketbol').trim().slice(0, 80) || 'Basketbol';
  const defaultTrainer = BRANCH_TO_DEFAULT_TRAINER[branch] || { id: 'e-2', name: 'Berkan Saraç' };
  const resolvedGroupId = overrides?.groupId || BRANCH_TO_DEFAULT_GROUP_ID[branch] || 'grp-1';
  const resolvedTrainerId = overrides?.trainerId || defaultTrainer.id;
  const resolvedTrainerName = overrides?.trainerName || defaultTrainer.name;
  const safeName = (item.name || 'Sporcu').trim().slice(0, 120);
  const safeEmail = (item.email || `${item.code || 'sporcu'}@sportsfly.local`).trim().slice(0, 160);
  const safeFacility = (item.facility || 'SportsFly Ana Tesis').trim().slice(0, 140);
  const safeCode = (item.code || `${Math.floor(100000 + Math.random() * 900000)}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .slice(0, 32) || '100000';

  const docData: FirestoreSporcuDoc = {
    id: item.id,
    ownerId,
    code: safeCode.length >= 4 ? safeCode : safeCode.padEnd(4, '0'),
    name: safeName.length >= 2 ? safeName : `${safeName} Sporcu`,
    email: safeEmail.length >= 5 ? safeEmail : 'sporcu@sportsfly.local',
    facility: safeFacility.length >= 2 ? safeFacility : 'SportsFly',
    branch: branch.length >= 2 ? branch : 'Genel',
    groupId: resolvedGroupId,
    trainerId: resolvedTrainerId,
    trainerName: resolvedTrainerName.slice(0, 120),
    isActive: Boolean(item.isActive),
    registrationDate: (item.date || new Date().toLocaleDateString('tr-TR')).slice(0, 32),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (item.phone && item.phone.trim().length >= 7) docData.phone = item.phone.trim().slice(0, 32);
  if (item.birthDate && item.birthDate.trim().length >= 4) docData.birthDate = item.birthDate.trim().slice(0, 24);
  if (item.teamGroup) docData.teamGroup = item.teamGroup.trim().slice(0, 120);
  const safeAvatar = sanitizeAvatarUrl(item.avatarUrl);
  if (safeAvatar) docData.avatarUrl = safeAvatar;

  return docData;
}

export function mapEgitmenToFirestoreDoc(
  item: EgitmenItem,
  ownerId: string,
  assignedGroupIds?: string[]
): FirestoreEgitmenDoc {
  const branch = (item.branch || 'Basketbol').trim().slice(0, 80) || 'Basketbol';
  const defaultGroupId = BRANCH_TO_DEFAULT_GROUP_ID[branch] || 'grp-1';
  const resolvedGroupIds = (assignedGroupIds && assignedGroupIds.length > 0
    ? assignedGroupIds
    : [defaultGroupId]
  ).slice(0, 20);

  const safeName = (item.name || 'Eğitmen').trim().slice(0, 120);
  const safeEmail = (item.email || `${item.code || 'egitmen'}@sportsfly.local`).trim().slice(0, 160);
  const safePhone = (item.phone || '+90 500 000 00 00').trim().slice(0, 32);
  const safeFacility = (item.facility || 'SportsFly Ana Tesis').trim().slice(0, 140);
  const safeCode = (item.code || `${Math.floor(100000 + Math.random() * 900000)}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .slice(0, 32) || '100000';

  const docData: FirestoreEgitmenDoc = {
    id: item.id,
    ownerId,
    code: safeCode.length >= 4 ? safeCode : safeCode.padEnd(4, '0'),
    name: safeName.length >= 2 ? safeName : `${safeName} Koç`,
    email: safeEmail.length >= 5 ? safeEmail : 'egitmen@sportsfly.local',
    phone: safePhone.length >= 5 ? safePhone : '+90 500 000 00 00',
    facility: safeFacility.length >= 2 ? safeFacility : 'SportsFly',
    branch: branch.length >= 2 ? branch : 'Genel',
    assignedGroupIds: resolvedGroupIds,
    status: item.status || 'Aktif',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (item.assignedGroups && item.assignedGroups.length > 0) {
    docData.assignedGroups = item.assignedGroups.slice(0, 20).map((g) => String(g).slice(0, 140));
  }
  if (item.title) docData.title = item.title.slice(0, 140);
  if (item.licenseLevel) docData.licenseLevel = item.licenseLevel.slice(0, 140);
  if (typeof item.experienceYears === 'number') docData.experienceYears = Math.max(0, item.experienceYears);
  if (typeof item.rating === 'number') docData.rating = Math.min(5, Math.max(0, item.rating));
  if (typeof item.activeGroupsCount === 'number') docData.activeGroupsCount = Math.max(0, item.activeGroupsCount);
  if (typeof item.activeAthletesCount === 'number') docData.activeAthletesCount = Math.max(0, item.activeAthletesCount);
  if (typeof item.weeklyHours === 'number') docData.weeklyHours = Math.max(0, item.weeklyHours);
  if (typeof item.hourlyRate === 'number') docData.hourlyRate = Math.max(0, item.hourlyRate);
  if (typeof item.monthlySalary === 'number') docData.monthlySalary = Math.max(0, item.monthlySalary);
  if (item.city) docData.city = item.city.slice(0, 80);
  const safeAvatar = sanitizeAvatarUrl(item.avatarUrl);
  if (safeAvatar) docData.avatarUrl = safeAvatar;
  if (item.bio) docData.bio = item.bio.slice(0, 1000);
  if (item.gender) docData.gender = item.gender.slice(0, 32);
  if (item.address) docData.address = item.address.slice(0, 300);
  if (item.accountDuration) docData.accountDuration = item.accountDuration.slice(0, 64);
  if (typeof item.mailEnabled === 'boolean') docData.mailEnabled = item.mailEnabled;
  if (typeof item.smsEnabled === 'boolean') docData.smsEnabled = item.smsEnabled;
  if (Array.isArray(item.specialties) && item.specialties.length > 0) {
    docData.specialties = item.specialties.slice(0, 20).map((s) => String(s).slice(0, 100));
  }
  if (item.joinDate) docData.joinDate = item.joinDate.slice(0, 32);
  if (typeof item.reviewCount === 'number') docData.reviewCount = Math.max(0, item.reviewCount);
  if (Array.isArray(item.documents) && item.documents.length > 0) {
    docData.documents = item.documents.slice(0, 50);
  }
  if (Array.isArray(item.appointments) && item.appointments.length > 0) {
    docData.appointments = item.appointments.slice(0, 50);
  }

  return docData;
}

export function mapGrupToFirestoreDoc(
  item: GrupItem,
  ownerId: string,
  overrides?: { instructorId?: string; primaryAthleteIds?: string[] }
): {
  grupDoc: FirestoreGrupDoc;
  uyeDocs: FirestoreGrupUyesiDoc[];
} {
  const branch = (item.branch || 'Basketbol').slice(0, 80);
  const defaultTrainer = BRANCH_TO_DEFAULT_TRAINER[branch] || { id: 'e-2', name: item.instructorName };
  const resolvedInstructorId = overrides?.instructorId || defaultTrainer.id;
  const resolvedPrimaryAthleteIds = (
    overrides?.primaryAthleteIds ||
    (item.members || []).map((m) => m.id)
  ).slice(0, 50);

  const grupDoc: FirestoreGrupDoc = {
    id: item.id,
    ownerId,
    name: item.name.slice(0, 140),
    instructorId: resolvedInstructorId,
    instructorName: item.instructorName.slice(0, 120),
    primaryAthleteIds: resolvedPrimaryAthleteIds,
    facility: item.facility.slice(0, 140),
    branch,
    memberCount: item.memberCount,
    maxCapacity: item.maxCapacity || 20,
    monthlyFee: item.monthlyFee || 0,
    status: item.status || 'Aktif',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (item.category) grupDoc.category = item.category.slice(0, 80);
  if (item.ageGroup) grupDoc.ageGroup = item.ageGroup.slice(0, 64);
  if (item.schedule?.days) grupDoc.scheduleDays = item.schedule.days.slice(0, 7);
  if (item.schedule?.time) grupDoc.scheduleTime = item.schedule.time.slice(0, 64);
  if (item.schedule?.location) grupDoc.scheduleLocation = item.schedule.location.slice(0, 140);
  if (item.description) grupDoc.description = item.description.slice(0, 600);

  const uyeDocs: FirestoreGrupUyesiDoc[] = (item.members || []).map((member: GrupMember, idx: number) => {
    const uye: FirestoreGrupUyesiDoc = {
      id: member.id,
      grupId: item.id,
      sporcuId: `s-${idx + 1}`,
      instructorId: resolvedInstructorId,
      ownerId,
      name: member.name.slice(0, 120),
      code: member.code,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (member.phone) uye.phone = member.phone.slice(0, 32);
    if (typeof member.birthYear === 'number') uye.birthYear = member.birthYear;
    if (member.parentName) uye.parentName = member.parentName.slice(0, 120);
    if (member.parentPhone) uye.parentPhone = member.parentPhone.slice(0, 32);
    if (typeof member.attendanceRate === 'number') uye.attendanceRate = member.attendanceRate;
    if (member.licenseNumber) uye.licenseNumber = member.licenseNumber.slice(0, 64);
    return uye;
  });

  return { grupDoc, uyeDocs };
}

export function mapFirestoreDocToSporcuItem(docData: FirestoreSporcuDoc): SporcuItem {
  return {
    id: docData.id,
    name: docData.name,
    email: docData.email,
    code: docData.code,
    date: docData.registrationDate || new Date().toLocaleDateString('tr-TR'),
    facility: docData.facility,
    isActive: Boolean(docData.isActive),
    avatarUrl: docData.avatarUrl,
    phone: docData.phone,
    birthDate: docData.birthDate,
    branch: docData.branch,
    teamGroup: docData.teamGroup,
  };
}

export function mapFirestoreDocToEgitmenItem(docData: FirestoreEgitmenDoc): EgitmenItem {
  return {
    id: docData.id,
    name: docData.name,
    email: docData.email,
    code: docData.code,
    phone: docData.phone,
    facility: docData.facility,
    branch: docData.branch,
    title: docData.title,
    gender: docData.gender,
    city: docData.city,
    address: docData.address,
    accountDuration: docData.accountDuration,
    mailEnabled: docData.mailEnabled,
    smsEnabled: docData.smsEnabled,
    avatarUrl: docData.avatarUrl,
    status: docData.status,
    experienceYears: docData.experienceYears,
    rating: docData.rating,
    reviewCount: docData.reviewCount,
    activeGroupsCount: docData.activeGroupsCount,
    activeAthletesCount: docData.activeAthletesCount,
    weeklyHours: docData.weeklyHours,
    licenseLevel: docData.licenseLevel,
    bio: docData.bio,
    specialties: docData.specialties,
    assignedGroups: docData.assignedGroups,
    joinDate: docData.joinDate,
    hourlyRate: docData.hourlyRate,
    monthlySalary: docData.monthlySalary,
    documents: docData.documents,
    appointments: docData.appointments,
  };
}

export function mapFirestoreDocToGrupItem(
  docData: FirestoreGrupDoc,
  members: GrupMember[] = []
): GrupItem {
  return {
    id: docData.id,
    name: docData.name,
    instructorName: docData.instructorName,
    memberCount: members.length > 0 ? members.length : docData.memberCount,
    facility: docData.facility,
    branch: docData.branch,
    description: docData.description,
    category: docData.category,
    ageGroup: docData.ageGroup,
    maxCapacity: docData.maxCapacity,
    monthlyFee: docData.monthlyFee,
    status: docData.status,
    schedule: docData.scheduleDays || docData.scheduleTime || docData.scheduleLocation
      ? {
          days: docData.scheduleDays || [],
          time: docData.scheduleTime || '17:00 - 18:30',
          location: docData.scheduleLocation,
        }
      : undefined,
    members,
  };
}

