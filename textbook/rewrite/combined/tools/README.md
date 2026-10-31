# 合本の検査の道具（W01）

DESIGN.md 5 章の 26 の基準のうち、数で測れるものを調べる道具です。**今は「報告だけ」**：数と問題の場所を出し、終了コードは 0 です。版ごとに `--strict`（全部）か `--strict=style,figures`（その検査だけ）で「止める」に切り替えます（error があると終了コード 1）。

どの道具も、製品と同じ読み込みの列（`textbook/build.mjs` の `FL_MODULES`。`flight-lab/src/modules.mjs` があればその `modulePath`）で `FL.book` を新しい vm の中に読み込み、何も書きません（`--write-hashes` と `--…-out` を除く）。文字の検査は、写真の `data:image/webp;base64,…` を**先に消してから**行います。台帳（`textbook/rewrite/combined/ledgers/*.json`）がないときは止まらず、`pending` として数えます。

## 使い方

```sh
node textbook/rewrite/combined/tools/check-all.mjs              # 全部の検査と、1 つのまとめの表
node textbook/rewrite/combined/tools/check-all.mjs --details    # 各検査の問題の場所も（--limit=N / --all）
node textbook/rewrite/combined/tools/check-chapter.mjs aero     # 1 章（今の本の章）
node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/basics.js   # 下書き（登録の前）
node textbook/rewrite/combined/tools/check-style.mjs --all      # 1 つの検査だけ（どの check-*.mjs も単独で動く）
node textbook/rewrite/combined/tools/selftest.mjs               # 道具そのものの検査（わざと問題を入れた下書きで）
```

共通のオプション：`--strict[=ids]`・`--details`・`--all`・`--limit=N`・`--json FILE`（全部の結果）・`--no-browser`（図の Chromium の検査を省く）・`--only=ids`（check-all）。追加の出力：単独で動かすときは `--out`、check-all・check-chapter では `--claims-out=FILE`（主張の一覧）・`--photos-out=FILE`（写真のハッシュ）・`--figures-out=DIR`（問題のある図の 390 px の PNG）。

## 検査（id → ファイル → DESIGN の基準）

| id | ファイル | 調べること |
|---|---|---|
| chapters | check-chapters.mjs | FLIGHT LAB と TEXTBOOK のテストが章に求める条件（各節 200 字超・用語 3・例と注意・理由つきの 4 択 2 問・https の出典・リンクの行き先・TODO などなし・`<a>` は写真のクレジットだけ）（25） |
| form | check-form.mjs | 節の形（ねらい → 最初の図 → 説明 → 囲み → ここが大切（2〜4 項目・60 字以内）→ … → シミュレータが最後、写真は最初の図より後）（3.2） |
| data | check-data.mjs | 節のデータ（from・deep・use・jcab・faa）と ID の形、DESIGN 3.3 の部と違う章（11・6.2 の決まり 1） |
| style | check-style.mjs | です・ます、体言止め、1 文の平均 40 字・最長 80 字、留保の言い方は 1 節 1 回、数字と単位の間の空白、（FL.terms があれば）用語の初出の形（21） |
| volume | check-volume.mjs | 本文の量（1.2 の数え方）：序部〜第 6 部の「まず読む」本文（deep の節と折りたたみ `bk.deep`・`bk.drill` を除く。所有者の判断 12）は今の教科書 約 18.2 万字の 1.4 倍まで（超えたら error）。部ごとの予算（`ledgers/VOLUME.json`）を超えた部は warn。部と章の内訳、折りたたみの外が 200 字未満の節は info（22） |
| jurisdiction | check-jurisdiction.mjs | 全節に scope、米国の規則の言葉は us の範囲・米国の囲み・「米国」と書いた文だけ、日本の規則の言葉は jp の範囲・日本の囲みだけ（8）。scope のない節は DESIGN 3.3 の「範囲」の列で調べる |
| chapter-refs | check-chapter-refs.mjs | 出典の前置き（PHAK・AFH・AIM・基礎教材 など）のない直書きの「第 N 章」（6.2 の決まり 2・3） |
| claims | check-claims.mjs | 数字と単位・条番号・法令名を含む文を抜き出し、主張の台帳 CLAIMS.json の札と照らす（3）。「教材値」だけで「参考値」のない節（6、info）。台帳の行の文が本のどこにもないときだけ「本にない」（info）。抜き出さない文（手で足した `#hand-` の行・単位のない数・表）が本にある行は数だけ（R2 の統合） |
| ledgers | check-ledgers.mjs | 台帳 ERRATA.json・RULINGS.json の全行が閉じて（直した場所か誤りでない理由）、直した人と別の確認役の署名。RULINGS の A は日米の項目、C は用語を持つ。UNVERIFIED.json の数（1・2） |
| questions | check-questions.mjs | 正解は 1 つ・正解の位置（各 15〜35%）・理由と根拠・今の 14 分野に日本の法令なし・`{ch:}` は CADET にある章だけ・記述問題の構造（18〜20） |
| photos | check-photos.mjs | クレジットの形（TEXTBOOK のテストと同じ）・大きさ・メタデータ・使用・PHOTO-CREDITS.md・加工の表示 mod・ハッシュ・基礎教材の写真はバイト一致・使わない写真（17・25） |
| figures | check-figures.mjs | viewBox の幅 360〜440・aria-label＝キャプション・白い板なし・XML・同じ章で id の重なりなし、Chromium の 390 px で文字の箱が図の中・重なりなし・最小 10 px（字の幅の広いフォントでのはみ出しの見込み、切れる図形は warn）（16） |
| provenance | check-provenance.mjs | 原本 `flight-lab/kiso/` が変わっていない（git と sha256：`data/kiso-sha256.json`）、由来表 PROVENANCE.json が 393 節・376 問・161 図・85 写真を 1 回ずつ、節の from（10・11） |
| maps | check-maps.mjs | JCAB-MAP.json・ACS-MAP.json の全見出しが節か「対象外（理由）」（12・13） |
| concepts | check-concepts.mjs | 太字の定義 `<b>語（English）</b>`・`<b>正式名（通称、English）</b>`（括弧の中に英語）は本の中で 1 回、概念の住所と「思い出そう」（3 行以内・リンク）。台帳 CONCEPTS.json がなければ DESIGN 3.2 の既知の対（15） |
| jur | check-jur.mjs | 日米の 47 項目が、囲み（`data-jur="<項目 ID>"`）・部のまとめ・第 7 部の 3 か所にあり、囲みの数字が FL.jur と同じ（9） |
| calc | calc-check.mjs | 計算の例を式で計算し直し、本にその数字が出ているか（`data/calc-seed.json` と台帳 CALC.json）（5） |
| path | check-path.mjs | 課目の節は同じか前の部・後ろの部への bk.see は「予告」つきで 40 本まで・部の扉の思い出す節・まとめの問いの 30% が前の部（23） |
| egov | check-egov.mjs | e-Gov の写し（`textbook/rewrite/sources/egov/`、W05）の検査 `check.mjs` の `runChecks()`、本文と章末の航空法・施行規則の条番号が写しにある・同じ文の数（m・ft・kt・hPa・分・日など）が引いた条にある（4）。統合 P1 で追加 |

台帳を別のフォルダから読むとき（試すとき）は、環境変数 `COMBINED_LEDGERS=<フォルダ>` を付けます（`selftest.mjs` が使う）。

## 台帳の形（W03 と取り決めたい形。道具は名前の違いをある程度吸収する）

正本は W03 の [`../ledgers/README.md`](../ledgers/README.md)（項目名・状態・署名・パッチの形）。下は道具が読む最小の形です。

- `CLAIMS.json`：`[{ id: "<節ID>#<8 桁>", sec, text, tag: "教材値|参考値|条文|推測・要確認", source, checkedBy }]`。`id` は `check-claims.mjs --out` が出す値
- `PROVENANCE.json`：`[{ id: "kiso05.14", kind, to: ["wb.shift"], reason }]`（行き先か外した理由のどちらか）
- `JCAB-MAP.json`・`ACS-MAP.json`：`[{ id, subject, title, sections: [...], excluded: "理由" }]`
- `CONCEPTS.json`：`[{ name, address: "sys.g1000", recalls: ["ifr.instr"] }]`
- `ERRATA.json`・`RULINGS.json`：`[{ id, status: "open|fixed|not-error", where, reason, fixedBy, checkedBy, class: "A|B|C", jur, term }]`
- `CALC.json`：`[{ id, sec, expr, vars, data, expect, tol, show }]`（`calc-check.mjs` の頭の説明）

## 囲みの印（W06 と取り決めたい形）

日米の囲みは `bk-jur`・`bk-us`・`bk-jp`・`bk-same` のクラスに、項目の ID を `data-jur="alt.transition"` で持たせます。`bk-jur` の列は `jur-us`・`jur-jp`。部のまとめの表と第 7 部の節も、項目ごとに `data-jur` を付けます。
