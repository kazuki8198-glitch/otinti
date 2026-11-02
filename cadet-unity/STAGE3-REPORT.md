# CADET Unity 本移植 — STAGE 3 レポート（世界と造形＋コックピット/システム層）

実施日: 2026-11-02 / Unity 6000.3.27f2 / プロジェクト実体: /opt/cadet/CadetSlice（ソース正本は ~/workspace/cadet-unity/）

## 完了したこと（証跡つき）

### 1. システム層の完全移植＋同値検証（Stage 2 からの引き継ぎ分を含む）
- `flight/src/CadetSystems.cs` — systems.js 移植：コールドスタート（プライマー/フラッディング/スターター duty・熱ロックアウト）、停止条件、ランナップのゲージドロップ、2段電気バス（shed 込み）、油量/油温/油圧、双発始動・停止、アラート、RUNUP 定数、COLD/RUNNING プリセット。
  - 同値：スクリプト化したスイッチ時系列9シナリオ（A コールドスタート成功〜I 分割バス）を JS/C# 両側で実行し **404/404 サンプル・0ミスマッチ**（イベント/状態/文字列は完全一致、ゲージ数値は相対 5.1% 許容内）。
- `flight/src/CadetWalkaround.cs` — プリフライト点検（plant/inspect/act/pending/settle/summary/consequences）。コンテンツは Stage 1 の data/walkaround-{archer,seminole}.json から読込。
- `flight/src/CadetAtc.cs` + `CadetRadioContent.cs` — ATC ランナー（聞き取りタイミング、シード付きシャッフル、訂正/タイムアウト再呼出）と無線コンテンツ（dayRadio/ctafRadio/コールサイン/周波数）。
- `flight/src/CadetCareerChecklists.cs` — CADET 側チェックリスト全機種（Archer 6リスト／Seminole 派生／Jet）。項目の test/set を DayCtx 経由で systems/physics に結線。
- `flight/src/CadetDay.cs` — **createDay 本体**：1日の状態機械（walk→prestart→…→debrief→done）、チェックリスト自動 tick、ランナップ watch（マグ故障の decideFault）、ATC クリアランス状態、incursion 検出、lessonEnded 記録、summary の trust 計算。
  - 同値：台本化した初日の通し（徒歩点検→始動→ランナップ手動読み取り→無線（誤読バック1回を含む）→レッスン3課目→帰投→シャットダウン）を JS/C# 両側で実行し、**ダイジェスト 5/5 行・0ミスマッチ**（フェーズ列25、発行イベント全件、ランナップ memo dropL 109 / dropR 64 / carb 81、summary の trust=9・無線結果・徒歩点検結果まで完全一致）。ドライバ: flight/test/bot-day2-js.mjs / BotDay2Cs.cs、比較器 core/test/diff-digests.py。
  - 途中で直した実バグ: LessonEnded の記録で JS では未定義で落ちる `reason` キーを C# が常時出していた（キー有無の差として検出→条件付き追加に修正）。

### 2. Unity 統合
- flight/src 全24ファイル＋data 50 JSON をプロジェクトへ同期し、**エディタコンパイル 0 エラー**（Assembly-CSharp.dll 498 KB → 598 KB に成長）。
- ハングしていた Stage 2 の残存 Unity バッチプロセス（プロジェクトロック保持）があったため終了してから実施。

### 3. 世界の構築（WorldMain.cs / WorldAcceptance.cs、証跡: evidence/stage3/）
- LAB 飛行場：移植済み物理の PAVED_RECT（滑走路 1200×30・平行誘導路・接続誘導路3本・エプロン）をそのまま立体化。スレッショルドバー・センターライン・A1 ホールドライン付き。フィールド全体を真方位 354° に回転。
- 学園：data/academy-spec.json の **20室**を rect＋天井高で押出（床・4壁・屋根）、Cadet/Toon シェーダ（3段セル調）で着色。
- 機体：archer.glb を day.js のスタンド位置（a 636.5, c 207.6）に駐機。登録デカールは N738SY のみ表示（glb には9機分が同時収録されているため）。
- 空：単色＋フォグ、雲42個（扁平球・無光源白）、太陽光＋ソフトシャドウ。
- スクリーンショット（目視確認済み）: world_overview / world_stand / world_academy / world_top / world_cockpit（キャビン近接）。
- **機体ジオメトリの数値検証**（「主翼が分離して見える」疑いを実測で解消）: Unity 側の頂点集合は glb と (−x,y,z) 変換込みで一致（ailL 133/133、body 5333/5349 ※残りは対称位置の重複頂点）、body の三角形は 7,044（glb と同一）・最大辺 0.82 m（同）・長辺 0。glTFast の X 反転は左手系への正規変換であり、ジオメトリは無傷。低翼の根元がキャビン下に隠れる角度＋影なし描画で分離して見えたもの。

## 未達・部分達成（理由つき）

1. **コックピット内装の 3D 化とスイッチのクリック操作 — 未実施。**
   理由: archer.glb は外装シェルのみで内装メッシュを持たない。HTML 版のコックピットは cockpit.js が手続き生成する別系統（Archer 119操作子）で、その生成器自体の移植が必要。スイッチの「動作」は systems/day の同値検証（404/404、day 通し）で論理レベルでは証明済みだが、3D パネル上のピッキングは未実装。j1 の before_takeoff_jet が人手で進められるかは、この層ができて初めて検証可能（Stage 2 で記録済みの宿題）。
2. **寮・管制塔・格納庫の内装 — 未実施。** 学園は外形マッシング＋室ごとの壁/屋根まで。dorm-spec / tower-spec / hangar-spec のデータ変換（Stage 1 で JSON 化済み）はあるが、家具・ドア開口・歩行可能化は未着手。
3. **NPC/キャラクター配置 — 未実施。** actor.glb / jet737.glb / seminole.glb は StreamingAssets へ配置済み（archer と合わせて4資産）。スキニング配置・アニメーションは未着手（キャラクター造形ラインはユーザ指示で駐車中のため優先度を下げた）。
4. **顔 SDF シェーディング — 未再現。** セル調は Cadet/Toon の3段拡散まで。HTML の顔 SDF 陰影はキャラクター未配置のため対象外。
5. **天候の視覚表現 — 部分。** フォグと雲のみ。雨・積雪・時刻による光の変化は未実装（天候の論理はキャリア/レッスン側に移植済み）。

## 次段階への引き継ぎ
- Stage 4: FO フェーズの Unity 画面結線（論理は Stage 1/2 で移植＋検証済み）、音声、デバイス、デブリーフ/ログブック表示（logbook.js 本体の移植が残件）。
- Stage 5: Windows リリースビルド、コールドブート通し受け入れ、PORT-CHECKLIST 最終照合。
