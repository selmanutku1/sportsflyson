import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CompanyIntegrationProfile } from '../types';
import { getStoredUserProfile, saveStoredUserProfile } from '../data/userProfile';

export const COMPANY_PROFILE_STORAGE_KEY = 'sportsfly_active_company_profile';
export const COMPANY_PROFILE_DOC_ID = 'primary';

export const DEFAULT_COMPANY_PROFILE: CompanyIntegrationProfile = {
  id: COMPANY_PROFILE_DOC_ID,
  companyName: 'Rota Performans & Sporcu Analiz LAB',
  accessCode: 'LAB-2026',
  companyType: 'analiz_firmasi',
  authorizedPerson: 'Selman Utku Marmara',
  phone: '0216 850 1907',
  email: 'selmanutkumarmara@gmail.com',
  city: 'İstanbul',
  branchName: 'Merkez Şube & Sporcu Analiz Laboratuvarı',
  logoDataUrl: '',
  notes: 'SportsFly LAB atletik performans ve beden kompozisyonu analiz entegrasyonu.',
  activeModules: {
    'sportsfly-lab': true,
    'sporcu-karnesi': true,
  },
  updatedAt: new Date().toISOString(),
};

/**
 * Gets cached/local company profile, or returns default company profile.
 * Guarantees that active company profile is NEVER null on fresh Vercel deploy.
 */
export function getStoredLocalCompanyProfile(): CompanyIntegrationProfile {
  if (typeof window === 'undefined') return DEFAULT_COMPANY_PROFILE;
  try {
    const raw =
      sessionStorage.getItem(COMPANY_PROFILE_STORAGE_KEY) ||
      localStorage.getItem(COMPANY_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.companyName) {
        return {
          ...DEFAULT_COMPANY_PROFILE,
          ...parsed,
        };
      }
    }
  } catch (err) {
    console.warn('[CompanyProfile] Failed to read local storage:', err);
  }
  return DEFAULT_COMPANY_PROFILE;
}

/**
 * Saves company profile to local & session storage, and updates user profile club info.
 */
export function saveStoredLocalCompanyProfile(profile: CompanyIntegrationProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(profile);
    try {
      sessionStorage.setItem(COMPANY_PROFILE_STORAGE_KEY, serialized);
    } catch (e) {
      // ignore session storage quota
    }
    try {
      localStorage.setItem(COMPANY_PROFILE_STORAGE_KEY, serialized);
    } catch (e) {
      // If localStorage quota exceeded due to large logo data URL, save without heavy logo data URL in localStorage
      const minimalProfile = { ...profile, logoDataUrl: profile.logoDataUrl && profile.logoDataUrl.length > 50000 ? '' : profile.logoDataUrl };
      try {
        localStorage.setItem(COMPANY_PROFILE_STORAGE_KEY, JSON.stringify(minimalProfile));
      } catch (innerErr) {
        console.warn('[CompanyProfile] LocalStorage quota exceeded completely:', innerErr);
      }
    }

    // Also sync to active user profile
    const currentProf = getStoredUserProfile();
    if (currentProf) {
      saveStoredUserProfile({
        ...currentProf,
        club: profile.companyName || currentProf.club,
        branch: profile.branchName || currentProf.branch,
        phone: profile.phone || currentProf.phone,
      });
    }

    // Dispatch global event for live reactive updates across views
    window.dispatchEvent(
      new CustomEvent('sportsfly_company_profile_updated', { detail: profile })
    );
  } catch (err) {
    console.warn('[CompanyProfile] Failed to save local profile:', err);
  }
}

/**
 * Fetches company profile directly from Firestore 'company_profile' collection.
 * Seamlessly populates local state on Vercel deployment even with clean browser storage.
 */
export async function fetchCompanyProfileFromFirestore(
  docId: string = COMPANY_PROFILE_DOC_ID
): Promise<CompanyIntegrationProfile> {
  try {
    // 1. Try primary document in company_profile
    const docRef = doc(db, 'company_profile', docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as Partial<CompanyIntegrationProfile>;
      const merged: CompanyIntegrationProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        ...data,
        id: snap.id,
      };
      saveStoredLocalCompanyProfile(merged);
      return merged;
    }

    // 2. If primary doesn't exist, check any document in company_profile collection
    const querySnapshot = await getDocs(collection(db, 'company_profile'));
    if (!querySnapshot.empty) {
      const firstDoc = querySnapshot.docs[0];
      const data = firstDoc.data() as Partial<CompanyIntegrationProfile>;
      const merged: CompanyIntegrationProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        ...data,
        id: firstDoc.id,
      };
      saveStoredLocalCompanyProfile(merged);
      return merged;
    }

    // 3. Fallback: check integrations collection
    const intSnapshot = await getDocs(collection(db, 'integrations'));
    if (!intSnapshot.empty) {
      const firstInt = intSnapshot.docs[0];
      const data = firstInt.data() as Partial<CompanyIntegrationProfile>;
      const merged: CompanyIntegrationProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        ...data,
        id: firstInt.id,
      };
      saveStoredLocalCompanyProfile(merged);
      return merged;
    }

    // 4. If Firestore is empty, initialize the default company profile into Firestore
    await saveCompanyProfileToFirestore(DEFAULT_COMPANY_PROFILE, docId);
    return DEFAULT_COMPANY_PROFILE;
  } catch (err) {
    console.warn('[CompanyProfile] Firestore fetch failed, using local/default:', err);
    return getStoredLocalCompanyProfile();
  }
}

/**
 * Persists company profile to Firestore 'company_profile' collection.
 */
export async function saveCompanyProfileToFirestore(
  profile: Partial<CompanyIntegrationProfile>,
  docId: string = COMPANY_PROFILE_DOC_ID
): Promise<CompanyIntegrationProfile> {
  const current = getStoredLocalCompanyProfile();
  const merged: CompanyIntegrationProfile = {
    ...current,
    ...profile,
    id: docId,
    updatedAt: new Date().toISOString(),
  };

  // Always save locally first for instantaneous UI reactivity
  saveStoredLocalCompanyProfile(merged);

  try {
    const docRef = doc(db, 'company_profile', docId);
    await setDoc(
      docRef,
      {
        ...merged,
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[CompanyProfile] Error saving to Firestore company_profile:', err);
  }

  return merged;
}
