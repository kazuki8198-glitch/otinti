// CADET — build.mjs
// Builds ONE HTML file that opens with a double click (file://) and works offline:
//  - the page and its CSS (src/index.html, src/style.css),
//  - FLIGHT LAB's plain-script modules, read from ../flight-lab/src (not copied: FLIGHT LAB keeps working on its own),
//  - the game, bundled by esbuild into one script (three.js pinned in package.json, licence kept),
//  - the textures as data URLs (assets/tex, CC0: see assets/CREDITS.md), the people's models (assets/model/actor.glb and
//    actor-near.glb, made by tools/actor), the Archer's and the Seminole's (archer.glb, archer-far.glb, seminole.glb and
//    seminole-far.glb, made by tools/aircraft; M8: jet737.glb, the epilogue's airliner): base64.
// Output: outputs/CADET.html
//   node build.mjs          minified
//   node build.mjs --dev    readable, with an inline source map
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { without, modulePath } from '../flight-lab/src/modules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'src'), OUT = path.join(here, 'outputs'), TEX = path.join(here, 'assets', 'tex');
// FLIGHT LAB modules the game uses (no DOM in any of them): the flight model, the G1000-type displays, the Sanford
// material, the school engine and the syllabus, the textbook, the test banks, English radio, the aircraft's 3D
// description — FLIGHT LAB's one list of modules (flight-lab/src/modules.mjs), in its order, less what the game does not
// read (the tests load the same: test/helpers/fl.mjs):
export const FL_LEAVE_OUT = Object.freeze({
  'book-terms.js': 'the table of terms (FL.terms): the game does not use it; a test that needs it reads the file itself (W04 report; DESIGN 3.5, W50)',
  'book-photos.js': 'the textbook\'s photos: not in the game (DESIGN 6.3: no book-photos*.js; the in-game book shows figures only)',
  'kiso/kiso-data.js': 'the basic course (the original): FLIGHT LAB\'s own page, not the academy\'s',
  'kiso-errata.js': 'what FLIGHT LAB\'s basic course page shows over the original: not the academy\'s',
  'ui.js': 'FLIGHT LAB\'s app (its controls and icons): the game has its own',
  'scene.js': 'FLIGHT LAB\'s app (the 3D view): the game has its own',
  'google3d.js': 'FLIGHT LAB\'s app (Google\'s 3D tiles): not in the fictional world',
  'pages.js': 'FLIGHT LAB\'s app (its screens, DOM): the game has its own',
  'app.js': 'FLIGHT LAB\'s app (its start, DOM): the game has its own',
});
export const FL_MODULES = without(FL_LEAVE_OUT, 'CADET (cadet/build.mjs)');
export const MAX_BYTES = 15 * 1024 * 1024;

const read = f => fs.readFileSync(f, 'utf8');
// inline scripts must not contain "</script" (it would end the element)
const safeJs = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const MIME = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };

function assetsScript() {
  const map = {};
  for (const f of fs.readdirSync(TEX).sort()) {
    const ext = path.extname(f); if (!MIME[ext]) continue;
    map['tex/' + path.basename(f, ext)] = `data:${MIME[ext]};base64,` + fs.readFileSync(path.join(TEX, f)).toString('base64');
  }
  for (const f of ['actor', 'actor-near', 'archer', 'archer-far', 'seminole', 'seminole-far', 'jet737']) map['model/' + f] = fs.readFileSync(path.join(here, 'assets', 'model', f + '.glb')).toString('base64');
  return `globalThis.CADET_ASSETS = ${JSON.stringify(map)};`;
}

export function build({ quiet = false, dev = false } = {}) {
  let rev = 'dev';
  try { rev = execSync('git rev-parse --short HEAD', { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { /* not a git checkout */ }
  const info = `build ${new Date().toISOString().slice(0, 10)} · ${rev}`;
  const bundle = esbuild.buildSync({
    entryPoints: [path.join(SRC, 'main.js')], bundle: true, write: false, format: 'iife', target: ['chrome110'],
    // (M8) the SDK's webhook verifier is never used in a page: its library is left out (src/ai/no-webhooks.js)
    absWorkingDir: here, alias: { standardwebhooks: './src/ai/no-webhooks.js' },
    minify: !dev, sourcemap: dev ? 'inline' : false, legalComments: 'inline', charset: 'utf8',
    define: { __BUILD_INFO__: JSON.stringify(info) }, logLevel: 'error',
  }).outputFiles[0].text;
  const threeLicense = read(path.join(here, 'node_modules', 'three', 'LICENSE'));
  // (M8) the AI instructor's client, and the code it carries inside: its copy of qs (BSD 3-Clause) and of
  // partial-json-parser (its licence is not in the SDK's package: tools/licenses)
  const sdkLicense = read(path.join(here, 'node_modules', '@anthropic-ai', 'sdk', 'LICENSE'));
  const qsLicense = read(path.join(here, 'node_modules', '@anthropic-ai', 'sdk', 'src', 'internal', 'qs', 'LICENSE.md'));
  const pjpLicense = read(path.join(here, 'tools', 'licenses', 'partial-json-parser.LICENSE'));
  const scripts = [
    `<script>\n${safeJs(assetsScript())}\n</script>`,
    ...FL_MODULES.map(m => `<script>\n/* ---- FLIGHT LAB: ${m} ---- */\n${safeJs(read(modulePath(m)))}\n</script>`),
    `<script>\n/* ---- CADET (bundled with three.js and the Anthropic TypeScript SDK with its qs and partial-json-parser; their licences at the end of this file) ---- */\n${safeJs(bundle)}\n</script>`,
  ].join('\n');
  let html = read(path.join(SRC, 'index.html'));
  html = html.replace(/<!--BUILD:CSS-->[\s\S]*?<!--\/BUILD:CSS-->/, () => `<style>\n${read(path.join(SRC, 'style.css'))}</style>`);
  html = html.replace(/<!--BUILD:JS-->[\s\S]*?<!--\/BUILD:JS-->/, () => scripts);
  html = html.replace('</html>', () => `<!--\nthree.js licence:\n${threeLicense.replace(/--/g, '- -')}\n\nAnthropic TypeScript SDK (@anthropic-ai/sdk) licence:\n${sdkLicense.replace(/--/g, '- -')}\n\nqs (neoqs; inside @anthropic-ai/sdk as internal/qs) licence:\n${qsLicense.replace(/--/g, '- -')}\n\npartial-json-parser (inside @anthropic-ai/sdk as _vendor/partial-json-parser) licence:\n${pjpLicense.replace(/--/g, '- -')}\n-->\n</html>`);
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, 'CADET.html');
  fs.writeFileSync(out, html);
  if (!quiet) console.log(`wrote ${path.relative(here, out)} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB, ${info})`);
  return { out, html, info };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build({ dev: process.argv.includes('--dev') });
