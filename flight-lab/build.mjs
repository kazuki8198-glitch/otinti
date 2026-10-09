// FLIGHT LAB — build.mjs
// Inlines everything into ONE HTML file that opens with a double click (file://), offline:
// the CSS, every script (as inline <script> blocks, no src), the Draco decoder (JS wrapper as a string, the
// WebAssembly as base64) and its licence. Output: outputs/FLIGHT-LAB.html
//   node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'src'), OUT = path.join(here, 'outputs'), VENDOR = path.join(here, 'vendor', 'draco');
const MODULES = ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js', 'quiz.js', 'radio.js', 'acmesh.js', 'scene.js', 'google3d.js', 'pages.js', 'app.js'];

const read = f => fs.readFileSync(f, 'utf8');
// inline scripts must not contain "</script" (it would end the element)
const safeJs = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

export function build({ quiet = false } = {}) {
  let html = read(path.join(SRC, 'index.html'));
  const css = read(path.join(SRC, 'style.css'));
  html = html.replace(/<!--BUILD:CSS-->[\s\S]*?<!--\/BUILD:CSS-->/, () => `<style>\n${css}</style>`);
  let rev = 'dev';
  try { rev = execSync('git rev-parse --short HEAD', { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { /* not a git checkout */ }
  const info = `build ${new Date().toISOString().slice(0, 10)} · ${rev}`;
  const wrapper = read(path.join(VENDOR, 'draco_wasm_wrapper.js'));
  const wasm = fs.readFileSync(path.join(VENDOR, 'draco_decoder.wasm')).toString('base64');
  const lic = read(path.join(VENDOR, 'LICENSE-draco.txt'));
  const head = `(function (FL) { FL.BUILD_INFO = ${JSON.stringify(info)}; FL.DRACO_SRC = ${JSON.stringify(wrapper)}; FL.DRACO_WASM_B64 = ${JSON.stringify(wasm)}; FL.DRACO_LICENSE = ${JSON.stringify(lic)}; })(globalThis.FL = globalThis.FL || {});`;
  const scripts = [`<script>\n${safeJs(head)}\n</script>`, ...MODULES.map(m => `<script>\n/* ---- ${m} ---- */\n${safeJs(read(path.join(SRC, m)))}\n</script>`)].join('\n');
  html = html.replace(/<!--BUILD:JS-->[\s\S]*?<!--\/BUILD:JS-->/, () => scripts);
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, 'FLIGHT-LAB.html');
  fs.writeFileSync(out, html);
  if (!quiet) console.log(`wrote ${path.relative(here, out)} (${(html.length / 1024).toFixed(0)} KB, ${info})`);
  return { out, html, info };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
