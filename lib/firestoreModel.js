import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { getDb } from "./firebaseClient";

export function userDocRef(userId) {
  return doc(getDb(), "users", userId);
}

export async function getUser(userId) {
  const snap = await getDoc(userDocRef(userId));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function upsertUser(userId, patch) {
  await setDoc(
    userDocRef(userId),
    {
      userId,
      updatedAt: serverTimestamp(),
      ...patch,
    },
    { merge: true }
  );
}

export async function addRecord(userId, record) {
  const ref = collection(getDb(), "users", userId, "records");
  const docRef = await addDoc(ref, { ...record, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function listRecentRecords(userId, n = 20) {
  const ref = collection(getDb(), "users", userId, "records");
  const q = query(ref, orderBy("createdAt", "desc"), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

