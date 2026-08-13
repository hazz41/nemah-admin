import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Same Firebase project as the mobile app and restaurant-dashboard
// (foods/src/lib/firebase.ts, restaurant-dashboard/src/lib/firebase.ts) —
// every internal tool shares one backend and one set of accounts. This app
// only ever signs in accounts whose Firestore `users/{uid}.role` is
// 'admin', set manually in the Firebase console.
const firebaseConfig = {
  apiKey: 'AIzaSyBDpuwF_zas28nDilvw7cIT7XHrBkNmsrI',
  authDomain: 'nemah-40a34.firebaseapp.com',
  projectId: 'nemah-40a34',
  storageBucket: 'nemah-40a34.firebasestorage.app',
  messagingSenderId: '76314938020',
  appId: '1:76314938020:web:339741ee93b260b915f431',
  measurementId: 'G-QVQX85PRKB',
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
