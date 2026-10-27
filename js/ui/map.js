// The war-room map: SVG states, rails, cities, institutions, event pins and live animations
// (trains, helicopters, air and drone strikes, front-line fire). Pan with one finger, pinch to zoom.
import { STATE_SHAPES, STATE_BORDERS, NATION_OUTLINE, CONTEXT_LAND, CITY_POS, FOREIGN_CITIES, CANADA_BORDER } from '../data/geo.js';
import { STATES, CITIES, RAILS, FIPS_TO_ABBR } from '../data/states.js';
import { BUILDINGS } from '../data/buildings.js';
import { EVENT_BY_ID } from '../data/events.js';
import { isHeld, M } from '../engine/core.js';
import { supplied, airfieldFor } from '../engine/actions.js';
import { NEIGH } from '../engine/sim.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const SHAPE = Object.fromEntries(STATE_SHAPES.map(s => [FIPS_TO_ABBR[s.id], s]));
export const centroidOf = ab => { const s = SHAPE[ab]; return s ? { x: s.c[0], y: s.c[1] } : { x: 480, y: 300 }; };
const LABEL_NUDGE = { FL: [12, 8], LA: [-8, 4], MI: [10, 14], CA: [-8, 6], ID: [0, 12], KY: [4, 3], VA: [6, 2], MD: [6, -4], NJ: [5, 2], NH: [0, 4], VT: [-1, -4], MA: [3, -1], CT: [0, 1], WV: [-2, 3], NY: [6, 2] };
const NO_LABEL = new Set(['DC', 'RI', 'DE']);

function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map(x => parseInt(x, 16)), pb = b.match(/\w\w/g).map(x => parseInt(x, 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

export function createMap(root, ctx) {
  const svg = el('svg', { preserveAspectRatio: 'xMidYMid meet' }, root);
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="none"/><line x1="0" y1="0" x2="0" y2="6" stroke="#ff5a3c" stroke-width="2.2" opacity=".55"/></pattern>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 L0 0 0 40" fill="none" stroke="#ffffff" stroke-opacity=".035" stroke-width=".6"/></pattern>
    <pattern id="nml" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#c9a227" stroke-width="1.4" opacity=".8"/></pattern>
    <marker id="arrowhead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#d6312f"/></marker>
    <radialGradient id="boom"><stop offset="0" stop-color="#fff6c8"/><stop offset=".35" stop-color="#ffb02e"/><stop offset=".7" stop-color="#d6312f" stop-opacity=".7"/><stop offset="1" stop-color="#5c0b0e" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowR"><stop offset="0" stop-color="#ff4a2a" stop-opacity=".55"/><stop offset="1" stop-color="#ff4a2a" stop-opacity="0"/></radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
    <filter id="inner"><feOffset dy="1"/><feGaussianBlur stdDeviation="1.6" result="o"/><feComposite in="SourceGraphic" in2="o" operator="over"/></filter>`;
  const world = el('g', {}, svg);
  el('rect', { x: -800, y: -600, width: 2600, height: 1900, fill: 'url(#grid)' }, world);
  const gCtx = el('g', {}, world);
  for (const k of ['canada', 'mexico', 'cuba', 'bahamas']) if (CONTEXT_LAND[k]) el('path', { d: CONTEXT_LAND[k], fill: '#1d1b19', stroke: '#2e2a26', 'stroke-width': .6 }, gCtx);
  const lab = (x, y, t, s = 13) => { const e = el('text', { x, y, 'font-size': s, fill: '#ffffff', 'fill-opacity': .14, 'text-anchor': 'middle', 'font-family': 'Fell, serif', 'letter-spacing': '6' }, gCtx); e.textContent = t; };
  lab(560, 40, 'C A N A D A', 18); lab(560, 640, 'M E X I C O', 16);
  for (const [, c] of Object.entries(FOREIGN_CITIES)) {
    if (c.y < -60 || c.y > 700) continue;
    el('circle', { cx: c.x, cy: c.y, r: 1.6, fill: '#6b655c' }, gCtx);
    const t = el('text', { x: c.x + 3, y: c.y - 3, 'font-size': 6.5, fill: '#8a8378', 'font-family': 'Inter' }, gCtx); t.textContent = c.name;
  }
  // Inset frame for the government in exile
  const inset = el('g', {}, world);
  el('rect', { x: -60, y: 470, width: 405, height: 150, rx: 6, fill: '#0d1013', stroke: '#2b3b55', 'stroke-width': 1 }, inset);
  const it = el('text', { x: -52, y: 484, 'font-size': 7.5, fill: '#6f8ab8', 'font-family': 'Inter', 'letter-spacing': '1.2' }, inset);
  it.textContent = 'U.S. GOVERNMENT IN EXILE · ALASKA & HAWAII';
  // States
  const gStates = el('g', {}, world);
  const gHatch = el('g', { 'pointer-events': 'none' }, world);
  const paths = {}, hatch = {};
  for (const [ab, s] of Object.entries(SHAPE)) {
    paths[ab] = el('path', { d: s.d, class: 'st', 'data-st': ab, fill: '#2a2724' }, gStates);
    hatch[ab] = el('path', { d: s.d, fill: 'url(#hatch)', opacity: 0 }, gHatch);
  }
  el('path', { d: STATE_BORDERS, fill: 'none', stroke: '#0b0a09', 'stroke-width': .8, 'pointer-events': 'none' }, world);
  el('path', { d: NATION_OUTLINE, fill: 'none', stroke: '#c9a227', 'stroke-opacity': .25, 'stroke-width': 1.2, 'pointer-events': 'none' }, world);
  const nml = el('path', { d: CANADA_BORDER, fill: 'none', stroke: 'url(#nml)', 'stroke-width': 7, opacity: 0, 'pointer-events': 'none' }, world);
  const nmlLabel = el('text', { x: 300, y: 92, 'font-size': 7, fill: '#c9a227', opacity: 0, 'font-family': 'Inter', 'letter-spacing': '2', transform: 'rotate(3 300 92)' }, world);
  nmlLabel.textContent = "NO MAN'S LAND";
  const gRails = el('g', { 'pointer-events': 'none' }, world);
  const railEls = RAILS.map(([a, b]) => ({ a, b, e: el('line', { x1: CITY_POS[a].x, y1: CITY_POS[a].y, x2: CITY_POS[b].x, y2: CITY_POS[b].y, class: 'rail' }, gRails) }));
  const gSupply = el('g', { 'pointer-events': 'none' }, world);
  const gOps = el('g', { 'pointer-events': 'none' }, world);
  const gLabels = el('g', { 'pointer-events': 'none' }, world);
  for (const [ab, s] of Object.entries(SHAPE)) {
    if (NO_LABEL.has(ab)) continue;
    const n = LABEL_NUDGE[ab] || [0, 0];
    const t = el('text', { x: s.c[0] + n[0], y: s.c[1] + n[1] + 3, class: 'stlabel' }, gLabels); t.textContent = ab;
  }
  const gFire = el('g', { 'pointer-events': 'none' }, world);
  const gCities = el('g', {}, world);
  const cityEls = {};
  for (const [id, c] of Object.entries(CITY_POS)) {
    const meta = CITIES[id];
    const g = el('g', { class: 'city' + (meta?.rank === 3 ? ' cap' : ''), 'data-city': id, transform: `translate(${c.x} ${c.y})` }, gCities);
    el('circle', { r: meta?.rank === 3 ? 2.6 : meta?.rank === 2 ? 2 : 1.5 }, g);
    el('circle', { r: 9, class: 'hit' }, g); // touch target
    const t = el('text', { x: 3.5, y: -3 }, g); t.textContent = c.name;
    cityEls[id] = g;
  }
  const gBld = el('g', { 'pointer-events': 'none' }, world);
  const gUnits = el('g', { 'pointer-events': 'none' }, world);
  const gFx = el('g', { 'pointer-events': 'none' }, world);
  const gPins = el('g', {}, world);
  const gSel = el('g', { 'pointer-events': 'none' }, world);

  // ---------- View / pan / zoom ----------
  const vb = { x: -40, y: -20, w: 1040, h: 650 };
  const fit = () => {
    const r = root.getBoundingClientRect();
    const asp = r.height / Math.max(1, r.width);
    vb.h = vb.w * asp;
    clampView();
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const z = 1040 / vb.w;
    gCities.style.setProperty('--z', z);
    root.classList.toggle('zoomed', z > 1.7);
    gCities.querySelectorAll('text').forEach(t => { t.style.display = z > 1.35 || t.parentNode.classList.contains('cap') ? '' : 'none'; });
  };
  function clampView() {
    vb.w = Math.max(150, Math.min(1250, vb.w));
    vb.x = Math.max(-300, Math.min(1100 - vb.w * 0.3, vb.x));
    vb.y = Math.max(-250, Math.min(700 - vb.h * 0.3, vb.y));
  }
  const toWorld = (px, py) => { const r = root.getBoundingClientRect(); const s = vb.w / r.width; const sy = vb.h / r.height; const k = Math.max(s, sy);
    const ox = (r.width * k - vb.w) / 2, oy = (r.height * k - vb.h) / 2; return { x: vb.x - ox + (px - r.left) * k, y: vb.y - oy + (py - r.top) * k }; };
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
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: vb.w, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
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
      if (Math.hypot(dx, dy) > 7) moved = true;
      if (moved) {
        const r = root.getBoundingClientRect();
        const k = Math.max(vb.w / r.width, vb.h / r.height);
        vb.x = drag.vx - dx * k; vb.y = drag.vy - dy * k; fit();
      }
    }
  });
  const up = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      if (!moved && downTarget) {
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

  // ---------- Rendering ----------
  let mode = 'auto', selected = null;
  const COL = { gilead: '#7a1419', gilead2: '#8e1a20', usa: '#22385a', exile: '#1d3a6a', neutral: '#2a2724' };
  function stateFill(G, ab) {
    const s = G.st[ab];
    const m = mode === 'auto' ? (G.phase === 0 ? 'chapters' : 'control') : mode;
    if (m === 'chapters') return s.chapter <= 0 ? '#26231f' : s.chapter < 50 ? mix('3a3326', 'a07d1e', s.chapter / 50) : mix('a07d1e', '8e1a20', (s.chapter - 50) / 50);
    if (m === 'infil') return STATES[ab].bases.length ? mix('1f2530', '3f72c0', s.infil / 100) : '#1e1c1a';
    if (m === 'resist') return s.exile ? COL.exile : mix('2a2724', 'd6503f', s.resist / 100);
    if (m === 'pop') return mix('1e1c1a', 'c9a227', Math.min(1, Math.sqrt(STATES[ab].pop / 40)));
    if (s.exile) return COL.exile;
    if (s.hold >= 99.5) return ((ab.charCodeAt(0) + ab.charCodeAt(1)) % 2) ? COL.gilead : COL.gilead2;
    if (s.hold <= 0.5) return COL.usa;
    return mix('22385a', '7a1419', s.hold / 100);
  }
  const lastFill = {};
  function render(G) {
    for (const ab of Object.keys(paths)) {
      const f = stateFill(G, ab);
      if (lastFill[ab] !== f) { paths[ab].setAttribute('fill', f); lastFill[ab] = f; }
      const s = G.st[ab];
      const contested = G.phase > 0 && !s.exile && s.hold > 0.5 && s.hold < 99.5;
      hatch[ab].setAttribute('opacity', contested && (mode === 'auto' || mode === 'control') ? 0.75 : 0);
      paths[ab].classList.toggle('sel', selected === ab);
    }
    const nmlOn = G.decrees.d_nomansland != null || G.phase >= 3;
    nml.setAttribute('opacity', nmlOn ? 0.55 : 0); nmlLabel.setAttribute('opacity', nmlOn ? 0.7 : 0);
    // rails
    for (const r of railEls) {
      const live = G.phase > 0 && isHeld(G, CITIES[r.a].st) && isHeld(G, CITIES[r.b].st);
      r.live = live;
      r.e.setAttribute('class', live ? 'rail live' : 'rail');
    }
    // cities
    for (const [id, g] of Object.entries(cityEls)) {
      const meta = CITIES[id];
      g.classList.toggle('held', !!meta && G.phase > 0 && isHeld(G, meta.st));
      g.classList.toggle('selc', selected === id);
    }
    // buildings
    gBld.textContent = '';
    const byCity = {};
    for (const b of G.bld) (byCity[b.city] || (byCity[b.city] = [])).push(b);
    for (const [city, list] of Object.entries(byCity)) {
      const c = CITY_POS[city];
      list.slice(0, 8).forEach((b, i) => {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / Math.min(8, list.length + (list.length < 3 ? 2 : 0)));
        const x = c.x + Math.cos(a) * 8.5, y = c.y + Math.sin(a) * 8.5;
        el('circle', { cx: x, cy: y, r: 4, fill: BUILDINGS[b.type].color, stroke: b.done != null ? '#c9a227' : '#000', 'stroke-width': .6, 'stroke-dasharray': b.done != null ? '1.5 1' : '' }, gBld);
        const t = el('text', { x, y: y + .3, class: 'bldicon' }, gBld); t.textContent = BUILDINGS[b.type].icon;
      });
    }
    // operations & supply lines
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
    // pins
    gPins.textContent = '';
    const used = {};
    for (const q of G.events.queue) {
      const e = EVENT_BY_ID[q.id];
      let p = CITY_POS[q.loc] || (SHAPE[q.loc] ? centroidOf(q.loc) : CITY_POS.dc);
      const k = Math.round(p.x) + ',' + Math.round(p.y);
      const n = used[k] = (used[k] || 0) + 1;
      p = { x: p.x + (n - 1) * 13, y: p.y - 12 };
      const g = el('g', { class: 'pin' + (e.urgent ? ' urgent' : ''), 'data-pin': q.uid, transform: `translate(${p.x} ${p.y})` }, gPins);
      el('circle', { r: 7, class: 'ring' }, g);
      el('path', { d: 'M0 13 L-4 5 L4 5Z', fill: e.urgent ? '#ff3b30' : '#c9a227' }, g);
      el('circle', { r: 7.5, class: 'disc' }, g);
      const t = el('text', { y: .5 }, g); t.textContent = e.icon || '!';
      el('circle', { r: 13, class: 'hit' }, g);
    }
    // selection marker
    gSel.textContent = '';
    if (selected && CITY_POS[selected]) {
      const c = CITY_POS[selected];
      el('circle', { cx: c.x, cy: c.y, r: 12, fill: 'none', stroke: '#c9a227', 'stroke-width': 1.2, 'stroke-dasharray': '3 2' }, gSel);
    }
    G._mapRendered = true;
  }

  // ---------- Animation ----------
  let t = 0;
  const live = []; // transient animations
  const trains = [], helis = [];
  function spawnExplosion(x, y, size = 1, delay = 0) {
    live.push({ kind: 'boom', x, y, size, age: -delay, life: 1.1 });
  }
  function consumeFx(G) {
    if (!G.fx || !G.fx.length) return;
    const list = G.fx.splice(0);
    for (const f of list) {
      const to = f.st ? centroidOf(f.st) : f.city ? CITY_POS[f.city] : null;
      if (f.kind === 'airstrike' && to) {
        const from = CITY_POS[f.from] || { x: to.x - 120, y: to.y - 60 };
        live.push({ kind: 'plane', from, to, age: 0, life: 1.8 });
        for (let i = 0; i < 6; i++) spawnExplosion(to.x + (Math.random() - .5) * 26, to.y + (Math.random() - .5) * 20, 0.9 + Math.random() * .6, 1.6 + i * 0.12);
        ctx.sfx?.('airstrike');
      } else if (f.kind === 'drone' && to) {
        const from = CITY_POS[f.from] || { x: to.x - 80, y: to.y - 40 };
        live.push({ kind: 'drone', from, to, age: 0, life: 1.4 });
        spawnExplosion(to.x, to.y, 0.6, 1.35);
        ctx.sfx?.('drone');
      } else if (f.kind === 'annex' && to) {
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: '#d6312f', age: 0, life: 1.6 });
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: '#c9a227', age: -0.3, life: 1.6 });
      } else if (f.kind === 'lost' && to) {
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: '#4a78c0', age: 0, life: 1.8 });
      } else if (f.kind === 'coup') {
        const dc = CITY_POS.dc;
        live.push({ kind: 'flash', age: 0, life: 1.2 });
        for (let i = 0; i < 3; i++) spawnExplosion(dc.x + (i - 1) * 6, dc.y + (i % 2) * 4, 2.2, i * 0.5);
        ctx.sfx?.('coup');
      } else if (f.kind === 'built' && to) {
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: '#c9a227', age: 0, life: 1.0, r: 18 });
      } else if ((f.kind === 'pulse' || f.kind === 'offensive') && to) {
        live.push({ kind: 'ripple', x: to.x, y: to.y, color: f.color || '#d6312f', age: 0, life: 1.0, r: 30 });
      }
    }
  }
  const unitEls = new Map();
  function unit(key, make) {
    let u = unitEls.get(key);
    if (!u) { u = make(); unitEls.set(key, u); gUnits.appendChild(u); }
    u._seen = true;
    return u;
  }
  function frame(dt, G, running) {
    if (running) t += dt;
    consumeFx(G);
    for (const u of unitEls.values()) u._seen = false;
    if (G.phase > 0) {
      // Trains on live rails
      let n = 0;
      railEls.forEach((r, i) => {
        if (!r.live || n >= 16 || i % 2) return;
        n++;
        const A = CITY_POS[r.a], B = CITY_POS[r.b];
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        let p = ((t * 14 / len) + i * 0.37) % 2; if (p > 1) p = 2 - p;
        const x = A.x + (B.x - A.x) * p, y = A.y + (B.y - A.y) * p;
        const ang = Math.atan2(B.y - A.y, B.x - A.x) * 180 / Math.PI;
        const u = unit('tr' + i, () => { const g = el('g'); el('rect', { x: -5, y: -1.3, width: 3.2, height: 2.6, rx: .5, fill: '#2a2a2a', stroke: '#c9a227', 'stroke-width': .35 }, g); el('rect', { x: -1.5, y: -1.3, width: 3.2, height: 2.6, rx: .5, fill: '#3a3a3a', stroke: '#c9a227', 'stroke-width': .35 }, g); el('rect', { x: 2, y: -1.4, width: 3.6, height: 2.8, rx: .8, fill: '#7a1419', stroke: '#c9a227', 'stroke-width': .35 }, g); return g; });
        u.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(0)})`);
      });
      // Helicopters: state patrols + airfield circuits
      const heliSpots = [];
      for (const [ab, s] of Object.entries(G.st)) if (s.heli) heliSpots.push({ k: 'h' + ab, c: centroidOf(ab), r: 16 });
      if (M(G, 'heli')) for (const b of G.bld) if (b.type === 'airfield' && b.done == null) heliSpots.push({ k: 'ha' + b.uid, c: CITY_POS[b.city], r: 22 });
      heliSpots.forEach((h, i) => {
        const a = t * 0.5 + i * 1.7;
        const x = h.c.x + Math.cos(a) * h.r, y = h.c.y + Math.sin(a) * h.r * 0.7;
        const u = unit(h.k, () => { const g = el('g'); el('ellipse', { rx: 2.6, ry: 1.3, fill: '#1a1a1a', stroke: '#9aa', 'stroke-width': .3 }, g); el('rect', { x: -6, y: -.35, width: 4, height: .7, fill: '#1a1a1a' }, g); const rot = el('line', { x1: -4, y1: 0, x2: 4, y2: 0, stroke: '#ccc', 'stroke-width': .5, class: 'rotor' }, g); g._rot = rot; el('circle', { cx: 0, cy: 3, r: .7, fill: '#ff3b30', class: 'beacon' }, g); return g; });
        u.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a * 180 / Math.PI + 90).toFixed(0)})`);
        u._rot.setAttribute('transform', `rotate(${(t * 1400) % 360})`);
      });
      // Front-line fires
      for (const [ab, s] of Object.entries(G.st)) {
        if (s.exile || !(s.hold > 0.5 && s.hold < 99.5)) continue;
        const c = centroidOf(ab);
        const u = unit('f' + ab, () => { const g = el('g'); el('circle', { r: 14, fill: 'url(#glowR)' }, g); for (let k = 0; k < 3; k++) el('path', { d: 'M0 0 Q-1.6 -2.5 0 -5 Q1.6 -2.5 0 0Z', fill: k ? '#ffb02e' : '#ff4a2a', transform: `translate(${(k - 1) * 3} ${k % 2 * 2})`, class: 'flame' }, g); return g; });
        const fl = 0.85 + Math.sin(t * 9 + c.x) * 0.15;
        u.setAttribute('transform', `translate(${c.x + 4} ${c.y + 6}) scale(${fl.toFixed(2)})`);
        if (running && Math.random() < dt * 0.9) live.push({ kind: 'boom', x: c.x + (Math.random() - .5) * 40, y: c.y + (Math.random() - .5) * 30, size: 0.35 + Math.random() * 0.3, age: 0, life: 0.7 });
      }
    }
    for (const [k, u] of unitEls) if (!u._seen) { u.remove(); unitEls.delete(k); }
    // transient effects
    gFx.textContent = '';
    for (let i = live.length - 1; i >= 0; i--) {
      const a = live[i];
      a.age += dt;
      if (a.age > a.life) { live.splice(i, 1); continue; }
      if (a.age < 0) continue;
      const p = a.age / a.life;
      if (a.kind === 'boom') {
        el('circle', { cx: a.x, cy: a.y, r: (3 + p * 12) * a.size, fill: 'url(#boom)', opacity: 1 - p }, gFx);
        el('circle', { cx: a.x, cy: a.y - p * 6 * a.size, r: (2 + p * 9) * a.size, fill: '#333', opacity: (1 - p) * 0.35 }, gFx);
      } else if (a.kind === 'ripple') {
        el('circle', { cx: a.x, cy: a.y, r: 4 + p * (a.r || 40), fill: 'none', stroke: a.color, 'stroke-width': 2 * (1 - p) + .3, opacity: 1 - p }, gFx);
      } else if (a.kind === 'plane' || a.kind === 'drone') {
        const q = Math.min(1, p * (a.kind === 'plane' ? 1.1 : 1.05));
        const x = a.from.x + (a.to.x - a.from.x) * q, y = a.from.y + (a.to.y - a.from.y) * q - Math.sin(q * Math.PI) * 25;
        const ang = Math.atan2(a.to.y - a.from.y, a.to.x - a.from.x) * 180 / Math.PI;
        const g = el('g', { transform: `translate(${x} ${y}) rotate(${ang})` }, gFx);
        if (a.kind === 'plane') { el('path', { d: 'M6 0 L-4 -1.2 L-5 -5 L-6.5 -5 L-6 -1 L-8 -.8 L-9 -3 L-10 -3 L-9.5 0 L-10 3 L-9 3 L-8 .8 L-6 1 L-6.5 5 L-5 5 L-4 1.2Z', fill: '#d0d4d8', stroke: '#000', 'stroke-width': .3 }, g); el('line', { x1: -10, y1: 0, x2: -30, y2: 0, stroke: '#fff', 'stroke-opacity': .25, 'stroke-width': 1.2 }, g); }
        else { el('path', { d: 'M4 0 L-3 -3 L-1.5 0 L-3 3Z', fill: '#888', stroke: '#000', 'stroke-width': .3 }, g); if (p > 0.9) el('line', { x1: 0, y1: 0, x2: a.to.x - x, y2: a.to.y - y, stroke: '#ff3b30', 'stroke-width': .6 }, g); }
      } else if (a.kind === 'flash') {
        el('rect', { x: vb.x - 50, y: vb.y - 50, width: vb.w + 100, height: vb.h + 100, fill: '#fff', opacity: (1 - p) * 0.6 }, gFx);
      }
    }
  }

  return {
    render, frame,
    setMode(m) { mode = m; for (const k in lastFill) delete lastFill[k]; },
    getMode: () => mode,
    select(id) { selected = id; },
    zoom(f) { const r = root.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); },
    reset() { vb.x = -40; vb.y = -20; vb.w = 1040; fit(); },
    focus(ab) { const c = CITY_POS[ab] || centroidOf(ab); vb.w = 420; const r = root.getBoundingClientRect(); vb.h = vb.w * r.height / r.width; vb.x = c.x - vb.w / 2; vb.y = c.y - vb.h / 2; fit(); },
    boom: (x, y) => spawnExplosion(x, y, 1),
  };
}
