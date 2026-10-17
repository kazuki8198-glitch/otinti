// CADET — ui/flight-hud.js : the flight HUD (fly mode), DOM over the 3D view in the page's glass style.
//  - The lesson panel (top left): the lesson and level, the step dots, the instructor's instruction, this step's keys
//    as chips (FLIGHT LAB ui.js parseKeys), the guide, one gauge per target (needle, tolerance bands), the progress
//    (time left, or the continuous hold with its bar and a red flash when it drops back to 0 inside the graded window)
//    and the instructor's hint. In free flight a smaller panel takes its place: IAS, ALT, HDG, VS and the main keys.
//  - The control strip (bottom left): throttle and rpm, the pitch hold, trim, flaps, brakes, the rudder, warnings.
//  - The instructor's subtitle (top centre): never takes a key or a click.
//  - The checklist and ATC dialogs (top right), drawn from status().check / .atc; a click goes to a callback.
//  - The debrief card (FLIGHT LAB pages.js showDebrief / advice), the key help (H), the big 2D G1000 (Tab: two
//    canvases the game draws into with FL.avionics) and the hood of the instrument lessons.
// The left and right columns keep clear of the middle of the view and of the panel's G1000 below it. Only the
// dialogs, the debrief, the help and the panel's fold button take the mouse; everything else lets clicks through to
// the cockpit. update() is cheap: it writes only the nodes whose text, class or size changed. The CSS is injected once
// and scoped under #fhud.
const CSS = `
#fhud { --fh-w: min(380px, 31vw); --fh-rw: min(380px, 30vw); --fh-sub-h: 0px; --p2d-h: min(44vh, calc((100vw - 240px) / 3.2));
  --fh-bg: rgba(10, 18, 28, 0.8); --fh-ok: #6fe3a0; --fh-warn: var(--warn, #ffcf5c); --fh-ng: #ff7a6b; --fh-amber: #ffb547;
  --fh-mono: ui-monospace, "Cascadia Mono", Consolas, monospace;
  position: fixed; inset: 0; z-index: 11; pointer-events: none; font-family: var(--font, system-ui, sans-serif); color: var(--ink, #eef3f8); }
#fhud[hidden], #fhud [hidden] { display: none !important; }
#fhud kbd { display: inline-block; min-width: 18px; padding: 0 4px; text-align: center; font: 11px/17px var(--fh-mono); color: var(--ink, #eef3f8);
  background: rgba(255, 255, 255, .1); border: 1px solid var(--glass-line, rgba(255,255,255,.12)); border-bottom-width: 2px; border-radius: 5px; }
#fhud .fh-panel { background: var(--fh-bg); border: 1px solid var(--glass-line, rgba(255,255,255,.12)); border-radius: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, .28); }

/* ---- the hood: the windscreen dark, the panel (below the glareshield line) still in view */
#fhud .fh-hood { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(9, 11, 14, .97) 0%, rgba(9, 11, 14, .96) 47%, rgba(9, 11, 14, .55) 54%, rgba(9, 11, 14, 0) 59%); }
#fhud .fh-hood p { position: absolute; left: 50%; top: 24%; transform: translateX(-50%); margin: 0; width: min(520px, 60vw); text-align: center; font-size: 13px; line-height: 1.7; color: #8a949e; }

/* ---- the left column: the lesson (or free-flight) panel on top, the control strip at the bottom */
#fhud .fh-left { position: absolute; left: 14px; top: 14px; bottom: 30px; width: var(--fh-w); display: flex; flex-direction: column; gap: 8px; }
#fhud .fh-left .fh-strip { margin-top: auto; flex: none; }
#fhud.p2d .fh-left { bottom: calc(var(--p2d-h) + 50px); }
#fhud .fh-lesson, #fhud .fh-free { flex: 0 1 auto; min-height: 0; overflow: hidden; display: flex; flex-direction: column; padding: 9px 12px 10px; font-size: 13px; line-height: 1.5; }
#fhud .fh-lesson > *, #fhud .fh-free > * { flex: none; }
#fhud .fh-head { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
#fhud .fh-title { font-size: 13px; font-weight: 800; letter-spacing: .02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#fhud .fh-lv { flex: none; font-size: 12px; color: var(--ink-dim, #a9b7c6); }
#fhud .fh-fold { margin-left: auto; flex: none; pointer-events: auto; font: inherit; font-size: 11px; padding: 1px 8px; border-radius: 99px; cursor: pointer;
  color: var(--ink-dim, #a9b7c6); background: transparent; border: 1px solid var(--glass-line, rgba(255,255,255,.12)); }
#fhud .fh-fold:hover { color: var(--ink, #eef3f8); background: rgba(255, 255, 255, .08); }
#fhud .fh-dots { display: flex; align-items: center; gap: 4px; margin: 4px 0 2px; min-width: 0; font-size: 12px; font-weight: 700; color: var(--accent, #5cc8ff); }
#fhud .fh-dots i { flex: none; width: 9px; height: 9px; border-radius: 50%; background: rgba(255, 255, 255, .2); }
#fhud .fh-dots i.done { background: var(--fh-ok); }
#fhud .fh-dots i.cur { background: var(--accent, #5cc8ff); box-shadow: 0 0 0 3px rgba(92, 200, 255, .25); }
#fhud .fh-dots span { margin-left: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#fhud .fh-say { margin: 3px 0 5px; font-size: 15.5px; line-height: 1.5; font-weight: 700; }
#fhud .fh-keys { display: flex; flex-wrap: wrap; gap: 4px 6px; margin: 0 0 6px; }
#fhud .fh-kc { display: inline-flex; align-items: center; gap: 3px; max-width: 100%; font-size: 11.5px; line-height: 1.45; color: #cfe3f5;
  background: rgba(92, 200, 255, .07); border: 1px solid rgba(92, 200, 255, .25); border-radius: 6px; padding: 1px 7px 1px 3px; }
#fhud .fh-kc.nokey { padding-left: 7px; }
#fhud .fh-kx { margin-left: -3px; color: #9db2c8; }
#fhud .fh-guide { margin: 0 0 6px; padding: 4px 8px; border-left: 3px solid var(--accent, #5cc8ff); border-radius: 3px;
  font-size: 12px; line-height: 1.6; color: #c9d7e8; background: rgba(92, 200, 255, .07); }
#fhud .fh-gauges { display: grid; gap: 4px; margin: 0 0 5px; }
#fhud .fh-g { display: grid; grid-template-columns: minmax(84px, auto) 1fr 58px; gap: 8px; align-items: center; font-size: 12px; }
#fhud .fh-gl { white-space: nowrap; color: #cfe0f2; }
#fhud .fh-gb { position: relative; height: 10px; border-radius: 5px; overflow: hidden; background: rgba(255, 90, 80, .25); }
#fhud .fh-gb i { position: absolute; top: 0; bottom: 0; }
#fhud .fh-gb .tol { left: 25%; width: 50%; background: rgba(255, 181, 71, .38); }
#fhud .fh-gb .in { left: 35%; width: 30%; background: rgba(88, 224, 140, .5); }
#fhud .fh-gb b { position: absolute; top: -2px; bottom: -2px; width: 4px; margin-left: -2px; border-radius: 2px; background: #fff; box-shadow: 0 0 4px rgba(0, 0, 0, .7); transition: left .12s linear; }
#fhud .fh-gd { text-align: right; font: 700 12px var(--fh-mono); white-space: nowrap; }
#fhud .fh-g.ok .fh-gd { color: var(--fh-ok); } #fhud .fh-g.warn .fh-gd { color: var(--fh-warn); } #fhud .fh-g.ng .fh-gd { color: var(--fh-ng); }
#fhud .fh-prog { font-size: 12px; color: var(--ink-dim, #a9b7c6); border-radius: 6px; }
#fhud .fh-prog.reset .fh-pt { color: var(--fh-ng); }
#fhud .fh-prog.pre .fh-pt { color: #8fb3d6; }
#fhud .fh-prog.flash { animation: fh-flash .9s ease-out; }
@keyframes fh-flash { 0% { background: rgba(255, 90, 80, .55); box-shadow: 0 0 0 4px rgba(255, 90, 80, .55); } 100% { background: transparent; box-shadow: 0 0 0 4px rgba(255, 90, 80, 0); } }
#fhud .fh-bar { margin-top: 3px; height: 7px; border-radius: 4px; overflow: hidden; background: rgba(0, 0, 0, .4); }
#fhud .fh-bar i { display: block; height: 100%; width: 0; border-radius: 4px; background: linear-gradient(90deg, #1f9e5b, var(--fh-ok)); transition: width .15s linear; }
#fhud .fh-hint { margin-top: 6px; padding: 4px 8px; border-radius: 6px; font-size: 13px; font-weight: 700; line-height: 1.5; color: var(--fh-amber); background: rgba(255, 181, 71, .09); }
/* when the panel does not fit its column (fitLesson): the keys' explanations go, then the guide is cut to two lines,
   then hidden, then the keys (they are all in the key help) */
#fhud .fh-lesson.fit1 .fh-kx { display: none; }
#fhud .fh-lesson.fit2 .fh-guide { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
#fhud .fh-lesson.fit3 .fh-guide, #fhud .fh-lesson.fit4 .fh-keys { display: none; }

/* ---- free flight: the four numbers and the main keys */
#fhud .fh-free .fh-sub2 { font-size: 11.5px; color: var(--ink-dim, #a9b7c6); }
#fhud .fh-nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin: 6px 0; }
#fhud .fh-num { padding: 3px 6px 4px; border-radius: 8px; background: rgba(255, 255, 255, .05); min-width: 0; }
#fhud .fh-num small { display: block; font-size: 10.5px; color: var(--ink-dim, #a9b7c6); }
#fhud .fh-num b { font: 700 16px/1.25 var(--fh-mono); font-variant-numeric: tabular-nums; }
#fhud .fh-num em { font-style: normal; font-size: 10.5px; color: var(--ink-dim, #a9b7c6); margin-left: 2px; }
#fhud .fh-where { font-size: 12px; color: #cfe0f2; margin-bottom: 5px; }

/* ---- the control strip */
#fhud .fh-strip { position: relative; width: min(300px, 100%); padding: 6px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
#fhud .fh-tile { min-width: 0; padding: 3px 7px 4px; border-radius: 8px; background: rgba(255, 255, 255, .05); }
#fhud .fh-tk { display: flex; align-items: center; gap: 2px; white-space: nowrap; overflow: hidden; font-size: 10.5px; color: var(--ink-dim, #a9b7c6); }
#fhud .fh-tk kbd { min-width: 14px; padding: 0 3px; font-size: 9.5px; line-height: 13px; }
#fhud .fh-tk span { margin-left: 3px; overflow: hidden; text-overflow: ellipsis; }
#fhud .fh-tv { font: 700 13px/1.35 var(--fh-mono); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#fhud .fh-ts { min-height: 1.35em; font-size: 10.5px; line-height: 1.35; color: var(--ink-dim, #a9b7c6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#fhud .fh-tile.warn .fh-tv { color: var(--fh-warn); } #fhud .fh-tile.bad .fh-tv { color: var(--fh-ng); }
#fhud .fh-tile.move .fh-ts { color: var(--fh-warn); animation: fh-blink 1s steps(2, start) infinite; }
@keyframes fh-blink { 50% { opacity: .35; } }
#fhud .fh-meter { height: 4px; margin-top: 2px; border-radius: 2px; overflow: hidden; background: rgba(0, 0, 0, .45); }
#fhud .fh-meter i { display: block; height: 100%; width: 0; background: var(--fh-ok); }
#fhud .fh-badges { position: absolute; left: 0; right: 0; bottom: 100%; margin-bottom: 6px; display: flex; gap: 6px; }
#fhud .fh-badge { padding: 2px 10px; border-radius: 99px; font: 800 12px/1.5 var(--fh-mono); letter-spacing: .06em; color: #fff; background: #d8432f; box-shadow: 0 0 14px rgba(255, 70, 50, .5); }
#fhud .fh-badge.blink { animation: fh-blink .5s steps(2, start) infinite; }

/* ---- the instructor's subtitle */
#fhud .fh-subt { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: max-content;
  max-width: min(560px, calc(100vw - 2 * max(var(--fh-w), var(--fh-rw)) - 64px)); padding: 7px 16px 8px; border-radius: 14px;
  background: rgba(10, 18, 28, 0.8); border: 1px solid var(--glass-line, rgba(255,255,255,.12)); box-shadow: 0 10px 30px rgba(0, 0, 0, .3);
  opacity: 0; transition: opacity .35s ease; }
#fhud .fh-subt.show { opacity: 1; }
#fhud .fh-subt b { display: inline-block; margin: 0 8px 0 0; padding: 1px 10px; border-radius: 99px; font-size: 12.5px; font-weight: 800; letter-spacing: .05em;
  vertical-align: 1px; color: var(--sp-ink, #04121c); background: var(--sp, var(--accent, #5cc8ff)); }
#fhud .fh-subt span { font-size: 16.5px; line-height: 1.6; text-shadow: 0 1px 2px rgba(0, 0, 0, .35); }

/* ---- the dialogs (top right) */
#fhud .fh-right { position: absolute; right: 14px; top: 14px; width: var(--fh-rw); max-height: calc(100% - 44px); display: flex; flex-direction: column; gap: 8px; }
#fhud.p2d .fh-right { max-height: calc(100% - var(--p2d-h) - 64px); }
#fhud .fh-dlg { pointer-events: auto; min-height: 0; overflow: auto; padding: 10px 13px 9px; border-color: rgba(92, 200, 255, .55); font-size: 13px; line-height: 1.5; }
#fhud .fh-dt { margin-bottom: 6px; font-size: 13.5px; font-weight: 800; color: var(--accent, #5cc8ff); }
#fhud .fh-check { cursor: pointer; }
#fhud .fh-check ol { margin: 0; padding-left: 1.5em; }
#fhud .fh-check li { padding: 2px 4px; border-radius: 4px; }
#fhud .fh-check li b { margin-right: 6px; }
#fhud .fh-check li span { color: var(--ink-dim, #a9b7c6); font-size: 12px; }
#fhud .fh-check li.ok, #fhud .fh-check li.ok span { color: var(--fh-ok); }
#fhud .fh-check li.ok b::after { content: ' ✓'; }
#fhud .fh-check li.cur { background: rgba(92, 200, 255, .14); outline: 1px solid var(--accent, #5cc8ff); }
#fhud .fh-check li.ng { background: rgba(255, 90, 79, .32); outline-color: var(--fh-ng); }
#fhud .fh-df { margin-top: 6px; font-size: 11.5px; color: var(--ink-dim, #a9b7c6); }
#fhud .fh-df.ng { color: var(--fh-ng); font-weight: 700; }
#fhud .fh-am { padding: 6px 9px; border-radius: 6px; background: rgba(0, 0, 0, .35); font: 600 12.5px/1.55 var(--fh-mono); color: #d8f2ff; }
#fhud .fh-aq { margin: 6px 0 4px; font-size: 12px; color: var(--ink-dim, #a9b7c6); }
#fhud .fh-ao button { display: flex; gap: 8px; align-items: baseline; width: 100%; margin: 4px 0 0; padding: 6px 9px; text-align: left; cursor: pointer;
  font: 12.5px/1.45 var(--fh-mono); color: var(--ink, #eef3f8); background: rgba(255, 255, 255, .06); border: 1px solid var(--glass-line, rgba(255,255,255,.12)); border-radius: 8px; }
#fhud .fh-ao button:hover { background: rgba(26, 44, 64, .95); border-color: rgba(92, 200, 255, .5); }
#fhud .fh-ao button i { flex: none; font-style: normal; font-weight: 800; min-width: 1.6em; text-align: center; border-radius: 5px; color: var(--accent-ink, #04121c); background: var(--accent, #5cc8ff); }
#fhud .fh-ar { padding: 6px 9px; border-radius: 6px; font-size: 13px; line-height: 1.6; background: rgba(0, 0, 0, .3); }
#fhud .fh-ar.ok { border-left: 4px solid var(--fh-ok); } #fhud .fh-ar.ng { border-left: 4px solid var(--fh-ng); }
#fhud .fh-ar b { margin-right: 4px; } #fhud .fh-ar.ok b { color: var(--fh-ok); } #fhud .fh-ar.ng b { color: var(--fh-ng); }

/* ---- the big 2D G1000 (Tab): the control strip moves between the two screens, like the audio panel */
#fhud .fh-p2d { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); display: flex; gap: 6px; padding: 6px; border-radius: 14px;
  background: #05080d; border: 1px solid #262d35; box-shadow: 0 10px 30px rgba(0, 0, 0, .4); }
#fhud .fh-disp { width: calc(var(--p2d-h) * 1.6); height: var(--p2d-h); padding: 5px; border-radius: 10px; background: #14181d; border: 1px solid #262d35; }
#fhud .fh-disp canvas { display: block; width: 100%; height: 100%; border-radius: 4px; background: #000; }
#fhud .fh-mid { width: 170px; display: flex; flex-direction: column; justify-content: center; }
/* between the screens: one line per control (the screens show the rpm and the attitude themselves) */
#fhud .fh-mid .fh-strip { width: 100%; padding: 0; grid-template-columns: 1fr; gap: 3px; background: transparent; border: 0; box-shadow: none; }
#fhud .fh-mid .fh-tile { display: flex; align-items: center; gap: 6px; padding: 3px 7px; }
#fhud .fh-mid .fh-tk { flex: 0 1 auto; min-width: 0; }
#fhud .fh-mid .fh-tv { flex: 1 0 auto; text-align: right; font-size: 12.5px; }
#fhud .fh-mid .fh-ts, #fhud .fh-mid .fh-meter { display: none; }

/* ---- the key help (H) */
#fhud .fh-help { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(900px, calc(100vw - 28px)); max-height: calc(100% - 56px);
  overflow: auto; padding: 14px 18px 12px; pointer-events: auto; background: rgba(10, 18, 28, 0.92); backdrop-filter: blur(6px); }
#fhud .fh-help h3 { margin: 0 0 2px; font-size: 16px; }
#fhud .fh-help .fh-hs { margin: 0 0 8px; font-size: 12px; color: var(--ink-dim, #a9b7c6); }
#fhud .fh-hcols { display: grid; grid-template-columns: 1.15fr 1fr; gap: 6px 22px; }
#fhud .fh-help h4 { margin: 4px 0 4px; font-size: 12.5px; color: var(--accent, #5cc8ff); letter-spacing: .04em; }
#fhud .fh-help table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
#fhud .fh-help td { padding: 3px 4px; border-bottom: 1px solid rgba(255, 255, 255, .07); vertical-align: top; }
#fhud .fh-help td.k { white-space: nowrap; width: 1%; }
#fhud .fh-help td.n { white-space: nowrap; font-weight: 700; }
#fhud .fh-help td.d { color: var(--ink-dim, #a9b7c6); font-size: 11.5px; }
#fhud .fh-help tr.now td { background: rgba(92, 200, 255, .12); } #fhud .fh-help tr.now td.n { color: var(--accent, #5cc8ff); }
#fhud .fh-help .fh-hn { margin: 8px 0 0; font-size: 11.5px; color: var(--ink-dim, #a9b7c6); }

/* ---- the debrief */
#fhud.deb .fh-left, #fhud.deb .fh-right { visibility: hidden; }
#fhud .fh-deb { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; pointer-events: auto; background: rgba(4, 8, 14, 0.42); }
#fhud .fh-card { display: flex; flex-direction: column; width: min(660px, 100%); max-height: 100%; overflow: auto; border-radius: 18px; background: rgba(10, 18, 28, 0.94);
  border: 1px solid var(--glass-line, rgba(255,255,255,.12)); box-shadow: 0 24px 70px rgba(0, 0, 0, .5); backdrop-filter: blur(6px); animation: fh-in .25s ease-out; }
@keyframes fh-in { from { opacity: 0; transform: translateY(10px) scale(.98); } }
#fhud .fh-hero { display: flex; gap: 18px; align-items: center; padding: 18px 22px 10px; background: linear-gradient(135deg, rgba(20, 52, 86, .6), transparent); }
#fhud .fh-hero > div { min-width: 0; }
#fhud .fh-kick { font-size: 12px; letter-spacing: .14em; color: var(--accent, #5cc8ff); }
#fhud .fh-hero h2 { margin: 2px 0 0; font-size: 21px; line-height: 1.35; }
#fhud .fh-hero p { margin: 4px 0 0; font-size: 13.5px; line-height: 1.6; color: #cfe0f2; }
#fhud .fh-grade { flex: none; width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center; align-content: center; border: 4px solid var(--glass-line, rgba(255,255,255,.12)); background: #0b1626; }
#fhud .fh-grade b { font: 800 46px/1 var(--fh-mono); } #fhud .fh-grade span { margin-top: 3px; font-size: 13px; font-weight: 700; }
#fhud .fh-grade.ok { border-color: var(--fh-ok); box-shadow: 0 0 24px rgba(88, 224, 140, .35); }
#fhud .fh-grade.ng { color: var(--fh-ng); border-color: var(--fh-ng); }
#fhud .fh-grade.ok.g-s { background: radial-gradient(circle at 35% 30%, #fff1b8, #e0ad2c 60%, #9c6f0c); color: #3a2a00; border-color: #ffe48a; box-shadow: 0 0 30px rgba(231, 183, 58, .6); }
#fhud .fh-grade.ok.g-a { background: radial-gradient(circle at 35% 30%, #ffffff, #b9c3d0 60%, #6f7b8b); color: #1b2430; border-color: #e8eef5; box-shadow: 0 0 24px rgba(220, 230, 245, .4); }
#fhud .fh-grade.ok.g-b { background: radial-gradient(circle at 35% 30%, #ffd2ad, #c47a3c 60%, #7a4317); color: #2c1606; border-color: #f0b98a; }
#fhud .fh-grade.ok.g-c { color: var(--ink, #eef3f8); }
#fhud .fh-stats { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 22px 6px; }
#fhud .fh-stats span { display: grid; padding: 4px 10px; border-radius: 8px; font-size: 11px; color: var(--ink-dim, #a9b7c6); background: rgba(255, 255, 255, .04); border: 1px solid var(--glass-line, rgba(255,255,255,.12)); }
#fhud .fh-stats b { font: 700 17px var(--fh-mono); color: var(--ink, #eef3f8); }
#fhud .fh-adv { margin: 6px 22px; padding: 9px 14px; border-left: 4px solid var(--fh-amber); border-radius: 6px; background: rgba(255, 178, 62, .1); font-size: 13.5px; line-height: 1.65; }
#fhud .fh-adv > b { color: var(--fh-amber); }
#fhud .fh-adv ul { margin: 4px 0 0; padding-left: 1.2em; } #fhud .fh-adv li { margin: 2px 0; }
#fhud .fh-adv p { margin: 4px 0 0; font-size: 12px; color: var(--ink-dim, #a9b7c6); }
#fhud .fh-det { margin: 2px 22px; }
#fhud .fh-det summary { cursor: pointer; padding: 6px 0; font-size: 13px; font-weight: 700; color: var(--accent, #5cc8ff); }
#fhud .fh-det h3 { margin: 10px 0 4px; font-size: 13.5px; color: var(--accent, #5cc8ff); }
#fhud .fh-det table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
#fhud .fh-det td { padding: 4px 6px; border-top: 1px solid rgba(150, 176, 206, .14); vertical-align: top; }
#fhud .fh-det td:first-child { width: 1.5em; font-weight: 700; }
#fhud .fh-det tr.ok td:first-child { color: var(--fh-ok); } #fhud .fh-det tr.ng td:first-child { color: var(--fh-ng); } #fhud .fh-det tr.ng td { background: rgba(255, 90, 80, .06); }
#fhud .fh-det td:last-child { color: var(--ink-dim, #a9b7c6); white-space: nowrap; }
#fhud .fh-note { margin: 6px 22px 0; font-size: 11.5px; line-height: 1.6; color: var(--ink-dim, #a9b7c6); }
#fhud .fh-btns { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 22px 16px; margin-top: 6px; border-top: 1px solid var(--glass-line, rgba(255,255,255,.12)); }
#fhud .fh-btns button { flex: 1 1 140px; font: inherit; font-size: 14px; padding: 10px 14px; border-radius: 10px; cursor: pointer; color: var(--ink, #eef3f8);
  background: rgba(255, 255, 255, .08); border: 1px solid var(--glass-line, rgba(255,255,255,.12)); }
#fhud .fh-btns button:hover { background: rgba(255, 255, 255, .16); }
#fhud .fh-btns button.primary { color: var(--accent-ink, #04121c); background: var(--accent, #5cc8ff); border-color: transparent; font-weight: 800; }
#fhud .fh-btns button.primary:hover { background: #86d8ff; }
#fhud .fh-btns kbd { margin-left: 6px; font-size: 10.5px; line-height: 15px; }
#fhud .fh-btns button.primary kbd { color: var(--accent-ink, #04121c); background: rgba(255, 255, 255, .35); border-color: rgba(4, 18, 28, .25); }
#fhud button:focus-visible, #fhud summary:focus-visible { outline: 2px solid #ffd479; outline-offset: 2px; }

/* ---- smaller screens: the subtitle starts right of the lesson panel and the dialogs move down below it */
@media (max-width: 1180px) {
  #fhud { --fh-w: min(300px, 33vw); --fh-rw: min(330px, 33vw); }
  #fhud .fh-subt { left: calc(var(--fh-w) + 28px); right: 14px; transform: none; width: auto; max-width: none; text-align: center; }
  #fhud .fh-right { top: calc(14px + var(--fh-sub-h)); max-height: calc(100% - 44px - var(--fh-sub-h)); }
  #fhud.p2d .fh-right { max-height: calc(100% - var(--p2d-h) - 64px - var(--fh-sub-h)); }
  #fhud .fh-subt span { font-size: 15px; }
}
@media (max-height: 600px) {
  #fhud .fh-say { font-size: 14px; margin: 2px 0 4px; }
  #fhud .fh-guide { font-size: 11.5px; line-height: 1.5; padding: 2px 7px; margin-bottom: 4px; }
  #fhud .fh-keys { margin-bottom: 4px; } #fhud .fh-kc { font-size: 11px; }
  #fhud .fh-hint { font-size: 12px; margin-top: 4px; padding: 3px 7px; }
  #fhud .fh-check li span { display: block; font-size: 11px; line-height: 1.35; }
  #fhud .fh-check li { padding: 1px 4px; font-size: 12px; }
  #fhud .fh-check li.ok span { display: none; }
  #fhud .fh-tile { padding: 2px 7px 3px; } #fhud .fh-tv { font-size: 12.5px; line-height: 1.3; } #fhud .fh-ts { min-height: 1.25em; line-height: 1.25; }
  #fhud .fh-help { padding: 10px 14px 8px; } #fhud .fh-help h3 { font-size: 14px; } #fhud .fh-help .fh-hs { margin-bottom: 4px; }
  #fhud .fh-help h4 { margin: 2px 0; } #fhud .fh-help table { font-size: 12px; } #fhud .fh-help td { padding: 1px 4px; }
  #fhud .fh-help td.d { display: none; }
  #fhud .fh-hero { padding: 12px 18px 6px; } #fhud .fh-grade { width: 76px; height: 76px; } #fhud .fh-grade b { font-size: 36px; }
  #fhud .fh-hero h2 { font-size: 18px; }
}
@media (max-width: 700px) {
  #fhud { --fh-w: calc(100vw - 28px); --fh-rw: calc(100vw - 28px); }
  #fhud .fh-right { top: auto; bottom: 30px; }
  #fhud .fh-subt { left: 14px; top: auto; bottom: 40%; }
  #fhud .fh-hcols { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  #fhud .fh-prog.flash, #fhud .fh-tile.move .fh-ts, #fhud .fh-badge.blink, #fhud .fh-card { animation: none; }
  #fhud .fh-gb b, #fhud .fh-bar i { transition: none; }
}
`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// signed numbers with a real minus sign; a value that rounds to zero has no sign
function signed(v, dp = 0) {
  const t = Math.abs(v).toFixed(dp);
  return Number(t) === 0 ? t : (v > 0 ? '+' : '−') + t;
}
const thousands = v => Math.round(v).toLocaleString('en-US');
const hdg3 = h => String(((Math.round(h) % 360) + 360) % 360 || 360).padStart(3, '0');

// ---------------------------------------------------------------- key chips (FLIGHT LAB ui.js parseKeys, unchanged)
// parts are separated by "　"; inside a part, "・" starts a new key when a key name and "＝" follow
const KEYNAME = '(?:Shift\\+)?(?:[A-Z0-9\\[\\]]|Space|Enter)';
const SPLIT = new RegExp(`・(?=${KEYNAME}(?:\\s*\\/\\s*${KEYNAME})*＝)`);
const KEYS_ONLY = new RegExp(`^${KEYNAME}(\\s*\\/\\s*${KEYNAME})*$`);
export function parseKeys(text) {
  const out = [];
  for (const part of String(text || '').split('　').filter(Boolean)) for (const it of part.split(SPLIT)) {
    const m = /^(.+?)＝(.*)$/.exec(it);
    if (m && m[1].length <= 16 && KEYS_ONLY.test(m[1].trim())) out.push({ keys: m[1].split(/\s*\/\s*/).map(k => k.trim()), what: m[2] });
    else out.push({ keys: [], what: it });
  }
  return out;
}

// ---------------------------------------------------------------- what the panel shows (pure; the tests use these)
// a target as a gauge (FLIGHT LAB app.js updateUi): the needle at the deviation, the tolerance across the middle half,
// the inner green band within 0.6 of it; the arrow says which way to go when outside (not for the headings and the
// "which side" targets)
const NO_TV = ['hdg', 'rhdg', 'dwhdg', 'trk'];
const NO_DIR = ['hdg', 'rhdg', 'dwhdg', 'trk', 'bank', 'cl', 'cdi', 'gs', 'loc', 'xtk'];
export function gaugeOf(q, out = {}) {
  const dp = q.dp || 0, tol = q.tol || 1e-9, r = Math.abs(q.d) / tol;
  out.cls = r <= 0.6 ? 'ok' : r <= 1 ? 'warn' : 'ng';
  out.x = clamp(50 + q.d / tol * 25, 2, 98);
  out.label = q.label + (NO_TV.includes(q.key) ? '' : ` ${(Math.round(q.tv * 10 ** dp) / 10 ** dp).toLocaleString('en-US')} ${q.unit}`);
  out.dev = signed(q.d, dp) + (r > 1 && !NO_DIR.includes(q.key) ? (q.d > 0 ? ' ▼' : ' ▲') : '');
  out.tip = `許容 ±${q.tol} ${q.unit}`;
  return out;
}
// the progress line: the time left of a fixed-length step, or the continuous hold (with its bar), or the time spent.
// reset: the hold is back at 0 inside the graded window (red); pre: the window has not opened yet (no red: the first
// seconds of a step are for settling down, FLIGHT LAB's red there looked like a failure)
export function progressOf(st, out = {}) {
  out.text = ''; out.frac = null; out.reset = false; out.pre = false;
  if (st.done) { out.text = '課目終了'; return out; }
  const targets = st.stats && st.stats.length > 0;
  if (st.dur) out.text = `残り ${Math.max(0, Math.ceil(st.dur - st.stepT))} 秒`;
  else if (st.need) {
    out.pre = targets && !st.graded && st.holdT < 0.05;
    out.text = `基準内を連続 ${Math.floor(st.holdT)} / ${st.need} 秒` + (out.pre ? '（採点前：まず姿勢と出力を整える）' : '（外れると 0 に戻る）');
    out.frac = clamp(st.holdT / st.need, 0, 1);
  } else if (st.max && st.kind === 'fly') out.text = `経過 ${Math.floor(st.stepT)} 秒`;
  if (st.turned && Math.abs(st.turned) > 5 && /旋回/.test(st.stepName)) out.text += `　旋回 ${Math.round(Math.abs(st.turned))}°`;
  out.reset = !!(st.need && targets && st.graded && st.holdT < 0.2 && st.stepT > 2);
  return out;
}

// ---------------------------------------------------------------- the debrief (FLIGHT LAB pages.js showDebrief / advice)
const GRADE_CLS = { S: 'g-s', A: 'g-a', B: 'g-b', C: 'g-c' };
// up to three things to work on, chosen by the names of the failed rows (what an instructor would say first)
export function adviceTips(bad) {
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
  return tips.slice(0, 3);
}
const ADVICE_NONE = '基準外の項目の数字を見て、どの操作が足りなかったかを考えてから、もう一度。';
export const advice = bad => adviceTips(bad).join('。') || ADVICE_NONE;
// everything the card shows, from status() at the end of a lesson. The steps count is the steps finished (FLIGHT LAB
// counted the steps that produced rows, so a passed a1 read "1 / 2"). A free flight has no grade: its card (after a
// crash, or when the game ends it) says how it ended and for how long it flew.
export function debriefOf(sum) {
  const rows = [], bad = [];
  for (const r of sum.results || []) for (const row of r.rows) { rows.push(row); if (!row.pass) bad.push([r.step, row]); }
  const N = (sum.steps || []).length, t = sum.t || 0, mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  const time = t ? `${mm}:${String(ss).padStart(2, '0')}` : '';
  if (sum.mode === 'free') {
    return {
      free: true, kick: '自由飛行の終わり', title: '自由飛行', grade: '―', status: sum.crashed ? '損傷' : '終了', cls: sum.crashed ? 'ng' : '',
      sub: sum.crashed ? `理由：${sum.crashReason || '機体が損傷しました'}` : '採点のない飛行でした。',
      okN: 0, rowsN: 0, stepsDone: 0, stepsN: 0, time, tips: [], tipNone: '', bad: '', results: [],
    };
  }
  return {
    free: false, kick: '課目の結果',
    title: `${sum.title || ''}（${sum.levelName || ''}）`,
    grade: sum.grade || '―',
    status: sum.passed ? '合格' : sum.reason ? '中止' : '不合格',
    cls: sum.passed ? 'ok ' + (GRADE_CLS[sum.grade] || '') : 'ng',
    sub: sum.reason ? `理由：${sum.reason}` : sum.passed ? 'すべての項目が基準内でした。次の課目か、上のレベルへ進みましょう。'
      : '基準に届かなかった項目があります。下の「次に意識すること」を読んで、もう一度挑戦しましょう。',
    okN: rows.filter(r => r.pass).length, rowsN: rows.length,
    stepsDone: clamp(sum.step || 0, 0, N), stepsN: N,
    time,
    tips: bad.length ? adviceTips(bad) : [], tipNone: bad.length && !adviceTips(bad).length ? ADVICE_NONE : '',
    bad: bad.slice(0, 4).map(b => b[1].name).join('・'),
    results: sum.results || [],
  };
}

// ---------------------------------------------------------------- the big 2D G1000 (app.js fitCanvas)
// the canvas backing store follows its CSS box (× devicePixelRatio, at most 2); FL.avionics draws in a 640-wide
// logical space whose height follows the box, kept between 376 (below that its layout overlaps) and 544
export const LW = 640;
export function fitCanvas(cv, r, dpr = 1) {
  const w = Math.max(1, Math.round(r.width * dpr)), hh = Math.max(1, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
  const LH = Math.round(LW * clamp(r.height / Math.max(1, r.width), 376 / LW, 0.85));
  const g = cv.getContext('2d'); g.setTransform(w / LW, 0, 0, hh / LH, 0, 0);
  return { g, W: LW, H: LH };
}

// ---------------------------------------------------------------- the key help (H)
// FLIGHT LAB's keys (app.js KEYMAP, shorter) and the cockpit's; a row lights up when this step's keys use it.
// [keys, what, why, key names, only: 'twin' | 'free']
const FLY_KEYS = [
  ['S / ↓', '機首を上げる', '押している間だけ機首の角度が上がり、離すとその角度を保つ', ['S']],
  ['W / ↑', '機首を下げる', '降下・増速・失速からの回復（迎え角を減らす）', ['W']],
  ['A / D（← / →）', '左右に傾ける', '傾けた方向へ旋回。離すとそのバンクを保つ', ['A', 'D']],
  ['Q / E', 'ラダー', 'ボールを中央に。離陸・上昇では右（E）。地上では前輪の向き', ['Q', 'E']],
  ['R / F（PageUp / Down）', 'スロットル', '押している間だけ増減。Shift+R で全開・Shift+F でアイドル', ['R', 'F']],
  ['T（Shift+T）', 'トリム（リセット）', 'いまの速度で、手を離しても姿勢が続くように合わせる', ['T']],
  ['V（Shift+V）', 'フラップ 下げ（上げ）', '白い帯（Vfe 以下）でだけ使う', ['V']],
  ['B / Space', 'ブレーキ', '押している間。地上で減速・停止', ['B', 'Space']],
  ['G', '脚の上げ下げ', '着陸前に必ず下げる（GUMPS）', ['G'], 'twin'],
  ['[ / ]', 'フェザー 左 / 右', '止まった側を確かめてから（Identify → Verify）', ['[', ']'], 'twin'],
  ['Z / X', 'ラダートリム 左 / 右', '踏み続ける力を消す', ['Z', 'X']],
  ['U', '自動ラダー ON / OFF', 'OFF では本物と同じく自分で踏む', ['U']],
  ['L', '水平に戻す', '自由飛行だけ。数秒で翼と機首を水平に', ['L'], 'free'],
  ['Enter', 'チェックリストの次の項目', '1 項目ずつ確認する', ['Enter']],
  ['1 / 2 / 3', '管制への応答', '滑走路・高度・針路の数字を含めて復唱', ['1', '2', '3']],
];
const CABIN_KEYS = [
  ['マウス', '見回す', '画面をクリックで開始。マウスが自由なときは右ドラッグ'],
  ['右ボタン（長押し）', 'ズーム', '計器や外の目標を拡大して見る'],
  ['クリック / ホイール', '操縦席の操作', '中央の点をスイッチ・つまみ・レバーに合わせて動かす'],
  ['C', '視点', '操縦席 ⇄ 機体の後ろから'],
  ['Tab', '計器を大きく', 'PFD と MFD を画面の下に大きく表示'],
  ['H', 'このキー一覧', '開く / 閉じる'],
  ['Esc', '一時停止メニュー', '設定・操作・降りる'],
];

// the instructor's subtitle stays up about as long as it takes to read (× the player's text speed)
const sayMs = (text, speed = 1) => clamp(2200 + Array.from(text).length * 85 / (speed > 0 ? speed : 1), 3000, 9000);

// opts: root (default document.body), settings (CADET's settings store: textSpeed for the subtitle), keys (R retries
// from the debrief; default true)
export function createFlightHUD({ root = document.body, settings = null, keys = true } = {}) {
  const doc = root.ownerDocument || document;
  const win = doc.defaultView || globalThis;
  if (!doc.getElementById('fhud-css')) { const st = doc.createElement('style'); st.id = 'fhud-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const make = (tag, cls, attrs, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    return e;
  };
  const put = (parent, ...kids) => { for (const k of kids) parent.appendChild(k); return parent; };
  const kbds = (parent, names) => { for (const n of names) put(parent, make('kbd', '', null, n)); return parent; };

  // ---- writes that skip unchanged values (update runs several times a second with mostly the same numbers)
  const memo = new WeakMap();
  const changed = (n, k, v) => { let m = memo.get(n); if (!m) memo.set(n, (m = {})); if (m[k] === v) return false; m[k] = v; return true; };
  const text = (n, v) => { if (changed(n, 't', v)) n.textContent = v; };
  const klass = (n, c, on) => { if (changed(n, 'c' + c, on)) n.classList.toggle(c, on); };
  const shown = (n, on) => { if (changed(n, 'h', !on)) n.hidden = !on; };
  const css = (n, prop, v) => { if (changed(n, 's' + prop, v)) n.style[prop] = v; };
  const attr = (n, a, v) => { if (changed(n, 'a' + a, v)) n.setAttribute(a, v); };

  // ---- the DOM, built once
  const el = make('div', '', { id: 'fhud' }); el.hidden = true;
  const hood = make('div', 'fh-hood', { 'aria-hidden': 'true' });
  put(hood, make('p', '', null, 'フード中（計器飛行の練習）：外は見えません。計器だけを見て飛びます'));
  hood.hidden = true;

  // the lesson panel
  const left = make('div', 'fh-left');
  const lesson = make('section', 'fh-panel fh-lesson', { 'aria-label': '課目の指示' });
  const head = make('div', 'fh-head'), lTitle = make('span', 'fh-title'), lLevel = make('span', 'fh-lv');
  const fold = make('button', 'fh-fold', { type: 'button', tabindex: '-1', title: '目安の文を隠す / 出す' }, '簡潔に');
  put(head, lTitle, lLevel, fold);
  const dots = make('div', 'fh-dots'), dotsLabel = make('span');
  const sayEl = make('p', 'fh-say', { 'aria-live': 'polite' });
  const keysEl = make('div', 'fh-keys');
  const guide = make('div', 'fh-guide');
  const gauges = make('div', 'fh-gauges');
  const prog = make('div', 'fh-prog'), progTxt = make('span', 'fh-pt'), bar = make('div', 'fh-bar'), barFill = make('i');
  put(prog, progTxt, put(bar, barFill));
  const hint = make('div', 'fh-hint', { 'aria-live': 'polite' });
  put(lesson, head, dots, sayEl, keysEl, guide, gauges, prog, hint);

  // the free-flight panel
  const free = make('section', 'fh-panel fh-free', { 'aria-label': '自由飛行' });
  const fHead = put(make('div', 'fh-head'), make('span', 'fh-title', null, '自由飛行'), make('span', 'fh-sub2', null, '採点なし・H でキーの一覧'));
  const nums = make('div', 'fh-nums');
  const num = (label, unit) => { const b = make('b', '', null, '—'); put(nums, put(make('div', 'fh-num'), make('small', '', null, label), b, make('em', '', null, unit))); return b; };
  const fIas = num('速度 IAS', 'kt'), fAlt = num('高度 ALT', 'ft'), fHdg = num('針路 HDG', '°'), fVs = num('昇降率 VS', 'fpm');
  const fWhere = make('div', 'fh-where');
  const fKeys = make('div', 'fh-keys');
  for (const [k, w] of [[['W', 'S'], 'ピッチ'], [['A', 'D'], 'バンク'], [['R', 'F'], '出力'], [['T'], 'トリム'], [['V'], 'フラップ'], [['B'], 'ブレーキ'], [['H'], 'キー一覧']]) {
    put(fKeys, put(kbds(make('span', 'fh-kc'), k), make('span', '', null, w)));
  }
  put(free, fHead, nums, fWhere, fKeys);
  free.hidden = true;

  // the control strip: six tiles and the warnings above them
  const strip = make('section', 'fh-panel fh-strip', { 'aria-label': '操作の状態' });
  const tile = (keyNames, name, meter) => {
    const t = make('div', 'fh-tile'), v = make('div', 'fh-tv', null, '—'), s = make('div', 'fh-ts');
    put(t, put(kbds(make('div', 'fh-tk'), keyNames), make('span', '', null, name)), v, s);
    const m = meter ? make('i') : null; if (m) put(t, put(make('div', 'fh-meter'), m));
    put(strip, t);
    return { t, v, s, m };
  };
  const tThr = tile(['R', 'F'], '出力', true), tPitch = tile(['W', 'S'], 'ピッチ'), tTrim = tile(['T'], 'トリム');
  const tFlap = tile(['V'], 'フラップ'), tBrake = tile(['B'], 'ブレーキ'), tRud = tile(['Q', 'E'], 'ラダー');
  const badges = make('div', 'fh-badges', { role: 'alert' });
  const bStall = make('span', 'fh-badge blink', null, 'STALL'), bEng = make('span', 'fh-badge', null, 'ENG'), bDmg = make('span', 'fh-badge', null, '損傷');
  put(badges, bStall, bEng, bDmg); put(strip, badges);
  bStall.hidden = bEng.hidden = bDmg.hidden = true;
  strip.hidden = true;
  put(left, lesson, free, strip);
  lesson.hidden = true;

  // the instructor's subtitle
  const subt = make('div', 'fh-subt', { role: 'status', 'aria-live': 'polite' }), subName = make('b'), subText = make('span');
  put(subt, subName, subText);

  // the dialogs
  const right = make('div', 'fh-right');
  const check = make('section', 'fh-panel fh-dlg fh-check', { role: 'dialog', 'aria-label': 'チェックリスト', title: 'クリックで次の項目を確認' });
  const cTitle = make('div', 'fh-dt'), cList = make('ol'), cFoot = make('div', 'fh-df');
  put(check, cTitle, cList, cFoot);
  const atc = make('section', 'fh-panel fh-dlg fh-atc', { role: 'dialog', 'aria-label': '管制との交信' });
  const aTitle = make('div', 'fh-dt', null, '無線（管制）'), aMsg = make('div', 'fh-am'), aQ = make('div', 'fh-aq', null, '正しい応答（復唱）は？　1〜3 キーかクリック');
  const aOpts = make('div', 'fh-ao'), aRes = make('div', 'fh-ar');
  put(atc, aTitle, aMsg, aQ, aOpts, aRes);
  check.hidden = atc.hidden = true;
  put(right, check, atc);

  // the big 2D G1000
  const p2d = make('div', 'fh-p2d', { 'aria-label': 'PFD と MFD' });
  const pfd = make('canvas', '', { 'aria-label': 'PFD' }), mfd = make('canvas', '', { 'aria-label': 'MFD' });
  const mid = make('div', 'fh-mid');
  put(p2d, put(make('div', 'fh-disp'), pfd), mid, put(make('div', 'fh-disp'), mfd));
  p2d.hidden = true;

  // the key help
  const help = make('section', 'fh-panel fh-help', { role: 'dialog', 'aria-label': 'キーの一覧' });
  const helpSub = make('p', 'fh-hs');
  const helpRows = [];
  const keyTable = (rows, lit) => {
    const t = make('table');
    for (const r of rows) {
      const tr = make('tr'), k = make('td', 'k');
      put(k, make('kbd', '', null, r[0]));
      put(t, put(tr, k, make('td', 'n', null, r[1]), make('td', 'd', null, r[2])));
      if (lit) helpRows.push({ tr, names: r[3], only: r[4] || '' });
    }
    return t;
  };
  put(help, make('h3', '', null, 'キーの一覧（H で閉じる）'), helpSub,
    put(make('div', 'fh-hcols'),
      put(make('div'), make('h4', '', null, '操縦'), keyTable(FLY_KEYS, true)),
      put(make('div'), make('h4', '', null, '操縦席'), keyTable(CABIN_KEYS, false),
        make('p', 'fh-hn', null, 'パーキングブレーキ・燃料セレクター・マグネトー・ライトのスイッチ・ドアは、操縦席でクリックして操作します。'))));
  help.hidden = true;

  // the debrief
  const deb = make('div', 'fh-deb');
  const card = make('section', 'fh-card', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'fh-deb-title' });
  const grade = make('div', 'fh-grade'), gradeB = make('b'), gradeS = make('span');
  put(grade, gradeB, gradeS);
  const dTitle = make('h2', '', { id: 'fh-deb-title' }), dSub = make('p'), dKick = make('div', 'fh-kick');
  const hero = put(make('div', 'fh-hero'), grade, put(make('div'), dKick, dTitle, dSub));
  const dStats = make('div', 'fh-stats');
  const dAdv = make('div', 'fh-adv');
  const dDet = make('details', 'fh-det'), dDetBody = make('div');
  put(dDet, make('summary', '', null, '採点の詳細'), dDetBody);
  const dNote = make('p', 'fh-note', null, 'この結果は訓練の記録に保存されました。正式な飛行日誌（logbook）ではなく、飛行時間には数えません。');
  const bRetry = make('button', '', { type: 'button', 'data-act': 'retry' }), bFree = make('button', '', { type: 'button', 'data-act': 'free' }, '自由に飛ぶ');
  const bRet = make('button', '', { type: 'button', 'data-act': 'return' }, '駐機場へ戻る');
  const retryTxt = doc.createTextNode('もう一度');
  put(bRetry, retryTxt, make('kbd', '', null, 'R'));
  const dBtns = put(make('div', 'fh-btns'), bRetry, bFree, bRet);
  put(card, hero, dStats, dAdv, dDet, dNote, dBtns);
  put(deb, card);
  deb.hidden = true;

  put(el, hood, left, right, p2d, help, deb, subt);
  root.appendChild(el);

  // ---- state
  let mode = 'lesson', status = null, panel = null, compact = false, helpOn = false, p2dOn = false, debOpen = false, destroyed = false;
  let lastHold = 0, subTimer = 0, flashTimer = 0, footTimer = 0, sizeDirty = true, layoutN = 0, fitSig = '';
  let onCheck = null, onAtc = null, debCb = null;
  const G = {}, PR = {};
  const gaugeRows = [];
  const sizes = { pfd: { width: 1, height: 1 }, mfd: { width: 1, height: 1 } };

  // ---- the lesson panel
  function renderDots(st) {
    const N = st.steps.length, cur = st.done ? N : st.step;
    if (changed(dots, 'k', `${N}:${cur}:${st.steps.join('|')}`)) {
      dots.textContent = '';
      st.steps.forEach((name, i) => put(dots, make('i', i < cur ? 'done' : i === cur ? 'cur' : '', { title: name })));
      put(dots, dotsLabel);
    }
    text(dotsLabel, st.done ? `${N} / ${N}　終了` : `${st.step + 1} / ${N}　${st.stepName}`);
  }
  function renderKeys(st) {
    if (!changed(keysEl, 'k', st.keysText)) return;
    keysEl.textContent = '';
    for (const p of parseKeys(st.keysText)) {
      const c = make('span', p.keys.length ? 'fh-kc' : 'fh-kc nokey'), m = /^(.+?)(（.*）)$/.exec(p.what);
      kbds(c, p.keys); put(c, make('span', '', null, m ? m[1] : p.what));
      if (m) put(c, make('span', 'fh-kx', null, m[2]));
      put(keysEl, c);
    }
    shown(keysEl, !!st.keysText);
  }
  function renderGauges(st) {
    const sig = st.stats.map(q => q.key).join(',');
    if (changed(gauges, 'k', sig)) {
      gauges.textContent = ''; gaugeRows.length = 0;
      for (let i = 0; i < st.stats.length; i++) {
        const row = make('div', 'fh-g'), l = make('span', 'fh-gl'), b = make('b'), d = make('span', 'fh-gd');
        put(gauges, put(row, l, put(make('span', 'fh-gb'), make('i', 'tol'), make('i', 'in'), b), d));
        gaugeRows.push({ row, l, b, d });
      }
      shown(gauges, st.stats.length > 0);
    }
    for (let i = 0; i < gaugeRows.length; i++) {
      const g = gaugeOf(st.stats[i], G), r = gaugeRows[i];
      text(r.l, g.label); text(r.d, g.dev); attr(r.row, 'title', g.tip); css(r.b, 'left', g.x.toFixed(1) + '%');
      if (changed(r.row, 'cls', g.cls)) r.row.className = 'fh-g ' + g.cls;
    }
  }
  function flashProgress() {
    prog.classList.remove('flash'); void prog.offsetWidth; prog.classList.add('flash');      // restart the animation
    clearTimeout(flashTimer); flashTimer = setTimeout(() => prog.classList.remove('flash'), 950);
  }
  function renderLesson(st) {
    text(lTitle, st.title); text(lLevel, `（${st.levelName}）`);
    renderDots(st);
    text(sayEl, st.sayText); shown(sayEl, !!st.sayText);
    renderKeys(st);
    text(guide, st.guideText); shown(guide, !compact && !!st.guideText && !st.done);
    renderGauges(st);
    const p = progressOf(st, PR);
    text(progTxt, p.text); shown(prog, !!p.text);
    shown(bar, p.frac != null); if (p.frac != null) css(barFill, 'width', (p.frac * 100).toFixed(1) + '%');
    klass(prog, 'reset', p.reset); klass(prog, 'pre', p.pre);
    // the hold dropped back to 0 (it had been counting) inside the graded window: a red flash
    if (p.reset && lastHold >= 1) flashProgress();
    lastHold = st.need ? st.holdT : 0;
    const h = st.hint && !st.done ? (compact ? st.hint : '教官：' + st.hint) : '';
    text(hint, h); shown(hint, !!h);
    fitLesson(`${st.step}|${st.done}|${st.sayText.length}|${st.keysText.length}|${guide.hidden ? 0 : st.guideText.length}|${st.stats.length}|${p.text.length}|${p.frac != null}|${h.length}|${p2dOn}|${layoutN}`);
  }
  // the panel always fits its column, checked only when something that sets its height changed (a step, a text's
  // length, the window, the big G1000): if it overflows, the levels of .fitN take away the least needed parts first
  const FITS = ['fit1', 'fit2', 'fit3', 'fit4'];
  function fitLesson(sig) {
    if (sig === fitSig || lesson.hidden || el.hidden) return;
    fitSig = sig;
    for (const f of FITS) lesson.classList.remove(f);
    for (let i = 0; i < FITS.length && lesson.scrollHeight > lesson.clientHeight + 1; i++) lesson.classList.add(FITS[i]);
  }

  // ---- the free-flight panel
  function renderFree(st, pn) {
    if (pn) {
      text(fIas, String(Math.round(pn.ias))); text(fAlt, thousands(Math.round(pn.alt / 10) * 10));
      text(fHdg, hdg3(pn.hdg)); text(fVs, signed(Math.round(pn.vs / 10) * 10));
    }
    // where it is: on the ground, what holds it; in the air, how far the runway is (FLIGHT LAB's free panel)
    const c = st && st.ctx;
    let w = '';
    if (pn && pn.onGround) w = pn.parkBrake ? 'パーキング ブレーキ中：パネル下の T ハンドルをクリックで解除' : '地上：Q / E で前輪の向き・B / Space でブレーキ';
    else if (c && Number.isFinite(c.along)) w = `滑走路 36 まで ${(Math.hypot(c.along - 600, c.cross) / 1852).toFixed(1)} NM`;
    text(fWhere, w); shown(fWhere, !!w);
  }

  // ---- the control strip (FLIGHT LAB app.js renderStrip, as tiles)
  function renderStrip(pn, st) {
    const pct = v => `${Math.round(v * 100)}%`;
    text(tThr.v, pct(pn.thr)); text(tThr.s, `${thousands(pn.rpm)} rpm`); css(tThr.m, 'width', pct(clamp(pn.thr, 0, 1)));
    klass(tThr.t, 'bad', !pn.engRun);
    if (pn.keyHold) { text(tPitch.v, `保持 ${signed(pn.pTgt, 1)}°`); text(tPitch.s, `いま ${signed(pn.pitch, 1)}°`); }
    else { text(tPitch.v, `${pn.pIn >= 0 ? '引き' : '押し'} ${pct(Math.abs(pn.pIn))}`); text(tPitch.s, `いま ${signed(pn.pitch, 1)}°`); }
    text(tTrim.v, pn.trimPct === 0 ? '中立' : `${pn.trimPct > 0 ? '機首上げ' : '機首下げ'} ${Math.abs(pn.trimPct)}%`);
    text(tTrim.s, '');
    text(tFlap.v, pn.flapLabel); text(tFlap.s, pn.flapMoving ? '作動中' : ''); klass(tFlap.t, 'move', !!pn.flapMoving);
    text(tBrake.v, pn.parkBrake ? 'PARK' : pn.brake ? 'ON' : '—'); text(tBrake.s, pn.parkBrake ? 'パーキング' : '');
    klass(tBrake.t, 'warn', !!(pn.brake || pn.parkBrake));
    const rud = pn.rud || 0;
    text(tRud.v, pn.autoRud ? '自動' : '手動');
    text(tRud.s, `${Math.abs(rud) < 0.005 ? '中立' : (rud > 0 ? 'R ' : 'L ') + pct(Math.abs(rud))}${pn.rTrim ? `・トリム ${pn.rTrim > 0 ? 'R' : 'L'}` : ''}`);
    shown(bStall, !!pn.stall); shown(bEng, !pn.engRun); shown(bDmg, !!(st && st.crashed));
  }

  // ---- the dialogs
  function renderCheck(st) {
    const ck = st.mode === 'lesson' && !st.done ? st.check : null;
    shown(check, !!ck);
    if (!ck) return;
    if (!changed(check, 'k', `${ck.id}:${ck.i}:${ck.items.map(x => x.text).join('|')}`)) return;
    text(cTitle, ck.title);
    cList.textContent = '';
    for (const it of ck.items) put(cList, put(make('li', it.ok ? 'ok' : it.cur ? 'cur' : ''), make('b', '', null, it.name), make('span', '', null, it.text)));
    if (!cFoot.classList.contains('ng')) cFoot.textContent = 'Enter かクリックで 1 項目ずつ確認。条件のある項目は、その状態にしてから';
  }
  function renderAtc(st) {
    const ar = st.atcResult, res = !st.atc && ar && st.t >= ar.t && st.t - ar.t < (ar.ok ? 2.6 : 5.2);
    const on = st.mode === 'lesson' && !st.done && !!(st.atc || res);
    shown(atc, on);
    if (!on) return;
    if (st.atc) {
      if (changed(atc, 'k', 'q' + st.atc.msg + st.atc.opts.join('|'))) {
        text(aMsg, st.atc.msg); aOpts.textContent = '';
        st.atc.opts.forEach((o, i) => put(aOpts, put(make('button', '', { type: 'button', tabindex: '-1', 'data-i': String(i) }), make('i', '', null, String(i + 1)), make('span', '', null, o))));
      }
      shown(aMsg, true); shown(aQ, true); shown(aOpts, true); shown(aRes, false);
    } else {
      if (changed(atc, 'k', 'r' + ar.t)) {
        aRes.textContent = '';
        put(aRes, make('b', '', null, ar.ok ? '正解。' : '不正解。'), doc.createTextNode((ar.ok ? '' : `正しくは「${ar.right || ''}」。`) + ar.why));
        aRes.className = 'fh-ar ' + (ar.ok ? 'ok' : 'ng');
      }
      shown(aQ, false); shown(aOpts, false); shown(aRes, true);
    }
  }

  // ---- the key help: the rows this step uses are lit
  const used = new Set();
  function renderHelp(st) {
    const sig = st ? `${mode}|${st.kind}|${st.aircraft}|${st.keysText}` : mode;
    if (!changed(help, 'k', sig)) return;
    used.clear();
    if (st) {
      for (const p of parseKeys(st.keysText)) for (const k of p.keys) used.add(k.replace(/^Shift\+/, ''));
      if (st.kind === 'checklist') used.add('Enter');
      if (st.kind === 'atc') used.add('1');
    }
    const twin = !!(st && st.aircraft && st.aircraft !== 'pa28'), isFree = mode === 'free';
    for (const r of helpRows) {
      shown(r.tr, !(r.only === 'twin' && !twin) && !(r.only === 'free' && !isFree));
      klass(r.tr, 'now', r.names.some(n => used.has(n)));
    }
    text(helpSub, used.size ? 'いまの手順で使うキーが光っています' : 'FLIGHT LAB と同じキーで飛びます');
  }

  // ---- input from the mouse
  fold.addEventListener('click', () => { setCompact(!compact); fold.blur(); });
  check.addEventListener('click', () => {
    if (!onCheck) return;
    const r = onCheck();
    if (r && r.ok === false && r.item) flashChecklist(r.text);
  });
  aOpts.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    b.blur();
    if (onAtc) onAtc(Number(b.dataset.i));
  });
  function choose(act) {
    if (!debOpen) return;
    const cb = debCb || {};
    hideDebrief();
    const fn = act === 'retry' ? cb.onRetry : act === 'free' ? cb.onFree : cb.onReturn;
    if (typeof fn === 'function') fn();
  }
  dBtns.addEventListener('click', (e) => { const b = e.target.closest('button[data-act]'); if (b) choose(b.dataset.act); });
  // R on the debrief: try again (not while the pause menu or another modal is over it, nor while typing)
  const typing = t => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  const otherModal = () => Array.from(doc.querySelectorAll('[aria-modal="true"]')).some(n => n !== card && !n.closest('[hidden]') && n.getClientRects().length > 0);
  function onKey(e) {
    if (!debOpen || e.code !== 'KeyR' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || bRetry.hidden || typing(e.target) || otherModal()) return;
    e.preventDefault(); e.stopPropagation();
    choose('retry');
  }
  if (keys) win.addEventListener('keydown', onKey, true);
  const onResize = () => { sizeDirty = true; layoutN++; };
  win.addEventListener('resize', onResize);

  // ---- the API
  function show(v = true) { el.hidden = !v; if (v) fitSig = ''; }
  function setMode(m) {
    mode = m === 'free' ? 'free' : 'lesson';
    shown(lesson, mode === 'lesson' && !!status); shown(free, mode === 'free');
  }
  // status: flight.status() (null hides the panels); pn: flight.panel() — both read, never kept beyond the next call
  function update(st, pn) {
    if (destroyed) return;
    if (st !== undefined) status = st;
    if (pn) panel = pn;
    if (status && status.mode && status.mode !== mode) setMode(status.mode);
    const on = !!status;
    shown(lesson, on && mode === 'lesson'); shown(free, mode === 'free'); shown(strip, !!panel);
    if (!on) { shown(check, false); shown(atc, false); return; }
    if (mode === 'lesson') renderLesson(status); else renderFree(status, panel);
    if (panel) renderStrip(panel, status);
    renderCheck(status); renderAtc(status);
    if (helpOn) renderHelp(status);
  }
  // the instructor's line (top centre) for ms (default: by its length and the text-speed setting); '' hides it
  function say(name, line, ms, color) {
    if (destroyed) return;
    clearTimeout(subTimer);
    if (!line) { subt.classList.remove('show'); el.style.setProperty('--fh-sub-h', '0px'); return; }
    text(subName, name || ''); shown(subName, !!name);
    if (color) subt.style.setProperty('--sp', color); else subt.style.removeProperty('--sp');
    text(subText, String(line));
    subt.classList.add('show');
    // on a narrower screen the dialogs on the right move down below it
    el.style.setProperty('--fh-sub-h', (subt.offsetHeight + 8) + 'px');
    const speed = settings && typeof settings.get === 'function' ? Number(settings.get('textSpeed')) || 1 : 1;
    subTimer = setTimeout(() => { subt.classList.remove('show'); el.style.setProperty('--fh-sub-h', '0px'); }, ms > 0 ? ms : sayMs(String(line), speed));
  }
  // the refused checklist item flashes; the reason (what to set first) shows under the list for a while
  function flashChecklist(reason = '') {
    const li = cList.querySelector('li.cur');
    if (li) { li.classList.add('ng'); setTimeout(() => li.classList.remove('ng'), 600); }
    if (reason) {
      cFoot.textContent = reason; cFoot.classList.add('ng');
      clearTimeout(footTimer);
      footTimer = setTimeout(() => { cFoot.classList.remove('ng'); cFoot.textContent = 'Enter かクリックで 1 項目ずつ確認。条件のある項目は、その状態にしてから'; }, 2600);
    }
  }
  // the end of a lesson (or of a free flight): summary = status() once it is done; cbs = { onRetry, onFree, onReturn,
  // labels: { retry, free, return } }. A button without a callback is not shown; a button hides the card, then calls back
  function showDebrief(sum, cbs = {}) {
    if (destroyed || !sum) return;
    debCb = cbs || {};
    const D = debriefOf(sum), lab = debCb.labels || {};
    text(gradeB, D.grade); text(gradeS, D.status); grade.className = 'fh-grade ' + D.cls;
    text(dKick, D.kick); text(dTitle, D.title); text(dSub, D.sub);
    dStats.textContent = '';
    const stat = (v, l) => put(dStats, put(make('span'), make('b', '', null, v), doc.createTextNode(l)));
    if (!D.free) { stat(`${D.okN} / ${D.rowsN}`, '基準内の項目'); stat(`${D.stepsDone} / ${D.stepsN}`, '終えた手順'); }
    if (D.time) stat(D.time, '飛行時間');
    dStats.hidden = !dStats.firstChild;
    dAdv.textContent = '';
    if (D.tips.length || D.tipNone) {
      put(dAdv, make('b', '', null, '次に意識すること'));
      if (D.tips.length) { const ul = make('ul'); for (const t of D.tips) put(ul, make('li', '', null, t)); put(dAdv, ul); } else put(dAdv, make('p', '', null, D.tipNone));
      put(dAdv, make('p', '', null, `基準外：${D.bad}`));
    }
    dAdv.hidden = !(D.tips.length || D.tipNone);
    dDetBody.textContent = '';
    for (const r of D.results) {
      const t = make('table');
      for (const row of r.rows) put(t, put(make('tr', row.pass ? 'ok' : 'ng'), make('td', '', null, row.pass ? '○' : '×'), make('td', '', null, row.name), make('td', '', null, row.val), make('td', '', null, row.std)));
      put(dDetBody, make('h3', '', null, r.step), t);
    }
    if (!D.results.length) put(dDetBody, make('p', '', null, '採点できる項目がありませんでした。'));
    dDet.open = false; dDet.hidden = D.free; dNote.hidden = D.free;
    // the buttons there is something to do for; what to do next: try again after a miss, fly on after a pass
    const has = { retry: typeof debCb.onRetry === 'function', free: typeof debCb.onFree === 'function', ret: typeof debCb.onReturn === 'function' };
    bRetry.hidden = !has.retry; bFree.hidden = !has.free; bRet.hidden = !has.ret; dBtns.hidden = !(has.retry || has.free || has.ret);
    retryTxt.textContent = lab.retry || (D.free ? 'もう一度飛ぶ' : 'もう一度');
    bFree.textContent = lab.free || '自由に飛ぶ'; bRet.textContent = lab.return || '駐機場へ戻る';
    const first = sum.passed && has.free ? bFree : has.retry ? bRetry : has.free ? bFree : bRet;
    for (const b of [bRetry, bFree, bRet]) b.classList.toggle('primary', b === first);
    deb.hidden = false; debOpen = true; card.scrollTop = 0; klass(el, 'deb', true);
    setTimeout(() => { if (debOpen) try { first.focus({ preventScroll: true }); } catch (e) { /* focus is a nicety */ } }, 30);
  }
  function hideDebrief() {
    if (!debOpen) return;
    debOpen = false; deb.hidden = true; klass(el, 'deb', false);
    if (deb.contains(doc.activeElement)) try { doc.activeElement.blur(); } catch (e) { /* nothing focused */ }
  }
  function setHelp(v) { helpOn = v == null ? !helpOn : !!v; shown(help, helpOn); if (helpOn) renderHelp(status); return helpOn; }
  // the big G1000 (Tab): the canvases, which drawPanel2D (or the game, with fitPanel) fills
  function setPanel2D(v) {
    p2dOn = v == null ? !p2dOn : !!v;
    shown(p2d, p2dOn); klass(el, 'p2d', p2dOn);
    if (p2dOn) put(mid, strip); else left.appendChild(strip);
    sizeDirty = true; layoutN++;
    if (status && mode === 'lesson') renderLesson(status);
    return { pfd, mfd };
  }
  // a canvas ready to draw on at 640 × H logical (the CSS box is read only after a resize or a toggle)
  function fitPanel(which) {
    const cv = which === 'mfd' ? mfd : pfd;
    if (sizeDirty) {
      for (const [k, c] of [['pfd', pfd], ['mfd', mfd]]) { const r = c.getBoundingClientRect(); sizes[k].width = r.width; sizes[k].height = r.height; }
      sizeDirty = false;
    }
    return fitCanvas(cv, sizes[which === 'mfd' ? 'mfd' : 'pfd'], Math.min(win.devicePixelRatio || 1, 2));
  }
  // both screens with FLIGHT LAB's own drawing (AV = FL.avionics, d = app.js panelData); false when not shown
  function drawPanel2D(AV, d) {
    if (!p2dOn || el.hidden || destroyed) return false;
    const a = fitPanel('pfd'); AV.drawPFD(a.g, a.W, a.H, d);
    const b = fitPanel('mfd'); AV.drawMFD(b.g, b.W, b.H, d);
    return true;
  }
  function setHood(v) { shown(hood, !!v); }
  function setCompact(v) { compact = !!v; text(fold, compact ? '詳しく' : '簡潔に'); if (status && mode === 'lesson') renderLesson(status); }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    clearTimeout(subTimer); clearTimeout(flashTimer); clearTimeout(footTimer);
    if (keys) win.removeEventListener('keydown', onKey, true);
    win.removeEventListener('resize', onResize);
    el.remove();
  }

  return {
    el, show, setMode, update, say, flashChecklist, showDebrief, hideDebrief, setHelp, setPanel2D, fitPanel, drawPanel2D, setHood, setCompact,
    onChecklistClick(fn) { onCheck = typeof fn === 'function' ? fn : null; },
    onAtcClick(fn) { onAtc = typeof fn === 'function' ? fn : null; },
    destroy,
    get visible() { return !el.hidden; }, get mode() { return mode; }, get debriefOpen() { return debOpen; }, get help() { return helpOn; },
    get panel2D() { return p2dOn; }, get hood() { return !hood.hidden; }, get compact() { return compact; },
  };
}
