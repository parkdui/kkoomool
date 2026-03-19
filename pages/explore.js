import Head from "next/head";
import Gnb from "@/components/Gnb";
import { useUserId } from "@/lib/useUserId";
import styles from "@/styles/Main.module.css";
import splashStyles from "@/styles/Splash.module.css";

export default function ExplorePage() {
  useUserId({ required: true });
  return (
    <>
      <Head>
        <title>Explore • kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className={`screen ${styles.home}`}>
          <header className={styles.header}>
            <h1 className={`header-small`}>Drag to explore freely.</h1>
            <p className={`body-small ${styles.sub}`}>
           You might buy it, or offer yours.
          </p>
        </header>
        <Gnb />
      </main>
    </>
  );
}
