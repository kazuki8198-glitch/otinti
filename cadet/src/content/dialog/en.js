// CADET — content/dialog/en.js : the crew in English (M8): what 早瀬 教官, 真壁 主任教官 and 黒田 審査官 say, when the
// player turns on the English mode. Their written lines (EN: the Japanese line as the data has it → its English) and
// the lines made from the day or the course (PATTERNS: the Japanese shape → the English, the lesson's own title kept
// in quotes as the course writes it). Lines read out of the course's material (FLIGHT LAB's lessons and textbook:
// tagged 'material') stay as written. withEnglish(data) puts the English on every node it has one for; missingEnglish
// lists the crew's lines that have neither (the content tests keep it empty). Also the lines he says in the air
// (content/dialog/day1.js) for fly-mode's voice.
import { PHASE_LINES, ASSIST_LINES, RECOVER_LINE, EVENT_LINES } from './day1.js';
import { debriefLine } from './cockpit.js';

export const CREW = ['instructor', 'chief', 'examiner'];

export const EN = {
  // ---- 早瀬 教官: the first meeting, the mornings, the chapters (content/dialog/instructor-career.js)
  'はじめまして。今日からあなたの担当教官になる、早瀬 航です。': 'Nice to meet you. I\'m Wataru Hayase, and from today I\'m your instructor.',
  '最初の 1 週間ほどは座学です。教室でミラー講師の授業、午後は訓練装置で計器と交信の練習。学科試験に受かったら、Archer で飛び始めます。': 'The first week or so is ground school: Ms. Miller\'s classes in the classroom, and in the afternoons the training device, for instruments and radio. Pass the written test, and you start flying the Archer.',
  '飛ぶ日は毎回、この部屋でブリーフィングをして、外部点検、エンジン始動、交信、離陸、課目、着陸、講評。全部の課目を終えて審査に受かったら、ファーストソロです。': 'Every flying day: a briefing in this room, the walk-around, the start, the radio, the take-off, the lesson, the landing, the debrief. Finish every lesson, pass the check, and then comes your first solo.',
  '急がなくて大丈夫。一日ずつ、できることを増やしていきましょう。何か聞いておきたいことはありますか。': 'No need to hurry. One day at a time, we\'ll add to what you can do. Anything you\'d like to ask?',
  '人によりますが、天気がよければ、飛び始めてから 3 週間くらいです。日数より、毎回の飛行の中身が大事ですよ。': 'It depends on the person, but with good weather, about three weeks after you start flying. What happens in each flight matters more than the number of days.',
  '正直に言ってください。疲れているのに飛ぶのが、いちばん危ない。言ってくれたら、その日は地上の勉強に切り替えます。それは減点ではありません。': 'Tell me honestly. Flying tired is the most dangerous thing there is. If you tell me, we switch that day to ground study. That costs you nothing.',
  'ほかには？': 'Anything else?',
  'こちらこそ。夕方はラウンジで同期と話してみてください。今日はゆっくり休んで、明日の授業に備えましょう。': 'Likewise. In the evening, go and talk with your classmates in the lounge. Rest well today, and be ready for tomorrow\'s class.',
  'おはようございます。担当教官の早瀬です。顔合わせは午後、この部屋でしましょう。': 'Good morning. I\'m Hayase, your instructor. Let\'s properly meet this afternoon, in this room.',
  'まずはロビーで、真壁さんの歓迎の話を聞いてきてください。もうすぐ始まりますよ。': 'First, go to the lobby and hear Mr. Makabe\'s welcome. It starts soon.',
  '午前は、運航管理の佐伯さんが訓練所を案内してくれます。ロビーの北の部屋です。また午後に。': 'This morning Ms. Saeki from dispatch will show you around. Her room is north of the lobby. See you this afternoon.',
  '座学、がんばっていますね。教科書でわからないところがあれば、聞いてください。': 'You\'re working hard at ground school. If anything in the textbook isn\'t clear, ask me.',
  '数字の言い方と、交信の型。今のうちに体に入れておくと、飛び始めてから楽になります。': 'How to say numbers, and the shape of a radio call. Get them into your body now, and flying will be easier later.',
  '今日から第 3 章、航法です。場周経路の外へ、もっと遠くへ。横風、短い滑走路、VOR、それから地図と時計で飛ぶ推測航法。': 'From today, chapter 3: navigation. Out of the pattern, and further. Crosswinds, short runways, the VOR, and dead reckoning with a map and a clock.',
  '最後は、ひとりでの野外飛行です。航法ログを自分で作って、ひとりで飛んで、帰ってくる。途中で目的地が変わることもあります。': 'At the end, a solo cross-country. You make your own nav log, fly it alone, and come back. The destination may change on the way.',
  '今日から第 4 章、計器飛行です。フードをかぶると、外は見えません。見えるのは計器だけ。': 'From today, chapter 4: instrument flying. Under the hood you can\'t see outside. Only the instruments.',
  '体の感覚は、雲の中ではうそをつきます。姿勢、高度、姿勢、方位、姿勢、速度。目を止めずに、計器を信じてください。最後は真壁さんの審査、雲の中の ILS です。': 'In cloud, your body lies to you. Attitude, altitude, attitude, heading, attitude, airspeed. Keep your eyes moving and trust the instruments. At the end, Mr. Makabe\'s check: an ILS in cloud.',
  '今日から第 5 章、双発機の Seminole です。重くて、速くて、エンジンが 2 つ。': 'From today, chapter 5: the twin, the Seminole. Heavier, faster, and two engines.',
  'エンジンが 2 つあるのは、片方が止まっても飛べるからです。でも、止まった瞬間は強く片側へ引かれる。足で方向を保つ練習を、何度もします。': 'Two engines, so you can still fly when one stops. But the moment it stops, you\'re pulled hard to one side. We\'ll practise holding direction with your feet, again and again.',
  '第 6 章、最後の章です。TEM、脅威とエラーの管理。飛ぶ前に「今日の危ないところ」を言葉にする練習をします。': 'Chapter 6, the last one. TEM: threat and error management. We practise putting "today\'s danger" into words before we fly.',
  'それが終わったら、最終審査。外から来る審査官が、あなたの隣に座ります。ここで覚えたこと、全部を見せてください。': 'After that, the final check. An examiner from outside will sit next to you. Show everything you\'ve learned here.',
  'おはようございます。始める前に、ひとつ聞きます。今日の体調はどうですか。昨日はよく眠れましたか。': 'Good morning. Before we start, one question. How do you feel today? Did you sleep well last night?',
  'それならよかった。では、今日の課目です。': 'Good. Then, today\'s lesson.',
  '飛ぶ前に、TEM です。今日の「脅威」をひとつ挙げてください。今日いちばん気をつけることは、何ですか。': 'Before we fly, TEM. Name one threat for today. What do you most need to watch out for?',
  'そのとおり。{tem.why}。対策は、{tem.plan}。脅威は、先に言葉にしておくと、慌てずに済みます。': 'That\'s right. {tem.en.why}. The plan: {tem.en.plan}. Put a threat into words early, and it won\'t rush you.',
  '{tem.not}。今日いちばんの脅威は「{tem.threat}」です。{tem.why}。対策は、{tem.plan}。': '{tem.en.not}. Today\'s biggest threat is "{tem.en.threat}". {tem.en.why}. The plan: {tem.en.plan}.',
  '……そうですか？ 顔に疲れが出ていますよ。疲れは、自分ではいちばん気づきにくいものです。今日は飛ぶのをやめて、地上で復習にしましょう。': '...Are you sure? It shows on your face. Fatigue is the hardest thing to notice in yourself. No flying today; let\'s review on the ground.',
  '言ってくれてありがとう。それがいちばん大事な判断です。今日は飛ばずに、地上で次の課目の予習をしましょう。今夜は早く寝てください。': 'Thank you for telling me. That\'s the most important decision there is. We won\'t fly today; let\'s prepare the next lesson on the ground. Get to bed early tonight.',
  'わかりました。無理はしないでおきましょう。今日は地上で予習にします。言ってくれたこと、よかったですよ。': 'Understood. Let\'s not push it. Today we prepare on the ground. I\'m glad you told me.',
  '今日は天気のせいで飛べませんね。こういう日は、次の課目の予習をしましょう。次は{today.studyTitle}です。': 'The weather keeps us on the ground today. On days like this, we prepare the next lesson. Next is {today.studyTitle}.',
  '教科書のこの節の図を、画面に出します。': 'I\'ll put this section\'s figure on the screen.',
  '飛ぶ前に、頭の中で一度飛んでおく。「チェアフライト」と言います。手順を声に出して、手を動かしてみてください。': 'Fly it once in your head before you fly it. We call it "chair flying". Say the steps out loud and move your hands.',
  'それと、天気が悪い日に飛ばない判断も、立派な操縦の一部です。今日はここまでにしましょう。': 'And deciding not to fly on a bad-weather day is part of flying, too. That\'s all for today.',
  '航法ログは、ちゃんとできていましたね。では、単独の野外飛行です。': 'Your nav log was well done. So, the solo cross-country.',
  '離陸したら、LAB-A へ。そこから先は、管制か私から目的地の変更を言うかもしれません。言われたら、新しい針路と距離と時間を、落ち着いて見積もってください。': 'After take-off, head for LAB-A. From there, ATC or I may change your destination. If so, calmly work out the new heading, distance and time.',
  '迷ったら、最後に確かだった場所から考える。VOR と DME もあります。それでもわからなければ、正直に管制に聞く。それは恥ずかしいことではありません。': 'If you\'re lost, start from the last place you were sure of. You have the VOR and DME. If you still don\'t know, ask ATC honestly. There\'s no shame in that.',
  '燃料と時間に余裕を。帰ってきたら、航空日誌に「野外飛行」と書きましょう。': 'Keep a margin of fuel and time. When you\'re back, we\'ll write "cross-country" in your logbook.',
  '……いってらっしゃい。': '...Off you go.',
  '外部点検から。今日も、全部あなたの手で。': 'Start with the walk-around. Today again, everything by your own hands.',
  'おはようございます。今日は修了式です。ロビーで、真壁さんが待っています。……少し、緊張しますね。私もです。': 'Good morning. Today is graduation. Mr. Makabe is waiting in the lobby. ...A little nervous? So am I.',
  '修了、おめでとう。あなたの担当になれて、よかったです。……次に会うのは、どこかの空港かもしれませんね。': 'Congratulations on graduating. I\'m glad I was your instructor. ...Next time we meet, it may be at some airport.',
  '今日は、ファーストソロです。': 'Today is your first solo.',
  '私は乗りません。離陸して、左場周を回って、止まるまで着陸。それを 3 回。管制塔には、初めてのソロだと伝えてください。': 'I won\'t be on board. Take off, fly the left pattern, land to a full stop. Three times. Tell the tower it\'s your first solo.',
  '何かおかしいと思ったら、迷わずゴーアラウンド。それでも変なら、着陸して止まって、管制塔に言えばいい。私は地上で無線を聞いています。': 'If anything seems wrong, go around without a second thought. If it still seems wrong, land, stop, and tell the tower. I\'ll be listening on the radio from the ground.',
  'いつもどおりの点検、いつもどおりの交信。あなたはもう、それができます。……いってらっしゃい。': 'The usual checks, the usual radio calls. You can do that now. ...Off you go.',
  '外部点検から。機体で待っていたりはしませんよ。今日は全部、あなたの手で。': 'Start with the walk-around. I won\'t be waiting at the aircraft. Today, everything is in your hands.',
  '今日は{today.checkTitle}ですね。{today.checkWho}が教官室で待っています。審査の前に、ブリーフィングを受けてください。': 'Today is your {today.en.checkTitle}. {today.en.checkWho} is waiting in the instructors\' room. Get your briefing before the check.',
  '特別なことはしなくていい。毎日やってきたとおりに。……いってらっしゃい。': 'Nothing special. Just as you\'ve done every day. ...Off you go.',
  'おかえりなさい。……ファーストソロ、おめでとう。': 'Welcome back. ...Congratulations on your first solo.',
  '3 回とも、落ち着いていましたね。交信も、場周の形も、着陸も。ずっと見ていました。': 'You were calm all three times. The radio, the pattern, the landings. I was watching all along.',
  'みんな、ちょっと。……ここの訓練所の伝統です。初めてのソロのあとは、シャツの裾を切る。もう教官の手は要らない、という意味です。': 'Everyone, a moment. ...A tradition at this academy: after a first solo, we cut the shirt tail. It means you no longer need the instructor\'s hand.',
  '航空日誌に、今日の飛行と、ソロの裏書きを書いておきます。': 'I\'ll write today\'s flight and your solo endorsement in your logbook.',
  'ここからが本当の始まりです。次は航法。もっと遠くまで飛びますよ。今日は、ゆっくり休んでください。': 'This is the real beginning. Next comes navigation; we\'ll fly much further. Rest well today.',
  'ソロのあとの飛行こそ、丁寧に。慣れたころがいちばん危ない、とよく言われます。': 'Be careful, especially after your solo. They say the most dangerous time is when you get used to it.',
  '今日の予定は、タブレットと運航管理の予定表に出ています。わからないところは、いつでも聞いてください。': 'Today\'s plan is on your tablet and on the dispatch board. Ask me anytime if something isn\'t clear.',
  // ---- 真壁 主任教官 (content/dialog/people.js)
  'みなさん、翔洋航空の自社養成パイロット訓練所へようこそ。主任教官の真壁です。': 'Welcome, everyone, to the SHOYO AIRWAYS pilot training academy. I\'m Makabe, the chief instructor.',
  '今日からここで、空を飛ぶための基礎を一から身に付けてもらいます。最初は座学、それから単発機の Archer。ひとりで空へ上がる日、ファーストソロが、最初の大きな目標です。': 'From today you\'ll learn the basics of flying from the ground up. Ground school first, then the single-engine Archer. The day you go up alone, your first solo, is your first big goal.',
  'ここでの約束は 3 つだけです。わからないことは、わからないと言う。決められた手順は、省かない。疲れているとき、体調がよくないときは、正直に言う。': 'There are only three promises here. When you don\'t understand, say so. Never skip a set procedure. When you\'re tired or unwell, say so honestly.',
  '上手に飛ぶことより、正直であることのほうが、ずっと大事です。空では、自分をごまかした分だけ危なくなります。': 'Being honest matters far more than flying well. In the air, every bit you fool yourself is a bit more danger.',
  'このあと運航管理の佐伯さんが、訓練所の中を案内してくれます。午後は、担当の早瀬教官と顔合わせです。': 'Next, Ms. Saeki from dispatch will show you around the academy. This afternoon you\'ll meet your instructor, Mr. Hayase.',
  '同期の 3 人とも、よく話してください。ここでは、助け合える人から上手になります。……では、始めましょう。': 'Talk a lot with your three classmates. Here, the ones who help each other get better first. ...Now, let\'s begin.',
  '今日はソロ前の審査です。私が右の席に座ります。': 'Today is your pre-solo check. I\'ll be in the right seat.',
  '審査の間、私は手伝いません。何も言わないのは、あなたの判断を見るためです。いつもどおり、チェックリストと交信を省かずに。': 'During the check I won\'t help. If I say nothing, it\'s to see your judgement. As always, don\'t skip the checklists or the radio.',
  '離陸、上昇、水平、急旋回、失速からの回復、そして模擬のエンジン故障。最後まで、自分の言葉で操縦してください。': 'Take-off, climb, level flight, steep turns, stall recovery, and a simulated engine failure. Fly it in your own words, right to the end.',
  '機体で待っています。外部点検から、いつもどおりに。': 'I\'ll be waiting at the aircraft. Start with the walk-around, as always.',
  'わかりました。焦らなくていい。準備ができたら来てください。': 'Understood. No need to rush. Come when you\'re ready.',
  'ソロの日のことは、ずっと覚えているはずです。でも、明日の飛行も、同じように丁寧に。それがいちばん難しい。': 'You\'ll remember your solo day forever. But fly tomorrow just as carefully. That is the hardest part.',
  '今日は計器飛行の審査です。私が右の席に座ります。外は雲の中、あなたはフードの下。見えるのは計器だけです。': 'Today is your instrument check. I\'ll be in the right seat. Outside is cloud, and you\'ll be under the hood. Only the instruments.',
  '離陸したら、部分パネル。主の姿勢表示が止まった想定で、予備の計器で飛んでもらいます。そのあと、ILS 進入。決心高度で滑走路が見えなければ、そこで判断を。': 'After take-off, partial panel: the main attitude display has failed, and you fly on the standby instruments. Then the ILS approach. If you don\'t see the runway at decision altitude, decide right there.',
  'スキャンを止めないこと。ひとつの計器を見つめると、ほかが逃げていきます。': 'Don\'t stop your scan. Stare at one instrument, and the others slip away.',
  '今日は双発の審査です。Seminole で、私が右の席に座ります。': 'Today is your multi-engine check, in the Seminole. I\'ll be in the right seat.',
  '離陸の直後に、片方のエンジンを止めます。Identify、Verify、Feather。足で方向を保って、Vyse で上昇。上空でもう一度、そして片発のまま着陸です。': 'Right after take-off I\'ll fail one engine. Identify, verify, feather. Hold direction with your feet and climb at Vyse. Once more at altitude, then a landing on one engine.',
  '死んだ足は、死んだエンジン。踏んでいない側のエンジンが止まっています。……落ち着いて、声に出して確かめなさい。': 'Dead foot, dead engine. The engine on the side you\'re not pressing is the one that stopped. ...Stay calm, and confirm it out loud.',
  'その前に、TEM を。審査の日の脅威を、ひとつ。今日いちばん気をつけることは？': 'Before that, TEM. One threat for check day. What do you most need to watch out for today?',
  '結構。{tem.why}。だから、{tem.plan}。それを言える人は、審査でも崩れません。': 'Good. {tem.en.why}. So: {tem.en.plan}. People who can say that don\'t fall apart on a check.',
  '違いますね。{tem.not}。今日の脅威は「{tem.threat}」。{tem.why}。対策は、{tem.plan}。': 'No. {tem.en.not}. Today\'s threat is "{tem.en.threat}". {tem.en.why}. The plan: {tem.en.plan}.',
  '今日は最終審査ですね。審査官の黒田さんが、教官室で待っています。私たちは、今日は何もしてあげられません。': 'Today is your final check. The examiner, Mr. Kuroda, is waiting in the instructors\' room. Today there\'s nothing we can do for you.',
  'ここで覚えたことを、全部、いつもどおりに。それで十分です。': 'Everything you learned here, just as always. That\'s enough.',
  '……では、始めます。今日、この訓練所での基礎訓練を、すべて修了しました。おめでとう。': '...Let us begin. Today you have completed all of your basic training at this academy. Congratulations.',
  '入社の日に、約束は 3 つだけだと言いました。わからないことは、わからないと言う。手順を省かない。疲れているときは、正直に言う。': 'On your first day I said there were only three promises. Say when you don\'t understand. Never skip a procedure. Say honestly when you\'re tired.',
  'あなたは、それを最後まで守りました。審査の結果より、そのことを誇りに思ってください。': 'You kept them to the end. Be prouder of that than of any check result.',
  'ここから先は、大きな機体と、もっと多くの人を乗せた空です。でも、やることは同じです。点検し、確かめ、声に出して、正直に飛ぶ。': 'From here on, it\'s bigger aircraft and skies with many more people on board. But the work is the same. Check, confirm, say it out loud, and fly honestly.',
  '修了証です。……いってらっしゃい。': 'Your certificate. ...Off you go.',
  'おめでとう。最初の日、ブリーフィング室で「急がなくて大丈夫」と言ったのを覚えていますか。あなたは、一日ずつ、ちゃんと積み上げてきました。': 'Congratulations. Do you remember, on the first day in the briefing room, I said "no need to hurry"? You built it up properly, one day at a time.',
  '修了、おめでとう。ここでの毎日を、忘れないでください。': 'Congratulations on graduating. Don\'t forget your days here.',
  '最終審査が近いですね。審査官は何も言いません。でも、全部見ています。準備は、いつもどおりで十分です。': 'The final check is close. The examiner won\'t say a word, but sees everything. Prepare as you always do; that\'s enough.',
  'Seminole は重く、速い。そして、エンジンが止まったときに、片方へ強く引かれます。Vmc の赤い線、絶対に忘れないように。': 'The Seminole is heavy and fast, and when an engine stops it pulls hard to one side. Never forget the red line at Vmc.',
  '計器飛行で大事なのは、体の感覚を疑うことです。体が「傾いている」と言っても、姿勢表示が水平なら、水平です。': 'In instrument flying, doubt your body. If your body says "banked" but the attitude display says level, you\'re level.',
  '航法の段階ですね。地図、時計、コンパス。迷ったら、まず落ち着いて、最後に確かだった場所から考える。': 'You\'re on navigation now. Map, clock, compass. If you\'re lost, calm down first, and start from the last place you were sure of.',
  '座学はどうですか。教科書の数字は、覚えるより、なぜその数字なのかを考えると残ります。ミラー講師に、遠慮なく聞いてください。': 'How is ground school? Numbers in the textbook stay with you when you ask why they are what they are, rather than just memorising them. Don\'t hesitate to ask Ms. Miller.',
  '早瀬教官から聞いています。毎日の点検と交信、手を抜かずに続けてください。審査では、そこを見ます。': 'I\'ve heard from Mr. Hayase. Keep doing your daily checks and radio calls without cutting corners. That\'s what the check looks at.',
  '訓練所の中は、佐伯さんが案内します。午後は早瀬教官との顔合わせです。今日は、名前と顔を覚えるだけで十分ですよ。': 'Ms. Saeki will show you around the academy. This afternoon you meet Mr. Hayase. Today, learning names and faces is enough.',
  // ---- 黒田 審査官 (content/dialog/people.js)
  '審査官の黒田です。今日の最終審査を担当します。': 'I\'m Kuroda, the examiner. I\'ll be conducting today\'s final check.',
  '機体は Seminole。離陸、上空での片発停止、そして片発のままの進入と着陸。管制との交信、チェックリスト、判断。全部を見ます。': 'The aircraft is the Seminole. Take-off, an engine failure at altitude, then an approach and landing on one engine. Radio, checklists, decisions: I\'ll see all of it.',
  '審査の間、私は何も言いません。手伝いもしません。私を乗客だと思ってください。': 'During the check I won\'t say anything, and I won\'t help. Think of me as a passenger.',
  'ひとつだけ。わからないとき、迷ったときは、そう言って、安全なほうを選びなさい。それも審査のうちです。': 'Just one thing. When you don\'t know or you\'re unsure, say so, and choose the safer way. That is part of the check, too.',
  '出発前に、TEM を聞きます。今日の脅威を、ひとつ挙げてください。': 'Before we go, TEM. Name one threat for today.',
  '……「{tem.threat}」。記録しておきます。対策も、言葉にしてありますね。': '..."{tem.en.threat}". Noted. You have the plan in words, too.',
  '……そうですか。{tem.not}。私なら「{tem.threat}」を挙げます。{tem.why}。記録しておきます。': '...I see. {tem.en.not}. I would name "{tem.en.threat}". {tem.en.why}. Noted.',
  '機体で待っています。': 'I\'ll be waiting at the aircraft.',
  'わかりました。時間は十分にあります。': 'Understood. There\'s plenty of time.',
  '……。': '...',
  '審査の飛行は、よいものでした。……あなたの右の席に、いつか乗客として座る日を、楽しみにしています。': 'The check flight was a good one. ...I look forward to the day I sit behind you as a passenger.',
  '審査は終わりました。結果は真壁さんから聞いてください。': 'The check is over. You\'ll hear the result from Mr. Makabe.',
  // ---- in the seat (content/dialog/cockpit.js)
  'シートベルトは締めましたか。……はい、ドアもロックしました。': 'Seat belt fastened? ...Good, and the door is locked.',
  'どうしますか。': 'What would you like to do?',
  '基準のきびしさ（レベル）はどうしますか。3 つの課目とも、同じレベルで採点します。': 'How strict a standard (level)? All three lessons are graded at the same level.',
  'わかりました。では、エンジン始動前の点検から始めましょう。': 'All right. Let\'s start with the before-start checks.',
  '課目は、訓練空域に着いたところから始めます。レベルはどうしますか。': 'The lesson starts once we reach the practice area. Which level?',
  'わかりました。では、訓練空域へ向かいます。': 'All right. Off to the practice area.',
  'わかりました。エンジンをかけますね。': 'All right. I\'ll start the engine.',
  '地上では、足のペダルで向きを変えます。止まるときはブレーキです。動き出す前に、パーキングブレーキを外してください。': 'On the ground, you steer with the pedals and stop with the brakes. Release the parking brake before you move.',
  '滑走路 36 から離陸して、場周を一周してみましょう。わからないことがあれば、いつでも聞いてください。': 'Let\'s take off from runway 36 and fly one circuit. Ask me anytime.',
  'わかりました。準備ができたら、また乗ってください。': 'All right. Get back in when you\'re ready.',
  '訓練空域は、ここから北北東へ約 4 マイル、地図の LAB-A の手前です。高度は 3,000 ft。移動は省いて、空域に着いたところから始めますか。それとも、自分で飛んで行きますか。': 'The practice area is about four miles north-north-east, just short of LAB-A on the map, at 3,000 ft. Shall we skip the transit and start there, or will you fly there yourself?',
  'わかりました。では、空域に着いたところから始めます。': 'All right. We\'ll start at the practice area.',
  'では、針路 030 で 3,000 ft まで上昇して向かってください。MFD の地図にも出ています。空域に入ったら私が言います。': 'Then head 030 and climb to 3,000 ft. It\'s on the MFD map too. I\'ll tell you when we\'re in the area.',
  'LAB へ戻ります。滑走路 36 への直線進入、最終進入の 5 km の地点から着陸の課目です。そこまでの移動は省きますか。': 'Back to LAB. A straight-in to runway 36; the landing lesson starts 5 km out on final. Shall we skip the way there?',
  'わかりました。最終進入から始めます。': 'All right. We\'ll start on final.',
  'では、滑走路 36 の延長線上、南 5 km の地点へ。高度は 1,000 ft くらいまで下げておきましょう。': 'Then head for a point 5 km south, on the extended centreline of runway 36. Come down to about 1,000 ft.',
  'もう一度、場周を回ります。次の課目は、場周経路の途中から始まります。そこまでの移動は省きますか。': 'Once more round the pattern. The next lesson starts partway round. Shall we skip the way there?',
  'わかりました。そこから始めます。': 'All right. We\'ll start from there.',
  'では、左旋回でクロスウインド、ダウンウインドへ。地上 1,000 ft・90 kt です。課目の始まるところで私が言います。': 'Then turn left onto crosswind and downwind. 1,000 ft above the ground, 90 kt. I\'ll tell you where the lesson starts.',
  '左のマグネトーで、回転の下がり方が制限の 175 rpm を超えました。エンジンも少し荒れていますね。どうしますか。': 'On the left magneto the drop went past the 175 rpm limit. The engine is running a little rough, too. What will you do?',
  'いい判断です。制限を超えたら、飛ばない。地上管制には私が連絡します。駐機場へ戻りましょう。大城さんに見てもらいます。': 'Good decision. Past a limit, we don\'t fly. I\'ll tell Ground. Let\'s go back to the stand; Mr. Oshiro will look at it.',
  'それも手順のひとつです。1,800 rpm くらいで、ミクスチャーを少し絞って 30 秒。そのあと、もう一度 L と R を確かめてください。': 'That\'s one of the procedures. About 1,800 rpm, lean the mixture a little for 30 seconds. Then check L and R again.',
  'いいえ、それはだめです。制限を超えたマグネトーで離陸すると、上空で片方の点火が止まったとき、もう余裕がありません。今日は戻ります。': 'No, we can\'t do that. Take off on a magneto past its limit, and if the other ignition fails up there, there\'s no margin left. We\'re going back.',
  '焼いても、まだ制限を超えて落ちますね。プラグの汚れではなく、マグネトーそのものかもしれません。': 'Even after burning it off, it still drops past the limit. It may be the magneto itself, not a fouled plug.',
  '今日は飛ぶ予定はありません。': 'There\'s no flight planned today.',
  'わかりました。エンジンをかけますね。場周を一周して戻りましょう。': 'All right. I\'ll start the engine. One circuit and back.',
  '今日の飛行は終わりましたね。': 'Today\'s flight is done.',
  '今日の天気の判断がまだです。運航管理で METAR と TAF を見て、佐伯さんと決めてきてください。': 'You haven\'t made today\'s weather decision. Look at the METAR and TAF at dispatch and decide with Ms. Saeki.',
  '今日は飛ばないと決めましたね。その判断を守りましょう。': 'You decided not to fly today. Let\'s stick to that decision.',
  'まだブリーフィングをしていませんね。先に、ブリーフィング室 1 で今日の課目を確かめましょう。': 'We haven\'t had the briefing yet. First, let\'s go over today\'s lesson in briefing room 1.',
  'わかりました。では、始めましょう。': 'All right. Let\'s begin.',
  'どうぞ。': 'Go ahead.',
  'わかりました。準備ができたら、また。': 'All right. When you\'re ready.',
  // ---- by the aircraft (content/dialog/day1.js)
  '来ましたね。では、外部点検をお願いします。機体の周りを、操縦席・右の翼・機首・左の翼・尾部の順に回ります。': 'There you are. Please do the walk-around: round the aircraft in order, the cabin, the right wing, the nose, the left wing, the tail.',
  'おかしいと思ったら、その場で「報告する」を選んでください。整備に連絡します。迷ったときも、遠慮なく。': 'If something looks wrong, choose "report" right there, and we\'ll call maintenance. If in doubt, don\'t hesitate.',
  '終わったら、右の翼の上のドアから乗ってください。私もすぐに乗ります。': 'When you\'re done, get in through the door over the right wing. I\'ll be right behind you.',
  '焦らなくて大丈夫です。ひとつずつ、見て、触って、確かめましょう。': 'No need to rush. One thing at a time: look, touch, confirm.',
  // ---- the briefing (content/dialog/instructor.js)
  'ここ、翔洋航空 フライトアカデミーでは、飛ぶ前に必ずこの部屋でブリーフィングをします。': 'Here at the SHOYO AIRWAYS flight academy, we always brief in this room before we fly.',
  '何を、どう飛ぶのか。地上で頭に入れておけば、空の上で慌てずに済みます。': 'What we fly, and how. Get it into your head on the ground, and you won\'t panic in the air.',
  'こちらこそ、よろしくお願いします。わからないことは、いつでも聞いてください。': 'Likewise, I look forward to working with you. Ask me anything, anytime.',
  'おかえりなさい。準備は進んでいますか。': 'Welcome back. How are your preparations going?',
  'お疲れさまです。準備はいいですか。': 'Good to see you. Ready?',
  '何から始めましょうか。': 'Where shall we start?',
  'では、続けましょうか。': 'Shall we carry on?',
  'わかりました。準備ができたら、声をかけてください。': 'All right. Let me know when you\'re ready.',
  'ほかに何かありますか。': 'Anything else?',
  'いいですよ。何でも聞いてください。': 'Sure. Ask me anything.',
  'ここまでで、質問はありますか。': 'Any questions so far?',
  'では、このあとの流れです。': 'Now, what happens next.',
  '天気と今日の機体の割り当ては、運航管理（ディスパッチ）の予定表にあります。出る前に、もう一度だけ見ておくと安心です。': 'The weather and today\'s aircraft are on the dispatch board. Have one more look before you go out; it\'s reassuring.',
  'それからエプロン（駐機場）の今日の機体へ。外部点検をして、異常があれば私に知らせてください。私は機体のところで待っています。': 'Then out to today\'s aircraft on the apron. Do the walk-around, and tell me if anything is wrong. I\'ll be waiting by the aircraft.',
  'それからエプロン（駐機場）へ出て、機体のところまで歩いていきましょう。': 'Then out onto the apron, and we\'ll walk to the aircraft.',
  '体調に不安があれば、遠慮なく言ってください。飛ばないと決めるのも、大切な判断です。': 'If you\'re worried about how you feel, tell me. Deciding not to fly is an important decision too.',
  '今日は飛びません。訓練装置室の練習席で、この課目を進めてください。': 'We don\'t fly today. Work through this lesson in the training device room.',
  '地上での練習も、空の上でそのまま役に立ちます。': 'Practice on the ground pays off directly in the air.',
  'では、行きましょう。焦らず、一つずつ確かめていけば大丈夫です。': 'Then let\'s go. Take your time, check one thing after another, and you\'ll be fine.',
  'どういたしまして。わからないことは、そのままにしないでくださいね。': 'You\'re welcome. Don\'t leave anything you don\'t understand as it is.',
  'まず、この課目の考え方からお話しします。': 'First, the thinking behind this lesson.',
  'では、飛び方のポイントです。': 'Now, the key points of how to fly it.',
  '今日の基準は、こうです。': 'Today\'s standard is this.',
  'では、ひとつ確認させてください。今日の課目の目標は、次のうちどれでしょう。': 'Let me check one thing. Which of these is the goal of today\'s lesson?',
  'そのとおりです。よく聞いていましたね。': 'That\'s right. You were listening.',
  '目標がはっきりしていれば、何に集中すればいいかが決まります。': 'With a clear goal, you know what to focus on.',
  '大丈夫。飛ぶ前に確かめられて、よかったです。': 'It\'s all right. Good that we checked before flying.',
  '大丈夫。始める前に確かめられて、よかったです。': 'It\'s all right. Good that we checked before starting.',
  '何について聞きたいですか。今日の課目に関係するところから挙げますね。': 'What would you like to ask about? I\'ll list what goes with today\'s lesson first.',
  '何について聞きたいですか。': 'What would you like to ask about?',
  '続きです。どれにしますか。': 'Here are more. Which one?',
  '詳しくは教科書のこの節にあります。図もありますよ。': 'The details are in this section of the textbook. There\'s a figure, too.',
  '詳しくは教科書のこの節にあります。': 'The details are in this section of the textbook.',
  'ほかに、この節で確かめたいことはありますか。': 'Anything else you want to check in this section?',
  'いいですよ。画面に映しますね。': 'Sure. I\'ll put it on the screen.',
  '図と教科書の説明を、照らし合わせてみてください。': 'Compare the figure with the textbook\'s explanation.',
  // ---- the later written tests and the navigation log (content/school.js), given by 早瀬 教官
  '以上です。採点しますね。': 'That\'s all. I\'ll mark it.',
  '{quiz.right} / {quiz.n} 問、{quiz.pct}% でした。': '{quiz.right} out of {quiz.n}: {quiz.pct}%.',
  '合格です。これで、ソロ前の審査に進めます。': 'A pass. You can go on to the pre-solo check.',
  '今回は届きませんでした。間違えた問題の理由を、教科書でもう一度確かめてください。また受けられます。': 'Not this time. Check the reasons for the ones you missed in the textbook again. You can take it again.',
  '合格です。航法ログを作って、ひとりで遠くまで飛ぶ準備ができました。': 'A pass. You\'re ready to make a nav log and fly far, alone.',
  '合格です。計器の審査に進めます。': 'A pass. You can go on to the instrument check.',
  '合格です。双発の審査に進めます。': 'A pass. You can go on to the multi-engine check.',
  '合格です。残るは、最終審査の Check Flight だけです。': 'A pass. All that\'s left is the final check flight.',
  '今日は単独の野外飛行です。その前に、ここで航法ログを作りましょう。地図に線を引いて、風の計算をして、時間と燃料。全部、自分の手で。': 'Today is your solo cross-country. Before that, let\'s make the nav log here. Draw the line on the chart, work out the wind, the time and the fuel. All by your own hand.',
  '途中で目的地が変わることもあります。そのときに慌てないように、最初の計算をきちんと。': 'The destination may change on the way. So you don\'t panic then, get the first calculation right.',
  '航法ログは、これで大丈夫。午後、外部点検から始めてください。私は乗りません。無線は、ここで聞いています。': 'The nav log is fine. This afternoon, start with the walk-around. I won\'t be on board. I\'ll be listening on the radio from here.',
  'もう一度、計算を見直しましょう。午後までに直せば、今日飛べます。': 'Let\'s go over the calculation again. Fix it by the afternoon, and you can fly today.',
  // ---- the debrief's free question (content/dialog/debrief.js)
  'いいですよ。今日の飛行のことなら、何でも。': 'Sure. Anything about today\'s flight.',
};

// the lesson's own title as the course writes it, in quotes ("「直線水平飛行」" → "“直線水平飛行”")
const qt = (s) => `“${String(s).replace(/^「|」$/g, '')}”`;
export const PATTERNS = [
  [/^ホワイトボードを見てください。今日の課目は「(.+)」です。$/, (m) => `Look at the whiteboard. Today's lesson is ${qt(m[1])}.`],
  [/^目標は、(.+)ことです。$/, (m) => `The goal: ${qt(m[1])}.`],
  [/^目標は「(.+)」です。$/, (m) => `The goal is ${qt(m[1])}.`],
  [/^今日の目標は、(.+)ことです。$/, (m) => `Today's goal: ${qt(m[1])}.`],
  [/^今日の目標は「(.+)」です。$/, (m) => `Today's goal is ${qt(m[1])}.`],
  [/^図にすると、こうなります。教科書の「(.+)」にある図です。$/, (m) => `As a figure, it looks like this. It's from the textbook's ${qt(m[1])}.`],
  [/^今日の基準は「(.+)」です。$/, (m) => `Today's standard is ${qt(m[1])}.`],
  [/^今日はこの課目を、1 日の飛行の中でやります。(?:まず(.+)で離陸して、)?訓練空域でこの課目、(?:戻って(.+)です。|それで戻ります。)$/,
    (m) => `Today we fly this lesson inside a whole day's flight.${m[1] ? ` First we take off with ${m[1].split('と').map(qt).join(' and ')},` : ''} this lesson in the practice area${m[2] ? `, then back for ${m[2].split('と').map(qt).join(' and ')}` : ', and back'}.`],
  [/^それは「(.+)」の課目の目標ですね。$/, (m) => `That's the goal of the lesson ${qt(m[1])}.`],
  [/^(.+)ですね。どの章にしますか。$/, (m) => `${qt(m[1])}. Which chapter?`],
  [/^第 (\d+) 章「(.+)」ですね。どの節を聞きたいですか。$/, (m) => `Chapter ${m[1]}, ${qt(m[2])}. Which section would you like?`],
  [/^「(.+)」ですね。かいつまんで話します。$/, (m) => `${qt(m[1])}. I'll give you the gist.`],
  [/^「(.+)」ですね。大事なところを話します。$/, (m) => `${qt(m[1])}. Here are the important parts.`],
  [/^「(.+)」ですね。大事なのは、この一点です。$/, (m) => `${qt(m[1])}. One thing matters most.`],
  [/^「(.+)」ですね。大事なことは (\d+) つあります。$/, (m) => `${qt(m[1])}. There are ${m[2]} important things.`],
  [/^教科書の「(.+)」です。ゆっくり読んでください。$/, (m) => `Here's ${qt(m[1])} in the textbook. Take your time.`],
  // the written tests
  [/^(.+)です。(\d+) 問、(\d+)% 以上で合格。答えを選ぶと、すぐに正解と理由を言います。$/, (m) => `This is the ${EXAM_EN[m[1]] || qt(m[1])}. ${m[2]} questions; ${m[3]}% to pass. When you choose an answer, I'll tell you at once whether it's right, and why.`],
  // in the seat: today's lessons, and the check's
  [/^今日は(「.+」)。離陸して訓練空域で練習し、戻って着陸します。ブリーフィングのとおりにやってみましょう。$/, (m) => `Today: ${titles(m[1])}. We take off, practise in the area, and come back to land. Let's do it as briefed.`],
  [/^ブリーフィングはまだでしたね。今日は(「.+」)です。離陸して訓練空域で練習し、戻って着陸します。飛びながら説明します。$/, (m) => `We haven't briefed yet. Today: ${titles(m[1])}. We take off, practise in the area, and come back to land. I'll explain as we fly.`],
  [/^今日は(「.+」)。ブリーフィングのとおりに、エンジン始動前の点検から始めましょう。基準のきびしさ（レベル）はどうしますか。$/, (m) => `Today: ${titles(m[1])}. As briefed, let's start with the before-start checks. How strict a standard (level)?`],
  [/^シートベルト、ドア、よし。……では、(.+)を始めます。$/, (m) => `Seat belt, door: good. ...Now, we begin the ${checkEn(m[1])}.`],
  [/^内容は(「.+」)。ここから先、私は手伝いません。いつもどおりに、チェックリストから。$/, (m) => `It covers ${titles(m[1])}. From here on, I won't help. As always, start with the checklist.`],
];
const titles = (s) => s.split('、').map(qt).join(', ');
const EXAM_EN = { 'ソロ前の筆記試験': 'pre-solo written test', '航法の筆記試験': 'navigation written test', '計器飛行の筆記試験': 'instrument written test', '双発の筆記試験': 'multi-engine written test', '最終の筆記試験': 'final written test' };
// the checks' names (career/career.js CHECKS, and the pre-solo check)
export const CHECK_EN = { 'ソロ前の審査': 'pre-solo check', '単独の野外飛行': 'solo cross-country', '計器飛行の審査': 'instrument check', '双発の審査': 'multi-engine check', '最終審査（Check Flight）': 'final check (check flight)' };
const checkEn = (s) => CHECK_EN[s] || s;
// the people's names as the crew say them in English
export const WHO_EN = { '真壁さん': 'Mr. Makabe', '審査官の黒田さん': 'the examiner, Mr. Kuroda', '早瀬 教官': 'Mr. Hayase' };

// a line in English: the written one, or one of the shapes; null when there is none (the material, or not yet)
export function english(text) {
  if (typeof text !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(EN, text)) return EN[text];
  for (const [re, fn] of PATTERNS) { const m = re.exec(text); if (m) return fn(m); }
  return null;
}
// the dialog data with the English on the crew's nodes that have one (a node's own en stays); the data is copied
export function withEnglish(data, speakers = CREW) {
  const dialogs = {};
  for (const [d, dd] of Object.entries(data.dialogs)) {
    const nodes = {};
    for (const [id, n] of Object.entries(dd.nodes)) {
      if (n.en !== undefined || n.tag === 'material' || !speakers.includes(n.speaker)) { nodes[id] = n; continue; }
      const en = english(n.text);
      nodes[id] = en ? { ...n, en } : n;
    }
    dialogs[d] = { ...dd, nodes };
  }
  return { ...data, dialogs };
}
// the crew's nodes with no English and not the material's own words → ['dialog:node …']
export function missingEnglish(data, speakers = CREW) {
  const out = [];
  for (const [d, dd] of Object.entries(data.dialogs)) for (const [id, n] of Object.entries(dd.nodes)) {
    if (!speakers.includes(n.speaker) || n.tag === 'material') continue;
    if (n.en === undefined && !english(n.text)) out.push(`${d}:${id} ${n.text}`);
  }
  return out;
}

// ---- the instructor's words in the air (content/dialog/day1.js), for fly-mode's voice
export const AIR_EN = {
  prestart: 'Let\'s start with the before-start checklist. One item at a time, as on the list on the right. For items you check by eye, press Enter once you\'ve checked.',
  start: 'Let\'s start the engine. Mixture, throttle, master... in the list\'s order. If you\'re unsure, you can leave it to me.',
  afterStart: 'It caught. Oil pressure is coming up. Let\'s do the after-start checks.',
  atis: 'We\'ll listen to the ATIS. I\'ll set the frequency today. Listen carefully and tell me the altimeter setting.',
  ground: 'We call Ground. The first call goes: who you\'re calling, who you are, where, the ATIS, and what you want.',
  taxiOut: 'Release the parking brake and move off slowly. Steer with the pedals; speed with the throttle and the brakes. Follow the line, south on taxiway A, to the hold-short line at A1.',
  runup: 'Here we do the run-up. Stopped, and with the parking brake set first.',
  tower: 'We\'re ready. Call the tower on 118.3.',
  lineup: 'Cross the hold line onto the runway and stop lined up on the centreline.',
  takeoff: 'The tower will clear us for take-off. Read it back first. Today\'s lesson starts as we begin the roll.',
  closed: 'Today we practise in the pattern. Listen to the tower and read back.',
  leave: '1,000 ft above the ground. Keep climbing and answer the tower.',
  back: 'Well done. Back to LAB. Let\'s call the tower.',
  exit: 'Nicely stopped. Listen to the tower.',
  taxiOff: 'Turn right off the runway and stop once you\'re past the hold line.',
  groundIn: 'Call Ground on 121.7.',
  taxiIn: 'South on taxiway A. Follow the apron lines back to our usual spot. The after-landing checklist can be done on the move.',
  shutdown: 'We\'re here. Once stopped, the shutdown checklist.',
  list: 'All right, I\'ll do this part. Watch my hands.',
  taxi: 'I have control. I\'ll do the taxiing. Watch how I use the pedals and the brakes.',
  taxiDone: 'You have control. From here, it\'s yours.',
  recover: 'That\'s far enough for a forced landing. In real training I\'d add power and climb away by 500 ft above the ground. I have control. We\'re heading back to LAB.',
  incursion: 'Stop! You\'re past the hold line. You\'re not cleared onto the runway yet.',
  nostarter: 'The master switch is OFF, so the starter won\'t turn.',
  surge: 'Too much throttle. The rpm jumped the moment it caught. Open it only a little to start.',
  noClear: 'Stop short of the hold line.',
};
// what he says in the air (fly-mode's say) → English, or null (the lessons' own hints: the course's words)
const AIR = new Map([
  ...Object.entries(PHASE_LINES).map(([k, v]) => [v, AIR_EN[k]]), ...Object.entries(ASSIST_LINES).map(([k, v]) => [v, AIR_EN[k]]),
  [RECOVER_LINE, AIR_EN.recover], ...['incursion', 'nostarter', 'surge', 'noClear'].map(k => [EVENT_LINES[k], AIR_EN[k]]),
  ['今日はここまで。降りるときは、右のドアの取っ手をどうぞ。', 'That\'s all for today. To get out, the handle on the right door.'],
  ['ハードランディングです。フレアが遅れたか、進入が速すぎました。', 'A hard landing. The flare was late, or the approach was too fast.'],
  ['滑走路から外れました。ラダーでセンターラインを保ちましょう。', 'We left the runway. Keep the centreline with the rudder.'],
  ['尾部を擦りました。機首の上げすぎです。', 'The tail scraped. Too much nose-up.'],
  ['止まって！……ぶつけてしまいましたね。今日の飛行はここまでにします。', 'Stop! ...We hit something. That\'s the end of today\'s flight.'],
  ['1,800 rpm で、ミクスチャーを少し絞って 30 秒。それから L と R を、もう一度。', 'At 1,800 rpm, lean the mixture a little for 30 seconds. Then L and R, once more.'],
  ['駐機場へ戻ります。地上管制には連絡しました。タキシーは、いつもどおりに。', 'We\'re going back to the stand. I\'ve told Ground. Taxi as usual.'],
  [debriefLine({ crashed: true }), 'Are you all right? That\'s enough for today. We\'ll go over what happened together on the ground.'],
  [debriefLine({ done: true, grade: '―' }), 'Let\'s stop here for today. We\'ll carry on next time.'],
  [debriefLine({ done: true, passed: true, grade: 'S' }), 'Excellent. Right inside the standard.'],
  [debriefLine({ done: true, passed: true, grade: 'A' }), 'A pass. Well done. Next time, aim a little closer to the middle of the standard.'],
  [debriefLine({ done: true, passed: false, grade: 'C' }), 'So close. Let\'s look at the results together and see where it drifted.'],
]);
export function airEnglish(text) {
  if (AIR.has(text)) return AIR.get(text);
  let m = /^乗る前に、機体の周りを私も見てきました。([\s\S]*)$/.exec(text);
  if (m) return `Before we got in, I had a look round the aircraft too. ${m[1]}`;
  m = /^エンジンが止まりました（(.+)）。$/.exec(text);
  if (m) return `The engine has stopped (${m[1]}).`;
  return null;
}
