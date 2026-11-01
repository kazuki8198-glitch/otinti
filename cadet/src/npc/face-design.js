// CADET — npc/face-design.js : the design sheets for the drawn faces (docs/charcraft/DESIGN.md). The head's
// geometry is a smooth base; the face itself is drawn (npc/actor.js's faceTextures) from these numbers —
// per character, keyed by the look's tag, with a default per face variant for anyone without a sheet.
// The template's anchors are actor.js's (the eye centres, the mouth's line, the head's size); the fields:
//   eye     the drawn lash's scale against the model's eye opening (the opening itself is the model's)
//   tilt    the lash line's wing: how far its outer end lifts (a share of the eye's height)
//   lash    the lash line's weight (1: as drawn for 朝日)
//   crease  the double-eyelid line's strength, 0…1
//   brow    { thick (against 3.4 mm), arch (0 straight…1 high), len (against x 0.0115…0.0525), drop (the
//           outer end's height against the inner, m), tiltIn (the inner ends raised, m: a worried brow) }
//   nose    the nose mark's scale (it stays a mark: ~4 mm at 1)
//   mouthW  the mouth's width against the model's (half width 0.0204 m closed)
//   blush   the cheeks' colour, 0…0.35 (an alpha at full strength)
//   wash    the eyeshadow wash over the lids, 0…0.2
//   fringe  the SDF fringe shadow's reach down the forehead (1: to the brows when the light is high)
//   sdfNose the face shadow's bite at the nose (1: as the stylised field gives it)
export const FACE_SHEETS = {
  HAYASE: { eye: 1.00, tilt: 0.10, lash: 0.90, crease: 0.25, brow: { thick: 1.10, arch: 0.30, len: 1.00, drop: -0.0010, tiltIn: 0 }, nose: 0.90, mouthW: 1.00, blush: 0.05, wash: 0.05, fringe: 0.9, sdfNose: 1.0 },
  MAKABE: { eye: 0.95, tilt: 0.02, lash: 0.85, crease: 0.15, brow: { thick: 1.30, arch: 0.15, len: 1.02, drop: -0.0016, tiltIn: 0 }, nose: 1.00, mouthW: 0.95, blush: 0.00, wash: 0.00, fringe: 0.8, sdfNose: 1.1 },
  MILLER: { eye: 1.02, tilt: 0.16, lash: 1.10, crease: 0.60, brow: { thick: 0.80, arch: 0.55, len: 0.98, drop: 0.0008, tiltIn: 0 }, nose: 0.85, mouthW: 1.00, blush: 0.18, wash: 0.14, fringe: 1.0, sdfNose: 0.9 },
  SAEKI: { eye: 1.03, tilt: 0.14, lash: 1.05, crease: 0.55, brow: { thick: 0.85, arch: 0.50, len: 0.98, drop: 0.0006, tiltIn: 0 }, nose: 0.85, mouthW: 1.00, blush: 0.22, wash: 0.10, fringe: 1.0, sdfNose: 0.9 },
  OSHIRO: { eye: 0.97, tilt: 0.04, lash: 0.80, crease: 0.20, brow: { thick: 1.15, arch: 0.20, len: 1.00, drop: -0.0012, tiltIn: 0 }, nose: 1.05, mouthW: 1.05, blush: 0.02, wash: 0.00, fringe: 0.8, sdfNose: 1.05 },
  TAKANE: { eye: 1.00, tilt: 0.12, lash: 1.00, crease: 0.50, brow: { thick: 0.90, arch: 0.45, len: 1.00, drop: 0.0002, tiltIn: 0 }, nose: 0.90, mouthW: 0.98, blush: 0.15, wash: 0.12, fringe: 0.6, sdfNose: 0.95 },
  KIRYU: { eye: 1.00, tilt: 0.08, lash: 0.90, crease: 0.30, brow: { thick: 1.00, arch: 0.35, len: 1.00, drop: -0.0006, tiltIn: 0 }, nose: 0.95, mouthW: 1.00, blush: 0.04, wash: 0.03, fringe: 0.9, sdfNose: 1.0 },
  ASAHI: { eye: 1.06, tilt: 0.18, lash: 1.20, crease: 0.70, brow: { thick: 0.80, arch: 0.60, len: 0.96, drop: 0.0012, tiltIn: 0 }, nose: 0.85, mouthW: 1.02, blush: 0.30, wash: 0.12, fringe: 1.1, sdfNose: 0.85 },
  MORI: { eye: 0.98, tilt: 0.06, lash: 0.85, crease: 0.30, brow: { thick: 0.95, arch: 0.40, len: 0.98, drop: 0.0004, tiltIn: 0.0015 }, nose: 0.95, mouthW: 1.00, blush: 0.08, wash: 0.03, fringe: 1.2, sdfNose: 0.95 },
  KURODA: { eye: 0.94, tilt: 0.00, lash: 0.80, crease: 0.10, brow: { thick: 1.25, arch: 0.10, len: 1.03, drop: -0.0018, tiltIn: 0 }, nose: 1.00, mouthW: 0.92, blush: 0.00, wash: 0.00, fringe: 0.7, sdfNose: 1.1 },
};
// no sheet of their own: the variant's plain design (the crowd's near range keeps the baked face anyway;
// this is for a person met as their own meshes without a tag)
export const FACE_DEFAULTS = {
  base: { eye: 1.00, tilt: 0.08, lash: 0.90, crease: 0.25, brow: { thick: 1.05, arch: 0.30, len: 1.00, drop: -0.0008, tiltIn: 0 }, nose: 0.95, mouthW: 1.00, blush: 0.04, wash: 0.03, fringe: 0.9, sdfNose: 1.0 },
  fem: { eye: 1.03, tilt: 0.15, lash: 1.10, crease: 0.60, brow: { thick: 0.82, arch: 0.55, len: 0.97, drop: 0.0009, tiltIn: 0 }, nose: 0.85, mouthW: 1.00, blush: 0.20, wash: 0.12, fringe: 1.0, sdfNose: 0.9 },
};
// the sheet for a look ({ tag, face }): the character's own, else their variant's default
export function faceDesignFor(look = {}) {
  const d = FACE_SHEETS[look.tag] || FACE_DEFAULTS[look.face === 'fem' ? 'fem' : 'base'];
  return { ...d, brow: { ...d.brow } };
}
// the face's drawing space: the head skin's UVs in the model map this box (metres, bind space) onto 0…1
export const FACE_BOX = { x0: -0.092, x1: 0.092, y0: 1.462, y1: 1.762 };
