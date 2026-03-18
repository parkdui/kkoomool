import { useEffect, useRef, useState } from "react";
import styles from "./CursorEllipse.module.css";

export default function CursorEllipse() {
  const dotRef = useRef(null);
  const rafRef = useRef(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function setPos(x, y) {
      const el = dotRef.current;
      if (!el) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      });
    }

    function onMove(e) {
      // show only for mouse/trackpad, not touch
      if (e.pointerType && e.pointerType !== "mouse") return;
      if (!visible) setVisible(true);
      setPos(e.clientX, e.clientY);
    }

    function onLeave() {
      setVisible(false);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible]);

  return (
    <div
      ref={dotRef}
      className={`${styles.dot} ${visible ? styles.visible : ""}`}
      aria-hidden="true"
    />
  );
}

