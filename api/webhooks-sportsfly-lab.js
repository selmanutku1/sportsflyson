import fs from 'fs';
import path from 'path';

const TMP_FILE = path.join('/tmp', 'sportsfly-lab-webhook-athletes.json');

function normalizeWebhookAthleteRow(raw = {}, index = 0, batchMeta = {}) {
  const nested = {
    ...(typeof raw.measurements === 'object' && raw.measurements ? raw.measurements : {}),
    ...(typeof raw.anthropometric === 'object' && raw.anthropometric ? raw.anthropometric : {}),
    ...(typeof raw.motor === 'object' && raw.motor ? raw.motor : {}),
    ...(typeof raw.bodyComposition === 'object' && raw.bodyComposition ? raw.bodyComposition : {}),
    ...(typeof raw.metrics === 'object' && raw.metrics ? raw.metrics : {}),
    ...raw,
  };

  const pickVal = (...keys) => {
    for (const k of keys) {
      if (nested[k] !== undefined && nested[k] !== null && String(nested[k]).trim() !== '') {
        return nested[k];
      }
    }
    return undefined;
  };

  const athleteName = String(
    pickVal(
      'Sporcu_Adi',
      'sporcuAdi',
      'athleteName',
      'adSoyad',
      'fullName',
      'name',
      'studentName',
      'ogrenciAdi'
    ) || `Sporcu ${index + 1}`
  ).trim();

  const sportBranch = String(
    pickVal('Brans', 'brans', 'sportBranch', 'branch', 'sport', 'kategori') ||
      batchMeta.branch ||
      'Genel Spor Gelişimi'
  ).trim();

  const rawGender = String(
    pickVal('Cinsiyet', 'cinsiyet', 'gender', 'sex') || 'Erkek'
  ).trim();
  const gender = /^(k|kadın|kadin|kız|kiz|f|female|girl)/i.test(rawGender)
    ? 'Kadın'
    : 'Erkek';

  const birthDate = String(
    pickVal('Dogum_Tarihi', 'dogumTarihi', 'birthDate', 'dob', 'birth_date') || ''
  ).trim();

  const age = pickVal('Yas', 'yas', 'age', 'ageYears', 'kronolojikYas');
  const date1 = String(
    pickVal('Olcum_1_Tarihi', 'olcumTarihi', 'measurementDate', 'testDate', 'date', 'tarih') ||
      batchMeta.measurementDate ||
      new Date().toLocaleDateString('tr-TR')
  ).trim();

  const normalized = {
    ...nested,
    Webhook_Row_ID: String(pickVal('id', 'athleteId', 'sporcuId', 'tcNo') || `wh-${Date.now()}-${index}`),
    Sporcu_Adi: athleteName,
    Brans: sportBranch,
    Cinsiyet: gender,
  };

  if (birthDate) normalized.Dogum_Tarihi = birthDate;
  if (age !== undefined) normalized.Yas = age;
  if (date1) normalized.Olcum_1_Tarihi = date1;

  const metricMappings = [
    ['Boy_1', ['Boy_1', 'boy', 'boy1', 'height', 'heightCm', 'boyCm']],
    ['Boy_2', ['Boy_2', 'boy2', 'height2']],
    ['Agirlik_1', ['Agirlik_1', 'kilo', 'agirlik', 'kilo1', 'weight', 'weightKg']],
    ['Agirlik_2', ['Agirlik_2', 'kilo2', 'agirlik2', 'weight2']],
    ['Oturma_Boyu_1', ['Oturma_Boyu_1', 'oturmaBoyu', 'sittingHeight', 'torsoHeight']],
    ['Bacak_Boyu_1', ['Bacak_Boyu_1', 'bacakBoyu', 'legLength']],
    ['Kulaç_Uzunlugu_1', ['Kulaç_Uzunlugu_1', 'kulacUzunlugu', 'kulac', 'armSpan', 'wingspan']],
    ['BKI_1', ['BKI_1', 'bki', 'bmi', 'vki']],
    ['Vucut_Yagi_1', ['Vucut_Yagi_1', 'vucutYagi', 'yagOrani', 'bodyFat', 'fatPercentage']],
    ['Kas_Kutlesi_1', ['Kas_Kutlesi_1', 'kasKutlesi', 'muscleMass']],
    ['Anne_Boyu', ['Anne_Boyu', 'anneBoyu', 'motherHeight']],
    ['Baba_Boyu', ['Baba_Boyu', 'babaBoyu', 'fatherHeight']],
    ['Dikey_Sicrama_1', ['Dikey_Sicrama_1', 'dikeySicrama', 'verticalJump', 'cmj']],
    ['Durarak_Uzun_Atlama_1', ['Durarak_Uzun_Atlama_1', 'uzunAtlama', 'durarakUzunAtlama', 'standingLongJump', 'broadJump']],
    ['Surat_1', ['Surat_1', 'surat', 'sprint', 'sprint20m', 'sprint10m', 'sprint30m', 'hiz']],
    ['Ceviklik_1', ['Ceviklik_1', 'ceviklik', 'agility', 'proAgility', 'illinois', 'tTest']],
    ['Esneklik_1', ['Esneklik_1', 'esneklik', 'oturUzan', 'flexibility', 'sitAndReach']],
    ['Denge_1', ['Denge_1', 'denge', 'flamingo', 'flamingoBalance', 'balance']],
    ['El_Pence_Sag_1', ['El_Pence_Sag_1', 'penceSag', 'elPenceSag', 'gripStrengthRight', 'gripStrength', 'handgrip']],
    ['El_Pence_Sol_1', ['El_Pence_Sol_1', 'penceSol', 'elPenceSol', 'gripStrengthLeft']],
    ['Saglik_Topu_1', ['Saglik_Topu_1', 'saglikTopu', 'medicineBall', 'medicineBallThrow']],
    ['Mekik_Kosu_1', ['Mekik_Kosu_1', 'mekikKosu', 'mekik', 'shuttleRun', 'beepTest']],
    ['VO2max_1', ['VO2max_1', 'vo2max', 'vo2Max', 'aerobikKapasite']],
    ['Reaksiyon_1', ['Reaksiyon_1', 'reaksiyon', 'reactionTime']],
    ['Koordinasyon_1', ['Koordinasyon_1', 'koordinasyon', 'coordination']],
  ];

  for (const [targetCol, aliases] of metricMappings) {
    const val = pickVal(...aliases);
    if (val !== undefined) {
      normalized[targetCol] = val;
    }
  }

  return normalized;
}

function loadStore() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_FILE, 'utf-8'));
      if (Array.isArray(parsed)) {
        globalThis.__SPORTSFLY_LAB_WEBHOOK_STORE__ = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore read error
  }
  if (Array.isArray(globalThis.__SPORTSFLY_LAB_WEBHOOK_STORE__)) {
    return globalThis.__SPORTSFLY_LAB_WEBHOOK_STORE__;
  }
  globalThis.__SPORTSFLY_LAB_WEBHOOK_STORE__ = [];
  return globalThis.__SPORTSFLY_LAB_WEBHOOK_STORE__;
}

function saveStore(list) {
  const cleaned = (Array.isArray(list) ? list : []).slice(0, 50);
  globalThis.__SPORTSFLY_LAB_WEBHOOK_STORE__ = cleaned;
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(cleaned, null, 2), 'utf-8');
  } catch {
    // ignore write error
  }
  return cleaned;
}

function applyCors(req, res) {
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Origin, Authorization, X-Webhook-Secret, X-API-Key, X-CSRF-Token, X-Requested-With'
  );
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const store = loadStore();
  const allAthletes = store.flatMap((b) => b.athletes || []);
  const urlPath = String(req.url || '').split('?')[0];
  const isStreamRequest =
    req.query?.stream === '1' ||
    urlPath.endsWith('/stream') ||
    String(req.headers?.accept || '').includes('text/event-stream');

  if (req.method === 'GET' && isStreamRequest) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const payload = JSON.stringify({
      action: 'init',
      batches: store,
      athletes: allAthletes,
      totalAthletes: allAthletes.length,
      timestamp: Date.now(),
    });

    res.write(`retry: 3000\n\nevent: webhook_athletes\ndata: ${payload}\n\n`);
    return res.end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      endpoint: '/api/webhooks/sportsfly-lab',
      method: 'POST',
      status: 'active',
      totalBatches: store.length,
      totalAthletes: allAthletes.length,
      batches: store,
      athletes: allAthletes,
    });
  }

  if (req.method === 'POST') {
    let rawBody = req.body || {};
    if (typeof rawBody === 'string') {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        rawBody = {};
      }
    }

    const schoolName = String(
      rawBody?.schoolName ||
        rawBody?.clubName ||
        rawBody?.kulupAdi ||
        rawBody?.sporOkuluAdi ||
        rawBody?.organization ||
        'Dış Yazılım Webhook Aktarımı'
    ).trim();

    const sourceSoftware = String(
      rawBody?.source ||
        rawBody?.software ||
        rawBody?.platform ||
        req.headers?.['x-source-software'] ||
        'Harici Spor Yazılımı (Webhook)'
    ).trim();

    const defaultBranch = String(rawBody?.branch || rawBody?.sportBranch || rawBody?.brans || '').trim();
    const defaultDate = String(rawBody?.measurementDate || rawBody?.olcumTarihi || rawBody?.date || '').trim();

    let rawList = [];
    if (Array.isArray(rawBody)) {
      rawList = rawBody;
    } else if (Array.isArray(rawBody?.athletes)) {
      rawList = rawBody.athletes;
    } else if (Array.isArray(rawBody?.sporcular)) {
      rawList = rawBody.sporcular;
    } else if (Array.isArray(rawBody?.data)) {
      rawList = rawBody.data;
    } else if (Array.isArray(rawBody?.items)) {
      rawList = rawBody.items;
    } else if (Array.isArray(rawBody?.rows)) {
      rawList = rawBody.rows;
    } else if (Array.isArray(rawBody?.records)) {
      rawList = rawBody.records;
    } else if (Array.isArray(rawBody?.students)) {
      rawList = rawBody.students;
    } else if (rawBody && typeof rawBody === 'object' && Object.keys(rawBody).length > 0) {
      rawList = [rawBody];
    }

    if (rawList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Webhook gövdesinde (JSON body) sporcu verisi bulunamadı.',
      });
    }

    const normalizedAthletes = rawList
      .filter((item) => item && typeof item === 'object')
      .map((item, idx) =>
        normalizeWebhookAthleteRow(item, idx, {
          schoolName,
          branch: defaultBranch,
          measurementDate: defaultDate,
        })
      );

    const newBatch = {
      batchId: `WH-BATCH-${Date.now()}`,
      receivedAt: new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' }).slice(0, 19),
      sourceSoftware,
      schoolName,
      athletes: normalizedAthletes,
    };

    saveStore([newBatch, ...store]);

    return res.status(200).json({
      success: true,
      message: `${normalizedAthletes.length} sporcu verisi SportsFly Lab karne sistemine başarıyla aktarıldı.`,
      batchId: newBatch.batchId,
      receivedCount: normalizedAthletes.length,
      schoolName,
      sourceSoftware,
      athletes: normalizedAthletes,
    });
  }

  if (req.method === 'DELETE') {
    saveStore([]);
    return res.status(200).json({
      success: true,
      message: 'Webhook kuyruğu temizlendi.',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
