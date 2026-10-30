#!/usr/bin/env python3
"""photo.py — the textbook's photos, in two stores, and flight-lab/PHOTO-CREDITS.md (one list for both) from the same data.

  flight-lab/src/book-photos.js    FL.bookPhotos   the textbook's own photos: converted from an original by `add`
  flight-lab/src/book-photos-k.js  FL.bookPhotosK  the basic course's photos (パイロット基礎教材（第 3 版）): its own files,
                                                   byte for byte (`add-file`), with the sha256 recorded

  python3 -I textbook/rewrite/tools/photo.py add --id ID --file ORIGINAL --alt "…" --caption "…" --author "…" \
      --license "CC BY-SA 4.0" --license-url URL --source URL --mod 無加工|切り抜き・縮小|注記は本書で追加 \
      [--crop L,T,R,B] [--max 1200] [--kb 120]                  # converts (below) into book-photos.js
  python3 -I textbook/rewrite/tools/photo.py add-file --id ID [--kiso ch00-photo3] [--file F.webp] --alt "…" --caption "…" \
      --author "…" --license "…" --license-url URL --source URL --mod "…" [--to SECTION] [--store k|book]
      # puts a WebP in as it is (no conversion; the bytes kept): with --kiso the file is flight-lab/kiso/photo/<kiso>.webp
      # and must stay equal to it; its sha256 is recorded. --store k (default): book-photos-k.js; --store book: in
      # book-photos.js (a textbook id whose photo is replaced by the basic course's file, e.g. holdShort ← ch09-photo4)
  python3 -I textbook/rewrite/tools/photo.py set --id ID [--mod …] [--alt …] [--caption …] [--to …] [--author …] [--license …] [--license-url …] [--source …]
  python3 -I textbook/rewrite/tools/photo.py remove --id ID
  python3 -I textbook/rewrite/tools/photo.py list
  python3 -I textbook/rewrite/tools/photo.py check        # both stores: WebP, ≤ 120 KB, no metadata, ≤ 1200 px, the credit's
                                                          # form, the mod labels, the recorded sha256, the basic course's
                                                          # bytes, ids unique across the stores, the totals (≤ 4.0 MiB)
  python3 -I textbook/rewrite/tools/photo.py credits      # writes flight-lab/PHOTO-CREDITS.md

The conversion (add): EXIF orientation applied, RGB, optional crop (fractions 0–1 or pixels), long side ≤ --max px, WebP
with the highest quality (≤ 88) that fits --kb KB (smaller sizes are tried when quality 40 is not enough); no EXIF / ICC /
XMP is written. A quality whose base64 happens to spell a string the build tests reject (XXX, TODO …) is skipped.
add-file cannot re-encode: a file whose base64 spells such a string by chance is kept (the checks remove data URLs first:
DESIGN 4.2「base64 の中の偶然の文字」) and the tool says so.
The modification label (mod, DESIGN 4.2「加工の表示は写真ごと」): one of MODS, or two or more joined by '／'
(e.g. 切り抜き・縮小／注記はパイロット基礎教材（第 3 版）で追加). The basic course's annotations are credited to it, not to
this book; a CC BY-SA photo carries no annotation (the basic course's rule 2 and STYLE.md「写真」).
Run it with python3 -I (isolated) — it reads downloaded files.
"""
import argparse, base64, hashlib, io, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC_DIR = os.path.join(ROOT, 'flight-lab', 'src')
KISO_PHOTO = os.path.join(ROOT, 'flight-lab', 'kiso', 'photo')
STORES = {'book': os.path.join(SRC_DIR, 'book-photos.js'), 'k': os.path.join(SRC_DIR, 'book-photos-k.js')}
CREDITS = os.path.join(ROOT, 'flight-lab', 'PHOTO-CREDITS.md')
MODS = ['無加工', '切り抜き・縮小', '注記はパイロット基礎教材（第 3 版）で追加', '注記は本書で追加']
NEVER = {'ch00-photo7', 'ch12-photo3', 'ch12-photo4'}   # DESIGN 4.2: the licence's form; no image (no credit either)
ONE, BUDGET, SIDE = 120 * 1024, 4 * 1024 * 1024, 1200


def _book_files():
    # the chapters' files: the book-*.js names of FLIGHT LAB's one list of modules (flight-lab/src/modules.mjs), in its
    # order, less the frame (book-figs.js, book-core.js) and the photos (book-photos*.js) — no list of its own here
    src = open(os.path.join(SRC_DIR, 'modules.mjs'), encoding='utf-8').read()
    body = src[src.index('export const MODULES'):]
    body = body[:body.index(']);')]
    names = re.findall(r"'(book-[a-z0-9-]+\.js)'", body)
    return [os.path.join(SRC_DIR, f) for f in names if f not in ('book-figs.js', 'book-core.js') and not f.startswith('book-photos')]


BOOK = _book_files()
ALLOWED = re.compile(r'^(Public domain.*|CC0 1\.0|CC BY(-SA)? (1\.0|2\.0|2\.5|3\.0|4\.0)( [A-Za-z]+)?)$')
START, END = '/*PHOTOS*/', '/*/PHOTOS*/'
SSTART, SEND = '/*SRC*/', '/*/SRC*/'

K_TEMPLATE = """// FLIGHT LAB — book-photos-k.js : the basic course's photos that the textbook uses (パイロット基礎教材（第 3 版）の写真。
// textbook/rewrite/combined/DESIGN.md 4.2「写真」and 5 criterion 17). Each is the basic course's own file, byte for byte
// (flight-lab/kiso/photo/<kiso>.webp: never re-encoded, re-sized or cropped here; its sha256 is recorded below and the
// tests compare it), with its credit in the textbook's form {author, license, licenseUrl, source} (each checked on its
// Commons page: textbook/rewrite/tools/photosrc.py verify), its modification label (mod) and the section it is meant
// for (to). The chapter writers place a photo by its id (bk.photo('ch00-photo3')). Written by
// textbook/rewrite/tools/photo.py add-file; edit with the tool.
// FL.bookPhotosK holds the entries; SRC their bytes as WebP data URLs, read through each entry's src. While FLIGHT LAB's
// page carries the basic course's original pages (kiso/kiso-data.js: FL.kiso.photos has the same bytes), its build can
// drop the SRC block (between the SRC marks): src is then read from FL.kiso.photos, so the same photo is not in the page
// twice (DESIGN 8.2). TEXTBOOK loads the whole file; CADET does not (it shows no photos).
(function (FL) {
  'use strict';
  const K = /*PHOTOS*/{}/*/PHOTOS*/;
  const SRC = /*SRC*/{}/*/SRC*/;
  for (const id of Object.keys(K)) {
    const p = K[id];
    Object.defineProperty(p, 'src', { enumerable: true, configurable: true,
      get: () => SRC[id] || (FL.kiso && FL.kiso.photos && FL.kiso.photos[p.kiso]) || '' });
  }
  FL.bookPhotosK = K;
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
"""


def _between(s, a, b):
    i, j = s.index(a) + len(a), s.index(b)
    return i, j


def read(store):
    path = STORES[store]
    if not os.path.exists(path):
        if store != 'k':
            raise SystemExit(path + ' is missing')
        s = K_TEMPLATE
    else:
        s = open(path, encoding='utf-8').read()
    a, b = _between(s, START, END)
    photos = json.loads(s[a:b])
    if store == 'k':
        c, d = _between(s, SSTART, SEND)
        src = json.loads(s[c:d])
        for k, p in photos.items():
            p['src'] = src.get(k, '')
    return s, photos


def dump(d):
    return '{\n' + ',\n'.join(json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(v, ensure_ascii=False) for k, v in d.items()) + ('\n' if d else '') + '}'


def write(store, photos):
    s, _ = read(store)
    if store == 'book':
        a, b = _between(s, START, END)
        s = s[:a] + dump(photos) + s[b:]
    else:
        meta = {k: {x: y for x, y in p.items() if x != 'src'} for k, p in photos.items()}
        src = {k: p['src'] for k, p in photos.items()}
        body = dump(meta)
        if '*/' in body:
            raise SystemExit('a caption or credit holds "*/": it would close the marks')
        a, b = _between(s, START, END)
        s = s[:a] + body + s[b:]
        c, d = _between(s, SSTART, SEND)
        s = s[:c] + dump(src) + s[d:]
    open(STORES[store], 'w', encoding='utf-8').write(s)


def all_photos():
    out = {}
    for st in STORES:
        if st == 'k' and not os.path.exists(STORES[st]):
            continue
        for k, p in read(st)[1].items():
            out[k] = (st, p)
    return out


def convert(path, crop, maxside, kb):
    from PIL import Image, ImageOps
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


def webp_info(data):
    # (width, height, chunk names) from the WebP's own header: VP8X, VP8 (lossy) or VP8L (lossless)
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        raise ValueError('not a WebP (RIFF/WEBP)')
    chunks, o, w, h = [], 12, None, None
    while o + 8 <= len(data):
        name, size = data[o:o + 4].decode('latin1'), int.from_bytes(data[o + 4:o + 8], 'little')
        body = data[o + 8:o + 8 + size]
        chunks.append(name)
        if name == 'VP8X' and w is None:
            w, h = 1 + int.from_bytes(body[4:7], 'little'), 1 + int.from_bytes(body[7:10], 'little')
        elif name == 'VP8 ' and w is None:
            w, h = int.from_bytes(body[6:8], 'little') & 0x3FFF, int.from_bytes(body[8:10], 'little') & 0x3FFF
        elif name == 'VP8L' and w is None:
            bits = int.from_bytes(body[1:5], 'little')
            w, h = (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        o += 8 + size + (size & 1)
    return w, h, chunks


def mod_ok(mod):
    parts = [x for x in str(mod or '').split('／')]
    return bool(mod) and all(x in MODS for x in parts) and len(set(parts)) == len(parts)


def used_in():
    where = {}
    for f in BOOK:
        src = open(f, encoding='utf-8').read()
        sec = None
        for line in src.splitlines():
            m = re.search(r"\{ id: '([a-z0-9]+\.[a-z0-9]+)'", line)
            if m:
                sec = m.group(1)
            for p in re.findall(r"bk\.photo\('([A-Za-z0-9_-]+)'\)", line):
                where.setdefault(p, []).append(sec or '?')
    return where


def decoded(p):
    return base64.b64decode(p['src'].split(',', 1)[1]) if p.get('src') else b''


def credits():
    where = used_in()
    book, k = read('book')[1], (read('k')[1] if os.path.exists(STORES['k']) else {})
    tb = sum(len(decoded(p)) for p in book.values())
    tk = sum(len(decoded(p)) for p in k.values())
    out = ['# 写真のクレジット（PHOTO-CREDITS）', '',
           'FLIGHT LAB の教科書（TEXTBOOK でも同じ）に入れた写真の、1 つの一覧です。教科書の写真（`src/book-photos.js`）と、',
           'パイロット基礎教材（第 3 版）から使う写真（`src/book-photos-k.js`）の両方を載せます。どれも元のページでライセンスと作者を確かめました',
           '（`textbook/rewrite/tools/photosrc.py verify`。記録は `textbook/rewrite/combined/reports/W22.photos.json`）。',
           '使ってよいのは、パブリックドメイン（FAA・NASA・NOAA など米国政府の著作物など）、CC0、CC BY、CC BY-SA だけです。', '',
           '- **教科書の写真**は、縮小（長い辺 1200 px 以下）・WebP に変換し、メタデータを消して入れています。切り抜いた写真は「加工」の欄に「切り抜き・縮小」と書きました。',
           '- **パイロット基礎教材（第 3 版）の写真**は、基礎教材のファイル（`kiso/photo/*.webp`。長い辺 560 px の WebP）をバイトのまま入れています（再変換・再縮小をしない。ハッシュで確かめます）。',
           '  基礎教材が書き込んだ注記のある写真は「注記はパイロット基礎教材（第 3 版）で追加」、基礎教材が切り抜いた写真は「切り抜き・縮小」と書きました。CC BY-SA の写真には注記を加えていません。',
           '- 「加工」の欄が「無加工」の写真は、縮小と形式の変換だけをしています。',
           '- CC BY-SA の写真は、変換したものも同じ CC BY-SA で利用できます。写真の下のキャプションにも作者・ライセンス・出典・加工を出しています。', '',
           f'教科書の写真 {len(book)} 枚・{tb / 1024 / 1024:.2f} MB、パイロット基礎教材（第 3 版）の写真 {len(k)} 枚・{tk / 1024 / 1024:.2f} MB、'
           f'合計 {len(book) + len(k)} 枚・{(tb + tk) / 1024 / 1024:.2f} MB（WebP のバイト数）。', '',
           '| id | 写真 | 作者 | ライセンス | 出典 | 加工 | 使っている節 |', '|---|---|---|---|---|---|---|']
    def row(kid, p, planned):
        c = p['credit']
        cap = re.sub(r'<[^>]+>', '', p['caption']).replace('|', '／')
        use = ', '.join(where.get(kid, [])) or (f'（置く予定：{p["to"]}）' if planned and p.get('to') else '（未使用）')
        orig = f'（基礎教材の {p["kiso"]}）' if p.get('kiso') and p['kiso'] != kid else ''
        return f"| `{kid}`{orig} | {cap} | {c['author']} | [{c['license']}]({c['licenseUrl']}) | [元のページ]({c['source']}) | {p.get('mod', '')} | {use} |"
    out += [row(kid, p, False) for kid, p in book.items()]
    if k:
        out += ['', '### パイロット基礎教材（第 3 版）から使う写真', '', '| id | 写真 | 作者 | ライセンス | 出典 | 加工 | 使っている節 |', '|---|---|---|---|---|---|---|']
        out += [row(kid, p, True) for kid, p in k.items()]
    open(CREDITS, 'w', encoding='utf-8').write('\n'.join(out) + '\n')


def check():
    errs, notes = [], []
    seen = {}
    total = 0
    for st in STORES:
        if st == 'k' and not os.path.exists(STORES[st]):
            notes.append('book-photos-k.js: not there yet')
            continue
        for kid, p in read(st)[1].items():
            at = f'{os.path.basename(STORES[st])} {kid}'
            if kid in seen:
                errs.append(f'{at}: the id is also in {seen[kid]}')
            seen[kid] = os.path.basename(STORES[st])
            if kid in NEVER or p.get('kiso') in NEVER:
                errs.append(f'{at}: DESIGN 4.2 says not to use it')
            m = re.match(r'^data:image/webp;base64,([A-Za-z0-9+/]+=*)$', p.get('src', ''))
            if not m:
                errs.append(f'{at}: src is not a WebP data URL')
                continue
            data = base64.b64decode(m.group(1))
            try:
                w, h, chunks = webp_info(data)
            except ValueError as e:
                errs.append(f'{at}: {e}')
                continue
            total += len(data)
            if len(data) > ONE:
                errs.append(f'{at}: {len(data)} bytes (≤ 120 KB)')
            if any(c in ('EXIF', 'XMP ', 'ICCP') for c in chunks):
                errs.append(f'{at}: metadata chunks {chunks}')
            if (w, h) != (p.get('w'), p.get('h')) or max(w, h) > SIDE:
                errs.append(f'{at}: {w}x{h} in the file, {p.get("w")}x{p.get("h")} in the data (long side ≤ 1200)')
            if not (p.get('alt') and len(p['alt']) >= 4 and p.get('caption') and len(p['caption']) >= 4):
                errs.append(f'{at}: alt and caption')
            c = p.get('credit') or {}
            if not all(c.get(x) for x in ('author', 'license', 'licenseUrl', 'source')):
                errs.append(f'{at}: credit {{author, license, licenseUrl, source}}')
            else:
                if not ALLOWED.match(c['license']):
                    errs.append(f'{at}: licence "{c["license"]}" not in the allowed forms')
                if not (c['licenseUrl'].startswith('https://') and c['source'].startswith('https://')):
                    errs.append(f'{at}: licenseUrl and source must be https')
            if not mod_ok(p.get('mod')):
                errs.append(f'{at}: mod "{p.get("mod")}" (one of {MODS}, or several joined by ／)')
            elif '注記' in p['mod'] and c.get('license', '').startswith('CC BY-SA'):
                errs.append(f'{at}: an annotated CC BY-SA photo (CC BY-SA photos are not altered)')
            if st == 'k' and any('本書' in str(c.get(x, '')) for x in ('author', 'license', 'source')):
                errs.append(f'{at}: 「本書」 in the credit (copied from the basic course, it would name this book)')
            if p.get('sha256') and hashlib.sha256(data).hexdigest() != p['sha256']:
                errs.append(f'{at}: the bytes are not those whose sha256 was recorded')
            if st == 'k' and not p.get('sha256'):
                errs.append(f'{at}: no sha256')
            if p.get('kiso'):
                f = os.path.join(KISO_PHOTO, p['kiso'] + '.webp')
                if not os.path.exists(f):
                    errs.append(f'{at}: the basic course has no {p["kiso"]}.webp')
                elif open(f, 'rb').read() != data:
                    errs.append(f'{at}: not byte-identical to kiso/photo/{p["kiso"]}.webp')
                if p['kiso'] != kid and st == 'k':
                    errs.append(f'{at}: in book-photos-k.js the id is the basic course\'s id ({p["kiso"]})')
            elif st == 'k':
                errs.append(f'{at}: no kiso id')
            if not clean(m.group(1)):
                notes.append(f'{at}: its base64 spells a string the build tests reject, by chance (kept: the checks remove data URLs first)')
    if total > BUDGET:
        errs.append(f'all photos: {total} bytes decoded (the budget is 4.0 MiB = {BUDGET})')
    cred = open(CREDITS, encoding='utf-8').read() if os.path.exists(CREDITS) else ''
    for kid in seen:
        if '`' + kid + '`' not in cred:
            errs.append(f'{kid}: not in PHOTO-CREDITS.md (run photo.py credits)')
    for kid in NEVER:
        if kid in cred:
            errs.append(f'PHOTO-CREDITS.md names {kid}')
    for n in notes:
        print('note:', n)
    for e in errs:
        print('ERROR:', e)
    print(f'{len(seen)} photos, {total} bytes decoded ({total / 1048576:.2f} MiB of the 4.0 MiB budget); {len(errs)} errors')
    return not errs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['add', 'add-file', 'set', 'remove', 'list', 'credits', 'check'])
    for a in ('id', 'file', 'alt', 'caption', 'author', 'license', 'license-url', 'source', 'crop', 'mod', 'kiso', 'to'):
        ap.add_argument('--' + a)
    ap.add_argument('--store', choices=['k', 'book'], default='k')
    ap.add_argument('--max', type=int, default=1200)
    ap.add_argument('--kb', type=int, default=120)
    o = ap.parse_args()
    if o.cmd in ('add', 'add-file'):
        if o.cmd == 'add-file' and o.kiso and not o.file:
            o.file = os.path.join(KISO_PHOTO, o.kiso + '.webp')
        for a in ('id', 'file', 'alt', 'caption', 'author', 'license', 'license_url', 'source', 'mod'):
            if not getattr(o, a):
                raise SystemExit('--' + a.replace('_', '-') + ' is required')
        if not re.match(r'^[A-Za-z][A-Za-z0-9_-]*$', o.id):
            raise SystemExit('bad id')
        if not ALLOWED.match(o.license):
            raise SystemExit('licence not allowed: ' + o.license)
        if not mod_ok(o.mod):
            raise SystemExit(f'mod: one of {MODS}, or several joined by ／')
        store = 'book' if o.cmd == 'add' else o.store
        others = {k: st for k, (st, _) in all_photos().items() if st != store}
        if o.id in others:
            raise SystemExit(f'{o.id} is in the other store ({others[o.id]})')
        _, photos = read(store)
        if o.cmd == 'add':
            data, size, q = convert(o.file, o.crop, o.max, o.kb)
            how = f'q{q}'
        else:
            data = open(o.file, 'rb').read()
            if o.kiso:
                ref = os.path.join(KISO_PHOTO, o.kiso + '.webp')
                if open(ref, 'rb').read() != data:
                    raise SystemExit(f'{o.file} is not byte-identical to {ref}')
            w, h, chunks = webp_info(data)
            if len(data) > ONE or max(w, h) > SIDE or any(c in ('EXIF', 'XMP ', 'ICCP') for c in chunks):
                raise SystemExit(f'{o.file}: {len(data)} bytes, {w}x{h}, chunks {chunks}: it must be ≤ 120 KB, ≤ 1200 px, no metadata (add-file does not convert)')
            size, how = (w, h), 'bytes kept'
            if not clean(base64.b64encode(data).decode()):
                print('note: its base64 spells a string the build tests reject, by chance (kept as it is)')
        entry = {'src': 'data:image/webp;base64,' + base64.b64encode(data).decode(), 'w': size[0], 'h': size[1],
                 'alt': o.alt, 'caption': o.caption,
                 'credit': {'author': o.author, 'license': o.license, 'licenseUrl': o.license_url, 'source': o.source},
                 'mod': o.mod}
        if o.cmd == 'add-file':
            entry['sha256'] = hashlib.sha256(data).hexdigest()
            if o.kiso:
                entry['kiso'] = o.kiso
            if o.to:
                entry['to'] = o.to
        photos[o.id] = entry
        write(store, photos)
        credits()
        print(f'{o.id}: {size[0]}x{size[1]} {how} {len(data) / 1024:.1f} KB → {os.path.basename(STORES[store])}')
    elif o.cmd == 'set':
        hit = all_photos().get(o.id)
        if not hit:
            raise SystemExit(o.id + ': no such photo')
        store, _ = hit
        _, photos = read(store)
        p = photos[o.id]
        if o.mod is not None:
            if not mod_ok(o.mod):
                raise SystemExit(f'mod: one of {MODS}, or several joined by ／')
            p['mod'] = o.mod
        for a, key in (('alt', 'alt'), ('caption', 'caption'), ('to', 'to')):
            if getattr(o, a) is not None:
                p[key] = getattr(o, a)
        for a, key in (('author', 'author'), ('license', 'license'), ('license_url', 'licenseUrl'), ('source', 'source')):
            if getattr(o, a) is not None:
                if key == 'license' and not ALLOWED.match(o.license):
                    raise SystemExit('licence not allowed: ' + o.license)
                p['credit'][key] = getattr(o, a)
        # keep the order: src, w, h, alt, caption, credit, mod, then the rest
        order = ['src', 'w', 'h', 'alt', 'caption', 'credit', 'mod', 'sha256', 'kiso', 'to']
        photos[o.id] = {k: p[k] for k in order if k in p} | {k: v for k, v in p.items() if k not in order}
        write(store, photos)
        credits()
    elif o.cmd == 'remove':
        hit = all_photos().get(o.id)
        if hit:
            store, _ = hit
            _, photos = read(store)
            photos.pop(o.id, None)
            write(store, photos)
        credits()
    elif o.cmd == 'list':
        where = used_in()
        for kid, (st, p) in all_photos().items():
            n = len(decoded(p))
            print(f"{kid}\t{st}\t{p['w']}x{p['h']}\t{n / 1024:.1f} KB\t{p['credit']['license']}\t{p.get('mod', '-')}\t{','.join(where.get(kid, ['-']))}\t{p.get('to', '')}")
        print(len(all_photos()), 'photos')
    elif o.cmd == 'credits':
        credits()
    else:
        sys.exit(0 if check() else 1)


if __name__ == '__main__':
    main()
