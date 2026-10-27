// The daily simulation tick.
import {
  STATES, CITIES, BUILDINGS, COMMANDERS, DISTRICTS, rand, clamp, add, log, fx, M, invalidate, gileadPop, infiltration,
  seated, portfolioBonus, councilFill, districtCap, annex, loseState, isHeld, heldStates, applyFx, fmtNum, fmtDate,
} from './core.js';
import { GOALS, PHASES, goalDone } from '../data/phases.js';
import { STATE_SHAPES } from '../data/geo.js';
import { supplied, launchCoup } from './actions.js';
import { CITY_POS } from '../data/geo.js';
import { eventsTick } from './events.js';

const FIPS = Object.fromEntries(Object.entries(STATES).map(([a, s]) => [s.fips, a]));
const NEIGH = Object.fromEntries(STATE_SHAPES.map(s => [FIPS[s.id], s.n.map(f => FIPS[f])]));
export { NEIGH };

export const H = { infiltration };

export function note(G, kind, text, extra = {}) {
  (G.notes || (G.notes = [])).push({ kind, text, ...extra });
}

export function tick(G) {
  if (G.outcome) return;
  G.day++;
  G._admBonus = portfolioBonus(G, 'adm') * 0.25;
  if (G.phase === 0) plotTick(G);
  else {
    economyTick(G);
    populationTick(G);
    buildingsTick(G);
    warTick(G);
    if (G.day % 30 === 0) monthlyTick(G);
  }
  eventsTick(G);
  if (G.flags.earlyCoup && G.phase === 0) { G.flags.earlyCoup = false; launchCoup(G, true); note(G, 'phase', 'The Republic of Gilead'); }
  if (G.day % 3 === 0) goalsTick(G);
  checkEnd(G);
}

// ---------------- Phase 0 ----------------
function plotTick(G) {
  const r = G.res;
  add(G, 'funds', 0.05 + r.members / 1e6 * 1.1);
  add(G, 'influence', 0.05 + seated(G).length * 0.006);
  let m = 0;
  for (const [ab, s] of Object.entries(G.st)) if (s.chapter > 0) m += s.chapter / 100 * STATES[ab].pop * STATES[ab].faith * 7;
  add(G, 'members', m);
  const chapters = Object.values(G.st).filter(s => s.chapter > 0).length;
  let susp = 0.006 + r.members / 1e6 * 0.05 + chapters * 0.00025;
  if (G.plot.moles) susp *= 0.5;
  add(G, 'suspicion', susp - 0.014);
  if (G.day % 30 === 0) history(G);
}

// ---------------- Economy ----------------
function counts(G) {
  const c = {};
  for (const b of G.bld) if (b.done == null) c[b.type] = (c[b.type] || 0) + 1;
  return c;
}
function economyTick(G) {
  const r = G.res, p = G.pop, cl = p.cls;
  const popM = gileadPop(G) / 1e6;
  const n = G._counts = counts(G);
  const adm = 1 + G._admBonus + M(G, 'adm') + councilFill(G) * 0.15;
  const sanctions = clamp(-r.standing / 100, 0, 1) * 0.5 * (1 - M(G, 'sanctionRelief')) + (G.flags.sanctions || 0);
  G._sanctions = sanctions;
  const dip = portfolioBonus(G, 'dip');
  const income = popM * 0.105 * (1 + M(G, 'income')) * adm * (1 - clamp(sanctions, 0, 0.8)) + (G.flags.mexicoDeal ? 1.5 : 0);
  let upkeep = 0;
  for (const b of G.bld) if (b.done == null) upkeep += BUILDINGS[b.type].tiers[b.tier].upkeep || 0.08;
  upkeep += cl.guardians / 1e5 * 0.45 + cl.eyes / 1000 * 0.06 + G.army.committed / 1e5 * 0.8;
  G._income = income; G._upkeep = upkeep;
  add(G, 'treasury', income - upkeep);

  const markets = n.market || 0;
  let agri = 0;
  for (const b of G.bld) if (b.type === 'agricolony' && b.done == null) agri += b.occ;
  const prod = popM * 0.47 + agri / 1000 * 0.11;
  const use = popM * 0.47 * (1 + M(G, 'supplyUse') - Math.min(0.15, markets * 0.015)) + cl.guardians / 1e5 * 0.5 + G.ops.length * 1.2;
  G._supplyNet = prod - use;
  add(G, 'supplies', prod - use);
  r.supplies = Math.min(r.supplies, 300 + popM * 6);

  const contested = Object.values(G.st).filter(s => !s.exile && s.hold > 0.5 && s.hold < 99.5).length;
  add(G, 'power', 0.2 + M(G, 'powerDay') + seated(G).length * 0.03 + councilFill(G) * 0.6 + (r.stability - 50) / 150);

  const famine = r.supplies <= 0 ? 25 : 0;
  const stabT = 44 + r.fear * 0.2 + r.piety * 0.15 - r.resistance * 0.4 - contested * 0.35 + Math.min(12, markets * 1.2) - famine - sanctions * 14 + (r.treasury < 0 ? -10 : 0);
  r.stability = clamp(r.stability + (stabT - r.stability) * 0.02, 0, 100);
  const pietyT = 22 + Math.min(20, (n.church || 0) * 3) + portfolioBonus(G, 'faith') * 12 + Math.min(10, (n.wifeschool || 0) * 2);
  r.piety = clamp(r.piety + (pietyT - r.piety) * 0.004, 0, 100);
  const fearT = Math.min(40, (n.wall || 0) * 4) + Math.min(20, cl.eyes / 2500) + Math.min(10, (n.checkpoint || 0) * 1.5);
  r.fear = clamp(r.fear + (fearT - r.fear) * 0.008, 0, 100);
  const standT = -12 - Math.min(20, (n.wall || 0) * 1.5) + (n.newbethlehem ? 18 : 0) + (G.flags.mexicoDeal ? 6 : 0) + dip * 10 - (G.decrees.d_muzzles != null ? 6 : 0);
  r.standing = clamp(r.standing + (standT - r.standing) * 0.002 + M(G, 'standingDay'), -100, 100);

  const handUnrest = cl.handmaids / 20000 * 0.02 * Math.max(0.2, 1 + M(G, 'handmaidUnrest'));
  const supp = cl.eyes / 10000 * 0.07 * (1 + portfolioBonus(G, 'int') * 0.5) + (n.checkpoint || 0) * 0.004 + Object.values(G.st).filter(s => s.heli).length * 0.006 + r.fear * 0.0006;
  const grow = 0.035 + handUnrest + contested * 0.002 + Math.max(0, -r.standing) * 0.00025 + (n.jezebels || 0) * 0.003 + M(G, 'maydayForeign') * 0.01 + (r.supplies <= 0 ? 0.05 : 0);
  add(G, 'resistance', grow - supp);
}

// ---------------- Population ----------------
function populationTick(G) {
  const p = G.pop, cl = p.cls, r = G.res;
  const adm = 1 + (G._admBonus || 0) + M(G, 'adm');
  const total = gileadPop(G);
  // Registration of the unprocessed
  const toEcono = p.men * 0.004 * adm;
  const arrestRate = 0.00003 * (1 + M(G, 'arrests')) * (0.5 + r.resistance / 40);
  const arrestM = p.men * arrestRate, arrestW = p.women * arrestRate * 0.6;
  p.men -= toEcono + arrestM; cl.economen += toEcono; p.detainees += arrestM + arrestW;
  // Economen arrested as dissidents too
  const ea = cl.economen * arrestRate * 0.15; cl.economen -= ea; p.detainees += ea;
  const toWives = p.women * 0.0012 * (1 + M(G, 'regWomen') + (G._counts?.church || 0) * 0.05) * adm;
  const toUnwomen = p.women * 0.00005 * (1 + M(G, 'unwomen') * 2);
  p.women -= toWives + toUnwomen + arrestW; cl.econowives += toWives; cl.unwomen += toUnwomen;
  // Older econowives / failed Handmaids also drift into the Unwomen
  const kids = p.children * 0.004 * adm; p.children -= kids; cl.econochildren += kids;
  // The elite
  const cmdT = total * 0.00022;
  const dc = (cmdT - cl.commanders) * 0.015;
  if (dc > 0 && cl.economen > dc) { cl.commanders += dc; cl.economen -= dc; }
  const wT = cl.commanders * 0.9 - cl.wives;
  if (wT > 0 && cl.econowives > wT * 0.02) { cl.wives += wT * 0.02; cl.econowives -= wT * 0.02; }
  const seize = M(G, 'seizeChildren');
  const dT = cl.commanders * (0.3 + 0.5 * seize) - cl.daughters, sT = cl.commanders * (0.25 + 0.4 * seize) - cl.sons;
  const pool = p.children + cl.econochildren;
  if (dT > 0 && pool > dT) { const x = dT * 0.01; cl.daughters += x; takeChildren(G, x); }
  if (sT > 0 && pool > sT) { const x = sT * 0.01; cl.sons += x; takeChildren(G, x); }
  // Escapes (to Canada, through No Man's Land, by plane from Worcester)
  const escMult = Math.max(0.08, 1 + M(G, 'escape') - Math.min(0.4, (G._counts?.checkpoint || 0) * 0.04)) * (0.5 + r.resistance / 40);
  const ef = p.fertile * 0.00004 * escMult, eh = cl.handmaids * 0.00002 * escMult, ew = p.women * 0.00002 * escMult;
  p.fertile -= ef; cl.handmaids -= eh; p.women -= ew;
  p.escaped += ef + eh + ew;
  // Returnees
  if (M(G, 'returnees')) { const ret = M(G, 'returnees') * 12 * (1 + r.standing / 100) * (G._counts?.newbethlehem ? 1.6 : 1); p.returnees += ret; p.women += ret * 0.55; p.men += ret * 0.45; }
  // The Ceremony and births
  if (M(G, 'births') > 0) {
    const fert = 1 + M(G, 'fertility') + Math.min(0.5, p.reclaimed / 400);
    const conceive = cl.handmaids * 0.0002 * fert * M(G, 'births') + cl.econowives * 1.0e-8 * fert;
    const bucket = Math.floor((G.day + 270) / 10);
    const last = p.pregnant[p.pregnant.length - 1];
    if (last && last[0] === bucket) last[1] += conceive; else p.pregnant.push([bucket, conceive]);
  }
  while (p.pregnant.length && p.pregnant[0][0] * 10 <= G.day) {
    const [, n] = p.pregnant.shift();
    const surv = Math.min(0.9, 0.5 + (G._counts?.birthcenter || 0) * 0.05 + Math.min(0.15, p.reclaimed / 2000));
    const born = n * surv;
    p.births += born; p.unbabies += n - born;
    p.birthLog.push([G.day, born]);
    cl.daughters += born / 2; cl.sons += born / 2;
    add(G, 'piety', born * 0.01 * (1 + M(G, 'birthPiety')));
    add(G, 'stability', born * 0.004);
  }
  while (p.birthLog.length && p.birthLog[0][0] < G.day - 365) p.birthLog.shift();
  p.birthsYear = p.birthLog.reduce((a, b) => a + b[1], 0);
  for (const k of ['men', 'women', 'fertile', 'children', 'detainees']) p[k] = Math.max(0, p[k]);
  for (const k in cl) cl[k] = Math.max(0, cl[k]);
}
function takeChildren(G, x) {
  const p = G.pop, cl = G.pop.cls;
  const a = Math.min(p.children, x); p.children -= a; cl.econochildren = Math.max(0, cl.econochildren - (x - a));
}

// ---------------- Buildings ----------------
function buildingsTick(G) {
  const p = G.pop, cl = p.cls;
  let auntsNeed = 0;
  for (const b of G.bld) if (b.type === 'redcenter' && b.done == null) auntsNeed += b.tier ? 20 : 6;
  const auntEff = auntsNeed ? Math.min(1, cl.aunts / auntsNeed) : 1;
  G._auntEff = auntEff;
  let housingCol = [], housingAgri = [];
  for (const b of G.bld) {
    const B = BUILDINGS[b.type], T = B.tiers[b.tier];
    if (b.done != null) {
      if (G.day >= b.done) {
        b.done = null;
        log(G, `${b.name} opens in ${CITIES[b.city] ? cityName(b.city) : ''}.`, 'build', b.city);
        fx(G, 'built', { city: b.city, type: b.type });
        note(G, 'build', `${b.name} is open`);
        if (b.type === 'newbethlehem') G.flags.nbDay = G.day + 90;
      }
      continue;
    }
    if (B.housing) { (b.type === 'colony' ? housingCol : housingAgri).push(b); continue; }
    if (!B.from) continue;
    // Graduation
    let inT = 0;
    while (b.cohorts.length && b.cohorts[0].d <= G.day) graduate(G, b, b.cohorts.shift().n);
    for (const c of b.cohorts) inT += c.n;
    // Intake
    let rate = T.cap / T.days;
    if (b.type === 'redcenter') rate *= auntEff;
    if (b.type === 'barracks') rate *= 1 + M(G, 'barracks');
    const src = B.from in p ? p : cl;
    if (b.type === 'redcenter' && !M(G, 'fertileFind')) continue;
    let take = Math.min(rate, T.cap - inT, src[B.from] * (B.from === 'daughters' ? 0.002 : 1));
    if (b.type === 'redcenter') take = Math.min(take, src.fertile * 0.01 * M(G, 'fertileFind') + 0.5);
    if (take > 0.01) {
      src[B.from] -= take;
      const d = G.day + T.days;
      const last = b.cohorts[b.cohorts.length - 1];
      if (last && last.d === d) last.n += take; else b.cohorts.push({ n: take, d });
    }
  }
  // Colonies: house the Unwomen
  let unh = cl.unwomen;
  for (const b of [...housingCol, ...housingAgri]) {
    const cap = BUILDINGS[b.type].tiers[b.tier].cap;
    b.occ = Math.min(cap, unh); unh -= b.occ;
    const death = b.occ * (b.type === 'colony' ? 0.0007 : 0.00015);
    cl.unwomen -= death; p.colonyDeaths += death; p.deaths += death;
    if (b.type === 'colony') p.reclaimed += b.occ * 0.0000025;
  }
  G._unhoused = unh;
}
function graduate(G, b, n) {
  const B = BUILDINGS[b.type], cl = G.pop.cls;
  if (B.to === 'processed') {
    cl.unwomen += n * 0.45; cl.economen += n * 0.35; G.pop.deaths += n * 0.2; G.stats.wallDeaths += n * 0.2;
    add(G, 'resistance', -n * 0.0012); add(G, 'fear', n * 0.0004);
  } else if (B.to === 'wives') {
    cl.wives += n; cl.commanders += n * 0.3;
  } else cl[B.to] += n;
}
const cityName = c => CITY_POS[c]?.name || c;

// ---------------- War ----------------
function warTick(G) {
  const r = G.res;
  const mil = portfolioBonus(G, 'mil');
  const offense = 1 + M(G, 'offense') + mil * 0.3;
  const usa = G.army.usa;
  const diffMult = G.difficulty === 'easy' ? 0.7 : G.difficulty === 'hard' ? 1.3 : 1;
  for (const [ab, s] of Object.entries(G.st)) {
    if (s.exile) continue;
    const ops = G.ops.filter(o => o.st === ab);
    const contested = s.hold > 0.5 && s.hold < 99.5;
    if (!contested && !ops.length) continue;
    const adjHeld = (NEIGH[ab] || []).filter(n => G.st[n] && G.st[n].hold >= 99.5).length;
    let push = 0.012 * adjHeld;
    for (const o of ops) {
      const sup = supplied(G, ab) ? 1 : 0.45;
      push += 0.16 * Math.pow(o.troops / 50000, 0.6) * offense * sup * (1 - s.resist / 170);
      const cas = o.troops * 0.0006 * (0.4 + s.resist / 60);
      o.troops -= cas; G.army.committed -= cas; G.pop.cls.guardians -= cas; G.pop.deaths += cas;
      s.resist = clamp(s.resist - 0.05 * offense, 5, 100);
    }
    const enemy = (usa / 100) * 0.3 * (s.resist / 60) * (s.heli ? 0.65 : 1) * diffMult;
    s.hold = clamp(s.hold + push - enemy, 0, 100);
    if (!ops.length) s.resist = clamp(s.resist + 0.02, 5, 95);
    if (s.heli) s.resist = clamp(s.resist - 0.04, 5, 100);
    if (s.hold >= 99.5) {
      s.hold = 100;
      for (const o of ops) { G.army.committed -= o.troops; G.ops.splice(G.ops.indexOf(o), 1); }
      if (!s.annexed) annex(G, ab);
      note(G, 'annex', `${STATES[ab].name} taken`);
    } else if (s.annexed && s.hold < 40) {
      loseState(G, ab);
      note(G, 'lost', `${STATES[ab].name} lost`);
    }
  }
  G.army.committed = Math.max(0, G.army.committed);
  for (const o of [...G.ops]) if (o.troops < 1000) { G.army.committed -= o.troops; G.ops.splice(G.ops.indexOf(o), 1); log(G, `The offensive in ${STATES[o.st].name} has bled out.`, 'alert', o.st); }
  const usaT = 38 + Math.max(0, -r.standing) * 0.22 + (G.phase >= 3 ? 8 : 0) + (G.phase >= 5 ? 10 : 0) + M(G, 'maydayForeign') * 20;
  G.army.usa = clamp(G.army.usa + (usaT - G.army.usa) * 0.003, 15, 95);
  if (G.phase === 5) G.flags.bostonDays = isHeld(G, 'MA') ? (G.flags.bostonDays || 0) + 1 : 0;
}

// ---------------- Monthly ----------------
function monthlyTick(G) {
  history(G);
  for (const id of Object.keys(G.cmd)) {
    const c = G.cmd[id], d = COMMANDERS[id];
    if (!c.alive) continue;
    let dl = c.seat ? (c.portfolio ? 1 : 0.4) : (d.joins <= G.phase ? -0.6 * d.ambition / 5 : 0);
    if (G._counts?.jezebels) dl += 0.4;
    if (M(G, 'hardlinerAnger') && d.faction === 'hard') dl -= 1.2;
    c.loyalty = clamp(c.loyalty + dl, 0, 100);
  }
  // District councils fill slowly on their own as the Republic settles
  for (const id of Object.keys(DISTRICTS)) {
    const cap = districtCap(G, id);
    const c = G.council[id];
    if (c.filled < cap) c.filled = Math.min(cap, c.filled + 1);
    if (c.filled > cap) c.filled = cap;
    c.hard = clamp(G.flags.hardline + (rand(G) - 0.5) * 0.05, 0.1, 0.95);
  }
  if (G._sanctions > 0.3 && G.day % 90 === 0) log(G, 'Sanctions tighten. The Republic is in a chokehold.', 'alert');
}
export function history(G) {
  const cl = G.pop.cls;
  G.hist.push({ d: G.day, pop: Math.round(gileadPop(G)), hm: Math.round(cl.handmaids), b: Math.round(G.pop.birthsYear),
    st: Math.round(G.res.stability), sd: Math.round(G.res.standing), rs: Math.round(G.res.resistance),
    held: heldStates(G).length, mem: Math.round(G.res.members), sus: Math.round(G.res.suspicion), gd: Math.round(cl.guardians) });
  if (G.hist.length > 400) G.hist.splice(0, G.hist.length - 400);
}

// ---------------- Goals & phases ----------------
export function goalsTick(G) {
  for (const g of GOALS) {
    if (g.phase > G.phase || G.goals[g.id] != null) continue;
    if (goalDone(g, G, H)) {
      G.goals[g.id] = G.day;
      applyFx(G, g.reward);
      log(G, `GOAL ACHIEVED: ${g.name}.`, 'goal');
      note(G, 'goal', g.name);
    }
  }
  if (G.phase >= 1 && G.phase <= 5) {
    const keys = GOALS.filter(g => g.phase === G.phase && g.key);
    const minDays = [0, 540, 480, 480, 420, 0][G.phase];
    if (G.day - (G.flags['phase' + G.phase + 'Start'] ?? G.plot.coupDay ?? 0) < minDays) return;
    if (keys.every(g => G.goals[g.id] != null)) {
      if (G.phase === 5) { G.outcome = 'victory'; note(G, 'end', 'victory'); log(G, 'Gilead stands, from sea to shining sea. Under His Eye.', 'phase'); return; }
      advancePhase(G);
    }
  }
}
export function advancePhase(G) {
  G.phase++;
  const P = PHASES[G.phase];
  log(G, `A NEW ERA: ${P.name} — ${P.sub}.`, 'phase');
  note(G, 'phase', P.name);
  G.flags['phase' + G.phase + 'Start'] = G.day;
  G.flags['phase' + G.phase + 'Day'] = G.day + (G.phase === 3 ? 150 : 0);
  if (G.phase === 3) G.flags.sanctions = 0.08;
  invalidate(G);
}

function checkEnd(G) {
  if (G.outcome) return;
  if (G.phase === 0 && G.res.suspicion >= 100) {
    G.outcome = 'raided'; note(G, 'end', 'raided');
    log(G, 'The FBI raids the Committee. The Sons of Jacob are finished before they began.', 'alert');
    return;
  }
  if (G.phase >= 1) {
    if (G.st.DC.hold < 40) { G.outcome = 'dcfell'; note(G, 'end', 'dcfell'); log(G, 'Washington has fallen. The Republic of Gilead is no more.', 'alert'); return; }
    if (G.res.stability <= 1) G.flags.collapseDays = (G.flags.collapseDays || 0) + 1; else G.flags.collapseDays = 0;
    if (G.flags.collapseDays > 90) { G.outcome = 'collapse'; note(G, 'end', 'collapse'); log(G, 'Order collapses. Mayday is in the streets of every city.', 'alert'); }
  }
}
export { fmtDate, fmtNum, PHASES };
