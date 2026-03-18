import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          style={{ display: "none" }}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <filter id="goo">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="12"
                result="blur"
              />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 1 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -4"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
      </body>
    </Html>
  );
}
