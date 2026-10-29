// HTML renderers for the drawer and full-screen tabs. Interaction is wired in main.js via data-act attributes.
import {
  STATES, CITIES, DISTRICTS, COMMANDERS, BUILDINGS, fmtNum, fmtDate, gileadPop, inTraining, infiltration, seated, isHeld,
  councilFill, districtCap, HIGH_COUNCIL_SEATS, COMMITTEE_SEATS, M, statePop,
} from '../engine/core.js';
import * as A from '../engine/actions.js';
import { CITY_POS } from '../data/geo.js';
import { STATE_DISTRICT } from '../data/states.js';
import { DECREES } from '../data/decrees.js';
import { GOALS, PHASES } from '../data/phases.js';
import { BUILD_ORDER } from '../data/buildings.js';
import { EVENT_BY_ID } from '../data/events.js';
import { PORTFOLIOS } from '../data/commanders.js';
import { H as SIMH } from '../engine/sim.js';
import { CLASS_INFO, POOL_INFO, figure, portrait } from './art.js';
import { hemicycle, areaChart, donut, gauge, meter, esc } from './widgets.js';
import { icon } from './icons.js';
import { model } from './models.js';
import { needs, recommendForCity, recommendations, warnings } from '../engine/advisor.js';

const C = { red: '#e5484d', gold: '#d9b566', blue: '#5b8def', green: '#3dd68c', amber: '#ffb224', violet: '#9e8cfc', slate: '#8d95a3' };
const costTxt = c => Object.entries(c || {}).map(([k, v]) => k === 'funds' ? `$${v}M` : k === 'treasury' ? `₲${v}M` : `${v} ${k[0].toUpperCase() + k.slice(1)}`).join(' · ');
const pct = v => Math.round(v) + '%';

export const head = (title, sub = '', ic = null, tint = C.red, extra = '') =>
  `<div class="dhead">${ic ? `<div class="htile" style="background:color-mix(in srgb, ${tint} 15%, transparent);color:${tint}">${icon(ic)}</div>` : ''}<div class="grow"><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${extra}<button class="close" data-act="close">${icon('close')}</button></div>`;
// Tap-for-info: attributes for any element, and a small "?" button for section headers.
export const ti = key => ` data-act="info" data-arg="${key}"`;
export const hq = key => `<button class="hq"${ti(key)} aria-label="What is this?">${icon('help')}</button>`;
const actBtn = o => o.info ? `<div class="actw">${actBtn1(o)}<button class="ainfo"${ti(o.info)} aria-label="More information">${icon('info')}</button></div>` : actBtn1(o);
const actBtn1 = ({ act, arg = '', ic = 'info', art = '', color = C.slate, title, desc = '', cost = '', ok = true, done = false, plain = false }) =>
  `<button class="act ${ok ? '' : 'dis'} ${done ? 'done' : ''}" data-act="${act}" data-arg="${esc(arg)}" style="--c:${color}"><span class="ai ${art ? 'art' : ''}">${art || icon(ic)}</span><span class="at"><b>${title}</b>${desc ? `<small>${desc}</small>` : ''}</span><span class="ac ${plain ? 'plain' : ''}">${cost}</span></button>`;
const stat = (k, ic, color, v, extra = '', key = '') => `<div class="stat"${key ? ti(key) : ''} style="--c:${color}"><div class="k">${icon(ic)}${k}</div><div class="v">${v}</div>${extra}</div>`;
const stateTag = (G, ab) => {
  const s = G.st[ab];
  if (s.exile) return `<span class="tag blue">${icon('flag')}Government in exile</span>`;
  if (G.phase === 0) return s.chapter ? `<span class="tag gold">${icon('candle')}Chapter ${s.chapter}%</span>` : `<span class="tag">No chapter yet</span>`;
  if (s.hold >= 99.5) return `<span class="tag red">${icon('shield-check')}Republic of Gilead</span>`;
  if (s.hold <= 0.5) return `<span class="tag blue">${icon('flag')}U.S. / rebel held</span>`;
  return `<span class="tag amber">${icon('flame')}Under conflict · ${pct(s.hold)}</span>`;
};

// =================== DRAWER: STATE ===================
export function stateDrawer(G, ab) {
  const S = STATES[ab], s = G.st[ab];
  const cities = Object.keys(CITIES).filter(c => CITIES[c].st === ab);
  const tint = s.exile ? C.blue : G.phase === 0 ? C.gold : s.hold >= 99.5 ? C.red : s.hold <= 0.5 ? C.blue : C.amber;
  let h = head(S.name, `${fmtNum(statePop(G, ab))} people · ${DISTRICTS[STATE_DISTRICT[ab]]?.name || 'Exile'}`, 'map', tint);
  h += '<div class="dbody">';
  h += `<div>${stateTag(G, ab)}${s.heli ? `<span class="tag">${icon('helicopter')}Patrolled</span>` : ''}</div>`;
  if (G.phase === 0) {
    h += `<div class="grid2" style="margin-top:12px">
      <div class="stat"${ti('mech:chapters')} style="--c:${C.gold};text-align:center"><div class="k" style="justify-content:center">${icon('candle')}Chapter</div>${gauge(s.chapter, { color: C.gold, text: s.chapter + '%', size: 92 })}</div>
      <div class="stat"${ti('mech:infiltration')} style="--c:${C.blue};text-align:center"><div class="k" style="justify-content:center">${icon('shield')}Officers</div>${gauge(s.infil, { color: C.blue, text: S.bases.length ? s.infil + '%' : '—', size: 92 })}</div></div>`;
    const c = A.chapterCost(G, ab);
    h += `<h3>Sons of Jacob${hq('mech:chapters')}</h3>`;
    h += actBtn({ act: 'chapter', arg: ab, ic: s.chapter ? 'church' : 'plus', color: C.gold, title: s.chapter ? 'Grow the chapter' : 'Found a chapter', desc: `Sermons, Bible study, men's groups. ${Math.round(S.faith * 100)}% of people here are devout.`, cost: costTxt(c), ok: s.chapter < 100 && G.res.funds >= c.funds, info: 'mech:chapters' });
    h += `<h3>Military installations${hq('mech:infiltration')}</h3>`;
    if (!S.bases.length) h += '<div class="empty">No installations of note.</div>';
    else {
      h += `<div class="card" style="padding:10px 14px"><div class="kvs">${S.bases.map(b => `<span>${b[0]}</span><b>${'■'.repeat(b[1])}<span style="opacity:.25">${'■'.repeat(3 - b[1])}</span></b>`).join('')}</div></div>`;
      h += actBtn({ act: 'infil', arg: ab, ic: 'medal', color: C.blue, title: 'Infiltrate the officer corps', desc: s.chapter < 10 ? 'Requires a chapter (10%+) in this state first.' : 'Turn colonels and chaplains. On the day, their men will follow.', cost: costTxt(A.infiltrateCost()), ok: s.chapter >= 10 && s.infil < 100, info: 'mech:infiltration' });
    }
  } else if (!s.exile) {
    h += `<div class="grid2" style="margin-top:12px">
      <div class="stat"${ti('mech:control')} style="--c:${C.red};text-align:center"><div class="k" style="justify-content:center">${icon('shield-check')}Control</div>${gauge(s.hold, { color: C.red, text: pct(s.hold), size: 92 })}</div>
      <div class="stat"${ti('mech:enemy')} style="--c:${C.blue};text-align:center"><div class="k" style="justify-content:center">${icon('flag')}Enemy</div>${gauge(s.resist, { color: C.blue, size: 92 })}</div></div>`;
    h += `<div class="card"${ti('mech:supply')} style="padding:10px 14px"><div class="kvs"><span>Supply line</span><b>${A.supplied(G, ab) ? '<span class="good">Depot in range</span>' : '<span class="warn">No depot in range</span>'}</b><span>Air cover</span><b>${A.airfieldFor(G, ab) ? '<span class="good">Airfield in range</span>' : '<span class="muted">None</span>'}</b></div></div>`;
    const op = G.ops.find(o => o.st === ab);
    if (op) {
      h += `<h3>${icon('swords')}Offensive under way${hq('mech:offensive')}</h3><div class="card"><div class="kvs"><span>Guardians committed</span><b>${fmtNum(op.troops)}</b><span>Since</span><b>${fmtDate(op.start, true)}</b></div><div class="btnrow" style="margin-bottom:0"><button class="btn sm" data-act="cancelop" data-arg="${op.uid}">Withdraw troops</button></div></div>`;
    } else if (s.hold < 99.5) {
      const ok = A.canAttack(G, ab), av = A.availableTroops(G);
      h += `<h3>${icon('swords')}Ground offensive${hq('mech:offensive')}</h3><p class="muted" style="font-size:12.5px;margin-top:-4px">${ok.ok ? `${fmtNum(av)} Guardians available. 20 supplies to launch, then a daily cost.` : ok.msg}</p>`;
      h += `<div class="seg">${[0.25, 0.5, 1].map(f => `<button class="${ok.ok && av * f >= 5000 ? '' : 'dis'}" data-act="offensive" data-arg="${ab}|${f}">${f === 1 ? 'All' : f * 100 + '%'} <span class="mono" style="opacity:.6">${fmtNum(av * f)}</span></button>`).join('')}</div>`;
    }
    if (s.hold < 99.5) {
      const a1 = A.strikeCheck(G, ab, 'air'), a2 = A.strikeCheck(G, ab, 'drone');
      h += `<h3>${icon('plane')}Air power${hq('mech:airstrike')}</h3>`;
      h += actBtn({ act: 'strike', arg: ab + '|air', ic: 'plane', color: C.red, title: 'Air strike', desc: a1.ok ? 'Bomb their positions. Big gains, and the world watches.' : a1.msg, cost: '₲12M · 10 sup', ok: a1.ok, info: 'mech:airstrike' });
      h += actBtn({ act: 'strike', arg: ab + '|drone', ic: 'drone', color: C.violet, title: 'Drone strike', desc: a2.ok ? 'Precise. Destroys resistance cells.' : a2.msg, cost: '₲6M', ok: a2.ok, info: 'mech:drone' });
    }
    if (M(G, 'heli')) h += actBtn({ act: 'heli', arg: ab, ic: 'helicopter', color: C.slate, title: s.heli ? 'Withdraw helicopter patrols' : 'Helicopter patrols', desc: 'Suppress the enemy and Mayday; catch runaways.', cost: `${Object.values(G.st).filter(x => x.heli).length}/${A.heliCapacity(G)}`, info: 'mech:heli' });
  } else {
    h += `<p class="lead"${ti('mech:exile')} style="margin-top:12px">Alaska and Hawaii remain under the legitimate United States government. Anchorage hosts the government-in-exile; refugees there get one five-minute phone call a week. The Republic cannot reach them.</p>`;
  }
  if (G.phase > 0 && !s.exile) {
    const xs = A.crossingsOf(G, ab);
    if (xs.length) {
      const unlocked = G.decrees.d_checkpoints != null;
      h += `<h3>${icon('barrier')}Border checkpoints <small>${xs.filter(q => q.bld).length} of ${xs.length} crossings</small>${hq('bld:checkpoint')}</h3>`;
      if (!unlocked) h += `<p class="muted" style="font-size:12.5px;margin-top:-4px">${xs.length} road${xs.length > 1 ? 's cross' : ' crosses'} this state's borders. Checkpoints can be built on them once <b>Checkpoints</b> is decreed.</p>`;
      for (const { x, bld, av } of xs) {
        const other = x.a === ab ? x.b : x.a;
        const title = `Line with ${STATES[other].name}`;
        if (bld) h += `<div class="card inst"><span class="mtile"${ti('bld:checkpoint')}>${model('checkpoint', '', bld.done != null)}</span><div style="flex:1;min-width:0"><b style="font-size:13.5px">${title}</b><div class="muted" style="font-size:11.5px;margin-top:2px">${A.crossingName(x)} · ${bld.done != null ? `Under construction · ${Math.max(0, bld.done - G.day)} days` : 'Manned'}</div></div><div class="ibtns"><button class="btn sm" data-act="demolish" data-arg="${bld.uid}">Close</button></div></div>`;
        else if (unlocked) h += actBtn({ act: 'build', arg: `checkpoint||0|${x.id}`, art: model('checkpoint'), color: BUILDINGS.checkpoint.color, title, desc: `${A.crossingName(x)}${av.ok ? '' : ' · ' + av.msg}`, cost: '₲20M · 4d', ok: av.ok });
      }
    }
  }
  if (cities.length) {
    h += `<h3>${icon('pin')}Cities</h3>`;
    for (const c of cities) {
      const n = G.bld.filter(b => b.city === c && !b.site).length;
      h += actBtn({ act: 'city', arg: c, ic: CITIES[c].rank === 3 ? 'columns' : 'pin', color: C.slate, title: CITY_POS[c].name, desc: G.phase === 0 ? '' : `${n} institution${n === 1 ? '' : 's'}${isHeld(G, ab) ? '' : ' · not under control'}`, cost: icon('chevron-right'), plain: true });
    }
  }
  return h + '</div>';
}

// =================== DRAWER: CITY ===================
export function cityDrawer(G, city) {
  const Ct = CITIES[city], P = CITY_POS[city], ab = Ct?.st;
  const held = G.phase > 0 && ab && isHeld(G, ab);
  const back = `<button class="close" data-act="state" data-arg="${ab}">${icon('chevron-left')}</button>`;
  let h = head(P.name, `${STATES[ab]?.name || ''} · ${['', 'Regional city', 'Major city', 'Capital-class city'][Ct?.rank || 1]}`, Ct?.rank === 3 ? 'columns' : 'pin', held ? C.red : C.slate, back);
  h += '<div class="dbody">';
  const list = G.bld.filter(b => b.city === city && !b.site);
  const slots = 2 + (Ct?.rank || 1) * 2;
  if (G.phase === 0) h += `<p class="lead">Nothing can be built until the Republic exists. Grow the chapter in ${STATES[ab].name} instead.</p>`;
  const recs = held ? recommendForCity(G, city) : [];
  if (recs.length) {
    h += `<h3>${icon('bulb')}Recommended here${hq('mech:advisor')}</h3>`;
    for (const r of recs) h += recBtn(G, r, false);
  }
  h += `<h3>${icon('columns')}Institutions <small>${list.length} of ${slots} slots</small>${hq('mech:construction')}</h3>`;
  if (!list.length) h += `<div class="empty">No institutions yet.</div>`;
  for (const b of list) {
    const B = BUILDINGS[b.type], T = B.tiers[b.tier];
    let info = '', m = '';
    if (b.done != null) { info = `Under construction · ${Math.max(0, b.done - G.day)} days`; m = meter(G.day - b.start, b.done - b.start, C.gold); }
    else if (B.housing) { info = `${fmtNum(b.occ)} / ${fmtNum(T.cap)} Unwomen`; m = meter(b.occ, T.cap, B.color); }
    else if (B.from) { const n = b.cohorts.reduce((a, c) => a + c.n, 0); info = `${fmtNum(n)} / ${fmtNum(T.cap)} in training · ${T.days}-day course`; m = meter(n, T.cap, B.color); }
    else info = T.name;
    const canUp = b.tier === 0 && B.tiers[1] && (!B.tiers[1].unlock || G.decrees[B.tiers[1].unlock] != null);
    h += `<div class="card inst"><span class="mtile"${ti('bld:' + b.type)}>${model(b.type, '', b.done != null)}</span><div style="flex:1;min-width:0"><b style="font-size:13.5px">${esc(b.name)}</b><div class="muted" style="font-size:11.5px;margin:2px 0 6px">${B.label}${B.tiers.length > 1 ? ` · ${T.name}` : ''} · ${info}</div>${m}</div>
      <div class="ibtns"><button class="btn sm ${canUp ? 'gold' : ''}" data-act="replace-menu" data-arg="${b.uid}">${icon(canUp ? 'arrow-up' : 'swap')}${canUp ? 'Upgrade' : 'Replace'}</button><button class="btn sm" data-act="demolish" data-arg="${b.uid}">Close</button></div></div>`;
  }
  if (held) {
    h += `<h3>${icon('plus')}Build <small>${A.building(G)} of ${A.crews(G)} building crews busy</small>${hq('mech:crews')}</h3>`;
    for (const type of BUILD_ORDER) {
      const B = BUILDINGS[type];
      if (B.unlock && G.decrees[B.unlock] == null) continue;
      B.tiers.forEach((T, i) => {
        if (T.unlock && G.decrees[T.unlock] == null) return;
        const av = A.buildAvailability(G, type, city, i);
        if (!av.ok && /Already one|Only one|Only at|road crosses/.test(av.msg)) return;
        const nextName = B.unique ? B.names[0] : B.names[(G.nameIdx[type] || 0) % B.names.length];
        const cap = T.cap ? (B.housing ? ` · houses ${fmtNum(T.cap)}` : ` · ${fmtNum(T.cap)} per ${T.days}-day course`) : '';
        h += actBtn({ act: 'build', arg: `${type}|${city}|${i}`, art: model(type), color: B.color, title: `${B.label}${B.tiers.length > 1 ? ` · ${T.name}` : ''}`, desc: `${av.ok ? esc(nextName) : av.msg}${cap}`, cost: `₲${A.buildCost(G, type, i)}M · ${T.build}d`, ok: av.ok, info: 'bld:' + type });
      });
    }
    const locked = BUILD_ORDER.filter(t => BUILDINGS[t].unlock && G.decrees[BUILDINGS[t].unlock] == null);
    if (locked.length) {
      h += `<h3>${icon('lock')}Locked by decree</h3><div style="display:flex;flex-wrap:wrap;gap:4px">${locked.map(t => `<button class="tag"${ti('bld:' + t)}>${icon(BUILDINGS[t].icon)}${BUILDINGS[t].label}</button>`).join('')}</div>`;
    }
  } else if (G.phase > 0) h += `<p class="lead">This city is not under the Republic's control.</p>`;
  return h + '</div>';
}

// A recommendation as a build (or replace) button. withCity: show the city name (national list).
function recBtn(G, r, withCity, n = 0) {
  const B = BUILDINGS[r.type], T = B.tiers[r.tier], old = r.replace != null ? G.bld.find(b => b.uid === r.replace) : null;
  if (r.site) {
    const x = A.CROSSING_BY_ID[r.site], other = r.st === x.a ? x.b : x.a;
    const btn = actBtn1({ act: 'build', arg: `checkpoint||0|${r.site}`, art: model('checkpoint'), color: B.color, title: `Checkpoint on the ${STATES[r.st].name}–${STATES[other].name} line`, desc: esc(r.reason), cost: `₲${T.cost}M`, ok: r.afford });
    return `<div class="rec">${n ? `<span class="recn">${n}</span>` : ''}${btn}<button class="ainfo" data-act="state" data-arg="${r.st}" aria-label="Open state">${icon('map')}</button></div>`;
  }
  const where = withCity ? ` in ${CITY_POS[r.city].name}` : '';
  const title = old ? `Replace ${esc(old.name)} with ${B.label}${where}` : `${B.label}${B.tiers.length > 1 ? ` · ${T.name}` : ''}${where}`;
  const full = A.buildCost(G, r.type, r.tier, old?.type === r.type ? old.uid : null), cost = old ? full - A.salvage(old) : full;
  const btn = actBtn1({ act: old ? 'replace' : 'build', arg: old ? `${old.uid}|${r.type}|${r.tier}` : `${r.type}|${r.city}|${r.tier}`, art: model(r.type), color: B.color, title, desc: esc(r.reason), cost: `₲${cost}M`, ok: r.afford !== false && G.res.treasury >= cost });
  return `<div class="rec">${n ? `<span class="recn">${n}</span>` : ''}${btn}${withCity ? `<button class="ainfo" data-act="city" data-arg="${r.city}" aria-label="Open city">${icon('pin')}</button>` : `<button class="ainfo"${ti('bld:' + r.type)} aria-label="More information">${icon('info')}</button>`}</div>`;
}

// =================== DRAWER: ADVISOR ===================
export function advisorDrawer(G) {
  let h = head('The Advisor', 'What the Republic needs, and where to build it', 'bulb', C.gold);
  h += '<div class="dbody">';
  if (G.phase === 0) return h + `<p class="lead">Nothing can be built until the Republic exists. Grow chapters, infiltrate the military and prepare the Three Strikes.</p></div>`;
  for (const w of warnings(G)) h += `<div class="warnc ${w.bad ? 'bad' : ''}"><span class="wi">${icon(w.ic)}</span><div><b>${w.title}</b><small>${w.text}</small></div></div>`;
  const recs = recommendations(G, 6);
  h += `<h3>${icon('pin')}Where to build <small>numbered on the map</small>${hq('mech:advisor')}</h3>`;
  if (!recs.length) h += `<div class="empty">Nothing pressing. The Republic is in order, for now.</div>`;
  recs.forEach((r, i) => { h += recBtn(G, r, true, i + 1); });
  const N = Object.entries(needs(G)).filter(([, v]) => v.score >= 0.1).sort((a, b) => b[1].score - a[1].score);
  if (N.length) {
    h += `<h3>${icon('chart-down')}Needs of the Republic</h3><div class="card" style="padding:6px 14px">`;
    for (const [t, v] of N) h += `<div class="need"${ti('bld:' + t)}><span class="nm">${model(t)}</span><div><b>${BUILDINGS[t].label}</b>${meter(v.score * 100, 100, v.score > 0.66 ? C.red : v.score > 0.33 ? C.amber : C.slate)}<small>${esc(v.reason)}</small></div></div>`;
    h += `</div>`;
  }
  return h + '</div>';
}

// =================== MODAL: REPLACE AN INSTITUTION ===================
export function replaceMenu(G, uid) {
  const old = G.bld.find(b => b.uid === uid);
  if (!old) return null;
  const OB = BUILDINGS[old.type], refund = A.salvage(old);
  const N = needs(G), recs = recommendForCity(G, old.city, N, 20);
  const opts = [];
  for (const type of BUILD_ORDER) {
    BUILDINGS[type].tiers.forEach((T, i) => {
      const av = A.replaceAvailability(G, uid, type, i);
      if (!av.ok && !/^Needs ₲/.test(av.msg)) return;
      const rec = type === old.type ? null : recs.find(r => r.type === type);
      opts.push({ type, tier: i, T, ok: av.ok, up: type === old.type, score: type === old.type ? 9 : (rec ? rec.score : (N[type]?.score || 0) * 0.5), reason: type === old.type ? `Rebuild as a ${T.name.toLowerCase()}: keeps its name and trainees.${T.cap ? ` Holds ${fmtNum(T.cap)} instead of ${fmtNum(OB.tiers[old.tier].cap)}.` : ''}` : (rec?.reason || N[type]?.reason || BUILDINGS[type].desc) });
    });
  }
  opts.sort((a, b) => b.score - a.score);
  const row = o => { const B = BUILDINGS[o.type], net = A.buildCost(G, o.type, o.tier, o.up ? uid : null) - refund; return `<button class="choice ${o.ok ? '' : 'dis'}" data-act="replace" data-arg="${uid}|${o.type}|${o.tier}"><span class="cm">${model(o.type)}</span><span class="ct">${o.up ? 'Upgrade · ' : ''}${B.label}${B.tiers.length > 1 ? ` · ${o.T.name}` : ''}${o.score >= 0.3 && !o.up ? ' <span class="tag gold" style="height:20px">Recommended</span>' : ''}<small>${esc(o.reason)}</small></span><span class="fxs"><span class="fx ${net <= 0 ? 'p' : 'n'}">${icon('coins')}<b>${net <= 0 ? '+' : '−'}₲${Math.abs(net)}M</b></span><span class="fx">${icon('clock')}<b>${o.T.build}d</b></span></span></button>`; };
  return `<div class="mh"><div class="tile mtilebig">${model(old.type)}</div><div><div class="loc">${icon('swap')}Replace · ${CITY_POS[old.city].name}</div><h2>${esc(old.name)}</h2></div></div>
  <div class="mb" style="padding-bottom:8px"><p style="margin:0;font-size:14px">Closing it salvages <b class="good">₲${refund}M</b> (${old.done != null ? 'half the cost, since it is unfinished' : 'a quarter of its cost'}).${OB.from && old.cohorts?.length && !opts.some(o => o.up) ? ' Anyone in training returns to their pool.' : ''} Costs below are net of salvage.</p></div>
  <div class="mc">${opts.map(row).join('') || '<div class="empty">Nothing else can be built here yet.</div>'}<button class="btn sm" data-act="closemodal" style="align-self:flex-end;margin-top:4px">Cancel</button></div>`;
}

// =================== DRAWER: DISPATCHES ===================
export function dispatchDrawer(G) {
  let h = head('Dispatches', `${G.events.queue.length} awaiting your decision`, 'inbox', C.gold);
  h += '<div class="dbody">';
  if (!G.events.queue.length) h += '<div class="empty">All quiet. For now.</div>';
  for (const q of G.events.queue) {
    const e = EVENT_BY_ID[q.id];
    const where = CITY_POS[q.loc]?.name || STATES[q.loc]?.name || '';
    h += actBtn({ act: 'event', arg: q.uid, ic: e.icon, color: e.urgent ? C.red : C.gold, title: e.title, desc: `${where}${q.expires ? ` · decide within ${q.expires - G.day} days` : ' · urgent'}`, cost: icon('chevron-right'), plain: true });
  }
  return h + '</div>';
}

// =================== SCREEN: THE PLOT (phase 0) ===================
export function plotScreen(G) {
  const inf = infiltration(G);
  const cr = A.coupReady(G);
  const chap = Object.values(G.st).filter(s => s.chapter >= 25).length;
  const sus = G.res.suspicion;
  let h = head('The Committee\'s Plan', 'Sons of Jacob · Pre-Gilead', 'candle', C.gold);
  h += `<div class="sbody"><div class="grid4">
    ${stat('Members', 'user-plus', C.gold, fmtNum(G.res.members), areaChart(G.hist.map(x => x.mem), { color: C.gold, h: 44 }), 'mech:members')}
    ${stat('Chapters ≥ 25%', 'candle', C.gold, `${chap}<small>/ 30</small>`, `<div style="margin-top:14px">${meter(chap, 30, C.gold)}</div>`, 'mech:chapters')}
    ${stat('Military', 'shield', C.blue, `${inf.toFixed(1)}%<small>/ 35</small>`, `<div style="margin-top:14px">${meter(inf, 35, C.blue)}</div>`, 'mech:infiltration')}
    ${stat('FBI suspicion', 'scan', sus > 70 ? C.red : C.amber, `<span class="${sus > 70 ? 'bad' : sus > 45 ? 'warn' : ''}">${Math.round(sus)}%</span>`, areaChart(G.hist.map(x => x.sus), { color: sus > 70 ? C.red : C.amber, h: 44, min: 0, max: 100 }), 'mech:suspicion')}
  </div><div class="cols" style="margin-top:8px"><div>`;
  h += `<h3>${icon('briefcase')}Operations</h3>`;
  for (const [id, a] of Object.entries(A.PLOT_ACTIONS)) {
    const done = a.once && G.plot[id === 'publish' ? 'book' : id];
    const cd = (G.cool[id] || 0) - G.day;
    const needs = a.needs && !G.cmd[a.needs].seat;
    h += actBtn({ act: 'plot', arg: id, ic: a.icon, color: id === 'cover' || id === 'moles' ? C.blue : C.gold, title: a.name, desc: needs ? `Requires ${COMMANDERS[a.needs].name} on the Committee.` : a.desc, cost: done ? icon('check') : cd > 0 ? `${cd}d` : costTxt(a.cost) || 'Free', ok: !done && cd <= 0 && !needs, done, info: 'plot:' + id });
  }
  h += `</div><div>`;
  h += `<h3>${icon('bolt')}The Three Strikes${hq('mech:coup')}</h3><p class="muted" style="font-size:12.5px;margin-top:-4px">Gunmen in the Capitol galleries, a bomb in the White House, the Court in session. Blame "terrorists". Needs 5+ founders seated and 12%+ infiltration. $12M per step.</p>`;
  for (const [k, p] of Object.entries(A.PLOTS)) {
    const v = G.plot[k];
    h += `<div class="card" style="display:flex;align-items:center;gap:12px;padding:12px"><span class="act" style="all:unset"><span style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--redbg);color:var(--red2)">${icon(p.icon)}</span></span><div style="flex:1"><div style="display:flex;justify-content:space-between"><b style="font-size:13.5px">${p.name}</b><span class="mono" style="font-size:12px;color:var(--ink2)">${Math.round(v)}%</span></div><div class="muted" style="font-size:11.5px;margin:2px 0 7px">${p.desc}</div>${meter(v, 100, C.red)}</div><button class="btn sm ${v >= 100 ? 'dis' : ''}" data-act="fundplot" data-arg="${k}">${v >= 100 ? icon('check') + 'Ready' : '$12M'}</button></div>`;
  }
  const need = [['g_chapters', 'Chapters in 30 states', chap >= 30], ['g_committee', '8 founders seated', seated(G).length >= 8], ['g_infil', '35% military infiltration', inf >= 35], ['g_plot', 'All three strikes prepared', cr.avg >= 100]];
  h += `<h3>${icon('target')}Readiness${hq('mech:coup')}</h3><div class="card" style="padding:6px 14px">${need.map(([g, t, live]) => { const ok = G.goals[g] != null || live; return `<div${ti('goal:' + g)} style="display:flex;align-items:center;gap:10px;padding:7px 0;font-size:13px;color:${ok ? 'var(--ink)' : 'var(--muted)'}"><span style="width:22px;height:22px;border-radius:7px;display:grid;place-items:center;background:${ok ? 'var(--greenbg)' : 'rgba(255,255,255,.05)'};color:${ok ? 'var(--green)' : 'var(--faint)'}">${icon(ok ? 'check' : 'minus')}</span>${t}</div>`; }).join('')}</div>`;
  h += `<button class="btn primary block ${cr.ready ? '' : 'dis'}" style="min-height:56px;font-size:15px;margin-top:6px" data-act="coup">${icon('bolt')}Execute the Three Strikes</button>`;
  h += `</div></div></div>`;
  return h;
}

// =================== SCREEN: POPULATION ===================
const ORDER = ['commanders', 'wives', 'widows', 'daughters', 'sons', 'aunts', 'handmaids', 'marthas', 'econowives', 'economen', 'econochildren', 'guardians', 'eyes', 'jezebels', 'unwomen'];
export function popScreen(G) {
  let h = head('People of the Republic', G.phase === 0 ? 'The United States, before' : `${fmtNum(gileadPop(G))} souls under His Eye`, 'users', C.red);
  h += '<div class="sbody">';
  if (G.phase === 0) {
    const us = Object.values(STATES).reduce((a, s) => a + s.pop, 0) * 1e6;
    h += `<div class="grid3">${stat('United States', 'flag', C.blue, fmtNum(us))}${stat('Sons of Jacob', 'user-plus', C.gold, fmtNum(G.res.members))}${stat('Live births vs 2000', 'chart-down', C.red, '<span class="bad">−52%</span>')}</div>`;
    h += `<p class="lead" style="margin:18px 0">After the coup, every person in the territory you hold must be <b>processed</b>: registered, classified and assigned a place in Gilead. This screen will track each class and who is being converted into it right now.</p>`;
    h += `<div class="classgrid">${ORDER.map(k => { const c = CLASS_INFO[k]; return `<div class="cls"${ti('class:' + k)} style="--c:${c.color}"><div class="top">${figure(c.fig)}<div class="l">${c.label}</div></div><div class="d">${c.desc}</div></div>`; }).join('')}</div>`;
    return h + '</div>';
  }
  const p = G.pop, cl = p.cls, tr = inTraining(G), tot = gileadPop(G);
  const unproc = p.men + p.women + p.fertile + p.children;
  h += `<div class="grid4">
    ${stat('Population', 'users', C.red, fmtNum(tot), areaChart(G.hist.filter(x => x.pop).map(x => x.pop), { color: C.red, h: 44 }), 'mech:census')}
    ${stat('Live births · 12 mo', 'baby', C.green, fmtNum(p.birthsYear), areaChart(G.hist.map(x => x.b), { color: C.green, h: 44 }), 'mech:births')}
    ${stat('Awaiting processing', 'hourglass', C.amber, fmtNum(unproc), `<div class="d">${fmtNum(p.detainees)} detainees</div><div style="margin-top:8px">${meter(tot - unproc, tot, C.amber)}</div><div class="d">${pct((tot - unproc) / tot * 100)} processed</div>`, 'mech:processing')}
    ${stat('Escaped', 'run', C.blue, fmtNum(p.escaped), `<div class="d">${fmtNum(p.returnees)} returned · ${fmtNum(p.deaths)} dead</div>`, 'mech:escapes')}
  </div>`;
  // composition
  const segs = ORDER.map(k => ({ k, v: cl[k], color: CLASS_INFO[k].color, label: CLASS_INFO[k].label }));
  const procTot = segs.reduce((a, s) => a + s.v, 0) || 1;
  const top = [...segs].sort((a, b) => b.v - a.v);
  h += `<div class="cols" style="margin-top:6px"><div><h3>${icon('layers')}Composition <small>processed population</small></h3><div class="card"><div class="donutwrap">${donut(segs, { size: 150, value: fmtNum(procTot), label: 'CLASSED' })}<div class="leg">${top.slice(0, 10).map(s => `<div${ti('class:' + s.k)}><i style="background:${s.color}"></i>${s.label}<b>${pct(s.v / procTot * 100)}</b></div>`).join('')}</div></div>
    <div class="popbar">${[...segs, ...Object.keys(POOL_INFO).map(k => ({ v: p[k], color: POOL_INFO[k].color }))].map(s => `<i style="width:${(s.v / tot * 100).toFixed(2)}%;background:${s.color}"></i>`).join('')}</div><div class="muted" style="font-size:11.5px">Full population including those not yet processed (grey).</div></div></div>`;
  // pipeline
  h += `<div><h3>${icon('hourglass')}Being converted now${hq('mech:processing')}</h3><div class="card" style="padding:4px 14px">`;
  const groups = {};
  for (const b of G.bld) { const B = BUILDINGS[b.type]; if (!B.from || b.done != null) continue; const g = groups[b.type] || (groups[b.type] = { n: 0, cap: 0, count: 0 }); g.n += b.cohorts.reduce((a, c) => a + c.n, 0); g.cap += B.tiers[b.tier].cap; g.count++; }
  if (!Object.keys(groups).length) h += `<div class="empty" style="margin:10px 0">No conversion centres are operating. Tap a held city on the map to build one.</div>`;
  for (const [type, g] of Object.entries(groups)) {
    const B = BUILDINGS[type];
    const to = B.to === 'processed' ? 'Interrogation' : CLASS_INFO[B.to]?.label;
    h += `<div class="pipe"${ti('bld:' + type)} style="--c:${B.color}"><span class="pi art">${model(type)}</span><div><b>${B.short} ×${g.count}<small>→ ${to}</small></b>${meter(g.n, g.cap, B.color)}</div><span class="pv">${fmtNum(g.n)}<br><span class="muted">/ ${fmtNum(g.cap)}</span></span></div>`;
  }
  h += `</div>`;
  if (G._auntEff < 1) h += `<div class="card"${ti('mech:auntstaff')} style="border-color:rgba(255,178,36,.3);color:var(--amber);font-size:12.5px;display:flex;gap:8px;align-items:center">${icon('alert')}Not enough Aunts to staff every Red Centre (${Math.round(G._auntEff * 100)}% efficiency). Build an Aunts' Hall.</div>`;
  h += `</div></div>`;
  // classes
  h += `<h3>${icon('users')}Classes <small>tap a class to learn how to get it</small></h3><div class="classgrid">`;
  const mx = Math.max(...ORDER.map(k => cl[k])) || 1;
  for (const k of ORDER) {
    const c = CLASS_INFO[k];
    h += `<div class="cls"${ti('class:' + k)} style="--c:${c.color}"><div class="top">${figure(c.fig)}<div><div class="n">${fmtNum(cl[k])}</div><div class="l">${c.label}</div></div></div><div class="bar"><i style="width:${Math.max(1, Math.sqrt(cl[k] / mx) * 100).toFixed(1)}%"></i></div>${tr[k] ? `<span class="tr">+${fmtNum(tr[k])} in training</span>` : `<div class="d">${c.desc}</div>`}</div>`;
  }
  h += `</div><div class="grid2" style="margin-top:6px"><div><h3>${icon('hourglass')}Awaiting processing${hq('mech:processing')}</h3><div class="card" style="padding:4px 14px">`;
  for (const [k, info] of Object.entries(POOL_INFO)) h += `<div class="pipe"${ti('pool:' + k)} style="--c:${info.color === '#ff7a80' ? info.color : C.slate}"><span class="pi">${icon(k === 'fertile' ? 'heart' : k === 'detainees' ? 'bars' : k === 'children' ? 'child' : 'user')}</span><div><b>${info.label}</b>${meter(p[k], Math.max(1, p.men, p.women), info.color === '#ff7a80' ? info.color : '#6b7280')}</div><span class="pv">${fmtNum(p[k])}</span></div>`;
  h += `</div><p class="muted" style="font-size:12px">Men register as Economen; women marry as Econowives (faster with Prayvaganzas). Fertile women can only become Handmaids in a Red Centre${M(G, 'fertileFind') ? '' : ', after <b>Fertility Screening &amp; Roundups</b> is decreed'}.</p></div>`;
  const housing = G.bld.filter(b => BUILDINGS[b.type].housing && b.done == null);
  h += `<div><h3>${icon('baby')}Fertility${hq('mech:births')}</h3><div class="card" style="padding:10px 14px"><div class="kvs"><span>Pregnancies under way</span><b>${fmtNum(p.pregnant.reduce((a, b) => a + b[1], 0))}</b><span>Live births, all time</span><b>${fmtNum(p.births)}</b><span>"Unbabies"</span><b>${fmtNum(p.unbabies)}</b><span>The Ceremony</span><b>${M(G, 'births') ? '<span class="good">Instituted</span>' : '<span class="warn">Not decreed</span>'}</b></div></div>
    <h3>${icon('radiation')}The Colonies${hq('bld:colony')}</h3><div class="card" style="padding:10px 14px"><div class="kvs"><span>Housed in Colonies</span><b>${fmtNum(housing.reduce((a, b) => a + b.occ, 0))}</b><span>Held in camps</span><b>${fmtNum(G._unhoused || 0)}</b><span>Died in the Colonies</span><b>${fmtNum(p.colonyDeaths)}</b><span>Fertility from reclaimed land</span><b>+${Math.round(Math.min(50, p.reclaimed / 8))}%</b></div></div></div></div>`;
  return h + '</div>';
}

// =================== SCREEN: COMMANDERS ===================
export function cmdScreen(G) {
  const max = G.phase === 0 ? COMMITTEE_SEATS : HIGH_COUNCIL_SEATS;
  const n = seated(G).length;
  let h = head('Commanders of the Faithful', `${n} of ${max} seats on the ${G.phase === 0 ? 'Committee' : 'High Council'} · next seat ${costTxt(A.seatCost(G))}`, 'medal', C.gold);
  h += `<div class="sbody"><p class="lead" style="margin:0 0 14px">Only the men who matter are named. Seat them, then give each a portfolio: ${Object.entries(PORTFOLIOS).map(([k, p]) => `<button class="tag"${ti('pf:' + k)}>${icon(p.icon)}${p.name}</button>`).join(' ')}. Ambitious men left unseated grow disloyal.</p><div class="cmdgrid">`;
  const ids = Object.keys(COMMANDERS).sort((a, b) => (G.cmd[b].seat - G.cmd[a].seat) || (G.cmd[b].alive - G.cmd[a].alive) || (COMMANDERS[a].joins - COMMANDERS[b].joins));
  for (const id of ids) {
    const c = COMMANDERS[id], g = G.cmd[id];
    const avail = c.joins <= G.phase;
    const hh = c.household;
    const st = !g.alive ? `<span class="tag red">Deceased</span>` : g.status === 'arrested' ? `<span class="tag red">${icon('bars')}Arrested</span>` : g.status === 'abroad' ? `<span class="tag">${icon('plane')}Abroad</span>` : g.seat ? `<span class="tag gold">${icon('star-fill')}Seated</span>` : avail ? `<span class="tag">Available</span>` : `<span class="tag">${icon('lock')}${PHASES[c.joins].name}</span>`;
    h += `<div class="cmd ${g.seat ? 'seated' : ''} ${g.alive ? '' : 'dead'}">
      <div class="top"${ti('cmd:' + id)}>${portrait(id, c.name, c.faction, c.title.includes('High') ? 2 : 1, !g.alive)}<div style="flex:1;min-width:0"><div class="nm">${c.name}</div><div class="tt">${c.title} · ${CITY_POS[c.city]?.name || ''}</div><div style="margin-top:6px">${st}<span class="tag ${c.faction === 'hard' ? 'red' : 'blue'}">${c.faction === 'hard' ? 'Hardliner' : 'Pragmatist'}</span></div></div></div>
      <div class="stats"${ti('cmd:' + id)}>${[['Adm', 'adm'], ['Mil', 'mil'], ['Eyes', 'int'], ['Dip', 'dip'], ['Zeal', 'zeal']].map(([l, k]) => `<div><b>${c.stats[k]}</b>${l}</div>`).join('')}</div>
      <div class="loy"${ti('mech:loyalty')}>Loyalty ${meter(g.loyalty, 100, g.loyalty < 30 ? C.red : C.green)}<b>${Math.round(g.loyalty)}</b></div>
      <div class="hh"><span>Wife</span> ${esc(hh.wife || '—')}${hh.handmaid ? `<br><span>Handmaid</span> ${esc(hh.handmaid)}` : ''}${hh.marthas.length ? `<br><span>Marthas</span> ${esc(hh.marthas.join(', '))}` : ''}${hh.guardians.length ? `<br><span>Guardians</span> ${esc(hh.guardians.join(', '))}` : ''}${hh.children.length ? `<br><span>Children</span> ${esc(hh.children.join(', '))}` : ''}</div>
      <div class="bio">${esc(g.fate ? g.fate[0].toUpperCase() + g.fate.slice(1) + '.' : c.bio)}</div>`;
    if (g.alive && g.seat) {
      h += `<div class="pfs">${Object.entries(PORTFOLIOS).map(([k, p]) => `<button class="${g.portfolio === k ? 'on' : ''}" aria-label="${p.name}" data-act="portfolio" data-arg="${id}|${k}">${icon(p.icon)}</button>`).join('')}<button class="btn sm" data-act="unseat" data-arg="${id}" style="margin-left:auto">Unseat</button></div>`;
      if (g.portfolio) h += `<div class="muted"${ti('pf:' + g.portfolio)} style="font-size:11.5px">${PORTFOLIOS[g.portfolio].name}: ${PORTFOLIOS[g.portfolio].desc}</div>`;
    } else if (g.alive && avail && g.status === 'free') h += `<button class="btn sm ${n < max ? '' : 'dis'}" data-act="seat" data-arg="${id}">${icon('plus')}Seat · ${costTxt(A.seatCost(G))}</button>`;
    h += `</div>`;
  }
  h += `</div><h3>${icon('book-open')}The Aunts</h3><p class="lead">Aunt Lydia${G.flags.lydia ? ' (recruited)' : ''}, Aunt Elizabeth, Aunt Ruth, Aunt Vidala, Aunt Gabbana, Aunt Estée: <span class="mono">${fmtNum(G.pop.cls.aunts)}</span> Aunts in all. Wives outrank Aunts socially, but Aunts control the Handmaids.</p></div>`;
  return h;
}

// =================== SCREEN: COUNCILS ===================
export function councilScreen(G) {
  const max = G.phase === 0 ? COMMITTEE_SEATS : HIGH_COUNCIL_SEATS;
  const sids = seated(G);
  const fill = sids.map(id => { const c = COMMANDERS[id]; return { color: c.faction === 'hard' ? '#c8323a' : '#3d6fd6', stroke: G.cmd[id].portfolio ? C.gold : null, label: c.name.replace('Commander ', '').split(' ').map(x => x[0]).join(''), f: c.faction }; });
  fill.sort((a, b) => (a.f === b.f ? 0 : a.f === 'hard' ? -1 : 1));
  const name = G.phase === 0 ? 'The Committee' : 'The High Council';
  let h = head('Councils of Gilead', G.phase === 0 ? 'The Committee of the Sons of Jacob · twelve seats' : 'The High Council sits in Washington · district councils govern each region', 'columns', C.gold);
  h += `<div class="sbody"><div class="cols"><div><div class="card"${ti(G.phase === 0 ? 'mech:committee' : 'mech:highcouncil')} style="padding:18px">${hemicycle(max, fill, { w: 520, rows: 2, maxR: 26, center: `${sids.length}/${max}`, sub: name.toUpperCase() })}
    <div class="legendrow"><span><i style="background:#c8323a"></i>Hardliners ${fill.filter(f => f.f === 'hard').length}</span><span><i style="background:#3d6fd6"></i>Pragmatists ${fill.filter(f => f.f !== 'hard').length}</span><span><i style="border:2px solid ${C.gold}"></i>Holds a portfolio</span><span><i style="background:#ffffff14;border:1px solid #ffffff30"></i>Empty</span></div></div>`;
  h += `<div class="grid2">${sids.map(id => { const c = COMMANDERS[id]; const pf = G.cmd[id].portfolio; return `<div class="card"${ti('cmd:' + id)} style="display:flex;gap:10px;align-items:center;margin:0;padding:10px">${portrait(id, c.name, c.faction, 1)}<div style="min-width:0"><b style="font-size:13.5px">${c.name}</b><div class="muted" style="font-size:11.5px;margin-top:3px;display:flex;gap:5px;align-items:center">${pf ? icon(PORTFOLIOS[pf].icon) + PORTFOLIOS[pf].name : 'No portfolio'}</div></div></div>`; }).join('')}</div>`;
  h += `<button class="btn block" style="margin-top:12px" data-act="tab" data-arg="cmd">Manage Commanders ${icon('chevron-right')}</button></div><div>`;
  if (G.phase === 0) {
    h += `<h3>${icon('columns')}District councils${hq('mech:districts')}</h3><p class="lead">After the Republic is proclaimed, each district is governed by a council of lower-ranking Commanders. Their seats fill as you take and hold territory.</p>`;
  } else {
    h += `<h3>${icon('columns')}District councils <small>${Math.round(councilFill(G) * 100)}% of seats filled</small>${hq('mech:districts')}</h3><div class="grid2">`;
    for (const [id, d] of Object.entries(DISTRICTS)) {
      const c = G.council[id], cap = districtCap(G, id);
      const hard = Math.round(c.filled * c.hard);
      const f = [...Array(hard).fill({ color: '#c8323a' }), ...Array(c.filled - hard).fill({ color: '#3d6fd6' })];
      const nm = id === 'eastern' && G.phase >= 3 ? d.later : d.name;
      h += `<div class="council"${ti('dist:' + id)}>${hemicycle(d.seats, f, { w: 240 })}<div class="t">${nm}</div><div class="s">${c.filled}/${d.seats} seats · ${cap} open</div><button class="btn sm ${c.filled < cap ? '' : 'dis'}" style="margin-top:8px;width:100%" data-act="district" data-arg="${id}">${icon('plus')}Appoint · 8 Power</button></div>`;
    }
    h += `</div>`;
  }
  h += `</div></div></div>`;
  return h;
}

// =================== SCREEN: DECREES ===================
export function decreeScreen(G) {
  let h = head('Decrees of the Republic', `${Math.floor(G.res.power)} Power available · tap a decree to read it and enact it`, 'scroll', C.gold);
  h += `<div class="sbody"><div class="tree">`;
  for (let ph = 1; ph <= 5; ph++) {
    const list = DECREES.filter(x => x.phase === ph);
    h += `<div><div class="colh"${ti('era:' + ph)}>${PHASES[ph].name}<b>${list.filter(d => G.decrees[d.id] != null).length}/${list.length}</b></div>`;
    for (const d of list) {
      const st = A.decreeState(G, d);
      const cost = A.decreeCost(G, d);
      const reqs = d.req.filter(r => G.decrees[r] == null).map(r => DECREES.find(x => x.id === r)?.name);
      const ic = st === 'enacted' ? 'check' : st === 'locked' || st === 'blocked' ? 'lock' : 'scroll';
      h += `<button class="dec ${st}" data-act="info" data-arg="dec:${d.id}"><div class="dt">${icon(ic)}<span>${d.name}</span></div><small>${st === 'blocked' ? 'Requires ' + reqs.join(', ') : esc(d.desc)}</small><div class="c">${st === 'enacted' ? 'Law since ' + fmtDate(G.decrees[d.id], true) : st === 'locked' ? 'Unlocks in this era' : icon('crown') + cost + ' Power'}</div></button>`;
    }
    h += `</div>`;
  }
  return h + `</div></div>`;
}

// =================== SCREEN: WAR ===================
export function warScreen(G) {
  const cl = G.pop.cls;
  const held = Object.values(G.st).filter(s => s.hold >= 99.5 && !s.exile).length;
  let h = head('The War', 'Guardians of the Faith · the Air Force · the Eyes', 'swords', C.red);
  h += `<div class="sbody"><div class="grid4">
    ${stat('Guardians', 'shield', C.blue, fmtNum(cl.guardians), areaChart(G.hist.map(x => x.gd || 0), { color: C.blue, h: 44 }) + `<div class="d">${fmtNum(A.availableTroops(G))} available · ${fmtNum(G.army.committed)} committed</div>`, 'class:guardians')}
    ${stat('States held', 'map', C.red, `${held}<small>/ 49</small>`, areaChart(G.hist.map(x => x.held || 0), { color: C.red, h: 44, min: 0, max: 49 }), 'mech:control')}
    ${stat('U.S. loyalists', 'flag', C.slate, Math.round(G.army.usa), `<div style="margin-top:14px">${meter(G.army.usa, 100, '#8fb1ff')}</div><div class="d">Rises as Gilead's standing falls</div>`, 'mech:usa')}
    ${stat('Mayday', 'radio', C.amber, Math.round(G.res.resistance), areaChart(G.hist.map(x => x.rs || 0), { color: C.amber, h: 44, min: 0, max: 100 }), 'mech:mayday')}
  </div><div class="cols" style="margin-top:6px"><div>`;
  h += `<h3>${icon('swords')}Operations${hq('mech:offensive')}</h3>`;
  if (!G.ops.length) h += `<div class="empty">No offensives under way. Tap a contested state to launch one.</div>`;
  for (const o of G.ops) h += `<div class="card" style="display:flex;align-items:center;gap:12px;padding:12px"><span style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--redbg);color:var(--red2);flex:none">${icon('swords')}</span><div style="flex:1"><div style="display:flex;justify-content:space-between"><b style="font-size:13.5px">${STATES[o.st].name}</b><span class="mono" style="font-size:12px">${pct(G.st[o.st].hold)}</span></div><div class="muted" style="font-size:11.5px;margin:2px 0 7px">${fmtNum(o.troops)} Guardians · ${A.supplied(G, o.st) ? 'supplied' : '<span class="warn">unsupplied (−55%)</span>'}</div>${meter(G.st[o.st].hold, 100, C.red)}</div><button class="btn sm" data-act="state" data-arg="${o.st}">Open</button><button class="btn sm" data-act="cancelop" data-arg="${o.uid}">Withdraw</button></div>`;
  h += `<h3>${icon('crosshair')}Doctrine${hq('mech:airstrike')}</h3><div class="card" style="padding:10px 14px"><div class="kvs"><span>Air strikes</span><b>${M(G, 'airstrike') ? '<span class="good">Authorised</span>' : 'Decree required'}</b><span>Drone programme</span><b>${M(G, 'drone') ? '<span class="good">Active</span>' : 'Decree required'}</b><span>Helicopter squadrons</span><b>${M(G, 'heli') ? `${Object.values(G.st).filter(s => s.heli).length}/${A.heliCapacity(G)}` : 'Decree required'}</b><span>No Man's Land</span><b>${G.decrees.d_nomansland != null ? '<span class="good">Established</span>' : '—'}</b><span>Airfields · Depots</span><b>${G.bld.filter(b => b.type === 'airfield' && b.done == null).length} · ${G.bld.filter(b => b.type === 'depot' && b.done == null).length}</b><span>Strikes flown</span><b>${G.stats.strikes} air · ${G.stats.drones} drone</b></div></div></div><div>`;
  h += `<h3>${icon('flame')}Fronts${hq('mech:control')}</h3>`;
  const fronts = Object.keys(G.st).filter(a => !G.st[a].exile && G.st[a].hold < 99.5).sort((a, b) => G.st[b].hold - G.st[a].hold);
  if (!fronts.length) h += `<div class="empty">No fronts. The Republic rules from sea to sea.</div>`;
  for (const ab of fronts) {
    const s = G.st[ab], can = A.canAttack(G, ab).ok;
    h += `<button class="act" data-act="state" data-arg="${ab}" style="--c:${s.hold > 0.5 ? C.amber : C.blue}"><span class="ai">${icon(s.hold > 0.5 ? 'flame' : 'flag')}</span><span class="at"><b>${STATES[ab].name}</b><small>${pct(s.hold)} held · enemy ${Math.round(s.resist)}${can ? ' · can attack' : ''}</small><span style="display:block;margin-top:6px">${meter(s.hold, 100, C.red)}</span></span><span class="ac plain">${icon('chevron-right')}</span></button>`;
  }
  h += `</div></div></div>`;
  return h;
}

// =================== SCREEN: GOALS ===================
export function goalScreen(G) {
  let h = head('Goals', `Era ${G.phase + 1} of 6 · ${PHASES[G.phase].name}`, 'target', C.red);
  h += `<div class="sbody"><div class="eras">${PHASES.map((p, i) => `<div class="${i === G.phase ? 'now' : i < G.phase ? 'past' : ''}"${ti('era:' + i)}><b>ERA ${String(i + 1).padStart(2, '0')}</b><span>${p.name}</span></div>`).join('')}</div>`;
  h += `<p class="lead" style="margin:0 0 14px">${PHASES[G.phase].intro}</p>`;
  h += `<p class="muted"${ti('mech:goals')} style="font-size:12px;display:flex;align-items:center;gap:6px">${icon('star-fill')} Key goals must all be met to advance${G.phase > 0 && G.phase < 5 ? '; each era lasts at least ~16 months' : ''}. Other goals grant rewards.</p>`;
  for (const g of GOALS.filter(x => x.phase === G.phase)) {
    const done = G.goals[g.id] != null;
    const [c, t] = g.check(G, SIMH);
    const prog = g.cmp === 'ge0' ? (c >= 0 ? 1 : (c + 100) / 100) : Math.min(1, c / (t || 1));
    const rw = Object.entries(g.reward || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${fmtNum(v)} ${k}`).join(', ');
    h += `<div class="goal ${done ? 'done' : ''} ${g.key ? 'key' : ''}"${ti('goal:' + g.id)}><span class="gi">${icon(done ? 'check' : g.key ? 'star-fill' : 'target')}</span><div class="gt"><b>${g.name}</b><small>${g.hint}${rw ? ` · Reward ${rw}` : ''}</small></div><div class="gp">${meter(prog * 100, 100, done ? C.green : g.key ? C.gold : C.slate)}<span>${done ? 'Achieved ' + fmtDate(G.goals[g.id], true) : `${fmtNum(c)} / ${fmtNum(t)}`}</span></div></div>`;
  }
  return h + '</div>';
}

// =================== SCREEN: CHRONICLE ===================
const LOG_IC = { phase: 'bolt', alert: 'alert', death: 'coffin', goal: 'target', decree: 'scroll', build: 'columns', war: 'swords', council: 'medal', event: 'mail', info: 'info' };
export function logScreen(G) {
  let h = head('The Chronicle', 'Filed in the Boston Globe archive under "Origins of Gilead"', 'book', C.slate);
  h += '<div class="sbody">';
  for (const l of G.log.slice(0, 200)) h += `<div class="logrow ${l.type}"><span class="d">${fmtDate(l.day, true)}</span><span class="li">${icon(LOG_IC[l.type] || 'info')}</span><span>${esc(l.text)}</span></div>`;
  return h + '</div>';
}
