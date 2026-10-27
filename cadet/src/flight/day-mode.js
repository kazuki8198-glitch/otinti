// CADET — flight/day-mode.js : a flying day in the aircraft (M4's first day; M5: any day of chapter 2 and the first
// solo). fly-mode boards and flies; this drives the day (career/day.js) through it, frame by frame:
//  - the checklists (the HUD's list ticks as the switches are set; Enter confirms what is looked at; Y leaves the
//    current list to the instructor, whose hands set it item by item), a ring round the control to use next;
//  - the radio (the panel, 1–3 or a click to answer, the controllers' English spoken when the voice is on; M8: with
//    the microphone on, M and the answer said aloud — dialog/readback.js finds which one, or what is missing);
//  - the taxiing (the way drawn on the pavement; Y: the instructor taxis, "I have control");
//  - the lessons: the first begins where the cadet lined up (FLIGHT LAB's own start, 30 m past the threshold: the
//    picture blends the last few metres); the others after a move — to the practice area, back, round the circuit —
//    skipped (a fade) or flown (the cadet flies there, the lesson begins on arrival), or after a forced landing the
//    instructor's 'recover' (always a fade); after each the flight carries on as CADET's own until the next;
//  - the debrief and the logbook at the end.
// h is fly-mode's handle (what it lends: the flight, the systems, the cockpit, the voice, the fades, the HUDs).
import { routeOut, routeLineUp, routeIn, routeBack, createTaxiPilot, exitFor } from './taxi.js';
import { PHASE_LINES, ASSIST_LINES, EVENT_LINES, RECOVER_LINE, SOLO_LINES } from '../content/dialog/day1.js';
import { spoken } from '../content/dialog/atc.js';
import { createMic, MIC_REASON_JA } from '../ui/mic.js';
import { matchReadback } from '../dialog/readback.js';

const COM = { atis: 127650, ground: 121700, groundIn: 121700, tower: 118300, leave: 118300, back: 118300, exit: 118300, takeoff: 118300, closed: 118300, stopgo: 118300 };
const PLACES = new Set(['taxiOut', 'lineup', 'taxiOff', 'taxiIn']);
// where each move's question is asked (the instructor's talk; on the first solo the HUD asks)
const ASK = { transit: 'transit', return: 'return', pattern: 'pattern', recycle: 'pattern' };

export function createDayMode(h) {
  const { FL, flight, systems } = h;
  const P = FL.physics, R = P.LAB_RWY;
  let day = null, level = 'basic', assistOn = false, assistT = 0, taxi = null, fly = null, flash = '', flashT = 0, lastPhase = '', FLOW = [], solo = false, recoverT = 0, asking = false;
  const queue = []; let lineT = 0;
  // (M8) the microphone (made on its first use, only when it is on in the settings): what it heard, for which exchange
  let mic = null, micState = null, micFor = '', micGen = 0;          // (micGen: which listen a result belongs to)
  const exId = (v) => (v ? `${v.seq}:${v.id}` : '');
  function micKey() {
    if (!h.settings.get('micRadio')) return false;
    const v = day.atc.view(); if (!v || v.phase !== 'choose') return false;
    if (!mic) mic = h.mic || createMic();
    if (mic.busy) { mic.stop(); return true; }
    const id = micFor = exId(v), gen = ++micGen; micState = { on: true };
    mic.listen().then((r) => {
      if (!day || gen !== micGen || micFor !== id) return;               // (stopped meanwhile: stopMic)
      if (!h.settings.get('micRadio')) { micState = null; return; }         // (turned off meanwhile: what it heard is not used)
      const v2 = day.atc.view();
      if (!v2 || v2.phase !== 'choose' || exId(v2) !== id) { micState = null; return; }
      if (!r.ok) { micState = { msg: MIC_REASON_JA[r.reason] || MIC_REASON_JA['no-speech'] }; return; }
      const right = day.atc.rightIndex();
      const m = matchReadback(v2.choices.map((c, i) => ({ en: c.en, ok: i === right })), r.texts, { call: day.radio.call, number: v2.kind === 'listen' });
      if (m.pick >= 0) { micState = { heard: m.heard }; day.atc.answer(m.pick); if (h.audio.click) h.audio.click(); }
      else micState = { heard: m.heard, missing: m.missing.map(k => k.ja), msg: 'もう一度 M で言い直すか、1〜3 キーで答えてください' };
    });
    return true;
  }
  // ---- the instructor's words, one after another
  function say(text, ms) { if (!text) return; queue.push([text, ms]); }
  // (alone: the cadet's own reminders, not the instructor's voice)
  const note = (text, ms) => { if (text && h.note) h.note(text, ms || 3600); }
  function pumpLines(dt) {
    if ((lineT -= dt) > 0 || !queue.length) return;
    const [text, ms] = queue.shift();
    const d = ms || Math.min(7000, 1800 + text.length * 70);
    h.say(text, d); lineT = d / 1000 + 0.3;
  }
  // ---- the controllers' voice (the browser's English speech, when the setting is on)
  function speak(en) {
    // the receiver's hiss under the transmission (about as long as it takes to say: some 13 letters a second)
    if (h.audio.radio) h.audio.radio(1.2 + String(en).length / 13); else if (h.audio.squelch) h.audio.squelch();
    const synth = globalThis.speechSynthesis;
    if (!synth || h.settings.get('atcVoice') === false || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      const u = new SpeechSynthesisUtterance(spoken(en));
      const v = synth.getVoices().find(x => /^en(-|_)US/i.test(x.lang)) || synth.getVoices().find(x => /^en/i.test(x.lang));
      if (v) u.voice = v;
      u.lang = 'en-US'; u.rate = 1.05; u.volume = Math.max(0, Math.min(1, (h.settings.get('volume') ?? 0.8) * (h.settings.get('volRadio') ?? 1)));
      synth.speak(u);
    } catch (e) { /* no speech here */ }
  }
  const pos = () => { const p = P.ne(flight.s), rc = P.rwyCoords(R, p.n, p.e); return { a: rc.along, c: rc.cross }; };
  const cx = { dt: 0, sw: null, sys: null, s: null, park: false, av: null, rpm: 0, pos: null, v: 0, hdg: 0, onGround: true,
    act: (a, x) => flight.action(a, x), setThr: (x) => { if (flight.free) flight.s.thr = x; }, setFlaps: (i) => { if (flight.free) flight.s.flapIdx = i; }, prime: () => systems.prime() };
  function ctx(dt) {
    const s = flight.s;
    cx.dt = dt; cx.sw = systems.sw; cx.sys = systems; cx.s = s; cx.park = flight.controls.parkBrake; cx.av = flight.av; cx.rpm = systems.rpm;
    cx.pos = pos(); cx.v = Math.hypot(s.vel[0], s.vel[2]); cx.hdg = P.attitude(s).hdg; cx.onGround = s.onGround;
    return cx;
  }

  function begin(d, lv) {
    day = d; level = lv; assistOn = false; taxi = null; fly = null; lastPhase = ''; queue.length = 0; lineT = 0; recoverT = 0; asking = false;
    solo = !!(d.plan && d.plan.solo);
    FLOW = d.steps.filter(p => p !== 'done');
    // the instructor's look round the aircraft: what was left undone, what was missed (he puts it right)
    const pend = day.walk.pending();
    if (pend.length) { if (solo) note(`外部点検の残りは、整備の大城さんが見てくれていた。${pend.map(p => p.say).join('')}`, 9000); else say(EVENT_LINES.walkFound(pend.map(p => p.say).join('')), 9000); }
    day.boarded();
    onPhase(day.phase);
  }
  // ---- what each phase starts
  function onPhase(to) {
    const k = day.st.step;
    if (k === lastPhase) return; lastPhase = k;
    assistOn = false; taxi = null; flash = ''; asking = false;
    if (solo) note(SOLO_LINES[to]); else if (PHASE_LINES[to]) say(PHASE_LINES[to]);
    if (COM[to] && flight.av) { flight.av.com1.act = COM[to]; if (h.markDirty) h.markDirty(); }
    const stand = h.stand;
    h.routeLine.set(to === 'taxiOut' ? routeOut(stand) : to === 'lineup' ? routeLineUp() : to === 'taxiOff' ? routeIn(pos(), stand).off
      : to === 'taxiIn' ? (back() ? routeBack(stand) : routeIn({ a: day.st.exit === 'A3' ? 1160 : 590, c: 0 }, stand).in) : null);
    if (to === 'runup' || to === 'shutdown') { /* the cadet sets the brake (the first item) */ }
    const inf = day.info(to);
    // a lesson that starts where the day is (lined up on the runway): at once, from where the cadet stopped
    if (inf.lesson && k > 0 && !day.info(day.steps[k - 1]).move) h.startLesson(to, level, { handoff: true });
    else if (inf.move === 'recover') { say(RECOVER_LINE, 6500); recoverT = 4.5; }
    else if (inf.move) {
      // the question: the instructor's (his talk), or on the first solo the HUD's own (1 / 2)
      if (solo) asking = true; else h.talk(ASK[inf.move]);
    }
    else if (to === 'debrief') { h.routeLine.set(null); h.debrief(day.summary()); }
  }
  // the answer to a move's question ('skip' | 'fly')
  function onChoice(arg) {
    if (!day || !day.info(day.phase).move) return;
    asking = false;
    day.transitFlown(arg);
    if (arg === 'fly') fly = day.nextLesson(); else startNext();
  }
  // the decision on the run-up's fault: once more after a lean run-up, or back to the stand (the route from here)
  // (back to the stand from the hold-short line: the run-up's fault)
  const back = () => !!(day && day.st.fault && day.st.fault.decided);
  function onFault(arg) {
    if (!day) return;
    const r = day.decideFault(arg);
    if (r === 'again') { say('1,800 rpm で、ミクスチャーを少し絞って 30 秒。それから左右のマグネトーを 1 つずつ、もう一度。', 6000); return; }
    if (r) { h.routeLine.set(routeBack(h.stand)); say('駐機場へ戻ります。地上管制には連絡しました。タキシーは、いつもどおりに。', 6000); }
  }
  // where the next lesson begins, and what the screen says on arriving there
  const ARRIVE = { area: '訓練空域に着きました', downwind: 'ダウンウインド：地上 1,000 ft', final: '最終進入：滑走路 36' };
  function startNext() {
    const id = day.nextLesson(); fly = null; recoverT = 0;
    if (!id) return;
    const at = (FL.school.lesson(id).setup || {}).at;
    if (id === 't3' || id === 't4') day.atc.start('final');
    h.startLesson(id, level, { fade: true, toast: ARRIVE[at] || ARRIVE.area });
    day.lessonStarted(id);
  }
  // a lesson has ended (fly-mode's onEnded): the day records it and the flight carries on as CADET's own
  function lessonEnded(st) {
    if (!day) return;
    const at = pos();
    day.lessonEnded(st.id, { ...st, exit: exitFor(at.a) });
    if (!st.crashed) flight.continueFree();
  }
  // where a flown move goes: the next lesson's own start (FLIGHT LAB places it: the practice area, the downwind, the
  // final), found by starting it on the side (a fresh lesson: nothing of the flight is touched)
  const targets = new Map();
  function flyTarget() {
    if (!fly) return null;
    if (!targets.has(fly)) {
      const L0 = FL.school.startLesson(fly, level), p = P.ne(L0.s), at = (FL.school.lesson(fly).setup || {}).at;
      const ft = Math.round(L0.s.out.altTrue / 100) * 100, hdg = P.attitude(L0.s).hdg;
      targets.set(fly, at === 'area' || at === 'away'
        ? { n: p.n, e: p.e, ft, minFt: ft - 800, r: 2500, name: at === 'area' ? '訓練空域' : '課目の始まる空域' }
        : { n: p.n, e: p.e, ft, minFt: 0, r: 1200, hdg, name: at === 'downwind' ? 'ダウンウインドの課目の始まる地点' : `最終進入 ${((L0.def.setup || {}).km || 5)} km の地点` });
    }
    return targets.get(fly);
  }
  function flyCheck() {
    const T = flyTarget(); if (!T) return null;
    const p = P.ne(flight.s), d = Math.hypot(T.n - p.n, T.e - p.e), brg = (Math.atan2(T.e - p.e, T.n - p.n) / Math.PI * 180 + 360) % 360;
    const mag = Math.round(FL.avionics.trueToMag(brg, P.MAGVAR_W)) || 360, ft = flight.s.out.altTrue;
    const near = d < T.r && (T.hdg == null || Math.abs(P.wrap180(P.attitude(flight.s).hdg - T.hdg)) < 50) && !flight.s.onGround && ft > T.minFt;
    if (near) startNext();
    return `${T.name}へ：針路 ${String(mag).padStart(3, '0')}°・${(d / 1852).toFixed(1)} NM・${T.ft.toLocaleString('en-US')} ft`;
  }

  // ---- every frame (stop: talking, a fade, the menu)
  function update(dt, { stop = false } = {}) {
    if (!day) return;
    pumpLines(dt);
    if ((flashT -= dt) <= 0) flash = '';
    // the instructor's 'recover' (after a forced landing): his words, then the fade to the next lesson
    if (recoverT > 0 && !stop && (recoverT -= dt) <= 0 && day.info(day.phase).move === 'recover') startNext();
    const lessonOn = !flight.free && flight.L && !flight.L.done;
    if (!stop) {
      const c = ctx(dt);
      for (const ev of day.update(c)) {
        if (ev.type === 'phase') onPhase(ev.to);
        else if (ev.type === 'radio' && ev.kind === 'say') speak(ev.en);
        else if (ev.type === 'incursion') { say(EVENT_LINES.incursion, 4500); if (h.audio.chime) h.audio.chime(); }
        // (M7) the run-up's fault: the instructor asks (his talk: the hook 'go' → onFault)
        else if (ev.type === 'fault') { assistOn = false; h.talk(ev.tries ? 'fault2' : 'fault'); }
        else if (ev.type === 'tick' && h.audio.knob) h.audio.knob();
      }
      // the instructor's hands: the list item by item, a little apart
      if (assistOn && day.st.list && !lessonOn) {
        if ((assistT -= dt) <= 0) { assistT = 0.7; day.assist(ctx(0)); }
      } else assistOn = false;
      // his taxiing ends stopped on the brakes (the parking brake set where the day waits there)
      if (taxi && taxi.state.done && taxi.state.stopped) {
        taxi = null;
        if (day.phase !== 'lineup') flight.action('parkBrake', true);
        if (!solo) say(ASSIST_LINES.taxiDone, 3000);
      }
    }
    h.routeLine.update(performance.now() / 1000, pos(), dt);
    // the HUD
    const ph = day.phase, k = Math.min(day.st.step, FLOW.length - 1), inf = day.info(ph);
    const items = day.items(), cur = items && items.items[items.i];
    let text = '', keys = [];
    if (items && cur) { text = `${cur.name}：${cur.what}`; keys = cur.confirm ? [['Enter', '確認した'], ['Y', '教官に任せる']] : [['Y', '教官に任せる']]; }
    else if (PLACES.has(ph)) { text = ph === 'taxiOut' ? '地面の線をたどって、A1 の停止線の手前で止まる' : ph === 'lineup' ? '滑走路 36 のセンターラインに合わせて止まる' : ph === 'taxiOff' ? '右へ出て、停止線を越えたら止まる' : '駐機場のいつもの場所（N738SY の場所）で止まる'; keys = taxi ? [] : [['Q / E', 'ペダル（向き）'], ['R / F', 'スロットル'], ['B', 'ブレーキ'], ['Shift+B', 'パーキングブレーキ'], ['Y', '教官に任せる']]; }
    else if (inf.radio) { text = '管制との交信'; keys = h.settings.get('micRadio') ? [['1〜3', '答える'], ['M', '声で答える']] : [['1〜3', '答える']]; }
    else if (fly) text = flyCheck() || '';
    else if (asking) { text = '次の課目の始まるところまで'; keys = [['1', '自分で飛んで行く'], ['2', '移動を省く']]; }
    else if (inf.lesson) text = '';
    h.dayHud.setTask(lessonOn || ph === 'debrief' || ph === 'done' ? null : { kicker: `${solo ? 'ファーストソロ' : '今日の流れ'} ${k + 1} / ${FLOW.length}`, title: inf.label, text, keys,
      flow: FLOW.map((p, i) => ({ done: i < k, cur: i === k, lesson: !!day.info(p).lesson })) });
    h.dayHud.setChecklist(lessonOn ? null : items, flash);
    const rv = day.atc.view();
    if (micState && !micState.on && exId(rv) !== micFor) micState = null;          // (the next exchange: the mic's note goes)
    h.dayHud.setRadio(rv, { mic: !!h.settings.get('micRadio') });
    if (h.dayHud.setMic) h.dayHud.setMic(micState);
    h.setGuide(!lessonOn && cur && cur.ctl ? cur.ctl : null);
  }
  // keys (once per press): Enter, Y, 1–3 → true when used
  function key(code) {
    if (!day || day.phase === 'done' || day.phase === 'debrief') return false;
    const lessonOn = !flight.free && flight.L && !flight.L.done;
    if ((code === 'Enter' || code === 'NumpadEnter') && day.st.list && !lessonOn) {
      if (!day.confirm(ctx(0))) { const it = day.items(); const cur = it && it.items[it.i]; if (cur) { flash = `まだ：${cur.name}（${cur.what}）`; flashT = 2.5; } }
      return true;
    }
    // the first solo's own question (no one to ask): 1 fly there, 2 skip
    if (asking && /^(Digit|Numpad)[12]$/.test(code)) { onChoice(code.endsWith('1') ? 'fly' : 'skip'); return true; }
    if (code === 'KeyY' && !lessonOn && !solo) {
      if (day.st.list && !assistOn) { assistOn = true; assistT = 0.4; say(ASSIST_LINES.list, 3000); return true; }
      if (PLACES.has(day.phase) && !taxi) {
        const stand = h.stand, ph = day.phase;
        const pts = ph === 'taxiOut' ? routeOut(stand) : ph === 'lineup' ? routeLineUp() : ph === 'taxiOff' ? routeIn(pos(), stand).off : back() ? routeBack(stand) : routeIn({ a: day.st.exit === 'A3' ? 1160 : 590, c: 0 }, stand).in;
        flight.action('parkBrake', false);
        taxi = createTaxiPilot(FL, pts, ph === 'lineup' ? { speed: 2.2, turnSpeed: 1.8 } : {});
        say(ASSIST_LINES.taxi, 3500);
        return true;
      }
      return false;
    }
    if (code === 'KeyM' && !(flight.L && flight.L.atc) && micKey()) return true;
    if (/^(Digit|Numpad)[123]$/.test(code) && !(flight.L && flight.L.atc)) {
      const v = day.atc.view();
      if (v && v.phase === 'choose') { day.atc.answer(+code.slice(-1) - 1); if (h.audio.click) h.audio.click(); return true; }
    }
    return false;
  }
  function answer(k) { if (!day) return; const v = day.atc.view(); if (v && v.phase === 'choose') day.atc.answer(k); }
  // the taxi along the day's way by the taxi pilot, whoever is in the right seat (the tests: the solo's taxiing)
  function autoTaxi() {
    if (!day || !PLACES.has(day.phase) || taxi) return false;
    const stand = h.stand, ph = day.phase;
    const pts = ph === 'taxiOut' ? routeOut(stand) : ph === 'lineup' ? routeLineUp() : ph === 'taxiOff' ? routeIn(pos(), stand).off : back() ? routeBack(stand) : routeIn({ a: day.st.exit === 'A3' ? 1160 : 590, c: 0 }, stand).in;
    flight.action('parkBrake', false);
    taxi = createTaxiPilot(FL, pts, ph === 'lineup' ? { speed: 2.2, turnSpeed: 1.8 } : {});
    return true;
  }
  // (M8) listening no more: the pause menu opened (note: a word left on the radio panel, until the next exchange), the
  // setting turned off (all: the panel's last note goes too). What a stopped listen heard is not used.
  function stopMic({ note = '', all = false } = {}) {
    const live = !!(mic && mic.busy); micGen++;
    if (live) mic.stop();
    if (live && note && !all) micState = { msg: note };
    else if (live || all) { micState = null; micFor = ''; }
  }
  function end() { if (mic) mic.stop(); micState = null; micFor = ''; day = null; assistOn = false; taxi = null; fly = null; asking = false; recoverT = 0; queue.length = 0; targets.clear(); h.routeLine.set(null); h.dayHud.hideAll(); h.setGuide(null); }
  return {
    begin, update, key, answer, onChoice, lessonEnded, end, speak, autoTaxi, stopMic,
    get active() { return !!day; }, get day() { return day; }, get pilot() { return taxi ? taxi.fly : null; }, get flying() { return fly; },
    onFault, get assisting() { return assistOn || !!taxi; }, get mic() { return micState; }, get solo() { return solo; }, get asking() { return asking; },
    // for the tests: the instructor's hands for everything until `phase` (or the next lesson)
    assist() { assistOn = true; assistT = 0; },
  };
}
