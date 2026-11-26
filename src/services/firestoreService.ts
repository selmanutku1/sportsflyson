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
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  db,
  auth,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import {
  FirestoreSporcuDoc,
  FirestoreEgitmenDoc,
  FirestoreGrupDoc,
  FirestoreGrupUyesiDoc,
  mapSporcuToFirestoreDoc,
  mapEgitmenToFirestoreDoc,
  mapGrupToFirestoreDoc,
  sanitizeAvatarUrl,
} from './firestoreCollectionsSchema';
import { ADMIN_GOOGLE_EMAIL } from '../data/userProfile';
import { INITIAL_SPORCULAR, INITIAL_EGITMENLER } from '../data/mockData';
import { INITIAL_GRUPLAR } from '../data/mockMuhasebeData';
import { GrupMember } from '../types';

/**
 * Blueprint & Firestore Rules Uyumluluk Sabitleri
 * (firebase-blueprint.json ve firestore.rules ile birebir senkronize)
 */
export const FIRESTORE_CONSTRAINTS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  MAX_ID_LENGTH: 128,
  MAX_CODE_LENGTH: 32,
  MAX_NAME_LENGTH: 120,
  MAX_GROUP_NAME_LENGTH: 140,
  MAX_EMAIL_LENGTH: 160,
  MAX_PHONE_LENGTH: 32,
  MAX_FACILITY_LENGTH: 140,
  MAX_BRANCH_LENGTH: 80,
  MAX_ASSIGNED_GROUPS: 20,
  MAX_PRIMARY_ATHLETES: 50,
  MAX_SCHEDULE_DAYS: 7,
  MAX_DESCRIPTION_LENGTH: 600,
  MAX_AVATAR_URL_LENGTH: 500,
} as const;

/**
 * Ana Koleksiyon İsimleri ve Şema Eşleşmesi
 */
export interface FirestoreCollectionMap {
  sporcular: FirestoreSporcuDoc;
  egitmenler: FirestoreEgitmenDoc;
  gruplar: FirestoreGrupDoc;
}

export type FirestoreCollectionKey = keyof FirestoreCollectionMap;

/**
 * Yardımcı: Geçerli oturum açmış kullanıcının UID bilgisini döndürür.
 */
export function getAuthenticatedOwnerId(explicitOwnerId?: string): string {
  const uid = explicitOwnerId || auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Firestore işlemi için aktif kullanıcı oturumu (auth.currentUser.uid) gereklidir.');
  }
  return uid;
}

export function isSuperAdminSession(): boolean {
  return Boolean(
    auth.currentUser &&
      !auth.currentUser.isAnonymous &&
      auth.currentUser.email?.toLowerCase() === ADMIN_GOOGLE_EMAIL &&
      auth.currentUser.emailVerified
  );
}

/**
 * Yardımcı: ID değerinin firestore.rules isValidId() kuralına uygunluğunu doğrular.
 */
export function ensureValidDocumentId(id: string): string {
  const sanitized = String(id || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, FIRESTORE_CONSTRAINTS.MAX_ID_LENGTH);

  if (!sanitized || !FIRESTORE_CONSTRAINTS.ID_REGEX.test(sanitized)) {
    throw new Error(`Geçersiz Firestore doküman ID formatı: "${id}"`);
  }
  return sanitized;
}

/**
 * Yardımcı: Nesne içindeki `undefined` alanları temizler (Firestore `undefined` kabul etmez).
 */
function stripUndefinedFields<T extends Record<string, unknown>>(obj: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

/**
 * Koleksiyon Bazlı Savunmacı Veri Doğrulama ve Kırpma (Defensive Payload Sanitizer)
 * Outgoing verilerin `firebase-blueprint.json` ve `firestore.rules` sınırlarına uymasını garanti eder.
 */
function sanitizeCollectionPayload<K extends FirestoreCollectionKey>(
  collectionName: K,
  rawPayload: Record<string, unknown>
): Record<string, unknown> {
  const payload = stripUndefinedFields({ ...rawPayload });

  if (typeof payload.name === 'string') {
    const maxLen =
      collectionName === 'gruplar'
        ? FIRESTORE_CONSTRAINTS.MAX_GROUP_NAME_LENGTH
        : FIRESTORE_CONSTRAINTS.MAX_NAME_LENGTH;
    payload.name = payload.name.trim().slice(0, maxLen);
  }

  if (typeof payload.email === 'string') {
    payload.email = payload.email.trim().slice(0, FIRESTORE_CONSTRAINTS.MAX_EMAIL_LENGTH);
  }

  if (typeof payload.phone === 'string') {
    payload.phone = payload.phone.trim().slice(0, FIRESTORE_CONSTRAINTS.MAX_PHONE_LENGTH);
  }

  if (typeof payload.facility === 'string') {
    payload.facility = payload.facility.trim().slice(0, FIRESTORE_CONSTRAINTS.MAX_FACILITY_LENGTH);
  }

  if (typeof payload.branch === 'string') {
    payload.branch = payload.branch.trim().slice(0, FIRESTORE_CONSTRAINTS.MAX_BRANCH_LENGTH);
  }

  if (typeof payload.avatarUrl === 'string') {
    const safeUrl = sanitizeAvatarUrl(payload.avatarUrl);
    if (safeUrl) {
      payload.avatarUrl = safeUrl;
    } else {
      delete payload.avatarUrl;
    }
  }

  if (typeof payload.description === 'string') {
    payload.description = payload.description.trim().slice(0, FIRESTORE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH);
  }

  if (typeof payload.bio === 'string') {
    payload.bio = payload.bio.trim().slice(0, 1000);
  }
  if (typeof payload.gender === 'string') {
    payload.gender = payload.gender.trim().slice(0, 32);
  }
  if (typeof payload.address === 'string') {
    payload.address = payload.address.trim().slice(0, 300);
  }
  if (typeof payload.accountDuration === 'string') {
    payload.accountDuration = payload.accountDuration.trim().slice(0, 64);
  }
  if (typeof payload.joinDate === 'string') {
    payload.joinDate = payload.joinDate.trim().slice(0, 32);
  }
  if (Array.isArray(payload.specialties)) {
    payload.specialties = payload.specialties.slice(0, 20).map((s) => String(s).slice(0, 100));
  }
  if (Array.isArray(payload.documents)) {
    payload.documents = payload.documents.slice(0, 50);
  }
  if (Array.isArray(payload.appointments)) {
    payload.appointments = payload.appointments.slice(0, 50);
  }

  if (Array.isArray(payload.assignedGroupIds)) {
    payload.assignedGroupIds = payload.assignedGroupIds
      .slice(0, FIRESTORE_CONSTRAINTS.MAX_ASSIGNED_GROUPS)
      .map((id) => ensureValidDocumentId(String(id)));
  }

  if (Array.isArray(payload.primaryAthleteIds)) {
    payload.primaryAthleteIds = payload.primaryAthleteIds
      .slice(0, FIRESTORE_CONSTRAINTS.MAX_PRIMARY_ATHLETES)
      .map((id) => ensureValidDocumentId(String(id)));
  }

  if (Array.isArray(payload.scheduleDays)) {
    payload.scheduleDays = payload.scheduleDays
      .slice(0, FIRESTORE_CONSTRAINTS.MAX_SCHEDULE_DAYS)
      .map((day) => String(day).slice(0, 32));
  }

  return payload;
}

// ============================================================================
// 1. GENERIC CRUD FONKSİYONLARI (sporcular | egitmenler | gruplar)
// ============================================================================

export type CreatePayload<K extends FirestoreCollectionKey> = Omit<
  FirestoreCollectionMap[K],
  'id' | 'ownerId' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
  ownerId?: string;
};

export type UpdatePayload<K extends FirestoreCollectionKey> = Partial<
  Omit<FirestoreCollectionMap[K], 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
>;

/**
 * [CREATE] Koleksiyona yeni bir doküman ekler.
 * `id` belirtilmezse otomatik güvenli bir ID üretir ve doküman içi `id` alanıyla eşitler.
 */
export async function addDocument<K extends FirestoreCollectionKey>(
  collectionName: K,
  data: CreatePayload<K>
): Promise<FirestoreCollectionMap[K]> {
  const ownerId = getAuthenticatedOwnerId(data.ownerId);
  const colRef = collection(db, collectionName);
  const rawDocId = data.id || doc(colRef).id;
  const docId = ensureValidDocumentId(rawDocId);
  const docPath = `${collectionName}/${docId}`;

  const sanitized = sanitizeCollectionPayload(collectionName, {
    ...data,
    id: docId,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await setDoc(doc(db, collectionName, docId), sanitized);
    return sanitized as unknown as FirestoreCollectionMap[K];
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

/**
 * [READ - SINGLE] Belirtilen koleksiyondan tek bir dokümanı ID ile getirir.
 */
export async function getDocumentById<K extends FirestoreCollectionKey>(
  collectionName: K,
  docId: string
): Promise<FirestoreCollectionMap[K] | null> {
  const validId = ensureValidDocumentId(docId);
  const docPath = `${collectionName}/${validId}`;

  try {
    const snap = await getDoc(doc(db, collectionName, validId));
    if (!snap.exists()) {
      return null;
    }
    return { id: snap.id, ...snap.data() } as FirestoreCollectionMap[K];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

/**
 * [READ - LIST] Belirtilen koleksiyondaki dokümanları `ownerId` güvenlik filtresiyle listeler.
 * İsteğe bağlı olarak çapraz referans filtreleri (`where('groupId', '==', 'grp-1')` vb.) eklenebilir.
 */
export async function getDocuments<K extends FirestoreCollectionKey>(
  collectionName: K,
  extraConstraints: QueryConstraint[] = [],
  explicitOwnerId?: string
): Promise<FirestoreCollectionMap[K][]> {
  const ownerId = getAuthenticatedOwnerId(explicitOwnerId);
  const superAdmin = isSuperAdminSession() && !explicitOwnerId;

  try {
    const q = superAdmin
      ? query(collection(db, collectionName), ...extraConstraints)
      : query(
          collection(db, collectionName),
          where('ownerId', '==', ownerId),
          ...extraConstraints
        );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FirestoreCollectionMap[K])
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

/**
 * [UPDATE] Belirtilen dokümanın izin verilen alanlarını günceller ve `updatedAt` zaman damgasını yeniler.
 */
export async function updateDocument<K extends FirestoreCollectionKey>(
  collectionName: K,
  docId: string,
  partialData: UpdatePayload<K>
): Promise<void> {
  const validId = ensureValidDocumentId(docId);
  const docPath = `${collectionName}/${validId}`;

  // Değiştirilemez (immutable) alanları güncelleme paketinden çıkar
  const safeClone = { ...(partialData as Record<string, unknown>) };
  delete safeClone.id;
  delete safeClone.ownerId;
  delete safeClone.code;
  delete safeClone.createdAt;

  const sanitizedUpdate = sanitizeCollectionPayload(collectionName, {
    ...safeClone,
    updatedAt: serverTimestamp(),
  });

  try {
    await updateDoc(doc(db, collectionName, validId), sanitizedUpdate as DocumentData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

/**
 * [DELETE] Belirtilen dokümanı koleksiyondan siler.
 */
export async function deleteDocument<K extends FirestoreCollectionKey>(
  collectionName: K,
  docId: string
): Promise<void> {
  const validId = ensureValidDocumentId(docId);
  const docPath = `${collectionName}/${validId}`;

  try {
    await deleteDoc(doc(db, collectionName, validId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * [REALTIME SUBSCRIBE] Koleksiyonu gerçek zamanlı (`onSnapshot`) dinler.
 * Yalnızca aktif kullanıcı oturumu varsa bağlantı kurar.
 */
export function subscribeToCollection<K extends FirestoreCollectionKey>(
  collectionName: K,
  onData: (items: FirestoreCollectionMap[K][]) => void,
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
    if (disposed || !currentUser) {
      return;
    }

    const superAdmin = isSuperAdminSession();
    const q = superAdmin
      ? query(collection(db, collectionName), ...extraConstraints)
      : query(
          collection(db, collectionName),
          where('ownerId', '==', currentUser.uid),
          ...extraConstraints
        );

    snapshotUnsub = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FirestoreCollectionMap[K])
        );
        onData(items);
      },
      (error) => {
        if (onErrorCallback) {
          onErrorCallback(error);
        }
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
}

// ============================================================================
// 2. KOLEKSİYON BAZLI ÖZELLEŞTİRİLMİŞ SERVİSLER & ÇAPRAZ REFERANS SORGULARI
// ============================================================================

export const sporcularService = {
  add: (data: CreatePayload<'sporcular'>) => addDocument('sporcular', data),
  getById: (sporcuId: string) => getDocumentById('sporcular', sporcuId),
  getAll: (constraints?: QueryConstraint[]) => getDocuments('sporcular', constraints),
  /** Çapraz Referans: Belirli bir gruba (`groupId`) kayıtlı tüm sporcuları getirir */
  getByGroupId: (groupId: string) =>
    getDocuments('sporcular', [where('groupId', '==', ensureValidDocumentId(groupId))]),
  /** Çapraz Referans: Belirli bir eğitmene (`trainerId`) bağlı tüm sporcuları getirir */
  getByTrainerId: (trainerId: string) =>
    getDocuments('sporcular', [where('trainerId', '==', ensureValidDocumentId(trainerId))]),
  update: (sporcuId: string, data: UpdatePayload<'sporcular'>) =>
    updateDocument('sporcular', sporcuId, data),
  delete: (sporcuId: string) => deleteDocument('sporcular', sporcuId),
  subscribe: (
    onData: (items: FirestoreSporcuDoc[]) => void,
    constraints?: QueryConstraint[]
  ) => subscribeToCollection('sporcular', onData, constraints),
};

export const egitmenlerService = {
  add: (data: CreatePayload<'egitmenler'>) => addDocument('egitmenler', data),
  getById: (egitmenId: string) => getDocumentById('egitmenler', egitmenId),
  getAll: (constraints?: QueryConstraint[]) => getDocuments('egitmenler', constraints),
  /** Çapraz Referans: Belirli bir grubun (`groupId`) atandığı eğitmenleri getirir */
  getByAssignedGroupId: (groupId: string) =>
    getDocuments('egitmenler', [
      where('assignedGroupIds', 'array-contains', ensureValidDocumentId(groupId)),
    ]),
  update: (egitmenId: string, data: UpdatePayload<'egitmenler'>) =>
    updateDocument('egitmenler', egitmenId, data),
  delete: (egitmenId: string) => deleteDocument('egitmenler', egitmenId),
  subscribe: (
    onData: (items: FirestoreEgitmenDoc[]) => void,
    constraints?: QueryConstraint[]
  ) => subscribeToCollection('egitmenler', onData, constraints),
};

export const gruplarService = {
  add: (data: CreatePayload<'gruplar'>) => addDocument('gruplar', data),
  getById: (grupId: string) => getDocumentById('gruplar', grupId),
  getAll: (constraints?: QueryConstraint[]) => getDocuments('gruplar', constraints),
  update: (grupId: string, data: UpdatePayload<'gruplar'>) => updateDocument('gruplar', grupId, data),
  delete: (grupId: string) => deleteDocument('gruplar', grupId),
  subscribe: (
    onData: (items: FirestoreGrupDoc[]) => void,
    constraints?: QueryConstraint[]
  ) => subscribeToCollection('gruplar', onData, constraints),
};

export const grupUyeleriService = {
  async getByGrupId(grupId: string): Promise<FirestoreGrupUyesiDoc[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    const validGrupId = ensureValidDocumentId(grupId);
    const colPath = `gruplar/${validGrupId}/uyeler`;
    try {
      const q = isSuperAdminSession()
        ? query(collection(db, colPath))
        : query(collection(db, colPath), where('ownerId', '==', currentUser.uid));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreGrupUyesiDoc));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  },

  async syncForGrup(
    grupId: string,
    members: GrupMember[],
    instructorId = 'e-2',
    explicitOwnerId?: string
  ): Promise<void> {
    const ownerId = getAuthenticatedOwnerId(explicitOwnerId);
    const validGrupId = ensureValidDocumentId(grupId);
    const colPath = `gruplar/${validGrupId}/uyeler`;
    try {
      const existing = await this.getByGrupId(validGrupId);
      const existingMap = new Map<string, FirestoreGrupUyesiDoc>(
        existing.map((m): [string, FirestoreGrupUyesiDoc] => [m.id, m])
      );
      const nextIds = new Set<string>();
      const batch = writeBatch(db);

      members.forEach((member, idx) => {
        const validMemberId = ensureValidDocumentId(member.id || `m-${Date.now()}-${idx}`);
        nextIds.add(validMemberId);
        const ref = doc(db, colPath, validMemberId);
        const prev = existingMap.get(validMemberId);
        const safeCode = (member.code || `${100000 + idx}`)
          .replace(/[^a-zA-Z0-9_\-]/g, '')
          .slice(0, 32) || '100000';
        const payload = stripUndefinedFields({
          id: validMemberId,
          grupId: validGrupId,
          sporcuId: prev?.sporcuId || ensureValidDocumentId(`s-${idx + 1}`),
          instructorId: ensureValidDocumentId(prev?.instructorId || instructorId),
          ownerId: prev?.ownerId || ownerId,
          name: (member.name || 'Sporcu').trim().slice(0, 120),
          code: prev?.code || (safeCode.length >= 4 ? safeCode : safeCode.padEnd(4, '0')),
          phone: member.phone ? member.phone.trim().slice(0, 32) : undefined,
          birthYear: typeof member.birthYear === 'number' ? member.birthYear : undefined,
          parentName: member.parentName ? member.parentName.trim().slice(0, 120) : undefined,
          parentPhone: member.parentPhone ? member.parentPhone.trim().slice(0, 32) : undefined,
          attendanceRate: typeof member.attendanceRate === 'number' ? member.attendanceRate : undefined,
          licenseNumber: member.licenseNumber ? member.licenseNumber.trim().slice(0, 64) : undefined,
          createdAt: prev?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(ref, payload);
      });

      existing.forEach((oldMember) => {
        if (!nextIds.has(oldMember.id)) {
          batch.delete(doc(db, colPath, oldMember.id));
        }
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, colPath);
    }
  },
};

export interface FirestoreSporOkuluBasvurusuDoc {
  id: string;
  clubName: string;
  managerName: string;
  email: string;
  phone: string;
  city?: string;
  district?: string;
  branches?: string[];
  selectedPlan: string;
  athleteCount?: string;
  status: 'onay_bekliyor' | 'onaylandi' | 'reddedildi' | 'askida';
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

async function canListSporOkuluBasvurulari(fbUser: User | null): Promise<boolean> {
  if (!fbUser || fbUser.isAnonymous) {
    return false;
  }
  if (fbUser.email?.toLowerCase() === ADMIN_GOOGLE_EMAIL && fbUser.emailVerified) {
    return true;
  }
  try {
    const cleanUid = ensureValidDocumentId(fbUser.uid);
    const [adminSnap, userSnap] = await Promise.all([
      getDoc(doc(db, 'admins', cleanUid)).catch(() => null),
      getDoc(doc(db, 'users', cleanUid)).catch(() => null),
    ]);
    if (adminSnap?.exists()) {
      return true;
    }
    if (userSnap?.exists() && userSnap.data()?.role === 'kulup_yoneticisi') {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export const basvurularService = {
  async add(data: Omit<FirestoreSporOkuluBasvurusuDoc, 'createdAt' | 'updatedAt'>) {
    const docId = ensureValidDocumentId(data.id || doc(collection(db, 'spor-okulu-basvurulari')).id);
    const payload = stripUndefinedFields({
      ...data,
      id: docId,
      status: data.status || 'onay_bekliyor',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    try {
      await setDoc(doc(db, 'spor-okulu-basvurulari', docId), payload);
      return payload;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `spor-okulu-basvurulari/${docId}`);
    }
  },

  async update(id: string, data: Partial<FirestoreSporOkuluBasvurusuDoc>) {
    const docPath = `spor-okulu-basvurulari/${id}`;
    try {
      await updateDoc(doc(db, 'spor-okulu-basvurulari', id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  subscribeToAll(
    onData: (items: FirestoreSporOkuluBasvurusuDoc[]) => void,
    onErrorCallback?: (err: unknown) => void
  ): Unsubscribe {
    let disposed = false;
    let checkSeq = 0;
    let snapshotUnsub: Unsubscribe | null = null;

    const authUnsub = onAuthStateChanged(auth, (fbUser) => {
      checkSeq += 1;
      const currentSeq = checkSeq;
      if (snapshotUnsub) {
        snapshotUnsub();
        snapshotUnsub = null;
      }

      if (!fbUser || fbUser.isAnonymous) {
        onData([]);
        return;
      }

      void canListSporOkuluBasvurulari(fbUser).then((allowed) => {
        if (disposed || currentSeq !== checkSeq) return;
        if (!allowed) {
          onData([]);
          return;
        }
        const colRef = collection(db, 'spor-okulu-basvurulari');
        snapshotUnsub = onSnapshot(
          colRef,
          (snap) => {
            const items = snap.docs.map(
              (d) => ({ id: d.id, ...d.data() } as FirestoreSporOkuluBasvurusuDoc)
            );
            onData(items);
          },
          (error) => {
            if (onErrorCallback) onErrorCallback(error);
            if (auth.currentUser && !auth.currentUser.isAnonymous) {
              handleFirestoreError(error, OperationType.LIST, 'spor-okulu-basvurulari');
            }
          }
        );
      });
    });

    return () => {
      disposed = true;
      checkSeq += 1;
      authUnsub();
      if (snapshotUnsub) {
        snapshotUnsub();
        snapshotUnsub = null;
      }
    };
  },

  subscribeToPending(
    onData: (pendingCount: number, items: FirestoreSporOkuluBasvurusuDoc[]) => void
  ): Unsubscribe {
    let disposed = false;
    let checkSeq = 0;
    let snapshotUnsub: Unsubscribe | null = null;

    const authUnsub = onAuthStateChanged(auth, (fbUser) => {
      checkSeq += 1;
      const currentSeq = checkSeq;
      if (snapshotUnsub) {
        snapshotUnsub();
        snapshotUnsub = null;
      }

      if (!fbUser || fbUser.isAnonymous) {
        onData(0, []);
        return;
      }

      void canListSporOkuluBasvurulari(fbUser).then((allowed) => {
        if (disposed || currentSeq !== checkSeq) return;
        if (!allowed) {
          onData(0, []);
          return;
        }
        const q = query(
          collection(db, 'spor-okulu-basvurulari'),
          where('status', '==', 'onay_bekliyor')
        );
        snapshotUnsub = onSnapshot(
          q,
          (snap) => {
            const items = snap.docs.map(
              (d) => ({ id: d.id, ...d.data() } as FirestoreSporOkuluBasvurusuDoc)
            );
            onData(items.length, items);
          },
          (error) => {
            if (auth.currentUser && !auth.currentUser.isAnonymous) {
              handleFirestoreError(error, OperationType.LIST, 'spor-okulu-basvurulari');
            }
          }
        );
      });
    });

    return () => {
      disposed = true;
      checkSeq += 1;
      authUnsub();
      if (snapshotUnsub) {
        snapshotUnsub();
        snapshotUnsub = null;
      }
    };
  },
};

// ============================================================================
// 3. VERİTABANI ŞEMA DOĞRULAMA & ÖRNEK VERİ YÜKLEME (populateDatabase)
// ============================================================================

export interface PopulateDatabaseResult {
  populated: boolean;
  verified: boolean;
  ownerId: string;
  counts: {
    sporcular: number;
    egitmenler: number;
    gruplar: number;
    grupUyeleri: number;
  };
  sampleVerification?: {
    sporcuGroupId?: string;
    sporcuTrainerId?: string;
    egitmenAssignedGroupIds?: string[];
    grupInstructorId?: string;
  };
}

/**
 * Yönetim Fonksiyonu: `populateDatabase`
 * Firestore veritabanı şema kurulumunu ve çapraz referanslarını (`groupId`, `trainerId`,
 * `assignedGroupIds`, `instructorId`, `primaryAthleteIds`) doğrulamak için `sporcular`,
 * `egitmenler`, `gruplar` ve `/gruplar/{grupId}/uyeler` koleksiyonlarına örnek verileri
 * atomik (`writeBatch`) olarak yazar ve şema bütünlüğünü kontrol eder.
 */
let populateInFlight: Promise<PopulateDatabaseResult> | null = null;

export async function populateDatabase(options?: {
  forceOverwrite?: boolean;
}): Promise<PopulateDatabaseResult> {
  if (populateInFlight && !options?.forceOverwrite) {
    return populateInFlight;
  }
  const run = (async (): Promise<PopulateDatabaseResult> => {
    const ownerId = getAuthenticatedOwnerId();
    const forceOverwrite = Boolean(options?.forceOverwrite);
    const superAdmin = isSuperAdminSession();
    const seedPrefix = superAdmin ? '' : `u_${ensureValidDocumentId(ownerId).slice(0, 12)}_`;
    const scopedId = (rawId: string) =>
      ensureValidDocumentId(seedPrefix ? `${seedPrefix}${rawId}` : rawId);

    const [existingGruplar, existingEgitmenler, existingSporcular] = await Promise.all([
      gruplarService.getAll(),
      egitmenlerService.getAll(),
      sporcularService.getAll(),
    ]);

    const needGruplar = INITIAL_GRUPLAR.length > 0 && existingGruplar.length === 0;
    const needEgitmenler = INITIAL_EGITMENLER.length > 0 && existingEgitmenler.length === 0;
    const needSporcular = INITIAL_SPORCULAR.length > 0 && existingSporcular.length === 0;

    // Eğer başlangıç verisi olan tüm koleksiyonlar zaten doluysa ve forceOverwrite: false ise yeniden yazma
    if (!forceOverwrite && !needGruplar && !needEgitmenler && !needSporcular) {
      const sampleSporcu = existingSporcular[0];
      const sampleEgitmen = existingEgitmenler[0];
      const sampleGrup = existingGruplar[0];

      return {
        populated: false,
        verified: Boolean(
          Array.isArray(sampleEgitmen?.assignedGroupIds) &&
            sampleGrup?.instructorId &&
            (!sampleSporcu || (sampleSporcu.groupId && sampleSporcu.trainerId))
        ),
        ownerId,
        counts: {
          sporcular: existingSporcular.length,
          egitmenler: existingEgitmenler.length,
          gruplar: existingGruplar.length,
          grupUyeleri: 0,
        },
        sampleVerification: {
          sporcuGroupId: sampleSporcu?.groupId,
          sporcuTrainerId: sampleSporcu?.trainerId,
          egitmenAssignedGroupIds: sampleEgitmen?.assignedGroupIds,
          grupInstructorId: sampleGrup?.instructorId,
        },
      };
    }

    const existingGrupIds = new Set(existingGruplar.map((g) => g.id));
    const existingEgitmenIds = new Set(existingEgitmenler.map((e) => e.id));
    const existingSporcuIds = new Set(existingSporcular.map((s) => s.id));

    const batch = writeBatch(db);
    let batchOpsCount = 0;
    let uyeTotal = 0;

    // Branş bazlı çapraz referans eşleştirmeleri (Gruplar <-> Eğitmenler <-> Sporcular)
    const trainerAssignedGroupMap: Record<string, string[]> = {
      'e-1': ['grp-2'],
      'e-2': ['grp-1'],
      'e-3': ['grp-3'],
      'e-4': ['grp-4'],
      'e-5': ['grp-2'],
      'e-6': ['grp-5'],
    };

    const groupInstructorMap: Record<string, { instructorId: string; primaryAthleteIds: string[] }> = {
      'grp-1': { instructorId: 'e-2', primaryAthleteIds: ['s-1', 's-3', 's-6'] },
      'grp-2': { instructorId: 'e-1', primaryAthleteIds: ['s-4'] },
      'grp-3': { instructorId: 'e-3', primaryAthleteIds: ['s-5'] },
      'grp-4': { instructorId: 'e-4', primaryAthleteIds: ['s-1'] },
      'grp-5': { instructorId: 'e-6', primaryAthleteIds: ['s-2'] },
    };

    // 1. Gruplar (/gruplar/{grupId}) ve Alt Koleksiyon Üyeleri (/gruplar/{grupId}/uyeler/{uyeId})
    for (const grup of INITIAL_GRUPLAR) {
      const targetGrupId = scopedId(grup.id);
      const grupExists = existingGrupIds.has(targetGrupId);
      if (!forceOverwrite && grupExists) {
        continue;
      }

      const rel = groupInstructorMap[grup.id];
      const mappedInstructorId = rel?.instructorId ? scopedId(rel.instructorId) : undefined;
      const mappedPrimaryAthletes = rel?.primaryAthleteIds?.map(scopedId);

      const { grupDoc, uyeDocs } = mapGrupToFirestoreDoc(
        { ...grup, id: targetGrupId },
        ownerId,
        {
          instructorId: mappedInstructorId || scopedId('e-2'),
          primaryAthleteIds: mappedPrimaryAthletes,
        }
      );

      const grupRef = doc(db, 'gruplar', grupDoc.id);
      const cleanedGrup = stripUndefinedFields(grupDoc as unknown as Record<string, unknown>);
      if (grupExists) {
        const updateGrup = { ...cleanedGrup };
        delete updateGrup.id;
        delete updateGrup.ownerId;
        delete updateGrup.createdAt;
        batch.update(grupRef, updateGrup as DocumentData);
      } else {
        batch.set(grupRef, cleanedGrup);
      }
      batchOpsCount++;

      const existingUyeIds = grupExists
        ? new Set((await grupUyeleriService.getByGrupId(targetGrupId)).map((u) => u.id))
        : new Set<string>();

      for (const uye of uyeDocs) {
        const targetUyeId = scopedId(uye.id);
        const uyeExists = existingUyeIds.has(targetUyeId);
        if (!forceOverwrite && uyeExists) {
          continue;
        }
        const uyeRef = doc(db, 'gruplar', grupDoc.id, 'uyeler', targetUyeId);
        const cleanedUye = stripUndefinedFields({
          ...uye,
          id: targetUyeId,
          grupId: grupDoc.id,
          sporcuId: scopedId(uye.sporcuId),
          instructorId: scopedId(uye.instructorId),
        } as unknown as Record<string, unknown>);

        if (uyeExists) {
          const updateUye = { ...cleanedUye };
          delete updateUye.id;
          delete updateUye.grupId;
          delete updateUye.ownerId;
          delete updateUye.code;
          delete updateUye.createdAt;
          batch.update(uyeRef, updateUye as DocumentData);
        } else {
          batch.set(uyeRef, cleanedUye);
        }
        batchOpsCount++;
        uyeTotal++;
      }
    }

    // 2. Eğitmenler (/egitmenler/{egitmenId})
    for (const egitmen of INITIAL_EGITMENLER) {
      const targetEgitmenId = scopedId(egitmen.id);
      const egitmenExists = existingEgitmenIds.has(targetEgitmenId);
      if (!forceOverwrite && egitmenExists) {
        continue;
      }

      const assignedIds = (trainerAssignedGroupMap[egitmen.id] || ['grp-1']).map(scopedId);
      const egitmenDoc = mapEgitmenToFirestoreDoc(
        { ...egitmen, id: targetEgitmenId },
        ownerId,
        assignedIds
      );
      const egitmenRef = doc(db, 'egitmenler', egitmenDoc.id);
      const cleanedEgitmen = stripUndefinedFields(egitmenDoc as unknown as Record<string, unknown>);

      if (egitmenExists) {
        const updateEgitmen = { ...cleanedEgitmen };
        delete updateEgitmen.id;
        delete updateEgitmen.ownerId;
        delete updateEgitmen.code;
        delete updateEgitmen.createdAt;
        batch.update(egitmenRef, updateEgitmen as DocumentData);
      } else {
        batch.set(egitmenRef, cleanedEgitmen);
      }
      batchOpsCount++;
    }

    // 3. Sporcular (/sporcular/{sporcuId})
    for (const sporcu of INITIAL_SPORCULAR) {
      const targetSporcuId = scopedId(sporcu.id);
      const sporcuExists = existingSporcuIds.has(targetSporcuId);
      if (!forceOverwrite && sporcuExists) {
        continue;
      }

      const sporcuDoc = mapSporcuToFirestoreDoc({ ...sporcu, id: targetSporcuId }, ownerId);
      sporcuDoc.groupId = scopedId(sporcuDoc.groupId);
      sporcuDoc.trainerId = scopedId(sporcuDoc.trainerId);
      const sporcuRef = doc(db, 'sporcular', sporcuDoc.id);
      const cleanedSporcu = stripUndefinedFields(sporcuDoc as unknown as Record<string, unknown>);

      if (sporcuExists) {
        const updateSporcu = { ...cleanedSporcu };
        delete updateSporcu.id;
        delete updateSporcu.ownerId;
        delete updateSporcu.code;
        delete updateSporcu.createdAt;
        batch.update(sporcuRef, updateSporcu as DocumentData);
      } else {
        batch.set(sporcuRef, cleanedSporcu);
      }
      batchOpsCount++;
    }

    if (batchOpsCount > 0) {
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'populateDatabase/batchCommit');
      }
    }

    // 4. Yazılan şemayı ve çapraz referansları oku & doğrula
    const [verifiedSporcu, verifiedEgitmen, verifiedGrup] = await Promise.all([
      INITIAL_SPORCULAR[0]?.id ? sporcularService.getById(scopedId(INITIAL_SPORCULAR[0].id)) : Promise.resolve(null),
      INITIAL_EGITMENLER[0]?.id ? egitmenlerService.getById(scopedId(INITIAL_EGITMENLER[0].id)) : Promise.resolve(null),
      INITIAL_GRUPLAR[0]?.id ? gruplarService.getById(scopedId(INITIAL_GRUPLAR[0].id)) : Promise.resolve(null),
    ]);

    const isSchemaVerified = Boolean(
      Array.isArray(verifiedEgitmen?.assignedGroupIds) &&
        verifiedGrup?.instructorId &&
        (!verifiedSporcu || (verifiedSporcu.groupId && verifiedSporcu.trainerId))
    );

    return {
      populated: batchOpsCount > 0,
      verified: isSchemaVerified,
      ownerId,
      counts: {
        sporcular: INITIAL_SPORCULAR.length || existingSporcular.length,
        egitmenler: INITIAL_EGITMENLER.length || existingEgitmenler.length,
        gruplar: INITIAL_GRUPLAR.length || existingGruplar.length,
        grupUyeleri: uyeTotal,
      },
      sampleVerification: {
        sporcuGroupId: verifiedSporcu?.groupId,
        sporcuTrainerId: verifiedSporcu?.trainerId,
        egitmenAssignedGroupIds: verifiedEgitmen?.assignedGroupIds,
        grupInstructorId: verifiedGrup?.instructorId,
      },
    };
  })().finally(() => {
    populateInFlight = null;
  });

  if (!options?.forceOverwrite) {
    populateInFlight = run;
  }
  return run;
}

/**
 * Geriye dönük uyumluluk için yardımcı sarmalayıcı (alias).
 */
export async function seedInitialCoreCollectionsIfEmpty(): Promise<{
  seeded: boolean;
  counts: { sporcular: number; egitmenler: number; gruplar: number; grupUyeleri: number };
}> {
  if (!auth.currentUser) {
    return {
      seeded: false,
      counts: { sporcular: 0, egitmenler: 0, gruplar: 0, grupUyeleri: 0 },
    };
  }
  const result = await populateDatabase({ forceOverwrite: false });
  return {
    seeded: result.populated,
    counts: result.counts,
  };
}
