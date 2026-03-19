import Link from "next/link";
import { useRouter } from "next/router";
import styles from "./Gnb.module.css";
import GooeyButtonGroup from "@/components/GooeyButtonGroup";

export default function Gnb() {
  const router = useRouter();
  const path = router.pathname;

  const items = [
    { href: "/main", key: "home", label: "Home" },
    { href: "/record", key: "record", label: "Record" },
    { href: "/explore", key: "explore", label: "Explore" },
  ];

  return (
    <nav className={styles.nav} aria-label="Global navigation">
      {items.map((it) => {
        const active = path === it.href;
        if (active) {
          return (
            <GooeyButtonGroup key={it.key} fullWidth>
              <Link href={it.href} className={`${styles.item} ${styles.active}`}>
                <span className={`body-medium ${styles.label}`}>{it.label}</span>
              </Link>
            </GooeyButtonGroup>
          );
        }

        return (
          <Link key={it.key} href={it.href} className={styles.item}>
            <span className={`body-medium ${styles.label}`}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

