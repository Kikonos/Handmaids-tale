// Core game state, RNG, derived values and the helper API (H) used by events and actions.
import { STATES, CITIES, DISTRICTS, STATE_DISTRICT } from '../data/states.js';
import { COMMANDERS } from '../data/commanders.js';
import { DECREE_BY_ID } from '../data/decrees.js';
import { BUILDINGS } from '../data/buildings.js';

export const VERSION = '1.3.1';
export const VERSION_NAME = 'Nolite Te Bastardes';
export const START = Date.UTC(2012, 0, 1);
export const HIGH_COUNCIL_SEATS = 15;
export const COMMITTEE_SEATS = 12;

export const RES_LIMITS = {
  stability: [0, 100], piety: [0, 100], fear: [0, 100], resistance: [0, 100], standing: [-100, 100], suspicion: [0, 100],
  funds: [0, 1e9], influence: [0, 1e9], members: [0, 1e9], power: [0, 1e9], treasury: [-500, 1e9], supplies: [0, 1e9],
};

// ---------- RNG (mulberry32, state kept in G for determinism) ----------
export function rand(G) {
  let t = (G.rng = (G.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rint = (G, a, b) => a + Math.floor(rand(G) * (b - a + 1));
export const pick = (G, arr) => arr[Math.floor(rand(G) * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Dates ----------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function dateOf(day) { return new Date(START + day * 86400000); }
export function fmtDate(day, short = false) {
  const d = dateOf(day);
  return short ? `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}, ${d.getUTCFullYear()}` : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ---------- New game ----------
export function newGame(seed = (Math.random() * 2 ** 31) | 0, difficulty = 'normal') {
  const st = {};
  for (const [ab, s] of Object.entries(STATES)) {
    st[ab] = { hold: 0, chapter: 0, infil: 0, resist: 50, annexed: false, exile: !!s.exile, popLoss: 0, heli: false };
  }
  const cmd = {};
  for (const [id, c] of Object.entries(COMMANDERS)) {
    cmd[id] = { alive: true, seat: false, portfolio: null, loyalty: c.loyalty, status: 'free', fate: null };
  }
  const council = {};
  for (const id of Object.keys(DISTRICTS)) council[id] = { filled: 0, hard: 0.6 };
  const G = {
    v: VERSION, seed, rng: seed, difficulty, day: 0, phase: 0, speed: 1, paused: true, outcome: null,
    res: { funds: 45, influence: 25, members: 9000, suspicion: 4, power: 0, treasury: 0, supplies: 0,
      stability: 60, piety: 30, fear: 5, standing: 20, resistance: 5 },
    plot: { congress: 0, whitehouse: 0, court: 0, book: false, moles: false, coupDay: null },
    st, cmd, council,
    pop: { men: 0, women: 0, fertile: 0, children: 0, detainees: 0, pregnant: [], births: 0, birthsYear: 0, birthLog: [],
      unbabies: 0, escaped: 0, returnees: 0, deaths: 0, reclaimed: 0, colonyDeaths: 0,
      cls: { commanders: 0, wives: 0, widows: 0, daughters: 0, sons: 0, aunts: 0, handmaids: 0, marthas: 0,
        econowives: 0, economen: 0, econochildren: 0, guardians: 0, eyes: 0, jezebels: 0, unwomen: 0 } },
    army: { committed: 0, usa: 45 },
    bld: [], nameIdx: {}, uid: 1,
    decrees: {}, goals: {}, cool: {}, ops: [],
    events: { queue: [], done: {}, nextRandom: 25 },
    flags: { hardline: 0.6 },
    log: [], hist: [], fx: [],
    stats: { strikes: 0, drones: 0, wallDeaths: 0, commandersLost: 0 },
  };
  log(G, 'The Committee of the Sons of Jacob convenes in secret. Twelve seats. One purpose.', 'phase');
  return G;
}

// ---------- Logging & map FX (FX are consumed by the UI) ----------
export function log(G, text, type = 'info', loc = null) {
  G.log.unshift({ day: G.day, text, type, loc });
  if (G.log.length > 300) G.log.length = 300;
}
export function fx(G, kind, data) { G.fx.push({ kind, ...data, t: G.day }); if (G.fx.length > 40) G.fx.shift(); }

// ---------- Derived values ----------
export function modsOf(G) {
  const m = {};
  for (const id of Object.keys(G.decrees)) {
    const d = DECREE_BY_ID[id];
    if (!d) continue;
    for (const [k, v] of Object.entries(d.mods || {})) m[k] = (m[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(G.flags.mods || {})) m[k] = (m[k] || 0) + v;
  return m;
}
export const M = (G, k) => (G._mods || (G._mods = modsOf(G)))[k] || 0;
export function invalidate(G) { G._mods = null; }

export const heldStates = G => Object.keys(G.st).filter(a => G.st[a].hold >= 99.5 && !G.st[a].exile);
export const contestedStates = G => Object.keys(G.st).filter(a => !G.st[a].exile && G.st[a].hold > 0.5 && G.st[a].hold < 99.5);
export const isHeld = (G, ab) => G.st[ab] && G.st[ab].hold >= 99.5;
export const cityHeld = (G, c) => CITIES[c] && isHeld(G, CITIES[c].st);

export function statePop(G, ab) { return Math.max(0, STATES[ab].pop * 1e6 - G.st[ab].popLoss); }

export function gileadPop(G) {
  const p = G.pop, c = p.cls;
  let t = p.men + p.women + p.fertile + p.children + p.detainees;
  for (const k in c) t += c[k];
  for (const b of G.bld) for (const co of b.cohorts || []) t += co.n;
  return t;
}
export function inTraining(G) {
  const r = {};
  for (const b of G.bld) {
    if (!b.cohorts || b.done != null) continue;
    const to = BUILDINGS[b.type].to;
    r[to] = (r[to] || 0) + b.cohorts.reduce((a, c) => a + c.n, 0);
  }
  return r;
}

export function infiltration(G) {
  let w = 0, t = 0;
  for (const [ab, s] of Object.entries(STATES)) for (const b of s.bases) { w += b[1]; t += b[1] * G.st[ab].infil; }
  return w ? t / w : 0;
}

export function seated(G) { return Object.keys(G.cmd).filter(id => G.cmd[id].seat && G.cmd[id].alive); }
export function portfolioHolder(G, pf) { return seated(G).find(id => G.cmd[id].portfolio === pf); }
export function portfolioBonus(G, pf) {
  const id = portfolioHolder(G, pf);
  if (!id) return 0;
  const s = COMMANDERS[id].stats;
  return (pf === 'faith' ? s.zeal : s[pf]) / 10; // 0..1
}
export function councilFill(G) {
  let f = 0, n = 0;
  for (const [id, d] of Object.entries(DISTRICTS)) { f += G.council[id].filled; n += d.seats; }
  return n ? f / n : 0;
}
export function districtCap(G, id) {
  const d = DISTRICTS[id];
  let tot = 0, held = 0;
  for (const s of d.states) { tot += STATES[s].pop; if (isHeld(G, s)) held += STATES[s].pop; }
  return Math.floor(d.seats * (tot ? held / tot : 0));
}
export const districtOf = ab => STATE_DISTRICT[ab];

export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// ---------- Resource helper ----------
export function add(G, k, v) {
  if (!v) return;
  if (k in G.res) {
    const [lo, hi] = RES_LIMITS[k] || [-1e9, 1e9];
    G.res[k] = clamp(G.res[k] + v, lo, hi);
  }
}
export function applyFx(G, fxObj = {}) {
  for (const [k, v] of Object.entries(fxObj)) {
    if (k in G.res) add(G, k, v);
    else if (k in G.pop.cls) G.pop.cls[k] = Math.max(0, G.pop.cls[k] + v);
  }
}
export function canAfford(G, cost = {}) {
  return Object.entries(cost).every(([k, v]) => (G.res[k] ?? 0) >= v);
}
export function pay(G, cost = {}) { for (const [k, v] of Object.entries(cost)) add(G, k, -v); }

export function killCommander(G, id, fate) {
  const c = G.cmd[id];
  if (!c || !c.alive) return false;
  c.alive = false; c.seat = false; c.portfolio = null; c.fate = fate; c.status = 'dead';
  G.stats.commandersLost++;
  G.pop.cls.commanders = Math.max(0, G.pop.cls.commanders - 1);
  G.pop.cls.widows += 1;
  log(G, `${COMMANDERS[id].name}: ${fate}`, 'death');
  return true;
}

export function setHold(G, ab, v) { G.st[ab].hold = clamp(v, 0, 100); }

// Population of a state moving into / out of Gilead.
export function annex(G, ab, silent = false) {
  const s = G.st[ab];
  if (s.annexed || s.exile) return;
  s.annexed = true;
  const n = statePop(G, ab);
  const p = G.pop;
  p.men += n * 0.375; p.children += n * 0.235;
  const women = n * 0.39;
  p.fertile += women * 0.004; p.women += women * 0.996;
  if (!silent) { log(G, `${STATES[ab].name} is brought under the Republic. ${fmtNum(n)} souls to be processed.`, 'war', ab); fx(G, 'annex', { st: ab }); }
}
export function loseState(G, ab) {
  const s = G.st[ab];
  if (!s.annexed) return;
  s.annexed = false;
  const tot = gileadPop(G);
  const f = tot > 0 ? Math.min(0.9, statePop(G, ab) / tot) : 0;
  const p = G.pop;
  for (const k of ['men', 'women', 'fertile', 'children', 'detainees']) p[k] *= 1 - f;
  for (const k in p.cls) if (k !== 'commanders') p.cls[k] *= 1 - f;
  for (const b of [...G.bld]) if (CITIES[b.city]?.st === ab) G.bld.splice(G.bld.indexOf(b), 1);
  log(G, `${STATES[ab].name} has fallen to the enemy. Its people and institutions are lost to the Republic.`, 'alert', ab);
  fx(G, 'lost', { st: ab });
}

export function fmtNum(n) {
  n = Math.round(n);
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
  return n.toLocaleString('en-US');
}

export { STATES, CITIES, DISTRICTS, COMMANDERS, BUILDINGS };
