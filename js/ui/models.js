// Isometric 3D miniatures of every institution, drawn from a few primitives (boxes, roofs, cylinders,
// quonset huts) on a 20 x 20 ground tile. Each model becomes an SVG <symbol id="m-TYPE"> so the map
// and the UI can reuse it cheaply with <use>. Light comes from the upper left: tops are brightest,
// left-facing walls take the base colour and right-facing walls are in shade.
import { BUILDINGS } from '../data/buildings.js';

export const MODEL_VIEWBOX = '-26 -40 52 52';
// Runway ends of the airfield model in model units (x along the runway, y = 0, z on the strip).
export const RUNWAY = { x0: -16, x1: 16, z: 0.9 };
const C30 = 0.8660254, S30 = 0.5;
const P = (x, y, z) => [(x - y) * C30, (x + y) * S30 - z];
const pts = a => a.map(p => { const [sx, sy] = P(...p); return `${sx.toFixed(2)},${sy.toFixed(2)}`; }).join(' ');

// colour helpers
const hex = c => { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shade = (c, t) => { const a = hex(c); return toHex(a.map(v => t >= 0 ? v + (255 - v) * t : v * (1 + t))); };
const mix = (c1, c2, t) => { const a = hex(c1), b = hex(c2); return toHex(a.map((v, i) => v + (b[i] - v) * t)); };

const LIGHT = { top: 0.2, left: 0, right: -0.3 };
const stroke = c => `stroke="${shade(c, -0.55)}" stroke-width=".22" stroke-linejoin="round"`;
const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
const face = (a, c, t) => poly(a, shade(c, t), stroke(c));

// ---------- primitives ----------
function box(x, y, z, w, d, h, c, o = {}) {
  const x1 = x + w, y1 = y + d, z1 = z + h;
  return face([[x, y1, z], [x1, y1, z], [x1, y1, z1], [x, y1, z1]], c, LIGHT.left) +
    face([[x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1]], c, LIGHT.right) +
    face([[x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1]], o.top || c, o.top ? 0 : LIGHT.top);
}
const slab = (c, h = 0.8, x = -10, y = -10, w = 20, d = 20) => box(x, y, 0, w, d, h, c);
// Gable roof. axis 'x': ridge runs along x (gable ends face +x); axis 'y': ridge along y (gable ends face +y).
function gable(x, y, z, w, d, h, c, axis = 'x', end = null) {
  const x1 = x + w, y1 = y + d, zt = z + h;
  if (axis === 'x') {
    const ym = y + d / 2;
    return face([[x, y, z], [x1, y, z], [x1, ym, zt], [x, ym, zt]], c, 0.28) +
      face([[x, y1, z], [x1, y1, z], [x1, ym, zt], [x, ym, zt]], c, 0.02) +
      face([[x1, y, z], [x1, y1, z], [x1, ym, zt]], end || c, end ? LIGHT.right : -0.35);
  }
  const xm = x + w / 2;
  return face([[x, y, z], [x, y1, z], [xm, y1, zt], [xm, y, zt]], c, 0.3) +
    face([[x1, y, z], [x1, y1, z], [xm, y1, zt], [xm, y, zt]], c, -0.22) +
    face([[x, y1, z], [x1, y1, z], [xm, y1, zt]], end || c, end ? LIGHT.left : 0.05);
}
function pyramid(x, y, z, w, d, h, c) {
  const x1 = x + w, y1 = y + d, ap = [x + w / 2, y + d / 2, z + h];
  return face([[x, y1, z], [x1, y1, z], ap], c, 0.05) + face([[x1, y, z], [x1, y1, z], ap], c, -0.25);
}
const ell = (cx, cy, z) => { const [sx, sy] = P(cx, cy, z); return [sx, sy]; };
// Vertical cylinder (radius r on the ground), optional dome or cone cap.
function cyl(cx, cy, z, r, h, c, cap = 'flat', capC = null) {
  const rx = r * 1.2247, ry = r * 0.7071;
  const [sx, sb] = ell(cx, cy, z), st = sb - h;
  let s = `<path d="M${(sx - rx).toFixed(2)},${st.toFixed(2)} L${(sx - rx).toFixed(2)},${sb.toFixed(2)} A${rx.toFixed(2)},${ry.toFixed(2)} 0 0 0 ${(sx + rx).toFixed(2)},${sb.toFixed(2)} L${(sx + rx).toFixed(2)},${st.toFixed(2)} Z" fill="${c}" ${stroke(c)}/>`;
  s += `<path d="M${sx.toFixed(2)},${(st + ry).toFixed(2)} L${sx.toFixed(2)},${(sb + ry).toFixed(2)} A${rx.toFixed(2)},${ry.toFixed(2)} 0 0 0 ${(sx + rx).toFixed(2)},${sb.toFixed(2)} L${(sx + rx).toFixed(2)},${st.toFixed(2)} Z" fill="#000" opacity=".28"/>`;
  const cc = capC || c;
  if (cap === 'dome') s += `<path d="M${(sx - rx).toFixed(2)},${st.toFixed(2)} A${rx.toFixed(2)},${(r * 1.05).toFixed(2)} 0 0 1 ${(sx + rx).toFixed(2)},${st.toFixed(2)} A${rx.toFixed(2)},${ry.toFixed(2)} 0 0 1 ${(sx - rx).toFixed(2)},${st.toFixed(2)}Z" fill="${shade(cc, 0.15)}" ${stroke(cc)}/>`;
  else if (cap === 'cone') s += `<path d="M${(sx - rx).toFixed(2)},${st.toFixed(2)} L${sx.toFixed(2)},${(st - r * 1.4).toFixed(2)} L${(sx + rx).toFixed(2)},${st.toFixed(2)} A${rx.toFixed(2)},${ry.toFixed(2)} 0 0 1 ${(sx - rx).toFixed(2)},${st.toFixed(2)}Z" fill="${shade(cc, 0.05)}" ${stroke(cc)}/>`;
  else s += `<ellipse cx="${sx.toFixed(2)}" cy="${st.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="${shade(cc, 0.22)}" ${stroke(cc)}/>`;
  return s;
}
// Quonset hut (half cylinder) lying along x from x0 to x1, centred on y = cy.
function quonset(x0, x1, cy, z, r, c, n = 8) {
  let s = '';
  for (let i = n - 1; i >= 0; i--) {
    const t0 = Math.PI * i / n, t1 = Math.PI * (i + 1) / n;
    const q = t => [cy + r * Math.cos(t), z + r * Math.sin(t)];
    const [ya, za] = q(t0), [yb, zb] = q(t1);
    const nm = (t0 + t1) / 2, lum = (Math.cos(nm) * 0.6 + Math.sin(nm) * 0.9) * 0.22 - 0.08;
    s += poly([[x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb]], shade(c, lum), `stroke="${shade(c, lum)}" stroke-width=".15"`);
  }
  const cap = []; for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; cap.push([x1, cy + r * Math.cos(t), z + r * Math.sin(t)]); }
  s += face(cap, c, -0.32);
  s += face([[x1, cy - r * 0.35, z], [x1, cy + r * 0.35, z], [x1, cy + r * 0.35, z + r * 0.6], [x1, cy - r * 0.35, z + r * 0.6]], '#1a1d22', 0);
  return s;
}
// Windows on the +y face (plane y) or the +x face (plane x).
function windows(axis, plane, a0, a1, z0, z1, cols, rows, c, fr = 0.5) {
  let s = '';
  const cw = (a1 - a0) / cols, rh = (z1 - z0) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const aa = a0 + cw * (i + (1 - fr) / 2), ab = aa + cw * fr, za = z0 + rh * (j + 0.22), zb = za + rh * 0.56;
    const q = axis === 'y' ? [[aa, plane, za], [ab, plane, za], [ab, plane, zb], [aa, plane, zb]] : [[plane, aa, za], [plane, ab, za], [plane, ab, zb], [plane, aa, zb]];
    s += poly(q, typeof c === 'function' ? c(i, j) : c);
  }
  return s;
}
const line = (a, b, c, w = 0.35, extra = '') => { const [x1, y1] = P(...a), [x2, y2] = P(...b); return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`; };
const flag = (x, y, z, h, c = '#b3202a') => line([x, y, z], [x, y, z + h], '#c9ced6', 0.3) + poly([[x, y, z + h], [x, y + 3.2, z + h - 0.6], [x, y, z + h - 1.8]], c);
const shadow = (x = -10, y = -10, w = 20, d = 20) => `<polygon points="${pts([[x + 1.5, y + 1.5, 0], [x + w + 2.2, y + 1.5, 0], [x + w + 2.2, y + d + 2.2, 0], [x + 1.5, y + d + 2.2, 0]])}" fill="#000" opacity=".38"/>`;
const lit = (i, j) => ((i * 7 + j * 3) % 5 < 3 ? '#ffd98a' : '#2a2620');

const STONE = '#8f949c', CONC = '#6b7079', DARK = '#2a2e35', GLASS = '#1a1d22', WHITE = '#e8e4dc', ROOF = '#3a3f47';

// ---------- the models ----------
const MODELS = {
  redcenter: c => {
    const brick = mix(c, '#8a3a2e', 0.35);
    return shadow() + slab('#3c4048') + line([-10, 9, 0.8], [10, 9, 0.8], '#545a63', 0.3) +
      box(-9, -4.5, 0.8, 18, 9, 7, brick, { top: '#4b3a38' }) +
      windows('y', 4.5, -8.5, 8.5, 1.4, 7.4, 7, 2, '#f1d8a8', 0.45) + windows('x', 9, -4, 4, 1.4, 7.4, 3, 2, '#c7ae84', 0.45) +
      box(-2.2, -1.8, 7.8, 4.4, 3.6, 5.2, brick) + pyramid(-2.6, -2.2, 13, 5.2, 4.4, 3.4, '#2f3238') +
      `<circle cx="${P(0, 1.8, 10.6)[0].toFixed(2)}" cy="${P(0, 1.8, 10.6)[1].toFixed(2)}" r="1.05" fill="${WHITE}"/>` +
      box(-1.4, 4.5, 0.8, 2.8, 1.6, 3.4, '#5a2a26') + flag(7, -3, 7.8, 6);
  },
  marthahouse: c => {
    const wall = mix(c, '#efe8d8', 0.55), roof = shade(c, -0.45);
    return shadow() + slab(mix(c, '#20261c', 0.6)) +
      box(-7, -5, 0.8, 12, 9, 6, wall) + windows('y', 4, -6.4, 4.4, 1.6, 6.6, 4, 2, '#3b4148', 0.5) + windows('x', 5, -4.4, 3.4, 1.6, 6.6, 2, 2, '#3b4148', 0.5) +
      box(-1.4, 4, 0.8, 2.6, 0.5, 3.6, '#5a4632') +
      box(-4.5, -3.5, 9.5, 1.8, 1.8, 3.8, '#6a4a3a') + gable(-7.6, -5.6, 6.8, 13.2, 10.2, 4.4, roof, 'x') +
      box(6.5, 4, 0.8, 1.2, 1.2, 2.2, '#4d6a3e') + cyl(7.1, 4.6, 3, 1.6, 0.1, '#5f7f4c', 'dome');
  },
  ardua: c => {
    const wall = mix(c, '#f0e6d2', 0.45);
    let cols = ''; for (const y of [-4, -1.4, 1.2, 3.8]) cols += box(8.2, y, 2, 1, 1, 6.6, WHITE);
    return shadow() + slab('#4a4640') + box(-9, -7, 0.8, 19, 14, 1.2, STONE) +
      box(-7.5, -5, 2, 14.5, 10, 6.6, wall) + windows('y', 5, -6.8, 6, 2.6, 8, 4, 2, '#3a3226', 0.4) +
      cols + gable(-7.8, -5.4, 8.6, 17.6, 10.8, 3.6, shade(c, -0.35), 'x', WHITE) +
      cyl(-1, 0, 12.2, 2.2, 1.8, shade(c, -0.2), 'dome', '#c9a227');
  },
  barracks: c => {
    const hut = mix(c, '#7a8794', 0.35);
    return shadow() + slab('#3a3f39') + quonset(-9, 4, -4.5, 0.8, 3.6, hut) + quonset(-9, 4, 4, 0.8, 3.6, hut) +
      box(6, -8, 0.8, 3, 3, 3, '#59606b') + flag(7, 6, 0.8, 9, '#b3202a') +
      line([5.5, -2, 0.85], [5.5, 9, 0.85], '#d9d4c6', 0.25) + line([8.5, -2, 0.85], [8.5, 9, 0.85], '#d9d4c6', 0.25);
  },
  eyes: c => {
    const tw = DARK;
    return shadow(-6, -6, 12, 12) + slab('#22262c') + box(-5, -5, 0.8, 10, 10, 20, tw, { top: '#3b4048' }) +
      windows('y', 5, -4.5, 4.5, 2, 17, 4, 7, (i, j) => (i + j) % 4 === 0 ? '#5a6270' : '#14171b', 0.6) +
      windows('x', 5, -4.5, 4.5, 2, 17, 4, 7, (i, j) => (i * 3 + j) % 5 === 0 ? '#5a6270' : '#101215', 0.6) +
      poly([[-5, 5, 18], [5, 5, 18], [5, 5, 19.6], [-5, 5, 19.6]], '#e5484d') + poly([[5, -5, 18], [5, 5, 18], [5, 5, 19.6], [5, -5, 19.6]], '#a3242b') +
      line([1, 1, 20.8], [1, 1, 27], shade(c, 0.2), 0.35) + `<circle cx="${P(1, 1, 27)[0].toFixed(2)}" cy="${P(1, 1, 27)[1].toFixed(2)}" r=".9" fill="#ff5a5f"/>` +
      box(6, 4, 0.8, 3.4, 5, 2.4, '#111316') + box(6.2, 7.2, 3.2, 3, 1.8, 0.9, '#111316');
  },
  detention: c => {
    const wall = mix(c, '#9aa0a8', 0.3);
    let fence = '';
    for (let i = -10; i <= 10; i += 4) { fence += line([i, 9.6, 0.8], [i, 9.6, 4.4], '#9aa0a8', 0.25) + line([9.6, i, 0.8], [9.6, i, 4.4], '#9aa0a8', 0.25); }
    fence += line([-10, 9.6, 4], [9.6, 9.6, 4], '#bfc4cb', 0.18) + line([-10, 9.6, 2.6], [9.6, 9.6, 2.6], '#bfc4cb', 0.18) + line([9.6, -10, 4], [9.6, 9.6, 4], '#bfc4cb', 0.18) + line([9.6, -10, 2.6], [9.6, 9.6, 2.6], '#bfc4cb', 0.18);
    return shadow() + slab('#383c42') + box(-8, -7, 0.8, 12, 12, 6.5, wall) +
      windows('y', 5, -7.5, 3.5, 2, 6.5, 6, 2, '#15171a', 0.25) + windows('x', 4, -6.5, 4.5, 2, 6.5, 6, 2, '#15171a', 0.25) +
      box(5.5, -8, 0.8, 1.6, 1.6, 10, CONC) + box(4.8, -8.7, 10.8, 3, 3, 2.6, '#4a5059') + pyramid(4.5, -9, 13.4, 3.6, 3.6, 1.6, '#2a2e35') + fence;
  },
  colony: c => {
    let s = shadow() + slab(mix(c, '#3a3420', 0.55)) +
      line([-9, -4, 0.85], [-2, 3, 0.85], '#2a2616', 0.3) + line([2, -9, 0.85], [6, -1, 0.85], '#2a2616', 0.3) +
      pyramid(-9, -9, 0.8, 7, 6, 3.4, '#6a5a3a') + pyramid(1, 2, 0.8, 6, 6, 2.6, '#5e5034') +
      box(-3, -8, 0.8, 7, 5, 4, '#5a4a3a') + gable(-3.4, -8.4, 4.8, 7.8, 5.8, 2, '#3e3326', 'x');
    for (const [x, y] of [[-6, 3], [-3.6, 5.4], [-6.6, 6.4], [3.5, -2.5], [6.8, -4.6], [7.4, 6.5]]) s += cyl(x, y, 0.8, 1.15, 2.6, c, 'flat', shade(c, -0.1)) + line([x - 0.9, y + 0.9, 1.6], [x + 0.9, y + 0.9, 1.6], '#2a2414', 0.25);
    return s;
  },
  agricolony: c => {
    let rows = ''; for (let y = -9; y <= 9; y += 2.2) rows += line([-9.5, y, 0.85], [-1, y, 0.85], shade(c, 0.25), 0.55);
    for (let y = 3; y <= 9; y += 2) rows += line([0, y, 0.85], [9.5, y, 0.85], shade(c, 0.1), 0.55);
    return shadow() + slab(mix(c, '#2e3a1e', 0.55)) + rows +
      box(1.5, -8.5, 0.8, 7.5, 7, 5, '#8a3a2a') + gable(1.1, -8.9, 5.8, 8.3, 7.8, 3.4, '#4a2a22', 'y') + box(4, -1.5, 0.8, 2.4, 0.2, 3, '#e8e4dc') +
      cyl(-6.5, -6.5, 0.8, 2.3, 11, '#b8bcc2', 'dome', '#9aa0a8');
  },
  wifeschool: c => {
    const wall = mix(c, '#f4ece8', 0.6), roof = shade(c, -0.5);
    return shadow() + slab('#2c3a2c') + box(-8, -5, 0.8, 15, 10, 6.6, wall) +
      windows('y', 5, -7.4, 6.4, 1.6, 7, 5, 2, '#5a4a52', 0.45) + windows('x', 7, -4.4, 4.4, 1.6, 7, 3, 2, '#5a4a52', 0.45) +
      gable(-8.5, -5.5, 7.4, 16, 11, 3.6, roof, 'x') + box(-1.6, -1.2, 9.6, 3, 3, 2.8, WHITE) + pyramid(-2, -1.6, 12.4, 3.8, 3.8, 2.6, roof) +
      box(-1.6, 5, 0.8, 3.2, 0.4, 3.6, shade(c, -0.2));
  },
  jezebels: c => {
    const wall = mix(c, '#3a1830', 0.55);
    return shadow(-7, -7, 14, 14) + slab('#1e1a20') + box(-6.5, -6.5, 0.8, 13, 13, 13, wall, { top: '#2a2028' }) +
      windows('y', 6.5, -6, 6, 3.5, 13.4, 5, 4, lit, 0.5) + windows('x', 6.5, -6, 6, 3.5, 13.4, 5, 4, (i, j) => lit(i + 2, j), 0.5) +
      poly([[-6.5, 6.5, 2.4], [6.5, 6.5, 2.4], [6.5, 8.6, 1.8], [-6.5, 8.6, 1.8]], shade(c, 0.1)) +
      box(-3, -1, 13.8, 6, 0.6, 2.6, '#ff6bb5', { top: '#ff9fd0' });
  },
  wall: c => {
    const brick = mix(c, '#6a4a3a', 0.25);
    let bodies = '';
    for (const x of [-6.5, -2, 2.5, 7]) {
      bodies += line([x, 1.7, 7.6], [x, 1.7, 5.6], '#d9d4c6', 0.18) + poly([[x - 0.45, 1.75, 2.2], [x + 0.45, 1.75, 2.2], [x + 0.45, 1.75, 5.2], [x - 0.45, 1.75, 5.2]], '#16181c') +
        poly([[x - 0.42, 1.76, 5.1], [x + 0.42, 1.76, 5.1], [x + 0.42, 1.76, 5.9], [x - 0.42, 1.76, 5.9]], '#e8e4dc');
    }
    return shadow(-10, -2, 20, 4) + slab('#3a3634', 0.6) + box(-10, -1.5, 0.6, 20, 3.2, 7, brick) +
      windows('y', 1.7, -10, 10, 0.8, 7.4, 10, 5, shade(brick, -0.18), 0.92) + box(-10.3, -1.8, 7.6, 20.6, 3.8, 0.6, '#4a3e36') + bodies;
  },
  market: c => {
    const wall = mix(c, '#efe4c8', 0.5);
    let awn = ''; for (let i = 0; i < 8; i++) { const x = -8 + i * 2; awn += poly([[x, 4, 5.2], [x + 2, 4, 5.2], [x + 2, 6.4, 3.6], [x, 6.4, 3.6]], i % 2 ? WHITE : shade(c, -0.15)); }
    return shadow() + slab('#2c3036') + line([-9, 8.5, 0.82], [9, 8.5, 0.82], '#e8e4dc', 0.2) +
      box(-8, -6, 0.8, 16, 10, 6, wall, { top: '#5a5650' }) + poly([[-6.5, 4, 1.2], [5.5, 4, 1.2], [5.5, 4, 4.6], [-6.5, 4, 4.6]], '#2a3038') + awn +
      box(-4, -1, 6.8, 8, 0.6, 3, shade(c, -0.1), { top: shade(c, 0.1) }) +
      `<path d="M${P(-1.6, -0.4, 8.3).map(v => v.toFixed(2)).join(',')} q1.3,-1 2.6,0 q-1.3,1 -2.6,0z" fill="#1a1d22"/>`;
  },
  church: c => {
    const wall = mix(c, '#efe8d8', 0.4);
    return shadow() + slab('#33373d') + cyl(-0.5, -0.5, 0.8, 8.2, 5.4, shade(wall, -0.08), 'dome', WHITE) +
      windows('y', 7.7, -3.5, 3.5, 1.6, 5.4, 4, 1, '#3a332a', 0.45) +
      line([-0.5, -0.5, 13.6], [-0.5, -0.5, 19.5], '#c9a227', 0.5) + line([-2.2, -0.5, 17.8], [1.2, -0.5, 17.8], '#c9a227', 0.5);
  },
  // The runway runs past the tile (x -17..17 along y = 0) so planes on the map can land and take off on it.
  airfield: c => {
    let dash = ''; for (let x = -14; x < 14; x += 3.2) dash += poly([[x, -0.22, 0.9], [x + 1.6, -0.22, 0.9], [x + 1.6, 0.22, 0.9], [x, 0.22, 0.9]], '#e8e4dc');
    let lights = ''; for (let x = -16.5; x <= 16.5; x += 3) lights += `<circle cx="${P(x, 2.2, 0.9)[0].toFixed(2)}" cy="${P(x, 2.2, 0.9)[1].toFixed(2)}" r=".28" fill="#ffd98a"/><circle cx="${P(x, -2.2, 0.9)[0].toFixed(2)}" cy="${P(x, -2.2, 0.9)[1].toFixed(2)}" r=".28" fill="#ffd98a"/>`;
    const thr = x0 => { let t = ''; for (let k = -1.5; k <= 1.5; k += 0.75) t += poly([[x0, k - 0.18, 0.9], [x0 + 1.4, k - 0.18, 0.9], [x0 + 1.4, k + 0.18, 0.9], [x0, k + 0.18, 0.9]], '#e8e4dc'); return t; };
    return shadow() + `<polygon points="${pts([[-16, -1.2, 0], [19, -1.2, 0], [19, 4.4, 0], [-16, 4.4, 0]])}" fill="#000" opacity=".3"/>` + slab(mix(c, '#2a3036', 0.7)) +
      box(-17.5, -2.6, 0, 35, 5.2, 0.84, '#2a2e35', { top: '#1c1f24' }) + dash + thr(-16.6) + thr(15.2) + lights +
      quonset(-9, -2.5, 7, 0.8, 3, shade(c, -0.05)) + box(0.5, 4.6, 0.8, 4.5, 3, 1.4, '#59606b') +
      box(6.4, 6.4, 0.8, 1.6, 1.6, 8, '#9aa0a8') + box(5.6, 5.6, 8.8, 3.2, 3.2, 2, '#5ad1ff', { top: '#3a3f47' }) + flag(-6, -8, 0.8, 6, '#b3202a');
  },
  depot: c => {
    let tracks = '';
    for (const y of [3.5, 7.5]) {
      for (let x = -9.5; x <= 9.5; x += 1.4) tracks += line([x, y - 1.2, 0.84], [x, y + 1.2, 0.84], '#4a3a2a', 0.38);
      tracks += line([-10, y - 0.7, 0.9], [10, y - 0.7, 0.9], '#c9ced6', 0.24) + line([-10, y + 0.7, 0.9], [10, y + 0.7, 0.9], '#c9ced6', 0.24);
    }
    return shadow() + slab('#3e3a36') + tracks +
      box(-9, -8.5, 0.8, 13, 7.5, 5, mix(c, '#d9c7a8', 0.25)) + windows('x', 4, -8, -1.6, 1.4, 5, 3, 1, '#2a2620', 0.5) + gable(-9.4, -8.9, 5.8, 13.8, 8.3, 2.8, shade(c, -0.45), 'x') +
      box(-6, 2.6, 0.95, 8, 1.8, 2.6, '#6b2a22', { top: '#4a1e18' }) + box(2.6, 2.6, 0.95, 5, 1.8, 3, DARK) + box(7, -6, 0.8, 2.4, 2.4, 1.6, '#7a6a52');
  },
  checkpoint: c => {
    let blocks = ''; for (const y of [-8, -5.4, 5.5, 8]) blocks += box(-9, y, 0.8, 4, 1.2, 1.4, '#a7adb5');
    return shadow() + slab('#33373d') + poly([[-10, -2.5, 0.84], [10, -2.5, 0.84], [10, 2.5, 0.84], [-10, 2.5, 0.84]], '#22252a') +
      line([-10, 0, 0.86], [10, 0, 0.86], '#e8c26a', 0.22, 'stroke-dasharray="1.4 1"') + blocks +
      box(2, -8, 0.8, 4.2, 4.2, 4.2, mix(c, '#9aa0a8', 0.55), { top: '#3a3f47' }) + windows('y', -3.8, 2.3, 5.9, 2, 4.4, 2, 1, '#5ad1ff', 0.7) + windows('x', 6.2, -7.7, -4.1, 2, 4.4, 2, 1, '#3aa0c8', 0.7) +
      box(3.6, -3.4, 0.8, 0.8, 0.8, 2.6, '#c8323a') + line([4, -3, 3.2], [4, 5.4, 3.2], '#f2e6cc', 0.75) + line([4, -1, 3.2], [4, 1, 3.2], '#c8323a', 0.75) + line([4, 3, 3.2], [4, 4.6, 3.2], '#c8323a', 0.75) +
      line([8, 7, 0.8], [8, 7, 9.5], '#9aa0a8', 0.3) + box(7.3, 6.3, 9.5, 1.6, 1.6, 0.6, '#ffe7a3');
  },
  birthcenter: c => {
    const wall = '#ece8e2';
    return shadow() + slab('#2c3a34') + box(-8, -6, 0.8, 15, 11, 8, wall, { top: '#c9ccd1' }) +
      windows('y', 5, -7.4, 6.4, 1.6, 8.4, 6, 3, '#4f6f80', 0.5) + windows('x', 7, -5.4, 4.4, 1.6, 8.4, 4, 3, '#3f5a68', 0.5) +
      poly([[-2.8, 7.2, 3.4], [2.6, 7.2, 3.4], [2.6, 5, 3.4], [-2.8, 5, 3.4]], shade(c, -0.1)) + box(-2.6, 6.8, 0.8, 0.5, 0.5, 2.6, '#c9ccd1') + box(2, 6.8, 0.8, 0.5, 0.5, 2.6, '#c9ccd1') +
      box(-1.4, -1.4, 8.8, 2.8, 2.8, 1.2, '#c9ccd1') +
      poly([[1.6, 5.05, 6.2], [2.4, 5.05, 6.2], [2.4, 5.05, 8.3], [1.6, 5.05, 8.3]], shade(c, -0.25)) + poly([[0.9, 5.05, 6.9], [3.1, 5.05, 6.9], [3.1, 5.05, 7.6], [0.9, 5.05, 7.6]], shade(c, -0.25));
  },
  newbethlehem: c => {
    const water = mix(c, '#163448', 0.6);
    let houses = '';
    for (const [x, y] of [[-6, -5], [-6, 1], [0, 2.5], [3, -5.5]]) houses += box(x, y, 1.6, 3.6, 3, 2.6, WHITE) + gable(x - 0.3, y - 0.3, 4.2, 4.2, 3.6, 1.6, '#4a6a80', 'x');
    return shadow() + slab(water, 0.5) + box(-8, -8, 0.5, 15, 15, 1.1, '#5f7f4c', { top: '#6f9256' }) + houses +
      box(3.6, 2, 1.6, 3.4, 4, 3.4, WHITE) + gable(3.3, 1.7, 5, 4, 4.6, 1.8, '#4a6a80', 'y') + box(4.4, 5, 6.2, 1.6, 1.4, 2.4, WHITE) + pyramid(4.2, 4.8, 8.6, 2, 1.8, 3, '#4a6a80') +
      line([0, 9, 0.6], [0, 9, 4], '#c9ced6', 0.25) + line([-8, 9.5, 0.55], [8, 9.5, 0.55], shade(water, 0.35), 0.3);
  },
};

// Scaffolding with a crane, laid over a ghosted model while it is under construction.
function scaffold() {
  let s = '', c = '#e0b84a';
  const h = 9;
  for (const [x, y] of [[-7, -6], [6, -6], [6, 6], [-7, 6]]) s += line([x, y, 0.8], [x, y, h], c, 0.35);
  for (const z of [3.5, 6.2, h]) s += line([-7, 6, z], [6, 6, z], c, 0.3) + line([6, -6, z], [6, 6, z], c, 0.3) + line([-7, -6, z], [-7, 6, z], c, 0.22) + line([-7, -6, z], [6, -6, z], c, 0.22);
  s += line([-7, 6, 0.8], [6, 6, h], c, 0.2) + line([6, -6, 0.8], [6, 6, h], c, 0.2);
  s += line([-8, -8, 0.8], [-8, -8, 22], '#f2c94c', 0.7) + line([-8, -8, 22], [8, -8, 22], '#f2c94c', 0.55) + line([-8, -8, 22], [-12, -8, 22], '#f2c94c', 0.55) +
    line([5, -8, 22], [5, -8, 15], '#d9d4c6', 0.2) + box(4.4, -8.6, 13.6, 1.2, 1.2, 1.2, '#5a6270') + box(-12.5, -8.6, 20.6, 2, 1.4, 1.4, '#5a6270');
  return s;
}

export function modelSymbols() {
  let s = '';
  for (const [k, f] of Object.entries(MODELS)) s += `<symbol id="m-${k}" viewBox="${MODEL_VIEWBOX}">${f(BUILDINGS[k].color)}</symbol>`;
  s += `<symbol id="m-scaffold" viewBox="${MODEL_VIEWBOX}">${scaffold()}</symbol>`;
  return s;
}
export function injectModels() {
  if (document.getElementById('gilead-models')) return;
  const d = document.createElement('div');
  d.innerHTML = `<svg id="gilead-models" xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${modelSymbols()}</svg>`;
  document.body.prepend(d.firstChild);
}
// A model for the UI (cards, build lists, sheets). building=true overlays scaffolding.
// <use> of a symbol must be placed explicitly: its default origin is (0,0), the centre of our viewBox.
export const useModel = (id, extra = '') => `<use href="#m-${id}" x="-26" y="-40" width="52" height="52" ${extra}/>`;
export const model = (type, cls = '', building = false) => MODELS[type]
  ? `<svg class="m3d ${cls}" viewBox="${MODEL_VIEWBOX}" aria-hidden="true">${building ? useModel(type, 'opacity=".38"') + useModel('scaffold') : useModel(type)}</svg>`
  : '';
export const hasModel = type => !!MODELS[type];
