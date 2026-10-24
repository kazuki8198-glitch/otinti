// CADET — tools/actor/anchors.mjs : writes the sizes the actor's parts are made to (src/npc/actor.js ANCHORS) as JSON,
// for the Blender script (tools/actor/build_actor.py).   node tools/actor/anchors.mjs > out.json
import { ANCHORS } from '../../src/npc/actor.js';
process.stdout.write(JSON.stringify(ANCHORS, null, 1) + '\n');
