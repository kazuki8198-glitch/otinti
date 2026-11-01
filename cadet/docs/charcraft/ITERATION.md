# CADET character craft — iteration log

The method change's core: build → look → judge (face impression, hair flow, silhouette — not just
defects) → fix. Previews are Blender renders of the model (geometry and vertex colours only: the drawn
face and the cel shading exist only in the game, judged in the in-game shots further below).
Rounds 0–2 work the hair; the face drawing is judged from round 3 on, in game.

## Round 0 — the first build of the new method (far LOD previews, `~/workspace/craft-previews/round0-far/`)

Seen:
- **朝日 front (`f-long-front.png`)**: the framing side locks are two black PILLARS — 30 mm wide,
  11 mm deep, hanging dead straight with the taper only in the last stretch: curtains, not locks. The
  fringe is a row of separate NEEDLES: thin spikes with skin gaps, the centre ones long. The M-fringe
  the sheet designed does not read at all.
- **朝日 back (`f-long-back.png`)**: the hanging back locks are sparse spikes with widening gaps (the
  taper starves the tips); the shell behind them reads as a smooth HELMET; a lock tip floats as a black
  diamond by the neck (a side lock passing behind the neck, seen end-on).
- **早瀬 3/4 (`h-34.png`) / front (`h-front.png`)**: the short fringe is a row of FANGS — wide-rooted,
  deep (13 mm) wedges reaching the brows, separated by skin. The swept top locks stand PROUD of the
  shell like a crown of blocks; their roots show.
- The baked face itself (the crowd's) reads well: eyes, lids, brows, the small nose — the geometry face
  is a good base for the drawing to take over at near range.

Diagnosis: the loft cross-section is too deep (a wedge, not a ribbon), the width profile tapers too
late and too far (needles), fringe sweep separates the locks, and the hanging layers are too narrow and
too far apart to cover at their tips.

Fixes for round 1:
- Locks become RIBBONS: depth 0.013 → 0.007–0.009 everywhere; width profile holds to ~60 % of the
  length and ends at 0.20–0.22 (not 0.12–0.16).
- Fringe: wider (0.032), tighter (more locks), sweep roughly halved, lengths trimmed ~3 mm (short
  styles ~6 mm).
- Hanging layers: wider (0.032–0.036), the longest back layer +1 lock, bows reduced so the locks lie
  on the mass beneath instead of stringing in the air.
- Top swept/parted locks hug the shell (offsets ≤0.002, depth 0.007) and start further back.

## Round 1 — ribbons, not wedges (far previews, `~/workspace/craft-previews/round1/`)

Applied the round-0 fixes (depth 0.013 → 0.007–0.009 via `flat`, taper ends 0.22, fringe trimmed and
tightened, hanging layers widened, top locks hugging).

Seen: 早瀬's fringe now reads as locks, not fangs — the row has weight and the tips sit mid-forehead.
朝日's pillars are narrower but still read as two flat WALLS: most of that wall is the long SHELL
behind the locks, falling straight beside the face, its far silhouette stepped. Her fringe centre
spike is still the longest thing on her forehead (the length profile peaks at the centre — wrong for
a centre parting).

Fixes for round 2: parted fringes (long / centre / bob) invert the length profile — shortest at the
parting, longest toward the temples; 朝日's front framing lock falls 20 mm longer and bows forward of
the shoulder line so the side row is not one plane. (Plus a budget fix: her far was 8,092 — the
longest back layer and the parted top thin harder at far, and hanging sides thin to every other lock;
far came back to 7,890.)

## Round 2 — the near build, judged at near (`~/workspace/craft-previews/round2/`)

Seen: the parting now reads on 朝日 (centre short, temples long) and the fringe has varied, designed
lengths. But in the three-quarter view her framing locks are PIPES — round-sectioned tubes hanging
straight, slightly off the cheek, with the ear exposed behind them and a zigzag shell hairline. The
fringe locks are still separate icicles: each narrows over its last half, so the row is teeth with
skin between.

Fixes for round 3: flatter sections for everything that hangs (flat 0.36 → 0.27) with widths up ~10 %
to keep coverage; fringes get DENSER (朝日 9 → 12, 早瀬 12 → 13, most styles +1) so the locks overlap
into a mass whose tips articulate, and the fringe taper starts later and ends softer (0.68 → 0.30).

## Round 3 — density and flatness (near previews, `~/workspace/craft-previews/round3/`)

Seen: 朝日's fringe is now a MASS with articulated tips — the first time it reads as a designed
fringe. The side grooves separate. But her framing locks in three-quarter are still smooth PIPES
(round sections, evenly spaced, one length, floating at the head's width beside the jaw), and the
ear stands exposed behind them against a scalloped shell hairline.

Fixes for round 4: the framing row is composed — five locks stepping shorter toward the ear
(y ≈ 1.35 → 1.45), drawn inward to the jaw (inward 0.14), the front one bowed forward; hanging
sections flatter (0.20 / 0.22).

## Round 4 — composed framing locks (near previews, `~/workspace/craft-previews/round4/`)

Seen: the composition works — the front lock falls before the cheek, the row steps back, the back
layers overlap like shingles at the top. What does NOT yield: the lofted locks still shade as smooth
tubes/blades (an ellipse section under smooth shading has no ridge line, however flat it gets), and
from directly behind, the back locks separate over the neck with skin between their tips. Both are
judged again in the game (cel shading gives the locks their groove stripes and a harder light); the
tube read is recorded as a known limit of the loft method in the final report.

## Round 5 — first in-game check (`~/workspace/craft-previews/round5-game/`, `round6-closeup/`)

Seated 朝日 in the class (own meshes, drawn face active): the drawing lands — brows, lash lines,
nose and mouth in place, the geometry mouth/brows hidden, no doubles. 教官 outdoors reads clean at
close range, and the hair under the game's cel shading reads better than in the Blender previews
(the rim light separates the locks). But the cadets' close-ups also show something wrong, next round.

## Round 6 — the ghost lines (a real defect, chased)

Close-ups of the seated cadets show dark cups under the eyes and straight lines across the nose and
mouth heights — every seated face, absent on 教官 and the standing lecturer. First suspect was the
SDF field (it was derived from the skin's full relief), which was rebuilt from smooth analytic
shapes only; the pattern persisted unchanged, which cleared the SDF. The crowd was cleared next
(hiding every SkinnedMesh changed nothing). Before/after on the same staging: the base build
(3156b66) shows none of it, so it is this pass's drawing, not geometry.

## Round 7 — root cause: the glTF V flip

Reading the built model's UVs directly: at the lash line the skin's v is 0.432 where the design
says 0.570, and parked vertices read (−1, 2) where the script wrote (−1, −1) — the Blender glTF
exporter stores v as 1 − v, so the whole drawn face landed mirrored about the face box's centre:
the "cups" were the lash bands (mirrored, they cup), the "lines" the brows and the nose mark.
`set_uv_face` now writes the pre-flipped value, and its gate is widened (z > −0.005, normal z >
0.02) so nearly the whole front of the head carries the planar UV — a parked vertex beside a
mapped one smears the drawing across their shared triangle. Verified in the data (lash v 0.568,
mouth 0.285, forehead 0.791) and in the game.

## Round 8 — the face, verified (`~/workspace/craft-previews/round8-faces/`, `round8-before/`)

朝日, 桐生, the lecturer and 教官 all render clean, AM and PM: lash lines on the eyes, brows under
the fringe, the small nose, the drawn mouth; 教官's PM pair shows the SDF doing its quiet work —
a soft turn of shade across the cheek and the fringe band under the hair, no banding anywhere. Its
strength at the game's sun elevations is modest; that is recorded plainly in the final report.
Before/after pairs against the base build (same staging, `round8-before/`) show what the method
changed: the geometry face (baked brows, geometry mouth) gives way to the drawn one, and the hair
goes from the formula shell-and-grooves to composed locks.

# The polish pass (the user's choice after round 8: keep polishing, judged on in-game shots)

## Round 9 — the face's weight (staging: `test/craft-polish.mjs`)

What was seen (round 8 shots, re-read): the drawn face is correct but underweight — at 1–2 m the
brows vanish under the fringe, the blush never arrives, the skin reads white and flat; 教官's PM
cheek shade is barely there. Changed in the runtime drawing only (no model rebuild): warm form
washes laid under everything (mid-face bloom, temple shades, under-jaw), the lash line widened
(0.0021→0.0026) with a shadow band above it, the under-eye line and the crease strengthened, the
eyeshadow wash up, the brows darkened (mix toward black 0.15→0.32) and thickened, the nose's
under-shade and tip line enlarged with nostril-wing shades added, the blush up ×1.35 and widened,
the mouth's line darker and thicker. Result (round 10/11 shots): the brows now read at 0.7 m and
survive at 1.5 m; the eyes carry their definition; the mouth's line is present at conversational
distance. The blush and the warm washes stay subtle — present as warmth, not as makeup; that
boundary was judged on the shots and held.

Staging lessons, paid for in three scrapped baselines: a head must be found by its OWNER (cast
roots are named `npc-<id>`), never by nearness — a neighbour sitting down between aims silently
becomes the subject; the camera direction must come from the actor ROOT's facing, never the head
bone's (the head turns with the gaze); and 朝日's 1.5 m frontal cannot be taken in the class at
all — the peers sit in a column 1.2 m apart facing the lecturer, so that camera lands 0.31 m
behind 桐生's head, dead on the axis (measured by a frame-contents probe). Her conversational
frontal is staged in the dorm common room, and every shot now logs a blockage probe.

## Round 10 — the lock section's axes were swapped

What was seen (round 9 baseline): 教官's crown stands as separate black blades; 朝日's fringe is a
row of hanging tags with skin between them; her side locks are flat boards; the fringe buries the
brow line the face drawing just strengthened. Root cause, found in `lock_curve`: the section's
axes were swapped — `sd`, the transported surface NORMAL, carried the lock's full width, while
`nr`, which lies in the tangent plane, carried only the flattened thickness. A lock rooted on the
forehead or crown therefore stood with its width along the normal and presented its thin edge to
the world. Changed: the width now runs along `nr` (across the surface, the way a ribbon of hair
lies) and the thickness along `sd`; the lens plumpness raised everywhere (fringe/top 0.38, sides
0.32, back 0.36, nape 0.40); the fringes trimmed so they end above the drawn brow line; nape locks
added or filled on short/long/centre/tail (near only, so the far budget is untouched). Result
(round 10/11 shots): the crown spikes are gone — 教官's top reads as a swept mass; 朝日's brows
show under a fringe that ends where it should. What remained: her fringe hem still separated into
thin points, her sides still read as slabs from dead front, and her back was a row of pencils over
the shell — the taper and the widths, not the axes.

## Round 11 — mass to the hems, and the SDF let off its leash

The arithmetic of the pencils: 朝日's back layers were 18 mm wide at ~25 mm spacing and tapered to
0.22, so the hem was arithmetically guaranteed to gap. Changed: hanging locks (sides and back)
taper (0.70, 0.40) — the mass holds to 70 % of the length and ends at 40 % of the root width; the
default taper rises to (0.62, 0.30) and the fringe's to (0.72, 0.38); her back layers widen
(18→27 mm, 17→25 mm), her side locks widen (17→20 mm), thicken (flat 0.32→0.50) and keep the
head's width (inward 0.14→0.06); the bob gets the same widths. The SDF: the azimuth field's 0.85
contrast softening removed, the terminator narrowed (±0.06→±0.035), the shadow tints deepened
(direct (0.74, 0.64, 0.68), indirect (0.84, 0.78, 0.80)). Result (round 11/12 shots): her back is
a mass of thick clumps with layered, pointed hems and the nape covered; the fringe reads as
designed points. The sides still read somewhat slab-like from dead front — the mass is one cel
tone with the groove articulation below this light's threshold; recorded as a remaining limit,
not chased further here.

教官's staging needed its own fix: in his preflight circuit his root's facing is not his face's
(the circuit stands him with his back to where the walk system's +z points, and his head scans
±50°). The staging now verifies the face itself: if the head's own forward does not meet the
camera (dot < 0.25), the frontal is framed from the other side. His AM and PM sets in round 12
are all true frontals for the first time.

## Round 12 — the acceptance set (`~/workspace/craft-previews/round12/`)

(a) 1.5 m frontals: 朝日 (dorm) and 教官 (apron PM) — brows, eyes, nose and mouth all read. ✓
(b) 教官's crown, front and three-quarter: a swept mass with strand grooves, no spikes. ✓
(c) 朝日's fringe reads as designed points over visible brows; her back shows layered clump flow
    and a covered nape; the sides show their flow from the three-quarter, less from dead front. ✓
(d) PM side light: measured on the pixels — the cheek luminance asymmetry is 0.9 % in the AM
    frontal, 0.0 % in the PM frontal (front-lit), and 8.5–10.6 % in the PM three-quarters
    (az ±50 and the 34° view), the shaded cheek following the light. A soft, shaped terminator —
    the map is smooth analytic shapes by design, so the edge is a designed gradient, not a
    stencil line, and there is no banding. ✓
Spot checks: 桐生 (centre parting, drawn face reads, fringe points behave) and 森 (mop fringe over
the glasses, no spikes) both clean. Budgets hold: far worst composite ≤ 8,000 (crowd test), near
≤ 80,000 (actor test), CADET.html within the 15 MiB cap; test:fast green (tally in the report).
