import { doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CompanyIntegrationProfile } from '../types';
import { getStoredUserProfile, saveStoredUserProfile } from '../data/userProfile';
import { SPORTSFLY_LOGO_DATA_URL } from '../assets/sportsFlyLogoDataUrl';
import { ROTA_PERFORMANS_LOGO_DATA_URL } from '../assets/rotaPerformansLogoDataUrl';

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
  logoDataUrl: ROTA_PERFORMANS_LOGO_DATA_URL,
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
        // Resolve logo: parsed logo -> session company logo -> access list logo -> fallback
        let resolvedLogo =
          parsed.logoDataUrl ||
          sessionStorage.getItem('sportsfly_active_company_logo') ||
          localStorage.getItem('sportsfly_active_company_logo') ||
          '';

        if (!resolvedLogo) {
          try {
            const accessListRaw = localStorage.getItem('sportsfly_integration_access_list');
            if (accessListRaw) {
              const accessList = JSON.parse(accessListRaw);
              if (Array.isArray(accessList)) {
                const found = accessList.find(
                  (a: any) =>
                    (parsed.accessCode && a.accessCode?.toUpperCase() === parsed.accessCode.toUpperCase()) ||
                    (parsed.companyName && a.companyName?.toLowerCase() === parsed.companyName.toLowerCase())
                );
                if (found?.logoDataUrl) {
                  resolvedLogo = found.logoDataUrl;
                }
              }
            }
          } catch (e) {}
        }

        if (!resolvedLogo && parsed.companyName?.toLowerCase().includes('rota')) {
          resolvedLogo = ROTA_PERFORMANS_LOGO_DATA_URL;
        }

        return {
          ...DEFAULT_COMPANY_PROFILE,
          ...parsed,
          logoDataUrl: resolvedLogo || DEFAULT_COMPANY_PROFILE.logoDataUrl,
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
    if (profile.logoDataUrl) {
      try {
        sessionStorage.setItem('sportsfly_active_company_logo', profile.logoDataUrl);
      } catch (e) {}
    }
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
 * Fetches company profile directly from Firestore.
 * Seamlessly populates local state on Vercel deployment even with clean browser storage.
 */
export async function fetchCompanyProfileFromFirestore(
  docId: string = COMPANY_PROFILE_DOC_ID
): Promise<CompanyIntegrationProfile> {
  const localProf = getStoredLocalCompanyProfile();
  const activeAccessCode =
    localProf.accessCode ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem('sportsfly_active_access_code') || ''
      : '');

  try {
    // 1. If user entered via integration with an access code, prioritize the specific company doc in 'integrations'
    if (activeAccessCode) {
      try {
        const q = query(
          collection(db, 'integrations'),
          where('accessCode', '==', activeAccessCode.trim().toUpperCase())
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const found = snap.docs[0].data() as Partial<CompanyIntegrationProfile>;
          let logo = found.logoDataUrl || '';
          if (!logo && (found.companyName?.toLowerCase().includes('rota') || localProf.companyName?.toLowerCase().includes('rota'))) {
            logo = ROTA_PERFORMANS_LOGO_DATA_URL;
          }
          const merged: CompanyIntegrationProfile = {
            ...DEFAULT_COMPANY_PROFILE,
            ...localProf,
            ...found,
            id: snap.docs[0].id,
            logoDataUrl: logo || localProf.logoDataUrl,
          };
          saveStoredLocalCompanyProfile(merged);
          return merged;
        }
      } catch (err) {
        console.warn('[CompanyProfile] Failed to query integrations by access code:', err);
      }
    }

    // 2. Also check if localProf.companyName matches a company in 'integrations'
    if (localProf.companyName) {
      try {
        const targetName = localProf.companyName.trim();
        let q = query(
          collection(db, 'integrations'),
          where('companyName', '==', targetName)
        );
        let snap = await getDocs(q);
        if (snap.empty && targetName.toLowerCase().includes('rota')) {
          q = query(
            collection(db, 'integrations'),
            where('companyName', '==', 'ROTA PERFORMANS')
          );
          snap = await getDocs(q);
        }
        if (!snap.empty) {
          const found = snap.docs[0].data() as Partial<CompanyIntegrationProfile>;
          let logo = found.logoDataUrl || '';
          if (!logo && (found.companyName?.toLowerCase().includes('rota') || localProf.companyName?.toLowerCase().includes('rota'))) {
            logo = ROTA_PERFORMANS_LOGO_DATA_URL;
          }
          const merged: CompanyIntegrationProfile = {
            ...DEFAULT_COMPANY_PROFILE,
            ...localProf,
            ...found,
            id: snap.docs[0].id,
            logoDataUrl: logo || localProf.logoDataUrl,
          };
          saveStoredLocalCompanyProfile(merged);
          return merged;
        }
      } catch (err) {
        console.warn('[CompanyProfile] Failed to query integrations by company name:', err);
      }
    }

    // 3. Try primary document in company_profile
    const docRef = doc(db, 'company_profile', docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as Partial<CompanyIntegrationProfile>;
      let logo = data.logoDataUrl || localProf.logoDataUrl || '';
      if (!logo && (data.companyName?.toLowerCase().includes('rota') || localProf.companyName?.toLowerCase().includes('rota'))) {
        logo = ROTA_PERFORMANS_LOGO_DATA_URL;
      }
      const merged: CompanyIntegrationProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        ...localProf,
        ...data,
        id: snap.id,
        logoDataUrl: logo,
      };
      saveStoredLocalCompanyProfile(merged);
      return merged;
    }

    // 4. If primary doesn't exist, check any document in company_profile collection (excluding lab_school_branding)
    const querySnapshot = await getDocs(collection(db, 'company_profile'));
    const firstDoc = querySnapshot.docs.find((d) => d.id !== 'lab_school_branding');
    if (firstDoc) {
      const data = firstDoc.data() as Partial<CompanyIntegrationProfile>;
      let logo = data.logoDataUrl || localProf.logoDataUrl || '';
      if (!logo && (data.companyName?.toLowerCase().includes('rota') || localProf.companyName?.toLowerCase().includes('rota'))) {
        logo = ROTA_PERFORMANS_LOGO_DATA_URL;
      }
      const merged: CompanyIntegrationProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        ...localProf,
        ...data,
        id: firstDoc.id,
        logoDataUrl: logo,
      };
      saveStoredLocalCompanyProfile(merged);
      return merged;
    }

    // 5. Fallback: check integrations collection for any defined company
    const intSnapshot = await getDocs(collection(db, 'integrations'));
    if (!intSnapshot.empty) {
      const firstInt = intSnapshot.docs[0];
      const data = firstInt.data() as Partial<CompanyIntegrationProfile>;
      let logo = data.logoDataUrl || localProf.logoDataUrl || '';
      if (!logo && (data.companyName?.toLowerCase().includes('rota') || localProf.companyName?.toLowerCase().includes('rota'))) {
        logo = ROTA_PERFORMANS_LOGO_DATA_URL;
      }
      const merged: CompanyIntegrationProfile = {
        ...DEFAULT_COMPANY_PROFILE,
        ...localProf,
        ...data,
        id: firstInt.id,
        logoDataUrl: logo,
      };
      saveStoredLocalCompanyProfile(merged);
      return merged;
    }

    // 6. If Firestore is empty, initialize default with logo into Firestore
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
