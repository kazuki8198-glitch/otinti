#!/usr/bin/env python3
"""photosrc.py — finding photos for the textbook and checking their licence on the source page (run with python3 -I).

  python3 -I photosrc.py search "query" [--source wikimedia|flickr|nasa|...] [-n 10]   # Openverse search (licence, title, page, creator)
  python3 -I photosrc.py check URL      # a Wikimedia Commons file page (or ?curid=): title, licences (from the page's licence
                                        # templates), author, source, original file URL, size — as JSON
  python3 -I photosrc.py get URL DIR [--width 1280]   # downloads the file (a ≤ width px rendition; Commons serves standard thumbnail widths such as 960 and 1280) into DIR (a new, empty folder
                                        # outside the repository); prints the path
Downloaded files are data only: convert them with photo.py.
"""
import argparse, html, json, os, re, subprocess, sys, urllib.parse
UA = 'FlightLabTextbook/1.0 (https://github.com/kazuki8198-glitch/otinti; educational textbook)'


def curl(url, out=None):
    args = ['curl', '-sS', '-L', '--max-time', '60', '-A', UA]
    if out:
        args += ['-o', out]
    r = subprocess.run(args + [url], capture_output=True)
    if r.returncode:
        raise SystemExit(r.stderr.decode()[:300])
    return r.stdout


def text(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()


def check(url):
    page = curl(url).decode('utf-8', 'replace')
    title = text((re.search(r'<title>(.*?)</title>', page, re.S) or [None, ''])[1]).replace(' - Wikimedia Commons', '')
    U = r'(?:_|&#95;)'
    shorts = [text(x) for x in re.findall(r'class="licensetpl' + U + r'short"[^>]*>(.*?)</span>', page, re.S)]
    links = [text(x) for x in re.findall(r'class="licensetpl' + U + r'link"[^>]*>(.*?)</span>', page, re.S)]
    row = lambda key: text((re.search(r'id="fileinfotpl' + U + key + r'"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', page, re.S) or [None, ''])[1])
    orig = re.search(r'href="(https://upload\.wikimedia\.org/wikipedia/commons/[0-9a-f]/[0-9a-f]{2}/[^"?]+)', page)
    # the original's size (the first 'N × N pixels' on the page is the preview's)
    size = re.search(r'Original file.*?\((\d[\d,]*) × (\d[\d,]*) pixels', page, re.S) or re.search(r'(\d[\d,]*) × (\d[\d,]*) pixels', page)
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', page)
    pd = sorted(set(re.findall(r'(PD-USGov[-A-Za-z]*|PD-NASA|PD-self|CC-zero|Public domain)', page)))[:8]
    return {'title': title, 'page': canon.group(1) if canon else url, 'licenses': shorts, 'licenseLinks': links, 'pdTemplates': pd,
            'author': row('aut')[:200], 'source': row('src')[:200], 'date': row('dat')[:60], 'description': row('desc')[:300],
            'file': orig.group(1) if orig else None, 'size': (size.group(1) + 'x' + size.group(2)).replace(',', '') if size else None}


def get(url, out, width):
    i = check(url)
    if not i['file']:
        raise SystemExit('no file URL found')
    os.makedirs(out, exist_ok=True)
    f = i['file']
    name = re.sub(r'[^A-Za-z0-9._-]+', '_', urllib.parse.unquote(f.rsplit('/', 1)[1]))
    w = int(i['size'].split('x')[0].replace(',', '')) if i['size'] else 0
    if w > width and not name.lower().endswith(('.svg', '.tif', '.tiff')):
        a, b = f.split('/wikipedia/commons/', 1)
        f = f'{a}/wikipedia/commons/thumb/{b}/{width}px-{b.rsplit("/", 1)[1]}'
    path = os.path.join(out, name)
    curl(f, path)
    print(path)
    print(json.dumps(i, ensure_ascii=False))


def search(q, source, n):
    p = {'q': q, 'page_size': n}
    if source:
        p['source'] = source
    d = json.loads(curl('https://api.openverse.org/v1/images/?' + urllib.parse.urlencode(p)))
    for r in d.get('results', []):
        print(f"{r['license']} {r.get('license_version') or ''}\t{r.get('width')}x{r.get('height')}\t{r['title'][:70]}\t{r['foreign_landing_url']}\t{r.get('creator')}")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['search', 'check', 'get'])
    ap.add_argument('arg')
    ap.add_argument('dir', nargs='?')
    ap.add_argument('--source')
    ap.add_argument('-n', type=int, default=10)
    ap.add_argument('--width', type=int, default=1280)
    o = ap.parse_args()
    if o.cmd == 'search':
        search(o.arg, o.source, o.n)
    elif o.cmd == 'check':
        print(json.dumps(check(o.arg), ensure_ascii=False, indent=1))
    else:
        get(o.arg, o.dir, o.width)
