// Save / load. Transient fields (prefixed "_", fx, notes) are dropped.
import { VERSION, CITIES, STATES } from './core.js';
import { CITY_POS } from '../data/geo.js';
import { CROSSINGS } from '../data/sites.js';

const KEY = 'gilead-save-';
export function serialize(G) {
  return JSON.stringify(G, (k, v) => (k.startsWith('_') || k === 'fx' || k === 'notes' ? undefined : v));
}
export function deserialize(s) {
  const G = JSON.parse(s);
  G.fx = []; G.notes = [];
  G.paused = true;
  migrate(G);
  return G;
}
// Older saves: give every institution a map slot, and move city checkpoints (pre-1.4) onto the nearest
// free road crossing of their state's border (refunded if there is none).
function migrate(G) {
  for (const b of G.bld) {
    if (b.type === 'checkpoint' && b.site && !CROSSINGS.some(x => x.id === b.site)) b.site = null; // the road network was redrawn (1.5)
    if (b.type === 'checkpoint' && !b.site) {
      const st = b.st || CITIES[b.city]?.st, c = CITY_POS[b.city];
      const x = CROSSINGS.filter(x => (x.a === st || x.b === st) && !G.bld.some(o => o.site === x.id)).sort((p, q) => Math.hypot(p.x - c.x, p.y - c.y) - Math.hypot(q.x - c.x, q.y - c.y))[0];
      if (x) { const other = x.a === st ? x.b : x.a; b.site = x.id; b.st = st; b.name = `Checkpoint · ${STATES[st].name}–${STATES[other].name} line`; }
      else { G.res.treasury += 20; b.gone = true; }
    }
  }
  G.bld = G.bld.filter(b => !b.gone);
  for (const b of G.bld) if (b.slot == null && !b.site) { let s = 0; while (G.bld.some(o => o !== b && o.city === b.city && !o.site && o.slot === s)) s++; b.slot = s; }
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
