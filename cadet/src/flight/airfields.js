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

// ------------------------------------------------------------------ the line (airline) airfields
// The first-officer phase's route network (docs/first-officer-design.md S3): Haneda as the base and
// the four destinations, placed on the world's compressed map (the route table's distances / block
// times / fuel are the real numbers, kept separately in flight/line.js's ROUTES — these coordinates
// only decide where the strips are drawn and flown to). Same flat shape as the fields above
// ({ id, name, n, e, trueHdg, len, wid, elevFt, controlled, surface }) plus the runway designator.
// These are NOT added to airfields(P) above: the training world's list is unchanged.
export const LINE_AIRFIELDS = [
  { id: 'HND', name: '羽田（東京国際）', n: -120000, e: 60000, rwy: '34', trueHdg: 340, len: 3000, wid: 60, elevFt: 21, controlled: true, surface: 'paved', pattern: null },
  { id: 'KMQ', name: '小松', n: -60000, e: -120000, rwy: '06', trueHdg: 60, len: 2500, wid: 60, elevFt: 36, controlled: true, surface: 'paved', pattern: null },
  { id: 'CTS', name: '新千歳', n: 150000, e: 20000, rwy: '01', trueHdg: 10, len: 3000, wid: 60, elevFt: 70, controlled: true, surface: 'paved', pattern: null },
  { id: 'FUK', name: '福岡', n: -30000, e: -160000, rwy: '16', trueHdg: 160, len: 2800, wid: 60, elevFt: 30, controlled: true, surface: 'paved', pattern: null },
  { id: 'OKA', name: '那覇', n: -190000, e: -190000, rwy: '18', trueHdg: 180, len: 3000, wid: 45, elevFt: 12, controlled: true, surface: 'paved', pattern: null },
];
export const LINE_AIRFIELD_IDS = LINE_AIRFIELDS.map(a => a.id);
// a line airfield by id ('HND' …), or null
export const lineAirfieldById = (id) => LINE_AIRFIELDS.find(a => a.id === id) || null;

// a position in a field's runway frame (the stripFrame of flight/divert.js, generalised to any
// field): along = metres from the field's centre, + in the landing direction (trueHdg);
// cross = metres to the right of the landing direction. pos is { n, e }.
export function stripFrameFor(field, pos) {
  const h = field.trueHdg * Math.PI / 180, dn = pos.n - field.n, de = pos.e - field.e;
  return { along: dn * Math.cos(h) + de * Math.sin(h), cross: -dn * Math.sin(h) + de * Math.cos(h) };
}
// is the position over the field's runway rectangle (with `padM` of slack across, as divert's onStrip)?
export function onRunway(field, pos, padM = 12) {
  const f = stripFrameFor(field, pos);
  return Math.abs(f.along) <= field.len / 2 && Math.abs(f.cross) <= field.wid / 2 + padM;
}

// airfieldById(P, id): the training fields as before, and now the line fields too (a line id is
// found whether or not P knows it). The one-argument form airfieldById(id) searches both lists'
// static halves (the line fields and LABEF; LABRW needs the physics, so it needs the two-arg form).
export function airfieldById(P, id) {
  if (typeof P === 'string' && id == null) { id = P; P = null; }
  const line = lineAirfieldById(id);
  if (line) return line;
  if (P) return airfields(P).find(a => a.id === id) || null;
  return id === STRIP_LABEF.id ? { ...STRIP_LABEF } : null;
}
