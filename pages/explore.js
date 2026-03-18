import Head from "next/head";
import Gnb from "@/components/Gnb";
import { useUserId } from "@/lib/useUserId";

export default function ExplorePage() {
  useUserId({ required: true });
  return (
    <>
      <Head>
        <title>Explore • kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="appShell">
        <main className="screen">
          <h1 className="header-mideum">Explore</h1>
          <p style={{ marginTop: 10, color: "var(--text-muted)", fontWeight: 650 }}>
            (placeholder) — next: explore other users’ dreams.
          </p>
        </main>
        <Gnb />
      </div>
    </>
  );
}

