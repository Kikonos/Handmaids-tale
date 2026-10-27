// Gilead: Under His Eye — application controller.
import { newGame, fmtDate, fmtNum, gileadPop, infiltration, seated, inTraining, VERSION, VERSION_NAME, M, STATES } from './engine/core.js';
import { tick } from './engine/sim.js';
import * as A from './engine/actions.js';
import { resolveEvent, choiceAvailable } from './engine/events.js';
import { EVENT_BY_ID } from './data/events.js';
import { PHASES } from './data/phases.js';
import { CITY_POS } from './data/geo.js';
import { saveGame, loadGame, saveMeta, deleteSave } from './engine/save.js';
import { createMap } from './ui/map.js';
import * as P from './ui/panels.js';
import { seal, figure } from './ui/art.js';
import { fxChips, esc } from './ui/widgets.js';
import { unlockAudio, playTheme, sfx, audioSettings, setAudio, THEME_NAMES, currentTheme } from './audio/audio.js';

const $ = s => document.querySelector(s);
const SPEEDS = { 1: 1.5, 2: 0.75, 4: 0.375 }; // real seconds per game day
const THEME_OF = ['conspiracy', 'republic', 'eye', 'war', 'bethlehem', 'reckoning'];

const app = { G: null, map: null, tab: 'map', drawer: null, acc: 0, modal: null, lastHud: 0, lastPanel: 0, lastMap: 0, speed: 1, toastQ: [] };
window.__app = app; // debugging hook
app.A = A; app.tick = tick;

// ---------------- Boot ----------------
function boot() {
  $('#title').innerHTML = titleHTML();
  document.addEventListener('click', onClick);
  document.addEventListener('pointerdown', () => { unlockAudio(); if (!currentTheme()) playTheme(app.G ? THEME_OF[app.G.phase] : 'title'); }, { passive: true });
  window.addEventListener('pagehide', () => app.G && saveGame(app.G, 'auto'));
  document.addEventListener('visibilitychange', () => { if (document.hidden && app.G) { saveGame(app.G, 'auto'); app.G.paused = true; } });
  document.addEventListener('gesturestart', e => e.preventDefault());
  requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}

function titleHTML() {
  const meta = saveMeta('auto');
  const procession = Array.from({ length: 14 }, (_, i) => `<div style="position:absolute;bottom:${8 + (i % 2) * 6}%;left:${-10 - i * 9}%;animation:walk 60s linear ${-i * 4.3}s infinite;opacity:.85">${figure('handmaid', 46, 74)}</div>`).join('');
  return `<style>@keyframes walk{to{transform:translateX(220vw)}}</style>
  <div class="tbg" style="background:radial-gradient(ellipse at 50% 35%, #3a0b0e 0%, #120606 55%, #050404 100%)"></div>
  <div class="tbg" style="opacity:.6">${procession}</div>
  <div class="vignette"></div>
  <div class="tcontent">
    ${seal(96)}
    <div class="kicker" style="margin-top:14px">The Republic of Gilead</div>
    <h1>Under His Eye</h1>
    <div class="tag2">Blessed be the fruit.</div>
    <div class="menu">
      ${meta ? `<button class="btn primary" data-act="continue">Continue · ${fmtDate(meta.day, true)}</button>` : ''}
      <button class="btn ${meta ? '' : 'primary'}" data-act="newgame-menu">New game</button>
      <button class="btn" data-act="howto">How to play</button>
      <button class="btn" data-act="about">About</button>
    </div>
    <div class="foot">v${VERSION} "${VERSION_NAME}" · A fan-made strategy game inspired by Hulu's <i>The Handmaid's Tale</i> and Margaret Atwood's novels. Not affiliated with Hulu, MGM or Margaret Atwood. It depicts an authoritarian regime in order to understand it — not to endorse it.<br>Best played on iPad in landscape · tap anywhere to enable sound.</div>
  </div>`;
}

function startGame(G) {
  app.G = G;
  $('#title').classList.add('gone');
  $('#app').classList.remove('hidden');
  if (!app.map) {
    app.map = createMap($('#map'), {
      onState: ab => { sfx('click'); openDrawer('state', ab); },
      onCity: c => { sfx('click'); openDrawer('city', c); },
      onPin: uid => openEvent(uid),
      onEmpty: () => closeDrawer(),
      sfx,
    });
  }
  app.tab = 'map'; app.drawer = null;
  $('#drawer').classList.add('closed'); $('#screen').classList.add('closed');
  renderAll();
  playTheme(THEME_OF[G.phase]);
  if (G.day === 0) showPhase(0);
}

// ---------------- Main loop ----------------
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  const G = app.G;
  if (G && !G.outcome) {
    const running = !G.paused && !app.modal;
    if (running) {
      app.acc += dt / SPEEDS[G.speed || 1];
      let n = 0;
      while (app.acc >= 1 && n < 6) { app.acc--; n++; try { tick(G); } catch (e) { console.error(e); G.paused = true; toast('Simulation error: ' + e.message, 'bad'); } if (G.paused || G.outcome) { app.acc = 0; break; } }
      if (n) {
        if (G.day % 30 === 0) saveGame(G, 'auto');
        processNotes();
      }
    }
    app.map.frame(dt, G, running);
    if (now - app.lastMap > 300) { app.map.render(G); app.lastMap = now; }
    if (now - app.lastHud > 250) { renderHud(); app.lastHud = now; }
    if (now - app.lastPanel > 1000) { refreshPanels(); app.lastPanel = now; }
  } else if (G && G.outcome && !app.modal && !G._endShown) { G._endShown = true; showEnd(); }
  requestAnimationFrame(loop);
}

function processNotes() {
  const G = app.G;
  const notes = (G.notes || []).splice(0);
  for (const n of notes) {
    if (n.kind === 'urgent') { sfx('urgent'); openEvent(n.uid); }
    else if (n.kind === 'event') { sfx('event'); toast(`📨 ${n.text}`, '', () => openEvent(n.uid)); }
    else if (n.kind === 'goal') { sfx('goal'); toast(`🎯 Goal achieved: ${n.text}`, 'good'); }
    else if (n.kind === 'phase') { showPhase(G.phase); }
    else if (n.kind === 'annex') { sfx('annex'); toast(`🟥 ${n.text}`, 'red'); }
    else if (n.kind === 'lost') { sfx('lost'); toast(`⚠ ${n.text}`, 'bad'); }
    else if (n.kind === 'build') { sfx('build'); toast(`🏗 ${n.text}`); }
    else if (n.kind === 'end') { G.paused = true; }
  }
  if (G.pop.births > (app._births || 0) + 0.999) { if (app._births != null && G.phase > 0) sfx('birth'); app._births = Math.floor(G.pop.births); }
}

// ---------------- Rendering ----------------
function renderAll() { renderHud(); renderNav(); renderMapUi(); refreshPanels(true); app.map.render(app.G); }

function chip(icon, val, label, bar, color, alert, delta) {
  const d = delta == null ? '' : `<em class="dl ${delta >= 0 ? 'good' : 'bad'}">${delta >= 0 ? '+' : ''}${Math.abs(delta) >= 10 ? Math.round(delta) : delta.toFixed(1)}</em>`;
  return `<div class="chip ${alert ? 'alert' : ''}" title="${label}"><span class="ic">${icon}</span><span class="v"><b>${val}${d}</b><small>${label}</small>${bar != null ? `<span class="bar"><i style="width:${Math.max(0, Math.min(100, bar))}%;--c:${color}"></i></span>` : ''}</span></div>`;
}
function renderHud() {
  const G = app.G; if (!G) return;
  const r = G.res, P0 = PHASES[G.phase];
  let chips;
  if (G.phase === 0) {
    chips = chip('💰', '$' + fmtNum(r.funds) + 'M', 'Funds') + chip('🗣', fmtNum(r.influence), 'Influence') + chip('✝', fmtNum(r.members), 'Members') +
      chip('🎖', infiltration(G).toFixed(0) + '%', 'Military', infiltration(G) / 0.35, '#4a6fa5') + chip('🕵', Math.round(r.suspicion) + '%', 'FBI suspicion', r.suspicion, r.suspicion > 70 ? '#d6503f' : '#d9a43a', r.suspicion > 75);
  } else {
    const net = (G._income || 0) - (G._upkeep || 0);
    chips = chip('⚖', fmtNum(r.power), 'Power') + chip('₲', fmtNum(r.treasury) + 'M', 'Treasury', null, null, r.treasury < 0, net) +
      chip('🌾', fmtNum(r.supplies), 'Supplies', null, null, r.supplies < 20, G._supplyNet || 0) +
      chip('🏛', Math.round(r.stability), 'Stability', r.stability, '#7fae6a', r.stability < 20) + chip('✝', Math.round(r.piety), 'Piety', r.piety, '#c9a227') +
      chip('👁', Math.round(r.fear), 'Fear', r.fear, '#b3202a') + chip('🌐', Math.round(r.standing), 'Standing', (r.standing + 100) / 2, '#6f8ab8') +
      chip('📻', Math.round(r.resistance), 'Mayday', r.resistance, '#d6503f', r.resistance > 70);
  }
  const sp = G.paused ? 0 : G.speed;
  $('#topbar').innerHTML = `${seal(38, P0.accent)}<div class="brand"><span class="ph">${P0.name}</span><span class="date num">${fmtDate(G.day)}</span></div>
    <div class="speed"><button class="pause ${sp === 0 ? 'on' : ''}" data-act="speed" data-arg="0">❚❚</button>${[1, 2, 4].map(s => `<button class="${sp === s ? 'on' : ''}" data-act="speed" data-arg="${s}">${s}×</button>`).join('')}</div>
    <div class="res">${chips}</div>`;
  renderTicker();
  if (G.phase > 0 && G.day % 5 === 0) G._trainCache = inTraining(G);
  renderCensus();
  if (app._navPhase !== G.phase) { renderNav(); renderMapUi(); }
  else if (app._navQ !== G.events.queue.length) renderNav();
}
const NAV = [
  ['map', '🗺', 'Map'], ['plot', '🕯', 'The Plot', G => G.phase === 0], ['war', '⚔', 'War', G => G.phase > 0], ['pop', '👥', 'People'],
  ['cmd', '🎖', 'Commanders'], ['council', '🏛', 'Councils'], ['decrees', '📜', 'Decrees', G => G.phase > 0], ['goals', '🎯', 'Goals'],
  ['dispatch', '📨', 'Dispatches'], ['log', '📖', 'Chronicle'], ['settings', '⚙', 'Settings'],
];
function renderNav() {
  const G = app.G;
  app._navPhase = G.phase; app._navQ = G.events.queue.length;
  $('#nav').innerHTML = NAV.filter(n => !n[3] || n[3](G)).map(([id, i, l]) => {
    const badge = id === 'dispatch' && G.events.queue.length ? `<span class="badge">${G.events.queue.length}</span>` : id === 'decrees' ? (() => { const n = (window.__decreeAvail = 0); return ''; })() : '';
    return `<button class="navbtn ${app.tab === id || (id === 'dispatch' && app.drawer?.type === 'dispatch') ? 'on' : ''}" data-act="tab" data-arg="${id}"><span class="i">${i}</span>${l}${badge}</button>`;
  }).join('');
}
function renderTicker() {
  const G = app.G;
  const items = G.log.slice(0, 6).map(l => `<span class="ticker-item"><span class="d">${fmtDate(l.day, true)}</span>${esc(l.text)}</span>`).join('<span class="muted">◆</span>');
  const th = currentTheme();
  const html = `<span class="muted" style="flex:none">♪ ${THEME_NAMES[th] || '—'}</span><div class="ticker-scroll">${items}</div>`;
  if ($('#ticker').innerHTML !== html) $('#ticker').innerHTML = html;
}
function renderMapUi() {
  const G = app.G, m = app.map.getMode();
  const modes = G.phase === 0 ? [['auto', 'Chapters'], ['infil', 'Military'], ['pop', 'Population']] : [['auto', 'Control'], ['resist', 'Enemy strength'], ['pop', 'Population']];
  const legend = G.phase === 0
    ? `<div class="row"><i style="background:#26231f"></i>No chapter</div><div class="row"><i style="background:#a07d1e"></i>Growing chapter</div><div class="row"><i style="background:#8e1a20"></i>Strong chapter</div><div class="row"><i style="background:#1d3a6a"></i>Alaska & Hawaii</div><div class="row muted">Tap a state to found chapters and infiltrate bases.</div>`
    : `<div class="row"><i style="background:#7a1419"></i>Republic of Gilead</div><div class="row"><i style="background:repeating-linear-gradient(45deg,#4e2a3a 0 3px,#ff5a3c 3px 5px)"></i>Under conflict</div><div class="row"><i style="background:#22385a"></i>U.S. / rebel held</div><div class="row"><i style="background:#1d3a6a"></i>Government in exile</div><div class="row"><i style="background:#c9a227;height:2px"></i>Active railway · 🚂 trains</div>`;
  const keyGoals = (window.__goalsMini = '');
  $('#map-ui').innerHTML = `<div class="modes">${modes.map(([k, l]) => `<button class="${m === k ? 'on' : ''}" data-act="mapmode" data-arg="${k}">${l}</button>`).join('')}</div>
    <div class="legend">${legend}</div>
    <div class="mapbtns"><button data-act="zoom" data-arg="in">＋</button><button data-act="zoom" data-arg="out">－</button><button data-act="zoom" data-arg="reset">⌂</button></div>
    <div class="census" id="census"></div>
    <div class="vignette"></div>`;
  renderCensus();
}
function renderCensus() {
  const G = app.G, el = document.getElementById('census');
  if (!G || !el) return;
  const row = (fig, label, v, extra = '') => `<div class="crow">${fig ? figure(fig, 13, 20) : ''}<span>${label}</span><b>${v}</b>${extra}</div>`;
  let h;
  if (G.phase === 0) {
    const cr = A.coupReady(G);
    h = `<div class="ctitle">Sons of Jacob</div>` + row('', 'Members', fmtNum(G.res.members)) + row('', 'Chapters', Object.values(G.st).filter(s => s.chapter > 0).length + ' states') +
      row('', 'Committee', seated(G).length + '/12') + row('', 'Three Strikes', Math.round(cr.avg) + '%');
  } else {
    const cl = G.pop.cls, tr = G._trainCache || {};
    const t = k => tr[k] ? `<i>+${fmtNum(tr[k])}</i>` : '';
    h = `<div class="ctitle">Census · ${fmtNum(gileadPop(G))}</div>` + row('handmaid', 'Handmaids', fmtNum(cl.handmaids), t('handmaids')) + row('wife', 'Wives', fmtNum(cl.wives)) +
      row('martha', 'Marthas', fmtNum(cl.marthas), t('marthas')) + row('aunt', 'Aunts', fmtNum(cl.aunts), t('aunts')) + row('guardian', 'Guardians', fmtNum(cl.guardians), t('guardians')) +
      row('eye', 'Eyes', fmtNum(cl.eyes), t('eyes')) + row('unwoman', 'Unwomen', fmtNum(cl.unwomen)) + row('', '👶 Births / yr', fmtNum(G.pop.birthsYear)) +
      row('', '⏳ Unprocessed', fmtNum(G.pop.men + G.pop.women + G.pop.fertile + G.pop.children));
  }
  if (el.innerHTML !== h) el.innerHTML = h;
}

const SCREENS = { plot: P.plotScreen, pop: P.popScreen, cmd: P.cmdScreen, council: P.councilScreen, decrees: P.decreeScreen, war: P.warScreen, goals: P.goalScreen, log: P.logScreen, settings: settingsScreen };
function refreshPanels(force = false) {
  const G = app.G; if (!G) return;
  const sc = $('#screen');
  if (app.tab !== 'map' && SCREENS[app.tab]) {
    if (force || !app._touching) {
      const body = sc.querySelector('.sbody'); const top = body ? body.scrollTop : 0;
      const html = SCREENS[app.tab](G);
      if (html !== app._lastScreenHtml) { sc.innerHTML = html; app._lastScreenHtml = html; const nb = sc.querySelector('.sbody'); if (nb) nb.scrollTop = top; }
    }
    sc.classList.remove('closed');
  } else sc.classList.add('closed');
  const dr = $('#drawer');
  if (app.drawer && (force || !app._touching)) {
    const body = dr.querySelector('.dbody'); const top = body ? body.scrollTop : 0;
    const d = app.drawer;
    const html = d.type === 'state' ? P.stateDrawer(G, d.id) : d.type === 'city' ? P.cityDrawer(G, d.id) : P.dispatchDrawer(G);
    if (html !== app._lastDrawerHtml) { dr.innerHTML = html; app._lastDrawerHtml = html; const nb = dr.querySelector('.dbody'); if (nb) nb.scrollTop = top; }
  }
}
document.addEventListener('touchstart', () => { app._touching = true; }, { passive: true });
document.addEventListener('touchend', () => { setTimeout(() => { app._touching = false; }, 400); }, { passive: true });

function openDrawer(type, id) {
  app.drawer = { type, id };
  app.map.select(type === 'dispatch' ? null : id);
  if (app.tab !== 'map') { app.tab = 'map'; renderNav(); }
  $('#drawer').classList.remove('closed');
  refreshPanels(true); app.map.render(app.G);
}
function closeDrawer() { app.drawer = null; app.map.select(null); $('#drawer').classList.add('closed'); app._lastDrawerHtml = ''; renderNav(); app.map.render(app.G); }
function setTab(t) {
  if (t === 'dispatch') { openDrawer('dispatch'); renderNav(); return; }
  app.tab = t; app._lastScreenHtml = '';
  if (t !== 'map') closeDrawer();
  renderNav(); refreshPanels(true);
  sfx('open');
}

// ---------------- Toasts ----------------
function toast(text, cls = '', onTap) {
  const t = document.createElement('div');
  t.className = 'toast ' + cls; t.textContent = text;
  if (onTap) { t.style.pointerEvents = 'auto'; t.addEventListener('click', onTap); }
  $('#toasts').appendChild(t);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 3800);
}
function result(r) { if (!r) return; if (r.ok) { if (r.msg) toast(r.msg, 'good'); } else { toast(r.msg, 'bad'); sfx('error'); } }

// ---------------- Modals ----------------
function modal(html, cls = '') {
  app.modal = true;
  $('#modal-root').innerHTML = `<div class="backdrop"><div class="modal ${cls}">${html}</div></div>`;
}
function closeModal() { app.modal = null; $('#modal-root').innerHTML = ''; if (app.G) { refreshPanels(true); renderHud(); app.map.render(app.G); } }

function openEvent(uid) {
  const G = app.G;
  const q = G.events.queue.find(x => x.uid === uid);
  if (!q) return;
  const e = EVENT_BY_ID[q.id];
  const where = CITY_POS[q.loc]?.name || STATES[q.loc]?.name || '';
  const text = typeof e.text === 'function' ? e.text(G, q) : e.text;
  const choices = e.choices.map((c, i) => {
    const ok = choiceAvailable(G, e, c);
    return `<button class="choice ${ok ? '' : 'dis'}" data-act="choose" data-arg="${uid}|${i}"><span class="ct">${esc(c.t)}${c.note ? `<small>${esc(c.note)}</small>` : ''}</span><span class="fxs">${fxChips(c.fx, c.cost)}</span></button>`;
  }).join('');
  modal(`<div class="mh"><div class="loc">${e.urgent ? '⚠ Urgent · ' : ''}${esc(where)} · ${fmtDate(G.day, true)}</div><h2>${esc(e.title)}</h2><div class="big">${e.icon}</div></div><div class="mb">${esc(text)}</div><div class="mc">${choices}${e.urgent ? '' : `<button class="btn sm" data-act="closemodal" style="align-self:flex-end">Decide later</button>`}</div>`);
  if (app.map && q.loc) { /* focus subtly */ }
}
function choose(uid, idx) {
  const G = app.G;
  const r = resolveEvent(G, uid, idx);
  if (!r) return;
  sfx('decree');
  modal(`<div class="mh"><div class="loc">Outcome</div><h2>${esc(r.title)}</h2></div><div class="outcome">${esc(r.text || 'It is done. Under His Eye.')}</div><div class="mc"><button class="btn primary" data-act="closemodal">Continue</button></div>`);
  processNotes();
}
function showPhase(ph) {
  const P0 = PHASES[ph];
  sfx('phase');
  playTheme(THEME_OF[ph]);
  modal(`<div class="num">Era ${ph + 1} of 6 · ${fmtDate(app.G.day)}</div><h1>${P0.name}</h1><div class="sub">${P0.sub}</div><p>${P0.intro}</p><div class="mc" style="align-items:center"><button class="btn primary" style="min-width:260px" data-act="closemodal">${ph === 0 ? 'Begin the plot' : 'Under His Eye'}</button><button class="btn sm" data-act="goals-from-modal">View goals</button></div>`, 'phasemodal');
  renderAll();
}
const ENDINGS = {
  victory: ['Gilead Ascendant', 'From the Atlantic to the Pacific, the Republic stands. The birth rate climbs. The world has stopped asking questions. Somewhere, a woman begins to record her story anyway: "My name is…"'],
  raided: ['The Committee Is Arrested', 'FBI agents come for the Committee at dawn. The Sons of Jacob are a footnote: a cult that almost happened. The United States endures — for now.'],
  dcfell: ['Washington Falls', 'The flag of the United States flies over the Capitol again. The High Council is dead or in chains. Gilead is over.'],
  collapse: ['The Republic Collapses', 'Order dissolves. Marthas open the doors; Guardians desert; Mayday is everywhere. Gilead dies not with a battle, but with a thousand quiet refusals.'],
};
function showEnd() {
  const G = app.G; const [t, d] = ENDINGS[G.outcome] || ['The End', ''];
  playTheme(G.outcome === 'victory' ? 'bethlehem' : 'title');
  modal(`<div class="num">${fmtDate(G.day)}</div><h1>${t}</h1><p>${d}</p><div class="kv" style="max-width:420px;margin:0 auto 14px;text-align:left"><span>States held</span><b>${Object.values(G.st).filter(s => s.hold >= 99.5 && !s.exile).length}</b><span>Population</span><b>${fmtNum(gileadPop(G))}</b><span>Live births</span><b>${fmtNum(G.pop.births)}</b><span>Goals achieved</span><b>${Object.keys(G.goals).length}</b><span>Commanders lost</span><b>${G.stats.commandersLost}</b></div><div class="mc" style="align-items:center">${G.outcome === 'victory' ? '<button class="btn" data-act="sandbox">Keep ruling (sandbox)</button>' : ''}<button class="btn primary" data-act="totitle">Return to title</button></div>`, 'phasemodal endmodal');
}
function howto() {
  modal(`<div class="mh"><div class="loc">Field manual</div><h2>How to play</h2></div><div class="mb" style="font-family:var(--sans);font-size:14px">
  <p><b>Time.</b> Pause ❚❚ or run at 1×, 2× or 4× (one day per 1.5s / 0.75s / 0.375s). Urgent dispatches pause the game automatically.</p>
  <p><b>Era 1 — The Sons of Jacob (2012).</b> Tap states to found and grow chapters and to infiltrate military bases. Open <b>🕯 The Plot</b> to fundraise, publish Serena Joy's book, cover your tracks and prepare the Three Strikes. Seat founders in <b>🎖 Commanders</b>. Keep FBI suspicion below 100%.</p>
  <p><b>The coup.</b> When the Committee's key goals are met, execute the Three Strikes. States fall to you according to your chapters and infiltration — the rest are contested or held by the old government.</p>
  <p><b>The Republic.</b> Enact <b>📜 Decrees</b> in the order the show depicts — frozen accounts, the work ban, property to male kin — to unlock institutions. Tap a held <b>city</b> to build: the Rachel and Leah Center, Martha Houses, Aunts' Halls, Barracks, Bureaus of the Eyes, Detention Centres, Colonies, Wife Schools, Walls and more. Converted buildings are cheap; purpose-built ones unlock later.</p>
  <p><b>People.</b> Everyone in held territory must be processed into a class. <b>👥 People</b> shows each class and who is in training right now.</p>
  <p><b>War.</b> Tap a contested state to launch offensives (supplied by a nearby Rail Depot), call air and drone strikes from Airfields, and send helicopter patrols.</p>
  <p><b>Councils.</b> Fill the High Council with named Commanders and give them portfolios; appoint lower Commanders to the district councils.</p>
  <p><b>Goals.</b> Each era has ★ key goals. Achieve them all to advance, unlocking new decrees, buildings and abilities. Six eras end in The Reckoning: survive the wedding, hold Boston for a year and rule from sea to sea.</p>
  <p class="muted">Tip: on iPad, tap Share → "Add to Home Screen" to play full-screen. If you hear nothing, check the silent switch / volume.</p></div><div class="mc"><button class="btn primary" data-act="closemodal">Understood</button></div>`);
}
function about() {
  modal(`<div class="mh"><div class="loc">v${VERSION} · "${VERSION_NAME}"</div><h2>About</h2></div><div class="mb" style="font-family:var(--sans);font-size:14px">
  <p>A fan-made grand strategy game set in the world of Hulu's <i>The Handmaid's Tale</i> (2017–2025) and <i>The Testaments</i> (2026), based on the novels by Margaret Atwood. Events, names, places and the class system follow the show as closely as gameplay allows; where the show is silent (district names, exact numbers) the game fills in.</p>
  <p>You play the architects of a theocratic dictatorship. The game depicts coercion, surveillance and violence against women in order to show how such regimes are built and how they fail — it does not endorse them.</p>
  <p>All music is generated live in your browser. Map data: U.S. Census / Natural Earth via us-atlas and world-atlas.</p>
  <p class="muted">Not affiliated with or endorsed by Hulu, MGM Television or Margaret Atwood.</p></div><div class="mc"><button class="btn primary" data-act="closemodal">Close</button></div>`);
}
function newGameMenu() {
  modal(`<div class="mh"><div class="loc">New game</div><h2>Choose your faith</h2></div><div class="mb" style="font-family:var(--sans);font-size:14px"><p>How hard will the world fight back?</p></div><div class="mc">
    <button class="choice" data-act="newgame" data-arg="easy"><span class="ct">Merciful<small>The old government is weak; mistakes are forgiven.</small></span></button>
    <button class="choice" data-act="newgame" data-arg="normal"><span class="ct">Faithful<small>The intended experience.</small></span></button>
    <button class="choice" data-act="newgame" data-arg="hard"><span class="ct">Zealous<small>The United States fights for every mile.</small></span></button>
    <button class="btn sm" data-act="closemodal" style="align-self:flex-end">Back</button></div>`);
}

// ---------------- Settings ----------------
function settingsScreen(G) {
  const a = audioSettings();
  const slots = ['1', '2', '3'].map(s => { const m = saveMeta(s); return `<div class="row"><span><b>Slot ${s}</b> <span class="muted">${m ? `${fmtDate(m.day, true)} · ${PHASES[m.phase].name}` : 'Empty'}</span></span><span class="btnrow" style="margin:0"><button class="btn sm" data-act="save" data-arg="${s}">Save</button><button class="btn sm ${m ? '' : 'dis'}" data-act="load" data-arg="${s}">Load</button></span></div>`; }).join('');
  return `<div class="dhead"><div style="flex:1"><h2>Settings</h2><div class="sub">v${VERSION} "${VERSION_NAME}"</div></div><button class="close" data-act="close">✕</button></div>
  <div class="sbody settings" style="max-width:680px">
    <h3>Sound</h3>
    <div class="row"><span>Music</span><input type="range" min="0" max="1" step="0.05" value="${a.music}" data-input="music"></div>
    <div class="row"><span>Sound effects</span><input type="range" min="0" max="1" step="0.05" value="${a.sfx}" data-input="sfx"></div>
    <div class="row"><span>Mute everything</span><button class="btn sm" data-act="mute">${a.muted ? 'Unmute' : 'Mute'}</button></div>
    <div class="row"><span>Now playing</span><span class="muted">♪ ${THEME_NAMES[currentTheme()] || '—'}</span></div>
    <h3>Saves</h3><div class="row"><span><b>Autosave</b> <span class="muted">every month and when you leave</span></span><button class="btn sm" data-act="save" data-arg="auto">Save now</button></div>${slots}
    <h3>Game</h3>
    <div class="row"><span>How to play</span><button class="btn sm" data-act="howto">Open</button></div>
    <div class="row"><span>Quit to title</span><button class="btn sm" data-act="totitle">Quit</button></div>
    <div class="row"><span>About</span><button class="btn sm" data-act="about">Open</button></div>
  </div>`;
}
document.addEventListener('input', e => {
  const k = e.target.dataset?.input; if (!k) return;
  setAudio(k, +e.target.value);
});

// ---------------- Actions ----------------
function onClick(e) {
  const t = e.target.closest('[data-act]');
  unlockAudio();
  if (!t) return;
  const act = t.dataset.act, arg = t.dataset.arg || '';
  const G = app.G;
  const after = () => { refreshPanels(true); renderHud(); app.map?.render(G); };
  switch (act) {
    case 'continue': { const g = loadGame('auto'); if (g) startGame(g); break; }
    case 'newgame-menu': newGameMenu(); break;
    case 'newgame': closeModal(); deleteSave('auto'); startGame(newGame(undefined, arg)); break;
    case 'howto': howto(); break;
    case 'about': about(); break;
    case 'closemodal': closeModal(); break;
    case 'goals-from-modal': closeModal(); setTab('goals'); break;
    case 'sandbox': G.outcome = null; G._endShown = false; G.sandbox = true; closeModal(); break;
    case 'totitle': if (G) saveGame(G, 'auto'); closeModal(); app.G = null; $('#app').classList.add('hidden'); $('#title').classList.remove('gone'); $('#title').innerHTML = titleHTML(); playTheme('title'); break;
    case 'speed': { const s = +arg; if (s === 0) G.paused = true; else { G.paused = false; G.speed = s; } sfx('click'); renderHud(); break; }
    case 'tab': setTab(arg); break;
    case 'close': if (t.closest('#drawer')) closeDrawer(); else setTab('map'); break;
    case 'state': openDrawer('state', arg); break;
    case 'city': openDrawer('city', arg); break;
    case 'event': openEvent(+arg); break;
    case 'choose': { const [u, i] = arg.split('|').map(Number); choose(u, i); break; }
    case 'mapmode': app.map.setMode(arg); renderMapUi(); app.map.render(G); break;
    case 'zoom': if (arg === 'reset') app.map.reset(); else app.map.zoom(arg === 'in' ? 1.4 : 1 / 1.4); break;
    case 'chapter': result(A.growChapter(G, arg)); sfx('click'); after(); break;
    case 'infil': result(A.infiltrate(G, arg)); after(); break;
    case 'plot': result(A.plotAction(G, arg)); after(); break;
    case 'fundplot': result(A.fundPlot(G, arg)); after(); break;
    case 'coup': {
      const r = A.launchCoup(G);
      if (r.ok) { setTab('map'); showPhase(1); } else result(r);
      after(); break;
    }
    case 'seat': result(A.seatCommander(G, arg)); after(); break;
    case 'unseat': result(A.unseatCommander(G, arg)); after(); break;
    case 'portfolio': { const [id, pf] = arg.split('|'); result(A.setPortfolio(G, id, G.cmd[id].portfolio === pf ? null : pf)); after(); break; }
    case 'district': result(A.appointDistrict(G, arg)); after(); break;
    case 'decree': { const r = A.enact(G, arg); result(r); if (r.ok) sfx('decree'); after(); break; }
    case 'build': { const [ty, c, tier] = arg.split('|'); const r = A.build(G, ty, c, +tier); result(r); if (r.ok) sfx('build'); after(); break; }
    case 'demolish': if (confirm('Close this institution? Trainees return to their pools.')) { result(A.demolish(G, +arg)); after(); } break;
    case 'offensive': { const [ab, f] = arg.split('|'); result(A.launchOffensive(G, ab, A.availableTroops(G) * +f)); after(); break; }
    case 'cancelop': result(A.cancelOffensive(G, +arg)); after(); break;
    case 'strike': { const [ab, k] = arg.split('|'); result(A.strike(G, ab, k)); after(); break; }
    case 'heli': result(A.toggleHeli(G, arg)); after(); break;
    case 'save': result(saveGame(G, arg) ? { ok: true, msg: 'Saved' } : { ok: false, msg: 'Could not save (storage unavailable)' }); after(); break;
    case 'load': { const g = loadGame(arg); if (g) { startGame(g); toast('Loaded'); } break; }
    case 'mute': setAudio('muted', !audioSettings().muted); after(); break;
  }
}

boot();
