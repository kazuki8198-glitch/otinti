// CADET — ui/coach.js : the first minutes' help (M7). One small box at the bottom left with a key and a line, one step
// at a time, each gone once the cadet has done it: look around, walk, follow the guide at the top, E on a person or a
// thing, Tab for the tablet (once it is handed over), Esc for the settings. Shown on a new start until every step is
// done; the setting 「はじめての操作の案内」 brings it back (settings.firstHelp).
// update(dt, s) every frame while walking; s: { look (degrees the view turned since the last call), walked (m since the
// last call), talking, tablet (open), hasTablet, menu (open), busy (a card or a talk over the screen: the box waits) }
const CSS = `
#coach { position: absolute; left: 18px; bottom: 120px; max-width: min(380px, calc(100vw - 36px)); display: flex; gap: 10px; align-items: center;
  padding: 10px 14px; border-radius: 14px; background: rgba(10, 18, 28, 0.78); border: 1px solid rgba(255, 181, 71, .55);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .3); font-size: calc(14px * var(--sub-k, 1)); line-height: 1.55; transition: opacity .3s; z-index: 2; }
#coach[hidden] { display: none; }
#coach .co-k { flex: none; display: flex; gap: 3px; }
#coach .co-k kbd { font-size: 12px; min-width: 22px; line-height: 20px; }
#coach small { display: block; font-size: 11px; color: var(--ink-dim, #a9b7c6); letter-spacing: .06em; }
body.talking #coach, body.mode-fly #coach, body.mode-spectator #coach { opacity: 0; }
`;
export const STEPS = [
  { id: 'look', keys: ['マウス'], text: '見回す（画面をクリックすると、マウスで見回せます）', done: (m) => m.look > 60 },
  { id: 'walk', keys: ['W', 'A', 'S', 'D'], text: '歩く。Shift を押したままで走る', done: (m) => m.walked > 4 },
  { id: 'guide', keys: ['↑'], text: '画面の上の「次にすること」と矢印が、行き先です', done: (m) => m.shown > 7 },
  { id: 'use', keys: ['E'], text: '人や物に照準を合わせて E。話しかける・調べる・扉を開ける', done: (m) => m.talked },
  { id: 'tablet', keys: ['Tab'], text: 'タブレットを開く：今日の予定・天気・教科書・記録', done: (m) => m.tabletOpened, when: (s) => s.hasTablet },
  { id: 'esc', keys: ['Esc'], text: '一時停止と設定（音量・字幕の大きさ・マウスの感度・画質）', done: (m) => m.shown > 8 || m.menuOpened },
];

export function createCoach({ root, settings, steps = STEPS }) {
  const doc = root.ownerDocument;
  if (!doc.getElementById('coach-css')) { const st = doc.createElement('style'); st.id = 'coach-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const el = doc.createElement('div'); el.id = 'coach'; el.hidden = true; el.setAttribute('role', 'status');
  el.innerHTML = '<span class="co-k"></span><span><small>はじめての操作</small><b class="co-t"></b></span>';
  root.appendChild(el);
  let i = 0, m = fresh();
  function fresh() { return { look: 0, walked: 0, shown: 0, talked: false, tabletOpened: false, menuOpened: false }; }
  function show(step) {
    el.querySelector('.co-k').innerHTML = step.keys.map(k => `<kbd>${k}</kbd>`).join('');
    el.querySelector('.co-t').textContent = step.text;
  }
  function update(dt, s = {}) {
    if (settings.get('firstHelp') === false || i >= steps.length) { el.hidden = true; return null; }
    const step = steps[i];
    if (step.when && !step.when(s)) { el.hidden = true; return step.id; }
    if (el.dataset.step !== step.id) { show(step); el.dataset.step = step.id; }
    // (a talk or the tablet has the screen: the box steps aside, the step still counts what is done)
    el.hidden = !!(s.talking || s.tablet);
    if (!s.busy) m.shown += dt;
    m.look += s.look || 0; m.walked += s.walked || 0;
    if (s.talking) m.talked = true;
    if (s.tablet) m.tabletOpened = true;
    if (s.menu) m.menuOpened = true;
    if (step.done(m)) { i++; m = fresh(); if (i >= steps.length) settings.set('firstHelp', false); }
    return i < steps.length ? steps[i].id : null;
  }
  return {
    update,
    restart() { i = 0; m = fresh(); },
    get step() { return i < steps.length ? steps[i].id : null; },
    get el() { return el; },
  };
}
