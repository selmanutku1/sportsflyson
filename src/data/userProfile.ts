import {
  secureStorageGet,
  secureStorageSet,
  sanitizeInputString,
  recordSecurityAuditEvent,
} from '../utils/securityCore';

export interface UserProfileData {
  name: string;
  email: string;
  phone: string;
  role: string;
  title: string;
  club: string;
  branch: string;
  avatarColor: string;
  avatarUrl?: string;
  bio: string;
  twoFactorEnabled: boolean;
  authProvider?: 'google' | 'standard' | 'integration';
  hasActivePackage?: boolean;
  // Company & Analysis Firm Profile Fields
  companyName?: string;
  companyType?: string;
  companyLogoUrl?: string;
  companyAuthorizedPerson?: string;
  companyCity?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyNotes?: string;
  companyAccessCode?: string;
  notifications: {
    newRegistrationEmail: boolean;
    newRegistrationSms: boolean;
    paymentEmail: boolean;
    paymentSms: boolean;
    reviewEmail: boolean;
    dailyDigest: boolean;
  };
  preferences: {
    defaultPage: string;
    dateFormat: string;
    soundEnabled: boolean;
    theme?: 'light' | 'dark' | 'system';
  };
}

export const DEFAULT_USER_PROFILE: UserProfileData = {
  name: 'Misafir Kullanıcı',
  email: '',
  phone: '',
  role: 'Misafir',
  title: 'Kulüp Kullanıcısı',
  club: 'SportsFly',
  branch: 'Genel',
  avatarColor: 'from-blue-600 to-indigo-600',
  bio: '',
  twoFactorEnabled: false,
  authProvider: 'standard',
  hasActivePackage: false,
  notifications: {
    newRegistrationEmail: true,
    newRegistrationSms: false,
    paymentEmail: true,
    paymentSms: false,
    reviewEmail: true,
    dailyDigest: false,
  },
  preferences: {
    defaultPage: 'anasayfa',
    dateFormat: 'DD.MM.YYYY',
    soundEnabled: true,
    theme: 'light',
  },
};

const STORAGE_KEY = 'sportsfly_user_profile_v1';

export const ADMIN_GOOGLE_EMAIL = 'selmanutkumarmara@gmail.com';

export function clearStoredUserProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('sportsfly_profile_updated', { detail: DEFAULT_USER_PROFILE }));
  } catch (err) {
    console.error('Failed to clear stored user profile:', err);
  }
}

export function getStoredUserProfile(): UserProfileData {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_PROFILE;
  }
  try {
    // Read local active company profile if available
    let companyData: any = null;
    try {
      const rawComp =
        sessionStorage.getItem('sportsfly_active_company_profile') ||
        localStorage.getItem('sportsfly_active_company_profile');
      if (rawComp) {
        companyData = JSON.parse(rawComp);
      }
    } catch (e) {}

    const stored = secureStorageGet<Partial<UserProfileData> | null>(STORAGE_KEY, null);
    if (stored && typeof stored === 'object') {
      const cleanEmail = sanitizeInputString(stored.email || '', 160);
      const isAdminEmail = cleanEmail.trim().toLowerCase() === ADMIN_GOOGLE_EMAIL;
      const rawRole = sanitizeInputString(stored.role || DEFAULT_USER_PROFILE.role, 60);
      const resolvedRole = isAdminEmail && (rawRole.toLowerCase().includes('google') || !rawRole)
        ? 'Süper Admin'
        : rawRole;

      const baseResult: UserProfileData = {
        ...DEFAULT_USER_PROFILE,
        ...stored,
        name: sanitizeInputString(stored.name || DEFAULT_USER_PROFILE.name, 100),
        email: cleanEmail,
        phone: sanitizeInputString(stored.phone || '', 32),
        role: resolvedRole,
        title: isAdminEmail && (stored.title || '').includes('Paket Seçilmedi')
          ? 'SportsFly Kulüp Yöneticisi'
          : sanitizeInputString(stored.title || DEFAULT_USER_PROFILE.title, 100),
        club: isAdminEmail && (stored.club || '').includes('Paket Seçimi')
          ? 'SportsFly Kadıköy Merkez Şube'
          : sanitizeInputString(stored.club || (companyData?.companyName || DEFAULT_USER_PROFILE.club), 140),
        hasActivePackage: isAdminEmail ? true : stored.hasActivePackage,
      };

      if (companyData) {
        baseResult.companyName = companyData.companyName || baseResult.companyName;
        baseResult.companyType = companyData.companyType || baseResult.companyType;
        baseResult.companyLogoUrl = companyData.logoDataUrl || baseResult.companyLogoUrl;
        baseResult.companyAuthorizedPerson = companyData.authorizedPerson || baseResult.companyAuthorizedPerson;
        baseResult.companyCity = companyData.city || baseResult.companyCity;
        baseResult.companyPhone = companyData.phone || baseResult.companyPhone;
        baseResult.companyEmail = companyData.email || baseResult.companyEmail;
        baseResult.companyAccessCode = companyData.accessCode || baseResult.companyAccessCode;
      }

      return baseResult;
    } else if (companyData) {
      return {
        ...DEFAULT_USER_PROFILE,
        club: companyData.companyName || DEFAULT_USER_PROFILE.club,
        companyName: companyData.companyName,
        companyType: companyData.companyType,
        companyLogoUrl: companyData.logoDataUrl,
        companyAuthorizedPerson: companyData.authorizedPerson,
        companyCity: companyData.city,
        companyPhone: companyData.phone,
        companyEmail: companyData.email,
        companyAccessCode: companyData.accessCode,
      };
    }
  } catch (err) {
    console.error('Failed to parse stored user profile:', err);
  }
  return DEFAULT_USER_PROFILE;
}

export function saveStoredUserProfile(profile: UserProfileData): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanProfile: UserProfileData = {
      ...profile,
      name: sanitizeInputString(profile.name, 100),
      email: sanitizeInputString(profile.email, 160),
      phone: sanitizeInputString(profile.phone, 32),
      role: sanitizeInputString(profile.role, 60),
      title: sanitizeInputString(profile.title, 100),
      club: sanitizeInputString(profile.club, 140),
      branch: sanitizeInputString(profile.branch, 200),
      bio: sanitizeInputString(profile.bio, 500),
    };
    secureStorageSet(STORAGE_KEY, cleanProfile);
    recordSecurityAuditEvent({
      category: 'AUTH',
      severity: 'INFO',
      action: 'USER_PROFILE_UPDATED',
      actor: cleanProfile.name || 'Kullanıcı',
      details: `Kullanıcı profili ve oturum rolü (${cleanProfile.role}) kriptografik imza ile güncellendi.`,
    });
    window.dispatchEvent(new CustomEvent('sportsfly_profile_updated', { detail: cleanProfile }));
  } catch (err) {
    console.error('Failed to save user profile:', err);
  }
}

export function syncGoogleProfileData(displayName?: string | null, photoURL?: string | null): void {
  const currentProf = getStoredUserProfile();
  saveStoredUserProfile({
    ...currentProf,
    name: displayName || currentProf.name,
    avatarUrl: photoURL || currentProf.avatarUrl,
  });
}
