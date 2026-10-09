export interface SportsFlyNotification {
  id: string;
  category: 'system' | 'support' | 'payment' | 'message' | 'birthday' | 'training' | 'sporpuan';
  title: string;
  description: string;
  time: string;
  isUnread: boolean;
  actionUrl?: string;
  points?: number;
  sporcuName?: string;
  sporcuId?: string;
  source?: 'database' | 'system';
  userId?: string;
  verifiedRealUser?: boolean;
}

export const DEFAULT_NOTIFICATIONS: Record<string, SportsFlyNotification[]> = {
  admin: [],
  trainer: [],
  parent: [],
};

const STORAGE_KEY_PREFIX = 'sportsfly_notifications_';

/**
 * Validates whether a notification is a genuine, verified user notification from the database.
 * Strictly excludes any test, demo, mock, simulated, or synthetic notifications.
 */
export function isRealDatabaseNotification(notif: SportsFlyNotification): boolean {
  if (!notif) return false;

  const idLower = String(notif.id || '').toLowerCase();
  const titleLower = String(notif.title || '').toLowerCase();
  const descLower = String(notif.description || '').toLowerCase();

  // Explicitly reject any test / mock / demo keywords
  if (
    idLower.includes('test') ||
    idLower.includes('demo') ||
    idLower.includes('ornek') ||
    idLower.includes('sample') ||
    idLower.includes('simulated') ||
    idLower.includes('mock') ||
    idLower.startsWith('rem-') ||
    idLower.startsWith('sporpuan-auto')
  ) {
    return false;
  }

  if (
    titleLower.includes('test') ||
    titleLower.includes('demo') ||
    titleLower.includes('simülasyon') ||
    titleLower.includes('örnek') ||
    titleLower.includes('deneme')
  ) {
    return false;
  }

  if (
    descLower.includes('test') ||
    descLower.includes('demo@') ||
    descLower.includes('simüle') ||
    descLower.includes('örnek') ||
    descLower.includes('deneme')
  ) {
    return false;
  }

  // Must originate from a verified database source or approved user record
  if (
    notif.source === 'database' ||
    notif.verifiedRealUser === true ||
    idLower.startsWith('notif-approved-') ||
    idLower.startsWith('db-user-')
  ) {
    return true;
  }

  return false;
}

/**
 * Returns true if the notification is a test / simulated notification.
 */
export function isTestNotification(notif: SportsFlyNotification): boolean {
  return !isRealDatabaseNotification(notif);
}

/**
 * Purges all test and simulated notifications from localStorage across all roles.
 */
export function purgeAllTestNotifications(): void {
  if (typeof window === 'undefined') return;
  const roles = ['admin', 'trainer', 'parent'];
  roles.forEach((r) => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_PREFIX + r);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((n) => isRealDatabaseNotification(n));
          localStorage.setItem(STORAGE_KEY_PREFIX + r, JSON.stringify(clean));
        }
      }
    } catch (e) {
      // Ignore
    }
  });
}

export function getStoredNotifications(role: string): SportsFlyNotification[] {
  if (typeof window === 'undefined') return [];

  let key = 'admin';
  const roleLower = (role || '').toLowerCase();
  if (roleLower.includes('veli') || roleLower.includes('ebeveyn') || roleLower.includes('parent')) {
    key = 'parent';
  } else if (
    roleLower.includes('antrenör') ||
    roleLower.includes('antrenor') ||
    roleLower.includes('eğitmen') ||
    roleLower.includes('coach') ||
    roleLower.includes('trainer')
  ) {
    key = 'trainer';
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (cached) {
      const parsed: SportsFlyNotification[] = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        // Exclude all test and simulated notifications - allow ONLY verified real database notifications
        const realOnly = parsed.filter((n) => isRealDatabaseNotification(n));
        
        // If there were stale test notifications in localStorage, rewrite with clean list
        if (realOnly.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(realOnly));
        }

        return realOnly;
      }
    }
  } catch (err) {
    console.error('Failed to parse notifications', err);
  }

  return [];
}

export function saveStoredNotifications(role: string, notifications: SportsFlyNotification[]): void {
  if (typeof window === 'undefined') return;

  let key = 'admin';
  const roleLower = (role || '').toLowerCase();
  if (roleLower.includes('veli') || roleLower.includes('ebeveyn') || roleLower.includes('parent')) {
    key = 'parent';
  } else if (
    roleLower.includes('antrenör') ||
    roleLower.includes('antrenor') ||
    roleLower.includes('eğitmen') ||
    roleLower.includes('coach') ||
    roleLower.includes('trainer')
  ) {
    key = 'trainer';
  }

  // Strictly exclude any test notifications before persisting
  const cleanNotifications = (notifications || []).filter((n) => isRealDatabaseNotification(n));

  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(cleanNotifications));
    window.dispatchEvent(
      new CustomEvent('sportsfly_notifications_updated', {
        detail: { role, notifications: cleanNotifications },
      })
    );
  } catch (err) {
    console.error('Failed to save notifications', err);
  }
}

export function addSporPuanNotification(detail: {
  sporcuName: string;
  ruleName: string;
  points: number;
  category: string;
  note?: string;
  sporcuId?: string;
  isTest?: boolean;
}): SportsFlyNotification | null {
  // If detail indicates a test or mock event, do not save to notifications or dispatch
  const checkStr = `${detail.sporcuName || ''} ${detail.ruleName || ''} ${detail.note || ''}`.toLowerCase();
  if (
    detail.isTest ||
    checkStr.includes('test') ||
    checkStr.includes('demo') ||
    checkStr.includes('ornek') ||
    checkStr.includes('örnek') ||
    checkStr.includes('deneme')
  ) {
    return null;
  }

  const newNotification: SportsFlyNotification = {
    id: `notif-sporpuan-${Date.now()}`,
    category: 'sporpuan',
    title: 'Yeni Puan Kazanımı',
    description: `${detail.sporcuName} sporcusuna "${detail.ruleName}" kapsamında +${detail.points} SP puanı tanımlandı.${detail.note ? ` (Not: ${detail.note})` : ''}`,
    time: 'Şimdi',
    isUnread: true,
    points: detail.points,
    sporcuName: detail.sporcuName,
    sporcuId: detail.sporcuId,
    actionUrl: 'sporpuan-sporcu-degerlendirme',
    source: 'database',
    verifiedRealUser: true,
  };

  return newNotification;
}
