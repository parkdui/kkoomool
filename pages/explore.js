import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import Gnb from "@/components/Gnb";
import { useUserId } from "@/lib/useUserId";
import { listPublicDreams } from "@/lib/firestoreModel";
import styles from "@/styles/Explore.module.css";

const WORLD_SIZE = 3200;
const VIEW_SIZE = 1400;

function hashInt(seed) {
  const s = String(seed || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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

function formatTimestamp(value) {
  const d = coerceToDate(value);
  if (!d) return "";
  const t = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${t} • ${month}, ${d.getDate()} • ${d.getFullYear()}`;
}

function normalizeDream(item) {
  const blurPercent =
    typeof item.blurPercent === "number"
      ? item.blurPercent
      : typeof item.blur === "number"
      ? item.blur * 10
      : typeof item.night_dream_1_blur === "number"
      ? item.night_dream_1_blur * 10
      : 0;
  return {
    id: item.id,
    userId: item.userId || "Unknown",
    text: item.text || item.night_dream_1_text || "",
    blur: Math.max(0, Math.min(100, Math.round(blurPercent))),
    imageUrl: item.imageUrl || item.night_dream_1_img || "",
    time: item.createdAt || item.time_stamp || null,
  };
}

export default function ExplorePage() {
  useUserId({ required: true });
  const [dreams, setDreams] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedShift, setSelectedShift] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const dataSectionRef = useRef(null);
  const prevZoomRef = useRef(1);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const items = await listPublicDreams(120);
        if (!alive) return;
        const normalized = items.map(normalizeDream).filter((d) => d.imageUrl);
        setDreams(normalized);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Could not load public dreams.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollLeft = (WORLD_SIZE - VIEW_SIZE) / 2;
    el.scrollTop = (WORLD_SIZE - VIEW_SIZE) / 2;
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const prev = prevZoomRef.current;
    if (prev === zoom) return;
    const centerX = el.scrollLeft + el.clientWidth / 2;
    const centerY = el.scrollTop + el.clientHeight / 2;
    const worldCenterX = centerX / prev;
    const worldCenterY = centerY / prev;
    el.scrollLeft = worldCenterX * zoom - el.clientWidth / 2;
    el.scrollTop = worldCenterY * zoom - el.clientHeight / 2;
    prevZoomRef.current = zoom;
  }, [zoom]);

  const positionedDreams = useMemo(() => {
    const padding = 220;
    const range = WORLD_SIZE - padding * 2;
    return dreams.map((d) => {
      const h1 = hashInt(d.id);
      const h2 = hashInt(`${d.id}-y`);
      const h3 = hashInt(`${d.id}-s`);
      const x = padding + (h1 % range);
      const y = padding + (h2 % range);
      const size = 90 + (h3 % 70);
      return { ...d, x, y, size };
    });
  }, [dreams]);

  const selected = useMemo(
    () => positionedDreams.find((d) => d.id === selectedId) || null,
    [positionedDreams, selectedId]
  );

  useEffect(() => {
    if (!selectedId) return;
    const t = setTimeout(() => {
      dataSectionRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    }, 130);
    return () => clearTimeout(t);
  }, [selectedId]);

  function onViewportPointerDown(e) {
    if (e.target?.closest?.("[data-ellipse]")) return;
    const el = viewportRef.current;
    if (!el) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      dragging: true,
    };
    el.setPointerCapture?.(e.pointerId);
  }

  function onViewportPointerMove(e) {
    const el = viewportRef.current;
    const drag = dragRef.current;
    if (!el || !drag?.dragging) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    el.scrollLeft = drag.scrollLeft - dx;
    el.scrollTop = drag.scrollTop - dy;
  }

  function onViewportPointerUp(e) {
    const el = viewportRef.current;
    if (el) el.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
  }

  function selectDream(dreamId, e) {
    if (selectedId === dreamId) {
      setSelectedId("");
      setSelectedShift({ x: 0, y: 0 });
      return;
    }
    const viewport = viewportRef.current;
    const targetRect = e?.currentTarget?.getBoundingClientRect?.();
    const viewportRect = viewport?.getBoundingClientRect?.();
    if (targetRect && viewportRect) {
      const dx = viewportRect.left + viewportRect.width / 2 - (targetRect.left + targetRect.width / 2);
      const dy = viewportRect.top + viewportRect.height / 2 - (targetRect.top + targetRect.height / 2);
      setSelectedShift({ x: dx * 0.22, y: dy * 0.22 });
    } else {
      setSelectedShift({ x: 0, y: 0 });
    }
    setSelectedId(dreamId);
  }

  function focusRandomDream() {
    if (!positionedDreams.length) return;
    const i = Math.floor(Math.random() * positionedDreams.length);
    const d = positionedDreams[i];
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTo({
        left: Math.max(0, d.x * zoom - viewport.clientWidth / 2),
        top: Math.max(0, d.y * zoom - viewport.clientHeight / 2),
        behavior: "smooth",
      });
    }
    setSelectedId(d.id);
    setSelectedShift({ x: 0, y: 0 });
  }

  function zoomBy(delta) {
    setZoom((z) => Math.max(0.6, Math.min(2.2, Math.round((z + delta) * 100) / 100)));
  }

  function resetZoom() {
    setZoom(1);
  }

  return (
    <>
      <Head>
        <title>Explore • kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="appShell">
      <main className={`screen ${styles.home}`}>
          <header className={styles.header}>
            <h1 className={`header-small`}>Drag to explore freely.</h1>
            <p className={`body-small ${styles.sub}`}>
              Explore public dreams from other users.
          </p>
        </header>

        <section className={styles.viewportSection}>
          <div className={styles.viewportTools}>
            <button type="button" className={styles.toolBtn} onClick={() => zoomBy(-0.15)}>
              -
            </button>
            <button type="button" className={styles.toolBtn} onClick={resetZoom}>
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className={styles.toolBtn} onClick={() => zoomBy(0.15)}>
              +
            </button>
            <button type="button" className={styles.toolBtn} onClick={focusRandomDream}>
              Find a dream
            </button>
          </div>
          <div
            ref={viewportRef}
            className={styles.viewport}
            onPointerDown={onViewportPointerDown}
            onPointerMove={onViewportPointerMove}
            onPointerUp={onViewportPointerUp}
            onPointerCancel={onViewportPointerUp}
          >
            <div
              className={styles.world}
              style={{ width: `${WORLD_SIZE * zoom}px`, height: `${WORLD_SIZE * zoom}px` }}
            >
              {positionedDreams.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  data-ellipse
                  className={`${styles.resultImageEllipse} ${
                    selectedId === d.id ? styles.selectedEllipse : ""
                  } ${selectedId && selectedId !== d.id ? styles.dimmedEllipse : ""}`}
                  onClick={(e) => selectDream(d.id, e)}
                  style={{
                    left: `${d.x * zoom}px`,
                    top: `${d.y * zoom}px`,
                    width: `${d.size * zoom}px`,
                    height: `${d.size * zoom}px`,
                    "--mx": selectedId === d.id ? `${selectedShift.x}px` : "0px",
                    "--my": selectedId === d.id ? `${selectedShift.y}px` : "0px",
                  }}
                  aria-label={`Open dream by ${d.userId}`}
                >
                  <img className={styles.resultImage} src={d.imageUrl} alt="" />
                </button>
              ))}
              {loading ? <div className={`body-small ${styles.hint}`}>Loading public dreams...</div> : null}
              {!loading && !positionedDreams.length ? (
                <div className={`body-small ${styles.hint}`}>No public dreams yet.</div>
              ) : null}
              {error ? <div className={`body-small ${styles.hint}`}>{error}</div> : null}
            </div>
          </div>
        </section>

        {selectedId && selected ? (
          <section ref={dataSectionRef} className={styles.dataSection} key={selectedId}>
            <div className={styles.dataHeader}>
              <div className={`body-large ${styles.userId}`}>{selected.userId}</div>
              <div className={`body-small ${styles.time}`}>{formatTimestamp(selected.time)}</div>
            </div>
            <div className={`body-large ${styles.text}`}>{selected.text || "No dream text."}</div>
            <div className={styles.blurPill}>blur {selected.blur}%</div>
          </section>
        ) : null}
      </main>
      <Gnb />
      </div>
    </>
  );
}
