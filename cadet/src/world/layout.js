// CADET — world/layout.js
// The airfield's layout in FLIGHT LAB's own numbers, with no three.js (Node tests import this file):
//  - the drawn origin: the threshold of LAB RWY 36. FLIGHT LAB's world puts the runway 40 km west of its origin
//    (LAB_RWY.e = −40,000 m); 32-bit floats there only resolve a few millimetres, which shows as shaking when the
//    camera is close (walking). Drawing is done around the airfield instead.
//    local x = e − E0 (east), y = metres above sea level, z = −(n − N0) (south) — the same axes as the physics.
//  - the runway frame: `along` from the threshold of 36 towards 18, `cross` to the right of 36 (the east side).
//  - the paved surfaces from FL.physics.PAVED, cut into a grid of cells so that the drawn pavement and the grass never
//    overlap (no z-fighting) and match the physics exactly (FL.physics.pavedAt decides what the wheels roll on).
//  - the lakes' outlines from the same formula as FL.physics.inLake.
const DEG = Math.PI / 180;

export function makeLayout(P) {
  const R = P.LAB_RWY, G = P.GROUND_M, H = R.trueHdg * DEG;
  const N0 = R.n, E0 = R.e;
  const toLocal = (n, e, y = G) => [e - E0, y, -(n - N0)];
  const fromLocal = (x, z) => ({ n: N0 - z, e: E0 + x });
  const physToLocal = p => [p[0] - E0, p[1], p[2] + N0];          // physics GL (x = e, z = −n) → drawn
  const localToPhys = p => [p[0] + E0, p[1], p[2] - N0];
  const rwyToLocal = (along, cross, up = 0) => { const [n, e] = P.rwyToNE(R, along, cross); return toLocal(n, e, G + up); };
  const localToRwy = (x, z) => { const { n, e } = fromLocal(x, z); return P.rwyCoords(R, n, e); };
  // in the runway frame drawn as a three.js group: rotation.y = −heading puts −z along the runway and +x across
  const frameYaw = -H;

  // ---------------------------------------------------------------- the paved grid
  // FLIGHT LAB's pavement (rwy / twy / apron: what the wheels roll on) and the game's own ground surfaces around the
  // buildings (walk: concrete walkways and building pads, lot: the car park and its road). The game's surfaces never
  // overlap FLIGHT LAB's (a test checks it), so the physics is unchanged.
  const PAVED = P.PAVED;
  const SITE = [
    [460, 740, 230, 245, 'walk'],      // the walkway along the apron's east edge
    [465, 735, 245, 284, 'walk'],      // the building pads (hangars, the academy, the tower)
    [560, 725, 284, 290, 'walk'],      // between the academy and the car park
    [560, 725, 290, 342, 'lot'],       // the car park
    [636, 648, 342, 360, 'lot'],       // its road to the edge of the airfield
    [422, 447, 192, 226, 'walk'],      // the fuel farm's pad
  ];
  const AREAS = [...PAVED, ...SITE];
  const MARGIN = { a0: -260, a1: R.len + 260, c0: -170, c1: 360 };    // the airfield's grass around the pavement
  const as = [...new Set([MARGIN.a0, MARGIN.a1, ...AREAS.flatMap(p => [p[0], p[1]])])].sort((x, y) => x - y);
  const cs = [...new Set([MARGIN.c0, MARGIN.c1, ...AREAS.flatMap(p => [p[2], p[3]])])].sort((x, y) => x - y);
  const kindAt = (a, c) => { for (const p of AREAS) if (a >= p[0] && a <= p[1] && c >= p[2] && c <= p[3]) return p[4]; return null; };
  const cells = [];
  for (let i = 0; i < as.length - 1; i++) for (let j = 0; j < cs.length - 1; j++) {
    const a0 = as[i], a1 = as[i + 1], c0 = cs[j], c1 = cs[j + 1];
    cells.push({ a0, a1, c0, c1, kind: kindAt((a0 + a1) / 2, (c0 + c1) / 2) });
  }
  // merge runs of equal kind along `across` to keep the triangle count small
  const merged = [];
  for (let i = 0; i < as.length - 1; i++) {
    let run = null;
    for (let j = 0; j < cs.length - 1; j++) {
      const c = cells[i * (cs.length - 1) + j];
      if (run && run.kind === c.kind) run.c1 = c.c1; else { if (run) merged.push(run); run = { ...c }; }
    }
    merged.push(run);
  }
  const paved = merged.filter(c => c.kind), grass = merged.filter(c => !c.kind);
  const region = { a0: MARGIN.a0, a1: MARGIN.a1, c0: MARGIN.c0, c1: MARGIN.c1 };
  const regionCorners = [[region.a0, region.c0], [region.a1, region.c0], [region.a1, region.c1], [region.a0, region.c1]].map(([a, c]) => rwyToLocal(a, c));
  const cellAt = (a, c) => { for (const m of merged) if (a >= m.a0 && a <= m.a1 && c >= m.c0 && c <= m.c1) return m; return null; };

  // ---------------------------------------------------------------- lakes (the same outline the wheels find)
  const lakeRadius = (L, a) => L[2] * (1 + 0.16 * Math.sin(a * 3 + L[3]) + 0.08 * Math.sin(a * 7 + L[3] * 2));
  const lakes = P.LAKES.map((L, i) => {
    const K = 160, ring = [];
    for (let k = 0; k < K; k++) { const a = k / K * 2 * Math.PI, r = lakeRadius(L, a); ring.push(toLocal(L[0] + r * Math.sin(a), L[1] + r * Math.cos(a))); }
    return { i, n: L[0], e: L[1], r: L[2], seed: L[3], centre: toLocal(L[0], L[1]), ring };
  });

  return { P, R, G, N0, E0, H, frameYaw, toLocal, fromLocal, physToLocal, localToPhys, rwyToLocal, localToRwy,
    SITE, paved, grass, cells: merged, region, regionCorners, cellAt, lakes, lakeRadius };
}

// The academy building in the runway frame (along a, across c; metres): its walls' outer faces, the double-height lobby
// (a lob0–lob1) with its glass front at c = glassC, the wall thickness, the floor slab, the ground floor's window sill
// and head heights, the door height. (No three.js here: the tests read it too.)
export const ACADEMY = { a0: 608, a1: 702, c0: 248, c1: 278, H: 8.2, lob0: 646, lob1: 664, glassC: 249.0, wall: 0.4, slab: 3.8, sill: 1.0, head: 2.7, doorH: 2.15 };

// The fictional names the game uses (kept in one place so they are easy to change).
export const NAMES = {
  airline: { ja: '翔洋航空', en: 'SHOYO AIRWAYS' },
  academy: { ja: '翔洋航空 フライトアカデミー', en: 'SHOYO FLIGHT ACADEMY' },
  field: { ja: 'LAB 飛行場（架空）', en: 'LAB FIELD' },
};
