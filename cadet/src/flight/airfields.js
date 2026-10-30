// CADET — flight/airfields.js : the airfields of the world, as data (B2.5). LAB itself (from the physics'
// own runway) and the second field: the uncontrolled grass strip at LAB-F (LABEF) — 900 m of mown grass,
// a windsock, a small apron, left traffic. This is the nav data of the place: where it is, which way it
// lies, how its pattern is flown. The radio side of an uncontrolled field (CTAF self-announce) is the
// traffic branch's; the drawing is world/strip.js's; the physics needs nothing — its ground is grass
// everywhere already, and a strip is a place, not a surface change.

// a strip's pattern: left traffic, the downwind parallel at `off` metres, the legs in the strip's frame
// (along: metres from the centre, + in the landing direction; cross: + to the right of it)
export function patternFor(strip) {
  const off = 1100, half = strip.len / 2;
  return {
    altitudeFt: strip.elevFt + 800,
    downwind: { along: [-half - 300, half + 300], cross: -off },          // left traffic: downwind on the left side
    base: { along: -half - 300, cross: -off },
    final: { along: [-half - 2600, -half], cross: 0 },
    upwind: { along: [-half, half + 900], cross: 0 },
  };
}

export const STRIP_LABEF = {
  id: 'LABEF', name: 'LAB-F 草地飛行場（架空）', n: -2000, e: -33000,
  trueHdg: 90, len: 900, wid: 24, elevFt: 55, controlled: false, surface: 'grass',
  pattern: null,   // filled below (patternFor needs the strip itself)
};
STRIP_LABEF.pattern = patternFor(STRIP_LABEF);

// every airfield the avionics of the world can list: LAB (paved, towered) and the strip (grass, CTAF)
export function airfields(P) {
  const R = P.LAB_RWY;
  return [
    { id: 'LABRW', name: 'LAB（架空）', n: R.n, e: R.e, trueHdg: R.trueHdg, len: R.len, wid: R.wid, elevFt: R.elevFt, controlled: true, surface: 'paved' },
    { ...STRIP_LABEF },
  ];
}
export const airfieldById = (P, id) => airfields(P).find(a => a.id === id) || null;
