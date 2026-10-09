// Loads the app's plain-script modules (src/*.js) into this Node process the way the page does: each attaches
// itself to globalThis.FL. Used by the tests.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(here, '../src');
export function load(...names) {
  for (const n of names) vm.runInThisContext(fs.readFileSync(path.join(SRC, n), 'utf8'), { filename: n });
  return globalThis.FL;
}
export const CORE = ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js'];
