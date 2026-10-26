#!/usr/bin/env python3
"""photo.py — the textbook's photos: convert an original (kept OUTSIDE the repository, e.g. in a scratch folder) into a
WebP data URL in flight-lab/src/book-photos.js, and write flight-lab/PHOTO-CREDITS.md from the same data.

  python3 -I textbook/rewrite/tools/photo.py add --id ID --file ORIGINAL --alt "…" --caption "…" \
      --author "…" --license "CC BY-SA 4.0" --license-url URL --source URL [--crop L,T,R,B] [--max 1200] [--kb 120]
  python3 -I textbook/rewrite/tools/photo.py remove --id ID
  python3 -I textbook/rewrite/tools/photo.py list
  python3 -I textbook/rewrite/tools/photo.py credits

The conversion: EXIF orientation applied, RGB, optional crop (fractions 0–1 or pixels), long side ≤ --max px, WebP with
the highest quality (≤ 88) that fits --kb KB (smaller sizes are tried when quality 40 is not enough); no EXIF / ICC /
XMP is written. A quality whose base64 happens to spell a string the build tests reject (XXX, TODO …) is skipped.
Run it with python3 -I (isolated) — it reads downloaded files.
"""
import argparse, base64, io, json, os, re, sys
from PIL import Image, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
JS = os.path.join(ROOT, 'flight-lab', 'src', 'book-photos.js')
CREDITS = os.path.join(ROOT, 'flight-lab', 'PHOTO-CREDITS.md')
BOOK = [os.path.join(ROOT, 'flight-lab', 'src', f) for f in ('book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js')]
ALLOWED = re.compile(r'^(Public domain.*|CC0 1\.0|CC BY(-SA)? (1\.0|2\.0|2\.5|3\.0|4\.0)( [A-Za-z]+)?)$')
START, END = '/*PHOTOS*/', '/*/PHOTOS*/'


def read():
    s = open(JS, encoding='utf-8').read()
    a, b = s.index(START) + len(START), s.index(END)
    return s, a, b, json.loads(s[a:b])


def write(photos):
    s, a, b, _ = read()
    body = '{\n' + ',\n'.join(json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(v, ensure_ascii=False) for k, v in photos.items()) + ('\n' if photos else '') + '}'
    open(JS, 'w', encoding='utf-8').write(s[:a] + body + s[b:])


def convert(path, crop, maxside, kb):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im).convert('RGB')
    if crop:
        l, t, r, b = [float(x) for x in crop.split(',')]
        if max(l, t, r, b) <= 1:
            l, t, r, b = l * im.width, t * im.height, r * im.width, b * im.height
        im = im.crop((round(l), round(t), round(r), round(b)))
    side = maxside
    while True:
        k = min(1.0, side / max(im.size))
        cur = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS) if k < 1 else im.copy()
        cur.info = {}
        for q in range(88, 39, -2):
            buf = io.BytesIO()
            cur.save(buf, 'WEBP', quality=q, method=6, exif=b'', icc_profile=None)
            if buf.tell() <= kb * 1024 and clean(base64.b64encode(buf.getvalue()).decode()):
                return buf.getvalue(), cur.size, q
        side = int(side * 0.85)
        if side < 320:
            raise SystemExit('cannot fit %s into %d KB' % (path, kb))


# the apps' build tests reject these strings anywhere in the page (flight-lab/test/flight.test.mjs); base64 can spell them by chance
BAD = [re.compile(x) for x in (r'XXX', r'\bTODO\b', r'\bFIXME\b', r'\bTBD\b', r'PLACEHOLDER', r'AIza[0-9A-Za-z_-]{30,}', r'sk-ant-api')]


def clean(b64):
    return not any(r.search(b64) for r in BAD)


def used_in():
    where = {}
    for f in BOOK:
        src = open(f, encoding='utf-8').read()
        sec = None
        for line in src.splitlines():
            m = re.search(r"\{ id: '([a-z0-9]+\.[a-z0-9]+)'", line)
            if m:
                sec = m.group(1)
            for p in re.findall(r"bk\.photo\('([A-Za-z0-9_]+)'\)", line):
                where.setdefault(p, []).append(sec or '?')
    return where


def credits(photos):
    where = used_in()
    total = sum(len(base64.b64decode(p['src'].split(',', 1)[1])) for p in photos.values())
    out = ['# 教科書の写真のクレジット（PHOTO-CREDITS）', '',
           'FLIGHT LAB の教科書（TEXTBOOK でも同じ）に入れた写真の一覧です。どれも元のページでライセンスを確かめました。',
           '使ってよいのは、パブリックドメイン（FAA・NASA・NOAA など米国政府の著作物）、CC0、CC BY、CC BY-SA だけです。',
           '写真は縮小（長い辺 1200 px 以下）・WebP に変換し、メタデータを消して `src/book-photos.js` に入れています。',
           'CC BY-SA の写真は、変換したものも同じ CC BY-SA で利用できます。写真の下のキャプションにも作者・ライセンス・出典を出しています。', '',
           f'写真 {len(photos)} 枚・合計 {total / 1024 / 1024:.2f} MB（WebP のバイト数）。', '',
           '| id | 写真 | 作者 | ライセンス | 出典 | 使っている節 |', '|---|---|---|---|---|---|']
    for k, p in photos.items():
        c = p['credit']
        cap = re.sub(r'<[^>]+>', '', p['caption']).replace('|', '／')
        out.append(f"| `{k}` | {cap} | {c['author']} | [{c['license']}]({c['licenseUrl']}) | [元のページ]({c['source']}) | {', '.join(where.get(k, ['（未使用）']))} |")
    open(CREDITS, 'w', encoding='utf-8').write('\n'.join(out) + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['add', 'remove', 'list', 'credits'])
    for a in ('id', 'file', 'alt', 'caption', 'author', 'license', 'license-url', 'source', 'crop'):
        ap.add_argument('--' + a)
    ap.add_argument('--max', type=int, default=1200)
    ap.add_argument('--kb', type=int, default=120)
    o = ap.parse_args()
    _, _, _, photos = read()
    if o.cmd == 'add':
        for a in ('id', 'file', 'alt', 'caption', 'author', 'license', 'license_url', 'source'):
            if not getattr(o, a):
                raise SystemExit('--' + a.replace('_', '-') + ' is required')
        if not re.match(r'^[A-Za-z][A-Za-z0-9_]*$', o.id):
            raise SystemExit('bad id')
        if not ALLOWED.match(o.license):
            raise SystemExit('licence not allowed: ' + o.license)
        data, size, q = convert(o.file, o.crop, o.max, o.kb)
        photos[o.id] = {'src': 'data:image/webp;base64,' + base64.b64encode(data).decode(), 'w': size[0], 'h': size[1],
                        'alt': o.alt, 'caption': o.caption,
                        'credit': {'author': o.author, 'license': o.license, 'licenseUrl': o.license_url, 'source': o.source}}
        write(photos)
        credits(photos)
        print(f'{o.id}: {size[0]}x{size[1]} q{q} {len(data) / 1024:.1f} KB')
    elif o.cmd == 'remove':
        photos.pop(o.id, None)
        write(photos)
        credits(photos)
    elif o.cmd == 'list':
        where = used_in()
        for k, p in photos.items():
            n = len(base64.b64decode(p['src'].split(',', 1)[1]))
            print(f"{k}\t{p['w']}x{p['h']}\t{n / 1024:.1f} KB\t{p['credit']['license']}\t{','.join(where.get(k, ['-']))}")
        print(len(photos), 'photos')
    else:
        credits(photos)


if __name__ == '__main__':
    main()
