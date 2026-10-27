// Save / load. Transient fields (prefixed "_", fx, notes) are dropped.
import { VERSION } from './core.js';

const KEY = 'gilead-save-';
export function serialize(G) {
  return JSON.stringify(G, (k, v) => (k.startsWith('_') || k === 'fx' || k === 'notes' ? undefined : v));
}
export function deserialize(s) {
  const G = JSON.parse(s);
  G.fx = []; G.notes = [];
  G.paused = true;
  return G;
}
function store() { try { return globalThis.localStorage || null; } catch { return null; } }
export function saveGame(G, slot = 'auto') {
  const ls = store();
  if (!ls) return false;
  try {
    ls.setItem(KEY + slot, serialize(G));
    ls.setItem(KEY + slot + '-meta', JSON.stringify({ day: G.day, phase: G.phase, at: Date.now(), v: VERSION }));
    return true;
  } catch { return false; }
}
export function loadGame(slot = 'auto') {
  const ls = store();
  try { const s = ls?.getItem(KEY + slot); return s ? deserialize(s) : null; } catch { return null; }
}
export function saveMeta(slot) {
  const ls = store();
  try { const s = ls?.getItem(KEY + slot + '-meta'); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function deleteSave(slot) { const ls = store(); try { ls?.removeItem(KEY + slot); ls?.removeItem(KEY + slot + '-meta'); } catch {} }
