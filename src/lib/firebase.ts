/**
 * Inicialização do Firebase — instância compartilhada única.
 * Lida com configuração ausente de forma elegante (o app funciona sem o Firebase).
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCkoKUhuwVV4c8mwmTYtpRBV8aKo04V-B8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'luxe-ap-cleaning.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'luxe-ap-cleaning',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'luxe-ap-cleaning.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1057012747509',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1057012747509:web:acfb7234eddd60219c09bc',
};

/** Indica se o Firebase está configurado (tem pelo menos uma API key) */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.warn('Erro ao inicializar o Firebase:', err);
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Firestore;
    storage = {} as FirebaseStorage;
  }
} else {
  // Fallback gracioso para modo demo/mock
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

export { app as default, auth, db, storage };
