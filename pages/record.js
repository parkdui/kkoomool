import Head from "next/head";
import { useRouter } from "next/router";
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
  const router = useRouter();
  const { userId, ready } = useUserId({ required: true });

  const [step, setStep] = useState(0); // 0: write, 1: blur, 2: done
  const [draft, setDraft] = useState("");
  const [blur, setBlur] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [resultImageUrl, setResultImageUrl] = useState("");
  const [resultImagePath, setResultImagePath] = useState("");
  const [resultTimeStamp, setResultTimeStamp] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
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

  useEffect(() => {
    if (step !== 2) return;

    let alive = true;
    (async () => {
      setAnalysisLoading(true);
      try {
        const resp = await fetch("/api/relate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            smallDreamText: user?.smallDreamText || "",
            bigDreamText: user?.bigDreamText || (user?.bigDreamTexts || []).join("\n"),
            dreamText: draft.trim(),
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || "analysis_failed");
        if (!alive) return;
        setAnalysis(data?.analysis || null);
      } catch {
        if (!alive) return;
        setAnalysis(null);
      } finally {
        if (!alive) return;
        setAnalysisLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [step, user, draft]);

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

      if (!path) {
        throw new Error("Image upload failed: no storage path returned.");
      }
      setResultImageUrl(url);
      setResultImagePath(path);
      setResultTimeStamp(timeStamp);
      setAnalysis(null);
      setStep(2);
    } catch (e) {
      setError(e?.message || "Could not write record. Check Firestore rules.");
    } finally {
      setSaving(false);
    }
  }

  function discardDraft() {
    const ok = window.confirm("Discard this dream? You will lose this generated result.");
    if (!ok) return;
    setError("");
    setStep(1);
    setResultImageUrl("");
    setResultImagePath("");
    setResultTimeStamp("");
    setAnalysis(null);
  }

  async function saveDream() {
    const text = draft.trim();
    if (!text || !resultImageUrl || !resultImagePath) {
      setError("Nothing to save yet.");
      return;
    }
    setError("");
    setFinalizing(true);
    try {
      const timeStamp = resultTimeStamp || formatTimeStamp(new Date());
      const base = {
        userId,
        time_stamp: timeStamp,
        isPublic,
        text,
        blur: blurPx,
        blurPercent: blur,
        imageUrl: resultImageUrl,
        imageStoragePath: resultImagePath,
        small_dream_text: user?.smallDreamText || "",
        big_dream_text: user?.bigDreamText || (user?.bigDreamTexts || []).join("\n"),
        analysisSummary: analysis?.summary || "",
        analysisClosestTo: analysis?.closestTo || "none",
        nightDreams: [{ text, blur: blurPx, imageUrl: resultImageUrl }],
        night_dream_1: 1,
        night_dream_1_text: text,
        night_dream_1_blur: blurPx,
        night_dream_1_img: resultImageUrl,
      };
      await addRecord(userId, base);
      router.push("/main");
    } catch (e) {
      setError(e?.message || "Could not save this dream.");
    } finally {
      setFinalizing(false);
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
              {saving
                ? "Recording..."
                : step === 2
                ? "Done."
                : step === 0
                ? "What have you dreamed?"
                : "And how clear do you recall?"}
            </h1>
            <p className={`body-small ${styles.sub}`}>
              {saving
                ? "This might take 1-3 minutes."
                : step === 2
                ? "Here, you dreamed this."
                : step === 0
                ? "Describe your last night dream."
                : "Set the level of blur."}
            </p>
          </header>

          <div className={styles.ellipseStage} aria-hidden="true">
            {saving ? (
              <div className={styles.loadingOrbital}>
                <div className={`${styles.loadingOrbitTrack} ${styles.loadingOrbitA}`}>
                  <span className={`${styles.loadingBlob} ${styles.loadingBlobA1}`} />
                  <span className={`${styles.loadingBlob} ${styles.loadingBlobA2}`} />
                  <span className={`${styles.loadingBlob} ${styles.loadingBlobA3}`} />
                </div>
                <div className={`${styles.loadingOrbitTrack} ${styles.loadingOrbitB}`}>
                  <span className={`${styles.loadingBlob} ${styles.loadingBlobB1}`} />
                  <span className={`${styles.loadingBlob} ${styles.loadingBlobB2}`} />
                  <span className={`${styles.loadingBlob} ${styles.loadingBlobB3}`} />
                </div>
                <div className={`${styles.loadingOrbitTrack} ${styles.loadingOrbitC}`}>
                  <span className={`${styles.loadingBlob} ${styles.loadingBlobC1}`} />
                  <span className={`${styles.loadingBlob} ${styles.loadingBlobC2}`} />
                </div>
              </div>
            ) : step === 2 ? (
              <>
                <div className={`${styles.previewLabel} ${styles.resultLabel}`}>{truncated}</div>
                <div className={styles.resultImageWrap}>
                  <div className={styles.resultImageEllipse}>
                    {resultImageUrl ? (
                      <img className={styles.resultImage} src={resultImageUrl} alt="Generated dream" />
                    ) : null}
                  </div>
                </div>
              </>
            ) : step === 1 ? (
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

          {!saving && step === 0 ? (
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
          ) : !saving && step === 1 ? (
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
          ) : null
          }

          {!saving && step === 2 ? (
            <section className={styles.doneSections}>
              <div className={styles.publicCard}>
                <div>
                  <div className={`body-large ${styles.cardTitle}`}>Do you want it public?</div>
                  <div className={`body-small ${styles.cardSub}`}>Yes, other users can see your dream.</div>
                </div>
                <button
                  type="button"
                  className={`${styles.publicToggle} ${isPublic ? styles.publicOn : ""}`}
                  aria-pressed={isPublic}
                  aria-label={isPublic ? "Set dream private" : "Set dream public"}
                  onClick={() => setIsPublic((v) => !v)}
                >
                  <span className={styles.toggleThumb} />
                  <span className={`body-small ${styles.toggleText}`}>{isPublic ? "Public" : "Private"}</span>
                </button>
              </div>

              <div className={styles.analysisCard}>
                <div className={`body-large ${styles.cardTitle}`}>Dream relation analysis</div>
                {analysisLoading ? (
                  <div className={`body-small ${styles.cardSub}`}>Analyzing relation with your small and big dreams...</div>
                ) : (
                  <div className={`body-small ${styles.analysisValue}`}>
                    {analysis?.summary || "This dream does not clearly connect to your small or big dream yet."}
                  </div>
                )}
              </div>
              {error ? <div className={styles.error}>{error}</div> : null}
            </section>
          ) : null}

          {!saving && (step === 0 || step === 1) ? (
            <div className={styles.cta}>
              {step === 0 ? (
                <GooeyButtonGroup fullWidth>
                  <GooeyButton onClick={goNextFromWrite} disabled={saving}>
                    Next
                  </GooeyButton>
                </GooeyButtonGroup>
              ) : step === 1 ? (
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
              ) : null}
            </div>
          ) : null}
          {!saving && step === 2 ? (
            <div className={styles.cta}>
              <GooeyButtonGroup fullWidth>
                <GooeyButton
                  type="button"
                  className={styles.backBtn}
                  onClick={discardDraft}
                  disabled={finalizing}
                >
                  Discard
                </GooeyButton>
                <GooeyButton type="button" onClick={saveDream} disabled={finalizing}>
                  {finalizing ? "Saving..." : "Save"}
                </GooeyButton>
              </GooeyButtonGroup>
            </div>
          ) : null}
        </main>
        {saving ? <div className={styles.loadingOverlay} aria-hidden="true" /> : null}
        <Gnb />
      </div>
    </>
  );
}

