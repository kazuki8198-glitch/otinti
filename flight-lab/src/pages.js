// FLIGHT LAB — pages.js
// The screens around the flight: the start menu, the school (the syllabus with each lesson's purpose, procedure,
// keys, standards and steps), the debrief, and the pages: the textbook, the ground-school tests, the guide (keys,
// gamepad, the screen, how to fly, numbers), the G1000-type PFD tutorial and the reading practice, Sanford and English
// ATC, the learning record, the Google 3D settings, and "about". FL.pages(app) returns them (built once).
(function (FL) {
  'use strict';
  let built = null;
  FL.pages = function (app) {
    if (built) return built;
    const { S, h, $, esc, store, toast } = app;
    const P = FL.physics, AV = FL.avionics, SC = FL.school, SY = FL.syllabus, BK = FL.book, QZ = FL.quiz, SF = FL.sanford;
    const btn = (label, fn, cls, title) => h('button', { type: 'button', class: cls || '', title: title || null, onclick: fn }, label);
    const save = () => SC.saveProgress(store, S.progress);
    const levelName = id => SC.level(id).name;

    // ============================================================== the start menu
    function openMenu() {
      if (!S.L || !S.L.free) app.startFree('area', 'pa28');
      app.openScreen('menu');
      const m = $('#mainMenu'); m.textContent = '';
      const order = SC.lessonOrder(), flightIds = order.filter(id => SC.lesson(id).steps), passed = flightIds.filter(id => S.progress.lessons[id] && S.progress.lessons[id].pass).length;
      const chN = BK ? BK.CHAPTERS.length : 0, secN = BK ? BK.CHAPTERS.reduce((a, c) => a + c.secs.length, 0) : 0, read = S.progress.read.length;
      const items = [
        ['01', '課程表（スクール）', `飛行 ${flightIds.length} 課目 × 3 レベル・地上学科。合格 ${passed} / ${flightIds.length}`, () => openSchool()],
        ['02', '教科書', `全 ${chN} 章・${secN} 節（読んだ節 ${read}）。飛行の原理から多発・CRM まで、出典付き`, () => openPage('book')],
        ['03', '学科テスト', `${QZ ? QZ.BANKS.length : 0} 分野・${QZ ? QZ.BANKS.reduce((a, b) => a + b.qs.length, 0) : 0} 問（解説つき）`, () => openPage('quiz')],
        ['04', '操作ガイド', 'すべてのキーとゲームパッド：何が動くか・何のために使うか。画面の見方と飛び方のコツ', () => openPage('guide')],
        ['05', 'G1000 型 PFD の読み方', '計器を 1 つずつ説明するチュートリアルと、読み取り練習', () => openPage('tutor')],
        ['06', 'Sanford・英語交信', '空港の資料（模式図）と ATC 復唱の 6 場面（音声）', () => openPage('sfb')],
        ['07', '学習記録', '課目の結果・講評・メモ（JSON の書き出し・読み込み）', () => openPage('records')],
        ['08', 'Google 3D（任意）', 'Sanford 周辺の写実的な外部景観（自分の API キー・メモリのみ）', () => openPage('g3d')],
        ['09', 'このアプリについて', '非公式教材であること、実装したもの・していないもの、データの扱い', () => openPage('about')],
      ];
      for (const [code, title, sub, fn] of items) m.append(h('button', { type: 'button', class: 'mission', onclick: fn }, h('span', { class: 'code', text: code }), h('span', { class: 'm-title', text: title }), h('span', { class: 'm-sub', text: sub })));
      // options
      const seg = (id, key, v) => { for (const b of $('#' + id).querySelectorAll('button')) { b.classList.toggle('on', b.dataset.v === v); b.onclick = () => { S.prefs[key] = b.dataset.v; app.savePrefs(); seg(id, key, b.dataset.v); }; } };
      seg('optSens', 'sens', S.prefs.sens); seg('optHold', 'hold', S.prefs.hold);
      const cb = (id, key, fn) => { const e = $('#' + id); e.checked = !!S.prefs[key]; e.onchange = () => { S.prefs[key] = e.checked; app.savePrefs(); if (fn) fn(e.checked); }; };
      cb('optAutoRud', 'autoRud'); cb('optAssist', 'assist');
      const so = $('#optSound'); so.checked = !!S.prefs.sound; so.onchange = () => $('#bSound').click();
      const ac = $('#freeAc'); if (!ac.options.length) for (const a of P.AIRCRAFT) ac.append(h('option', { value: a.id }, a.name));
      const st = $('#freeStart'); if (!st.options.length) for (const f of SC.FREE_STARTS) st.append(h('option', { value: f.id }, f.name));
      $('#freeGo').onclick = () => { app.startFree(st.value, ac.value, $('#freeWind').value); app.closeScreens(); S.screen = 'fly'; S.paused = false; toast('自由飛行：評価はありません。H で操作の説明、Esc で一時停止', 3200); };
      $('#buildInfo').textContent = `FLIGHT LAB ${FL.BUILD_INFO || '(開発版)'} · 非公式の自主学習用教材`;
      setTimeout(() => { const f = m.querySelector('button'); if (f) f.focus(); }, 30);
    }

    // ============================================================== the school
    function openSchool(selId) {
      app.openScreen('school');
      const P0 = S.progress, order = SC.lessonOrder(), flightIds = order.filter(id => SC.lesson(id).steps);
      const passedN = flightIds.filter(id => P0.lessons[id] && P0.lessons[id].pass).length;
      $('#sch-log').innerHTML = `<div><b>${passedN}</b><span>合格した飛行課目 / ${flightIds.length}</span></div><div><b>${(P0.time / 3600).toFixed(1)}</b><span>練習時間（時間）</span></div><div><b>${P0.landings}</b><span>接地の回数</span></div>`;
      const lv = $('#levelSeg'); lv.textContent = '';
      for (const L of SC.LEVELS) lv.append(h('button', { type: 'button', class: S.prefs.level === L.id ? 'on' : '', title: L.desc, onclick: () => { S.prefs.level = L.id; app.savePrefs(); openSchool(cur); } }, L.name));
      $('#sch-close').onclick = openMenu;
      const nav = $('#sch-stages'); nav.textContent = '';
      let firstOpen = null, cur = selId;
      for (const st of SY.STAGES) {
        const sec = h('section', {}, h('h3', { text: st.title }), h('p', { text: st.desc }));
        const lessons = st.lessons.slice();
        if (st.id === 's0' && QZ) for (const b of QZ.BANKS) lessons.push({ id: b.id, quiz: true, title: '学科テスト：' + b.title, goal: `${b.qs.length} 問・80% で合格（解説つき）` });
        for (const l of lessons) {
          const rec = l.quiz ? (P0.quiz[l.id] != null ? { best: P0.quiz[l.id] + '%', pass: P0.quiz[l.id] >= 80 } : null) : P0.lessons[l.id];
          const done = rec && rec.pass;
          const b = h('button', { type: 'button', class: 'sch-item' + (done ? ' done' : '') + (l.id === selId ? ' sel' : ''), onclick: () => openSchool(l.id) },
            h('span', { class: 'sch-grade', text: rec ? (l.quiz ? (done ? '✓' : '·') : rec.best || '―') : '' }), h('span', { class: 'sch-t', text: l.title }),
            h('span', { class: 'sch-ac', text: l.aircraft === 'pa44' ? 'Seminole' : l.aircraft === 'pa28' ? 'Archer' : '' }), h('span', { class: 'sch-g', text: l.goal }));
          sec.append(b);
          if (!firstOpen && !done && !l.quiz) firstOpen = l.id;
        }
        nav.append(sec);
      }
      cur = selId || firstOpen || order[0];
      if (!selId) { const el = [...nav.querySelectorAll('.sch-item')].find(e => !e.classList.contains('done')); if (el) el.classList.add('sel'); }
      renderBrief(cur);
    }
    function lessonKeys(l) {
      const set = []; for (const st of l.steps || []) { const t = st.keys || (st.checklist ? 'Enter＝チェックリストの次の項目' : st.atc ? '1 / 2 / 3＝管制への応答' : st.estimate ? '入力欄に見積もり' : ''); for (const part of t.split('　')) if (part && !set.includes(part)) set.push(part); }
      return set;
    }
    function renderBrief(id) {
      const box = $('#sch-brief'); box.textContent = '';
      const bank = QZ && QZ.BANKS.find(b => b.id === id);
      if (bank) {
        box.append(h('h2', { text: '学科テスト：' + bank.title }), h('p', { class: 'sch-goal', text: bank.desc || '' }), h('p', { text: `${bank.qs.length} 問の 4 択。答えるたびに解説が出ます。80% 以上で合格。出題の順と選択肢の順は毎回変わります。` }),
          h('div', { class: 'sch-bar' }, h('button', { type: 'button', class: 'sch-go', onclick: () => { openPage('quiz'); runQuiz(bank.id); } }, 'テストを始める'), S.progress.quiz[bank.id] != null ? h('span', { text: `最高 ${S.progress.quiz[bank.id]}%` }) : null));
        return;
      }
      const l = SC.lesson(id); if (!l) return;
      const rec = S.progress.lessons[id];
      box.append(h('h2', { text: l.title }), h('p', { class: 'sch-goal', text: '目的：' + l.goal }));
      if (l.tutor || l.read) {
        box.append(h('p', { text: l.tutor ? 'G1000 型 PFD の各部（速度・姿勢・高度・昇降率・方位・CDI・予備計器・エンジン）を、実際の表示に枠を付けて 1 つずつ説明します。最後まで見ると合格。' : 'ランダムな状態の PFD を見て、読み取った値や次の操作を 4 択で答えます（10 問・80% で合格）。' }),
          h('div', { class: 'sch-bar' }, h('button', { type: 'button', class: 'sch-go', onclick: () => openPage(l.tutor ? 'tutor' : 'readq') }, l.tutor ? 'チュートリアルを開く' : '練習を始める'), rec && rec.pass ? h('span', { text: '合格済み' }) : null));
        return;
      }
      const A = P.AIRCRAFT.find(a => a.id === (l.aircraft || 'pa28')), lv = SC.level(S.prefs.level);
      box.append(h('p', { class: 'small mute', text: `機体：${A.name}　レベル：${lv.name}（${lv.desc}）` }));
      if (l.why) box.append(h('h3', { text: 'なぜこの課目を練習するのか' }), h('p', { class: 'sch-why', text: l.why }));
      box.append(h('h3', { text: '知識と手順' }), h('ul', {}, ...l.brief.map(t => h('li', { html: t }))));
      const keys = lessonKeys(l);
      if (keys.length) box.append(h('h3', { text: 'この課目で使う操作' }), h('ul', {}, ...keys.map(k => h('li', { class: 'sch-keys', text: k }))), h('p', { class: 'sch-note', text: '飛行中も左上の教官パネルに「使うキー」が出ます。H キーで全部のキーの説明（いま使うキーを強調）。' }));
      box.append(h('h3', { text: '合格基準（基礎レベル）' }), h('p', { class: 'sch-std', text: l.std }),
        h('table', { class: 'lv' }, h('tr', {}, h('th', { text: 'レベル' }), h('th', { text: '許容幅' }), h('th', { text: '連続保持' }), h('th', { text: '目安・ヒント' })),
          ...SC.LEVELS.map(L => h('tr', {}, h('td', { text: L.name }), h('td', { text: `基礎の ${L.k} 倍` }), h('td', { text: `基礎の ${L.holdK} 倍` }), h('td', { text: L.hints ? '表示' : 'なし' })))));
      const ol = h('ol');
      for (const st of l.steps) {
        const li = h('li', {}, h('b', { text: st.name }));
        if (st.say) li.append(h('div', { class: 'small', text: SC.fillText(st.say, { alt0: 3000, hdg0: 90, av: { crs: 360 }, V: A.v, last: null, callShort: A.short + ' 7LA' }) }));
        const gt = st.g ? (typeof st.g === 'string' ? st.g : SC.guideText(P.newState({ aircraft: A.id }), st.g, { alt0: 3000 })) : '';
        if (gt) li.append(h('div', { class: 'sch-guide', text: gt }));
        if (st.hold) li.append(h('div', { class: 'small mute', text: `基準内を連続 ${Math.round(st.hold * lv.holdK)} 秒（${lv.name}）で次へ` }));
        ol.append(li);
      }
      box.append(h('h3', { text: '飛行の流れ（教官の指示と目安）' }), ol,
        h('p', { class: 'sch-note', text: '指示の出し方は実際の訓練と同じです：教官は「目標（速度・高度・昇降率）」を言い、最初の姿勢と出力は「目安」として示します。目安の数字はこの機体モデルの計算値で、重さ・風で変わる最初の見当です。姿勢を決めたら、計器の結果を見て 1〜2° ずつ直し、落ち着いたらトリム（T）を取ります。' }),
        h('p', { class: 'sch-note', text: '基準は FAA の実地試験基準（ACS）などを参考にした練習用の目安で、実際の試験基準・ANA や訓練校の基準ではありません。実際の手順・数値は教官と POH / AFM・チェックリストで確認してください。' }));
      if (l.book && BK) {
        const links = l.book.map(sid => BK.findSection(sid)).filter(Boolean);
        if (links.length) box.append(h('h3', { text: '教科書の関連する節' }), h('div', { class: 'row' }, ...links.map(x => btn(`${x.ch.n}. ${x.sec.t}`, () => { openPage('book'); openSection(x.sec.id); }))));
      }
      box.append(h('div', { class: 'sch-bar' }, h('button', { type: 'button', class: 'sch-go', onclick: () => app.startLesson(id, S.prefs.level) }, `訓練を始める（${lv.name}）`), rec ? h('span', { text: `挑戦 ${rec.tries} 回・最高評価 ${rec.best || '―'}${rec.pass ? '・合格済み（' + rec.levels.map(levelName).join('・') + '）' : ''}` }) : null));
    }

    // ============================================================== the debrief
    function showDebrief(L) {
      app.openScreen('debrief');
      const body = $('#sd-body'); body.textContent = '';
      $('#sd-title').textContent = `${L.def.title}（${L.level.name}）：${L.passed ? '合格' : L.reason ? '中止' : '不合格'}`;
      $('#sd-grade').textContent = L.grade; $('#sd-grade').className = 'sd-grade ' + (L.passed ? 'ok' : 'ng');
      $('#sd-sub').textContent = L.reason ? `理由：${L.reason}` : L.passed ? 'すべての項目が基準内でした。次のレベルや次の課目へ進みましょう。' : '基準に届かなかった項目（×）があります。下の講評を確認して、もう一度挑戦しましょう。';
      const bad = [];
      for (const r of L.results) {
        body.append(h('h3', { text: r.step }));
        const t = h('table', { class: 'sd-t' });
        for (const row of r.rows) { t.append(h('tr', { class: row.pass ? 'ok' : 'ng' }, h('td', { text: row.pass ? '○' : '×' }), h('td', { text: row.name }), h('td', { text: row.val }), h('td', { text: row.std }))); if (!row.pass) bad.push([r.step, row]); }
        body.append(t);
      }
      if (!L.results.length) body.append(h('p', { text: '採点できる項目がありませんでした。' }));
      if (bad.length) body.append(h('div', { class: 'sd-advice', html: '<b>次に意識すること：</b>' + esc(advice(bad)) }));
      body.append(h('p', { class: 'note', text: SC.RECORD_NOTE + '　この結果は学習記録に自動で保存されました。' }));
      const order = SC.lessonOrder().filter(id => SC.lesson(id).steps), nextId = order[order.indexOf(L.id) + 1];
      $('#sd-next').hidden = !L.passed || !nextId;
      $('#sd-next').onclick = () => app.startLesson(nextId, S.prefs.level);
      $('#sd-retry').onclick = () => app.startLesson(L.id, L.level.id);
      $('#sd-menu').onclick = () => openSchool(L.id);
      $('#sd-memo').value = '';
      $('#sd-save').onclick = () => { const all = SC.loadRecords(store), r = all.find(x => x.id === S.recId); if (r) { r.memo = $('#sd-memo').value; SC.saveRecords(store, all); toast('メモを保存しました（正式な飛行日誌ではありません）', 2000, 'good'); } };
      setTimeout(() => ($('#sd-next').hidden ? $('#sd-retry') : $('#sd-next')).focus(), 30);
    }
    // one or two sentences of advice from the failed rows (what a real instructor would say first)
    function advice(bad) {
      const names = bad.map(b => b[1].name).join(' ');
      const tips = [];
      if (/高度/.test(names)) tips.push('高度：姿勢を先に決め、昇降率が 0 に近づいてからトリム（T）。50 ft ずれたら 1〜2° で戻す');
      if (/速度|浮揚速度|接地の速度/.test(names)) tips.push('速度：その場面で速度を決めるのは機首か出力か（上昇・進入・滑空は機首）を思い出す');
      if (/針路|ロールアウト|航跡/.test(names)) tips.push('針路：ロールアウトはバンク角の半分くらい手前から。旋回中も高度計を見る');
      if (/バンク/.test(names)) tips.push('バンク：A / D は短く押して止める。目標のバンクになったら操作をやめる');
      if (/降下率|昇降率/.test(names)) tips.push('昇降率：出力で直す（パワーを 100 rpm 変えると約 100 fpm）');
      if (/接地/.test(names) && /降下率/.test(names)) tips.push('接地：地上 10〜15 ft から S を少しずつ。沈みが速ければ早めに・強めに');
      if (/センターライン|横流れ|機首方向/.test(names)) tips.push('センターライン：ラダー（Q / E）で機首、エルロン（A / D）で横の流れを止める');
      if (/フェザー/.test(names)) tips.push('片発：Dead foot, dead engine。踏んでいない足の側を、確かめてから [ / ] でフェザー');
      if (/連続保持/.test(names)) tips.push('連続保持：すべての目標を同時に基準内に。どれか 1 つが外れると 0 に戻るので、大きく直さず小さく');
      if (/失速|高度損失|回復/.test(names)) tips.push('失速：まず W で機首を下げる（迎え角を減らす）。速度が付く前に引かない');
      if (/応答|チェックリスト/.test(names)) tips.push('交信：滑走路・高度・針路の数字を含めて復唱');
      return tips.slice(0, 3).join('。') || '基準外の項目の数字を見て、どの操作が足りなかったかを考えてから、もう一度。';
    }

    // ============================================================== pages
    let pageId = null, back = null;
    function openPage(id) {
      back = S.screen === 'pause' ? 'pause' : S.screen === 'school' ? 'school' : 'menu';
      app.openScreen('page'); pageId = id;
      const titles = { book: '教科書', quiz: '学科テスト', guide: '操作ガイド', tutor: 'G1000 型 PFD の読み方', readq: 'PFD の読み取り練習', sfb: 'Sanford（KSFB）と英語の交信', records: '学習記録', g3d: 'Google Photorealistic 3D Tiles（任意）', about: 'このアプリについて' };
      $('#pageTitle').textContent = titles[id] || '';
      $('#pageTools').textContent = '';
      const body = $('#pageBody'); body.textContent = ''; body.className = 'page-body'; body.scrollTop = 0;
      $('#pageClose').onclick = closePage;
      ({ book: renderBook, quiz: renderQuizList, guide: renderGuide, tutor: renderTutor, readq: renderReadQuiz, sfb: renderSanford, records: renderRecords, g3d: renderG3d, about: renderAbout }[id] || (() => {}))(body);
    }
    function closePage() {
      if (S.speechOn && 'speechSynthesis' in window) speechSynthesis.cancel();
      if (back === 'pause') { app.openScreen('pause'); $('#pause').hidden = false; }
      else if (back === 'school') openSchool(S.lastLessonId);
      else openMenu();
    }

    // ------------------------------------------------------------ the textbook
    let curSec = null;
    function renderBook(body) {
      if (!BK) { body.append(h('p', { text: '教科書のデータがありません。' })); return; }
      body.className = 'page-body split';
      const q = h('input', { type: 'search', placeholder: '本文を検索（例：失速、Vmc、METAR）', 'aria-label': '教科書を検索', style: 'min-width:240px' });
      const prog = h('span', { class: 'small mute', id: 'bkProg' });
      $('#pageTools').append(q, prog);
      const nav = h('nav', { class: 'bk-nav', id: 'bkNav', 'aria-label': '目次' }), art = h('article', { class: 'bk-art', id: 'bkArt' });
      body.append(nav, art);
      const drawNav = (filter) => {
        nav.textContent = '';
        const f = (filter || '').trim().toLowerCase();
        for (const part of BK.PARTS) {
          const chs = BK.CHAPTERS.filter(c => c.part === part.id); if (!chs.length) continue;
          nav.append(h('h3', { text: part.title }));
          for (const c of chs) for (const s of c.secs) {
            if (f && !(s.t + ' ' + BK.text(s)).toLowerCase().includes(f) && !c.t.toLowerCase().includes(f)) continue;
            nav.append(h('button', { type: 'button', class: 'bk-item' + (S.progress.read.includes(s.id) ? ' done' : '') + (s.id === curSec ? ' sel' : ''), onclick: () => openSection(s.id) }, h('span', { class: 'bk-num', text: `${c.n}.${c.secs.indexOf(s) + 1}` }), h('span', { text: s.t })));
          }
        }
        if (!nav.querySelector('.bk-item')) nav.append(h('p', { class: 'mute small', text: '見つかりませんでした。' }));
        const total = BK.CHAPTERS.reduce((a, c) => a + c.secs.length, 0);
        prog.textContent = `読んだ節 ${S.progress.read.filter(id => BK.findSection(id)).length} / ${total}`;
      };
      q.addEventListener('input', () => drawNav(q.value));
      drawNav('');
      openSection(curSec || BK.CHAPTERS[0].secs[0].id);
    }
    function openSection(id) {
      const x = BK.findSection(id); if (!x) return;
      curSec = id;
      if (!S.progress.read.includes(id)) { S.progress.read.push(id); save(); }
      const art = $('#bkArt'); if (!art) return;
      const { ch, sec } = x, i = ch.secs.indexOf(sec);
      art.innerHTML = '';
      art.append(h('div', { class: 'bk-chap', text: `第 ${ch.n} 章　${ch.t}（${i + 1} / ${ch.secs.length}）` }), h('h2', { class: 'bk-title', text: sec.t }));
      if (i === 0 && ch.en) art.append(h('div', { class: 'bk-en', text: ch.en }));
      if (i === 0 && ch.summary) art.append(h('p', { html: '<b>この章で学ぶこと：</b>' + esc(ch.summary) }));
      art.append(h('div', { html: BK.html(sec) }));                      // static textbook content (trusted)
      // the chapter's end matter on its last section: terms, examples, cautions, the check questions, lessons, sources
      if (i === ch.secs.length - 1) {
        if (ch.terms && ch.terms.length) art.append(h('h3', { text: '英語の用語（English terms）' }), h('table', { class: 'terms' }, h('tr', {}, h('th', { text: 'English' }), h('th', { text: '日本語' }), h('th', { text: '補足' })), ...ch.terms.map(([en, jp, note]) => h('tr', {}, h('td', { class: 'en', text: en }), h('td', { text: jp }), h('td', { class: 'mute', text: note || '' })))));
        if (ch.examples && ch.examples.length) art.append(h('h3', { text: '例' }), h('ul', {}, ...ch.examples.map(t => h('li', { text: t }))));
        if (ch.cautions && ch.cautions.length) art.append(h('h3', { text: '注意' }), h('ul', {}, ...ch.cautions.map(t => h('li', { text: t }))));
        if (ch.quiz && ch.quiz.length) {
          art.append(h('h3', { text: '確認問題' }));
          ch.quiz.forEach((qq, qi) => {
            const name = `q_${ch.id}_${qi}`, res = h('div', { class: 'res' });
            const box = h('div', { class: 'quiz' }, h('div', {}, h('b', { text: `問 ${qi + 1}. ` }), qq.q),
              ...qq.choices.map((c, k) => h('label', { class: 'ch' }, h('input', { type: 'radio', name, value: k }), ' ', c)),
              btn('答え合わせ', () => {
                const sel = box.querySelector(`input[name="${name}"]:checked`); if (!sel) { res.className = 'res'; res.textContent = '選択肢を選んでください。'; return; }
                const ok = +sel.value === qq.answer;
                res.className = 'res ' + (ok ? 'ok' : 'ng'); res.textContent = `${ok ? '正解' : '不正解'}（正答：${qq.choices[qq.answer]}）— ${qq.why}`;
                const key = `${ch.id}.${qi}`; if (ok) { S.progress.bookQuiz[key] = 100; save(); }
              }), res);
            art.append(box);
          });
        }
        if (ch.lessons && ch.lessons.length) art.append(h('h3', { text: 'この章に対応する飛行課目' }), h('div', { class: 'row' }, ...ch.lessons.map(id => SC.lesson(id)).filter(Boolean).map(l => btn(l.title, () => app.startLesson(l.id, S.prefs.level)))));
        if (ch.refs && ch.refs.length) art.append(h('h3', { text: '出典・参考資料（外部リンク・オンライン時）' }), h('ul', { class: 'bk-src' }, ...ch.refs.map(r => h('li', {}, h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, r.label), r.note ? ` — ${r.note}` : ''))));
      }
      // navigation
      const flat = BK.CHAPTERS.flatMap(c => c.secs.map(s => s.id)), k = flat.indexOf(id);
      art.append(h('div', { class: 'row', style: 'margin-top:20px' }, k > 0 ? btn('← 前の節', () => openSection(flat[k - 1])) : null, k < flat.length - 1 ? btn('次の節 →', () => openSection(flat[k + 1]), 'primary') : null));
      art.append(h('p', { class: 'note', text: '本文は公開情報に基づく要約と教材の説明です。数値は仮想教材値または出典のある参考値（機体ごとに要確認）。実機訓練・教官・POH/AFM・SOP・航空法規を優先してください。' }));
      // the "try it in the simulator" buttons and the figure calculators inside the section
      for (const b of art.querySelectorAll('[data-lesson]')) b.addEventListener('click', () => app.startLesson(b.dataset.lesson, S.prefs.level));
      for (const b of art.querySelectorAll('[data-sec]')) b.addEventListener('click', () => openSection(b.dataset.sec));
      if (BK.wire) BK.wire(art);
      art.scrollTop = 0;
      for (const b of document.querySelectorAll('#bkNav .bk-item')) b.classList.toggle('sel', b.querySelector('.bk-num') && b.lastChild.textContent === sec.t);
      const nb = [...document.querySelectorAll('#bkNav .bk-item')].find(b => b.classList.contains('sel')); if (nb) { nb.classList.add('done'); nb.scrollIntoView({ block: 'nearest' }); }
    }

    // ------------------------------------------------------------ the ground-school tests
    function renderQuizList(body) {
      if (!QZ) return;
      body.append(h('p', { text: '学科の確認テストです。4 択で、答えるたびに解説が出ます。80% 以上で合格（この端末に記録）。出題順と選択肢の順は毎回変わります。' }));
      const grid = h('div', { class: 'qbanks' });
      for (const b of QZ.BANKS) {
        const best = S.progress.quiz[b.id];
        grid.append(h('button', { type: 'button', class: 'mission', onclick: () => runQuiz(b.id) }, h('span', { class: 'code', text: best != null ? best + '%' : '—' }), h('span', { class: 'm-title', text: b.title }), h('span', { class: 'm-sub', text: `${b.qs.length} 問。${b.desc || ''}` })));
      }
      body.append(grid);
    }
    function runQuiz(id) {
      const b = QZ.BANKS.find(x => x.id === id); if (!b) return;
      const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
      const qs = shuffle(b.qs).map(q => { const idx = shuffle(q[1].map((_, i) => i)); return { q: q[0], opts: idx.map(i => q[1][i]), ok: idx.indexOf(q[2]), why: q[3] }; });
      const Z = { qs, i: 0, right: 0, answered: false };
      $('#pageTitle').textContent = '学科テスト：' + b.title;
      const body = $('#pageBody');
      const draw = () => {
        body.textContent = '';
        if (Z.i >= Z.qs.length) {
          const pct = Math.round(Z.right / Z.qs.length * 100), pass = pct >= 80;
          S.progress.quiz[b.id] = Math.max(S.progress.quiz[b.id] || 0, pct); save();
          body.append(h('p', { class: 'sq-result ' + (pass ? 'ok' : 'ng'), text: `${Z.right} / ${Z.qs.length} 問正解（${pct}%）… ${pass ? '合格' : '不合格（80% 以上で合格）'}` }),
            h('div', { class: 'row' }, btn('もう一度', () => runQuiz(id), 'primary'), btn('テストの一覧へ', () => openPage('quiz')), b.book && BK ? btn('関連する教科書へ', () => { openPage('book'); openSection(b.book); }) : null));
          return;
        }
        const q = Z.qs[Z.i];
        body.append(h('p', { class: 'mute small', text: `${Z.i + 1} / ${Z.qs.length}` }), h('p', { class: 'sq-q', text: q.q }));
        const list = h('div', { class: 'sq-opts' }); body.append(list);
        q.opts.forEach((o, i) => list.append(h('button', { type: 'button', onclick: () => {
          if (Z.answered) return; Z.answered = true;
          const ok = i === q.ok; if (ok) Z.right++;
          [...list.children].forEach((x, j) => { x.classList.toggle('ok', j === q.ok); x.classList.toggle('ng', j === i && !ok); x.disabled = true; });
          body.append(h('p', { class: 'sq-why ' + (ok ? 'ok' : 'ng'), text: (ok ? '正解。' : '不正解。') + q.why }));
          const n = btn(Z.i + 1 < Z.qs.length ? '次の問題' : '結果を見る', () => { Z.i++; Z.answered = false; draw(); }, 'primary'); body.append(n); n.focus();
        } }, o)));
      };
      draw();
    }

    // ------------------------------------------------------------ the guide
    function renderGuide(body) {
      const tabs = [['keys', '操作（キーボード）'], ['pad', 'ゲームパッド'], ['screen', '画面の見方'], ['fly', '飛び方の基本'], ['numbers', '数値の目安']];
      const bar = h('div', { class: 'tabs', role: 'tablist' }), pane = h('div');
      body.append(bar, pane);
      const show = id => { for (const b of bar.children) b.classList.toggle('on', b.dataset.t === id); pane.textContent = ''; GUIDE[id](pane); };
      for (const [id, t] of tabs) bar.append(h('button', { type: 'button', 'data-t': id, onclick: () => show(id) }, t));
      show('keys');
    }
    const GUIDE = {
      keys(p) {
        p.append(h('p', { text: '空島フライトと同じキー配置です。表の「何のために」は、実際の操縦でその操作を使う理由です。迷ったら飛行中に H キーで、いまの項目で使うキーが強調された説明を出せます。' }));
        const rows = [
          ['S / ↓', '機首を上げる（エレベーター）', '操縦桿を手前に引く操作。上昇・減速・フレア（着陸の引き起こし）・ローテーション（離陸）に使う。押している間だけ機首の角度が上がり、離すとその角度を保つ（「ピッチ保持」。メニューで「離すと中立」に変更可）。', '操縦桿（ヨーク）を引く'],
          ['W / ↑', '機首を下げる', '操縦桿を押す操作。降下・加速・失速からの回復（迎え角を減らす）に使う。', 'ヨークを押す'],
          ['A / D（← / →）', '左右に傾ける（エルロン）', '傾けた方向へ旋回する。目標のバンクになったら離す（キーを離すと操縦桿は中立に戻るが、傾きは残る＝本物と同じ）。地上では前輪にも少し効く。', 'ヨークを回す'],
          ['Q / E', 'ラダー（方向舵）・前輪の操向', '機首を左右に振る。旋回では逆ヨーを打ち消してボールを中央に。離陸・上昇ではプロペラの左偏向で右ラダー（E）。地上ではまっすぐ走る・曲がる。片発では生きている側を踏む。', 'ラダーペダル'],
          ['R / F（PageUp / PageDown）・Shift+R / Shift+F', 'スロットル（エンジン出力）', '押している間だけ出力が上下する（最初はゆっくり、押し続けると速く）。Shift+R で全開、Shift+F でアイドルに一気に動かす（離陸・ゴーアラウンド・離陸中止）。水平飛行では速度、上昇・降下では昇降率を決める。', 'スロットルレバー'],
          ['T / Shift+T', 'トリム / トリムを中立へ', 'いまの速度で手を離しても姿勢が続くように合わせる。操縦の力を消すので、正確に・疲れずに飛べる。速度や出力を変えたら取り直す。', 'トリムホイール'],
          ['V / Shift+V', 'フラップを 1 段下げる / 上げる', '揚力と抗力が増え、遅く・深い角度で降りられる。速度計の白い帯（Vfe 以下）でだけ使う。Archer は UP・10°・25°・40°。', 'フラップレバー'],
          ['G', '脚（ランディングギア）の上げ下げ', 'Seminole だけ。上げると抗力が減る。正の上昇を確認してから上げ、着陸前に必ず下げる（緑のランプ 3 つ）。', 'ギアレバー'],
          ['B / Space', 'ブレーキ（押している間）', '地上で減速・停止。離陸中止や短距離着陸で強く使う。', 'トーブレーキ'],
          ['[ / ]', '左 / 右のプロペラをフェザー（双発）', '止まったエンジンのプロペラの羽根を風に平行にして、抗力を減らす。Identify（踏んでいない足の側）→ Verify（確認）→ Feather の順。生きている側を止めると両発停止。', 'プロペラレバー（フェザー位置）'],
          ['Z / X', 'ラダートリム 左 / 右', '片発などで、ラダーを踏み続ける力を消す。', 'ラダートリム'],
          ['Enter', 'チェックリストの次の項目', '点検の項目を 1 つずつ確認する。条件のある項目は、その状態（フラップ UP など）にしてから。', 'チェックリストを読み上げる'],
          ['1 / 2 / 3', '管制への応答（復唱）を選ぶ', '管制の指示を正しく復唱する。滑走路・高度・針路の数字を含める。', '無線で復唱'],
          ['U', '自動ラダー ON / OFF', 'ON：ボールを自動で中央に保つ（初心者向けの補助）。OFF：本物と同じく自分で。片発の課目では OFF になる。', '—'],
          ['C', '視点（操縦席 / 後方）', '操縦席は本物の見え方。後方は機体の姿勢や舵面・脚・プロペラの動きを外から確かめられる。', '—'],
          ['H', '操作の説明を表示', 'いまの項目で使うキーを強調表示。', '—'],
          ['P / Esc', '一時停止', '再開・やり直し・課程表・ガイド・教科書へ。', '—'],
          ['L', '水平に戻す（自由飛行のみ）', '数秒間、自動で翼を水平・水平飛行に戻す教材補助。', '—'],
        ];
        p.append(h('table', { class: 'gt' }, h('tr', {}, h('th', { text: 'キー' }), h('th', { text: '動くもの' }), h('th', { text: '何のために・いつ使う' }), h('th', { text: '実機では' })), ...rows.map(r => h('tr', {}, h('td', {}, h('kbd', { text: r[0] })), h('td', {}, h('b', { text: r[1] })), h('td', { text: r[2] }), h('td', { class: 'mute', text: r[3] })))));
        p.append(h('h3', { text: '「中立」と「保持」' }), h('p', { text: 'キーは押している間だけ操縦桿を動かし、離すと中立に戻ります（ラダー・エルロン）。機首の上げ下げ（W / S）は標準で「ピッチ保持」：押している間に目標の機首角度が動き、離すとその角度を飛行機が保ちます（空島フライトと同じ）。本物の操縦桿に近い「離すと中立」にも変えられます（メニューの操作の設定）。どちらでも、トリム（T）を取ると手を離した状態が楽になります。' }),
          h('h3', { text: '操作の感度' }), h('p', { text: '低・中・高で、キーやスティックを倒したときの舵の量が変わります。最初は「低」がおすすめ。低速ほど舵を大きく動かす（実機でも低速では舵の効きが鈍い）ように自動で補正しています。' }),
          h('h3', { text: '画面の右上（操作の状態）' }), h('p', { text: 'スロットル・機首（ピッチ保持の目標）・傾き・ラダー・トリム・フラップ・脚・ブレーキの「いまの状態」と、そのキーを常に表示します。下の小さな図は、操縦桿の位置（青い点）、ラダー（オレンジの点）、ボール（横滑り計：白い玉）です。' }));
      },
      pad(p) {
        p.append(h('p', { text: 'USB か Bluetooth でつなぎ、ボタンをどれか押すと認識されます（Chrome・Edge 推奨）。標準配置（standard mapping）の Xbox 系・PS5 DualSense を想定しています。フライトスティック等は機種ごとに軸の割り当てが異なります（要確認）。' }));
        const rows = [['左スティック', '操縦桿（手前で機首上げ、左右で傾ける）。中央付近は遊びがあり、倒すほど強く効く'], ['右スティック 左右 / LB・RB（L1・R1）', 'ラダー'], ['右スティック 上下 / 方向キー ↑↓', 'トリム'], ['RT / LT（R2 / L2）', 'スロットルを上げる / 下げる（深く押すほど速く）'], ['A（×）', 'ブレーキ（押している間）。チェックリストでは「次へ」'], ['B（○）/ X（□）', 'フラップを 1 段下げる / 上げる'], ['Y（△）', '視点の切替'], ['Back / View（クリエイト）', '脚の上げ下げ'], ['Start / Menu（オプション）', '一時停止'], ['方向キー ← / →', '左 / 右のプロペラをフェザー（双発）'], ['L3（左スティック押し込み）', '水平に戻す（自由飛行のみ）'], ['R3（右スティック押し込み）', '自動ラダー ON / OFF'], ['管制の応答（飛行中）', 'X / □＝1 番、B / ○＝2 番、Y / △＝3 番'], ['メニュー・課程表・教科書', '方向キー / 左スティックで選ぶ、A / × で決定、B / ○ で戻る']];
        p.append(h('table', { class: 'gt' }, ...rows.map(r => h('tr', {}, h('td', { text: r[0] }), h('td', { text: r[1] })))));
      },
      screen(p) {
        const rows = [['左上：教官パネル', '項目の番号と名前、教官の指示（何をするか）、使うキー、目安（最初の姿勢と出力。導入・基礎レベル）、目標値のチップ（緑＝基準内の余裕あり、黄＝基準ぎりぎり、赤＝基準外）、連続保持のバー（基準内が続くと伸び、外れると 0 に戻る）、教官のヒント。'],
          ['右上：操作の状態', '各操作のキーと「いまの状態」。迷ったら H キーで全部のキーの説明。'],
          ['下：G1000 型パネル', '左が PFD（主飛行表示：速度・姿勢・高度・昇降率・方位・CDI・予備計器）、中央がオーディオパネル（COM / NAV の周波数・送信はできない）、右が MFD（エンジン表示と地図・飛行計画）。ボタンはマウスで押せます。「G1000型配置と基本概念を学ぶ教材」で、Garmin 製品の再現ではありません。'],
          ['外部視界', '教材用の架空の平らな地面と LAB RWY 36（架空）。PAPI（左側の 4 つの灯）：赤 2 白 2 で 3° の進入角。白が多いと高い、赤が多いと低い。'],
          ['ボタン（右下）', 'メニュー（一時停止）・操作の説明・視点・一時停止・音・配置（外部視界と計器の大きさ）。']];
        p.append(h('table', { class: 'gt' }, ...rows.map(r => h('tr', {}, h('td', {}, h('b', { text: r[0] })), h('td', { text: r[1] })))), btn('PFD を 1 つずつ説明するチュートリアルへ', () => openPage('tutor'), 'primary'));
      },
      fly(p) {
        p.append(h('h3', { text: '姿勢＋出力＝性能' }), h('p', { text: '機首の角度（ピッチ）と出力（スロットル）を決めれば、速度と昇降率が決まります。まず「目安」の姿勢と出力を作り、計器の結果を見て 1〜2° ずつ直し、落ち着いたらトリム。' }),
          h('h3', { text: '何で何を直すか' }),
          h('table', { class: 'gt' }, h('tr', {}, h('th', { text: '場面' }), h('th', { text: '速度を直すのは' }), h('th', { text: '高度・降下率を直すのは' })),
            ...[['水平飛行・巡航', 'スロットル（R / F）', '機首（W / S）'], ['上昇（全開）', '機首（速いなら上げる）', '—（出力は全開のまま）'], ['滑空（エンジン停止）', '機首だけ', '—（降りる場所を変えるしかない）'], ['進入（3° の降下）', '機首', 'スロットル（PAPI・GS を見る）'], ['低速飛行', '機首', 'スロットル（低速では逆転）']].map(r => h('tr', {}, ...r.map(t => h('td', { text: t }))))),
          h('h3', { text: '離陸' }), h('p', { text: 'R を押し続けて全開。機首が左へ振られたら E（右ラダー）でセンターラインへ。Vr（Archer 60 kt）で S を押して機首を約 8° 上げる。浮いたら Vy（76 kt）で上昇。' }),
          h('h3', { text: '着陸' }), h('p', { text: '70 kt・PAPI 赤 2 白 2。滑走路の端を越えたら F でアイドル。地上 10〜15 ft で S を少しずつ押して機首を上げる（フレア）。主輪から接地したら B でブレーキ、Q / E でまっすぐ。' }),
          h('h3', { text: '旋回' }), h('p', { text: 'A / D で傾け、目標のバンクで離す。高度が下がるので S で少し引き、パワーを少し足す。ボールがずれたらずれた側のラダー（ボールを踏む）。ロールアウトはバンク角の半分手前から。' }),
          h('h3', { text: '片発（Seminole）' }), h('p', { text: 'まず方向（ラダー）。機首が振られる側と反対の足を踏む。速度は青線 Vyse（88 kt）。踏んでいない足の側が止まったエンジン（Dead foot, dead engine）→ 確認 → [ / ] でフェザー。生きている側へ 2〜5° バンク、Z / X でラダートリム。' }));
      },
      numbers(p) {
        const A = P.AIRCRAFT;
        p.append(h('p', { text: '教材の機体モデルの参考速度（KIAS）。出典：Archer は公開されている Archer III G1000 の訓練用チェックリスト（2025）、Seminole は公開されている PA-44 の操縦要領（Southeastern Oklahoma State University）。Vso・Vno・Vne など一部は教材値。実機の値は機体ごとに要確認（POH / AFM が優先）。' }));
        const sp = [['Vr（ローテーション）', 'rotate'], ['Vx（最良上昇角）', 'x'], ['Vy（最良上昇率）', 'y'], ['最良滑空', 'glide'], ['進入（ファイナル）', 'appr'], ['Va（設計運動速度）', 'va'], ['Vfe（フラップ下げ最大）', 'fe'], ['Vno（最大構造巡航）', 'no'], ['Vne（超過禁止）', 'ne'], ['Vmc（赤線・最小操縦速度）', 'mc'], ['Vyse（青線・片発の最良上昇率）', 'yse'], ['Vxse（片発の最良上昇角）', 'xse'], ['Vsse（片発訓練の最低速度）', 'sse'], ['Vso / Vs1（失速：着陸形態 / 通常）', 's0']];
        p.append(h('table', { class: 'gt' }, h('tr', {}, h('th', { text: '速度' }), ...A.map(a => h('th', { text: a.short }))), ...sp.map(([n, k]) => h('tr', {}, h('td', { text: n }), ...A.map(a => h('td', { text: k === 's0' ? `${a.v.s0} / ${a.v.s1}` : a.v[k] != null ? String(a.v[k]) : '—' }))))));
        p.append(h('h3', { text: '姿勢と出力の目安（この教材モデルの計算値・3,000 ft）' }));
        const rows = [];
        for (const a of A) {
          const s = P.newState({ aircraft: a.id }), V = a.v;
          const cases = [['水平飛行（巡航）', V.cruise, 0, {}], ['水平飛行 90 kt', 90, 0, {}], ['上昇（全開・Vy）', V.y, null, { pwr: 'full' }], ['降下 500 fpm', 90, -500, {}], ['滑空（エンジン停止）', V.glide, null, { pwr: 'dead' }], ['進入 3°', V.appr, -Math.round(V.appr * 5.3), { flaps: V.apprFlaps, gear: true }]];
          if (a.twin) cases.push(['片発 Vyse（脚 UP・フェザー）', V.yse, null, { pwr: 'full', oei: true }]);
          for (const [n, kt, fpm, o] of cases) { const ss = P.steadyState(s, kt, fpm || 0, { altFt: 3000, ...o }); rows.push([a.short, n, `${kt} kt`, o.pwr === 'dead' ? '停止' : o.pwr === 'full' ? '全開' : `${Math.round(ss.thr * 100)}%`, `${ss.pitch >= 0 ? '+' : ''}${ss.pitch.toFixed(1)}°`, `${Math.round(ss.fpm / 10) * 10} fpm`]); }
        }
        p.append(h('table', { class: 'gt' }, h('tr', {}, ...['機体', '状態', '速度', '出力', 'ピッチ', '昇降率'].map(t => h('th', { text: t }))), ...rows.map(r => h('tr', {}, ...r.map(t => h('td', { text: t }))))),
          h('p', { class: 'note', text: '「教材モデルの計算値」は、このアプリの飛行モデル（空島フライトから移植した翼素モデル）の釣り合いの計算です。実機の数値ではありません。' }));
      },
    };

    // ------------------------------------------------------------ the G1000-type PFD tutorial
    const TUT = [
      { t: 'PFD の全体', a: null, txt: 'G1000 型の PFD（Primary Flight Display：主飛行表示）は、昔の 6 つの丸い計器（速度・姿勢・高度・旋回・方位・昇降率）を 1 枚の画面にまとめたものです。中央が姿勢、左が速度、右が高度と昇降率、下が方位（HSI）。視線は中央の姿勢を中心に、放射状に動かします。', st: {} },
      { t: '① 姿勢表示（中央）', a: [0.27, 0.12, 0.40, 0.48], txt: '青が空、茶が地面、白い線が水平線。黄色い記号が自分の機体です。記号が水平線の上なら機首上げ。目盛りは 2.5° ごと、数字は 10° ごと。上の弧はバンク（傾き）の目盛りで、10・20・30・45・60°。三角の下の台形が「ボール（横滑り計）」で、ずれた側のラダーを踏んで中央へ。', st: { pitch: 6, bank: 20 } },
      { t: '② 速度テープ（左）', a: [0.06, 0.12, 0.16, 0.50], txt: '速度（指示対気速度・kt）。数字の枠がいまの速度。テープの色の帯：白＝フラップを使える範囲（上端 Vfe）、緑＝通常の範囲（下端 Vs1・上端 Vno）、黄＝穏やかな空気のときだけ、赤＝超過禁止（Vne）。R・X・Y・G の印は Vr・Vx・Vy・最良滑空。双発では赤線（Vmc）と青線（Vyse）。', st: { ias: 76 } },
      { t: '③ 高度テープ（右）', a: [0.74, 0.12, 0.14, 0.50], txt: '高度（ft）。数字の枠がいまの高度。上の水色の数字は選択高度（ALT、目標として自分で設定する）。下の BARO は高度計規正値（その地域の気圧に合わせる。合わせないと高度がずれる）。', st: { alt: 3020 } },
      { t: '④ 昇降計（右端）', a: [0.88, 0.12, 0.10, 0.50], txt: '上昇・降下の速さ（fpm：1 分あたりの ft）。矢印が上なら上昇中。水平飛行ではここを 0 に保つと高度が保てる。数字は 50 fpm 単位。', st: { vs: 500 } },
      { t: '⑤ HSI（方位と CDI）', a: [0.30, 0.60, 0.36, 0.40], txt: '上の数字がいまの機首方位（磁方位）。水色の印は HDG バグ（目標の針路を自分で設定）。真ん中の矢印がコース（CRS）、その中央の動く線が CDI（コースからのずれ）。マゼンタは GPS、緑は VOR / LOC。針が右なら右へ修正（針の方へ）。目盛りは片側 2 ドット（VOR は 1 ドット 5°、ローカライザーは約 1.25°、GPS は 2 ドットで 1.0 NM）。', st: { hdg: 90 } },
      { t: '⑥ 上のバー（NAV / COM・区間）', a: [0, 0, 1, 0.07], txt: '左が NAV1（使用中 ↔ 予備）、右が COM1、中央が GPS の飛行計画の区間（どこからどこへ・距離・DTK＝予定の方位）。', st: {} },
      { t: '⑦ 予備計器（右下）', a: [0.78, 0.70, 0.22, 0.30], txt: '主の表示が故障したときに使う予備の姿勢・速度・高度。課目「部分パネル（AHRS 故障）」で使います。', st: {} },
      { t: '⑧ エンジンの状態（左下）と警報', a: [0, 0.64, 0.25, 0.12], txt: 'この教材では PFD の左下にエンジンの状態（RUN / STOP、回転数）を表示します（実機の G1000 では MFD 側）。失速が近いと中央に STALL の赤い表示（と警報音）。', st: { stall: true } },
      { t: '⑨ MFD（右の画面）', a: null, mfd: true, txt: 'MFD（Multi-Function Display）。左の帯がエンジン表示（回転数・出力・燃料流量・燃料。教材が計算していない値は「—」＝未実装）。右は地図（MAP）か飛行計画（FPL）。地図の上の帯に GS（対地速度）・DTK・TRK（実際に進んでいる方向）・ETE（到着までの時間）・XTK（航路外れ）。', st: {} },
    ];
    let tutI = 0;
    function demoState(st) {
      const s = P.newState({ aircraft: 'pa28' }); P.placeInAir(s, 7000, -37500, st.alt || 3000, AV.magToTrue(st.hdg || 90, P.MAGVAR_W), st.ias || 100, 0, 0, null);
      if (st.pitch != null || st.bank != null) { s.q = P.qFromHPB(AV.magToTrue(st.hdg || 90, P.MAGVAR_W), st.pitch || 0, st.bank || 0); }
      if (st.vs) s.vel[1] = st.vs / 196.85;
      P.derive(s); if (st.stall) s.out.stallWarn = true;
      const av = AV.createAvionics(); av.baro = 29.92; av.altSel = 3000; av.hdgBug = 120;
      return { o: s.out, av, nav: AV.navSolve(av, P.ne(s), s.out, P.MAGVAR_W, P.LAB_RWY), varW: P.MAGVAR_W, qnh: 29.92, eng: [{ run: true, rpm: s.rpm }], V: s.A.v, fuelCap: s.A.fuelCap, pos: P.ne(s) };
    }
    function renderTutor(body) {
      const cv = h('canvas', { width: 960, height: 600 }), txt = h('div');
      body.append(h('div', { class: 'tut' }, cv, txt));
      const draw = () => {
        const T = TUT[tutI], g = cv.getContext('2d'), W = 640, H = 400; g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
        const d = demoState(T.st); if (T.mfd) AV.drawMFD(g, W, H, d); else AV.drawPFD(g, W, H, d);
        if (T.a) { g.strokeStyle = '#ffb547'; g.lineWidth = 3; g.setLineDash([8, 5]); g.strokeRect(T.a[0] * W + 2, T.a[1] * H + 2, T.a[2] * W - 4, T.a[3] * H - 4); g.setLineDash([]); }
        txt.textContent = '';
        txt.append(h('div', { class: 'eyebrow', text: `${tutI + 1} / ${TUT.length}` }), h('h3', { text: T.t }), h('p', { text: T.txt }),
          h('div', { class: 'row' }, btn('← 前へ', () => { if (tutI > 0) { tutI--; draw(); } }), btn(tutI < TUT.length - 1 ? '次へ →' : '終了（合格）', () => { if (tutI < TUT.length - 1) { tutI++; draw(); } else { const r = S.progress.lessons.k1 || { tries: 0, best: '', pass: false, levels: [] }; r.tries++; r.pass = true; r.best = 'S'; S.progress.lessons.k1 = r; save(); toast('チュートリアル完了。読み取り練習へ進みましょう', 2400, 'good'); openPage('readq'); } }, 'primary')),
          h('p', { class: 'note', text: 'G1000型配置と基本概念を学ぶ教材としての表示です（Garmin 製品の再現ではありません）。' }));
      };
      draw();
    }
    // ------------------------------------------------------------ the PFD reading practice
    function renderReadQuiz(body) {
      const R = { i: 0, right: 0, qs: [] };
      const rnd = (a, b, st = 1) => a + Math.round(Math.random() * (b - a) / st) * st;
      for (let i = 0; i < 10; i++) {
        const kind = ['ias', 'alt', 'hdg', 'vs', 'bank', 'pitchfix', 'altfix', 'cdi'][i % 8];
        const st = { ias: rnd(70, 130, 5), alt: rnd(1500, 6500, 100), hdg: rnd(10, 350, 10), vs: rnd(-10, 10) * 100, bank: rnd(-30, 30, 10), pitch: rnd(-5, 10) };
        let q, opts, ok;
        if (kind === 'ias') { q = '速度（指示対気速度）はいくつ？'; ok = `${st.ias} kt`; opts = [ok, `${st.ias + 10} kt`, `${st.ias - 10} kt`, `${st.ias + 20} kt`]; }
        else if (kind === 'alt') { q = '高度はいくつ？'; ok = `${st.alt.toLocaleString()} ft`; opts = [ok, `${(st.alt + 100).toLocaleString()} ft`, `${(st.alt - 200).toLocaleString()} ft`, `${(st.alt + 1000).toLocaleString()} ft`]; }
        else if (kind === 'hdg') { q = '機首方位（磁方位）は？'; ok = `${String(st.hdg).padStart(3, '0')}°`; opts = [ok, `${String((st.hdg + 180) % 360).padStart(3, '0')}°`, `${String((st.hdg + 30) % 360).padStart(3, '0')}°`, `${String((st.hdg + 330) % 360).padStart(3, '0')}°`]; }
        else if (kind === 'vs') { if (!st.vs) st.vs = 500; q = 'いまの昇降率は？'; ok = `${st.vs > 0 ? '上昇' : '降下'} 約 ${Math.abs(st.vs)} fpm`; opts = [ok, `${st.vs > 0 ? '降下' : '上昇'} 約 ${Math.abs(st.vs)} fpm`, '水平（0 fpm）', `${st.vs > 0 ? '上昇' : '降下'} 約 ${Math.abs(st.vs) * 2 + 100} fpm`]; }
        else if (kind === 'bank') { if (!st.bank) st.bank = 20; q = '機体はどちらに何度くらい傾いている？'; ok = `${st.bank > 0 ? '右' : '左'}に約 ${Math.abs(st.bank)}°`; opts = [ok, `${st.bank > 0 ? '左' : '右'}に約 ${Math.abs(st.bank)}°`, '水平（0°）', `${st.bank > 0 ? '右' : '左'}に約 ${Math.abs(st.bank) + 30}°`]; }
        else if (kind === 'pitchfix') { st.vs = -400; st.alt = 3000 - rnd(1, 3) * 50; q = `目標は高度 3,000 ft の水平飛行。いま必要な操作は？`; ok = '機首を 1〜2° 上げ（S を軽く）、昇降率を 0 に'; opts = [ok, '機首を下げる（W）', 'スロットルを絞る（F）', 'フラップを下げる（V）']; }
        else if (kind === 'altfix') { st.alt = 3000 + rnd(1, 3) * 50; st.vs = 300; q = '目標は高度 3,000 ft の水平飛行。いま必要な操作は？'; ok = '機首を 1〜2° 下げ（W を軽く）、昇降率を 0 に'; opts = [ok, '機首を上げる（S）', 'スロットルを全開（R）', 'ラダーを踏む（E）']; }
        else { q = 'CDI（HSI の中央の動く線）が中央より右にある。コースに戻るには？'; ok = '右へ旋回して針の方へ（針を追いかける）'; opts = [ok, '左へ旋回（針から離れる）', 'そのまま直進', '高度を上げる']; st.cdiR = true; }
        R.qs.push({ st, q, opts: opts.map(o => o).sort(() => Math.random() - 0.5), ok });
      }
      const cv = h('canvas', { width: 960, height: 600 }), side = h('div');
      body.append(h('div', { class: 'tut' }, cv, side));
      const draw = () => {
        side.textContent = '';
        if (R.i >= R.qs.length) {
          const pct = R.right * 10, pass = pct >= 80;
          if (pass) { const r = S.progress.lessons.k2 || { tries: 0, best: '', pass: false, levels: [] }; r.tries++; r.pass = true; r.best = pct === 100 ? 'S' : pct >= 90 ? 'A' : 'B'; S.progress.lessons.k2 = r; save(); }
          side.append(h('p', { class: 'sq-result ' + (pass ? 'ok' : 'ng'), text: `${R.right} / 10（${pct}%）… ${pass ? '合格' : '不合格（80% 以上で合格）'}` }), btn('もう一度（毎回変わる）', () => openPage('readq'), 'primary'));
          return;
        }
        const Q = R.qs[R.i], g = cv.getContext('2d'), W = 640, H = 400; g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
        const d = demoState(Q.st); if (Q.st.cdiR) d.nav = Object.assign({}, d.nav, { dots: 1.6, flag: '', toFrom: 'TO' });
        AV.drawPFD(g, W, H, d);
        side.append(h('div', { class: 'eyebrow', text: `${R.i + 1} / 10` }), h('p', { class: 'sq-q', text: Q.q }));
        const list = h('div', { class: 'sq-opts' }); side.append(list);
        Q.opts.forEach(o => list.append(h('button', { type: 'button', onclick: () => {
          if (Q.done) return; Q.done = true; const ok = o === Q.ok; if (ok) R.right++;
          [...list.children].forEach(x => { x.disabled = true; x.classList.toggle('ok', x.textContent === Q.ok); x.classList.toggle('ng', x.textContent === o && !ok); });
          side.append(h('p', { class: 'sq-why ' + (ok ? 'ok' : 'ng'), text: ok ? '正解。' : `不正解。正しくは「${Q.ok}」。` }), btn(R.i < 9 ? '次へ' : '結果', () => { R.i++; draw(); }, 'primary'));
        } }, o)));
      };
      draw();
    }

    // ------------------------------------------------------------ Sanford and English ATC
    function renderSanford(pg) {
      const tagOf = k => (k === '事実' ? 'fact' : k === '教材の要約' ? 'sum' : 'unk');
      pg.append(h('p', { class: 'small mute', text: '公開情報の要約と、架空のコールサインを使った練習用の台本です。実際の管制・周波数・手順の代わりにはなりません。実際の運航は最新のチャート・Chart Supplement・NOTAM・管制の指示に従ってください。' }));
      pg.append(h('h3', { text: '空港と運用（出典付き）' }), h('ul', {}, ...SF.FACTS.map(f => h('li', {}, h('span', { class: 'tag ' + tagOf(f.k), text: f.k }), f.t, ' ', SF.SRC[f.src] ? h('a', { class: 'small', href: SF.SRC[f.src].url, target: '_blank', rel: 'noopener noreferrer' }, `［${SF.SRC[f.src].label}］`) : null))));
      pg.append(h('h3', { text: '滑走路（長さは公開データ・配置は模式）' }), h('table', { class: 'terms' }, h('tr', {}, h('th', { text: '滑走路' }), h('th', { text: '長さ' }), h('th', { text: '注記' })), ...SF.RUNWAYS.map(r => h('tr', {}, h('td', { class: 'en', text: r.id }), h('td', { text: `${r.lenFt.toLocaleString()} ft` }), h('td', { text: r.note })))));
      pg.append(h('div', { class: 'diagram' }, h('h3', { text: '空港の模式図（模式図・NOT FOR NAVIGATION）' }), h('div', { html: SF.diagramSvg() }), h('p', { class: 'note', text: '位置関係を学ぶための模式図です。縮尺・形状・誘導路は正確ではありません。実際の Airport Diagram（FAA）を使ってください。' })));
      pg.append(h('h3', { text: '空域' }), h('div', { class: 'cards' }, ...SF.AIRSPACE.map(a => h('div', { class: 'card' }, h('h4', { text: a.name }), h('p', { class: 'small', text: a.jp }), h('p', { class: 'small en', text: a.en })))));
      pg.append(h('h3', { text: '英語 ATC：復唱の練習（音声合成・送信なし）' }), h('p', { class: 'small mute', text: `コールサイン「${SF.CALLSIGN.spoken}（${SF.CALLSIGN.short}）」は架空です。▶ で英語の音声（ブラウザ / OS の音声合成）を聞き、正しい復唱を選びます。音声認識・録音・送信はしません。` }));
      for (const sc of SF.SCENES) {
        const name = 'atc_' + sc.id, res = h('div', { class: 'res small' }), atc = h('div', { class: 'atc hidden', text: sc.atc });
        const play = h('button', { type: 'button', class: 'primary' }, '▶ 音声'); play.addEventListener('click', () => { S.speechOn = true; app.speak(sc.atc, play); });
        const card = h('div', { class: 'scene' }, h('h4', {}, sc.title, S.progress.atc[sc.id] ? h('span', { class: 'tag fact', style: 'margin-left:6px', text: '正解済み' }) : null),
          h('p', { class: 'small', text: '状況：' + sc.situation }), h('div', { class: 'row' }, play, btn('文字を表示 / 隠す', () => atc.classList.toggle('hidden'))), atc,
          h('div', { class: 'small mute', text: '正しい復唱（readback）は？' }),
          ...sc.options.map((o, i) => h('label', { class: 'ch', style: 'display:block' }, h('input', { type: 'radio', name, value: i }), ' ', h('span', { class: 'en', text: o }))),
          btn('答え合わせ', () => {
            const sel = card.querySelector(`input[name="${name}"]:checked`); if (!sel) { res.textContent = '選択肢を選んでください。'; return; }
            const ok = +sel.value === sc.answer; atc.classList.remove('hidden'); res.className = 'res small ' + (ok ? 'ok' : 'ng'); res.textContent = '';
            res.append(h('div', { text: `${ok ? '正解' : '不正解'}：正しい復唱は「${sc.options[sc.answer]}」` }), h('div', { text: '理由：' + sc.why }), h('div', { text: '聞き取れない・確信がないとき：' + sc.clarify }));
            S.progress.atc[sc.id] = S.progress.atc[sc.id] || ok; save();
          }), res,
          h('div', { class: 'small' }, '参考：', ...sc.refs.map(k => SF.SRC[k]).filter(Boolean).map(r => h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer', style: 'margin-right:8px' }, r.label))));
        pg.append(card);
      }
    }

    // ------------------------------------------------------------ the learning record
    let recSel = null;
    function download(name, text) { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
    function renderRecords(pg) {
      pg = pg || $('#pageBody'); pg.textContent = '';
      const recs = SC.loadRecords(store).slice().reverse();
      const file = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: async e => {
        const f = e.target.files[0]; if (!f) return;
        try { const j = SC.importJSON(await f.text()); SC.saveRecords(store, SC.mergeRecords(SC.loadRecords(store), j.records)); S.progress = SC.mergeProgress(S.progress, j.progress); save(); toast(`読み込みました（記録 ${j.records.length} 件）`, 2400, 'good'); }
        catch (err) { toast('読み込めません：' + err.message, 3000, 'bad'); }
        renderRecords();
      } });
      pg.append(h('p', { class: 'small', style: 'color:#f3d9a4', text: SC.RECORD_NOTE }),
        h('p', { class: 'small mute', text: '保存するもの：課目・日時・レベル・機体・結果と講評の表・高度と速度の履歴・接地などの出来事・メモ・進み具合。保存しないもの：API キー、Google のトークンや地形データ、個人情報。保存先はこの端末のブラウザ（localStorage）だけです。' }),
        h('div', { class: 'row' }, btn('JSON に書き出す', () => download(`flight-lab-record-${new Date().toISOString().slice(0, 10)}.json`, SC.exportJSON(SC.loadRecords(store), S.progress)), 'primary'),
          btn('JSON から読み込む（統合）', () => file.click()), file,
          btn('すべて削除', () => { if (confirm('この端末の学習記録（記録・進み具合）をすべて削除しますか？')) { SC.saveRecords(store, []); S.progress = SC.sanitizeProgress({}); save(); renderRecords(); } }, 'danger')));
      if (!store) pg.append(h('p', { class: 'small', style: 'color:#ffb3b3', text: 'このブラウザでは localStorage が使えないため、記録は保存されません（JSON の書き出しは使えます）。' }));
      if (!recs.length) { pg.append(h('p', { class: 'mute', text: 'まだ記録はありません。課目を終えると自動で保存されます。' })); return; }
      const res = { pass: '合格', fail: '不合格', abort: '中止', free: '—' };
      const tbl = h('table', { class: 'recs' }, h('tr', {}, ...['日時', '課目', 'レベル', '機体', '結果', '評価', '基準内の項目', '時間'].map(t => h('th', { text: t }))));
      for (const r of recs) tbl.append(h('tr', { onclick: () => { recSel = r.id; renderRecDetail(); } },
        h('td', { text: new Date(r.datetime).toLocaleString('ja-JP') }), h('td', { text: r.lessonTitle }), h('td', { text: r.lessonId === 'free' ? '—' : r.levelName }), h('td', { text: r.aircraft === 'pa44' ? 'Seminole' : 'Archer' }),
        h('td', { class: 'res-' + r.result, text: res[r.result] }), h('td', { text: r.grade || '—' }), h('td', { text: r.result === 'free' ? '—' : `${r.passPct}%` }), h('td', { text: `${Math.round(r.practiceSec / 60)} 分` })));
      pg.append(tbl, h('div', { id: 'recDetail' }));
      if (recSel) renderRecDetail();
    }
    function renderRecDetail() {
      const box = $('#recDetail'); if (!box) return; box.textContent = '';
      const all = SC.loadRecords(store), r = all.find(x => x.id === recSel); if (!r) return;
      const cv = h('canvas', { width: 900, height: 200 }), memo = h('textarea', { rows: 3 }); memo.value = r.memo;
      box.append(h('h3', {}, `${r.lessonTitle}${r.lessonId === 'free' ? '' : `（${r.levelName}）`} — ${new Date(r.datetime).toLocaleString('ja-JP')}`), r.reason ? h('p', { class: 'small', text: r.reason }) : null,
        h('div', { class: 'small mute', text: `高度（ft・青）と速度（kt・緑）の履歴　${r.sampleSec} 秒ごと` }), cv);
      for (const st of r.steps) { box.append(h('h4', { text: st.step })); box.append(h('table', { class: 'sd-t' }, ...st.rows.map(x => h('tr', { class: x.pass ? 'ok' : 'ng' }, h('td', { text: x.pass ? '○' : '×' }), h('td', { text: x.name }), h('td', { text: x.val }), h('td', { text: x.std }))))); }
      box.append(h('h4', { text: '出来事' }), h('ul', { class: 'small' }, ...(r.events.length ? r.events.map(e => h('li', { text: `${e.t} 秒：${e.type}${e.fpm != null ? ` ${e.fpm} fpm` : ''}${e.why ? ` ${e.why}` : ''}` })) : [h('li', { class: 'mute', text: 'なし' })])),
        h('h4', { text: 'メモ' }), memo,
        h('div', { class: 'row' }, btn('メモを保存', () => { r.memo = memo.value; SC.saveRecords(store, all); toast('保存しました', 1600, 'good'); }, 'primary'), btn('この記録を削除', () => { SC.deleteRecord(store, r.id); recSel = null; renderRecords(); }, 'danger')));
      const g = cv.getContext('2d'), W = cv.width, Hh = cv.height;
      g.fillStyle = '#0b1015'; g.fillRect(0, 0, W, Hh);
      const plot = (a, col, right) => { if (a.length < 2) return; const mn = Math.min(...a), mx = Math.max(...a), rg = Math.max(1, mx - mn); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); a.forEach((v, i) => { const x = 10 + i / (a.length - 1) * (W - 20), y = Hh - 14 - (v - mn) / rg * (Hh - 28); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.fillStyle = col; g.font = '12px sans-serif'; g.fillText(`${mn}〜${mx}`, right ? W - 110 : 12, 14); };
      plot(r.altHist, '#5fb3ff'); plot(r.spdHist, '#4fd18b', true);
    }

    // ------------------------------------------------------------ Google 3D settings
    function renderG3d(pg) {
      pg = pg || $('#pageBody'); pg.textContent = '';
      const G = app.google ? app.google() : null;
      const st = G ? G.status() : { state: 'unavailable', msg: 'WebGL2 が使えないため利用できません' };
      const key = h('input', { type: 'password', id: 'gkey', autocomplete: 'off', spellcheck: 'false', placeholder: 'Google Maps Platform の API キー', 'aria-label': 'API キー' });
      pg.append(h('p', { text: 'Sanford 周辺（KSFB 付近、表示原点 約 28.777, −81.238）の外部景観に、Google の公式 Map Tiles API（Photorealistic 3D Tiles）を使えます。オンライン時のみ・任意です。使わなくても教材・飛行訓練はすべて動きます。' }),
        h('ul', { class: 'small' },
          h('li', { text: 'API キーはこのページのメモリだけに保持します。localStorage・学習記録・JSON・URL には保存しません。ページを閉じる・再読み込みすると消えます。' }),
          h('li', { text: 'キーは Google のタイル配信先（tile.googleapis.com）へのリクエストにだけ付けます。他のサーバーへは送りません。' }),
          h('li', { text: 'Google の公式 Map Tiles API だけを使います。Street View 画像の取得・スクレイピング・保存、非公式 API は使いません。タイルを保存・事前取得（キャッシュ）しません。' }),
          h('li', { text: 'Google のデータは外部景観の表示だけに使います。建物・地形との衝突判定、実在空港への正確な接地、滑走路の抽出、空域・NOTAM・飛行計画・管制は実装しません。離着陸の練習は架空の LAB RWY 36 で行います。' }),
          h('li', { text: '表示中は画面に Google のロゴ表記（Google Maps）とデータ提供元（著作権表示）を表示します。' }),
          h('li', { text: '利用は Google Maps Platform の課金対象です（ルートのタイル要求でセッションが始まり、約 3 時間有効）。無料枠・料金・利用上限は Google の最新の案内を確認し、キーには API の制限（Map Tiles API のみ）とアプリケーション制限を設定してください。' })),
        h('div', { class: 'keyfield' }, key, btn('接続', () => { if (!G) return; G.setKey(key.value.trim()); key.value = ''; G.start(); renderG3d(); }, 'primary'), btn('切断（キーも消去）', () => { if (G) G.stop(true); renderG3d(); })),
        h('div', { class: 'row' }, btn('Sanford 上空へ（自由飛行）', () => { app.startFree('sfb', 'pa28'); app.closeScreens(); S.screen = 'fly'; S.paused = false; })),
        h('h3', { text: '状態' }), h('div', { class: 'status', id: 'gstatus', text: statusText(st) }),
        h('h3', { text: '高さ合わせ（教材の平らな地面 55 ft と Google の地形の差）' }),
        h('p', { class: 'small mute', text: 'Google のタイルの高さは楕円体高のため、表示原点付近のタイルの高さから自動で合わせます（推定）。ずれて見えるときは手動で調整できます。' }),
        h('div', { class: 'row' }, btn('−5 m', () => G && G.nudge(-5)), btn('+5 m', () => G && G.nudge(5)), btn('自動に戻す', () => G && G.nudge(null))),
        h('h3', { text: '規約・帰属表示・参考' }),
        h('ul', { class: 'small' }, ...[['Photorealistic 3D Tiles（Map Tiles API）概要', 'https://developers.google.com/maps/documentation/tile/3d-tiles'], ['Map Tiles API のポリシー（帰属表示など）', 'https://developers.google.com/maps/documentation/tile/policies'], ['Google Maps Platform 利用規約', 'https://cloud.google.com/maps-platform/terms'], ['Map Tiles API の利用量と課金', 'https://developers.google.com/maps/documentation/tile/usage-and-billing'], ['API キーの制限（ベストプラクティス）', 'https://developers.google.com/maps/api-security-best-practices']].map(([l, u]) => h('li', {}, h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, l)))));
    }
    function statusText(st) {
      const L = [`状態：${({ off: '未接続', starting: '接続中…', on: '表示中', error: 'エラー', unavailable: '利用不可' })[st.state] || st.state}`];
      if (st.msg) L.push(st.msg);
      if (st.state === 'on' || st.tiles) L.push(`タイル：表示 ${st.drawn || 0}／読み込み済み ${st.tiles || 0}／読み込み中 ${st.loading || 0}`, `高さ合わせ：${st.offset == null ? '推定中' : `${st.offset.toFixed(1)} m`}${st.manual ? '（手動）' : '（自動）'}`, `データ提供元：${st.credits || '—'}`);
      L.push(`キー：${st.hasKey ? 'メモリ内にあり（保存はしていません）' : 'なし'}`);
      return L.join('\n');
    }
    setInterval(() => { const el = $('#gstatus'); if (el && pageId === 'g3d' && S.screen === 'page' && app.google && app.google()) el.textContent = statusText(app.google().status()); }, 1000);

    // ------------------------------------------------------------ about
    function renderAbout(pg) {
      const flightN = SC.lessonOrder().filter(id => SC.lesson(id).steps).length;
      pg.append(h('p', {}, h('b', { text: '本アプリは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH/AFM、SOP、航空法規を優先してください。' })),
        h('h3', { text: 'これは何ではないか' }),
        h('ul', {}, ...['ANA の公式ソフトウェア・公式教材ではありません。ANA や訓練校のシラバス・SOP（標準運航手順）の再現でもありません。', '認定された訓練装置（FTD / FFS など）ではなく、飛行時間・技能・資格（ソロ、ライセンス等）の証明になりません。', '実機の性能を正確に再現していません。速度・許容差・接地基準は仮想教材値または出典のある参考値（機体ごとに要確認）です。', '実際の空港・空域・管制では使えません（NOT FOR NAVIGATION）。実際の管制にもつながりません。'].map(t => h('li', { text: t }))),
        h('h3', { text: '実装したもの' }),
        h('ul', { class: 'small' }, ...[
          '空島フライトの飛行モデルの移植：翼素（ブレードエレメント）空力（翼を短冊に分け、尾翼・垂直尾翼も部分ごとに迎え角・失速を計算）、プロペラの左偏向（後流・P ファクター・トルク・ジャイロ効果）、3 輪のばね・ダンパー・ブレーキ・前輪操向、地面効果、翼幅方向に変わる乱気流、接地の記録（接地直前の速度で測定）',
          '2 機種の教材モデル：Piper PA-28-181 Archer（固定ピッチ・固定脚）と PA-44-180 Seminole（左右逆回転の双発・定速プロペラ・引き込み脚・片発停止・フェザー・Vmc）。公表の訓練用速度を参考に、上昇率・片発上昇率・失速速度を合わせた',
          '空島フライトの操作系：W / S のピッチ保持、操縦感度、自動ラダー、トリム（T）、フラップ・脚・ブレーキ、ゲームパッド。操作の状態表示と、全キーの説明（何が動くか・何のために）',
          `空島フライトの教官エンジン：飛行 ${flightN} 課目 × 3 レベル（導入・基礎・精度）。教官の指示・使うキー・目安（機体モデルから計算した姿勢と出力）・目標値・連続保持（外れると 0 に戻る）・ヒント・講評・チェックリスト・英語の管制への復唱`,
          'G1000型配置と基本概念を学ぶ教材としての表示（Garmin のソフトウェアの複製ではない）：PFD・オーディオパネル（送信不可）・MFD、AHRS / GPS の故障、双発の赤線・青線',
          `教科書（全 ${BK ? BK.CHAPTERS.length : 0} 章・出典付き）、学科テスト ${QZ ? QZ.BANKS.length : 0} 分野、G1000 型 PFD のチュートリアルと読み取り練習`,
          'Sanford の資料と英語 ATC の復唱練習（音声合成）、学習記録（JSON 書き出し・読み込み）、Google Photorealistic 3D Tiles による外部景観（任意・キーはメモリのみ）'].map(t => h('li', { text: t }))),
        h('h3', { text: '実装していないもの（未実装）' }),
        h('ul', { class: 'small' }, ...['自動操縦（HDG / ALT への追従）— 意図的に未実装', '油圧・油温・EGT・電圧・電流・吸気圧（MFD では「—」表示）', 'エンジンの始動手順、混合比・キャブヒート・燃料タンク切替（チェックリストでは「教材では未実装」と表示）', '双発の左右別のスロットル（共通の 1 本）・プロペラレバー（フェザーはキー）', '実在空港の滑走路・誘導路での離着陸、Google の建物・地形との衝突', '実空域・NOTAM・飛行計画・実際の管制、音声認識・録音・送信', '雲・視程の変化・夜間・着氷・ウインドシア', 'G1000 の全機能（地形警報・トラフィック・タイマー・インセット地図など）'].map(t => h('li', { text: t }))),
        h('h3', { text: 'データとプライバシー' }),
        h('p', { class: 'small', text: '学習記録・進み具合・操作の設定はこのブラウザの localStorage にだけ保存します（サーバーへ送りません）。Google 3D を接続したときだけ、Google のタイル配信先へ API キー付きでタイルを要求します。キーは保存しません。外部リンク（参考資料）はクリックしたときだけ開きます。' }),
        h('h3', { text: 'ライセンス' }),
        h('p', { class: 'small', text: 'Draco 3D データ圧縮デコーダー（Google、Apache License 2.0）を同梱しています（Google 3D タイルの展開用）。' }),
        FL.DRACO_LICENSE ? h('details', {}, h('summary', { text: 'Apache License 2.0（全文）' }), h('pre', { class: 'small', style: 'white-space:pre-wrap', text: FL.DRACO_LICENSE })) : null,
        h('p', { class: 'note', text: `FLIGHT LAB ${FL.BUILD_INFO || '(開発版)'}` }));
    }

    built = { openMenu, openSchool, renderBrief, showDebrief, openPage, closePage, openSection, runQuiz };
    return built;
  };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
