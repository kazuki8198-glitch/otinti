// CADET — content/lecture-summaries.js : the key points ミラー 講師 gives at the quick pace (要点だけ) for the sections of
// part 1 whose textbook page has no ここが大切 box. Each line says what the section itself says (its own sentences,
// tables and examples: nothing from elsewhere), in her voice; 2–120 characters, です / ます, no { } < >.
export const SUMMARIES = {
  'aero.lift': [
    '揚力は、翼が空気を下へ曲げる反作用と、翼の上面の圧力が下がることで生まれます。',
    '揚力の式は L ＝ ½ρV²SCL。操縦士が変えられるのは、速度（パワーと姿勢）と迎え角（操縦桿）です。',
  ],
  'aero.turn': [
    '旋回は、バンクで揚力を横へ傾けて曲がります。高度を保つには、少し引いて揚力を増やします。',
    'バンクが深いほど荷重倍数が増え、失速速度も上がります。ラダーを合わせて、ボールを中央に保ちます。',
  ],
  'sys.gear': [
    'Archer は前輪式の固定脚で、前輪はラダーペダルで向きが変わります。ブレーキは左右別々に効きます。',
    '航空灯は、左の翼端が赤、右の翼端が緑、尾部が白です。',
  ],
  'radio.listen': [
    '聞き取りのコツは、まず自分のコールサインを聞き、次に来る言葉を予想し、数字は書き取ることです。',
  ],
  'comm.mistakes': [
    'よくある間違いは、hold short に “Roger” だけで答える、line up and wait を離陸の許可と思う、などです。',
  ],
  'comm.atis': [
    'ATIS は、風・視程・雲・気温・高度計規正値・使用滑走路などを、録音で繰り返し流す放送です。',
    '聞いたら書き取り、高度計はすぐ合わせます。',
  ],
  'comm.dep': [
    'タキシーの指示は、滑走路・経路・手前で止まる所・周波数・コードを、言われた順に復唱します。',
  ],
  'comm.tower': [
    '離陸の準備ができたら、滑走路の手前で管制塔を呼びます。line up and wait は離陸の許可ではありません。',
  ],
  'comm.radar': [
    '出発管制には、最初に今の高度を伝えます。交通情報は、時計の方位・距離・進む方向・機種・高度で来ます。',
    'レーダー業務をやめるときは、管制官に伝えてから周波数を変え、コードを 1200 にします。',
  ],
  'comm.arrive': [
    '到着の最初の呼び出しは、空港の 15 マイルほど手前で、位置・高度・ATIS の記号・意図を伝えます。',
  ],
  'comm.option': [
    '場周の練習では closed traffic や option を頼みます。Go around と言われたら、まず操縦、それから応答です。',
  ],
  'comm.ctaf': [
    '管制塔のない空港では、共通の周波数（CTAF）で、自分の位置と意図を全員に知らせます。',
  ],
  'comm.xpdr': [
    'トランスポンダーのコードは、1200 が VFR、7700 が緊急、7600 が無線の故障、7500 がハイジャックです。',
  ],
  'comm.icao': [
    '米国（FAA）と ICAO・英国では、言い方の違うところがあります。たとえば小数点は、FAA が point、ICAO は decimal です。',
    '上達の練習は、型を覚える、本物を聞く、椅子で 1 回の飛行の交信を声に出す（チェアフライング）、の 3 つです。',
  ],
};
