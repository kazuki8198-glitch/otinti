// CADET — build tests (node --test): one self-contained HTML file.
//  - no external scripts, styles, images or fonts (it must open from file:// with no network);
//  - every inline script parses; FLIGHT LAB's modules are inside, read from flight-lab/src;
//  - the textures and the models are embedded; three.js's licence is kept (M8: and the Anthropic SDK's, with the code
//    inside it); the file stays within the size budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, FL_MODULES, MAX_BYTES } from '../build.mjs';

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
  assert.match(html, /globalThis\.CADET_ASSETS = \{"tex\/asphalt_c":"data:image\/webp;base64,/);
  // every model made in Blender embedded as a glb (a page without one draws its old simple shapes, silently)
  for (const m of ['actor', 'actor-near', 'archer', 'archer-far', 'seminole', 'seminole-far', 'jet737', 'cockpit']) assert.match(html, new RegExp(`"model/${m}":"Z2xURg`), m);
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
