// TEXTBOOK — the photos as data (W22; textbook/rewrite/combined/DESIGN.md 4.2「写真」, 5 criteria 17 and 25, 8.2): the
// textbook's photos (flight-lab/src/book-photos.js, FL.bookPhotos) and the basic course's photos the book uses
// (flight-lab/src/book-photos-k.js, FL.bookPhotosK), read as files in their own context — whether or not a product
// loads them yet — with flight-lab/PHOTO-CREDITS.md and the record of the source pages
// (textbook/rewrite/combined/reports/W22.photos.json). How a chapter shows a photo (bk.photo) is content.test.mjs's.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = new URL('../../', import.meta.url);
const text = p => fs.readFileSync(new URL(p, ROOT), 'utf8');
const KISO_PHOTO = id => fs.readFileSync(new URL(`flight-lab/kiso/photo/${id}.webp`, ROOT));
function load(sources) {
  const ctx = {}; ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
  for (const [name, src] of sources) vm.runInContext(src, ctx, { filename: name });
  return ctx.FL || {};
}
const BOOK_JS = text('flight-lab/src/book-photos.js'), K_JS = text('flight-lab/src/book-photos-k.js');
const FL = load([['book-photos.js', BOOK_JS], ['book-photos-k.js', K_JS]]);
const B = FL.bookPhotos, K = FL.bookPhotosK;
const bytes = p => Buffer.from(p.src.split(',')[1], 'base64');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

// the modification labels (DESIGN 4.2「加工の表示は写真ごと」): one, or two or more joined by ／
const MODS = ['無加工', '切り抜き・縮小', '注記はパイロット基礎教材（第 3 版）で追加', '注記は本書で追加'];
const LICENSE = /^(Public domain.*|CC0 1\.0|CC BY(-SA)? (1\.0|2\.0|2\.5|3\.0|4\.0)( [A-Za-z]+)?)$/;
// DESIGN 4.2's photo table, as W22 decided it: the section each basic-course photo is meant for (ch09-photo4 replaces
// the textbook's holdShort under that id; the four conditional ones: ch01-photo4 kept, ch01-photo2・ch06-photo2・
// ch09-photo2 not; ch09-photo6 left out for the faces — reports/W22.md)
const PLAN = {
  'ch00-photo3': 'aero.axes', 'ch00-photo4': 'inst.speed', 'ch00-photo5': 'basics.alt', 'ch00-photo6': 'inst.alt',
  'ch01-photo4': 'aero.flaps', 'ch01-photo5': 'aero.stall', 'ch01-photo6': 'aero.left', 'ch02-photo2': 'tsys.arch',
  'ch02-photo3': 'tsys.power', 'ch02-photo4': 'me.sys', 'ch02-photo5': 'tsys.power', 'ch02-photo6': 'tsys.env',
  'ch02-photo7': 'tsys.env', 'ch03-photo2': 'sys.piston', 'ch03-photo3': 'sys.carb', 'ch03-photo4': 'me.prop',
  'ch03-photo5': 'tsys.turbine', 'ch03-photo6': 'tsys.turbine', 'ch04-photo2': 'ifr.instr', 'ch04-photo3': 'inst.gyro',
  'ch04-photo4': 'nav.vor', 'ch04-photo5': 'comm.xpdr', 'ch05-photo2': 'wb.limits', 'ch05-photo4': 'tsys.wb',
  'ch06-photo4': 'emg.glide', 'ch06-photo6': 'tsys.wb', 'ch07-photo2': 'wx.ts', 'ch07-photo3': 'wx.turb',
  'ch07-photo4': 'wx.ice', 'ch07-photo7': 'jwx.season', 'ch08-photo1': 'nav.chart', 'ch08-photo2': 'nav.dr',
  'ch08-photo4': 'navb.calc', 'ch08-photo6': 'nav.gps', 'ch09-photo3': 'comm.runway', 'ch10-photo2': 'hf.altitude',
  'ch10-photo4': 'hf.altitude', 'ch10-photo5': 'adm.check', 'ch11-photo1': 'jair.vfr', 'ch11-photo3': 'ops.xwind',
  'ch11-photo4': 'ops.pattern', 'ch11-photo5': 'ops.landing', 'ch11-photo7': 'ops.night', 'ch12-photo1': 'jifr.minima',
  'ch12-photo2': 'ifr.hold', 'ch12-photo5': 'ifr.ils', 'ch13-photo2': 'oei.what', 'ch13-photo3': 'me.speeds',
  'ch13-photo4': 'me.prop', 'ch13-photo6': 'me.basics', 'ch13-photo7': 'me.oei',
};
// not used (DESIGN 4.2: airlines and logos, instrument screens, the textbook's photos of the same subject, the licence's
// form, little to do with the course; and W22's four) and never named (no image: ch12-photo3・4)
const NOT_USED = ['ch00-photo1', 'ch01-photo1', 'ch05-photo3', 'ch06-photo1', 'ch06-photo5', 'ch12-photo6', 'ch00-photo2',
  'ch04-photo1', 'ch07-photo5', 'ch10-photo6', 'ch01-photo3', 'ch03-photo1', 'ch07-photo1', 'ch07-photo6', 'ch08-photo5',
  'ch11-photo2', 'ch10-photo1', 'ch13-photo1', 'ch00-photo7', 'ch02-photo1', 'ch05-photo1', 'ch05-photo5', 'ch06-photo3',
  'ch08-photo3', 'ch09-photo1', 'ch09-photo5', 'ch10-photo3', 'ch11-photo6', 'ch13-photo5',
  'ch01-photo2', 'ch06-photo2', 'ch09-photo2', 'ch09-photo6'];
const NO_IMAGE = ['ch12-photo3', 'ch12-photo4'];
// the basic course's own data: each photo's credit line and its chapter's photoCreditsHtml (the Commons file names)
const KISO = {};
for (let n = 0; n < 14; n++) {
  const c = JSON.parse(text(`flight-lab/kiso/data/kiso${String(n).padStart(2, '0')}.json`));
  const names = new Map([...String(c.photoCreditsHtml).matchAll(/<tr><td>写真\s*(\d+)<\/td><td>[^<]*<\/td><td>([\s\S]*?)<\/td>/g)]
    .map(m => [`ch${String(n).padStart(2, '0')}-photo${m[1]}`, m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim()]));
  for (const p of c.photos) KISO[p.id] = { credit: p.credit, file: names.get(p.id) };
}
const all = () => [...Object.entries(B).map(([id, p]) => [id, p, 'book']), ...Object.entries(K).map(([id, p]) => [id, p, 'k'])];
function webp(b) {
  const chunks = []; let w, h;
  for (let o = 12; o + 8 <= b.length; o += 8 + b.readUInt32LE(o + 4) + (b.readUInt32LE(o + 4) & 1)) {
    const name = b.subarray(o, o + 4).toString('latin1'), body = b.subarray(o + 8);
    chunks.push(name);
    if (w) continue;
    if (name === 'VP8X') { w = 1 + body.readUIntLE(4, 3); h = 1 + body.readUIntLE(7, 3); }
    else if (name === 'VP8 ') { w = body.readUInt16LE(6) & 0x3fff; h = body.readUInt16LE(8) & 0x3fff; }
    else if (name === 'VP8L') { const v = body.readUInt32LE(1); w = (v & 0x3fff) + 1; h = ((v >>> 14) & 0x3fff) + 1; }
  }
  return { w, h, chunks };
}

test('both stores: WebP data URLs within the limits, alt and caption, the credit in the textbook\'s form, a modification label, no id twice', () => {
  assert.ok(B && Object.keys(B).length === 30, 'book-photos.js: the textbook\'s 30 photos');
  assert.ok(K && Object.keys(K).length > 0, 'book-photos-k.js: FL.bookPhotosK');
  for (const id of Object.keys(K)) assert.ok(!B[id], `${id}: in both stores`);
  for (const [id, p] of all()) {
    assert.match(p.src, /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/, id);
    const b = bytes(p), info = webp(b);
    assert.equal(b.subarray(0, 4).toString(), 'RIFF', id); assert.equal(b.subarray(8, 12).toString(), 'WEBP', id);
    assert.ok(b.length <= 120 * 1024, `${id}: ${b.length} bytes`);
    assert.ok(!info.chunks.some(c => ['EXIF', 'XMP ', 'ICCP'].includes(c)), `${id}: metadata (${info.chunks})`);
    assert.deepEqual([info.w, info.h], [p.w, p.h], `${id}: the size written is the file's`);
    assert.ok(Math.max(p.w, p.h) <= 1200, id);
    assert.ok(p.alt.length >= 4 && p.caption.length >= 4, `${id}: alt and caption`);
    const c = p.credit;
    assert.ok(c.author && c.license && c.licenseUrl && c.source, `${id}: credit`);
    assert.match(c.license, LICENSE, `${id}: ${c.license}`);
    assert.match(c.licenseUrl, /^https:\/\//, id); assert.match(c.source, /^https:\/\//, id);
    assert.ok(typeof p.mod === 'string' && p.mod.split('／').every(x => MODS.includes(x)), `${id}: mod "${p.mod}"`);
    // the basic course's rule 2 and STYLE.md: a CC BY-SA photo carries no annotation
    if (c.license.startsWith('CC BY-SA')) assert.doesNotMatch(p.mod, /注記/, `${id}: an annotated CC BY-SA photo`);
    if (p.sha256) assert.equal(sha(b), p.sha256, `${id}: the recorded sha256`);
  }
});

test('the basic course\'s photos: its own files byte for byte (sha256), its ids, the Commons file of its credit table, its annotations and crops credited to it', () => {
  for (const [id, p] of Object.entries(K)) {
    assert.match(id, /^ch\d\d-photo\d+$/, id);
    assert.equal(p.kiso, id, `${id}: the basic course's id`);
    const file = KISO_PHOTO(id), b = bytes(p);
    assert.ok(file.equals(b), `${id}: not byte-identical to flight-lab/kiso/photo/${id}.webp`);
    assert.equal(p.sha256, sha(file), `${id}: sha256`);
    // the source: the Commons page of the file named in the chapter's photoCreditsHtml
    const want = 'https://commons.wikimedia.org/wiki/File:' + KISO[id].file.replace(/ /g, '_');
    assert.equal(decodeURIComponent(p.credit.source), want, `${id}: source`);
    // the label follows the basic course's own credit line: its annotations are its own (never 「本書」, which in this book
    // would name this book), its crops are a modification; otherwise only resized
    const k = KISO[id].credit;
    const parts = [...(/トリミング/.test(k) ? ['切り抜き・縮小'] : []), ...(/注記/.test(k) ? ['注記はパイロット基礎教材（第 3 版）で追加'] : [])];
    assert.equal(p.mod, parts.length ? parts.join('／') : '無加工', `${id}: mod for 「${k}」`);
    assert.doesNotMatch(JSON.stringify(p.credit), /本書/, `${id}: credit`);
  }
});

test('DESIGN 4.2: each photo meant for its section; not the photos not to use; the three pairs of the same subject', () => {
  assert.deepEqual(Object.keys(K).sort(), Object.keys(PLAN).sort(), 'the basic course\'s photos in book-photos-k.js');
  for (const [id, sec] of Object.entries(PLAN)) assert.equal(K[id].to, sec, `${id}: the section it is meant for`);
  for (const id of [...NOT_USED, ...NO_IMAGE]) {
    assert.ok(!K[id] && !Object.values(B).some(p => p.kiso === id), `${id}: not used`);
    assert.ok(!Object.values(B).concat(Object.values(K)).some(p => sha(bytes(p)) === (fs.existsSync(new URL(`flight-lab/kiso/photo/${id}.webp`, ROOT)) ? sha(KISO_PHOTO(id)) : '')), `${id}: its bytes are not in the book`);
  }
  // the hold-short marking: the textbook's version was a crop, so holdShort is now ch09-photo4's file as it is
  assert.equal(B.holdShort.kiso, 'ch09-photo4');
  assert.ok(bytes(B.holdShort).equals(KISO_PHOTO('ch09-photo4')), 'holdShort: byte-identical to ch09-photo4');
  assert.equal(B.holdShort.mod, '無加工');
  assert.equal(B.holdShort.credit.source, 'https://commons.wikimedia.org/wiki/File:Hold_Short.jpg');
  // the wingtip vortex and the O-360: the textbook's (larger) versions stay; lycoming's licence is PD-self
  assert.ok(!bytes(B.vortex).equals(KISO_PHOTO('ch01-photo3')) && !bytes(B.lycoming).equals(KISO_PHOTO('ch03-photo1')));
  assert.equal(B.lycoming.credit.license, 'Public domain (PD-self)');
  // no two photos the same
  const seen = new Map();
  for (const [id, p] of all()) { const h = sha(bytes(p)); assert.ok(!seen.has(h), `${id}: the same bytes as ${seen.get(h)}`); seen.set(h, id); }
});

test('sizes: 120 KB each and 4.0 MiB in all, decoded (DESIGN 8.2 and 5 criterion 25)', () => {
  const total = all().reduce((a, [, p]) => a + bytes(p).length, 0);
  assert.ok(total <= 4 * 1024 * 1024, `${total} bytes`);
});

test('the captions are written for this book: no reference into the basic course, sentences of at most 80 characters', () => {
  for (const [id, p] of Object.entries(K)) {
    assert.doesNotMatch(p.caption, /本章|本節|第\s*\d+\s*[章節]|図\s*\d+-\d+|写真\s*\d|本書で追加/, `${id}: ${p.caption}`);
    assert.match(p.caption, /。$/, id);
    for (const s of p.caption.replace(/<[^>]+>/g, '').split(/(?<=。)/)) assert.ok(s.length <= 80, `${id}: 「${s}」`);
  }
});

test('every bk.photo(\'…\') in the chapters names a photo in one of the two stores', () => {
  const src = fs.readdirSync(new URL('flight-lab/src/', ROOT)).filter(f => /^book-.*\.js$/.test(f) && !f.startsWith('book-photos'));
  for (const f of src) for (const m of text(`flight-lab/src/${f}`).matchAll(/bk\.photo\('([^']+)'\)/g)) assert.ok(B[m[1]] || K[m[1]], `${f}: bk.photo('${m[1]}')`);
});

test('PHOTO-CREDITS.md: one list for both stores, each photo with its modification label; it names no photo not to use', () => {
  const md = text('flight-lab/PHOTO-CREDITS.md');
  for (const [id, p] of all()) {
    const row = md.split('\n').find(l => l.startsWith('| `' + id + '`'));
    assert.ok(row, `${id}: a row`);
    assert.ok(row.includes(p.credit.author) && row.includes(p.credit.license) && row.includes(p.credit.source) && row.includes('| ' + p.mod + ' |'), `${id}: author, licence, source and mod in its row`);
  }
  for (const id of [...NO_IMAGE, 'ch00-photo7']) assert.ok(!md.includes(id), `${id} named`);
});

test('the record of the source pages (criterion 17): every photo checked on its page, with the credit it has now', () => {
  const rec = JSON.parse(text('textbook/rewrite/combined/reports/W22.photos.json'));
  const rows = new Map(rec.photos.map(r => [r.id, r]));
  for (const [id, p] of all()) {
    const r = rows.get(id);
    assert.ok(r, `${id}: in the record`);
    assert.equal(r.verdict, 'OK', `${id}: ${r.verdict}`);
    assert.deepEqual([r.source, r.ours.author, r.ours.license, r.ours.mod], [p.credit.source, p.credit.author, p.credit.license, p.mod], `${id}: the record is of the credit it has now`);
    // a crop shows as a different shape from the original
    assert.equal(r.shape === 'cropped', p.mod.includes('切り抜き'), `${id}: shape ${r.shape} and mod ${p.mod}`);
  }
});

test('FLIGHT LAB\'s page can drop the SRC block: src is then read from the basic course\'s FL.kiso.photos, the same bytes (DESIGN 8.2)', () => {
  const stripped = K_JS.replace(/\/\*SRC\*\/[\s\S]*?\/\*\/SRC\*\//, '{}');
  assert.ok(stripped.length < 100 * 1024 && stripped.length < K_JS.length / 10, 'the entries without their bytes are small');
  // without the basic course's data: no bytes (bk.photo then shows nothing)
  const bare = load([['book-photos-k.js', stripped]]).bookPhotosK;
  for (const p of Object.values(bare)) assert.equal(p.src, '');
  // with it (kiso-data.js, loaded after the book's files as in FLIGHT LAB): the same data URLs
  const FL2 = load([['book-photos-k.js', stripped], ['kiso-data.js', text('flight-lab/kiso/kiso-data.js')]]);
  for (const [id, p] of Object.entries(FL2.bookPhotosK)) assert.equal(p.src, K[id].src, `${id}: from FL.kiso.photos`);
});
