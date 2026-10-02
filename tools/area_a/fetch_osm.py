# OSM for area A from Overpass (several mirrors, retried): the ways (highway, trees) and the nodes the furniture uses.
# Usage: python3 fetch_osm.py S W N E   (degrees)  -> osm_ways.json, osm_nodes.json
import sys, json, time, urllib.request, urllib.parse
S, W, N, E = sys.argv[1:5]; bb = f'({S},{W},{N},{E})'
MIRRORS = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
Q = {'osm_ways.json': f'[out:json][timeout:300];(way["highway"]{bb};way["natural"="tree_row"]{bb};);out body geom;',
     'osm_nodes.json': f'[out:json][timeout:300];(node["highway"~"crossing|traffic_signals|stop|bus_stop"]{bb};node["crossing"]{bb};node["natural"="tree"]{bb};node["public_transport"="platform"]{bb};);out body;'}
for out, q in Q.items():
    for attempt in range(60):
        url = MIRRORS[attempt % len(MIRRORS)]
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'otinti-yokohama-drive/1.0'})
            b = urllib.request.urlopen(req, timeout=400).read(); j = json.loads(b)
            if 'elements' not in j: raise ValueError('no elements')
            open(out, 'w').write(json.dumps(j)); print(out, len(j['elements']), 'from', url, flush=True); break
        except Exception as e:
            print(out, 'attempt', attempt, url, str(e)[:120], flush=True); time.sleep(min(60, 10 + attempt * 5))
