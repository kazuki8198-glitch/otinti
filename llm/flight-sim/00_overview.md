# フライトシミュレータ（空島フライト）

日本全国（国土地理院の標高）と世界（Terrain Tiles）の地形の上を飛ぶ、ブラウザだけで動くフライトシミュレータ。WebGL2 を直接使う（ライブラリなし）。機体ごとの物理、空港と滑走路、計器、雲、リングコース、教科書と AI の解説を含む。ファイル 1 つ（flight-sim.html）で完結し、データもその中に埋め込まれている。

- 元のファイル: `flight-sim.html`（12,508,911 文字、19,813 行）。書き出した版: 796cb3c（2026-10-06）
- このフォルダのコード: 1,378,748 文字（約 460k トークン）。省略したデータ: 11,141,757 文字

## AI に読ませるとき

- まずこの `00_overview.md` を渡し、続けて部分ファイルを順に渡す（1 つの会話に全部入らないときは、聞きたい所の部分だけでよい。下の表に各部分の行範囲と、行番号つきの見出しがある）。
- ファイル 1 つで渡したいときは `flight-sim.slim.html`（データを省いた全体）。ChatGPT のコード実行（Advanced Data Analysis）なら、`llm/otinti-llm.zip` をそのまま渡して中を読ませてもよい。
- 省略した所には `<<省略: …>>` と書いてある。データの中身（地形の標高、空港の一覧など）が要る質問には答えられない。

## 部分ファイル

| ファイル | 元の行 | 大きさ |
|---|---|---|
| `flight-sim.part01.txt` | 1〜2,757 | 179,938 文字（約 60k トークン） |
| `flight-sim.part02.txt` | 2,758〜5,620 | 179,993 文字（約 60k トークン） |
| `flight-sim.part03.txt` | 5,621〜8,182 | 179,828 文字（約 60k トークン） |
| `flight-sim.part04.txt` | 8,183〜11,032 | 179,998 文字（約 60k トークン） |
| `flight-sim.part05.txt` | 11,033〜13,096 | 179,953 文字（約 60k トークン） |
| `flight-sim.part06.txt` | 13,097〜15,298 | 179,851 文字（約 60k トークン） |
| `flight-sim.part07.txt` | 15,299〜17,782 | 179,968 文字（約 60k トークン） |
| `flight-sim.part08.txt` | 17,783〜19,813 | 119,212 文字（約 40k トークン） |

## 省略したデータ

- base64 のデータ 3,200,436 文字
- base64 のデータ 324,980 文字
- base64 のデータ 369,656 文字
- base64 のデータ 953,152 文字
- base64 のデータ 475,640 文字
- base64 のデータ 937,100 文字
- base64 のデータ 325,912 文字
- base64 のデータ 573,648 文字
- base64 のデータ 2,882,760 文字
- 1,273 行目 `JP_AIRPORTS`: 26,151 文字（先頭 1,200 文字だけ残した）
- 1,274 行目 `JP_PLACES`: 73,266 文字（先頭 1,200 文字だけ残した）
- 1,278 行目 `WORLD_AIRPORTS`: 768,058 文字（先頭 1,200 文字だけ残した）
- 1,279 行目 `WORLD_PLACES`: 159,648 文字（先頭 1,200 文字だけ残した）
- 1,280 行目 `COUNTRY_JA`: 3,726 文字（先頭 1,200 文字だけ残した）
- 3,014 行目 `TRIM`: 8,606 文字（先頭 1,200 文字だけ残した）
- 3,016 行目 `Object.assign`: 4,294 文字（先頭 1,200 文字だけ残した）
- 3,017 行目 `Object.assign`: 8,617 文字（先頭 1,200 文字だけ残した）
- 7,498 行目 `PLATEAU_SETS`: 46,107 文字（先頭 1,200 文字だけ残した）

## コードの見出し（元のファイルの行番号）

- 775: 空島フライト — single-file WebGL2 flight simulator (no libraries)
- 778: small math
- 825: 4x4 matrices (column-major)
- 879: random & noise
- 933: WebGL2 setup
- 1,031: shared shader code: sky, fog, lighting
- 1,085: physically based atmosphere: Rayleigh + Mie single scattering (Earth values, metres)
- 1,230: procedural textures
- 1,270: data: 国土地理院 標高タイル (DEM, z8 mosaic + 7 detailed patches), OurAirports runways, GeoNames place names
- 1,276: data: world elevation (AWS Terrain Tiles / Mapzen terrarium, z3 mosaic), OurAirports, GeoNames
- 1,284: WORLD: heightmap island, airport, vegetation, clouds, rings
- 1,505: GPU resources for terrain
- 1,522: CDLOD terrain
- 1,751: water
- 1,791: sky
- 1,828: generic lit meshes (airport, plane, rings)
- 1,895: instanced props (trees, houses)
- 1,927: camera-facing sprites (clouds, smoke, fire, lights)
- 1,983: mesh building
- 2,071: props: trees & houses
- 2,222: airport
- 2,356: clouds
- 2,380: ring course: a loop around the land, following the terrain
- 2,437: minimap image
- 2,466: AIRCRAFT: data-driven models + flight dynamics
- 2,603: real aircraft (dimensions and performance from the published data)
- 2,807: geometry helpers
- 2,854: airframe
- 2,911: canopy
- 2,922: control surfaces
- 2,953: propellers
- 2,987: landing gear
- 3,010: physics data derived from the description
- 3,021: BLADE-ELEMENT AERODYNAMICS (the approach of X-Plane, and of MSFS's surface model)
- 3,056: tune to the reference derivatives, at cruise speed in still air
- 3,313: roll: bank-angle command
- 3,352: pitch: flight-path-angle command, turns are flown level automatically
- 3,397: engines
- 3,423: moments that are not from the lifting pieces (pilot convention: roll right, pitch up, yaw right)
- 3,449: aerodynamics: the lifting pieces
- 3,476: ground contact (world frame)
- 3,525: integrate
- 3,542: derived state
- 3,561: drawing
- 3,617: JAPAN: one seamless world covering the whole country
- 3,652: embedded data
- 3,803: airports and the active runway
- 3,849: floating origin
- 3,866: terrain tiles
- 3,991: streaming
- 4,072: tile selection
- 4,145: shaders for tiles, water and runways in the Japan world
- 4,329: lights: runway edge/threshold/approach lights and the aircraft's navigation lights
- 4,433: switching worlds
- 4,491: MAP (M key): Web-Mercator map with GSI tiles online, relief offline
- 4,682: BUILT-UP AREAS: places made by hand, all in the sim's own world, the
- 4,734: CITY: real 3D buildings and trees from OpenStreetMap (OpenFreeMap
- 4,744: protobuf / MVT
- 4,874: earcut (after Mapbox earcut, without the z-order hash)
- 5,032: tile build
- 5,063: buildings
- 5,199: roads: ribbons draped on the ground, plus the centre lines for placing and routing cars
- 5,800: the map's points of interest: real shops get their signboards, bus stops, post boxes,
- 5,860: the ground itself, as a driving game's city has it: the built-up blocks paved (concrete and paving
- 5,916: railways: ballasted track with its sleepers and two rails (each track is its own line on the
- 5,980: the airport: aprons in concrete panels, taxiways (pavement, shoulders, the yellow lines and the
- 6,129: trees over woods and parks
- 6,740: shaders
- 7,501: PLATEAU: photo-textured 3D city models (MLIT Project PLATEAU, LOD2)
- 7,784: Google Photorealistic 3D Tiles: node hierarchy, several textures per tile, tile transform
- 8,142: the comparison round the car (the developer panel, p_dev.js)
- 8,648: GOOGLE PHOTOREALISTIC 3D TILES (optional, the player's own API key)
- 9,067: VOLUMETRIC CLOUDS: a cumulus layer ray-marched through its thickness.
- 9,203: 3D JWTREES over the Japan/world terrain. Cells follow the zoom-16 map
- 9,387: STREET FURNITURE: street lamps, concrete utility poles, traffic
- 9,638: OVERHEAD WIRES (電線): the tangle over every Japanese side street. The
- 9,816: ROAD MARKINGS the city worker places: where a side street comes out
- 9,922: THE REAL GROUND round the car: a sharp aerial photo (Esri World
- 10,030: CITY MATERIALS: photographed surfaces (ambientCG, CC0) for the sim's
- 10,109: PHOTO TREES near the ground: each tree two crossed cards cut from
- 10,213: SHOP SIGNS: the real shops of the map (their names from OpenStreetMap)
- 10,374: LM_TOWERS: Tokyo Tower and Tokyo Skytree as the steel lattices they
- 10,649: the great bridges over the sea (the city worker finds them: p6_city.js): their H-shaped towers rising
- 10,702: AT THE GATES: an airliner parked nose-in at each gate the map has on a
- 10,821: PEOPLE on the pavements of the main streets round the camera, walking
- 10,941: SIGHTSEEING FLIGHT: rings placed beside famous landmarks near the
- 10,990: world
- 11,067: FLIGHT SCHOOL: a structured training course from ground school to a
- 11,085: 
- 11,087: 
- 11,198: 
- 11,200: 
- 11,201: 
- 11,207: 
- 11,521: 
- 11,523: 
- 11,801: 
- 11,803: 
- 11,856: 
- 11,858: 
- 11,876: 
- 11,878: 
- 12,058: 
- 12,060: 
- 12,168: 
- 12,170: 
- 12,262: 
- 12,264: 
- 12,432: TEXTBOOK: the ground-school subjects a student pilot studies, written
- 12,439: 
- 12,441: 
- 12,636: 
- 12,638: 
- 12,777: 
- 12,779: 
- 13,026: 
- 13,028: 
- 13,220: 
- 13,222: 
- 13,388: 
- 13,390: 
- 13,536: AI INSTRUCTOR: a question box available while reading the textbook
- 13,598: context
- 13,629: rendering
- 13,654: open / close
- 13,709: ask
- 13,775: AIRCRAFT CUSTOMIZATION: paint, fuel and payload (the aircraft's weight),
- 13,855: AIRCRAFT SYSTEMS (electrical, fuel, engine start) and the 3D VIRTUAL
- 13,899: fuel reaching the engine
- 13,904: electrical
- 13,917: engine
- 13,965: burn
- 14,119: 
- 14,121: 
- 14,242: VIRTUAL COCKPIT: the flight deck is laid out like the real aircraft.
- 14,249: deck: light (analog 6-pack), glassga (G1000 / Perspective), turboprop, airliner, jet
- 14,309: 
- 14,311: 
- 14,312: 
- 14,318: 
- 14,526: 
- 14,528: 
- 14,840: 
- 14,842: 
- 14,868: 
- 14,870: 
- 15,034: 
- 15,036: 
- 15,286: 
- 15,288: 
- 15,335: 
- 15,337: 
- 15,413: 
- 15,415: 
- 15,464: 
- 15,466: 
- 15,532: 3D COCKPIT CONTROLS: the switches, keys, knobs and levers of the 3D
- 15,549: autopilot (the G1000's AP keys / the airliners' mode panel)
- 15,563: radios, the altimeter setting, the map keys
- 15,574: electrics, lights, engine
- 15,587: levers: drag up / down (or scroll)
- 15,594: the rest of the cabin
- 15,692: ENGINE START GUIDE: one step at a time, in the cockpit. Each step
- 15,848: GLB (binary glTF 2.0) models: a small loader for ready-made 3D models
- 16,126: CAR MODELS: smooth bodies built from cross-sections (a lower body and
- 16,131: stations: [position 0 (nose) .. 1 (tail), half width (fraction of W/2), bottom y, top y]
- 16,445: CAR: get out of the aeroplane and drive. The car appears on the
- 16,510: 
- 16,512: 
- 16,599: 
- 16,601: 
- 16,686: 
- 16,688: 
- 16,722: 
- 16,725: 
- 16,871: PARKED CARS along the narrow streets round the car (the left side, as
- 16,916: SUN SHADOWS near the car: a shadow map of the few hundred metres
- 17,105: DEVELOPER PANEL (開発用パネル): where a frame's time goes, and which
- 17,151: the profiler
- 17,253: the environment, for the record
- 17,267: the benchmark
- 17,355: the panel
- 17,438: GAME: environment, camera, input, audio, particles, HUD, modes, loop
- 17,473: toasts
- 17,481: spawning
- 17,553: camera
- 17,617: input
- 17,765: game controller (PS5 DualSense and other "standard" gamepads)
- 17,874: audio
- 17,967: particles
- 18,031: flight events
- 18,137: screens
- 18,222: menu: map & aircraft selection, options
- 18,427: loading a map
- 18,476: rendering
- 18,724: transparent
- 18,842: HUD (glass-cockpit style, drawn with Canvas 2D)
- 18,974: attitude
- 19,011: speed tape
- 19,015: altitude tape
- 19,029: heading tape
- 19,383: tutorial: a guided first flight
- 19,532: Japan world: per-frame work, labels, map screen
- 19,732: main loop
