// Reusable data-viz pieces: seat charts, area charts, donuts, gauges, meters, effect chips.
import { fmtNum } from '../engine/core.js';
import { icon } from './icons.js';

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let uidN = 0;
const uid = p => `${p}${++uidN % 100000}`;

// ---------------- Seat chart (hemicycle) ----------------
// fill: array of {color, label?, stroke?} in seat order (left → right).
export function hemicycle(seats, fill, opts = {}) {
  const W = opts.w || 300, H = W * 0.55;
  const rows = opts.rows || Math.max(1, Math.min(8, Math.round(Math.sqrt(seats / 3))));
  const frac = rows <= 2 ? 0.58 : 0.42;
  let R = W / 2 - 4, r0 = R * frac;
  const rad = (R0, Rr) => Array.from({ length: rows }, (_, i) => R0 + (Rr - R0) * (rows === 1 ? 1 : i / (rows - 1)));
  let radii = rad(r0, R);
  const tot = radii.reduce((a, b) => a + b, 0);
  const per = radii.map(r => Math.max(1, Math.round(seats * r / tot)));
  let diff = seats - per.reduce((a, b) => a + b, 0);
  for (let i = rows - 1, guard = 0; diff !== 0 && guard < 200; i = (i - 1 + rows) % rows, guard++) { if (per[i] + Math.sign(diff) >= 1) { per[i] += Math.sign(diff); diff -= Math.sign(diff); } }
  const radial = rows > 1 ? (R - r0) / (rows - 1) : R * 0.25;
  const arc = Math.min(...radii.map((r, i) => Math.PI * r / Math.max(1, per[i] - 1 || 1)));
  const seatR = Math.min(opts.maxR || 14, radial * 0.44, arc * 0.44);
  R = W / 2 - seatR - 3; r0 = R * frac; radii = rad(r0, R);
  const cx = W / 2, cy = H - seatR - 3;
  const pts = [];
  radii.forEach((r, i) => { const n = per[i]; for (let k = 0; k < n; k++) { const a = Math.PI - (n === 1 ? Math.PI / 2 : Math.PI * k / (n - 1)); pts.push({ a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a), r }); } });
  pts.sort((p, q) => q.a - p.a || p.r - q.r);
  let s = `<svg class="hemi" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  pts.forEach((p, i) => {
    const f = fill[i];
    if (f) {
      s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${seatR.toFixed(1)}" fill="${f.color}" ${f.stroke ? `stroke="${f.stroke}" stroke-width="1.8"` : ''}/>`;
      if (f.label && seatR > 7) s += `<text x="${p.x.toFixed(1)}" y="${(p.y + seatR * 0.3).toFixed(1)}" font-size="${(seatR * 0.72).toFixed(1)}" text-anchor="middle" fill="#fff" font-family="JetBrains Mono, monospace" font-weight="600">${esc(f.label)}</text>`;
    } else s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(seatR * 0.82).toFixed(1)}" fill="#ffffff08" stroke="#ffffff26" stroke-width="1"/>`;
  });
  const fs = Math.min(W / 13, r0 * 0.3);
  if (opts.center) s += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="${fs.toFixed(1)}" fill="#eceef1" font-family="JetBrains Mono, monospace" font-weight="600">${esc(opts.center)}</text>`;
  if (opts.sub) s += `<text x="${cx}" y="${(cy - 6 - fs).toFixed(1)}" text-anchor="middle" font-size="${Math.max(8, fs * 0.36).toFixed(1)}" fill="#7d838d" font-family="Inter, sans-serif" font-weight="600" letter-spacing="1.2">${esc(opts.sub)}</text>`;
  return s + '</svg>';
}

// ---------------- Area chart with grid, end dot and min/max labels ----------------
export function areaChart(values, opts = {}) {
  const W = opts.w || 300, H = opts.h || 90, color = opts.color || '#e5484d', pad = 4;
  const id = uid('ag');
  if (!values || values.length < 2) return `<div class="chart-empty">Collecting data…</div>`;
  let mn = opts.min ?? Math.min(...values), mx = opts.max ?? Math.max(...values);
  if (mx - mn < 1e-9) { mx += 1; mn -= 1; }
  const X = i => pad + i / (values.length - 1) * (W - pad * 2), Y = v => H - pad - (v - mn) / (mx - mn) * (H - pad * 2);
  let d = `M${X(0).toFixed(1)} ${Y(values[0]).toFixed(1)}`;
  for (let i = 1; i < values.length; i++) {
    const x0 = X(i - 1), x1 = X(i), y0 = Y(values[i - 1]), y1 = Y(values[i]), cx = (x0 + x1) / 2;
    d += `C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  const lx = X(values.length - 1), ly = Y(values[values.length - 1]);
  const grid = [0.25, 0.5, 0.75].map(f => `<path d="M0 ${(H * f).toFixed(1)}H${W}" stroke="#ffffff0d"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".32"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${d}L${lx.toFixed(1)} ${H}L${X(0).toFixed(1)} ${H}Z" fill="url(#${id})"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3" fill="${color}" vector-effect="non-scaling-stroke"/>
  </svg>`;
}
export const sparkline = (values, color, h = 40) => areaChart(values, { color, h, w: 200 });

// ---------------- Donut ----------------
// segs: [{v, color}]; center: {value, label}
export function donut(segs, opts = {}) {
  const S = opts.size || 160, r = S / 2 - 10, sw = opts.stroke || 16, C = 2 * Math.PI * r;
  const tot = segs.reduce((a, s) => a + Math.max(0, s.v), 0) || 1;
  let off = 0, arcs = '';
  for (const s of segs) {
    const f = Math.max(0, s.v) / tot;
    if (f <= 0) continue;
    const len = Math.max(0, f * C - (f * C > 3 ? 1.5 : 0));
    arcs += `<circle cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${S / 2} ${S / 2})"/>`;
    off += f * C;
  }
  return `<svg class="donut" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
    <circle cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke="#ffffff0a" stroke-width="${sw}"/>${arcs}
    ${opts.value != null ? `<text x="${S / 2}" y="${S / 2 + 2}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600" font-size="${S / 7}" fill="#eceef1">${esc(opts.value)}</text>` : ''}
    ${opts.label ? `<text x="${S / 2}" y="${S / 2 + S / 8}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="${S / 16}" fill="#7d838d" letter-spacing="1">${esc(opts.label)}</text>` : ''}
  </svg>`;
}

// ---------------- Gauge (270° arc) ----------------
export function gauge(v, opts = {}) {
  const S = opts.size || 96, r = S / 2 - 8, min = opts.min ?? 0, max = opts.max ?? 100, color = opts.color || '#e5484d';
  const f = Math.max(0, Math.min(1, (v - min) / (max - min)));
  const C = 2 * Math.PI * r, span = C * 0.75;
  const id = uid('gg');
  return `<svg class="gauge" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
    <defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="${color}"/></linearGradient></defs>
    <circle cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke="#ffffff0f" stroke-width="7" stroke-linecap="round" stroke-dasharray="${span.toFixed(1)} ${C.toFixed(1)}" transform="rotate(135 ${S / 2} ${S / 2})"/>
    <circle cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(span * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(135 ${S / 2} ${S / 2})"/>
    <text x="${S / 2}" y="${S / 2 + S / 14}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600" font-size="${S / 4.4}" fill="#eceef1">${esc(opts.text ?? Math.round(v))}</text>
  </svg>`;
}

export const meter = (v, max = 100, color) => `<div class="meter"><i style="width:${Math.max(0, Math.min(100, v / max * 100)).toFixed(1)}%;${color ? `--c:${color}` : ''}"></i></div>`;

// ---------------- Effect chips ----------------
export const RES_META = {
  funds: ['coins', 'Funds'], influence: ['megaphone', 'Influence'], members: ['user-plus', 'Members'], suspicion: ['scan', 'Suspicion'],
  power: ['crown', 'Power'], treasury: ['coins', 'Treasury'], supplies: ['wheat', 'Supplies'], stability: ['pillar', 'Stability'],
  piety: ['cross', 'Piety'], fear: ['eye', 'Fear'], standing: ['globe', 'Standing'], resistance: ['radio', 'Mayday'],
  handmaids: ['users', 'Handmaids'], guardians: ['shield', 'Guardians'], marthas: ['home', 'Marthas'], unwomen: ['radiation', 'Unwomen'],
  aunts: ['book-open', 'Aunts'], eyes: ['eye', 'Eyes'], commanders: ['medal', 'Commanders'], members2: ['users', 'Members'],
};
const BAD_UP = new Set(['suspicion', 'resistance']);
export function fxChips(fx = {}, cost = {}) {
  let s = '';
  const one = (k, v, isCost) => {
    const [ic, label] = RES_META[k] || ['info', k];
    const good = isCost ? false : BAD_UP.has(k) ? v < 0 : v > 0;
    const unit = k === 'funds' || k === 'treasury' ? 'M' : '';
    return `<span class="fx ${good ? 'p' : 'n'}" title="${label}">${icon(ic)}<b>${isCost || v < 0 ? '−' : '+'}${fmtNum(Math.abs(v))}${unit}</b><i>${label}</i></span>`;
  };
  for (const [k, v] of Object.entries(cost)) s += one(k, v, true);
  for (const [k, v] of Object.entries(fx)) if (v) s += one(k, v, false);
  return s;
}
