// Information sheets: tap almost anything in the game to learn what it is, how to get it and what it does.
// infoSheet(G, key) renders a modal body for an info key ('mech:power', 'class:handmaids', 'bld:redcenter',
// 'dec:d_ceremony', 'cmd:lawrence', 'goal:g_book', 'era:2', 'pf:adm', 'dist:capital', 'pool:fertile',
// 'plot:sermon', 'term:mayday'). codexScreen(G, q, cat) is the searchable index of all of them.
import {
  STATES, CITIES, DISTRICTS, COMMANDERS, BUILDINGS, fmtNum, fmtDate, gileadPop, inTraining, infiltration, seated,
  councilFill, districtCap, M, HIGH_COUNCIL_SEATS, COMMITTEE_SEATS,
} from '../engine/core.js';
import * as A from '../engine/actions.js';
import { H as SIMH, powerCap, supplyCap, LEDGER_DAYS } from '../engine/sim.js';
import { CITY_POS } from '../data/geo.js';
import { DECREES } from '../data/decrees.js';
import { GOALS, PHASES } from '../data/phases.js';
import { PORTFOLIOS } from '../data/commanders.js';
import { BUILD_ORDER } from '../data/buildings.js';
import { CODEX_CATS, MECH, TERMS, CLASS_HOW, POOL_HOW, BLD_EFFECT, PLOT_INFO } from '../data/codex.js';
import { CLASS_INFO, POOL_INFO, figure, portrait } from './art.js';
import { meter, fxChips, esc } from './widgets.js';
import { icon } from './icons.js';
import { model } from './models.js';
import { recommendForCity, bestCrossing } from '../engine/advisor.js';
import { CROSSINGS } from '../data/sites.js';

const C = { red: '#e5484d', gold: '#d9b566', blue: '#5b8def', green: '#3dd68c', amber: '#ffb224', violet: '#9e8cfc', slate: '#8d95a3' };
const DEC = Object.fromEntries(DECREES.map(d => [d.id, d]));
const pct = v => Math.round(v) + '%';
const signed = (v, d = 1) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);
const money = (sym, m) => sym + fmtNum(m * 1e6);
const costTxt = c => Object.entries(c || {}).map(([k, v]) => k === 'funds' ? `$${v}M` : k === 'treasury' ? `₲${v}M` : `${v} ${k[0].toUpperCase() + k.slice(1)}`).join(' · ');
const heldN = G => Object.values(G.st).filter(s => s.hold >= 99.5 && !s.exile).length;
const keyMet = (G, ph = G.phase) => { const k = GOALS.filter(g => g.phase === ph && g.key); return `${k.filter(g => G.goals[g.id] != null).length} / ${k.length}`; };
const built = (G, t) => G.bld.filter(b => b.type === t && b.done == null).length;
const nextLedger = G => { const d = LEDGER_DAYS - (G.day % LEDGER_DAYS); return `In ${d} day${d === 1 ? '' : 's'}`; };
const mo = v => (v >= 0 ? '+' : '−') + '₲' + Math.round(Math.abs(v) * 30) + 'M';
const GRANARY = { full: 'Full (Stability +3)', ok: 'Adequate', rationing: 'Rationing (Stability −6)', famine: 'Famine (Stability −20)' };
const cdTxt = (G, id) => { const d = (G.cool[id] || 0) - G.day; return d > 0 ? `Ready in ${d} days` : 'Ready now'; };

// Lasting decree modifiers in plain words.
const MOD_TXT = {
  income: v => `Treasury income +${pct(v * 100)}`,
  regWomen: v => `Women marry as Econowives ${pct(v * 100)} faster`,
  powerDay: v => `+${Math.round(v * 15)} Power a month`,
  arrests: v => `Eyes make ${pct(v * 100)} more arrests`,
  fertileFind: v => v >= 1 ? 'Fertile women can be sent to Red Centres' : `Fertile women found ${pct(v * 100)} faster`,
  seizeChildren: () => 'Children are taken from "unfit" parents into elite households',
  births: () => 'Handmaids can conceive',
  unwomen: v => `${pct(v * 100)} more people declared Unwomen`,
  adm: v => `Administration ${v > 0 ? '+' : '−'}${pct(Math.abs(v) * 100)} (income, construction)`,
  supplyUse: v => `Supply consumption ${v > 0 ? '+' : '−'}${pct(Math.abs(v) * 100)}`,
  fertility: v => `Fertility +${pct(v * 100)}`,
  birthPiety: () => 'Each birth raises Piety',
  handmaidUnrest: v => `Handmaid unrest −${pct(Math.abs(v) * 100)}`,
  escape: v => `Escapes −${pct(Math.abs(v) * 100)}`,
  airstrike: () => 'Air strikes from Airfields',
  heli: () => '2 helicopter squadrons per Airfield',
  drone: () => 'Drone strikes from Airfields',
  airPower: v => `Air strikes +${pct(v * 100)} stronger`,
  airCasualties: () => 'Air strikes kill civilians and cost much more standing',
  barracks: v => `Barracks train ${pct(v * 100)} faster`,
  sanctionRelief: v => `Sanctions −${pct(v * 100)}`,
  standingDay: v => `Standing +${v} per day`,
  maydayForeign: v => `Foreign support for Mayday ${v < 0 ? 'reduced' : 'increased'}`,
  returnees: () => 'Refugees return home',
  hardlinerAnger: () => 'Hardliner Commanders lose loyalty',
  decap: v => `Leaders far safer from decapitation strikes (${pct(v * 100)})`,
  offense: v => `Offensives +${pct(v * 100)} stronger`,
};
const PF_MORE = {
  adm: 'Treasury income rises by up to 25% (and construction is faster), scaled by his Administration stat.',
  mil: 'Offensives gain up to 30% strength, scaled by his Military stat.',
  int: 'Mayday is suppressed harder and detention yields more, scaled by his Eyes stat.',
  dip: 'International standing drifts higher, scaled by his Diplomacy stat. Helps against sanctions.',
  faith: 'Piety holds higher, scaled by his Zeal stat.',
};
const STAT_TXT = { adm: 'Administration', mil: 'Military', int: 'Eyes (intelligence)', dip: 'Diplomacy', zeal: 'Zeal' };

// Live values shown under "Right now" for mechanics.
const LIVE = {
  time: G => [['Date', fmtDate(G.day)], ['Speed', G.paused ? 'Paused' : G.speed + '×']],
  eras: G => [['Current era', `${G.phase + 1}. ${PHASES[G.phase].name}`], ['Key goals met', keyMet(G)]],
  goals: G => [['Goals achieved', Object.keys(G.goals).length], ['Key goals this era', keyMet(G)]],
  dispatches: G => [['Awaiting your decision', G.events.queue.length]],
  victory: G => [['States held', `${heldN(G)} / 49`]],
  census: G => [['Population', fmtNum(gileadPop(G))]],
  funds: G => [['Funds', money('$', G.res.funds)], ['Fundraising', cdTxt(G, 'fundraise')]],
  influence: G => [['Influence', fmtNum(G.res.influence)], ['Next Committee seat', costTxt(A.seatCost(G))]],
  members: G => [['Members', fmtNum(G.res.members)], ['States with a chapter', Object.values(G.st).filter(s => s.chapter > 0).length]],
  suspicion: G => [['Suspicion', pct(G.res.suspicion)], ['Moles in the Bureau', G.plot.moles ? 'Planted' : 'Not yet'], ['Cover our tracks', cdTxt(G, 'cover')]],
  chapters: G => [['States with a chapter', Object.values(G.st).filter(s => s.chapter > 0).length], ['At 25% or more', `${Object.values(G.st).filter(s => s.chapter >= 25).length} / 30`]],
  infiltration: G => [['National infiltration', `${infiltration(G).toFixed(1)}% / 35%`]],
  committee: G => [['Founders seated', `${seated(G).length} / ${COMMITTEE_SEATS}`], ['Next seat', costTxt(A.seatCost(G))]],
  coup: G => [['Congress', pct(G.plot.congress)], ['White House', pct(G.plot.whitehouse)], ['Supreme Court', pct(G.plot.court)], ['Ready to strike', A.coupReady(G).ready ? 'Yes' : 'Not yet']],
  power: G => [['Power', `${fmtNum(G.res.power)} / ${powerCap(G)}`], ['Granted at the next Ledger', G.res.power >= powerCap(G) ? 'Nothing: at the ceiling' : '+' + Math.round((G._powerDay || 0) * 30)], ['Next Ledger', nextLedger(G)]],
  decrees: G => [['Enacted', `${Object.keys(G.decrees).length} / ${DECREES.length}`], ['Available now', DECREES.filter(d => A.decreeState(G, d) === 'available').length]],
  treasury: G => { const p = G._incomeParts || {}; return [['Treasury', money('₲', G.res.treasury) + (G.res.treasury < 0 ? ' (in arrears)' : '')], ['Taxes and labour', mo(p.taxes || 0) + ' a month'], ['State Workshops', mo(p.works || 0) + (G._staffed < 1 ? ` (${pct(G._staffed * 100)} staffed)` : '')], ['Trade abroad', mo((p.trade || 0) + (p.mexico || 0))], ['Institutions', mo(-(p.buildings || 0))], ['Guardians and Eyes', mo(-(p.forces || 0))], ['Net at the next Ledger', mo((G._income || 0) - (G._upkeep || 0))], ['Next Ledger', nextLedger(G)], ['Sanctions', `−${pct((G._sanctions || 0) * 100)} income`]]; },
  supplies: G => [['Supplies', `${fmtNum(G.res.supplies)} / ${fmtNum(supplyCap(G))}`], ['Granaries', GRANARY[G._granary] || 'Adequate'], ['Net at the next Ledger', signed((G._supplyNet || 0) * 30, 0)], ['Next Ledger', nextLedger(G)]],
  ledger: G => { const L = G.lastLedger; return [['Next Ledger', nextLedger(G)], ...(L ? [['Last Ledger', fmtDate(L.day, true)], ['Treasury', mo(L.treasury / 30)], ['Supplies', signed(L.supplies, 0)], ['Power', '+' + Math.round(L.power)]] : [])]; },
  crews: G => [['Building crews', `${A.building(G)} busy of ${A.crews(G)}`], ['Held cities', Object.keys(CITIES).filter(c => G.st[CITIES[c].st]?.hold >= 99.5).length]],
  stability: G => [['Stability', Math.round(G.res.stability)]],
  piety: G => [['Piety', Math.round(G.res.piety)]],
  fear: G => [['Fear', Math.round(G.res.fear)]],
  standing: G => [['Standing', signed(G.res.standing, 0)]],
  sanctions: G => [['Income lost to sanctions', pct((G._sanctions || 0) * 100)]],
  mayday: G => [['Mayday', Math.round(G.res.resistance)]],
  births: G => [['Live births, last 12 months', fmtNum(G.pop.birthsYear)], ['Pregnancies under way', fmtNum(G.pop.pregnant.reduce((a, b) => a + b[1], 0))], ['The Ceremony', M(G, 'births') ? 'Instituted' : 'Not decreed']],
  construction: G => [['Institutions operating', G.bld.filter(b => b.done == null).length], ['Under construction', G.bld.filter(b => b.done != null).length]],
  processing: G => [['Awaiting processing', fmtNum(G.pop.men + G.pop.women + G.pop.fertile + G.pop.children)], ['Detainees', fmtNum(G.pop.detainees)]],
  auntstaff: G => [['Aunts', fmtNum(G.pop.cls.aunts)], ['Red Centre staffing', pct((G._auntEff ?? 1) * 100)]],
  escapes: G => [['Escaped so far', fmtNum(G.pop.escaped)], ['Returned', fmtNum(G.pop.returnees)]],
  control: G => [['States held', `${heldN(G)} / 49`], ['Contested', Object.values(G.st).filter(s => !s.exile && s.hold > 0.5 && s.hold < 99.5).length]],
  usa: G => [['Loyalist strength', Math.round(G.army.usa)]],
  offensive: G => [['Guardians available', fmtNum(A.availableTroops(G))], ['Offensives under way', G.ops.length]],
  supply: G => [['Rail Depots', built(G, 'depot')]],
  airstrike: G => [['Doctrine', M(G, 'airstrike') ? 'Authorised' : 'Decree required'], ['Airfields', built(G, 'airfield')]],
  drone: G => [['Programme', M(G, 'drone') ? 'Active' : 'Decree required'], ['Airfields', built(G, 'airfield')]],
  heli: G => [['Squadrons in use', M(G, 'heli') ? `${Object.values(G.st).filter(s => s.heli).length} / ${A.heliCapacity(G)}` : 'Decree required']],
  highcouncil: G => [['Seated', `${seated(G).length} / ${G.phase === 0 ? COMMITTEE_SEATS : HIGH_COUNCIL_SEATS}`], ['Next seat', costTxt(A.seatCost(G))]],
  portfolio: G => [['Portfolios held', `${Object.keys(PORTFOLIOS).filter(k => seated(G).some(id => G.cmd[id].portfolio === k)).length} / 5`]],
  districts: G => [['District seats filled', pct(councilFill(G) * 100)]],
};

// ---------------- Rendering helpers ----------------
const chip = key => {
  const e = entryOf(key);
  return e ? `<button class="ichip" data-act="info" data-arg="${key}">${icon(e.icon)}${esc(e.title)}</button>` : '';
};
const section = (ic, title, body) => body ? `<div class="isec"><h4>${icon(ic)}${title}</h4>${body.startsWith('<') ? body : `<p>${body}</p>`}</div>` : '';
const kvs = rows => rows.length ? `<div class="ilive">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>` : '';
const tileStyle = color => `style="--c:${color}"`;

// A minimal description of any info key, for chips and the Codex.
export function entryOf(key) {
  const [p, id] = String(key).split(':');
  switch (p) {
    case 'mech': return MECH[id] && { ...MECH[id], color: C.gold };
    case 'term': return TERMS[id] && { ...TERMS[id], color: C.red };
    case 'class': return CLASS_INFO[id] && { icon: 'users', title: CLASS_INFO[id].label, summary: CLASS_INFO[id].desc, color: CLASS_INFO[id].color, cat: 'classes', fig: CLASS_INFO[id].fig };
    case 'pool': return POOL_HOW[id] && { icon: 'hourglass', title: POOL_HOW[id][0], summary: POOL_HOW[id][1], color: C.slate, cat: 'classes' };
    case 'bld': return BUILDINGS[id] && { icon: BUILDINGS[id].icon, title: BUILDINGS[id].label, summary: BUILDINGS[id].desc, color: BUILDINGS[id].color, cat: 'inst', model: id };
    case 'dec': return DEC[id] && { icon: 'scroll', title: DEC[id].name, summary: DEC[id].desc, color: C.gold, cat: 'decrees' };
    case 'era': return PHASES[+id] && { icon: 'layers', title: PHASES[+id].name, summary: PHASES[+id].sub, color: C.red };
    case 'goal': { const g = GOALS.find(x => x.id === id); return g && { icon: g.key ? 'star-fill' : 'target', title: g.name, summary: g.hint, color: C.gold }; }
    case 'cmd': return COMMANDERS[id] && { icon: 'medal', title: COMMANDERS[id].name, summary: COMMANDERS[id].title, color: C.gold };
    case 'pf': return PORTFOLIOS[id] && { icon: PORTFOLIOS[id].icon, title: PORTFOLIOS[id].name, summary: PORTFOLIOS[id].desc, color: C.gold };
    case 'dist': return DISTRICTS[id] && { icon: 'columns', title: DISTRICTS[id].name, summary: `${DISTRICTS[id].seats} seats`, color: C.gold };
    case 'plot': return A.PLOT_ACTIONS[id] && { icon: A.PLOT_ACTIONS[id].icon, title: A.PLOT_ACTIONS[id].name, summary: A.PLOT_ACTIONS[id].desc, color: C.gold };
  }
  return null;
}

// ---------------- The sheet ----------------
export function infoSheet(G, key, canBack = false) {
  const [p, id] = String(key).split(':');
  const e = entryOf(key);
  if (!e) return null;
  let kicker = '', tile = icon(e.icon), color = e.color || C.gold, body = '', actions = '';
  const rel = [];

  if (p === 'mech' || p === 'term') {
    const m = p === 'mech' ? MECH[id] : TERMS[id];
    kicker = p === 'term' ? 'Glossary' : CODEX_CATS[m.cat].name;
    body += `<p class="ilead">${m.summary}</p>`;
    if (G && LIVE[id] && p === 'mech') body += section('clock', 'Right now', kvs(LIVE[id](G)));
    body += section('plus', 'How to get it', m.how) + section('bolt', 'What it does', m.affects) + (m.body ? section('info', 'Details', m.body) : '');
    rel.push(...(m.related || []));
  } else if (p === 'class') {
    const c = CLASS_INFO[id], [how, eff] = CLASS_HOW[id] || ['', ''];
    kicker = 'Class of Gilead';
    tile = figure(c.fig, 40);
    body += `<p class="ilead">${c.desc}</p>`;
    if (G && G.phase > 0) { const tr = inTraining(G); body += section('clock', 'Right now', kvs([['Count', fmtNum(G.pop.cls[id])], ...(tr[id] ? [['In training', '+' + fmtNum(tr[id])]] : [])])); }
    body += section('plus', 'How to get it', how) + section('bolt', 'What it does', eff);
    for (const t of BUILD_ORDER) { const B = BUILDINGS[t]; if (B.to === id || B.from === id) rel.push('bld:' + t); }
    rel.push('mech:processing');
  } else if (p === 'pool') {
    kicker = 'Awaiting processing';
    body += `<p class="ilead">${POOL_HOW[id][1]}</p>`;
    if (G && G.phase > 0) body += section('clock', 'Right now', kvs([['Count', fmtNum(G.pop[id])]]));
    for (const t of BUILD_ORDER) if (BUILDINGS[t].from === id) rel.push('bld:' + t);
    rel.push('mech:processing');
  } else if (p === 'bld') {
    const B = BUILDINGS[id];
    kicker = 'Institution';
    tile = model(id);
    body += `<p class="ilead">${B.desc}</p>`;
    body += section('bolt', 'What it does', BLD_EFFECT[id] || '');
    const unl = B.unlock ? DEC[B.unlock] : null;
    const unlocked = !B.unlock || (G && G.decrees[B.unlock] != null);
    let how = unl ? `Enact the decree <b>${unl.name}</b>${G ? (unlocked ? ' <span class="good">(enacted)</span>' : ' <span class="warn">(not yet)</span>') : ''}, then tap a city you hold on the map and choose it under Build.` : 'Tap a city you hold on the map and choose it under Build.';
    if (B.unique === 'site') how = `${unl ? `Enact the decree <b>${unl.name}</b>${G ? (unlocked ? ' <span class="good">(enacted)</span>' : ' <span class="warn">(not yet)</span>') : ''}. ` : ''}Checkpoints stand only where a road crosses a state line, so their number is limited: there are ${CROSSINGS.length} crossings in all. Tap a state on the map and choose a crossing under Border checkpoints. At least one side of the line must be held.`;
    if (B.unique === 'city') how += ' One per city.';
    if (B.unique === 'nation') how += ` Only one in the nation${B.cities ? `, at ${B.cities.map(c => CITY_POS[c]?.name).join(', ')}` : ''}.`;
    if (B.needsAunts) how += ` Needs Aunts on staff (${B.needsAunts} for a converted centre, 20 purpose-built).`;
    body += section('plus', 'How to build it', how);
    const conv = B.from ? `${POOL_INFO[B.from]?.label || CLASS_INFO[B.from]?.label || B.from} → ${B.to === 'processed' ? 'interrogated' : CLASS_INFO[B.to]?.label}` : '';
    body += section('layers', 'Versions', `<div class="itiers">${B.tiers.map((T, i) => `<div><b>${T.name}</b><span>₲${G ? A.buildCost(G, id, i) : T.cost}M · ${T.build} days to build${T.cap ? ` · ${B.housing ? 'houses ' + fmtNum(T.cap) : fmtNum(T.cap) + ' per ' + T.days + '-day course'}` : ''}${T.income ? ` · earns ₲${Math.round(T.income * 30)}M a month` : ''}${T.upkeep ? ` · upkeep ₲${Math.max(1, Math.round(T.upkeep * 0.3 * 30))}M a month` : ''}</span>${T.unlock ? `<small>${icon('lock')}Needs ${DEC[T.unlock]?.name}</small>` : ''}</div>`).join('')}</div>${conv ? `<p class="muted">Converts: ${conv}</p>` : ''}`);
    if (B.names.length > 1) body += section('book', 'Names', `<p class="muted">Each new one takes the next name: ${B.names.slice(0, 6).map(esc).join(', ')}…</p>`);
    if (G) body += section('clock', 'Right now', kvs([['Operating', built(G, id)], ['Under construction', G.bld.filter(b => b.type === id && b.done != null).length]]));
    if (G && G.phase > 0) {
      const best = B.unique === 'site' ? bestCrossing(G) : Object.keys(CITIES).flatMap(c => recommendForCity(G, c, undefined, 20)).filter(r => r.type === id).sort((a, b) => b.score - a.score)[0];
      if (best?.site) {
        body += section('bulb', 'Advisor', `<p>${esc(best.reason)}</p>`);
        actions = `<button class="btn" data-act="state" data-arg="${best.st}">${icon('map')}Best site: ${STATES[best.st].name}</button>`;
      } else if (best) {
        body += section('bulb', 'Advisor', `<p>${esc(best.reason)}</p>`);
        actions = `<button class="btn" data-act="city" data-arg="${best.city}">${icon('pin')}Best site: ${CITY_POS[best.city].name}</button>`;
      }
    }
    if (B.unlock) rel.push('dec:' + B.unlock);
    for (const T of B.tiers) if (T.unlock) rel.push('dec:' + T.unlock);
    if (B.to && CLASS_INFO[B.to]) rel.push('class:' + B.to);
    if (B.from && POOL_HOW[B.from]) rel.push('pool:' + B.from);
    if (id === 'redcenter') rel.push('mech:auntstaff');
    if (id === 'airfield') rel.push('mech:airstrike', 'mech:drone', 'mech:heli');
    if (id === 'depot') rel.push('mech:supply');
    rel.push('mech:construction');
  } else if (p === 'dec') {
    const d = DEC[id];
    const st = G ? A.decreeState(G, d) : 'locked';
    const cost = G ? A.decreeCost(G, d) : d.cost;
    kicker = `Decree · ${PHASES[d.phase].name}`;
    if (d.quote) body += `<blockquote class="iquote">${esc(d.quote)}</blockquote>`;
    body += `<p class="ilead">${esc(d.desc)}</p>`;
    const status = st === 'enacted' ? `<span class="good">Law since ${fmtDate(G.decrees[id], true)}</span>` : st === 'available' ? '<span class="good">Can be enacted now</span>' : st === 'blocked' ? '<span class="warn">Needs other decrees first</span>' : `<span class="muted">Unlocks in ${PHASES[d.phase].name}</span>`;
    body += section('clock', 'Status', kvs([['Status', status], ['Cost', `${cost} Power${G ? ` (you have ${Math.floor(G.res.power)})` : ''}`]]));
    if (d.req.length) body += section('lock', 'Requires', `<div class="ichips">${d.req.map(r => `<button class="ichip ${G?.decrees[r] != null ? 'ok' : ''}" data-act="info" data-arg="dec:${r}">${icon(G?.decrees[r] != null ? 'check' : 'scroll')}${esc(DEC[r].name)}</button>`).join('')}</div>`);
    const once = Object.keys(d.once || {}).length ? `<div class="fxs">${fxChips(d.once)}</div>` : '';
    const lasting = Object.entries(d.mods || {}).map(([k, v]) => MOD_TXT[k] ? `<li>${MOD_TXT[k](v)}</li>` : '').join('');
    const unlocks = BUILD_ORDER.filter(t => BUILDINGS[t].unlock === id || BUILDINGS[t].tiers.some(T => T.unlock === id));
    body += section('bolt', 'Effects', (once ? `<div class="isub">Immediately</div>${once}` : '') + (lasting ? `<div class="isub">Permanently</div><ul class="ilist">${lasting}</ul>` : '') + (unlocks.length ? `<div class="isub">Unlocks institutions</div><div class="ichips">${unlocks.map(t => chip('bld:' + t)).join('')}</div>` : '') || '<p class="muted">See the description above.</p>');
    const next = DECREES.filter(x => x.req.includes(id));
    if (next.length) body += section('arrow-up', 'Leads to', `<div class="ichips">${next.map(x => chip('dec:' + x.id)).join('')}</div>`);
    if (G && st !== 'enacted') {
      const ok = st === 'available' && G.res.power >= cost;
      actions = `<button class="btn primary ${ok ? '' : 'dis'}" data-act="decree" data-arg="${id}">${icon('scroll')}Enact · ${cost} Power</button>`;
    }
    rel.push('mech:decrees', 'mech:power');
  } else if (p === 'era') {
    const n = +id, P0 = PHASES[n];
    kicker = `Era ${n + 1} of 6`;
    body += `<p class="ilead">${P0.sub}</p><p>${P0.intro}</p>`;
    if (G) body += section('clock', 'Status', kvs([['Status', n === G.phase ? '<span class="good">Current era</span>' : n < G.phase ? 'Completed' : 'Ahead'], ['Key goals met', keyMet(G, n)]]));
    const gl = GOALS.filter(g => g.phase === n);
    body += section('target', 'Goals', `<div class="ichips">${gl.map(g => `<button class="ichip ${G?.goals[g.id] != null ? 'ok' : ''}" data-act="info" data-arg="goal:${g.id}">${icon(G?.goals[g.id] != null ? 'check' : g.key ? 'star-fill' : 'target')}${esc(g.name)}</button>`).join('')}</div>`);
    const dl = DECREES.filter(d => d.phase === n);
    if (dl.length) body += section('scroll', 'New decrees', `<div class="ichips">${dl.map(d => chip('dec:' + d.id)).join('')}</div>`);
    rel.push('mech:eras', 'mech:goals');
  } else if (p === 'goal') {
    const g = GOALS.find(x => x.id === id);
    kicker = `${g.key ? 'Key goal' : 'Goal'} · ${PHASES[g.phase].name}`;
    body += `<p class="ilead">${esc(g.hint)}</p>`;
    if (G) {
      const done = G.goals[id] != null, [c, t] = g.check(G, SIMH);
      const prog = g.cmp === 'ge0' ? (c >= 0 ? 1 : (c + 100) / 100) : Math.min(1, c / (t || 1));
      body += section('clock', 'Progress', `${meter(prog * 100, 100, done ? C.green : C.gold)}${kvs([['Now', done ? `<span class="good">Achieved ${fmtDate(G.goals[id], true)}</span>` : `${fmtNum(c)} / ${fmtNum(t)}`]])}`);
    }
    body += section('bolt', 'Why it matters', g.key ? `All key goals of ${PHASES[g.phase].name} must be met before the next era begins.` : 'An optional goal. It pays a one-off reward.');
    const rw = Object.entries(g.reward || {});
    if (rw.length) body += section('star', 'Reward', `<div class="fxs">${fxChips(g.reward)}</div>`);
    rel.push(`era:${g.phase}`, 'mech:goals');
  } else if (p === 'cmd') {
    const c = COMMANDERS[id], g = G?.cmd[id];
    kicker = `${c.title} · ${c.faction === 'hard' ? 'Hardliner' : 'Pragmatist'}`;
    tile = portrait(id, c.name, c.faction, c.title.includes('High') ? 2 : 1, g && !g.alive);
    color = c.faction === 'hard' ? C.red : C.blue;
    body += `<p class="ilead">${esc(c.bio)}</p>`;
    if (g) {
      const status = !g.alive ? `<span class="bad">Deceased</span>${g.fate ? ` · ${esc(g.fate)}` : ''}` : g.status === 'arrested' ? '<span class="bad">Arrested</span>' : g.status === 'abroad' ? 'Abroad' : g.seat ? `<span class="good">Seated</span>${g.portfolio ? ` · ${PORTFOLIOS[g.portfolio].name}` : ''}` : c.joins <= G.phase ? 'Available to seat' : `Joins in ${PHASES[c.joins].name}`;
      body += section('clock', 'Right now', kvs([['Status', status], ['Loyalty', `${Math.round(g.loyalty)} / 100`], ['Home', CITY_POS[c.city]?.name || '']]));
    }
    const best = Object.entries(c.stats).sort((a, b) => b[1] - a[1])[0][0];
    const bestPf = best === 'zeal' ? 'faith' : best;
    body += section('chart-down', 'Abilities', `<div class="istats">${Object.entries(STAT_TXT).map(([k, l]) => `<div><span>${l}</span>${meter(c.stats[k] * 10, 100, k === best ? C.gold : C.slate)}<b>${c.stats[k]}</b></div>`).join('')}</div><p class="muted">Best suited to <b>${PORTFOLIOS[bestPf].name}</b>. A portfolio's bonus scales with the matching stat.</p>`);
    const hh = c.household;
    body += section('home', 'Household', kvs([['Wife', esc(hh.wife || '—')], ...(hh.handmaid ? [['Handmaid', esc(hh.handmaid)]] : []), ...(hh.marthas.length ? [['Marthas', esc(hh.marthas.join(', '))]] : []), ...(hh.guardians.length ? [['Guardians', esc(hh.guardians.join(', '))]] : []), ...(hh.children.length ? [['Children', esc(hh.children.join(', '))]] : [])]));
    if (g && g.alive && g.status === 'free' && !g.seat && c.joins <= G.phase) actions = `<button class="btn primary" data-act="seat" data-arg="${id}">${icon('plus')}Seat · ${costTxt(A.seatCost(G))}</button>`;
    rel.push(G?.phase === 0 ? 'mech:committee' : 'mech:highcouncil', 'mech:portfolio', 'mech:loyalty', 'mech:factions');
  } else if (p === 'pf') {
    const pf = PORTFOLIOS[id];
    kicker = 'Portfolio';
    body += `<p class="ilead">${pf.desc}.</p>` + section('bolt', 'What it does', PF_MORE[id]) + section('plus', 'How to assign it', 'Seat a Commander, then tap this icon on his card under Commanders. Tap it again to take the portfolio away. One Commander per portfolio.');
    if (G) { const h = seated(G).find(x => G.cmd[x].portfolio === id); body += section('clock', 'Right now', kvs([['Held by', h ? COMMANDERS[h].name : '<span class="muted">Vacant</span>']])); if (h) rel.push('cmd:' + h); }
    rel.push('mech:portfolio');
  } else if (p === 'dist') {
    const d = DISTRICTS[id];
    kicker = 'District council';
    body += `<p class="ilead">Governs ${d.states.map(s => STATES[s].name).join(', ')}. Seat of government: ${CITY_POS[d.seat]?.name || ''}.</p>`;
    if (G) body += section('clock', 'Right now', kvs([['Seats filled', `${G.council[id].filled} / ${d.seats}`], ['Seats open to fill', districtCap(G, id)], ['Hardliners', pct(G.council[id].hard * 100)]]));
    body += section('plus', 'How to fill it', MECH.districts.how) + section('bolt', 'What it does', MECH.districts.affects);
    rel.push('mech:districts');
  } else if (p === 'plot') {
    const a = A.PLOT_ACTIONS[id];
    kicker = 'Operation · The Plot';
    body += `<p class="ilead">${esc(a.desc)}</p>` + section('bolt', 'What it does', PLOT_INFO[id]);
    if (G) body += section('clock', 'Right now', kvs([['Cost', costTxt(a.cost) || 'Free'], ['Status', a.once && G.plot[id === 'publish' ? 'book' : id] ? 'Done' : cdTxt(G, id)], ...(a.needs ? [['Needs', `${COMMANDERS[a.needs].name} ${G.cmd[a.needs].seat ? '<span class="good">(seated)</span>' : '<span class="warn">(not seated)</span>'}`]] : [])]));
    rel.push('mech:suspicion', 'mech:funds');
  }

  const relHtml = [...new Set(rel)].filter(k => k !== key).map(chip).join('');
  const head = `<div class="mh"><div class="tile itile ${p === 'class' || p === 'cmd' ? 'fig' : p === 'bld' ? 'art' : ''}" ${tileStyle(color)}>${tile}</div><div><div class="loc">${kicker}</div><h2>${esc(e.title)}</h2></div></div>`;
  return `${head}<div class="mb ibody">${body}${relHtml ? `<div class="isec"><h4>${icon('layers')}See also</h4><div class="ichips">${relHtml}</div></div>` : ''}</div>
  <div class="foot">${canBack ? `<button class="btn" data-act="info-back" style="margin-right:auto">${icon('arrow-left')}Back</button>` : ''}${actions}<button class="btn ${actions ? '' : 'primary'}" data-act="closemodal">Close</button></div>`;
}

// ---------------- The Codex ----------------
export const CODEX_TABS = {
  all: { name: 'All', icon: 'book-open' },
  ...CODEX_CATS,
  classes: { name: 'Classes', icon: 'users' },
  inst: { name: 'Institutions', icon: 'columns' },
  decrees: { name: 'Decrees', icon: 'scroll' },
};
export function codexEntries() {
  const out = [];
  for (const k of Object.keys(MECH)) out.push('mech:' + k);
  for (const k of Object.keys(CLASS_INFO)) out.push('class:' + k);
  for (const k of Object.keys(POOL_HOW)) out.push('pool:' + k);
  for (const k of BUILD_ORDER) out.push('bld:' + k);
  for (const d of DECREES) out.push('dec:' + d.id);
  for (const k of Object.keys(TERMS)) out.push('term:' + k);
  return out.map(k => ({ key: k, ...entryOf(k) }));
}
export function codexScreen(G, q = '', cat = 'all', head) {
  const ql = q.trim().toLowerCase();
  const list = codexEntries().filter(e => (cat === 'all' || e.cat === cat) && (!ql || (e.title + ' ' + e.summary).toLowerCase().includes(ql)));
  let h = head('The Codex', 'How Gilead works · every mechanic, institution, decree and term', 'book-open', C.gold);
  h += `<div class="sbody"><div class="codexbar"><label class="csearch">${icon('search')}<input type="search" placeholder="Search the Codex" value="${esc(q)}" data-input="codex" autocomplete="off" autocorrect="off" spellcheck="false"></label>
    <div class="ccats">${Object.entries(CODEX_TABS).map(([k, c]) => `<button class="${k === cat ? 'on' : ''}" data-act="codexcat" data-arg="${k}">${icon(c.icon)}${c.name}</button>`).join('')}</div></div>`;
  if (!list.length) h += `<div class="empty">Nothing matches “${esc(q)}”.</div>`;
  const groups = cat === 'all' && !ql ? Object.keys(CODEX_TABS).filter(k => k !== 'all') : [null];
  for (const gk of groups) {
    const items = gk ? list.filter(e => e.cat === gk) : list;
    if (!items.length) continue;
    if (gk) h += `<h3>${icon(CODEX_TABS[gk].icon)}${CODEX_TABS[gk].name} <small>${items.length}</small></h3>`;
    h += `<div class="cgrid">${items.map(e => `<button class="centry" data-act="info" data-arg="${e.key}" data-key="${e.key}" style="--c:${e.color || C.gold}"><span class="ci ${e.model ? 'art' : ''}">${e.model ? model(e.model) : e.fig ? figure(e.fig, 30) : icon(e.icon)}</span><span class="ct"><b>${esc(e.title)}</b><small>${esc(stripTags(e.summary || ''))}</small></span></button>`).join('')}</div>`;
  }
  return h + '</div>';
}
const stripTags = s => s.replace(/<[^>]+>/g, '');
