// Player actions. Each returns { ok, msg } so the UI can toast the result.
import {
  STATES, CITIES, BUILDINGS, COMMANDERS, DISTRICTS, rand, rint, clamp, add, pay, canAfford, log, fx, M, invalidate,
  infiltration, seated, isHeld, cityHeld, annex, districtCap, dist, fmtNum, HIGH_COUNCIL_SEATS, COMMITTEE_SEATS, applyFx,
} from './core.js';
import { DECREE_BY_ID } from '../data/decrees.js';
import { CITY_POS, STATE_SHAPES } from '../data/geo.js';

const ok = msg => ({ ok: true, msg });
const no = msg => ({ ok: false, msg });
const centroid = ab => { const s = STATE_SHAPES.find(x => x.id === STATES[ab].fips); return { x: s.c[0], y: s.c[1] }; };
export { centroid };

// ---------------- Pre-coup (Phase 0) ----------------
export const PLOT_ACTIONS = {
  fundraise: { name: 'Fundraise among the faithful', icon: '💰', cd: 20, desc: 'Megachurch donors, front charities, lawyer members.' },
  sermon: { name: 'Fertility-crisis broadcast', icon: '📺', cd: 30, cost: { funds: 8 }, desc: 'Sermons on the dying birth rate. Members and influence in every chapter state.' },
  jobless: { name: 'Recruit the jobless', icon: '🏭', cd: 25, cost: { funds: 5 }, desc: 'Pryce\'s job-centre pitch: "We\'ll set things right." Rust Belt chapters grow.', needs: 'pryce' },
  cover: { name: 'Cover our tracks', icon: '🗂', cd: 15, cost: { funds: 12 }, desc: 'Lawyers, shell charities, deleted lists. FBI suspicion falls.' },
  publish: { name: 'Publish "A Woman\'s Place"', icon: '📕', once: true, cost: { funds: 15 }, desc: 'Serena Joy\'s manifesto of domestic feminism and biological destiny.' },
  moles: { name: 'Plant moles in the Bureau', icon: '🕴', once: true, cost: { funds: 40, influence: 10 }, desc: 'Friends inside the FBI. Suspicion grows half as fast.' },
};

export function plotAction(G, id) {
  const a = PLOT_ACTIONS[id];
  if (!a || G.phase !== 0) return no('Not available');
  if (a.once && G.plot[id === 'publish' ? 'book' : id]) return no('Already done');
  if ((G.cool[id] || 0) > G.day) return no(`Ready in ${G.cool[id] - G.day} days`);
  if (a.needs && !G.cmd[a.needs].seat) return no(`Requires ${COMMANDERS[a.needs].name} on the Committee`);
  if (a.cost && !canAfford(G, a.cost)) return no('Not enough resources');
  pay(G, a.cost);
  if (a.cd) G.cool[id] = G.day + a.cd;
  const chap = Object.values(G.st).filter(s => s.chapter >= 10).length;
  switch (id) {
    case 'fundraise': {
      const g = Math.round(10 + G.res.members / 15000 + chap * 0.25);
      add(G, 'funds', g); add(G, 'suspicion', 1);
      return ok(`The faithful give $${g}M.`);
    }
    case 'sermon': {
      let m = 0;
      for (const [ab, s] of Object.entries(G.st)) if (s.chapter > 0) { const d = STATES[ab].pop * STATES[ab].faith * 260; m += d; s.chapter = Math.min(100, s.chapter + 2); }
      m = Math.round(m + 2500); add(G, 'members', m); add(G, 'influence', 6); add(G, 'suspicion', 1.5);
      return ok(`${fmtNum(m)} new members answer the call.`);
    }
    case 'jobless': {
      let m = 0;
      for (const ab of ['MI', 'OH', 'PA', 'IN', 'IL', 'WI']) { G.st[ab].chapter = Math.min(100, G.st[ab].chapter + 7); m += 1800; }
      add(G, 'members', m); add(G, 'suspicion', 1);
      return ok(`Unemployed young men sign up across the Rust Belt (+${fmtNum(m)}).`);
    }
    case 'cover': add(G, 'suspicion', -9); return ok('Files shredded. Suspicion falls.');
    case 'publish':
      G.plot.book = true; add(G, 'influence', 15); add(G, 'members', 12000); add(G, 'suspicion', 2);
      log(G, '"A Woman\'s Place" by Serena Joy becomes a bestseller.', 'info');
      return ok('A bestseller. Women\'s "biological destiny" is on every talk show.');
    case 'moles':
      G.plot.moles = true; return ok('Friends inside the Bureau. Suspicion now grows half as fast.');
  }
  return no('?');
}

export function chapterCost(G, ab) { return { funds: G.st[ab].chapter === 0 ? 5 : 4 }; }
export function growChapter(G, ab) {
  if (G.phase !== 0) return no('The time for chapters has passed');
  const s = G.st[ab];
  if (s.exile && ab === 'HI') { /* allowed but weak */ }
  if (s.chapter >= 100) return no('This chapter is at full strength');
  const cost = chapterCost(G, ab);
  if (!canAfford(G, cost)) return no('Not enough funds');
  pay(G, cost);
  const first = s.chapter === 0;
  const gain = Math.max(4, Math.round((9 + STATES[ab].faith * 14) / Math.max(1, Math.sqrt(STATES[ab].pop / 6))));
  s.chapter = Math.min(100, s.chapter + gain);
  const m = Math.round(STATES[ab].pop * STATES[ab].faith * 300 + 400);
  add(G, 'members', m); add(G, 'suspicion', 0.45 + STATES[ab].pop / 60);
  if (first) log(G, `A Sons of Jacob chapter is founded in ${STATES[ab].name}.`, 'info', ab);
  fx(G, 'pulse', { st: ab, color: '#c9a227' });
  return ok(`${STATES[ab].name}: chapter ${s.chapter}% (+${fmtNum(m)} members)`);
}

export function infiltrateCost() { return { funds: 8, influence: 2 }; }
export function infiltrate(G, ab) {
  if (G.phase !== 0) return no('Not now');
  const s = G.st[ab];
  const bases = STATES[ab].bases;
  if (!bases.length) return no('No military installations here');
  if (s.infil >= 100) return no('Fully infiltrated');
  if (s.chapter < 10) return no('Found a chapter here first');
  const cost = infiltrateCost();
  if (!canAfford(G, cost)) return no('Not enough funds or influence');
  pay(G, cost);
  const w = bases.reduce((a, b) => a + b[1], 0);
  const gain = Math.round(30 / Math.sqrt(w) + s.chapter / 12);
  s.infil = Math.min(100, s.infil + gain);
  add(G, 'suspicion', 1.1);
  fx(G, 'pulse', { st: ab, color: '#4a6fa5' });
  return ok(`${bases[0][0]}: officers sympathetic (${s.infil}%)`);
}

export const PLOTS = {
  congress: { name: 'Congress', icon: '🏛', desc: 'Twenty to thirty gunmen in the Capitol galleries.' },
  whitehouse: { name: 'The White House', icon: '🏠', desc: 'An explosion in the West Wing.' },
  court: { name: 'The Supreme Court', icon: '⚖', desc: 'The Court, at session.' },
};
export function fundPlot(G, k) {
  if (G.phase !== 0) return no('Not now');
  if (seated(G).length < 5) return no('Seat at least 5 founders on the Committee first');
  if (infiltration(G) < 12) return no('Infiltrate the military to at least 12% first');
  if (G.plot[k] >= 100) return no('Ready');
  const cost = { funds: 12 };
  if (!canAfford(G, cost)) return no('Not enough funds');
  pay(G, cost);
  G.plot[k] = Math.min(100, G.plot[k] + 12.5);
  add(G, 'suspicion', 1.6);
  return ok(`${PLOTS[k].name}: ${G.plot[k]}% prepared`);
}

export function seatCost(G) {
  const n = seated(G).length;
  return G.phase === 0 ? { influence: 10 + n * 3 } : { power: 15 + n * 4 };
}
export function seatCommander(G, id) {
  const c = G.cmd[id], d = COMMANDERS[id];
  if (!c || !c.alive) return no('Unavailable');
  if (c.seat) return no('Already seated');
  if (d.joins > G.phase) return no('Not yet risen to prominence');
  const max = G.phase === 0 ? COMMITTEE_SEATS : HIGH_COUNCIL_SEATS;
  if (seated(G).length >= max) return no('No empty seats');
  if (c.status === 'arrested' || c.status === 'abroad') return no('He is not available');
  const cost = seatCost(G);
  if (!canAfford(G, cost)) return no('Not enough ' + Object.keys(cost)[0]);
  pay(G, cost);
  c.seat = true;
  if (G.phase > 0) G.pop.cls.commanders += 0; // counted in the general commander pool already
  log(G, `${d.name} takes a seat on the ${G.phase === 0 ? 'Committee' : 'High Council'}.`, 'council');
  return ok(`${d.name} is seated.`);
}
export function unseatCommander(G, id) {
  const c = G.cmd[id];
  if (!c?.seat) return no('Not seated');
  c.seat = false; c.portfolio = null; c.loyalty = clamp(c.loyalty - 20, 0, 100);
  log(G, `${COMMANDERS[id].name} is removed from the ${G.phase === 0 ? 'Committee' : 'High Council'}.`, 'council');
  return ok('Removed. He will remember this.');
}
export function setPortfolio(G, id, pf) {
  const c = G.cmd[id];
  if (!c?.seat) return no('Seat him first');
  for (const o of seated(G)) if (G.cmd[o].portfolio === pf) G.cmd[o].portfolio = null;
  c.portfolio = pf || null;
  return ok('Portfolio assigned');
}
export function appointDistrict(G, did) {
  const cap = districtCap(G, did);
  const cur = G.council[did].filled;
  if (cur >= cap) return no(cap === 0 ? 'Hold states in this district first' : 'All seats available are filled');
  const cost = { power: 8 };
  if (!canAfford(G, cost)) return no('Not enough Power');
  pay(G, cost);
  const n = Math.min(5, cap - cur);
  G.council[did].filled += n;
  return ok(`${n} Commanders appointed to the ${DISTRICTS[did].name} council.`);
}

// ---------------- The Coup ----------------
export function coupReady(G) {
  const avg = (G.plot.congress + G.plot.whitehouse + G.plot.court) / 3;
  const goals = ['g_chapters', 'g_committee', 'g_infil'].every(g => G.goals[g] != null);
  return { avg, ready: avg >= 100 && goals, goals, early: avg >= 50 };
}
const COUP_BONUS = { DC: 60, MD: 22, VA: 18, MA: 26, NH: 12, RI: 14, CT: 16, ME: 8, NY: 14, PA: 14, NJ: 14, DE: 16, WV: 10, OH: 8, KY: 6, TN: 6, IN: 6, CA: -20, OR: -14, WA: -14, IL: -6, TX: -4 };
export function launchCoup(G, early = false) {
  const { avg, ready } = coupReady(G);
  if (G.phase !== 0) return no('Already done');
  if (!ready && !early) return no('The strikes are not ready');
  if (!early && !coupReady(G).goals) return no('Complete the Committee\'s key goals first');
  const q = avg / 100 * (early ? 0.75 : 1);
  const inf = infiltration(G);
  G.plot.coupDay = G.day;
  G.phase = 1;
  G.flags.phase1Start = G.day;
  let gileadCount = 0;
  for (const [ab, s] of Object.entries(G.st)) {
    if (s.exile) { s.hold = 0; continue; }
    const sc = s.chapter * 0.42 + s.infil * 0.38 + STATES[ab].faith * 22 + (COUP_BONUS[ab] || 0) + inf * 0.25 + (q - 1) * 30 + (rand(G) * 20 - 10);
    s.hold = sc >= 52 ? 100 : sc >= 36 ? rint(G, 55, 80) : sc >= 22 ? rint(G, 25, 50) : rint(G, 5, 20);
    s.resist = clamp(Math.round(80 - sc * 0.8 + rand(G) * 20), 15, 95);
    if (s.hold >= 100) { annex(G, ab, true); gileadCount++; }
  }
  G.st.DC.hold = 100; if (!G.st.DC.annexed) { annex(G, 'DC', true); gileadCount++; }
  const p = G.pop;
  // The Sons of Jacob and turned soldiers form the first elite and the first Guardians.
  const mem = G.res.members;
  p.cls.guardians = Math.round(120000 * (0.4 + inf / 40) + mem * 0.15);
  p.cls.eyes = Math.round(mem * 0.012);
  p.cls.aunts = 180 + Math.round(mem * 0.0004);
  p.men = Math.max(0, p.men - p.cls.guardians - p.cls.eyes);
  p.women = Math.max(0, p.women - p.cls.aunts);
  G.army.usa = clamp(Math.round(60 - inf * 0.4 - q * 10), 25, 70);
  G.res.treasury = Math.round(G.res.funds + 150);
  G.res.power = 40 + Math.round(G.res.influence * 0.4);
  G.res.supplies = 400;
  G.res.stability = clamp(40 + q * 15, 0, 100);
  G.res.fear = 25; G.res.piety = 35; G.res.standing = early ? -20 : -10; G.res.resistance = 20;
  // Committee becomes the provisional government
  for (const id of seated(G)) G.cmd[id].loyalty = clamp(G.cmd[id].loyalty + 10, 0, 100);
  // Districts: give a starting council in held districts
  for (const id of Object.keys(DISTRICTS)) G.council[id].filled = Math.floor(districtCap(G, id) * 0.3);
  G.decrees.d_martial_law = G.day; invalidate(G);
  applyFx(G, DECREE_BY_ID.d_martial_law.once);
  fx(G, 'coup', { st: 'DC' });
  log(G, `THE THREE STRIKES. Congress, the White House and the Supreme Court are attacked. Martial law is declared. ${gileadCount} states fall into your hands overnight.`, 'phase', 'DC');
  return ok('The Three Strikes');
}

// ---------------- Decrees ----------------
export function decreeState(G, d) {
  if (G.decrees[d.id] != null) return 'enacted';
  if (d.phase > G.phase) return 'locked';
  if (!d.req.every(r => G.decrees[r] != null)) return 'blocked';
  return 'available';
}
export function decreeCost(G, d) {
  let c = d.cost;
  if (G.flags.discount?.[d.id]) c = Math.round(c * G.flags.discount[d.id]);
  return c;
}
export function enact(G, id) {
  const d = DECREE_BY_ID[id];
  if (!d) return no('Unknown');
  const s = decreeState(G, d);
  if (s !== 'available') return no(s === 'enacted' ? 'Already law' : 'Requirements not met');
  const cost = { power: decreeCost(G, d) };
  if (!canAfford(G, cost)) return no('Not enough Power');
  pay(G, cost);
  G.decrees[id] = G.day;
  invalidate(G);
  applyFx(G, d.once);
  log(G, `DECREE: ${d.name}. ${d.quote}`, 'decree');
  return ok(`${d.name} is now law.`);
}

// ---------------- Construction ----------------
export function buildAvailability(G, type, city, tier = 0) {
  const B = BUILDINGS[type];
  if (G.phase === 0) return no('Seize power first');
  if (!cityHeld(G, city)) return no('City not under Gilead control');
  if (B.unlock && G.decrees[B.unlock] == null) return no('Requires decree: ' + (DECREE_BY_ID[B.unlock]?.name || B.unlock));
  const T = B.tiers[tier];
  if (!T) return no('No such tier');
  if (T.unlock && G.decrees[T.unlock] == null) return no('Requires decree: ' + DECREE_BY_ID[T.unlock].name);
  if (B.unique === 'city' && G.bld.some(b => b.type === type && b.city === city)) return no('Already one here');
  if (B.unique === 'nation' && G.bld.some(b => b.type === type)) return no('Only one may exist');
  if (B.cities && !B.cities.includes(city)) return no('Only at ' + B.cities.map(c => CITY_POS[c].name).join(', '));
  const slots = 2 + CITIES[city].rank * 2;
  if (G.bld.filter(b => b.city === city).length >= slots) return no(`City full (${slots} institutions)`);
  if (G.res.treasury < T.cost) return no(`Needs ₲${T.cost}M`);
  return ok('');
}
export function build(G, type, city, tier = 0) {
  const a = buildAvailability(G, type, city, tier);
  if (!a.ok) return a;
  const B = BUILDINGS[type], T = B.tiers[tier];
  add(G, 'treasury', -T.cost);
  const i = G.nameIdx[type] || 0;
  G.nameIdx[type] = i + 1;
  let name = B.names[i % B.names.length];
  if (B.unique === 'city') name = `${B.names[0]} — ${CITY_POS[city].name}`;
  else if (i >= B.names.length) name += ` ${Math.floor(i / B.names.length) + 1}`;
  const speed = 1 + (M(G, 'adm') || 0) + (G._admBonus || 0);
  G.bld.push({ uid: G.uid++, type, tier, city, name, start: G.day, done: G.day + Math.max(2, Math.round(T.build / speed)), cohorts: [], occ: 0 });
  log(G, `Construction begins: ${name}, ${CITY_POS[city].name} (${T.name}).`, 'build', city);
  return ok(`${name} — construction begun`);
}
export function demolish(G, uid) {
  const i = G.bld.findIndex(b => b.uid === uid);
  if (i < 0) return no('?');
  const b = G.bld[i], B = BUILDINGS[b.type];
  // trainees return to their pool
  for (const c of b.cohorts || []) { if (B.from in G.pop) G.pop[B.from] += c.n; else if (B.from in G.pop.cls) G.pop.cls[B.from] += c.n; }
  if (B.housing) G.pop.cls.unwomen += 0; // occupants simply become unhoused
  G.bld.splice(i, 1);
  log(G, `${b.name} is closed.`, 'build', b.city);
  return ok('Closed');
}

// ---------------- War ----------------
export function availableTroops(G) { return Math.max(0, G.pop.cls.guardians - G.army.committed); }
export function canAttack(G, ab) {
  const s = G.st[ab];
  if (!s || s.exile) return no('The government-in-exile is beyond reach');
  if (s.hold >= 99.5) return no('Already held');
  const shape = STATE_SHAPES.find(x => x.id === STATES[ab].fips);
  const adj = shape.n.some(f => { const a = Object.keys(STATES).find(k => STATES[k].fips === f); return a && G.st[a].hold >= 60; });
  if (!adj && s.hold < 25) return no('No border with Gilead-held territory');
  return ok('');
}
export function supplied(G, ab) {
  const c = centroid(ab);
  return G.bld.some(b => b.type === 'depot' && b.done == null && dist(CITY_POS[b.city], c) <= BUILDINGS.depot.range);
}
export function launchOffensive(G, ab, troops) {
  const a = canAttack(G, ab);
  if (!a.ok) return a;
  if (G.ops.some(o => o.st === ab)) return no('An offensive is already under way there');
  troops = Math.round(Math.min(troops, availableTroops(G)));
  if (troops < 5000) return no('Not enough Guardians available (min 5,000)');
  if (G.res.supplies < 20) return no('Not enough supplies');
  add(G, 'supplies', -20);
  G.army.committed += troops;
  G.ops.push({ uid: G.uid++, st: ab, troops, start: G.day, gained: 0 });
  log(G, `Offensive launched in ${STATES[ab].name}: ${fmtNum(troops)} Guardians committed.`, 'war', ab);
  fx(G, 'offensive', { st: ab });
  return ok('Offensive launched');
}
export function cancelOffensive(G, uid) {
  const i = G.ops.findIndex(o => o.uid === uid);
  if (i < 0) return no('?');
  G.army.committed = Math.max(0, G.army.committed - G.ops[i].troops);
  G.ops.splice(i, 1);
  return ok('Troops withdrawn');
}
export function airfieldFor(G, ab) {
  const c = centroid(ab);
  let best = null, bd = 1e9;
  for (const b of G.bld) if (b.type === 'airfield' && b.done == null) { const d = dist(CITY_POS[b.city], c); if (d < bd) { bd = d; best = b; } }
  return bd <= BUILDINGS.airfield.range ? best : null;
}
export function strikeCheck(G, ab, kind) {
  if (kind === 'air' && !M(G, 'airstrike')) return no('Requires decree: Air Strike Doctrine');
  if (kind === 'drone' && !M(G, 'drone')) return no('Requires decree: Drone Programme');
  const s = G.st[ab];
  if (!s || s.exile) return no('Out of reach');
  if (s.hold >= 99.5 && kind === 'air') return no('Already held');
  const af = airfieldFor(G, ab);
  if (!af) return no('No Airfield within range');
  const cd = G.cool[kind] || 0;
  if (cd > G.day) return no(`Aircraft rearming: ${cd - G.day} days`);
  const cost = kind === 'air' ? { treasury: 12, supplies: 10 } : { treasury: 6 };
  if (!canAfford(G, cost)) return no('Not enough treasury/supplies');
  return { ok: true, af, cost };
}
export function strike(G, ab, kind) {
  const c = strikeCheck(G, ab, kind);
  if (!c.ok) return c;
  pay(G, c.cost);
  const s = G.st[ab];
  const sat = M(G, 'airCasualties');
  if (kind === 'air') {
    G.cool.air = G.day + 6;
    const gain = 7 + 9 * (1 + M(G, 'airPower')) * (0.6 + rand(G) * 0.6);
    s.hold = clamp(s.hold + gain, 0, 100); s.resist = clamp(s.resist - 9, 0, 100);
    s.popLoss += 2000 + sat * 15000;
    add(G, 'standing', -(1.6 + sat * 3)); add(G, 'fear', 1.5); add(G, 'resistance', 0.6);
    G.stats.strikes++;
    fx(G, 'airstrike', { st: ab, from: c.af.city });
    log(G, `Air strike on ${STATES[ab].name}. Gilead's grip tightens (+${gain.toFixed(0)}%).`, 'war', ab);
    return ok(`Air strike: +${gain.toFixed(0)}% control`);
  } else {
    G.cool.drone = G.day + 3;
    s.resist = clamp(s.resist - 14, 0, 100); s.hold = clamp(s.hold + 2.5, 0, 100);
    add(G, 'resistance', -2.5); add(G, 'standing', -0.4);
    G.stats.drones++;
    fx(G, 'drone', { st: ab, from: c.af.city });
    log(G, `Drone strike on a resistance cell in ${STATES[ab].name}.`, 'war', ab);
    return ok('Drone strike: resistance cell destroyed');
  }
}
export function heliCapacity(G) { return M(G, 'heli') ? G.bld.filter(b => b.type === 'airfield' && b.done == null).length * 2 : 0; }
export function toggleHeli(G, ab) {
  const s = G.st[ab];
  if (s.heli) { s.heli = false; return ok('Patrols withdrawn'); }
  if (!M(G, 'heli')) return no('Requires decree: Helicopter Patrols');
  if (!airfieldFor(G, ab)) return no('No Airfield within range');
  const used = Object.values(G.st).filter(x => x.heli).length;
  if (used >= heliCapacity(G)) return no(`All ${heliCapacity(G)} squadrons deployed (2 per Airfield)`);
  s.heli = true;
  return ok(`Helicopters patrol ${STATES[ab].name}`);
}
