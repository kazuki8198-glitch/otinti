// TEXTBOOK — test/load.mjs: FLIGHT LAB's modules in FL_MODULES order (from ../flight-lab/src, as the page does), then
// this page's render.js, into this Node context (the same way as cadet/test/content.test.mjs). No DOM.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { FL_MODULES } from '../build.mjs';
import { modulePath } from '../../flight-lab/src/modules.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
export function loadBook() {
  if (!globalThis.FL || !globalThis.FL.book) {
    for (const m of FL_MODULES) vm.runInThisContext(fs.readFileSync(modulePath(m), 'utf8'), { filename: m });
    vm.runInThisContext(fs.readFileSync(path.join(here, '../src/render.js'), 'utf8'), { filename: 'render.js' });
  }
  return { FL: globalThis.FL, R: globalThis.TB.make(globalThis.FL) };
}
// the book's fixed numbers (updated with each rewritten chapter: textbook/rewrite/PROGRESS.md; each change is logged in
// textbook/rewrite/combined/TEST-CONSTANTS.md)
//  parts (FL.book.PARTS: the front part 序部 p0 and parts 1–6), chapters, secs, quiz, terms, examples, cautions,
//  refs (source links in the end matter), lessons (end matter), figs (SVG figures), photos (bk.photo uses), calcs (calculators), simTags (lesson buttons inside "シミュレータで体験" boxes), details (考えてみよう), folds (もっと深く・計算演習: bk.deep, bk.drill)
export const COUNTS = { parts: 7, chapters: 34, secs: 208, quiz: 213, terms: 741, examples: 115, cautions: 94, refs: 446, lessons: 75, figs: 174, photos: 50, calcs: 10, simTags: 71, details: 178, folds: 50 };
export const ORDER = ['intro', 'basics', 'english', 'sim', 'aero', 'sys', 'inst', 'perf', 'wb', 'wx', 'navb', 'law', 'radio1', 'radio2', 'radio3', 'radio4', 'radio5', 'hf', 'adm', 'g1', 'ground', 'ops', 'tl', 'emg', 'solo', 'navp', 'navr', 'navd', 'ifr', 'ifrp', 'me', 'oei', 'crm', 'jet'];
export const NOTICE = [
  'このページは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH/AFM、SOP、航空法規を優先してください。',
  'ANA の公式ソフトウェア・公式教材ではありません。',
  'NOT FOR NAVIGATION',
  '本文の『この教材』『本アプリ』『このシミュレータ』は FLIGHT LAB（シミュレータのアプリ）のことです。キー操作・メニュー・飛行課目・学科テスト・英語交信のページは、このページにはありません。',
];
export const SEC_NOTE = '本文は公開情報に基づく要約と教材の説明です。数値は仮想教材値または出典のある参考値（機体ごとに要確認）。実機訓練・教官・POH/AFM・SOP・航空法規を優先してください。';
export const APP_NOTE = 'この節は FLIGHT LAB（アプリ）の使い方の説明です。このページでは操作できません。';
