import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

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
  };
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;
let isFirebaseInitialized = false;

export async function initFirebase(): Promise<{
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  isConfigured: boolean;
}> {
  if (isFirebaseInitialized) {
    return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb, isConfigured: true };
  }

  try {
    // Attempt to load firebase-applet-config.json if provisioned
    const response = await fetch('/firebase-applet-config.json');
    if (response.ok) {
      const config = await response.json();
      firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
      firebaseAuth = getAuth(firebaseApp);
      firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
      isFirebaseInitialized = true;
      return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb, isConfigured: true };
    }
  } catch {
    // Config not yet present or offline
  }

  return { app: null, auth: null, db: null, isConfigured: false };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const currentAuth = firebaseAuth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid,
      email: currentAuth?.email,
      emailVerified: currentAuth?.emailVerified,
      isAnonymous: currentAuth?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { firebaseAuth, firestoreDb };
