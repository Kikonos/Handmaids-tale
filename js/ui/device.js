// Detects the device the game is running on and picks a profile for it:
//   form     'phone' | 'tablet' | 'desktop'  (drives the layout)
//   input    'touch' | 'mouse'              (wording, hover, keyboard shortcuts)
//   quality  'high' | 'balanced' | 'low'     (canvas resolution, traffic density, blur effects)
// The player can override layout and graphics in Settings; 'auto' graphics also steps down if the frame rate drops.
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { } } };

// Screen sizes in CSS points (portrait), from Apple's device specifications.
const IPADS = {
  '744x1133': 'iPad mini (6th gen or later)',
  '768x1024': 'iPad 9.7-inch',
  '810x1080': 'iPad 10.2-inch (7th–9th gen)',
  '820x1180': 'iPad 11-inch (A16, 10th gen or Air)',
  '834x1112': 'iPad Air (3rd gen) or iPad Pro 10.5-inch',
  '834x1194': 'iPad Pro 11-inch',
  '834x1210': 'iPad Pro 11-inch (M4)',
  '1024x1366': 'iPad Pro or Air 12.9/13-inch',
  '1032x1376': 'iPad Pro 13-inch (M4)',
};
const IPHONES = {
  '320x568': 'iPhone SE (1st gen)',
  '375x667': 'iPhone SE or iPhone 8',
  '414x736': 'iPhone 8 Plus',
  '375x812': 'iPhone mini, X or XS',
  '414x896': 'iPhone 11, XR or XS Max',
  '390x844': 'iPhone 12, 13 or 14',
  '393x852': 'iPhone 15 or 16',
  '402x874': 'iPhone 16 Pro or 17 Pro',
  '428x926': 'iPhone 13 Pro Max or 14 Plus',
  '430x932': 'iPhone 15 Plus or Pro Max',
  '440x956': 'iPhone 16 Pro Max or 17 Pro Max',
};

export function detectDevice() {
  const ua = navigator.userAgent || '', tp = navigator.maxTouchPoints || 0;
  const sw = Math.round(Math.min(screen.width, screen.height)), sh = Math.round(Math.max(screen.width, screen.height)), key = `${sw}x${sh}`;
  const fine = matchMedia('(pointer: fine)').matches, coarse = matchMedia('(pointer: coarse)').matches;
  // iPadOS Safari introduces itself as a Mac; Macs have no touch screen, so a touchable "Mac" is an iPad
  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && (tp > 0 || coarse));
  const iPhone = /iPhone|iPod/.test(ua), android = /Android/.test(ua), androidPhone = android && /Mobile/.test(ua);
  let form, os, name;
  if (iPhone) { form = 'phone'; os = 'iOS'; name = IPHONES[key] || 'iPhone'; }
  else if (iPad) { form = 'tablet'; os = 'iPadOS'; name = IPADS[key] || 'iPad'; }
  else if (androidPhone) { form = 'phone'; os = 'Android'; name = 'Android phone'; }
  else if (android) { form = 'tablet'; os = 'Android'; name = 'Android tablet'; }
  else {
    os = /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Desktop';
    form = coarse && !fine && sw < 500 ? 'phone' : coarse && !fine ? 'tablet' : 'desktop';
    name = os === 'macOS' ? 'Mac' : os === 'Windows' ? 'Windows PC' : os === 'ChromeOS' ? 'Chromebook' : os + ' computer';
  }
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Browser';
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  const input = form === 'desktop' || (fine && !coarse) ? 'mouse' : 'touch';
  const cores = navigator.hardwareConcurrency || 0, memory = navigator.deviceMemory || 0, dpr = window.devicePixelRatio || 1;
  // a first guess at graphics quality; 'auto' refines it from the measured frame rate
  let quality = 'high';
  if ((memory && memory <= 2) || (cores && cores <= 2)) quality = 'low';
  else if ((memory && memory <= 4) || (cores && cores <= 4) || key === '768x1024' || key === '810x1080' || key === '320x568' || key === '375x667') quality = 'balanced';
  return { form, os, name, browser, standalone, input, cores, memory, dpr, screen: key, quality };
}

export const DEVICE = detectDevice();
export const prefs = {
  get layout() { return store.get('gilead-layout') || 'auto'; },
  set layout(v) { store.set('gilead-layout', v); },
  get quality() { return store.get('gilead-quality') || 'auto'; },
  set quality(v) { store.set('gilead-quality', v); },
};
let measured = null; // quality chosen by the frame-rate monitor
export const layout = () => prefs.layout === 'auto' ? DEVICE.form : prefs.layout;
export const quality = () => prefs.quality !== 'auto' ? prefs.quality : measured || DEVICE.quality;
export const tapWord = (cap = true) => DEVICE.input === 'mouse' ? (cap ? 'Click' : 'click') : (cap ? 'Tap' : 'tap');

// The graphics settings each quality level stands for.
export const QUALITY = {
  high: { dpr: 2, traffic: 1, label: 'High' },
  balanced: { dpr: 1.5, traffic: 0.6, label: 'Balanced' },
  low: { dpr: 1, traffic: 0.3, label: 'Battery saver' },
};

export function applyProfile() {
  const el = document.documentElement;
  el.dataset.device = layout();
  el.dataset.input = DEVICE.input;
  el.dataset.quality = quality();
  el.dataset.os = DEVICE.os.toLowerCase();
}

// Frame-rate monitor: while the map is animating, steps 'auto' graphics down a level if the game runs below
// ~40 frames a second for several seconds (never back up within a session, to avoid flicker).
let acc = 0, frames = 0, slow = 0;
export const fps = { value: 60 };
export function sampleFrame(dt, onChange) {
  acc += dt; frames++;
  if (acc < 2) return;
  fps.value = frames / acc; acc = 0; frames = 0;
  if (prefs.quality !== 'auto') { slow = 0; return; }
  slow = fps.value < 40 ? slow + 1 : 0;
  if (slow >= 3) {
    slow = 0;
    const cur = quality(), next = cur === 'high' ? 'balanced' : cur === 'balanced' ? 'low' : null;
    if (next) { measured = next; applyProfile(); onChange?.(next); }
  }
}
