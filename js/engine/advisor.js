// The Advisor: reads the state of the Republic, scores what it needs most, and recommends which
// institution to build in which city (or which weak institution to replace when a city is full).
// Pure functions of G, so the headless tests can exercise them.
import { BUILDINGS, CITIES, STATES, M, fmtNum, seated, inTraining, isHeld } from './core.js';
import { CITY_POS, STATE_SHAPES } from '../data/geo.js';
import { buildAvailability, replaceAvailability as replaceOk, availableTroops, supplied, airfieldFor, checkpointAvailability, crossingHost, crossingName } from './actions.js';
import { CROSSINGS } from '../data/sites.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const centroid = ab => { const s = STATE_SHAPES.find(x => x.id === STATES[ab].fips); return { x: s.c[0], y: s.c[1] }; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const PEOPLE = new Set(['redcenter', 'marthahouse', 'ardua', 'eyes', 'wifeschool', 'jezebels', 'market', 'church', 'checkpoint', 'birthcenter', 'detention']);

// Front: states not fully held that an offensive or strike could reach.
function fronts(G) { return Object.keys(G.st).filter(a => !G.st[a].exile && G.st[a].hold > 0.5 && G.st[a].hold < 99.5); }
function capOf(G, type, perYear = false) {
  let c = 0;
  for (const b of G.bld) if (b.type === type) { const T = BUILDINGS[type].tiers[b.tier]; c += perYear ? T.cap * 365 / T.days : T.cap; }
  return c;
}
const count = (G, type) => G.bld.filter(b => b.type === type).length;

// What the Republic needs, nationally: type -> { score 0..1, reason }.
export function needs(G) {
  const N = {};
  if (G.phase === 0) return N;
  const p = G.pop, cl = p.cls, r = G.res, tr = inTraining(G);
  const set = (t, score, reason) => { if (score > (N[t]?.score || 0)) N[t] = { score: clamp(score), reason }; };
  const fr = fronts(G);

  // Handmaids: the Republic's reason for being.
  if (M(G, 'fertileFind')) {
    const yr = capOf(G, 'redcenter', true);
    set('redcenter', p.fertile / (yr * 2 + 1500), `${fmtNum(p.fertile)} fertile women are waiting and some escape every day. ${yr ? `Red Centres train ${fmtNum(yr)} a year.` : 'There is no Red Centre yet.'}`);
  }
  // Aunts to staff the Red Centres (planned ones included).
  let auntsNeed = 0; for (const b of G.bld) if (b.type === 'redcenter') auntsNeed += b.tier ? 20 : 6;
  const auntsShort = auntsNeed - cl.aunts - (tr.aunts || 0);
  if (auntsShort > 0) set('ardua', 0.55 + clamp(auntsShort / auntsNeed) * 0.45, `Red Centres need ${fmtNum(auntsShort)} more Aunts${G._auntEff < 1 ? `; they run at ${Math.round(G._auntEff * 100)}%` : ''}.`);
  else if (!count(G, 'ardua')) set('ardua', 0.15, 'No Aunts are being trained for future Red Centres.');
  // Marthas for Commanders' households.
  const wantM = cl.commanders * 1.5, haveM = cl.marthas + (tr.marthas || 0);
  if (p.women > 1000 && wantM > haveM) set('marthahouse', clamp((wantM - haveM) / wantM) * 0.55, `Commander households need about ${fmtNum(wantM)} Marthas; ${fmtNum(haveM)} serve or train.`);
  // Guardians for the fronts.
  const av = availableTroops(G);
  if (fr.length) set('barracks', clamp(1 - av / 350000) * 0.85 + 0.05, `${fr.length} front${fr.length > 1 ? 's' : ''} and only ${fmtNum(av)} Guardians free to fight.`);
  else if (cl.guardians < 50000) set('barracks', 0.3, `Only ${fmtNum(cl.guardians)} Guardians keep order.`);
  // Mayday.
  const md = r.resistance;
  set('eyes', clamp((md - 20) / 50) * 0.85, `Mayday stands at ${Math.round(md)}. The Eyes suppress it and raise Fear.`);
  if (count(G, 'checkpoint') < 10) set('checkpoint', clamp((md - 25) / 60) * 0.5, `Mayday at ${Math.round(md)} smuggles people out. Each checkpoint cuts escapes by 4% (up to 10).`);
  // Detainees waiting.
  const detYr = capOf(G, 'detention', true);
  if (p.detainees > 2000) set('detention', clamp(p.detainees / (detYr / 6 + 20000)) * 0.75, `${fmtNum(p.detainees)} detainees are held without interrogation.`);
  // Unhoused Unwomen and the food supply.
  const unh = G._unhoused || 0, short = (G._supplyNet || 0) < 0 || r.supplies < 40;
  if (unh > 5000) {
    set('colony', clamp(unh / 250000) * (short ? 0.45 : 0.7), `${fmtNum(unh)} Unwomen are held in camps. Colony labour reclaims land and raises fertility.`);
    set('agricolony', clamp(unh / 250000) * (short ? 0.75 : 0.45), `${fmtNum(unh)} Unwomen are held in camps. On farm colonies they grow food.`);
  }
  if (short) set('agricolony', 0.55 + clamp(-(G._supplyNet || 0) / 20) * 0.35, `Supplies are ${(G._supplyNet || 0) < 0 ? `falling by ${Math.abs(G._supplyNet).toFixed(1)} a day` : 'running low'}.`);
  if (short) set('market', 0.4, 'Loaves and Fishes markets cut supply consumption.');
  // Order and faith.
  if (r.stability < 62) set('market', (62 - r.stability) / 62 * 0.6, `Stability is ${Math.round(r.stability)}. Markets steady the cities.`);
  if (r.piety < 55) set('church', (55 - r.piety) / 55 * 0.6, `Piety is ${Math.round(r.piety)}. Prayvaganzas raise it and speed up marriages.`);
  const walls = count(G, 'wall'), standingMatters = G.phase >= 3 && r.standing < 5;
  if (r.fear < 35 && md > 25 && !standingMatters) set('wall', (r.standing < -30 ? 0.18 : 0.45) * Math.pow(0.6, walls), `Fear is only ${Math.round(r.fear)} while Mayday grows${r.standing < -30 ? ', but the world is already watching' : ''}.`);
  if (cl.daughters > 1500) set('wifeschool', clamp(cl.daughters / 20000) * 0.4, `${fmtNum(cl.daughters)} Daughters await preparation for marriage.`);
  const sids = seated(G);
  if (sids.length) { const loy = sids.reduce((a, id) => a + G.cmd[id].loyalty, 0) / sids.length; if (loy < 55) set('jezebels', (55 - loy) / 55 * 0.55, `Commanders' loyalty averages ${Math.round(loy)}.`); }
  // War infrastructure.
  if (fr.length) {
    const unsup = fr.filter(a => !supplied(G, a));
    if (unsup.length) set('depot', 0.35 + 0.55 * unsup.length / fr.length, `${unsup.length} of ${fr.length} fronts have no Rail Depot in range; offensives there are 55% weaker.`);
    if (M(G, 'airstrike') || M(G, 'drone') || M(G, 'heli')) {
      const noAir = fr.filter(a => !airfieldFor(G, a));
      if (noAir.length) set('airfield', 0.3 + 0.5 * noAir.length / fr.length, `${noAir.length} of ${fr.length} fronts are beyond the reach of an Airfield.`);
    }
  }
  // Births.
  if (M(G, 'births') && cl.handmaids > 500) {
    const surv = Math.min(0.9, 0.5 + count(G, 'birthcenter') * 0.05 + Math.min(0.15, p.reclaimed / 2000));
    if (surv < 0.9) set('birthcenter', (0.9 - surv) / 0.4 * 0.6, `Only ${Math.round(surv * 100)}% of babies survive. Each Birthing House saves 5% more.`);
  }
  if (G.decrees.d_new_bethlehem != null && !count(G, 'newbethlehem')) set('newbethlehem', 1, 'New Bethlehem is a key goal of this era.');
  return N;
}

// How well a city suits a type of institution (0..1), and why.
function fit(G, type, city, N) {
  const C = CITIES[city], pos = CITY_POS[city];
  let f = 1, why = '';
  if (PEOPLE.has(type)) f = 0.62 + C.rank * 0.1 + 0.08 * clamp(STATES[C.st].pop / 20);
  // Where the show put them.
  if ((type === 'redcenter' || type === 'wall' || type === 'ardua') && city === 'boston') { f += 0.12; why = type === 'wall' ? ' Boston\'s Wall is where the show hangs the condemned.' : ' Boston is the heart of the Republic.'; }
  const slots = 2 + C.rank * 2, used = G.bld.filter(b => b.city === city && !b.site).length;
  f *= 0.85 + 0.15 * (1 - used / slots);
  if (type === 'colony' || type === 'agricolony') f = [0, 1, 0.8, 0.55][C.rank];
  if (type === 'wall') f = [0, 0.6, 0.8, 1][C.rank];
  const fr = fronts(G);
  if ((type === 'depot' || type === 'airfield') && fr.length) {
    const range = BUILDINGS[type].range;
    const covered = type === 'depot' ? (a => supplied(G, a)) : (a => airfieldFor(G, a));
    const gain = fr.filter(a => !covered(a) && dist(pos, centroid(a)) <= range);
    f = gain.length / Math.max(1, fr.filter(a => !covered(a)).length);
    if (gain.length) why = ` From ${pos.name} it would cover ${gain.slice(0, 3).map(a => STATES[a].name).join(', ')}${gain.length > 3 ? ` and ${gain.length - 3} more` : ''}.`;
  }
  if (type === 'barracks' && fr.length) {
    const d = Math.min(...fr.map(a => dist(pos, centroid(a))));
    f = 0.65 + 0.35 * clamp(1 - d / 400);
  }
  const same = G.bld.filter(b => b.city === city && b.type === type).length;
  f *= Math.pow(0.8, same);
  return { f: clamp(f), why };
}

function tierFor(G, type) {
  const B = BUILDINGS[type], T1 = B.tiers[1];
  return T1 && (!T1.unlock || G.decrees[T1.unlock] != null) && G.res.treasury >= T1.cost + 120 ? 1 : 0;
}
// The weakest institution in a full city (the one the Republic needs least), for a replacement.
function weakest(G, city, N, exceptType) {
  const list = G.bld.filter(b => b.city === city && !b.site && b.type !== exceptType && b.done == null && BUILDINGS[b.type].unique !== 'nation');
  if (!list.length) return null;
  return list.map(b => ({ b, v: (N[b.type]?.score || 0) + (BUILDINGS[b.type].from && b.cohorts?.length ? 0.15 : 0) })).sort((a, b) => a.v - b.v)[0];
}

// Ranked suggestions for one city.
export function recommendForCity(G, city, N = needs(G), limit = 3) {
  const out = [];
  if (G.phase === 0 || !CITIES[city] || !isHeld(G, CITIES[city].st)) return out;
  for (const [type, nd] of Object.entries(N)) {
    if (nd.score < 0.12 || BUILDINGS[type].unique === 'site') continue;
    const tier = tierFor(G, type);
    const av = buildAvailability(G, type, city, tier);
    let replace = null;
    if (!av.ok && /^City full/.test(av.msg)) {
      const w = weakest(G, city, N, type);
      if (!w || w.v > nd.score - 0.3) continue;
      replace = w.b;
    } else if (!av.ok && !/^Needs ₲/.test(av.msg)) continue;
    const { f, why } = fit(G, type, city, N);
    // When the Treasury is bleeding, favour cheap-to-run institutions.
    const T = BUILDINGS[type].tiers[tier], net = (G._income || 0) - (G._upkeep || 0);
    const up = T.upkeep || 0;
    const thrift = type === 'newbethlehem' ? 1 : net - up < 0 ? 0.45 / (1 + up) : net - up < 2 ? 0.75 : 1;
    const many = Math.pow(0.93, count(G, type)); // diminishing returns: spread effort across needs
    const score = nd.score * f * thrift * many * (replace ? 0.8 : 1);
    let reason = nd.reason + why;
    if (net - up < 0 && type !== 'newbethlehem') reason += ` Its upkeep (₲${up}M a day) would put the Treasury in deficit.`;
    if (score < 0.08) continue;
    out.push({ type, tier, city, score, reason, replace: replace?.uid ?? null, replaceName: replace?.name, afford: G.res.treasury >= BUILDINGS[type].tiers[tier].cost });
  }
  // A Wall that is costing the Republic its standing: suggest turning it into something useful.
  const wall = G.phase >= 3 && G.res.standing < 0 && G.bld.find(b => b.city === city && !b.site && b.type === 'wall' && b.done == null);
  if (wall) {
    const best = Object.entries(N).filter(([t, v]) => t !== 'wall' && v.score >= 0.12).map(([t, v]) => ({ t, v, tier: tierFor(G, t) }))
      .filter(o => { const a = replaceOk(G, wall.uid, o.t, o.tier); return a.ok || /^Needs ₲/.test(a.msg); }).sort((a, b) => b.v.score - a.v.score)[0];
    const reason = `Standing is ${Math.round(G.res.standing)}: taking down the Wall here gains 1.5 standing${G.phase === 4 ? ', and New Bethlehem needs 0 or more' : ''}.`;
    if (best) out.push({ type: best.t, tier: best.tier, city, score: 0.5 + 0.4 * best.v.score + (G.phase === 4 ? 0.2 : 0), reason: `${reason} ${best.v.reason}`, replace: wall.uid, replaceName: wall.name, afford: G.res.treasury + 4 >= BUILDINGS[best.t].tiers[best.tier].cost });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

// The best site for each pressing need, nationally.
export function recommendations(G, limit = 6) {
  const N = needs(G), out = [];
  if (G.phase === 0) return out;
  const cities = Object.keys(CITIES).filter(c => isHeld(G, CITIES[c].st));
  const all = cities.flatMap(c => recommendForCity(G, c, N, 20));
  const cp = N.checkpoint && bestCrossing(G, N.checkpoint);
  if (cp) all.push(cp);
  // Greedy: the most pressing need picks its city first; later picks avoid piling into the same city.
  const picked = {}, used = new Set();
  while (out.length < limit) {
    let bestR = null, bestS = 0;
    for (const r of all) {
      if (used.has(r.type)) continue;
      const s = r.score * Math.pow(0.82, picked[r.city] || 0);
      if (s > bestS) { bestS = s; bestR = r; }
    }
    if (!bestR) break;
    out.push(bestR); used.add(bestR.type); picked[bestR.city] = (picked[bestR.city] || 0) + 1;
  }
  return out;
}

// Warnings that matter more than any building: shown at the top of the Advisor.
export function warnings(G) {
  const w = [];
  if (G.phase === 0) return w;
  const r = G.res, net = (G._income || 0) - (G._upkeep || 0);
  if (net < 0) w.push({ ic: 'coins', bad: true, title: `The Treasury loses ₲${Math.abs(net).toFixed(1)}M a day`, text: r.treasury < 50 ? 'Bankruptcy hurts Stability. Build nothing that is not essential, close idle institutions or give a capable Commander the Economy portfolio.' : 'Upkeep exceeds income. New institutions add to upkeep; choose carefully.' });
  if ((G._supplyNet || 0) < 0 && r.supplies < 200) w.push({ ic: 'wheat', bad: true, title: 'Supplies are running out', text: 'Famine cuts Stability by 25. Agricultural Colonies and Loaves and Fishes markets help.' });
  if (G.phase >= 3 && r.standing < 0) w.push({ ic: 'globe', bad: G.phase === 4, title: `International standing is ${Math.round(r.standing)}`, text: `Sanctions cut income${G.phase === 4 ? ', and New Bethlehem needs standing of 0 or more' : ''}. Each Wall costs 1.5 standing; air strikes cost more. A Foreign Affairs portfolio, New Bethlehem and the Mexican trade deal raise it.` });
  if ((G._auntEff ?? 1) < 1) w.push({ ic: 'book-open', bad: false, title: `Red Centres run at ${Math.round(G._auntEff * 100)}%`, text: 'Not enough Aunts to staff them. Build an Aunts\' Hall before more Red Centres.' });
  return w;
}

// The road crossing where a checkpoint does most good: lines facing enemy territory first, then the escape
// routes north to Canada.
const NORTH = new Set(['ME', 'NH', 'VT', 'NY', 'MI', 'WA', 'MN', 'ND', 'MT', 'ID', 'OH', 'PA', 'MA']);
export function bestCrossing(G, nd = needs(G).checkpoint) {
  if (!nd) return null;
  let best = null;
  for (const x of CROSSINGS) {
    const av = checkpointAvailability(G, x.id);
    if (!av.ok && !/^Needs ₲/.test(av.msg)) continue;
    const st = crossingHost(G, x), other = st === x.a ? x.b : x.a;
    const front = !isHeld(G, other), north = NORTH.has(st) || NORTH.has(other);
    const f = front ? 1 : north ? 0.85 : 0.55;
    const score = nd.score * f;
    if (!best || score > best.score) {
      const why = front ? ` The ${crossingName(x)} leads into ${STATES[other].name}, outside the Republic.` : north ? ` The ${crossingName(x)} is a route north to Canada.` : ` It guards the ${crossingName(x)}.`;
      best = { type: 'checkpoint', tier: 0, city: null, st, site: x.id, score, reason: nd.reason + why, replace: null, afford: av.ok };
    }
  }
  return best;
}
