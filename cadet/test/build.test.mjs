// CADET — build tests (node --test): one self-contained HTML file.
//  - no external scripts, styles, images or fonts (it must open from file:// with no network);
//  - every inline script parses; FLIGHT LAB's modules are inside, read from flight-lab/src, in the one list's order;
//  - (W02) the one list of FLIGHT LAB's modules (flight-lab/src/modules.mjs): CADET's FL_MODULES and the tests' loader
//    (test/helpers/fl.mjs) are it less what CADET leaves out (each with its reason), and so is TEXTBOOK's;
//  - the textures are embedded; three.js's licence is kept (M8: and the Anthropic SDK's, with the code inside it); the
//    file stays within the size budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, FL_MODULES, FL_LEAVE_OUT, MAX_BYTES } from '../build.mjs';
import { MODULES, CORE } from '../../flight-lab/src/modules.mjs';
import * as TEXTBOOK from '../../textbook/build.mjs';
import { GAME, GAME_REST } from './helpers/fl.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

test('build: one file, offline, every script parses, within the size budget', () => {
  const { html, out } = build({ quiet: true });
  assert.ok(fs.existsSync(out));
  assert.ok(Buffer.byteLength(html) < MAX_BYTES, `size ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB`);
  assert.doesNotMatch(html, /<script[^>]+src=/i, 'no external scripts');
  assert.doesNotMatch(html, /<link[^>]+href=/i, 'no external stylesheets');
  assert.doesNotMatch(html, /url\(\s*['"]?https?:/i, 'no remote CSS resources');
  assert.doesNotMatch(html, /<img[^>]+src=["']https?:/i, 'no remote images');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(scripts.length >= FL_MODULES.length + 2);
  for (const s of scripts) assert.doesNotThrow(() => new vm.Script(s), 'an inline script does not parse');
  for (const m of FL_MODULES) assert.ok(html.includes(`FLIGHT LAB: ${m}`), m);
  // FLIGHT LAB's modules: exactly FL_MODULES, in that order (the one list's order: flight-lab/src/modules.mjs)
  assert.deepEqual([...html.matchAll(/<script>\n\/\* ---- FLIGHT LAB: (\S+) ---- \*\//g)].map(m => m[1]), [...FL_MODULES]);
  assert.match(html, /globalThis\.CADET_ASSETS = \{"tex\/asphalt_c":"data:image\/webp;base64,/);
  assert.match(html, /three\.js licence:[\s\S]*MIT License/);
  // (M8) the SDK and the code inside it, each with its licence; the webhook library left out (src/ai/no-webhooks.js)
  assert.match(html, /@anthropic-ai\/sdk\) licence:[\s\S]*Anthropic, PBC/);
  assert.match(html, /qs \(neoqs[^\n]*licence:\nBSD 3-Clause License[\s\S]*Nathan LaFreniere/);
  assert.match(html, /partial-json-parser[^\n]*licence:\nMIT License[\s\S]*indgov/);
  assert.doesNotMatch(html, /whsec_|Base64Coder: incorrect padding/, 'no webhook verifier');
  // the disclaimer is on the start screen and in the HUD
  assert.match(html, /非公式/); assert.match(html, /NOT FOR NAVIGATION/);
  // FLIGHT LAB's sources are used as they are (not copied into cadet/)
  assert.ok(!fs.existsSync(path.join(here, '../src/physics.js')));
});

// textbook/rewrite/combined/DESIGN.md 6.2 rule 7: one list of modules for the three products
test('modules: CADET reads FLIGHT LAB\'s one list less what it says it leaves out (so do its tests and TEXTBOOK)', () => {
  const less = (out) => MODULES.filter(m => !Object.hasOwn(out, m));
  for (const [who, list, out] of [['CADET', FL_MODULES, FL_LEAVE_OUT], ['TEXTBOOK', TEXTBOOK.FL_MODULES, TEXTBOOK.FL_LEAVE_OUT]]) {
    assert.deepEqual([...list], less(out), `${who}: the list less its leave-out list, in the list's order`);
    for (const [m, why] of Object.entries(out)) { assert.ok(MODULES.includes(m), `${who} leaves out ${m}: not in the list`); assert.ok(why.length >= 10, `${who}: ${m} has no reason`); }
  }
  // the tests load what the game loads; CORE is the list's head
  assert.deepEqual([...GAME], [...FL_MODULES]);
  assert.deepEqual([...GAME_REST], FL_MODULES.filter(m => !CORE.includes(m)));
  assert.deepEqual(MODULES.slice(0, CORE.length), [...CORE]);
  // what the game must not read (DESIGN 6.3): the textbook's photos and the basic course; FLIGHT LAB's DOM pages
  for (const m of ['book-photos.js', 'book-photos-k.js', 'kiso/kiso-data.js', 'pages.js', 'app.js', 'scene.js', 'ui.js', 'google3d.js']) assert.ok(!FL_MODULES.includes(m), m);
});
