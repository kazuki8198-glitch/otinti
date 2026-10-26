# 教科書の写真のクレジット（PHOTO-CREDITS）

FLIGHT LAB の教科書（TEXTBOOK でも同じ）に入れた写真の一覧です。どれも元のページでライセンスを確かめました。
使ってよいのは、パブリックドメイン（FAA・NASA・NOAA など米国政府の著作物）、CC0、CC BY、CC BY-SA だけです。
写真は縮小（長い辺 1200 px 以下）・WebP に変換し、メタデータを消して `src/book-photos.js` に入れています。一部の写真は切り抜いています（元の写真から変えています）。
CC BY-SA の写真は、変換したものも同じ CC BY-SA で利用できます。写真の下のキャプションにも作者・ライセンス・出典を出しています。

写真 17 枚・合計 1.40 MB（WebP のバイト数）。

| id | 写真 | 作者 | ライセンス | 出典 | 使っている節 |
|---|---|---|---|---|---|
| `vortex` | 翼端渦（NASA の試験）。地上から上げた赤い煙が、通り過ぎた飛行機の翼端の渦に巻き込まれています。この渦が誘導抗力のもとです。 | NASA Langley Research Center（Fir0002 による編集） | [Public domain (PD-USGov-NASA)](https://commons.wikimedia.org/wiki/Template:PD-USGov-NASA) | [元のページ](https://commons.wikimedia.org/wiki/File:Airplane_vortex_edit.jpg) | aero.drag |
| `archer` | Piper PA-28-181 Archer III。翼が胴体の下にある低翼・単発・固定脚の 4 人乗りです。 | Huhu Uet | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) | [元のページ](https://commons.wikimedia.org/wiki/File:Piper_PA-28-181_Archer_III_(D-ETPA)_01.jpg) | sys.ctl |
| `archerStabilator` | 全体が動く水平尾翼（スタビレーター）の例。胴体のすき間を軸に、尾翼ごと上下に動きます。 | Ricardo Reis from Lisboa, Portugal | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [元のページ](https://commons.wikimedia.org/wiki/File:Trimming_(e_move_o_estabilizador_todo)_(2946652623).jpg) | sys.ctl |
| `lycoming` | カウリングを開けた Lycoming O-360 エンジン（別の機体の例）。Archer のエンジンと同じ系列の、空冷・水平対向 4 気筒です。 | Nimbus227 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [元のページ](https://commons.wikimedia.org/wiki/File:LycomingO-360.JPG) | sys.engine |
| `fuelSample` | 主翼の下の排出口から燃料を抜き取って調べているところ（別の機体の例）。青い色は 100LL の航空ガソリンのしるしです。 | Ahunt | [Public domain (PD-self)](https://commons.wikimedia.org/wiki/Template:PD-self) | [元のページ](https://commons.wikimedia.org/wiki/File:GATS_jar_03.JPG) | sys.fuel |
| `pitot` | 主翼の下のピトー管（セスナ 172 の例）。前を向いた穴に、ぶつかってくる空気の圧力（全圧）が入ります。 | Cjp24 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [元のページ](https://commons.wikimedia.org/wiki/File:Cessna_172_Skyhawk_II_-_Pitot_tube.jpg) | sys.g1000 |
| `staticPort` | 胴体の横の静圧孔（セスナ 172 の例）。小さな穴で、まわりの空気の圧力（静圧）を取ります。機体によって、静圧孔の場所は違います。 | Bin im Garten | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [元のページ](https://commons.wikimedia.org/wiki/File:Static_port_C172_7786.JPG) | sys.g1000 |
| `compass` | 計器板の上の磁気コンパスと、その下の自差カード（セスナ 172 の例）。カードの FOR は飛びたい磁方位、STEER はそのときコンパスで合わせる値です。 | M9matr0902 | [Public domain (PD-self)](https://commons.wikimedia.org/wiki/Template:PD-self) | [元のページ](https://commons.wikimedia.org/wiki/File:Flygplanskompass.JPG) | sys.compass |
| `distanceSign` | 滑走路の横の残り距離標識（runway distance remaining sign）。黒地に白い数字で、残りの長さを 1,000 ft 単位で示します。「2」は残り約 2,000 ft です。 | LezFraniak | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [元のページ](https://commons.wikimedia.org/wiki/File:Runway-Distance_Remaining_Sign_-2.jpg) | perf.tol |
| `grassRunway` | 芝の滑走路（turf runway）。舗装より車輪が転がりにくく、離陸距離が延びます。長い芝やぬかるみでは、2 倍になることもあります（FAA-P-8740-2）。 | Malcolm Neal | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [元のページ](https://commons.wikimedia.org/wiki/File:Grass_runways_-_geograph.org.uk_-_5465578.jpg) | perf.tol |
| `cbFlorida` | フロリダ東海岸（メリット島の沖）の積乱雲。上が横に広がった「かなとこ雲」になっています。夏の午後によく見られる形です。 | TheAustinMan | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [元のページ](https://commons.wikimedia.org/wiki/File:Cumulonimbus_Incus_with_LC-39A.JPG) | wx.ts |
| `microburst` | 雨を伴うマイクロバースト（wet microburst）。雲の下から落ちた強い下降気流が、地面で横に広がっています（NOAA）。 | NOAA Legacy Photo ERL/WPL | [Public domain (PD-USGov-NOAA)](https://commons.wikimedia.org/wiki/Template:PD-USGov-NOAA) | [元のページ](https://commons.wikimedia.org/wiki/File:Wea02273_-_Flickr_-_NOAA_Photo_Library.jpg) | wx.shear |
| `groundFog` | 明け方の地面近くの霧（放射霧）。晴れて風の弱い夜に地面が冷えてでき、日が昇ると消えていきます。 | pixelfehler / Matthias Süßen | [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5) | [元のページ](https://commons.wikimedia.org/wiki/File:Nebelostfriesland.jpg) | wx.fog |
| `holdShort` | 滑走路の手前の停止線（runway holding position marking）。黄色の実線 2 本と破線 2 本で、実線の側（写真の右）で止まります。破線の側が滑走路です。右の赤地に白の文字は、滑走路の番号を地面に書いた標示です（AIM 2-3-5）。 | Bmurphy380 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [元のページ](https://commons.wikimedia.org/wiki/File:Hold_Short.jpg) | comm.mistakes |
| `towerCab` | 管制塔（control tower）。上のガラス張りの部屋（キャブ）から、管制官が滑走路と空港の周りを目で見て、Tower と Ground の交信をします。 | N801SA | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [元のページ](https://commons.wikimedia.org/wiki/File:Bedford-Hanscom_Air_Traffic_Control_Tower.JPG) | comm.tower |
| `asrRadar` | 空港監視レーダー（airport surveillance radar）のアンテナ。回りながら電波を出し、空港の周りの機の位置を進入管制・出発管制の画面に映します。上に載っている細長いアンテナは二次レーダーで、トランスポンダーに問い合わせて、その応答を受けます。 | Dj1997 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [元のページ](https://commons.wikimedia.org/wiki/File:Capital_Region_International_Airport_Radar_Tower_ASR.jpg) | comm.radar |
| `nightFlorida` | 国際宇宙ステーションから見た夜のフロリダ（2014 年 10 月）。灯は海岸と都市に集まり、湿地や海の上は真っ暗です。暗い地域の上では地面の目印がなく、高さの感じ方がずれやすくなります。 | NASA | [Public domain (PD-USGov-NASA)](https://commons.wikimedia.org/wiki/Template:PD-USGov-NASA) | [元のページ](https://commons.wikimedia.org/wiki/File:Florida_from_ISS_night_2014.jpg) | hf.vision |
