// The war-room map. Static cartography, cities, pins and institutions are SVG (tappable); all motion
// (trains, helicopters, air and drone strikes, front-line fire, ripples) is drawn on a canvas layer on
// top, which keeps the DOM still and taps responsive. Pan with one finger, pinch to zoom.
import { STATE_SHAPES, STATE_BORDERS, NATION_OUTLINE, CONTEXT_LAND, CITY_POS, FOREIGN_CITIES, CANADA_BORDER } from '../data/geo.js';
import { STATES, CITIES, FIPS_TO_ABBR } from '../data/states.js';
import { BUILDINGS } from '../data/buildings.js';
import { EVENT_BY_ID } from '../data/events.js';
import { isHeld, M } from '../engine/core.js';
import { supplied } from '../engine/actions.js';
import { NEIGH } from '../engine/sim.js';
import { CITY_SITES, ROADS, CROSSINGS, RAIL_LINES, DEPOT_SITES } from '../data/sites.js';
import { RUNWAY } from './models.js';
import { createTraffic } from './traffic.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const useIcon = (name, x, y, s, parent, color) => {
  const u = el('use', { href: `#i-${name}`, x: x - s / 2, y: y - s / 2, width: s, height: s }, parent);
  if (color) u.style.color = color;
  return u;
};
const XING = Object.fromEntries(CROSSINGS.map(x => [x.id, x]));
const pathOf = pts => 'M' + pts.map(p => p[0] + ' ' + p[1]).join('L');
// A polyline shifted sideways by d (mitred corners), for the two steel rails of a track.
function offsetLine(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const n1 = norm(i ? [p[0] - a[0], p[1] - a[1]] : [b[0] - p[0], b[1] - p[1]]), n2 = norm(i < pts.length - 1 ? [b[0] - p[0], b[1] - p[1]] : n1);
    let nx = -(n1[1] + n2[1]), ny = n1[0] + n2[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const k = Math.min(2.5, 1 / Math.max(0.4, nx * -n1[1] + ny * n1[0]));
    return [+(p[0] + nx * d * k).toFixed(2), +(p[1] + ny * d * k).toFixed(2)];
  });
}
const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const SHAPE = Object.fromEntries(STATE_SHAPES.map(s => [FIPS_TO_ABBR[s.id], s]));
export const centroidOf = ab => { const s = SHAPE[ab]; return s ? { x: s.c[0], y: s.c[1] } : { x: 480, y: 300 }; };
const LABEL_NUDGE = { FL: [12, 8], LA: [-8, 4], MI: [10, 14], CA: [-8, 6], ID: [0, 12], KY: [4, 3], VA: [6, 2], MD: [6, -4], NJ: [5, 2], NH: [0, 4], VT: [-1, -4], MA: [3, -1], CT: [0, 1], WV: [-2, 3], NY: [6, 2] };
const NO_LABEL = new Set(['DC', 'RI', 'DE']);
const hex = h => h.match(/\w\w/g).map(x => parseInt(x, 16));
function mix(a, b, t) { const pa = hex(a), pb = hex(b); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join(''); }

export function createMap(root, ctx) {
  const svg = el('svg', { class: 'mapsvg', preserveAspectRatio: 'xMidYMid meet' }, root);
  const canvas = document.createElement('canvas');
  canvas.id = 'fxcanvas';
  root.appendChild(canvas);
  const c2d = canvas.getContext('2d');
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#ff6b40" stroke-width="1.6" opacity=".55"/></pattern>
    <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#ffffff" fill-opacity=".07"/></pattern>
    <pattern id="nml" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#d9b566" stroke-width="1.2"/></pattern>
    <marker id="arrowhead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#e5484d"/></marker>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const world = el('g', {}, svg);
  el('rect', { x: -800, y: -600, width: 2600, height: 1900, fill: 'url(#dots)' }, world);
  const gCtx = el('g', {}, world);
  for (const k of ['canada', 'mexico', 'cuba', 'bahamas']) if (CONTEXT_LAND[k]) el('path', { d: CONTEXT_LAND[k], fill: '#111317', stroke: '#1d2027', 'stroke-width': .6 }, gCtx);
  const lab = (x, y, t, s = 13) => { const e = el('text', { x, y, 'font-size': s, fill: '#ffffff', 'fill-opacity': .1, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-weight': 700, 'letter-spacing': '8' }, gCtx); e.textContent = t; };
  lab(560, 40, 'CANADA', 15); lab(560, 640, 'MEXICO', 13);
  for (const [, c] of Object.entries(FOREIGN_CITIES)) {
    if (c.y < -60 || c.y > 700) continue;
    el('circle', { cx: c.x, cy: c.y, r: 1.3, fill: '#4d535c' }, gCtx);
    const t = el('text', { x: c.x + 3, y: c.y - 3, 'font-size': 6, fill: '#5c636e', 'font-family': 'Inter, sans-serif', 'font-weight': 500 }, gCtx); t.textContent = c.name;
  }
  const inset = el('g', {}, world);
  el('rect', { x: -60, y: 470, width: 405, height: 150, rx: 10, fill: '#0a0c10', stroke: '#22457a', 'stroke-opacity': .5, 'stroke-width': .8 }, inset);
  const it = el('text', { x: 336, y: 484, 'text-anchor': 'end', 'font-size': 6.5, fill: '#6f8fc8', 'font-family': 'Inter, sans-serif', 'font-weight': 700, 'letter-spacing': '1.4' }, inset);
  it.textContent = 'U.S. GOVERNMENT IN EXILE · ALASKA & HAWAII';
  // States
  const gStates = el('g', {}, world);
  const gHatch = el('g', { 'pointer-events': 'none' }, world);
  const paths = {}, hatch = {};
  for (const [ab, s] of Object.entries(SHAPE)) {
    paths[ab] = el('path', { d: s.d, class: 'st', 'data-st': ab, fill: '#1b1e24' }, gStates);
    hatch[ab] = el('path', { d: s.d, fill: 'url(#hatch)', opacity: 0 }, gHatch);
  }
  el('path', { d: STATE_BORDERS, fill: 'none', stroke: '#050608', 'stroke-width': .9, 'pointer-events': 'none' }, world);
  el('path', { d: NATION_OUTLINE, fill: 'none', stroke: '#ffffff', 'stroke-opacity': .16, 'stroke-width': 1, 'pointer-events': 'none' }, world);
  const nml = el('path', { d: CANADA_BORDER, fill: 'none', stroke: 'url(#nml)', 'stroke-width': 6, opacity: 0, 'pointer-events': 'none' }, world);
  const nmlLabel = el('text', { x: 300, y: 92, 'font-size': 6, fill: '#d9b566', opacity: 0, 'font-family': 'Inter, sans-serif', 'font-weight': 700, 'letter-spacing': '2', transform: 'rotate(3 300 92)' }, world);
  nmlLabel.textContent = "NO MAN'S LAND";
  // Roads: asphalt with a dashed centre line, under the railways.
  const gRoads = el('g', { 'pointer-events': 'none' }, world);
  const roadEls = ROADS.map(r => {
    const d = pathOf(r.pts), g = el('g', { class: 'road' }, gRoads);
    for (const c of ['r0', 'r1', 'r2']) el('path', { d, class: c }, g);
    return { ...r, g };
  });
  // Railways (RAIL_LINES[i] is RAILS[i] as a winding polyline): ballast, sleepers and two steel rails.
  const gRails = el('g', { 'pointer-events': 'none' }, world);
  const railEls = RAIL_LINES.map(r => {
    const g = el('g', { class: 'rail' }, gRails);
    el('path', { d: pathOf(r.pts), class: 'ballast' }, g); el('path', { d: pathOf(r.pts), class: 'sleepers' }, g);
    el('path', { d: pathOf(offsetLine(r.pts, 0.42)), class: 'steel' }, g); el('path', { d: pathOf(offsetLine(r.pts, -0.42)), class: 'steel' }, g);
    return { ...r, e: g };
  });
  const gSupply = el('g', { 'pointer-events': 'none' }, world);
  const gOps = el('g', { 'pointer-events': 'none' }, world);
  const gLabels = el('g', { 'pointer-events': 'none' }, world);
  for (const [ab, s] of Object.entries(SHAPE)) {
    if (NO_LABEL.has(ab)) continue;
    const n = LABEL_NUDGE[ab] || [0, 0];
    const t = el('text', { x: s.c[0] + n[0], y: s.c[1] + n[1] + 3, class: 'stlabel' }, gLabels); t.textContent = ab;
  }
  const gRealm = el('g', { 'pointer-events': 'none' }, world);
  const realm = el('text', { 'font-size': 15, fill: '#ffffff', 'fill-opacity': 0, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-weight': 800, 'letter-spacing': '9' }, gRealm);
  realm.textContent = 'REPUBLIC OF GILEAD';
  const la = el('text', { x: FOREIGN_CITIES.toronto.x - 4, y: FOREIGN_CITIES.toronto.y - 9, 'font-size': 6, fill: '#8fb1ff', opacity: 0, 'font-family': 'Inter, sans-serif', 'font-weight': 600 }, gRealm);
  la.textContent = 'Little America';
  const exileT = el('text', { x: CITY_POS.anchorage.x + 4, y: CITY_POS.anchorage.y + 10, 'font-size': 6, fill: '#8fb1ff', opacity: .8, 'font-family': 'Inter, sans-serif', 'font-weight': 600 }, gRealm);
  exileT.textContent = 'Government in exile';
  const gCities = el('g', {}, world);
  const cityEls = {};
  for (const [id, c] of Object.entries(CITY_POS)) {
    const meta = CITIES[id];
    const g = el('g', { class: 'city' + (meta?.rank === 3 ? ' cap' : ''), 'data-city': id, transform: `translate(${c.x} ${c.y})` }, gCities);
    const r = meta?.rank === 3 ? 2.2 : meta?.rank === 2 ? 1.7 : 1.3;
    el('circle', { r: r + 1.8, class: 'halo' }, g);
    el('circle', { r, class: 'dot' }, g);
    el('circle', { r: 10, class: 'hit' }, g);
    const t = el('text', { x: 4, y: -3.5 }, g); t.textContent = c.name;
    cityEls[id] = g;
  }
  const gXing = el('g', { 'pointer-events': 'none' }, world);
  const gBld = el('g', { class: 'blds' }, world);
  const gHint = el('g', { 'pointer-events': 'none' }, world);
  const gPins = el('g', {}, world);
  const gSel = el('g', { 'pointer-events': 'none' }, world);

  // ---------- View / pan / zoom ----------
  const vb = { x: -40, y: -20, w: 1040, h: 650 };
  let zoomedIn = false, labelsOn = null;
  const fit = () => {
    const r = root.getBoundingClientRect();
    vb.h = vb.w * r.height / Math.max(1, r.width);
    clampView();
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const z = 1040 / vb.w;
    svg.style.setProperty('--lz', (1 / Math.pow(Math.max(1, z), 0.7)).toFixed(3)); // labels grow slowly with zoom
    svg.classList.toggle('far', z < 1.3); // simpler roads and rails on the national view
    const on = z > 1.35;
    if (on !== labelsOn) { labelsOn = on; gCities.querySelectorAll('.city:not(.cap) text').forEach(t => { t.style.display = on ? '' : 'none'; }); }
    const zi = z > 1.45;
    if (zi !== zoomedIn) { zoomedIn = zi; lastSig.bld = ''; }
    sizeCanvas();
  };
  function clampView() {
    vb.w = Math.max(150, Math.min(1250, vb.w));
    vb.x = Math.max(-300, Math.min(1100 - vb.w * 0.3, vb.x));
    vb.y = Math.max(-250, Math.min(700 - vb.h * 0.3, vb.y));
  }
  let dpr = 1, cw = 0, ch = 0;
  function sizeCanvas() {
    const r = root.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (Math.round(r.width * dpr) !== canvas.width || Math.round(r.height * dpr) !== canvas.height) {
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    }
    cw = r.width; ch = r.height;
  }
  // world → canvas pixel transform (matches preserveAspectRatio meet)
  const view = () => { const s = Math.min(cw / vb.w, ch / vb.h); return { s, ox: (cw - vb.w * s) / 2 - vb.x * s, oy: (ch - vb.h * s) / 2 - vb.y * s }; };
  const toWorld = (px, py) => { const r = root.getBoundingClientRect(); const v = view(); return { x: (px - r.left - v.ox) / v.s, y: (py - r.top - v.oy) / v.s }; };
  const zoomAt = (px, py, f) => {
    const p = toWorld(px, py);
    const nw = Math.max(150, Math.min(1250, vb.w / f));
    const k = nw / vb.w;
    vb.x = p.x - (p.x - vb.x) * k; vb.y = p.y - (p.y - vb.y) * k; vb.w = nw;
    fit();
  };
  const pointers = new Map();
  let drag = null, pinch = null, downTarget = null, moved = false, lastTap = 0;
  svg.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; downTarget = e.target; moved = false; }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: vb.w };
      moved = true;
    }
  });
  svg.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const target = pinch.w * pinch.d / Math.max(10, d);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, vb.w / target);
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 9) moved = true;
      if (moved) { const s = view().s; vb.x = drag.vx - dx / s; vb.y = drag.vy - dy / s; fit(); }
    }
  });
  const up = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      if (!moved && downTarget && e.type === 'pointerup') {
        const now = performance.now();
        const t = downTarget.closest('[data-pin],[data-city],[data-st]');
        if (t?.dataset.pin) ctx.onPin(+t.dataset.pin);
        else if (t?.dataset.city) ctx.onCity(t.dataset.city);
        else if (t?.dataset.st) ctx.onState(t.dataset.st);
        else ctx.onEmpty?.();
        if (now - lastTap < 300 && !t) zoomAt(e.clientX, e.clientY, 1.8);
        lastTap = now;
      }
      drag = null; downTarget = null;
    } else if (pointers.size === 1) {
      const [p] = [...pointers.values()];
      drag = { x: p.x, y: p.y, vx: vb.x, vy: vb.y };
    }
  };
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  new ResizeObserver(fit).observe(root);
  fit();

  // ---------- Rendering (state) ----------
  let mode = 'auto', selected = null;
  const COL = { gilead: '#6a1a20', gilead2: '#5f171d', usa: '#1b2940', exile: '#22457a', none: '#1b1e24' };
  function stateFill(G, ab) {
    const s = G.st[ab];
    const m = mode === 'auto' ? (G.phase === 0 ? 'chapters' : 'control') : mode;
    if (m === 'chapters') return s.exile ? COL.exile : s.chapter <= 0 ? COL.none : s.chapter < 50 ? mix('2a261d', '8a6a1f', s.chapter / 50) : mix('8a6a1f', 'a3242b', (s.chapter - 50) / 50);
    if (m === 'infil') return STATES[ab].bases.length ? mix('1a1f29', '3b6fd6', s.infil / 100) : '#15171c';
    if (m === 'resist') return s.exile ? COL.exile : mix('1b1e24', 'e5484d', s.resist / 100);
    if (m === 'pop') return mix('15171c', 'd9b566', Math.min(1, Math.sqrt(STATES[ab].pop / 40)));
    if (s.exile) return COL.exile;
    if (s.hold >= 99.5) return ((ab.charCodeAt(0) + ab.charCodeAt(1)) % 2) ? COL.gilead : COL.gilead2;
    if (s.hold <= 0.5) return COL.usa;
    return mix('1b2940', '6a1a20', s.hold / 100);
  }
  const lastFill = {}, lastSig = { pins: '', bld: '', ops: '', hints: '', xing: '' };
  const bpos = new Map(); // building uid -> where its model stands (for planes and trains)
  let structs = [];      // depots and checkpoints, built into the railway / road
  const traffic = createTraffic();
  let hints = [];
  function render(G) {
    for (const ab of Object.keys(paths)) {
      const f = stateFill(G, ab);
      if (lastFill[ab] !== f) { paths[ab].setAttribute('fill', f); lastFill[ab] = f; }
      const s = G.st[ab];
      const contested = G.phase > 0 && !s.exile && s.hold > 0.5 && s.hold < 99.5;
      const ho = contested && (mode === 'auto' || mode === 'control') ? '0.8' : '0';
      if (hatch[ab].getAttribute('opacity') !== ho) hatch[ab].setAttribute('opacity', ho);
      paths[ab].classList.toggle('sel', selected === ab);
    }
    const nmlOn = G.decrees.d_nomansland != null || G.phase >= 3;
    nml.setAttribute('opacity', nmlOn ? 0.45 : 0); nmlLabel.setAttribute('opacity', nmlOn ? 0.75 : 0);
    if (G.phase > 0) {
      let sx = 0, sy = 0, n = 0;
      for (const [ab, s] of Object.entries(G.st)) if (s.hold >= 99.5 && !s.exile && SHAPE[ab]) { const w = Math.sqrt(STATES[ab].pop); sx += SHAPE[ab].c[0] * w; sy += SHAPE[ab].c[1] * w; n += w; }
      if (n) { realm.setAttribute('x', (sx / n).toFixed(0)); realm.setAttribute('y', (sy / n + 34).toFixed(0)); realm.setAttribute('fill-opacity', 0.09); }
      la.setAttribute('opacity', 0.85);
    } else { realm.setAttribute('fill-opacity', 0); la.setAttribute('opacity', 0); }
    for (const r of railEls) {
      const live = G.phase > 0 && isHeld(G, CITIES[r.a].st) && isHeld(G, CITIES[r.b].st);
      if (r.live !== live) { r.live = live; r.e.setAttribute('class', live ? 'rail live' : 'rail'); }
    }
    for (const r of roadEls) {
      const live = G.phase > 0 && isHeld(G, CITIES[r.a].st) && isHeld(G, CITIES[r.b].st);
      if (r.live !== live) { r.live = live; r.g.setAttribute('class', live ? 'road live' : 'road'); }
    }
    for (const [id, g] of Object.entries(cityEls)) {
      const meta = CITIES[id];
      g.classList.toggle('held', !!meta && G.phase > 0 && isHeld(G, meta.st));
    }
    // institutions (rebuilt only when they change): each stands on its own site around its city, inside the
    // city's state; checkpoints stand on the road where it crosses the state line.
    const bsig = (zoomedIn ? 'z' : 'o') + G.bld.map(b => b.uid + b.type + (b.slot ?? '') + (b.site || '') + (b.done == null ? 'd' : 'c')).join(',');
    if (bsig !== lastSig.bld) {
      lastSig.bld = bsig;
      gBld.textContent = '';
      bpos.clear();
      const hit = (b, x, y, data) => { const g = el('g', { class: 'bld', ...data }, gBld); el('circle', { cx: x, cy: y, r: 5, fill: 'transparent' }, g); };
      const drawModel = (g, b, x, y, size) => {
        const a = { x: x - size / 2, y: y - size * 40 / 52, width: size, height: size };
        if (b.done != null) { el('use', { href: `#m-${b.type}`, ...a, opacity: .4 }, g); el('use', { href: '#m-scaffold', ...a }, g); }
        else el('use', { href: `#m-${b.type}`, ...a }, g);
      };
      const place = [], next = {};
      structs = [];
      for (const b of G.bld) {
        let x, y, sc = 1;
        // checkpoints and rail depots are built into their road or track, oriented along it (drawn with the traffic)
        if (b.site && XING[b.site]) { const X = XING[b.site]; structs.push({ kind: 'checkpoint', uid: b.uid, x: X.x, y: X.y, ang: X.ang, road: X.road, s: X.s, building: b.done != null }); hit(b, X.x, X.y, { 'data-st': b.st }); continue; }
        if (b.type === 'depot' && DEPOT_SITES[b.city]) { const D = DEPOT_SITES[b.city]; structs.push({ kind: 'depot', uid: b.uid, city: b.city, x: D.x, y: D.y, ang: D.ang, rail: D.rail, s: D.s, building: b.done != null }); hit(b, D.x, D.y, { 'data-city': b.city }); continue; }
        {
          const sites = CITY_SITES[b.city] || [], c = CITY_POS[b.city];
          const slot = b.slot ?? (next[b.city] = (next[b.city] ?? 50) + 1);
          const st = sites.length ? sites[slot % sites.length] : null;
          // more institutions than sites (tiny Rhode Island): share a site, smaller and nudged, still inside the state
          const extra = slot >= sites.length ? (slot % 2 ? 1 : -1) : 0;
          if (st) { x = st[0] + extra * 1.3; y = st[1] + extra * 0.5; sc = (st[2] || 1) * (extra ? 0.72 : 1); } else { x = c.x + 7; y = c.y + 1; }
        }
        place.push({ b, x, y, size: (zoomedIn ? 15 : 16) * sc });
      }
      place.sort((p, q) => p.y - q.y);
      for (const p of place) {
        const g = el('g', { class: 'bld', ...(p.b.site ? { 'data-st': p.b.st } : { 'data-city': p.b.city }) }, gBld);
        drawModel(g, p.b, p.x, p.y, p.size);
        bpos.set(p.b.uid, p);
      }
    }
    traffic.sync(G, { roads: roadEls, rails: railEls, bpos, structs });
    // advisor highlights
    const zf = 1 / Math.pow(Math.max(1, 1040 / vb.w), 0.7); // markers grow slowly with zoom
    const hsig = hints.join(',') + '|' + zf.toFixed(2);
    if (hsig !== lastSig.hints) {
      lastSig.hints = hsig;
      gHint.textContent = '';
      hints.forEach((id, k) => {
        const c = CITY_POS[id] || XING[id]; if (!c) return;
        el('circle', { cx: c.x, cy: c.y, r: 7 * zf, class: 'hintring' }, gHint);
        el('circle', { cx: c.x, cy: c.y, r: 3.4 * zf, fill: '#d9b566', stroke: '#07080a', 'stroke-width': .6 * zf }, gHint);
        const t = el('text', { x: c.x, y: c.y + 1.5 * zf, 'text-anchor': 'middle', 'font-size': 4.2 * zf, 'font-weight': 800, 'font-family': 'JetBrains Mono, monospace', fill: '#1a1405' }, gHint); t.textContent = k + 1;
      });
    }
    // operations & supply lines
    const osig = G.ops.map(o => o.st + (supplied(G, o.st) ? 's' : '')).join(',') + '|' + Object.values(G.st).map(s => s.hold >= 99.5 ? 1 : 0).join('');
    if (osig !== lastSig.ops) {
      lastSig.ops = osig;
      gOps.textContent = ''; gSupply.textContent = '';
      for (const o of G.ops) {
        const to = centroidOf(o.st);
        let from = null, bd = 1e9;
        for (const n of NEIGH[o.st] || []) if (G.st[n]?.hold >= 99.5) { const c = centroidOf(n); const d = Math.hypot(c.x - to.x, c.y - to.y); if (d < bd) { bd = d; from = c; } }
        if (!from) from = { x: to.x - 30, y: to.y - 10 };
        const mx = (from.x + to.x) / 2 + (to.y - from.y) * 0.2, my = (from.y + to.y) / 2 - (to.x - from.x) * 0.2;
        el('path', { d: `M${from.x} ${from.y} Q${mx} ${my} ${to.x} ${to.y}`, class: 'oparrow' }, gOps);
        if (supplied(G, o.st)) {
          const dep = G.bld.filter(b => b.type === 'depot' && b.done == null).map(b => CITY_POS[b.city]).sort((a, b) => Math.hypot(a.x - to.x, a.y - to.y) - Math.hypot(b.x - to.x, b.y - to.y))[0];
          if (dep) el('path', { d: `M${dep.x} ${dep.y} L${to.x} ${to.y}`, class: 'supply' }, gSupply);
        }
      }
    }
    // pins
    const psig = G.events.queue.map(q => q.uid).join(',');
    if (psig !== lastSig.pins) {
      lastSig.pins = psig;
      gPins.textContent = '';
      const used = {};
      for (const q of G.events.queue) {
        const e = EVENT_BY_ID[q.id];
        let p = CITY_POS[q.loc] || (SHAPE[q.loc] ? centroidOf(q.loc) : CITY_POS.dc);
        const k = Math.round(p.x) + ',' + Math.round(p.y);
        const n = used[k] = (used[k] || 0) + 1;
        p = { x: p.x + (n - 1) * 14, y: p.y - 13 };
        const g = el('g', { class: 'pin' + (e.urgent ? ' urgent' : ''), 'data-pin': q.uid, transform: `translate(${p.x} ${p.y})` }, gPins);
        el('circle', { r: 7, class: 'ring' }, g);
        el('path', { d: 'M-3 6 L0 11 L3 6Z', fill: e.urgent ? '#e5484d' : '#d9b566' }, g);
        el('circle', { r: 7.4, class: 'disc' }, g);
        useIcon(e.icon, 0, 0, 8.4, g);
        el('circle', { r: 13, class: 'hit' }, g);
      }
    }
    // the selected state's road crossings: where checkpoints can stand
    const xsig = (SHAPE[selected] && G.phase > 0 && G.decrees.d_checkpoints != null ? selected : '') + '|' + G.bld.filter(b => b.site).length + '|' + (1040 / vb.w).toFixed(1);
    if (xsig !== lastSig.xing) {
      lastSig.xing = xsig;
      gXing.textContent = '';
      if (xsig[0] !== '|') {
        const zs = 1 / Math.pow(Math.max(1, 1040 / vb.w), 0.6);
        for (const x of CROSSINGS) if ((x.a === selected || x.b === selected) && !G.bld.some(b => b.site === x.id)) {
          el('path', { d: `M${x.x} ${x.y - 3.2 * zs}L${x.x + 3.2 * zs} ${x.y}L${x.x} ${x.y + 3.2 * zs}L${x.x - 3.2 * zs} ${x.y}Z`, class: 'xmark', 'stroke-width': 0.7 * zs }, gXing);
        }
      }
    }
    // selection marker
    gSel.textContent = '';
    if (selected && CITY_POS[selected]) {
      const c = CITY_POS[selected];
      const zs = 1 / Math.pow(Math.max(1, 1040 / vb.w), 0.6);
      el('circle', { cx: c.x, cy: c.y, r: 11 * zs, fill: 'none', stroke: '#fff', 'stroke-width': zs, 'stroke-dasharray': `${2.5 * zs} ${2 * zs}`, opacity: .8 }, gSel);
    }
  }

  // ---------- Canvas FX ----------
  let t = 0;
  const live = [];
  const spawnBoom = (x, y, size = 1, delay = 0) => live.push({ kind: 'boom', x, y, size, age: -delay, life: 1.1 });
  function consumeFx(G) {
    if (!G.fx || !G.fx.length) return;
    for (const f of G.fx.splice(0)) {
      const to = f.st ? centroidOf(f.st) : f.city ? CITY_POS[f.city] : null;
      if (f.kind === 'airstrike' && to) {
        const from = CITY_POS[f.from] || { x: to.x - 120, y: to.y - 60 };
        live.push({ kind: 'plane', from, to, age: 0, life: 1.8 });
        for (let i = 0; i < 6; i++) spawnBoom(to.x + (Math.random() - .5) * 26, to.y + (Math.random() - .5) * 20, 0.9 + Math.random() * .6, 1.6 + i * 0.12);
        ctx.sfx?.('airstrike');
      } else if (f.kind === 'drone' && to) {
        const from = CITY_POS[f.from] || { x: to.x - 80, y: to.y - 40 };
        live.push({ kind: 'drone', from, to, age: 0, life: 1.4 });
        spawnBoom(to.x, to.y, 0.6, 1.35);
        ctx.sfx?.('drone');
      } else if (f.kind === 'annex' && to) {
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: '229,72,77', age: 0, life: 1.8, r: 46 });
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: '217,181,102', age: -0.3, life: 1.8, r: 36 });
      } else if (f.kind === 'lost' && to) {
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: '91,141,239', age: 0, life: 1.8, r: 46 });
      } else if (f.kind === 'coup') {
        const dc = CITY_POS.dc;
        live.push({ kind: 'flash', age: 0, life: 1.2 });
        for (let i = 0; i < 3; i++) spawnBoom(dc.x + (i - 1) * 6, dc.y + (i % 2) * 4, 2.2, i * 0.5);
        ctx.sfx?.('coup');
      } else if (f.kind === 'built' && to) {
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: '217,181,102', age: 0, life: 1.0, r: 18 });
      } else if ((f.kind === 'pulse' || f.kind === 'offensive') && to) {
        const col = f.color === '#4a6fa5' ? '91,141,239' : f.color === '#c9a227' ? '217,181,102' : '229,72,77';
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: col, age: 0, life: 1.0, r: 30 });
      }
    }
  }
  function frame(dt, G, running) {
    if (running) t += dt;
    consumeFx(G);
    if (!cw) sizeCanvas();
    const v = view();
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    c2d.clearRect(0, 0, cw, ch);
    c2d.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.ox, dpr * v.oy);
    const px = 1 / v.s; // one screen pixel in world units
    if (G.phase > 0) {
      // Cars, trains and planes (3D, drawn back to front)
      traffic.frame(c2d, dt, running, v.s);
      c2d.globalCompositeOperation = 'lighter';
      // Front lines: ember glow + artillery flashes
      for (const [ab, s] of Object.entries(G.st)) {
        if (s.exile || !(s.hold > 0.5 && s.hold < 99.5)) continue;
        const c = centroidOf(ab);
        const pulse = 0.75 + Math.sin(t * 3 + c.x) * 0.25;
        const rg = c2d.createRadialGradient(c.x, c.y + 4, 0, c.x, c.y + 4, 18);
        rg.addColorStop(0, `rgba(255,98,50,${0.35 * pulse})`); rg.addColorStop(1, 'rgba(255,98,50,0)');
        c2d.fillStyle = rg; c2d.beginPath(); c2d.arc(c.x, c.y + 4, 18, 0, 7); c2d.fill();
        if (running && Math.random() < dt * 1.1) live.push({ kind: 'boom', x: c.x + (Math.random() - .5) * 40, y: c.y + (Math.random() - .5) * 30, size: 0.35 + Math.random() * 0.3, age: 0, life: 0.7 });
      }
      c2d.globalCompositeOperation = 'source-over';
      // Helicopters
      const spots = [];
      for (const [ab, s] of Object.entries(G.st)) if (s.heli) spots.push({ c: centroidOf(ab), r: 16 });
      if (M(G, 'heli')) for (const b of G.bld) if (b.type === 'airfield' && b.done == null) spots.push({ c: CITY_POS[b.city], r: 22 });
      spots.forEach((h, i) => {
        const a = t * 0.5 + i * 1.7;
        const x = h.c.x + Math.cos(a) * h.r, y = h.c.y + Math.sin(a) * h.r * 0.7;
        c2d.save(); c2d.translate(x, y); c2d.rotate(a + Math.PI / 2);
        c2d.fillStyle = '#d9dde3'; c2d.beginPath(); c2d.ellipse(0, 0, 2.2, 1.1, 0, 0, 7); c2d.fill();
        c2d.fillRect(-5, -0.3, 3.2, 0.6);
        c2d.rotate(t * 25); c2d.strokeStyle = 'rgba(230,234,240,.55)'; c2d.lineWidth = .5; c2d.beginPath(); c2d.moveTo(-3.6, 0); c2d.lineTo(3.6, 0); c2d.moveTo(0, -3.6); c2d.lineTo(0, 3.6); c2d.stroke();
        c2d.restore();
        if ((t * 2 + i) % 1 < .5) { c2d.fillStyle = '#ff4d4d'; c2d.beginPath(); c2d.arc(x, y, .6, 0, 7); c2d.fill(); }
      });
    }
    // transient effects
    for (let i = live.length - 1; i >= 0; i--) {
      const a = live[i];
      a.age += dt;
      if (a.age > a.life) { live.splice(i, 1); continue; }
      if (a.age < 0) continue;
      const p = a.age / a.life;
      if (a.kind === 'boom') {
        c2d.globalCompositeOperation = 'lighter';
        const r = (3 + p * 13) * a.size;
        const g = c2d.createRadialGradient(a.x, a.y, 0, a.x, a.y, r);
        g.addColorStop(0, `rgba(255,246,210,${1 - p})`); g.addColorStop(.35, `rgba(255,170,60,${0.9 * (1 - p)})`); g.addColorStop(1, 'rgba(229,72,77,0)');
        c2d.fillStyle = g; c2d.beginPath(); c2d.arc(a.x, a.y, r, 0, 7); c2d.fill();
        c2d.globalCompositeOperation = 'source-over';
        c2d.fillStyle = `rgba(40,40,44,${(1 - p) * 0.35})`; c2d.beginPath(); c2d.arc(a.x, a.y - p * 6 * a.size, (2 + p * 9) * a.size, 0, 7); c2d.fill();
      } else if (a.kind === 'ripple') {
        c2d.strokeStyle = `rgba(${a.color},${1 - p})`; c2d.lineWidth = (2.2 * (1 - p) + .3);
        c2d.beginPath(); c2d.arc(a.x, a.y, 4 + p * (a.r || 40), 0, 7); c2d.stroke();
      } else if (a.kind === 'plane' || a.kind === 'drone') {
        const q = Math.min(1, p * 1.08);
        const x = a.from.x + (a.to.x - a.from.x) * q, y = a.from.y + (a.to.y - a.from.y) * q - Math.sin(q * Math.PI) * 25;
        const ang = Math.atan2(a.to.y - a.from.y, a.to.x - a.from.x);
        c2d.save(); c2d.translate(x, y); c2d.rotate(ang);
        if (a.kind === 'plane') {
          const g = c2d.createLinearGradient(0, 0, -34, 0); g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          c2d.strokeStyle = g; c2d.lineWidth = 1.4; c2d.beginPath(); c2d.moveTo(-6, 0); c2d.lineTo(-34, 0); c2d.stroke();
          c2d.fillStyle = '#e9ecf0'; c2d.beginPath(); c2d.moveTo(6, 0); c2d.lineTo(-4, -5); c2d.lineTo(-2, 0); c2d.lineTo(-4, 5); c2d.closePath(); c2d.fill();
        } else {
          c2d.fillStyle = '#b8bec8'; c2d.beginPath(); c2d.moveTo(4, 0); c2d.lineTo(-3, -3); c2d.lineTo(-1.5, 0); c2d.lineTo(-3, 3); c2d.closePath(); c2d.fill();
        }
        c2d.restore();
        if (a.kind === 'drone' && p > 0.88) { c2d.strokeStyle = 'rgba(229,72,77,.8)'; c2d.lineWidth = .7; c2d.beginPath(); c2d.moveTo(x, y); c2d.lineTo(a.to.x, a.to.y); c2d.stroke(); }
      } else if (a.kind === 'flash') {
        c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        c2d.fillStyle = `rgba(255,255,255,${(1 - p) * 0.55})`; c2d.fillRect(0, 0, cw, ch);
        c2d.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.ox, dpr * v.oy);
      }
    }
    void px;
  }

  return {
    render, frame,
    setMode(m) { mode = m; for (const k in lastFill) delete lastFill[k]; },
    getMode: () => mode,
    select(id) { selected = id; },
    highlight(ids = []) { hints = ids; },
    // Pan so a state/city isn't hidden under a panel docked on the right (rightPad screen px).
    ensureVisible(id, rightPad = 0) {
      const c = CITY_POS[id] || (SHAPE[id] ? centroidOf(id) : null);
      if (!c) return;
      const v = view(); const sx = c.x * v.s + v.ox;
      const limit = cw - rightPad - 40;
      if (sx > limit) { vb.x += (sx - limit) / v.s + (cw - rightPad) * 0.15 / v.s; fit(); }
    },
    zoom(f) { const r = root.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); },
    reset() { vb.x = -40; vb.y = -20; vb.w = 1040; fit(); },
    focus(ab) { const c = CITY_POS[ab] || centroidOf(ab); vb.w = 420; const r = root.getBoundingClientRect(); vb.h = vb.w * r.height / r.width; vb.x = c.x - vb.w / 2; vb.y = c.y - vb.h / 2; fit(); },
  };
}
