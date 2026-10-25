// CADET — ai/session.js : one free-question talk with the AI instructor (M8), shaped like a dialogue runner
// (dialog/engine.js: view / next / choose / stop / onChange) so the dialogue UI shows it as it shows any talk: the
// instructor invites a question (the UI adds a text field), the cadet's question stays on screen while he thinks, his
// answer streams into the subtitle, then: another question, the textbook at the sections he used, or thanks.
// When the answer cannot come (no key, no network, an error) he says so in his own words and the scripted talk takes
// over (onEnd('fallback')); the reason itself goes to notice() (the screen's notice, outside the talk). Pure: no DOM.
import { QUESTION_MAX } from './tutor.js';

export const AI_LINES = {
  intro: 'いいですよ。何でも聞いてください。',
  again: 'どうぞ。ほかに何を聞きたいですか。',
  think: '（早瀬 教官が考えています…）',
  declined: 'その質問には、ここではお答えできません。訓練の話に戻りましょう。',
  failBrief: 'すみません、いまはうまく答えがまとまりません。教科書から一緒に探しましょう。',
  failDebrief: 'すみません、いまはうまく答えがまとまりません。気になるところは、次のブリーフィングで一緒に見ましょう。',
  cut: '……続きは、教科書で確かめてください。',
};
// (M8) the same when the crew speak English (the answer itself comes in English then: ai/tutor.js todayText)
export const AI_LINES_EN = {
  intro: 'Sure. Ask me anything.', again: 'Go ahead. What else would you like to ask?', think: '（早瀬 教官が考えています…）',
  declined: 'I can\'t answer that one here. Let\'s get back to training.',
  failBrief: 'Sorry, I can\'t put an answer together right now. Let\'s look for it in the textbook together.',
  failDebrief: 'Sorry, I can\'t put an answer together right now. Let\'s look at what\'s on your mind at the next briefing.',
  cut: ' ...Check the rest in the textbook.',
};

// opts: tutor (ai/tutor.js), book, speaker { name, color }, today() → the material, place 'brief' | 'debrief',
// ready() → false when it cannot ask at all (no key), onEnd(how: 'done' | 'cancel' | 'fallback'), onBook(sectionId),
// notice(text, reason), placeholder
export function createAiSession({ tutor, book, speaker = { name: '早瀬 教官', color: '#5cc8ff' }, today = () => ({}), place = 'brief', ready = () => true, onEnd = () => {}, onBook = () => {}, notice = () => {}, reasonText = (r) => r, english = () => false } = {}) {
  const fns = new Set();
  const T = () => (english() ? AI_LINES_EN : AI_LINES);
  let cur = null, seq = 0, running = false, ctrl = null, lastAnswer = null;
  const node = (k) => `${k}:${++seq}`;
  const me = (text, more = {}) => ({ dialog: 'ai', node: node(more.kind || 'say'), speaker: 'instructor', name: speaker.name, color: speaker.color || null, text, choices: [], ends: false, ...more });
  function emit() { const v = view(); for (const f of [...fns]) { try { f(v); } catch (e) { console.error(e); } } }
  function set(v) { cur = v; emit(); }
  function input(first) {
    set(me(first ? T().intro : T().again, { kind: 'input', input: { max: QUESTION_MAX, placeholder: '質問を日本語で書いて Enter（例：失速はなぜ起きるのですか）' },
      choices: [{ i: 0, text: first ? 'やっぱり、やめておきます' : 'ありがとうございました', act: first ? 'cancel' : 'done' }] }));
  }
  function failed(reason) {
    if (reason && reason !== 'abort') notice(reasonText(reason), reason);
    set(me(place === 'debrief' ? T().failDebrief : T().failBrief, { kind: 'fail', choices: [{ i: 0, text: 'はい', act: 'fallback' }] }));
  }
  function answered(r, at) {
    const cites = (r.cites || []).filter(id => book.section(id)).slice(0, 2);
    const ch = [{ text: 'もう一つ聞きたいです', act: 'more' }, ...cites.map(id => ({ text: `教科書の「${book.section(id).title}」を開く`, act: 'book:' + id })), { text: 'ありがとうございました', act: 'done' }];
    lastAnswer = r;
    const text = r.declined ? T().declined : r.cut ? `${r.text}${T().cut}` : r.text;
    // (the streamed line, finished: the same node, so the screen keeps what it has shown and adds the rest)
    set(me(text, { node: at || node('answer'), stream: true, pending: false, choices: ch.map((c, i) => ({ i, ...c })) }));
  }
  async function submit(text) {
    const q = String(text || '').trim().slice(0, QUESTION_MAX);
    if (!running || !cur || !cur.input || !q) return false;
    // the question stays on screen while he thinks
    set({ dialog: 'ai', node: node('asked'), speaker: 'player', name: 'あなた', color: '#f2b632', text: q, choices: [], ends: false, pending: true, cue: T().think });
    const my = (ctrl = typeof AbortController === 'function' ? new AbortController() : null);
    let streamNode = null;
    const r = await tutor.ask(q, { ...today(), place, lang: english() ? 'en' : 'ja' }, {
      signal: my ? my.signal : null,
      onText: (t) => {
        if (!running || ctrl !== my || !t) return;
        if (!streamNode) streamNode = node('answer');
        set(me(t, { node: streamNode, stream: true, pending: true }));
      },
    });
    if (!running || ctrl !== my) return false;                // stopped (or asked again) meanwhile
    ctrl = null;
    if (!r.ok) { failed(r.reason); return false; }
    answered(r, r.declined ? null : streamNode);
    return true;
  }
  function view() { if (!cur) return null; const { act, ...v } = cur; return { ...v, choices: (cur.choices || []).map(({ act: a, ...c }) => c) }; }
  function finish(how) { running = false; if (ctrl) { try { ctrl.abort(); } catch (e) { /* gone */ } ctrl = null; } cur = null; onEnd(how); }
  return {
    get running() { return running; },
    get state() { return {}; },
    get lastAnswer() { return lastAnswer; },
    view,
    start() { running = true; seq = 0; lastAnswer = null; if (ready()) input(true); else failed('nokey'); return true; },
    submit,
    // a line without choices: nothing to go on to (the answer always ends in choices; a pending line waits)
    next() { return false; },
    choose(i) {
      if (!cur || cur.pending) return false;
      const c = (cur.choices || [])[i]; if (!c) return false;
      if (c.act === 'more') { input(false); return true; }
      if (c.act && c.act.startsWith('book:')) { onBook(c.act.slice(5)); return true; }
      finish(c.act || 'done');
      return true;
    },
    stop() { if (running) finish('cancel'); },
    onChange(fn) { fns.add(fn); return () => fns.delete(fn); },
  };
}
