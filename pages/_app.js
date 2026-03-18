import "@/styles/globals.css";
import CursorEllipse from "@/components/CursorEllipse";

export default function App({ Component, pageProps }) {
  return (
    <>
      <CursorEllipse />
      <Component {...pageProps} />
    </>
  );
}
