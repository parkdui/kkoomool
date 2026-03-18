import Head from "next/head";
import Gnb from "@/components/Gnb";
import { useUserId } from "@/lib/useUserId";

export default function SearchPage() {
  useUserId({ required: true });
  return (
    <>
      <Head>
        <title>Search • kkoomool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="appShell">
        <main className="screen">
          <h1 style={{ fontSize: 28, letterSpacing: "-0.8px" }}>Search</h1>
          <p style={{ marginTop: 10, color: "var(--text-muted)", fontWeight: 650 }}>
            (placeholder) — next: search other users’ dreams.
          </p>
        </main>
        <Gnb />
      </div>
    </>
  );
}

