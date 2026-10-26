# otinti

- `flight-lab/` — FLIGHT LAB：非公式の自主学習用の飛行訓練教材。ビルドすると HTML 1 ファイル（`outputs/FLIGHT-LAB.html`）になる。
- `cadet/` — CADET：姉妹作。FLIGHT LAB の 3D 表示（景色・機体・操縦席）は、CADET の `cadet/src` を読み取り専用で import し、esbuild でまとめて使っている（`flight-lab/src3d/`、`flight-lab/build.mjs`）。素材は `cadet/assets` にある。
- ルートの `*.gd` / `*.tscn` / `index.html` は別の古い作品で、FLIGHT LAB とは関係ない。

文書（README・PLAN・CREDITS）とユーザーへの説明は日本語。コードのコメントは、まわりのコードに合わせて英語。
コミットメッセージは、既存の形「`FLIGHT LAB: …`」「`CADET: …`」にそろえる。

## 環境（クラウドのセッション）

`.claude/hooks/session-start.sh` が、セッションの開始時に次のものを用意する。

- `flight-lab/` と `cadet/` の npm の依存（three.js 0.186.1、esbuild。版は両方の package.json で同じに固定されている）
- Blender 5.2.3（公式の Linux 版。SHA-256 を確かめて入れる）。`blender` コマンドとして PATH に入る。

Chromium と Playwright はクラウドのイメージに最初から入っている。撮影のスクリプトはそれを自分で見つける。

よく使うコマンド：

```sh
cd flight-lab && npm run test:fast      # 速いテスト（ブラウザなし）
cd flight-lab && node build.mjs         # outputs/FLIGHT-LAB.html を作る（12 MiB を超えると失敗する）
cd cadet && npm run test:fast
cd cadet && node build.mjs              # outputs/CADET.html を作る（15 MiB を超えると失敗する）
```

テストやビルドは `outputs/*.html` を作り直す。ビルドの日付（`FL.BUILD_INFO`）の 1 行だけが変わったときは、コミットしないで `git checkout` で戻す。

## Blender で 3D の素材を作るときの決まり

### 1. 作り方：スクリプトで再現できること

- 素材はすべて `cadet/tools/<種類>/build_<名前>.py` のスクリプトで作る。手で編集した `.blend` や、出どころの分からない模型は入れない。今あるお手本は `cadet/tools/aircraft/build_archer.py`、`build_seminole.py`、`build_737.py` と `cadet/tools/actor/build_actor.py`。
- 実行は、ウィンドウなしのコマンドで行う。

  ```sh
  blender -b --factory-startup -P cadet/tools/<種類>/build_<名前>.py -- <引数…>
  ```

- スクリプトの書き方はお手本に合わせる。
  - 引数は `--` の後ろから読む。
  - 最初に `bpy.ops.wm.read_factory_settings(use_empty=True)` を呼ぶ。
  - 乱数を使うなら種を固定し、同じ入力からは同じファイルができるようにする。今の archer.glb は、作り直すと 1 バイトも違わない。
  - 先頭のコメントに次のことを書く：何を作るか、実行するコマンド、座標系、ノードの名前、COLOR_0 に何を入れたか。例は `build_archer.py` の 1〜17 行。
- 寸法は、ゲームがすでに持っている値を使う。手で写さず、`node` のスクリプトで JSON に書き出して渡す（例：`cadet/tools/aircraft/spec.mjs`）。どうしても定数を写すとき（例：操縦席の窓の寸法 `WS`・`SILL`）は、出どころのファイルと名前をコメントに書く。
- 書き出し先は `cadet/assets/model/<名前>.glb`。遠くから見る版を作るときは `<名前>-far.glb`。スクリプトを変えたら、作り直した glb も同じコミットに入れる。
- 確認用の Cycles の絵は、スクリプトの任意の引数で出せるようにする（`build_archer.py` のプレビューと同じ）。ただし本当の確認は、ゲームの画面で行う（下の「4. 確かめ方」）。

### 2. glb の中身：今の読み込み部分が読める形にする

glb を読むのは、three.js の GLTFLoader ではなく自前の読み込み部分（`cadet/src/aircraft/archer-model.js` の `modelMeshes(file)`）。読めるのは次の形だけ。

- 書き出しの設定は `build_archer.py` の 935〜937 行と同じにする：`export_yup=False`、`export_apply=True`、`export_materials='NONE'`、`export_vertex_color='ACTIVE'`、`export_texcoords=False`、`export_normals=True`、`export_tangents=False`、アニメーションなし。
- 1 つのメッシュに primitive は 1 つ。属性は POSITION・NORMAL・COLOR_0 とインデックス（uint16 か uint32）だけ。UV・材質・テクスチャ・Draco・meshopt・KHR_mesh_quantization は読めない。
- ノードに translation・rotation・scale・matrix を付けない（付いていると読み込みが例外を投げる）。形は最後の位置に置いたまま、変形を適用して書き出す。
- COLOR_0 は、rgb が色（sRGB）、alpha が焼き込んだ陰（AO）。ゲームは色の値でガラス・ゴム・金属を見分ける（`cadet/src/aircraft/exterior.js` の `PAINT_CLASSES`）ので、機体ではその色を正確に使う。
- AO の焼き方はお手本と同じにする。mathutils の BVHTree でレイを飛ばす（`build_archer.py` の `bake_ao`。40 方向、届く距離 0.9 m、下限 0.35）。Cycles のベイクは使っていない。
- ノードの名前は、コードとの約束になっている。コードは名前で部品を探す（例：`body`・`cabin`・`ailL`・`prop`・`gearN`・`reg.<登録記号>`）。名前を変えるときは、読む側のコードも同じ変更で直す。

### 3. 決定事項（STEP 1 で決めた既定値。変えるときはここを書き換えてから）

1. **見た目は頂点カラーと焼き込み AO で持つ。テクスチャは使わない。**
   理由は 3 つ。今の読み込み部分は UV を読めない。操縦席のテクスチャの上限（6 MB）はもう満杯に近い。テクスチャは FLIGHT LAB と CADET の両方の HTML に入る。
   UV やテクスチャが必要になったら、先に読み込み部分とテストを直す作業を、別の段階として行う。
2. **容量の割り当て。** FLIGHT LAB の HTML の空きは約 5.47 MB。glb は base64 で 4/3 倍になるので、元のファイルで使えるのは約 4.1 MB。glb は 1 三角形あたり約 28 バイト（archer.glb の実績）。

   | 使い道 | 元の glb の合計（上限） |
   |---|---|
   | 操縦席 | 1.2 MB |
   | 田舎の建物・防風林のキット | 0.4 MB |
   | 飛行場の小物（T ハンガー・地上機材・灯火の器具） | 0.4 MB |
   | 積雲 | 0.3 MB |
   | 機体（Archer・Seminole）の作り直し | 今の大きさを超えない |
   | 予備 | 1.5 MB 以上残す |

3. **CADET と共有する部品は、共有したまま良くする。** 操縦席・機体・飛行場・建物が該当し、両方のテストを通す。
   FLIGHT LAB にしか要らない物（遠景のキットなど）は FLIGHT LAB 側にだけ置く：`flight-lab/build.mjs` の `MODELS` に足し、`flight-lab/src3d/world3d.js` の `w.outside()` に入れる（フードの間は隠れる）。
   CADET にも入れる glb は、`cadet/build.mjs` の模型の一覧（37 行）にも足す。
4. **テストの上限は勝手に上げない。** 上げる必要があるときは理由と数字を示し、ユーザーに確かめる。

### 4. 予算（テストとビルドが守っているもの）

| 対象 | 上限 | いま |
|---|---|---|
| FLIGHT LAB の HTML | 12 MiB（`flight-lab/build.mjs` の `MAX_BYTES`） | 約 7.1 MB |
| CADET の HTML | 15 MiB（`cadet/build.mjs`） | 約 8.6 MB |
| 1 フレーム | 描画 400 回未満・90 万三角形未満（`cadet/test/browser.test.mjs`） | — |
| 操縦席 | 描画 40 回以下（Seminole 44）・4 万三角形以下・テクスチャ 6e6 B 以下（`cadet/test/cockpit.test.mjs`） | 推定で約 3.6〜3.8 万三角形 |
| Archer の外観 | 近距離版 24,000 未満・遠距離版 3,000 未満（登録記号を除く。`cadet/test/exterior.test.mjs`） | 20,940 / 2,468 |
| Seminole の外観 | 近距離版 27,000 未満・遠距離版 3,300 未満 | 25,946 / 3,101 |
| 焼き込み AO | 0.3〜1（`exterior.test.mjs`） | — |

`flight-lab/test/flight.test.mjs` は、埋め込まれた模型が `MODELS` と一致すること、テクスチャが決まった 12 枚であることを確かめている。テクスチャを足すときは、このテストも直す。

### 5. 確かめ方（素材を変えるたびに、この順で）

1. スクリプトをウィンドウなしで動かし、エラーなしで終わること。三角形の数を表示させて、上の予算に入っていること。
2. 速いテスト：`cd cadet && npm run test:fast` と `cd flight-lab && npm run test:fast`。
3. ビルド：`node build.mjs` を両方で（サイズの上限を超えると失敗する）。
4. **ゲームの画面で、変更前と変更後を並べて見る。** 同じ条件で撮る。
   - FLIGHT LAB の 8 場面：`cd flight-lab && node tools/shots.mjs <出力フォルダ> --pref render=three --pref quality=high [--only 01-rwy-cockpit,…]`
   - 近くから見る絵（CADET）：
     - `cd cadet && node test/shots.mjs high 1280 720 9.6 1,2,3,4,6`（駐機場・滑走路・アカデミー・管制塔・上空）
     - `node test/aircraft-shots.mjs high <出力フォルダ>`
     - `node test/cockpit-shots.mjs high <出力フォルダ> "" outputs/CADET.html pa28 ahead`（クラウドではメモリが増えるので、1 回に 1 視点）
   - ここはソフトウェア描画（SwiftShader）。1 場面に約 1 分かかり、フレームレートには意味がない。動的解像度で描画の解像度も下がるので、比べるのは同じ条件で撮った絵どうしにする。
   - 撮った絵は自分で開いて見る。不自然な点（浮いている、縮尺が違う、のっぺりしている、ちらつく、すき間がある）を挙げて直してから報告する。
5. 時間があれば全部のテスト：`npm test` を両方で（ブラウザを使うので遅い）。
6. 記録を残す。
   - `cadet/assets/CREDITS.md` に、作り方と実行コマンドを書く。
   - 変更前と変更後の絵を `cadet/docs/<話題>/` か `flight-lab/docs/` に置く。
   - README と PLAN の該当する節を直す。
   - `outputs/*.html` を作り直してコミットする。

### 6. 光の状態に注意

今の描画の設定は、どんな模型も平板に見せる。原因はどれもコード側にあり、Blender では直らない。

- ブルームのしきい値 8.0（`cadet/src/render/post.js` 117 行）が、地平線の空の明るさをまたいでいる。
- 霞の色が空の地平線の色より暗い。
- 環境光に地面の照り返しがなく、下向きの面が明るすぎる。
- `envMap` を指定していないので、three.js が `envMapIntensity` を `scene.environmentIntensity`（0.5）で上書きしている。

この光を直す前に新しい模型の良し悪しを判断するときは、この影響を割り引いて見る。
