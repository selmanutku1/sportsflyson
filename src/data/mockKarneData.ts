export interface SporcuKarne {
  id: string;
  sporcuId: string;
  adSoyad: string;
  brans: string;
  grup: string;
  yasGubu: string;
  tarih: string; // Report date
  antrenor: string;
  boy: number; // cm
  kilo: number; // kg
  
  // Heath-Carter Somatotype Profile (Optional)
  somatotype?: {
    endo: number; // Endomorfi (1-10)
    meso: number; // Mezomorfi (1-10)
    ecto: number; // Ektomorfi (1-10)
    category: string; // e.g. "Dengeli Mezomorf", "Mezomorfik Ektomorf"
    m1?: { endo: number; meso: number; ecto: number; category: string };
    m2?: { endo: number; meso: number; ecto: number; category: string };
    m3?: { endo: number; meso: number; ecto: number; category: string };
    eliteRef?: {
      endo: number;
      meso: number;
      ecto: number;
    };
  };
  
  // Evaluation categories (out of 10)
  teknik: {
    topKontrolu?: number;
    pasBasarisi?: number;
    sut?: number;
    topSurme?: number;
    savunma?: number;
    ortalama: number;
  };
  fiziksel: {
    hiz?: number;
    dayaniklilik?: number;
    guc?: number;
    ceviklik?: number;
    ortalama: number;
  };
  taktiksel: {
    oyunZekasi?: number;
    pozisyonAlma?: number;
    kararVerme?: number;
    ortalama: number;
  };
  zihinsel: {
    disiplin?: number;
    ozguven?: number;
    takimUyumu?: number;
    liderlik?: number;
    ortalama: number;
  };

  // Additional Stats
  katilimYuzdesi: number;
  antrenmanSayisi: number;
  
  // Behavioral Development Process
  davranissal: {
    kriterler: {
      fairPlay: number;
      sorumlulukEkipman: number;
      saygiIletisim: number;
      yonergeyeUyum: number;
      duyguKontrolu: number;
      ortalama: number;
    };
    kazanimlar: {
      id?: string;
      rozetId?: string;
      baslik: string;
      aciklama: string;
      kategori?: string;
      tarih?: string;
      onemDerecesi?: string;
    }[];
    surecTakibi: {
      donem: string;
      tarih: string;
      durum: 'Gelişiyor' | 'Hedefe Ulaştı' | 'Örnek Davranış';
      odakKonusu: string;
      gozlem: string;
    }[];
    bagimlilikVeAliskanlik?: {
      ekranDengesi: {
        puan: number;
        seviye: 'Dengeli & Bilinçli' | 'Geliştirilmeli' | 'Riskli';
        aciklama: string;
      };
      zararliAliskanlik: {
        puan: number;
        seviye: 'Bilinçli (Örnek)' | 'Takip Ediliyor' | 'Riskli' | 'Temiz Spor (Örnek)';
        aciklama: string;
      };
      uykuVeDinlenme: {
        puan: number;
        seviye: 'Düzenli (8+ Saat)' | 'Düzensiz' | 'Yetersiz';
        aciklama: string;
      };
      genelFarkindalik: 'Örnek & Bilinçli' | 'Dengeli' | 'Destek Gerekli';
      egitmenGorus: string;
    };
    genelDegerlendirme: string;
  };

  // Notes
  antrenorNotu: string;
  gelisimAlanlari: string[];
  expertComment?: string; // Uzman Görüşü (SportsFly Lab entegrasyonu)

  // Veli ve İletişim Bilgileri (WhatsApp / SMS Gönderimi için)
  veliAdSoyad?: string;
  veliTelefon?: string;
  veliEposta?: string;
  veliYakinlik?: 'Anne' | 'Baba' | 'Vasi' | 'Diğer';
}

export const INITIAL_KARNELER: SporcuKarne[] = [];

export const KARNELER_STORAGE_KEY = 'sportsfly_karneler_store_v1';

export function getStoredKarneler(): SporcuKarne[] {
  if (typeof window === 'undefined') return INITIAL_KARNELER;
  try {
    const raw = localStorage.getItem(KARNELER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((k: any) => {
          if (k?.davranissal?.bagimlilikVeAliskanlik?.zararliAliskanlik?.seviye === 'Temiz Spor (Örnek)') {
            k.davranissal.bagimlilikVeAliskanlik.zararliAliskanlik.seviye = 'Bilinçli (Örnek)';
          }
          if (k?.davranissal?.bagimlilikVeAliskanlik?.zararliAliskanlik?.aciklama) {
            k.davranissal.bagimlilikVeAliskanlik.zararliAliskanlik.aciklama = k.davranissal.bagimlilikVeAliskanlik.zararliAliskanlik.aciklama
              .replace(/temiz sporcu kimliği/gi, 'sağlıklı sporcu disiplini')
              .replace(/temiz spor/gi, 'sağlıklı yaşam');
          }
          // Fix legacy sporcuId mappings
          if (k.sporcuId === 's1' || k.adSoyad === 'Kaan Yıldırım') {
            k.sporcuId = 's-3';
          } else if (k.sporcuId === 's2' || k.adSoyad === 'Selman Utku') {
            k.sporcuId = 's-1';
          } else if (k.sporcuId === 's3' || k.adSoyad === 'Zeynep Kaya') {
            k.sporcuId = 's-2';
          } else if (k.sporcuId === 's4' || k.adSoyad === 'Melis Aksoy') {
            k.sporcuId = 's-4';
          } else if (k.sporcuId === 's5' || k.adSoyad === 'Defne Şahin') {
            k.sporcuId = 's-5';
          }
          // Ensure parent info exists
          if (!k.veliTelefon) {
            const initialMatch = INITIAL_KARNELER.find(ik => ik.id === k.id || ik.adSoyad === k.adSoyad);
            if (initialMatch) {
              k.veliAdSoyad = initialMatch.veliAdSoyad;
              k.veliTelefon = initialMatch.veliTelefon;
              k.veliEposta = initialMatch.veliEposta;
              k.veliYakinlik = initialMatch.veliYakinlik;
            } else {
              const surname = (k.adSoyad || '').split(' ').slice(-1)[0] || 'Veli';
              k.veliAdSoyad = `Ahmet ${surname}`;
              k.veliTelefon = '+90 532 555 01 23';
              k.veliEposta = `veli.${surname.toLowerCase()}@gmail.com`;
              k.veliYakinlik = 'Veli';
            }
          }
          return k;
        });
      }
    }
  } catch (e) {
    console.error('Error reading karneler from localStorage', e);
  }
  return INITIAL_KARNELER;
}

export function saveStoredKarneler(karneler: SporcuKarne[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KARNELER_STORAGE_KEY, JSON.stringify(karneler));
    window.dispatchEvent(new CustomEvent('sportsfly_karneler_updated', { detail: { karneler } }));
  } catch (e) {
    console.error('Error saving karneler to localStorage', e);
  }
}
