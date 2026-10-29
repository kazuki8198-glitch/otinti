// CADET — content/lecture-notes/index.js : what ミラー 講師 adds to the textbook in class (content/school.js reads it).
// One file per FLIGHT LAB chapter taught in chapter 1 (career.js CLASSES). Each exports, keyed by section id:
//   'aero.forces': {
//     intro: ['…'],          // 0–2 lines said right after the section's title: why it matters to a pilot
//     notes: ['…'],          // 2–8 lines said after the textbook's own text: the lecturer's explanation (an everyday
//                            //   picture, how it shows in the cockpit, the usual mistake); more where the textbook is thin
//     ask: { q, opts: [3–4 strings], ok: index, why },   // optional: one check on the section (not scored)
//   }
// Lines: 2–120 characters, です / ます, the lecturer's voice (Japanese with an occasional short English phrase); no real
// company names, no words about the program itself, no { } < >; facts as the textbook and its FAA sources have them.
import aero from './aero.js';
import sys from './sys.js';
import perf from './perf.js';
import wx from './wx.js';
import law from './law.js';
import hf from './hf.js';
import radio1 from './radio1.js';
import radio2 from './radio2.js';
import radio3 from './radio3.js';
import radio4 from './radio4.js';
import radio5 from './radio5.js';

export const NOTES = Object.freeze({ ...aero, ...sys, ...perf, ...wx, ...law, ...hf, ...radio1, ...radio2, ...radio3, ...radio4, ...radio5 });
export function notesFor(id) { return NOTES[id] || null; }
