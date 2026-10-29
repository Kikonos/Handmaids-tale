// Precomputes map placement data from the state outlines in js/data/geo.js:
//   RAIL_LINES  the railway network (RAILS in states.js) as winding polylines over land
//   ROADS       a road network between cities, winding polylines over land
//   CROSSINGS   every point where a road crosses a state line: the places a Checkpoint can be built
//   DEPOT_SITES where each city's Rail Depot stands on one of its lines
//   CITY_SITES  building sites around each city, wholly inside the city's state and clear of every road and rail
// Routes are found with A* on a land grid: each route gets its own noise field (so it winds), cells used by
// earlier routes are expensive (so roads and tracks cross at an angle instead of running alongside), and the
// result is simplified into straight runs with sharp bends.
// Run: node tools/build-sites.mjs   (writes js/data/sites.js)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STATE_SHAPES, CITY_POS } from '../js/data/geo.js';
import { STATES, CITIES, FIPS_TO_ABBR, RAILS } from '../js/data/states.js';

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

const rng = seed => { let t = Math.floor(hash(seed) * 4294967295) >>> 0; return () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
const cityIds = Object.keys(CITIES).filter(c => !STATES[CITIES[c].st].exile);
const P = id => CITY_POS[id];

// ---------- land grid ----------
const CELL = 2.4, X0 = -10, Y0 = -10, GW = Math.ceil(1000 / CELL), GH = Math.ceil(640 / CELL);
const idx = (i, j) => j * GW + i;
const cx = i => X0 + (i + 0.5) * CELL, cy = j => Y0 + (j + 0.5) * CELL;
const LAND = new Uint8Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const st = stateAt(cx(i), cy(j)); LAND[idx(i, j)] = st && !STATES[st].exile ? 1 : 0; }
const USED = new Float32Array(GW * GH); // extra cost: cells near routes already laid
const cellOf = (x, y) => [Math.floor((x - X0) / CELL), Math.floor((y - Y0) / CELL)];
const NEAR_CITY = new Float32Array(GW * GH); // don't run routes through other cities
for (const id of cityIds) { const [ci, cj] = cellOf(P(id).x, P(id).y); for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const k = idx(ci + di, cj + dj); if (k >= 0 && k < NEAR_CITY.length) NEAR_CITY[k] = id.length; } }

// smooth value noise per route (scale ~26 units) so each route meanders its own way
function noiseFn(seed) {
  const r = rng(seed), S = 15, cols = Math.ceil(1000 / S) + 2, rows = Math.ceil(640 / S) + 2, v = Float32Array.from({ length: cols * rows }, r);
  return (x, y) => { const fx = (x - X0) / S, fy = (y - Y0) / S, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j;
    const a = v[j * cols + i], b = v[j * cols + i + 1], c = v[(j + 1) * cols + i], d = v[(j + 1) * cols + i + 1];
    return (a * (1 - u) + b * u) * (1 - w) + (c * (1 - u) + d * u) * w; };
}
// 16 directions (knight moves too) so routes are not stuck at multiples of 45 degrees
const MOVES = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
// A* from city a to city b over land
function route(a, b, seed, wiggle, usedMul = 1) {
  const A = P(a), B = P(b), [si, sj] = cellOf(A.x, A.y), [ti, tj] = cellOf(B.x, B.y);
  const noise = noiseFn(seed), N = GW * GH;
  const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = []; const push = (k, f) => { heap.push([f, k]); let n = heap.length - 1; while (n) { const p = (n - 1) >> 1; if (heap[p][0] <= heap[n][0]) break; [heap[p], heap[n]] = [heap[n], heap[p]]; n = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === n) break; [heap[m], heap[n]] = [heap[n], heap[m]]; n = m; } } return top; };
  const s = idx(si, sj), t = idx(ti, tj);
  g[s] = 0; push(s, 0);
  const near = (i, j, ci, cj) => Math.abs(i - ci) <= 3 && Math.abs(j - cj) <= 3;
  while (heap.length) {
    const [, k] = pop(); if (closed[k]) continue; closed[k] = 1;
    if (k === t) break;
    const i = k % GW, j = (k - i) / GW;
    for (const [di, dj] of MOVES) {
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
      const nk = idx(ni, nj); if (closed[nk]) continue;
      const end = near(ni, nj, si, sj) || near(ni, nj, ti, tj);
      if ((!LAND[nk] || !LAND[idx(i + Math.trunc(di / 2), j + Math.trunc(dj / 2))]) && !end) continue;
      const nz = noise(cx(ni), cy(nj));
      const step = Math.hypot(di, dj) * (1 + nz * nz * wiggle + (end ? 0 : USED[nk] * usedMul) + (NEAR_CITY[nk] && !end ? 6 : 0));
      const ng = g[k] + step;
      if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(nk, ng + Math.hypot(ni - ti, nj - tj) * 0.98); }
    }
  }
  if (from[t] < 0) return null;
  const cells = []; for (let k = t; k >= 0 && k !== s; k = from[k]) cells.push(k); cells.push(s); cells.reverse();
  const pts = cells.map(k => { const i = k % GW; return [cx(i), cy((k - i) / GW)]; });
  pts[0] = [A.x, A.y]; pts[pts.length - 1] = [B.x, B.y];
  // straight runs with sharp bends, each bend nudged off the grid
  const r = rng(seed + 'j');
  return simplify(pts, 1.5).map((p, i, a) => {
    if (!i || i === a.length - 1) return [+p[0].toFixed(1), +p[1].toFixed(1)];
    for (let k = 0; k < 6; k++) { const x = p[0] + (r() - 0.5) * 3, y = p[1] + (r() - 0.5) * 3; if (stateAt(x, y)) return [+x.toFixed(1), +y.toFixed(1)]; }
    return [+p[0].toFixed(1), +p[1].toFixed(1)];
  });
}
// Ramer–Douglas–Peucker: long straight runs, sharp bends
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let mi = 0, md = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((b[0] - a[0]) * (a[1] - pts[i][1]) - (a[0] - pts[i][0]) * (b[1] - a[1])) / L; if (d > md) { md = d; mi = i; } }
  return md > eps ? [...simplify(pts.slice(0, mi + 1), eps).slice(0, -1), ...simplify(pts.slice(mi), eps)] : [a, b];
}
const plen = pts => pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
// mark the cells around a laid route as expensive for later routes (cities at either end stay free)
function occupy(pts, cost) {
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (CELL / 2));
    for (let k = 0; k <= n; k++) {
      const x = x1 + (x2 - x1) * k / n, y = y1 + (y2 - y1) * k / n, [ci, cj] = cellOf(x, y);
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const q = idx(ci + di, cj + dj), f = Math.max(Math.abs(di), Math.abs(dj)); if (q >= 0 && q < USED.length) USED[q] = Math.max(USED[q], cost * (f === 0 ? 1 : f === 1 ? 0.75 : 0.35)); }
    }
  }
}

const segDist = (x, y, s) => { const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / L2)); return Math.hypot(x - s.x1 - dx * t, y - s.y1 - dy * t); };
// ---------- railways ----------
const dist = (a, b) => Math.hypot(P(a).x - P(b).x, P(a).y - P(b).y);
const RAIL_LINES = RAILS.map(([a, b]) => {
  const pts = route(a, b, 'rail' + a + b, 8) || [[P(a).x, P(a).y], [P(b).x, P(b).y]];
  occupy(pts, 14);
  return { a, b, pts };
});

// ---------- roads: a spanning network, then each city's nearest neighbours ----------
const pairs = [];
for (let i = 0; i < cityIds.length; i++) for (let j = i + 1; j < cityIds.length; j++) pairs.push([cityIds[i], cityIds[j], dist(cityIds[i], cityIds[j])]);
pairs.sort((p, q) => p[2] - q[2]);
const parent = Object.fromEntries(cityIds.map(c => [c, c]));
const find = c => parent[c] === c ? c : (parent[c] = find(parent[c]));
const want = [];
for (const [a, b, d] of pairs) if (d < 260 && find(a) !== find(b)) { parent[find(a)] = find(b); want.push([a, b, true]); }
const deg = {};
for (const [a, b] of want) { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; }
for (const a of cityIds) for (const [p, q, d] of pairs) {
  if ((deg[a] || 0) >= 3 || d > 150) break;
  if (p !== a && q !== a) continue;
  if (want.some(([x, y]) => (x === p && y === q) || (x === q && y === p))) continue;
  if (cityIds.some(o => o !== p && o !== q && dist(p, o) + dist(o, q) < d * 1.08)) continue; // a third city lies on the way
  want.push([p, q, false]); deg[p] = (deg[p] || 0) + 1; deg[q] = (deg[q] || 0) + 1;
}
// Does a new route run alongside one already laid (closer than 2.4, within 20 degrees)? Crossings and the last
// few units into a shared city don't count.
const laid = RAIL_LINES.map(r => ({ ...r, kind: 'rail' }));
function alongside(pts, a, b) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) {
    const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
    for (let k = 0.5; k < L; k += 1.5) {
      const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k / L, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k / L;
      if ([a, b].some(c => Math.hypot(P(c).x - x, P(c).y - y) < 7)) continue;
      for (const o of laid) for (let j = 1; j < o.pts.length; j++) {
        const sg = { x1: o.pts[j - 1][0], y1: o.pts[j - 1][1], x2: o.pts[j][0], y2: o.pts[j][1] };
        if (segDist(x, y, sg) > 2.4) continue;
        let da = Math.abs(ang - Math.atan2(sg.y2 - sg.y1, sg.x2 - sg.x1)) % Math.PI; da = Math.min(da, Math.PI - da);
        if (da < 0.35) { n++; break; }
      }
    }
  }
  return n;
}
const ROADS = [];
for (const [a, b, needed] of want) {
  let pts = route(a, b, 'road' + a + b, 7);
  if (!pts) continue;
  for (const mul of [4, 12]) if (alongside(pts, a, b)) pts = route(a, b, 'road' + a + b + mul, 7, mul) || pts;
  if (!needed && alongside(pts, a, b)) continue;
  if (!needed && plen(pts) > dist(a, b) * 2.1) continue; // too roundabout to be worth a road
  occupy(pts, 12);
  ROADS.push({ a, b, pts }); laid.push({ a, b, pts, kind: 'road' });
}

// ---------- geometry helpers ----------
// every road and rail segment, bucketed for fast distance queries
const SEGS = [], BUCKET = 12, buckets = new Map();
const addLine = (pts, kind, id) => { for (let i = 1; i < pts.length; i++) {
  const sg = { x1: pts[i - 1][0], y1: pts[i - 1][1], x2: pts[i][0], y2: pts[i][1], kind, id };
  SEGS.push(sg);
  const [bx1, bx2] = [Math.floor(Math.min(sg.x1, sg.x2) / BUCKET), Math.floor(Math.max(sg.x1, sg.x2) / BUCKET)], [by1, by2] = [Math.floor(Math.min(sg.y1, sg.y2) / BUCKET), Math.floor(Math.max(sg.y1, sg.y2) / BUCKET)];
  for (let bx = bx1; bx <= bx2; bx++) for (let by = by1; by <= by2; by++) { const k = bx + ',' + by; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(sg); }
} };
RAIL_LINES.forEach((r, i) => addLine(r.pts, 'rail', i));
ROADS.forEach((r, i) => addLine(r.pts, 'road', i));
function clearance(x, y, skip = null) {
  let d = 99; const bx = Math.floor(x / BUCKET), by = Math.floor(y / BUCKET);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const s of buckets.get((bx + i) + ',' + (by + j)) || []) if (!skip || !skip(s)) d = Math.min(d, segDist(x, y, s));
  return d;
}
// point and direction at arc length s along a polyline
function at(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (s <= L || i === pts.length - 1) { const u = Math.max(0, Math.min(1, s / (L || 1))); return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u, ang: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) }; }
    s -= L;
  }
}

// ---------- crossings: where a road crosses a state line ----------
const CROSSINGS = [];
ROADS.forEach((r, ri) => {
  const L = plen(r.pts);
  let prev = stateAt(...r.pts[0]);
  for (let s = 0.5; s <= L; s += 0.5) {
    const p = at(r.pts, s), cur = stateAt(p.x, p.y);
    if (cur && prev && cur !== prev) {
      let lo = s - 0.5, hi = s;
      for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2, q = at(r.pts, m); if (stateAt(q.x, q.y) === prev) lo = m; else hi = m; }
      const sm = (lo + hi) / 2, q = at(r.pts, sm), pair = [prev, cur].sort().join('-');
      const clearOfRails = clearance(q.x, q.y, sg => sg.kind !== 'rail') > 4.5 && clearance(q.x, q.y, sg => sg.kind === 'road' && sg.id === ri) > 3.5;
      const awayFromCities = cityIds.every(c => Math.hypot(P(c).x - q.x, P(c).y - q.y) > 9);
      if (clearOfRails && awayFromCities && sm > 6 && sm < L - 6 && !STATES[prev].exile && !STATES[cur].exile && !CROSSINGS.some(c => c.pair === pair && Math.hypot(c.x - q.x, c.y - q.y) < 9))
        CROSSINGS.push({ pair, road: ri, s: +sm.toFixed(2), a: prev, b: cur, x: +q.x.toFixed(1), y: +q.y.toFixed(1), ang: +q.ang.toFixed(3) });
    }
    if (cur) prev = cur;
  }
});
const seen = {};
for (const c of CROSSINGS) { const r = ROADS[c.road], base = `${c.pair}:${r.a}-${r.b}`; seen[base] = (seen[base] || 0) + 1; c.id = base + (seen[base] > 1 ? '-' + seen[base] : ''); delete c.pair; }

// ---------- depot sites: on one of the city's railway lines, a little out of town ----------
const CAPITAL = { dc: ['DC', 'MD', 'VA'] }; // Washington is too small to hold anything: its institutions fill the Capital District
const DEPOT_SITES = {};
for (const id of cityIds) {
  const allowed = CAPITAL[id] || [CITIES[id].st];
  let best = null;
  RAIL_LINES.forEach((r, ri) => {
    if (r.a !== id && r.b !== id) return;
    const L = plen(r.pts);
    for (let d = 6; d <= Math.min(34, L * 0.8); d += 0.5) {
      const s = r.a === id ? d : L - d, p = at(r.pts, s);
      if (!allowed.includes(stateAt(p.x, p.y))) continue;
      // the yard runs 5 units each way along the track and 4 to the side: keep everything else clear of it
      let c = 99;
      for (const k of [-5, -2.5, 0, 2.5, 5]) for (const o of [-3.5, 0, 3.5]) {
        const x = p.x + Math.cos(p.ang) * k - Math.sin(p.ang) * o, y = p.y + Math.sin(p.ang) * k + Math.cos(p.ang) * o;
        if (!stateAt(x, y)) c = 0;
        c = Math.min(c, clearance(x, y, sg => sg.kind === 'rail' && sg.id === ri));
      }
      const score = Math.min(c, 6) - Math.abs(d - 12) * 0.05;
      if (c > 1.1 && (!best || score > best.score)) best = { rail: ri, s: +s.toFixed(2), x: +p.x.toFixed(1), y: +p.y.toFixed(1), ang: +p.ang.toFixed(3), score };
    }
  });
  // crowded coastal cities (Boston, Baltimore, Miami...): settle for the clearest spot whose centre is in the state
  if (!best) RAIL_LINES.forEach((r, ri) => {
    if (r.a !== id && r.b !== id) return;
    const L = plen(r.pts);
    for (let d = 5; d <= L * 0.85; d += 0.5) {
      const s = r.a === id ? d : L - d, p = at(r.pts, s);
      if (!allowed.includes(stateAt(p.x, p.y))) continue;
      let c = 99;
      for (const k of [-4, 0, 4]) for (const o of [-3, 0, 3]) c = Math.min(c, clearance(p.x + Math.cos(p.ang) * k - Math.sin(p.ang) * o, p.y + Math.sin(p.ang) * k + Math.cos(p.ang) * o, sg => sg.kind === 'rail' && sg.id === ri));
      if (!best || c > best.score) best = { rail: ri, s: +s.toFixed(2), x: +p.x.toFixed(1), y: +p.y.toFixed(1), ang: +p.ang.toFixed(3), score: c };
    }
  });
  if (best) { delete best.score; DEPOT_SITES[id] = best; }
}

// ---------- building sites ----------
// A model at scale 1 has a ground tile ~12 wide, ~6.4 tall and stands up to ~9 above it: the whole silhouette must
// be inside the state and clear of every road, railway, depot and checkpoint.
const SIL = []; for (let x = -6; x <= 6; x += 2) for (let y = -8.5; y <= 3.4; y += 1.7) SIL.push([x, y]);
const FOOT = [[0, 0], [-6, 0], [6, 0], [0, -3.2], [0, 3.2], [-3.5, -1.8], [3.5, 1.8], [3.5, -1.8], [-3.5, 1.8]];
const spots = [...CROSSINGS.map(c => [c.x, c.y]), ...Object.values(DEPOT_SITES).map(d => [d.x, d.y])];
const SITES = {}, TAKEN = [];
// biggest cities choose first; every site already chosen (any city) is an obstacle for the next
for (const id of [...cityIds].sort((a, b) => CITIES[b].rank - CITIES[a].rank)) {
  const c = P(id), allowed = CAPITAL[id] || [CITIES[id].st];
  const wantN = 2 + CITIES[id].rank * 2 + 2;
  const labelW = c.name.length * 3.5 + 6;
  const cand = [];
  for (let r = 6; r <= 40; r += 1.5) for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2 + hash(id, r * 10) * 0.9;
    cand.push({ x: c.x + Math.cos(a) * r * 1.25, y: c.y + Math.sin(a) * r * 0.85, score: r + hash(id + k, r) * 5 });
  }
  cand.sort((p, q) => p.score - q.score);
  const out = [];
  // last resort for crowded corners (Worcester, Providence...): only the footprint must clear the lines
  for (const [m, strict] of [[1, 1], [0.8, 1], [0.65, 1], [0.5, 1], [0.4, 1], [0.32, 1], [0.6, 0], [0.45, 0], [0.32, 0], [0.26, 0], [0.22, 0]]) {
    for (const p of cand) {
      if (out.length >= wantN) break;
      if (!FOOT.every(([dx, dy]) => allowed.includes(stateAt(p.x + dx * m, p.y + dy * m)))) continue;
      if (!(strict ? SIL : FOOT).every(([dx, dy]) => clearance(p.x + dx * m, p.y + dy * m) > (strict ? 1.35 : 1.2))) continue;
      if (spots.some(([x, y]) => Math.hypot(x - p.x, y - p.y) < 7 * Math.max(0.7, m))) continue;
      if (p.x > c.x - 4 * m && p.x < c.x + labelW && p.y > c.y - 12 * m && p.y < c.y + 4 * m) continue;
      if (cityIds.some(o => o !== id && Math.hypot(P(o).x - p.x, P(o).y - p.y) < 8 * Math.max(0.6, m))) continue;
      if (TAKEN.some(q => Math.hypot((q[0] - p.x) / (10.5 * (q[2] + m) / 2), (q[1] - p.y) / (6 * (q[2] + m) / 2)) < 1)) continue;
      const site = [+p.x.toFixed(1), +p.y.toFixed(1), m];
      out.push(site); TAKEN.push(site);
    }
    if (out.length >= wantN) break;
  }
  SITES[id] = out;
}
// ---------- overlap report ----------
let overlaps = 0;
for (const a of SEGS) for (const b of SEGS) {
  if (a === b || (a.kind === b.kind && a.id === b.id)) continue;
  const ends = [[a.x1, a.y1], [a.x2, a.y2]].some(([x, y]) => cityIds.some(c => Math.hypot(P(c).x - x, P(c).y - y) < 7));
  if (ends) continue;
  const angA = Math.atan2(a.y2 - a.y1, a.x2 - a.x1), angB = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);
  let da = Math.abs(angA - angB) % Math.PI; da = Math.min(da, Math.PI - da);
  if (da < 0.35 && segDist((a.x1 + a.x2) / 2, (a.y1 + a.y2) / 2, b) < 2.2) { overlaps++; if (process.env.OVL) console.log(a.kind, a.id, b.kind, b.id, ((a.x1 + a.x2) / 2).toFixed(0), ((a.y1 + a.y2) / 2).toFixed(0)); }
}

const js = `// AUTO-GENERATED by tools/build-sites.mjs from the state outlines — do not edit by hand.
// RAIL_LINES[i]: the railway RAILS[i] as a polyline {a, b, pts}. ROADS: {a, b, pts} polylines (never over water).
// CROSSINGS: where a road crosses a state line (Checkpoint sites): road index, arc length s, states a -> b, direction.
// DEPOT_SITES: per city, the spot on one of its railway lines where its Rail Depot stands (rail index, arc length s).
// CITY_SITES: building sites per city, inside the state and clear of roads and railways ([x, y, scale]).
export const RAIL_LINES = ${JSON.stringify(RAIL_LINES)};
export const ROADS = ${JSON.stringify(ROADS)};
export const CROSSINGS = ${JSON.stringify(CROSSINGS)};
export const DEPOT_SITES = ${JSON.stringify(DEPOT_SITES)};
export const CITY_SITES = ${JSON.stringify(SITES)};
`;
fs.writeFileSync(path.join(ROOT, 'js/data/sites.js'), js);
const short = Object.entries(SITES).filter(([id, s]) => s.length < 2 + CITIES[id].rank * 2).map(([id, s]) => `${id} ${s.length}/${2 + CITIES[id].rank * 2}`);
console.log(`rails: ${RAIL_LINES.length} (${RAIL_LINES.reduce((a, r) => a + r.pts.length, 0)} pts) · roads: ${ROADS.length} · crossings: ${CROSSINGS.length} · depots: ${Object.keys(DEPOT_SITES).length}/${cityIds.length} · parallel overlaps: ${overlaps}`);
console.log(`sites: ${Object.values(SITES).reduce((a, s) => a + s.length, 0)}${short.length ? ' · short: ' + short.join(', ') : ''} · ${(js.length / 1024).toFixed(1)} KB`);
