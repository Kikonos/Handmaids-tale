// Gilead: Under His Eye — application controller.
import { newGame, fmtDate, fmtNum, gileadPop, infiltration, seated, inTraining, VERSION, VERSION_NAME, M, STATES } from './engine/core.js';
import { tick } from './engine/sim.js';
import * as A from './engine/actions.js';
import { resolveEvent, choiceAvailable } from './engine/events.js';
import { EVENT_BY_ID } from './data/events.js';
import { PHASES } from './data/phases.js';
import { DECREES } from './data/decrees.js';
import { CITY_POS } from './data/geo.js';
import { saveGame, loadGame, saveMeta, deleteSave } from './engine/save.js';
import { createMap } from './ui/map.js';
import * as P from './ui/panels.js';
import { mark, figure, handmaidProfile } from './ui/art.js';
import { icon, injectSprite } from './ui/icons.js';
import { patch, onTap } from './ui/dom.js';
import { fxChips, esc } from './ui/widgets.js';
import { unlockAudio, playTheme, sfx, audioSettings, setAudio, THEME_NAMES, currentTheme } from './audio/audio.js';

const $ = s => document.querySelector(s);
const SPEEDS = { 1: 1.5, 2: 0.75, 4: 0.375 }; // real seconds per game day
const THEME_OF = ['conspiracy', 'republic', 'eye', 'war', 'bethlehem', 'reckoning'];

const app = { censusOpen: (() => { try { return localStorage.getItem('gilead-census') !== '0'; } catch { return true; } })(), legend: false, G: null, map: null, tab: 'map', drawer: null, acc: 0, modal: null, lastHud: 0, lastPanel: 0, lastMap: 0, speed: 1, toastQ: [] };
window.__app = app; // debugging hook
app.A = A; app.tick = tick;

// ---------------- Boot ----------------
function boot() {
  injectSprite();
  $('#rotate').innerHTML = `<div><svg class="rot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M10.5 18h3"/></svg><p>Gilead is played in landscape.<br>Please rotate your iPad.</p></div>`;
  $('#drawer').classList.add('glass');
  showTitle();
  onTap(handleAction);
  for (const ev of ['pointerdown', 'touchend', 'click']) document.addEventListener(ev, ensureAudio, { passive: true });
  window.addEventListener('pagehide', () => app.G && saveGame(app.G, 'auto'));
  document.addEventListener('visibilitychange', () => { if (document.hidden && app.G) { saveGame(app.G, 'auto'); app.G.paused = true; } });
  document.addEventListener('gesturestart', e => e.preventDefault());
  requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Top-bar offset: iPadOS can lay its status bar / window controls (and a blur) over the top of a
// home-screen web app. The layout always reserves env(safe-area-inset-top); this adds a user nudge on top.
const TOP_OFFSETS = [0, 12, 24, 36, 48];
function topOffset() { try { const v = localStorage.getItem('gilead-top-extra'); if (v != null) return +v; } catch { } return isStandalone() ? 12 : 0; }
function isStandalone() { return navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches; }
function applyTopOffset(v = topOffset()) { document.documentElement.style.setProperty('--top-extra', v + 'px'); }
applyTopOffset();

function ensureAudio() {
  unlockAudio();
  if (!currentTheme()) playTheme(app.G ? THEME_OF[app.G.phase] : 'title');
}

function showTitle() {
  const meta = saveMeta('auto');
  const procession = Array.from({ length: 18 }, (_, i) => `<div style="position:absolute;bottom:${(i % 2) * 10}px;left:-8%;animation:walk 80s linear ${-i * 4.6}s infinite;opacity:${i % 2 ? 0.5 : 0.9}">${handmaidProfile(i % 2 ? 34 : 42, i % 2 ? 68 : 84)}</div>`).join('');
  $('#title').innerHTML = `<style>@keyframes walk{to{transform:translateX(120vw)}}</style>
  <div class="tbg"><div class="tglow"></div><div class="tgrid"></div></div>
  <div class="tproc">${procession}</div>
  <div class="tcontent">
    <img src="assets/brand/icon.svg" alt="" class="temblem">
    <div class="kicker">The Republic of Gilead</div>
    <h1>Under His <em>Eye</em></h1>
    <div class="tag2">A grand strategy game of the world of The Handmaid's Tale</div>
    <div class="menu">
      ${meta ? `<button class="btn primary" data-act="continue">${icon('play')}Continue · <span class="mono" style="font-weight:500;opacity:.85">${fmtDate(meta.day, true)}</span></button>` : ''}
      <button class="btn ${meta ? '' : 'primary'}" data-act="newgame-menu">${icon('plus')}New game</button>
      <div class="grid2" style="gap:10px"><button class="btn" data-act="howto">${icon('book-open')}How to play</button><button class="btn" data-act="about">${icon('info')}About</button></div>
    </div>
  </div>
  <div class="tfoot">v${VERSION} "${VERSION_NAME}" · A fan-made game inspired by Hulu's The Handmaid's Tale and Margaret Atwood's novels. Not affiliated with Hulu, MGM or Margaret Atwood.<br>It depicts an authoritarian regime in order to understand it, not to endorse it. Tap anywhere to enable sound.</div>`;
  $('#title').classList.remove('gone');
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
  app._navPhase = null;
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
      app.acc += dt / SPEEDS[G.speed || 1] * (app.turbo || 1);
      let n = 0;
      while (app.acc >= 1 && n < (app.turbo ? 40 : 6)) { app.acc--; n++; try { tick(G); } catch (e) { console.error(e); G.paused = true; toast('Simulation error: ' + e.message, 'bad'); } if (G.paused || G.outcome) { app.acc = 0; break; } }
      if (n) {
        if (G.day % 30 === 0) saveGame(G, 'auto');
        processNotes();
        app.dirty = true;
      }
    }
    app.map.frame(dt, G, running);
    if (now - app.lastMap > 350 && (app.dirty || now - app.lastMap > 1500)) { app.map.render(G); app.lastMap = now; }
    if ((app.dirty && now - app.lastHud > 200) || now - app.lastHud > 1000) { renderHud(); app.lastHud = now; }
    if (now - app.lastPanel > 700 && (app.dirty || now - app.lastPanel > 3000)) { refreshPanels(); app.lastPanel = now; app.dirty = false; }
  } else if (G && G.outcome && !app.modal && !G._endShown) { G._endShown = true; renderHud(); showEnd(); }
  requestAnimationFrame(loop);
}

const NOTE_IC = { event: ['mail', 'gold'], goal: ['target', 'good'], annex: ['shield-check', 'red'], lost: ['alert', 'bad'], build: ['columns', ''] };
function processNotes() {
  const G = app.G;
  const notes = (G.notes || []).splice(0);
  for (const n of notes) {
    if (n.kind === 'urgent') { sfx('urgent'); openEvent(n.uid); }
    else if (n.kind === 'event') { sfx('event'); toast(n.text, 'gold', () => openEvent(n.uid), 'mail'); }
    else if (n.kind === 'goal') { sfx('goal'); toast(`Goal achieved: ${n.text}`, 'good', null, 'target'); }
    else if (n.kind === 'phase') { showPhase(G.phase); }
    else if (n.kind === 'annex') { sfx('annex'); toast(n.text, 'red', null, 'shield-check'); }
    else if (n.kind === 'lost') { sfx('lost'); toast(n.text, 'bad', null, 'alert'); }
    else if (n.kind === 'build') { sfx('build'); toast(n.text, '', null, 'columns'); }
    else if (n.kind === 'end') { G.paused = true; }
  }
  if (G.pop.births > (app._births || 0) + 0.999) { if (app._births != null && G.phase > 0) sfx('birth'); app._births = Math.floor(G.pop.births); }
}

// ---------------- Rendering ----------------
function renderAll() { app.dirty = true; renderHud(); renderNav(); renderMapUi(); refreshPanels(true); app.map.render(app.G); }

function kpi(ic, color, val, label, opts = {}) {
  const d = opts.delta == null ? '' : `<em class="${opts.delta >= 0 ? 'good' : 'bad'}">${opts.delta >= 0 ? '+' : '−'}${Math.abs(opts.delta) >= 10 ? Math.round(Math.abs(opts.delta)) : Math.abs(opts.delta).toFixed(1)}</em>`;
  return `<div class="kpi ${opts.alert ? 'alert' : ''}" style="--c:${color}"><span class="ki">${icon(ic)}</span><span class="kv"><b>${val}${d}</b><small>${label}</small></span>${opts.bar != null ? `<span class="kb"><i style="width:${Math.max(0, Math.min(100, opts.bar)).toFixed(1)}%"></i></span>` : ''}</div>`;
}
function renderHud() {
  const G = app.G; if (!G) return;
  const r = G.res, P0 = PHASES[G.phase];
  let k;
  if (G.phase === 0) {
    const inf = infiltration(G);
    k = kpi('coins', '#d9b566', '$' + fmtNum(r.funds * 1e6), 'Funds') + kpi('megaphone', '#9e8cfc', fmtNum(r.influence), 'Influence') + kpi('user-plus', '#d9b566', fmtNum(r.members), 'Members') +
      kpi('shield', '#5b8def', inf.toFixed(0) + '%', 'Military', { bar: inf / 0.35 }) + kpi('scan', r.suspicion > 70 ? '#e5484d' : '#ffb224', Math.round(r.suspicion) + '%', 'FBI suspicion', { bar: r.suspicion, alert: r.suspicion > 75 });
  } else {
    const net = (G._income || 0) - (G._upkeep || 0);
    k = kpi('crown', '#d9b566', fmtNum(r.power), 'Power') + kpi('coins', '#d9b566', fmtNum(r.treasury * 1e6), 'Treasury', { delta: net, alert: r.treasury < 0 }) +
      kpi('wheat', '#8fa274', fmtNum(r.supplies), 'Supplies', { delta: G._supplyNet || 0, alert: r.supplies < 20 }) +
      kpi('pillar', '#3dd68c', Math.round(r.stability), 'Stability', { bar: r.stability, alert: r.stability < 20 }) + kpi('cross', '#d9b566', Math.round(r.piety), 'Piety', { bar: r.piety }) +
      kpi('eye', '#e5484d', Math.round(r.fear), 'Fear', { bar: r.fear }) + kpi('globe', '#5b8def', (r.standing > 0 ? '+' : '') + Math.round(r.standing), 'Standing', { bar: (r.standing + 100) / 2 }) +
      kpi('radio', '#ffb224', Math.round(r.resistance), 'Mayday', { bar: r.resistance, alert: r.resistance > 70 });
  }
  const sp = G.paused ? 0 : G.speed;
  patch($('#topbar'), `<div class="brand">${mark(36)}<div class="bt"><span class="era">${P0.name}</span><span class="date">${fmtDate(G.day)}</span></div></div>
    <div class="timectl"><button class="pause ${sp === 0 ? 'on' : ''}" data-act="speed" data-arg="0">${icon('pause')}</button>${[1, 2, 4].map(s => `<button class="${sp === s ? 'on' : ''}" data-act="speed" data-arg="${s}">${s}×</button>`).join('')}</div>
    <div class="kpis">${k}</div>`);
  renderTicker();
  if (G.phase > 0 && (G.day % 5 === 0 || !G._trainCache)) G._trainCache = inTraining(G);
  renderCensus();
  if (app._navPhase !== G.phase) { renderNav(); renderMapUi(); }
  else renderNav();
}
const NAV = [
  ['map', 'map', 'Map'], ['plot', 'candle', 'The Plot', G => G.phase === 0], ['war', 'swords', 'War', G => G.phase > 0], ['pop', 'users', 'People'],
  ['cmd', 'medal', 'Commanders'], ['council', 'columns', 'Councils'], ['decrees', 'scroll', 'Decrees', G => G.phase > 0], ['goals', 'target', 'Goals'],
  ['dispatch', 'inbox', 'Dispatches'], ['log', 'book', 'Chronicle'], ['settings', 'sliders', 'Settings'],
];
function renderNav() {
  const G = app.G;
  app._navPhase = G.phase;
  patch($('#nav'), NAV.filter(n => !n[3] || n[3](G)).map(([id, ic, l]) => {
    const nd = id === 'decrees' ? DECREES.filter(d => A.decreeState(G, d) === 'available' && G.res.power >= A.decreeCost(G, d)).length : 0;
    const badge = id === 'dispatch' && G.events.queue.length ? `<span class="badge">${G.events.queue.length}</span>` : nd ? `<span class="badge gold">${nd}</span>` : '';
    const on = app.tab === id || (id === 'dispatch' && app.drawer?.type === 'dispatch') || (id === 'map' && app.tab === 'map' && app.drawer?.type !== 'dispatch');
    return `<button class="navbtn ${on ? 'on' : ''}" data-act="tab" data-arg="${id}" data-key="${id}">${icon(ic)}${l}${badge}</button>`;
  }).join(''));
}
function renderTicker() {
  const G = app.G;
  const items = G.log.slice(0, 5).map(l => `<span class="ticker-item"><span class="d">${fmtDate(l.day, true)}</span>${esc(l.text)}</span>`).join('<span class="tsep"></span>');
  patch($('#ticker'), `<span class="ticker-item" style="flex:none;color:var(--muted)">${icon('music')}${THEME_NAMES[currentTheme()] || 'Silence'}</span><span class="tsep"></span><div class="ticker-scroll">${items}</div>`);
}
function renderMapUi() {
  const G = app.G, m = app.map.getMode();
  const modes = G.phase === 0 ? [['auto', 'candle', 'Chapters'], ['infil', 'shield', 'Military'], ['pop', 'users', 'Population']] : [['auto', 'map', 'Control'], ['resist', 'flag', 'Enemy'], ['pop', 'users', 'Population']];
  const sw = c => `<i style="background:${c}"></i>`;
  const legend = G.phase === 0
    ? `<div class="row">${sw('#1b1e24')}No chapter</div><div class="row">${sw('#8a6a1f')}Growing chapter</div><div class="row">${sw('#a3242b')}Strong chapter</div><div class="row">${sw('#1d3a6a')}Alaska &amp; Hawaii</div><div class="note">Tap a state to found chapters and infiltrate bases.</div>`
    : `<div class="row">${sw('#6a1a20')}Republic of Gilead</div><div class="row">${sw('repeating-linear-gradient(45deg,#5a2a20 0 3px,#ff6b40 3px 5px)')}Under conflict</div><div class="row">${sw('#1d2c45')}U.S. / rebel held</div><div class="row">${sw('#22457a')}Government in exile</div><div class="row"><i style="background:#d9b566;height:2px;border-radius:1px"></i>Railway with trains</div>`;
  patch($('#map-ui'), `<div class="modes glass">${modes.map(([k, ic, l]) => `<button class="${m === k ? 'on' : ''}" data-act="mapmode" data-arg="${k}">${icon(ic)}${l}</button>`).join('')}<span class="msep"></span><button class="${app.legend ? 'on' : ''}" data-act="legend">${icon('layers')}Legend</button></div>
    ${app.legend ? `<div class="legend glass">${legend}</div>` : ''}
    <div class="mapbtns glass"><button data-act="zoom" data-arg="in">${icon('plus')}</button><button data-act="zoom" data-arg="out">${icon('minus')}</button><button data-act="zoom" data-arg="reset">${icon('recenter')}</button></div>
    <div class="census glass" id="census"></div>
    <div class="vignette"></div>`);
  renderCensus();
}
function renderCensus() {
  const G = app.G, el = document.getElementById('census');
  if (!G || !el) return;
  const row = (lead, label, v, extra = '') => `<div class="crow">${lead}<span>${label}</span><b>${v}</b>${extra}</div>`;
  let h;
  if (G.phase === 0) {
    const cr = A.coupReady(G);
    h = `<button class="ctitle" data-act="census"><span>${icon(app.censusOpen ? 'chevron-down' : 'chevron-right')}Sons of Jacob</span><b>${fmtNum(G.res.members)}</b></button>` + (!app.censusOpen ? '' : row(icon('candle'), 'Chapters', Object.values(G.st).filter(s => s.chapter > 0).length + ' states') +
      row(icon('medal'), 'Committee', seated(G).length + '/12') + row(icon('shield'), 'Military', infiltration(G).toFixed(0) + '%') + row(icon('bolt'), 'Three Strikes', Math.round(cr.avg) + '%'));
  } else {
    const cl = G.pop.cls, tr = G._trainCache || {};
    const t = k => tr[k] ? `<i>+${fmtNum(tr[k])}</i>` : '';
    h = `<button class="ctitle" data-act="census"><span>${icon(app.censusOpen ? 'chevron-down' : 'chevron-right')}Census</span><b>${fmtNum(gileadPop(G))}</b></button>` + (!app.censusOpen ? '' : row(figure('handmaid', 20), 'Handmaids', fmtNum(cl.handmaids), t('handmaids')) + row(figure('wife', 20), 'Wives', fmtNum(cl.wives)) +
      row(figure('martha', 20), 'Marthas', fmtNum(cl.marthas), t('marthas')) + row(figure('aunt', 20), 'Aunts', fmtNum(cl.aunts), t('aunts')) + row(figure('guardian', 20), 'Guardians', fmtNum(cl.guardians), t('guardians')) +
      row(figure('eye', 20), 'Eyes', fmtNum(cl.eyes), t('eyes')) + row(figure('unwoman', 20), 'Unwomen', fmtNum(cl.unwomen)) + '<div class="sep"></div>' + row(icon('baby'), 'Births / yr', fmtNum(G.pop.birthsYear)) +
      row(icon('hourglass'), 'Unprocessed', fmtNum(G.pop.men + G.pop.women + G.pop.fertile + G.pop.children)));
  }
  patch(el, h);
}

const SCREENS = { plot: P.plotScreen, pop: P.popScreen, cmd: P.cmdScreen, council: P.councilScreen, decrees: P.decreeScreen, war: P.warScreen, goals: P.goalScreen, log: P.logScreen, settings: settingsScreen };
function refreshPanels(force = false) {
  const G = app.G; if (!G) return;
  const sc = $('#screen');
  if (app.tab !== 'map' && SCREENS[app.tab]) {
    if (sc.dataset.tab !== app.tab) { sc.innerHTML = ''; sc.dataset.tab = app.tab; }
    patch(sc, SCREENS[app.tab](G));
    sc.classList.remove('closed');
  } else { sc.classList.add('closed'); sc.dataset.tab = ''; }
  const dr = $('#drawer');
  if (app.drawer) {
    const d = app.drawer, key = d.type + ':' + (d.id || '');
    if (dr.dataset.key !== key) { dr.innerHTML = ''; dr.dataset.key = key; }
    patch(dr, d.type === 'state' ? P.stateDrawer(G, d.id) : d.type === 'city' ? P.cityDrawer(G, d.id) : P.dispatchDrawer(G));
  }
}

function openDrawer(type, id) {
  app.drawer = { type, id };
  app.map.select(type === 'dispatch' ? null : id);
  if (type !== 'dispatch') app.map.ensureVisible(id, 450);
  if (app.tab !== 'map') app.tab = 'map';
  $('#drawer').classList.remove('closed');
  refreshPanels(true); renderNav(); app.map.render(app.G);
}
function closeDrawer() { app.drawer = null; app.map.select(null); $('#drawer').classList.add('closed'); $('#drawer').dataset.key = ''; renderNav(); app.map.render(app.G); }
function setTab(t) {
  if (t === 'dispatch') { openDrawer('dispatch'); return; }
  app.tab = t;
  if (t !== 'map') closeDrawer();
  renderNav(); refreshPanels(true);
  sfx('open');
}

// ---------------- Toasts ----------------
function toast(text, cls = '', onTap, ic) {
  const t = document.createElement('div');
  t.className = 'toast ' + cls;
  t.innerHTML = `<span class="ti">${icon(ic || (cls === 'bad' ? 'alert' : cls === 'good' ? 'check' : 'info'))}</span><span></span>`;
  t.lastChild.textContent = text;
  if (onTap) { t.style.pointerEvents = 'auto'; t.addEventListener('pointerup', onTap); }
  $('#toasts').appendChild(t);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3600);
}
function result(r) { if (!r) return; if (r.ok) { if (r.msg) toast(r.msg, 'good'); } else { toast(r.msg, 'bad'); sfx('error'); } }

// ---------------- Modals ----------------
function modal(html, cls = '') {
  app.modal = true;
  $('#modal-root').innerHTML = `<div class="backdrop"><div class="modal ${cls}">${html}</div></div>`;
}
function closeModal() {
  app.modal = null; $('#modal-root').innerHTML = '';
  const G = app.G;
  if (G && G.day === 0 && !G._hinted) { G._hinted = true; setTimeout(() => toast('Tap a state to found your first chapter, then press 1× to let time run.', 'gold', null, 'candle'), 400); }
  if (G && G._wasRunning && !G.outcome && !G.events.queue.some(q => EVENT_BY_ID[q.id].urgent)) { G._wasRunning = false; G.paused = false; }
  if (app.G) renderAll();
}
const mhead = (ic, loc, title, urgent = false) => `<div class="mh"><div class="tile ${urgent ? 'urgent' : ''}">${icon(ic)}</div><div><div class="loc">${loc}</div><h2>${esc(title)}</h2></div></div>`;

function openEvent(uid) {
  const G = app.G;
  const q = G.events.queue.find(x => x.uid === uid);
  if (!q) return;
  const e = EVENT_BY_ID[q.id];
  const where = CITY_POS[q.loc]?.name || STATES[q.loc]?.name || '';
  const text = typeof e.text === 'function' ? e.text(G, q) : e.text;
  const choices = e.choices.map((c, i) => {
    const ok = choiceAvailable(G, e, c);
    return `<button class="choice ${ok ? '' : 'dis'}" data-act="choose" data-arg="${uid}|${i}"><span class="ct">${esc(c.t)}${c.note ? `<small>${esc(c.note)}</small>` : ''}</span><span class="fxs">${fxChips(c.fx, c.cost)}</span>${icon('chevron-right')}</button>`;
  }).join('');
  const loc = `${e.urgent ? `<span class="u">Urgent</span>·` : ''}${icon('pin')}${esc(where)}<span class="mono" style="letter-spacing:0;font-weight:500">· ${fmtDate(G.day, true)}</span>`;
  modal(`${mhead(e.icon, loc, e.title, e.urgent)}<div class="mb">${esc(text)}</div><div class="mc">${choices}${e.urgent ? '' : `<button class="btn sm" data-act="closemodal" style="align-self:flex-end;margin-top:4px">Decide later</button>`}</div>`);
}
function choose(uid, idx) {
  const G = app.G;
  const q = G.events.queue.find(x => x.uid === uid);
  const ic = q ? EVENT_BY_ID[q.id].icon : 'check';
  const r = resolveEvent(G, uid, idx);
  if (!r) return;
  sfx('decree');
  modal(`${mhead(ic, 'Outcome', r.title)}<div class="outcome">${esc(r.text || 'It is done. Under His Eye.')}</div><div class="foot"><button class="btn primary" data-act="closemodal">Continue ${icon('chevron-right')}</button></div>`);
  processNotes();
}
function eraTrack(ph) { return `<div class="eraTrack">${PHASES.map((_, i) => `<i class="${i === ph ? 'on' : i < ph ? 'past' : ''}"></i>`).join('')}</div>`; }
function showPhase(ph) {
  const P0 = PHASES[ph];
  sfx('phase');
  playTheme(THEME_OF[ph]);
  modal(`<div class="eraNo">ERA ${String(ph + 1).padStart(2, '0')} / 06 · ${fmtDate(app.G.day).toUpperCase()}</div><h1>${P0.name}</h1><div class="sub">${P0.sub}</div><p>${P0.intro}</p><div class="actions"><button class="btn sm" data-act="goals-from-modal">${icon('target')}View goals</button><button class="btn primary" style="min-width:220px" data-act="closemodal">${ph === 0 ? 'Begin the plot' : 'Continue'} ${icon('chevron-right')}</button></div>${eraTrack(ph)}`, 'eramodal');
  renderAll();
}
const ENDINGS = {
  victory: ['Gilead Ascendant', 'From the Atlantic to the Pacific, the Republic stands. The birth rate climbs. The world has stopped asking questions. Somewhere, a woman begins to record her story anyway: "My name is…"'],
  raided: ['The Committee Is Arrested', 'FBI agents come for the Committee at dawn. The Sons of Jacob are a footnote: a cult that almost happened. The United States endures, for now.'],
  dcfell: ['Washington Falls', 'The flag of the United States flies over the Capitol again. The High Council is dead or in chains. Gilead is over.'],
  collapse: ['The Republic Collapses', 'Order dissolves. Marthas open the doors; Guardians desert; Mayday is everywhere. Gilead dies not with a battle, but with a thousand quiet refusals.'],
};
function showEnd() {
  const G = app.G; const [t, d] = ENDINGS[G.outcome] || ['The End', ''];
  playTheme(G.outcome === 'victory' ? 'bethlehem' : 'title');
  const st = [['States held', Object.values(G.st).filter(s => s.hold >= 99.5 && !s.exile).length], ['Population', fmtNum(gileadPop(G))], ['Live births', fmtNum(G.pop.births)], ['Goals', Object.keys(G.goals).length], ['Commanders lost', G.stats.commandersLost]];
  modal(`<div class="eraNo">${G.outcome === 'victory' ? 'VICTORY' : 'DEFEAT'} · ${fmtDate(G.day).toUpperCase()}</div><h1>${t}</h1><p>${d}</p><div class="endstats">${st.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div><div class="actions">${G.outcome === 'victory' ? '<button class="btn" data-act="sandbox">Keep ruling</button>' : ''}<button class="btn primary" data-act="totitle">Return to title</button></div>`, 'eramodal');
}
function howto() {
  const sec = (ic, t, body) => `<div style="display:flex;gap:14px;margin:0 0 14px"><span style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--redbg);color:var(--red2);flex:none">${icon(ic)}</span><div><b style="color:var(--ink)">${t}</b><div style="font-size:14px">${body}</div></div></div>`;
  modal(`${mhead('book-open', 'Field manual', 'How to play')}<div class="mb">
  ${sec('clock', 'Time', 'Pause or run at 1×, 2× or 4× (a day every 1.5s / 0.75s / 0.375s). Urgent dispatches pause the game and it resumes when you have answered.')}
  ${sec('candle', 'Era 1: The Sons of Jacob', 'Tap states to found chapters and infiltrate bases. Open The Plot to fundraise, publish Serena Joy\'s book, cover your tracks and prepare the Three Strikes. Seat founders under Commanders. Keep FBI suspicion below 100%.')}
  ${sec('bolt', 'The coup', 'When the key goals are met, execute the Three Strikes. States fall to you according to your chapters and infiltration.')}
  ${sec('scroll', 'The Republic', 'Enact Decrees in the order the show depicts to unlock institutions. Tap a held city to build: Red Centres, Martha Houses, Aunts\' Halls, Barracks, Eyes, Detention, Colonies, Wife Schools, the Wall and more.')}
  ${sec('users', 'People', 'Everyone in held territory is processed into a class. People shows each class and who is in training right now.')}
  ${sec('swords', 'War', 'Tap a contested state to launch offensives (supplied by a Rail Depot), call air and drone strikes from Airfields, and send helicopter patrols.')}
  ${sec('target', 'Goals', 'Each era has key goals. Meet them all to advance and unlock new decrees, buildings and abilities.')}
  </div><div class="foot"><button class="btn primary" data-act="closemodal">Understood</button></div>`);
}
function about() {
  modal(`${mhead('info', `v${VERSION} · ${VERSION_NAME}`, 'About')}<div class="mb">
  <p>A fan-made grand strategy game set in the world of Hulu's <i>The Handmaid's Tale</i> (2017–2025) and <i>The Testaments</i> (2026), based on the novels by Margaret Atwood. Events, names, places and the class system follow the show as closely as gameplay allows; where the show is silent (district names, exact numbers) the game fills in.</p>
  <p>You play the architects of a theocratic dictatorship. The game depicts coercion, surveillance and violence against women in order to show how such regimes are built and how they fail. It does not endorse them.</p>
  <p>All music is generated live in your browser. All icons and illustrations were drawn for this game. Map data: U.S. Census / Natural Earth via us-atlas and world-atlas.</p>
  <p class="muted">Not affiliated with or endorsed by Hulu, MGM Television or Margaret Atwood.</p></div><div class="foot"><button class="btn primary" data-act="closemodal">Close</button></div>`);
}
function newGameMenu() {
  const opt = (k, ic, t, d) => `<button class="choice" data-act="newgame" data-arg="${k}"><span style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--redbg);color:var(--red2);flex:none">${icon(ic)}</span><span class="ct">${t}<small>${d}</small></span>${icon('chevron-right')}</button>`;
  modal(`${mhead('plus', 'New game', 'Choose your faith')}<div class="mc">
    ${opt('easy', 'heart', 'Merciful', 'The old government is weak; mistakes are forgiven.')}
    ${opt('normal', 'cross', 'Faithful', 'The intended experience.')}
    ${opt('hard', 'flame', 'Zealous', 'The United States fights for every mile.')}
    <button class="btn sm" data-act="closemodal" style="align-self:flex-end;margin-top:4px">Back</button></div>`);
}
function confirmModal(title, body, act, arg, label) {
  modal(`${mhead('alert', 'Confirm', title)}<div class="mb">${body}</div><div class="foot"><button class="btn" data-act="closemodal">Cancel</button><button class="btn primary" data-act="${act}" data-arg="${arg}">${label}</button></div>`);
}

// ---------------- Settings ----------------
function settingsScreen(G) {
  const a = audioSettings();
  const slots = ['1', '2', '3'].map(s => { const m = saveMeta(s); return `<div class="row"><span>Slot ${s}<small>${m ? `${fmtDate(m.day, true)} · ${PHASES[m.phase].name}` : 'Empty'}</small></span><span class="btnrow" style="margin:0"><button class="btn sm" data-act="save" data-arg="${s}">${icon('save')}Save</button><button class="btn sm ${m ? '' : 'dis'}" data-act="load" data-arg="${s}">Load</button></span></div>`; }).join('');
  return `${P.head('Settings', `v${VERSION} · ${VERSION_NAME}`, 'sliders', '#8d95a3')}
  <div class="sbody settings" style="max-width:720px">
    <h3>${icon('volume')}Sound</h3>
    <div class="row"><span>Music<small>A generated theme for every era</small></span><input type="range" min="0" max="1" step="0.05" value="${a.music}" data-input="music"></div>
    <div class="row"><span>Sound effects</span><input type="range" min="0" max="1" step="0.05" value="${a.sfx}" data-input="sfx"></div>
    <div class="row"><span>Mute everything</span><button class="btn sm ${a.muted ? 'on' : ''}" data-act="mute">${a.muted ? 'Muted' : 'Mute'}</button></div>
    <div class="row"><span>Now playing</span><span class="muted">${THEME_NAMES[currentTheme()] || 'Silence'}</span></div>
    <h3>${icon('layers')}Display</h3>
    <div class="row"><span>Top bar position<small>Move the top bar down if the iPad's status bar covers it</small></span><div class="seg" style="width:300px">${TOP_OFFSETS.map(v => `<button class="${topOffset() === v ? 'on' : ''}" data-act="topoffset" data-arg="${v}">${v ? '+' + v : 'Auto'}</button>`).join('')}</div></div>
    <h3>${icon('save')}Saves</h3><div class="row"><span>Autosave<small>Every month and when you leave</small></span><button class="btn sm" data-act="save" data-arg="auto">Save now</button></div>${slots}
    <h3>${icon('info')}Game</h3>
    <div class="row"><span>How to play</span><button class="btn sm" data-act="howto">Open</button></div>
    <div class="row"><span>About</span><button class="btn sm" data-act="about">Open</button></div>
    <div class="row"><span>Quit to title<small>Your game is saved first</small></span><button class="btn sm" data-act="totitle">${icon('exit')}Quit</button></div>
  </div>`;
}
document.addEventListener('input', e => {
  const k = e.target.dataset?.input; if (!k) return;
  setAudio(k, +e.target.value);
});

// ---------------- Actions ----------------
function handleAction(act, arg, el) {
  const G = app.G;
  const after = () => { app.dirty = true; refreshPanels(true); renderHud(); app.map?.render(G); };
  switch (act) {
    case 'continue': { const g = loadGame('auto'); if (g) startGame(g); break; }
    case 'newgame-menu': newGameMenu(); break;
    case 'newgame': closeModal(); deleteSave('auto'); startGame(newGame(undefined, arg)); break;
    case 'howto': howto(); break;
    case 'about': about(); break;
    case 'closemodal': closeModal(); break;
    case 'goals-from-modal': closeModal(); setTab('goals'); break;
    case 'sandbox': G.outcome = null; G._endShown = false; G.sandbox = true; closeModal(); break;
    case 'totitle': if (G) saveGame(G, 'auto'); app.modal = null; $('#modal-root').innerHTML = ''; app.G = null; $('#app').classList.add('hidden'); showTitle(); playTheme('title'); break;
    case 'speed': { const s = +arg; if (s === 0) G.paused = true; else { G.paused = false; G.speed = s; } sfx('click'); app.dirty = true; renderHud(); break; }
    case 'tab': setTab(arg); break;
    case 'close': if (el?.closest('#drawer')) closeDrawer(); else setTab('map'); break;
    case 'state': openDrawer('state', arg); break;
    case 'city': openDrawer('city', arg); break;
    case 'event': openEvent(+arg); break;
    case 'choose': { const [u, i] = arg.split('|').map(Number); choose(u, i); break; }
    case 'census': app.censusOpen = !app.censusOpen; try { localStorage.setItem('gilead-census', app.censusOpen ? '1' : '0'); } catch { } renderCensus(); break;
    case 'legend': app.legend = !app.legend; renderMapUi(); break;
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
    case 'demolish': { const b = G.bld.find(x => x.uid === +arg); if (b) confirmModal('Close this institution?', `<b>${esc(b.name)}</b> will be closed. Anyone in training returns to their pool.`, 'demolish-yes', arg, 'Close it'); break; }
    case 'demolish-yes': closeModal(); result(A.demolish(G, +arg)); after(); break;
    case 'offensive': { const [ab, f] = arg.split('|'); result(A.launchOffensive(G, ab, A.availableTroops(G) * +f)); after(); break; }
    case 'cancelop': result(A.cancelOffensive(G, +arg)); after(); break;
    case 'strike': { const [ab, k] = arg.split('|'); result(A.strike(G, ab, k)); after(); break; }
    case 'heli': result(A.toggleHeli(G, arg)); after(); break;
    case 'save': result(saveGame(G, arg) ? { ok: true, msg: 'Game saved' } : { ok: false, msg: 'Could not save (storage unavailable)' }); after(); break;
    case 'load': { const g = loadGame(arg); if (g) { startGame(g); toast('Game loaded', 'good'); } break; }
    case 'topoffset': try { localStorage.setItem('gilead-top-extra', arg); } catch { } applyTopOffset(+arg); after(); break;
    case 'mute': setAudio('muted', !audioSettings().muted); after(); break;
  }
}

boot();
