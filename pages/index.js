import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GooeyButton from "@/components/GooeyButton";
import GooeyButtonGroup from "@/components/GooeyButtonGroup";
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
  const [ready, setReady] = useState(false);
  const doneRef = useRef(false);

  const validity = useMemo(() => validateUserId(userId), [userId]);

  useEffect(() => {
    const existing = getStoredUserId();
    if (existing) setUserId(existing);
  }, []);

  const finishSplash = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setReady(true);
  }, []);

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
      <div className={styles.page}>
        <main className={styles.main}>
          <div
            className={`${styles.heroSlot} ${ready ? styles.heroReady : styles.heroIntro}`}
          >
            <div className={splashStyles.stack}>
              <div className={`body-large ${splashStyles.title}`}>Let your dream...</div>
              <div className={splashStyles.lottie}>
                <SplashLottie onDone={finishSplash} />
              </div>
            </div>
          </div>

          <div className={`${styles.form} ${ready ? "" : styles.hidden}`}>
            <input
              className={`${styles.input} body-medium`}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Your name"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="text"
              maxLength={24}
            />
            <div className={`${styles.hint} caption-large`}>
              {error ? (
                <span className={styles.error}>{error}</span>
              ) : (
                <span>Please use at least 3 characters.</span>
              )}
            </div>
          </div>

          <div className={`${styles.cta} ${ready ? "" : styles.hidden} header-small`}>
            <GooeyButtonGroup fullWidth>
              <GooeyButton
                onClick={diveIn}
                disabled={submitting}
                className={styles.diveButton}
              >
                Dive In
              </GooeyButton>
            </GooeyButtonGroup>
          </div>
        </main>
      </div>
    </>
  );
}
