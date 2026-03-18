import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import GooeyButton from "@/components/GooeyButton";
import GooeyEllipse from "@/components/GooeyEllipse";
import Gnb from "@/components/Gnb";
import { useUserId } from "@/lib/useUserId";
import { addRecord, getUser } from "@/lib/firestoreModel";
import { uploadDataUrl } from "@/lib/storageModel";
import { formatTimeStamp } from "@/lib/time";
import { useSpeechToText } from "@/lib/useSpeechToText";
import styles from "@/styles/Record.module.css";

function MicIcon({ active }) {
  const fill = active ? "rgba(0,0,0,0.92)" : "rgba(0,0,0,0.5)";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke={fill}
        strokeWidth="1.8"
      />
      <path
        d="M5.5 11.5c0 3.6 2.9 6.5 6.5 6.5s6.5-2.9 6.5-6.5"
        stroke={fill}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function RecordPage() {
  const { userId, ready } = useUserId({ required: true });
  const [user, setUser] = useState(null);

  const [draft, setDraft] = useState("");
  const [blur, setBlur] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const { supported, listening, interim, toggle, bind } = useSpeechToText({
    lang: "en-US",
  });

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      const u = await getUser(userId);
      setUser(u);
    })();
  }, [ready, userId]);

  useEffect(() => {
    return bind((finalText) => {
      setDraft((prev) => (prev ? `${prev} ${finalText}` : finalText).trim());
    });
  }, [bind]);

  const blurPx = useMemo(() => {
    // slider 0..100 -> blur 0..10px
    return Math.round((blur / 100) * 10 * 10) / 10;
  }, [blur]);

  const orbitRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    function tick(now) {
      const t = (now - start) / 1000;
      const r = 36;
      const x = Math.cos(t * 0.35) * r;
      const y = Math.sin(t * 0.35) * r;
      if (orbitRef.current) {
        orbitRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function saveOne() {
    setError("");
    const text = draft.trim();
    if (!text) {
      setError("Write (or speak) something first.");
      return;
    }

    setSaving(true);
    try {
      const resp = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          style: "dream-like, soft, abstract, surreal, cinematic, minimal noise",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const detail = data?.message || data?.code || data?.error || "generate_failed";
        throw new Error(`Image generation failed: ${detail}`);
      }
      if (!data?.dataUrl) throw new Error("Image generation failed: no dataUrl returned.");

      const timeStamp = formatTimeStamp(new Date());
      const { url, path } = await uploadDataUrl({
        userId,
        path: `users/${userId}/dreams/${timeStamp}_${Date.now()}.png`,
        dataUrl: data.dataUrl,
        contentType: "image/png",
      });

      const dream = {
        text,
        blur: blurPx,
        imageUrl: url,
        imageStoragePath: path,
      };
      setItems((prev) => [...prev, dream]);

      // reset composer for "add"
      setDraft("");
      setBlur(0);
    } catch (e) {
      setError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    setError("");
    if (!items.length) {
      setError("Add at least one dream first.");
      return;
    }
    setSaving(true);
    try {
      const timeStamp = formatTimeStamp(new Date());
      const base = {
        userId,
        time_stamp: timeStamp,
        small_dream_text: user?.smallDreamText || "",
        big_dream_text: user?.bigDreamText || (user?.bigDreamTexts || []).join("\n"),
        nightDreams: items.map((d) => ({
          text: d.text,
          blur: d.blur,
          imageUrl: d.imageUrl,
        })),
      };

      const denorm = {};
      items.forEach((d, idx) => {
        const n = idx + 1;
        denorm[`night_dream_${n}`] = n;
        denorm[`night_dream_${n}_text`] = d.text;
        denorm[`night_dream_${n}_blur`] = d.blur;
        denorm[`night_dream_${n}_img`] = d.imageUrl;
      });

      await addRecord(userId, { ...base, ...denorm });
      window.location.href = "/main";
    } catch {
      setError("Could not write record. Check Firestore rules.");
    } finally {
      setSaving(false);
    }
  }

  const showInterim = listening && interim;

  return (
    <>
      <Head>
        <title>Record • kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="appShell">
        <main className={`screen ${styles.wrap}`}>
          <h1 className={styles.h1}>What have you dreamed?</h1>
          <p className={styles.p}>Spit it out unless the dream will be vanished.</p>

          <div className={`${styles.ellipses} goo`}>
            <div className={styles.center}>
              <GooeyEllipse size={220} tone="dark">
                {items.length ? `${items.length} saved` : ""}
              </GooeyEllipse>
            </div>
            <div className={styles.orbit} ref={orbitRef}>
              <GooeyEllipse size={160} tone="light" />
            </div>
          </div>

          <div className={`${styles.composer} glass`}>
            <div className={styles.textRow}>
              <textarea
                className={styles.textarea}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                placeholder="Type your dream…"
                style={{ filter: blurPx ? `blur(${blurPx}px)` : undefined }}
              />
              <button
                type="button"
                className={`${styles.micBtn} goo`}
                onClick={toggle}
                disabled={!supported}
                aria-pressed={listening}
                aria-label="microphone"
              >
                <MicIcon active={listening} />
              </button>
            </div>

            {showInterim ? <div className={styles.interim}>{interim}</div> : null}

            <div className={styles.sliderRow}>
              <div className={styles.sliderLabel}>clear</div>
              <input
                className={styles.slider}
                type="range"
                min="0"
                max="100"
                value={blur}
                onChange={(e) => setBlur(Number(e.target.value))}
              />
              <div className={styles.sliderLabel}>blurry</div>
            </div>

            {error ? <div className={styles.error}>{error}</div> : null}

            <div className={styles.saveRow}>
              <GooeyButton onClick={saveOne} disabled={saving}>
                save
              </GooeyButton>
            </div>
          </div>

          <div className={styles.bottomRow}>
            <button
              type="button"
              className={`${styles.secondaryBtn} goo`}
              onClick={finish}
              disabled={saving}
            >
              finish
            </button>
            <button
              type="button"
              className={`${styles.secondaryBtn} goo`}
              onClick={saveOne}
              disabled={saving}
            >
              add
            </button>
          </div>
        </main>
        <Gnb />
      </div>
    </>
  );
}

