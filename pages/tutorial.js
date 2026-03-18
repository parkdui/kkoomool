import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import GooeyButton from "@/components/GooeyButton";
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
  const [big, setBig] = useState([""]);
  const [error, setError] = useState("");

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
        if (Array.isArray(u?.bigDreamTexts) && u.bigDreamTexts.length) {
          setBig(u.bigDreamTexts.slice(0, 3));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, router, userId]);

  const canNextA = useMemo(() => small.trim().length > 0, [small]);
  const canNextB = useMemo(
    () => big.some((t) => t.trim().length > 0),
    [big]
  );

  async function nextA() {
    setError("");
    if (!canNextA) {
      setError("Write something (even short).");
      return;
    }
    setStep(1);
  }

  function addBig() {
    if (big.length >= 3) return;
    setBig((prev) => [...prev, ""]);
  }

  async function finishTutorial() {
    setError("");
    if (!canNextB) {
      setError("Add at least one big dream text.");
      return;
    }
    try {
      const bigDreamTexts = big.map((t) => t.trim()).filter(Boolean).slice(0, 3);
      await upsertUser(userId, {
        createdAt: new Date().toISOString(),
        tutorialCompleted: true,
        smallDreamText: small.trim(),
        bigDreamTexts,
        bigDreamText: bigDreamTexts.join("\n"),
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
      <div className="appShell">
        <main className={`screen ${styles.wrap}`}>
          <div className={`${styles.card} glass`}>
            {step === 0 ? (
              <>
                <h1 className={styles.h1}>What is your recent dream?</h1>
                <p className={styles.p}>Write down your small goal you wanna achieve.</p>
                <textarea
                  className={styles.textarea}
                  value={small}
                  onChange={(e) => setSmall(e.target.value)}
                  rows={6}
                  placeholder="Your small dream..."
                />
                {error ? <div className={styles.error}>{error}</div> : null}
                <div className={styles.row}>
                  <GooeyButton onClick={nextA}>next</GooeyButton>
                </div>
              </>
            ) : (
              <>
                <h1 className={styles.h1}>What is your ultimate dream?</h1>
                <p className={styles.p}>Let me know your goal of your life.</p>

                <div className={styles.bigList}>
                  {big.map((v, i) => (
                    <textarea
                      key={i}
                      className={styles.textarea}
                      value={v}
                      onChange={(e) => {
                        const next = [...big];
                        next[i] = e.target.value;
                        setBig(next);
                      }}
                      rows={4}
                      placeholder={`Big dream ${i + 1}...`}
                    />
                  ))}
                </div>

                <div className={styles.smallRow}>
                  <button
                    type="button"
                    className={`${styles.addBtn} goo`}
                    onClick={addBig}
                    disabled={big.length >= 3}
                  >
                    add
                  </button>
                </div>

                {error ? <div className={styles.error}>{error}</div> : null}
                <div className={styles.row}>
                  <GooeyButton onClick={finishTutorial}>next</GooeyButton>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

