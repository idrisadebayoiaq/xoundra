import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const client = process.env.EXPO_PUBLIC_ADSENSE_CLIENT || 'ca-pub-9287775024440500';
const dist = join(process.cwd(), 'dist', 'index.html');

if (!existsSync(dist)) {
  console.error('inject-adsense: dist/index.html missing — run expo export first');
  process.exit(1);
}

let html = readFileSync(dist, 'utf8');
const tags = [];
if (!html.includes('google-adsense-account') && !html.includes(`client=${client}`)) {
  tags.push(`<meta name="google-adsense-account" content="${client}">`);
  tags.push(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`);
}
if (!html.includes('manifest.webmanifest')) {
  tags.push('<link rel="manifest" href="/manifest.webmanifest">');
  tags.push('<meta name="theme-color" content="#07080D">');
}

if (!tags.length) {
  console.log('inject-adsense: tags already present');
  process.exit(0);
}

if (!html.includes('</head>')) {
  console.error('inject-adsense: no </head> in dist/index.html');
  process.exit(1);
}

html = html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
writeFileSync(dist, html);
console.log(`inject-adsense: wrote ${tags.length} head tags`);
