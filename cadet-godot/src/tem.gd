class_name CadetTem
extends RefCounted
# Port of cadet/src/career/tem.js (HTML CADET @ 898fe8a) — TEM: today's threat (three
# options, one right, with why-not texts for the others) and the debrief's error phrases.
# Pure logic. The JS `when` closures become a match on the threat id; the JS object
# identity tests become id comparisons (ids are unique; the one place identity could
# leak — the cb copy of the storm card — is neutralised by the when() filter, as in JS).

# id, ja (name), why (what makes it a threat today), plan (the right management), not (why not today)
const THREATS := [
	{ "id": "storm", "ja": "午後の雷雨", "why": "TAF に午後の雷雨（TEMPO TSRA）が出ています", "plan": "午前のうちに飛んで、13 時までに戻る。積乱雲が育ち始めたら、課目の途中でも帰ります", "not": "今日の TAF に雷雨はありません" },
	{ "id": "cloud", "ja": "低い雲（計器気象状態）", "why": "雲の底が 800 ft。進入では、最低高度まで滑走路が見えないかもしれません", "plan": "決心高度で滑走路が見えなければ、迷わず進入復行。計器のスキャンを止めない", "not": "今日は雲が高く、有視界で飛べます" },
	{ "id": "wind", "ja": "強い横風", "why": "横風が強く、突風もあります", "plan": "横風の限界を確かめる。着陸はエルロンを風上に、ラダーで機首を滑走路に。無理ならゴーアラウンド", "not": "今日の風は、ほぼ滑走路の向きです" },
	{ "id": "pmwind", "ja": "午後の強い横風", "why": "TAF では 15 時から横風が強まります", "plan": "午前のうちに飛んで、早めに戻る。戻りの着陸で風が強まっていたら、横風の限界を思い出す", "not": "午後も風は弱い予報です" },
	{ "id": "ceiling", "ja": "朝の低い雲", "why": "朝は雲の底が 600 ft です", "plan": "雲が上がるのを待つ。場周の高度（1,000 ft）より低い雲の下では飛ばない", "not": "今朝は雲が高いです" },
	{ "id": "fog", "ja": "朝の霧", "why": "朝は霧で視程が 1/2 SM です", "plan": "視程が上がるまで待つ。予報どおりに上がらなければ、その日は飛ばない", "not": "今朝は霧が出ていません" },
	{ "id": "bust", "ja": "予報外れの前線", "why": "TAF は終日 VFR ですが、西の空が暗く、前線が予報より早く近づいています", "plan": "午前のうちに飛んで、空が変わる前に戻る。飛んでいる間に空が変わり始めたら、課目の途中でも帰る", "not": "今日は予報どおりの空です" },
	{ "id": "tired", "ja": "自分の疲れ", "why": "疲れが残っています。判断も手も、いつもより遅れます", "plan": "手順をいつもより声に出して確かめる。迷ったら早めに、安全なほうを選ぶ", "not": "今日はよく休めています" },
	{ "id": "check", "ja": "審査の緊張", "why": "今日は審査です。緊張すると、いつもの手順が抜けます", "plan": "毎日の手順のとおりに。チェックリストを飛ばさず、ひとつずつ声に出す", "not": "今日は審査の日ではありません" },
	{ "id": "nav", "ja": "一人での航法（迷うこと）", "why": "今日は一人で、知らない場所まで飛びます", "plan": "最後に確かだった場所から考える。VOR と DME も使う。燃料と時間に余裕を持つ", "not": "今日は場周と訓練空域の中だけです" },
	{ "id": "twin", "ja": "慣れない双発機（片発）", "why": "Seminole は速くて重く、片方のエンジンが止まると強く片側へ引かれます", "plan": "片発になったら「パワー、ピッチ、足」。Vmc より速く、ブルーラインの速度を保つ", "not": "今日は Archer です" },
	{ "id": "sd", "ja": "空間識失調（体の感覚）", "why": "フードの中では、体の感覚が計器と食い違います", "plan": "体の感覚ではなく計器を信じる。姿勢指示器に目を戻しながら、スキャンを続ける", "not": "今日は外を見て飛ぶ課目です" },
	{ "id": "traffic", "ja": "場周の混雑（ほかの訓練機）", "why": "ほかの訓練機が場周を飛んでいます。同じ高度、同じ経路です", "plan": "交信をよく聞いて、ほかの機体の位置を頭に描く。見張りを続ける", "not": "今日はほかの訓練機は飛んでいません" },
	{ "id": "calm", "ja": "静かな日の油断", "why": "天気も体調も問題なく、目立つ脅威がありません。そういう日ほど、注意は静かに落ちていきます", "plan": "チェックリストはいつもどおり声に出す。見張りは「何も見えない」ことも言葉にして、確認したことにする", "not": "今日は目立つ脅威があります。それが今日の脅威です" },
]
const THREATS_EN := {
	"storm": { "ja": "afternoon thunderstorms", "why": "The TAF has thunderstorms this afternoon (TEMPO TSRA)", "plan": "fly in the morning and be back by 13:00; if the cumulonimbus starts to build, we come back, even mid-lesson", "not": "There are no thunderstorms in today's TAF" },
	"cloud": { "ja": "low cloud (IMC)", "why": "The cloud base is 800 ft; on the approach you may not see the runway until the minimums", "plan": "no runway at decision altitude, go around without hesitating; never stop the instrument scan", "not": "Today the cloud is high; we can fly VFR" },
	"wind": { "ja": "a strong crosswind", "why": "The crosswind is strong, and gusting", "plan": "know the crosswind limit; land with aileron into the wind and rudder to keep the nose on the runway; go around if it's too much", "not": "Today's wind is almost straight down the runway" },
	"pmwind": { "ja": "a strong afternoon crosswind", "why": "The TAF has the crosswind picking up from 15:00", "plan": "fly in the morning and come back early; if it has picked up for the landing, remember the crosswind limit", "not": "The afternoon wind is forecast light" },
	"ceiling": { "ja": "low morning cloud", "why": "This morning the cloud base is 600 ft", "plan": "wait for the cloud to lift; no flying under cloud lower than the pattern altitude (1,000 ft)", "not": "This morning the cloud is high" },
	"fog": { "ja": "morning fog", "why": "This morning the fog has the visibility at 1/2 SM", "plan": "wait for the visibility to improve; if it doesn't lift as forecast, no flying today", "not": "There's no fog this morning" },
	"bust": { "ja": "a front ahead of its forecast", "why": "The TAF says VFR all day, but the western sky is darkening — a front may arrive ahead of its forecast", "plan": "fly in the morning and be back before the sky changes; if it starts to change while we fly, we come back, even mid-lesson", "not": "Today the sky is doing what the forecast said" },
	"tired": { "ja": "your own fatigue", "why": "You're still tired; your judgement and your hands will lag", "plan": "say the steps out loud more than usual; when in doubt, choose the safe way early", "not": "You're well rested today" },
	"check": { "ja": "check-ride nerves", "why": "Today is a check; nerves make you skip the usual steps", "plan": "do it the everyday way; never skip the checklist, say each item out loud", "not": "Today isn't a check day" },
	"nav": { "ja": "navigating alone (getting lost)", "why": "Today you fly alone to places you don't know", "plan": "start from the last place you were sure of; use the VOR and DME; keep a margin of fuel and time", "not": "Today we stay in the pattern and the practice area" },
	"twin": { "ja": "an unfamiliar twin (one engine out)", "why": "The Seminole is fast and heavy, and pulls hard to one side when an engine stops", "plan": "one engine out: power, pitch, feet; stay faster than Vmc, hold blue-line speed", "not": "Today it's the Archer" },
	"sd": { "ja": "spatial disorientation", "why": "Under the hood your body's sense disagrees with the instruments", "plan": "trust the instruments, not your body; keep scanning, back to the attitude indicator", "not": "Today's lesson is flown looking outside" },
	"traffic": { "ja": "a busy pattern (other trainers)", "why": "Other trainers are flying the pattern today, at the same altitude on the same circuit", "plan": "listen to the radio and keep a picture of where the others are; keep looking out", "not": "No other trainers are flying today" },
	"calm": { "ja": "complacency on a quiet day", "why": "The weather is fine, you are rested, and nothing stands out — those are the days attention quietly fades", "plan": "use the checklist out loud as always; call the scan: \"nothing seen\" is a check made, not skipped", "not": "Today something does stand out; that is today's threat" },
}
const CB_WHY := "TAF に午後の雷雨（TEMPO TSRA）。西の空には、もう積乱雲がひとつ育っています"
const CB_PLAN := "午前のうちに飛んで、13 時までに戻る。西の積乱雲には近づかない（大きく離れる）。育ち始めたら、課目の途中でも帰ります"
const CB_EN := { "why": "The TAF has thunderstorms this afternoon (TEMPO TSRA) — and one cumulonimbus is already standing in the west", "plan": "fly in the morning and be back by 13:00; give the cell in the west a wide berth, and come back even mid-lesson if it builds" }

static func _when(id: String, o: Dictionary) -> bool:
	match id:
		"storm": return o.get("weather") == "pmStorm"
		"cloud": return o.get("weather") == "lowCloud"
		"wind": return o.get("weather") == "crosswind"
		"pmwind": return o.get("weather") == "pmWind"
		"ceiling": return o.get("weather") == "amLowCloud"
		"fog": return o.get("weather") == "amFog"
		"bust": return o.get("weather") == "forecastBust"
		"tired": return (typeof(o.get("fatigue")) == TYPE_INT or typeof(o.get("fatigue")) == TYPE_FLOAT) and float(o["fatigue"]) >= 45.0
		"check": return bool(o.get("check", false))
		"nav": return bool(o.get("xc", false))
		"twin": return o.get("aircraft") == "pa44"
		"sd": return o.get("chapter") == "ch4"
		"traffic": return int(float(o["traffic"])) > 0 if (typeof(o.get("traffic")) == TYPE_INT or typeof(o.get("traffic")) == TYPE_FLOAT) else false
		"calm": return true
	return false

static func threat_of(id: String) -> Variant:
	for t in THREATS:
		if t["id"] == id:
			return t
	return null

# tem_for(o { weather, fatigue, chapter, aircraft, check, xc, day, traffic, cb })
#   -> { threat: { id, ja, why, plan, en: { threat, why, plan } }, options, right, others, othersEn }
static func tem_for(o: Dictionary) -> Dictionary:
	var today = null
	for t in THREATS:
		if _when(t["id"], o):
			today = t
			break
	var cb = bool(o.get("cb", false))
	var why = String(today["why"])
	var plan = String(today["plan"])
	var en_why = String(THREATS_EN[today["id"]]["why"])
	var en_plan = String(THREATS_EN[today["id"]]["plan"])
	if cb and today["id"] == "storm":
		why = CB_WHY
		plan = CB_PLAN
		en_why = CB_EN["why"]
		en_plan = CB_EN["plan"]
	var others: Array = []
	for t in THREATS:
		if t["id"] != today["id"] and t["id"] != "traffic" and not _when(t["id"], o):
			others.append(t)
	var day_i = int(float(o["day"])) if (typeof(o.get("day")) == TYPE_INT or typeof(o.get("day")) == TYPE_FLOAT) else 0
	var k = absi(day_i * 7 + 3) % maxi(1, others.size())
	var two: Array = []
	for cand in [others[k % others.size()], others[(k + 3) % others.size()]]:
		if not two.has(cand):
			two.append(cand)
	while two.size() < 2:
		for t in others:
			if not two.has(t):
				two.append(t)
				break
	var right = absi(day_i * 5 + 1) % 3
	var opts = two.duplicate()
	opts.insert(right, today)
	var options: Array = []
	var others_txt: Array = []
	var others_en: Array = []
	for t in opts:
		options.append(t["ja"])
		others_txt.append("" if t["id"] == today["id"] else t["not"])
		others_en.append("" if t["id"] == today["id"] else THREATS_EN[t["id"]]["not"])
	var threat = { "id": today["id"], "ja": today["ja"], "why": why, "plan": plan,
		"en": { "threat": THREATS_EN[today["id"]]["ja"], "why": en_why, "plan": en_plan } }
	return { "threat": threat, "options": options, "right": right, "others": others_txt, "othersEn": others_en }

static func errors_of(sum: Dictionary) -> Array:
	var out: Array = []
	if bool(sum.get("incursion", false)):
		out.append("許可の前に停止線を越えたこと")
	var radio = sum.get("radio")
	if typeof(radio) == TYPE_DICTIONARY and radio.get("wrong"):
		out.append("無線の復唱の言い直し（%d 回）" % int(radio["wrong"]))
	if (float(sum["autoItems"]) if (typeof(sum.get("autoItems")) == TYPE_INT or typeof(sum.get("autoItems")) == TYPE_FLOAT) else 0.0) > 6.0:
		out.append("チェックリストを教官に任せたこと")
	var walk = sum.get("walk")
	if typeof(walk) == TYPE_DICTIONARY and typeof(walk.get("missed")) == TYPE_ARRAY and not walk["missed"].is_empty():
		out.append("外部点検の見落とし")
	for l in sum.get("lessons", []):
		if typeof(l) != TYPE_DICTIONARY or not bool(l.get("done", false)):
			continue
		var bad_row = null
		for r in l.get("rows", []):
			if not bool(r.get("pass", true)):
				bad_row = r
				break
		if bad_row != null:
			out.append("%sの%s" % [String(l.get("title", "")), String(bad_row.get("name", ""))])
			break
	return out

static func errors_of_en(sum: Dictionary) -> Array:
	var out: Array = []
	if bool(sum.get("incursion", false)):
		out.append("crossing the hold line before the clearance")
	var radio = sum.get("radio")
	if typeof(radio) == TYPE_DICTIONARY and radio.get("wrong"):
		out.append("read-backs said again (%d)" % int(radio["wrong"]))
	if (float(sum["autoItems"]) if (typeof(sum.get("autoItems")) == TYPE_INT or typeof(sum.get("autoItems")) == TYPE_FLOAT) else 0.0) > 6.0:
		out.append("leaving the checklist to the instructor")
	var walk = sum.get("walk")
	if typeof(walk) == TYPE_DICTIONARY and typeof(walk.get("missed")) == TYPE_ARRAY and not walk["missed"].is_empty():
		out.append("items missed on the walk-around")
	for l in sum.get("lessons", []):
		if typeof(l) != TYPE_DICTIONARY or not bool(l.get("done", false)):
			continue
		var bad_row = null
		for r in l.get("rows", []):
			if not bool(r.get("pass", true)):
				bad_row = r
				break
		if bad_row != null:
			out.append("“%s” in “%s”" % [String(bad_row.get("name", "")), String(l.get("title", ""))])
			break
	return out
