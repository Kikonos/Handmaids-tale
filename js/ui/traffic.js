// Traffic on the map, drawn on the canvas layer as small shaded 3D boxes:
//   cars on the roads of the Republic, stopping at every checkpoint for their papers;
//   trains with carriages running between Rail Depots (and local freight on other live lines);
//   planes taking off from an Airfield's runway, flying to another Airfield and landing there.
// Light comes from the upper left, matching the isometric institution models.
import { CITY_POS } from '../data/geo.js';
import { CROSSINGS } from '../data/sites.js';
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

// ---------- geometry helpers ----------
const bz = (r, t) => { const A = CITY_POS[r.a], B = CITY_POS[r.b], q = r.q, m = 1 - t; return [m * m * A.x + 2 * m * t * q[0] + t * t * B.x, m * m * A.y + 2 * m * t * q[1] + t * t * B.y]; };
const bzd = (r, t) => { const A = CITY_POS[r.a], B = CITY_POS[r.b], q = r.q; return [2 * (1 - t) * (q[0] - A.x) + 2 * t * (B.x - q[0]), 2 * (1 - t) * (q[1] - A.y) + 2 * t * (B.y - q[1])]; };
const roadLen = r => { let l = 0, p = bz(r, 0); for (let i = 1; i <= 16; i++) { const n = bz(r, i / 16); l += Math.hypot(n[0] - p[0], n[1] - p[1]); p = n; } return l; };
function polyline(ids) {
  const pts = ids.map(id => CITY_POS[id]), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, L: cum[cum.length - 1] };
}
function along(p, s) {
  s = Math.max(0, Math.min(p.L, s));
  let i = 1; while (i < p.cum.length - 1 && p.cum[i] < s) i++;
  const a = p.pts[i - 1], b = p.pts[i], seg = p.cum[i] - p.cum[i - 1] || 1, u = (s - p.cum[i - 1]) / seg;
  return [a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, Math.atan2(b.y - a.y, b.x - a.x)];
}
const cubic = (P, u) => { const m = 1 - u; return [0, 1].map(k => m * m * m * P[0][k] + 3 * m * m * u * P[1][k] + 3 * m * u * u * P[2][k] + u * u * u * P[3][k]); };

const CAR_KINDS = [
  { kind: 'van', col: '#16181c', w: 3 }, // the Eyes' black vans
  { kind: 'car', col: '#d9d4c6', w: 3 }, { kind: 'car', col: '#8a9099', w: 3 }, { kind: 'car', col: '#6b2a2a', w: 2 },
  { kind: 'truck', col: '#4f5a46', w: 2 }, // Guardians
];
const carKind = () => { const tot = CAR_KINDS.reduce((a, k) => a + k.w, 0); let r = Math.random() * tot; for (const k of CAR_KINDS) if ((r -= k.w) < 0) return k; return CAR_KINDS[0]; };
const WAGONS = ['#6b3a2a', '#4f5a46', '#7a6a52', '#5c6670', '#6b3a2a'];

export function createTraffic() {
  let sig = '', cars = [], trains = [], bpos = new Map();
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
    if (G.phase === 0) { cars = []; trains = []; planes.clear(); sig = ''; return; }
    const liveRoads = ctx.roads.map((r, i) => r.live ? i : -1).filter(i => i >= 0);
    const liveRails = ctx.rails.filter(r => r.live);
    const depots = [...new Set(G.bld.filter(b => b.type === 'depot' && b.done == null).map(b => b.city))].slice(0, 6);
    const fields = G.bld.filter(b => b.type === 'airfield' && b.done == null && bpos.has(b.uid)).map(b => b.uid).slice(0, 8);
    const cps = G.bld.filter(b => b.site && b.done == null).map(b => b.site);
    const s = [liveRoads.join(','), liveRails.map(r => r.a + r.b).join(','), depots.join(','), fields.join(','), cps.join(',')].join('|');
    if (s === sig) return;
    sig = s;
    // cars: keep the ones on roads still open, top up each road
    const open = new Set(liveRoads);
    cars = cars.filter(c => open.has(c.road));
    for (const i of liveRoads) {
      const r = ctx.roads[i];
      if (!roadInfo.has(i)) roadInfo.set(i, { r, len: roadLen(r) });
      const info = roadInfo.get(i);
      info.cps = CROSSINGS.filter(x => x.road === i && cps.includes(x.id)).map(x => ({ id: x.id, t: x.t }));
      const want = Math.max(1, Math.min(3, Math.round(info.len / 45)));
      let have = cars.filter(c => c.road === i).length;
      while (have++ < want && cars.length < 90) cars.push({ road: i, u: Math.random(), dir: Math.random() < 0.5 ? 1 : -1, v: rnd(7, 11), wait: 0, passed: null, ...carKind() });
    }
    // trains: supply trains between depots, local freight on other open lines
    const adj = {};
    for (const r of liveRails) for (const [a, b] of [[r.a, r.b], [r.b, r.a]]) (adj[a] || (adj[a] = [])).push({ to: b, d: Math.hypot(CITY_POS[a].x - CITY_POS[b].x, CITY_POS[a].y - CITY_POS[b].y) });
    const route = (from, to) => {
      const dist = { [from]: 0 }, prev = {}, q = new Set([from]);
      while (q.size) {
        let u = null; for (const n of q) if (u == null || dist[n] < dist[u]) u = n;
        q.delete(u); if (u === to) break;
        for (const { to: v, d } of adj[u] || []) if (dist[v] == null || dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u; q.add(v); }
      }
      if (to && dist[to] == null) return null;
      if (!to) { // the farthest city within reach
        const far = Object.keys(dist).sort((a, b) => dist[b] - dist[a])[0]; if (!far || far === from) return null; to = far;
      }
      const ids = [to]; while (ids[0] !== from) ids.unshift(prev[ids[0]]);
      return ids;
    };
    trains = [];
    depots.forEach((d, i) => {
      if (!adj[d]) return;
      const ids = (depots.length > 1 && route(d, depots[(i + 1) % depots.length])) || route(d, null);
      if (ids && ids.length > 1) trains.push({ p: polyline(ids), s: 0, dir: 1, wait: rnd(0, 3), n: 6, v: 15, supply: true });
    });
    liveRails.filter((_, i) => i % 4 === 1).slice(0, 7).forEach(r => trains.push({ p: polyline([r.a, r.b]), s: Math.random() * 20, dir: 1, wait: rnd(0, 4), n: 3, v: 12 }));
    // planes: one per airfield
    for (const uid of [...planes.keys()]) if (!fields.includes(uid)) planes.delete(uid);
    for (const uid of fields) if (!planes.has(uid)) { const pl = { home: uid, ang: 0.52 }; leg(pl, [uid]); pl.i = 5; pl.tau = Math.random() * pl.segs[5].dur; planes.set(uid, pl); } // parked at home first
    for (const pl of planes.values()) pl.fields = fields;
  }

  // ---------- per frame ----------
  function frame(c, dt, running) {
    if (!cars.length && !trains.length && !planes.size) return;
    const step = running ? dt : 0;
    const draw = [];
    for (const car of cars) {
      const info = roadInfo.get(car.road); if (!info) continue;
      if (step) {
        if (car.wait > 0) car.wait -= step;
        else {
          const nu = car.u + car.dir * car.v * step / info.len;
          const cp = info.cps.find(x => x.id !== car.passed && (car.u - x.t) * (nu - x.t) <= 0);
          if (cp) { car.wait = rnd(0.8, 1.8); car.passed = cp.id; car.u = cp.t - car.dir * 1.2 / info.len; }
          else { car.u = nu; if (car.u > 1 || car.u < 0) { car.dir *= -1; car.u = Math.max(0, Math.min(1, car.u)); car.passed = null; } }
        }
      }
      const [x, y] = bz(info.r, car.u), [tx, ty] = bzd(info.r, car.u), tl = Math.hypot(tx, ty) || 1;
      const hx = tx / tl * car.dir, hy = ty / tl * car.dir;
      draw.push({ y, f: () => drawCar(c, x - hy * 0.42, y + hx * 0.42, Math.atan2(hy, hx), car) });
    }
    for (const tr of trains) {
      if (step) {
        if (tr.wait > 0) tr.wait -= step;
        else { tr.s += tr.dir * tr.v * step; if (tr.s > tr.p.L) { tr.s = tr.p.L; tr.dir = -1; tr.wait = 2.5; } else if (tr.s < 0) { tr.s = 0; tr.dir = 1; tr.wait = 2.5; } }
      }
      for (let i = tr.n; i >= 0; i--) {
        const [x, y, a] = along(tr.p, tr.s - tr.dir * i * 3.05), ang = tr.dir > 0 ? a : a + Math.PI;
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
    for (const d of air) d.f();
  }
  function drawCar(c, x, y, ang, car) {
    if (car.kind === 'van') box(c, x, y, ang, 1.9, 0.95, 0.95, car.col);
    else if (car.kind === 'truck') { box(c, x - Math.cos(ang) * 0.35, y - Math.sin(ang) * 0.35, ang, 1.5, 1.0, 0.95, car.col); box(c, x + Math.cos(ang) * 0.85, y + Math.sin(ang) * 0.85, ang, 0.6, 0.95, 0.7, sh(car.col, -0.25)); }
    else { box(c, x, y, ang, 1.8, 0.9, 0.42, car.col); box(c, x - Math.cos(ang) * 0.12, y - Math.sin(ang) * 0.12, ang, 0.95, 0.8, 0.36, '#2a3440', 0.42); }
  }
  return { sync, frame };
}
