import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { SporcuKarne } from '../data/mockKarneData';
import {
  SportsFlyLabReport,
  SportsFlyLabArchivedReport,
  ensureDataConsistency,
  normalizeArchiveDateIso,
} from '../data/sportsFlyLabData';
import { FirestoreSporcuDoc } from './firestoreCollectionsSchema';

/**
 * Maps a SportsFlyLabReport into a SporcuKarne view model for 5-page report rendering
 */
export function mapLabReportToSporcuKarne(rep: SportsFlyLabReport): SporcuKarne {
  ensureDataConsistency(rep);

  const getB = (id: string) => {
    const r = rep.bodyComposition?.find((x) => x.id === id);
    if (!r) return 0;
    return r.m1 > 0 ? r.m1 : (r.m2 > 0 ? r.m2 : (r.m3 > 0 ? r.m3 : 0));
  };

  const getM = (id: string) => {
    const r = rep.motorPerformance?.find((x) => x.id === id);
    if (!r) return 0;
    return r.m1 > 0 ? r.m1 : (r.m2 > 0 ? r.m2 : (r.m3 > 0 ? r.m3 : 0));
  };

  const getP = (id: string) =>
    rep.motorPerformance?.find((x) => x.id === id)?.percentile || 50;

  const h = getB('height') || 160;
  const w = getB('weight') || 50;

  const sprintPct = getP('sprint');
  const agilityPct = getP('agility');
  const vjPct = getP('vertical_jump');
  const gripPct = getP('grip_strength_right');

  const fizOrt = Number((((sprintPct + agilityPct + vjPct + gripPct) / 4) / 10).toFixed(1));

  return {
    id: rep.id,
    sporcuId: rep.athleteCode || rep.id,
    adSoyad: rep.athleteName,
    brans: rep.sportBranch || 'Genel Spor',
    grup: rep.branchName || rep.clubName || 'Performans Grubu',
    yasGubu: `${Math.floor(rep.ageYears || 12)} Yaş`,
    tarih: rep.date2 !== '—' && rep.date2 ? rep.date2 : rep.date1 || new Date().toISOString().split('T')[0],
    antrenor: 'SportsFly Lab Başantrenör',
    boy: h,
    kilo: w,
    somatotype: rep.somatotype
      ? {
          endo: rep.somatotype.m2?.endo || rep.somatotype.m1?.endo || 3.5,
          meso: rep.somatotype.m2?.meso || rep.somatotype.m1?.meso || 4.2,
          ecto: rep.somatotype.m2?.ecto || rep.somatotype.m1?.ecto || 2.1,
          category: rep.somatotype.m2?.category || rep.somatotype.m1?.category || 'Dengeli Mezomorf',
          m1: rep.somatotype.m1,
          m2: rep.somatotype.m2,
          m3: rep.somatotype.m3,
          eliteRef: rep.somatotype.eliteRef
            ? {
                endo: rep.somatotype.eliteRef.endo,
                meso: rep.somatotype.eliteRef.meso,
                ecto: rep.somatotype.eliteRef.ecto,
              }
            : undefined,
        }
      : undefined,
    teknik: {
      topKontrolu: 8,
      pasBasarisi: 8,
      sut: 8,
      topSurme: 8,
      savunma: 7,
      ortalama: Number(((rep.scoreHistory?.p2Score || rep.scoreHistory?.p1Score || 75) / 10).toFixed(1)),
    },
    fiziksel: {
      hiz: Math.round(sprintPct / 10),
      dayaniklilik: Math.round((getP('aerobic') || 75) / 10),
      guc: Math.round(vjPct / 10),
      ceviklik: Math.round(agilityPct / 10),
      ortalama: fizOrt > 0 ? fizOrt : 7.8,
    },
    taktiksel: {
      oyunZekasi: 8,
      pozisyonAlma: 8,
      kararVerme: 8,
      ortalama: 8.0,
    },
    zihinsel: {
      disiplin: 9,
      ozguven: 8,
      takimUyumu: 9,
      liderlik: 8,
      ortalama: 8.5,
    },
    katilimYuzdesi: 95,
    antrenmanSayisi: 24,
    davranissal: {
      kriterler: {
        fairPlay: 9,
        sorumlulukEkipman: 8,
        saygiIletisim: 9,
        yonergeyeUyum: 8,
        duyguKontrolu: 8,
        ortalama: 8.4,
      },
      kazanimlar: [
        {
          baslik: 'Biyomotorik Gelişim Başarısı',
          aciklama: `Gelişim Karne Puanı: %${rep.scoreHistory?.p2Score || rep.scoreHistory?.p1Score || 80}`,
        },
        {
          baslik: 'Fiziksel Test Taraması',
          aciklama: `${rep.sportBranch} branşında atletik performans taramasında yüksek başarı.`,
        },
      ],
      surecTakibi: [
        {
          donem: '1. Ölçüm Dönemi',
          tarih: rep.date1 || '2026-01-15',
          durum: 'Gelişiyor',
          odakKonusu: 'Fiziksel & Antropometrik Tarama',
          gozlem: 'İlk bilimsel ölçüm verileri başarıyla kaydedildi.',
        },
        {
          donem: '2. Ölçüm Dönemi',
          tarih: rep.date2 || '2026-04-15',
          durum: 'Hedefe Ulaştı',
          odakKonusu: 'Performans Gelişim Projeksiyonu',
          gozlem: 'Tüm biyomotor yetenek alanlarında gelişim ivmesi sürdürülüyor.',
        },
      ],
      bagimlilikVeAliskanlik: {
        ekranDengesi: { puan: 8.5, seviye: 'Dengeli & Bilinçli', aciklama: 'Sağlıklı sporcu yaşam ritmi.' },
        zararliAliskanlik: { puan: 10, seviye: 'Bilinçli (Örnek)', aciklama: 'Dengeli beslenme ve hidrasyon.' },
        uykuVeDinlenme: { puan: 9.0, seviye: 'Düzenli (8+ Saat)', aciklama: 'Uyku ritmi ve rejenerasyon korunuş.' },
        genelFarkindalik: 'Örnek & Bilinçli',
        egitmenGorus: 'Sporcumuz fiziksel testleri ve antrenman disipliniyle takdir toplamaktadır.',
      },
      genelDegerlendirme: rep.expertComment || 'Fiziksel ve biyomotor yetenek gelişim süreci yüksek performansla devam etmektedir.',
    },
    expertComment: rep.expertComment,
    antrenorNotu: rep.expertComment || 'Antrenman devamlılığı ve test performansı yüksek düzeydedir.',
    gelisimAlanlari: ['Patlayıcı Güç', 'Denge'],
    veliAdSoyad: rep.parentInfo?.anneAdSoyad || rep.parentInfo?.babaAdSoyad || `${rep.athleteName.split(' ').slice(-1)[0]} Velisi`,
    veliTelefon: rep.parentInfo?.anneKilo ? '+90 535 600 77 33' : '+90 532 555 01 23',
    veliEposta: `veli.${rep.athleteName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
    veliYakinlik: rep.parentInfo?.anneAdSoyad ? 'Anne' : 'Diğer',
  };
}

/**
 * Fetches all SportsFlyLabReports from Firestore collection 'labReports'
 */
export async function fetchFirestoreLabReports(): Promise<SportsFlyLabReport[]> {
  const path = 'labReports';
  try {
    const snap = await getDocs(collection(db, path));
    const results: SportsFlyLabReport[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data && (data.athleteName || data.reportSnapshot)) {
        const rep = (data.reportSnapshot || data) as SportsFlyLabReport;
        results.push(rep);
      }
    });
    return results;
  } catch (error) {
    console.warn('[KarneFirestoreService] fetchFirestoreLabReports fallback/error:', error);
    return [];
  }
}

/**
 * Subscribes in realtime to SportsFlyLabReports in Firestore collection 'labReports'
 */
export function subscribeFirestoreLabReports(
  onData: (reports: SportsFlyLabReport[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'labReports';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const results: SportsFlyLabReport[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data && (data.athleteName || data.reportSnapshot)) {
          const rep = (data.reportSnapshot || data) as SportsFlyLabReport;
          results.push(rep);
        }
      });
      onData(results);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('[KarneFirestoreService] subscribeFirestoreLabReports warning:', error);
    }
  );
}

/**
 * Fetches all SporcuKarne documents from Firestore collection 'karneler'
 */
export async function fetchFirestoreKarneler(): Promise<SporcuKarne[]> {
  const path = 'karneler';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SporcuKarne));
  } catch (error) {
    console.warn('[KarneFirestoreService] fetchFirestoreKarneler fallback/error:', error);
    return [];
  }
}

/**
 * Subscribes in realtime to SporcuKarne documents in Firestore collection 'karneler'
 */
export function subscribeFirestoreKarneler(
  onData: (karneler: SporcuKarne[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'karneler';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SporcuKarne));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('[KarneFirestoreService] subscribeFirestoreKarneler warning:', error);
    }
  );
}

/**
 * Subscribes in realtime to Firestore collection 'sporcular' to sync athlete training profiles
 */
export function subscribeFirestoreSporcular(
  onData: (sporcular: FirestoreSporcuDoc[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'sporcular';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreSporcuDoc));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('[KarneFirestoreService] subscribeFirestoreSporcular warning:', error);
    }
  );
}

/**
 * Saves or updates a report card (SporcuKarne) in Firestore collection 'karneler'
 */
export async function saveKarneToFirestore(karne: SporcuKarne): Promise<void> {
  const docId = karne.id;
  const path = `karneler/${docId}`;
  try {
    await setDoc(doc(db, 'karneler', docId), {
      ...karne,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves or updates a lab report (SportsFlyLabReport) in Firestore collection 'labReports'
 */
export async function saveLabReportToFirestore(report: SportsFlyLabReport): Promise<void> {
  const docId = report.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `labReports/${docId}`;
  try {
    const cleanSnapshot: SportsFlyLabReport = JSON.parse(JSON.stringify(report));
    if (cleanSnapshot.clubLogoUrl && cleanSnapshot.clubLogoUrl.startsWith('data:image/')) {
      delete cleanSnapshot.clubLogoUrl;
    }
    await setDoc(doc(db, 'labReports', docId), {
      ...cleanSnapshot,
      reportId: docId,
      athleteName: cleanSnapshot.athleteName,
      athleteCode: cleanSnapshot.athleteCode,
      sportBranch: cleanSnapshot.sportBranch,
      overallScore:
        cleanSnapshot.scoreHistory?.p3Score ||
        cleanSnapshot.scoreHistory?.p1Score ||
        cleanSnapshot.scoreHistory?.p2Score ||
        80,
      reportSnapshot: cleanSnapshot,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Batch saves multiple SportsFlyLabReport records to Firestore collection 'labReports'
 */
export async function saveLabReportsBatchToFirestore(
  reports: SportsFlyLabReport[]
): Promise<void> {
  if (!reports || reports.length === 0) return;
  const CHUNK_SIZE = 350;
  try {
    for (let i = 0; i < reports.length; i += CHUNK_SIZE) {
      const chunk = reports.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((report) => {
        const docId = report.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
        const cleanSnapshot: SportsFlyLabReport = JSON.parse(JSON.stringify(report));
        if (cleanSnapshot.clubLogoUrl && cleanSnapshot.clubLogoUrl.startsWith('data:image/')) {
          delete cleanSnapshot.clubLogoUrl;
        }
        batch.set(doc(db, 'labReports', docId), {
          ...cleanSnapshot,
          reportId: docId,
          athleteName: cleanSnapshot.athleteName,
          athleteCode: cleanSnapshot.athleteCode,
          sportBranch: cleanSnapshot.sportBranch,
          overallScore:
            cleanSnapshot.scoreHistory?.p3Score ||
            cleanSnapshot.scoreHistory?.p1Score ||
            cleanSnapshot.scoreHistory?.p2Score ||
            80,
          reportSnapshot: cleanSnapshot,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    console.warn('[KarneFirestoreService] saveLabReportsBatchToFirestore warning:', error);
  }
}
export interface UploadedFileDoc {
  id: string;
  name: string;
  athleteCount: number;
  status: 'Bekliyor' | 'İşlendi' | 'Onaylandı';
  schoolName: string;
  uploadDate: string;
  ownerId: string;
}

/**
 * Fetches all UploadedFiles from Firestore collection 'uploadedFiles'
 */
export async function fetchUploadedFiles(): Promise<UploadedFileDoc[]> {
  const path = 'uploadedFiles';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UploadedFileDoc));
  } catch (error) {
    console.warn('[KarneFirestoreService] fetchUploadedFiles fallback/error:', error);
    return [];
  }
}

/**
 * Subscribes in realtime to UploadedFiles in Firestore collection 'uploadedFiles'
 */
export function subscribeUploadedFiles(
  onData: (files: UploadedFileDoc[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'uploadedFiles';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as UploadedFileDoc & { deleted?: boolean }))
        .filter((d) => !d.deleted);
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('[KarneFirestoreService] subscribeUploadedFiles warning:', error);
    }
  );
}

/**
 * Updates an UploadedFile status in Firestore collection 'uploadedFiles'
 */
export async function updateUploadedFileStatus(fileId: string, status: 'Bekliyor' | 'İşlendi' | 'Onaylandı'): Promise<void> {
  const docId = fileId;
  const path = `uploadedFiles/${docId}`;
  try {
    await setDoc(doc(db, 'uploadedFiles', docId), { status }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Saves a new UploadedFile to Firestore collection 'uploadedFiles'
 */
export async function saveUploadedFileToFirestore(fileDoc: UploadedFileDoc): Promise<void> {
  const docId = fileDoc.id;
  const path = `uploadedFiles/${docId}`;
  try {
    await setDoc(doc(db, 'uploadedFiles', docId), {
      ...fileDoc,
      ownerId: auth.currentUser?.uid || fileDoc.ownerId || 'system-user',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes an UploadedFile from Firestore collection 'uploadedFiles'
 */
export async function deleteUploadedFileFromFirestore(fileId: string): Promise<void> {
  const docId = fileId;
  const path = `uploadedFiles/${docId}`;
  try {
    await setDoc(doc(db, 'uploadedFiles', docId), { deleted: true }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

function sanitizeArchiveEntryForFirestore(entry: SportsFlyLabArchivedReport): Record<string, any> {
  const cleanSnapshot: SportsFlyLabReport = JSON.parse(JSON.stringify(entry.reportSnapshot));
  if (cleanSnapshot.clubLogoUrl && cleanSnapshot.clubLogoUrl.startsWith('data:image/')) {
    delete cleanSnapshot.clubLogoUrl;
  }
  const schoolName = (entry.schoolName || cleanSnapshot.clubName || 'SportsFly Spor Okulu').slice(0, 180);
  cleanSnapshot.clubName = schoolName;

  const createdDateIso = normalizeArchiveDateIso(entry);
  const resolvedSavedAt =
    entry.savedAt && entry.savedAt.trim().length >= 2
      ? entry.savedAt.trim().slice(0, 64)
      : createdDateIso;

  const payload: Record<string, any> = {
    archiveId: entry.archiveId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128),
    archiveTitle: (entry.archiveTitle || `${cleanSnapshot.athleteName} Karnesi`).slice(0, 240),
    savedAt: resolvedSavedAt,
    savedTimestamp: Number(entry.savedTimestamp) || Date.now(),
    createdDateIso,
    schoolName,
    sourceType: entry.sourceType === 'batch' ? 'batch' : 'single',
    athleteName: (cleanSnapshot.athleteName || '').slice(0, 140),
    sportBranch: (cleanSnapshot.sportBranch || '').slice(0, 100),
    reportSnapshot: cleanSnapshot,
    updatedAt: serverTimestamp(),
  };

  if (entry.archiveNote) {
    payload.archiveNote = entry.archiveNote.slice(0, 500);
  }
  if (entry.batchId) {
    payload.batchId = entry.batchId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  }
  if (entry.batchGroupTitle) {
    payload.batchGroupTitle = entry.batchGroupTitle.slice(0, 200);
  }
  return payload;
}

/**
 * Fetches all archived SportsFly Lab report cards from Firestore collection 'labArchives'
 */
export async function fetchFirestoreLabArchives(): Promise<SportsFlyLabArchivedReport[]> {
  const path = 'labArchives';
  try {
    const snap = await getDocs(collection(db, path));
    const list: SportsFlyLabArchivedReport[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data && data.reportSnapshot) {
        list.push({
          archiveId: data.archiveId || d.id,
          archiveTitle: data.archiveTitle || 'Kayıtlı Karne',
          archiveNote: data.archiveNote,
          savedAt: data.savedAt || '',
          savedTimestamp: Number(data.savedTimestamp) || Date.now(),
          createdDateIso: data.createdDateIso || normalizeArchiveDateIso(data),
          schoolName: data.schoolName || data.reportSnapshot?.clubName || 'SportsFly Spor Okulu',
          batchId: data.batchId,
          batchGroupTitle: data.batchGroupTitle,
          sourceType: data.sourceType || (data.batchId ? 'batch' : 'single'),
          reportSnapshot: data.reportSnapshot as SportsFlyLabReport,
        });
      }
    });
    return list.sort((a, b) => (b.savedTimestamp || 0) - (a.savedTimestamp || 0));
  } catch (error) {
    console.warn('[KarneFirestoreService] fetchFirestoreLabArchives fallback:', error);
    return [];
  }
}

export async function saveLabArchiveToFirestore(entry: SportsFlyLabArchivedReport): Promise<void> {
  const payload = sanitizeArchiveEntryForFirestore(entry);
  const path = `labArchives/${payload.archiveId}`;
  try {
    await setDoc(doc(db, 'labArchives', payload.archiveId), payload);
  } catch (error) {
    console.warn('[KarneFirestoreService] saveLabArchiveToFirestore warning:', path, error);
  }
}

export async function saveLabArchivesBatchToFirestore(
  entries: SportsFlyLabArchivedReport[]
): Promise<void> {
  if (!entries || entries.length === 0) return;
  const CHUNK_SIZE = 350;
  try {
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((entry) => {
        const payload = sanitizeArchiveEntryForFirestore(entry);
        batch.set(doc(db, 'labArchives', payload.archiveId), payload);
      });
      await batch.commit();
    }
  } catch (error) {
    console.warn('[KarneFirestoreService] saveLabArchivesBatchToFirestore warning:', error);
  }
}

export async function updateLabArchiveMetaInFirestore(
  entry: SportsFlyLabArchivedReport
): Promise<void> {
  return saveLabArchiveToFirestore(entry);
}

export async function deleteLabArchiveFromFirestore(archiveId: string): Promise<void> {
  const safeId = archiveId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  try {
    await deleteDoc(doc(db, 'labArchives', safeId));
  } catch (error) {
    console.warn('[KarneFirestoreService] deleteLabArchiveFromFirestore warning:', error);
  }
}

export async function deleteLabArchivesBatchFromFirestore(archiveIds: string[]): Promise<void> {
  if (!archiveIds || archiveIds.length === 0) return;
  const CHUNK_SIZE = 350;
  try {
    for (let i = 0; i < archiveIds.length; i += CHUNK_SIZE) {
      const chunk = archiveIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
        batch.delete(doc(db, 'labArchives', safeId));
      });
      await batch.commit();
    }
  } catch (error) {
    console.warn('[KarneFirestoreService] deleteLabArchivesBatchFromFirestore warning:', error);
  }
}

