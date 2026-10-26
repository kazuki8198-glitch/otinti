# otinti

- `flight-lab/` — FLIGHT LAB：非公式の自主学習用の飛行訓練教材。ビルドすると HTML 1 ファイル（`outputs/FLIGHT-LAB.html`）になる。
- `cadet/` — CADET：姉妹作。FLIGHT LAB の 3D 表示（景色・機体・操縦席）は、CADET の `cadet/src` を読み取り専用で import し、esbuild でまとめて使っている（`flight-lab/src3d/`、`flight-lab/build.mjs`）。素材は `cadet/assets` にある。
- ルートの `*.gd` / `*.tscn` / `index.html` は別の古い作品で、FLIGHT LAB とは関係ない。

文書（README・PLAN・CREDITS）とユーザーへの説明は日本語。コードのコメントは、まわりのコードに合わせて英語。
コミットメッセージは、既存の形「`FLIGHT LAB: …`」「`CADET: …`」にそろえる。

## 環境（クラウドのセッション）

`.claude/hooks/session-start.sh` は、`.claude/settings.json` の SessionStart に登録して使う。セッションの開始時に次のものを用意する。

- Blender 5.2.3（公式の Linux 版。SHA-256 を確かめて入れる）。`blender` コマンドとして PATH に入る。
- `flight-lab/` と `cadet/` の npm の依存。three.js 0.186.1 と esbuild 0.28.2 は、両方の package.json で同じ版にしておく必要がある（違うと `flight-lab/build.mjs` の `tools()` がビルドを止める）。上げるときは両方を同時に変える。

Chromium と Playwright はクラウドのイメージに最初から入っている。撮影のスクリプトはそれを自分で見つける。
ただし、ブラウザを使うテストは Playwright が見つからないと飛ばされるだけで、失敗にはならない。

Bash の作業フォルダは次の呼び出しに持ち越されるので、コマンドはリポジトリのルートから、サブシェルで実行する。

```sh
(cd flight-lab && npm run test:fast)    # 速いテスト（中で build() も呼ぶ）
(cd flight-lab && node build.mjs)       # outputs/FLIGHT-LAB.html を作る。12 MiB 以上なら書き出さずに失敗する
(cd cadet && npm run test:fast)         # 15 MiB の上限は、この中の test/build.test.mjs が確かめる
(cd cadet && node build.mjs)            # outputs/CADET.html を作る。ビルド自体は大きさを確かめない
```

コミットしないもの：

- テスト・ビルド・撮影は `outputs/*.html` を作り直す。変わったのがビルド情報の文字列 `build YYYY-MM-DD · <git の短い rev>` だけのときは、コミットしないで `git checkout -- flight-lab/outputs/FLIGHT-LAB.html cadet/outputs/CADET.html` で戻す。
  - FLIGHT LAB では `FL.BUILD_INFO` の行、CADET では `__BUILD_INFO__` を埋め込んだ行がこれにあたる。`git diff --numstat` で `1 1` と出る。
  - この文字列は、日が変わったときだけでなく、コミットのたびにも変わる。
- `npm install` が `package-lock.json` を書き換えたときの差分も、コミットしない。

## Blender で 3D の素材を作るときの決まり

### 1. 作り方：スクリプトで再現できること

- 素材はすべて `cadet/tools/<種類>/build_<名前>.py` のスクリプトで作る。手で編集した `.blend` や、出どころの分からない模型は入れない。今あるお手本は次の 4 つ。
  - 機体：`cadet/tools/aircraft/build_archer.py`、`build_seminole.py`
  - 737：`build_737.py`
  - 人物：`cadet/tools/actor/build_actor.py`
- 実行は、ウィンドウなしのコマンドで行う。

  ```sh
  blender -b --factory-startup -P cadet/tools/<種類>/build_<名前>.py -- <引数…>
  ```

  例：Archer の作り直し（cadet/ から動かす作り。寸法の JSON を先に作る）

  ```sh
  (cd cadet && node tools/aircraft/spec.mjs > /tmp/archer.json \
    && blender -b --factory-startup -P tools/aircraft/build_archer.py -- /tmp/archer.json assets/model/archer.glb - near \
    && blender -b --factory-startup -P tools/aircraft/build_archer.py -- /tmp/archer.json assets/model/archer-far.glb - far)
  ```

  このコマンドで作り直した archer.glb と archer-far.glb は、リポジトリの物と 1 バイトも違わなかった（2026-10-26 に確認）。

- スクリプトの書き方はお手本に合わせる。
  - 引数は `--` の後ろから読む。
  - 引数と定数を読んだら、シーンを作る前に `bpy.ops.wm.read_factory_settings(use_empty=True)` を呼ぶ。
  - 乱数を使うなら種を固定し、同じ入力からは同じファイルができるようにする。
  - 先頭のコメントに次のことを書く：何を作るか、実行するコマンド、座標系、ノードの名前、COLOR_0 に何を入れたか。例は `build_archer.py` の 1〜17 行。
  - 三角形の数を print で表示する（`build_archer.py` の 892 行）。
- 寸法は、ゲームがすでに持っている値を使う。手で写さず、`node` のスクリプトで JSON に書き出して渡す（例：`cadet/tools/aircraft/spec.mjs`）。どうしても定数を写すとき（例：操縦席の窓の寸法 `WS`・`SILL`）は、出どころのファイルと名前をコメントに書く。
- 書き出し先は `cadet/assets/model/<名前>.glb`。遠くから見る版を作るときは `<名前>-far.glb`。スクリプトを変えたら、作り直した glb も同じコミットに入れる。
- 確認用の Cycles の絵は、スクリプトの任意の引数で出せるようにする（`build_archer.py` のプレビューと同じ）。ただし本当の確認は、ゲームの画面で行う（下の「5. 確かめ方」）。

### 2. glb の中身：自前の読み込み部分が読める形にする

glb を読むのは three.js の GLTFLoader ではなく、自前の読み込み部分が 2 つある。

- 機体・737 など：`cadet/src/aircraft/archer-model.js` の `modelMeshes(file)`。
- 人物：`cadet/src/npc/actor-model.js` の `actorModel(lod)`。約束が違うので、人物を作るときは `build_actor.py` と `actor-model.js` を読むこと。メッシュのデータ名を `部位.種類.色.分類` として読み、口の morph target も読む。COLOR_0 の rgb は AO で、alpha は使わない。

以下は `modelMeshes` で読む素材（人物以外）の決まり。

- **書き出しは、`build_archer.py` の 933〜937 行をそのまま写す。** 書き出す物だけを選んでから `use_selection=True` で書く。補助の物もシーンにあるので、選ばないと一緒に出てしまう。主な設定は次のとおり。
  - `export_yup=False`、`export_apply=True`、`export_materials='NONE'`
  - `export_vertex_color='ACTIVE'`、`export_texcoords=False`、`export_normals=True`、`export_tangents=False`
  - アニメーション・スキン・morph なし
- **頂点を最後の座標で作る。** オブジェクトの location・rotation・scale は単位のままにし、親子関係も付けない。
  - `export_apply` が適用するのはモディファイアだけ。オブジェクトを動かしたら、書き出す前に `transform_apply` する。
  - メッシュを持つノードに変形が付いていると、読み込みが例外を投げる。親ノードの変形は、黙って無視される。
- 1 つのメッシュに primitive は 1 つ。属性は POSITION・NORMAL・COLOR_0・インデックスの 4 つが必須で、どれかが無いと例外になる。
  - インデックスは uint8・uint16・uint32 のどれでもよい（今は uint16）。
- **COLOR_0 は VEC4 にする。** rgb が塗装の色（sRGB の値を、角の域の float の色属性にそのまま書く）、alpha が焼き込んだ陰（AO）。VEC3 にすると、例外は出ないまま AO が全部 1 になって消える。
  - COLOR_0 は「有効な色属性」にする（お手本は `me.color_attributes.active_color = col`）。
- **黙って無視されるもの：** 2 つ目以降の primitive、UV、材質。Draco・meshopt・KHR_mesh_quantization は読めず、例外になるか壊れた値になる。
- **ゲームは色の値で、ガラス・ゴム・金属を見分ける**（`cadet/src/aircraft/exterior.js` の `PAINT_CLASSES`。線形の値で判定する）。
  - 暗い色（sRGB で約 0.15 以下）はゴムになる。
  - 暗くて青い色（約 0.25 以下で、線形で b ≥ 1.8r）はガラスになる。
  - r≈b の灰色（sRGB で約 0.63〜0.80）は金属になる。
  - 新しい色を足したら、`paintClass(toLin(c))` が意図した分類になるか確かめる。
- **AO の焼き方はお手本と同じにする。** mathutils の BVHTree でレイを飛ばす（`build_archer.py` の `bake_ao`）。Cycles のベイクは使っていない。
  - Fibonacci 球で、近距離版は 40 方向、遠距離版は 24 方向。
  - 届く距離 0.9 m（プロペラと登録記号は 0.25 m）、strength 0.85、下限 0.35。
  - 遮る物は、機体全体と地面の板。
  - 737 は 36 方向・4 m。
- **ノードの名前は、コードとの約束になっている。** コードは名前で部品を探す（例：`body`・`cabin`・`ailL`・`prop`（Seminole は `prop.0`・`prop.1`）・`gearN`・`reg.<登録記号>`。737 は `body` 1 つ）。
  - お手本は、オブジェクト名とメッシュのデータ名を同じにしている。
  - 名前を変えるときは、読む側のコードも同じ変更で直す。
- **ページに埋め込まれていない glb は、エラーにならずに null になる。** 機体は簡易な形に戻り、737 は描かれない。一覧への登録（下の 3-3）を忘れても黙って消えるので、必ず画面で確かめる。

### 3. 決定事項（STEP 1 で決めた既定値。変えるときはここを書き換えてから）

1. **見た目は頂点カラーと焼き込み AO で持つ。テクスチャは使わない。**
   理由は 3 つ。今の読み込み部分は UV を読まない。操縦席のテクスチャの上限（6e6 B）は、残り約 14 KB で満杯に近い。`cadet/assets/tex` の画像は FLIGHT LAB と CADET の両方の HTML に自動で入る（1 枚足すだけで `flight-lab/test/flight.test.mjs` の 12 枚の一覧の検査が落ちる）。
   UV やテクスチャが必要になったら、先に読み込み部分とテストを直す作業を、別の段階として行う。
2. **容量の割り当て。**
   - FLIGHT LAB の HTML の空きは 5,473,841 B（10 進で約 5.47 MB）。glb は base64 で 4/3 倍になるので、元のファイルで使えるのは約 4.1 MB。
   - 1 三角形あたりのバイト数は形で違う。なめらかで頂点を共有する形（機体）は約 28 B。角の立った箱（建物・キット）は 45〜70 B で見積もる（頂点 1 つ 32 B、インデックスは 1 三角形 6 B）。

   | 使い道 | 元の glb の合計（上限） |
   |---|---|
   | 操縦席 | 1.2 MB |
   | 田舎の建物・防風林のキット | 0.4 MB |
   | 飛行場の小物（T ハンガー・地上機材・灯火の器具） | 0.4 MB |
   | 積雲 | 0.3 MB |
   | 機体の作り直し | 今の 4 ファイルの合計 1,905,472 B を超えない |
   | 予備 | 1.5 MB 以上残す |

3. **CADET と共有する部品は、共有したまま良くする。** 操縦席・機体・飛行場・建物が該当し、両方のテストを通す。
   - CADET にも入れる glb は、`cadet/build.mjs` の模型の一覧（37 行）と、`flight-lab/build.mjs` の `MODELS`（29 行）の両方に足す。
   - FLIGHT LAB にしか要らない物（遠景のキットなど）も、ファイルは `cadet/assets/model/` に置く。登録は `flight-lab/build.mjs` の `MODELS` だけにする（`flight.test.mjs` は `MODELS` そのものと比べるので、テストを直す必要はない）。
   - FLIGHT LAB の景色に足す物は、`flight-lab/src3d/world3d.js` の `createWorld` / `w.load` の中で作って scene に加え、`w.outside()` にも入れる（フードの間は隠れる）。
4. **テストの上限は勝手に上げない。** 上げる必要があるときは理由と数字を示し、ユーザーに確かめる。

### 4. 予算（テストとビルドが守っているもの）

大きさは 10 進の MB で書いている。ビルドの表示は MiB の値に「MB」と書いて出すので、少し小さく見える。

| 対象 | 上限 | いま |
|---|---|---|
| FLIGHT LAB の HTML | 12 MiB（`flight-lab/build.mjs` の `MAX_BYTES`。ビルドが止める） | 7,109,071 B |
| CADET の HTML | 15 MiB（`cadet/build.mjs` の `MAX_BYTES`。止めるのは `cadet/test/build.test.mjs` だけ） | 8,611,259 B |
| 1 フレーム | 描画 400 回未満・90 万三角形未満（`cadet/test/browser.test.mjs`。CADET でだけ確かめている） | 画質「高」で駐機場 約 53 万三角形（`cadet/PLAN.md`） |
| 操縦席 | 描画 40 回以下（Seminole 44）・4 万三角形以下・テクスチャ 6e6 B 以下（`cadet/test/cockpit.test.mjs`） | Archer 36,638 三角形・24 回、Seminole 34,130 三角形（`cp.trianglesTwin`。描画回数は未計測）、テクスチャ 5,985,621 B（`buildCockpit` をメモリ上で動かして測った） |
| Archer の外観 | 近距離版 24,000 未満・遠距離版 3,000 未満（登録記号を除く。`cadet/test/exterior.test.mjs`） | 20,940 / 2,468 |
| Seminole の外観 | 近距離版 27,000 未満・遠距離版 3,300 未満 | 25,946 / 3,101 |

`exterior.test.mjs` には下限もあり、減らしすぎても落ちる。

- 駐機の Archer：登録記号 1 つ込みで、近距離版が 18,000〜26,000、遠距離版が 2,000〜3,000、かつ遠距離版は近距離版の 1/7 未満。
- 駐機の Seminole：20,000〜30,000。

ほかにも次のことを確かめている。

- 登録記号のメッシュは、近距離版にはすべてあり、遠距離版には 1 つもないこと。
- 三角形の巻き方が法線と合い、閉じた部品の体積が正であること。
- 舵面が蝶番の線から 0.045 m 以内にあること。
- AO が 0.3〜1 であること。
- 金属色やプロペラ先端の黄色の頂点が、決まった数以上あること。

### 5. 確かめ方（素材を変えるたびに、この順で）

1. スクリプトをウィンドウなしで動かし、エラーなしで終わること。表示した三角形の数が、上の予算に入っていること。
2. 速いテスト：`(cd cadet && npm run test:fast)` と `(cd flight-lab && npm run test:fast)`。
3. ビルド：`node build.mjs` を両方で。
4. **ゲームの画面で、変更前と変更後を並べて見る。**
   - **変更前の絵は、ソースを変える前に撮る**（または `git worktree` で前の版を取り出して撮る）。FLIGHT LAB の `tools/shots.mjs` は、撮る前に自分でビルドするので、撮れるのはいつも作業中のソースになる。CADET の撮影スクリプトはビルドせず `cadet/outputs/CADET.html` を読むので、模型を変えたら先に `(cd cadet && node build.mjs)` を実行する。
   - **出力先は必ずリポジトリの外（scratchpad など）にする。** `aircraft-shots` と `cockpit-shots` は、出力フォルダを省くと、コミット済みの `cadet/docs/aircraft`・`cadet/docs/cockpit` に上書きする。
   - FLIGHT LAB の 8 場面：

     ```sh
     (cd flight-lab && node tools/shots.mjs <出力フォルダ> --pref render=three --pref quality=high [--only <名前,…>])
     ```

     `--only` に使える名前は、`01-rwy-cockpit`、`02-rwy-chase`、`03-pattern-cockpit`、`04-final-cockpit`、`05-area-chase`、`06-area-cockpit`、`07-final-pa44-cockpit`、`08-area-pa44-chase`。
   - 近くから見る絵（CADET）：
     - `(cd cadet && node test/shots.mjs high 1280 720 9.6 1,2,3,4,6)`：駐機場・滑走路・アカデミー・管制塔・上空。出力は決まった場所 `cadet/test-output/view<番号>-high-9.6.png` で、撮るたびに上書きされるので、別の場所へ写しておく。
     - `(cd cadet && node test/aircraft-shots.mjs high <出力フォルダ>)`：Archer の外観だけ（front,side,rear,nose,wing,tail,row）。Seminole の外観は、FLIGHT LAB の 07・08 で見る。
     - `(cd cadet && node test/cockpit-shots.mjs high <出力フォルダ> "" outputs/CADET.html pa28 ahead)`：5 番目の引数は `pa28`・`pa44`・`both`、6 番目は `ahead`・`quadrant`・`left`・`right`。クラウドではメモリが増えるので、1 回に 1 視点。変更前の CADET.html を別の場所に写しておけば、4 番目の引数に渡して前の版を撮れる。
   - ここはソフトウェア描画（SwiftShader）。1 場面に約 1 分かかり、フレームレートには意味がない。
   - 動的解像度（`cadet/src/core/quality.js` の `makeDynRes`）で、描画の解像度が画質「高」なら 0.7 倍まで下がる。どこまで下がるかは撮るたびに違うので、`dpr` も比べる。`cadet/test/shots.mjs` は表示し、FLIGHT LAB ではページの中の `__lab.view3d().dpr` で読める。
   - 撮った絵は自分で開いて見る。不自然な点（浮いている、縮尺が違う、のっぺりしている、ちらつく、すき間がある）を挙げて直してから報告する。
5. 必要に応じて使う道具：
   - `(cd cadet && node test/perf.mjs high apron,seminole)`：一番混む場所の描画回数と三角形の数。操縦席は 1 回に 1 か所で別に実行する。
   - `(cd flight-lab && node tools/view3d-check.mjs <出力フォルダ>)`：3D 表示の点検。
   - 全部のテスト：`npm test` を両方で（ブラウザを使うので遅い）。
6. 記録を残す。
   - `cadet/assets/CREDITS.md` に、作り方と実行コマンドを書く。
   - 変更前と変更後の絵を `cadet/docs/<話題>/` か `flight-lab/docs/` に置く。
   - README と PLAN の該当する節を直す。
   - `outputs/*.html` を作り直してコミットする。

### 6. 光の状態に注意

今の描画の設定は、どんな模型も平板に見せる。原因はどれもコード側にあり、Blender では直らない。

- **ブルーム：** しきい値 8.0（`cadet/src/render/post.js` 117 行）。地平線の空の HDR 値は約 2.5〜11 で、太陽の方位側だけがしきい値を超えるため、後方視点の画面に縦の継ぎ目が出る。
- **霞：** 昼の霞の色 uHaze（`post.js` 143 行の setHaze。約 (0.52, 0.62, 0.78)）が、空の地平線よりずっと暗い。
- **環境光：** 環境光の元の envScene が空だけで、地面の照り返しがない（`cadet/src/render/sky.js` 69〜71 行、108 行）。three の Sky は下半分を地平線の色で埋めるので、下向きの面が明るすぎる。
- **映り込み：** `envMap` を指定していないので、three.js が `envMapIntensity` を `scene.environmentIntensity`（0.5。`sky.js` 112 行）で上書きしている（`WebGLRenderer.js` 2736〜2740 行）。材質ごとの `envMapIntensity`（`exterior.js` の 1.1、`materials.js` の 1.4、`cockpit.js` の 1.1 など）は、今はどれも効いていない。いじっても見た目は変わらない。

この光を直す前に新しい模型の良し悪しを判断するときは、この影響を割り引いて見る。
