// frontend/pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon for browser tab */}
        <link rel="icon" href="/favicon.png" />

        {/* Optional: better support for Apple/Android */}
        <link rel="apple-touch-icon" href="/favicon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
