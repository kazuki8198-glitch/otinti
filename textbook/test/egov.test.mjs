// TEXTBOOK — the copies of Japan's law (node --test, no browser): textbook/rewrite/sources/egov/ (W05) holds the articles of
// 航空法 and 航空法施行規則 the combined book cites, each copied from e-Gov at a fixed version (DESIGN 3.4, 5 章 基準 4).
// check.mjs (no network) checks: the manifest, the index and the files name the same articles; each copy's version, dates,
// URLs and sha256; the text rebuilt from e-Gov's own element; and every quotation and number of the 47 items' Japanese
// column (jur-japan.json) is in the article it names, with the item IDs those of DESIGN 3.4.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runChecks } from '../rewrite/sources/egov/check.mjs';

test('e-Gov の条文の写し（W05）：メタデータ・文字・47 項目の引用と数', () => {
  const r = runChecks();
  assert.equal(r.failed, 0, r.failures.join('\n'));
  assert.ok(r.passed > 0);
});
