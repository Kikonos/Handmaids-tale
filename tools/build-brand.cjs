// Builds home-screen artwork: app icons (iOS + PWA + maskable + favicon) and iPad launch screens.
// Dev-only. Uses the preinstalled Playwright Chromium to rasterise SVG/HTML.
// Run: node tools/build-brand.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'brand');
fs.mkdirSync(OUT, { recursive: true });

// ---------------- The Handmaid in profile (facing right), 200 x 400 local box ----------------
function handmaid(id = 'h', cloak = '#a3161c', wing = '#f4efe6') {
  return `<g transform="rotate(-5 110 110)">
    <path d="M72 126 C42 150 30 240 16 400 L178 400 C174 320 168 232 152 162 C146 140 132 132 118 134 Z" fill="${cloak}"/>
    <path d="M78 150 C62 220 54 300 46 400 M120 150 C118 240 120 320 124 400" stroke="#000" stroke-opacity=".22" stroke-width="5" fill="none"/>
    <path d="M58 132 C30 110 36 56 80 42 C110 33 150 40 172 54 L190 60 C196 100 194 150 184 192 L160 178 C136 158 108 152 90 154 C74 154 64 146 58 132 Z" fill="${wing}"/>
    <path d="M110 42 C114 86 120 126 130 160" stroke="#cfc6b5" stroke-width="3" fill="none"/>
    <path d="M184 63 C190 104 189 150 180 190 L174 187 C181 150 182 108 178 64Z" fill="#6b3a36" opacity=".55"/>
  </g>`;
}

// ---------------- The emblem: a Handmaid beneath the Eye ----------------
// scale: 1 = full bleed (iOS icon), 0.8 = maskable safe zone.
function iconSVG(scale = 1, rounded = false) {
  const s = scale, o = (1 - s) * 256;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="58%" cy="30%" r="80%">
      <stop offset="0" stop-color="#8a141b"/><stop offset=".42" stop-color="#3e070c"/><stop offset="1" stop-color="#0b0606"/>
    </radialGradient>
    <linearGradient id="cloak" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d42a2f"/><stop offset=".6" stop-color="#a3161c"/><stop offset="1" stop-color="#5c0b0e"/>
    </linearGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ded6c6"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf6b" stop-opacity=".6"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/></radialGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="-6" dy="8" stdDeviation="10" flood-color="#000" flood-opacity=".6"/></filter>
  </defs>
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="url(#bg)"/>
  <g transform="translate(${o} ${o}) scale(${s})">
    <g opacity=".13" stroke="#ffd98a" stroke-width="3">
      ${Array.from({ length: 11 }, (_, i) => { const a = (40 + i * 10) * Math.PI / 180; return `<line x1="372" y1="96" x2="${372 + Math.cos(a) * -600}" y2="${96 + Math.sin(a) * 600}"/>`; }).join('')}
    </g>
    <!-- The Eye, watching from above -->
    <circle cx="372" cy="96" r="78" fill="url(#glow)"/>
    <g transform="translate(372 96) scale(.82)">
      <path d="M-62 0 Q0 -48 62 0 Q0 48 -62 0Z" fill="#f2e6cc" stroke="#c9a227" stroke-width="6"/>
      <circle r="21" fill="#a3161c"/><circle r="9.5" fill="#0b0a09"/><circle cx="-6" cy="-6" r="4.5" fill="#fff"/>
    </g>
    <!-- The Handmaid -->
    <g filter="url(#sh)" transform="translate(92 150) scale(1.08)">${handmaid('i', 'url(#cloak)', 'url(#wing)')}</g>
  </g>
</svg>`;
}

// ---------------- Launch screen ----------------
const b64 = f => fs.readFileSync(path.join(ROOT, 'assets/fonts', f)).toString('base64');
function splashHTML(w, h) {
  const fonts = `@font-face{font-family:Disp;src:url(data:font/woff2;base64,${b64('instrument-serif.woff2')}) format('woff2')}
  @font-face{font-family:Disp;font-style:italic;src:url(data:font/woff2;base64,${b64('instrument-serif-italic.woff2')}) format('woff2')}
  @font-face{font-family:Inter;font-weight:100 900;src:url(data:font/woff2;base64,${b64('inter-var.woff2')}) format('woff2')}
  @font-face{font-family:Mono;font-weight:100 800;src:url(data:font/woff2;base64,${b64('jetbrains-mono-var.woff2')}) format('woff2')}`;
  const portrait = h > w;
  const base = Math.min(w, h);
  // Handmaids walking in pairs along the bottom
  const n = portrait ? 8 : 12, sc = base / 2500;
  let procession = '';
  for (let i = 0; i < n; i++) {
    const x = w * 0.02 + i * (w * 0.96 / n);
    for (const [dx, dy, k, op] of [[0, 0, 1, 0.95], [base * 0.05, -base * 0.03, 0.88, 0.7]].reverse())
      procession += `<g transform="translate(${x + dx} ${h - 400 * sc * k + dy + base * 0.01}) scale(${sc * k})" opacity="${op}">${handmaid('s' + i, '#9c151b', '#efe8da')}</g>`;
  }
  const em = base * (portrait ? 0.3 : 0.27);
  const icon = iconSVG(1).replace('<svg ', `<svg style="width:${em}px;height:${em}px;border-radius:${em * 0.225}px;box-shadow:0 ${base * 0.02}px ${base * 0.06}px #000,0 0 ${base * 0.08}px #b3202a66" `);
  return `<!doctype html><html><head><style>${fonts}
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#070505}
  .bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% ${portrait ? 34 : 30}%,#560b10 0%,#1d0507 45%,#060404 85%)}
  .grain{position:absolute;inset:0;opacity:.05;background:repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 4px)}
  .floor{position:absolute;left:0;right:0;bottom:0;height:${base * 0.05}px;background:linear-gradient(transparent,#000)}
  .c{position:absolute;left:0;right:0;top:${portrait ? 18 : 8}%;text-align:center;color:#eadfca}
  .k{font-family:Mono;font-weight:500;letter-spacing:${base * 0.012}px;font-size:${base * 0.015}px;color:#ff6b70;text-transform:uppercase;margin-top:${base * 0.045}px}
  h1{font-family:Disp;font-weight:400;font-size:${base * 0.13}px;margin:${base * 0.008}px 0 0;line-height:.95;letter-spacing:-.01em;color:#eceef1}h1 em{color:#ff6b70}
  .t{font-family:Inter;font-weight:450;font-size:${base * 0.019}px;color:#7d838d;margin-top:${base * 0.02}px}
  .vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,#000b 100%)}
  </style></head><body><div class="bg"></div><div class="grain"></div>
  <svg style="position:absolute;inset:0" width="${w}" height="${h}">${procession}</svg>
  <div class="floor"></div><div class="vig"></div>
  <div class="c">${icon}<div class="k">The Republic of Gilead</div><h1>Under His <em>Eye</em></h1><div class="t">Blessed be the fruit.</div></div>
  </body></html>`;
}

// iPad launch screens: [css width, css height, dpr]
const IPADS = [
  [820, 1180, 2],  // iPad (A16) 11th gen, iPad 10th gen, iPad Air 10.9"/11"
  [834, 1194, 2],  // iPad Pro 11"
  [810, 1080, 2],  // iPad 7th–9th gen 10.2"
  [744, 1133, 2],  // iPad mini 6/7
  [1024, 1366, 2], // iPad Pro 12.9" / Air 13"
];

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();
  // Icons
  const icons = [
    ['icon-1024.png', 1024, iconSVG(1)], ['icon-512.png', 512, iconSVG(1)], ['icon-192.png', 192, iconSVG(1)],
    ['apple-touch-icon.png', 180, iconSVG(1)], ['icon-167.png', 167, iconSVG(1)], ['icon-152.png', 152, iconSVG(1)],
    ['icon-maskable-512.png', 512, iconSVG(0.8)], ['icon-maskable-192.png', 192, iconSVG(0.8)],
    ['favicon-32.png', 32, iconSVG(1, true)],
  ];
  for (const [name, size, svg] of icons) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await page.screenshot({ path: path.join(OUT, name), omitBackground: name.startsWith('favicon') });
  }
  fs.writeFileSync(path.join(OUT, 'icon.svg'), iconSVG(1, true));
  // Launch screens
  const links = [];
  for (const [cw, ch, dpr] of IPADS) {
    for (const orient of ['landscape', 'portrait']) {
      const w = (orient === 'landscape' ? ch : cw) * dpr, h = (orient === 'landscape' ? cw : ch) * dpr;
      await page.setViewportSize({ width: w, height: h });
      await page.setContent(splashHTML(w, h), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const name = `splash-${w}x${h}.png`;
      await page.screenshot({ path: path.join(OUT, name), type: 'png' });
      links.push(`<link rel="apple-touch-startup-image" media="(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orient})" href="assets/brand/${name}">`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'startup-links.html'), links.join('\n') + '\n'); // paste into index.html <head>
  await b.close();
  console.log('brand assets written to assets/brand');
})();
