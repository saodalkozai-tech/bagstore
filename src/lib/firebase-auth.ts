import { initializeApp, getApps } from 'firebase/app';
import {
  Auth,
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

export type FirebaseSession = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'editor' | 'viewer';
};

const useFirebaseAuth = import.meta.env.VITE_USE_FIREBASE_AUTH === 'true';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let authCache: Auth | null = null;

function normalizeRole(value: unknown): 'admin' | 'editor' | 'viewer' {
  if (value === 'admin' || value === 'editor' || value === 'viewer') {
    return value;
  }
  return 'viewer';
}

export function isFirebaseAuthEnabled(): boolean {
  return (
    useFirebaseAuth &&
    Boolean(firebaseConfig.apiKey) &&
    Boolean(firebaseConfig.authDomain) &&
    Boolean(firebaseConfig.projectId) &&
    Boolean(firebaseConfig.appId)
  );
}

function getFirebaseAuth(): Auth {
  if (!isFirebaseAuthEnabled()) {
    throw new Error('Firebase Auth غير مفعّل. تحقق من متغيرات البيئة.');
  }

  if (authCache) {
    return authCache;
  }

  const app = getApps()[0] || initializeApp(firebaseConfig);
  authCache = getAuth(app);
  return authCache;
}

export async function signInWithFirebase(
  email: string,
  password: string
): Promise<FirebaseSession> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const tokenResult = await credential.user.getIdTokenResult(true);

  return {
    uid: credential.user.uid,
    email: credential.user.email || email.trim(),
    displayName: credential.user.displayName || '',
    photoURL: credential.user.photoURL || '',
    role: normalizeRole(tokenResult.claims.role)
  };
}

export async function getFirebaseCurrentSession(): Promise<FirebaseSession | null> {
  if (!isFirebaseAuthEnabled()) {
    return null;
  }

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  const tokenResult = await user.getIdTokenResult();
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    role: normalizeRole(tokenResult.claims.role)
  };
}

export async function signOutFirebase(): Promise<void> {
  if (!isFirebaseAuthEnabled()) return;
  const auth = getFirebaseAuth();
  await signOut(auth);
}
