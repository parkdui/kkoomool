import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import GooeyButton from "@/components/GooeyButton";
import SplashLottie from "@/components/SplashLottie";
import { getStoredUserId, setStoredUserId, validateUserId } from "@/lib/userId";
import { getUser } from "@/lib/firestoreModel";
import { firebaseErrorToMessage } from "@/lib/firebaseError";
import styles from "@/styles/Onboarding.module.css";
import splashStyles from "@/styles/Splash.module.css";

export default function Onboarding() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSplash, setShowSplash] = useState(false);
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [reveal, setReveal] = useState(false);

  const validity = useMemo(() => validateUserId(userId), [userId]);

  useEffect(() => {
    const existing = getStoredUserId();
    if (existing) setUserId(existing);
  }, []);

  useEffect(() => {
    setShowSplash(true);
    setSplashLeaving(false);
    setReveal(false);
  }, []);

  function finishSplash() {
    setReveal(true);
    setSplashLeaving(true);
    window.setTimeout(() => setShowSplash(false), 520);
  }

  async function diveIn() {
    setError("");
    if (!validity.ok) {
      setError(
        validity.reason === "too_long"
          ? "ID must be 16 characters or fewer."
          : validity.reason === "empty"
          ? "Please enter your ID."
          : "Only letters/numbers/_/- are allowed."
      );
      return;
    }

    setSubmitting(true);
    try {
      const id = validity.value;
      setStoredUserId(id);
      const u = await getUser(id);
      if (u?.tutorialCompleted) {
        router.push("/main");
      } else {
        router.push("/tutorial");
      }
    } catch (e) {
      setError(firebaseErrorToMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="appShell">
        {showSplash ? (
          <div
            className={`${splashStyles.overlay} ${splashLeaving ? splashStyles.leave : ""}`}
          >
            <div className={splashStyles.lottie}>
              <SplashLottie onDone={finishSplash} />
            </div>
          </div>
        ) : null}

        <main className={`screen ${styles.wrap} ${reveal ? "" : styles.wrapHidden}`}>
          <div className={`${styles.card} glass`}>
            <h1 className={`${styles.h1} header-mideum`}>kkoomool</h1>

            <div className={styles.field}>
              <div className={styles.label}>User ID</div>
              <input
                className={styles.input}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="your ID"
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="text"
                maxLength={24}
              />
              <div className={styles.hint}>
                {error ? (
                  <span className={styles.error}>{error}</span>
                ) : (
                  <span>No password. Max 16 chars. (A–Z, 0–9, _ , -)</span>
                )}
              </div>
            </div>

            <div className={styles.cta}>
              <GooeyButton onClick={diveIn} disabled={submitting}>
                Dive in
              </GooeyButton>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
