// CADET tests: FLIGHT LAB's plain-script modules, read from ../flight-lab/src into this Node process the way the page
// reads them (each attaches itself to globalThis.FL). The names come from FLIGHT LAB's one list
// (flight-lab/src/modules.mjs), so a file added there reaches these tests as it reaches the game:
//  - CORE: the flight model, the G1000-type displays, the Sanford material, the school and the syllabus;
//  - GAME: what the game's page reads (build.mjs FL_MODULES: the list less FL_LEAVE_OUT), in its order;
//  - GAME_REST: GAME less CORE (for a test that loads CORE first and the rest later).
import fs from 'node:fs';
import vm from 'node:vm';
import { MODULES, CORE, modulePath } from '../../../flight-lab/src/modules.mjs';
import { FL_MODULES } from '../../build.mjs';

export { CORE };
export const GAME = FL_MODULES;
export const GAME_REST = Object.freeze(FL_MODULES.filter(m => !CORE.includes(m)));
// load the named modules (lists or names) in the order given; a name that is not in the one list is an error
export function loadFL(...names) {
  for (const m of names.flat()) {
    if (!MODULES.includes(m)) throw new Error(`loadFL: ${m} is not in flight-lab/src/modules.mjs`);
    vm.runInThisContext(fs.readFileSync(modulePath(m), 'utf8'), { filename: m });
  }
  return globalThis.FL;
}
