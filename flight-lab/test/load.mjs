// Loads the app's plain-script modules (src/*.js) into this Node process the way the page does: each attaches
// itself to globalThis.FL. Used by the tests. The names come from the one list (src/modules.mjs): NODE_MODULES is that
// list, in its order, less what these tests leave out (NODE_LEAVE_OUT, each with the reason).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULES, CORE, modulePath, without } from '../src/modules.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(here, '../src');
export function load(...names) {
  for (const n of names) {
    if (!MODULES.includes(n)) throw new Error(`load: ${n} is not in src/modules.mjs`);
    vm.runInThisContext(fs.readFileSync(modulePath(n), 'utf8'), { filename: n });
  }
  return globalThis.FL;
}
export { CORE };
export const NODE_LEAVE_OUT = Object.freeze({
  'book-photos.js': 'the textbook\'s photos (3 MB of base64): the built page has them; the book reads the same without them (bk.photo gives nothing), as CADET reads it',
  'book-photos-k.js': 'the basic course\'s photos the book uses (1.4 MB of base64): the same as book-photos.js (the built page has them, read from FL.kiso.photos: flight.test.mjs)',
  'kiso/kiso-data.js': 'the basic course (the original): read in a context of its own, as the page reads it (window.FL.kiso: flight.test.mjs KZ)',
  'acmesh.js': 'the aircraft\'s 3D description, for scene.js: nothing here uses it',
  'scene.js': 'the 3D view: needs WebGL and the page',
  'google3d.js': 'Google\'s 3D tiles: needs the page (the test "works without Google" checks that it is not loaded)',
  'pages.js': 'the screens: need the page (DOM)',
  'app.js': 'the app\'s start: needs the page (DOM)',
});
export const NODE_MODULES = without(NODE_LEAVE_OUT, 'FLIGHT LAB\'s Node tests (test/load.mjs)');
