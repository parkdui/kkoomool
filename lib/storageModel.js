import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { getBucket } from "./firebaseClient";

function storageErrorToMessage(e) {
  const code = e?.code || "";
  if (code.includes("storage/unauthorized")) {
    return "Firebase Storage permission denied. Update Storage Rules (test mode) or add Auth.";
  }
  if (code.includes("storage/canceled")) return "Upload canceled.";
  if (code.includes("storage/retry-limit-exceeded")) return "Upload retry limit exceeded (network?).";
  if (code.includes("storage/invalid-argument")) return "Storage invalid argument (bucket/path/config).";
  return code ? `Storage error: ${code}` : "Storage upload failed.";
}

export async function uploadDataUrl({
  userId,
  path,
  dataUrl,
  contentType = "image/png",
}) {
  const objectPath = path || `users/${userId}/images/${Date.now()}.png`;
  try {
    const r = ref(getBucket(), objectPath);
    await uploadString(r, dataUrl, "data_url", { contentType });
    const url = await getDownloadURL(r);
    return { url, path: objectPath };
  } catch (e) {
    const err = new Error(storageErrorToMessage(e));
    err.cause = e;
    throw err;
  }
}

