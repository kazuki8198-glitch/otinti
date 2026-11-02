// CADET — the day HUD's practice-flight door (node --test): the ✈ 練習飛行（フリーモード）button that
// the walk HUD carries, over a small DOM stub (the DOM itself is checked in a browser). The button holds
// no setup of its own — the test proves it renders with its hint, shows and hides as the game drives it,
// and that a click reaches the one callback the game registered (which opens the pause menu at its free
// tab: the same flow, the same onFreeSetup / onSimSetup, as the menu's own entry).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDayHUD } from '../src/ui/day-hud.js';

function makeEl(tag = 'div') {
  const el = {
    tagName: String(tag).toUpperCase(), children: [], style: {}, dataset: {}, hidden: false, className: '', textContent: '', parentNode: null, attrs: {}, _ls: {}, _qs: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); },
      remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c, f) { if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener(t, f) { (this._ls[t] ||= []).push(f); },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    append(...cs) { cs.forEach(c => this.appendChild(c)); },
    insertBefore(c, ref) { const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); c.parentNode = this; return c; },
    querySelector(sel) { return this._qs[sel] || null; },
    get firstChild() { return this.children[0] || null; },
    click() { (this._ls.click || []).forEach(f => f({ target: this })); },
    focus() {}, remove() {},
  };
  return el;
}
function stubDoc() {
  const fhud = makeEl('div'), left = makeEl('div'), right = makeEl('div');
  fhud._qs = { '.fh-left': left, '.fh-right': right };
  const hud = makeEl('div');
  const byId = { fhud, hud };
  return {
    head: makeEl('head'), body: makeEl('body'),
    createElement: (t) => makeEl(t),
    createTextNode: (t) => ({ textContent: t }),
    getElementById: (id) => byId[id] || null,
    _hud: hud,
  };
}
const findByClass = (el, cls) => { if (el.className === cls) return el; for (const c of el.children || []) { const hit = findByClass(c, cls); if (hit) return hit; } return null; };

test('day HUD: the practice button renders in the walk HUD with its label and hint, hidden until shown', () => {
  const doc = stubDoc();
  const hud = createDayHUD({ doc, settings: null });
  const btn = findByClass(doc._hud, 'dh-practice');
  assert.ok(btn, 'the button is in the HUD');
  assert.equal(btn.tagName, 'BUTTON');
  assert.equal(btn.hidden, true, 'hidden until the game shows it');
  assert.equal(hud.practiceShown, false);
  const label = btn.children[0], hint = btn.children[1];
  assert.equal(label.textContent, '✈ 練習飛行（フリーモード）');
  assert.equal(hint.textContent, '記録に残らない自由練習');
  hud.setPractice(true);
  assert.equal(btn.hidden, false);
  assert.equal(hud.practiceShown, true);
  hud.setPractice(false);
  assert.equal(btn.hidden, true);
});

test('day HUD: a click on the practice button invokes the one registered callback (the menu’s free flow)', () => {
  const doc = stubDoc();
  const hud = createDayHUD({ doc, settings: null });
  const btn = findByClass(doc._hud, 'dh-practice');
  btn.click();                                                     // no callback yet: nothing happens, nothing throws
  let calls = 0;
  hud.onPractice(() => { calls++; });
  btn.click();
  btn.click();
  assert.equal(calls, 2);
});
