// CADET — build.mjs
// Builds ONE HTML file that opens with a double click (file://) and works offline:
//  - the page and its CSS (src/index.html, src/style.css),
//  - FLIGHT LAB's plain-script modules, read from ../flight-lab/src (not copied: FLIGHT LAB keeps working on its own),
//  - the game, bundled by esbuild into one script (three.js pinned in package.json, licence kept),
//  - the textures as data URLs (assets/tex, CC0: see assets/CREDITS.md), the people's model (assets/model/actor.glb,
//    made by tools/actor: base64).
// Output: outputs/CADET.html
//   node build.mjs          minified
//   node build.mjs --dev    readable, with an inline source map
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'src'), OUT = path.join(here, 'outputs'), TEX = path.join(here, 'assets', 'tex');
const FL_SRC = path.join(here, '..', 'flight-lab', 'src');
// FLIGHT LAB modules the game uses (no DOM in any of them): the flight model, the G1000-type displays, the Sanford
// material, the school engine and the syllabus, the aircraft's 3D description
export const FL_MODULES = ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'acmesh.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js', 'quiz.js', 'radio.js'];
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
  map['model/actor'] = fs.readFileSync(path.join(here, 'assets', 'model', 'actor.glb')).toString('base64');
  return `globalThis.CADET_ASSETS = ${JSON.stringify(map)};`;
}

export function build({ quiet = false, dev = false } = {}) {
  let rev = 'dev';
  try { rev = execSync('git rev-parse --short HEAD', { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { /* not a git checkout */ }
  const info = `build ${new Date().toISOString().slice(0, 10)} · ${rev}`;
  const bundle = esbuild.buildSync({
    entryPoints: [path.join(SRC, 'main.js')], bundle: true, write: false, format: 'iife', target: ['chrome110'],
    minify: !dev, sourcemap: dev ? 'inline' : false, legalComments: 'inline', charset: 'utf8',
    define: { __BUILD_INFO__: JSON.stringify(info) }, logLevel: 'error',
  }).outputFiles[0].text;
  const threeLicense = read(path.join(here, 'node_modules', 'three', 'LICENSE'));
  const scripts = [
    `<script>\n${safeJs(assetsScript())}\n</script>`,
    ...FL_MODULES.map(m => `<script>\n/* ---- FLIGHT LAB: ${m} ---- */\n${safeJs(read(path.join(FL_SRC, m)))}\n</script>`),
    `<script>\n/* ---- CADET (bundled with three.js; three.js licence at the end of this file) ---- */\n${safeJs(bundle)}\n</script>`,
  ].join('\n');
  let html = read(path.join(SRC, 'index.html'));
  html = html.replace(/<!--BUILD:CSS-->[\s\S]*?<!--\/BUILD:CSS-->/, () => `<style>\n${read(path.join(SRC, 'style.css'))}</style>`);
  html = html.replace(/<!--BUILD:JS-->[\s\S]*?<!--\/BUILD:JS-->/, () => scripts);
  html = html.replace('</html>', () => `<!--\nthree.js licence:\n${threeLicense.replace(/--/g, '- -')}\n-->\n</html>`);
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, 'CADET.html');
  fs.writeFileSync(out, html);
  if (!quiet) console.log(`wrote ${path.relative(here, out)} (${(html.length / 1024 / 1024).toFixed(2)} MB, ${info})`);
  return { out, html, info };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build({ dev: process.argv.includes('--dev') });
