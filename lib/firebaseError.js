export function firebaseErrorToMessage(e) {
  const code = e?.code || "";
  const msg = e?.message || "";

  if (code.includes("permission-denied")) {
    return "Firebase permission denied. In Firebase Console → Firestore Database → Rules, temporarily allow reads/writes (test mode) or set proper rules.";
  }
  if (code.includes("failed-precondition")) {
    return "Firestore not ready (failed-precondition). Make sure Firestore Database is created in Firebase Console.";
  }
  if (code.includes("unavailable")) {
    return "Firestore unavailable. Check internet connection and Firebase project status.";
  }
  if (code.includes("invalid-argument")) {
    return "Firebase invalid argument. Check your Firebase config values.";
  }

  if (msg.includes("Missing") && msg.includes("NEXT_PUBLIC_FIREBASE")) {
    return msg;
  }

  return code ? `Firebase error: ${code}` : "Could not connect to Firebase.";
}

