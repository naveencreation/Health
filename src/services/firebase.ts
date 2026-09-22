import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  Auth,
} from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC6POAupm6uMh20fGUYAtdGLXtTiHFYLfE',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'calori-dba00.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'calori-dba00',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'calori-dba00.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '209376196693',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:209376196693:web:2d5982bc5e7e673bddbcdc',
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase auth persistence keys contain characters SecureStore rejects
// (e.g. "firebase:authUser:<apiKey>:[DEFAULT]"), so hex-encode the key.
const encodeSecureKey = (key: string) => {
  let encoded = '';
  for (let i = 0; i < key.length; i++) {
    encoded += key.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return 'fb_auth_' + encoded;
};

const secureStorePersistence = {
  getItem: (key: string) => SecureStore.getItemAsync(encodeSecureKey(key)),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(encodeSecureKey(key), value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(encodeSecureKey(key)),
};

// Initialize Auth with cross-platform persistence
let authInstance: Auth;
try {
  if (Platform.OS === 'web') {
    authInstance = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(secureStorePersistence),
    });
  }
} catch (e) {
  // If already initialized (e.g. during Fast Refresh / HMR)
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
