import { useMemo, useRef, useState } from "react";
import styles from "./GooeyButtonGroup.module.css";

export default function GooeyButtonGroup({ children, className = "", fullWidth = false }) {
  const hostRef = useRef(null);
  const rafRef = useRef(0);
  const [active, setActive] = useState(false);

  const mergedClassName = useMemo(
    () =>
      `${styles.group} ${fullWidth ? styles.full : ""} ${
        active ? styles.active : ""
      } ${className}`.trim(),
    [active, className, fullWidth]
  );

  function setCursorVars(clientX, clientY) {
    const el = hostRef.current;
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
    setActive(true);
    setCursorVars(e.clientX, e.clientY);
  }

  function onPointerLeave() {
    setActive(false);
  }

  return (
    <div
      ref={hostRef}
      className={mergedClassName}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {children}
      <span className={styles.cursor} aria-hidden="true" />
    </div>
  );
}

