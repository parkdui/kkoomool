import styles from "./GooeyButton.module.css";

export default function GooeyButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      className={`${styles.button} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.label}>{children}</span>
    </button>
  );
}

