// FreeModeMain — the free-mode setup screen (Stage 10): aircraft × start
// state × time/weather presets, built entirely from CadetFreeMode's tables
// (the port of content/free-mode.js) so screen and session can never drift.
// Starting a session builds the cfg through CadetFreeMode.BuildFreeCfg and
// applies it to a CockpitMain session. Sandbox contract: this screen never
// touches career state.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.UI;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

/// <summary>Shared uGUI text helper: text drawn through RasterCanvas into a
/// texture (the Stage 8 lesson — uGUI Text with dynamic fonts loses glyphs).</summary>
public static class CadetUiTex
{
    static string Hex(Color c) { return "#" + ColorUtility.ToHtmlStringRGB(c); }
    public static RawImage Text(Transform parent, string text, int w, int h, int px, Color color, TextAnchor anchor = TextAnchor.MiddleLeft)
    {
        var rc = new RasterCanvas(w, h);
        rc.ClearAll();
        rc.FillStyle = Hex(color); rc.Font = new FontSpec(px, 400, false);
        rc.TextBaseline = "middle";
        rc.TextAlign = anchor == TextAnchor.MiddleCenter ? "center" : anchor == TextAnchor.MiddleRight ? "right" : "left";
        double x = anchor == TextAnchor.MiddleCenter ? w / 2.0 : anchor == TextAnchor.MiddleRight ? w - 4 : 4;
        rc.FillText(text ?? "", x, h / 2.0);
        rc.Upload();
        var go = new GameObject("T");
        go.transform.SetParent(parent, false);
        var ri = go.AddComponent<RawImage>(); ri.texture = rc.Tex; ri.raycastTarget = false;
        var rt = go.GetComponent<RectTransform>(); rt.sizeDelta = new Vector2(w, h);
        return ri;
    }
    public static Button Btn(Transform parent, string label, int w, int h, int px, Color bg, Color fg, Action onClick)
    {
        var go = new GameObject("B");
        go.transform.SetParent(parent, false);
        var img = go.AddComponent<Image>(); img.color = bg;
        var btn = go.AddComponent<Button>(); btn.targetGraphic = img;
        var rt = go.GetComponent<RectTransform>(); rt.sizeDelta = new Vector2(w, h);
        var lab = Text(go.transform, label, w, h, px, fg, TextAnchor.MiddleCenter);
        lab.rectTransform.anchorMin = lab.rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
        lab.rectTransform.anchoredPosition = Vector2.zero;
        if (onClick != null) btn.onClick.AddListener(() => onClick());
        return btn;
    }
    public static void Place(RectTransform rt, float x, float y)
    {
        rt.anchorMin = rt.anchorMax = new Vector2(0, 1);
        rt.pivot = new Vector2(0, 1);
        rt.anchoredPosition = new Vector2(x, -y);
    }
}

public class FreeModeMain : MonoBehaviour
{
    public string SelAircraft = "pa28", SelStart = "ramp", SelWind = "light", SelLoading = "std", SelFail = "none", SelFailWhen = "now";
    public double SelHour = 9, SelWindRel = 45, SelWindKt = 12, SelFailValue = 5;
    public Dict LastCfg;
    public double LastNowMs;
    public string FailPlanDesc = "";
    // Stage 13 (Task 3): the failure plan made live — the fly-mode scheduler
    // (failSched / failElapsed / dueSchedule / applyFail) running on the
    // cockpit session this screen starts.
    public System.Collections.Generic.List<Failures.Schedule> FailSched = new System.Collections.Generic.List<Failures.Schedule>();
    public double FailElapsedMin;
    public System.Collections.Generic.List<string> FailFiredKinds = new System.Collections.Generic.List<string>();
    public bool SessionActive;
    public CockpitMain Cockpit;
    readonly List<(Button btn, string group, string value)> optionBtns = new List<(Button, string, string)>();
    Text hourValLabel;
    Canvas canvas;

    void Awake() { BuildUi(); Refresh(); }

    void RowLabel(Transform p, string text, float x, float y)
    {
        var t = CadetUiTex.Text(p, text, 150, 40, 22, new Color(0.75f, 0.85f, 1f));
        CadetUiTex.Place(t.rectTransform, x, y);
    }
    void OptionRow(Transform p, string group, (string Id, string Label)[] opts, float x, float y, int bw, Action<string> set)
    {
        float cx = x;
        foreach (var (id, label) in opts)
        {
            string v = id;
            var b = CadetUiTex.Btn(p, label, bw, 40, 17, new Color(0.16f, 0.2f, 0.3f), Color.white, () => { set(v); Refresh(); });
            CadetUiTex.Place(b.GetComponent<RectTransform>(), cx, y);
            optionBtns.Add((b, group, v));
            cx += bw + 6;
        }
    }
    string GroupValue(string g)
    {
        switch (g)
        {
            case "aircraft": return SelAircraft; case "start": return SelStart; case "wind": return SelWind;
            case "loading": return SelLoading; case "fail": return SelFail; case "failWhen": return SelFailWhen;
            case "hour": return SelHour.ToString(System.Globalization.CultureInfo.InvariantCulture);
            default: return "";
        }
    }
    void BuildUi()
    {
        canvas = new GameObject("FreeCanvas").AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.gameObject.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvas.gameObject.AddComponent<GraphicRaycaster>();
        var p = canvas.transform;
        var title = CadetUiTex.Text(p, "フリーモード — 機体 × 開始状態 × 時刻／天候（キャリアには影響しません）", 1500, 46, 26, new Color(1f, 0.85f, 0.5f));
        CadetUiTex.Place(title.rectTransform, 30, 16);
        RowLabel(p, "機体", 30, 76);
        var ac = new (string, string)[CadetFreeMode.FREE_AIRCRAFT.Length];
        for (int i = 0; i < ac.Length; i++) ac[i] = (CadetFreeMode.FREE_AIRCRAFT[i].Id, CadetFreeMode.FREE_AIRCRAFT[i].Label);
        OptionRow(p, "aircraft", ac, 190, 76, 300, v => SelAircraft = v);
        RowLabel(p, "開始状態", 30, 126);
        var st = new (string, string)[CadetFreeMode.FREE_STARTS.Length];
        for (int i = 0; i < st.Length; i++) st[i] = (CadetFreeMode.FREE_STARTS[i].Id, CadetFreeMode.FREE_STARTS[i].Label);
        OptionRow(p, "start", st, 190, 126, 400, v => SelStart = v);
        RowLabel(p, "時刻", 30, 176);
        var hr = new (string, string)[CadetFreeMode.FREE_HOURS.Length];
        for (int i = 0; i < hr.Length; i++) hr[i] = (CadetFreeMode.FREE_HOURS[i].Hour.ToString(), CadetFreeMode.FREE_HOURS[i].Label);
        OptionRow(p, "hour", hr, 190, 176, 130, v => SelHour = double.Parse(v));
        RowLabel(p, "風", 30, 226);
        var wd = new (string, string)[CadetFreeMode.FREE_WIND_OPTS.Length];
        for (int i = 0; i < wd.Length; i++) wd[i] = (CadetFreeMode.FREE_WIND_OPTS[i].Id, CadetFreeMode.FREE_WIND_OPTS[i].Label);
        OptionRow(p, "wind", wd, 190, 226, 260, v => SelWind = v);
        var relM = CadetUiTex.Btn(p, "方位 −15°", 130, 40, 17, new Color(0.2f, 0.24f, 0.36f), Color.white, () => { SelWindRel = (SelWindRel + 345) % 360; Refresh(); });
        CadetUiTex.Place(relM.GetComponent<RectTransform>(), 190, 276);
        var relP = CadetUiTex.Btn(p, "方位 ＋15°", 130, 40, 17, new Color(0.2f, 0.24f, 0.36f), Color.white, () => { SelWindRel = (SelWindRel + 15) % 360; Refresh(); });
        CadetUiTex.Place(relP.GetComponent<RectTransform>(), 330, 276);
        var ktM = CadetUiTex.Btn(p, "風速 −2 kt", 130, 40, 17, new Color(0.2f, 0.24f, 0.36f), Color.white, () => { SelWindKt = Math.Max(0, SelWindKt - 2); Refresh(); });
        CadetUiTex.Place(ktM.GetComponent<RectTransform>(), 470, 276);
        var ktP = CadetUiTex.Btn(p, "風速 ＋2 kt", 130, 40, 17, new Color(0.2f, 0.24f, 0.36f), Color.white, () => { SelWindKt = Math.Min(40, SelWindKt + 2); Refresh(); });
        CadetUiTex.Place(ktP.GetComponent<RectTransform>(), 610, 276);
        RowLabel(p, "搭載", 30, 326);
        var ld = new (string, string)[CadetFreeMode.FREE_LOAD_OPTS.Length];
        for (int i = 0; i < ld.Length; i++) ld[i] = (CadetFreeMode.FREE_LOAD_OPTS[i].Id, CadetFreeMode.FREE_LOAD_OPTS[i].Label);
        OptionRow(p, "loading", ld, 190, 326, 260, v => SelLoading = v);
        RowLabel(p, "故障", 30, 376);
        var fl = new (string, string)[CadetFreeMode.FREE_FAIL_OPTS.Length];
        for (int i = 0; i < fl.Length; i++) fl[i] = (CadetFreeMode.FREE_FAIL_OPTS[i].Id, CadetFreeMode.FREE_FAIL_OPTS[i].Label);
        // the failure list is long: two rows of cycling buttons (prev/next per half) would hide names;
        // instead a single cycling button shows the current pick with its full label.
        var failBtn = CadetUiTex.Btn(p, "", 900, 40, 17, new Color(0.16f, 0.2f, 0.3f), Color.white, () =>
        {
            int i = Array.FindIndex(CadetFreeMode.FREE_FAIL_OPTS, o => o.Id == SelFail);
            SelFail = CadetFreeMode.FREE_FAIL_OPTS[(i + 1) % CadetFreeMode.FREE_FAIL_OPTS.Length].Id; Refresh();
        });
        CadetUiTex.Place(failBtn.GetComponent<RectTransform>(), 190, 376);
        optionBtns.Add((failBtn, "failcycle", ""));
        RowLabel(p, "故障時期", 30, 426);
        OptionRow(p, "failWhen", new[] { ("now", "すぐ"), ("time", "◯分後"), ("alt", "◯ft 到達時") }, 190, 426, 200, v => SelFailWhen = v);
        var fvM = CadetUiTex.Btn(p, "−", 60, 40, 20, new Color(0.2f, 0.24f, 0.36f), Color.white, () => { SelFailValue = Math.Max(0, SelFailValue - (SelFailWhen == "alt" ? 500 : 1)); Refresh(); });
        CadetUiTex.Place(fvM.GetComponent<RectTransform>(), 820, 426);
        var fvP = CadetUiTex.Btn(p, "＋", 60, 40, 20, new Color(0.2f, 0.24f, 0.36f), Color.white, () => { SelFailValue += (SelFailWhen == "alt" ? 500 : 1); Refresh(); });
        CadetUiTex.Place(fvP.GetComponent<RectTransform>(), 960, 426);
        var start = CadetUiTex.Btn(p, "この条件で飛行開始", 420, 56, 24, new Color(0.1f, 0.45f, 0.2f), Color.white, () => StartSession());
        CadetUiTex.Place(start.GetComponent<RectTransform>(), 190, 500);
    }
    void Refresh()
    {
        foreach (var (btn, group, value) in optionBtns)
        {
            var img = btn.GetComponent<Image>();
            if (group == "failcycle")
            {
                var cur = Array.Find(CadetFreeMode.FREE_FAIL_OPTS, o => o.Id == SelFail);
                var lab = btn.GetComponentInChildren<RawImage>();
                var rc = new RasterCanvas(900, 40);
                rc.ClearAll();
                rc.FillStyle = "#ffffff"; rc.Font = new FontSpec(17, 400, false);
                rc.TextAlign = "center"; rc.TextBaseline = "middle";
                rc.FillText("故障：" + cur.Label + "（クリックで切替）", 450, 20);
                rc.Upload(); lab.texture = rc.Tex;
                img.color = new Color(0.16f, 0.2f, 0.3f);
                continue;
            }
            bool on = GroupValue(group) == value;
            img.color = on ? new Color(0.85f, 0.6f, 0.15f) : new Color(0.16f, 0.2f, 0.3f);
        }
    }

    /// <summary>The screen's selections as the cfg builder's raw input.</summary>
    public Dict Selections()
    {
        return new Dict
        {
            { "aircraft", SelAircraft }, { "start", SelStart }, { "hour", SelHour },
            { "wind", SelWind }, { "windRel", SelWindRel.ToString(System.Globalization.CultureInfo.InvariantCulture) }, { "windKt", SelWindKt.ToString(System.Globalization.CultureInfo.InvariantCulture) },
            { "loading", SelLoading }, { "fail", SelFail }, { "failWhen", SelFailWhen },
            { "failMin", SelFailValue.ToString(System.Globalization.CultureInfo.InvariantCulture) }, { "failAlt", SelFailValue.ToString(System.Globalization.CultureInfo.InvariantCulture) },
        };
    }

    /// <summary>Start the free session: build the cfg, start the cockpit
    /// session, apply start state / wind / loading. Career state untouched.</summary>
    public Dict StartSession()
    {
        LastNowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        LastCfg = CadetFreeMode.BuildFreeCfg(Selections(), LastNowMs);
        var cfg = LastCfg;
        string type = (string)cfg["aircraft"];
        string start = (string)cfg["start"];
        if (Cockpit == null) Cockpit = FindObjectOfType<CockpitMain>();
        if (Cockpit == null) { var go = new GameObject("CockpitMain"); Cockpit = go.AddComponent<CockpitMain>(); }
        Cockpit.StartParkedSession(type);
        var s = Cockpit.S;
        // loading
        var ld = (Dict)cfg["loading"];
        Sim.ApplyLoading(s, new Loading { Fuel = (string)ld["fuel"], Front = (int)MiniJson.Num(ld, "front"), Rear = (int)MiniJson.Num(ld, "rear"), BagKg = MiniJson.Num(ld, "bagKg") });
        // wind: the cfg's wind is relative to the runway (LAB heading 264°)
        var wn = (Dict)cfg["wind"];
        s.Wind = new WindState { FromDeg = (264 + MiniJson.Num(wn, "rel")) % 360, Kt = MiniJson.Num(wn, "kt"), Gust = MiniJson.Num(wn, "gust") };
        // failure plan — live since Stage 13: previous faults are cleared,
        // then the chosen failure is applied at once or scheduled through
        // Failures.MakeSchedule, and with no choice the seeded roll
        // (randomFailureFor, day 1 / free) schedules one instead (fly-mode.js
        // startFreeSession, line for line).
        Cockpit.Sys.SetFault(null); Cockpit.Sys.SetElecFault(false); s.CarbRisk = 0;
        FailSched.Clear(); FailFiredKinds.Clear(); FailElapsedMin = 0; SessionActive = true;
        if (cfg["fail"] != null)
        {
            string kind = (string)cfg["fail"];
            var fa = cfg["failAt"] as Dict;
            double? atMin = fa != null && fa.TryGetValue("atMin", out var mv) ? (double?)MiniJson.Num(fa, "atMin") : null;
            double? atAlt = fa != null && fa.TryGetValue("atAltFt", out var av) ? (double?)MiniJson.Num(fa, "atAltFt") : null;
            var entry = Failures.MakeSchedule(kind, atMin, atAlt);
            if (entry != null && (atAlt != null || (atMin != null && atMin.Value > 0))) { FailSched.Add(entry); FailPlanDesc = kind + "（予約：" + (atAlt != null ? atAlt.Value + " ft 到達時" : atMin.Value + " 分後") + "）"; }
            else { ApplyFail(kind); FailPlanDesc = kind + "（即時）"; }
        }
        else
        {
            var rf = Failures.RandomFailureFor((int)MiniJson.Num(cfg, "seed"), 1, "free", false, false, false, type, null, "free");
            var entry = Failures.ScheduleOf(rf);
            if (entry != null) { FailSched.Add(entry); FailPlanDesc = "ランダム（シード " + MiniJson.Num(cfg, "seed") + "）：" + entry.Kind + " を予約"; }
            else FailPlanDesc = "ランダム（シード " + MiniJson.Num(cfg, "seed") + "）：この飛行では故障なし";
        }
        if (start != "ramp")
        {
            Cockpit.Sys.SetRunning(s);
            double altFt = start == "area" ? 3000 : start == "pattern" ? 1000 : start == "final" ? 1200 : start == "ils" ? 2000 : 0;
            if (altFt > 0)
            {
                s.Pos = new[] { s.Pos[0], FlightPhysics.GROUND_M + altFt * 0.3048, s.Pos[2] };
                s.OnGround = false;
                var fwd = PhysMath.QRot(s.Q, new[] { 1.0, 0.0, 0.0 });
                double spd = type == "b737" ? 140 * 0.514444 : 90 * 0.514444;
                s.Vel = new[] { fwd[0] * spd, 0.0, fwd[2] * spd };
                s.Thr = 0.55;
                if (type != "pa28") { s.GearDown = false; s.GearPos = 0; }
            }
        }
        Sim.Derive(s);
        return cfg;
    }

    /// <summary>fly-mode.js applyFail: the systems' own faults for mag/elec,
    /// the carb-ice gate for carb, FLIGHT LAB's failNow effects for the rest
    /// (ppanel = ahrs + gps).</summary>
    public void ApplyFail(string kind)
    {
        if (Cockpit == null || !Cockpit.SessionLive) return;
        FailFiredKinds.Add(kind);
        if (kind == "mag") { Cockpit.Sys.SetFault(200); return; }
        if (kind == "elec") { Cockpit.Sys.SetElecFault(true); return; }
        if (kind == "carb") { Cockpit.S.CarbRisk = 1; return; }
        if (kind == "ppanel") { FailEffects("ahrs"); FailEffects("gps"); return; }
        FailEffects(kind);
    }
    void FailEffects(string kind)
    {
        // CadetSchoolEngine School.FailNow, applied to the session's own
        // state/avionics (there is no lesson state in free flight).
        var s = Cockpit.S; var av = Cockpit.Av;
        if (kind == "engine") s.Eng[0].Failed = true;
        else if (kind == "engL") s.Eng[0].Failed = true;
        else if (kind == "engR") s.Eng[s.Eng.Count - 1].Failed = true;
        else if (kind == "ahrs") { if (av.Fail == null) av.Fail = new System.Collections.Generic.Dictionary<string, bool>(); av.Fail["ahrs"] = true; }
        else if (kind == "gps") { if (av.Fail == null) av.Fail = new System.Collections.Generic.Dictionary<string, bool>(); av.Fail["gps"] = true; if (av.Cdi == "GPS") av.Direct = null; }
        else if (kind == "pitot") s.PitotRisk = 3;
        else if (kind == "static") s.StaticBlocked = true;
        else if (kind == "pump") s.Eng[0].PumpFail = true;
        else if (kind == "gear") s.GearFault = true;
    }

    /// <summary>One scheduler tick (dtMin = elapsed flight minutes). Called
    /// from CockpitMain.Frame — the setup panel itself is inactive while the
    /// session is flown, so it cannot tick from its own Update.</summary>
    public void TickScheduler(double dtMin)
    {
        // the scheduler clock runs only while the flight does (fly-mode.js)
        if (!SessionActive || Cockpit == null || !Cockpit.SessionLive || FailSched.Count == 0) return;
        FailElapsedMin += dtMin;
        double altFt = Cockpit.S.Out != null ? Cockpit.S.Out.AltTrue : 0;
        var due = Failures.DueSchedule(FailSched, FailElapsedMin, altFt);
        foreach (var e in due) { FailSched.Remove(e); ApplyFail(e.Kind); }
    }
}
