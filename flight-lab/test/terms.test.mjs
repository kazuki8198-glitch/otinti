// FLIGHT LAB — the table of terms (src/book-terms.js, FL.terms; textbook/rewrite/combined/DESIGN.md 3.5) (node --test).
// The file is read here on its own, in a context of its own (it is pure data and needs nothing else), so this test
// does not depend on where the shared module list (src/modules.mjs) puts it. (Arrays made in that context are compared
// after Array.from: deepEqual tells the two realms' arrays apart.)
// What it checks: the rows' shape; one name per concept (no name answers to two entries); every class-C ruling of the
// ledger (RULINGS.json, with W04's patch applied when the integrator has not yet) has its entry and its term resolves;
// the official names that cite an article of the law are in the e-Gov copy of that article, word for word, and those
// that cite the JCAB syllabus are in that JCAB-MAP row; the words the tests and CADET fix (fixed) are still where the
// table says; every common name CADET says (cadet) is in CADET's source and in the table; DESIGN 3.5's pairs to keep
// apart are kept apart; the lookups.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const at = (...p) => path.join(ROOT, ...p);
const read = p => fs.readFileSync(at(p), 'utf8');
const json = p => JSON.parse(read(p));

// the file in a context of its own: it must attach FL.terms and nothing else
const ctx = vm.createContext({});
vm.runInContext(read('flight-lab/src/book-terms.js'), ctx, { filename: 'book-terms.js' });
const FL = ctx.FL;
const T = FL.terms;
const LIST = T.list;

const LEDGERS = 'textbook/rewrite/combined/ledgers';
const RULINGS = json(`${LEDGERS}/RULINGS.json`).rows;
const JMAP = new Map(json(`${LEDGERS}/JCAB-MAP.json`).rows.map(r => [r.id, r]));
const PATCH_FILE = 'textbook/rewrite/combined/reports/W04.ledger.json';
const PATCH = fs.existsSync(at(PATCH_FILE)) ? json(PATCH_FILE).patches : [];
const EGOV = { kokuho: 'textbook/rewrite/sources/egov/articles/kokuho', kisoku: 'textbook/rewrite/sources/egov/articles/kokuho-kisoku' };
const plain = s => String(s || '').replace(/<[^>]+>/g, '');
const squeeze = s => String(s).replace(/\s+/g, '');

test('terms: the file attaches FL.terms only, 150 to 320 rows (DESIGN 3.5 planned about 150; W04 made 297) of the right shape', () => {
  assert.deepEqual(Object.keys(ctx), ['FL']);
  assert.deepEqual(Object.keys(FL), ['terms']);
  assert.ok(LIST.length >= 150 && LIST.length <= 320, `${LIST.length} terms`);
  assert.ok(Object.isFrozen(T) && Object.isFrozen(LIST) && LIST.every(Object.isFrozen), 'frozen: the products read it, nobody writes it');
  const ids = new Set();
  for (const e of LIST) {
    const w = e.id;
    assert.match(e.id, /^[a-z0-9][a-z0-9.\-]{0,39}$/, w);
    assert.ok(!ids.has(e.id), `${w} twice`); ids.add(e.id);
    assert.ok(Object.hasOwn(T.CATS, e.cat), `${w}: cat ${e.cat}`);
    assert.ok(Object.hasOwn(T.STATUS, e.status), `${w}: status ${e.status}`);
    assert.ok(typeof e.formal === 'string' && e.formal.length >= 1 && !/[<>]/.test(e.formal), `${w}: formal`);
    assert.ok(typeof e.en === 'string' && /^[A-Za-z][A-Za-z0-9 '\-,./]*$/.test(e.en), `${w}: en "${e.en}"`);
    for (const k of ['common', 'avoid', 'cadet', 'rulings', 'distinct', 'basis', 'fixed']) assert.ok(Array.isArray(e[k]), `${w}: ${k}`);
    for (const n of [...e.common, ...e.avoid, ...e.cadet]) assert.ok(typeof n === 'string' && n.trim() === n && n && !/[<>]/.test(n), `${w}: name "${n}"`);
    assert.ok(!e.common.includes(e.formal), `${w}: formal repeated in common`);
    if (e.abbr) assert.match(e.abbr, /^[A-Z][A-Za-z0-9/]*(<sub>[A-Za-z0-9]+<\/sub>)?$|^[A-Z]<sub>[A-Za-z]+<\/sub>$/, `${w}: abbr ${e.abbr}`);
    assert.equal(typeof e.note, 'string', w);
    assert.doesNotMatch(JSON.stringify(e), /TODO|TBD|PLACEHOLDER|XXX/, w);
    // where the name comes from
    if (e.status === 'official' || e.status === 'official-def') assert.ok(e.basis.length, `${w}: ${e.status} without a basis`);
    for (const b of e.basis) {
      assert.ok(Array.isArray(b) && b.length >= 2 && b.length <= 3 && b.every(x => typeof x === 'string' && x), `${w}: basis ${JSON.stringify(b)}`);
      assert.ok(Object.hasOwn(T.SOURCES, b[0].split(':')[0]), `${w}: source ${b[0]}`);
    }
    if (e.status === 'unverified') assert.match(e.note, /〔要確認〕U\.[a-z0-9-]+/, `${w}: an unverified name says so and names its UNVERIFIED row`);
    if (e.owner) assert.match(e.note, /所有者に確かめてもらう/, `${w}: owner`);
  }
  for (const s of Object.values(T.SOURCES)) assert.ok(s.title && (s.url === '' || /^https:\/\//.test(s.url)), s.title);
});

test('terms: one name per concept — no name (formal, common, abbreviation, JCAB spelling, law name, avoided) answers to two entries', () => {
  const owner = new Map();
  for (const e of LIST) for (const n of new Set([...T.names(e.id), ...e.avoid])) {
    assert.ok(!owner.has(n), `"${n}" is ${owner.get(n)} and ${e.id}`);
    owner.set(n, e.id);
  }
  const en = new Map();
  for (const e of LIST) { const k = e.en.toLowerCase(); assert.ok(!en.has(k), `English "${e.en}" is ${en.get(k)} and ${e.id}`); en.set(k, e.id); }
  // and the lookups give each name back to its own entry
  for (const [n, id] of owner) assert.equal(T.find(n).id, id, n);
  for (const e of LIST) assert.equal(T.find(e.en.toUpperCase()).id, e.id, e.en);
  assert.equal(T.find('no such term'), null);
  assert.equal(T.byId('nope'), null);
  assert.deepEqual(Array.from(T.names('nope')), []);
});

test('terms: every class-C ruling (RULINGS.json) has its entry, and its term (after W04\'s patch) is in the table', () => {
  const patched = new Map(PATCH.filter(p => /^R\./.test(p.id)).map(p => [p.id, p]));
  const C = RULINGS.filter(r => (r.classes || [r.class]).includes('C'));
  assert.ok(C.length >= 40, `${C.length} class-C rows`);
  for (const r of C) {
    if (r.termNA) { assert.equal(T.ofRuling(r.id).length, 0, `${r.id}: not a term (${r.termNA})`); continue; }
    const term = (patched.get(r.id) || {}).term ?? r.term;
    const terms = (patched.get(r.id) || {}).terms ?? r.terms ?? [];
    assert.ok(T.ofRuling(r.id).length >= 1, `${r.id} (${r.topic}): no entry lists it`);
    assert.ok(T.find(term), `${r.id}: term "${term}" is not in the table`);
    assert.ok(T.ofRuling(r.id).includes(T.find(term)), `${r.id}: "${term}" is not one of the entries that list the ruling`);
    for (const x of terms) assert.ok(T.find(x), `${r.id}: terms "${x}" is not in the table`);
    // W01's check-ledgers.mjs looks for the term in the table's JSON
    assert.ok(JSON.stringify(T).includes(term), `${r.id}: "${term}" not in JSON.stringify(FL.terms)`);
  }
  const known = new Set(RULINGS.map(r => r.id));
  for (const e of LIST) for (const rid of e.rulings) {
    assert.ok(known.has(rid), `${e.id}: ruling ${rid} is not in RULINGS.json`);
    assert.ok((RULINGS.find(r => r.id === rid).classes || []).includes('C'), `${e.id}: ${rid} is not a class-C ruling`);
  }
});

test('terms: the official names are in their sources — the e-Gov copies of the articles and the JCAB syllabus (JCAB-MAP rows)', () => {
  let law = 0, jcab = 0, notCopied = [];
  for (const e of LIST) for (const [src, place, word] of e.basis) {
    const w = word || e.formal;
    const [key, num] = src.split(':');
    if (num) {
      assert.ok(EGOV[key], `${e.id}: ${src}`);
      const f = `${EGOV[key]}/${num}.json`;
      if (!fs.existsSync(at(f))) { notCopied.push(`${e.id} ${src}`); continue; }
      const a = json(f);
      assert.ok(squeeze(a.text).includes(squeeze(w)), `${e.id}: "${w}" is not in ${a.law} ${a.label} (${place})`);
      law++;
    } else if (key === 'jcab') {
      const row = JMAP.get(place);
      assert.ok(row, `${e.id}: JCAB-MAP has no row ${place}`);
      const text = squeeze([row.title, ...(row.topics || [])].join('｜'));
      assert.ok(text.includes(squeeze(w)), `${e.id}: "${w}" is not in JCAB-MAP ${place} (${row.label} ${row.title})`);
      jcab++;
    }
  }
  assert.ok(law >= 40, `${law} names checked in the law`);
  assert.ok(jcab >= 70, `${jcab} names checked in the syllabus`);
  // the articles cited that W05 did not copy: e-Gov has them; listed so the copy can grow (manifest.json)
  assert.ok(notCopied.length <= 8, `articles not copied: ${notCopied.join(', ')}`);
});

test('terms: the words the tests and CADET fix are where the table says (fixed), and are names of their entry', () => {
  let n = 0;
  for (const e of LIST) for (const f of e.fixed) {
    assert.ok(f.file && f.text && f.why, `${e.id}: fixed ${JSON.stringify(f)}`);
    assert.ok(fs.existsSync(at(f.file)), `${e.id}: ${f.file}`);
    assert.ok(read(f.file).includes(f.text), `${e.id}: ${f.file} no longer contains ${f.text} — update the table (and the book) with the test`);
    // the fixed word itself is the formal name or one of the common names
    const core = f.text.replace(/^['/]|['/]$/g, '');
    assert.ok(T.names(e.id).some(x => f.text.includes(x) || x.startsWith(core)), `${e.id}: ${f.text} holds none of its names`);
    n++;
  }
  assert.ok(n >= 30, `${n} fixed words`);
  // DESIGN 3.5: the words FLIGHT LAB's test asks of the textbook stay, as an official or a common name
  const line = read('flight-lab/test/flight.test.mjs').match(/for \(const w of \[([^\]]+)\]\) assert\.ok\(all\.includes\(w\), w\)/);
  assert.ok(line, 'the required-words line of flight.test.mjs');
  const words = [...line[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(words, ['Vmc', 'METAR', '91.155', 'ゴーアラウンド', 'ILS', 'TEM', 'IMSAFE', '偏流修正']);
  for (const w of words.filter(w => !/^\d/.test(w))) assert.ok(T.find(w) || LIST.some(e => e.formal.startsWith(w)), w);
  assert.equal(T.find('ゴーアラウンド').id, 'go-around');
  assert.equal(T.find('Vmc').id, 'vmc-speed');
  assert.equal(T.find('偏流修正角').id, 'wca');
});

test('terms: every common name listed for CADET is in CADET\'s source and is a name of its entry', () => {
  const src = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.js$/.test(f.name)) src.push(fs.readFileSync(p, 'utf8')); } };
  walk(at('cadet/src'));
  const all = src.join('\n');
  const names = T.cadetNames();
  assert.ok(names.length >= 50, `${names.length} CADET names`);
  for (const e of LIST) for (const c of e.cadet) {
    assert.ok(all.includes(c), `${e.id}: CADET does not say "${c}"`);
    assert.ok(T.names(e.id).includes(c), `${e.id}: "${c}" is not one of its names`);
  }
  // DESIGN 3.5: the spoken words it names, and the instructor's words for the controls
  for (const w of ['エルロン', '迎え角', 'ラダー', 'スタビレーター', 'フラップ', 'トリム', 'ミクスチャー', 'マグネトー', 'ゴーアラウンド', 'フェザー', 'キャブレター ヒート']) assert.ok(names.includes(w), w);
});

test('terms: DESIGN 3.5\'s pairs are kept apart, and the decisions it names hold', () => {
  const get = id => { const e = T.byId(id); assert.ok(e, id); return e; };
  // distinct is symmetric and names real entries
  for (const e of LIST) for (const d of e.distinct) { assert.ok(T.byId(d), `${e.id} → ${d}`); assert.ok(get(d).distinct.includes(e.id), `${d} does not name ${e.id} back`); }
  // V_MC and VMC
  assert.equal(get('vmc').abbr, 'VMC'); assert.equal(plain(get('vmc-speed').abbr), 'VMC');
  assert.notEqual(T.find('VMC').id, T.find('Vmc').id);
  assert.equal(T.find('VMC').formal, '有視界気象状態');
  // 気圧高度, never 圧力高度
  assert.equal(T.find('圧力高度').id, 'pressure-altitude'); assert.ok(get('pressure-altitude').avoid.includes('圧力高度'));
  // ノータム and 航空情報; 機長 and キャプテン; 雲高 and 雲底; MSA and 最低安全高度; 地上滑走 and the ground roll
  for (const [a, b] of [['notam', 'ais'], ['pic', 'captain'], ['ceiling', 'cloud-base'], ['msa', 'min-safe-altitude'], ['taxi', 'ground-roll'], ['go-around', 'missed-approach'], ['variation', 'deviation'], ['planning-margin', 'safety-factor']]) assert.ok(get(a).distinct.includes(b), `${a} / ${b}`);
  assert.equal(T.find('MSA').formal, '最低扇形別高度');
  assert.equal(T.find('最低安全高度').abbr, null);
  // the official names DESIGN 3.5 gives as examples (the two it got wrong are flagged for the owner)
  for (const [w, id] of [['補助翼', 'aileron'], ['昇降舵', 'elevator'], ['方向舵', 'rudder'], ['着陸復行', 'go-around'], ['ウィンドシャー', 'windshear'], ['雲高', 'ceiling'], ['重量', 'weight'], ['機長', 'pic'], ['PF', 'pf']]) assert.equal(T.find(w).formal, w, `${w} (${id})`);
  assert.equal(T.find('迎角').formal, '迎え角'); assert.ok(get('aoa').owner);
  assert.equal(T.find('気化器加熱').formal, 'キャブレターヒーター'); assert.ok(get('carb-heat').owner);
  assert.deepEqual(Array.from(LIST.filter(e => e.owner), e => e.id).sort(), ['aoa', 'carb-heat']);
  // the unverified names are the two U.jcab-term-names asks about
  assert.deepEqual(Array.from(LIST.filter(e => e.status === 'unverified'), e => e.id).sort(), ['accelerate-go', 'vmc-speed']);
  // ICAO spellings (R.spelling)
  assert.equal(get('urgency').icao, 'PAN PAN'); assert.ok(get('urgency').common.includes('PAN-PAN'));
  assert.equal(get('takeoff').icao, 'take-off');
});

test('terms: the first-use form and the other lookups', () => {
  assert.equal(T.firstUse('aileron'), '補助翼（エルロン、aileron）');
  assert.equal(T.firstUse('lift'), '揚力（lift）');
  assert.equal(T.firstUse('nope'), '');
  assert.deepEqual(Array.from(T.names('stabilator')), ['スタビレーター', 'スタビレータ']);
  assert.deepEqual(Array.from(T.ofRuling('R.ceiling-term'), e => e.id).sort(), ['ceiling', 'cloud-base']);
  assert.equal(T.find(' <b>エルロン</b> ').id, 'aileron', 'tags and spaces around a name are ignored');
  assert.equal(T.find('V<sub>A</sub>').id, 'va');
  // check-style.mjs reads formal and en from FL.terms.list
  assert.ok(LIST.every(e => typeof e.formal === 'string' && typeof e.en === 'string'));
  // every category is used
  for (const c of Object.keys(T.CATS)) assert.ok(LIST.some(e => e.cat === c), c);
  // the JSON form is plain data (the glossary and the checks read it)
  const back = JSON.parse(JSON.stringify(T));
  assert.equal(back.list.length, LIST.length);
  assert.ok(back.list.every(e => e.id && e.formal));
});
