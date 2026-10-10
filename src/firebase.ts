import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Resolve configuration from Vercel environment variables or bundled config
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};

export const activeFirebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  firestoreDatabaseId: metaEnv.VITE_FIRESTORE_DATABASE_ID || metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(activeFirebaseConfig);

// Initialize Firestore with the provisioned database ID
export const db = getFirestore(app, activeFirebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  // Enhanced Diagnostic Logging
  console.error('[Diagnostic] Firestore Operation Failed: ', {
    operationType,
    path,
    error: errInfo.error,
    isCorsError: errInfo.error.includes('CORS') || errInfo.error.includes('fetch'),
    isPermissionError: errInfo.error.includes('permission'),
    firebaseConfigUsed: {
      databaseId: (app as any).options?.databaseId || 'default',
      projectId: (app as any).options?.projectId,
    },
    fullDetails: errInfo
  });

  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot (disabled to prevent timeout warnings when offline/unprovisioned)
export async function testFirestoreConnection(): Promise<void> {
  // No-op
}

