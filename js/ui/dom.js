// DOM helpers that keep the UI responsive while the simulation updates it many times a second.
//
// patch(el, html): morphs el's children to match html in place. Elements the player is touching
// stay in the document (no innerHTML swap), so taps, scroll positions and slider drags survive
// every refresh.
//
// onTap(handler): fires on pointerup for any [data-act] element, using the action captured at
// pointerdown. A re-render between finger-down and finger-up can no longer swallow the tap, and
// there is no 300 ms click delay.

export function patch(el, html) {
  if (!el) return;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  morphChildren(el, tpl.content);
}

function morphChildren(a, b) {
  const bn = b.childNodes;
  let i = 0;
  for (; i < bn.length; i++) {
    const src = bn[i];
    const dst = a.childNodes[i];
    if (!dst) { a.appendChild(src.cloneNode(true)); continue; }
    morphNode(a, dst, src);
  }
  while (a.childNodes.length > i) a.removeChild(a.lastChild);
}

function morphNode(parent, dst, src) {
  if (dst.nodeType !== src.nodeType || dst.nodeName !== src.nodeName || (src.nodeType === 1 && src.dataset && dst.dataset && src.dataset.key !== dst.dataset.key)) {
    parent.replaceChild(src.cloneNode(true), dst);
    return;
  }
  if (src.nodeType === 3 || src.nodeType === 8) {
    if (dst.nodeValue !== src.nodeValue) dst.nodeValue = src.nodeValue;
    return;
  }
  if (src.nodeType !== 1) return;
  // attributes
  const sa = src.attributes, da = dst.attributes;
  for (let k = da.length - 1; k >= 0; k--) { const n = da[k].name; if (!src.hasAttribute(n)) dst.removeAttribute(n); }
  for (let k = 0; k < sa.length; k++) {
    const { name, value } = sa[k];
    if (dst.getAttribute(name) !== value) {
      if (name === 'value' && dst === document.activeElement) continue;
      dst.setAttribute(name, value);
    }
  }
  if (dst.tagName === 'INPUT' && dst !== document.activeElement && src.hasAttribute('value') && dst.value !== src.getAttribute('value')) dst.value = src.getAttribute('value');
  morphChildren(dst, src);
}

// ---------------- Tap dispatch ----------------
export function onTap(handler) {
  let start = null;
  let suppressUntil = 0;
  document.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const t = e.target.closest('[data-act]');
    if (!t || t.classList.contains('dis') || t.disabled) { start = null; return; }
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, el: t, act: t.dataset.act, arg: t.dataset.arg || '', time: performance.now() };
    t.classList.add('pressed');
  }, true);
  const clear = () => { if (start?.el) start.el.classList.remove('pressed'); };
  document.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) { clear(); start = null; }
  }, true);
  document.addEventListener('pointercancel', () => { clear(); start = null; }, true);
  document.addEventListener('pointerup', e => {
    if (!start || e.pointerId !== start.id) return;
    const s = start; start = null;
    clear();
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 12) return;
    suppressUntil = performance.now() + 500;
    handler(s.act, s.arg, s.el, e);
  }, true);
  // The browser's own click that follows a handled tap is ignored; keyboard / synthetic clicks still work.
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (performance.now() < suppressUntil) { e.preventDefault(); return; }
    if (t.classList.contains('dis') || t.disabled) return;
    handler(t.dataset.act, t.dataset.arg || '', t, e);
  }, true);
}
