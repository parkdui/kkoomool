import { initializeApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function getFirebaseConfig() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // IMPORTANT: Next.js only inlines env vars in client bundles for direct
  // `process.env.NEXT_PUBLIC_*` accesses. Avoid dynamic `process.env[k]`.
  const missing = [];
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
    missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
    missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
    missing.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)
    missing.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  if (!process.env.NEXT_PUBLIC_FIREBASE_APP_ID)
    missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");

  if (missing.length) throw new Error(`Missing Firebase env: ${missing.join(", ")}`);

  return cfg;
}

export function getFirebaseApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp(getFirebaseConfig());
}

export function getDb() {
  const app = getFirebaseApp();
  // Some networks/extensions block Firestore's streaming transport and cause
  // "unavailable". Long-polling is slower but much more compatible.
  if (typeof window !== "undefined") {
    try {
      return initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false,
      });
    } catch {
      // If Firestore was already initialized, fall back.
    }
  }
  return getFirestore(app);
}

export function getBucket() {
  return getStorage(getFirebaseApp());
}

