import kayitDonemiImg from '../assets/images/studio_kayit_donemi_1795609106478.jpg';
import yazKampiImg from '../assets/images/studio_yaz_kampi_1795609107168.jpg';
import denemeAntrenmaniImg from '../assets/images/studio_deneme_antrenmani_1795609105667.jpg';
import macGunuImg from '../assets/images/studio_mac_gunu_1795609106255.jpg';
import macSonucuImg from '../assets/images/studio_mac_sonucu_1795609106654.jpg';
import turnuvaSampiyonImg from '../assets/images/studio_turnuva_sampiyon_1795609106696.jpg';
import haftaninSporcusuImg from '../assets/images/studio_haftanin_sporcusu_1795609109837.jpg';
import basariRozetiImg from '../assets/images/studio_basari_rozeti_1795609110786.jpg';
import dogumGunuImg from '../assets/images/studio_dogum_gunu_1795609109637.jpg';
import igProgramImg from '../assets/images/studio_ig_program_1795609108510.jpg';
import igStoryImg from '../assets/images/studio_ig_story_1795609110105.jpg';
import kulupIstatistikImg from '../assets/images/studio_kulup_istatistik_1795609111435.jpg';

export type StudioCategoryId =
  | 'duyuru'
  | 'mac-turnuva'
  | 'sporcu-kartlari'
  | 'sosyal-medya';

export type StudioAspectRatioId = '1:1' | '4:5' | '9:16' | '16:9';

export type StudioLayoutVariant =
  | 'announcement-poster'
  | 'camp-split'
  | 'trial-invite'
  | 'matchday-vs'
  | 'final-score'
  | 'championship-podium'
  | 'athlete-mvp'
  | 'athlete-achievement'
  | 'athlete-birthday'
  | 'social-schedule'
  | 'social-story'
  | 'social-club-stats';

export type StudioPatternStyle =
  | 'court-lines'
  | 'dot-grid'
  | 'diagonal-stripes'
  | 'clean-solid';

export type StudioVisualMode =
  | 'diagonal-campaign'
  | 'duotone-editorial'
  | 'club-neon-spotlight'
  | 'academy-info-poster'
  | 'classic-card';

export interface StudioVisualModeMeta {
  id: StudioVisualMode;
  title: string;
  subtitle: string;
}

export interface StudioCategoryMeta {
  id: StudioCategoryId;
  title: string;
  subtitle: string;
  iconName: 'Megaphone' | 'Trophy' | 'Award' | 'Instagram';
  defaultRatio: StudioAspectRatioId;
}

export interface StudioAspectRatioMeta {
  id: StudioAspectRatioId;
  label: string;
  shortLabel: string;
  dimensionsLabel: string;
  exportWidth: number;
  exportHeight: number;
  stageWidth: number;
  stageHeight: number;
}

export interface StudioThemePalette {
  id: string;
  name: string;
  backgroundColor: string;
  surfaceColor: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  isDark: boolean;
}

export interface StudioStatItem {
  label: string;
  value: string;
}

export interface StudioImageLayer {
  id: string;
  label: string;
  url: string;
  x: number; // percentage 0..100 from left
  y: number; // percentage 0..100 from top
  width: number; // px on stage (48..360)
  opacity: number; // 20..100
  borderRadius: number; // px (0..999)
  fit: 'cover' | 'contain';
  shadow: boolean;
}

export interface StudioDesignState {
  id: string;
  templateId: string;
  categoryId: StudioCategoryId;
  layoutVariant: StudioLayoutVariant;
  aspectRatio: StudioAspectRatioId;
  designName: string;
  kicker: string;
  headline: string;
  subheadline: string;
  highlightBadge: string;
  dateText: string;
  timeText: string;
  locationText: string;
  ctaText: string;
  footerContact: string;
  footerWeb: string;
  clubName: string;
  clubLogoUrl: string;
  showClubLogo: boolean;
  heroPhotoUrl: string;
  showHeroPhoto: boolean;
  photoScrimOpacity: number;
  featureImageUrl: string;
  showFeatureImage: boolean;
  featureImageFit: 'cover' | 'contain';
  featureImageHeight: number;
  customImages: StudioImageLayer[];
  // Match & Tournament specific
  homeTeamName: string;
  awayTeamName: string;
  homeScore: string;
  awayScore: string;
  tournamentTitle: string;
  // Athlete Card specific
  athleteName: string;
  athleteBranch: string;
  athleteGroup: string;
  athleteCode: string;
  athleteAvatarUrl: string;
  athleteQuote: string;
  stats: StudioStatItem[];
  // Visual Styling
  themeId: string;
  backgroundColor: string;
  surfaceColor: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  patternStyle: StudioPatternStyle;
  visualMode?: StudioVisualMode;
  textAlign: 'left' | 'center';
  headlineScale: number;
}

export interface StudioTemplateDefinition {
  id: string;
  name: string;
  description: string;
  categoryId: StudioCategoryId;
  layoutVariant: StudioLayoutVariant;
  recommendedRatio: StudioAspectRatioId;
  recommendedThemeId: string;
  defaults: Partial<StudioDesignState>;
}

export interface StudioBrandKit {
  clubName: string;
  logoUrl: string;
  phone: string;
  websiteOrHandle: string;
  primaryColor: string;
  accentColor: string;
  defaultThemeId: string;
}

export interface SavedStudioDesign {
  id: string;
  title: string;
  categoryId: StudioCategoryId;
  aspectRatio: StudioAspectRatioId;
  updatedAt: string;
  state: StudioDesignState;
}

export const STUDIO_CATEGORIES: StudioCategoryMeta[] = [
  {
    id: 'duyuru',
    title: 'Duyuru Tasarımları',
    subtitle: 'Kayıt, etkinlik ve kampanyalar',
    iconName: 'Megaphone',
    defaultRatio: '4:5',
  },
  {
    id: 'mac-turnuva',
    title: 'Maç & Turnuva',
    subtitle: 'Maç günü ve turnuva afişleri',
    iconName: 'Trophy',
    defaultRatio: '1:1',
  },
  {
    id: 'sporcu-kartlari',
    title: 'Sporcu Kartları',
    subtitle: 'Haftanın sporcusu ve başarılar',
    iconName: 'Award',
    defaultRatio: '4:5',
  },
  {
    id: 'sosyal-medya',
    title: 'Sosyal Medya',
    subtitle: 'Instagram Post ve Story',
    iconName: 'Instagram',
    defaultRatio: '9:16',
  },
];

export const STUDIO_ASPECT_RATIOS: StudioAspectRatioMeta[] = [
  {
    id: '1:1',
    label: 'Instagram Post (1:1)',
    shortLabel: '1:1 Post',
    dimensionsLabel: '1080 × 1080 px',
    exportWidth: 1080,
    exportHeight: 1080,
    stageWidth: 540,
    stageHeight: 540,
  },
  {
    id: '4:5',
    label: 'Instagram Dikey (4:5)',
    shortLabel: '4:5 Afiş',
    dimensionsLabel: '1080 × 1350 px',
    exportWidth: 1080,
    exportHeight: 1350,
    stageWidth: 540,
    stageHeight: 675,
  },
  {
    id: '9:16',
    label: 'Story & Reels (9:16)',
    shortLabel: '9:16 Story',
    dimensionsLabel: '1080 × 1920 px',
    exportWidth: 1080,
    exportHeight: 1920,
    stageWidth: 450,
    stageHeight: 800,
  },
  {
    id: '16:9',
    label: 'Yatay Ekran / Banner (16:9)',
    shortLabel: '16:9 Banner',
    dimensionsLabel: '1920 × 1080 px',
    exportWidth: 1920,
    exportHeight: 1080,
    stageWidth: 640,
    stageHeight: 360,
  },
];

export const STUDIO_VISUAL_MODES: StudioVisualModeMeta[] = [
  {
    id: 'diagonal-campaign',
    title: 'Dinamik Şerit',
    subtitle: 'Açılı çift ton katman & büyük kampanya başlığı',
  },
  {
    id: 'duotone-editorial',
    title: 'Editoryal Duotone',
    subtitle: 'Tam ekran renk tonlu aksiyon & kulüp imzası',
  },
  {
    id: 'club-neon-spotlight',
    title: 'Spot Işık',
    subtitle: 'El yazısı üst etiket, neon başlık & açılı kutu',
  },
  {
    id: 'academy-info-poster',
    title: 'Akademi Bilgi',
    subtitle: 'Fırça banner başlık, 3 ikonlu bilgi kartı & alt bar',
  },
  {
    id: 'classic-card',
    title: 'Klasik Kart',
    subtitle: 'Çerçeveli fotoğraf & düzenli bilgi blokları',
  },
];

export const DEFAULT_TEMPLATE_VISUAL_MODES: Record<string, StudioVisualMode> = {
  'tpl-kayit-donemi': 'academy-info-poster',
  'tpl-yaz-kampi': 'diagonal-campaign',
  'tpl-deneme-antrenmani': 'club-neon-spotlight',
  'tpl-mac-gunu': 'diagonal-campaign',
  'tpl-mac-sonucu': 'duotone-editorial',
  'tpl-turnuva-sampiyon': 'club-neon-spotlight',
  'tpl-haftanin-sporcusu': 'duotone-editorial',
  'tpl-basari-rozeti': 'classic-card',
  'tpl-dogum-gunu': 'classic-card',
  'tpl-ig-program': 'academy-info-poster',
  'tpl-ig-story': 'diagonal-campaign',
  'tpl-kulup-istatistik': 'club-neon-spotlight',
};

export const STUDIO_THEME_PALETTES: StudioThemePalette[] = [
  {
    id: 'navy-pro',
    name: 'Koyu Lacivert Pro',
    backgroundColor: '#0B162C',
    surfaceColor: '#132445',
    primaryColor: '#1D4ED8',
    accentColor: '#F97316',
    textColor: '#F8FAFC',
    mutedTextColor: '#CBD5E1',
    isDark: true,
  },
  {
    id: 'turf-emerald',
    name: 'Saha Zümrüt',
    backgroundColor: '#062118',
    surfaceColor: '#0C3527',
    primaryColor: '#059669',
    accentColor: '#A3E635',
    textColor: '#F8FAFC',
    mutedTextColor: '#BBF7D0',
    isDark: true,
  },
  {
    id: 'court-orange',
    name: 'Basketbol Enerji',
    backgroundColor: '#18181B',
    surfaceColor: '#27272A',
    primaryColor: '#EA580C',
    accentColor: '#FACC15',
    textColor: '#FAFAFA',
    mutedTextColor: '#D4D4D8',
    isDark: true,
  },
  {
    id: 'championship-gold',
    name: 'Şampiyon Altın',
    backgroundColor: '#0F172A',
    surfaceColor: '#1E293B',
    primaryColor: '#B45309',
    accentColor: '#FBBF24',
    textColor: '#FFFFFF',
    mutedTextColor: '#E2E8F0',
    isDark: true,
  },
  {
    id: 'editorial-light',
    name: 'Editoryal Beyaz',
    backgroundColor: '#F8FAFC',
    surfaceColor: '#FFFFFF',
    primaryColor: '#0F2444',
    accentColor: '#EA580C',
    textColor: '#0F172A',
    mutedTextColor: '#475569',
    isDark: false,
  },
  {
    id: 'crimson-academy',
    name: 'Bordo Akademi',
    backgroundColor: '#1E0B12',
    surfaceColor: '#33121E',
    primaryColor: '#BE123C',
    accentColor: '#FDE047',
    textColor: '#FFF1F2',
    mutedTextColor: '#FECDD3',
    isDark: true,
  },
];

export const STUDIO_TEMPLATES: StudioTemplateDefinition[] = [
  // 1. DUYURU TASARIMLARI
  {
    id: 'tpl-kayit-donemi',
    name: 'Yeni Dönem Kayıt Afişi',
    description: 'Sezon açılışı, branşlar ve erken kayıt avantajı duyurusu.',
    categoryId: 'duyuru',
    layoutVariant: 'announcement-poster',
    recommendedRatio: '4:5',
    recommendedThemeId: 'navy-pro',
    defaults: {
      designName: 'Yeni Dönem Spor Okulu Kayıtları',
      kicker: '2026 - 2027 SEZONU ÖN KAYIT',
      headline: 'YENİ DÖNEM KAYITLARI BAŞLADI',
      subheadline: 'Basketbol, Voleybol, Yüzme ve Temel Jimnastik branşlarında uzman antrenör kadromuzla kontenjanlar açıldı.',
      highlightBadge: '4 - 16 YAŞ GRUPLARI',
      dateText: '1 Eylül - 30 Ekim 2026',
      timeText: 'Hafta Sonu 09:00 - 17:00',
      locationText: 'Merkez Kapalı Spor Kompleksi',
      ctaText: 'Ücretsiz Deneme Seansı İçin Hemen Başvur',
      stats: [
        { label: 'Yaş Aralığı', value: '4 - 16 Yaş' },
        { label: 'Sınıf Mevcudu', value: 'Maks. 14' },
        { label: 'Kayıt Avantajı', value: '%15 Erken' },
      ],
      featureImageUrl: kayitDonemiImg,
      showFeatureImage: true,
      featureImageFit: 'cover',
      featureImageHeight: 152,
      patternStyle: 'court-lines',
    },
  },
  {
    id: 'tpl-yaz-kampi',
    name: 'Yaz Kampı & Gelişim Programı',
    description: 'Yoğun kamp dönemi, tarih ve tesis duyuru kartı.',
    categoryId: 'duyuru',
    layoutVariant: 'camp-split',
    recommendedRatio: '1:1',
    recommendedThemeId: 'turf-emerald',
    defaults: {
      designName: 'Yaz Spor Okulu & Gelişim Kampı',
      kicker: 'YAZ GELİŞİM KAMPI',
      headline: 'SAHADA GÜÇLÜ BİR YAZ BAŞLIYOR',
      subheadline: 'Teknik gelişim, atletik performans testleri ve takım turnuvalarıyla dolu 6 haftalık kamp programı.',
      highlightBadge: 'SINIRLI KONTENJAN',
      dateText: '15 Haziran - 25 Temmuz',
      timeText: 'Haftada 4 Gün · 09:30',
      locationText: 'Ana Tesis & Olimpik Salon',
      ctaText: 'Ön Kayıt Formunu Doldurun',
      stats: [
        { label: 'Program Süresi', value: '6 Hafta' },
        { label: 'Haftalık Seans', value: '8 Saat' },
        { label: 'Ölçüm Desteği', value: 'SportsFly LAB' },
      ],
      featureImageUrl: yazKampiImg,
      showFeatureImage: true,
      featureImageFit: 'cover',
      featureImageHeight: 112,
      patternStyle: 'diagonal-stripes',
    },
  },
  {
    id: 'tpl-deneme-antrenmani',
    name: 'Ücretsiz Deneme Antrenmanı',
    description: 'Veli ve sporcuları ilk tanışma antrenmanına davet eden net kart.',
    categoryId: 'duyuru',
    layoutVariant: 'trial-invite',
    recommendedRatio: '4:5',
    recommendedThemeId: 'editorial-light',
    defaults: {
      designName: 'Ücretsiz Deneme Antrenmanı Daveti',
      kicker: 'TANIŞMA & SEVİYE TESPİTİ',
      headline: 'ÜCRETSİZ DENEME ANTRENMANINA KATILIN',
      subheadline: 'Çocuğunuzun branş yatkınlığını ve seviye grubunu sahada eğitmenlerimizle birlikte keşfedin.',
      highlightBadge: 'İLK SEANS ÜCRETSİZ',
      dateText: 'Her Cumartesi & Pazar',
      timeText: '10:00 · 11:30 · 14:00',
      locationText: 'Tüm Kulüp Şubelerimiz',
      ctaText: 'Randevu Almak İçin Bize Ulaşın',
      stats: [
        { label: 'Seans Süresi', value: '60 Dk' },
        { label: 'Ekipman', value: 'Kulüpten' },
        { label: 'Karne Raporu', value: 'Dahil' },
      ],
      featureImageUrl: denemeAntrenmaniImg,
      showFeatureImage: true,
      featureImageFit: 'cover',
      featureImageHeight: 152,
      patternStyle: 'dot-grid',
    },
  },

  // 2. MAÇ & TURNUVA
  {
    id: 'tpl-mac-gunu',
    name: 'Maç Günü (Matchday) Afişi',
    description: 'Ev sahibi vs deplasman karşılaşması, tarih, saat ve salon bilgisi.',
    categoryId: 'mac-turnuva',
    layoutVariant: 'matchday-vs',
    recommendedRatio: '4:5',
    recommendedThemeId: 'court-orange',
    defaults: {
      designName: 'U14 Lig Karşılaşması Matchday',
      kicker: 'HAFTANIN KARŞILAŞMASI',
      headline: 'MAÇ GÜNÜ',
      subheadline: 'U14 Bölgesel Gelişim Ligi 6. Hafta Mücadelesi',
      highlightBadge: 'GİRİŞ ÜCRETSİZDİR',
      homeTeamName: 'ATAŞEHİR SPOR',
      awayTeamName: 'ANADOLU AKADEMİ',
      homeScore: '0',
      awayScore: '0',
      tournamentTitle: 'İSTANBUL ALTYAPI LİGİ · U14',
      dateText: '28 Kasım Cumartesi',
      timeText: '14:30',
      locationText: 'Merkez Spor Salonu · Saha A',
      ctaText: 'Tribünde Takımımıza Destek Olun',
      stats: [
        { label: 'Kategori', value: 'U14 Erkek' },
        { label: 'Hafta', value: '6. Hafta' },
        { label: 'Canlı Skor', value: 'SportsFly' },
      ],
      featureImageUrl: macGunuImg,
      showFeatureImage: true,
      featureImageFit: 'cover',
      featureImageHeight: 146,
      patternStyle: 'diagonal-stripes',
    },
  },
  {
    id: 'tpl-mac-sonucu',
    name: 'Maç Sonucu & Skor Kartı',
    description: 'Büyük rakamlı maç skoru, takım adı ve öne çıkan istatistikler.',
    categoryId: 'mac-turnuva',
    layoutVariant: 'final-score',
    recommendedRatio: '1:1',
    recommendedThemeId: 'navy-pro',
    defaults: {
      designName: 'Maç Sonucu Skor Duyurusu',
      kicker: 'MAÇ SONUCU · GALİBİYET',
      headline: 'SAHADAN GALİBİYETLE AYRILDIK',
      subheadline: 'Takımımızı ve teknik ekibimizi mücadelelerinden dolayı tebrik ederiz.',
      highlightBadge: 'FİNAL SKORU',
      homeTeamName: 'ATAŞEHİR SK',
      awayTeamName: 'KADIKÖY GÜCÜ',
      homeScore: '74',
      awayScore: '61',
      tournamentTitle: 'U16 GELİŞİM LİGİ',
      dateText: '22 Kasım 2026',
      timeText: 'Maç Bitişi',
      locationText: 'Atatürk Spor Salonu',
      ctaText: 'Tüm Puan Durumu SportsFly Portalında',
      stats: [
        { label: 'Asist Lideri', value: '12 Asist' },
        { label: 'Ribaund', value: '38 Top' },
        { label: 'Takım Puanı', value: '+13 Fark' },
      ],
      featureImageUrl: macSonucuImg,
      showFeatureImage: true,
      featureImageFit: 'cover',
      featureImageHeight: 104,
      patternStyle: 'court-lines',
    },
  },
  {
    id: 'tpl-turnuva-sampiyon',
    name: 'Turnuva & Kupa Şampiyonluğu',
    description: 'Turnuva derecesi, şampiyonluk kutlaması ve organizasyon künyesi.',
    categoryId: 'mac-turnuva',
    layoutVariant: 'championship-podium',
    recommendedRatio: '4:5',
    recommendedThemeId: 'championship-gold',
    defaults: {
      designName: 'Cumhuriyet Kupası Şampiyonluk Afişi',
      kicker: 'TURNUVA ŞAMPİYONLUĞU',
      headline: 'KUPANIN SAHİBİ OLDUK',
      subheadline: '8 kulübün katıldığı sonbahar turnuvasında namağlup şampiyonluğa ulaştık.',
      highlightBadge: '1. LİK KUPASI',
      tournamentTitle: 'SONBAHAR ALTYAPI KUPASI 2026',
      homeTeamName: 'U13 KIZ VOLEYBOL',
      awayTeamName: 'NAMAĞLUP ŞAMPİYON',
      dateText: '19 Kasım 2026',
      timeText: 'Final Serisi',
      locationText: 'İstanbul Spor Kompleksi',
      ctaText: 'Tüm Sporcularımızı Yürekten Kutlarız',
      stats: [
        { label: 'Oynanan Maç', value: '5 Maç' },
        { label: 'Galibiyet', value: '5 / 5' },
        { label: 'Set Averajı', value: '15 - 2' },
      ],
      featureImageUrl: turnuvaSampiyonImg,
      showFeatureImage: true,
      featureImageFit: 'cover',
      featureImageHeight: 152,
      patternStyle: 'dot-grid',
    },
  },

  // 3. SPORCU KARTLARI
  {
    id: 'tpl-haftanin-sporcusu',
    name: 'Haftanın Sporcusu (MVP)',
    description: 'Sporcu fotoğrafı, branş bilgisi ve 3 performans metriğiyle MVP kartı.',
    categoryId: 'sporcu-kartlari',
    layoutVariant: 'athlete-mvp',
    recommendedRatio: '4:5',
    recommendedThemeId: 'navy-pro',
    defaults: {
      designName: 'Haftanın Sporcusu Kartı',
      kicker: 'HAFTANIN SPORCUSU',
      headline: 'HAFTANIN YILDIZI SEÇİLDİ',
      subheadline: 'Antrenman disiplini, takım arkadaşlığı ve yüksek devam performansıyla öne çıktı.',
      highlightBadge: 'MVP · HAFTA 12',
      athleteName: 'Ege Demir',
      athleteBranch: 'Basketbol',
      athleteGroup: 'U14 Erkek Gelişim A',
      athleteCode: 'SF-4421',
      athleteAvatarUrl: haftaninSporcusuImg,
      athleteQuote: 'Düzenli çalışması ve saha içi liderliğiyle tüm gruba örnek oldu.',
      dateText: 'Kasım 2026 · 3. Hafta',
      locationText: 'Merkez Kampüs Salon 1',
      ctaText: 'Tebrikler Şampiyon!',
      stats: [
        { label: 'Devam Oranı', value: '%96' },
        { label: 'Sporpuan', value: '940' },
        { label: 'LAB Endeks', value: '92 / 100' },
      ],
      heroPhotoUrl: macGunuImg,
      showHeroPhoto: true,
      photoScrimOpacity: 78,
      patternStyle: 'court-lines',
    },
  },
  {
    id: 'tpl-basari-rozeti',
    name: 'Başarı & Seviye Rozeti Kartı',
    description: 'Sporpuan seviye atlama, test rekoru veya sertifika kutlaması.',
    categoryId: 'sporcu-kartlari',
    layoutVariant: 'athlete-achievement',
    recommendedRatio: '1:1',
    recommendedThemeId: 'championship-gold',
    defaults: {
      designName: 'Sporpuan Altın Rozet Başarısı',
      kicker: 'SEVİYE & BAŞARI ROZETİ',
      headline: 'ALTIN GELİŞİM ROZETİ KAZANDI',
      subheadline: 'Dönem içi hız, çeviklik ve teknik yeterlilik değerlendirmesinde üst dilime girdi.',
      highlightBadge: 'SPORPUAN DOĞRULAMALI',
      athleteName: 'Zeynep Kaya',
      athleteBranch: 'Voleybol',
      athleteGroup: 'Midi Kız Takımı A',
      athleteCode: 'SF-4422',
      athleteAvatarUrl: basariRozetiImg,
      athleteQuote: 'Sezon başından bu yana servis isabeti ve dikey sıçramada %18 gelişim sağladı.',
      dateText: 'Dönem Değerlendirmesi',
      locationText: 'Batı Tesisleri Salon B',
      ctaText: 'Dijital Sporcu Karnesi Aktif',
      stats: [
        { label: 'Katılım', value: '%100' },
        { label: 'Dikey Sıçrama', value: '+6 cm' },
        { label: 'Toplam Puan', value: '1.240' },
      ],
      heroPhotoUrl: turnuvaSampiyonImg,
      showHeroPhoto: true,
      photoScrimOpacity: 82,
      patternStyle: 'dot-grid',
    },
  },
  {
    id: 'tpl-dogum-gunu',
    name: 'Sporcu Doğum Günü Kutlaması',
    description: 'Kulüp sporcularının doğum günleri için sıcak kutlama kartı.',
    categoryId: 'sporcu-kartlari',
    layoutVariant: 'athlete-birthday',
    recommendedRatio: '1:1',
    recommendedThemeId: 'crimson-academy',
    defaults: {
      designName: 'Sporcu Doğum Günü Tebrik Kartı',
      kicker: 'İYİ Kİ DOĞDUN ŞAMPİYON',
      headline: 'MUTLU YAŞLAR DİLERİZ',
      subheadline: 'Sağlık, mutluluk ve başarılarla dolu nice yeni sezonlar dileriz.',
      highlightBadge: 'KULÜP AİLEMİZ',
      athleteName: 'Can Yılmaz',
      athleteBranch: 'Basketbol',
      athleteGroup: 'Genç Takım (U16)',
      athleteCode: 'SF-4423',
      athleteAvatarUrl: dogumGunuImg,
      athleteQuote: 'Nice başarılı antrenmanlara ve kupalara birlikte!',
      dateText: 'Bugünün Doğum Günü',
      locationText: 'SportsFly Kulüp Ailesi',
      ctaText: 'Tüm Takım Arkadaşlarınla Kutlu Olsun',
      stats: [
        { label: 'Branş', value: 'Basketbol' },
        { label: 'Takım', value: 'U16 A' },
        { label: 'Kulüp Kodu', value: 'SF-4423' },
      ],
      heroPhotoUrl: macSonucuImg,
      showHeroPhoto: true,
      photoScrimOpacity: 82,
      patternStyle: 'diagonal-stripes',
    },
  },

  // 4. SOSYAL MEDYA
  {
    id: 'tpl-ig-program',
    name: 'Instagram Post — Haftalık Program',
    description: 'Antrenman günleri ve saatlerini net sunan Instagram kare/dikey post.',
    categoryId: 'sosyal-medya',
    layoutVariant: 'social-schedule',
    recommendedRatio: '4:5',
    recommendedThemeId: 'editorial-light',
    defaults: {
      designName: 'Haftalık Antrenman Programı Postu',
      kicker: 'HAFTALIK ANTRENMAN AKIŞI',
      headline: 'BU HAFTA SALONDA NELER VAR?',
      subheadline: 'Tüm gruplarımız için güncel antrenman gün ve saatleri aşağıdadır. Antrenmandan 15 dk önce hazır bulununuz.',
      highlightBadge: 'GÜNCEL PROGRAM',
      dateText: 'Cumartesi & Pazar',
      timeText: '09:30 - 16:30',
      locationText: 'Merkez & Batı Şubeleri',
      ctaText: 'Kaydetmeyi ve Velilerle Paylaşmayı Unutmayın',
      stats: [
        { label: 'U10 - U12 Minikler', value: 'Cmt 09:30' },
        { label: 'U14 Gelişim Grubu', value: 'Cmt 11:30' },
        { label: 'U16 Performans', value: 'Paz 13:00' },
      ],
      featureImageUrl: igProgramImg,
      showFeatureImage: true,
      featureImageFit: 'cover',
      featureImageHeight: 138,
      patternStyle: 'dot-grid',
    },
  },
  {
    id: 'tpl-ig-story',
    name: 'Instagram Story — Anlık Duyuru',
    description: '9:16 tam boy dikey Instagram Story ve Reels kapağı şablonu.',
    categoryId: 'sosyal-medya',
    layoutVariant: 'social-story',
    recommendedRatio: '9:16',
    recommendedThemeId: 'navy-pro',
    defaults: {
      designName: 'Instagram Story Duyuru Tasarımı',
      kicker: 'KULÜP DUYURUSU · STORY',
      headline: 'YENİ ŞUBE KAYITLARIMIZ AÇILDI',
      subheadline: 'Hafta içi ve hafta sonu esnek seans seçenekleriyle spor okulumuzda yerinizi ayırtın.',
      highlightBadge: 'SON 12 KONTENJAN',
      dateText: 'Hemen Başvurun',
      timeText: 'Online Ön Kayıt',
      locationText: 'Yeni Kapalı Spor Salonu',
      ctaText: 'DM veya Profildeki Linkten Başvur',
      stats: [
        { label: 'Branş Sayısı', value: '5 Branş' },
        { label: 'Yaş Grupları', value: '5 - 16' },
        { label: 'Kayıt', value: 'Açık' },
      ],
      featureImageUrl: igStoryImg,
      showFeatureImage: true,
      featureImageFit: 'cover',
      featureImageHeight: 192,
      patternStyle: 'court-lines',
    },
  },
  {
    id: 'tpl-kulup-istatistik',
    name: 'Sosyal Medya — Sezon İstatistik Kartı',
    description: 'Kulübün aktif sporcu, antrenman ve başarı sayılarını öne çıkaran paylaşım.',
    categoryId: 'sosyal-medya',
    layoutVariant: 'social-club-stats',
    recommendedRatio: '1:1',
    recommendedThemeId: 'turf-emerald',
    defaults: {
      designName: 'Kulüp Sezon İstatistikleri Postu',
      kicker: 'RAKAMLARLA AKADEMİMİZ',
      headline: 'BİLİMSEL TAKİP İLE GÜÇLÜ GELİŞİM',
      subheadline: 'Sezon başından bu yana sahada ve laboratuvarda büyümeye devam ediyoruz.',
      highlightBadge: '2026 SEZON ÖZETİ',
      dateText: 'Güncel Veriler',
      timeText: 'Sezon Raporu',
      locationText: 'Tüm Branşlar & Şubeler',
      ctaText: 'Kulübümüzü Yakından Tanıyın',
      stats: [
        { label: 'Aktif Sporcu', value: '420+' },
        { label: 'Dijital Karne', value: '1.150' },
        { label: 'Katılım Oranı', value: '%94' },
      ],
      featureImageUrl: kulupIstatistikImg,
      showFeatureImage: true,
      featureImageFit: 'cover',
      featureImageHeight: 112,
      patternStyle: 'diagonal-stripes',
    },
  },
];

export function buildDesignStateFromTemplate(
  template: StudioTemplateDefinition,
  brandKit: StudioBrandKit
): StudioDesignState {
  const theme =
    STUDIO_THEME_PALETTES.find((p) => p.id === (brandKit.defaultThemeId || template.recommendedThemeId)) ||
    STUDIO_THEME_PALETTES.find((p) => p.id === template.recommendedThemeId) ||
    STUDIO_THEME_PALETTES[0];

  const d = template.defaults;

  return {
    id: `design-${Date.now()}`,
    templateId: template.id,
    categoryId: template.categoryId,
    layoutVariant: template.layoutVariant,
    aspectRatio: template.recommendedRatio,
    designName: d.designName || template.name,
    kicker: d.kicker || 'KULÜP DUYURUSU',
    headline: d.headline || template.name.toUpperCase(),
    subheadline: d.subheadline || template.description,
    highlightBadge: d.highlightBadge || '2026 SEZONU',
    dateText: d.dateText || 'Bu Hafta Sonu',
    timeText: d.timeText || '10:00 - 12:00',
    locationText: d.locationText || 'Merkez Spor Kompleksi',
    ctaText: d.ctaText || 'Detaylı Bilgi İçin İletişime Geçin',
    footerContact: brandKit.phone || '0216 850 1907',
    footerWeb: brandKit.websiteOrHandle || 'webapp.sportsfly.com.tr',
    clubName: brandKit.clubName || 'SportsFly Akademi',
    clubLogoUrl: brandKit.logoUrl || '',
    showClubLogo: true,
    heroPhotoUrl: d.heroPhotoUrl || '',
    showHeroPhoto: Boolean(d.showHeroPhoto && d.heroPhotoUrl),
    photoScrimOpacity: d.photoScrimOpacity ?? 62,
    featureImageUrl: d.featureImageUrl || '',
    showFeatureImage: Boolean(d.showFeatureImage && d.featureImageUrl),
    featureImageFit: d.featureImageFit || 'cover',
    featureImageHeight: d.featureImageHeight ?? 156,
    customImages: Array.isArray(d.customImages) ? d.customImages : [],
    homeTeamName: d.homeTeamName || brandKit.clubName || 'ATAŞEHİR SPOR',
    awayTeamName: d.awayTeamName || 'RAKİP AKADEMİ',
    homeScore: d.homeScore || '74',
    awayScore: d.awayScore || '61',
    tournamentTitle: d.tournamentTitle || 'İSTANBUL ALTYAPI LİGİ',
    athleteName: d.athleteName || 'Ege Demir',
    athleteBranch: d.athleteBranch || 'Basketbol',
    athleteGroup: d.athleteGroup || 'U14 Gelişim A',
    athleteCode: d.athleteCode || 'SF-4421',
    athleteAvatarUrl: d.athleteAvatarUrl || '',
    athleteQuote: d.athleteQuote || 'Antrenman disiplini ve yüksek katılım başarısı.',
    stats: d.stats && d.stats.length > 0 ? d.stats : [
      { label: 'Katılım', value: '%96' },
      { label: 'Sporpuan', value: '940' },
      { label: 'Seans', value: '24' },
    ],
    themeId: theme.id,
    backgroundColor: theme.backgroundColor,
    surfaceColor: theme.surfaceColor,
    primaryColor: brandKit.primaryColor || theme.primaryColor,
    accentColor: brandKit.accentColor || theme.accentColor,
    textColor: theme.textColor,
    mutedTextColor: theme.mutedTextColor,
    patternStyle: d.patternStyle || 'court-lines',
    visualMode:
      d.visualMode ||
      DEFAULT_TEMPLATE_VISUAL_MODES[template.id] ||
      'diagonal-campaign',
    textAlign: 'left',
    headlineScale: 100,
  };
}

export interface StudioSceneOption {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  categoryId: StudioCategoryId;
  defaultTemplateId: string;
  recommendedThemeId: string;
  keywords: string[];
  samplePrompt: string;
}

export interface StudioCopyPreset {
  id: string;
  categoryId: StudioCategoryId;
  label: string;
  kicker: string;
  headline: string;
  subheadline: string;
  highlightBadge: string;
  ctaText: string;
}

export const STUDIO_SCENE_GALLERY: StudioSceneOption[] = [
  {
    id: 'kayit-donemi',
    title: 'Spor Okulu Kayıt Afişi',
    subtitle: 'Çoklu branş ve yeni sezon kayıt sahnesi',
    url: kayitDonemiImg,
    categoryId: 'duyuru',
    defaultTemplateId: 'tpl-kayit-donemi',
    recommendedThemeId: 'navy-pro',
    keywords: ['kayit', 'yeni donem', 'sezon', 'okul', 'on kayit', 'erken kayit', 'basvur', 'brans', 'acilis'],
    samplePrompt: 'Yeni sezon spor okulu ön kayıt duyurusu, basketbol ve voleybol branşları',
  },
  {
    id: 'yaz-kampi',
    title: 'Yaz Gelişim Kampı',
    subtitle: 'Yoğun saha antrenmanı ve yaz kampı sahnesi',
    url: yazKampiImg,
    categoryId: 'duyuru',
    defaultTemplateId: 'tpl-yaz-kampi',
    recommendedThemeId: 'turf-emerald',
    keywords: ['yaz', 'kamp', 'gelisim', 'tatil', 'haziran', 'temmuz', '6 hafta', 'program', 'cim', 'futbol'],
    samplePrompt: '6 haftalık yaz spor okulu ve atletik gelişim kampı afişi',
  },
  {
    id: 'deneme-antrenmani',
    title: 'Ücretsiz Deneme Seansı',
    subtitle: 'Tanışma ve seviye tespit antrenmanı',
    url: denemeAntrenmaniImg,
    categoryId: 'duyuru',
    defaultTemplateId: 'tpl-deneme-antrenmani',
    recommendedThemeId: 'editorial-light',
    keywords: ['deneme', 'ucretsiz', 'tanisma', 'seviye', 'tespit', 'ilk seans', 'randevu', 'davet'],
    samplePrompt: 'Hafta sonu ücretsiz deneme antrenmanı ve seviye tespiti daveti',
  },
  {
    id: 'mac-gunu',
    title: 'Maç Günü (Matchday)',
    subtitle: 'Salon atmosferi ve karşılaşma duyurusu',
    url: macGunuImg,
    categoryId: 'mac-turnuva',
    defaultTemplateId: 'tpl-mac-gunu',
    recommendedThemeId: 'court-orange',
    keywords: ['mac', 'matchday', 'karsilasma', 'derbi', 'rakip', 'lig', 'basketbol', 'salon', 'tribun', 'deplasman'],
    samplePrompt: 'U14 basketbol ligi maç günü afişi, enerjik salon atmosferi',
  },
  {
    id: 'mac-sonucu',
    title: 'Maç Sonucu & Galibiyet',
    subtitle: 'Skor ilanı ve takım kutlaması',
    url: macSonucuImg,
    categoryId: 'mac-turnuva',
    defaultTemplateId: 'tpl-mac-sonucu',
    recommendedThemeId: 'navy-pro',
    keywords: ['skor', 'sonuc', 'galibiyet', 'kazandik', 'final', 'asist', 'ribound', 'puan', 'zafer'],
    samplePrompt: 'Maç sonucu galibiyet duyurusu ve skor kartı paylaşımı',
  },
  {
    id: 'turnuva-sampiyon',
    title: 'Turnuva & Kupa Şampiyonluğu',
    subtitle: 'Şampiyonluk podyumu ve kupa görseli',
    url: turnuvaSampiyonImg,
    categoryId: 'mac-turnuva',
    defaultTemplateId: 'tpl-turnuva-sampiyon',
    recommendedThemeId: 'championship-gold',
    keywords: ['sampiyon', 'kupa', 'turnuva', 'birinci', 'madalya', 'podyum', 'namaglup', 'voleybol'],
    samplePrompt: 'Turnuva birinciliği ve kupa şampiyonluğu kutlama afişi',
  },
  {
    id: 'haftanin-sporcusu',
    title: 'Haftanın Sporcusu (MVP)',
    subtitle: 'Bireysel performans ve yıldız oyuncu kartı',
    url: haftaninSporcusuImg,
    categoryId: 'sporcu-kartlari',
    defaultTemplateId: 'tpl-haftanin-sporcusu',
    recommendedThemeId: 'navy-pro',
    keywords: ['mvp', 'haftanin', 'yildiz', 'sporcu', 'performans', 'lider', 'disiplin', 'oyuncu'],
    samplePrompt: 'Haftanın en değerli sporcusu MVP tebrik ve performans kartı',
  },
  {
    id: 'basari-rozeti',
    title: 'Başarı & Seviye Rozeti',
    subtitle: 'Test rekoru ve Sporpuan sertifika kartı',
    url: basariRozetiImg,
    categoryId: 'sporcu-kartlari',
    defaultTemplateId: 'tpl-basari-rozeti',
    recommendedThemeId: 'championship-gold',
    keywords: ['rozet', 'basari', 'rekor', 'sporpuan', 'sertifika', 'altin', 'sicrama', 'hiz', 'test', 'karne'],
    samplePrompt: 'Sporpuan altın gelişim rozeti ve test rekoru başarı kartı',
  },
  {
    id: 'dogum-gunu',
    title: 'Sporcu Doğum Günü',
    subtitle: 'Kulüp ailesi tebrik ve kutlama görseli',
    url: dogumGunuImg,
    categoryId: 'sporcu-kartlari',
    defaultTemplateId: 'tpl-dogum-gunu',
    recommendedThemeId: 'crimson-academy',
    keywords: ['dogum', 'yas', 'kutlama', 'tebrik', 'mutlu', 'pasta', 'iyi ki'],
    samplePrompt: 'Kulüp sporcumuz için mutlu yaşlar doğum günü kutlama kartı',
  },
  {
    id: 'ig-program',
    title: 'Haftalık Antrenman Programı',
    subtitle: 'Takvim ve seans saatleri sosyal medya postu',
    url: igProgramImg,
    categoryId: 'sosyal-medya',
    defaultTemplateId: 'tpl-ig-program',
    recommendedThemeId: 'editorial-light',
    keywords: ['program', 'haftalik', 'saat', 'takvim', 'akis', 'seans', 'cumartesi', 'pazar', 'instagram'],
    samplePrompt: 'Haftalık antrenman gün ve saatleri Instagram duyuru postu',
  },
  {
    id: 'ig-story',
    title: 'Instagram Story Duyuru',
    subtitle: '9:16 dikey hikaye ve acil kontenjan duyurusu',
    url: igStoryImg,
    categoryId: 'sosyal-medya',
    defaultTemplateId: 'tpl-ig-story',
    recommendedThemeId: 'navy-pro',
    keywords: ['story', 'hikaye', 'reels', 'kontenjan', 'sube', 'anlik', 'hizli', 'dikey', 'dm'],
    samplePrompt: 'Instagram Story dikey tasarım, son kontenjan ve yeni şube duyurusu',
  },
  {
    id: 'kulup-istatistik',
    title: 'Kulüp Sezon İstatistikleri',
    subtitle: 'Rakamlarla akademi ve gelişim özeti',
    url: kulupIstatistikImg,
    categoryId: 'sosyal-medya',
    defaultTemplateId: 'tpl-kulup-istatistik',
    recommendedThemeId: 'turf-emerald',
    keywords: ['istatistik', 'rakam', 'bilimsel', 'lab', 'rapor', 'analiz', 'katilim', 'ozet', 'akademi'],
    samplePrompt: 'Sezonluk aktif sporcu ve dijital karne istatistik paylaşım kartı',
  },
];

export const STUDIO_QUICK_PROMPTS: { label: string; prompt: string; categoryId: StudioCategoryId }[] = [
  {
    label: 'Maç Günü Afişi',
    prompt: 'U14 basketbol ligi maç günü afişi, tribün ve salon heyecanı',
    categoryId: 'mac-turnuva',
  },
  {
    label: 'Yeni Dönem Kayıt',
    prompt: 'Yeni sezon spor okulu kayıtları başladı, erken kayıt indirimi duyurusu',
    categoryId: 'duyuru',
  },
  {
    label: 'Yaz Kampı',
    prompt: '6 haftalık yaz gelişim kampı ve atletik performans programı',
    categoryId: 'duyuru',
  },
  {
    label: 'Şampiyonluk Kutlaması',
    prompt: 'Turnuva kupası namağlup şampiyonluk kutlama afişi',
    categoryId: 'mac-turnuva',
  },
  {
    label: 'Haftanın Sporcusu',
    prompt: 'Haftanın yıldız sporcusu MVP performans ve tebrik kartı',
    categoryId: 'sporcu-kartlari',
  },
  {
    label: 'Instagram Program',
    prompt: 'Haftalık antrenman programı saatleri Instagram paylaşımı',
    categoryId: 'sosyal-medya',
  },
];

export const STUDIO_COPY_PRESETS: StudioCopyPreset[] = [
  {
    id: 'preset-kayit',
    categoryId: 'duyuru',
    label: 'Yeni Sezon Ön Kayıt',
    kicker: '2026 - 2027 SEZONU ÖN KAYIT',
    headline: 'YENİ DÖNEM KAYITLARI BAŞLADI',
    subheadline: 'Basketbol, Voleybol ve Temel Hareket gruplarında erken kayıt fırsatıyla yerinizi ayırtın.',
    highlightBadge: '%15 ERKEN KAYIT',
    ctaText: 'Ücretsiz Deneme Seansı İçin Başvurun',
  },
  {
    id: 'preset-deneme',
    categoryId: 'duyuru',
    label: 'Ücretsiz Deneme Antrenmanı',
    kicker: 'TANIŞMA & SEVİYE TESPİTİ',
    headline: 'ÜCRETSİZ DENEME ANTRENMANINA DAVETLİSİNİZ',
    subheadline: 'Uzman antrenörlerimiz eşliğinde sporcunuzun branş yatkınlığını ve grubunu belirleyin.',
    highlightBadge: 'İLK SEANS ÜCRETSİZ',
    ctaText: 'Hemen Randevu Oluşturun',
  },
  {
    id: 'preset-kamp',
    categoryId: 'duyuru',
    label: 'Yaz Gelişim Kampı',
    kicker: 'YAZ SPOR OKULU & PERFORMANS KAMPI',
    headline: 'SAHADA GÜÇLÜ BİR YAZ BAŞLIYOR',
    subheadline: 'Teknik gelişim, motorik ölçümler ve hafta sonu turnuvalarıyla dopdolu 6 haftalık kamp.',
    highlightBadge: 'SINIRLI KONTENJAN',
    ctaText: 'Ön Kayıt İçin Bize Ulaşın',
  },
  {
    id: 'preset-matchday',
    categoryId: 'mac-turnuva',
    label: 'Maç Günü (Matchday)',
    kicker: 'HAFTANIN KARŞILAŞMASI',
    headline: 'MAÇ GÜNÜ HEYECANI',
    subheadline: 'Takımımız parkeye çıkıyor! Tüm velilerimizi ve taraftarlarımızı tribüne bekliyoruz.',
    highlightBadge: 'GİRİŞ ÜCRETSİZ',
    ctaText: 'Tribünde Takımımıza Destek Olun',
  },
  {
    id: 'preset-galibiyet',
    categoryId: 'mac-turnuva',
    label: 'Galibiyet & Skor Kartı',
    kicker: 'MAÇ SONUCU · GALİBİYET',
    headline: 'SAHADAN GALİBİYETLE AYRILDIK',
    subheadline: 'Mücadelesiyle alkış alan sporcularımızı ve teknik ekibimizi yürekten kutluyoruz.',
    highlightBadge: 'FİNAL SKORU',
    ctaText: 'Tüm Puan Durumu SportsFly Portalında',
  },
  {
    id: 'preset-sampiyon',
    categoryId: 'mac-turnuva',
    label: 'Turnuva Şampiyonluğu',
    kicker: 'TURNUVA ŞAMPİYONLUĞU',
    headline: 'KUPANIN SAHİBİ OLDUK',
    subheadline: 'Turnuvayı namağlup tamamlayarak şampiyonluk kupasını kulübümüze kazandırdık.',
    highlightBadge: '1. LİK KUPASI',
    ctaText: 'Şampiyon Sporcularımızı Tebrik Ederiz',
  },
  {
    id: 'preset-mvp',
    categoryId: 'sporcu-kartlari',
    label: 'Haftanın Sporcusu (MVP)',
    kicker: 'HAFTANIN SPORCUSU',
    headline: 'HAFTANIN YILDIZI SEÇİLDİ',
    subheadline: 'Antrenman disiplini, takım ruhu ve yüksek katılım performansıyla öne çıktı.',
    highlightBadge: 'MVP · HAFTA 12',
    ctaText: 'Başarılarının Devamını Dileriz!',
  },
  {
    id: 'preset-rozet',
    categoryId: 'sporcu-kartlari',
    label: 'Başarı & Seviye Rozeti',
    kicker: 'SPORPUAN BAŞARI ROZETİ',
    headline: 'ALTIN GELİŞİM ROZETİ KAZANDI',
    subheadline: 'Sürat, çeviklik ve teknik beceri testlerinde kendi yaş grubunun en üst dilimine ulaştı.',
    highlightBadge: 'DOĞRULANMIŞ BAŞARI',
    ctaText: 'Dijital Sporcu Karnesi Güncellendi',
  },
  {
    id: 'preset-dogum',
    categoryId: 'sporcu-kartlari',
    label: 'Doğum Günü Tebriği',
    kicker: 'İYİ Kİ DOĞDUN ŞAMPİYON',
    headline: 'MUTLU YAŞLAR DİLERİZ',
    subheadline: 'Sağlık, mutluluk ve başarılarla dolu nice yeni sezonlar dileriz.',
    highlightBadge: 'KULÜP AİLEMİZ',
    ctaText: 'Tüm Takım Arkadaşlarınla Kutlu Olsun',
  },
  {
    id: 'preset-ig-program',
    categoryId: 'sosyal-medya',
    label: 'Haftalık Antrenman Programı',
    kicker: 'HAFTALIK ANTRENMAN AKIŞI',
    headline: 'BU HAFTA SALONDA NELER VAR?',
    subheadline: 'Tüm yaş gruplarımız için güncel antrenman saatleri belirlendi. 15 dk önce hazır bulununuz.',
    highlightBadge: 'GÜNCEL PROGRAM',
    ctaText: 'Kaydetmeyi ve Velilerle Paylaşmayı Unutmayın',
  },
  {
    id: 'preset-ig-story',
    categoryId: 'sosyal-medya',
    label: 'Anlık Story Duyurusu',
    kicker: 'KULÜP DUYURUSU · STORY',
    headline: 'YENİ ŞUBE KAYITLARIMIZ AÇILDI',
    subheadline: 'Hafta içi ve hafta sonu esnek seanslarla spor okulumuzda yerinizi hemen ayırtın.',
    highlightBadge: 'SON 12 KONTENJAN',
    ctaText: 'DM veya Profildeki Linkten Başvur',
  },
  {
    id: 'preset-istatistik',
    categoryId: 'sosyal-medya',
    label: 'Kulüp Sezon Özeti',
    kicker: 'RAKAMLARLA AKADEMİMİZ',
    headline: 'BİLİMSEL TAKİP İLE GÜÇLÜ GELİŞİM',
    subheadline: 'Sezon başından bu yana sahada ve performans laboratuvarında büyümeye devam ediyoruz.',
    highlightBadge: '2026 SEZON ÖZETİ',
    ctaText: 'Kulübümüzü Yakından Tanıyın',
  },
];

const normalizeTurkishPrompt = (input: string): string =>
  input
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();

export function matchStudioSceneByPrompt(
  prompt: string,
  fallbackCategoryId?: StudioCategoryId
): StudioSceneOption {
  const normalized = normalizeTurkishPrompt(prompt);

  if (!normalized) {
    return (
      STUDIO_SCENE_GALLERY.find((s) => s.categoryId === fallbackCategoryId) ||
      STUDIO_SCENE_GALLERY[0]
    );
  }

  let bestScene: StudioSceneOption | null = null;
  let bestScore = 0;

  for (const scene of STUDIO_SCENE_GALLERY) {
    let score = 0;
    for (const kw of scene.keywords) {
      if (normalized.includes(kw)) {
        score += kw.includes(' ') ? 4 : 2;
      }
    }
    if (fallbackCategoryId && scene.categoryId === fallbackCategoryId) {
      score += 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestScene = scene;
    }
  }

  if (bestScene && bestScore >= 1) {
    return bestScene;
  }

  return (
    STUDIO_SCENE_GALLERY.find((s) => s.categoryId === fallbackCategoryId) ||
    STUDIO_SCENE_GALLERY[0]
  );
}
