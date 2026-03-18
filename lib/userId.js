const KEY = "kkoomool:userId";

export function getStoredUserId() {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v || null;
  } catch {
    return null;
  }
}

export function setStoredUserId(userId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, userId);
}

export function validateUserId(input) {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, reason: "empty" };
  if (raw.length > 16) return { ok: false, reason: "too_long" };
  // "특수문자"는 금지로 해석: 영문/숫자/언더스코어/하이픈만 허용
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) return { ok: false, reason: "invalid" };
  return { ok: true, value: raw };
}

