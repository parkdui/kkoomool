import Link from "next/link";
import { useRouter } from "next/router";
import styles from "./Gnb.module.css";

function Icon({ name, active }) {
  const stroke =
    active
      ? "rgba(0,0,0,0.92)"
      : "rgba(0,0,0,0.42)";
  if (name === "record") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
          stroke={stroke}
          strokeWidth="1.8"
        />
        <path
          d="M5.5 11.5c0 3.6 2.9 6.5 6.5 6.5s6.5-2.9 6.5-6.5"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 18v3"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
          stroke={stroke}
          strokeWidth="1.8"
        />
        <path
          d="M16.8 16.8 21 21"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s-7-4.4-7-11a4.2 4.2 0 0 1 7-2.7A4.2 4.2 0 0 1 19 10c0 6.6-7 11-7 11Z"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Gnb() {
  const router = useRouter();
  const path = router.pathname;

  const items = [
    { href: "/record", key: "record", label: "Record" },
    { href: "/search", key: "search", label: "Search" },
    { href: "/main", key: "explore", label: "Explore" },
  ];

  return (
    <nav className={`${styles.nav} glass goo`} aria-label="Global navigation">
      {items.map((it) => {
        const active = path === it.href;
        return (
          <Link
            key={it.key}
            href={it.href}
            className={`${styles.item} ${active ? styles.active : ""}`}
          >
            <Icon name={it.key} active={active} />
            <span className={styles.label}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

