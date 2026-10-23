// CADET — flight/day-mode.js : the first day in the aircraft (M4). fly-mode boards and flies; this drives the day
// (career/day.js) through it, frame by frame:
//  - the checklists (the HUD's list ticks as the switches are set; Enter confirms what is looked at; Y leaves the
//    current list to the instructor, whose hands set it item by item), a ring round the control to use next;
//  - the radio (the panel, 1–3 or a click to answer, the controllers' English spoken when the voice is on);
//  - the taxiing (the way drawn on the pavement; Y: the instructor taxis, "I have control");
//  - the lessons: t1 begins where the cadet lined up (FLIGHT LAB's own start, 30 m past the threshold: the picture
//    blends the last few metres), a2 and t3 after the transit — skipped (a fade) or flown (the cadet flies there, the
//    lesson begins on arrival); after each the flight carries on as CADET's own until the next;
//  - the debrief and the logbook at the end.
// h is fly-mode's handle (what it lends: the flight, the systems, the cockpit, the voice, the fades, the HUDs).
import { PHASES, ORDER } from '../career/day.js';
import { routeOut, routeLineUp, routeIn, createTaxiPilot, exitFor } from './taxi.js';
import { PHASE_LINES, ASSIST_LINES, EVENT_LINES } from '../content/dialog/day1.js';
import { spoken } from '../content/dialog/atc.js';

const COM = { atis: 127650, ground: 121700, groundIn: 121700, tower: 118300, leave: 118300, back: 118300, exit: 118300 };
const PLACES = new Set(['taxiOut', 'lineup', 'taxiOff', 'taxiIn']);
// the day's steps shown as the bar (the lessons thicker)
const FLOW = ORDER.filter(p => p !== 'done');

export function createDayMode(h) {
  const { FL, flight, systems } = h;
  const P = FL.physics, R = P.LAB_RWY;
  let day = null, level = 'basic', assistOn = false, assistT = 0, taxi = null, fly = null, flash = '', flashT = 0, lastPhase = '';
  const queue = []; let lineT = 0;
  // ---- the instructor's words, one after another
  function say(text, ms) { if (!text) return; queue.push([text, ms]); }
  function pumpLines(dt) {
    if ((lineT -= dt) > 0 || !queue.length) return;
    const [text, ms] = queue.shift();
    const d = ms || Math.min(7000, 1800 + text.length * 70);
    h.say(text, d); lineT = d / 1000 + 0.3;
  }
  // ---- the controllers' voice (the browser's English speech, when the setting is on)
  function speak(en) {
    if (h.audio.squelch) h.audio.squelch();
    const synth = globalThis.speechSynthesis;
    if (!synth || h.settings.get('atcVoice') === false || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      const u = new SpeechSynthesisUtterance(spoken(en));
      const v = synth.getVoices().find(x => /^en(-|_)US/i.test(x.lang)) || synth.getVoices().find(x => /^en/i.test(x.lang));
      if (v) u.voice = v;
      u.lang = 'en-US'; u.rate = 1.05; u.volume = Math.max(0, Math.min(1, h.settings.get('volume') ?? 0.8));
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
    day = d; level = lv; assistOn = false; taxi = null; fly = null; lastPhase = ''; queue.length = 0; lineT = 0;
    // the instructor's look round the aircraft: what was left undone, what was missed (he puts it right)
    const pend = day.walk.pending();
    if (pend.length) say(EVENT_LINES.walkFound(pend.map(p => p.say).join('')), 9000);
    day.boarded();
    onPhase(day.phase);
  }
  // ---- what each phase starts
  function onPhase(to) {
    if (to === lastPhase) return; lastPhase = to;
    assistOn = false; taxi = null; flash = '';
    if (PHASE_LINES[to]) say(PHASE_LINES[to]);
    if (COM[to] && flight.av) { flight.av.com1.act = COM[to]; if (h.markDirty) h.markDirty(); }
    const stand = h.stand;
    h.routeLine.set(to === 'taxiOut' ? routeOut(stand) : to === 'lineup' ? routeLineUp() : to === 'taxiOff' ? routeIn(pos(), stand).off
      : to === 'taxiIn' ? routeIn({ a: day.st.exit === 'A3' ? 1160 : 590, c: 0 }, stand).in : null);
    if (to === 'runup' || to === 'shutdown') { /* the cadet sets the brake (the first item) */ }
    if (to === 't1') h.startLesson('t1', level, { handoff: true });
    else if (to === 'transit') h.talk('transit');
    else if (to === 'return') h.talk('return');
    else if (to === 'debrief') { h.routeLine.set(null); h.debrief(day.summary()); }
  }
  // the transit / return answer ('skip' | 'fly')
  function onChoice(arg) {
    if (!day) return;
    day.transitFlown(arg);
    if (day.phase === 'transit') { if (arg === 'fly') fly = 'area'; else startA2(); }
    else if (day.phase === 'return') { if (arg === 'fly') fly = 'final'; else startT3(); }
  }
  function startA2() { fly = null; h.startLesson('a2', level, { fade: true, toast: '訓練空域に着きました' }); day.lessonStarted('a2'); }
  function startT3() { fly = null; h.startLesson('t3', level, { fade: true, toast: '最終進入 5 km：滑走路 36' }); day.lessonStarted('t3'); day.atc.start('final'); }
  // a lesson has ended (fly-mode's onEnded): the day records it and the flight carries on as CADET's own
  function lessonEnded(st) {
    if (!day) return;
    const at = pos();
    day.lessonEnded(st.id, { ...st, exit: exitFor(at.a) });
    if (!st.crashed) flight.continueFree();
  }
  // where a flown transit goes: the lesson's own start (a2: FLIGHT LAB's 'area' point; t3: 5 km out on the centre line)
  function flyTarget() {
    if (fly === 'area') return { n: 7000, e: -37500, ft: 3000, r: 2500, name: '訓練空域' };
    if (fly === 'final') { const [n, e] = P.rwyToNE(R, 300 - 5000, 0); return { n, e, ft: 915, r: 1200, name: '最終進入 5 km の地点', hdg: R.trueHdg }; }
    return null;
  }
  function flyCheck() {
    const T = flyTarget(); if (!T) return null;
    const p = P.ne(flight.s), d = Math.hypot(T.n - p.n, T.e - p.e), brg = (Math.atan2(T.e - p.e, T.n - p.n) / Math.PI * 180 + 360) % 360;
    const mag = Math.round(FL.avionics.trueToMag(brg, P.MAGVAR_W)) || 360, ft = flight.s.out.altTrue * 3.28084;
    const near = d < T.r && (T.hdg == null || Math.abs(P.wrap180(P.attitude(flight.s).hdg - T.hdg)) < 50) && !flight.s.onGround;
    if (near && fly === 'area' && ft > 2200) startA2();
    else if (near && fly === 'final') startT3();
    return `${T.name}へ：針路 ${String(mag).padStart(3, '0')}°・${(d / 1852).toFixed(1)} NM・${T.ft.toLocaleString('en-US')} ft`;
  }

  // ---- every frame (stop: talking, a fade, the menu)
  function update(dt, { stop = false } = {}) {
    if (!day) return;
    pumpLines(dt);
    if ((flashT -= dt) <= 0) flash = '';
    const lessonOn = !flight.free && flight.L && !flight.L.done;
    if (!stop) {
      const c = ctx(dt);
      for (const ev of day.update(c)) {
        if (ev.type === 'phase') onPhase(ev.to);
        else if (ev.type === 'radio' && ev.kind === 'say') speak(ev.en);
        else if (ev.type === 'incursion') { say(EVENT_LINES.incursion, 4500); if (h.audio.chime) h.audio.chime(); }
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
        say(ASSIST_LINES.taxiDone, 3000);
      }
    }
    h.routeLine.update(performance.now() / 1000, pos(), dt);
    // the HUD
    const ph = day.phase, k = FLOW.indexOf(ph);
    const items = day.items(), cur = items && items.items[items.i];
    let text = '', keys = [];
    if (items && cur) { text = `${cur.name}：${cur.what}`; keys = cur.confirm ? [['Enter', '確認した'], ['Y', '教官に任せる']] : [['Y', '教官に任せる']]; }
    else if (PLACES.has(ph)) { text = ph === 'taxiOut' ? '地面の線をたどって、A1 の停止線の手前で止まる' : ph === 'lineup' ? '滑走路 36 のセンターラインに合わせて止まる' : ph === 'taxiOff' ? '右へ出て、停止線を越えたら止まる' : '駐機場のいつもの場所（N738SY の場所）で止まる'; keys = taxi ? [] : [['Q / E', 'ペダル（向き）'], ['R / F', 'スロットル'], ['B', 'ブレーキ'], ['Shift+B', 'パーキングブレーキ'], ['Y', '教官に任せる']]; }
    else if (PHASES[ph].radio) { text = '管制との交信'; keys = [['1〜3', '答える']]; }
    else if (fly) text = flyCheck() || '';
    else if (PHASES[ph].lesson) text = '';
    h.dayHud.setTask(lessonOn || ph === 'debrief' || ph === 'done' ? null : { kicker: `今日の流れ ${k + 1} / ${FLOW.length}`, title: PHASES[ph].label, text, keys,
      flow: FLOW.map((p, i) => ({ done: i < k, cur: i === k, lesson: !!PHASES[p].lesson })) });
    h.dayHud.setChecklist(lessonOn ? null : items, flash);
    h.dayHud.setRadio(day.atc.view());
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
    if (code === 'KeyY' && !lessonOn) {
      if (day.st.list && !assistOn) { assistOn = true; assistT = 0.4; say(ASSIST_LINES.list, 3000); return true; }
      if (PLACES.has(day.phase) && !taxi) {
        const stand = h.stand, ph = day.phase;
        const pts = ph === 'taxiOut' ? routeOut(stand) : ph === 'lineup' ? routeLineUp() : ph === 'taxiOff' ? routeIn(pos(), stand).off : routeIn({ a: day.st.exit === 'A3' ? 1160 : 590, c: 0 }, stand).in;
        flight.action('parkBrake', false);
        taxi = createTaxiPilot(FL, pts, ph === 'lineup' ? { speed: 2.2, turnSpeed: 1.8 } : {});
        say(ASSIST_LINES.taxi, 3500);
        return true;
      }
      return false;
    }
    if (/^(Digit|Numpad)[123]$/.test(code) && !(flight.L && flight.L.atc)) {
      const v = day.atc.view();
      if (v && v.phase === 'choose') { day.atc.answer(+code.slice(-1) - 1); if (h.audio.click) h.audio.click(); return true; }
    }
    return false;
  }
  function answer(k) { if (!day) return; const v = day.atc.view(); if (v && v.phase === 'choose') day.atc.answer(k); }
  function end() { day = null; assistOn = false; taxi = null; fly = null; queue.length = 0; h.routeLine.set(null); h.dayHud.hideAll(); h.setGuide(null); }
  return {
    begin, update, key, answer, onChoice, lessonEnded, end, speak,
    get active() { return !!day; }, get day() { return day; }, get pilot() { return taxi ? taxi.fly : null; }, get flying() { return fly; },
    get assisting() { return assistOn || !!taxi; },
    // for the tests: the instructor's hands for everything until `phase` (or the next lesson)
    assist() { assistOn = true; assistT = 0; },
  };
}
