// DRAFT (W10, chapter intro) — textbook/rewrite/combined/drafts/intro-figs.js. No product reads this file.
// The figures of the chapter 'intro' redrawn for the combined book (DESIGN 3.3 序部 chapter 1, PROGRESS「次」1):
//  courseMap  — the 8 parts (序部 and Parts 1–7). The titles and the number of chapters come from FL.book.PARTS /
//               CHAPTERS when the part is in the book; a part that is not in this version (Part 7 until R4) is drawn
//               dashed with 「この版にはまだない」. No {ch:} in the figure (check-path forward-ch-ref: the old figure had 12).
//  certLadder — the US (FAA) and the Japanese (JCAB) ladders side by side. US: 14 CFR Part 61 (61.83, 61.103, 61.65,
//               61.123, 61.63(c): the instructor's endorsement and the practical test, no knowledge test at the same
//               level, 61.153), as the old figure (checked by W07f) but the multiengine step now says the endorsement.
//               Japan: the ages of 航空法施行規則 第 43 条 and the flight time of 別表第二 (e-Gov, the 令和 8 年 10 月 1 日
//               施行 version, read 2026-10-27). The medical classes are not drawn here: they are the FL.jur item
//               'medical' that the section's bk.jur box draws (a number is not written by hand in two places).
//  jpRoutes   — the four ways to a Japanese pilot licence (航空法 第 29 条 第 4 項・施行規則 第 50 条・第 50 条の 2;
//               MLIT「指定航空従事者養成施設について」; MLIT 資料 1 (2025) for the Integrated System).
//  examMap    — the tests a cadet meets, by who holds them (JCAB, 総務省, FAA, this app).
//  studyCycle — one study round in five steps (DESIGN 3.3 序部 door: read → answer → fly → look back → recall later).
// At registration these functions go into flight-lab/src/book-figs.js in place of the old courseMap, certLadder and
// studyCycle (only the chapter intro uses them) — DESIGN 6.2 rule 5. The helpers below copy book-figs.js's (svg, T,
// TL), which are private to that file.
(function (FL) {
  'use strict';
  const FIG = FL.bookFigs; if (!FIG) return;
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}>${s}</text>`;
  const TL = (x, y, lines, o = {}) => { const lh = o.lh || Math.round((o.fs || 12) * 1.35); return lines.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const rect = (x, y, w, h, c, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 7}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : (o.fo === undefined ? 0.12 : o.fo)}" stroke="${c}" stroke-width="${o.sw || 1.4}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
  const down = (x, y, c = C.mut) => `<path d="M${x - 5} ${y} l5 6 l5 -6 Z" fill="${c}"/>`;
  const up = (x, y, c = C.mut) => `<path d="M${x - 5} ${y} l5 -6 l5 6 Z" fill="${c}"/>`;

  Object.assign(FIG, {
    // ---------------------------------------------------------------- intro.use：8 つの部
    courseMap() {
      const B = FL.book || {}, PARTS = B.PARTS || [], CH = B.CHAPTERS || [];
      // [part id, the label, the title when the part is not in the book, what it holds, colour]
      const rows = [
        ['p0', '序部', '出発の前に（日本で準備する）', 'この本の使い方・資格と試験・基本の量', C.am],
        ['p1', '第 1 部', '地上学科（英語の座学）', '原理・機体・気象・規則・交信・人間', C.cy],
        ['p2', '第 2 部', 'Sanford・Piper Archer の基礎操縦', '点検・基本操縦・離着陸・緊急操作・ソロ', C.gr],
        ['p3', '第 3 部', '航法・目的地変更', '地図・航法の計算・電波航法と GPS', C.am],
        ['p4', '第 4 部', '計器飛行', '計器だけを見て飛ぶ・IFR の決まりと進入', C.vi],
        ['p5', '第 5 部', 'Piper Seminole・多発', 'エンジン 2 つの飛行機・片発停止', C.bl],
        ['p6', '第 6 部', 'CRM・TEM・ジェットと自動化への準備', 'チームで飛ぶ・エアラインへの準備', C.rd],
        ['p7', '第 7 部', '日本の空と JCAB 学科', '日本の法令・空域・管制・学科試験', C.am],
      ];
      let s = '';
      rows.forEach(([id, label, fallback, sub, c], i) => {
        const p = PARTS.find(x => x.id === id), n = CH.filter(x => x.part === id).length, y = 6 + i * 46;
        const title = p ? String(p.title).replace(/^(?:序部|第\s?\d+\s?部)\s*/, '') : fallback;
        s += rect(8, y, 384, 40, c, p ? {} : { fo: 0.04, dash: '5 4' });
        s += T(18, y + 17, label, { c, b: 1, a: 'start', fs: 13 }) + T(76, y + 17, title, { c: p ? C.ink : C.mut, b: 1, a: 'start', fs: 13 });
        s += T(18, y + 34, sub, { c: p ? C.ink : C.mut, a: 'start', fs: 12 });
        s += T(384, y + 34, p ? `${n} 章` : 'この版にはまだない', { c: C.mut, a: 'end', fs: 12 });
        if (i < rows.length - 1) s += down(200, y + 40);
      });
      return svg(400, 374, s, '図：この教科書の 8 つの部。日本で準備する序部から始め、地上学科 → 単発機 → 航法 → 計器飛行 → 双発機 → チームで飛ぶ準備と進みます。第 7 部は日本の制度と JCAB の学科のための部で、どの時点からでも読めます（右の数は、いまの章の数）');
    },
    // ---------------------------------------------------------------- intro.cert：日米の資格の段階
    certLadder() {
      const us = [['学生操縦士（Student）', '16 歳・試験なし（申請）'], ['自家用操縦士（PPL）', '17 歳・40 時間など'], ['計器飛行証明（IR）', '機長の野外 50 時間など'],
        ['事業用操縦士（CPL）', '18 歳・250 時間など'], ['多発の等級（ME）', '教官の裏書き＋実地試験'], ['定期運送用（ATP）', '23 歳・1,500 時間など']];
      const jp = [['操縦練習許可', '国の許可・教員の監督'], ['自家用操縦士', '17 歳・40 時間など'], ['事業用操縦士', '18 歳・200 時間など'],
        ['計器飛行証明', '機長の野外 50 時間など'], ['陸上多発の等級（限定）', '実地試験の機で決まる'], ['定期運送用操縦士', '21 歳・1,500 時間など']];
      const col = (x, head, steps, c) => {
        let s = T(x + 92, 20, head, { c, b: 1, fs: 13 });
        steps.forEach(([t, sub], i) => {
          const y = 262 - i * 46;
          s += rect(x, y, 184, 40, c, { fo: 0.06 + i * 0.025 }) + T(x + 8, y + 16, t, { b: 1, a: 'start', fs: 12 }) + T(x + 8, y + 33, sub, { a: 'start', fs: 12 });
          if (i < steps.length - 1) s += up(x + 92, y - 1, c);
        });
        return s;
      };
      let s = col(10, '米国（FAA）', us, C.cy) + col(206, '日本（JCAB）', jp, C.gr);
      s += T(200, 322, '下から上へ積み上げる。数字は年齢と飛行時間の最低限', { c: C.mut, fs: 12 });
      s += rect(10, 330, 380, 24, C.am) + T(200, 347, 'どちらも、資格に限定（種類・等級・型式）が付く', { c: C.am, b: 1, fs: 12 });
      return svg(400, 360, s, '図：飛行機の操縦士の資格の段階。左は米国（FAA、米国の 14 CFR Part 61）、右は日本（国土交通省航空局、JCAB）。年齢と飛行時間は最低限の例で、実際の訓練ではもっと多くかかるのが普通です。日本の事業用操縦士の 200 時間は、指定養成施設の課程では飛行訓練 150 時間です');
    },
    // ---------------------------------------------------------------- intro.japan：日本の資格への 4 つの道
    jpRoutes() {
      const R = [
        ['1　ふつうの道（資格ごとに国の試験）', ['国の学科試験 → 飛行訓練 → 国の実地試験', '自家用・事業用・計器飛行証明を 1 つずつ取る'], C.mut, ''],
        ['2　指定養成施設の課程', ['学科教育 → 国の学科試験 → 実技教育 → 施設の審査', '修了すると、国の実地試験の全部か一部がない'], C.cy, ''],
        ['3　Integrated System（指定養成施設だけ）', ['事業用（多発）と計器飛行証明を一連の訓練で', '実地試験は施設の中で 1 回。単発の事業用はない'], C.gr, 'この訓練はここと考えられる（推測）'],
        ['4　外国の資格の切替（外切）', ['国内航空法規の学科試験は必ず受ける', 'ほかの学科と実地は、全部か一部がない'], C.am, ''],
      ];
      let s = '', y = 6;
      R.forEach(([t, lines, c, est]) => {
        const h = est ? 78 : 62;
        s += rect(8, y, 384, h, c, { fo: est ? 0.16 : 0.08, sw: est ? 2.2 : 1.4 });
        s += T(18, y + 19, t, { c, b: 1, a: 'start', fs: 13 }) + TL(18, y + 38, lines, { a: 'start', fs: 12, lh: 17 });
        if (est) s += T(382, y + 72, est, { c: C.am, b: 1, a: 'end', fs: 12 });
        y += h + 10;
      });
      return svg(400, y - 4, s, '図：日本の操縦士の資格（技能証明）を取る 4 つの道。2 と 3 は国が指定した養成施設の課程で、国の学科試験には合格が要ります。この教材が扱う訓練は 3 の道と考えられますが、公開情報からの推測です');
    },
    // ---------------------------------------------------------------- intro.exams：試験の地図
    examMap() {
      const R = [
        ['日本：国土交通省航空局（JCAB）', ['学科試験：事業用 5 科目＋計器飛行一般', '実地試験：養成施設の中で 1 回（推測）', '航空英語能力証明（取る時期は未公表）'], C.gr],
        ['日本：総務省', ['航空無線通信士（無線の資格。時期は未公表）'], C.cy],
        ['米国：FAA', ['単独飛行の前に：学生操縦士の資格', '学科試験 PAR・IRA・CAX（受けるか未公表）'], C.bl],
        ['この教材（練習用）', ['学科テスト（80% で合格）・確認問題'], C.am],
      ];
      let s = '', y = 6;
      for (const [t, lines, c] of R) {
        const h = 30 + lines.length * 18;
        s += rect(8, y, 384, h, c, { fo: 0.08 }) + T(18, y + 19, t, { c, b: 1, a: 'start', fs: 13 }) + TL(28, y + 38, lines, { a: 'start', fs: 12, lh: 18 });
        y += h + 8;
      }
      return svg(400, y, s, '図：訓練生が会う試験の地図。日本の試験は国土交通省航空局（技能証明・航空英語能力証明）と総務省（無線の資格）が行い、米国の試験は FAA が行います。どれをいつ受けるかは、多くが公表されていません');
    },
    // ---------------------------------------------------------------- intro.study：1 回の学び方
    studyCycle() {
      const n = [['読む', '教科書の節', 200, 40, C.cy], ['答える', '確認問題・学科テスト', 332, 130, C.am], ['飛ぶ', 'シミュレータの課目', 282, 252, C.gr],
        ['ふり返る', '講評とメモ', 118, 252, C.vi], ['思い出す', '間隔をあけて', 68, 130, C.bl]];
      let s = '';
      const pts = n.map(([, , x, y]) => [x, y]);
      for (let i = 0; i < n.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n.length], k1 = 0.42, k2 = 0.58;
        const ax = x1 + (x2 - x1) * k1, ay = y1 + (y2 - y1) * k1, bx = x1 + (x2 - x1) * k2, by = y1 + (y2 - y1) * k2, a = Math.atan2(by - ay, bx - ax), hh = 8;
        s += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${C.mut}" stroke-width="2"/>`
          + `<path d="M${bx.toFixed(1)} ${by.toFixed(1)} L${(bx - hh * Math.cos(a - 0.45)).toFixed(1)} ${(by - hh * Math.sin(a - 0.45)).toFixed(1)} L${(bx - hh * Math.cos(a + 0.45)).toFixed(1)} ${(by - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${C.mut}"/>`;
      }
      for (const [t, sub, x, y, c] of n) s += rect(x - 60, y - 24, 120, 48, c, { rx: 10 }) + T(x, y - 3, t, { c, b: 1, fs: 14 }) + T(x, y + 15, sub, { fs: 12 });
      s += T(200, 140, '1 回ごとに', { c: C.mut, fs: 12 }) + T(200, 158, 'くり返す', { c: C.mut, fs: 12 });
      return svg(400, 286, s, '図：この教材での 1 回の学び方。読む → 答える → 飛ぶ → ふり返る → 間隔をあけて思い出す、をくり返します');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
