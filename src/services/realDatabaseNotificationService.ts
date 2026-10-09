import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  SportsFlyNotification,
  getStoredNotifications,
  saveStoredNotifications,
  isRealDatabaseNotification,
  purgeAllTestNotifications,
} from '../data/notifications';

const NOTIFIED_USERS_STORAGE_KEY = 'sportsfly_notified_approved_user_ids_v2';

export interface RealApprovedUserPayload {
  userId: string;
  email: string;
  managerName: string;
  clubName: string;
  role?: string;
  phone?: string;
  approvedAt?: string;
}

/**
 * Returns set of user IDs that have already been notified.
 */
export function getNotifiedApprovedUserIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFIED_USERS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {
    console.warn('Failed to parse notified approved user IDs', e);
  }
  return new Set();
}

/**
 * Marks user ID as notified in localStorage.
 */
export function markApprovedUserNotified(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const current = getNotifiedApprovedUserIds();
    current.add(userId);
    localStorage.setItem(NOTIFIED_USERS_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn('Failed to save notified approved user ID', e);
  }
}

/**
 * Verifies whether a Firestore document represents a REAL, APPROVED user,
 * excluding all mock, demo, simulation, and test accounts.
 */
export function isRealApprovedUser(data: any, docId?: string): boolean {
  if (!data) return false;
  if (data.status !== 'onaylandi') return false;

  const idLower = String(data.id || docId || '').toLowerCase();
  const emailLower = String(data.email || '').toLowerCase().trim();
  const nameLower = String(data.managerName || '').toLowerCase().trim();
  const clubLower = String(data.clubName || '').toLowerCase().trim();

  // Exclude test / demo / mock IDs
  if (
    idLower === 'user_admin_demo' ||
    idLower === 'user_kulup_demo' ||
    idLower.startsWith('demo_') ||
    idLower.startsWith('test_') ||
    idLower.includes('mock') ||
    idLower.includes('simulated')
  ) {
    return false;
  }

  // Exclude test emails
  if (
    !emailLower ||
    emailLower.includes('example.com') ||
    emailLower.includes('test@') ||
    emailLower.includes('demo@') ||
    emailLower.includes('deneme@') ||
    emailLower.endsWith('@sportsfly.com') ||
    emailLower.includes('+test')
  ) {
    return false;
  }

  // Exclude test / demo names
  if (
    nameLower.includes('test') ||
    nameLower.includes('deneme') ||
    nameLower.includes('demo') ||
    nameLower.includes('örnek') ||
    nameLower.includes('ornek') ||
    nameLower.includes('simülasyon')
  ) {
    return false;
  }

  // Exclude test club names
  if (
    clubLower.includes('test') ||
    clubLower.includes('deneme') ||
    clubLower.includes('demo') ||
    clubLower.includes('örnek') ||
    clubLower.includes('ornek')
  ) {
    return false;
  }

  return true;
}

/**
 * Subscribes to real-time Firestore updates for verified, approved users in the database.
 * Filters out all test accounts and triggers real user notifications.
 */
export function subscribeToRealDatabaseUserNotifications(onNewApprovedUser?: (notif: SportsFlyNotification) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // First, purge any stale test notifications from past sessions
  purgeAllTestNotifications();

  let isFirstSnapshot = true;
  let unsubscribe: (() => void) | undefined;

  try {
    const q = query(
      collection(db, 'registered_users'),
      where('status', '==', 'onaylandi')
    );

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notified = getNotifiedApprovedUserIds();

        if (isFirstSnapshot) {
          // On initial snapshot, record all existing approved users in database
          // so that page reloads or navigations DO NOT trigger repeated notification toasts!
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            if (isRealApprovedUser(data, docId)) {
              markApprovedUserNotified(docId);
            }
          });
          isFirstSnapshot = false;
          return;
        }

        // On subsequent changes, trigger notifications ONLY for newly approved real users!
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            const docId = change.doc.id;

            if (isRealApprovedUser(data, docId) && !notified.has(docId)) {
              markApprovedUserNotified(docId);

              const notifId = `notif-approved-${docId}`;
              const managerName = data.managerName || 'Kulüp Yetkilisi';
              const clubName = data.clubName || 'Spor Kulübü';

              const newNotif: SportsFlyNotification = {
                id: notifId,
                category: 'system',
                title: 'Onaylı Kullanıcı Erişimi',
                description: `"${managerName}" (${clubName}) hesabı veritabanında onaylanmıştır.`,
                time: 'Şimdi',
                isUnread: true,
                actionUrl: 'yetkilendirmeler',
                source: 'database',
                userId: docId,
                verifiedRealUser: true,
              };

              // Persist to all management feeds (admin, trainer)
              ['admin', 'trainer'].forEach((role) => {
                const current = getStoredNotifications(role);
                if (!current.some((n) => n.id === notifId)) {
                  const updated = [newNotif, ...current.filter((n) => isRealDatabaseNotification(n))];
                  saveStoredNotifications(role, updated);
                }
              });

              // Dispatch real user push event for UI toast & audio/haptic feedback
              window.dispatchEvent(
                new CustomEvent('sportsfly_real_user_approved', {
                  detail: {
                    notification: newNotif,
                    user: {
                      userId: docId,
                      email: data.email,
                      managerName,
                      clubName,
                      role: data.role,
                      phone: data.phone,
                      approvedAt: data.approvedAt || new Date().toISOString(),
                    },
                  },
                })
              );

              if (onNewApprovedUser) {
                onNewApprovedUser(newNotif);
              }
            }
          }
        });
      },
      (error) => {
        console.warn('Real database notification listener error (offline or permission):', error);
      }
    );
  } catch (e) {
    console.error('Failed to initialize real database notification listener:', e);
  }

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}
