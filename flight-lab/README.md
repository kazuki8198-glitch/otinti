# FLIGHT LAB

公開情報を基にした**非公式の自主学習用**飛行訓練教材です。ブラウザで 1 ファイルを開くだけで動きます。

> 本アプリは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH/AFM、SOP、航空法規を優先してください。
> ANA の公式ソフトウェアではなく、認定訓練装置でもありません。NOT FOR NAVIGATION。

| ファイル | 内容 |
|---|---|
| [`outputs/FLIGHT-LAB.html`](outputs/FLIGHT-LAB.html) | アプリ本体。ダブルクリックで Chrome で開きます（オフライン可） |
| [`outputs/FLIGHT-LAB-使い方.md`](outputs/FLIGHT-LAB-使い方.md) | 使い方（画面、すべてのキーの意味、33 課目と評価、教科書 27 章、英語交信の練習、記録、Google 3D） |
| [`outputs/ANA-SANFORD-調査と設計.md`](outputs/ANA-SANFORD-調査と設計.md) | 調査（事実・推測・未確認の区別）、設計、検証、未実装 |

v2：空島フライト（`../flight-sim.html`）の飛行モデル・操作・画面を移植し、教科書（23 章・102 節）、学科テスト（130 問）、飛行課目（33 課目 × 3 レベル）を拡充しました。

v2.1：無線交信を一から詳しくしました。教科書の交信の章を 5 章（しくみ・言葉の決まり・型と復唱・1 回の飛行の全交信・管制塔のない空港と緊急）に分けて書き直し（教科書は 27 章・120 節）、メニュー 06「英語交信（無線）」に 1 回の飛行の全交信（音声）、復唱と応答 41 場面、数字とアルファベットのドリル、聞き取り、用語集を追加。学科テストは 14 分野・145 問。

開発：`node build.mjs`（ビルド）、`node --test --test-concurrency=1 test/flight.test.mjs test/avionics.test.mjs test/browser.test.mjs`（テスト 44 件）。
