import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import Gnb from "@/components/Gnb";
import { useUserId } from "@/lib/useUserId";
import { getUser, listRecentRecords } from "@/lib/firestoreModel";
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

function hashFromString(seed) {
  let h = 2166136261;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default function MainPage() {
  const { userId, ready } = useUserId({ required: true });
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [stageActive, setStageActive] = useState(false);
  const stageRef = useRef(null);
  const stageWrapRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      const [u, recs] = await Promise.all([getUser(userId), listRecentRecords(userId, 60)]);
      setUser(u);
      setRecords(Array.isArray(recs) ? recs : []);
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
    if (typeof selected === "string" && selected.startsWith("record:")) {
      const recordId = selected.slice("record:".length);
      const rec = records.find((r) => r.id === recordId);
      if (!rec) return null;
      return {
        title: "My recent dream was...",
        text: (rec.text || rec.night_dream_1_text || "").trim(),
        time: formatDreamTimestamp(rec.createdAt || rec.time_stamp),
      };
    }
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
  }, [bigText, smallText, selected, user?.bigDreamUpdatedAt, user?.smallDreamUpdatedAt, user?.updatedAt, records]);

  const recordBubbles = useMemo(() => {
    const stageW = 360;
    const stageH = 320;
    const fixed = [
      { x: 55, y: 56, size: 160 },
      { x: 34, y: 64, size: 86 },
    ];
    const imageRecords = records
      .map((r) => ({
        id: r.id,
        imageUrl: r.imageUrl || r.night_dream_1_img || "",
      }))
      .filter((r) => r.imageUrl);

    const count = imageRecords.length;
    if (!count) return [];

    const xMargin = 8;
    const yMargin = 10;
    const cols = Math.max(5, Math.min(9, Math.ceil(Math.sqrt((count * stageW) / stageH))));
    const rows = Math.max(4, Math.ceil(count / cols));
    const usableWPct = 100 - xMargin * 2;
    const usableHPct = 100 - yMargin * 2;
    const cellWPx = (stageW * usableWPct) / 100 / cols;
    const cellHPx = (stageH * usableHPct) / 100 / rows;
    const baseSize = Math.max(34, Math.min(cellWPx, cellHPx) * 0.72);

    const slots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = xMargin + ((c + 0.5) * usableWPct) / cols;
        const y = yMargin + ((r + 0.5) * usableHPct) / rows;
        slots.push({ x, y });
      }
    }

    const used = new Set();
    const placed = [];

    function collidesWithFixed(x, y, size) {
      const px = (x / 100) * stageW;
      const py = (y / 100) * stageH;
      return fixed.some((p) => {
        const ppx = (p.x / 100) * stageW;
        const ppy = (p.y / 100) * stageH;
        const minDist = ((size + p.size) / 2) * 1.08;
        const dx = px - ppx;
        const dy = py - ppy;
        return dx * dx + dy * dy < minDist * minDist;
      });
    }

    function collidesWithPlaced(x, y, size) {
      const px = (x / 100) * stageW;
      const py = (y / 100) * stageH;
      return placed.some((p) => {
        const ppx = (p.x / 100) * stageW;
        const ppy = (p.y / 100) * stageH;
        const minDist = ((size + p.size) / 2) * 1.14;
        const dx = px - ppx;
        const dy = py - ppy;
        return dx * dx + dy * dy < minDist * minDist;
      });
    }

    return imageRecords.map((record, idx) => {
      const isRecent = idx < 6;
      const isMidRecent = idx >= 6 && idx < 14;
      const h = hashFromString(`${record.id}-${idx}`);
      const preferredX = 50;
      const preferredY = isRecent ? 34 : isMidRecent ? 46 : 58;
      const sizeJitter = ((h >>> 12) % 12) - 6;
      const size = Math.max(32, Math.round(baseSize + sizeJitter + (isRecent ? 8 : isMidRecent ? 4 : 0)));

      const ranked = slots
        .map((s, slotIdx) => {
          const takenPenalty = used.has(slotIdx) ? 100000 : 0;
          const dx = s.x - preferredX;
          const dy = s.y - preferredY;
          const prefDist = Math.sqrt(dx * dx + dy * dy);
          const jitter = ((hashFromString(`${record.id}-slot-${slotIdx}`) % 1000) / 1000) * 0.4;
          return { slotIdx, prefDist: prefDist + jitter + takenPenalty };
        })
        .sort((a, b) => a.prefDist - b.prefDist);

      let picked = null;
      for (const cand of ranked) {
        const s = slots[cand.slotIdx];
        if (!s) continue;
        if (used.has(cand.slotIdx)) continue;
        if (collidesWithFixed(s.x, s.y, size)) continue;
        if (collidesWithPlaced(s.x, s.y, size)) continue;
        picked = { ...s, slotIdx: cand.slotIdx };
        break;
      }

      // Fallback: pick the first untaken slot even if a soft collision remains.
      if (!picked) {
        const fallback = ranked.find((cand) => !used.has(cand.slotIdx));
        picked = { ...slots[fallback ? fallback.slotIdx : 0], slotIdx: fallback ? fallback.slotIdx : 0 };
      }

      used.add(picked.slotIdx);
      placed.push({ x: picked.x, y: picked.y, size });

      const moveX = (((50 - picked.x) / 100) * stageW) * 0.28;
      const moveY = (((50 - picked.y) / 100) * stageH) * 0.28;
      const delay = -((h >>> 20) % 2800);
      return { ...record, x: picked.x, y: picked.y, size, delay, moveX, moveY };
    });
  }, [records]);

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
                {recordBubbles.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`${styles.recordBall} ${
                      selected === `record:${b.id}` ? styles.recordSelected : ""
                    } ${
                      selected && selected !== `record:${b.id}` ? styles.recordDimmed : ""
                    }`}
                    onClick={(e) => toggle(`record:${b.id}`, e)}
                    style={{
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      width: `${b.size}px`,
                      height: `${b.size}px`,
                      animationDelay: `${b.delay}ms`,
                      "--mx": selected === `record:${b.id}` ? `${b.moveX}px` : "0px",
                      "--my": selected === `record:${b.id}` ? `${b.moveY}px` : "0px",
                    }}
                    aria-label="Saved dream"
                  >
                    <img className={styles.recordImage} src={b.imageUrl} alt="" />
                  </button>
                ))}
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

