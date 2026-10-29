// Headless simulation test: a simple bot plays full games. Checks for exceptions, NaNs,
// phase progression and save/load round trips. Run: node tests/sim.test.mjs [games] [days]
import { newGame, STATES, CITIES, BUILDINGS, seated, heldStates, contestedStates, gileadPop, infiltration, fmtDate } from '../js/engine/core.js';
import * as A from '../js/engine/actions.js';
import { tick } from '../js/engine/sim.js';
import { resolveEvent, choiceAvailable } from '../js/engine/events.js';
import { EVENT_BY_ID } from '../js/data/events.js';
import { DECREES } from '../js/data/decrees.js';
import { COMMANDERS } from '../js/data/commanders.js';
import { BUILD_ORDER } from '../js/data/buildings.js';
import { serialize, deserialize } from '../js/engine/save.js';
import { recommendations, recommendForCity, warnings } from '../js/engine/advisor.js';
import { CROSSINGS } from '../js/data/sites.js';

const GAMES = +(process.argv[2] || 4), DAYS = +(process.argv[3] || 6000);
let failures = 0;
const STATS = {};
const assert = (c, m) => { if (!c) { failures++; console.error('  ✗', m); } };

function checkNaN(G, where) {
  const bad = [];
  const walk = (o, p) => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('_')) continue;
      if (typeof v === 'number' && !Number.isFinite(v)) bad.push(p + k);
      else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p + k + '.');
    }
  };
  walk(G.res, 'res.'); walk(G.pop, 'pop.'); walk(G.st, 'st.'); walk(G.army, 'army.');
  if (bad.length) { assert(false, `NaN at ${where}: ${bad.slice(0, 5).join(', ')}`); return true; }
  return false;
}

function bot(G) {
  // events: choose first available choice (urgent first)
  for (const q of [...G.events.queue]) {
    const e = EVENT_BY_ID[q.id];
    const idx = e.choices.findIndex(c => choiceAvailable(G, e, c));
    resolveEvent(G, q.uid, Math.max(0, idx));
  }
  if (G.phase === 0) {
    for (const k of Object.keys(A.PLOT_ACTIONS)) if (k !== 'cover') A.plotAction(G, k);
    if (G.res.suspicion > 50) A.plotAction(G, 'cover');
    for (const id of Object.keys(COMMANDERS)) A.seatCommander(G, id);
    const order = Object.keys(STATES).sort((a, b) => STATES[b].faith * Math.sqrt(STATES[b].pop) - STATES[a].faith * Math.sqrt(STATES[a].pop));
    for (const ab of order.slice(0, 34)) if (G.st[ab].chapter < 40 && G.res.funds > 30) A.growChapter(G, ab);
    for (const ab of order) if (STATES[ab].bases.length && G.st[ab].infil < 45 && G.res.funds > 40) A.infiltrate(G, ab);
    for (const k of ['congress', 'whitehouse', 'court']) if (G.res.funds > 40) A.fundPlot(G, k);
    if (A.coupReady(G).ready) A.launchCoup(G);
    return;
  }
  for (const d of DECREES) if (A.decreeState(G, d) === 'available' && G.res.power > A.decreeCost(G, d) + 10) A.enact(G, d.id);
  for (const id of Object.keys(COMMANDERS)) if (G.res.power > 60) A.seatCommander(G, id);
  const pfs = ['adm', 'mil', 'int', 'dip', 'faith'];
  seated(G).forEach((id, i) => { if (!G.cmd[id].portfolio && i < 5) A.setPortfolio(G, id, pfs[i]); });
  for (const did of Object.keys(G.council)) if (G.res.power > 80) A.appointDistrict(G, did);
  // follow the Advisor, and upgrade converted buildings once purpose-built ones unlock
  if ((G._botN = (G._botN || 0) + 1) % 3 === 0) {
    const recs = recommendations(G, 6); warnings(G); STATS.runs = (STATS.runs || 0) + 1; STATS.recs = (STATS.recs || 0) + recs.length;
    for (const c of Object.keys(CITIES).slice(0, 5)) recommendForCity(G, c);
    const r = recs[0];
    const solvent = G._income > G._upkeep + 5;
    if (r && solvent && G.res.treasury > BUILDINGS[r.type].tiers[r.tier].cost + 60) {
      const res = r.replace != null ? A.replace(G, r.replace, r.type, r.tier) : A.build(G, r.type, r.city, r.tier, r.site);
      if (r.site && res.ok) STATS.checkpoints = (STATS.checkpoints || 0) + 1;
      if (r.replace != null && res.ok) STATS.replaced = (STATS.replaced || 0) + 1;
    }
    if (solvent && G.bld.filter(b => b.type === 'checkpoint').length < 8) { const x = CROSSINGS.find(x => A.checkpointAvailability(G, x.id).ok); if (x && A.build(G, 'checkpoint', null, 0, x.id).ok) STATS.checkpoints = (STATS.checkpoints || 0) + 1; }
    const up = G.bld.find(b => b.tier === 0 && b.done == null && BUILDINGS[b.type].tiers[1] && A.replaceAvailability(G, b.uid, b.type, 1).ok);
    if (up && solvent && A.replace(G, up.uid, up.type, 1).ok) STATS.upgraded = (STATS.upgraded || 0) + 1;
    for (const c of Object.keys(CITIES)) if (G.bld.filter(b => b.city === c && !b.site).length > 2 + CITIES[c].rank * 2) throw new Error('city over capacity: ' + c);
    for (const c of Object.keys(CITIES)) { const sl = G.bld.filter(b => b.city === c && !b.site).map(b => b.slot); if (new Set(sl).size !== sl.length) throw new Error('two institutions on one site in ' + c); }
    for (const b of G.bld) if (b.type === 'checkpoint' && (!b.site || G.bld.filter(o => o.site === b.site).length > 1)) throw new Error('checkpoint off a crossing or doubled: ' + b.name);
  }
  // build
  const cities = Object.keys(CITIES).filter(c => A.buildAvailability(G, 'market', c).msg !== 'City not under Gilead control' && heldStates(G).includes(CITIES[c].st));
  if (G.res.treasury > 120 && cities.length && G._income > G._upkeep + 2) {
    const want = ['redcenter', 'ardua', 'barracks', 'depot', 'airfield', 'marthahouse', 'detention', 'eyes', 'colony', 'agricolony', 'market', 'wall', 'church', 'birthcenter', 'wifeschool', 'checkpoint', 'jezebels', 'newbethlehem'];
    for (const t of want) {
      const have = G.bld.filter(b => b.type === t).length;
      const lim = { redcenter: 8, barracks: G.phase >= 3 ? 4 : 2, ardua: 3, depot: 6, airfield: 4, market: 6, wall: 3, colony: 3, agricolony: 3 }[t] || 2;
      if (have >= lim) continue;
      const tier = BUILDINGS[t].tiers[1] && A.buildAvailability(G, t, cities[0], 1).ok ? 1 : 0;
      for (const c of cities.sort(() => Math.random() - 0.5)) if (A.build(G, t, c, tier).ok) break;
      if (G.res.treasury < 120) break;
    }
  }
  // war
  for (const ab of [...contestedStates(G), ...Object.keys(G.st)]) {
    if (G.ops.length >= 4) break;
    if (A.canAttack(G, ab).ok && !G.ops.some(o => o.st === ab) && A.availableTroops(G) > 60000) A.launchOffensive(G, ab, A.availableTroops(G) / 2);
  }
  for (const ab of contestedStates(G)) { A.strike(G, ab, 'air'); A.strike(G, ab, 'drone'); A.toggleHeli(G, ab); }
}

for (let g = 0; g < GAMES; g++) {
  const G = newGame(1000 + g * 77);
  G.paused = false;
  const phaseDays = [];
  let err = null;
  try {
    for (let d = 0; d < DAYS && !G.outcome; d++) {
      const ph = G.phase;
      tick(G);
      if (G.phase !== ph) phaseDays.push(`${ph}->${G.phase}@${G.day}(${fmtDate(G.day, true)})`);
      if (d % 5 === 0) bot(G);
      G.notes = []; G.fx = [];
      if (d % 250 === 0 && checkNaN(G, 'day ' + G.day)) break;
      if (d === 1500) { const G2 = deserialize(serialize(G)); assert(G2.day === G.day && G2.res.treasury === G.res.treasury, 'save round trip'); }
    }
  } catch (e) { err = e; }
  assert(!err, `game ${g} threw: ${err && err.stack}`);
  const cl = G.pop.cls;
  console.log(`Game ${g}: outcome=${G.outcome || 'ongoing'} day=${G.day} (${fmtDate(G.day, true)}) phase=${G.phase}`);
  console.log(`  coup: ${G.plot.coupDay} (${fmtDate(G.plot.coupDay||0,true)}) early=${!!G.flags.earlyCoupDone}  phases: ${phaseDays.join(' ')}`);
  console.log(`  held=${heldStates(G).length} contested=${contestedStates(G).length} pop=${(gileadPop(G) / 1e6).toFixed(1)}M handmaids=${Math.round(cl.handmaids)} births/yr=${Math.round(G.pop.birthsYear)} guardians=${Math.round(cl.guardians)} eyes=${Math.round(cl.eyes)} aunts=${Math.round(cl.aunts)}`);
  console.log(`  res: ${Object.entries(G.res).map(([k, v]) => k + '=' + Math.round(v)).join(' ')}`);
  console.log(`  goals: ${Object.keys(G.goals).length}  decrees: ${Object.keys(G.decrees).length}  buildings: ${G.bld.length}  usa=${Math.round(G.army.usa)} infil=${Math.round(infiltration(G))}`);
  checkNaN(G, "end"); if (process.env.DBG) console.log(G.bld.filter(b => b.tier === 0 && BUILDINGS[b.type].tiers[1]).map(b => b.type + ":" + A.replaceAvailability(G, b.uid, b.type, 1).msg).join(" | ")); if (process.env.DBG) console.log(Object.keys(G.decrees).join(","), G.bld.map(b=>b.type+":"+b.city+":"+b.done).join(" "), G.pop.fertile|0, G.res.treasury|0, G._income, G._upkeep);
}
console.log(`  advisor: ${STATS.runs || 0} consultations, ${STATS.recs || 0} recommendations, ${STATS.replaced || 0} replacements, ${STATS.upgraded || 0} upgrades, ${STATS.checkpoints || 0} border checkpoints`);
console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
