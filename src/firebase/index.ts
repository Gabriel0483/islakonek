'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';

// Global cache for initialized SDKs to ensure consistency
let cachedSdks: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

/**
 * Main initialization function for Firebase services.
 * Uses a singleton pattern to ensure settings like long-polling are applied only once.
 */
export function initializeFirebase() {
  if (cachedSdks) return cachedSdks;

  let firebaseApp: FirebaseApp;
  
  if (!getApps().length) {
    try {
      // Attempt to initialize via Firebase App Hosting environment variables (Production)
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to local config object (Development)
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  cachedSdks = getSdks(firebaseApp);
  return cachedSdks;
}

/**
 * Returns initialized SDK instances for the given app.
 * Configures Firestore with long-polling to bypass workstation networking restrictions.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  let firestore: Firestore;
  
  try {
    // initializeFirestore is used here to explicitly set long-polling.
    // This is required in some cloud environments where standard gRPC is restricted.
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
    });
  } catch (e) {
    // If Firestore was already initialized (e.g. via hot-reload), get existing instance.
    firestore = getFirestore(firebaseApp);
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
