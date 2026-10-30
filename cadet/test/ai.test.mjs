// CADET — the AI instructor (M8) in Node, against a stand-in for the Claude API (test/helpers/fake-claude.mjs):
//  - what is sent: the model from the settings, the instructor and the world's rules (cached), the textbook's table of
//    contents, today's lesson and the day's results, the sections that match the question, the question; the key only
//    in the x-api-key header (never in the body);
//  - the answer: streamed text without the line of sources, the sections it used (only ones that exist);
//  - what goes wrong: no key (nothing sent), a refused key, a busy API, a server error, no network, a refusal — each a
//    reason, never the key; the talk (ai/session.js) says so in the instructor's words and hands back to the scripted talk;
//  - the key: kept apart from the settings and the save, remembered in this browser only when asked, erased.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameBook } from '../src/content/book.js';
import { createTutor, buildParams, findSections, parseAnswer, visible, summaryText, stablePrompt, PERSONA, DEFAULT_MODEL, REASON_JA } from '../src/ai/tutor.js';
import { createAiSession, AI_LINES } from '../src/ai/session.js';
import { createKeyStore, KEY_NAME, maskKey } from '../src/ai/keys.js';
import { createSettings, DEFAULTS } from '../src/ui/settings.js';
import { instructorDialogs } from '../src/content/dialog/instructor.js';
import { debriefDialogs } from '../src/content/dialog/debrief.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { exportArchive } from '../src/career/archive.js';
import { fakeClaude } from './helpers/fake-claude.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js',
  'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
const FL = globalThis.FL;
const BOOK = gameBook(FL);
const KEY = 'sk-ant-api03-TESTKEY-0123456789abcdef';
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), map: m }; };
// everything printed while fn runs (the key must never be in it)
async function quiet(fn) {
  const out = [], keep = {};
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { keep[k] = console[k]; console[k] = (...a) => out.push(a.map(String).join(' ')); }
  try { return { r: await fn(), out }; } finally { Object.assign(console, keep); }
}
const SUM = {
  walk: { anomalies: 2, found: 1, missed: [{ id: 'oil', name: 'エンジン：オイルの量' }], tasksLeft: [] }, radio: { n: 8, first: 6, late: 1, wrong: 2 },
  lessons: [{ id: 'a2', title: '上昇・降下', done: true, passed: false, grade: 'C', rows: [{ name: '速度', val: '82 kt', std: '76±5 kt', pass: false }] }],
  incursion: false, crash: '', fault: null, tem: { threat: { ja: '午後の横風' }, named: true },
};

test('what is sent: the model, the cached rules and contents, today, the sections, the question — the key only in its header', async () => {
  const calls = [];
  const tutor = createTutor({ book: BOOK, getKey: () => KEY, getModel: () => 'claude-opus-5-5', fetchImpl: fakeClaude({ calls }) });
  const today = { place: 'debrief', chapter: '第 2 章', date: '4 月 12 日', weather: '晴れ', lesson: { id: 'a2', title: '上昇・降下', goal: '一定の速度で上昇する', std: '速度 ±5 kt' }, summary: SUM };
  const { r, out } = await quiet(() => tutor.ask('上昇のときに速度がずれるのはなぜですか', today));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(calls.length, 1);
  const c = calls[0], b = c.body;
  assert.match(c.url, /^https:\/\/api\.anthropic\.com\/v1\/messages/);
  assert.equal(c.method, 'POST');
  assert.equal(c.headers['x-api-key'], KEY);
  assert.equal(c.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.ok(c.headers['anthropic-version'], 'the API version');
  assert.equal(b.model, 'claude-opus-5-5');
  assert.equal(b.stream, true);
  assert.deepEqual(b.output_config, { effort: 'low' });
  assert.equal(b.fallbacks, 'default');
  assert.match(c.headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  // the cached part: the instructor, the world's rules, the textbook's contents
  assert.equal(b.system.length, 1);
  assert.deepEqual(b.system[0].cache_control, { type: 'ephemeral' });
  const sys = b.system[0].text;
  assert.ok(sys.startsWith(PERSONA));
  for (const w of ['早瀬 航', '翔洋航空', '架空', 'G1000 型', '実機の訓練の代わりにはならない', 'ゲーム・ソフト', '根拠：']) assert.ok(sys.includes(w), w);
  assert.ok(sys.includes('aero.lift：') && sys.includes('wx.metar：'), 'the table of contents');
  assert.doesNotMatch(sys, /ANA|Acron|Garmin/, 'no real names in what is sent');
  // the question's part: today, the results, the sections, the question
  assert.equal(b.messages.length, 1);
  const u = b.messages[0].content;
  for (const w of ['講評', '第 2 章', '上昇・降下', '一定の速度で上昇する', 'オイルの量', '1 回で正しく言えたのは 6 回', '速度（82 kt、基準 76±5 kt）', '午後の横風', '訓練生の質問：上昇のときに速度がずれるのはなぜですか']) assert.ok(u.includes(w), w);
  assert.match(u, /【[a-z]+\.[a-z0-9.]+】/, 'a section from the book');
  // the key is nowhere but its header
  assert.ok(!JSON.stringify(b).includes(KEY), 'not in the body');
  assert.ok(!out.join('\n').includes(KEY), 'not printed');
  assert.ok(!JSON.stringify(r).includes(KEY), 'not in the result');
});

test('the model from the settings; a name that is not one falls back; effort and the fallback only where the model takes them', () => {
  const q = 'METAR の読み方';
  assert.equal(buildParams({ model: 'claude-haiku-5-5', book: BOOK, question: q }).params.model, 'claude-haiku-5-5');
  assert.equal(buildParams({ model: 'claude-haiku-5-5', book: BOOK, question: q }).params.fallbacks, undefined, 'Haiku 5.5 has no server-side fallback');
  assert.deepEqual(buildParams({ model: 'claude-sonnet-5-5', book: BOOK, question: q }).params.output_config, { effort: 'low' });
  assert.equal(buildParams({ model: 'claude-haiku-4-5', book: BOOK, question: q }).params.output_config, undefined, 'an older model: no effort');
  assert.equal(buildParams({ model: 'not a model; drop table', book: BOOK, question: q }).params.model, DEFAULT_MODEL);
  assert.equal(DEFAULT_MODEL, 'claude-opus-5-5');
  assert.equal(DEFAULTS.aiModel, DEFAULT_MODEL);
  const s = createSettings(DEFAULTS, memStore());
  assert.equal(s.set('aiModel', 'claude-sonnet-5-5'), true); assert.equal(s.get('aiModel'), 'claude-sonnet-5-5');
  assert.equal(s.set('aiModel', 'x'), false); assert.equal(s.get('aiModel'), 'claude-sonnet-5-5');
  // the history of one talk: the earlier turns go with the next question, with the answer's blocks as they came
  const p = buildParams({ book: BOOK, question: 'もう一つ', history: [{ role: 'user', content: 'a' }, { role: 'assistant', content: [{ type: 'text', text: 'b' }] }] }).params;
  assert.deepEqual(p.messages.map(m => m.role), ['user', 'assistant', 'user']);
});

test('the sections a question is about come from the book; today\'s lesson\'s own come a little first', () => {
  assert.ok(findSections(BOOK, '失速はなぜ起きるのですか').includes('aero.stall'));
  assert.deepEqual(findSections(BOOK, 'METAR の読み方を教えてください').slice(0, 1), ['wx.metar']);
  assert.deepEqual(findSections(BOOK, '？？'), []);
  for (const id of findSections(BOOK, '着陸のときのフレアの高さ')) assert.ok(BOOK.sectionExists(id), id);
  assert.ok(stablePrompt(BOOK).length > 8000, 'the contents with each section\'s summary');
});

test('the answer: streamed without its line of sources; the sources that exist become "open the textbook"', async () => {
  assert.equal(visible('揚力は圧力の差です。\n根'), '揚力は圧力の差です。');
  assert.equal(visible('揚力は圧力の差です。\n根拠：aero.li'), '揚力は圧力の差です。');
  assert.equal(visible('**揚力**は # 圧力の差'), '揚力は  圧力の差');
  assert.deepEqual(parseAnswer('はい。\n根拠：aero.lift, nope.x, wx.metar', BOOK), { text: 'はい。', cites: ['aero.lift', 'wx.metar'] });
  assert.deepEqual(parseAnswer('はい。\n根拠：なし', BOOK), { text: 'はい。', cites: [] });
  assert.deepEqual(parseAnswer('根拠のない話はしません。', BOOK), { text: '根拠のない話はしません。', cites: [] });
  // (an answer that ends with a line break: the sources are still found and hidden)
  assert.deepEqual(parseAnswer('はい。\n根拠：aero.lift\n', BOOK), { text: 'はい。', cites: ['aero.lift'] });
  assert.equal(visible('はい。\n根拠：aero.lift\n'), 'はい。');
  const seen = [];
  const tutor = createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ chunks: 6, answer: 'いい質問です。翼が空気を下へ曲げると、その反作用で上へ押されます。\n根拠：aero.lift' }) });
  const r = await tutor.ask('揚力とは', {}, { onText: (t) => seen.push(t) });
  assert.equal(r.text, 'いい質問です。翼が空気を下へ曲げると、その反作用で上へ押されます。');
  assert.deepEqual(r.cites, ['aero.lift']);
  assert.ok(seen.length >= 2 && seen.every((t, i) => !i || t.startsWith(seen[i - 1].slice(0, 5))), 'it grows');
  assert.ok(seen.every(t => !t.includes('根拠')), 'the sources never show');
  assert.equal(tutor.history.length, 2, 'the turn is kept for the next question');
  tutor.reset(); assert.equal(tutor.history.length, 0);
});

test('a long talk: the answers come with thinking blocks; the window of earlier turns moves; no thinking block is ever sent back', async () => {
  const calls = [];
  const tutor = createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ calls, thinking: true }) });
  for (let i = 0; i < 6; i++) { const r = await tutor.ask(`質問 ${i + 1}`); assert.equal(r.ok, true, JSON.stringify(r)); }
  assert.equal(calls.length, 6);
  for (const c of calls) {
    const sent = c.body.messages.flatMap(m => (Array.isArray(m.content) ? m.content : []));
    assert.ok(sent.every(b => b.type !== 'thinking' && b.type !== 'redacted_thinking'), 'no thinking block sent back');
  }
  const last = calls[5].body.messages;
  assert.equal(last.length, 7, 'the last 3 turns and the new question');
  assert.match(JSON.stringify(last[0]), /質問 3/);
  assert.deepEqual(last[1].content, [{ type: 'text', text: 'いい質問です。揚力は翼の上と下の圧力の差で生まれます。\n根拠：aero.lift' }]);
});

test('what goes wrong: no key (nothing sent), refused key, busy, server error, no network, bad model, a refusal — a reason, never the key', async () => {
  const calls = [];
  const none = createTutor({ book: BOOK, getKey: () => '', fetchImpl: fakeClaude({ calls }) });
  assert.deepEqual(await none.ask('揚力'), { ok: false, reason: 'nokey' });
  assert.equal(calls.length, 0, 'no key: nothing is sent');
  assert.deepEqual(await createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ calls }) }).ask('   '), { ok: false, reason: 'empty' });
  assert.equal(calls.length, 0);
  const cases = [[{ status: 401 }, 'auth'], [{ status: 403, errorType: 'permission_error' }, 'auth'], [{ status: 429, errorType: 'rate_limit_error' }, 'busy'],
    [{ status: 529, errorType: 'overloaded_error' }, 'busy'], [{ status: 500, errorType: 'api_error' }, 'server'], [{ network: true }, 'network'], [{ status: 404, errorType: 'not_found_error' }, 'model'], [{ status: 400, errorType: 'invalid_request_error' }, 'bad']];
  for (const [o, why] of cases) {
    const t = createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude(o) });
    const { r, out } = await quiet(() => t.ask('揚力'));
    assert.equal(r.ok, false, JSON.stringify(o));
    assert.equal(r.reason, why, JSON.stringify(o));
    assert.ok(REASON_JA[why], why);
    assert.ok(!JSON.stringify(r).includes(KEY) && !out.join('\n').includes(KEY), `${why}: the key stays secret`);
  }
  const d = await createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ stop: 'refusal', answer: '' }) }).ask('危ないこと');
  assert.deepEqual([d.ok, d.declined], [true, true]);
  // an error whose message carries the key (it should never, but if so) is shown without it
  const leak = createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: async () => { throw new TypeError(`fetch failed for ${KEY}`); } });
  const l = await leak.ask('揚力');
  assert.equal(l.reason, 'network'); assert.ok(!JSON.stringify(l).includes(KEY));
});

// a talk with the AI instructor as the game runs it: the screen is a list of the views it was shown
function talk(opts) {
  const views = [], ends = [], notices = [], books = [];
  const s = createAiSession({ book: BOOK, place: 'brief', onEnd: (h) => ends.push(h), onBook: (id) => books.push(id), notice: (t, r) => notices.push(r), reasonText: (r) => REASON_JA[r], ...opts });
  s.onChange((v) => views.push(v));
  return { s, views, ends, notices, books };
}

test('the talk: invited, the question on screen, the answer streams, then another question, the textbook or thanks', async () => {
  const tutor = createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ chunks: 3, answer: '翼の迎え角が大きくなりすぎると、空気が翼から離れます。教材の値では、Archer の失速速度は約 50 kt です。\n根拠：aero.stall' }) });
  const t = talk({ tutor, today: () => ({ lesson: { id: 'a3', title: '失速' } }) });
  t.s.start();
  let v = t.s.view();
  assert.equal(v.text, AI_LINES.intro); assert.ok(v.input, 'a field for the question'); assert.equal(v.speaker, 'instructor');
  assert.deepEqual(v.choices.map(c => c.text), ['やっぱり、やめておきます']);
  const p = t.s.submit('失速はなぜ起きるのですか');
  v = t.s.view();
  assert.deepEqual([v.speaker, v.text, v.pending], ['player', '失速はなぜ起きるのですか', true], 'the question stays on screen while he thinks');
  assert.equal(t.s.choose(0), false, 'nothing to choose while he thinks');
  assert.equal(await p, true);
  v = t.s.view();
  assert.equal(v.speaker, 'instructor'); assert.equal(v.pending, false); assert.equal(v.stream, true);
  assert.match(v.text, /^翼の迎え角/); assert.doesNotMatch(v.text, /根拠/);
  const streamed = t.views.filter(x => x && x.speaker === 'instructor' && x.stream);
  assert.ok(streamed.length >= 2 && streamed.every(x => x.node === v.node), 'one line that grows');
  assert.deepEqual(v.choices.map(c => c.text), ['もう一つ聞きたいです', `教科書の「${BOOK.section('aero.stall').title}」を開く`, 'ありがとうございました']);
  t.s.choose(1); assert.deepEqual(t.books, ['aero.stall']);
  t.s.choose(0); assert.equal(t.s.view().text, AI_LINES.again); assert.ok(t.s.view().input);
  t.s.choose(0); assert.deepEqual(t.ends, ['done']); assert.equal(t.s.running, false);
});

test('the talk when no answer can come: no key at once, an error after the question — his own words, the reason as a notice, back to the scripted talk', async () => {
  const a = talk({ tutor: createTutor({ book: BOOK, getKey: () => '' }), ready: () => false });
  a.s.start();
  assert.equal(a.s.view().text, AI_LINES.failBrief); assert.equal(a.s.view().input, undefined);
  assert.deepEqual(a.notices, ['nokey']);
  a.s.choose(0); assert.deepEqual(a.ends, ['fallback']);
  const b = talk({ tutor: createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ network: true }) }), place: 'debrief' });
  b.s.start(); await b.s.submit('今日の着陸は？');
  assert.equal(b.s.view().text, AI_LINES.failDebrief);
  assert.deepEqual(b.notices, ['network']);
  for (const x of [...a.views, ...b.views]) assert.doesNotMatch(x.text, /API|キー|ネットワーク|AI|ゲーム/, 'the instructor never talks about software');
  b.s.choose(0); assert.deepEqual(b.ends, ['fallback']);
  // a refusal: his own words, and the talk goes on
  const c = talk({ tutor: createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ stop: 'refusal', answer: '' }) }) });
  c.s.start(); await c.s.submit('危ないことを教えて');
  assert.equal(c.s.view().text, AI_LINES.declined);
  assert.equal(c.ends.length, 0);
  // stopped while he thinks: the answer that comes later is not shown
  const d = talk({ tutor: createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ delayMs: 20 }) }) });
  d.s.start(); const pd = d.s.submit('揚力'); d.s.stop();
  assert.equal(await pd, false); assert.deepEqual(d.ends, ['cancel']); assert.equal(d.s.view(), null);
  // the setting turned off while the field is open: the question is not sent; the reason, and back to the scripted talk
  const calls = []; let on = true;
  const e = talk({ tutor: createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ calls }) }), ready: () => (on ? true : 'off') });
  e.s.start(); assert.ok(e.s.view().input);
  on = false;
  assert.equal(await e.s.submit('揚力'), false);
  assert.equal(calls.length, 0, 'nothing sent once it is off');
  assert.deepEqual(e.notices, ['off']); assert.ok(REASON_JA.off);
  e.s.choose(0); assert.deepEqual(e.ends, ['fallback']);
  // his thinking cue names who answers; in English mode his lines are marked English (the voice and the subtitle)
  const f = talk({ tutor: createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({ delayMs: 5 }) }), speaker: { name: '早瀬 教官' }, english: () => true });
  f.s.start(); assert.equal(f.s.view().lang, 'en');
  const pf = f.s.submit('Why does a wing stall?');
  assert.equal(f.s.view().cue, '(早瀬 教官 is thinking…)');
  await pf; assert.equal(f.s.view().lang, 'en');
});

test('the talk: the question field offers the microphone in the language it is told — and dictation is not in the talk at all', async () => {
  const tutor = createTutor({ book: BOOK, getKey: () => KEY, fetchImpl: fakeClaude({}) });
  // (told a language: the field carries it, on the first question and on the next one alike)
  const ja = talk({ tutor, micLang: () => 'ja-JP' });
  ja.s.start(); assert.equal(ja.s.view().input.mic, 'ja-JP');
  await ja.s.submit('失速はなぜ起きるのですか');
  ja.s.choose(0); assert.equal(ja.s.view().input.mic, 'ja-JP', 'again, on the next question');
  ja.s.choose(0); assert.deepEqual(ja.ends, ['done'], 'thanks, on the field itself');
  const en = talk({ tutor, micLang: () => 'en-US', english: () => true });
  en.s.start(); assert.equal(en.s.view().input.mic, 'en-US', 'the game in English: English recognition');
  en.s.stop();
  // (told nothing — the microphone off in the settings: no offer on the field)
  const off = talk({ tutor });
  off.s.start(); assert.equal(off.s.view().input.mic, null);
  off.s.stop();
});

test('the scripted talk offers the free question only while the setting is on; it comes back to thanks', () => {
  const data = instructorDialogs(FL, { lessonId: 'a2' });
  const ctx = { ai: { on: false } }, st = createDialogState();
  st.flags.met_instructor = true;
  const hooks = [];
  const r = createRunner({ data, state: st, ctx: () => ctx, hooks: { onHook: (n, a) => hooks.push([n, a]) } });
  r.start('brief');
  assert.ok(!r.view().choices.some(c => /自由に質問/.test(c.text)), 'off: not offered');
  ctx.ai.on = true; r.start('brief', 'menu');
  const i = r.view().choices.findIndex(c => /自由に質問/.test(c.text));
  assert.ok(i >= 0, 'on: offered');
  r.choose(i);
  assert.deepEqual(hooks.at(-1), ['ai', 'brief']);
  assert.equal(r.view().node, 'free');
  r.next(); assert.equal(r.view().node, 'thanks', 'and back to thanks when it is over');
  // the debrief: the same, by the logbook
  const dd = debriefDialogs(SUM), dctx = { ai: { on: true } };
  const dr = createRunner({ data: dd, state: createDialogState(), ctx: () => dctx, hooks: { onHook: (n, a) => hooks.push([n, a]) } });
  dr.start('debrief', 'sign');
  assert.ok(dr.view().choices.some(c => /今日の飛行について質問/.test(c.text)));
  dctx.ai.on = false; dr.start('debrief', 'sign');
  assert.ok(!dr.view().choices.some(c => /質問/.test(c.text)));
});

test('the key: apart from the settings and the save; remembered in this browser only when asked; erased', () => {
  const store = memStore();
  const k = createKeyStore(store);
  assert.equal(k.has(), false);
  assert.equal(k.set('short'), false, 'not a key');
  assert.equal(k.set(KEY), true);
  assert.equal(k.get(), KEY); assert.equal(k.remembered, false); assert.equal(store.getItem(KEY_NAME), null, 'only in memory unless asked');
  assert.equal(createKeyStore(store).has(), false, 'a new page does not have it');
  k.set(KEY, { remember: true });
  assert.equal(store.getItem(KEY_NAME), KEY); assert.equal(createKeyStore(store).get(), KEY, 'remembered in this browser');
  assert.equal(k.masked(), maskKey(KEY)); assert.ok(!k.masked().includes(KEY.slice(10, -4)), 'shown masked');
  // the settings and the save never hold it
  const s = createSettings(DEFAULTS, store);
  s.set('aiTutor', true); s.set('aiModel', 'claude-opus-5-5');
  assert.ok(!store.getItem('cadet.settings').includes(KEY));
  assert.ok(!Object.keys(DEFAULTS).some(x => /(secret|token|password|api_?key|aikey)/i.test(x)), 'no key in the settings');   // (keyBinds — the keyboard's bindings — is not the API key; the guard is for credentials)
  const arch = exportArchive({ career: { day: 1 }, talk: createDialogState(), logbook: [], progress: {}, records: {} });
  assert.ok(!String(arch).includes(KEY));
  k.clear();
  assert.equal(k.has(), false); assert.equal(store.getItem(KEY_NAME), null); assert.equal(createKeyStore(store).has(), false);
  assert.ok([...store.map.values()].every(v => !String(v).includes(KEY)), 'nothing left anywhere');
});

test('the day\'s results as the instructor reads them', () => {
  const t = summaryText(SUM);
  assert.match(t, /異常 2 件のうち 1 件/); assert.match(t, /見落とし：エンジン：オイルの量/);
  assert.match(t, /課目 a2「上昇・降下」：C（もう一度）・不合格。基準の外：速度/);
  assert.match(t, /TEM：今日の脅威は「午後の横風」/);
  assert.equal(summaryText(null), '');
});
