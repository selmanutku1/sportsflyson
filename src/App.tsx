import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { NavPage, PackagePlanType } from './types';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { INITIAL_SPORCULAR } from './data/mockData';
import { PackageAccessRestrictedView } from './components/views/PackageAccessRestrictedView';
import { LoginView } from './components/LoginView';
import { IntegrationSelectorView } from './components/views/IntegrationSelectorView';
import { PointEarnedPushToast } from './components/notifications/PointEarnedPushToast';
import { ReminderPushToast } from './components/notifications/ReminderPushToast';
import { RealUserApprovedPushToast } from './components/notifications/RealUserApprovedPushToast';
import { subscribeToRealDatabaseUserNotifications } from './services/realDatabaseNotificationService';
import {
  getActiveSessionPlan,
  isPageAllowedForPlan,
  getPageRestrictionInfo,
  isSuperAdminUser,
  isGoogleRestrictedUser,
  isGoogleUserPageUnlocked,
} from './data/packagePermissions';
import {
  getStoredUserProfile,
  saveStoredUserProfile,
  clearStoredUserProfile,
  DEFAULT_USER_PROFILE,
  UserProfileData,
  ADMIN_GOOGLE_EMAIL,
} from './data/userProfile';
import { auth, testFirestoreConnection } from './firebase';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { fetchAndMergeGoogleUsersFromFirestore, getGoogleUserAccessByEmail } from './data/googleUsersAccess';
import { syncGoogleProfileData, ensureFirebaseAuthSession } from './services/userService';
import { fetchCompanyProfileFromFirestore } from './services/companyProfileService';
import { clearSportsFlyLegacyData } from './data/sportsFlyLabData';
import { seedInitialCoreCollectionsIfEmpty, sporcularService } from './services/firestoreService';
import { mapFirestoreDocToSporcuItem } from './services/firestoreCollectionsSchema';
import { seedAllOperationalCollectionsIfEmpty } from './services/operationsFirestoreService';
import { initCapacitorMobileBridge, isNativeCapacitorApp } from './utils/mobileBridge';
import { SporcuItem } from './types';

// Lazy-loaded view modules for instant initial load & code splitting
import { DashboardView } from './components/views/DashboardView';
const SporsepetiUserView = lazy(() =>
  import('./components/views/SporsepetiUserView').then((m) => ({ default: m.SporsepetiUserView }))
);
const SporcularView = lazy(() =>
  import('./components/views/SporcularView').then((m) => ({ default: m.SporcularView }))
);
const EgitmenlerView = lazy(() =>
  import('./components/views/EgitmenlerView').then((m) => ({ default: m.EgitmenlerView }))
);
const AntrenmanTakvimiView = lazy(() =>
  import('./components/views/AntrenmanTakvimiView').then((m) => ({ default: m.AntrenmanTakvimiView }))
);
const YoneticilerView = lazy(() =>
  import('./components/views/YoneticilerView').then((m) => ({ default: m.YoneticilerView }))
);
const SporpuanDegerlendirmelerView = lazy(() =>
  import('./components/views/sporpuan/SporpuanDegerlendirmelerView').then((m) => ({
    default: m.SporpuanDegerlendirmelerView,
  }))
);
const SporpuanSporcuDegerlendirmeView = lazy(() =>
  import('./components/views/sporpuan/SporpuanSporcuDegerlendirmeView').then((m) => ({
    default: m.SporpuanSporcuDegerlendirmeView,
  }))
);
const SporpuanDogrulamalarView = lazy(() =>
  import('./components/views/sporpuan/SporpuanDogrulamalarView').then((m) => ({
    default: m.SporpuanDogrulamalarView,
  }))
);
const SporpuanRaporlarView = lazy(() =>
  import('./components/views/sporpuan/SporpuanRaporlarView').then((m) => ({
    default: m.SporpuanRaporlarView,
  }))
);
const GruplarView = lazy(() =>
  import('./components/views/GruplarView').then((m) => ({ default: m.GruplarView }))
);
const OnMuhasebeView = lazy(() =>
  import('./components/views/OnMuhasebeView').then((m) => ({ default: m.OnMuhasebeView }))
);
const YoklamaView = lazy(() =>
  import('./components/views/YoklamaView').then((m) => ({ default: m.YoklamaView }))
);
const AnketYonetimiView = lazy(() =>
  import('./components/views/AnketYonetimiView').then((m) => ({ default: m.AnketYonetimiView }))
);
const SporcuKarnesiView = lazy(() =>
  import('./components/views/SporcuKarnesiView').then((m) => ({ default: m.SporcuKarnesiView }))
);
const EgitimPlanlamaView = lazy(() =>
  import('./components/views/EgitimPlanlamaView').then((m) => ({ default: m.EgitimPlanlamaView }))
);
const KulupSozlesmeleriView = lazy(() =>
  import('./components/views/KulupSozlesmeleriView').then((m) => ({ default: m.KulupSozlesmeleriView }))
);
const SporOkuluBasvurulariView = lazy(() =>
  import('./components/views/SporOkuluBasvurulariView').then((m) => ({
    default: m.SporOkuluBasvurulariView,
  }))
);
const KulupEvraklariView = lazy(() =>
  import('./components/views/sporcu/KulupEvraklariView').then((m) => ({
    default: m.KulupEvraklariView,
  }))
);
const KulupGalerisiView = lazy(() =>
  import('./components/views/sporcu/KulupGalerisiView').then((m) => ({
    default: m.KulupGalerisiView,
  }))
);
const TurnuvaYonetimiView = lazy(() =>
  import('./components/views/moduller/TurnuvaYonetimiView').then((m) => ({
    default: m.TurnuvaYonetimiView,
  }))
);
const EnvanterYonetimiView = lazy(() =>
  import('./components/views/moduller/EnvanterYonetimiView').then((m) => ({
    default: m.EnvanterYonetimiView,
  }))
);
const ClubWebsiteBuilderView = lazy(() =>
  import('./components/views/moduller/ClubWebsiteBuilderView').then((m) => ({
    default: m.ClubWebsiteBuilderView,
  }))
);
const SportsFlyIntelligenceView = lazy(() =>
  import('./components/views/moduller/SportsFlyIntelligenceView').then((m) => ({
    default: m.SportsFlyIntelligenceView,
  }))
);
const SportsFlyLabView = lazy(() =>
  import('./components/views/moduller/SportsFlyLabView').then((m) => ({
    default: m.SportsFlyLabView,
  }))
);
const SportsFlyStudioView = lazy(() =>
  import('./components/views/moduller/SportsFlyStudioView').then((m) => ({
    default: m.SportsFlyStudioView,
  }))
);
const DosyaHavuzuView = lazy(() =>
  import('./components/views/DosyaHavuzuView').then((m) => ({
    default: m.DosyaHavuzuView,
  }))
);
import { EntegrasyonlarView } from './components/views/EntegrasyonlarView';
import { PaketlerView } from './components/views/PaketlerView';
const OnKayitView = lazy(() =>
  import('./components/views/OnKayitView').then((m) => ({ default: m.OnKayitView }))
);
const YetkilendirmelerView = lazy(() =>
  import('./components/views/YetkilendirmelerView').then((m) => ({ default: m.YetkilendirmelerView }))
);
const EpostaServisYapilandirmasiView = lazy(() =>
  import('./components/views/EpostaServisYapilandirmasiView').then((m) => ({
    default: m.EpostaServisYapilandirmasiView,
  }))
);
const SubelerView = lazy(() =>
  import('./components/views/SubelerView').then((m) => ({ default: m.SubelerView }))
);
const SubeOzetView = lazy(() =>
  import('./components/views/SubeOzetView').then((m) => ({ default: m.SubeOzetView }))
);
const DestekView = lazy(() =>
  import('./components/views/DestekView').then((m) => ({ default: m.DestekView }))
);
const GenericPageView = lazy(() =>
  import('./components/views/GenericPageView').then((m) => ({ default: m.GenericPageView }))
);

const ViewLoadingSkeleton: React.FC = () => (
  <div className="w-full space-y-4 animate-pulse py-2">
    <div className="h-20 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 w-full" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
    </div>
    <div className="h-80 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 w-full" />
  </div>
);

export default function App() {
  // Safe version-checker hook to keep cache fresh without abrupt reload loops
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.timestamp) {
            const storedVersionKey = 'sportsfly_app_version_timestamp';
            const lastStored = localStorage.getItem(storedVersionKey);
            if (!lastStored) {
              localStorage.setItem(storedVersionKey, data.timestamp.toString());
            } else if (Number(lastStored) !== data.timestamp) {
              // Update stored timestamp
              localStorage.setItem(storedVersionKey, data.timestamp.toString());
              // Only trigger a reload if we haven't already reloaded in this session for this version
              const sessionKey = `sportsfly_v_reload_${data.timestamp}`;
              if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
                sessionStorage.setItem(sessionKey, 'true');
                console.info('[SportsFly] Yeni uygulama sürümü algılandı:', data.version || data.timestamp);
              }
            }
          }
        }
      } catch (e) {
        // Ignore network errors during version check
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 120000); // Check every 2 minutes
    
    // Clear legacy data safely once on first load
    try {
      clearSportsFlyLegacyData();
    } catch (e) {
      console.warn('[SportsFly] Legacy data cleanup notice:', e);
    }

    return () => clearInterval(interval);
  }, []);

  const isExplicitLogoutRef = useRef<boolean>(false);
  const manualSessionActiveRef = useRef<boolean>(false);

  // Authentication State: Restore active session unless explicitly logged out or arriving via /login
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const url = new URL(window.location.href);
      const path = url.pathname.toLowerCase();
      if (
        path === '/login' ||
        path === '/giris' ||
        url.searchParams.has('login') ||
        url.searchParams.has('forceLogin') ||
        url.searchParams.has('logout') ||
        url.searchParams.get('action') === 'login'
      ) {
        return false;
      }
      if (document.referrer) {
        const refHost = new URL(document.referrer).hostname.toLowerCase();
        if (refHost === 'sportsfly.com.tr' || refHost === 'www.sportsfly.com.tr') {
          return false;
        }
      }
      const hasPersistedAuth =
        sessionStorage.getItem('sportsfly_auth_active') === 'true' ||
        localStorage.getItem('sportsfly_auth_active') === 'true';
      const storedProf = getStoredUserProfile();
      const hasValidProfile =
        Boolean(storedProf) &&
        storedProf.role !== 'Misafir' &&
        (Boolean(storedProf.email) ||
          storedProf.role === 'Entegrasyon Kullanıcısı' ||
          storedProf.role === 'LAB Kullanıcısı' ||
          storedProf.role === 'Süper Admin' ||
          storedProf.role === 'Kulüp Yöneticisi');
      return hasPersistedAuth && hasValidProfile;
    } catch {
      return false;
    }
  });

  const [isIntegrationActive, setIsIntegrationActive] = useState<boolean>(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [firebaseUserUid, setFirebaseUserUid] = useState<string | null>(() => auth.currentUser?.uid || null);

  const handleLoginSuccess = async (
    userData:
      | {
          email?: string;
          name?: string;
          photoURL?: string;
          uid?: string;
          role?: string;
          clubName?: string;
          authProvider?: 'google' | 'standard' | 'integration';
        }
      | string
  ) => {
    isExplicitLogoutRef.current = false;
    manualSessionActiveRef.current = true;
    try {
      sessionStorage.setItem('sportsfly_auth_active', 'true');
      localStorage.setItem('sportsfly_auth_active', 'true');
    } catch (e) {}

    const userObj =
      typeof userData === 'string'
        ? { role: userData, email: '', name: userData, uid: '', photoURL: undefined, authProvider: undefined }
        : userData;

    const isGoogleAuthLogin =
      userObj.authProvider === 'google' ||
      Boolean(userObj.uid) ||
      (userObj.role || '').toLowerCase().includes('google');

    // Sync Google users strictly as Google auth; standard email/phone logins keep standard session
    if (isGoogleAuthLogin && userObj.email && userObj.name) {
      await syncGoogleProfileData(userObj.email, userObj.name, userObj.photoURL, userObj.uid);
    } else {
      const currentProf = getStoredUserProfile();
      await ensureFirebaseAuthSession({
        email: userObj.email || currentProf.email || '',
        displayName: userObj.name || currentProf.name || 'Kullanıcı',
        photoURL: userObj.photoURL,
        uid: userObj.uid,
      });
    }

    const freshProfile = getStoredUserProfile();
    setUserProfile(freshProfile);
    setIsAuthenticated(true);

    const isIntegrationLogin =
      userObj.role === 'Entegrasyon Kullanıcısı' ||
      userObj.role === 'LAB Kullanıcısı' ||
      (() => {
        try {
          return sessionStorage.getItem('sportsfly_integration_active') === 'true';
        } catch {
          return false;
        }
      })();

    // Non-blocking background seed if collections are empty (skip for restricted Google users and read-only integration sessions)
    if (
      auth.currentUser &&
      !isIntegrationLogin &&
      !isGoogleRestrictedUser(freshProfile?.role || userObj.role, freshProfile?.email || userObj.email)
    ) {
      seedInitialCoreCollectionsIfEmpty().catch((e) =>
        console.warn('[Firestore] Core seed warning:', e)
      );
      seedAllOperationalCollectionsIfEmpty().catch((e) =>
        console.warn('[Firestore] Operational seed warning:', e)
      );
    }
    if (isGoogleRestrictedUser(freshProfile?.role || userObj.role, freshProfile?.email || userObj.email)) {
      setCurrentPage('paketler');
      try {
        sessionStorage.setItem('sportsfly_active_page', 'paketler');
      } catch (e) {}
    } else if (!isSuperAdminUser(userObj.role || freshProfile?.role, freshProfile?.email)) {
      setCurrentPage((prev) =>
        prev === 'spor-okulu-basvurulari' ? 'anasayfa' : prev
      );
    }
    try {
      const isIntegration =
        userObj.role === 'Entegrasyon Kullanıcısı' ||
        userObj.role === 'LAB Kullanıcısı' ||
        sessionStorage.getItem('sportsfly_integration_active') === 'true';
      if (isIntegration) {
        setIsIntegrationActive(true);
        setCurrentPage('entegrasyonlar');
        sessionStorage.setItem('sportsfly_integration_active', 'true');
      }
    } catch (e) {}
  };

  const handleLogout = async () => {
    isExplicitLogoutRef.current = true;
    manualSessionActiveRef.current = false;
    try {
      sessionStorage.setItem('sportsfly_auth_active', 'false');
      sessionStorage.removeItem('sportsfly_google_login_pending');
      localStorage.setItem('sportsfly_auth_active', 'false');
      sessionStorage.removeItem('sportsfly_active_page');
      sessionStorage.removeItem('sportsfly_integration_active');
      sessionStorage.removeItem('sportsfly_integration_entry_source');
      sessionStorage.removeItem('sportsfly_active_company_profile');
      localStorage.removeItem('sportsfly_integration_entry_source');
      localStorage.removeItem('sportsfly_active_company_profile');
      clearStoredUserProfile();
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('sportsfly_auth_channel');
        ch.postMessage({ type: 'LOGOUT' });
        ch.close();
      }
    } catch (e) {}

    setUserProfile(DEFAULT_USER_PROFILE);
    setIsAuthenticated(false);
    setIsIntegrationActive(false);
    setSelectedIntegrationId(null);
    setCurrentPage('anasayfa');

    try {
      await Promise.race([
        signOut(auth),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    } catch {
      // ignore signOut errors
    }
  };

  const mainScrollRef = useRef<HTMLElement | null>(null);

  const [currentPage, setCurrentPage] = useState<NavPage>(() => {
    if (typeof window !== 'undefined') {
      try {
        const activeSessionPage = sessionStorage.getItem('sportsfly_active_page');
        if (activeSessionPage) {
          return activeSessionPage as NavPage;
        }
      } catch (e) {}
    }
    return 'anasayfa';
  });

  const [currentPlan, setCurrentPlan] = useState<PackagePlanType>(() => getActiveSessionPlan());
  const [userProfile, setUserProfile] = useState<UserProfileData>(() => getStoredUserProfile());
  const [syncedSporcular, setSyncedSporcular] = useState<SporcuItem[]>(() => {
    try {
      const saved = localStorage.getItem('sportsfly_sporcular');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SPORCULAR;
  });

  // Subscribe to sporcular collection when authenticated and Firebase Auth is ready
  useEffect(() => {
    if (!isAuthenticated || !firebaseUserUid) return;
    const unsub = sporcularService.subscribe((docs) => {
      const mapped = docs.map(mapFirestoreDocToSporcuItem);
      if (mapped.length > 0) {
        setSyncedSporcular(mapped);
        try {
          localStorage.setItem('sportsfly_sporcular', JSON.stringify(mapped));
          window.dispatchEvent(new CustomEvent('sportsfly_sporcular_updated', { detail: mapped }));
        } catch {}
      }
    });
    return () => unsub();
  }, [isAuthenticated, firebaseUserUid]);

  // Listen for plan, profile, cross-tab auth, browser back/forward, and Escape key
  useEffect(() => {
    testFirestoreConnection().catch(() => {});
    const handlePlanUpdate = () => {
      setCurrentPlan(getActiveSessionPlan());
    };

    const handleProfileUpdate = () => {
      setUserProfile(getStoredUserProfile());
    };

    const handleGoogleUsersUpdate = () => {
      setUserProfile(getStoredUserProfile());
    };

    const handlePopState = (event: PopStateEvent) => {
      const targetPage = event.state?.sportsflyPage as NavPage | undefined;
      if (targetPage) {
        const latestProf = getStoredUserProfile();
        const safePage: NavPage =
          isGoogleRestrictedUser(latestProf?.role, latestProf?.email) &&
          !isGoogleUserPageUnlocked(targetPage, latestProf?.email)
            ? 'paketler'
            : targetPage;
        setCurrentPage(safePage);
        try {
          sessionStorage.setItem('sportsfly_active_page', safePage);
        } catch (e) {}
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };

    void initCapacitorMobileBridge(() => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024 && isSidebarOpen) {
        setIsSidebarOpen(false);
        return true;
      }
      return false;
    });

    if (isNativeCapacitorApp()) {
      getRedirectResult(auth)
        .then((res) => {
          if (res?.user?.email) {
            const cleanEmail = res.user.email.trim().toLowerCase();
            void syncGoogleProfileData(
              cleanEmail,
              res.user.displayName ||
                (cleanEmail === ADMIN_GOOGLE_EMAIL ? 'Selman Utku Marmara' : 'Google Kullanıcısı'),
              res.user.photoURL || undefined,
              res.user.uid,
              res.user
            );
          }
        })
        .catch(() => {});
    }

    // Detect explicit login/logout navigation (e.g. /login, ?forceLogin, or external sportsfly.com.tr "Kulüp Girişi")
    // while preserving active sessions across preview iframe refreshes and in-tab reloads.
    const isNativeMobile = isNativeCapacitorApp();
    const isFreshLoginEntry = (() => {
      if (typeof window === 'undefined') return false;
      try {
        const url = new URL(window.location.href);
        const path = url.pathname.toLowerCase();
        const hasForceLoginParam =
          path === '/login' ||
          path === '/giris' ||
          url.searchParams.has('login') ||
          url.searchParams.has('forceLogin') ||
          url.searchParams.has('logout') ||
          url.searchParams.get('action') === 'login';
        if (hasForceLoginParam) return true;

        if (isNativeMobile) {
          return false;
        }

        if (document.referrer) {
          try {
            const refUrl = new URL(document.referrer);
            const refHost = refUrl.hostname.toLowerCase();
            if (refHost === 'sportsfly.com.tr' || refHost === 'www.sportsfly.com.tr') {
              return true;
            }
          } catch {}
        }
      } catch {}
      return false;
    })();

    if (isFreshLoginEntry && !manualSessionActiveRef.current) {
      try {
        sessionStorage.removeItem('sportsfly_auth_active');
        sessionStorage.removeItem('sportsfly_google_login_pending');
        sessionStorage.removeItem('sportsfly_integration_active');
        sessionStorage.removeItem('sportsfly_active_page');
        localStorage.removeItem('sportsfly_auth_active');
      } catch (e) {}
      clearStoredUserProfile();
      setUserProfile(DEFAULT_USER_PROFILE);
      setIsAuthenticated(false);
      setIsIntegrationActive(false);
      signOut(auth).catch(() => {});
    } else if (!manualSessionActiveRef.current && typeof window !== 'undefined') {
      try {
        const hasPersistedAuth =
          sessionStorage.getItem('sportsfly_auth_active') === 'true' ||
          localStorage.getItem('sportsfly_auth_active') === 'true';
        const storedProf = getStoredUserProfile();
        const hasValidProfile =
          Boolean(storedProf) &&
          storedProf.role !== 'Misafir' &&
          (Boolean(storedProf.email) ||
            storedProf.role === 'Entegrasyon Kullanıcısı' ||
            storedProf.role === 'LAB Kullanıcısı' ||
            storedProf.role === 'Süper Admin' ||
            storedProf.role === 'Kulüp Yöneticisi');
        if (hasPersistedAuth && hasValidProfile) {
          sessionStorage.setItem('sportsfly_auth_active', 'true');
          setUserProfile(storedProf);
          setIsAuthenticated(true);
          if (
            sessionStorage.getItem('sportsfly_integration_active') === 'true' ||
            storedProf.role === 'Entegrasyon Kullanıcısı' ||
            storedProf.role === 'LAB Kullanıcısı'
          ) {
            setIsIntegrationActive(true);
          }
        }
      } catch {}
    }

    let authChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        authChannel = new BroadcastChannel('sportsfly_auth_channel');
        authChannel.onmessage = (ev) => {
          if (ev.data?.type === 'LOGOUT') {
            isExplicitLogoutRef.current = true;
            manualSessionActiveRef.current = false;
            setIsAuthenticated(false);
            setIsIntegrationActive(false);
            setSelectedIntegrationId(null);
            setUserProfile(DEFAULT_USER_PROFILE);
            try {
              sessionStorage.setItem('sportsfly_auth_active', 'false');
              sessionStorage.removeItem('sportsfly_google_login_pending');
              localStorage.setItem('sportsfly_auth_active', 'false');
              sessionStorage.removeItem('sportsfly_active_page');
            } catch (e) {}
          }
        };
      } catch (e) {}
    }

    window.addEventListener('storage', handlePlanUpdate);
    window.addEventListener('sportsfly_plan_changed', handlePlanUpdate);
    window.addEventListener('sportsfly_plan_updated', handlePlanUpdate);
    window.addEventListener('sportsfly_profile_updated', handleProfileUpdate);
    window.addEventListener('sportsfly_company_profile_updated', handleProfileUpdate);
    window.addEventListener('sportsfly_google_users_updated', handleGoogleUsersUpdate);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    // Subscribe to verified real user approval notifications from Firestore database
    const unsubscribeRealDbNotifs = subscribeToRealDatabaseUserNotifications();

    // Firebase Auth session listener & Firestore sync
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUserUid(currentUser?.uid || null);
      if (isExplicitLogoutRef.current) {
        setIsAuthenticated(false);
        return;
      }

      let isGoogleLoginInProgress = false;
      let hasActiveTabSession = false;
      let wasExplicitlyLoggedOut = false;
      try {
        isGoogleLoginInProgress =
          sessionStorage.getItem('sportsfly_google_login_pending') === 'true';
        hasActiveTabSession =
          sessionStorage.getItem('sportsfly_auth_active') === 'true' ||
          localStorage.getItem('sportsfly_auth_active') === 'true';
        wasExplicitlyLoggedOut =
          localStorage.getItem('sportsfly_auth_active') === 'false' ||
          sessionStorage.getItem('sportsfly_auth_active') === 'false';
      } catch (e) {}

      if (currentUser && !currentUser.isAnonymous && currentUser.email) {
        // Restore real signed-in Firebase users unless arriving from explicit login/logout route or explicitly logged out.
        const canAuthenticate =
          isNativeMobile ||
          manualSessionActiveRef.current ||
          isGoogleLoginInProgress ||
          (!isFreshLoginEntry && !wasExplicitlyLoggedOut);

        if (!canAuthenticate) {
          signOut(auth).catch(() => {});
          clearStoredUserProfile();
          setUserProfile(DEFAULT_USER_PROFILE);
          setIsAuthenticated(false);
          return;
        }

        try {
          sessionStorage.setItem('sportsfly_auth_active', 'true');
          localStorage.setItem('sportsfly_auth_active', 'true');
        } catch (e) {}

        const cleanEmail = currentUser.email.trim().toLowerCase();
        const isSuperAdminAccount = cleanEmail === ADMIN_GOOGLE_EMAIL;
        const currentProf = getStoredUserProfile();
        const googleRecord = !isSuperAdminAccount ? getGoogleUserAccessByEmail(cleanEmail) : null;
        const hasFullAccessByAdmin = Boolean(googleRecord?.isFullAccess);

        const syncedProfile: UserProfileData = {
          ...currentProf,
          name:
            currentUser.displayName ||
            (isSuperAdminAccount
              ? 'Selman Utku Marmara'
              : currentProf.name && currentProf.name !== 'Misafir Kullanıcı'
                ? currentProf.name
                : 'Google Kullanıcısı'),
          email: cleanEmail,
          avatarUrl: currentUser.photoURL || currentProf.avatarUrl,
          role: isSuperAdminAccount ? 'Süper Admin' : 'Google Kullanıcısı',
          title: isSuperAdminAccount ? 'SportsFly Kulüp Yöneticisi' : 'Google Hesabı',
          club: isSuperAdminAccount
            ? 'SportsFly Kadıköy Merkez Şube'
            : googleRecord?.clubName || 'Paket Seçimi Bekleniyor',
          authProvider: 'google',
          hasActivePackage: isSuperAdminAccount ? true : hasFullAccessByAdmin,
          preferences: {
            ...currentProf.preferences,
            defaultPage: isSuperAdminAccount || hasFullAccessByAdmin ? 'anasayfa' : 'paketler',
          },
        };
        saveStoredUserProfile(syncedProfile);
        setUserProfile(syncedProfile);
        if (!isSuperAdminAccount && !hasFullAccessByAdmin) {
          setCurrentPage((prev) =>
            isGoogleUserPageUnlocked(prev, cleanEmail) ? prev : 'paketler'
          );
          try {
            sessionStorage.setItem('sportsfly_active_page', 'paketler');
          } catch (e) {}
        }
        setIsAuthenticated(true);
        fetchAndMergeGoogleUsersFromFirestore().catch(() => {});
        fetchCompanyProfileFromFirestore().catch(() => {});
        if (isSuperAdminAccount || hasFullAccessByAdmin) {
          seedInitialCoreCollectionsIfEmpty().catch(() => {});
          seedAllOperationalCollectionsIfEmpty().catch(() => {});
        }
      } else if (!manualSessionActiveRef.current) {
        const storedProf = getStoredUserProfile();
        const hasValidPersistedProfile =
          hasActiveTabSession &&
          !isFreshLoginEntry &&
          !wasExplicitlyLoggedOut &&
          Boolean(storedProf) &&
          storedProf.role !== 'Misafir' &&
          (Boolean(storedProf.email) ||
            storedProf.role === 'Entegrasyon Kullanıcısı' ||
            storedProf.role === 'LAB Kullanıcısı' ||
            storedProf.role === 'Süper Admin' ||
            storedProf.role === 'Kulüp Yöneticisi');

        if (!hasValidPersistedProfile) {
          setIsAuthenticated(false);
        }
      }
    });

    return () => {
      unsubscribeRealDbNotifs();
      unsubscribeAuth();
      if (authChannel) authChannel.close();
      window.removeEventListener('storage', handlePlanUpdate);
      window.removeEventListener('sportsfly_plan_changed', handlePlanUpdate);
      window.removeEventListener('sportsfly_plan_updated', handlePlanUpdate);
      window.removeEventListener('sportsfly_profile_updated', handleProfileUpdate);
      window.removeEventListener('sportsfly_company_profile_updated', handleProfileUpdate);
      window.removeEventListener('sportsfly_google_users_updated', handleGoogleUsersUpdate);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  React.useEffect(() => {
    let prevWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (prevWidth < 1024 && currentWidth >= 1024) {
        setIsSidebarOpen(true);
      } else if (prevWidth >= 1024 && currentWidth < 1024) {
        setIsSidebarOpen(false);
      }
      prevWidth = currentWidth;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handlePageSelect = (page: NavPage) => {
    const isGoogleRestricted = isGoogleRestrictedUser(userProfile?.role, userProfile?.email);
    const isRedirectedByGoogleLock =
      isGoogleRestricted && !isGoogleUserPageUnlocked(page, userProfile?.email);
    const targetPage: NavPage = isRedirectedByGoogleLock ? 'paketler' : page;

    if (isRedirectedByGoogleLock && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sportsfly_google_locked_redirect', {
          detail: { attemptedPage: page },
        })
      );
    }

    setCurrentPage(targetPage);
    try {
      sessionStorage.setItem('sportsfly_active_page', targetPage);
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState({ sportsflyPage: targetPage }, '', window.location.pathname);
      }
    } catch (e) {}
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // Force Google-restricted sessions onto 'paketler' whenever state/profile syncs
  useEffect(() => {
    if (!isAuthenticated) return;
    if (
      isGoogleRestrictedUser(userProfile?.role, userProfile?.email) &&
      !isGoogleUserPageUnlocked(currentPage, userProfile?.email)
    ) {
      setCurrentPage('paketler');
      try {
        sessionStorage.setItem('sportsfly_active_page', 'paketler');
      } catch (e) {}
    }
  }, [isAuthenticated, currentPage, userProfile?.role, userProfile?.email]);

  // Sync currentPage with isIntegrationActive to prevent render loops
  useEffect(() => {
    if (
      isIntegrationActive &&
      currentPage !== 'entegrasyonlar' &&
      currentPage !== 'sportsfly-studio'
    ) {
      setCurrentPage('entegrasyonlar');
    }
  }, [isIntegrationActive, currentPage]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const PAGE_SEO_MAP: Partial<Record<NavPage, { title: string; description: string }>> = {
      anasayfa: {
        title: 'Kontrol Paneli | SportsFly — Spor Okulu & Akademi Yönetimi',
        description:
          'Kulübünüzün anlık sporcu sayısı, aidat tahsilat oranı, yoklama istatistikleri ve finansal performans özeti.',
      },
      'on-kayit': {
        title: 'Ön Kayıt & Başvurular | SportsFly Yönetim Sistemi',
        description:
          'Online sporcu ön kayıt başvurularını, deneme antrenmanı taleplerini ve kesin kayıt onaylarını yönetin.',
      },
      sporcular: {
        title: 'Sporcu Yönetimi | SportsFly — Spor Okulu & Akademi Yönetimi',
        description:
          'Kayıtlı sporcu profilleri, veli iletişim bilgileri, sağlık evrakları, grup atamaları ve aidat durumları.',
      },
      'sporcu-karnesi': {
        title: 'Dijital Sporcu Karnesi & Performans | SportsFly',
        description:
          'Antropometrik ölçümler, atletik performans testleri, gelişim grafikleri ve velilere özel dijital sporcu karnesi.',
      },
      'egitim-planlama': {
        title: 'Eğitim Planlama & Antrenman Müfredatı | SportsFly',
        description:
          'Branş ve yaş gruplarına özel haftalık antrenman planları, taktik tahtası ve sezonluk gelişim müfredatı.',
      },
      subeler: {
        title: 'Şube & Tesis Yönetimi | SportsFly',
        description:
          'Çoklu şube, spor tesisi, saha/salon kapasiteleri ve şube bazlı doluluk oranlarını tek merkezden yönetin.',
      },
      'sube-ozet': {
        title: 'Şube Özet & Karşılaştırmalı Analitik | SportsFly',
        description:
          'Şubeler arası sporcu sayısı, tahsilat performansı ve gelir-gider karşılaştırma raporları.',
      },
      egitmenler: {
        title: 'Eğitmen & Antrenör Kadrosu | SportsFly',
        description:
          'Antrenör profilleri, uzmanlık branşları, sorumlu olunan gruplar ve ders programı yönetimi.',
      },
      gruplar: {
        title: 'Grup & Takım Yönetimi | SportsFly',
        description:
          'Yaş kategorileri ve seviyelere göre antrenman grupları, kontenjan takibi ve sporcu-grup eşleştirmeleri.',
      },
      'antrenman-takvimi': {
        title: 'Antrenman & Ders Takvimi | SportsFly',
        description:
          'Haftalık saha ve salon antrenman programı, ders saatleri ve tesis kullanım takvimi.',
      },
      yoklama: {
        title: 'Mobil Yoklama & Katılım Takibi | SportsFly',
        description:
          'Hızlı antrenman yoklaması, devamsızlık bildirimleri ve sporcu devamlılık istatistikleri.',
      },
      'on-muhasebe': {
        title: 'Ön Muhasebe & Finans Yönetimi | SportsFly',
        description:
          'Aidat tahsilatları, gelir-gider takibi, kasa/banka hareketleri ve ödeme planı kontrolü.',
      },
      'gelir-gider-kategori': {
        title: 'Gelir & Gider Kategorileri | SportsFly Ön Muhasebe',
        description:
          'Kulüp muhasebesi için gelir ve gider kalemlerini, maliyet merkezlerini yapılandırın.',
      },
      'gelir-gider-yonetimi': {
        title: 'Gelir & Gider Hareketleri | SportsFly Ön Muhasebe',
        description:
          'Fatura, kira, personel ve aidat nakit akışı hareketlerini detaylı olarak takip edin.',
      },
      'odeme-plani-kontrol': {
        title: 'Ödeme Planı & Tahsilat Kontrolü | SportsFly',
        description:
          'Vadesi gelen ve geciken sporcu aidatlarını takip edin, otomatik ödeme hatırlatmaları gönderin.',
      },
      'odeme-plani': {
        title: 'Aidat & Ödeme Planları | SportsFly',
        description:
          'Sporcu bazlı taksitli aidat planları ve online kredi kartı tahsilat yapılandırması.',
      },
      'eposta-servis-yapilandirmasi': {
        title: 'E-Posta Servis Yapılandırması (SMTP) | SportsFly',
        description:
          'Kullanıcı kayıt ve 2FA doğrulama e-postaları için SportsFly markalı SMTP sunucu ayarları ve şablon yönetimi.',
      },
      entegrasyonlar: {
        title: 'Entegrasyonlar & Modüller | SportsFly',
        description:
          'Sanal POS, SMS başlığı, WhatsApp bildirimleri, SportsFly Studio ve ek kulüp modüllerini tek tıkla etkinleştirin.',
      },
      'sportsfly-studio': {
        title: 'SportsFly Studio — Kulüp Tasarım ve İçerik Merkezi | SportsFly',
        description:
          'Duyuru tasarımları, maç & turnuva afişleri, sporcu kartları ve Instagram post/story şablonlarını kulübünüzün markasıyla hazırlayın.',
      },
      'kulup-web-sitesi': {
        title: 'Kulüp Web Sitesi Portalı | SportsFly',
        description:
          'Kulübünüze özel [kulup].sportsfly.com.tr adresli web sitenizi logolar, branşlar, antrenör kadrosu ve ön kayıt formuyla yönetin.',
      },
      'spor-okulu-basvurulari': {
        title: 'Spor Okulu Başvuruları | SportsFly Süper Admin',
        description:
          'Web sitesi ve kayıt formlarından gelen kurumsal spor okulu başvurularını anlık inceleyin ve onaylayın.',
      },
      yetkilendirmeler: {
        title: 'Yetkilendirme & Roller | SportsFly',
        description:
          'Yönetici, antrenör, veli ve sporcu rollerinin modül erişim ve işlem yetkilerini yapılandırın.',
      },
      'kullanici-sozlesmeleri': {
        title: 'Kulüp Sözleşmeleri & KVKK Metinleri | SportsFly',
        description:
          'Kayıt sözleşmeleri, veli muvafakatnameleri ve KVKK aydınlatma metinlerini dijital olarak yönetin.',
      },
      paketler: {
        title: 'Lisans Paketleri & Abonelik | SportsFly',
        description:
          'Kulübünüzün büyüklüğüne uygun SportsFly abonelik paketlerini inceleyin ve yükseltin.',
      },
      destek: {
        title: '7/24 Destek & Yardım Merkezi | SportsFly',
        description:
          'SportsFly teknik destek ekibiyle iletişime geçin, eğitim rehberlerine ve sıkça sorulan sorulara ulaşın.',
      },
    };

    const defaultSeo = {
      title: 'SportsFly — Spor Okulu, Akademi & Kulüp Yönetim Sistemi',
      description:
        'Spor okulları, akademiler ve kulüpler için yeni nesil yönetim yazılımı. Otomatik aidat tahsilatı, mobil yoklama, eğitmen ve veli panelleri, Sporpuan ödül sistemi ve dijital sporcu karneleri.',
    };

    const activeSeo = !isAuthenticated
      ? {
          title: 'Giriş Yap | SportsFly — Spor Okulu, Akademi & Kulüp Yönetim Sistemi',
          description: defaultSeo.description,
        }
      : PAGE_SEO_MAP[currentPage] || defaultSeo;

    document.title = activeSeo.title;

    const setMetaTag = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) {
        el.setAttribute('content', content);
      }
    };

    setMetaTag('meta[name="description"]', activeSeo.description);
    setMetaTag('meta[property="og:title"]', activeSeo.title);
    setMetaTag('meta[property="og:description"]', activeSeo.description);
    setMetaTag('meta[name="twitter:title"]', activeSeo.title);
    setMetaTag('meta[name="twitter:description"]', activeSeo.description);
  }, [currentPage, isAuthenticated]);

  const renderActiveView = () => {
    // 0. Users registered/logged in via Google (except Super Admin selmanutkumarmara@gmail.com) can see Packages + Admin-enabled areas
    if (
      isGoogleRestrictedUser(userProfile?.role, userProfile?.email) &&
      !isGoogleUserPageUnlocked(currentPage, userProfile?.email)
    ) {
      return <PaketlerView />;
    }

    // 1. Enforce package-tier access limits (Süper Admin has full access to Sporpuan modules regardless of plan)
    if (!isPageAllowedForPlan(currentPage, currentPlan, userProfile?.role, userProfile?.email)) {
      const restrictionInfo = getPageRestrictionInfo(currentPage, currentPlan, userProfile?.role, userProfile?.email);
      return (
        <PackageAccessRestrictedView
          page={currentPage}
          currentPlan={currentPlan}
          restriction={restrictionInfo}
          restrictionInfo={restrictionInfo}
          onNavigate={handlePageSelect}
          onUpgradeRequest={() => {
            handlePageSelect('paketler');
          }}
        />
      );
    }

    switch (currentPage) {
      case 'anasayfa':
        return <DashboardView onNavigate={handlePageSelect} />;
      case 'sporsepeti-user':
        return <SporsepetiUserView />;
      case 'sporcular':
        return <SporcularView onNavigate={handlePageSelect} />;
      case 'egitmenler':
        return <EgitmenlerView />;
      case 'gruplar':
        return <GruplarView onNavigate={handlePageSelect} />;
      case 'yoklama':
        return <YoklamaView />;
      case 'anket-yonetimi':
        return <AnketYonetimiView />;
      case 'sporcu-karnesi':
        return <SporcuKarnesiView onNavigate={handlePageSelect} />;
      case 'egitim-planlama':
        return <EgitimPlanlamaView />;
      case 'antrenman-takvimi':
        return <AntrenmanTakvimiView />;
      case 'on-muhasebe':
        return <OnMuhasebeView key="on-muhasebe-genel" initialTab="genel" onNavigate={handlePageSelect} />;
      case 'gelir-gider-kategori':
        return <OnMuhasebeView key="on-muhasebe-kategoriler" initialTab="kategoriler" onNavigate={handlePageSelect} />;
      case 'gelir-gider-yonetimi':
        return <OnMuhasebeView key="on-muhasebe-hareketler" initialTab="hareketler" onNavigate={handlePageSelect} />;
      case 'odeme-plani-kontrol':
        return <OnMuhasebeView key="on-muhasebe-kontrol" initialTab="kontrol" onNavigate={handlePageSelect} />;
      case 'odeme-plani':
        return <OnMuhasebeView key="on-muhasebe-planlar" initialTab="planlar" onNavigate={handlePageSelect} />;
      case 'yoneticiler':
        return <YoneticilerView />;
      case 'sporpuan-sporcu-degerlendirme':
        return <SporpuanSporcuDegerlendirmeView onNavigate={handlePageSelect} />;
      case 'sporpuan-degerlendirmeler':
        return <SporpuanDegerlendirmelerView onNavigate={handlePageSelect} />;
      case 'sporpuan-dogrulamalar':
        return <SporpuanDogrulamalarView />;
      case 'sporpuan-raporlar':
        return <SporpuanRaporlarView />;
      case 'kullanici-sozlesmeleri':
        return <KulupSozlesmeleriView />;
      case 'spor-okulu-basvurulari':
        return <SporOkuluBasvurulariView />;
      case 'yetkilendirmeler':
        return <YetkilendirmelerView />;
      case 'kulup-evraklari':
        return (
          <KulupEvraklariView
            sporcular={syncedSporcular}
            onNavigate={handlePageSelect}
          />
        );
      case 'kulup-galerisi':
        return (
          <KulupGalerisiView
            sporcular={syncedSporcular}
            onNavigate={handlePageSelect}
          />
        );
      case 'turnuva-yonetimi':
        return <TurnuvaYonetimiView />;
      case 'envanter-yonetimi':
        return <EnvanterYonetimiView />;
      case 'eposta-servis-yapilandirmasi':
        return <EpostaServisYapilandirmasiView />;
      case 'entegrasyonlar':
        return <EntegrasyonlarView onNavigate={handlePageSelect} onLogout={handleLogout} isReadOnly={!isAuthenticated} />;
      case 'kulup-web-sitesi':
        return <ClubWebsiteBuilderView onNavigate={handlePageSelect} onLogout={handleLogout} />;
      case 'sportsfly-intelligence':
        return <SportsFlyIntelligenceView />;
      case 'sportsfly-lab':
        return <SportsFlyLabView onLogout={handleLogout} />;
      case 'sportsfly-studio':
        return <SportsFlyStudioView onBackToIntegrations={() => handlePageSelect('entegrasyonlar')} />;
      case 'batch-manager':
        return <SportsFlyLabView onLogout={handleLogout} initialTab="dosya-havuzu" />;
      case 'paketler':
      case 'paket-yonetimi':
        return <PaketlerView />;
      case 'on-kayit':
        return <OnKayitView />;
      case 'subeler':
        return <SubelerView onNavigate={handlePageSelect} />;
      case 'sube-ozet':
        return <SubeOzetView onNavigate={handlePageSelect} />;
      case 'destek':
        return <DestekView />;

      default:
        return <GenericPageView page={currentPage} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen h-[100dvh] print:h-auto print:overflow-visible print:static bg-slate-50 dark:bg-[#0b1320] text-slate-800 dark:text-slate-100 flex flex-col antialiased relative transition-colors duration-200 overflow-hidden">
      {/* Push Notification Toasts with Error Isolation */}
      <AppErrorBoundary fallbackTitle="Bildirim Servisi">
        <RealUserApprovedPushToast onNavigate={handlePageSelect} />
        <PointEarnedPushToast onNavigate={handlePageSelect} />
        <ReminderPushToast onNavigate={handlePageSelect} />
      </AppErrorBoundary>

      <div className="flex flex-1 overflow-hidden h-full print:h-auto print:overflow-visible print:block">
        {/* Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onSelectPage={handlePageSelect}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          currentPlan={currentPlan}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:h-auto print:overflow-visible print:block">
          {/* Header - Permanently pinned at the top on both web & mobile */}
          <Header
            currentPage={currentPage}
            onToggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
            onNavigate={handlePageSelect}
            onLogout={handleLogout}
          />

          {/* Body Content - Dedicated scrollable viewport */}
          <main
            ref={mainScrollRef}
            className="flex-1 p-3.5 sm:p-4 lg:p-6 w-full overflow-y-auto overflow-x-hidden print:p-0 print:overflow-visible print:h-auto"
          >
            <AppErrorBoundary
              key={currentPage}
              onResetToHome={() => handlePageSelect('anasayfa')}
            >
              <Suspense fallback={<ViewLoadingSkeleton />}>
                {renderActiveView()}
              </Suspense>
            </AppErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}
