// Small reusable UI pieces: hemicycle (parliament) charts, sparklines, meters, effect chips.
import { fmtNum } from '../engine/core.js';

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Parliament-style semicircle. seats: total; fill: array of {color, label?, id?} in seat order (left→right).
export function hemicycle(seats, fill, opts = {}) {
  const W = opts.w || 300, H = W * 0.56;
  const cx = W / 2, cy = H - 8, R = W / 2 - 10;
  const rows = opts.rows || Math.max(1, Math.min(8, Math.round(Math.sqrt(seats / 3))));
  const r0 = R * (rows > 2 ? 0.38 : 0.5);
  const radii = Array.from({ length: rows }, (_, i) => r0 + (R - r0) * (rows === 1 ? 1 : i / (rows - 1)));
  const tot = radii.reduce((a, b) => a + b, 0);
  const per = radii.map(r => Math.max(1, Math.round(seats * r / tot)));
  let diff = seats - per.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; diff !== 0; i = (i - 1 + rows) % rows) { per[i] += Math.sign(diff); diff -= Math.sign(diff); }
  const pts = [];
  radii.forEach((r, i) => { const n = per[i]; for (let k = 0; k < n; k++) { const a = Math.PI - (n === 1 ? Math.PI / 2 : Math.PI * k / (n - 1)); pts.push({ a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a), r }); } });
  pts.sort((p, q) => q.a - p.a || p.r - q.r);
  const seatR = Math.min(opts.maxR || 14, (R - r0) / Math.max(1, rows) * 0.42 + 1.5, Math.PI * r0 / Math.max(1, per[0]) * 0.42);
  let s = `<svg class="hemi" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<path d="M${cx - R - 6} ${cy} A${R + 6} ${R + 6} 0 0 1 ${cx + R + 6} ${cy}" fill="none" stroke="#ffffff10" stroke-width="1"/>`;
  pts.forEach((p, i) => {
    const f = fill[i];
    if (f) {
      s += `<g ${f.id ? `data-seat="${f.id}"` : ''}><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${seatR.toFixed(1)}" fill="${f.color}" stroke="${f.stroke || '#000'}" stroke-width="${f.stroke ? 1.4 : .6}"/>`;
      if (f.label && seatR > 7) s += `<text x="${p.x.toFixed(1)}" y="${(p.y + seatR * 0.35).toFixed(1)}" font-size="${(seatR * 0.85).toFixed(1)}" text-anchor="middle" fill="#fff" font-family="Inter" font-weight="700">${esc(f.label)}</text>`;
      s += `</g>`;
    } else s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(seatR * 0.85).toFixed(1)}" fill="none" stroke="#ffffff38" stroke-width="1" stroke-dasharray="2 1.5"/>`;
  });
  if (opts.center) s += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="${W / 11}" fill="#eadfca" font-family="Fell, serif">${esc(opts.center)}</text>`;
  if (opts.sub) s += `<text x="${cx}" y="${cy - 4 - W / 11}" text-anchor="middle" font-size="${W / 30}" fill="#948a78" font-family="Inter" letter-spacing="1">${esc(opts.sub)}</text>`;
  return s + '</svg>';
}

export function sparkline(values, color = '#c9a227', h = 42) {
  if (!values.length) return `<svg class="spark" viewBox="0 0 100 ${h}"></svg>`;
  const mn = Math.min(...values), mx = Math.max(...values), rg = mx - mn || 1;
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1) * 100).toFixed(1)},${(h - 3 - (v - mn) / rg * (h - 6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 100 ${h}" preserveAspectRatio="none"><polyline points="0,${h} ${pts} 100,${h}" fill="${color}" fill-opacity=".12" stroke="none"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

export const meter = (v, max = 100, color) => `<div class="meter"><i style="width:${Math.max(0, Math.min(100, v / max * 100)).toFixed(1)}%;${color ? `--c:${color}` : ''}"></i></div>`;

const RES_LABEL = { funds: '$M', influence: 'Influence', members: 'Members', suspicion: 'Suspicion', power: 'Power', treasury: '₲M', supplies: 'Supplies',
  stability: 'Stability', piety: 'Piety', fear: 'Fear', standing: 'Standing', resistance: 'Mayday',
  handmaids: 'Handmaids', guardians: 'Guardians', marthas: 'Marthas', unwomen: 'Unwomen', aunts: 'Aunts', eyes: 'Eyes', commanders: 'Commanders' };
const BAD_UP = new Set(['suspicion', 'resistance']);
export function fxChips(fx = {}, cost = {}) {
  let s = '';
  for (const [k, v] of Object.entries(cost)) s += `<span class="fx n">−${fmtNum(v)} ${RES_LABEL[k] || k}</span>`;
  for (const [k, v] of Object.entries(fx)) {
    if (!v) continue;
    const good = BAD_UP.has(k) ? v < 0 : v > 0;
    s += `<span class="fx ${good ? 'p' : 'n'}">${v > 0 ? '+' : '−'}${fmtNum(Math.abs(v))} ${RES_LABEL[k] || k}</span>`;
  }
  return s;
}
