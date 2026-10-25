// CADET — ui/tablet.js : the cadet's tablet (M5), opened with Tab (the dispatcher hands it over on the first day).
// Pages: 今日 (the date, the time, today's plan and how far it has got, the weather — METAR / TAF —, how tired the
// cadet is, what stands between them and the next chapter), 進み具合 (the training device's lessons, the classes, the
// written tests, the 16 lessons of chapter 2 with FLIGHT LAB's best grades, the trust), 航空日誌, 教科書 (the game's
// textbook: a chapter, a section, read), 練習 (a practice test from any of FLIGHT LAB's question banks), 記録 (the save
// as a file, read back from one, a new start), 感想 (M8: what the player noticed, kept in this browser, taken away as
// text).
// It shows what model() returns each time it is drawn and calls back for anything that changes the game; it owns no
// state but the page shown.
const CSS = `
.tb { position: fixed; inset: 0; z-index: 27; display: grid; place-items: center; padding: 16px; background: rgba(3, 7, 12, .5); backdrop-filter: blur(3px); }
.tb[hidden] { display: none; }
.tb-dev { width: min(980px, 100%); height: min(640px, calc(100vh - 32px)); display: grid; grid-template-rows: auto 1fr; border-radius: 22px; padding: 14px;
  background: linear-gradient(#20252c, #15191e); box-shadow: 0 30px 80px rgba(0, 0, 0, .6), inset 0 0 0 1px rgba(255, 255, 255, .06); color: #e6eef7;
  font-family: var(--font, system-ui, sans-serif); }
.tb-top { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; padding: 0 4px 10px; }
.tb-top b { margin-right: auto; font-size: 13px; letter-spacing: .05em; color: #9fb4c9; }
.tb-top button { font: inherit; font-size: 13px; padding: 7px 12px; border-radius: 9px; border: 0; cursor: pointer; color: #cfe1f3; background: rgba(255, 255, 255, .06); }
.tb-top button.on { color: #0b1420; background: #5cc8ff; font-weight: 700; }
.tb-top button.x { margin-left: 8px; background: rgba(255, 255, 255, .12); }
.tb-scr { overflow: auto; border-radius: 12px; padding: 16px 18px; background: #0d1218; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .05); font-size: 13.5px; line-height: 1.6; }
.tb-scr h2 { margin: 0 0 4px; font-size: 19px; } .tb-scr h3 { margin: 14px 0 6px; font-size: 14px; color: #8fd3ff; letter-spacing: .04em; }
.tb-scr .sub { color: #9fb4c9; font-size: 12.5px; }
.tb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.tb-card { padding: 10px 12px; border-radius: 10px; background: rgba(255, 255, 255, .04); }
.tb-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.tb-list li { display: flex; gap: 8px; align-items: baseline; }
.tb-list .st { flex: none; min-width: 3.6em; font-size: 11.5px; font-weight: 700; text-align: center; padding: 1px 6px; border-radius: 5px; background: rgba(255, 255, 255, .08); color: #b9c8d6; }
.tb-list .st.ok { background: #2f6f4f; color: #fff; } .tb-list .st.now { background: #5cc8ff; color: #0b1420; } .tb-list .st.ng { background: #8a3d35; color: #fff; }
.tb-mono { font-family: ui-monospace, Consolas, monospace; font-size: 12.5px; color: #cfe8d9; word-break: break-all; }
.tb-bar { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, .1); overflow: hidden; margin: 4px 0; } .tb-bar i { display: block; height: 100%; background: #6fe3a0; }
.tb-bar.warn i { background: #ffb547; } .tb-bar.bad i { background: #ff7b6b; }
.tb-les { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
.tb-les div { padding: 6px 8px; border-radius: 8px; background: rgba(255, 255, 255, .04); font-size: 12.5px; }
.tb-les div b { display: inline-block; min-width: 1.6em; margin-right: 4px; text-align: center; border-radius: 4px; background: rgba(255, 255, 255, .1); }
.tb-les div.ok b { background: #2f6f4f; color: #fff; }
.tb-btn { font: inherit; font-size: 13px; padding: 7px 12px; margin: 3px 6px 3px 0; border-radius: 9px; border: 0; cursor: pointer; color: #0b1420; background: #8fd3ff; }
.tb-btn.ghost { color: #d6e6f5; background: rgba(255, 255, 255, .1); } .tb-btn.danger { color: #fff; background: #8a3d35; }
.tb-btn:focus-visible, .tb-top button:focus-visible { outline: 2px solid #ffd479; outline-offset: 2px; }
.tb-note { margin-top: 10px; font-size: 12px; color: #9fb4c9; }
.tb-msg { margin-top: 8px; padding: 6px 10px; border-radius: 8px; background: rgba(255, 255, 255, .06); }
.tb-note-in { width: 100%; box-sizing: border-box; min-height: 110px; resize: vertical; padding: 10px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, .14);
  background: rgba(255, 255, 255, .04); color: #e6eef7; font: inherit; font-size: 14px; line-height: 1.6; }
.tb-note-in:focus-visible { outline: 2px solid #ffd479; outline-offset: 2px; }
.tb-notes { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 8px; }
.tb-notes li { padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, .04); }
.tb-notes small { display: block; color: #9fb4c9; font-size: 11.5px; margin-bottom: 2px; }
.tb-notes p { margin: 0 0 4px; white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 640px) { .tb-dev { border-radius: 14px; padding: 8px; } .tb-scr { padding: 10px; } }
`;
const PAGES = [['today', '今日'], ['progress', '進み具合'], ['logbook', '航空日誌'], ['book', '教科書'], ['practice', '練習'], ['save', '記録'], ['notes', '感想']];

// model() → { date, chapterTitle, slotName, plan: [{ slot, title, state: 'done' | 'now' | 'later' | 'missed' }],
//   weather: { ja, metarAm, metarPm, taf, flyAm, flyPm }, fatigue, tired, gate: [..], ground: [{ id, title, pass }],
//   classes: { done, total }, exams: [{ title, best, pass, tries }], lessons: [{ id, title, best, pass }], trust: [{ name, v }],
//   solo, book: [{ id, n, title, sections: [{ id, title }] }], banks: [{ id, title, n }], evening, canWait }
// act: { logbook(), read(sectionId), practice(bankId), exportSave() → text, importSave(text) → message, reset(), wait(), home(),
//   (M8) notes: { list(), draft, setDraft(t), add(t), remove(id), clear(), export() } }
export function createTablet({ doc = document, model, act, onClose } = {}) {
  if (!doc.getElementById('tb-css')) { const st = doc.createElement('style'); st.id = 'tb-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const make = (tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const put = (p, ...k) => { for (const c of k) if (c) p.appendChild(c); return p; };
  const btn = (text, fn, cls = 'tb-btn') => { const b = make('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const root = make('div', 'tb'); root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'タブレット');
  const dev = make('section', 'tb-dev'), top = make('nav', 'tb-top'), scr = make('div', 'tb-scr');
  put(dev, top, scr); put(root, dev); doc.body.appendChild(root);
  let page = 'today', bookCh = null, msg = '';

  function nav(m) {
    top.textContent = '';
    put(top, make('b', '', `${m.date}　${m.slotName}`));
    for (const [id, name] of PAGES) { const b = btn(name, () => { page = id; msg = ''; draw(); }, id === page ? 'on' : ''); b.setAttribute('aria-pressed', String(id === page)); put(top, b); }
    put(top, btn('閉じる（Tab）', () => close(), 'x'));
  }
  const status = (st) => ({ done: ['ok', '済'], now: ['now', 'いま'], later: ['', '予定'], missed: ['ng', '—'] }[st] || ['', st]);
  function today(m) {
    put(scr, make('h2', '', m.chapterTitle), make('div', 'sub', `${m.date}　${m.slotName}`));
    const g = make('div', 'tb-grid');
    const plan = put(make('div', 'tb-card'), make('h3', '', '今日の予定'));
    const ul = make('ul', 'tb-list');
    if (!m.plan.length) put(ul, put(make('li'), make('span', '', '今日の予定はありません。')));
    for (const p of m.plan) { const [c, t] = status(p.state); put(ul, put(make('li'), make('span', 'st ' + c, t), make('span', '', `${p.slotName}　${p.title}`))); }
    put(plan, ul);
    if (m.canWait) put(plan, btn('次の予定まで待つ', () => { act.wait(); draw(); }, 'tb-btn ghost'));
    if (m.evening) put(plan, make('div', 'tb-note', '今日はここまで。正面入口から寮に帰ると、次の日になります。'));
    const wx = put(make('div', 'tb-card'), make('h3', '', `天気：${m.weather.ja}`),
      make('div', 'tb-mono', m.weather.metarAm), make('div', 'tb-mono', m.weather.metarPm), make('div', 'tb-mono', m.weather.taf),
      make('div', 'tb-note', `ソロ前の訓練生の基準：雷雨なし・視程 5 SM 以上・雲高 3,000 ft 以上・横風 10 kt 以下。飛べる時間：午前 ${m.weather.flyAm ? '○' : '×'}・午後 ${m.weather.flyPm ? '○' : '×'}`));
    const f = m.fatigue, me = put(make('div', 'tb-card'), make('h3', '', '体調（IMSAFE）'), make('div', 'sub', `疲れ ${f} / 100`));
    const bar = make('div', 'tb-bar' + (f >= 65 ? ' bad' : f >= 45 ? ' warn' : '')); put(bar, Object.assign(make('i'), { style: `width:${f}%` })); put(me, bar);
    put(me, make('div', 'tb-note', m.tired ? '疲れがたまっています。今夜は早く寝ましょう。飛ぶ前の確認では、正直に。' : '夜遅くまでの自習は、次の日の疲れになります。'));
    const gate = put(make('div', 'tb-card'), make('h3', '', '次の段階まで'));
    const gl = make('ul', 'tb-list');
    if (!m.gate.length) put(gl, put(make('li'), make('span', 'st ok', 'OK'), make('span', '', m.solo ? 'ファーストソロ、おめでとう。' : 'この章でやることは、そろいました。')));
    for (const x of m.gate.slice(0, 8)) put(gl, put(make('li'), make('span', 'st', '残り'), make('span', '', x)));
    if (m.gate.length > 8) put(gl, put(make('li'), make('span', 'sub', `ほか ${m.gate.length - 8} 件`)));
    put(gate, gl);
    put(g, plan, wx, me, gate); put(scr, g);
  }
  function progress(m) {
    put(scr, make('h2', '', '進み具合'));
    const g = make('div', 'tb-grid');
    const gr = put(make('div', 'tb-card'), make('h3', '', '第 1 章　座学'));
    put(gr, make('div', 'sub', `授業 ${m.classes.done} / ${m.classes.total}`));
    const ul = make('ul', 'tb-list');
    for (const k of m.ground) put(ul, put(make('li'), make('span', 'st' + (k.pass ? ' ok' : ''), k.pass ? '合格' : '未'), make('span', '', `${k.id} ${k.title}`)));
    for (const e of m.exams) put(ul, put(make('li'), make('span', 'st' + (e.pass ? ' ok' : e.tries ? ' ng' : ''), e.pass ? '合格' : e.tries ? `${e.best}%` : '未'), make('span', '', e.title)));
    put(gr, ul);
    const tr = put(make('div', 'tb-card'), make('h3', '', '信頼'));
    for (const t of m.trust) { put(tr, make('div', 'sub', `${t.name}　${t.v}`)); const b = make('div', 'tb-bar'); put(b, Object.assign(make('i'), { style: `width:${t.v}%` })); put(tr, b); }
    put(g, gr, tr); put(scr, g);
    put(scr, make('h3', '', '第 2 章　ソロまでの課目（「基礎」以上で合格したもの）'));
    const les = make('div', 'tb-les');
    for (const l of m.lessons) put(les, put(make('div', l.pass ? 'ok' : ''), make('b', '', l.best || '・'), make('span', '', `${l.id} ${l.title}`)));
    put(scr, les);
  }
  function logbook() { put(scr, make('h2', '', '航空日誌'), make('p', 'sub', '訓練所の記録です。飛んだ日ごとに、教官の署名が入ります。'), btn('航空日誌を開く', () => act.logbook())); }
  function book(m) {
    put(scr, make('h2', '', '教科書'));
    if (!bookCh) {
      const ul = make('ul', 'tb-list');
      for (const c of m.book) put(ul, put(make('li'), btn(`第 ${c.n} 章　${c.title}`, () => { bookCh = c.id; draw(); }, 'tb-btn ghost')));
      put(scr, ul); return;
    }
    const c = m.book.find(x => x.id === bookCh);
    put(scr, btn('← 章の一覧', () => { bookCh = null; draw(); }, 'tb-btn ghost'), make('h3', '', `第 ${c.n} 章　${c.title}`));
    const ul = make('ul', 'tb-list');
    for (const s of c.sections) put(ul, put(make('li'), btn(s.title, () => act.read(s.id), 'tb-btn ghost')));
    put(scr, ul);
  }
  function practice(m) {
    put(scr, make('h2', '', '学科テストの練習'), make('p', 'sub', '分野を選ぶと、10 問の練習が始まります（成績には入りません）。'));
    const g = make('div', 'tb-grid');
    for (const b of m.banks) put(g, put(make('div', 'tb-card'), make('h3', '', b.title), make('div', 'sub', `${b.n} 問から 10 問`), btn('練習する', () => { close(); act.practice(b.id); })));
    put(scr, g);
  }
  function save() {
    put(scr, make('h2', '', '記録'), make('p', 'sub', 'キャリア・会話・航空日誌・課目の記録を、ひとつのファイルにまとめて保存できます。別のブラウザで読み込めば、続きから訓練できます。'));
    const file = Object.assign(make('input'), { type: 'file', accept: '.json,application/json' }); file.hidden = true;
    file.addEventListener('change', () => { const f = file.files && file.files[0]; if (!f) return; f.text().then((t) => { msg = act.importSave(t); draw(); }); });
    put(scr, btn('ファイルに保存する', () => { const t = act.exportSave(); const a = make('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'application/json' })); a.download = `cadet-save-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); msg = '保存しました。'; draw(); }),
      btn('ファイルから読み込む', () => file.click(), 'tb-btn ghost'), file,
      btn('最初からやり直す', () => { if (doc.defaultView.confirm('記録を消して、入社の日からやり直しますか？')) { act.reset(); close(); } }, 'tb-btn danger'));
    if (msg) put(scr, make('div', 'tb-msg', msg));
    put(scr, make('div', 'tb-note', '記録はこのブラウザの中に保存されています。ブラウザのデータを消すと、記録も消えます。'));
  }
  // (M8) what the player noticed: written here, kept in this browser, taken away as text
  function notes() {
    const N = act.notes;
    put(scr, make('h2', '', '感想を書く'), make('p', 'sub', '遊んでいて気づいたこと（わかりにくかった・困った・よかったこと）を書き残せます。書いた場所と時刻も一緒に残ります。'));
    const ta = Object.assign(make('textarea', 'tb-note-in'), { maxLength: 2000, placeholder: '例：運航管理の場所がわからなかった。案内の矢印が扉の裏を指していた。', value: N.draft });
    ta.setAttribute('aria-label', '感想');
    ta.addEventListener('input', () => N.setDraft(ta.value));
    // (Tab and Esc close the tablet, as everywhere in it; what is written stays as a draft)
    put(scr, ta, btn('保存する', () => { if (N.add(ta.value)) { msg = '保存しました。'; draw(); } else { msg = '何も書かれていません。'; draw(); } }),
      btn('文字で書き出す（コピー用）', () => N.export(), 'tb-btn ghost'),
      btn('全部消す', () => { if (doc.defaultView.confirm('このブラウザに保存した感想を、全部消しますか？')) { N.clear(); msg = '消しました。'; draw(); } }, 'tb-btn danger'));
    if (msg) put(scr, make('div', 'tb-msg', msg));
    const list = N.list();
    put(scr, make('h3', '', `保存した感想（${list.length} 件）`));
    const ul = make('ul', 'tb-notes');
    for (const n of list) put(ul, put(make('li'), make('small', '', `${n.at}　${n.where}`), make('p', '', n.text), btn('消す', () => { N.remove(n.id); draw(); }, 'tb-btn ghost')));
    put(scr, ul);
    put(scr, make('div', 'tb-note', '感想はこのブラウザの localStorage（cadet.notes）にだけ保存され、どこにも送られません。「文字で書き出す」でまとめてコピーして、作った人に渡してください。ブラウザのデータを消すと、感想も消えます。'));
  }
  function draw() {
    if (root.hidden) return;
    const m = model();
    nav(m); scr.textContent = '';
    ({ today, progress, logbook, book, practice, save, notes })[page](m);
  }
  function open(p) { if (p) page = p; root.hidden = false; msg = ''; draw(); setTimeout(() => { const b = top.querySelector('button.on'); if (b) b.focus(); }, 0); }
  function close() { if (root.hidden) return; root.hidden = true; if (onClose) onClose(); }
  root.addEventListener('keydown', (e) => { if (e.code === 'Escape' || e.code === 'Tab') { e.preventDefault(); e.stopPropagation(); close(); } });
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  return { open, close, draw, get isOpen() { return !root.hidden; }, get page() { return page; } };
}
