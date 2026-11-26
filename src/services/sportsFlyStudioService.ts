import { auth } from '../firebase';
import { clubSettingsService } from './operationsFirestoreService';
import { getStoredLocalCompanyProfile } from './companyProfileService';
import { getStoredWebsiteConfig } from './clubWebsiteService';
import { getStoredUserProfile } from '../data/userProfile';
import {
  SavedStudioDesign,
  StudioBrandKit,
  StudioDesignState,
} from '../data/sportsFlyStudioData';

const STUDIO_LOCAL_STORAGE_KEY = 'sportsfly_studio_workspace_v1';
const STUDIO_SETTING_KEY = 'sportsfly_studio_workspace';

export interface StudioWorkspacePayload {
  brandKit: StudioBrandKit;
  savedDesigns: SavedStudioDesign[];
}

export function getDefaultStudioBrandKit(): StudioBrandKit {
  const company = getStoredLocalCompanyProfile();
  const website = getStoredWebsiteConfig();
  const user = getStoredUserProfile();

  const resolvedClubName =
    (website?.siteTitle && website.siteTitle.trim()) ||
    (user?.club && user.club.trim()) ||
    (company?.companyName && company.companyName.trim()) ||
    'SportsFly Spor Akademisi';

  const resolvedLogo =
    (website?.logoUrl && website.logoUrl.startsWith('data:') ? website.logoUrl : '') ||
    (company?.logoDataUrl && company.logoDataUrl.startsWith('data:') ? company.logoDataUrl : '') ||
    '';

  const resolvedPhone =
    website?.contact?.phone ||
    company?.phone ||
    user?.phone ||
    '0216 850 1907';

  const resolvedWeb =
    website?.customDomain?.trim() ||
    (website?.subdomain ? `${website.subdomain}.sportsfly.com.tr` : 'webapp.sportsfly.com.tr');

  return {
    clubName: resolvedClubName,
    logoUrl: resolvedLogo,
    phone: resolvedPhone,
    websiteOrHandle: resolvedWeb,
    primaryColor: website?.primaryColor || '#1D4ED8',
    accentColor: website?.secondaryColor || '#F97316',
    defaultThemeId: 'navy-pro',
  };
}

function getWorkspaceDocId(uid: string): string {
  const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${STUDIO_SETTING_KEY}_${cleanUid}`.slice(0, 128);
}

/**
 * Strips heavy data URLs if needed so Firestore club_settings payload stays compact (<1MB)
 */
function sanitizeDesignForStorage(design: SavedStudioDesign): SavedStudioDesign {
  const safeLogo =
    design.state.clubLogoUrl && design.state.clubLogoUrl.length > 90000
      ? ''
      : design.state.clubLogoUrl;
  const safeHero =
    design.state.heroPhotoUrl && design.state.heroPhotoUrl.length > 90000
      ? ''
      : design.state.heroPhotoUrl;
  const safeAvatar =
    design.state.athleteAvatarUrl && design.state.athleteAvatarUrl.length > 90000
      ? ''
      : design.state.athleteAvatarUrl;
  const safeFeature =
    design.state.featureImageUrl && design.state.featureImageUrl.length > 90000
      ? ''
      : design.state.featureImageUrl || '';
  const safeCustomImages = Array.isArray(design.state.customImages)
    ? design.state.customImages
        .slice(0, 6)
        .filter((img) => img && typeof img.url === 'string' && img.url.length <= 90000)
    : [];

  const cleanState: StudioDesignState = {
    ...design.state,
    clubLogoUrl: safeLogo,
    heroPhotoUrl: safeHero,
    athleteAvatarUrl: safeAvatar,
    featureImageUrl: safeFeature,
    customImages: safeCustomImages,
  };

  return {
    id: design.id,
    title: String(design.title || cleanState.designName || 'Tasarım').slice(0, 120),
    categoryId: design.categoryId,
    aspectRatio: design.aspectRatio,
    updatedAt: design.updatedAt || new Date().toISOString(),
    state: cleanState,
  };
}

export function loadLocalStudioWorkspace(): StudioWorkspacePayload {
  const defaultKit = getDefaultStudioBrandKit();
  if (typeof window === 'undefined') {
    return { brandKit: defaultKit, savedDesigns: [] };
  }
  try {
    const raw = localStorage.getItem(STUDIO_LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        brandKit: { ...defaultKit, ...(parsed?.brandKit || {}) },
        savedDesigns: Array.isArray(parsed?.savedDesigns) ? parsed.savedDesigns : [],
      };
    }
  } catch (err) {
    console.warn('[SportsFlyStudio] LocalStorage read warning:', err);
  }
  return { brandKit: defaultKit, savedDesigns: [] };
}

export function saveLocalStudioWorkspace(payload: StudioWorkspacePayload): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STUDIO_LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    try {
      const compact: StudioWorkspacePayload = {
        brandKit: {
          ...payload.brandKit,
          logoUrl: payload.brandKit.logoUrl.length > 60000 ? '' : payload.brandKit.logoUrl,
        },
        savedDesigns: payload.savedDesigns.slice(0, 15).map(sanitizeDesignForStorage),
      };
      localStorage.setItem(STUDIO_LOCAL_STORAGE_KEY, JSON.stringify(compact));
    } catch (innerErr) {
      console.warn('[SportsFlyStudio] LocalStorage quota warning:', innerErr);
    }
  }
}

export async function fetchStudioWorkspaceFromFirestore(): Promise<StudioWorkspacePayload> {
  const localData = loadLocalStudioWorkspace();
  if (!auth.currentUser) {
    return localData;
  }

  try {
    const docId = getWorkspaceDocId(auth.currentUser.uid);
    const docData = await clubSettingsService.getById(docId);
    if (docData) {
      const configMap = (docData.config || {}) as Record<string, unknown>;
      const brandKitRaw = (configMap.brandKit || {}) as Partial<StudioBrandKit>;
      const rules = Array.isArray(docData.rulesList)
        ? (docData.rulesList as unknown as SavedStudioDesign[]).filter(
            (item) => item && typeof item === 'object' && item.id && item.state
          )
        : [];

      const merged: StudioWorkspacePayload = {
        brandKit: {
          ...localData.brandKit,
          ...brandKitRaw,
        },
        savedDesigns: rules.length > 0 ? rules : localData.savedDesigns,
      };
      saveLocalStudioWorkspace(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[SportsFlyStudio] Firestore fetch fallback to local:', err);
  }

  return localData;
}

export async function saveStudioWorkspaceToFirestore(
  payload: StudioWorkspacePayload
): Promise<void> {
  saveLocalStudioWorkspace(payload);
  if (!auth.currentUser) return;

  const docId = getWorkspaceDocId(auth.currentUser.uid);
  const compactBrandKit: StudioBrandKit = {
    ...payload.brandKit,
    logoUrl:
      payload.brandKit.logoUrl && payload.brandKit.logoUrl.length > 90000
        ? ''
        : payload.brandKit.logoUrl,
  };

  const compactDesigns = payload.savedDesigns
    .slice(0, 25)
    .map((d) => sanitizeDesignForStorage(d));

  await clubSettingsService.upsert({
    id: docId,
    settingKey: STUDIO_SETTING_KEY,
    config: {
      brandKit: compactBrandKit as unknown as Record<string, unknown>,
      updatedAt: new Date().toISOString(),
    },
    rulesList: compactDesigns as unknown as Record<string, unknown>[],
  });
}

/**
 * Compresses an uploaded image File into a crisp data URL (safe for canvas export & Firestore persistence).
 */
export function compressImageFileForStudio(
  file: File,
  maxDimension = 900,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Görsel dosyası okunamadı.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('Görsel verisi boş.'));
        return;
      }
      if (file.type === 'image/svg+xml' && result.length < 70000) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Görsel işlenemedi.'));
      img.onload = () => {
        let width = img.naturalWidth || maxDimension;
        let height = img.naturalHeight || maxDimension;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressed = canvas.toDataURL(outputMime, quality);
        resolve(compressed.length < result.length ? compressed : result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
