import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useSpeechToText({ lang = "en-US" } = {}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [interim, setInterim] = useState("");

  const recognitionRef = useRef(null);

  const SpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const supported = !!SpeechRecognition;

  useEffect(() => {
    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      setError("");
      setInterim("");
      setListening(true);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.onerror = (e) => {
      setError(e?.error || "speech_error");
      setListening(false);
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.onresult = null;
        rec.onstart = null;
        rec.onend = null;
        rec.onerror = null;
        rec.stop();
      } catch {}
    };
  }, [SpeechRecognition, lang]);

  const start = useCallback(() => {
    setError("");
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch {}
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  const bind = useCallback(
    (onFinalText) => {
      const rec = recognitionRef.current;
      if (!rec) return () => {};
      rec.onresult = (event) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const t = res[0]?.transcript || "";
          if (res.isFinal) finalText += t;
          else interimText += t;
        }
        setInterim(interimText);
        if (finalText && typeof onFinalText === "function") onFinalText(finalText);
      };
      return () => {
        if (rec) rec.onresult = null;
      };
    },
    []
  );

  return { supported, listening, interim, error, start, stop, toggle, bind };
}

