import { ScrollViewStyleReset } from 'expo-router/html';

const ADSENSE_CLIENT = process.env.EXPO_PUBLIC_ADSENSE_CLIENT || 'ca-pub-9287775024440500';

/** Web document shell — AdSense account meta + loader for xoundra.vercel.app */
export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
        <meta name="theme-color" content="#07080D" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <ScrollViewStyleReset />
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
