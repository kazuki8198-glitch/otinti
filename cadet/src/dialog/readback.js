// CADET — dialog/readback.js : a read-back said into the microphone (M8), held against what the controller expects.
// Pure: the browser's speech recognition (ui/mic.js) gives text such as "runway 36 line up and wait archer 8 sierra
// yankee"; this finds the key words of each answer on the radio panel (content/dialog/atc.js) — the call sign, the
// runway, an altitude, a frequency, a squawk code, a taxiway, the ATIS letter, the instruction's own words — and says
// which answer was said (all its key words heard) or, when none was, which key words of the right one are missing.
// Numbers and letters are compared as the radio says them (three six = 36, niner = 9, Sierra Yankee = SY, one one
// eight point three = 118.3), so "runway 36" and "runway three six" are the same.
const NUM = { zero: '0', oh: '0', one: '1', won: '1', two: '2', three: '3', tree: '3', four: '4', fower: '4', five: '5', fife: '5', six: '6', seven: '7', eight: '8', ait: '8', nine: '9', niner: '9' };
const PHON = { alpha: 'a', alfa: 'a', bravo: 'b', charlie: 'c', delta: 'd', echo: 'e', foxtrot: 'f', golf: 'g', hotel: 'h', india: 'i', juliet: 'j', juliett: 'j', kilo: 'k', lima: 'l', mike: 'm',
  november: 'n', oscar: 'o', papa: 'p', quebec: 'q', romeo: 'r', sierra: 's', tango: 't', uniform: 'u', victor: 'v', whiskey: 'w', whisky: 'w', xray: 'x', yankee: 'y', zulu: 'z' };
// the instruction's own words (as the radio says them: "straight-in" is "straight in")
export const PHRASES = ['hold short', 'line up and wait', 'cleared for takeoff', 'cleared to land', 'closed traffic', 'straight in', 'report final', 'report midfield downwind',
  'report returning', 'frequency change approved', 'request taxi', 'ready for departure', 'inbound for landing', 'clear of runway', 'east ramp', 'student pilot', 'first solo',
  'right at', 'left at', 'left closed', 'right closed', 'downwind', 'final', 'taking off', 'roger', 'bye', 'ready to go', 'landing', 'over the practice area', 'over',
  // (k4, the chair flight: its calls have a word of their own besides the call sign — asking again, the wrong ones)
  'say again', 'contact departure', 'inbound', 'clear of the runway'];

// text → words: lower case, numbers as digits ("3,000" → "3000"), the alphabet's words as letters, "point" as "."
export function normalize(text) {
  const words = String(text || '').toLowerCase().replace(/x-ray/g, 'xray').replace(/take[\s-]?off/g, 'takeoff').replace(/mid[\s-]field/g, 'midfield')
    .replace(/(\d),(\d{3})/g, '$1$2').replace(/(\d)\.(\d)/g, '$1 . $2').replace(/(^|[^a-z0-9.])\.(\d)/g, '$1 . $2')   // (".7": "point seven" as the recognizer may write it)
    .replace(/[^a-z0-9.\s]/g, ' ').split(/\s+/).map(w => (w === '.' ? w : w.replace(/^\.+|\.+$/g, ''))).filter(Boolean);
  const out = [];
  for (const w of words) {
    if (NUM[w]) out.push(NUM[w]);
    else if (PHON[w]) out.push(PHON[w]);
    else if (w === 'point' || w === 'decimal' || w === '.') out.push('.');
    else if (/^\d+$/.test(w)) out.push(...w.split(''));            // "36" is said "three six": digit by digit
    else if (/^\d+[a-z]+$/.test(w)) out.push(...w.split(''));      // "8sy" → 8 s y
    else out.push(w);
  }
  // "three thousand five hundred" → 3500 (an altitude), kept as one word
  const res = [];
  for (let i = 0; i < out.length; i++) {
    if (/^\d$/.test(out[i]) && out[i + 1] === 'thousand') {
      let n = +out[i] * 1000; i++;
      if (/^\d$/.test(out[i + 1] || '') && out[i + 2] === 'hundred') { n += +out[i + 1] * 100; i += 2; }
      res.push(String(n)); continue;
    }
    if (/^\d$/.test(out[i]) && out[i + 1] === 'hundred') { res.push(String(+out[i] * 100)); i++; continue; }
    res.push(out[i]);
  }
  return res;
}
// the words with single digits and letters run together ("archer 7 3 8 s y" → "archer 738sy"), for looking things up
const squash = (ws) => {
  const out = []; let run = '';
  for (const w of ws) { if (w.length === 1) run += w; else { if (run) out.push(run); run = ''; out.push(w); } }
  if (run) out.push(run);
  return out.join(' ');
};
const glued = (ws) => ' ' + squash(ws) + ' ';
// the call sign's own letters and digits (Archer Seven Three Eight Sierra Yankee → 738sy; Archer 8SY → 8sy)
const callId = (s) => normalize(s).filter(w => /^[a-z0-9]$/.test(w)).join('');

// the key words of one thing said: [{ kind, want, ja }]; call: { full, short } (today's call sign)
export function keysOf(en, call = null, { number = false } = {}) {
  const ws = normalize(en), g = glued(ws), keys = [];
  const add = (kind, want, ja) => { if (!keys.some(k => k.kind === kind && k.want === want)) keys.push({ kind, want, ja }); };
  if (number) { const n = ws.join('').replace(/[^0-9.]/g, ''); if (n) add('number', n, n); return keys; }
  // (who is called: a call begins with the station — "LAB Ground, …", "Tower, …" — and a call to the wrong one is not the
  // right call; a read-back does not begin with one)
  const st = /^(?:lab )?(ground|tower)$/.exec(ws.slice(0, 2).join(' ')) || /^(ground|tower)$/.exec(ws[0] || '');
  if (st) add('station', st[1], `呼ぶ相手（LAB ${st[1] === 'ground' ? 'Ground' : 'Tower'}）`);
  if (call) {
    const full = callId(call.full), short = callId(call.short);
    if (full && g.includes(full)) add('call', full, `コールサイン（${call.full}）`);
    else if (short && g.includes(short)) add('call', short, `コールサイン（${call.short}）`);
  }
  for (const m of g.matchAll(/ runway (\d+) /g)) add('runway', m[1], `滑走路 ${m[1]}`);
  for (const m of g.matchAll(/ (\d{3,5}) (?!\.)/g)) if (/000$|00$/.test(m[1]) && +m[1] >= 500) add('altitude', m[1], `高度 ${(+m[1]).toLocaleString('en-US')} ft`);
  // (a frequency said in part — "Ground point seven", 121.7 — named as it is said)
  for (const m of g.matchAll(/ (\d{3})?\.(\d{1,3}) /g)) add('freq', (m[1] || '') + '.' + m[2], m[1] ? `周波数 ${m[1]}.${m[2]}` : `周波数（point ${m[2]}）`);
  for (const m of g.matchAll(/ squawk (\d{4}) /g)) add('squawk', m[1], `スコーク ${m[1]}`);
  for (const m of g.matchAll(/ (?:at|via) ([a-z]\d?) /g)) add('taxiway', m[1], `誘導路 ${m[1].toUpperCase()}`);
  for (const m of g.matchAll(/ information ([a-z]) /g)) add('info', m[1], `ATIS の符号 ${m[1].toUpperCase()}`);
  const plain = ' ' + ws.join(' ') + ' ';
  for (const p of PHRASES) {
    if (!plain.includes(` ${p} `)) continue;
    // a shorter phrase inside one already taken ("final" in "report final", "landing" in "inbound for landing") is not its own key
    if (keys.some(k => k.kind === 'phrase' && k.want.includes(p))) continue;
    // ("over" the procedure word ends a transmission; "over the practice area" is a place)
    if (p === 'over' && !/ over $/.test(plain)) continue;
    add('phrase', p, `“${p}”`);
  }
  return keys;
}
// a phrase heard: its words (but and / for / to / of, which the recognizer may lose or mishear) in order, each within
// two words of the one before ("line up in wait", "cleared for take off")
const SMALL = new Set(['and', 'for', 'to', 'of', 'the']);
// (words said with a right call that do not make it another one: "Roger" before a read-back, "over" at the end)
const BENIGN = new Set(['roger', 'over']);
// (a phrase by its own words, as it is heard: "clear of the runway" is "clear of runway")
const sig = (p) => p.split(' ').filter(w => !SMALL.has(w)).join(' ');
function said(ws, phrase) {
  const want = phrase.split(' ').filter(w => !SMALL.has(w));
  for (let i = 0; i < ws.length; i++) {
    if (ws[i] !== want[0]) continue;
    let at = i, ok = true;
    for (let k = 1; k < want.length && ok; k++) {
      let j = at + 1; while (j < ws.length && j <= at + 3 && ws[j] !== want[k]) j++;
      if (j < ws.length && ws[j] === want[k] && j <= at + 3) at = j; else ok = false;
    }
    if (ok) return true;
  }
  return false;
}
// which key words of `keys` were heard in `heard` (text) → { have: [], missing: [] }
export function hearKeys(keys, heard) {
  const ws = normalize(heard), g = glued(ws), digits = ws.join('').replace(/[^0-9.]/g, ''), tight = g.replace(/\s/g, '');
  const have = [], missing = [];
  for (const k of keys) {
    const ok = k.kind === 'phrase' ? said(ws, k.want)
      : k.kind === 'number' ? digits.includes(k.want.replace(/\.$/, '')) || digits.replace(/\./g, '').includes(k.want.replace(/\./g, ''))
        : k.kind === 'call' ? tight.includes(k.want)
          : k.kind === 'runway' ? g.includes(` runway ${k.want} `) || g.includes(` ${k.want} `)
            : k.kind === 'freq' ? g.includes(k.want) || g.includes(k.want.replace(/^\d{3}/, ''))
              : k.kind === 'squawk' ? g.includes(` ${k.want} `) || g.includes(k.want)
                : k.kind === 'taxiway' ? g.includes(` ${k.want} `)
                  : k.kind === 'info' ? g.includes(` information ${k.want} `) || g.includes(` ${k.want} `)
                    // (the station called: among the first words, before the call sign)
                    : k.kind === 'station' ? ws.slice(0, 3).includes(k.want)
                    : g.includes(` ${k.want} `);
    (ok ? have : missing).push(k);
  }
  return { have, missing };
}
// the answer said: choices [{ en, ok }] (the radio panel's, in its order), heard (one or more of the recognizer's
// guesses) → { pick: index | -1, right: index, missing: [keys of the right one not heard], heard }
// An answer counts as said when all its key words were heard; the right one first, else the one with most key words
// (a wrong one needs at least two key words, or one on the ATIS's number question, so a call sign alone never picks
// "Roger"; and no more of the right one heard than it has itself — but a wrong one of one word of its own, "Bye.", when
// nothing of the right one was heard). The right one is not taken when what was said also has a wrong one's own words
// ("line up and wait, cleared for takeoff": the clearance not given). The best of the guesses is the one that says an
// answer, else the one that leaves least missing.
export function matchReadback(choices, heard, { call = null, number = false } = {}) {
  const right = choices.findIndex(c => c.ok);
  const keys = choices.map(c => keysOf(c.en, call, { number }));
  const guesses = (Array.isArray(heard) ? heard : [heard]).map(String).filter(x => x.trim());
  let best = null;
  for (const h of guesses) {
    const res = keys.map(k => hearKeys(k, h));
    // (a wrong one only when no more of the right one was heard than the wrong one has: "taxi via Alpha, 8SY" inside a
    // nearly whole read-back that left out the squawk is not that wrong answer — the squawk is what is missing)
    const near = right >= 0 ? res[right].have.length : 0;
    // (a wrong one's own words: not the right one's, nor inside one of its phrases as heard — "inbound" in "inbound for
    // landing", "clear of the runway" in "clear of runway")
    const own = (i) => (right >= 0 ? keys[i].filter(k => !['call', 'station'].includes(k.kind) && !BENIGN.has(k.want)
      && !keys[right].some(x => x.kind === k.kind && (x.want === k.want || (k.kind === 'phrase' && sig(x.want).includes(sig(k.want)))))) : []);
    const enough = (i) => keys[i].length >= (number ? 1 : 2) || (!number && near === 0 && own(i).length === 1 && keys[i].length === 1);
    const full = res.map((r, i) => (keys[i].length && !r.missing.length && (i === right || (enough(i) && near <= keys[i].length)) ? i : -1)).filter(i => i >= 0);
    // (a wrong one's own words heard with the right one's: not the right one)
    const extra = !number && right >= 0 && res.some((r, i) => i !== right && own(i).some(k => r.have.includes(k)));
    const pick = full.includes(right) && !extra ? right : full.filter(i => i !== right).sort((a, b) => keys[b].length - keys[a].length)[0] ?? -1;
    const cand = { pick, right, missing: right >= 0 ? res[right].missing : [], heard: h };
    if (!best || (best.pick < 0 && pick >= 0) || (best.pick !== right && pick === right) || (best.pick < 0 && pick < 0 && cand.missing.length < best.missing.length)) best = cand;
  }
  return best || { pick: -1, right, missing: right >= 0 ? keys[right] : [], heard: '' };
}
