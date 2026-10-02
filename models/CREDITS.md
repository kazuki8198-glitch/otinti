# 3D model credits

All models are from Sketchfab and licensed under CC BY 4.0
(http://creativecommons.org/licenses/by/4.0/). They were reduced for the simulator
(fewer triangles, WebP textures, unused data removed, the A320 cropped to its flight
deck); the simulator also recolours some materials and shows its own live displays on
the cockpit screens.

## Cockpits
- `c172_g1000_cockpit.glb` — "Cessna 172 G1000 Cockpit" by davidpineda021199 — https://sketchfab.com/3d-models/cessna-172-g1000-cockpit-a010952309d1455cab22fea77f947f42
- `cockpits/cessna_skyhawk_cockpit.glb` — "cessna skyhawk Cockpit" by Shady Tex — https://sketchfab.com/3d-models/cessna-skyhawk-cockpit-94737a2ea27c4b97a17b5f3c2d53ef07 (its instrument panel is shown in the analog C172)
- `cockpits/a320_cockpit_2.glb` — "A320 Cockpit 2" by davidmarton1987 — https://sketchfab.com/davidmarton1987
- `cockpits/boeing_737-800_cockpit.glb` — "Boeing 737-800 Cockpit" by hakai315 — https://sketchfab.com/hakai315
- `cockpits/boeing_787_dreamliner_cockpit.glb` — "Boeing 787 Dreamliner Cockpit" by ElijahPD7000 — https://sketchfab.com/Eli-jah.Prince.Davies

## Cars (each also as a lighter `_lo` version for the traffic)
- `cars/toyota_gr_supra.glb` — "Toyota GR Supra" by thelightning — https://sketchfab.com/thelightning
- `cars/nissan_skyline_gtr_r35.glb` — "Nissan Skyline GTR r35" by Black Snow — https://sketchfab.com/BlackSnow02
- `cars/honda_civic_type_r_-98_free_asset.glb` — "Honda Civic Type R -98 (Free Asset)" by tiedtke — https://sketchfab.com/tiedtke
- `cars/mazda_miata_mx-5.glb` — "Mazda Miata mx-5" by Black Snow — https://sketchfab.com/BlackSnow02
- `cars/nissan_s15_drift_free.glb` — "Nissan S15 Drift [FREE]" by autoNgraphic — https://sketchfab.com/autoNgraphic
- `cars/toyota_ae86_black_limited_kouki.glb` — "Toyota AE86 Black Limited Kouki" by Martin Trafas — https://sketchfab.com/Bexxie
- `cars/nissan_skyline_gt-r_c110_kenmeri_73.glb` — "Nissan Skyline GT-R C110 Kenmeri '73" by Martin Trafas — https://sketchfab.com/Bexxie
- `cars/lexus_lc-500.glb` — "Lexus LC-500" by Socksthecat — https://sketchfab.com/Socksthecat

## City materials and trees (`tex/`)
- `tex/cm00.jpg` … `tex/cm21.jpg` — photographed facades, wall tiles, concrete, plaster, siding, asphalt, paving, tactile paving, roofing, grass and night facades from ambientCG (https://ambientcg.com), CC0 1.0. Assets: Facade006, Facade019A, Facade017, Facade018A, Facade020A, Facade001, Facade005, Facade003, Facade015, Tiles040, Concrete048, PaintedPlaster017, WoodSiding013, Asphalt031, PavingStones128, TactilePaving001, RoofingTiles013A, RoofingTiles012A, Concrete031, Grass004, Facade009, Facade007 (reduced to 1024 px).
- `tex/cn00.jpg` … `tex/cn21.jpg` — the same 22 ambientCG assets' normal maps (NormalGL: x, y in red and green) and roughness maps (in blue), packed into one picture each and reduced to 512 px, for the surfaces' relief and gloss; CC0 1.0.
- `tex/trees.webp` — tree cards rendered from Poly Haven's "Island Tree 02" and "Tree Small 02" models (https://polyhaven.com), CC0 1.0.
- `tex/pbr/{asphalt,paving,concrete,soil}_{c,n,r}.jpg` — colour, normal (NormalGL) and roughness maps of ambientCG's Asphalt031, PavingStones128, Concrete048 and Ground037 (https://ambientcg.com), CC0 1.0, reduced to 1024 px; the three.js page's road, pavement, kerb and ground materials.
- `tex/sky_4k.jpg`, `tex/sky_env_1k.hdr` — Poly Haven's "Kloofendal 48d Partly Cloudy (Pure Sky)" HDRI by Greg Zaal (https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), CC0 1.0: the 4k picture as the seen sky (its linear radiance at a quarter, in sRGB), the 1k HDR with the sun's disc clipped as the light from the sky.
- `area/area_a.bin` — roads, paint and trees from Kannai to Minato Mirai and Yokohama Station, made from Project PLATEAU's road areas (CC BY 4.0), the GSI DEM 5A (国土地理院 基盤地図情報 数値標高モデル) and OpenStreetMap (© OpenStreetMap contributors, ODbL 1.0); see `tools/area_a/`.
