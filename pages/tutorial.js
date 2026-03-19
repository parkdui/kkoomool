import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { serverTimestamp } from "firebase/firestore";
import GooeyButton from "@/components/GooeyButton";
import GooeyButtonGroup from "@/components/GooeyButtonGroup";
import GooeyMetaballs from "@/components/GooeyMetaballs";
import { useUserId } from "@/lib/useUserId";
import { getUser, upsertUser } from "@/lib/firestoreModel";
import { firebaseErrorToMessage } from "@/lib/firebaseError";
import styles from "@/styles/Tutorial.module.css";

export default function TutorialPage() {
  const router = useRouter();
  const { userId, ready } = useUserId({ required: true });
  const [step, setStep] = useState(0); // 0: small, 1: big
  const [loading, setLoading] = useState(true);

  const [small, setSmall] = useState("");
  const [big, setBig] = useState("");
  const [error, setError] = useState("");
  const [ellipseColors] = useState(() => {
    const choices = ["--color-secondary-20", "--color-secondary-30", "--color-secondary-40"];
    const i = Math.floor(Math.random() * choices.length);
    const remaining = choices.filter((_, idx) => idx !== i);
    const j = Math.floor(Math.random() * remaining.length);
    return { small: choices[i], big: remaining[j] };
  });

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      setLoading(true);
      try {
        const u = await getUser(userId);
        if (u?.tutorialCompleted) {
          router.replace("/main");
          return;
        }
        if (u?.smallDreamText) setSmall(u.smallDreamText);
        if (Array.isArray(u?.bigDreamTexts) && u.bigDreamTexts.length) setBig(u.bigDreamTexts[0]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, router, userId]);

  const canNextA = useMemo(() => small.trim().length >= 3, [small]);
  const canNextB = useMemo(() => big.trim().length >= 3, [big]);

  async function nextA() {
    setError("");
    if (!canNextA) {
      setError("Please use at least 3 characters.");
      return;
    }
    try {
      await upsertUser(userId, {
        smallDreamText: small.trim(),
        smallDreamUpdatedAt: serverTimestamp(),
      });
    } catch (e) {
      setError(firebaseErrorToMessage(e));
      return;
    }
    setStep(1);
  }

  function back() {
    setError("");
    setStep(0);
  }

  async function finishTutorial() {
    setError("");
    if (!canNextB) {
      setError("Please use at least 3 characters.");
      return;
    }
    try {
      const bigDreamTexts = [big.trim()];
      await upsertUser(userId, {
        tutorialCompleted: true,
        smallDreamText: small.trim(),
        smallDreamUpdatedAt: serverTimestamp(),
        bigDreamTexts,
        bigDreamText: bigDreamTexts[0],
        bigDreamUpdatedAt: serverTimestamp(),
      });
      router.push("/main");
    } catch (e) {
      setError(firebaseErrorToMessage(e));
    }
  }

  if (!ready || loading) return null;

  return (
    <>
      <Head>
        <title>Tutorial • kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.top}>
            {step === 0 ? (
              <>
                <div className={`body-large ${styles.kicker}`}>Let’s start with small one.<br></br>What is your recent dream?</div>
                {/* <h1 className={`header-small ${styles.h1}`}>What is your recent dream?</h1> */}
                <p className={`body-small ${styles.p}`}>Write small things you want to achieve.</p>
              </>
            ) : (
              <>
                <div className={`body-large ${styles.kicker}`}>Got it.<br></br>What about a big dream?</div>
                {/* <h1 className={`header-small ${styles.h1}`}></h1> */}
                <p className={`body-small ${styles.p}`}>Write ultimate thing you want to do.</p>
              </>
            )}
          </div>

          <div className={styles.center}>
            <GooeyMetaballs
              variant={step === 0 ? "single" : "double"}
              bigColorVar={step === 0 ? ellipseColors.small : ellipseColors.big}
              smallColorVar={ellipseColors.small}
            />
          </div>

          <div className={styles.form}>
            <textarea
              className={`${styles.input} body-medium`}
              value={step === 0 ? small : big}
              onChange={(e) => (step === 0 ? setSmall(e.target.value) : setBig(e.target.value))}
              placeholder={
                step === 0 ? "My small dream is to eat strawberry cake." : "My big dream is to be an astronaut."
              }
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={140}
              rows={6}
            />
            <div className={`${styles.hint} caption-large`}>
              {error ? <span className={styles.error}>{error}</span> : <span>&nbsp;</span>}
            </div>
          </div>

          <div className={styles.cta}>
            {step === 0 ? (
              <GooeyButtonGroup fullWidth>
                <GooeyButton onClick={nextA} disabled={!canNextA}>
                  Next
                </GooeyButton>
              </GooeyButtonGroup>
            ) : (
              <GooeyButtonGroup fullWidth>
                <GooeyButton type="button" className={styles.backBtn} onClick={back}>
                  Back
                </GooeyButton>
                <GooeyButton onClick={finishTutorial} disabled={!canNextB}>
                  Next
                </GooeyButton>
              </GooeyButtonGroup>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

