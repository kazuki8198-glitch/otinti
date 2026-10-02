# evidence for the buildings' use, from OSM (Overpass, mirrors retried): building outlines with their tags, shop / amenity /
# office / craft points, landuse areas. Usage: python3 fetch_osm_bldg.py S W N E -> osm_bldg.json
import sys, json, time, urllib.request, urllib.parse
S, W, N, E = sys.argv[1:5]; bb = f'({S},{W},{N},{E})'
MIRRORS = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
q = f'[out:json][timeout:600];(way["building"]{bb};relation["building"]{bb};node["shop"]{bb};node["amenity"]{bb};node["office"]{bb};node["craft"]{bb};way["shop"]{bb};way["amenity"]{bb};way["landuse"]{bb};);out body geom;'
for attempt in range(80):
    url = MIRRORS[attempt % len(MIRRORS)]
    try:
        req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'otinti-yokohama-drive/1.0'})
        j = json.loads(urllib.request.urlopen(req, timeout=700).read())
        if 'elements' not in j: raise ValueError('no elements')
        open('osm_bldg.json', 'w').write(json.dumps(j)); print('osm_bldg.json', len(j['elements']), 'from', url, flush=True); break
    except Exception as e:
        print('attempt', attempt, url, str(e)[:120], flush=True); time.sleep(min(90, 15 + attempt * 5))
