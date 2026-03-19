import { initializeApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function normalizeEnvValue(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function getFirebaseConfig() {
  const apiKey = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  const authDomain = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  const projectId = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  const storageBucket = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  const messagingSenderId = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
  const appId = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
  const measurementId = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);

  const cfg = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
  };

  // IMPORTANT: Next.js only inlines env vars in client bundles for direct
  // `process.env.NEXT_PUBLIC_*` accesses. Avoid dynamic `process.env[k]`.
  const missing = [];
  if (!apiKey)
    missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!authDomain)
    missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!projectId)
    missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!storageBucket)
    missing.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (!messagingSenderId)
    missing.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  if (!appId)
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
        experimentalForceLongPolling: true,
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

