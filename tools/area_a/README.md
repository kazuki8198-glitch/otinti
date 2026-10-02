# Area A data (models/area/area_a.bin)

Kannai – Minato Mirai – Yokohama Station roads outside PLATEAU's LOD3 block, made from:

- PLATEAU 横浜市 2024 交通（道路）LOD1 (MVT z16) road areas, CC BY 4.0
- GSI 基盤地図 DEM 5A (dem5a_png, z15), heights + 36.28 m (geoid, matched to the LOD3 roads)
- OpenStreetMap (© OpenStreetMap contributors, ODbL): lanes, one-way, crossings, signals, trees

Order: `roads1.py` (merge road polygons) → `roads2.py` (LOD3 roads' footprint, left out) → `roads3.py`
(carriageway / pavements) → `hgt.py` (DEM grid; uses `build.py`'s fill) → `paint3.py` (paint, crossings, trees)
→ `build3.py` (pack). Inputs (tiles, osm_ways.json, osm_nodes.json) are fetched as described in the scripts.

## v2 (ARA2, current): one height for every road, decks, furniture

Inputs as above, plus PLATEAU 橋梁 LOD2 deck points (`brid_pts.py` → `brid_pts.pkl`). After `roads1.py`–`roads3.py` and `hgt.py`:

1. `build4.py` — ways and their profiles (`ways.py`: ground / bridge / tunnel, the expressway graded, nodes shared at one
   height), road areas (PLATEAU's, holes filled from OSM centrelines), carriageway / pavements, surfaces (`roadheight.py`), kerbs
2. `build4b.py` — decks (bridges, viaducts, the expressway, tunnels; parapets, girders, piers), paint projected on the final
   surfaces, crossings, stop lines, trees, the ground; writes `area_a.bin`
3. `build4c.py` — street furniture and wires, added to `area_a.bin` (rerun from step 2)
4. `test_area.py area_a.bin` — regression checks; `route.py <from e,n> <to e,n> out.json [ground cost]` makes a route over the
   ways for `tools/browser/routetest.js` (the page's own ground-finding along it: no snapping to another level)
