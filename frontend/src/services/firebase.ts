import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, get, child } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// These should be added to frontend/.env as VITE_FIREBASE_API_KEY, etc.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://placeholder.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "placeholder.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);
const storage = getStorage(app);

// Graceful check to ensure valid setup
const isFirebaseConfigured = import.meta.env.VITE_FIREBASE_PROJECT_ID !== undefined;

if (!isFirebaseConfigured) {
  console.warn("Firebase is not fully configured. Realtime sync will degrade to offline/polling mode.");
}

export { app, database, storage, ref, onValue, off, get, child, isFirebaseConfigured };
