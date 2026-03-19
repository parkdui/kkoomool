import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import Gnb from "@/components/Gnb";
import { useUserId } from "@/lib/useUserId";
import { getUser } from "@/lib/firestoreModel";
import styles from "@/styles/Main.module.css";

function pickTwoColors(seedText) {
  const choices = ["--color-secondary-20", "--color-secondary-30", "--color-secondary-40"];
  let h = 0;
  for (let i = 0; i < seedText.length; i++) h = (h * 31 + seedText.charCodeAt(i)) >>> 0;
  const i = h % choices.length;
  const remaining = choices.filter((_, idx) => idx !== i);
  const j = (h >>> 8) % remaining.length;
  return { small: choices[i], big: remaining[j] };
}

function coerceToDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value?.seconds === "number") {
    const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDreamTimestamp(value) {
  const d = coerceToDate(value);
  if (!d) return "";
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${time} • ${month},${day} • ${year}`;
}

export default function MainPage() {
  const { userId, ready } = useUserId({ required: true });
  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [stageActive, setStageActive] = useState(false);
  const stageRef = useRef(null);
  const stageWrapRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      const u = await getUser(userId);
      setUser(u);
    })();
  }, [ready, userId]);

  const smallText = (user?.smallDreamText || "").trim();
  const bigText = (
    (Array.isArray(user?.bigDreamTexts) && user.bigDreamTexts[0]) ||
    user?.bigDreamText ||
    ""
  ).trim();

  const colors = useMemo(() => pickTwoColors(userId || "kkoomool"), [userId]);

  const label = useMemo(() => {
    if (selected === "big") {
      return {
        title: "My big dream is...",
        text: bigText,
        time: formatDreamTimestamp(user?.bigDreamUpdatedAt || user?.updatedAt),
      };
    }
    if (selected === "small") {
      return {
        title: "My small dream is...",
        text: smallText,
        time: formatDreamTimestamp(user?.smallDreamUpdatedAt || user?.updatedAt),
      };
    }
    return null;
  }, [bigText, smallText, selected, user?.bigDreamUpdatedAt, user?.smallDreamUpdatedAt, user?.updatedAt]);

  function setCursorVars(clientX, clientY) {
    const el = stageRef.current;
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
    setStageActive(true);
    setCursorVars(e.clientX, e.clientY);
  }

  function onPointerLeave() {
    setStageActive(false);
  }

  function toggle(key, e) {
    const next = selected === key ? null : key;
    setSelected(next);
    if (!next) return;
    const wrapEl = stageWrapRef.current;
    if (!wrapEl) return;
    const wrapRect = wrapEl.getBoundingClientRect();
    const targetRect = e?.currentTarget?.getBoundingClientRect?.();
    if (!targetRect) return;
    const x = targetRect.left + targetRect.width / 2 - wrapRect.left;
    const y = targetRect.top + targetRect.height / 2 - wrapRect.top;
    setAnchor({ x, y });
  }

  return (
    <>
      <Head>
        <title>Home • kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="appShell">
        <main className={`screen ${styles.home}`}>
          <header className={styles.header}>
            <h1 className="header-small">How was your last night?</h1>
            <p className={`body-small ${styles.sub}`}>
              If you’ve dreamed of anything, record it.
            </p>
          </header>

          <section className={styles.metaballs} aria-label="Dreams">
            <div
              ref={stageWrapRef}
              className={styles.stageWrap}
              onPointerMove={onPointerMove}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
            >
              <div
                ref={stageRef}
                className={`${styles.ballStage} ${stageActive ? styles.stageActive : ""}`}
                aria-hidden={selected ? "true" : "false"}
              >
                <button
                  type="button"
                  className={`${styles.ball} ${styles.big} ${
                    selected === "big" ? styles.selected : ""
                  }`}
                  onClick={(e) => toggle("big", e)}
                  style={{ "--ball-color": `var(${colors.big})` }}
                  aria-label="Big dream"
                />

                <button
                  type="button"
                  className={`${styles.ball} ${styles.small} ${
                    selected === "small" ? styles.selected : ""
                  }`}
                  onClick={(e) => toggle("small", e)}
                  style={{ "--ball-color": `var(${colors.small})` }}
                  aria-label="Small dream"
                />
                <span className={styles.cursorBlob} aria-hidden="true" />
              </div>

              {label?.text ? (
                <div
                  key={selected}
                  className={styles.labelReveal}
                  style={{
                    "--ax": `${anchor?.x ?? 0}px`,
                    "--ay": `${anchor?.y ?? 0}px`,
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <div className={styles.dreamLabel}>
                    <div className={styles.labelTop}>
                      <div className={`body-large ${styles.labelTitle}`}>{label.title}</div>
                      {label.time ? (
                        <div className={`caption-large ${styles.labelTime}`}>{label.time}</div>
                      ) : null}
                    </div>
                    <div className={`body-medium ${styles.labelBody}`}>{label.text}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </main>
        <Gnb />
      </div>
    </>
  );
}

