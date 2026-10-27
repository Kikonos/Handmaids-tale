// HTML renderers for the drawer and full-screen tabs. Interaction is wired in main.js via data-act attributes.
import {
  STATES, CITIES, DISTRICTS, COMMANDERS, BUILDINGS, fmtNum, fmtDate, gileadPop, inTraining, infiltration, seated, isHeld,
  portfolioHolder, councilFill, districtCap, HIGH_COUNCIL_SEATS, COMMITTEE_SEATS, M, statePop,
} from '../engine/core.js';
import * as A from '../engine/actions.js';
import { CITY_POS } from '../data/geo.js';
import { STATE_DISTRICT } from '../data/states.js';
import { DECREES } from '../data/decrees.js';
import { GOALS, PHASES, goalDone } from '../data/phases.js';
import { BUILD_ORDER } from '../data/buildings.js';
import { EVENT_BY_ID } from '../data/events.js';
import { PORTFOLIOS } from '../data/commanders.js';
import { H as SIMH } from '../engine/sim.js';
import { CLASS_INFO, POOL_INFO, figure, portrait } from './art.js';
import { hemicycle, sparkline, meter, fxChips, esc } from './widgets.js';

const costTxt = c => Object.entries(c || {}).map(([k, v]) => k === 'funds' ? `$${v}M` : k === 'treasury' ? `₲${v}M` : `${v} ${k[0].toUpperCase() + k.slice(1)}`).join(' · ');
const pct = v => Math.round(v) + '%';
const head = (title, sub = '', extra = '') => `<div class="dhead"><div style="flex:1;min-width:0"><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${extra}<button class="close" data-act="close">✕</button></div>`;
const actBtn = ({ act, arg = '', icon, title, desc = '', cost = '', ok = true, done = false }) =>
  `<button class="act ${ok ? '' : 'dis'} ${done ? 'done' : ''}" data-act="${act}" data-arg="${esc(arg)}"><span class="ai">${icon}</span><span class="at"><b>${title}</b><small>${desc}</small></span><span class="ac">${cost}</span></button>`;
const stateStatus = (G, ab) => {
  const s = G.st[ab];
  if (s.exile) return '<span class="tag" style="background:#1d3a6a66;color:#a8c4f0">Government in exile</span>';
  if (G.phase === 0) return `<span class="tag gold">Chapter ${s.chapter}%</span>`;
  if (s.hold >= 99.5) return '<span class="tag red">Republic of Gilead</span>';
  if (s.hold <= 0.5) return '<span class="tag" style="background:#22385a88;color:#a8c4f0">U.S. / rebel held</span>';
  return `<span class="tag" style="background:#ff5a3c33;color:#ffb3a0">Under conflict · ${pct(s.hold)} held</span>`;
};

// =================== DRAWER: STATE ===================
export function stateDrawer(G, ab) {
  const S = STATES[ab], s = G.st[ab];
  const cities = Object.keys(CITIES).filter(c => CITIES[c].st === ab);
  let h = head(S.name, `${fmtNum(statePop(G, ab))} people · ${DISTRICTS[STATE_DISTRICT[ab]]?.name || 'Exile'}`, '');
  h += '<div class="dbody">';
  h += `<div>${stateStatus(G, ab)} ${s.heli ? '<span class="tag">🚁 Patrolled</span>' : ''}</div>`;
  if (G.phase === 0) {
    h += `<h4>Sons of Jacob chapter</h4>${meter(s.chapter, 100, '#c9a227')}<div class="kv" style="margin-top:6px"><span>Strength</span><b>${s.chapter}%</b><span>Faithful population</span><b>${Math.round(S.faith * 100)}%</b></div>`;
    const c = A.chapterCost(G, ab);
    h += actBtn({ act: 'chapter', arg: ab, icon: s.chapter ? '⛪' : '✚', title: s.chapter ? 'Grow the chapter' : 'Found a chapter', desc: 'Sermons, Bible study, men\'s groups. More members; a little more attention.', cost: costTxt(c), ok: s.chapter < 100 && G.res.funds >= c.funds });
    h += `<h4>Military installations</h4>`;
    if (!S.bases.length) h += '<div class="empty">None of note.</div>';
    else {
      h += `${meter(s.infil, 100, '#4a6fa5')}<div class="kv" style="margin:6px 0">${S.bases.map(b => `<span>${b[0]}</span><b>${'★'.repeat(b[1])}</b>`).join('')}<span>Officers sympathetic</span><b>${s.infil}%</b></div>`;
      h += actBtn({ act: 'infil', arg: ab, icon: '🎖', title: 'Infiltrate the officer corps', desc: s.chapter < 10 ? 'Requires a chapter (10%+) in this state first.' : 'Turn colonels and chaplains. On the day, their men will follow.', cost: costTxt(A.infiltrateCost()), ok: s.chapter >= 10 && s.infil < 100 });
    }
  } else if (!s.exile) {
    h += `<h4>Control</h4>${meter(s.hold, 100, '#b3202a')}<div class="kv" style="margin-top:6px"><span>Gilead control</span><b>${pct(s.hold)}</b><span>Enemy strength</span><b>${Math.round(s.resist)}</b><span>Supply line</span><b>${A.supplied(G, ab) ? '<span class="good">Depot in range</span>' : '<span class="warn">No depot in range</span>'}</b><span>Airfield cover</span><b>${A.airfieldFor(G, ab) ? '<span class="good">Yes</span>' : '<span class="muted">None</span>'}</b></div>`;
    const op = G.ops.find(o => o.st === ab);
    if (op) {
      h += `<div class="card"><b>⚔ Offensive under way</b><div class="kv" style="margin-top:6px"><span>Guardians committed</span><b>${fmtNum(op.troops)}</b><span>Since</span><b>${fmtDate(op.start, true)}</b></div><div class="btnrow"><button class="btn sm" data-act="cancelop" data-arg="${op.uid}">Withdraw troops</button></div></div>`;
    } else if (s.hold < 99.5) {
      const ok = A.canAttack(G, ab), av = A.availableTroops(G);
      h += `<h4>Ground offensive</h4><div class="muted" style="font-size:12px">${ok.ok ? `${fmtNum(av)} Guardians available. Costs 20 supplies to launch, then supplies and treasury daily.` : ok.msg}</div>`;
      h += `<div class="btnrow">${[0.25, 0.5, 1].map(f => `<button class="btn sm ${ok.ok && av * f >= 5000 ? '' : 'dis'}" data-act="offensive" data-arg="${ab}|${f}">⚔ ${f === 1 ? 'All' : f * 100 + '%'} · ${fmtNum(av * f)}</button>`).join('')}</div>`;
    }
    if (s.hold < 99.5) {
      const a1 = A.strikeCheck(G, ab, 'air'), a2 = A.strikeCheck(G, ab, 'drone');
      h += actBtn({ act: 'strike', arg: ab + '|air', icon: '✈', title: 'Air strike', desc: a1.ok ? 'Bomb their positions. Big gains — and the world watches.' : a1.msg, cost: '₲12M · 10 supplies', ok: a1.ok });
      h += actBtn({ act: 'strike', arg: ab + '|drone', icon: '🛸', title: 'Drone strike', desc: a2.ok ? 'Precise. Destroys resistance cells.' : a2.msg, cost: '₲6M', ok: a2.ok });
    }
    if (M(G, 'heli')) h += actBtn({ act: 'heli', arg: ab, icon: '🚁', title: s.heli ? 'Withdraw helicopter patrols' : 'Helicopter patrols', desc: 'Suppress the enemy and Mayday; catch runaways.', cost: `${Object.values(G.st).filter(x => x.heli).length}/${A.heliCapacity(G)}`, ok: true });
  } else {
    h += `<p class="muted">Alaska and Hawaii remain under the legitimate United States government. Anchorage hosts the government-in-exile; refugees there get one five-minute phone call a week. The Republic cannot reach them.</p>`;
  }
  if (cities.length) {
    h += `<h4>Cities</h4>`;
    for (const c of cities) {
      const n = G.bld.filter(b => b.city === c).length;
      h += actBtn({ act: 'city', arg: c, icon: CITIES[c].rank === 3 ? '🏛' : '🏙', title: CITY_POS[c].name, desc: G.phase === 0 ? '' : `${n} institution${n === 1 ? '' : 's'}${isHeld(G, ab) ? '' : ' · not under control'}`, cost: '›' });
    }
  }
  return h + '</div>';
}

// =================== DRAWER: CITY ===================
export function cityDrawer(G, city) {
  const C = CITIES[city], P = CITY_POS[city], ab = C?.st;
  const held = G.phase > 0 && ab && isHeld(G, ab);
  let h = head(P.name, `${STATES[ab]?.name || ''} · ${['', 'Regional city', 'Major city', 'Capital-class city'][C?.rank || 1]}`, `<button class="close" data-act="state" data-arg="${ab}" title="State">↩</button>`);
  h += '<div class="dbody">';
  const list = G.bld.filter(b => b.city === city);
  const slots = 2 + (C?.rank || 1) * 2;
  if (G.phase === 0) h += `<p class="muted">Nothing can be built until the Republic exists. Grow the chapter in ${STATES[ab].name} instead.</p>`;
  h += `<h4>Institutions (${list.length}/${slots})</h4>`;
  if (!list.length) h += `<div class="empty">None.</div>`;
  const tr = G.day;
  for (const b of list) {
    const B = BUILDINGS[b.type], T = B.tiers[b.tier];
    let info = '';
    if (b.done != null) info = `Under construction — ${Math.max(0, b.done - tr)} days left`;
    else if (B.housing) info = `${fmtNum(b.occ)} / ${fmtNum(T.cap)} Unwomen`;
    else if (B.from) { const n = b.cohorts.reduce((a, c) => a + c.n, 0); info = `${fmtNum(n)} / ${fmtNum(T.cap)} in training · ${T.days}-day course`; }
    else info = T.name;
    h += `<div class="card" style="display:flex;gap:10px;align-items:center"><span style="font-size:24px">${B.icon}</span><div style="flex:1;min-width:0"><b>${esc(b.name)}</b><div class="muted" style="font-size:11.5px">${B.label} · ${T.name}</div><div style="font-size:12px;margin-top:3px">${info}</div>${b.done != null ? meter(tr - b.start, b.done - b.start, '#c9a227') : B.from && !B.housing ? meter(b.cohorts.reduce((a, c) => a + c.n, 0), T.cap, B.color) : ''}</div><button class="btn sm" data-act="demolish" data-arg="${b.uid}">Close</button></div>`;
  }
  if (held) {
    h += `<h4>Build</h4>`;
    for (const type of BUILD_ORDER) {
      const B = BUILDINGS[type];
      const unlocked = !B.unlock || G.decrees[B.unlock] != null;
      if (!unlocked) continue;
      B.tiers.forEach((T, i) => {
        if (T.unlock && G.decrees[T.unlock] == null) return;
        const av = A.buildAvailability(G, type, city, i);
        if (!av.ok && /Already one|Only one|Only at/.test(av.msg)) return;
        const nextName = B.unique ? B.names[0] : B.names[(G.nameIdx[type] || 0) % B.names.length];
        const cap = T.cap ? (B.housing ? ` · houses ${fmtNum(T.cap)}` : ` · ${fmtNum(T.cap)} trainees / ${T.days} days`) : '';
        h += actBtn({ act: 'build', arg: `${type}|${city}|${i}`, icon: B.icon, title: `${B.label}${B.tiers.length > 1 ? ` — ${T.name}` : ''}`, desc: `${av.ok ? `"${esc(nextName)}"` : av.msg}${cap}. ${B.desc}`, cost: `₲${T.cost}M · ${T.build}d`, ok: av.ok });
      });
    }
    const locked = BUILD_ORDER.filter(t => BUILDINGS[t].unlock && G.decrees[BUILDINGS[t].unlock] == null);
    if (locked.length) h += `<p class="muted" style="font-size:12px">Locked by decree: ${locked.map(t => BUILDINGS[t].label).join(', ')}.</p>`;
  } else if (G.phase > 0) h += `<p class="muted">This city is not under the Republic's control.</p>`;
  return h + '</div>';
}

// =================== DRAWER: DISPATCHES ===================
export function dispatchDrawer(G) {
  let h = head('Dispatches', `${G.events.queue.length} awaiting your decision`);
  h += '<div class="dbody">';
  if (!G.events.queue.length) h += '<div class="empty">All quiet. For now.</div>';
  for (const q of G.events.queue) {
    const e = EVENT_BY_ID[q.id];
    const where = CITY_POS[q.loc]?.name || STATES[q.loc]?.name || '';
    h += actBtn({ act: 'event', arg: q.uid, icon: e.icon, title: e.title, desc: `${where}${q.expires ? ` · decide within ${q.expires - G.day} days` : ' · URGENT'}`, cost: '›' });
  }
  return h + '</div>';
}

// =================== SCREEN: THE PLOT (phase 0) ===================
export function plotScreen(G) {
  const inf = infiltration(G);
  const cr = A.coupReady(G);
  const chap = Object.values(G.st).filter(s => s.chapter >= 25).length;
  let h = head('The Committee\'s Plan', 'Sons of Jacob · Pre-Gilead');
  h += `<div class="sbody"><div class="cols"><div>`;
  h += `<h3>Movement</h3><div class="grid3">
    <div class="stat"><div class="k">Members</div><div class="v">${fmtNum(G.res.members)}</div>${sparkline(G.hist.map(x => x.mem))}</div>
    <div class="stat"><div class="k">Chapters ≥25%</div><div class="v">${chap} <small class="muted">/ 30</small></div>${meter(chap, 30, '#c9a227')}</div>
    <div class="stat"><div class="k">Military infiltration</div><div class="v">${inf.toFixed(1)}%</div>${meter(inf, 35, '#4a6fa5')}</div></div>`;
  h += `<h3>Operations</h3>`;
  for (const [id, a] of Object.entries(A.PLOT_ACTIONS)) {
    const done = a.once && G.plot[id === 'publish' ? 'book' : id];
    const cd = (G.cool[id] || 0) - G.day;
    const needs = a.needs && !G.cmd[a.needs].seat;
    h += actBtn({ act: 'plot', arg: id, icon: a.icon, title: a.name, desc: needs ? `Requires ${COMMANDERS[a.needs].name} on the Committee.` : a.desc, cost: done ? 'Done' : cd > 0 ? `${cd}d` : costTxt(a.cost) || 'Free', ok: !done && cd <= 0 && !needs, done });
  }
  h += `</div><div>`;
  h += `<h3>The FBI</h3><div class="stat"><div class="k">Suspicion</div><div class="v ${G.res.suspicion > 70 ? 'bad' : G.res.suspicion > 45 ? 'warn' : ''}">${Math.round(G.res.suspicion)}%</div>${meter(G.res.suspicion, 100, G.res.suspicion > 70 ? '#d6503f' : '#d9a43a')}<div class="muted" style="font-size:11.5px;margin-top:6px">At 100% the Bureau raids the Committee and the game is lost. ${G.plot.moles ? 'Moles inside the Bureau halve its growth.' : ''}</div>${sparkline(G.hist.map(x => x.sus), '#d6503f')}</div>`;
  h += `<h3>The Three Strikes</h3><p class="muted" style="font-size:12.5px">Gunmen in the Capitol galleries, a bomb in the White House, the Court in session. Blame "terrorists". Requires 5+ founders seated and 12%+ infiltration to begin preparations. Each step costs $12M.</p>`;
  for (const [k, p] of Object.entries(A.PLOTS)) {
    h += `<div class="card"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:24px">${p.icon}</span><div style="flex:1"><b>${p.name}</b><div class="muted" style="font-size:11.5px">${p.desc}</div>${meter(G.plot[k], 100, '#b3202a')}</div><button class="btn sm ${G.plot[k] >= 100 ? 'dis' : ''}" data-act="fundplot" data-arg="${k}">${G.plot[k] >= 100 ? 'Ready' : Math.round(G.plot[k]) + '% · $12M'}</button></div></div>`;
  }
  const need = [['g_chapters', 'Chapters in 30 states'], ['g_committee', '8 founders seated'], ['g_infil', '35% military infiltration'], ['g_plot', 'All strikes prepared']];
  h += `<div class="card">${need.map(([g, t]) => `<div style="margin:3px 0">${G.goals[g] != null || (g === 'g_plot' && cr.avg >= 100) ? '✅' : '⬜'} ${t}</div>`).join('')}</div>`;
  h += `<button class="btn primary block ${cr.ready ? '' : 'dis'}" style="min-height:58px;font-size:17px;font-family:var(--serif)" data-act="coup">⚡ Execute the Three Strikes</button>`;
  h += `</div></div></div>`;
  return h;
}

// =================== SCREEN: POPULATION ===================
export function popScreen(G) {
  let h = head('Population of the Republic', G.phase === 0 ? 'The United States, before' : `${fmtNum(gileadPop(G))} souls under His Eye`);
  h += '<div class="sbody">';
  if (G.phase === 0) {
    const us = Object.values(STATES).reduce((a, s) => a + s.pop, 0) * 1e6;
    h += `<div class="grid3"><div class="stat"><div class="k">United States</div><div class="v">${fmtNum(us)}</div></div><div class="stat"><div class="k">Sons of Jacob</div><div class="v">${fmtNum(G.res.members)}</div></div><div class="stat"><div class="k">Live births vs. 2000</div><div class="v bad">−52%</div></div></div>`;
    h += `<p class="muted" style="margin-top:14px">After the coup, every person in the territory you hold must be <b>processed</b>: registered, classified and assigned a place in Gilead. Commanders and Wives, Aunts, Handmaids and Marthas, Econopeople, Guardians and Eyes — and the Unwomen. This screen will show each class and who is being converted into it right now.</p>`;
    h += `<div class="classgrid" style="margin-top:12px">${Object.entries(CLASS_INFO).map(([k, c]) => `<div class="cls" style="--c:${c.color}">${figure(c.fig)}<div class="l">${c.label}</div><div class="d">${c.desc}</div></div>`).join('')}</div>`;
    return h + '</div>';
  }
  const p = G.pop, cl = p.cls, tr = inTraining(G), tot = gileadPop(G);
  const order = ['commanders', 'wives', 'widows', 'daughters', 'sons', 'aunts', 'handmaids', 'marthas', 'econowives', 'economen', 'econochildren', 'guardians', 'eyes', 'jezebels', 'unwomen'];
  const segs = [...order.map(k => [cl[k], CLASS_INFO[k].color]), ...Object.keys(POOL_INFO).map(k => [p[k], POOL_INFO[k].color])];
  h += `<div class="grid4">
    <div class="stat"><div class="k">Total population</div><div class="v">${fmtNum(tot)}</div>${sparkline(G.hist.filter(x => x.pop).map(x => x.pop))}</div>
    <div class="stat"><div class="k">Live births (12 mo)</div><div class="v">${fmtNum(p.birthsYear)}</div>${sparkline(G.hist.map(x => x.b), '#7fae6a')}</div>
    <div class="stat"><div class="k">Awaiting processing</div><div class="v">${fmtNum(p.men + p.women + p.fertile + p.children)}</div><div class="muted" style="font-size:11px">${fmtNum(p.detainees)} detainees</div></div>
    <div class="stat"><div class="k">Escaped · Returned</div><div class="v">${fmtNum(p.escaped)}</div><div class="muted" style="font-size:11px">${fmtNum(p.returnees)} returnees · ${fmtNum(p.deaths)} dead</div></div></div>`;
  h += `<div class="popbar">${segs.map(([v, c]) => `<i style="width:${(v / tot * 100).toFixed(2)}%;background:${c}"></i>`).join('')}</div>`;
  h += `<h3>Classes</h3><div class="classgrid">`;
  for (const k of order) {
    const c = CLASS_INFO[k];
    const t = tr[k] ? `<div class="tr">+${fmtNum(tr[k])} in training</div>` : '';
    h += `<div class="cls" style="--c:${c.color}">${figure(c.fig)}${t}<div class="n">${fmtNum(cl[k])}</div><div class="l">${c.label}</div><div class="d">${c.desc}</div></div>`;
  }
  h += `</div><div class="cols" style="margin-top:6px"><div><h3>Being converted now</h3>`;
  const groups = {};
  for (const b of G.bld) { const B = BUILDINGS[b.type]; if (!B.from || b.done != null) continue; const g = groups[b.type] || (groups[b.type] = { n: 0, cap: 0, count: 0 }); g.n += b.cohorts.reduce((a, c) => a + c.n, 0); g.cap += B.tiers[b.tier].cap; g.count++; }
  if (!Object.keys(groups).length) h += `<div class="empty">No conversion centres are operating. Tap a held city on the map to build one.</div>`;
  for (const [type, g] of Object.entries(groups)) {
    const B = BUILDINGS[type];
    const to = B.to === 'processed' ? 'Interrogation' : CLASS_INFO[B.to]?.label;
    h += `<div class="pipeline"><span class="pn">${B.icon} ${B.short} ×${g.count}<br><small class="muted">→ ${to}</small></span>${meter(g.n, g.cap, B.color)}<span class="pv">${fmtNum(g.n)} / ${fmtNum(g.cap)}</span></div>`;
  }
  if (G._auntEff < 1) h += `<p class="warn" style="font-size:12px">⚠ Not enough Aunts to staff every Red Centre (${Math.round(G._auntEff * 100)}% efficiency). Build an Aunts' Hall.</p>`;
  const housing = G.bld.filter(b => BUILDINGS[b.type].housing && b.done == null);
  h += `<h4>The Colonies</h4><div class="kv"><span>Unwomen housed in Colonies</span><b>${fmtNum(housing.reduce((a, b) => a + b.occ, 0))}</b><span>Unhoused Unwomen (held in camps)</span><b>${fmtNum(G._unhoused || 0)}</b><span>Died in the Colonies</span><b>${fmtNum(p.colonyDeaths)}</b><span>Land reclaimed (fertility bonus)</span><b>+${Math.round(Math.min(50, p.reclaimed / 8))}%</b></div>`;
  h += `</div><div><h3>Awaiting processing</h3>`;
  for (const [k, info] of Object.entries(POOL_INFO)) h += `<div class="pipeline"><span class="pn"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${info.color}"></i> ${info.label}</span>${meter(p[k], Math.max(1, p.men), info.color)}<span class="pv">${fmtNum(p[k])}</span></div>`;
  h += `<p class="muted" style="font-size:12px">Men register as Economen; women marry as Econowives (faster with Prayvaganzas); Commanders, Wives, Daughters and Sons grow with the Republic. Fertile women can only be made Handmaids in a Red Centre. ${M(G, 'fertileFind') ? '' : '<b>Fertility Screening & Roundups</b> must be decreed first.'}</p>`;
  h += `<h4>Fertility</h4><div class="kv"><span>Pregnancies under way</span><b>${fmtNum(p.pregnant.reduce((a, b) => a + b[1], 0))}</b><span>Live births, all time</span><b>${fmtNum(p.births)}</b><span>"Unbabies"</span><b>${fmtNum(p.unbabies)}</b><span>The Ceremony</span><b>${M(G, 'births') ? 'Instituted' : '<span class="warn">Not yet decreed</span>'}</b></div>`;
  h += `</div></div></div>`;
  return h;
}

// =================== SCREEN: COMMANDERS ===================
export function cmdScreen(G) {
  const max = G.phase === 0 ? COMMITTEE_SEATS : HIGH_COUNCIL_SEATS;
  const n = seated(G).length;
  let h = head('Commanders of the Faithful', `${n}/${max} seats on the ${G.phase === 0 ? 'Committee' : 'High Council'} · next seat costs ${costTxt(A.seatCost(G))}`);
  h += `<div class="sbody"><p class="muted" style="margin-top:0">Only the men who matter are named. Seat them on the ${G.phase === 0 ? 'Committee' : 'High Council'}, then give each a portfolio: ${Object.values(PORTFOLIOS).map(p => `${p.icon} ${p.name}`).join(' · ')}. Unseated, ambitious men grow disloyal.</p><div class="cmdgrid">`;
  const ids = Object.keys(COMMANDERS).sort((a, b) => (G.cmd[b].seat - G.cmd[a].seat) || (G.cmd[b].alive - G.cmd[a].alive) || (COMMANDERS[a].joins - COMMANDERS[b].joins));
  for (const id of ids) {
    const c = COMMANDERS[id], g = G.cmd[id];
    const avail = c.joins <= G.phase;
    const stars = c.title.includes('High') ? 2 : 1;
    const hh = c.household;
    const stat = g.alive ? (g.status === 'arrested' ? '<span class="tag red">Arrested</span>' : g.status === 'abroad' ? '<span class="tag">Abroad</span>' : g.seat ? '<span class="tag gold">Seated</span>' : avail ? '' : `<span class="tag">Rises in ${PHASES[c.joins].name}</span>`) : '<span class="tag red">Dead</span>';
    h += `<div class="cmd ${g.seat ? 'seated' : ''} ${g.alive ? '' : 'dead'}">
      <div class="top">${portrait(id, c.name, c.faction, stars, !g.alive)}<div style="flex:1;min-width:0"><div class="nm">${c.name}</div><div class="tt">${c.title} · ${CITY_POS[c.city]?.name || ''} · ${c.faction === 'hard' ? 'Hardliner' : 'Pragmatist'}</div><div style="margin-top:4px">${stat}</div></div></div>
      <div class="stats">${[['Adm', 'adm'], ['Mil', 'mil'], ['Eyes', 'int'], ['Dipl', 'dip'], ['Zeal', 'zeal']].map(([l, k]) => `<div><b>${c.stats[k]}</b>${l}</div>`).join('')}</div>
      <div><div style="display:flex;justify-content:space-between;font-size:11px" class="muted"><span>Loyalty</span><span>${Math.round(g.loyalty)}</span></div>${meter(g.loyalty, 100, g.loyalty < 30 ? '#d6503f' : '#7fae6a')}</div>
      <div class="hh"><span>Wife:</span> ${esc(hh.wife || '—')}${hh.handmaid ? `<br><span>Handmaid:</span> ${esc(hh.handmaid)}` : ''}${hh.marthas.length ? `<br><span>Marthas:</span> ${esc(hh.marthas.join(', '))}` : ''}${hh.guardians.length ? `<br><span>Guardians:</span> ${esc(hh.guardians.join(', '))}` : ''}${hh.children.length ? `<br><span>Children:</span> ${esc(hh.children.join(', '))}` : ''}</div>
      <div class="bio">${esc(g.fate ? g.fate[0].toUpperCase() + g.fate.slice(1) + '.' : c.bio)}</div>`;
    if (g.alive && g.seat) {
      h += `<div class="pfs">${Object.entries(PORTFOLIOS).map(([k, p]) => `<button class="${g.portfolio === k ? 'on' : ''}" data-act="portfolio" data-arg="${id}|${k}" title="${p.name}">${p.icon}</button>`).join('')}<button data-act="unseat" data-arg="${id}" style="margin-left:auto;font-size:11px;padding:0 8px">Unseat</button></div>`;
      if (g.portfolio) h += `<div class="muted" style="font-size:11px">${PORTFOLIOS[g.portfolio].icon} ${PORTFOLIOS[g.portfolio].name}: ${PORTFOLIOS[g.portfolio].desc}</div>`;
    } else if (g.alive && avail && g.status === 'free') h += `<button class="btn sm ${n < max ? '' : 'dis'}" data-act="seat" data-arg="${id}">Seat · ${costTxt(A.seatCost(G))}</button>`;
    h += `</div>`;
  }
  h += `</div><h3>The Aunts</h3><p class="muted">Aunt Lydia${G.flags.lydia ? ' (recruited)' : ''}, Aunt Elizabeth, Aunt Ruth, Aunt Vidala, Aunt Gabbana, Aunt Estée — ${fmtNum(G.pop.cls.aunts)} Aunts in all. Wives outrank Aunts socially, but Aunts control the Handmaids.</p></div>`;
  return h;
}

// =================== SCREEN: COUNCILS ===================
export function councilScreen(G) {
  const max = G.phase === 0 ? COMMITTEE_SEATS : HIGH_COUNCIL_SEATS;
  const sids = seated(G);
  const fill = sids.map(id => { const c = COMMANDERS[id]; const ini = c.name.replace('Commander ', '').split(' ').map(x => x[0]).join(''); return { color: c.faction === 'hard' ? '#8e1a20' : '#2f5d7a', stroke: G.cmd[id].portfolio ? '#c9a227' : null, label: ini, id }; });
  fill.sort((a, b) => (a.color === b.color ? 0 : a.color === '#8e1a20' ? -1 : 1));
  const name = G.phase === 0 ? 'The Committee' : 'The High Council';
  let h = head('Councils of Gilead', G.phase === 0 ? 'The Committee of the Sons of Jacob — twelve seats' : `The High Council sits in Washington · district councils govern each region`);
  h += `<div class="sbody"><div class="cols"><div><div class="card" style="padding:14px">${hemicycle(max, fill, { w: 520, rows: max > 12 ? 3 : 2, maxR: 26, center: name, sub: `${sids.length} OF ${max} SEATS FILLED` })}
    <div style="display:flex;gap:14px;justify-content:center;font-size:12px;margin-top:6px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#8e1a20"></i> Hardliners</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2f5d7a"></i> Pragmatists</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1.5px solid #c9a227"></i> Holds a portfolio</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1px dashed #fff8"></i> Empty</span></div></div>`;
  h += `<div class="grid2">${sids.map(id => { const c = COMMANDERS[id]; const pf = G.cmd[id].portfolio; return `<div class="card" style="display:flex;gap:8px;align-items:center;margin:0">${portrait(id, c.name, c.faction, 1)}<div><b style="font-family:var(--serif);font-size:15px">${c.name}</b><div class="muted" style="font-size:11px">${pf ? PORTFOLIOS[pf].icon + ' ' + PORTFOLIOS[pf].name : 'No portfolio'}</div></div></div>`; }).join('')}</div>`;
  h += `<button class="btn block" style="margin-top:10px" data-act="tab" data-arg="cmd">Manage Commanders ›</button></div><div>`;
  if (G.phase === 0) {
    h += `<h3>District councils</h3><p class="muted">After the Republic is proclaimed, each district will be governed by a council of lower-ranking Commanders. Their seats fill as you take and hold territory.</p>`;
  } else {
    h += `<h3>District councils <small class="muted" style="font-family:var(--sans);font-size:12px">${Math.round(councilFill(G) * 100)}% of seats filled</small></h3><div class="grid2">`;
    for (const [id, d] of Object.entries(DISTRICTS)) {
      const c = G.council[id], cap = districtCap(G, id);
      const hard = Math.round(c.filled * c.hard);
      const f = [...Array(hard).fill({ color: '#8e1a20' }), ...Array(c.filled - hard).fill({ color: '#2f5d7a' })];
      const nm = id === 'eastern' && G.phase >= 3 ? d.later : d.name;
      h += `<div class="council">${hemicycle(d.seats, f, { w: 240 })}<div class="t">${nm}</div><div class="s">${d.council || 'Council at ' + CITY_POS[d.seat].name} · ${c.filled}/${d.seats} seats · ${cap} available</div><button class="btn sm ${c.filled < cap ? '' : 'dis'}" style="margin-top:6px;width:100%" data-act="district" data-arg="${id}">Appoint Commanders · 8 Power</button></div>`;
    }
    h += `</div>`;
  }
  h += `</div></div></div>`;
  return h;
}

// =================== SCREEN: DECREES ===================
export function decreeScreen(G) {
  let h = head('Decrees of the Republic', `Power: ${Math.floor(G.res.power)} · each law unlocks new institutions and abilities`);
  h += `<div class="sbody"><div class="tree">`;
  for (let ph = 1; ph <= 5; ph++) {
    h += `<div><div class="colh">${PHASES[ph].name}</div>`;
    for (const d of DECREES.filter(x => x.phase === ph)) {
      const st = A.decreeState(G, d);
      const cost = A.decreeCost(G, d);
      const reqs = d.req.filter(r => G.decrees[r] == null).map(r => DECREES.find(x => x.id === r)?.name);
      h += `<button class="dec ${st}" data-act="decree" data-arg="${d.id}"><b>${st === 'enacted' ? '✔ ' : st === 'locked' ? '🔒 ' : ''}${d.name}</b><small>${st === 'blocked' ? 'Requires: ' + reqs.join(', ') : esc(d.desc)}</small><div class="c">${st === 'enacted' ? 'Law since ' + fmtDate(G.decrees[d.id], true) : st === 'locked' ? 'Unlocks in this era' : cost + ' Power'}</div></button>`;
    }
    h += `</div>`;
  }
  return h + `</div></div>`;
}

// =================== SCREEN: MILITARY ===================
export function warScreen(G) {
  const cl = G.pop.cls;
  let h = head('The War', 'Guardians of the Faith · the Air Force · the Eyes');
  h += `<div class="sbody"><div class="grid4">
    <div class="stat"><div class="k">Guardians</div><div class="v">${fmtNum(cl.guardians)}</div><div class="muted" style="font-size:11px">${fmtNum(A.availableTroops(G))} available · ${fmtNum(G.army.committed)} committed</div>${sparkline(G.hist.map(x => x.gd || 0), '#6f8ab8')}</div>
    <div class="stat"><div class="k">States held</div><div class="v">${Object.values(G.st).filter(s => s.hold >= 99.5 && !s.exile).length} <small class="muted">/ 49</small></div>${sparkline(G.hist.map(x => x.held || 0), '#b3202a')}</div>
    <div class="stat"><div class="k">U.S. loyalist strength</div><div class="v">${Math.round(G.army.usa)}</div><div class="muted" style="font-size:11px">Rises as Gilead's standing falls</div></div>
    <div class="stat"><div class="k">Strikes flown</div><div class="v">${G.stats.strikes} <small class="muted">✈</small> ${G.stats.drones} <small class="muted">🛸</small></div><div class="muted" style="font-size:11px">Airfields: ${G.bld.filter(b => b.type === 'airfield' && b.done == null).length} · Depots: ${G.bld.filter(b => b.type === 'depot' && b.done == null).length}</div></div></div>`;
  h += `<h3>Operations</h3>`;
  if (!G.ops.length) h += `<div class="empty">No offensives under way. Tap a contested state to launch one.</div>`;
  for (const o of G.ops) h += `<div class="card" style="display:flex;align-items:center;gap:12px"><span style="font-size:22px">⚔</span><div style="flex:1"><b>${STATES[o.st].name}</b> <span class="muted" style="font-size:12px">${fmtNum(o.troops)} Guardians · ${A.supplied(G, o.st) ? 'supplied' : '<span class="warn">unsupplied (−55%)</span>'}</span>${meter(G.st[o.st].hold, 100, '#b3202a')}</div><button class="btn sm" data-act="state" data-arg="${o.st}">Open</button><button class="btn sm" data-act="cancelop" data-arg="${o.uid}">Withdraw</button></div>`;
  h += `<h3>Fronts</h3><div class="grid2">`;
  const fronts = Object.keys(G.st).filter(a => !G.st[a].exile && G.st[a].hold < 99.5).sort((a, b) => G.st[b].hold - G.st[a].hold);
  for (const ab of fronts) {
    const s = G.st[ab], can = A.canAttack(G, ab).ok;
    h += `<button class="act" data-act="state" data-arg="${ab}" style="margin:0"><span class="ai">${s.hold > 0.5 ? '🔥' : '🇺🇸'}</span><span class="at"><b>${STATES[ab].name}</b><small>${pct(s.hold)} held · enemy ${Math.round(s.resist)} ${can ? '· can attack' : ''}</small>${meter(s.hold, 100, '#b3202a')}</span><span class="ac">›</span></button>`;
  }
  h += `</div><h3>Doctrine</h3><div class="kv" style="max-width:520px"><span>Air strikes</span><b>${M(G, 'airstrike') ? 'Authorised' : 'Decree required'}</b><span>Drone programme</span><b>${M(G, 'drone') ? 'Active' : 'Decree required'}</b><span>Helicopter patrols</span><b>${M(G, 'heli') ? `${Object.values(G.st).filter(s => s.heli).length}/${A.heliCapacity(G)} squadrons` : 'Decree required'}</b><span>No Man's Land</span><b>${G.decrees.d_nomansland != null ? 'Established' : '—'}</b><span>Mayday (resistance)</span><b>${Math.round(G.res.resistance)}</b></div></div>`;
  return h;
}

// =================== SCREEN: GOALS ===================
export function goalScreen(G) {
  let h = head('Goals', `Era ${G.phase + 1} of 6 · ${PHASES[G.phase].name}`);
  h += `<div class="sbody"><div class="phasecol">${PHASES.map((p, i) => `<div class="${i === G.phase ? 'now' : i < G.phase ? 'past' : ''}"><b>${i + 1}. ${p.name}</b><br>${p.sub}</div>`).join('')}</div>`;
  h += `<p class="serif" style="font-size:18px;color:var(--ink2)">${PHASES[G.phase].intro}</p>`;
  h += `<p class="muted" style="font-size:12px">★ Key goals must all be achieved to advance to the next era${G.phase > 0 && G.phase < 5 ? ' (and each era lasts at least ~16 months)' : ''}. Other goals grant rewards.</p>`;
  for (const g of GOALS.filter(x => x.phase === G.phase)) {
    const done = G.goals[g.id] != null;
    const [c, t] = g.check(G, SIMH);
    const prog = g.cmp === 'ge0' ? (c >= 0 ? 1 : (c + 100) / 100) : Math.min(1, c / (t || 1));
    h += `<div class="goal ${done ? 'done' : ''} ${g.key ? 'key' : ''}"><span class="gi">${done ? '✅' : g.key ? '★' : '◇'}</span><div class="gt"><b>${g.name}</b><small>${g.hint}${Object.keys(g.reward || {}).length ? ` · Reward: ${Object.entries(g.reward).map(([k, v]) => `${v > 0 ? '+' : ''}${fmtNum(v)} ${k}`).join(', ')}` : ''}</small></div><div class="gp">${meter(prog * 100, 100, done ? '#7fae6a' : '#c9a227')}<span>${done ? 'Achieved ' + fmtDate(G.goals[g.id], true) : `${fmtNum(c)} / ${fmtNum(t)}`}</span></div></div>`;
  }
  const past = GOALS.filter(x => x.phase < G.phase && G.goals[x.id] != null).length;
  if (G.phase > 0) h += `<p class="muted">${past} goals achieved in earlier eras.</p>`;
  return h + '</div>';
}

// =================== SCREEN: CHRONICLE ===================
export function logScreen(G) {
  let h = head('The Chronicle', 'A record kept in the Boston Globe archive, under "Origins of Gilead"');
  h += '<div class="sbody">';
  for (const l of G.log.slice(0, 200)) h += `<div class="logrow ${l.type}"><span class="d">${fmtDate(l.day, true)}</span><span>${esc(l.text)}</span></div>`;
  return h + '</div>';
}
