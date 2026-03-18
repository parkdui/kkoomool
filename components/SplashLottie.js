import { useEffect, useRef } from "react";

const DEFAULT_KEY = "kkoomool:splashPlayed:v1";

export function getSplashPlayed(key = DEFAULT_KEY) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

export function setSplashPlayed(key = DEFAULT_KEY) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // ignore
  }
}

export default function SplashLottie({ onDone }) {
  const hostRef = useRef(null);

  useEffect(() => {
    let animation = null;
    let cancelled = false;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (reduceMotion) {
      const t = window.setTimeout(() => onDone?.(), 0);
      return () => window.clearTimeout(t);
    }

    (async () => {
      try {
        const lottie = (await import("lottie-web")).default;
        const res = await fetch("/Gray10.json", { cache: "force-cache" });
        const data = await res.json();

        if (cancelled || !hostRef.current) return;

        animation = lottie.loadAnimation({
          container: hostRef.current,
          renderer: "svg",
          loop: false,
          autoplay: true,
          animationData: data,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
          },
        });

        animation.addEventListener("complete", () => onDone?.());
      } catch {
        onDone?.();
      }
    })();

    return () => {
      cancelled = true;
      try {
        animation?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [onDone]);

  return <div ref={hostRef} aria-hidden="true" />;
}

