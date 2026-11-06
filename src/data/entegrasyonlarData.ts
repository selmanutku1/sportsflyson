import { EntegrasyonItem } from '../types';

export const INITIAL_INTEGRATIONS: EntegrasyonItem[] = [
  {
    id: 'int-sportsfly-lab',
    name: 'SportsFly Lab',
    category: 'Kulüp & Spor Modülleri',
    description: 'Beden kompozisyonu, motor performans, Heath-Carter Somatotip Analizi (Endomorfi, Mezomorfi, Ektomorfi Değişim Tablosu), kardiyorespiratuar (VO2peak) ve gelişim grafiklerini Excel ile içe aktararak profesyonel sporcu karnesi oluşturur.',
    logoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&auto=format&fit=crop&q=80',
    iconName: 'Activity',
    isRecommended: true,
    isActive: true,
    isInternalModule: true,
    targetPage: 'sportsfly-lab',
    connectedAt: '27.09.2026',
  },
  {
    id: 'int-sporpuan',
    name: 'Sporpuan İtibar & Değerlendirme',
    category: 'Kulüp & Spor Modülleri',
    description: 'Sporcu teknik, taktik, devam ve fair-play puanlama altyapısı. Dijital rozetler ve federasyon onaylı karne entegrasyonu.',
    logoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&auto=format&fit=crop&q=80',
    iconName: 'Star',
    isRecommended: true,
    isActive: true,
    isInternalModule: true,
    targetPage: 'sporpuan',
    connectedAt: '15.01.2024',
  },
  {
    id: 'int-turnuva',
    name: 'Turnuva & Fikstür Yönetimi',
    category: 'Kulüp & Spor Modülleri',
    description: 'Lig ve kupa organizasyonu, fikstür takvimi, anlık maç skoru girişi ve otomatik güncellenen puan durumu cetveli.',
    logoUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200&auto=format&fit=crop&q=80',
    iconName: 'Trophy',
    isRecommended: true,
    isActive: true,
    isInternalModule: true,
    targetPage: 'turnuva-yonetimi',
    connectedAt: '01.03.2024',
  },
  {
    id: 'int-kulup-web-sitesi',
    name: 'Kulüp Web Sitesi Portalı',
    category: 'Web Sitesi',
    description: 'Kulübünüze özel [kulup].sportsfly.com.tr adresli profesyonel web sitesi. Spor okulu görselleri, branşlar, antrenör kadrosu, online ön kayıt ve iletişim altyapısı ile anında yayında.',
    logoUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200&auto=format&fit=crop&q=80',
    iconName: 'Globe',
    badge: 'Yeni',
    isRecommended: true,
    isActive: true,
    isInternalModule: true,
    targetPage: 'kulup-web-sitesi',
    connectedAt: '24.10.2026',
  },
  {
    id: 'int-sportsfly-intelligence',
    name: 'SportsFly Intelligence AI',
    category: 'Yapay Zeka & Büyüme Asistanı',
    description: 'Akademinizin entegre büyüme asistanı. Yapay zeka destekli analizler, yenilemeleri öngörür, üye kaybını (churn) belirler ve üye tutma oranını ve performansı artırmak için önerilerde bulunur.',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    iconName: 'Sparkles',
    badge: 'Yapay Zeka',
    isRecommended: true,
    isActive: true,
    isInternalModule: true,
    targetPage: 'sportsfly-intelligence',
    connectedAt: '24.10.2026',
  },
];

const INTEGRATIONS_STORAGE_KEY = 'sportsfly_integrations_list_v2';

export function getStoredIntegrations(): EntegrasyonItem[] {
  try {
    const raw = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sync updated names and merge missing initial integrations
        const existingIds = new Set(parsed.map((item: EntegrasyonItem) => item.id));
        const missing = INITIAL_INTEGRATIONS.filter((item) => !existingIds.has(item.id));
        const synced = parsed.map((item: EntegrasyonItem) => {
          if (item.id === 'int-kulup-web-sitesi') {
            return {
              ...item,
              name: 'Kulüp Web Sitesi Portalı',
            };
          }
          return item;
        });
        const merged = [...synced, ...missing];
        if (missing.length > 0 || parsed.some((p: EntegrasyonItem) => p.id === 'int-kulup-web-sitesi' && p.name !== 'Kulüp Web Sitesi Portalı')) {
          saveStoredIntegrations(merged);
        }
        return merged;
      }
    }
  } catch (e) {}
  return INITIAL_INTEGRATIONS;
}

export function saveStoredIntegrations(items: EntegrasyonItem[]): void {
  try {
    localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('sportsfly_integrations_updated'));
  } catch (e) {
    console.error('Entegrasyonlar kaydedilirken hata:', e);
  }
}
