#!/usr/bin/env python3
"""photosrc.py — finding photos for the textbook and checking their licence on the source page (run with python3 -I).

  python3 -I photosrc.py search "query" [--source wikimedia|flickr|nasa|...] [-n 10]   # Openverse search (licence, title, page, creator)
  python3 -I photosrc.py check URL      # a Wikimedia Commons file page (or ?curid=): title, licences (from the page's licence
                                        # templates), author, source, original file URL, size — as JSON
  python3 -I photosrc.py get URL DIR [--width 1280]   # downloads the file (a ≤ width px rendition; Commons serves standard thumbnail widths such as 960 and 1280) into DIR (a new, empty folder
                                        # outside the repository); prints the path
  python3 -I photosrc.py verify [--ids a,b,…] [--out FILE] [--pages PAGES.json]   # every photo of the book (book-photos.js
                                        # and book-photos-k.js): its source page read again (Commons: the API's licence,
                                        # author, size and the page's licence templates; NASA: images-api.nasa.gov), compared
                                        # with the photo's credit and size (a crop shows as a different shape); writes the
                                        # record as JSON (the record DESIGN 5 criterion 17 asks for), one line per photo.
                                        # --pages: the pages' data read already, by another way, when Commons refuses this
                                        # address (HTTP 429): { "<file title>": {width, height, licenseShortName, artist,
                                        # categories, templates?, authorField?}, "nasa:<id>": {width, height, photographer,
                                        # center} } — the same fields the API gives; the comparison is the same
Downloaded files are data only: convert them with photo.py.
Commons limits how often one address may ask (HTTP 429): verify asks for up to 50 files at a time and waits and asks again.
"""
import argparse, datetime, html, json, os, re, subprocess, sys, time, urllib.parse
UA = 'FlightLabTextbook/1.0 (https://github.com/kazuki8198-glitch/otinti; educational textbook)'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
STORES = [os.path.join(ROOT, 'flight-lab', 'src', f) for f in ('book-photos.js', 'book-photos-k.js')]
API = 'https://commons.wikimedia.org/w/api.php'


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


# ---- verify: every photo of the book against its source page ----

def ask_json(url, tries=9):
    # Commons answers 429 (as text) when one address asks too often: wait and ask again (20 s, doubling, up to 5 min)
    wait = 20
    for _ in range(tries):
        out = curl(url)
        try:
            return json.loads(out)
        except json.JSONDecodeError:
            print(f'  (no JSON: {out[:60]!r}; waiting {wait} s)', file=sys.stderr)
            time.sleep(wait)
            wait = min(wait * 2, 300)
    raise SystemExit('no answer from ' + url[:80])


def stores():
    photos = {}
    for f in STORES:
        if not os.path.exists(f):
            continue
        s = open(f, encoding='utf-8').read()
        a, b = s.index('/*PHOTOS*/') + len('/*PHOTOS*/'), s.index('/*/PHOTOS*/')
        for k, v in json.loads(s[a:b]).items():
            photos[k] = dict(v, store=os.path.basename(f))
    return photos


def license_templates(wikitext):
    # the licence templates on the page: {{self|cc-by-sa-4.0}}, {{PD-self}}, {{Cc-zero}}, {{PD-USGov-NASA}}, {{cc-by-2.0}} …
    out = []
    for m in re.finditer(r'\{\{\s*([^{}]+?)\s*\}\}', wikitext or ''):
        body = m.group(1)
        name = body.split('|', 1)[0].strip()
        if re.match(r'(?i)^(self|cc[- ]|cc0|cc-zero|pd[- ]|public ?domain|gfdl|attribution|fal\b|copyrighted free use|flickr-|nasa|usgov|faa)', name):
            out.append(re.sub(r'\s+', ' ', body)[:120])
    return out


# the licence categories and template aliases Commons uses, to one name (the template's)
ALIAS = {'cc0-1.0': 'cc-zero', 'cc0': 'cc-zero', 'pd-nasa': 'pd-usgov-nasa', 'pd-us-noaa': 'pd-usgov-noaa',
         'pd-us-navy': 'pd-usgov-military-navy', 'pd-usgov-mil-navy': 'pd-usgov-military-navy',
         'pd-us-air-force': 'pd-usgov-military-air-force', 'pd-usaf': 'pd-usgov-military-air-force',
         'pd-us-government': 'pd-usgov', 'pd-us-military': 'pd-usgov-military', 'pd-us-faa': 'pd-usgov-faa'}


def norm_license(s):
    s = s.strip().lower().replace('public domain', 'pd').replace(' ', '-')
    m = re.match(r'^pd-?\((.+)\)$', s)
    if m:
        s = m.group(1)
    return ALIAS.get(s, s)


def page_licenses(info):
    # what the page offers, normalised: the licence templates' names and arguments, the licence categories, LicenseShortName
    toks = set()
    for t in info.get('templates', []):
        parts = [p.strip() for p in t.split('|')]
        for p in parts:
            if '=' not in p:
                toks.add(norm_license(p))
    for c in info.get('categories', '').split('|'):
        toks.add(norm_license(c))
    if info.get('licenseShortName'):
        toks.add(norm_license(info['licenseShortName']))
    return toks


def commons_info(titles):
    out = {}
    titles = list(dict.fromkeys(titles))
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        q = {'action': 'query', 'format': 'json', 'formatversion': '2', 'titles': '|'.join('File:' + t for t in chunk),
             'prop': 'imageinfo|revisions', 'rvprop': 'content', 'rvslots': 'main', 'iiprop': 'extmetadata|size|mime',
             'iiextmetadatafilter': 'LicenseShortName|LicenseUrl|Artist|Credit|Categories|AttributionRequired|UsageTerms|DateTimeOriginal'}
        d = ask_json(API + '?' + urllib.parse.urlencode(q))
        names = {n['to']: n['from'] for n in d['query'].get('normalized', [])}
        for p in d['query']['pages']:
            asked = names.get(p['title'], p['title'])[5:]
            if p.get('missing'):
                out[asked] = {'missing': True}
                continue
            ii = (p.get('imageinfo') or [{}])[0]
            em = {k: v.get('value') for k, v in (ii.get('extmetadata') or {}).items()}
            wt = ((p.get('revisions') or [{}])[0].get('slots') or {}).get('main', {}).get('content', '')
            author = re.search(r'(?im)^\s*\|\s*author\s*=\s*(.+)$', wt)
            out[asked] = {'title': p['title'], 'width': ii.get('width'), 'height': ii.get('height'), 'mime': ii.get('mime'),
                          'licenseShortName': text(str(em.get('LicenseShortName') or '')), 'licenseUrl': text(str(em.get('LicenseUrl') or '')),
                          'artist': text(str(em.get('Artist') or ''))[:200], 'authorField': text(author.group(1))[:200] if author else '',
                          'credit': text(str(em.get('Credit') or ''))[:200], 'categories': str(em.get('Categories') or ''),
                          'templates': license_templates(wt), 'date': text(str(em.get('DateTimeOriginal') or ''))[:40]}
        time.sleep(3)
    return out


def nasa_info(nid):
    d = ask_json('https://images-api.nasa.gov/search?' + urllib.parse.urlencode({'nasa_id': nid}))
    items = d['collection']['items']
    if not items:
        return {'missing': True}
    it = items[0]
    meta = it['data'][0]
    orig = next((l for l in it.get('links', []) if l.get('rel') == 'canonical'), {})
    return {'title': meta.get('title'), 'center': meta.get('center'), 'photographer': meta.get('photographer') or meta.get('secondary_creator') or '',
            'date': meta.get('date_created', '')[:10], 'width': orig.get('width'), 'height': orig.get('height'),
            'licenseShortName': 'Public domain (NASA media usage guidelines)'}


def author_ok(ours, page):
    # our author's words found on the page (author field or Artist): every word of 3+ letters of the first name part
    hay = ' '.join(page.get(k, '') for k in ('artist', 'authorField', 'credit', 'photographer', 'center')).lower()
    if not hay.strip():
        return None
    main = re.split(r'[（(／/,]| from | による', ours)[0].strip().lower()
    words = [w for w in re.findall(r'[\w.\-]+', main) if len(w) >= 3 and w not in ('nasa',)] or [main]
    return all(w in hay for w in words)


def verify(ids, out, pages=None):
    photos = stores()
    if ids:
        photos = {k: v for k, v in photos.items() if k in ids}
    commons, nasa = {}, {}
    for k, p in photos.items():
        src = p['credit']['source']
        m = re.match(r'https://commons\.wikimedia\.org/wiki/File:(.+)$', src)
        if m:
            commons[k] = urllib.parse.unquote(m.group(1)).replace('_', ' ')
        m = re.match(r'https://images\.nasa\.gov/details/(.+)$', src)
        if m:
            nasa[k] = m.group(1)
    given = json.load(open(pages, encoding='utf-8')) if pages else None
    info = ({t: given.get(t, {'missing': True}) for t in commons.values()} if given is not None
            else commons_info(list(commons.values())) if commons else {})
    rows = []
    for k, p in photos.items():
        c = p['credit']
        if k in commons:
            pi = info.get(commons[k], {'missing': True})
        elif k in nasa:
            pi = given.get('nasa:' + nasa[k], {'missing': True}) if given is not None else nasa_info(nasa[k])
        else:
            pi = {'missing': True, 'note': 'not a Commons or NASA page'}
        row = {'id': k, 'store': p['store'], 'source': c['source'], 'ours': {'author': c['author'], 'license': c['license'], 'w': p['w'], 'h': p['h'], 'mod': p.get('mod')}}
        if pi.get('missing'):
            row.update(verdict='MISSING', page=pi)
        else:
            lic = page_licenses(pi) if k in commons else {'pd'}
            want = norm_license(c['license'])
            lic_ok = (want in lic) if k in commons else c['license'].startswith('Public domain')
            # PD-USGov-* is offered by a family of templates; accept a sub-template ('pd-usgov-nasa' ⊂ 'pd-usgov-…')
            if not lic_ok and want.startswith('pd-usgov'):
                lic_ok = any(t.startswith('pd-usgov') for t in lic)
            a_ok = author_ok(c['author'], pi)
            ow, oh = pi.get('width'), pi.get('height')
            shape = None
            if ow and oh:
                r0, r1 = ow / oh, p['w'] / p['h']
                shape = 'same' if abs(r0 - r1) / r0 <= 0.012 else 'cropped'
            row.update(page={k2: v for k2, v in pi.items() if k2 not in ('categories',)}, pageLicenses=sorted(x for x in lic if x),
                       licenseOk=lic_ok, authorOk=a_ok, original=f'{ow}x{oh}' if ow else None, shape=shape,
                       verdict='OK' if lic_ok and a_ok is not False else 'CHECK')
        rows.append(row)
        pl = ','.join(row.get('pageLicenses', [])[:6])
        print(f"{row['verdict']:7} {k:18} lic={'ok' if row.get('licenseOk') else 'NO'} author={row.get('authorOk')} {row.get('original')} vs {p['w']}x{p['h']} {row.get('shape')}  [{pl}]")
    rec = {'checked': datetime.date.today().isoformat(), 'tool': 'textbook/rewrite/tools/photosrc.py verify',
           'pages': 'read by the tool from Commons and images-api.nasa.gov' if not pages else 'given (--pages): read another way because Commons answered HTTP 429 to this address',
           'photos': rows}
    if out:
        open(out, 'w', encoding='utf-8').write(json.dumps(rec, ensure_ascii=False, indent=1) + '\n')
        print('wrote', out, len(rows), 'photos')
    return rec


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['search', 'check', 'get', 'verify'])
    ap.add_argument('arg', nargs='?')
    ap.add_argument('dir', nargs='?')
    ap.add_argument('--source')
    ap.add_argument('-n', type=int, default=10)
    ap.add_argument('--width', type=int, default=1280)
    ap.add_argument('--ids')
    ap.add_argument('--out')
    ap.add_argument('--pages')
    o = ap.parse_args()
    if o.cmd == 'search':
        search(o.arg, o.source, o.n)
    elif o.cmd == 'check':
        print(json.dumps(check(o.arg), ensure_ascii=False, indent=1))
    elif o.cmd == 'get':
        get(o.arg, o.dir, o.width)
    else:
        verify(set(o.ids.split(',')) if o.ids else None, o.out, o.pages)
