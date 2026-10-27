// Event runner: scripted (show-canon) and random location events. Data lives in data/events.js.
import { EVENTS, EVENT_BY_ID } from '../data/events.js';
import {
  STATES, CITIES, COMMANDERS, BUILDINGS, rand, rint, pick, clamp, add, applyFx, log, fx, M, invalidate, killCommander,
  isHeld, heldStates, contestedStates, seated, annex, loseState, gileadPop, fmtNum, infiltration,
} from './core.js';
import { CITY_POS } from '../data/geo.js';

export function makeH(G) {
  const H = {
    G,
    add: (k, v) => add(G, k, v),
    fx: o => applyFx(G, o),
    rand: () => rand(G),
    chance: p => rand(G) < p,
    rint: (a, b) => rint(G, a, b),
    pick: a => pick(G, a),
    log: (t, type = 'info', loc = null) => log(G, t, type, loc),
    alive: id => G.cmd[id]?.alive,
    seated: id => G.cmd[id]?.alive && G.cmd[id].seat,
    kill: (id, fate) => killCommander(G, id, fate),
    loyalty: (id, d) => { if (G.cmd[id]) G.cmd[id].loyalty = clamp(G.cmd[id].loyalty + d, 0, 100); },
    status: (id, s) => { if (G.cmd[id]) { G.cmd[id].status = s; if (s !== 'free') { G.cmd[id].seat = false; G.cmd[id].portfolio = null; } } },
    flag: (k, v = true) => { G.flags[k] = v; },
    has: k => !!G.flags[k],
    decree: id => G.decrees[id] != null,
    grant: id => { if (G.decrees[id] == null) { G.decrees[id] = G.day; invalidate(G); } },
    discount: (id, m) => { (G.flags.discount || (G.flags.discount = {}))[id] = m; },
    mod: (k, v) => { (G.flags.mods || (G.flags.mods = {}))[k] = ((G.flags.mods || {})[k] || 0) + v; invalidate(G); },
    hold: (ab, d) => { const s = G.st[ab]; s.hold = clamp(s.hold + d, 0, 100); if (s.hold >= 99.5) { s.hold = 100; annex(G, ab); } else if (s.annexed && s.hold < 40) loseState(G, ab); },
    resist: (ab, d) => { G.st[ab].resist = clamp(G.st[ab].resist + d, 0, 100); },
    held: ab => isHeld(G, ab),
    heldList: () => heldStates(G),
    contested: () => contestedStates(G),
    pop: (k, d) => { if (k in G.pop.cls) G.pop.cls[k] = Math.max(0, G.pop.cls[k] + d); else G.pop[k] = Math.max(0, G.pop[k] + d); },
    cls: k => G.pop.cls[k] ?? G.pop[k],
    bld: type => G.bld.filter(b => b.type === type && b.done == null),
    removeBld: b => { const i = G.bld.indexOf(b); if (i >= 0) G.bld.splice(i, 1); },
    usa: d => { G.army.usa = clamp(G.army.usa + d, 10, 100); },
    plot: (k, d) => { G.plot[k] = clamp(G.plot[k] + d, 0, 100); },
    chapterAll: m => { for (const s of Object.values(G.st)) s.chapter = Math.round(s.chapter * m); },
    num: fmtNum,
    infil: () => infiltration(G),
    fxMap: (kind, data) => fx(G, kind, data),
    pop$: () => gileadPop(G),
  };
  return H;
}

function eligible(G, H, e) {
  if (e.phase && (G.phase < e.phase[0] || G.phase > e.phase[1])) return false;
  const n = G.events.done[e.id] || 0;
  if (e.once !== false && n > 0) return false;
  if (G.events.queue.some(q => q.id === e.id)) return false;
  if (e.minDay && G.day < e.minDay) return false;
  if (e.cooldown && G.events.last?.[e.id] && G.day - G.events.last[e.id] < e.cooldown) return false;
  try { return !e.when || !!e.when(G, H); } catch (err) { console.warn('event when error', e.id, err); return false; }
}

function resolveLoc(G, H, e) {
  let l = typeof e.loc === 'function' ? e.loc(G, H) : e.loc;
  if (!l) {
    const hs = G.phase === 0 ? Object.keys(G.st).filter(a => G.st[a].chapter > 0) : heldStates(G);
    l = hs.length ? pick(G, hs) : 'DC';
  }
  return l;
}

export function enqueue(G, id, extra = {}) {
  const e = EVENT_BY_ID[id];
  if (!e) return;
  const H = makeH(G);
  const loc = extra.loc || resolveLoc(G, H, e);
  const q = { uid: G.uid++, id, loc, day: G.day, expires: e.urgent ? null : G.day + (e.ttl || 25), ...extra };
  G.events.queue.push(q);
  if (e.urgent) { if (!G.paused) G._wasRunning = true; G.paused = true; (G.notes || (G.notes = [])).push({ kind: 'urgent', text: e.title, uid: q.uid }); }
  else (G.notes || (G.notes = [])).push({ kind: 'event', text: e.title, uid: q.uid });
}

export function eventsTick(G) {
  const H = makeH(G);
  // Expire ignored events: the last choice is the default ("do nothing")
  for (const q of [...G.events.queue]) {
    if (q.expires != null && G.day >= q.expires) {
      const e = EVENT_BY_ID[q.id];
      resolveEvent(G, q.uid, e.choices.length - 1, true);
    }
  }
  // Scripted
  for (const e of EVENTS) {
    if (e.random) continue;
    if (eligible(G, H, e)) enqueue(G, e.id);
  }
  // Random
  if (G.day >= G.events.nextRandom) {
    const pool = EVENTS.filter(e => e.random && eligible(G, H, e));
    const active = G.events.queue.filter(q => !EVENT_BY_ID[q.id].urgent).length;
    if (pool.length && active < 4) {
      const tot = pool.reduce((a, e) => a + (e.weight || 1), 0);
      let x = rand(G) * tot;
      const e = pool.find(e => (x -= e.weight || 1) < 0) || pool[0];
      enqueue(G, e.id);
    }
    G.events.nextRandom = G.day + (G.phase === 0 ? rint(G, 16, 30) : rint(G, 9, 20));
  }
}

export function choiceAvailable(G, e, c) {
  const H = makeH(G);
  if (c.req && !c.req(G, H)) return false;
  if (c.cost) for (const [k, v] of Object.entries(c.cost)) if ((G.res[k] ?? 0) < v) return false;
  return true;
}

export function resolveEvent(G, uid, idx, auto = false) {
  const i = G.events.queue.findIndex(q => q.uid === uid);
  if (i < 0) return null;
  const q = G.events.queue[i];
  const e = EVENT_BY_ID[q.id];
  let c = e.choices[idx];
  if (!c || (!auto && !choiceAvailable(G, e, c))) return null;
  if (auto && !choiceAvailable(G, e, c)) c = e.choices.find(x => choiceAvailable(G, e, x)) || c;
  G.events.queue.splice(i, 1);
  const H = makeH(G);
  H.loc = q.loc;
  if (c.cost) for (const [k, v] of Object.entries(c.cost)) add(G, k, -v);
  applyFx(G, c.fx);
  let out = '';
  try { out = (c.run && c.run(G, H, q)) || c.out || ''; } catch (err) { console.error('event run error', e.id, err); }
  G.events.done[e.id] = (G.events.done[e.id] || 0) + 1;
  (G.events.last || (G.events.last = {}))[e.id] = G.day;
  log(G, `${e.title}: ${auto ? '(ignored) ' : ''}${out || c.t}`, e.urgent ? 'alert' : 'event', q.loc);
  return { text: out, title: e.title, auto };
}

export function locPoint(G, loc) {
  if (CITY_POS[loc]) return CITY_POS[loc];
  return null;
}
