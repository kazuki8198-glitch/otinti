// TEXTBOOK — build tests (node --test): build() returns the page as a string (nothing is written here).
//  - one file, nothing loaded from outside (FLIGHT LAB's source URLs are strings and <a href> links: not loads);
//  - every inline script parses; FLIGHT LAB's 16 modules are inside, in FL_MODULES order, read from flight-lab/src;
//  - FL_MODULES is FLIGHT LAB's one list of modules (flight-lab/src/modules.mjs) less what this page says it leaves out
//    (FL_LEAVE_OUT, each with its reason), in the list's order (DESIGN 6.2 rule 7); 16 is changed on purpose with a file (TEST-CONSTANTS.md);
//  - the notes are there; no FLIGHT LAB source copied into textbook/; the same sources give the same string.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, FL_MODULES, FL_LEAVE_OUT, FL_SRC } from '../build.mjs';
import { MODULES, modulePath } from '../../flight-lab/src/modules.mjs';
import { NOTICE, SEC_NOTE, APP_NOTE } from './load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), TB = path.resolve(here, '..');
const { html, bytes } = build({ quiet: true });

test('build: one file, nothing from outside', () => {
  assert.equal(bytes, Buffer.byteLength(html));
  assert.match(html, /^<!doctype html>\n<html lang="ja">/);
  assert.equal((html.match(/<html[\s>]/g) || []).length, 1);
  assert.doesNotMatch(html, /<script[^>]*\ssrc\s*=/i, 'no external scripts');
  assert.doesNotMatch(html, /<link[^>]*\shref\s*=/i, 'no external stylesheets or fonts');
  assert.doesNotMatch(html, /<img[^>]+src=["']?https?:/i, 'no remote images');
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  assert.ok(css.length > 1000);
  assert.doesNotMatch(css, /url\(\s*['"]?https?:/i, 'no remote CSS resources');
  assert.doesNotMatch(css, /@import/i, 'no @import');
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/i);
});

test('build: every script parses; the 16 FLIGHT LAB modules in order, then the page', () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(scripts.length, FL_MODULES.length + 2);
  for (const s of scripts) assert.doesNotThrow(() => new vm.Script(s), s.slice(0, 60));
  assert.equal(FL_MODULES.length, 16);
  const at = FL_MODULES.map(m => html.indexOf(`/* ---- FLIGHT LAB: ${m} ---- */`));
  for (const [i, m] of FL_MODULES.entries()) assert.ok(at[i] > 0, m);
  for (let i = 1; i < at.length; i++) assert.ok(at[i] > at[i - 1], `${FL_MODULES[i]} after ${FL_MODULES[i - 1]}`);
  assert.ok(html.indexOf('/* ---- TEXTBOOK: render.js ---- */') > at.at(-1));
  assert.ok(html.indexOf('/* ---- TEXTBOOK: page.js ---- */') > html.indexOf('/* ---- TEXTBOOK: render.js ---- */'));
  // read as they are from flight-lab/src
  for (const m of FL_MODULES) {
    const src = fs.readFileSync(modulePath(m), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
    assert.ok(html.includes(src), `${m} unchanged`);
  }
});

test('build: FL_MODULES is FLIGHT LAB\'s one list less what this page leaves out, in the list\'s order', () => {
  assert.deepEqual([...FL_MODULES], MODULES.filter(m => !Object.hasOwn(FL_LEAVE_OUT, m)));
  for (const [m, why] of Object.entries(FL_LEAVE_OUT)) { assert.ok(MODULES.includes(m), `${m}: not in flight-lab/src/modules.mjs`); assert.ok(why.length >= 10, `${m}: the reason`); }
  // the photos are read (bk.photo); the basic course and FLIGHT LAB's own pages are not
  assert.ok(FL_MODULES.includes('book-photos.js'));
  for (const m of ['kiso/kiso-data.js', 'quiz.js', 'radio.js', 'ui.js', 'pages.js', 'app.js', 'scene.js', 'google3d.js']) assert.ok(!FL_MODULES.includes(m), m);
  for (const m of FL_MODULES) assert.ok(fs.existsSync(modulePath(m)) && modulePath(m).startsWith(FL_SRC + path.sep), m);
});

test('build: the notes', () => {
  for (const t of NOTICE) assert.ok(html.includes(t), t);
  assert.ok(html.includes(SEC_NOTE));
  assert.ok(html.includes(APP_NOTE));
});

test('build: FLIGHT LAB sources are not copied into textbook/', () => {
  const names = new Set(fs.readdirSync(FL_SRC).filter(f => f.endsWith('.js')));
  const found = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name), rel = path.relative(TB, p);
    if (e.isDirectory()) { if (!['outputs', 'test-output', 'node_modules'].includes(rel)) walk(p); } else if (names.has(e.name)) found.push(rel);
  } };
  walk(TB);
  assert.deepEqual(found, []);
});

test('build: the same sources give the same string', () => {
  assert.equal(build({ quiet: true }).html, html);
  assert.doesNotMatch(html, /\b20\d\d-\d\d-\d\dT/, 'no build time');
});
