import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getStoredUserId } from "./userId";

export function useUserId({ required = true } = {}) {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = getStoredUserId();
    queueMicrotask(() => {
      setUserId(id);
      setReady(true);
    });
    if (required && !id) router.replace("/");
  }, [required, router]);

  return { userId, ready };
}

