import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAC3NrbNayY3xqNPyAQxLhDNiXN0hgPgDA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'nexus-mind-c32cf.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nexus-mind-c32cf',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'nexus-mind-c32cf.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '875586424699',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:875586424699:web:fd086d034f584277ebb7de',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-8MBZWJRWK6'
};

// Validate config
if (!firebaseConfig.apiKey) {
  console.warn("Firebase API Key is missing. Cloud sync will not work.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const firestore = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
