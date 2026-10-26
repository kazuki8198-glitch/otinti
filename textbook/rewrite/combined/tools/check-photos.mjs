// check-photos.mjs — DESIGN 5 章 基準 17・25 and 4.2「写真」, on the book's photos (FL.bookPhotos, and the basic
// course's photos once book-photos-k.js adds them: FL.bookPhotos or FL.bookPhotosK):
//  the credit as TEXTBOOK's test wants it ({author, license, licenseUrl, source}, license Public domain…/CC0 1.0/
//  CC BY(-SA) n.n, https links); WebP data URL, ≤ 120 KB decoded, no EXIF/XMP/ICCP, long side ≤ 1200 px, alt and
//  caption; used in a section and listed in flight-lab/PHOTO-CREDITS.md; every bk.photo('…') in the sources exists;
//  the per-photo modification label (mod); the sha256 of each photo (no two the same) and, for a photo from the basic
//  course, byte-identical to flight-lab/kiso/photo/<id>.webp; none of the photos DESIGN 4.2 says not to use (airline,
//  instrument screens, ch00-photo7, the missing ch12-photo3/4); the decoded total ≤ 4.0 MiB (the design's budget) and
//  ≤ 5 MiB (TEXTBOOK's test). For W22: which of the planned basic-course photos have a Commons file name in their
//  chapter's photoCreditsHtml.   --out FILE writes the hash list.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Result, cli, outOf } from './lib/report.mjs';
import { sectionsOf } from './lib/book.mjs';
import { photoPlan } from './lib/design.mjs';
import { kiso } from './lib/kiso.mjs';
import { FL_SRC, KISO, PHOTO_CREDITS } from './lib/paths.mjs';

export const meta = { id: 'photos', title: '写真（クレジットの形・大きさ・ハッシュ・使う写真）', criteria: [17, 25] };

export const LICENSE = /^(Public domain.*|CC0 1\.0|CC BY(-SA)? (1\.0|2\.0|2\.5|3\.0|4\.0)( [A-Za-z]+)?)$/;
export const MODS = ['無加工', '切り抜き・縮小', '縮小', '注記はパイロット基礎教材（第 3 版）で追加', '注記は本書で追加'];
const LIMIT = { one: 120 * 1024, budget: 4 * 1024 * 1024, test: 5 * 1024 * 1024, side: 1200 };
const NEVER = new Set(['ch00-photo7', 'ch12-photo3', 'ch12-photo4']);

function chunks(bytes) { const out = []; for (let o = 12; o + 8 <= bytes.length; o += 8 + bytes.readUInt32LE(o + 4) + (bytes.readUInt32LE(o + 4) & 1)) out.push(bytes.subarray(o, o + 4).toString('latin1')); return out; }
export function commonsNames() {
  const out = new Map();
  for (const c of kiso().chapters) for (const m of String(c.photoCreditsHtml || '').matchAll(/<tr><td>写真\s*(\d+)<\/td><td>[^<]*<\/td><td>([\s\S]*?)<\/td>/g)) {
    const name = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
    if (name) out.set(`${c.id.replace('kiso', 'ch')}-photo${m[1]}`, name);
  }
  return out;
}

export async function run(env) {
  const r = new Result(meta);
  const FL = env.FL, P = { ...(FL.bookPhotos || {}), ...(FL.bookPhotosK || {}), ...(FL.bookPhotosKiso || {}) };
  if (!FL.bookPhotos) r.pending('no-photos', 'book-photos.js', 'FL.bookPhotos が読み込まれていない');
  const used = new Map();
  for (const s of sectionsOf(env, { all: true })) for (const m of s.html.matchAll(/<figure class="bk-photo" data-photo="([^"]+)"/g)) used.set(m[1], [...(used.get(m[1]) || []), s.id]);
  const onlyIds = env.only ? new Set([...used.entries()].filter(([, secs]) => secs.some(x => sectionsOf(env).some(s => s.id === x))).map(([id]) => id)) : null;
  const credits = fs.existsSync(PHOTO_CREDITS) ? fs.readFileSync(PHOTO_CREDITS, 'utf8') : '';
  if (!credits) r.error('credits-page', 'flight-lab/PHOTO-CREDITS.md', 'ない');
  const plan = photoPlan(), K = kiso();
  const hashes = new Map(), list = [];
  let total = 0, uniform = 0;
  for (const [id, p] of Object.entries(P)) {
    if (onlyIds && !onlyIds.has(id)) continue;
    r.count('photos');
    const at = id;
    const m = String(p.src || '').match(/^data:image\/webp;base64,([A-Za-z0-9+/]+=*)$/);
    if (!m) { r.error('not-webp-data-url', at, 'src が WebP の data URL でない'); continue; }
    const bytes = Buffer.from(m[1], 'base64');
    if (bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WEBP') r.error('not-webp', at, 'RIFF/WEBP でない');
    if (bytes.length > LIMIT.one) r.error('too-big', at, `${bytes.length} バイト（120 KB まで）`);
    const ch = chunks(bytes); if (!ch.length || ch.some(c => ['EXIF', 'XMP ', 'ICCP'].includes(c))) r.error('metadata', at, `メタデータのチャンク（${ch.join(',')}）`);
    if (!(p.w > 0 && p.h > 0 && Math.max(p.w, p.h) <= LIMIT.side)) r.error('size', at, `${p.w}×${p.h}（長い辺 1200 px まで）`);
    if (!(p.alt && p.alt.length >= 4 && p.caption && p.caption.length >= 4)) r.error('alt-caption', at, 'alt かキャプションがない（4 字以上）');
    const c = p.credit || {};
    if (!(c.author && c.license && c.licenseUrl && c.source)) r.error('credit-shape', at, 'credit に author・license・licenseUrl・source がそろっていない');
    else {
      if (!LICENSE.test(c.license)) r.error('license-shape', at, `license "${c.license}" は TEXTBOOK のテストが許す形でない`);
      if (!/^https:\/\//.test(c.licenseUrl) || !/^https:\/\//.test(c.source)) r.error('credit-https', at, 'licenseUrl・source が https でない');
    }
    if (!used.has(id)) r.error('unused', at, 'どの節でも使っていない');
    else if (used.get(id).length > 1) r.info('used-twice', at, `${used.get(id).length} 節で使っている：${used.get(id).join('・')}`);
    if (credits && !credits.includes('`' + id + '`')) r.error('not-in-credits', at, 'PHOTO-CREDITS.md にない');
    if (p.mod === undefined) r.warn('mod-missing', at, '加工の表示（mod：無加工／切り抜き・縮小／注記はパイロット基礎教材（第 3 版）で追加／注記は本書で追加）がない');
    else if (!MODS.includes(p.mod)) r.info('mod-unknown', at, `mod "${p.mod}"`);
    const hex = crypto.createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(hex)) r.warn('duplicate-photo', at, `${hashes.get(hex)} と同じバイト`); else hashes.set(hex, id);
    const kid = p.kiso || p.fromKiso || (/^ch\d\d-photo\d+$/.test(id) ? id : null);
    if (kid) {
      if (NEVER.has(kid) || plan.notUse.has(kid)) r.error('photo-not-to-use', at, `${kid} は DESIGN 4.2 で「使わない」`);
      const f = path.join(KISO, 'photo', `${kid}.webp`);
      if (!fs.existsSync(f)) r.error('kiso-file-missing', at, `原本に ${kid}.webp がない`);
      else if (!fs.readFileSync(f).equals(bytes)) r.error('kiso-bytes-differ', at, `原本の ${kid}.webp とバイトが一致しない（ファイルのまま使う）`);
    }
    total += bytes.length;
    list.push({ id, bytes: bytes.length, sha256: hex, w: p.w, h: p.h, kiso: kid || undefined });
  }
  // how the credit line is drawn (bk.photo): one fixed "縮小などの加工あり" for every photo until mod is read
  for (const s of sectionsOf(env)) uniform += (s.html.match(/縮小などの加工あり/g) || []).length;
  if (uniform) r.info('uniform-mod-line', 'bk.photo', `${uniform} 枚の写真の下に一律の「縮小などの加工あり」（写真ごとの mod から出す：W22）`);
  if (!env.only) {
    if (total > LIMIT.test) r.error('total-test', 'all photos', `デコード後 ${total} バイト（TEXTBOOK のテストは 5 MiB まで）`);
    else if (total > LIMIT.budget) r.warn('total-budget', 'all photos', `デコード後 ${total} バイト（この設計の予算は 4.0 MiB）`);
    for (const id of NEVER) if (credits.includes('`' + id + '`') || credits.includes(id + '.webp')) r.error('credits-lists-unused', 'PHOTO-CREDITS.md', `${id} を載せている（使わない写真・画像のない写真）`);
    for (const f of fs.readdirSync(FL_SRC).filter(f => /^book-.*\.js$/.test(f) && !/photos/.test(f)))
      for (const m of fs.readFileSync(path.join(FL_SRC, f), 'utf8').matchAll(/bk\.photo\('([^']+)'\)/g)) if (!P[m[1]]) r.error('photo-missing', `${f}`, `bk.photo('${m[1]}') の写真がない（何も出ない）`);
    // the planned basic-course photos: in the book yet? a Commons file name to build the credit from?
    const names = commonsNames(), planned = [...plan.use.keys(), ...plan.conditional.keys()];
    const inBook = planned.filter(id => Object.entries(P).some(([pid, p]) => pid === id || p.kiso === id || p.fromKiso === id));
    const noName = planned.filter(id => !names.has(id));
    r.metric('basic-course photos planned (use + conditional) / in the book', `${planned.length} / ${inBook.length}`);
    r.metric('planned photos with a Commons file name in photoCreditsHtml', `${planned.length - noName.length} / ${planned.length}${noName.length ? `（ない：${noName.join('・')}）` : ''}`);
    r.metric('basic-course photo files (original)', K.photos.length);
  }
  r.metric('decoded bytes (all photos checked)', `${total}（予算 4.0 MiB = ${LIMIT.budget}、テスト 5 MiB）`);
  if (outOf(env, 'photos')) { fs.writeFileSync(outOf(env, 'photos'), JSON.stringify(list, null, 1)); r.note(`wrote ${list.length} hashes to ${outOf(env, 'photos')}`); }
  return r;
}

await cli(import.meta.url, meta, run, { usage: '[--out hashes.json]' });
