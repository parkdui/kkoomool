import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import GooeyEllipse from "@/components/GooeyEllipse";
import Gnb from "@/components/Gnb";
import { useUserId } from "@/lib/useUserId";
import { getUser, listRecentRecords } from "@/lib/firestoreModel";
import styles from "@/styles/Main.module.css";

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function Floating({ id, x, y, vy, children }) {
  return (
    <div
      className={styles.float}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDuration: `${vy}s`,
        animationDelay: `${-rand(0, vy)}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function MainPage() {
  const { userId, ready } = useUserId({ required: true });
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [relations, setRelations] = useState(null);

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      const u = await getUser(userId);
      setUser(u);
      const r = await listRecentRecords(userId, 12);
      setRecords(r);
    })();
  }, [ready, userId]);

  const goals = useMemo(() => {
    const small = user?.smallDreamText ? [{ key: "small", text: user.smallDreamText }] : [];
    const bigs = Array.isArray(user?.bigDreamTexts)
      ? user.bigDreamTexts.map((t, i) => ({ key: `big_${i}`, text: t }))
      : user?.bigDreamText
      ? [{ key: "big_0", text: user.bigDreamText }]
      : [];
    return [...small, ...bigs].filter((g) => g.text?.trim());
  }, [user]);

  useEffect(() => {
    if (!goals.length || !records.length) return;
    (async () => {
      try {
        const resp = await fetch("/api/relate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goals: goals.map((g) => g.text),
            dreams: records
              .flatMap((rec) => (Array.isArray(rec.nightDreams) ? rec.nightDreams : []))
              .map((d) => d.text),
          }),
        });
        const data = await resp.json();
        setRelations(data);
      } catch {
        setRelations(null);
      }
    })();
  }, [goals, records]);

  const goalNodes = useMemo(() => {
    return goals.map((g, i) => ({
      ...g,
      x: rand(20, 80),
      y: rand(18, 62),
      vy: rand(14, 22),
      tone: i % 2 ? "light" : "dark",
    }));
  }, [goals]);

  const dreamNodes = useMemo(() => {
    const dreams = records.flatMap((rec) => (Array.isArray(rec.nightDreams) ? rec.nightDreams : []));
    return dreams.slice(0, 10).map((d, i) => ({
      key: `dream_${i}`,
      text: d.text,
      blur: d.blur ?? 0,
      img: d.imageUrl,
      x: rand(16, 84),
      y: rand(22, 70),
      vy: rand(16, 26),
      tone: "light",
    }));
  }, [records]);

  const nodes = useMemo(() => [...goalNodes, ...dreamNodes], [goalNodes, dreamNodes]);

  function toggle(key) {
    setSelected((prev) => (prev === key ? null : key));
  }

  return (
    <>
      <Head>
        <title>Main • kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="appShell">
        <main className={`screen ${styles.stage}`}>
          <div className={`${styles.gooStage} goo`} aria-hidden="true" />

          <div className={styles.canvas}>
            {nodes.map((n) => (
              <Floating key={n.key} id={n.key} x={n.x} y={n.y} vy={n.vy}>
                <GooeyEllipse
                  size={selected === n.key ? 210 : 150}
                  tone={n.tone}
                  selected={selected === n.key}
                  blurred={n.blur ? Math.min(10, n.blur) : 0}
                  backgroundImageUrl={n.img}
                  onClick={() => toggle(n.key)}
                >
                  {selected === n.key ? n.text : ""}
                </GooeyEllipse>
              </Floating>
            ))}
          </div>

          {relations?.pairs?.length ? (
            <div className={styles.relations}>
              <div className={`${styles.relCard} glass`}>
                <div className={styles.relTitle}>Relations</div>
                <div className={styles.relList}>
                  {relations.pairs.slice(0, 5).map((p, i) => (
                    <div key={i} className={styles.relRow}>
                      <div className={styles.relScore}>{Math.round(p.score * 100)}%</div>
                      <div className={styles.relText}>{p.goal}</div>
                      <div className={styles.relTextMuted}>↔</div>
                      <div className={styles.relText}>{p.dream}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </main>
        <Gnb />
      </div>
    </>
  );
}

