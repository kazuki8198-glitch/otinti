// FLIGHT LAB — build.mjs
// Inlines everything into ONE HTML file that opens with a double click (file://), offline:
// the CSS, every script (as inline <script> blocks, no src), the Draco decoder (JS wrapper as a string, the
// WebAssembly as base64) and its licence, and the three.js view (src3d/, bundled by esbuild with three.js and the
// parts of CADET's renderer it reuses, read from ../cadet/src) with the pictures and models it draws (CADET's assets:
// the ambientCG textures as data URLs, the Archer's and the Seminole's models as base64) and three.js's licence.
// Output: outputs/FLIGHT-LAB.html
//   npm ci                  once (three.js and esbuild, pinned to the versions CADET uses)
//   node build.mjs          minified
//   node build.mjs --dev    the 3D view readable, with an inline source map
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'src'), OUT = path.join(here, 'outputs'), VENDOR = path.join(here, 'vendor', 'draco');
const CADET = path.join(here, '..', 'cadet'), CADET_TEX = path.join(CADET, 'assets', 'tex'), CADET_MODEL = path.join(CADET, 'assets', 'model');
// the plain scripts in page order: the flight model, the displays, the school and the books, the aircraft's 3D
// description (CORE, before the 3D bundle: it reads FL.physics / FL.avionics / FL.acmesh when a scene is made), then
// the legacy view, the Google layer, the pages and the app (after it: app.js makes the scene as it starts)
const CORE = ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js', 'quiz.js', 'radio.js', 'ui.js', 'acmesh.js'];
const AFTER = ['scene.js', 'google3d.js', 'pages.js', 'app.js'];
export const MODULES = [...CORE, ...AFTER];
// CADET's assets the 3D view draws: every texture (12 WebP files), the two aircraft's near and far models. Not the
// people's models (FLIGHT LAB has no people in the cockpit or on the apron).
export const MODELS = ['archer', 'archer-far', 'seminole', 'seminole-far'];
export const MAX_BYTES = 12 * 1024 * 1024;
const MIME = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };

const read = f => fs.readFileSync(f, 'utf8');
// inline scripts must not contain "</script" (it would end the element)
const safeJs = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// the credits the About page shows for what the 3D view draws (CADET's assets/CREDITS.md, shortened)
const ASSET_CREDITS = [
  '3D 表示の素材',
  '・地面・舗装・建物のテクスチャ：ambientCG（https://ambientcg.com）の Asphalt031・Concrete048・Concrete031・Grass004・PaintedPlaster017（CC0 1.0）。CADET が WebP に変換したものです。',
  '・Archer と Seminole の外観の模型：CADET（このリポジトリの cadet/）のスクリプトが Blender で作ったもので、ほかの素材は使っていません。塗装（架空の翔洋航空）と登録記号（N7xxSY・N4xxSY）は架空のものです。',
  '・操縦席・空・飛行場・木・建物は、CADET のプログラムが起動時に作っています（ファイルはありません）。',
  'Textures: ambientCG (CC0 1.0). Aircraft models: made in Blender by CADET\'s own scripts, no third-party assets; the livery and the registrations are fictional.',
].join('\n');

// esbuild and three.js come from flight-lab/node_modules (npm ci), at the versions CADET pins: the bundle compiles
// CADET's source as it is checked out, so both must be the ones CADET is written for
function tools() {
  const req = createRequire(import.meta.url);
  let esbuild;
  try { esbuild = req('esbuild'); } catch (e) { throw new Error('esbuild is missing: run npm ci in flight-lab/ (the 3D view is bundled with it)'); }
  let cadetPkg;
  try { cadetPkg = JSON.parse(read(path.join(CADET, 'package.json'))); } catch (e) { throw new Error('../cadet/package.json not found: the 3D view is built from CADET\'s source (cadet/ next to flight-lab/)'); }
  const own = JSON.parse(read(path.join(here, 'package.json'))).devDependencies || {}, want = cadetPkg.devDependencies || {};
  for (const name of ['three', 'esbuild']) {
    if (own[name] !== want[name]) throw new Error(`flight-lab/package.json pins ${name} ${own[name]}, CADET pins ${want[name]}: they must be the same (change flight-lab/package.json, then npm install)`);
    let have = null;
    try { have = JSON.parse(read(path.join(here, 'node_modules', name, 'package.json'))).version; } catch (e) { /* not installed */ }
    if (have !== want[name]) throw new Error(`${name} ${have || '(not installed)'} in flight-lab/node_modules, ${want[name]} wanted: run npm ci in flight-lab/`);
  }
  return { esbuild, threeVersion: want.three };
}

// the 3D view: src3d/view3d.js and what it imports (three.js, CADET's renderer modules), one classic script (iife)
function bundle3d(esbuild, dev) {
  const r = esbuild.buildSync({
    entryPoints: [path.join(here, 'src3d', 'view3d.js')], bundle: true, write: false, format: 'iife', target: ['chrome110'],
    minify: !dev, sourcemap: dev ? 'inline' : false, legalComments: 'inline', charset: 'utf8', logLevel: 'error', metafile: true,
    // 'three' (and 'three/addons/…') resolved from flight-lab/ for every file, those under ../cadet/src included: one copy
    absWorkingDir: here, alias: { three: 'three' },
  });
  // exactly one three.js, flight-lab's own (a second copy would come from cadet/node_modules: two renderers' worth of
  // code, and objects one copy made that the other does not recognise)
  const roots = new Set();
  for (const f of Object.keys(r.metafile.inputs)) { const m = /^(.*node_modules\/three)\//.exec(f.replace(/\\/g, '/')); if (m) roots.add(m[1]); }
  if (roots.size !== 1 || !roots.has('node_modules/three')) throw new Error('three.js must resolve once, from flight-lab/node_modules/three; found: ' + ([...roots].join(', ') || 'none'));
  return { text: r.outputFiles[0].text, threeRoots: [...roots], inputs: Object.keys(r.metafile.inputs).length };
}

function assetsScript() {
  const map = {};
  for (const f of fs.readdirSync(CADET_TEX).sort()) {
    const ext = path.extname(f); if (!MIME[ext]) continue;
    map['tex/' + path.basename(f, ext)] = `data:${MIME[ext]};base64,` + fs.readFileSync(path.join(CADET_TEX, f)).toString('base64');
  }
  for (const m of MODELS) map['model/' + m] = fs.readFileSync(path.join(CADET_MODEL, m + '.glb')).toString('base64');
  return `globalThis.CADET_ASSETS = ${JSON.stringify(map)};`;
}

export function build({ quiet = false, dev = false } = {}) {
  const { esbuild } = tools();
  let html = read(path.join(SRC, 'index.html'));
  const css = read(path.join(SRC, 'style.css'));
  html = html.replace(/<!--BUILD:CSS-->[\s\S]*?<!--\/BUILD:CSS-->/, () => `<style>\n${css}</style>`);
  let rev = 'dev';
  try { rev = execSync('git rev-parse --short HEAD', { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { /* not a git checkout */ }
  const info = `build ${new Date().toISOString().slice(0, 10)} · ${rev}`;
  const wrapper = read(path.join(VENDOR, 'draco_wasm_wrapper.js'));
  const wasm = fs.readFileSync(path.join(VENDOR, 'draco_decoder.wasm')).toString('base64');
  const lic = read(path.join(VENDOR, 'LICENSE-draco.txt'));
  const threeLicense = read(path.join(here, 'node_modules', 'three', 'LICENSE'));
  const view = bundle3d(esbuild, dev);
  const head = `(function (FL) { FL.BUILD_INFO = ${JSON.stringify(info)}; FL.DRACO_SRC = ${JSON.stringify(wrapper)}; FL.DRACO_WASM_B64 = ${JSON.stringify(wasm)}; FL.DRACO_LICENSE = ${JSON.stringify(lic)}; FL.THREE_LICENSE = ${JSON.stringify(threeLicense)}; FL.ASSET_CREDITS = ${JSON.stringify(ASSET_CREDITS)}; })(globalThis.FL = globalThis.FL || {});`;
  const mod = m => `<script>\n/* ---- ${m} ---- */\n${safeJs(read(path.join(SRC, m)))}\n</script>`;
  const scripts = [
    `<script>\n${safeJs(head)}\n</script>`,
    `<script>\n/* ---- CADET's assets (textures: ambientCG, CC0; aircraft models: CADET's, made in Blender) ---- */\n${safeJs(assetsScript())}\n</script>`,
    ...CORE.map(mod),
    `<script>\n/* ---- the three.js view (src3d, bundled with three.js and CADET's renderer; three.js licence at the end of this file) ---- */\n${safeJs(view.text)}\n</script>`,
    ...AFTER.map(mod),
  ].join('\n');
  html = html.replace(/<!--BUILD:JS-->[\s\S]*?<!--\/BUILD:JS-->/, () => scripts);
  html = html.replace('</html>', () => `<!--\nthree.js licence:\n${threeLicense.replace(/--/g, '- -')}\n-->\n</html>`);
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, 'FLIGHT-LAB.html');
  fs.writeFileSync(out, html);
  const bytes = Buffer.byteLength(html);
  if (!quiet) console.log(`wrote ${path.relative(here, out)} (${(bytes / 1024 / 1024).toFixed(2)} MB, 3D view ${(view.text.length / 1024).toFixed(0)} KB${dev ? ' readable' : ''}, ${info})`);
  return { out, html, info, bytes, three: { roots: view.threeRoots }, bundleBytes: Buffer.byteLength(view.text) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build({ dev: process.argv.includes('--dev') });
