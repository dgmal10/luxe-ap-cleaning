/**
 * Authentication service — wraps Firebase Auth with local fallback.
 * Works seamlessly with or without Firebase configured.
 */
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

const LOCAL_AUTH_KEY = 'luxe_admin_demo_user';
const listeners = new Set<(user: User | null) => void>();

function notifyLocalAuth(user: User | null) {
  listeners.forEach(cb => cb(user));
}

/** Sign in with email & password */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  if (!isFirebaseConfigured) {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || password.length < 3) {
      const err: any = new Error('Invalid email or password');
      err.code = 'auth/invalid-credential';
      throw err;
    }

    const userObj = {
      uid: 'admin-local-uid',
      email: trimmedEmail,
      displayName: trimmedEmail.split('@')[0] || 'Admin',
      emailVerified: true,
    } as User;

    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(userObj));
    notifyLocalAuth(userObj);
    return userObj;
  }

  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Sign out */
export async function logout(): Promise<void> {
  if (!isFirebaseConfigured) {
    localStorage.removeItem(LOCAL_AUTH_KEY);
    notifyLocalAuth(null);
    return;
  }
  await signOut(auth);
}

/** Send password-reset email */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!isFirebaseConfigured) {
    await new Promise(res => setTimeout(res, 600));
    return;
  }
  await sendPasswordResetEmail(auth, email);
}

/** Subscribe to auth-state changes */
export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    listeners.add(callback);
    try {
      const stored = localStorage.getItem(LOCAL_AUTH_KEY);
      const user = stored ? JSON.parse(stored) : null;
      callback(user);
    } catch {
      callback(null);
    }

    return () => {
      listeners.delete(callback);
    };
  }
  return onAuthStateChanged(auth, callback);
}
