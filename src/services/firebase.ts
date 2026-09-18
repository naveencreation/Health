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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyC6POAupm6uMh20fGUYAtdGLXtTiHFYLfE',
  authDomain: 'calori-dba00.firebaseapp.com',
  projectId: 'calori-dba00',
  storageBucket: 'calori-dba00.firebasestorage.app',
  messagingSenderId: '209376196693',
  appId: '1:209376196693:web:2d5982bc5e7e673bddbcdc',
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with cross-platform persistence
let authInstance: Auth;
try {
  if (Platform.OS === 'web') {
    authInstance = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch (e) {
  // If already initialized (e.g. during Fast Refresh / HMR)
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
