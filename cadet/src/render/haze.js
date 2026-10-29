// CADET — render/haze.js : the aerial perspective's density, as a pure function (post.js feeds it to the shader;
// the tests hold it to the weather's promises).
// fog: 0 clear … 1 a visibility of a few hundred metres (the day's weather, M5); grey: the overcast's murk;
// clear: an extra thinning for a special scene (the epilogue's winter morning, 0.3).
// On a clear day the air is thinner than it used to be (base 5.5e-5, a visibility of about 70 km): from training
// altitudes the field pattern 10 km off kept half its contrast against the haze colour, and the ground read as
// washed out. As the fog rises the base blends back to the old 8.5e-5, so a fog day's density is exactly what it
// was (fog 0.85 ≈ a visibility of 800 m, the METAR's 1/2 SM — the go / no-go the cadet decided on stays true).
const CLEAR_BASE = 0.000055, FOG_BASE = 0.000085;
export function hazeDensity(fog = 0, grey = 0, clear = 1) {
  const t = Math.min(1, Math.max(0, fog / 0.35)), s = t * t * (3 - 2 * t);
  const base = CLEAR_BASE + (FOG_BASE - CLEAR_BASE) * s;
  return base * (1 + 80 * fog * fog) * (1 + grey) * clear;
}
