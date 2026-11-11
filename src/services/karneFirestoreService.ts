import {
  collection,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { SporcuKarne } from '../data/mockKarneData';
import { SportsFlyLabReport, ensureDataConsistency } from '../data/sportsFlyLabData';
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
  const docId = report.id;
  const path = `labReports/${docId}`;
  try {
    await setDoc(doc(db, 'labReports', docId), {
      ...report,
      reportId: report.id,
      athleteName: report.athleteName,
      athleteCode: report.athleteCode,
      sportBranch: report.sportBranch,
      overallScore: report.scoreHistory?.p2Score || report.scoreHistory?.p1Score || 80,
      reportSnapshot: report,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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

