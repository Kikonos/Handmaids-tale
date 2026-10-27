// Generative soundtrack and sound effects (Web Audio API, no samples).
// One theme per phase, cross-faded:
//   title       "Blessed Be the Fruit"    — slow choir and bells
//   conspiracy  "The Committee"           — ticking clock, pulsing bass, sparse piano
//   republic    "Under the Laws of God"   — hymn organ, choir, funeral bell
//   eye         "Under His Eye"           — heartbeat, music box in Phrygian, drone
//   war         "The Chicago Front"       — snare march, timpani, low brass ostinato
//   bethlehem   "No Hangings"             — uneasy major hymn, bells, soft choir
//   reckoning   "Mayday"                  — driving strings ostinato, drums, brass stabs

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let ac = null, master, musicBus, sfxBus, reverb, reverbIn;
let settings = { music: 0.55, sfx: 0.7, muted: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem('gilead-audio') || '{}')); } catch { }
const persist = () => { try { localStorage.setItem('gilead-audio', JSON.stringify(settings)); } catch { } };

export function audioSettings() { return { ...settings }; }
export function setAudio(k, v) {
  settings[k] = v; persist();
  if (!ac) return;
  musicBus.gain.setTargetAtTime(settings.muted ? 0 : settings.music, ac.currentTime, 0.1);
  sfxBus.gain.setTargetAtTime(settings.muted ? 0 : settings.sfx, ac.currentTime, 0.05);
}

export function unlockAudio() {
  if (ac) { if (ac.state !== 'running') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = 1.7;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ac.destination);
  musicBus = ac.createGain(); musicBus.gain.value = settings.muted ? 0 : settings.music; musicBus.connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = settings.muted ? 0 : settings.sfx; sfxBus.connect(master);
  reverb = ac.createConvolver(); reverb.buffer = impulse(3.2, 2.6);
  reverbIn = ac.createGain(); reverbIn.gain.value = 0.5;
  const rvOut = ac.createGain(); rvOut.gain.value = 0.55;
  reverbIn.connect(reverb); reverb.connect(rvOut); rvOut.connect(musicBus);
  // a silent buffer kick-starts iOS
  const b = ac.createBuffer(1, 1, 22050); const s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
  setInterval(scheduler, 25);
}

function impulse(sec, decay) {
  const len = ac.sampleRate * sec, buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return buf;
}
let noiseBuf = null;
function noise() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

// ---------------- Instruments ----------------
function out(bus, wet = 0.3) {
  const g = ac.createGain();
  g.connect(bus);
  if (wet > 0) { const w = ac.createGain(); w.gain.value = wet; g.connect(w); w.connect(reverbIn); }
  return g;
}
function env(g, t, a, peak, d, sus, r, len) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * sus, t + a, d);
  g.gain.setTargetAtTime(0.0001, t + len, r);
}
function osc(type, f, t, stop, dest, detune = 0) {
  const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(stop); return o;
}
const I = {
  pad(t, notes, len, vol = 0.05, cutoff = 900, type = 'sawtooth', bus) {
    const o = out(bus, 0.6); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.7; f.connect(o);
    const g = ac.createGain(); g.connect(f); env(g, t, len * 0.3, vol, 1, 0.9, len * 0.25, len * 0.8);
    for (const n of notes) { osc(type, mtof(n), t, t + len * 1.6, g, -8); osc(type, mtof(n), t, t + len * 1.6, g, 8); }
  },
  choir(t, notes, len, vol = 0.045, bus) {
    const o = out(bus, 0.75);
    const forms = [[700, 8], [1150, 10], [2800, 14]];
    const g = ac.createGain(); env(g, t, len * 0.35, vol, 1, 0.9, len * 0.3, len * 0.85);
    for (const [fr, q] of forms) { const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; g.connect(bp); bp.connect(o); }
    for (const n of notes) for (const d of [-12, 0, 11]) { const ov = osc('sawtooth', mtof(n), t, t + len * 1.8, g, d); const l = ac.createOscillator(); l.frequency.value = 5 + Math.random(); const lg = ac.createGain(); lg.gain.value = 6; l.connect(lg); lg.connect(ov.detune); l.start(t); l.stop(t + len * 1.8); }
  },
  organ(t, notes, len, vol = 0.04, bus) {
    const o = out(bus, 0.55); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; f.connect(o);
    const g = ac.createGain(); g.connect(f); env(g, t, 0.06, vol, 1, 1, 0.25, len);
    for (const n of notes) { osc('square', mtof(n), t, t + len + 1.5, g); osc('sine', mtof(n + 12), t, t + len + 1.5, g); osc('triangle', mtof(n - 12), t, t + len + 1.5, g); }
  },
  bell(t, n, vol = 0.07, bus, len = 3) {
    const o = out(bus, 0.6);
    for (const [r, a] of [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]]) {
      const g = ac.createGain(); g.connect(o); g.gain.setValueAtTime(vol * a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len / r * 1.4);
      osc('sine', mtof(n) * r, t, t + len, g);
    }
  },
  piano(t, n, vol = 0.06, bus) {
    const o = out(bus, 0.4); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(500, t + 1.5); f.connect(o);
    const g = ac.createGain(); g.connect(f); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    osc('triangle', mtof(n), t, t + 2.5, g); osc('sine', mtof(n + 12), t, t + 2.5, g, 3);
  },
  bass(t, n, len = 0.3, vol = 0.09, bus, cut = 260) {
    const o = out(bus, 0.05); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cut * 2.5, t); f.frequency.exponentialRampToValueAtTime(cut, t + 0.12); f.connect(o);
    const g = ac.createGain(); g.connect(f); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.setTargetAtTime(0.0001, t + len, 0.06);
    osc('sawtooth', mtof(n), t, t + len + 0.5, g); osc('square', mtof(n - 12), t, t + len + 0.5, g);
  },
  brass(t, notes, len, vol = 0.05, bus) {
    const o = out(bus, 0.35); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1400, t + 0.12); f.frequency.setTargetAtTime(700, t + 0.15, 0.3); f.connect(o);
    const g = ac.createGain(); g.connect(f); env(g, t, 0.05, vol, 0.4, 0.8, 0.12, len);
    for (const n of notes) { osc('sawtooth', mtof(n), t, t + len + 1, g, -5); osc('sawtooth', mtof(n), t, t + len + 1, g, 6); }
  },
  strings(t, notes, len, vol = 0.03, bus, attack = 0.08) {
    const o = out(bus, 0.5); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; f.connect(o);
    const g = ac.createGain(); g.connect(f); env(g, t, attack, vol, 0.5, 0.85, 0.1, len);
    for (const n of notes) for (const d of [-9, 0, 9]) osc('sawtooth', mtof(n), t, t + len + 1, g, d);
  },
  kick(t, vol = 0.5, bus) {
    const g = ac.createGain(); g.connect(out(bus, 0.05)); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    const o = ac.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.3); o.connect(g); o.start(t); o.stop(t + 0.5);
  },
  timpani(t, n = 38, vol = 0.35, bus) {
    const g = ac.createGain(); g.connect(out(bus, 0.4)); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    const o = ac.createOscillator(); o.frequency.setValueAtTime(mtof(n) * 1.1, t); o.frequency.exponentialRampToValueAtTime(mtof(n), t + 0.1); o.connect(g); o.start(t); o.stop(t + 1.7);
    I.noiseHit(t, 0.12, 0.08, 'lowpass', 400, bus);
  },
  snare(t, vol = 0.12, bus) { I.noiseHit(t, vol, 0.12, 'highpass', 1800, bus); const g = ac.createGain(); g.connect(out(bus, 0.1)); g.gain.setValueAtTime(vol * 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08); osc('triangle', 190, t, t + 0.1, g); },
  tick(t, vol = 0.05, bus) { I.noiseHit(t, vol, 0.02, 'highpass', 6500, bus); },
  noiseHit(t, vol, len, type, freq, bus, wet = 0.15) {
    const s = ac.createBufferSource(); s.buffer = noise(); const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(out(bus, wet)); s.start(t, Math.random()); s.stop(t + len + 0.05);
  },
  swell(t, len, vol = 0.05, bus) {
    const s = ac.createBufferSource(); s.buffer = noise(); s.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(3000, t + len);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.1);
    s.connect(f); f.connect(g); g.connect(out(bus, 0.6)); s.start(t); s.stop(t + len + 0.2);
  },
};

// ---------------- Themes (step = 16th note) ----------------
// D minor home. Chords as MIDI arrays.
const Dm = [50, 53, 57], Bb = [46, 50, 53], Gm = [43, 46, 50], A = [45, 49, 52], F = [41, 45, 48], C = [48, 52, 55], Eb = [51, 55, 58];
const DM = [50, 54, 57], G = [43, 47, 50], Bm = [47, 50, 54], Am = [45, 48, 52];
const up = (c, k) => c.map(n => n + k);

const THEMES = {
  title: { bpm: 56, bars: 4, step(s, t, bus, r) {
    const bar = Math.floor(s / 16) % 4, b = s % 16, prog = [Dm, Bb, Gm, A];
    if (b === 0) { I.choir(t, up(prog[bar], 12), 4.2, 0.03, bus); I.pad(t, up(prog[bar], -12), 4.2, 0.035, 500, 'triangle', bus); }
    if (b === 0 && bar % 2 === 0) I.bell(t, 74, 0.05, bus, 5);
    if (b === 8 && r() < 0.6) I.bell(t, [69, 72, 77, 76][bar], 0.03, bus, 4);
  } },
  conspiracy: { bpm: 84, step(s, t, bus, r) {
    const bar = Math.floor(s / 16) % 8, b = s % 16, prog = [Dm, Dm, Bb, Bb, Gm, Gm, A, A];
    if (b % 4 === 0) I.tick(t, b === 0 ? 0.07 : 0.04, bus);
    if (b % 2 === 0) I.bass(t, prog[bar][0] - 12 + (b === 6 || b === 14 ? 12 : 0), 0.18, 0.07, bus, 220);
    if (b === 0 && bar % 2 === 0) I.pad(t, up(prog[bar], 0), 5.5, 0.03, 700, 'sawtooth', bus);
    if ((b === 4 || b === 10) && r() < 0.5) I.piano(t, prog[bar][Math.floor(r() * 3)] + 24, 0.045, bus);
    if (b === 0 && bar === 6) I.swell(t, 2.6, 0.03, bus);
  } },
  republic: { bpm: 64, step(s, t, bus, r) {
    const bar = Math.floor(s / 16) % 8, b = s % 16, prog = [Dm, F, C, Dm, Bb, F, Gm, A];
    if (b === 0) { I.organ(t, up(prog[bar], 12), 3.5, 0.022, bus); I.bass(t, prog[bar][0] - 12, 3.2, 0.05, bus, 180); }
    if (b === 8) I.organ(t, up(prog[bar], 12).map((n, i) => i === 2 ? n + 2 : n), 1.6, 0.015, bus);
    if (b === 0 && bar % 4 === 0) { I.choir(t, up(prog[bar], 12), 7, 0.028, bus); I.bell(t, 38, 0.14, bus, 7); }
    if (b === 12 && r() < 0.3) I.bell(t, 62, 0.04, bus, 4);
  } },
  eye: { bpm: 70, step(s, t, bus, r) {
    const bar = Math.floor(s / 16) % 8, b = s % 16;
    if (b === 0 || b === 3) I.kick(t, b ? 0.25 : 0.4, bus);
    if (b === 0 && bar % 4 === 0) { I.pad(t, [38, 45, 50], 13, 0.04, 400, 'sawtooth', bus); I.pad(t, [51], 13, 0.015, 900, 'sine', bus); }
    const mel = [74, 75, 77, 74, 72, 70, 69, 70]; // D Phrygian music box
    if (b % 4 === 0 && r() < 0.75) I.bell(t, mel[(bar * 2 + b / 4) % 8] + (r() < 0.2 ? 12 : 0), 0.03, bus, 2.5);
    if (b === 8 && bar === 7) I.swell(t, 1.8, 0.04, bus);
    if (b % 8 === 4) I.tick(t, 0.02, bus);
  } },
  war: { bpm: 96, step(s, t, bus, r) {
    const bar = Math.floor(s / 16) % 8, b = s % 16;
    const snare = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0];
    if (snare[b]) I.snare(t, b % 4 === 0 ? 0.14 : 0.08, bus);
    if (b === 0) I.timpani(t, 38, 0.32, bus);
    if (b === 8 && bar % 2) I.timpani(t, 45, 0.22, bus);
    const ost = [50, 50, 53, 50, 48, 48, 46, 45];
    if (b === 0 || b === 6 || b === 10) I.brass(t, [ost[bar] - 12, ost[bar]], 0.4, 0.04, bus);
    if (b === 0 && bar % 4 === 0) I.strings(t, [62, 65, 69], 9, 0.016, bus, 2);
    if (b % 2 === 0) I.bass(t, ost[bar] - 24, 0.12, 0.05, bus, 160);
  } },
  bethlehem: { bpm: 68, step(s, t, bus, r) {
    const bar = Math.floor(s / 16) % 8, b = s % 16, prog = [DM, G, Bm, A, G, DM, Eb, A];
    if (b === 0) { I.organ(t, up(prog[bar], 12), 3.4, 0.018, bus); I.choir(t, up(prog[bar], 12), 3.6, 0.02, bus); }
    if (b % 4 === 0 && r() < 0.55) I.bell(t, prog[bar][Math.floor(r() * 3)] + 24, 0.025, bus, 3);
    if (b === 0) I.bass(t, prog[bar][0] - 12, 3, 0.04, bus, 200);
  } },
  reckoning: { bpm: 112, step(s, t, bus, r) {
    const bar = Math.floor(s / 16) % 8, b = s % 16;
    const root = [50, 50, 51, 50, 48, 48, 46, 49][bar];
    I.strings(t, [root + 12 + (b % 2 ? 1 : 0)], 0.1, 0.012, bus, 0.005);
    if (b % 4 === 0) I.kick(t, 0.38, bus);
    if (b === 4 || b === 12) I.snare(t, 0.1, bus);
    if (b === 0 && bar % 2 === 0) I.brass(t, [root - 12, root - 5, root], 0.6, 0.045, bus);
    if (b === 0 && bar === 0) I.pad(t, [38, 45, 51], 12, 0.03, 600, 'sawtooth', bus);
    if (b % 2 === 0) I.bass(t, root - 24, 0.1, 0.05, bus, 200);
    if (b === 8 && bar === 7) I.swell(t, 1.2, 0.04, bus);
  } },
};
export const THEME_NAMES = { title: 'Blessed Be the Fruit', conspiracy: 'The Committee', republic: 'Under the Laws of God', eye: 'Under His Eye', war: 'The Chicago Front', bethlehem: 'No Hangings', reckoning: 'Mayday' };

let current = null; // { name, bus, step, next }
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
export function playTheme(name) {
  if (!ac || (current && current.name === name)) return;
  const th = THEMES[name]; if (!th) return;
  if (current) { const old = current.bus; old.gain.setTargetAtTime(0.0001, ac.currentTime, 0.8); setTimeout(() => old.disconnect(), 5000); }
  const bus = ac.createGain(); bus.gain.setValueAtTime(0.0001, ac.currentTime); bus.gain.setTargetAtTime(1, ac.currentTime + 0.3, 1.2); bus.connect(musicBus);
  current = { name, bus, th, s: 0, next: ac.currentTime + 0.4 };
}
export function currentTheme() { return current?.name; }
function scheduler() {
  if (!ac || !current || ac.state !== 'running') return;
  const spb = 60 / current.th.bpm / 4;
  while (current.next < ac.currentTime + 0.15) {
    try { current.th.step(current.s, current.next, current.bus, rnd); } catch (e) { console.warn(e); }
    current.s++; current.next += spb;
  }
}

// ---------------- SFX ----------------
export function sfx(name) {
  if (!ac || ac.state !== 'running') return;
  const t = ac.currentTime + 0.01, b = sfxBus;
  switch (name) {
    case 'click': I.tick(t, 0.12, b); break;
    case 'open': I.noiseHit(t, 0.05, 0.12, 'bandpass', 1200, b); break;
    case 'goal': I.bell(t, 79, 0.12, b, 2); I.bell(t + 0.15, 86, 0.1, b, 2.5); break;
    case 'urgent': for (let i = 0; i < 3; i++) { const g = ac.createGain(); g.connect(out(b, 0.2)); g.gain.setValueAtTime(0.08, t + i * 0.28); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.28 + 0.22); osc('square', 880, t + i * 0.28, t + i * 0.28 + 0.25, g); osc('square', 698, t + i * 0.28, t + i * 0.28 + 0.25, g); } break;
    case 'event': I.bell(t, 69, 0.08, b, 1.6); break;
    case 'airstrike': { const g = ac.createGain(); g.connect(out(b, 0.3)); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7); const s = ac.createBufferSource(); s.buffer = noise(); s.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1600, t + 1.5); s.connect(f); f.connect(g); s.start(t); s.stop(t + 1.8); for (let i = 0; i < 5; i++) boom(t + 1.6 + i * 0.13, 0.5); } break;
    case 'drone': { const g = ac.createGain(); g.connect(out(b, 0.2)); g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3); const o = osc('sawtooth', 600, t, t + 1.4, g); o.frequency.linearRampToValueAtTime(900, t + 1.3); boom(t + 1.35, 0.35); } break;
    case 'coup': boom(t, 1); boom(t + 0.5, 0.8); boom(t + 1, 1); break;
    case 'build': I.noiseHit(t, 0.1, 0.06, 'bandpass', 2500, b); I.noiseHit(t + 0.18, 0.1, 0.06, 'bandpass', 2200, b); break;
    case 'decree': I.kick(t, 0.5, b); I.bell(t + 0.05, 50, 0.12, b, 3); break;
    case 'annex': I.brass(t, [50, 57, 62], 0.9, 0.06, b); break;
    case 'lost': I.brass(t, [50, 53, 56], 1.2, 0.05, b); break;
    case 'birth': I.bell(t, 81, 0.06, b, 2); I.bell(t + 0.2, 88, 0.05, b, 2); break;
    case 'error': { const g = ac.createGain(); g.connect(out(b, 0)); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); osc('square', 110, t, t + 0.22, g); } break;
    case 'phase': I.bell(t, 38, 0.2, b, 6); I.choir(t, [62, 65, 69], 3, 0.04, b); break;
  }
}
function boom(t, size) {
  I.noiseHit(t, 0.35 * size, 1.2 * size, 'lowpass', 300, sfxBus, 0.4);
  const g = ac.createGain(); g.connect(out(sfxBus, 0.3)); g.gain.setValueAtTime(0.5 * size, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  const o = ac.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.6); o.connect(g); o.start(t); o.stop(t + 0.9);
}

// Debug: current output level (RMS, 0..1) — used by the automated audio check.
let an = null;
export function _level() {
  if (!ac) return -1;
  if (!an) { an = ac.createAnalyser(); an.fftSize = 2048; master.connect(an); }
  const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d);
  let s = 0, pk = 0; for (const v of d) { s += v * v; pk = Math.max(pk, Math.abs(v)); }
  return { rms: Math.sqrt(s / d.length), peak: pk };
}
