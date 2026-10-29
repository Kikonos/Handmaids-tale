// Traffic on the map, drawn on the canvas layer as small shaded 3D boxes:
//   cars on the roads of the Republic, stopping at every checkpoint while its barrier lifts, then driving through;
//   trains with carriages running between Rail Depots, pulling in under each depot's shed on the way;
//   planes taking off from an Airfield's runway, flying to another Airfield and landing there.
// Depots and checkpoints themselves are drawn here too, built into their track or road and oriented along it.
// Light comes from the upper left, matching the isometric institution models.
import { BUILDINGS } from '../data/buildings.js';
import { RUNWAY } from './models.js';

const C30 = 0.8660254, S30 = 0.5;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------- shading ----------
const shades = new Map();
function sh(col, t) {
  const k = col + (Math.round(t * 20) / 20);
  let v = shades.get(k);
  if (!v) {
    const c = col.replace('#', ''), a = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16));
    v = '#' + a.map(x => Math.max(0, Math.min(255, Math.round(t >= 0 ? x + (255 - x) * t : x * (1 + t)))).toString(16).padStart(2, '0')).join('');
    shades.set(k, v);
  }
  return v;
}
// An oriented box standing on the ground at (x, y), long axis at angle ang; z lifts it (screen up).
function box(c, x, y, ang, L, W, H, col, z = 0) {
  const ca = Math.cos(ang), sa = Math.sin(ang), hl = L / 2, hw = W / 2;
  const g = [[hl, hw], [-hl, hw], [-hl, -hw], [hl, -hw]].map(([u, v]) => [x + u * ca - v * sa, y + u * sa + v * ca - z]);
  for (let i = 0; i < 4; i++) {
    const a = g[i], b = g[(i + 1) % 4], mx = (a[0] + b[0]) / 2 - x, my = (a[1] + b[1]) / 2 - (y - z);
    if (my <= 1e-4) continue; // faces away from the viewer
    c.fillStyle = sh(col, -0.12 - 0.22 * mx / (Math.hypot(mx, my) || 1));
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(b[0], b[1] - H); c.lineTo(a[0], a[1] - H); c.closePath(); c.fill();
  }
  c.fillStyle = sh(col, 0.2);
  c.beginPath(); c.moveTo(g[0][0], g[0][1] - H); for (let i = 1; i < 4; i++) c.lineTo(g[i][0], g[i][1] - H); c.closePath(); c.fill();
}
// A pitched roof: ridge along the long axis at height z + h, eaves at z along both long sides.
function gable(c, x, y, ang, L, W, z, h, col) {
  const P = (u, v, zz) => { const [px, py] = off(x, y, ang, u, v); return [px, py - zz]; };
  const hl = L / 2, hw = W / 2;
  const r1 = P(hl, 0, z + h), r2 = P(-hl, 0, z + h);
  const slopes = [-1, 1].map(sg => ({ sg, e1: P(hl, hw * sg, z), e2: P(-hl, hw * sg, z), facing: off(0, 0, ang, 0, sg)[1] }));
  slopes.sort((a, b) => a.facing - b.facing); // the slope facing away first
  for (const sl of slopes) {
    c.fillStyle = sh(col, sl.facing > 0 ? -0.08 : 0.22);
    c.beginPath(); c.moveTo(sl.e1[0], sl.e1[1]); c.lineTo(sl.e2[0], sl.e2[1]); c.lineTo(r2[0], r2[1]); c.lineTo(r1[0], r1[1]); c.closePath(); c.fill();
  }
  // the gable end facing the viewer
  const endU = off(0, 0, ang, 1, 0)[1] > 0 ? hl : -hl, a = P(endU, -hw, z), b = P(endU, hw, z), t = P(endU, 0, z + h);
  c.fillStyle = sh(col, -0.3); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(t[0], t[1]); c.closePath(); c.fill();
}
// a point offset along (u) and across (v) a direction
const off = (x, y, ang, u, v) => [x + Math.cos(ang) * u - Math.sin(ang) * v, y + Math.sin(ang) * u + Math.cos(ang) * v];

// ---------- polylines ----------
function line(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; }
function along(p, s) {
  s = Math.max(0, Math.min(p.L, s));
  let i = 1; while (i < p.cum.length - 1 && p.cum[i] < s) i++;
  const a = p.pts[i - 1], b = p.pts[i], seg = p.cum[i] - p.cum[i - 1] || 1, u = (s - p.cum[i - 1]) / seg;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])];
}
// the part of a polyline from arc length s0 to s1 (reversed if s1 < s0)
function sub(p, s0, s1) {
  const lo = Math.min(s0, s1), hi = Math.max(s0, s1), out = [along(p, lo).slice(0, 2)];
  for (let i = 1; i < p.pts.length - 1; i++) if (p.cum[i] > lo && p.cum[i] < hi) out.push(p.pts[i]);
  out.push(along(p, hi).slice(0, 2));
  return s1 < s0 ? out.reverse() : out;
}

const CAR_KINDS = [
  { kind: 'van', col: '#16181c', w: 3 }, // the Eyes' black vans
  { kind: 'car', col: '#d9d4c6', w: 3 }, { kind: 'car', col: '#8a9099', w: 3 }, { kind: 'car', col: '#6b2a2a', w: 2 },
  { kind: 'truck', col: '#4f5a46', w: 2 }, // Guardians
];
const carKind = () => { const tot = CAR_KINDS.reduce((a, k) => a + k.w, 0); let r = Math.random() * tot; for (const k of CAR_KINDS) if ((r -= k.w) < 0) return k; return CAR_KINDS[0]; };
const WAGONS = ['#6b3a2a', '#4f5a46', '#7a6a52', '#5c6670', '#6b3a2a'];
const cubic = (P, u) => { const m = 1 - u; return [0, 1].map(k => m * m * m * P[0][k] + 3 * m * m * u * P[1][k] + 3 * m * u * u * P[2][k] + u * u * u * P[3][k]); };

export function createTraffic() {
  let sig = '', cars = [], trains = [], bpos = new Map(), structs = [], clock = 0, dens = 1; // dens: traffic density (graphics quality)
  const planes = new Map(), roadInfo = new Map();

  // ---------- planes ----------
  function runway(uid) {
    const p = bpos.get(uid); if (!p) return null;
    const k = p.size / 52;
    const s = { x: p.x + RUNWAY.x0 * C30 * k, y: p.y + (RUNWAY.x0 * S30 - RUNWAY.z) * k };
    const e = { x: p.x + RUNWAY.x1 * C30 * k, y: p.y + (RUNWAY.x1 * S30 - RUNWAY.z) * k };
    const L = Math.hypot(e.x - s.x, e.y - s.y);
    return { s, e, L, dx: (e.x - s.x) / L, dy: (e.y - s.y) / L };
  }
  function leg(pl, fields) {
    const home = pl.home, others = fields.filter(f => f !== home), dest = others.length ? pick(others) : home;
    const H = () => runway(home) || runway(dest), D = () => runway(dest) || runway(home);
    const lat = dest === home ? 46 * (Math.random() < 0.5 ? 1 : -1) : rnd(-18, 18);
    const cruisePts = () => {
      const r = H(), d = D(), c = [r.e.x + r.dx * 18, r.e.y + r.dy * 18], a = [d.s.x - d.dx * 26, d.s.y - d.dy * 26];
      const nx = -r.dy, ny = r.dx;
      return [c, [c[0] + r.dx * 34 + nx * lat, c[1] + r.dy * 34 + ny * lat], [a[0] - d.dx * 34 + nx * lat, a[1] - d.dy * 34 + ny * lat], a];
    };
    const P0 = cruisePts(), clen = Math.hypot(P0[3][0] - P0[0][0], P0[3][1] - P0[0][1]) + 70;
    const park = rnd(2, 5);
    pl.dest = dest; pl.i = 0; pl.tau = 0;
    pl.segs = [
      { dur: 2.6, f: u => { const r = H(), k = u * u; return [r.s.x + r.dx * r.L * k, r.s.y + r.dy * r.L * k, Math.max(0, (k - 0.62) / 0.38) * 1.6]; } },
      { dur: 1.3, f: u => { const r = H(); return [r.e.x + r.dx * 18 * u, r.e.y + r.dy * 18 * u, 1.6 + 8.4 * u]; } },
      { dur: clen / 26, f: u => { const [x, y] = cubic(cruisePts(), u); return [x, y, 10 + Math.sin(u * Math.PI) * 6]; } },
      { dur: 1.9, f: u => { const d = D(); return [d.s.x - d.dx * 26 * (1 - u), d.s.y - d.dy * 26 * (1 - u), 10 * (1 - u) * (1 - u * 0.3)]; } },
      { dur: 2.4, f: u => { const d = D(), k = 1 - (1 - u) * (1 - u); return [d.s.x + d.dx * d.L * 0.7 * k, d.s.y + d.dy * d.L * 0.7 * k, 0]; } },
      { dur: park, f: () => { const d = D(); return [d.s.x + d.dx * d.L * 0.7, d.s.y + d.dy * d.L * 0.7, 0]; }, still: true },
      { dur: 3.2, f: u => { const d = D(), k = 0.7 * (1 - u); return [d.s.x + d.dx * d.L * k, d.s.y + d.dy * d.L * k, 0]; } },
      { dur: rnd(0.5, 2), f: () => { const d = D(); return [d.s.x, d.s.y, 0]; }, still: true, turn: true },
    ];
  }
  function drawPlane(c, x, y, ang, sc, shadow) {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(sc, sc);
    const wing = s => { c.beginPath(); c.moveTo(0.9, 0.35 * s); c.lineTo(-0.7, 3.5 * s); c.lineTo(-1.5, 3.5 * s); c.lineTo(-0.9, 0.35 * s); c.closePath(); c.fill(); };
    const tail = s => { c.beginPath(); c.moveTo(-2.1, 0.25 * s); c.lineTo(-2.8, 1.35 * s); c.lineTo(-3.25, 1.35 * s); c.lineTo(-2.9, 0.25 * s); c.closePath(); c.fill(); };
    if (shadow) {
      c.fillStyle = 'rgba(0,0,0,.32)'; wing(1); wing(-1); tail(1); tail(-1);
      c.beginPath(); c.ellipse(0, 0, 3.1, 0.5, 0, 0, 7); c.fill();
    } else {
      // wings shaded by which side faces the light (upper left)
      const up = Math.sin(ang) > 0;
      c.fillStyle = up ? '#e9edf1' : '#b9c0c8'; wing(-1); tail(-1);
      c.fillStyle = up ? '#b9c0c8' : '#e9edf1'; wing(1); tail(1);
      const g = c.createLinearGradient(0, -0.55, 0, 0.55); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#c9d0d8'); g.addColorStop(1, '#7d8792');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 3.1, 0.52, 0, 0, 7); c.fill();
      c.fillStyle = '#b3202a'; c.beginPath(); c.ellipse(-2.6, 0, 0.6, 0.22, 0, 0, 7); c.fill(); // Gilead red tail
      c.fillStyle = '#1e2a36'; c.beginPath(); c.ellipse(2.25, 0, 0.55, 0.3, 0, 0, 7); c.fill();
      c.fillStyle = '#5a6270'; c.fillRect(0.1, 1.15, 0.9, 0.42); c.fillRect(0.1, -1.57, 0.9, 0.42); // engines
    }
    c.restore();
  }


  // ---------- sync with the game ----------
  function sync(G, ctx) {
    bpos = ctx.bpos;
    if (G.phase === 0) { cars = []; trains = []; planes.clear(); structs = []; sig = ''; return; }
    const liveRoads = ctx.roads.map((r, i) => r.live ? i : -1).filter(i => i >= 0);
    const liveRails = ctx.rails.map((r, i) => r.live ? i : -1).filter(i => i >= 0);
    const fields = G.bld.filter(b => b.type === 'airfield' && b.done == null && bpos.has(b.uid)).map(b => b.uid).slice(0, 8);
    const s = [dens, liveRoads.join(','), liveRails.join(','), fields.join(','), (ctx.structs || []).map(t => t.uid + (t.building ? 'b' : '') + t.x).join(',')].join('|');
    if (s === sig) return;
    sig = s;
    const old = new Map(structs.map(t => [t.uid, t]));
    structs = (ctx.structs || []).map(t => ({ ...t, open: old.get(t.uid)?.open || 0, openUntil: 0 }));
    const depots = structs.filter(t => t.kind === 'depot' && !t.building);
    // cars: keep the ones on roads still open, top up each road
    const open = new Set(liveRoads);
    cars = cars.filter(c => open.has(c.road));
    for (const i of liveRoads) {
      if (!roadInfo.has(i)) roadInfo.set(i, { line: line(ctx.roads[i].pts) });
      const info = roadInfo.get(i);
      info.cps = structs.filter(t => t.kind === 'checkpoint' && t.road === i && !t.building).map(t => ({ id: t.uid, s: t.s, st: t }));
      const want = Math.max(dens < 0.5 ? 0 : 1, Math.min(3, Math.round(info.line.L / 45 * dens)));
      const mine = cars.filter(c => c.road === i);
      if (mine.length > want) { const drop = new Set(mine.slice(want)); cars = cars.filter(c => !drop.has(c)); }
      let have = Math.min(mine.length, want);
      while (have++ < want && cars.length < 90 * dens) cars.push({ road: i, s: Math.random() * info.line.L, dir: Math.random() < 0.5 ? 1 : -1, v: rnd(7, 11), wait: 0, passed: null, ...carKind() });
    }
    for (const c of cars) if (c.s > roadInfo.get(c.road).line.L) c.s = roadInfo.get(c.road).line.L;
    // trains: supply trains between depots, local freight on other open lines
    const rails = ctx.rails, lines = rails.map(r => line(r.pts));
    const adj = {};
    for (const i of liveRails) { const r = rails[i]; (adj[r.a] || (adj[r.a] = [])).push({ to: r.b, i }); (adj[r.b] || (adj[r.b] = [])).push({ to: r.a, i }); }
    const cityPath = (from, to) => {
      const dist = { [from]: 0 }, prev = {}, q = new Set([from]);
      while (q.size) {
        let u = null; for (const n of q) if (u == null || dist[n] < dist[u]) u = n;
        q.delete(u); if (u === to) break;
        for (const { to: v, i } of adj[u] || []) { const d = dist[u] + lines[i].L; if (dist[v] == null || d < dist[v]) { dist[v] = d; prev[v] = { u, i }; q.add(v); } }
      }
      if (!to) to = Object.keys(dist).sort((a, b) => dist[b] - dist[a])[0];
      if (!to || dist[to] == null || to === from) return null;
      const steps = []; for (let v = to; v !== from; v = prev[v].u) steps.unshift({ from: prev[v].u, to: v, i: prev[v].i });
      return steps;
    };
    // build the polyline of a journey and the depots it calls at
    const journey = (pieces) => {
      const pts = [], stops = [];
      let off0 = 0;
      for (const pc of pieces) {
        const p = lines[pc.i], seg = sub(p, pc.s0, pc.s1), l = Math.abs(pc.s1 - pc.s0);
        for (const t of depots) if (t.rail === pc.i && t.s >= Math.min(pc.s0, pc.s1) - 0.01 && t.s <= Math.max(pc.s0, pc.s1) + 0.01) stops.push({ s: off0 + Math.abs(t.s - pc.s0), uid: t.uid });
        pts.push(...(pts.length ? seg.slice(1) : seg));
        off0 += l;
      }
      return { line: line(pts), stops };
    };
    const toCity = (t) => ({ i: t.rail, s0: t.s, s1: rails[t.rail].a === t.city ? 0 : lines[t.rail].L });
    const fromCity = (t) => ({ i: t.rail, s0: rails[t.rail].a === t.city ? 0 : lines[t.rail].L, s1: t.s });
    const edge = st => ({ i: st.i, s0: rails[st.i].a === st.from ? 0 : lines[st.i].L, s1: rails[st.i].a === st.from ? lines[st.i].L : 0 });
    trains = [];
    depots.slice(0, 6).forEach((d, k) => {
      if (!liveRails.includes(d.rail)) return;
      const dest = depots.length > 1 ? depots[(k + 1) % depots.length] : null;
      const steps = cityPath(d.city, dest ? dest.city : null);
      if (dest && !steps && dest.city !== d.city) return;
      const pieces = [toCity(d), ...(steps || []).map(edge)];
      if (dest && liveRails.includes(dest.rail)) pieces.push(fromCity(dest));
      const j = journey(pieces.filter(p => Math.abs(p.s1 - p.s0) > 0.01));
      if (j.line.L > 5) trains.push({ ...j, s: 0, dir: 1, wait: rnd(0, 3), n: 6, v: 15, supply: true, passed: j.stops.length ? j.stops[0].uid : null });
    });
    liveRails.filter((_, i) => i % 4 === 1).slice(0, Math.round(7 * dens)).forEach(i => { const j = journey([{ i, s0: 0, s1: lines[i].L }]); trains.push({ ...j, s: Math.random() * 20, dir: 1, wait: rnd(0, 4), n: 3, v: 12 }); });
    // planes: one per airfield
    for (const uid of [...planes.keys()]) if (!fields.includes(uid)) planes.delete(uid);
    for (const uid of fields) if (!planes.has(uid)) { const pl = { home: uid, ang: 0.52 }; leg(pl, [uid]); pl.i = 5; pl.tau = Math.random() * pl.segs[5].dur; planes.set(uid, pl); } // parked at home first
    for (const pl of planes.values()) pl.fields = fields;
  }

  // ---------- depots and checkpoints ----------
  // Base parts go into the depth-sorted list with the vehicles; roofs go on top of everything that passes under them.
  function structure(c, t, base, roofs) {
    const fade = t.building ? 0.45 : 1, K = t.kind === 'depot' ? 0.55 : 0.6; // in scale with the institution models
    const bx = (x, y, ang, L, W, H, col, z = 0) => box(c, x, y, ang, L * K, W * K, H * K, col, z * K);
    const gb = (x, y, ang, L, W, z, h, col) => gable(c, x, y, ang, L * K, W * K, z * K, h * K, col);
    const side = Math.cos(t.ang) > 0 ? -1 : 1; // buildings on the far (upper) side, so traffic passes in front
    const P = (u, v) => off(t.x, t.y, t.ang, u * K, v * side * K);
    const put = (list, u, v, f) => { const [x, y] = P(u, v); list.push({ y, f: () => { c.globalAlpha = fade; f(x, y); c.globalAlpha = 1; } }); };
    if (t.kind === 'depot') {
      const col = BUILDINGS.depot.color;
      put(base, 0, -2.1, (x, y) => bx(x, y, t.ang, 9, 1.4, 0.35, '#8a8f98'));                        // platform
      put(base, 0, -5.0, (x, y) => { bx(x, y, t.ang, 6.4, 3, 1.8, col); gb(x, y, t.ang, 6.9, 3.5, 1.8, 1.3, '#5a3f2a'); }); // goods shed
      for (const u of [-3.2, 3.2]) for (const v of [-1.6, 1.6]) put(base, u, v, (x, y) => bx(x, y, t.ang, 0.3, 0.3, 2.0, '#4a3a2a'));
      put(roofs, 0, 0, (x, y) => gb(x, y, t.ang, 8, 4.2, 2.0, 1.0, '#6b4a30'));                       // train shed over the track
      if (t.building) put(roofs, 0, -3, (x, y) => { c.strokeStyle = '#f2c94c'; c.lineWidth = 0.25; c.strokeRect(x - 4 * K, y - 5 * K, 8 * K, 5 * K); });
    } else {
      // checkpoint: canopy over the road, booth on one side, concrete blocks, a barrier arm that lifts for each car
      for (const u of [-1.2, 1.2]) for (const v of [-2.5, 2.5]) put(base, u, v, (x, y) => bx(x, y, t.ang, 0.3, 0.3, 1.9, '#9aa0a8'));
      put(base, 0, -3.6, (x, y) => bx(x, y, t.ang, 1.6, 1.4, 1.5, '#c9ced6'));
      for (const u of [-3.4, 3.4]) for (const v of [-2.0, 2.0]) put(base, u, v, (x, y) => bx(x, y, t.ang, 1.3, 0.4, 0.4, (u > 0) === (v > 0) ? '#e8e4dc' : '#c8323a'));
      t.open += ((clock < t.openUntil ? 1 : 0) - t.open) * Math.min(1, 0.12);
      for (const u of [-1.9, 1.9]) {
        const [px, py] = P(u, u > 0 ? -2.3 : 2.3);
        base.push({ y: py + 0.01, f: () => {
          const a = t.open * 1.35, len = 4.4 * K, [ex, ey] = off(0, 0, t.ang, 0, (u > 0 ? 1 : -1) * side * len * Math.cos(a));
          c.globalAlpha = fade; c.lineCap = 'round';
          c.strokeStyle = '#f2f2f2'; c.lineWidth = 0.3 * K; c.beginPath(); c.moveTo(px, py - 0.9 * K); c.lineTo(px + ex, py + ey - 0.9 * K - len * Math.sin(a)); c.stroke();
          c.setLineDash([0.45 * K, 0.45 * K]); c.strokeStyle = '#c8323a'; c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
        } });
      }
      put(roofs, 0, 0, (x, y) => { bx(x, y, t.ang, 3.0, 5.8, 0.3, '#3a3f47', 1.9); bx(x, y, t.ang, 3.05, 5.85, 0.12, '#b3202a', 2.2); });
    }
  }

  // ---------- per frame ----------
  function frame(c, dt, running) {
    if (!cars.length && !trains.length && !planes.size && !structs.length) return;
    const step = running ? dt : 0;
    clock += step;
    const draw = [], roofs = [];
    for (const t of structs) structure(c, t, draw, roofs);
    const cpBy = new Map(structs.map(t => [t.uid, t]));
    for (const car of cars) {
      const info = roadInfo.get(car.road); if (!info) continue;
      const L = info.line.L;
      if (step) {
        if (car.wait > 0) { car.wait -= step; if (car.wait <= 0 && car.at) { const t = cpBy.get(car.at); if (t) t.openUntil = clock + 1.6; car.at = null; } }
        else {
          const ns = car.s + car.dir * car.v * step;
          // stop short of each checkpoint, wait for the barrier, then drive through under the canopy
          const cp = info.cps.find(x => x.id !== car.passed && (car.s - (x.s - car.dir * 2.4)) * (ns - (x.s - car.dir * 2.4)) <= 0);
          if (cp) { car.wait = rnd(0.9, 1.8); car.passed = cp.id; car.at = cp.id; car.s = cp.s - car.dir * 2.4; }
          else { car.s = ns; if (car.s > L || car.s < 0) { car.dir *= -1; car.s = Math.max(0, Math.min(L, car.s)); car.passed = null; } }
        }
      }
      const [x, y, a] = along(info.line, car.s), ang = car.dir > 0 ? a : a + Math.PI;
      const [lx, ly] = off(x, y, ang, 0, 0.45);
      draw.push({ y: ly, f: () => drawCar(c, lx, ly, ang, car) });
    }
    for (const tr of trains) {
      const L = tr.line.L;
      if (step) {
        if (tr.wait > 0) tr.wait -= step;
        else {
          const nxt = tr.stops.filter(p => p.uid !== tr.passed).map(p => (p.s - tr.s) * tr.dir).filter(d => d >= 0);
          const near = nxt.length ? Math.min(...nxt) : 99;
          const v = tr.v * Math.max(0.25, Math.min(1, near / 12)); // slow into the depot
          const ns = tr.s + tr.dir * v * step;
          const stop = tr.stops.find(p => p.uid !== tr.passed && (tr.s - p.s) * (ns - p.s) <= 0);
          if (stop) { tr.s = stop.s; tr.wait = 2.2; tr.passed = stop.uid; }
          else { tr.s = ns; if (tr.s > L) { tr.s = L; tr.dir = -1; tr.wait = 2.5; } else if (tr.s < 0) { tr.s = 0; tr.dir = 1; tr.wait = 2.5; } }
        }
      }
      for (let i = tr.n; i >= 0; i--) {
        const [x, y, a] = along(tr.line, tr.s - tr.dir * i * 3.05), ang = tr.dir > 0 ? a : a + Math.PI;
        const loco = i === 0;
        draw.push({ y, f: () => loco ? (box(c, x, y, ang, 2.9, 1.2, 1.25, tr.supply ? '#2b2f36' : '#3a3530'), box(c, x + Math.cos(ang) * 0.9, y + Math.sin(ang) * 0.9, ang, 0.8, 1.0, 0.45, '#b3202a', 1.25))
          : box(c, x, y, ang, 2.6, 1.1, 1.05, WAGONS[(i + (tr.supply ? 1 : 0)) % WAGONS.length]) });
      }
    }
    const air = [];
    for (const pl of planes.values()) {
      if (!pl.segs) continue;
      if (step) {
        pl.tau += step;
        while (pl.tau >= pl.segs[pl.i].dur) { pl.tau -= pl.segs[pl.i].dur; pl.i++; if (pl.i >= pl.segs.length) { pl.home = pl.dest; leg(pl, pl.fields || [pl.home]); } }
      }
      const sg = pl.segs[pl.i], u = Math.min(1, pl.tau / sg.dur), p = sg.f(u);
      if (!p || p.some(v => !isFinite(v))) continue;
      if (!sg.still) { const q = sg.f(Math.min(1, u + 0.02)), o = sg.f(Math.max(0, u - 0.02)); if (Math.hypot(q[0] - o[0], q[1] - o[1]) > 0.02) pl.ang = Math.atan2(q[1] - o[1], q[0] - o[0]); }
      else if (sg.turn) pl.ang = 0.5236; // lined up on the runway again
      const [x, y, alt] = p, sc = 0.55 * (1 + alt * 0.04); // a plane fits its runway; it grows a little as it climbs
      draw.push({ y: y - 0.01, f: () => drawPlane(c, x + alt * 0.25, y + alt * 0.08, pl.ang, 0.55, true) });
      air.push({ y, f: () => { drawPlane(c, x, y - alt, pl.ang, sc, false); if (alt > 0.5 && (performance.now() / 600 + x) % 1 < 0.5) { c.fillStyle = '#ff4d4d'; c.beginPath(); c.arc(x, y - alt, 0.5 * sc, 0, 7); c.fill(); } } });
    }
    draw.sort((a, b) => a.y - b.y);
    for (const d of draw) d.f();
    roofs.sort((a, b) => a.y - b.y);
    for (const d of roofs) d.f();
    for (const d of air) d.f();
  }
  function drawCar(c, x, y, ang, car) {
    if (car.kind === 'van') box(c, x, y, ang, 1.9, 0.95, 0.95, car.col);
    else if (car.kind === 'truck') { box(c, x - Math.cos(ang) * 0.35, y - Math.sin(ang) * 0.35, ang, 1.5, 1.0, 0.95, car.col); box(c, x + Math.cos(ang) * 0.85, y + Math.sin(ang) * 0.85, ang, 0.6, 0.95, 0.7, sh(car.col, -0.25)); }
    else { box(c, x, y, ang, 1.8, 0.9, 0.42, car.col); box(c, x - Math.cos(ang) * 0.12, y - Math.sin(ang) * 0.12, ang, 0.95, 0.8, 0.36, '#2a3440', 0.42); }
  }
  return { sync, frame, density(d) { if (d !== dens) { dens = d; sig = ''; } } };
}
