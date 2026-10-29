// Precomputes map placement data from the state outlines in js/data/geo.js:
//   CITY_SITES  building sites around each city, wholly inside the city's state (no sea, no state lines)
//   ROADS       a road network between cities (gentle curves that never cross water)
//   CROSSINGS   every point where a road crosses a state line: the places a Checkpoint can be built
// Run: node tools/build-sites.mjs   (writes js/data/sites.js)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STATE_SHAPES, CITY_POS } from '../js/data/geo.js';
import { STATES, CITIES, FIPS_TO_ABBR } from '../js/data/states.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- point in state ----------
const SHAPES = STATE_SHAPES.map(s => {
  const rings = s.d.split('M').filter(Boolean).map(r => [...r.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => [+m[1], +m[2]])).filter(r => r.length > 2);
  return { ab: FIPS_TO_ABBR[s.id], rings, b: s.b };
});
function inRing(x, y, r) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function stateAt(x, y) {
  for (const s of SHAPES) {
    const [x0, y0, x1, y1] = s.b;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    let n = 0; for (const r of s.rings) if (inRing(x, y, r)) n++;
    if (n % 2) return s.ab;
  }
  return null;
}

// deterministic pseudo-random
const hash = (s, k = 0) => { let h = 2166136261 ^ k; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };

// ---------- building sites ----------
// A model drawn at size 16 has a ground tile ~10.8 wide and ~5.4 tall on screen; every corner must stay in the state.
const FOOT = [[0, 0], [-6, 0], [6, 0], [0, -3.2], [0, 3.2], [-3.5, -1.8], [3.5, 1.8], [3.5, -1.8], [-3.5, 1.8]];
const CAPITAL = { dc: ['DC', 'MD', 'VA'] }; // Washington is too small to hold anything: its institutions fill the Capital District
const cityIds = Object.keys(CITIES).filter(c => !STATES[CITIES[c].st].exile);
const SITES = {};
for (const id of cityIds) {
  const c = CITY_POS[id], st = CITIES[id].st, allowed = CAPITAL[id] || [st];
  const want = 2 + CITIES[id].rank * 2 + 2;
  const labelW = c.name.length * 3.5 + 6;
  const cand = [];
  for (let r = 6; r <= 30; r += 1.8) for (let k = 0; k < 30; k++) {
    const a = (k / 28) * Math.PI * 2 + hash(id, r * 10) * 0.9;
    const x = c.x + Math.cos(a) * r * 1.25, y = c.y + Math.sin(a) * r * 0.85;
    cand.push({ x, y, score: r + hash(id + k, r) * 5 });
  }
  cand.sort((p, q) => p.score - q.score);
  const out = [];
  // Tight states (Rhode Island, Connecticut...) get smaller models: the site's third value is its scale.
  for (const margin of [1, 0.8, 0.65, 0.5, 0.4, 0.32, 0.26]) {
    for (const p of cand) {
      if (out.length >= want) break;
      if (!FOOT.every(([dx, dy]) => allowed.includes(stateAt(p.x + dx * margin, p.y + dy * margin)))) continue;
      // keep clear of the city's own dot and label, and of every other city
      if (p.x > c.x - 4 * margin && p.x < c.x + labelW && p.y > c.y - 12 * margin && p.y < c.y + 4 * margin) continue;
      if (cityIds.some(o => o !== id && Math.hypot(CITY_POS[o].x - p.x, CITY_POS[o].y - p.y) < 8 * Math.max(0.6, margin))) continue;
      // spread: no overlap with sites already chosen (elliptical spacing, isometric tiles are twice as wide as tall)
      if (out.some(q => Math.hypot((q[0] - p.x) / (10.5 * (q[2] + margin) / 2), (q[1] - p.y) / (6 * (q[2] + margin) / 2)) < 1)) continue;
      out.push([+p.x.toFixed(1), +p.y.toFixed(1), margin]);
    }
    if (out.length >= want) break;
  }
  SITES[id] = out;
}

// ---------- roads ----------
const bez = (a, q, b, t) => [(1 - t) ** 2 * a.x + 2 * (1 - t) * t * q[0] + t * t * b.x, (1 - t) ** 2 * a.y + 2 * (1 - t) * t * q[1] + t * t * b.y];
function roadCurve(a, b, bend) {
  const A = CITY_POS[a], B = CITY_POS[b];
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, len = Math.hypot(B.x - A.x, B.y - A.y);
  const nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
  return [+(mx + nx * len * bend).toFixed(1), +(my + ny * len * bend).toFixed(1)];
}
function landOnly(a, b, q) {
  const A = CITY_POS[a], B = CITY_POS[b];
  for (let i = 1; i < 60; i++) { const [x, y] = bez(A, q, B, i / 60); if (!stateAt(x, y)) return false; }
  return true;
}
const dist = (a, b) => Math.hypot(CITY_POS[a].x - CITY_POS[b].x, CITY_POS[a].y - CITY_POS[b].y);
const pairs = [];
for (let i = 0; i < cityIds.length; i++) for (let j = i + 1; j < cityIds.length; j++) pairs.push([cityIds[i], cityIds[j], dist(cityIds[i], cityIds[j])]);
pairs.sort((p, q) => p[2] - q[2]);
const edges = new Map();
function tryEdge(a, b) {
  const key = [a, b].sort().join('|');
  if (edges.has(key)) return true;
  const s = hash(key) < 0.5 ? 1 : -1;
  for (const bend of [0.1 * s, -0.1 * s, 0.04 * s, 0, 0.18 * s, -0.18 * s]) {
    const q = roadCurve(a, b, bend);
    if (landOnly(a, b, q)) { edges.set(key, { a, b, q }); return true; }
  }
  return false;
}
// a spanning network first (Kruskal), then each city's nearest neighbours
const parent = Object.fromEntries(cityIds.map(c => [c, c]));
const find = c => parent[c] === c ? c : (parent[c] = find(parent[c]));
for (const [a, b, d] of pairs) if (d < 260 && find(a) !== find(b) && tryEdge(a, b)) parent[find(a)] = find(b);
for (const a of cityIds) {
  let n = 0;
  for (const [p, q, d] of pairs) {
    if (n >= 3 || d > 150) break;
    if (p !== a && q !== a) continue;
    if (tryEdge(p, q)) n++;
  }
}
// drop near-duplicate roads (a third city lies almost on the way)
const ROADS = [...edges.values()].filter(e => !cityIds.some(o => o !== e.a && o !== e.b && dist(e.a, o) + dist(o, e.b) < dist(e.a, e.b) * 1.06));

// ---------- crossings ----------
const CROSSINGS = [];
ROADS.forEach((r, ri) => {
  const A = CITY_POS[r.a], B = CITY_POS[r.b], N = 400;
  let prev = stateAt(...bez(A, r.q, B, 0));
  for (let i = 1; i <= N; i++) {
    const t = i / N, cur = stateAt(...bez(A, r.q, B, t));
    if (cur && prev && cur !== prev) {
      let lo = (i - 1) / N, hi = t;
      for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (stateAt(...bez(A, r.q, B, m)) === prev) lo = m; else hi = m; }
      const tm = (lo + hi) / 2, [x, y] = bez(A, r.q, B, tm);
      const [x2, y2] = bez(A, r.q, B, Math.min(1, tm + 0.01));
      const pair = [prev, cur].sort().join('-');
      if (!CROSSINGS.some(c => c.pair === pair && Math.hypot(c.x - x, c.y - y) < 9) && !STATES[prev].exile && !STATES[cur].exile)
        CROSSINGS.push({ pair, road: ri, t: +tm.toFixed(4), a: prev, b: cur, x: +x.toFixed(1), y: +y.toFixed(1), ang: +Math.atan2(y2 - y, x2 - x).toFixed(3) });
    }
    if (cur) prev = cur;
  }
});
CROSSINGS.forEach((c, i) => { c.id = 'x' + i; delete c.pair; });

const js = `// AUTO-GENERATED by tools/build-sites.mjs from the state outlines — do not edit by hand.
// CITY_SITES: building sites per city, inside the city's state (Washington's spill into the Capital District).
// ROADS: {a, b, q}: a quadratic curve from city a to city b with control point q (never over water).
// CROSSINGS: where a road crosses a state line (Checkpoint sites): road index, curve parameter t, states a -> b.
export const CITY_SITES = ${JSON.stringify(SITES)};
export const ROADS = ${JSON.stringify(ROADS)};
export const CROSSINGS = ${JSON.stringify(CROSSINGS)};
`;
fs.writeFileSync(path.join(ROOT, 'js/data/sites.js'), js);
const short = Object.entries(SITES).filter(([id, s]) => s.length < 2 + CITIES[id].rank * 2).map(([id, s]) => `${id} ${s.length}/${2 + CITIES[id].rank * 2}`);
console.log(`sites: ${Object.values(SITES).reduce((a, s) => a + s.length, 0)} for ${cityIds.length} cities${short.length ? ' · short: ' + short.join(', ') : ''}`);
console.log(`roads: ${ROADS.length} · crossings: ${CROSSINGS.length} · ${(js.length / 1024).toFixed(1)} KB`);
