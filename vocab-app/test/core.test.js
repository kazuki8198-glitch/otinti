'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../public/js/core');

global.window = global.window || {};
require('../public/data/dict.js');
const dict = new core.Dictionary(window.TUBETAN_DICT);

test('辞書を読み込める', () => {
  assert.ok(dict.size() > 30000);
  const e = dict.get('abandon');
  assert.ok(e.s.includes('捨てる'));
  assert.ok(e.r > 0);
  assert.equal(dict.get('the').r, 1);
});

test('変化形を原形に戻す', () => {
  const cases = {
    went: 'go', children: 'child', studied: 'study', studies: 'study', running: 'run', considered: 'consider',
    used: 'use', using: 'use', hoping: 'hope', caring: 'care', writing: 'write', dying: 'die', lying: 'lie',
    happier: 'happy', biggest: 'big', countries: 'country', movies: 'movie', knives: 'knife', halves: 'half',
    websites: 'website', apps: 'app', overwhelmed: 'overwhelm', procrastinating: 'procrastinate', days: 'day',
    // 独立した意味をもつ語はそのまま
    evening: 'evening', building: 'building', interesting: 'interesting', news: 'news', clothes: 'clothes',
    glasses: 'glasses', series: 'series', always: 'always', sometimes: 'sometimes', feed: 'feed', seed: 'seed',
    need: 'need', number: 'number', means: 'mean',
  };
  for (const [form, lemma] of Object.entries(cases)) assert.equal(dict.lemmatize(form), lemma, form);
  assert.equal(dict.lemmatize('xqzzy'), null);
  assert.equal(dict.lookup('Studied ').w, 'study');
});

test('レベル区分', () => {
  assert.equal(core.levelOfRank(1), 1);
  assert.equal(core.levelOfRank(1000), 1);
  assert.equal(core.levelOfRank(1001), 2);
  assert.equal(core.levelOfRank(5000), 5);
  assert.equal(core.levelOfRank(14001), 10);
  assert.equal(core.levelOfRank(0), 10);
});

test('YouTube の URL から動画 ID を取り出す', () => {
  const id = 'dQw4w9WgXcQ';
  for (const u of [
    id, `https://www.youtube.com/watch?v=${id}`, `https://youtube.com/watch?feature=share&v=${id}&t=10`,
    `https://youtu.be/${id}?si=abc`, `https://m.youtube.com/watch?v=${id}`, `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`, `https://www.youtube.com/live/${id}`, `https://www.youtube-nocookie.com/embed/${id}`,
  ]) assert.equal(core.parseVideoId(u), id, u);
  assert.equal(core.parseVideoId('https://example.com/watch?v=abc'), null);
  assert.equal(core.parseVideoId(''), null);
  assert.equal(core.parseStartTime(`https://youtu.be/${id}?t=90`), 90);
  assert.equal(core.parseStartTime(`https://www.youtube.com/watch?v=${id}&t=1m30s`), 90);
  assert.equal(core.formatTime(3725), '1:02:05');
  assert.equal(core.formatTime(65.9), '1:05');
});

test('貼り付けた字幕を読み取る（YouTube の文字起こし / SRT / VTT / 文章）', () => {
  const yt = '0:00\nHello everyone\n0:03\nwelcome back to the channel\nand today\n1:02:03\nbye';
  assert.deepEqual(core.parsePastedTranscript(yt), [
    { start: 0, text: 'Hello everyone' },
    { start: 3, text: 'welcome back to the channel and today' },
    { start: 3723, text: 'bye' },
  ]);
  const inline = '0:00 Hello everyone\n0:05 this is great';
  assert.deepEqual(core.parsePastedTranscript(inline).map((s) => s.start), [0, 5]);
  const srt = '1\n00:00:01,000 --> 00:00:03,500\nFirst line\nsecond line\n\n2\n00:00:04,000 --> 00:00:05,000\nNext';
  assert.deepEqual(core.parsePastedTranscript(srt), [{ start: 1, text: 'First line second line' }, { start: 4, text: 'Next' }]);
  const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nhello there\n\n00:00:02.000 --> 00:00:03.000\nhello there\nhow are you\n';
  assert.deepEqual(core.parsePastedTranscript(vtt), [{ start: 1, text: 'hello there' }, { start: 2, text: 'how are you' }]);
  const plain = 'This is one sentence. And another one!\n\nNew paragraph here';
  assert.deepEqual(core.parsePastedTranscript(plain).map((s) => s.text), ['This is one sentence.', 'And another one!', 'New paragraph here']);
});

test('語彙を抽出する（原形でまとめ、回数・例文・時刻を記録）', () => {
  const segs = [
    { start: 0, text: '[Music] Today we talk about procrastination.' },
    { start: 4.5, text: 'Procrastinating is something everyone does. I procrastinated' },
    { start: 9, text: 'for years, and John in London was overwhelmed too.' },
    { start: 12, text: "It's an unprecedented, well-known problem — don't worry." },
  ];
  const r = core.extractVocabulary(segs, dict);
  const by = Object.fromEntries(r.items.map((i) => [i.lemma, i]));
  assert.equal(by.procrastination.count, 1);
  assert.equal(by.procrastinate.count, 2);
  assert.deepEqual(by.procrastinate.forms, ['procrastinating', 'procrastinated']);
  assert.equal(by.procrastinate.firstTime, 4.5);
  assert.equal(by.overwhelm.contexts[0].t, 9);
  assert.ok(by.unprecedented);
  assert.ok(by['well-known'], '辞書にあるハイフン語はそのまま');
  assert.ok(!by.music, '[Music] は除去');
  assert.ok(!by.don && !by.t, "don't の n't は対象外");
  assert.equal(by.john.capitalizedOnly, true, '文中で大文字の John は固有名詞の可能性');
  assert.ok(!r.unknown.some((u) => u.word === 'john' || u.word === 'london'), '文中の大文字の未知語は固有名詞として除外');
  // 例文と強調位置
  const c = by.overwhelm.contexts[0];
  assert.equal(c.text.substr(c.hl[0], c.hl[1]), 'overwhelmed');
  const c2 = by.procrastination.contexts[0];
  assert.equal(c2.text, 'Today we talk about procrastination.');
  assert.equal(c2.text.substr(c2.hl[0], c2.hl[1]), 'procrastination');
  assert.ok(r.totalTokens > 20);
  assert.equal(r.stats.byLevel.length, 10);
});

test('句読点のない自動字幕でも例文を短く切り出す', () => {
  const words = [];
  for (let i = 0; i < 120; i++) words.push(i === 60 ? 'serendipity' : 'and then we went');
  const segs = [{ start: 0, text: words.slice(0, 60).join(' ') }, { start: 30, text: words.slice(60).join(' ') }];
  const r = core.extractVocabulary(segs, dict);
  const it = r.items.find((i) => i.lemma === 'serendipity');
  const ctx = it.contexts[0];
  assert.ok(ctx.text.length <= 200, ctx.text.length);
  assert.ok(ctx.text.startsWith('…') && ctx.text.endsWith('…'));
  assert.equal(ctx.text.substr(ctx.hl[0], ctx.hl[1]), 'serendipity');
  assert.equal(ctx.t, 30);
});

test('動画の難易度とカバー率', () => {
  const items = [
    { lemma: 'a', rank: 10, count: 90, level: 1 },
    { lemma: 'b', rank: 3000, count: 6, level: 3 },
    { lemma: 'c', rank: 9000, count: 4, level: 8 },
  ];
  const s = core.difficultyStats(items);
  assert.equal(s.rank95, 3000);
  assert.equal(s.level95, 3);
  assert.equal(core.coverageForVocab(items, 5000), 0.96);
  assert.equal(core.coverageForVocab(items, 5000, new Set(['c'])), 1);
});

test('間隔反復: 新規 → 学習中 → 復習 → 習得', () => {
  const t0 = new Date(2026, 0, 10, 20, 0, 0).getTime();
  let s = core.newSrs(t0);
  assert.equal(core.cardStatus(s), 'new');
  s = core.schedule(s, 2, t0); // 正解
  assert.equal(s.state, 'learning');
  assert.equal(s.due - t0, 10 * core.MIN);
  s = core.schedule(s, 2, t0 + 10 * core.MIN); // もう一度正解 → 卒業
  assert.equal(s.state, 'review');
  assert.equal(s.interval, 1);
  assert.equal(new Date(s.due).getDate(), 11);
  assert.equal(new Date(s.due).getHours(), 4);
  let now = s.due;
  for (let i = 0; i < 6; i++) {
    s = core.schedule(s, 2, now);
    now = s.due;
  }
  assert.ok(s.interval >= 21, String(s.interval));
  assert.equal(core.cardStatus(s), 'mastered');
  // 忘れたら再学習
  const lapsed = core.schedule(s, 0, now);
  assert.equal(lapsed.state, 'relearning');
  assert.equal(lapsed.lapses, 1);
  assert.ok(lapsed.ease < s.ease);
  const back = core.schedule(lapsed, 2, now + 10 * core.MIN);
  assert.equal(back.state, 'review');
  assert.ok(back.interval >= 1 && back.interval < s.interval);
  // 簡単 → いきなり 4 日
  const easy = core.schedule(core.newSrs(t0), 3, t0);
  assert.equal(easy.state, 'review');
  assert.equal(easy.interval, 4);
  // ボタンの表示用の間隔
  const labels = core.previewIntervals(core.newSrs(t0), t0);
  assert.deepEqual(labels, ['1分', '5分', '10分', '4日']);
});

test('語彙力チェック: 出題と推定', () => {
  const rng = core.mulberry32(42);
  const items = core.sampleLevelTest(dict, 6, rng);
  assert.equal(items.filter((i) => !i.fake).length, 60);
  assert.equal(items.filter((i) => i.fake).length, 4);
  for (const it of items.filter((i) => !i.fake)) assert.equal(core.levelOfRank(dict.get(it.word).r), it.lv);
  for (const w of core.PSEUDOWORDS) assert.equal(dict.lemmatize(w), null, w + ' は辞書にない語');
  // Lv1〜4 は全部知っている、それ以上は知らない
  const answers = items.map((i) => ({ ...i, known: !i.fake && i.lv <= 4 }));
  const est = core.estimateVocabulary(answers);
  assert.equal(est.size, 4000);
  assert.equal(est.recommendedLevel, 4);
  assert.equal(est.falseAlarm, 0);
  // 実在しない語にもチェックした分は割り引く
  const cheat = items.map((i) => ({ ...i, known: i.fake ? true : i.lv <= 4 }));
  assert.ok(core.estimateVocabulary(cheat).size < 4000);
});
