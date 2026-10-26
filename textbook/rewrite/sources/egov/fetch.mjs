#!/usr/bin/env node
// textbook/rewrite/sources/egov/fetch.mjs — manifest.json の条文を e-Gov 法令 API v2 から写す（ネットワークを使う）。
//
//   node textbook/rewrite/sources/egov/fetch.mjs            写して articles/ と index.json を書き直す
//   node textbook/rewrite/sources/egov/fetch.mjs --dry-run  写すが書かない（版が今も施行中か・条文が変わったかを見る）
//   オプション：--date=YYYY-MM-DD（確認日。ふだんは今日の日本時間）
//
// すること：
//   1. 法令ごとに law_revisions を引き、manifest の版（law_revision_id）が今も「施行中（CurrentEnforced）」かと、
//      それより新しい版（未施行を含む）を index.json に記録する。版は manifest で固定しているので、新しい版があっても勝手に乗り換えない。
//   2. 法令の全文（law_data・JSON）を 1 回引いて、条ごとに e-Gov の画面のアンカー（例 Mp-Ch_6-Se_1-At_63）を求める。
//   3. 条ごとに law_data を elm=MainProvision-Article_<番号> で引き直し、全文の中の同じ条と 1 文字も違わないことを確かめる。
//   4. 条ごとに articles/<法令キー>/<番号>.json（メタデータ・文字・e-Gov の要素そのもの）を書き、最後に index.json を書く。

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { EGOV_DIR, ARTICLES_DIR, INDEX_FILE, MANIFEST_FILE, renderArticle, plainText, sha256, articleLabel, reiwaLabel } from './lib.mjs';

const API = 'https://laws.e-gov.go.jp/api/2';
const WEB = 'https://laws.e-gov.go.jp/law';
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const dateArg = (args.find(a => a.startsWith('--date=')) || '').slice(7);
const TODAY = dateArg || new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      // fetch がプロキシを通れない環境のために curl でも試す
      try {
        const out = execFileSync('curl', ['-sS', '-f', '-m', '120', url], { maxBuffer: 64 * 1024 * 1024 });
        return JSON.parse(out.toString('utf8'));
      } catch (e2) {
        if (attempt === 3) throw new Error(`${url}: ${e.message} / curl: ${e2.message}`);
        await sleep(1000 * attempt);
      }
    }
  }
}

const isStr = n => typeof n === 'string';
const SHORT = { Part: 'Pa', Chapter: 'Ch', Section: 'Se', Subsection: 'Ss', Division: 'Di' };

/** 全文から本則の条を集め、e-Gov の画面のアンカー（xpath）を付ける。 */
function collectArticles(lawFullText) {
  const map = new Map();
  (function walk(n, trail) {
    if (isStr(n)) return;
    if (n.tag === 'SupplProvision' || n.tag === 'AppdxTable' || n.tag === 'AppdxStyle') return; // 附則・別表は今は写さない
    if (n.tag === 'Article') {
      map.set(n.attr.Num, { node: n, xpath: ['Mp', ...trail, `At_${n.attr.Num}`].join('-') });
      return;
    }
    const t = SHORT[n.tag] ? [...trail, `${SHORT[n.tag]}_${n.attr.Num}`] : trail;
    for (const c of n.children || []) walk(c, t);
  })(lawFullText, []);
  return map;
}

/** 語の数え上げ：全文（ふりがなを除く）での回数と、本則のどの条に出るか。 */
function countTerms(lawFullText, arts, terms) {
  const count = (s, t) => s.split(t).length - 1;
  const whole = plainText(lawFullText);
  const out = {};
  for (const t of terms) {
    const total = count(whole, t);
    const inArticles = [];
    let inMain = 0;
    for (const [num, { node }] of arts) {
      const c = count(plainText(node), t);
      if (c) { inArticles.push(num); inMain += c; }
    }
    out[t] = { total, articles: inArticles, outsideMainProvision: total - inMain };
  }
  return out;
}

function writeArticle(file, meta, node) {
  let s = JSON.stringify(meta, null, 2);
  s = s.slice(0, -2) + ',\n  "node": ' + JSON.stringify(node) + '\n}\n';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, s);
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  const index = {
    about: 'e-Gov 法令検索（API v2）から写した条文の索引。版（施行日）は manifest.json で固定。fetch.mjs が書く（手で直さない）。',
    source: 'e-Gov 法令検索 https://laws.e-gov.go.jp/ （API v2：https://laws.e-gov.go.jp/api/2/）',
    fetched: TODAY,
    fetchedAt: new Date().toISOString(),
    dateNote: '日付（fetched・checked）は日本時間の日付。fetchedAt は UTC の時刻。',
    laws: [],
    articles: [],
  };
  const changes = [];

  for (const law of manifest.laws) {
    process.stdout.write(`${law.title}（${law.revisionId}）\n`);
    const revs = await getJson(`${API}/law_revisions/${law.lawId}?response_format=json`);
    const mine = revs.revisions.find(r => r.law_revision_id === law.revisionId);
    if (!mine) throw new Error(`${law.title}: 版 ${law.revisionId} が e-Gov の版の一覧にありません`);
    const newer = revs.revisions
      .filter(r => r.amendment_enforcement_date && r.amendment_enforcement_date > mine.amendment_enforcement_date)
      .map(r => ({
        revisionId: r.law_revision_id, version: r.amendment_enforcement_date, status: r.current_revision_status,
        amendment: r.amendment_law_title + (r.amendment_law_num ? `（${r.amendment_law_num}）` : ''),
      }));
    if (mine.current_revision_status !== 'CurrentEnforced') {
      process.stdout.write(`  注意：固定した版は今「${mine.current_revision_status}」です（新しい施行中の版があります）\n`);
    }
    for (const n of newer) process.stdout.write(`  新しい版：${n.version}（${n.status}）${n.amendment}\n`);

    await sleep(300);
    const full = await getJson(`${API}/law_data/${law.revisionId}?response_format=json&law_full_text_format=json`);
    const ri = full.revision_info;
    const li = full.law_info;
    if (ri.law_revision_id !== law.revisionId) throw new Error(`${law.title}: 返ってきた版が違います（${ri.law_revision_id}）`);
    const arts = collectArticles(full.law_full_text);
    const version = ri.amendment_enforcement_date;
    const [ymd, amend] = [version.replace(/-/g, ''), ri.amendment_law_id];
    const lawEntry = {
      key: law.key,
      title: ri.law_title,
      lawId: li.law_id,
      lawNum: li.law_num,
      lawType: li.law_type,
      revisionId: ri.law_revision_id,
      version,
      versionLabel: `${reiwaLabel(version)}施行`,
      amendment: ri.amendment_law_title + (ri.amendment_law_num ? `（${ri.amendment_law_num}）` : ''),
      egovUpdated: ri.updated,
      url: `${WEB}/${li.law_id}/${ymd}_${amend}`,
      checked: TODAY,
      statusOnChecked: mine.current_revision_status,
      newer,
      articles: 0,
      terms: countTerms(full.law_full_text, arts, (manifest.searchTerms && manifest.searchTerms.terms) || []),
    };

    for (const want of law.articles) {
      const found = arts.get(want.num);
      if (!found) throw new Error(`${law.title}: ${articleLabel(want.num)}（Num=${want.num}）が本則にありません`);
      await sleep(250);
      const elmUrl = `${API}/law_data/${law.revisionId}?response_format=json&law_full_text_format=json&elm=MainProvision-Article_${want.num}`;
      const one = await getJson(elmUrl);
      const node = one.law_full_text;
      if (JSON.stringify(node) !== JSON.stringify(found.node)) {
        throw new Error(`${law.title}${articleLabel(want.num)}: elm で引いた条と全文の中の条が違います`);
      }
      const text = renderArticle(node);
      const ref = `${law.key}:${want.num}`;
      const titleNode = node.children.find(c => !isStr(c) && c.tag === 'ArticleTitle');
      const capNode = node.children.find(c => !isStr(c) && c.tag === 'ArticleCaption');
      const meta = {
        ref,
        law: ri.law_title,
        lawKey: law.key,
        lawId: li.law_id,
        lawNum: li.law_num,
        revisionId: ri.law_revision_id,
        version,
        versionLabel: lawEntry.versionLabel,
        num: want.num,
        article: plainText(titleNode),
        label: articleLabel(want.num),
        caption: capNode ? plainText(capNode) : '',
        url: `${lawEntry.url}#${found.xpath}`,
        api: elmUrl,
        fetched: TODAY,
        checked: TODAY,
        use: want.use || [],
        sha256: sha256(text),
        text,
      };
      const file = path.join(ARTICLES_DIR, law.key, `${want.num}.json`);
      if (fs.existsSync(file)) {
        const old = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (old.sha256 !== meta.sha256 || old.revisionId !== meta.revisionId) changes.push(`${ref}：文字が変わった（${old.revisionId} → ${meta.revisionId}）`);
      } else changes.push(`${ref}：新しく写した`);
      if (!DRY) writeArticle(file, meta, node);
      index.articles.push({ ref, law: ri.law_title, label: meta.label, article: meta.article, caption: meta.caption, file: path.relative(EGOV_DIR, file), use: meta.use, sha256: meta.sha256 });
      lawEntry.articles++;
      process.stdout.write(`  ${meta.label}${meta.caption}\n`);
    }
    // これより新しい版（未施行を含む）で、写した条が変わるかを見ておく（版は乗り換えない）
    for (const nw of lawEntry.newer) {
      await sleep(300);
      const nf = await getJson(`${API}/law_data/${nw.revisionId}?response_format=json&law_full_text_format=json`);
      const narts = collectArticles(nf.law_full_text);
      nw.changedArticles = [];
      for (const want of law.articles) {
        const mineText = renderArticle(arts.get(want.num).node);
        const other = narts.get(want.num);
        if (!other || renderArticle(other.node) !== mineText) nw.changedArticles.push(want.num);
      }
      nw.comparedOn = TODAY;
      process.stdout.write(`  ${nw.version} の版で変わる写しの条：${nw.changedArticles.length ? nw.changedArticles.map(articleLabel).join('・') : 'なし'}\n`);
    }
    index.laws.push(lawEntry);
  }

  if (!DRY) fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n');
  process.stdout.write(`\n${index.articles.length} 条（${index.laws.map(l => `${l.title} ${l.articles}`).join('・')}）。確認日 ${TODAY}${DRY ? '（--dry-run：書いていない）' : ''}\n`);
  if (changes.length) process.stdout.write(`変わったもの：\n  ${changes.join('\n  ')}\n`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
