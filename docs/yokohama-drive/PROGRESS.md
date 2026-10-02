# 横浜ドライブ（plateau-three.html）改修の記録

基準: ブランチ `claude/what-is-this-db5aue`、コミット 9087c78（作業開始時の HEAD と同じ。リモートに後からの変更なし）。
この文書に、調査結果・設計・各段階の実装と検証・残作業を積み上げる。

## 0. 調査

### 0.1 白い建物・ぼやけた建物の原因（2026-10-02、`tools/survey/bldg_inventory.py`）

各地点で、PLATEAU 横浜市 2024 の建物 3D Tiles（中区・西区・神奈川区の LOD1/2/3、写真つき版）の末端タイルを1枚ずつ取得した。
建物ごと（バッチ = gml_id）に「写真つき三角形の割合」「UV の有無」「写真の実寸」を数えた。生データは `bldg_inventory.json`、設定は `inventory_cfg.json`。

| 地点 | データ | 棟 | 写真あり | 写真なし | 写真の実寸 | MB | タイル | 写真なしの例 (gml_id) |
|---|---|---|---|---|---|---|---|---|
| kannai | naka1 | 16 | 0 | 16 | - | 0.1 | 48/507079-4d…/0/data323.b3dm | bldg_b65f9d89-ace2-4118-a0b7-682b34e078bd bldg_0d45947e-0481-4208-a14f-4fffa841434b |
| kannai | naka2 | 16 | 16 | 0 | 4096x4096 | 1.0 | 94/a960a4-7e…/0/data323.b3dm |  |
| kannai | naka3 | 16 | 16 | 0 | 8192x8192 | 5.0 | 98/34e4f3-a8…/0/data551.b3dm |  |
| sakuragicho | nishi1 | 3 | 0 | 3 | - | 0.0 | ad/5fd83a-16…/data/data37.b3dm | bldg_51bcc742-c691-4a73-a643-87a33c5589b6 bldg_3f58af6d-ba62-48a0-95e8-060b9de09243 |
| sakuragicho | nishi2 | 3 | 3 | 0 | 1024x1024 | 0.1 | 4a/84f474-71…/data/data37.b3dm |  |
| sakuragicho | nishi3 | 3 | 3 | 0 | 1024x1024 | 0.1 | 57/4b4e13-92…/data/data37.b3dm |  |
| sakuragicho | naka1 | 17 | 0 | 17 | - | 0.1 | 48/507079-4d…/0/data380.b3dm | bldg_27d9cdb0-c1af-4554-9528-763e5ad59622 bldg_14be600d-6deb-40d1-b3eb-80dd671f8db4 |
| sakuragicho | naka2 | 17 | 17 | 0 | 8192x8192 | 3.1 | 94/a960a4-7e…/0/data380.b3dm |  |
| sakuragicho | naka3 | 18 | 18 | 0 | 8192x8192 | 3.0 | 98/34e4f3-a8…/0/data648.b3dm |  |
| mm_center | nishi1 | 40 | 0 | 40 | - | 0.4 | ad/5fd83a-16…/data/data7.b3dm | bldg_ec09bac0-35c3-46c9-b066-5bd87e517d1b bldg_335f1e68-60eb-4eb7-a88f-c5f111f622ee |
| mm_center | nishi2 | 40 | 40 | 0 | 8192x8192 | 5.0 | 4a/84f474-71…/data/data7.b3dm |  |
| mm_center | nishi3 | 40 | 40 | 0 | 8192x8192 | 5.0 | 57/4b4e13-92…/data/data7.b3dm |  |
| mm_center | naka1 | 5 | 0 | 5 | - | 0.0 | 48/507079-4d…/0/data370.b3dm | bldg_0401f06b-1ef9-4f8e-a348-4d5d59729e0d bldg_69a627f6-25ba-4713-9051-02756aad1fcc |
| mm_center | naka2 | 5 | 5 | 0 | 4096x4096 | 0.7 | 94/a960a4-7e…/0/data370.b3dm |  |
| mm_center | naka3 | 4 | 4 | 0 | 4096x4096 | 2.2 | 98/34e4f3-a8…/0/data638.b3dm |  |
| mm_north | nishi1 | 22 | 0 | 22 | - | 0.2 | ad/5fd83a-16…/data/data9.b3dm | bldg_522ef6dd-d282-499f-9637-15b846da1d25 bldg_efb2c927-8630-4c7d-83f1-acdce8041f68 |
| mm_north | nishi2 | 22 | 22 | 0 | 8192x8192 | 3.7 | 4a/84f474-71…/data/data9.b3dm |  |
| mm_north | nishi3 | 22 | 22 | 0 | 8192x8192 | 3.7 | 57/4b4e13-92…/data/data9.b3dm |  |
| yokohama_east | nishi1 | 68 | 0 | 68 | - | 0.4 | ad/5fd83a-16…/data/data2.b3dm | bldg_8d842889-b46b-4f1e-bb67-9f53a5b4deda bldg_027abcdc-8fc5-4410-9154-c80fdc47ced7 |
| yokohama_east | nishi2 | 68 | 68 | 0 | 8192x8192 | 3.0 | 4a/84f474-71…/data/data2.b3dm |  |
| yokohama_east | nishi3 | 68 | 68 | 0 | 8192x8192 | 3.0 | 57/4b4e13-92…/data/data2.b3dm |  |
| yokohama_west | kana1 | 1 | 0 | 1 | - | 0.0 | fa/12701b-a5…/data/data199.b3dm | bldg_fb6f9a31-6b7f-4c2c-a73d-ba52e8cc606a |
| yokohama_west | kana2 | 1 | 1 | 0 | 512x512 | 0.0 | 67/51cc26-b1…/data/data199.b3dm |  |
| yokohama_west | nishi1 | 132 | 0 | 132 | - | 0.8 | ad/5fd83a-16…/data/data16.b3dm | bldg_17ac4e86-c12e-460b-a4df-c0c5d543c7d5 bldg_1c97dd1b-3ad4-402d-8125-874490376da5 |
| yokohama_west | nishi2 | 132 | 132 | 0 | 8192x8192 | 4.1 | 4a/84f474-71…/data/data16.b3dm |  |
| yokohama_west | nishi3 | 132 | 132 | 0 | 8192x8192 | 4.1 | 57/4b4e13-92…/data/data16.b3dm |  |
| yokohama_north | kana1 | 230 | 0 | 230 | - | 1.1 | fa/12701b-a5…/data/data197.b3dm | bldg_09ce74fa-40d2-4b42-adda-fbe327c12749 bldg_d8a637df-d316-4396-b638-4c61e9dc727a |
| yokohama_north | kana2 | 230 | 83 | 147 | 4096x4096 | 2.2 | 67/51cc26-b1…/data/data197.b3dm | bldg_09ce74fa-40d2-4b42-adda-fbe327c12749 bldg_d8a637df-d316-4396-b638-4c61e9dc727a |
| akarenga | naka1 | 11 | 0 | 11 | - | 0.1 | 48/507079-4d…/0/data281.b3dm | bldg_11523ddc-e108-457f-813a-1b8612e42849 bldg_934a2fe5-1518-43a4-9248-4c3d128eb1e3 |
| akarenga | naka2 | 11 | 11 | 0 | 2048x1024 | 0.2 | 94/a960a4-7e…/0/data281.b3dm |  |
| akarenga | naka3 | 11 | 11 | 0 | 2048x1024 | 0.2 | 98/34e4f3-a8…/0/data501.b3dm |  |
| chinatown | naka1 | 106 | 0 | 106 | - | 0.5 | 48/507079-4d…/0/data343.b3dm | bldg_d534ae35-0cff-4ef6-922d-7a8f3058a346 bldg_39d8230c-9dcc-4cba-a92e-6e745055cba1 |
| chinatown | naka2 | 106 | 106 | 0 | 2048x2048 | 0.9 | 94/a960a4-7e…/0/data343.b3dm |  |
| chinatown | naka3 | 20 | 20 | 0 | 1024x1024 | 0.2 | 98/34e4f3-a8…/0/data591.b3dm |  |
| bashamichi | naka1 | 11 | 0 | 11 | - | 0.1 | 48/507079-4d…/0/data376.b3dm | bldg_22b2bb9b-aebc-4aa4-8aa3-5eb98fdd44c7 bldg_bcf02b1c-0bce-4464-93b2-7e8755a7a8db |
| bashamichi | naka2 | 11 | 11 | 0 | 4096x2048 | 0.4 | 94/a960a4-7e…/0/data376.b3dm |  |
| bashamichi | naka3 | 11 | 11 | 0 | 4096x2048 | 0.4 | 98/34e4f3-a8…/0/data644.b3dm |  |
| noge | nishi1 | 85 | 0 | 85 | - | 0.4 | ad/5fd83a-16…/data/data44.b3dm | bldg_60deca2e-f9ef-41d2-88f5-878f13356307 bldg_79d9566f-ab00-4d7b-94db-33b700c03d79 |
| noge | nishi2 | 85 | 0 | 85 | - | 0.4 | 4a/84f474-71…/data/data44.b3dm | bldg_60deca2e-f9ef-41d2-88f5-878f13356307 bldg_79d9566f-ab00-4d7b-94db-33b700c03d79 |
| noge | nishi3 | 85 | 0 | 85 | - | 0.4 | 57/4b4e13-92…/data/data44.b3dm | bldg_60deca2e-f9ef-41d2-88f5-878f13356307 bldg_79d9566f-ab00-4d7b-94db-33b700c03d79 |
| noge | naka1 | 51 | 0 | 51 | - | 0.2 | 48/507079-4d…/0/data485.b3dm | bldg_686c36a7-07f3-4cfd-b861-da9b81b81244 bldg_98fc23ae-99ab-4804-8bc5-a6ad1489faa7 |
| noge | naka2 | 51 | 51 | 0 | 2048x2048 | 0.7 | 94/a960a4-7e…/0/data485.b3dm |  |
| noge | naka3 | 18 | 18 | 0 | 1024x1024 | 0.2 | 98/34e4f3-a8…/0/data862.b3dm |  |
| tobe | nishi1 | 833 | 0 | 833 | - | 3.3 | ad/5fd83a-16…/data/data40.b3dm | bldg_8b15a260-dc4d-4a99-95ee-17b6c6d3d5b3 bldg_80d88250-4917-4c8f-aca3-e01f679b633d |
| tobe | nishi2 | 833 | 0 | 833 | - | 3.3 | 4a/84f474-71…/data/data40.b3dm | bldg_8b15a260-dc4d-4a99-95ee-17b6c6d3d5b3 bldg_80d88250-4917-4c8f-aca3-e01f679b633d |
| tobe | nishi3 | 833 | 0 | 833 | - | 3.3 | 57/4b4e13-92…/data/data40.b3dm | bldg_8b15a260-dc4d-4a99-95ee-17b6c6d3d5b3 bldg_80d88250-4917-4c8f-aca3-e01f679b633d |

分かったこと（推測ではなく、上の実データから）:
1. **元データに写真がない:** 西区の中心部の外（戸部 833 棟・野毛の西区側 85 棟）は、LOD1/2/3 のどれにも写真がない（UV もない）。神奈川区（横浜駅北）は 230 棟中 147 棟が写真なし。→ 画像の取得・デコード・UV の失敗ではない。写真つきの別 LOD も、この年度のカタログにはない。
2. **中区 LOD3 は建物が欠けている:** 中華街の LOD2 は 106 棟、LOD3 は 20 棟。野毛の LOD2 は 51 棟、LOD3 は 18 棟。LOD3 モードでは周りの建物が抜ける。しかもこの2地点では LOD2 の写真の方が高解像度（2048 対 1024）。
3. **西区の LOD3 と LOD2 は同じ内容:** 棟数・写真の実寸・バイト数が一致している。
4. **ぼやけ:** 写真は 1 タイル 1 枚の 8192×8192 などのまとめ画像で、最大 132 棟の外壁が入っている。これを一律に 2048 へ縮小していたため（`Q.maxTex`）、1 棟あたり 100〜200 px 程度になっていた。
5. 露出による白飛びは、写真つき建物では見られない。白い建物は、すべて「写真なし」の建物だった。

### 0.2 道路データ・生成の確認
- `tools/area_a/build3.py` と `paint3.py` の `roadh` は `Df`（窪み補正前）を参照していた。公開済みの `area_a.bin`（9087c78）は、手元で `Dc`（補正後）に直した版から作ったもの。リポジトリのスクリプトと bin が食い違っていた。→ 段階 2 で直し、再生成で確かめる。
- `roads1.py` は道路面を平面で結合していて、道路 ID・上下関係を持たない。`paint3.py` は motorway・トンネル・負の layer を除外している。

## 1. 計画（段階ごとに実装 → 確認 → コミット）
| 段階 | 内容 | 状態 |
|---|---|---|
| 1 | 建物: データの選び方（中区 LOD2+LOD3 を建物単位で重複なく、西区 LOD2、神奈川区 LOD2）、写真の解像度を距離で上げ下げ、写真なし建物の外壁生成、画質設定の作り直し | 着手 |
| 2 | 道路: 道路グラフ（ID・種類・接続・方向・bridge/tunnel/layer）、縦断形状、橋・アンダーパスの区別、白線の平滑化と道路メッシュへの投影、走行面の追跡 | 未 |
| 3 | 街の設備: 電柱・電線、信号（切替つき）、標識、街灯、ガードレール、欄干、植栽（インスタンス化） | 未 |
| 4 | 首都高 K1 横羽線（金港 JCT〜石川町 JCT 付近）: 高架・ランプ・合流分岐・防護壁・橋脚、一般道からの出入り | 未 |
| 5 | 読み込みのチャンク化と解放、先読み、地域の拡張（中区周辺・神奈川区 → 湾岸・鶴見方面） | 未 |
| 6 | 計測（同条件比較）、10 分走行、検証の自動テスト、最終報告 | 未 |

## 2. 検証の記録
（各段階で追記。GPU なしのヘッドレス環境での確認と、実 GPU での確認を分けて書く）
