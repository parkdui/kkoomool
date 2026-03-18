import { useMemo } from "react";
import styles from "./GooeyEllipse.module.css";

export default function GooeyEllipse({
  size = 170,
  tone = "light",
  className = "",
  onClick,
  children,
  style,
  blurred = 0,
  selected = false,
  backgroundImageUrl,
}) {
  const bg = useMemo(() => {
    if (!backgroundImageUrl) return undefined;
    return `url(${backgroundImageUrl})`;
  }, [backgroundImageUrl]);

  return (
    <button
      type="button"
      className={`${styles.ellipse} ${styles[tone]} ${
        selected ? styles.selected : ""
      } ${className}`}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        filter: blurred ? `blur(${blurred}px)` : undefined,
        backgroundImage: bg,
        ...style,
      }}
    >
      <span className={styles.inner}>{children}</span>
    </button>
  );
}

