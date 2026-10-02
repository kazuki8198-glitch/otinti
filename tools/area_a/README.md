# Area A data (models/area/area_a.bin)

Kannai – Minato Mirai – Yokohama Station roads outside PLATEAU's LOD3 block, made from:

- PLATEAU 横浜市 2024 交通（道路）LOD1 (MVT z16) road areas, CC BY 4.0
- GSI 基盤地図 DEM 5A (dem5a_png, z15), heights + 36.28 m (geoid, matched to the LOD3 roads)
- OpenStreetMap (© OpenStreetMap contributors, ODbL): lanes, one-way, crossings, signals, trees

Order: `roads1.py` (merge road polygons) → `roads2.py` (LOD3 roads' footprint, left out) → `roads3.py`
(carriageway / pavements) → `hgt.py` (DEM grid; uses `build.py`'s fill) → `paint3.py` (paint, crossings, trees)
→ `build3.py` (pack). Inputs (tiles, osm_ways.json, osm_nodes.json) are fetched as described in the scripts.
