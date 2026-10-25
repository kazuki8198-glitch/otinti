// CADET — ai/tutor.js : the AI instructor (M8, PLAN 5): 早瀬 教官 answers a question the cadet types, in the
// briefing room or at the debrief, through the Claude API (the official SDK, @anthropic-ai/sdk).
// Optional and off by default: nothing here runs (no client is made, nothing is sent) until the player turns it on in
// the settings, gives their own key, and asks. Without a key, without a network, or on any error the game goes back
// to its scripted talk (ask() resolves { ok: false, reason }), so the whole game still plays offline.
// What is sent: the instructor's character and the rules of this fictional world (the same every time: cached), the
// textbook's table of contents (also cached), then today's material — the lesson, the day's results
// (career/day.js summary()) — the textbook sections that match the question best, and the question. The key goes
// only into the request's x-api-key header: never into the body, a log, an error message or any storage of the game.
// The model answers in the instructor's spoken voice, ends with the sections it used (「根拠：id, id」: the game turns
// them into "open the textbook there"), says when something is beyond the material, and never talks about software.
import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = 'claude-opus-5-5';
export const MODEL_RE = /^[a-z0-9][a-z0-9._-]{2,63}$/;
export const QUESTION_MAX = 300;                       // characters a question may have
export const MAX_TOKENS = 8000;                        // room for the model's thinking and a short spoken answer
export const HISTORY = 3;                              // earlier questions and answers kept in one talk
// the models that take output_config.effort, and those that take the server-side fallback on a refusal
const EFFORT_OK = /^claude-(?:(?:opus|sonnet|haiku|fable|mythos)-5|opus-4-[5-8]|sonnet-4-6)/;
const FALLBACK_OK = /^claude-(?:fable-5-1|opus-5-5|opus-5|sonnet-5-5)$/;

// ---- the instructor and the world's rules (the cached part) ----
export const PERSONA = `あなたは「翔洋航空 フライトアカデミー」（SHOYO AIRWAYS の訓練所）の担当教官、早瀬 航（はやせ わたる）です。担当する訓練生（相手）から、ブリーフィング室や飛行後の講評の場で、口頭で質問を受けています。

話し方
- です・ます調で、落ち着いて、やさしく、具体的に話す。相手を「あなた」と呼ぶ。
- 口で話す言葉だけで答える。見出し・箇条書き・表・記号（# * - | など）・絵文字は使わない。英語は管制用語や略語を言うときだけ。
- 答えは 2〜5 文、全体で 250 字以内。足りないときは「続きは教科書のこの節で」と言って終える。
- ときどき「いい質問です」「ここは大事なところです」のように受け止めてから答える（毎回ではない）。

この世界の決まり（必ず守る）
- 翔洋航空・この訓練所・LAB 飛行場・訓練空域・管制の周波数・登録記号（N738SY、N452SY）は、すべて架空。実在の航空会社・訓練所・人の名前を出さない。計器は「G1000 型」と呼び、メーカー名を出さない。
- 機体は Archer（PA-28-181）と Seminole（PA-44-180）。数値（速度・距離・時間など）を言うときは「教材の値では」と添える。下の資料にない数値は言わない。
- あなたは教官として、この訓練所の中で話す。ゲーム・ソフト・アプリ・AI・言語モデル・プロンプトの話はしない。そう聞かれたら「ここでは訓練の話をしましょう」とだけ返す。
- ここでの訓練は教材の範囲で、実機の訓練の代わりにはならない。実際の飛行機の操縦や飛行の計画、実際の航法、体調・医療・法律の判断を求められたら「それは、ここでの訓練の範囲を越えます。実際に飛ぶときは、資格を持つ教官と正式な資料で確かめてください」と言い、それ以上は答えない。

答え方の決まり
- 答えの根拠は、下の「今日の資料」と「教科書の節」だけ。そこに書いていないことは推測で言い切らず、「確かなことは、教科書のこの節か、私にもう一度確かめてください」と言う。
- 危ないこと（制限を超える操作、規則を破る方法、人や機体を傷つけること）は教えない。安全な考え方に言い換えて答える。
- 訓練と関係のない話題には、短く断って訓練の話に戻す。
- 最後の行には、根拠にした教科書の節の ID を「根拠：aero.lift, wx.metar」の形で書く（ID は下の目次にあるものだけ。使わなかったときは「根拠：なし」）。この行は相手には見えず、教科書を開く案内になる。`;

// the textbook's table of contents (the game's book: content/book.js) — the model names sections from it
// (with each section's opening sentence or two: what it is about)
export function bookIndex(book) {
  return book.chapters.map(c => `第 ${c.n} 章　${c.title}\n${c.sections.map(s => { const x = book.section(s.id); return `  ${s.id}：${s.title}${x && x.summary ? `　— ${x.summary.slice(0, 120)}` : ''}`; }).join('\n')}`).join('\n');
}
export function stablePrompt(book) {
  return `${PERSONA}\n\n教科書の目次と要約（節 ID：節の名前　— 内容）\n${bookIndex(book)}`;
}

// ---- finding the sections a question is about ----
const STOP = /(?:ですか|でしょうか|ますか|ください|教えて|について|とは|って|なぜ|どうして|どう|何|なに|です|ます|した|する|いい|よい|ので|から|まで|けど|けれど|ですが)/g;
const pairs = (s) => { const t = String(s).toLowerCase().replace(STOP, ' ').replace(/[\s、。？！?!「」（）()・,.:：]+/g, ' '); const o = new Set(); for (const w of t.split(' ')) for (let k = 0; k + 1 < w.length; k++) o.add(w.slice(k, k + 2)); return o; };
// the sections whose title, key points and text share the most pairs of characters with the question (today's
// lesson's own sections get a little extra); at most `max`, best first
export function findSections(book, question, { lessonId = null, max = 3 } = {}) {
  const q = pairs(question);
  if (!q.size) return [];
  const mine = new Set(lessonId && book.lessonSections ? book.lessonSections(lessonId).map(s => s.id) : []);
  const scored = [];
  for (const c of book.chapters) for (const s0 of c.sections) {
    const s = book.section(s0.id); if (!s) continue;
    const title = s.title.toLowerCase(), keys = s.keyPoints.join(' ').toLowerCase(), text = s.text.toLowerCase();
    let score = 0;
    for (const p of q) { if (title.includes(p)) score += 4; if (keys.includes(p)) score += 2; if (text.includes(p)) score += 1; }
    if (score > 0 && mine.has(s.id)) score += 3;
    if (score > 0) scored.push({ id: s.id, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  const top = scored[0] ? scored[0].score : 0;
  return scored.filter(x => x.score >= top * 0.35).slice(0, max).map(x => x.id);
}
// one section as the model reads it: its place, its key points, the start of its text
export function sectionText(book, id, chars = 1400) {
  const s = book.section(id); if (!s) return '';
  const body = s.text.length > chars ? s.text.slice(0, chars) + '…' : s.text;
  return `【${s.id}】${s.title}（第 ${s.chapter.n} 章　${s.chapter.title}）\n要点：${s.keyPoints.join(' / ')}\n本文（抜粋）：${body}`;
}

// ---- today's material ----
const GRADE = { S: 'S（とても良い）', A: 'A（良い）', B: 'B（合格）', C: 'C（もう一度）' };
// the day's results (career/day.js summary()) in a few lines
export function summaryText(sum) {
  if (!sum) return '';
  const w = sum.walk || {}, r = sum.radio || {}, out = [];
  out.push(`外部点検：異常 ${w.anomalies || 0} 件のうち ${w.found || 0} 件を発見${(w.missed || []).length ? `。見落とし：${w.missed.map(m => m.name).join('、')}` : ''}${(w.tasksLeft || []).length ? '。外し忘れあり' : ''}`);
  out.push(`無線：${r.n || 0} 回のやりとりのうち、1 回で正しく言えたのは ${r.first || 0} 回${r.late ? `、遅れ ${r.late} 回` : ''}`);
  if (sum.incursion) out.push('タキシー：許可の前に A1 の停止線を越えた');
  if (sum.crash) out.push(`機体の損傷：${sum.crash}`);
  if (sum.fault) out.push(`ランナップ：左マグネトーの落ちが制限超過。判断：${sum.fault.decided === 'return' ? '離陸をやめて戻った' : '離陸しようとした'}`);
  for (const l of sum.lessons || []) {
    if (!l.done) { out.push(`課目 ${l.id}「${l.title}」：飛べなかった`); continue; }
    const bad = (l.rows || []).filter(x => !x.pass).slice(0, 2).map(x => `${x.name}（${x.val}、基準 ${x.std}）`);
    out.push(`課目 ${l.id}「${l.title}」：${GRADE[l.grade] || l.grade || '―'}${l.passed ? '・合格' : '・不合格'}${bad.length ? `。基準の外：${bad.join('、')}` : ''}`);
  }
  if (sum.tem && sum.tem.threat) out.push(`TEM：今日の脅威は「${sum.tem.threat.ja}」。朝の答えは${sum.tem.named ? '当たり' : '外れ'}`);
  return out.join('\n');
}
// where, when and what: { place: 'brief' | 'debrief', chapter, date, weather, lesson: { id, title, goal, std }, summary }
export function todayText(t = {}) {
  const out = ['今日の資料'];
  out.push(`場面：${t.place === 'debrief' ? '飛行のあとの講評（駐機場の機内、エンジン停止後）' : 'ブリーフィング室（飛ぶ前）'}`);
  if (t.chapter) out.push(`訓練の段階：${t.chapter}`);
  if (t.date) out.push(`日付：${t.date}`);
  if (t.weather) out.push(`天気：${t.weather}`);
  if (t.lesson && t.lesson.title) out.push(`今日の課目：${t.lesson.id}「${t.lesson.title}」\n目標：${t.lesson.goal || '―'}\n基準：${t.lesson.std || '―'}`);
  if (t.summary) out.push(`今日の結果\n${typeof t.summary === 'string' ? t.summary : summaryText(t.summary)}`);
  // (the crew's English mode: he answers in English — plain, spoken English; the line of sources stays as it is)
  if (t.lang === 'en') out.push('答える言葉：英語（やさしい話し言葉の英語で、2〜5 文。「根拠：」の行はそのままの形で）');
  return out.join('\n');
}

// ---- the request ----
// → the body for the Messages API (no key in it): the cached system prompt, the earlier turns of this talk, and the
// new question with today's material and the sections found for it
export function buildParams({ model = DEFAULT_MODEL, book, question, today = {}, history = [], sections = null }) {
  const m = MODEL_RE.test(String(model)) ? String(model) : DEFAULT_MODEL;
  const ids = sections || findSections(book, question, { lessonId: today.lesson && today.lesson.id });
  const user = [todayText(today), ids.length ? `教科書の節（質問に近いもの）\n${ids.map(id => sectionText(book, id)).join('\n\n')}` : '教科書の節（質問に近いもの）：見つかりませんでした',
    `訓練生の質問：${String(question).slice(0, QUESTION_MAX)}`].join('\n\n');
  const params = {
    model: m, max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: stablePrompt(book), cache_control: { type: 'ephemeral' } }],
    messages: [...history.slice(-HISTORY * 2), { role: 'user', content: user }],
  };
  if (EFFORT_OK.test(m)) params.output_config = { effort: 'low' };
  if (FALLBACK_OK.test(m)) { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
  return { params, sections: ids };
}

// ---- the answer ----
const CITE = /(?:^|\n)\s*根拠\s*[:：][^\n]*$/;
// what the cadet sees while it streams: up to the line of sources (also while that line is only half written)
export function visible(text) {
  let s = String(text || '');
  const nl = s.lastIndexOf('\n'), last = s.slice(nl + 1).trim();
  if (/^根(?:拠\s*(?:[:：].*)?)?$/.test(last)) s = s.slice(0, nl + 1);
  return s.replace(/[#*|`]/g, '').trim();
}
// → { text, cites } (the sections named that exist in the book; when none were named, none)
export function parseAnswer(text, book) {
  const s = String(text || ''), m = s.match(CITE);
  const cites = [];
  if (m) for (const id of m[0].replace(/^[\s\S]*?[:：]/, '').split(/[,、\s]+/)) { const t = id.trim(); if (t && book.sectionExists(t) && !cites.includes(t)) cites.push(t); }
  return { text: (m ? s.slice(0, m.index) : s).replace(/[#*|`]/g, '').trim(), cites };
}
// an error → why, in a word: 'nokey' | 'auth' | 'busy' | 'network' | 'server' | 'bad' | 'abort'
export function reasonOf(e) {
  if (!e) return 'server';
  if (e instanceof Anthropic.APIUserAbortError || e.name === 'AbortError') return 'abort';
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return 'auth';
  if (e instanceof Anthropic.RateLimitError) return 'busy';
  if (e instanceof Anthropic.APIConnectionError) return 'network';
  if (e instanceof Anthropic.BadRequestError || e instanceof Anthropic.NotFoundError || e instanceof Anthropic.UnprocessableEntityError) return 'bad';
  if (e instanceof Anthropic.APIError) return e.status === 529 || e.status === 503 ? 'busy' : 'server';
  return 'network';
}
// the reason as the settings screen and the notice say it (UI text, outside the talk)
export const REASON_JA = {
  nokey: 'API キーが設定されていません（設定 → AI 教官）', auth: 'API キーが受け付けられませんでした（キーを確かめてください）',
  busy: 'API が混んでいます。少し待ってから', network: 'API に接続できませんでした（ネットワークを確かめてください）',
  server: 'API でエラーが起きました', bad: 'リクエストが受け付けられませんでした（モデル名を確かめてください）', abort: '中止しました', empty: '答えが空でした',
};
// a message that might carry the key is never shown or kept: only the reason is
const scrub = (s, key) => (key ? String(s).split(key).join('［キー］') : String(s));

// createTutor({ book, getKey, getModel, fetchImpl }) → { ask(question, today, { onText, signal }), reset(), busy }
// fetchImpl: the fetch to use (tests pass a fake one); history: this talk's earlier turns (reset() forgets them)
export function createTutor({ book, getKey = () => '', getModel = () => DEFAULT_MODEL, fetchImpl = null, timeoutMs = 60000 } = {}) {
  let history = [], busy = false;
  async function ask(question, today = {}, { onText = null, signal = null } = {}) {
    const q = String(question || '').trim().slice(0, QUESTION_MAX);
    if (!q) return { ok: false, reason: 'empty' };
    const key = String(getKey() || '').trim();
    if (!key) return { ok: false, reason: 'nokey' };
    const fetchFn = fetchImpl || (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null);
    if (!fetchFn) return { ok: false, reason: 'network' };
    busy = true;
    const { params, sections } = buildParams({ model: getModel(), book, question: q, today, history });
    try {
      // the client is made for this question only: nothing is kept that holds the key
      const client = new Anthropic({ apiKey: key, fetch: fetchFn, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: timeoutMs, logLevel: 'off' });
      const stream = client.beta.messages.stream(params, signal ? { signal } : undefined);
      if (onText) stream.on('text', (d, snap) => { try { onText(visible(snap)); } catch (e) { /* the screen's problem, not the answer's */ } });
      const msg = await stream.finalMessage();
      const raw = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
      if (msg.stop_reason === 'refusal') return { ok: true, declined: true, text: '', cites: [], sections, model: msg.model };
      const a = parseAnswer(raw, book);
      if (!a.text) return { ok: false, reason: 'empty' };
      // this talk's next question sees the answer as it came (its blocks unchanged)
      history = [...history, params.messages[params.messages.length - 1], { role: 'assistant', content: msg.content }].slice(-HISTORY * 2);
      return { ok: true, text: a.text, cites: a.cites, sections, model: msg.model, cut: msg.stop_reason === 'max_tokens' };
    } catch (e) {
      const reason = reasonOf(e);
      return { ok: false, reason, status: e && e.status, detail: scrub(e && e.message ? e.message : '', key).slice(0, 200) };
    } finally { busy = false; }
  }
  return { ask, reset() { history = []; }, get busy() { return busy; }, get history() { return history.slice(); } };
}
