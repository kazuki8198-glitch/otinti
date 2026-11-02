// CADET — tools/aircraft/trial-glb.mjs : run the game's code (its tests, tools) against a trial cockpit model instead of
// assets/model/cockpit.glb, without overwriting it — a preload for node (archer-model.js reads CADET_ASSETS first, as the
// built page does):
//   blender -b --factory-startup -P tools/aircraft/build_cockpit.py -- <spec.json> /tmp/trial.glb - band,seats
//   COCKPIT_GLB=/tmp/trial.glb node --import ./tools/aircraft/trial-glb.mjs --test test/cockpit.test.mjs
// (node passes --import on to the test runner's processes). Without COCKPIT_GLB it does nothing.
import fs from 'node:fs';

if (process.env.COCKPIT_GLB) {
  globalThis.CADET_ASSETS = Object.assign(globalThis.CADET_ASSETS || {}, { 'model/cockpit': fs.readFileSync(process.env.COCKPIT_GLB).toString('base64') });
}
