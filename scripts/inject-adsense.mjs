import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const client = process.env.EXPO_PUBLIC_ADSENSE_CLIENT || 'ca-pub-9287775024440500';
const dist = join(process.cwd(), 'dist', 'index.html');

if (!existsSync(dist)) {
  console.error('inject-adsense: dist/index.html missing — run expo export first');
  process.exit(1);
}

let html = readFileSync(dist, 'utf8');
if (html.includes(`client=${client}`) || html.includes('google-adsense-account')) {
  console.log('inject-adsense: AdSense tags already present');
  process.exit(0);
}

const tags = [
  `<meta name="google-adsense-account" content="${client}">`,
  `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`,
].join('\n    ');

if (!html.includes('</head>')) {
  console.error('inject-adsense: no </head> in dist/index.html');
  process.exit(1);
}

html = html.replace('</head>', `    ${tags}\n  </head>`);
writeFileSync(dist, html);
console.log(`inject-adsense: wrote AdSense tags for ${client}`);
