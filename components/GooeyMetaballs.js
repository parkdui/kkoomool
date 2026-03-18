import { useRef, useState } from "react";
import styles from "./GooeyMetaballs.module.css";

export default function GooeyMetaballs({
  variant = "single",
  className = "",
  bigColorVar = "--color-secondary-20",
  smallColorVar,
}) {
  const hostRef = useRef(null);
  const rafRef = useRef(0);
  const [active, setActive] = useState(false);

  function setCursorVars(clientX, clientY) {
    const el = hostRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Stronger goo when cursor is close to circles (distance to nearest edge).
    const centers = [
      { c: { x: rect.width / 2, y: rect.height / 2 }, r: 118 / 2 },
    ];
    if (variant === "double") {
      centers.push({
        c: { x: rect.width / 2 - 72, y: rect.height / 2 + 28 },
        r: 64 / 2,
      });
    }

    const dEdge = centers.reduce((min, { c, r }) => {
      const dx = x - c.x;
      const dy = y - c.y;
      const d = Math.sqrt(dx * dx + dy * dy) - r;
      return Math.min(min, Math.max(0, d));
    }, Infinity);

    const strength = Math.max(0, Math.min(1, 1 - dEdge / 160));
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty("--cx", `${x}px`);
      el.style.setProperty("--cy", `${y}px`);
      el.style.setProperty("--s", `${strength}`);
    });
  }

  function onPointerMove(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    setCursorVars(e.clientX, e.clientY);
  }

  function onPointerEnter(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    setActive(true);
    setCursorVars(e.clientX, e.clientY);
  }

  function onPointerLeave() {
    setActive(false);
  }

  const isDouble = variant === "double";

  return (
    <div
      ref={hostRef}
      className={`${styles.host} ${active ? styles.active : ""} ${className}`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      aria-hidden="true"
      style={{
        "--mb-color-big": `var(${bigColorVar})`,
        "--mb-color-small": `var(${smallColorVar || bigColorVar})`,
      }}
    >
      <div className={styles.bigWrap}>
        <div className={styles.big} />
      </div>
      {isDouble ? (
        <div className={styles.smallWrap}>
          <div className={styles.small} />
        </div>
      ) : null}
      <div className={styles.cursor} />
    </div>
  );
}

