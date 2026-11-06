export interface WebsiteGalleryItem {
  id: string;
  url: string;
  title: string;
  category?: 'Antrenman' | 'Maç & Turnuva' | 'Tesis' | 'Etkinlik';
}

export type BranchFigureKey =
  | 'basketbol'
  | 'futbol'
  | 'voleybol'
  | 'yuzme'
  | 'cimnastik'
  | 'tenis'
  | 'atletizm'
  | 'dovus'
  | 'okculuk'
  | 'fitness'
  | 'genel';

export interface WebsiteBranchItem {
  id: string;
  name: string;
  ageGroup: string;
  schedule: string;
  description: string;
  fee?: string;
  iconName?: string;
  figureKey?: BranchFigureKey;
  badge?: string;
  isActive: boolean;
}

export interface WebsiteCoachItem {
  id: string;
  name: string;
  role: string;
  experience?: string;
  photoUrl: string;
  bio: string;
}

export interface WebsiteFaqItem {
  question: string;
  answer: string;
}

export type WebsiteLayoutTheme = 'modern' | 'classic' | 'minimal';

export interface ClubWebsiteConfig {
  id: string;
  subdomain: string;
  customDomain?: string;
  isPublished: boolean;
  layoutTheme?: WebsiteLayoutTheme;
  siteTitle: string;
  tagline: string;
  aboutText: string;
  missionText?: string;
  logoUrl: string;
  heroImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  darkTheme: boolean;
  fontFamily?: string;
  
  // Gallery
  gallery: WebsiteGalleryItem[];
  
  // Programs & Branches
  branches: WebsiteBranchItem[];
  
  // Coaching Staff
  coaches: WebsiteCoachItem[];
  
  // Contact
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    city: string;
    workingHours: string;
    mapEmbedQuery?: string;
  };
  
  // Social Media
  social: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    twitter?: string;
  };
  
  // Stats
  stats: {
    activeAthletes: number;
    championships: number;
    expertCoaches: number;
    facilitiesCount: number;
  };
  
  // Features toggle
  features: {
    showOnlineRegistration: boolean;
    showGallery: boolean;
    showCoaches: boolean;
    showSchedule: boolean;
    showFaq: boolean;
    showStats: boolean;
    showAnnouncementBar: boolean;
    announcementText?: string;
  };
  
  // FAQs
  faqs: WebsiteFaqItem[];
  
  // SEO
  seo: {
    metaDescription: string;
    metaKeywords: string;
  };
  
  publishedAt?: string;
  updatedAt: string;
}
