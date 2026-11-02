// golden-dialog.mjs — Stage 8 golden for the dialog engine + validator:
// validates and deterministically walks every assembled conversation dataset
// with the REAL engine (dialog/engine.js) and validator (dialog/validate.js),
// recording view sequences, hooks and final states for the C# harness to
// replay byte-for-byte. Walk policy: at a choice node pick the choice whose
// index is (previous visits to this node) mod (choice count); keys likewise;
// otherwise next(). Cap 1000 views per dialog.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TREE = process.argv[2] || '/home/hatch/workspace/cadet-wt-free';
const DATA = '/home/hatch/workspace/cadet-unity/data';
const OUT = process.argv[3] || '/home/hatch/workspace/cadet-unity/flight/test/golden-dialog.jsonl';
const engine = await import(pathToFileURL(path.join(TREE, 'cadet/src/dialog/engine.js')).href);
const validate = await import(pathToFileURL(path.join(TREE, 'cadet/src/dialog/validate.js')).href);

const trees = JSON.parse(readFileSync(path.join(DATA, 'dialog-trees.json'), 'utf8'));
const extra = JSON.parse(readFileSync(path.join(DATA, 'dialog-extra.json'), 'utf8'));
const peopleMod = JSON.parse(readFileSync(path.join(DATA, 'dialog-people.json'), 'utf8'));
const sectionSet = new Set(extra.sections);
const lessonSet = new Set(extra.lessons);

const sets = [];
for (const [name, data] of Object.entries(trees)) {
  if (!data || typeof data !== 'object' || !data.dialogs) continue;   // dayRadioGood / ctaf are radio data, not dialog data
  sets.push({ name: 'trees/' + name, data, ctx: name === 'people' ? (peopleMod.SAMPLE_CTX || {}) : {}, full: false });
}
for (const [id, data] of Object.entries(extra.instructor)) sets.push({ name: 'instructor/' + id, data, ctx: extra.sampleCtx, full: true });
for (const [id, data] of Object.entries(extra.instructorMerged)) sets.push({ name: 'merged/' + id, data, ctx: extra.sampleCtx, full: true });

const esc = (s) => String(s ?? '').replace(/\n/g, '␊');
function walk(data, ctx) {
  const hooksLog = [];
  const state = engine.createDialogState();
  const r = engine.createRunner({ data, state, ctx, hooks: { onHook: (n, a) => hooksLog.push(n + '=' + JSON.stringify(a ?? null)) } });
  const walks = [];
  for (const did of Object.keys(data.dialogs)) {
    const lines = [];
    const visits = new Map();
    try {
      if (!r.start(did)) { lines.push('(start→end)'); }
      else {
        for (let step = 0; step < 1000; step++) {
          const v = r.view();
          if (!v) { lines.push('(closed)'); break; }
          const key = v.dialog + ':' + v.node;
          const seen = (visits.get(key) || 0) + 1; visits.set(key, seen);
          lines.push([key, v.speaker, esc(v.text), 'ch=' + v.choices.map(c => esc(c.text)).join('/'), 'ends=' + (v.ends ? 1 : 0),
            v.keys ? 'keys=' + v.keys.map(k => k.key).join('') : '', v.en !== undefined ? 'en=' + esc(v.en) : ''].filter(x => x !== '').join('|'));
          if (v.choices.length) { if (!r.choose((seen - 1) % v.choices.length)) { lines.push('(choose-false)'); break; } }
          else if (v.keys && v.keys.length) { if (!r.press(v.keys[(seen - 1) % v.keys.length].key)) { lines.push('(press-false)'); break; } }
          else if (!r.next()) { lines.push('(next-false)'); break; }
        }
      }
    } catch (e) { lines.push('EXC ' + String(e && e.message || e)); }
    walks.push({ dialog: did, lines });
  }
  const flags = Object.keys(state.flags).sort().map(k => k + '=' + JSON.stringify(state.flags[k])).join(',');
  const trust = Object.keys(state.trust).sort().map(k => k + '=' + state.trust[k]).join(',');
  return { walks, hooks: hooksLog, state: { flags, trust, items: state.items.join(','), seen: Object.keys(state.seen).length } };
}

const out = [];
for (const s of sets) {
  const opts = s.full
    ? { sectionExists: (id) => sectionSet.has(id), lessonExists: (id) => lessonSet.has(id), sampleCtx: s.ctx }
    : { sampleCtx: s.ctx };
  const v = validate.validateDialogs(s.data, opts);
  const w = walk(s.data, s.ctx);
  out.push(JSON.stringify({ set: s.name, errors: v.errors, warnings: v.warnings, walks: w.walks, hooks: w.hooks, state: w.state }));
  console.log(s.name, 'errors', v.errors.length, 'warnings', v.warnings.length, 'walks', w.walks.length, 'hooks', w.hooks.length);
}
writeFileSync(OUT, out.join('\n') + '\n');
console.log('wrote', OUT, out.length, 'sets');
