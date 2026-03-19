import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import GooeyButton from "@/components/GooeyButton";
import GooeyButtonGroup from "@/components/GooeyButtonGroup";
import Gnb from "@/components/Gnb";
import { useUserId } from "@/lib/useUserId";
import { addRecord, getUser } from "@/lib/firestoreModel";
import { uploadDataUrl } from "@/lib/storageModel";
import { formatTimeStamp } from "@/lib/time";
import styles from "@/styles/Record.module.css";

export default function RecordPage() {
  const { userId, ready } = useUserId({ required: true });
  const [user, setUser] = useState(null);

  const [step, setStep] = useState(0); // 0: write, 1: blur
  const [draft, setDraft] = useState("");
  const [blur, setBlur] = useState(50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [gooActive, setGooActive] = useState(false);

  const gooRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      const u = await getUser(userId);
      setUser(u);
    })();
  }, [ready, userId]);

  const blurPx = useMemo(() => {
    // slider 0..100 -> blur 0..10px
    return Math.round((blur / 100) * 10 * 10) / 10;
  }, [blur]);

  const truncated = useMemo(() => {
    const t = draft.trim().replace(/\s+/g, " ");
    if (t.length <= 20) return t;
    return `${t.slice(0, 20)}...`;
  }, [draft]);

  function setCursorVars(clientX, clientY) {
    const el = gooRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty("--cx", `${x}px`);
      el.style.setProperty("--cy", `${y}px`);
    });
  }

  function onPointerMove(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    setCursorVars(e.clientX, e.clientY);
  }

  function onPointerEnter(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    setGooActive(true);
    setCursorVars(e.clientX, e.clientY);
  }

  function onPointerLeave() {
    setGooActive(false);
  }

  function goNextFromWrite() {
    setError("");
    const text = draft.trim();
    if (!text) {
      setError("Write something first.");
      return;
    }
    setStep(1);
  }

  function goBack() {
    setError("");
    setStep(0);
  }

  async function submit() {
    setError("");
    const text = draft.trim();
    if (!text) {
      setError("Write something first.");
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
 
      const base = {
        userId,
        time_stamp: timeStamp,
        small_dream_text: user?.smallDreamText || "",
        big_dream_text: user?.bigDreamText || (user?.bigDreamTexts || []).join("\n"),
        nightDreams: [
          {
            text: dream.text,
            blur: dream.blur,
            imageUrl: dream.imageUrl,
          },
        ],
        night_dream_1: 1,
        night_dream_1_text: dream.text,
        night_dream_1_blur: dream.blur,
        night_dream_1_img: dream.imageUrl,
      };

      await addRecord(userId, base);
      window.location.href = "/main";
    } catch (e) {
      setError(e?.message || "Could not write record. Check Firestore rules.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>Record • kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="appShell">
        <main className={`screen ${styles.home}`}>
          <header className={styles.header}>
            <h1 className={`header-small`}>
              {step === 0 ? "What have you dreamed?" : "And how clear do you recall?"}
            </h1>
            <p className={`body-small ${styles.sub}`}>
              {step === 0 ? "Describe your last night dream." : "Set the level of blur."}
            </p>
          </header>

          <div className={styles.ellipseStage} aria-hidden="true">
            {step === 1 ? (
              <>
                <div
                  className={styles.previewLabel}
                  style={{ filter: blurPx ? `blur(${blurPx}px)` : undefined }}
                >
                  {truncated}
                </div>
                <div className={styles.gooOuter} style={{ filter: blurPx ? `blur(${blurPx}px)` : undefined }}>
                  <div
                    ref={gooRef}
                    className={`${styles.gooStage} ${gooActive ? styles.gooActive : ""}`}
                    onPointerMove={onPointerMove}
                    onPointerEnter={onPointerEnter}
                    onPointerLeave={onPointerLeave}
                  >
                    <div className={`${styles.floatingEllipse} ${styles.floatingEllipseBig}`} />
                    <div className={styles.underDots}>
                      <span className={styles.underDotA} />
                      <span className={styles.underDotB} />
                    </div>
                    <span className={styles.cursorBlob} aria-hidden="true" />
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.floatingEllipse} />
            )}
          </div>

          {step === 0 ? (
            <div className={styles.card}>
              <textarea
                className={`body-medium ${styles.textarea}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder="A sun was arising, the light was dimmed, and I felt warmth..."
              />
              {error ? <div className={styles.error}>{error}</div> : null}
            </div>
          ) : (
            <div className={styles.blurPanel}>
              <div className={styles.sliderRow}>
                <div className={`body-small ${styles.sliderLabel}`}>Clear</div>
                <input
                  className={styles.slider}
                  type="range"
                  min="0"
                  max="100"
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                  style={{ "--p": `${blur}%` }}
                  aria-label="Blur level"
                />
                <div className={`body-small ${styles.sliderLabel}`}>Blurry</div>
              </div>
              {error ? <div className={styles.error}>{error}</div> : null}
            </div>
          )}

          <div className={styles.cta}>
            {step === 0 ? (
              <GooeyButtonGroup fullWidth>
                <GooeyButton onClick={goNextFromWrite} disabled={saving}>
                  Next
                </GooeyButton>
              </GooeyButtonGroup>
            ) : (
              <GooeyButtonGroup fullWidth>
                <GooeyButton
                  type="button"
                  className={styles.backBtn}
                  onClick={goBack}
                  disabled={saving}
                >
                  Back
                </GooeyButton>
                <GooeyButton onClick={submit} disabled={saving}>
                  Next
                </GooeyButton>
              </GooeyButtonGroup>
            )}
          </div>
        </main>
        <Gnb />
      </div>
    </>
  );
}

