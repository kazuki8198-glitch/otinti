# 操縦（ドライブ）ゲーム（横浜・関内〜東神奈川）

国土交通省 PLATEAU の 3D 都市モデル（建物）と、PLATEAU 道路・OSM・国土地理院の標高から作った道路と地面の上を、車で走るゲーム。three.js r180 と 3d-tiles-renderer を使う。写真のない建物は近くで窓・扉・ベランダ・外構付きの建物に作り直す。道路データは tools/area_a/ の Python で作り、models/area/ のバイナリとして読み込む。

- 元のファイル: `plateau-three.html`（233,120 文字、2,654 行）。書き出した版: 796cb3c（2026-10-06）
- このフォルダのコード: 233,120 文字（約 78k トークン）。省略したデータ: 0 文字

## AI に読ませるとき

- まずこの `00_overview.md` を渡し、続けて部分ファイルを順に渡す（1 つの会話に全部入らないときは、聞きたい所の部分だけでよい。下の表に各部分の行範囲と、行番号つきの見出しがある）。
- ファイル 1 つで渡したいときは `drive-game.slim.html`（データを省いた全体）。ChatGPT のコード実行（Advanced Data Analysis）なら、`llm/otinti-llm.zip` をそのまま渡して中を読ませてもよい。
- 省略した所には `<<省略: …>>` と書いてある。データの中身（地形の標高、空港の一覧など）が要る質問には答えられない。

## 部分ファイル

| ファイル | 元の行 | 大きさ |
|---|---|---|
| `drive-game.part01.txt` | 1〜2,085 | 179,685 文字（約 60k トークン） |
| `drive-game.part02.txt` | 2,086〜2,654 | 53,434 文字（約 18k トークン） |

## 関連ファイル（ゲームの外の、データを作るスクリプトと記録）

| ファイル | 内容 | 大きさ |
|---|---|---|
| `PROGRESS.md` | docs/yokohama-drive/PROGRESS.md | 31,434 文字 |
| `tools_area_a.txt` | tools/area_a/ のスクリプト 22 本 | 133,559 文字 |
| `tools_bld.txt` | tools/bld/ のスクリプト 3 本 | 10,116 文字 |
| `tools_browser.txt` | tools/browser/ のスクリプト 10 本 | 49,078 文字 |

## 省略したデータ

- なし

## コードの見出し（元のファイルの行番号）

- 58: The Kannai test block in three.js, for a PC: PLATEAU's own city (its
- 119: the renderer, and the passes after it
- 163: the sky: Poly Haven's "Kloofendal 48d Partly Cloudy (Pure Sky)". Seen: the 4k photo, its linear radiance
- 191: materials: ambientCG's photographed surfaces (colour, normal, roughness), laid by world position (from above
- 228: the ground between the roads (lots, plazas, the park): a surface through PLATEAU's own road heights, a little
- 346: buildings without a photo (PLATEAU has none for them: much of Nishi ward outside Minato Mirai, two thirds of
- 409: PLATEAU's photo-textured buildings up close: the aerial photo is 3-13 texels a metre (a smear at 10 m), so nea
- 437: the far shader: PLATEAU's walls with the layout painted, the roofs (flat: concrete; houses: slate or kawara)
- 521: the near walls (and their parapets, plinths, bands): the same arrays, their uv in metres, layer and tint per v
- 548: the context (models/area/ctx.bin, from OSM: tools/bld/ctx.py): building outlines with tags, shop / food
- 600: one tile's photo-less buildings: their walls (planes, merged spans), tops, party walls (within the tile)
- 678: a building's type and layout. Evidence first (OSM building tags, levels, shop / food / office points, landuse)
- 837: geometry for the near models: in a wall's frame (u along it, y up, z out of it), uv in metres
- 891: the kit: parts made once per size and shared (instanced): sashes and glass, doors, shop fronts, shutters,
- 1,128: one tile's photo-less mesh made over: houses' walls cut at the eave and their roofs added; each vertex told it
- 1,210: hiding a building's triangles: LOD2 copies of buildings shown at LOD3; the walls of buildings rebuilt near
- 1,242: the near model of one building: its walls rebuilt with openings and depth, plinth, bands, parapet coping, and
- 1,433: photo-textured buildings (LOD2): PLATEAU's photos are aerial, 3-13 texels per metre of wall at their full size
- 1,502: PLATEAU's tiles, turned so the spot is the origin, y up; loaded only round the car
- 1,640: the paint, from how PLATEAU's LOD3 divides the carriageway: lanes (車線), the rest of it (車道部: the strips
- 1,835: trees near the car (within ~70 m): a 3D tree (a tapering trunk, branches, clusters of leaves as crossed cards 
- 1,931: area A: Kannai to Minato Mirai and Yokohama Station. Outside PLATEAU's LOD3 block the roads are made beforehan
- 2,061: street furniture (area A): placed by tools/area_a/build4c.py by rule from OpenStreetMap's roads, crossings, si
- 2,344: the car: the sim's GR Supra, driven on PLATEAU's road surface
- 2,502: the frame, the timing, the measurement
