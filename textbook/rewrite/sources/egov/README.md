# e-Gov の条文の写し（`sources/egov/`）

合本（`textbook/rewrite/combined/DESIGN.md`）が日本の決まりを書くときに照らす、航空法と航空法施行規則の条文の写しです。e-Gov 法令検索の API v2 から、版（施行日）を固定して写しました。本・学科テスト・製品はこのフォルダを読みません（テストと道具だけが読みます）。

## 固定した版（2026-10-27 に e-Gov で確認）

| 法令 | 法令 ID | 版（施行日） | law_revision_id | 写した条 |
|---|---|---|---|---|
| 航空法（昭和二十七年法律第二百三十一号） | 327AC0000000231 | 令和 7 年 12 月 1 日施行（航空法等の一部を改正する法律（令和七年法律第五十五号）） | 327AC0000000231_20251201_507AC0000000055 | 26 |
| 航空法施行規則（昭和二十七年運輸省令第五十六号） | 327M50000800056 | 令和 8 年 10 月 1 日施行（船員法施行規則等の一部を改正する省令（令和八年国土交通省令第八十二号）） | 327M50000800056_20261001_508M60000800082 | 37 |

- 確認した日は、どちらの版も e-Gov で「施行中（CurrentEnforced）」でした。
- 航空法第 73 条（機長の権限）は、R1 の P5 の統合（2026-10-29）で足しました（序部の `basics.crew` が引くため）。その条だけを `fetch.mjs` と同じ手順（固定した版が今日も施行中であること・`elm` で引いた条と全文の中の条が 1 文字も違わないこと）で写し、写した日と確認した日は 2026-10-29 です。ほかの条の写しと `index.json` の法令の確認日（2026-10-27）はそのままです。
- 施行規則には、まだ施行されていない新しい版（2028-04-01 施行・令和七年国土交通省令第五十八号）があります。写した 37 条の文字は、その版でも変わりません（`index.json` の `newer[].changedArticles` が空）。
- 日付は日本時間の日付です（`index.json` の `fetchedAt` は UTC の時刻）。
- e-Gov に告示・通達・AIP はありません（API で題に「航空法」を含む法令は 16 件で、どれも法律・政令・省令）。告示で決まる値（施行規則第 5 条の告示の空港、第 206 条の「国土交通大臣が定める時間」、第 202 条の連絡方法など）は、この写しでは確かめられません。

## ファイル

| ファイル | 中身 |
|---|---|
| `manifest.json` | 写す条の一覧（法令・版・条の番号・その条を引く 47 項目の ID と節）と、語の数え上げの語。**条を足すときはここに足す** |
| `fetch.mjs` | `manifest.json` の条を e-Gov から写し、`articles/` と `index.json` を書き直す（ネットワークを使う） |
| `articles/<法令キー>/<番号>.json` | 1 条ずつの写し。法令キーは `kokuho`（航空法）と `kokuho-kisoku`（航空法施行規則）。番号は e-Gov の Num（第七十一条の二 → `71_2`） |
| `index.json` | 索引（法令ごとの版・確認日・新しい版・語の数え上げ、条ごとのファイルと sha256）。`fetch.mjs` が書く。手で直さない |
| `jur-japan.json` | DESIGN 3.4 の 47 項目の日本の欄を写しと照らした結果（確かめた・直す・一部・e-Gov にない・定めなしを確認）。引用と数は `check.mjs` が写しで確かめる |
| `lib.mjs` | 読む道具（下の「テストから使う」） |
| `check.mjs` | 写しの検査。`lib.mjs` の道具も全部ここから読める |

1 条の写しの形：

```json
{
  "ref": "kokuho-kisoku:178", "law": "航空法施行規則", "lawKey": "kokuho-kisoku",
  "lawId": "327M50000800056", "lawNum": "昭和二十七年運輸省令第五十六号",
  "revisionId": "327M50000800056_20261001_508M60000800082",
  "version": "2026-10-01", "versionLabel": "令和8年10月1日施行",
  "num": "178", "article": "第百七十八条", "label": "第178条", "caption": "（気圧高度計の規正）",
  "url": "https://laws.e-gov.go.jp/law/327M50000800056/20261001_508M60000800082#Mp-Ch_6-At_178",
  "api": "https://laws.e-gov.go.jp/api/2/law_data/…?…&elm=MainProvision-Article_178",
  "fetched": "2026-10-27", "checked": "2026-10-27", "use": ["alt.transition", "basics.alt", …],
  "sha256": "…", "text": "（気圧高度計の規正）\n第百七十八条　機長は、…",
  "node": { "tag": "Article", … }
}
```

- `text` は e-Gov の画面の並び（条の見出し、「第百七十八条　…」、「２　…」、号「一　…」、細目「イ　…」）。表は 1 行を 1 行に、欄を「｜」でつなぎます。ふりがな（Rt）は外します（「勾配」）。
- `node` は API が返した条の要素そのもの。`check.mjs` は `node` から `text` を作り直して、1 文字も違わないことを確かめます（だから `text` を手で直すと検査が落ちます）。
- `url` は e-Gov の画面のその版のその条、`api` はその条だけを返す API の URL です。

## 使い方

```sh
node textbook/rewrite/sources/egov/check.mjs            # 検査（ネットワークなし）。失敗があれば終了コード 1
node textbook/rewrite/sources/egov/fetch.mjs --dry-run  # e-Gov で版が今も施行中か・文字が変わったかを見る（書かない）
node textbook/rewrite/sources/egov/fetch.mjs            # 写し直す（manifest.json を変えたとき）
```

版を新しくするときは、`manifest.json` の `revisionId` を変えて `fetch.mjs` を流し、`check.mjs` と、写しを使うテストを流します。版の変更は本の「e-Gov の版と確認日」にも響くので、W06 の `book-jur.js` もそろえます。

## テストから使う

```js
import { assertNumberInArticle, assertTextInArticle, articleHasNumber, parseCitations, loadArticle, runChecks }
  from '../rewrite/sources/egov/check.mjs';

assertNumberInArticle('kokuho-kisoku:178', 14000, 'ft');   // 「一万四千フート」がある（漢数字を数に直して比べる）
assertNumberInArticle('kokuho-kisoku:178', 1013.2, 'hPa'); // 「一、〇一三・二ヘクトパスカル」
assertNumberInArticle('kokuho-kisoku:5', 5000, 'm');       // 「五千メートル」
assertTextInArticle('kokuho:64', '日没から日出までの間');  // 文字どおりに出てくる
parseCitations('航空法施行規則第 198 条の 4・第 206 条').flatMap(c => c.refs);
// → ['kokuho-kisoku:198_4', 'kokuho-kisoku:206']（法令名のない「第 n 条」は前の法令名を引き継ぐ。「第 180〜186 条」は全部に広げる）
```

- 単位は `m`・`km`・`ft`・`kt`・`hPa`・`kg`・`min`・`h`・`d`（日）・`mo`・`yr`・`%`・`°`・`times`（回）・`age`（歳）か、e-Gov の書き方（`メートル` など）。単位を省くと、単位のない数も含めて探します。
- 数の読み方：「一万四千」→ 14000、「千五百」→ 1500、「二百五十」→ 250、「一、〇一三・二」→ 1013.2、「二九、〇〇〇」→ 29000、「三十七・五」→ 37.5、全角の数字も読みます。「十分に」のような数でない「十」も 10 と読むので、単位つきで確かめるほうが確かです。
- 写しにない条は `loadArticle` が `null` を返し、`assert…` は「manifest に足して fetch.mjs を流す」と言って例外を出します。
