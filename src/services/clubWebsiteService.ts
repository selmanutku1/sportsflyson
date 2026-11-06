import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ClubWebsiteConfig } from '../types/websiteTypes';
import { getStoredUserProfile } from '../data/userProfile';

export const WEBSITE_STORAGE_KEY = 'sportsfly_club_website_config_v1';
export const WEBSITE_DOC_ID = 'primary';

export const DEFAULT_WEBSITE_CONFIG: ClubWebsiteConfig = {
  id: WEBSITE_DOC_ID,
  subdomain: 'atasehir-spor',
  customDomain: '',
  isPublished: true,
  layoutTheme: 'modern',
  siteTitle: 'Ataşehir Spor Kulübü & Akademi',
  tagline: 'Geleceğin Şampiyonlarını Bilimsel Antrenman ve Değerler Eğitimiyle Yetiştiriyoruz',
  aboutText: 'Kulübümüz, 2018 yılından bu yana 500\'ü aşkın lisanslı sporcu ve spor okulu öğrencisine profesyonel antrenör kadrosu, modern kapalı spor salonları ve uluslararası standartlarda ölçüm analizleriyle hizmet vermektedir.',
  missionText: 'Çocuklarımızın fiziksel, zihinsel ve sosyal gelişimlerini destekleyerek spor ahlakını benimsemiş, özgüvenli ve sağlıklı bireyler yetiştirmek en büyük tutkumuzdur.',
  logoUrl: '',
  heroImageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&auto=format&fit=crop&q=80',
  primaryColor: '#0284c7', // Sky-600
  secondaryColor: '#f97316', // Orange-500
  darkTheme: false,
  
  gallery: [
    {
      id: 'g-1',
      url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=900&auto=format&fit=crop&q=80',
      title: 'U14 Basketbol Antrenmanı & Taktik Çalışması',
      category: 'Antrenman',
    },
    {
      id: 'g-2',
      url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900&auto=format&fit=crop&q=80',
      title: 'Kondisyon & Atletik Performans Seansı',
      category: 'Antrenman',
    },
    {
      id: 'g-3',
      url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=900&auto=format&fit=crop&q=80',
      title: 'Voleybol Altyapı Hazırlık Maçı',
      category: 'Maç & Turnuva',
    },
    {
      id: 'g-4',
      url: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=900&auto=format&fit=crop&q=80',
      title: 'Temel Cimnastik & Denge Eğitimi',
      category: 'Antrenman',
    },
    {
      id: 'g-5',
      url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop&q=80',
      title: 'Yarıyıl Şampiyonluk Kupası Töreni',
      category: 'Etkinlik',
    },
    {
      id: 'g-6',
      url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&auto=format&fit=crop&q=80',
      title: 'Merkez Kapalı Spor Kompleksimiz',
      category: 'Tesis',
    },
  ],

  branches: [
    {
      id: 'b-1',
      name: 'Basketbol Okulu & Altyapı',
      ageGroup: '6 - 16 Yaş',
      schedule: 'Cumartesi & Pazar: 09:30 - 13:30',
      description: 'Temel top hakimiyeti, şut mekaniği, savunma disiplini ve takım uyumu odaklı profesyonel antrenmanlar.',
      fee: '2.400 ₺ / Ay',
      iconName: 'Trophy',
      figureKey: 'basketbol',
      badge: 'Popüler Branş',
      isActive: true,
    },
    {
      id: 'b-2',
      name: 'Voleybol Gelişim Akademisi',
      ageGroup: '7 - 15 Yaş',
      schedule: 'Hafta Sonu: 11:00 - 15:00',
      description: 'Manşet, pas, smaç ve servis teknikleri ile oyun görüşü geliştirme.',
      fee: '2.250 ₺ / Ay',
      iconName: 'Activity',
      figureKey: 'voleybol',
      isActive: true,
    },
    {
      id: 'b-3',
      name: 'Temel Jimnastik & Koordinasyon',
      ageGroup: '4 - 8 Yaş',
      schedule: 'Cumartesi - Pazar: 10:00 - 12:00',
      description: 'Erken yaşta esneklik, postür düzeltme, çeviklik ve motor becerileri güçlendirme.',
      fee: '2.100 ₺ / Ay',
      iconName: 'Sparkles',
      figureKey: 'cimnastik',
      badge: 'Minikler Özel',
      isActive: true,
    },
    {
      id: 'b-4',
      name: 'Yüzme & Su Sporları',
      ageGroup: '5 - 14 Yaş',
      schedule: 'Salı & Perşembe: 16:30 - 18:00',
      description: 'Yarı olimpik ısıtmalı kapalı havuzda stil eğitimi ve dayanıklılık.',
      fee: '2.800 ₺ / Ay',
      iconName: 'Waves',
      figureKey: 'yuzme',
      isActive: true,
    },
  ],

  coaches: [
    {
      id: 'c-1',
      name: 'Burak Sergen',
      role: 'Baş Antrenör (Basketbol)',
      experience: '12 Yıl Deneyim · 2. Kademe Antrenör',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      bio: 'Eski profesyonel lig oyuncusu. Altyapı takımlarıyla 3 kez İstanbul şampiyonluğu bulunmaktadır.',
    },
    {
      id: 'c-2',
      name: 'Ebru Yıldız',
      role: 'Voleybol Koordinatörü',
      experience: '9 Yıl Deneyim · BESYO Mezunu',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      bio: 'Marmara Üniversitesi Spor Bilimleri Fakültesi mezunu. Kız altyapı gelişim programı yöneticisi.',
    },
    {
      id: 'c-3',
      name: 'Kemal Aksoy',
      role: 'Atletik Performans & Kondisyon Koçu',
      experience: '8 Yıl Deneyim · CSCS Sertifikalı',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      bio: 'Somatotip analizi, PHV boy uzama takibi ve sakatlık önleyici kuvvet antrenmanları uzmanı.',
    },
  ],

  contact: {
    phone: '0216 850 1907',
    whatsapp: '905321234567',
    email: 'bilgi@atasehirspor.com',
    address: 'Atatürk Mahallesi, Spor Caddesi No: 12, Ataşehir',
    city: 'İstanbul',
    workingHours: 'Hafta içi: 09:00 - 19:30 | Hafta sonu: 08:30 - 18:00',
    mapEmbedQuery: 'Ataşehir Spor Kompleksi, İstanbul',
  },

  social: {
    instagram: 'https://instagram.com/atasehirsporokulu',
    facebook: 'https://facebook.com/atasehirsporokulu',
    youtube: 'https://youtube.com/@atasehirspor',
    twitter: 'https://twitter.com/atasehirsk',
  },

  stats: {
    activeAthletes: 420,
    championships: 18,
    expertCoaches: 14,
    facilitiesCount: 3,
  },

  features: {
    showOnlineRegistration: true,
    showGallery: true,
    showCoaches: true,
    showSchedule: true,
    showFaq: true,
    showStats: true,
    showAnnouncementBar: true,
    announcementText: '📢 2026-2027 Kış Dönemi Spor Okulu Erken Kayıt Avantajları Başladı! Kontenjanlar Sınırlıdır.',
  },

  faqs: [
    {
      question: 'Kayıt öncesi deneme antrenmanına katılabilir miyiz?',
      answer: 'Evet! Çocuğunuzun spor branşına ilgisini ve seviyesini belirlemek için tamamen ücretsiz 1 seans deneme antrenmanımıza velimizle birlikte katılabilirsiniz.',
    },
    {
      question: 'Servis ve ulaşım imkanı var mı?',
      answer: 'Ataşehir, Kadıköy ve Ümraniye güzergahlarında lisanslı okul servislerimiz ve hostes eşliğinde ulaşım hizmetimiz bulunmaktadır.',
    },
    {
      question: 'Kıyafet ve forma temini nasıl yapılıyor?',
      answer: 'Kayıt işlemi tamamlandıktan sonra sporcumuza özel isimli antrenman forması, çanta ve antrenman çorap seti kulübümüz tarafından teslim edilmektedir.',
    },
    {
      question: 'Ödemeler nasıl yapılıyor, taksit imkanı var mı?',
      answer: 'Aylık, 3 aylık ve sezonluk paket seçeneklerimizde tüm kredi kartlarına vade farksız 3 taksit veya peşin ödemede %10 kardeş indirimi uygulanmaktadır.',
    },
  ],

  seo: {
    metaDescription: 'Ataşehir Spor Kulübü ve Spor Okulu Resmi Web Sitesi. Basketbol, Voleybol, Cimnastik ve Yüzme branşlarında profesyonel eğitim. Online ön kayıt oluşturun.',
    metaKeywords: 'ataşehir spor okulu, basketbol okulu, voleybol akademisi, cimnastik kursu, çocuk spor eğitimi, sportsfly',
  },

  updatedAt: new Date().toISOString(),
};

/**
 * Gets cached/local website config, merges with userProfile club name if available.
 */
export function getStoredWebsiteConfig(): ClubWebsiteConfig {
  if (typeof window === 'undefined') return DEFAULT_WEBSITE_CONFIG;
  try {
    const raw = localStorage.getItem(WEBSITE_STORAGE_KEY) || sessionStorage.getItem(WEBSITE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_WEBSITE_CONFIG,
          ...parsed,
          contact: { ...DEFAULT_WEBSITE_CONFIG.contact, ...(parsed.contact || {}) },
          social: { ...DEFAULT_WEBSITE_CONFIG.social, ...(parsed.social || {}) },
          stats: { ...DEFAULT_WEBSITE_CONFIG.stats, ...(parsed.stats || {}) },
          features: { ...DEFAULT_WEBSITE_CONFIG.features, ...(parsed.features || {}) },
        };
      }
    }
  } catch (err) {
    console.warn('[WebsiteConfig] Failed to read local storage:', err);
  }

  // Pre-seed with active userProfile data if fresh
  const profile = getStoredUserProfile();
  if (profile?.club) {
    const slug = profile.club
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return {
      ...DEFAULT_WEBSITE_CONFIG,
      siteTitle: profile.club,
      subdomain: slug || DEFAULT_WEBSITE_CONFIG.subdomain,
      contact: {
        ...DEFAULT_WEBSITE_CONFIG.contact,
        phone: profile.phone || DEFAULT_WEBSITE_CONFIG.contact.phone,
        email: profile.email || DEFAULT_WEBSITE_CONFIG.contact.email,
        address: profile.branch ? `${profile.branch}, ${DEFAULT_WEBSITE_CONFIG.contact.city}` : DEFAULT_WEBSITE_CONFIG.contact.address,
      },
    };
  }

  return DEFAULT_WEBSITE_CONFIG;
}

/**
 * Saves website config to local & session storage, and updates Firestore.
 */
export async function saveWebsiteConfig(config: ClubWebsiteConfig): Promise<void> {
  const updated: ClubWebsiteConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(updated);
      localStorage.setItem(WEBSITE_STORAGE_KEY, serialized);
      sessionStorage.setItem(WEBSITE_STORAGE_KEY, serialized);
      window.dispatchEvent(new CustomEvent('sportsfly_website_updated', { detail: updated }));
    } catch (e) {
      console.warn('[WebsiteConfig] LocalStorage quota exceeded, continuing with Firestore:', e);
    }
  }

  try {
    const docRef = doc(db, 'club_websites', config.id || WEBSITE_DOC_ID);
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('[WebsiteConfig] Firestore sync warning:', err);
  }
}

/**
 * Fetches website config from Firestore and populates local cache.
 */
export async function fetchWebsiteConfigFromFirestore(
  docId: string = WEBSITE_DOC_ID
): Promise<ClubWebsiteConfig> {
  try {
    const docRef = doc(db, 'club_websites', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<ClubWebsiteConfig>;
      const merged: ClubWebsiteConfig = {
        ...DEFAULT_WEBSITE_CONFIG,
        ...data,
        contact: { ...DEFAULT_WEBSITE_CONFIG.contact, ...(data.contact || {}) },
        social: { ...DEFAULT_WEBSITE_CONFIG.social, ...(data.social || {}) },
        stats: { ...DEFAULT_WEBSITE_CONFIG.stats, ...(data.stats || {}) },
        features: { ...DEFAULT_WEBSITE_CONFIG.features, ...(data.features || {}) },
      };
      
      if (typeof window !== 'undefined') {
        try {
          const serialized = JSON.stringify(merged);
          localStorage.setItem(WEBSITE_STORAGE_KEY, serialized);
          sessionStorage.setItem(WEBSITE_STORAGE_KEY, serialized);
        } catch (e) {}
      }
      return merged;
    }
  } catch (err) {
    console.warn('[WebsiteConfig] Failed to fetch from Firestore:', err);
  }
  return getStoredWebsiteConfig();
}
