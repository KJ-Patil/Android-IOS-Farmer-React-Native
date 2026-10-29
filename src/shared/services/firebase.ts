import { initializeApp, FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
// @ts-expect-error RN-specific exports resolved by Metro at runtime
import { initializeAuth, getReactNativePersistence } from '@firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyA8a3HTi22FMz_O2G6hbezyqRuS4SagOak',
  authDomain: 'farmer-ledger-ss.firebaseapp.com',
  projectId: 'farmer-ledger-ss',
  storageBucket: 'farmer-ledger-ss.firebasestorage.app',
  messagingSenderId: '723868421948',
  appId: '1:723868421948:web:4a94da0e3cf97af8d03d8d',
  measurementId: 'G-JNTF8QB6BY',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  db = getFirestore(app);
  storage = getStorage(app);
} catch (e) {
  console.error('Firebase init failed:', e);
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

export { app, auth, db, storage };
