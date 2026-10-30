// CADET — flight/cb.js : the day's one cumulonimbus (B3.3). On a pmStorm day a single CB cell stands
// 10–20 km out, seeded by the career's seed and the day: west of the field, clear of the pattern (2 km),
// the practice area (north), the cross-country route (north-east) and the final's line. It is a thing to
// stay away from, not a wall on a route: inside its volume the air moves — strong turbulence and a
// downdraft core — and the effect the flight model feels is computed here, purely.
// Offsets are metres north/east of the runway's centre.
export const CB_RADIUS = 2600;          // the volume's horizontal reach
export const CB_TOP_M = 3400;           // and its top (the cell towers far above; the dangerous air is this)

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// cbFor(seed, day) → { dn, de, dist } (the cell's centre, north/east of the field's centre)
export function cbFor(seed, day) {
  const r = rng((seed * 104729 + day * 31 + 7) >>> 0);
  const dist = 12000 + r() * 5000;                       // 12–17 km out
  const brg = (250 + r() * 40) * Math.PI / 180;          // west-southwest to west-northwest
  return { dn: Math.cos(brg) * dist, de: Math.sin(brg) * dist, dist };
}

// the cell's strength at a place: 0 outside, 1 at the core. dn/de: the aircraft's offset from the field
// centre; altM: its height above the ground.
export function cbEffect(cb, dn, de, altM) {
  if (!cb || altM > CB_TOP_M) return 0;
  const d = Math.hypot(dn - cb.dn, de - cb.de);
  if (d >= CB_RADIUS) return 0;
  const k = 1 - d / CB_RADIUS;
  return k * k * (3 - 2 * k);                            // smoothstepped: no edge to hit
}
