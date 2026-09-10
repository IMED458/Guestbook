import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// A Firebase web config is public information — it identifies the project,
// it does not authorise anything. Access is controlled by firestore.rules.
// Values can still be overridden per-environment through .env.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBFnCBLDZUU0SoCPjDQPHdCFE7OM54JrCI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'guestbook-40634.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'guestbook-40634',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'guestbook-40634.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '678053678577',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:678053678577:web:a0a911f3d3697ab25b0850',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Collection names, in one place.
export const COL = {
  guestBooks: 'guestbooks',
  messages: 'messages',
  messageEmails: 'messageEmails',
} as const;
