# the tiles area A needs for a box (degrees): GSI DEM 5A (z15 png) into dem/, PLATEAU 2024 Yokohama roads (tran LOD1 MVT z16)
# into mvt/; tiles already there are kept. Usage: python3 fetch_tiles.py S W N E
import sys, os, math, urllib.request, time
S, W, N, E = map(float, sys.argv[1:5])
DEM = 'https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'
MVT = 'https://assets.cms.plateau.reearth.io/assets/69/36a0fb-7483-4086-9e0e-ef5fa3c3672c/14100_yokohama-shi_city_2024_citygml_2_op_tran_mvt_lod1/{z}/{x}/{y}.mvt'
def tile(lat, lon, z): n = 2 ** z; return int((lon + 180) / 360 * n), int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
for z, url, d, ext in ((15, DEM, 'dem', 'png'), (16, MVT, 'mvt', 'mvt')):
    os.makedirs(d, exist_ok=True); x0, y0 = tile(N, W, z); x1, y1 = tile(S, E, z); got = miss = 0
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            f = f'{d}/{z}_{x}_{y}.{ext}'
            if os.path.exists(f): continue
            for k in range(4):
                try: b = urllib.request.urlopen(urllib.request.Request(url.format(z=z, x=x, y=y), headers={'User-Agent': 'otinti-yokohama-drive/1.0'}), timeout=60).read(); open(f, 'wb').write(b); got += 1; break
                except urllib.error.HTTPError as e:
                    if e.code == 404: open(f, 'wb').write(b''); miss += 1; break
                    time.sleep(2 * (k + 1))
                except Exception: time.sleep(2 * (k + 1))
    print(d, 'z', z, 'x', x0, x1, 'y', y0, y1, 'new', got, 'missing (404)', miss)
