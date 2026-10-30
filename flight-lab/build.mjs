// FLIGHT LAB — build.mjs
// Inlines everything into ONE HTML file that opens with a double click (file://), offline:
// the CSS, every script (as inline <script> blocks, no src), the Draco decoder (JS wrapper as a string, the
// WebAssembly as base64) and its licence. Output: outputs/FLIGHT-LAB.html, at most MAX_BYTES (12 MiB): a page over it is
// not written (textbook/rewrite/combined/DESIGN.md 8.2: the combined book's room is measured with each release).
// The scripts are the one list of modules (src/modules.mjs), all of them, in its order. While the page carries the basic
// course's original (kiso/kiso-data.js: FL.kiso.photos), book-photos-k.js goes in without its own copy of the same photos
// (its SRC block emptied: each photo's src is then read from FL.kiso.photos, the same bytes), so no photo is in the page
// twice (textbook/rewrite/combined/DESIGN.md 8.2). Without kiso-data.js in the list, the file goes in whole.
//   node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MODULES, modulePath } from './src/modules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'src'), OUT = path.join(here, 'outputs'), VENDOR = path.join(here, 'vendor', 'draco');
export const MAX_BYTES = 12 * 1024 * 1024;              // 12 MiB (12,582,912 bytes)

const read = f => fs.readFileSync(f, 'utf8');
// a module as the page carries it: book-photos-k.js without its photos' bytes while FL.kiso.photos has them (above)
export const KISO_PHOTOS_FROM_ORIGINAL = MODULES.includes('kiso/kiso-data.js');
const SRC_BLOCK = /\/\*SRC\*\/[\s\S]*?\/\*\/SRC\*\//;
export function moduleText(m) {
  const s = read(modulePath(m));
  if (m !== 'book-photos-k.js' || !KISO_PHOTOS_FROM_ORIGINAL) return s;
  if (!SRC_BLOCK.test(s)) throw new Error('book-photos-k.js: no /*SRC*/ … /*/SRC*/ block to leave out');
  return s.replace(SRC_BLOCK, () => '/*SRC*/{}/*/SRC*/');
}
// inline scripts must not contain "</script" (it would end the element)
const safeJs = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

export function build({ quiet = false, maxBytes = MAX_BYTES } = {}) {
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
  const scripts = [`<script>\n${safeJs(head)}\n</script>`, ...MODULES.map(m => `<script>\n/* ---- ${m} ---- */\n${safeJs(moduleText(m))}\n</script>`)].join('\n');
  html = html.replace(/<!--BUILD:JS-->[\s\S]*?<!--\/BUILD:JS-->/, () => scripts);
  const bytes = Buffer.byteLength(html);
  if (bytes > maxBytes) throw new Error(`outputs/FLIGHT-LAB.html would be ${bytes.toLocaleString('en-US')} bytes (${(bytes / 1048576).toFixed(2)} MiB), over the limit of ${maxBytes.toLocaleString('en-US')} bytes (MAX_BYTES ${(maxBytes / 1048576).toFixed(2)} MiB): not written`);
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, 'FLIGHT-LAB.html');
  fs.writeFileSync(out, html);
  if (!quiet) console.log(`wrote ${path.relative(here, out)} (${bytes.toLocaleString('en-US')} bytes, ${(bytes / 1048576).toFixed(2)} MiB of ${(maxBytes / 1048576).toFixed(0)} MiB, ${info})`);
  return { out, html, info, bytes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
