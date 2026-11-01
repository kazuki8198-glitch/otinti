# CADET — character craft: the design sheets (方式変更, 2026-10-31)

How the people are made now, and why. Before this pass a person came out of one run of
`tools/actor/build_actor.py`: shape functions plus decimation — a shape that is *on average* right,
with no design in it. The reference games (原神 / アークナイツ エンドフィールド) work the other way
round: a designer fixes the proportions and the silhouette first, the face is *drawn*, and the
modeller places the hair lock by lock. This pass changes the method, not just the numbers:

1. **Design first** — every character has a design sheet (this file + the data tables in
   `src/npc/face-design.js` for the face and the `HAIR DESIGN` table in `tools/actor/build_actor.py`
   for the hair). Numbers are decided here, then built.
2. **The face is drawn** — the head geometry is a smooth base; the face's information (lash lines,
   brows, the nose mark, the mouth, blush) is drawn into a run-time canvas texture
   (`npc/actor.js: faceTextures`), the way the G1000 screens and the label atlas are drawn, so the
   HTML file grows by nothing. The mouth is drawn too — four shapes (closed / open / smile / frown)
   in an atlas, blended by the same state that used to drive the morph targets; the geometry mouth
   and the geometry brows step aside on a person's own meshes (they stay for the crowd's far and
   near ranges, which keep the baked look).
3. **Face shadow by SDF** — a face light map (generated at run time from a stylised normal field of
   the designed face) whose R channel stores, per texel, the light azimuth at which that texel falls
   into shadow; the shader mirrors the UV when the light comes from the other side and compares —
   the standard anime face-shadow method. G stores the fringe-shadow band under the hairline
   (driven by the light's elevation), B the region mask.
4. **Hair lock by lock** — locks are lofted along designed curves (Catmull-Rom through control
   points that first follow the head's surface, then leave it and hang), placed layer by layer from
   the design table — fringe, face-framing sides, back layers, the swept top. The shell stays
   underneath as the under-cap.
5. **Iterate** — build → Blender preview render → look → fix, at least three rounds on the first
   character, logged in `ITERATION.md` here. The proof characters: the instructor 早瀬 (short hair,
   the face the cadet sits 0.6 m from in the cockpit) and 朝日 (fem face, long hair — the hardest).

## The face template (anime proportions; bind space, metres)

The face's drawing space (the head skin's UV): x ∈ [−0.092, 0.092], y ∈ [1.462, 1.762].
Anchors (from `npc/actor.js`, shared with the model): eye centres (±0.0318, 1.622), eye ball
r = 0.0121, mouth line y = 1.548, head centre y = 1.622, half head width at the eyes ≈ 0.074.

| measure | value | note |
|---|---|---|
| eye opening | 26.4 mm × 18.0 mm | half (0.0132, 0.0090); fem: ×0.96 wide, ×1.12 tall |
| eye width / face width at the eye line | 0.18 | one eye-width gap between the eyes (63.6 mm centres) |
| eye height / eye width | 0.68 (fem 0.79) | the tall almond is what reads as "drawn" |
| eye line from the chin | 0.60 | chin ≈ 1.505, hairline ≈ 1.70 |
| brow line | y ≈ 1.6485, x 0.0115…0.0525 | drawn per character (thickness / arch / drop) |
| nose | a mark, not a ridge: ~4 mm at (0, 1.575) | the geometry keeps a small nose (fem ×0.8); the drawing adds the tip line and the SDF gives it its shadow |
| mouth (closed) | half width 0.0204 × character (0.85…1.10) | at y = 1.548, corners following the expression shapes |
| blush | ellipses at (±0.043, 1.583), r ≈ (0.016, 0.009) | strength per character |

## The face sheets (data: `src/npc/face-design.js`)

Fields: `eye` (lash scale against the opening), `tilt` (the lash wing's lift), `lash` (line weight),
`crease` (the double-eyelid line 0…1), `brow { thick, arch, len, drop, tiltIn }`, `nose`, `mouthW`,
`blush`, `wash` (eyeshadow), `fringe` (the SDF fringe band's reach), `sdfNose` (the nose shadow's bite).

| who | face / hair | eye | lash | crease | brow | nose | mouthW | blush | wash | character note |
|---|---|---|---|---|---|---|---|---|---|---|
| 早瀬 教官 HAYASE | base / short | 1.00 | 0.9 | 0.25 | thick 1.10, arch 0.30, drop −0.001 | 0.9 | 1.00 | 0.05 | 0.05 | calm and sharp; the cockpit proof |
| 真壁 MAKABE | base / neat | 0.95 | 0.85 | 0.15 | thick 1.30, arch 0.15 | 1.0 | 0.95 | 0.00 | 0.00 | stern, straight brows |
| ミラー MILLER | fem / bun | 1.02 | 1.10 | 0.60 | thick 0.80, arch 0.55 | 0.85 | 1.00 | 0.18 | 0.14 | soft, made-up |
| 佐伯 SAEKI | fem / bob | 1.03 | 1.05 | 0.55 | thick 0.85, arch 0.50 | 0.85 | 1.00 | 0.22 | 0.10 | bright |
| 大城 OSHIRO | base / crop | 0.97 | 0.80 | 0.20 | thick 1.15, arch 0.20 | 1.05 | 1.05 | 0.02 | 0.00 | sturdy |
| 高嶺 TAKANE | fem / tail | 1.00 | 1.00 | 0.50 | thick 0.90, arch 0.45 | 0.9 | 0.98 | 0.15 | 0.12 | cool |
| 桐生 KIRYU | base / centre | 1.00 | 0.90 | 0.30 | thick 1.00, arch 0.35 | 0.95 | 1.00 | 0.04 | 0.03 | capable, neutral |
| 朝日 ASAHI | fem / long | 1.06 | 1.20 | 0.70 | thick 0.80, arch 0.60 | 0.85 | 1.02 | 0.30 | 0.12 | the fem/long proof: biggest eyes, gentle brows, real blush |
| 森 MORI | base / mop | 0.98 | 0.85 | 0.30 | thick 0.95, arch 0.40, tiltIn +0.0015 | 0.95 | 1.00 | 0.08 | 0.03 | a little worried (inner brow ends up) |
| 黒田 KURODA | base / slick | 0.94 | 0.80 | 0.10 | thick 1.25, arch 0.10 | 1.0 | 0.92 | 0.00 | 0.00 | the examiner: narrow eyes, heavy straight brows |

## The hair sheets (data: the `HAIR DESIGN` table in `tools/actor/build_actor.py`)

A lock is defined by its root on the shell (azimuth / polar angle), the way its curve leaves the
surface, its length, width and layer. Layers: `fringe` (across the forehead), `frame` (the
face-framing sides), `side`, `back` (layers, outer first), `top` (swept back / parted flow),
`nape`. Counts are for near; far takes a subset (every other fringe/back lock) at a coarser section.

| style (who) | fringe | frame/side | back | top | total near | silhouette |
|---|---|---|---|---|---|---|
| short （早瀬） | 13, swept to his left from a parting at az +38° | 3 + 3 to mid-ear | 7 + 6 + 5, two-and-a-half layers | 7 swept | **44** | a side-parted sweep, layered nape |
| long （朝日） | 12, parted (shortest at the parting) | 5 + 5 framing, stepping shorter toward the ear (y ≈ 1.35 → 1.45), drawn in to the jaw | 8 long (y ≈ 1.37) + 6 + 5, + 2 nape | 5 × 2 from a centre parting | **53** | long layered back, face framed |
| neat （真壁） | 5 short at the edge | 2 + 2 | 6 + 5 | 8 swept straight back | 28 | tight, everything back |
| slick （黒田） | — | 2 + 2 | 6 + 5 | 9 swept, flat | 24 | slicked back, no fringe |
| crop （大城） | 8 short | 2 + 2 | 5 + 4 | 6 short | 27 | a close cut, short locks all over |
| centre （桐生） | 11, parted at 0° | 3 + 3 to the jaw | 6 + 5 | — (the parting is the top) | 28 | centre parting, longer sides |
| mop （森） | 12 straight | 3 + 3 | 7 + 6 | — | 31 | a full straight fringe, shaggy back |
| bob （佐伯） | 10, parted | 4 + 4 to the chin | 7 + 6 to y ≈ 1.47 | 4 × 2 parted | 39 | a bob: the sides and back end on one line |
| bun （ミラー） | 8 swept | 2 + 2 wisps | 4 short to the bun | 5 swept | 24 (+ the bun) | swept up, wisps at the ears |
| tail （高嶺） | — | 3 + 3 | 5 to the tie | 8 swept | 19 (+ the tail) | swept back into a low tail |

Constraints kept: far ≤ 8,000 triangles a person (the crowd's budget), near ≤ 80,000; the single
HTML ≤ 15 MiB (the face textures are drawn at run time, so they cost no file size; the near model
grows only by the locks' and the brows mesh's geometry).

## Measured, final build

- Triangles a person: near 22,936 (mechanic) – 30,817 （朝日， the most hair); far all ≤ 7,950,
  and the tests' worst synthetic look (long hair + glasses) 7,979 ≤ 8,000.
- Models: actor-near.glb 2,662,096 B (base 1,610,024), actor.glb 423,732 B. CADET.html
  12,562,664 B ≤ 15 MiB (base 11,047,153). FLIGHT LAB has no people — untouched.
- Face textures cost no file size: face 1024², mouth atlas 1024×512, SDF 176², all drawn at run
  time per look and cached.

## The UV convention (learned the hard way, round 7)

The Blender glTF exporter stores UV v as 1 − v. The head skin's face UVs are therefore written
pre-flipped in `set_uv_face`, so in the game v is (y − y0)/(y1 − y0) over FACE_BOX, exactly as
`npc/face-design.js` and the shader's mouth rectangle assume. The gate is wide (z > −0.005,
normal z > 0.02): a parked vertex beside a mapped one smears the drawing across their triangle.
