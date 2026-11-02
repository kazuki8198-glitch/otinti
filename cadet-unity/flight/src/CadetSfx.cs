// CadetSfx — a verbatim C# port of cadet/src/audio/sfx.js (Stage 11): the
// game's procedural sound design (no sound files) as a Web-Audio-style node
// graph built against an abstract backend. The RecordingBackend reproduces
// the golden log from the JS original driven on a fake context (the same
// verification approach as the original's own sfx.test.mjs); the port also
// maintains LiveState (the engine mix's glide targets + one-shot
// descriptors) which the Unity SfxMain turns into audible sound.
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    // ---------------- the backend abstraction (the Web Audio surface sfx.js uses)
    public class SfxParam
    {
        public SfxNode Node; public string Name; public double Value;
        public virtual void SetValueAtTime(double v, double t) { Value = v; }
        public virtual void LinearRampToValueAtTime(double v, double t) { }
        public virtual void ExponentialRampToValueAtTime(double v, double t) { }
        public virtual void SetTargetAtTime(double v, double t, double tc) { }
        public virtual void CancelScheduledValues(double t) { }
    }
    public class SfxNode
    {
        public string Kind;
        public int Id;
        public string BiquadType = "lowpass";
        public Dictionary<string, SfxParam> Params = new Dictionary<string, SfxParam>();
        public SfxParam P(string name) { return Params[name]; }
        public virtual SfxNode Connect(object dest) { return dest as SfxNode; }
        public virtual void Disconnect() { }
    }
    public class SfxSource : SfxNode
    {
        public object Buffer; public bool Loop; public double PlaybackRate = 1;
        public virtual void Start(double t = 0, double? off = null, double? dur = null) { }
        public virtual void Stop(double t = 0) { }
    }
    public class SfxOsc : SfxSource { public string OscType = "sine"; public object PeriodicWave; }
    public class SfxBuffer { public double Duration; public float[] Data; }
    public interface ISfxBackend
    {
        void CreateContext();
        double CurrentTime { get; }
        double SampleRate { get; }
        string State { get; }
        SfxNode Destination { get; }
        SfxNode CreateGain();
        SfxNode CreateBiquad();
        SfxNode CreatePanner();
        SfxNode CreateCompressor();
        SfxOsc CreateOscillator();
        SfxSource CreateBufferSource();
        SfxBuffer CreateBuffer(int ch, int len, double rate);
        object CreatePeriodicWave(float[] re, float[] im);
        int SetTimeout(Action fn, double ms);
        void ClearTimeout(int id);
    }

    /// <summary>The recording backend: logs exactly like tools/golden-sfx.mjs.</summary>
    public class RecordingBackend : ISfxBackend
    {
        public Lst Log = new Lst();
        int seq;
        public double CurrentTime { get { return 0; } }
        public double SampleRate { get { return 44100; } }
        public string State { get { return "running"; } }
        SfxNode dest;
        public void CreateContext() { if (dest == null) dest = Mk(new RNode(), "destination"); }
        public SfxNode Destination { get { CreateContext(); return dest; } }
        static double R5(double v) { return Js.Round(v * 1e5) / 1e5; }
        class RParam : SfxParam
        {
            public RecordingBackend B;
            void Ev(string type, double? v, double t, double? tc)
            {
                B.Log.Add(new Lst { "param", (double)Node.Id, Name, type, v.HasValue ? (object)R5(v.Value) : null, R5(t), tc.HasValue ? (object)R5(tc.Value) : null });
            }
            public override void SetValueAtTime(double v, double t) { Value = v; Ev("set", v, t, null); }
            public override void LinearRampToValueAtTime(double v, double t) { Ev("linear", v, t, null); }
            public override void ExponentialRampToValueAtTime(double v, double t) { Ev("exp", v, t, null); }
            public override void SetTargetAtTime(double v, double t, double tc) { Ev("target", v, t, tc); }
            public override void CancelScheduledValues(double t) { Ev("cancel", null, t, null); }
        }
        class RNode : SfxNode
        {
            public RecordingBackend B;
            public override SfxNode Connect(object dest)
            {
                if (dest is SfxParam p) { B.Log.Add(new Lst { "conn", (double)Id, "p:" + p.Node.Id + "." + p.Name }); return null; }
                var n = (SfxNode)dest; B.Log.Add(new Lst { "conn", (double)Id, (double)n.Id }); return n;
            }
            public override void Disconnect() { B.Log.Add(new Lst { "disc", (double)Id }); }
        }
        class RSource : SfxSource
        {
            public RecordingBackend B;
            public override SfxNode Connect(object dest)
            {
                if (dest is SfxParam p) { B.Log.Add(new Lst { "conn", (double)Id, "p:" + p.Node.Id + "." + p.Name }); return null; }
                var n = (SfxNode)dest; B.Log.Add(new Lst { "conn", (double)Id, (double)n.Id }); return n;
            }
            public override void Disconnect() { B.Log.Add(new Lst { "disc", (double)Id }); }
            public override void Start(double t = 0, double? off = null, double? dur = null) { B.Log.Add(new Lst { "start", (double)Id, R5(t), off.HasValue ? (object)R5(off.Value) : null, dur.HasValue ? (object)R5(dur.Value) : null }); }
            public override void Stop(double t = 0) { B.Log.Add(new Lst { "stop", (double)Id, R5(t) }); }
        }
        class ROsc : SfxOsc
        {
            public RecordingBackend B;
            public override SfxNode Connect(object dest)
            {
                if (dest is SfxParam p) { B.Log.Add(new Lst { "conn", (double)Id, "p:" + p.Node.Id + "." + p.Name }); return null; }
                var n = (SfxNode)dest; B.Log.Add(new Lst { "conn", (double)Id, (double)n.Id }); return n;
            }
            public override void Disconnect() { B.Log.Add(new Lst { "disc", (double)Id }); }
            public override void Start(double t = 0, double? off = null, double? dur = null) { B.Log.Add(new Lst { "start", (double)Id, R5(t), off.HasValue ? (object)R5(off.Value) : null, dur.HasValue ? (object)R5(dur.Value) : null }); }
            public override void Stop(double t = 0) { B.Log.Add(new Lst { "stop", (double)Id, R5(t) }); }
        }
        T Mk<T>(T node, string kind, params (string Name, double Def)[] ps) where T : SfxNode
        {
            int id = seq++;
            Log.Add(new Lst { "node", (double)id, kind });
            node.Kind = kind; node.Id = id;
            foreach (var (name, def) in ps) node.Params[name] = new RParam { B = this, Node = node, Name = name, Value = def };
            if (node is RNode rn) rn.B = this;
            if (node is RSource rs) rs.B = this;
            if (node is ROsc ro) ro.B = this;
            return node;
        }
        public SfxNode CreateGain() { return Mk(new RNode(), "gain", ("gain", 1)); }
        public SfxNode CreateBiquad() { return Mk(new RNode(), "biquad", ("frequency", 350), ("Q", 1), ("gain", 0)); }
        public SfxNode CreatePanner() { return Mk(new RNode(), "panner", ("pan", 0)); }
        public SfxNode CreateCompressor() { return Mk(new RNode(), "comp", ("threshold", -24), ("ratio", 12)); }
        public SfxOsc CreateOscillator() { return Mk(new ROsc(), "osc", ("frequency", 440), ("detune", 0)); }
        public SfxSource CreateBufferSource() { return Mk(new RSource(), "buffer", ("playbackRate", 1), ("detune", 0)); }
        public SfxBuffer CreateBuffer(int ch, int len, double rate) { Log.Add(new Lst { "buffer", (double)ch, (double)len, rate }); return new SfxBuffer { Duration = len / rate, Data = new float[len] }; }
        public object CreatePeriodicWave(float[] re, float[] im) { Log.Add(new Lst { "wave", (double)re.Length, R5(re.Length > 1 ? re[1] : 0), R5(im.Length > 1 ? im[1] : 0), R5(re.Length > 2 ? re[2] : 0), R5(im.Length > 2 ? im[2] : 0) }); return new object(); }
        public int SetTimeout(Action fn, double ms) { Log.Add(new Lst { "timeout", ms }); return 999; }
        public void ClearTimeout(int id) { Log.Add(new Lst { "cleartimeout", (double)id }); }
    }

    // ---------------- the live mix (what the Unity synth follows) ----------------
    public class SfxLive
    {
        public bool EngineActive; public int EngineN = 1; public bool Inside = true;
        public double[] CycleFreq = new double[2], ExGain = new double[2], PropFreq = new double[2], PropGain = new double[2];
        public double AirflowGain, RumbleGain, HornGain, GearGain, FlapGain, RainGain;
        public List<Dict> OneShots = new List<Dict>();
    }

    /// <summary>createAudio() — the whole sound design, graph against a backend.</summary>
    public class CadetSfx
    {
        readonly ISfxBackend be;
        readonly Func<double> rnd;
        public SfxLive Live = new SfxLive();
        ISfxBackend Ctx { get { return be; } }
        SfxNode master, engOut, ambOut, radOut;
        SfxBuffer noise;
        double volume = 0.8; int foot;
        readonly Dictionary<string, double> vols = new Dictionary<string, double> { { "engine", 1 }, { "amb", 1 }, { "radio", 1 } };
        readonly Dictionary<string, double> next = new Dictionary<string, double> { { "bird", 6 }, { "plane", 35 } };
        double tNow;
        readonly Dictionary<string, double> mix = new Dictionary<string, double> { { "indoor", 0 }, { "wind", 0.5 }, { "rain", 0 } };
        bool mixAirborne;
        class SurfDef { public double F, Q, D, Thump, Tail, G; }
        static readonly Dictionary<string, SurfDef> SURF = new Dictionary<string, SurfDef>
        {
            { "concrete", new SurfDef { F = 1700, Q = 0.9, D = 0.085, Thump = 0.45, Tail = 0.25, G = 0.55 } },
            { "asphalt", new SurfDef { F = 1200, Q = 0.8, D = 0.095, Thump = 0.5, Tail = 0.15, G = 0.5 } },
            { "grass", new SurfDef { F = 3400, Q = 0.45, D = 0.17, Thump = 0.25, Tail = 0, G = 0.32 } },
            { "carpet", new SurfDef { F = 650, Q = 0.7, D = 0.075, Thump = 0.35, Tail = 0, G = 0.3 } },
            { "vinyl", new SurfDef { F = 2300, Q = 1.1, D = 0.06, Thump = 0.4, Tail = 0.15, G = 0.42 } },
            { "tile", new SurfDef { F = 2900, Q = 1.3, D = 0.065, Thump = 0.4, Tail = 0.35, G = 0.5 } },
            { "terrazzo", new SurfDef { F = 2700, Q = 1.2, D = 0.07, Thump = 0.42, Tail = 0.45, G = 0.52 } },
            { "metal", new SurfDef { F = 900, Q = 9, D = 0.22, Thump = 0.3, Tail = 0.5, G = 0.35 } },
        };
        static double Cl(double x, double a = 0, double b = 1) { return Math.Max(a, Math.Min(b, x)); }
        static double Sm(double x, double a, double b) { double u = Cl((x - a) / (b - a)); return u * u * (3 - 2 * u); }

        public CadetSfx(ISfxBackend backend, Func<double> random) { be = backend; rnd = random; }
        public bool Ready { get { return Ok(); } }
        bool Ok() { return be != null && be.State != "closed" && unlocked; }
        bool unlocked;

        public void Unlock()
        {
            if (unlocked) return;
            try
            {
                be.CreateContext();
                master = be.CreateGain(); master.P("gain").Value = volume;
                var comp = be.CreateCompressor(); comp.P("threshold").Value = -14; comp.P("ratio").Value = 3;
                master.Connect(comp).Connect(be.Destination);
                engOut = be.CreateGain(); ambOut = be.CreateGain(); radOut = be.CreateGain();
                engOut.P("gain").Value = vols["engine"]; ambOut.P("gain").Value = vols["amb"]; radOut.P("gain").Value = vols["radio"];
                foreach (var g in new[] { engOut, ambOut, radOut }) g.Connect(master);
                int len = (int)(be.SampleRate * 2);
                noise = be.CreateBuffer(1, len, be.SampleRate);
                var d = noise.Data; double b = 0;
                for (int i = 0; i < d.Length; i++) { double w = rnd() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = (float)(w * 0.7 + b * 3); }
                unlocked = true;
                StartAmbience();
            }
            catch { unlocked = false; }
        }
        SfxSource Src(bool loop = false) { var s = be.CreateBufferSource(); s.Buffer = noise; s.Loop = loop; return s; }
        static void Env(SfxParam g, double t, double a, double peak, double d)
        {
            g.CancelScheduledValues(t); g.SetValueAtTime(0.0001, t);
            g.ExponentialRampToValueAtTime(Math.Max(peak, 0.0002), t + a);
            g.ExponentialRampToValueAtTime(0.0001, t + a + d);
        }

        void Burst(double f, double q, double d, double g = 0.5, string type = "bandpass", double pan = 0, double thump = 0, double thumpF = 95, double at = 0, SfxNode to = null)
        {
            to = to ?? master;
            double t = be.CurrentTime + at;
            var s = Src(); var bp = be.CreateBiquad(); var ga = be.CreateGain(); var p = be.CreatePanner();
            bp.BiquadType = type; bp.P("frequency").Value = f; bp.P("Q").Value = q; p.P("pan").Value = pan;
            s.Connect(bp).Connect(ga).Connect(p).Connect(to);
            Env(ga.P("gain"), t, 0.004, g, d); s.Start(t, rnd() * 1.5, d + 0.05);
            Live.OneShots.Add(new Dict { { "kind", "burst" }, { "f", f }, { "q", q }, { "d", d }, { "g", g }, { "type", type }, { "pan", pan }, { "thump", thump }, { "thumpF", thumpF } });
            if (thump > 0)
            {
                var o = be.CreateOscillator(); var og = be.CreateGain();
                o.P("frequency").SetValueAtTime(thumpF * 1.4, t); o.P("frequency").ExponentialRampToValueAtTime(thumpF * 0.7, t + 0.08);
                o.Connect(og).Connect(p); Env(og.P("gain"), t, 0.003, thump * g, 0.09); o.Start(t); o.Stop(t + 0.15);
            }
        }
        public void Footstep(string surface = "concrete", double k = 1)
        {
            if (!Ok()) return;
            var s = SURF.TryGetValue(surface, out var sd) ? sd : SURF["concrete"];
            double v = 0.85 + rnd() * 0.3, pit = 0.92 + rnd() * 0.16;
            foot = 1 - foot;
            double pan = foot == 1 ? 0.12 : -0.12, g = s.G * k * v * 0.55;
            Burst(s.F * pit, s.Q, s.D * (0.9 + 0.2 * rnd()), g, "bandpass", pan, s.Thump, 80 + 30 * pit, 0, ambOut);
            if (s.Tail != 0) Burst(s.F * 0.6 * pit, s.Q * 0.7, s.D * 1.8, g * s.Tail * 0.4, "bandpass", pan, 0, 95, 0.02, ambOut);
        }
        void Tone(double f0, double f1, double d, double g, string type = "sine", double at = 0)
        {
            double t = be.CurrentTime + at; var o = be.CreateOscillator(); var ga = be.CreateGain();
            o.OscType = type; o.P("frequency").SetValueAtTime(f0, t); o.P("frequency").ExponentialRampToValueAtTime(f1, t + d);
            o.Connect(ga).Connect(master); Env(ga.P("gain"), t, 0.006, g, d); o.Start(t); o.Stop(t + d + 0.05);
            Live.OneShots.Add(new Dict { { "kind", "tone" }, { "f0", f0 }, { "f1", f1 }, { "d", d }, { "g", g }, { "type", type } });
        }
        public void Door(string kind)
        {
            if (!Ok()) return;
            if (kind == "swing_open") { Burst(4200, 2, 0.025, 0.35, "highpass"); Tone(190, 130, 0.38, 0.03, "sawtooth", 0.04); Burst(500, 0.6, 0.3, 0.08, "bandpass", 0, 0, 95, 0.05); }
            else if (kind == "swing_close") { Burst(300, 0.7, 0.12, 0.45, "lowpass", 0, 0.7, 70, 0.35); Burst(4000, 2, 0.02, 0.3, "highpass", 0, 0, 95, 0.38); }
            else if (kind == "slide_open" || kind == "slide_close")
            {
                double t = be.CurrentTime; var s = Src(); var bp = be.CreateBiquad(); var ga = be.CreateGain();
                bp.BiquadType = "bandpass"; bp.P("Q").Value = 0.8;
                bp.P("frequency").SetValueAtTime(kind == "slide_open" ? 600 : 1300, t);
                bp.P("frequency").ExponentialRampToValueAtTime(kind == "slide_open" ? 1400 : 600, t + 0.8);
                s.Connect(bp).Connect(ga).Connect(master); Env(ga.P("gain"), t, 0.15, 0.09, 0.75); s.Start(t, rnd(), 1.0);
                Tone(118, 112, 0.85, 0.025, "triangle");
            }
            else if (kind == "locked") { for (int i = 0; i < 3; i++) Burst(2600, 3, 0.03, 0.3, "bandpass", 0, 0.3, 160, i * 0.07); }
        }
        public void Ui(string kind)
        {
            if (!Ok()) return;
            if (kind == "click") Tone(1150, 1100, 0.04, 0.05);
            else if (kind == "open") { Tone(660, 660, 0.08, 0.04); Tone(990, 990, 0.1, 0.035, "sine", 0.07); }
            else if (kind == "close") { Tone(880, 880, 0.07, 0.035); Tone(590, 590, 0.09, 0.03, "sine", 0.06); }
            else if (kind == "examine") { Tone(1320, 1320, 0.25, 0.025); Tone(1760, 1760, 0.3, 0.018, "sine", 0.05); }
        }

        // ---- ambience ----
        SfxNode ambOutNode, ambWg, ambHg, ambHumg, ambRg;
        void StartAmbience()
        {
            var outG = be.CreateGain(); outG.P("gain").Value = 1; outG.Connect(ambOut);
            var wind = Src(true); var wlp = be.CreateBiquad(); var wg = be.CreateGain();
            wlp.BiquadType = "lowpass"; wlp.P("frequency").Value = 380; wlp.P("Q").Value = 0.4;
            wind.Connect(wlp).Connect(wg).Connect(outG); wg.P("gain").Value = 0; wind.Start();
            var hvac = Src(true); var hlp = be.CreateBiquad(); var hg = be.CreateGain();
            hlp.BiquadType = "lowpass"; hlp.P("frequency").Value = 220; hvac.Connect(hlp).Connect(hg).Connect(outG); hg.P("gain").Value = 0; hvac.Start(0, 0.7);
            var hum = be.CreateOscillator(); var humg = be.CreateGain(); hum.P("frequency").Value = 120; hum.Connect(humg).Connect(outG); humg.P("gain").Value = 0; hum.Start();
            var rn = Src(true); var rlp = be.CreateBiquad(); var rg = be.CreateGain();
            rlp.BiquadType = "lowpass"; rlp.P("frequency").Value = 1500; rlp.P("Q").Value = 0.3;
            rn.Connect(rlp).Connect(rg).Connect(outG); rg.P("gain").Value = 0; rn.Start(0, 1.3);
            ambOutNode = outG; ambWg = wg; ambHg = hg; ambHumg = humg; ambRg = rg;
            Apply();
        }
        void Apply()
        {
            if (ambOutNode == null) return;
            double t = be.CurrentTime, inn = mix["indoor"], air = mixAirborne ? 1 : 0, room = eng != null ? 0 : 1;
            ambWg.P("gain").SetTargetAtTime(((1 - inn) * (0.04 + 0.1 * mix["wind"]) + inn * 0.004) * (1 - 0.85 * air), t, mixAirborne ? 2 : 0.6);
            ambHg.P("gain").SetTargetAtTime(inn * 0.05 * room, t, 0.6);
            ambHumg.P("gain").SetTargetAtTime(inn * 0.0025 * room, t, 0.6);
            if (ambRg != null) ambRg.P("gain").SetTargetAtTime(Cl(mix["rain"]) * 0.05 * (1 - 0.8 * inn) * (eng != null ? 0 : 1), t, 0.8);
        }
        void Bird()
        {
            double t0 = be.CurrentTime; int n = 2 + (int)Math.Floor(rnd() * 4); double baseF = 2800 + rnd() * 1800, pan = rnd() * 1.6 - 0.8;
            for (int i = 0; i < n; i++)
            {
                double t = t0 + i * (0.09 + rnd() * 0.08); var o = be.CreateOscillator(); var g = be.CreateGain(); var p = be.CreatePanner();
                o.P("frequency").SetValueAtTime(baseF * (1 + rnd() * 0.2), t); o.P("frequency").ExponentialRampToValueAtTime(baseF * (0.75 + rnd() * 0.5), t + 0.07);
                p.P("pan").Value = pan; o.Connect(g).Connect(p).Connect(ambOutNode); Env(g.P("gain"), t, 0.005, 0.012 * (1 - mix["indoor"] * 0.9), 0.07); o.Start(t); o.Stop(t + 0.1);
            }
        }
        void Plane()
        {
            double t = be.CurrentTime, dur = 16, f = 74 + rnd() * 14;
            var g = be.CreateGain(); var lp = be.CreateBiquad(); var p = be.CreatePanner();
            lp.BiquadType = "lowpass"; lp.P("frequency").Value = 650; p.P("pan").SetValueAtTime(-0.8, t); p.P("pan").LinearRampToValueAtTime(0.8, t + dur);
            g.Connect(lp).Connect(p).Connect(ambOutNode);
            g.P("gain").SetValueAtTime(0.0001, t); g.P("gain").ExponentialRampToValueAtTime(0.03 * (1 - mix["indoor"] * 0.85), t + dur * 0.45); g.P("gain").ExponentialRampToValueAtTime(0.0001, t + dur);
            foreach (var (h, a) in new[] { (1, 1.0), (2, 0.6), (3, 0.35), (4, 0.2) })
            {
                var o = be.CreateOscillator(); var og = be.CreateGain(); o.OscType = "sawtooth"; og.P("gain").Value = a * 0.3;
                o.P("frequency").SetValueAtTime(f * h * 1.03, t); o.P("frequency").LinearRampToValueAtTime(f * h * 0.97, t + dur);
                o.Connect(og).Connect(g); o.Start(t); o.Stop(t + dur + 0.1);
            }
        }
        public void Update(double dt)
        {
            if (!Ok() || ambOutNode == null) return;
            tNow += dt;
            if (tNow > next["bird"]) { next["bird"] = tNow + 4 + rnd() * 9; if (mix["indoor"] < 0.7 && !mixAirborne) Bird(); }
            if (tNow > next["plane"]) { next["plane"] = tNow + 40 + rnd() * 50; if (!mixAirborne) Plane(); }
        }

        // ---- the aircraft ----
        bool engBroken; object cycWave, envWave; SfxBuffer jitBuf; double cranked = -1;
        public static (float[] Re, float[] Im) Pulses(int H, double tau, double rise)
        {
            var P = new[] { (0.0, 1.0), (0.2535, 0.82), (0.4975, 0.94), (0.7515, 0.76) };
            var re = new float[H + 1]; var im = new float[H + 1];
            for (int n = 1; n <= H; n++)
            {
                double w = 2 * Math.PI * n, dr = 1 - w * w * tau * rise, di = w * (tau + rise), m = dr * dr + di * di;
                double sr = 0, si = 0;
                foreach (var (t0, a) in P) { sr += a * Math.Cos(w * t0); si -= a * Math.Sin(w * t0); }
                re[n] = (float)(2 * (sr * dr + si * di) / m); im[n] = (float)(-2 * (si * dr - sr * di) / m);
            }
            return (re, im);
        }
        void EngineWaves()
        {
            if (cycWave != null) return;
            var c = Pulses(640, 1.0 / 110, 1.0 / 550); cycWave = be.CreatePeriodicWave(c.Re, c.Im);
            var e = Pulses(160, 1.0 / 22, 1.0 / 160); envWave = be.CreatePeriodicWave(e.Re, e.Im);
            const int rate = 8000, len = rate * 9, step = 120;
            double first = rnd() * 2 - 1;
            jitBuf = be.CreateBuffer(1, len, rate);
            var d = jitBuf.Data;
            double a = first, b = rnd() * 2 - 1;
            for (int i = 0; i < len; i++)
            {
                if (i != 0 && i % step == 0) { a = b; b = i + step >= len ? first : rnd() * 2 - 1; }
                d[i] = (float)(a + (b - a) * (0.5 - 0.5 * Math.Cos(Math.PI * (i % step) / step)));
            }
        }
        class Voice
        {
            public SfxNode Out, ExLP, CrBP, Am, MkG, MkAm, SwG, SwAm, SwBP;
            public SfxOsc Cyc, EnvO, Prop;
            public SfxParam ExG, CrG, MkGP, PG, PLP, Jd, Ja;
            public double Cranked = -1, MissAt = double.NaN, Miss = 1;
        }
        class EngState
        {
            public int N; public List<SfxNode> Nodes = new List<SfxNode>(); public List<SfxSource> Srcs = new List<SfxSource>();
            public List<Voice> Voices = new List<Voice>();
            public Dictionary<SfxParam, double> Last = new Dictionary<SfxParam, double>();
            public bool Inside = true;
            public SfxNode Bus, MixG; public SfxParam Lp1, Lp2, Boom, WG, WBP, RG, HG, GmG, FmG, RnG, RnBP;
            public SfxOsc Gm, Fm;
        }
        EngState eng;
        bool BuildEngine(int n = 1)
        {
            if (engBroken) return false;
            try
            {
                EngineWaves();
                double t = be.CurrentTime;
                var nodes = new List<SfxNode>(); var srcs = new List<SfxSource>();
                SfxNode Add(SfxNode x) { nodes.Add(x); return x; }
                SfxNode Gain(double v = 0) { var g = Add(be.CreateGain()); g.P("gain").Value = v; return g; }
                SfxNode Filt(string type, double f, double q, double db = 0) { var b = Add(be.CreateBiquad()); b.BiquadType = type; b.P("frequency").Value = f; b.P("Q").Value = q; b.P("gain").Value = db; return b; }
                SfxOsc Osc(object type) { var o = (SfxOsc)Add(be.CreateOscillator()); if (type is string ts) o.OscType = ts; else o.PeriodicWave = type; srcs.Add(o); return o; }
                SfxSource Loop(SfxBuffer buf, double rate) { var x = (SfxSource)Add(be.CreateBufferSource()); x.Buffer = buf; x.Loop = true; x.P("playbackRate").Value = rate; srcs.Add(x); return x; }
                var bus = Gain(0); var mixG = Gain(1); var hp = Filt("highpass", 32, 0.7); var lp1 = Filt("lowpass", 800, 0.6); var lp2 = Filt("lowpass", 1300, 0.5); var boom = Filt("peaking", 105, 1, 0);
                mixG.Connect(hp).Connect(lp1).Connect(lp2).Connect(boom).Connect(bus); bus.Connect(engOut);
                var voices = new List<Voice>();
                for (int k = 0; k < n; k++)
                {
                    var outG = Gain(n > 1 ? 0.78 : 1); var pan = Add(be.CreatePanner());
                    pan.P("pan").Value = n > 1 ? (k == 1 ? 0.38 : -0.38) : 0; outG.Connect(pan).Connect(mixG);
                    var cyc = Osc(cycWave); var exPk = Filt("peaking", 260, 1.2, 4); var exLP = Filt("lowpass", 600, 0.8); var exG = Gain();
                    cyc.Connect(exPk).Connect(exLP).Connect(exG).Connect(outG);
                    var envO = Osc(envWave); var nz = Loop(noise, 1 + 0.07 * k); var crBP = Filt("bandpass", 900, 0.5); var crG = Gain(); var am = Gain();
                    nz.Connect(crBP).Connect(crG).Connect(outG); envO.Connect(am); am.Connect(crG.P("gain"));
                    var mkBP = Filt("bandpass", 3000, 1.4); var mkG = Gain(); var mkAm = Gain();
                    nz.Connect(mkBP).Connect(mkG).Connect(outG); cyc.Connect(mkAm); mkAm.Connect(mkG.P("gain"));
                    var prop = Osc("sawtooth"); var pLP = Filt("lowpass", 300, 1); var pG = Gain();
                    prop.Connect(pLP).Connect(pG).Connect(outG);
                    var swBP = Filt("bandpass", 600, 0.9); var swG = Gain(); var swAm = Gain();
                    nz.Connect(swBP).Connect(swG).Connect(outG); prop.Connect(swAm); swAm.Connect(swG.P("gain"));
                    var j1 = Loop(jitBuf, 1 + 0.23 * k); var jLP = Filt("lowpass", 7, 0.7); var jd = Gain();
                    j1.Connect(jLP).Connect(jd); jd.Connect(cyc.P("detune")); jd.Connect(envO.P("detune")); jd.Connect(prop.P("detune"));
                    var j2 = Loop(jitBuf, 1.37 + 0.19 * k); var ja = Gain();
                    j2.Connect(ja); ja.Connect(exG.P("gain"));
                    voices.Add(new Voice { Out = outG, Cyc = cyc, EnvO = envO, Prop = prop, ExG = exG.P("gain"), ExLP = exLP, CrBP = crBP, CrG = crG.P("gain"), Am = am, MkG = mkG, MkAm = mkAm, PG = pG.P("gain"), PLP = pLP.P("frequency"), SwG = swG, SwAm = swAm, SwBP = swBP, Jd = jd.P("gain"), Ja = ja.P("gain") });
                }
                var nz2 = Loop(noise, 0.93); var wBP = Filt("bandpass", 500, 0.6); var wG = Gain();
                nz2.Connect(wBP).Connect(wG).Connect(bus);
                var rLP = Filt("lowpass", 120, 0.8); var rG = Gain();
                nz2.Connect(rLP).Connect(rG).Connect(bus);
                var horn = Osc("triangle"); var hLP = Filt("lowpass", 5000, 0.7); var hG = Gain();
                horn.P("frequency").Value = 2800; horn.Connect(hLP).Connect(hG).Connect(bus);
                var gm = Osc("sawtooth"); var gmLP = Filt("lowpass", 900, 1.5); var gmG = Gain();
                gm.P("frequency").Value = 410; gm.Connect(gmLP).Connect(gmG).Connect(bus);
                var fm = Osc("sawtooth"); var fmLP = Filt("lowpass", 650, 1.5); var fmG = Gain();
                fm.P("frequency").Value = 165; fm.Connect(fmLP).Connect(fmG).Connect(bus);
                var rnBP = Filt("bandpass", 1100, 0.45); var rnG = Gain();
                nz2.Connect(rnBP).Connect(rnG).Connect(bus);
                foreach (var x in srcs) { if (x.Buffer != null) x.Start(t, rnd() * 1.9); else x.Start(t); }
                bus.P("gain").SetTargetAtTime(1, t, 0.15);
                eng = new EngState { N = n, Nodes = nodes, Srcs = srcs, Voices = voices, Bus = bus, MixG = mixG, Lp1 = lp1.P("frequency"), Lp2 = lp2.P("frequency"), Boom = boom.P("gain"), WG = wG.P("gain"), WBP = wBP.P("frequency"), RG = rG.P("gain"), HG = hG.P("gain"), Gm = gm, GmG = gmG.P("gain"), Fm = fm, FmG = fmG.P("gain"), RnG = rnG.P("gain"), RnBP = rnBP.P("frequency") };
                Live.EngineActive = true; Live.EngineN = n;
                Apply();
                return true;
            }
            catch { engBroken = true; eng = null; return false; }
        }
        void Glide(SfxParam p, double v, double tc)
        {
            if (eng.Last.TryGetValue(p, out var was) && Math.Abs(was - v) <= 1e-5 + Math.Abs(v) * 0.002) return;
            eng.Last[p] = v; p.SetTargetAtTime(v, be.CurrentTime, tc);
        }
        void VoiceRun(Voice e, int k, double rpm, double thr, bool running, bool inside, double rough = 0)
        {
            double since = e.Cranked >= 0 ? be.CurrentTime - e.Cranked : cranked >= 0 ? be.CurrentTime - cranked : 1e9;
            double fire = running ? Sm(rpm, 250, 480) : since < 3.5 ? Sm(since, 1.75, 2.45) : 0;
            double r = rpm / 2400, idle = 1 - Sm(rpm, 750, 1600), fc = Math.Max(rpm, 60) / 120, rg = Cl(rough);
            if (rg > 0.02 && fire > 0)
            {
                double t = be.CurrentTime;
                if (double.IsNaN(e.MissAt) || t >= e.MissAt) { e.MissAt = t + 0.05 + rnd() * 0.11; e.Miss = rnd() < rg * 0.55 ? 0.08 + rnd() * 0.25 : 1; }
            }
            else e.Miss = 1;
            Glide(e.Cyc.P("frequency"), fc, 0.03); Glide(e.EnvO.P("frequency"), fc, 0.03); Glide(e.Prop.P("frequency"), fc * 4, 0.03);
            Glide(e.Jd, 25 + 160 * idle + 300 * rg, 0.3);
            double ex = fire * (0.14 + 0.2 * thr + 0.06 * r) * (rg > 0.02 ? e.Miss : 1);
            Glide(e.ExG, ex, 0.05); Glide(e.Ja, ex * (0.12 + 0.4 * idle + 1.1 * rg), 0.05);
            Glide(e.ExLP.P("frequency"), 380 + 1000 * thr + 500 * r, 0.06);
            double cr = fire * (0.22 + 0.3 * thr + 0.1 * idle) * (1 + 0.8 * rg);
            Glide(e.Am.P("gain"), cr, 0.05); Glide(e.CrG, cr * 0.2, 0.05); Glide(e.CrBP.P("frequency"), 650 + 900 * thr, 0.1);
            Glide(e.MkG.P("gain"), fire * 0.02 * thr, 0.1); Glide(e.MkAm.P("gain"), fire * 0.12 * (0.3 + r), 0.1);
            double pk = fire * (inside ? 0.7 : 1.2), sw = pk * 0.25 * r * r * r * r;
            Glide(e.PG, pk * (0.02 + 0.1 * r * r * r), 0.05); Glide(e.PLP, fc * 4 * (2 + 6 * r * r), 0.05);
            Glide(e.SwG.P("gain"), sw, 0.05); Glide(e.SwAm.P("gain"), sw, 0.05); Glide(e.SwBP.P("frequency"), 450 + 900 * r, 0.1);
            if (k < 2) { Live.CycleFreq[k] = fc; Live.ExGain[k] = ex; Live.PropFreq[k] = fc * 4; Live.PropGain[k] = pk * (0.02 + 0.1 * r * r * r); }
        }
        public class EngObs
        {
            public double Rpm, Thr, Ias, Rain, Rough;
            public bool OnGround, Stall, Running = true, Inside = true, HasInside;
            public bool GearMoving, FlapMoving;
            public List<EngObs> Engines;
        }
        public void Engine(EngObs o)
        {
            if (o == null) { StopEngine(); return; }
            int n = o.Engines != null && o.Engines.Count > 1 ? o.Engines.Count : 1;
            if (eng != null && eng.N != n) StopEngine();
            if (!Ok() || (eng == null && !BuildEngine(n))) return;
            var e = eng; double thr = Cl(o.Thr), ias = Cl(o.Ias, 0, 300); bool inside = !o.HasInside || o.Inside;
            e.Inside = inside; Live.Inside = inside;
            if (n > 1) { for (int k = 0; k < e.Voices.Count; k++) { var x = k < o.Engines.Count ? o.Engines[k] : new EngObs(); VoiceRun(e.Voices[k], k, Cl(x.Rpm, 0, 3200), thr, x.Running, inside, x.Rough); } }
            else VoiceRun(e.Voices[0], 0, Cl(o.Rpm, 0, 3200), thr, o.Running, inside, o.Rough);
            Glide(e.MixG.P("gain"), inside ? 0.62 : 0.72, 0.08);
            Glide(e.Lp1, inside ? 1000 : 9000, 0.08); Glide(e.Lp2, inside ? 2000 : 16000, 0.08); Glide(e.Boom, inside ? 3 : 0, 0.08);
            double u = Math.Min(ias / 120, 1.4);
            Glide(e.WG, u * u * (inside ? 0.04 : 0.09), 0.2); Glide(e.WBP, inside ? 380 + 500 * u : 500 + 1500 * u, 0.2);
            Glide(e.RG, o.OnGround ? Math.Min(1, ias / 30) * (inside ? 0.1 : 0.06) : 0, 0.08);
            Glide(e.HG, o.Stall ? (inside ? 0.028 : 0.018) : 0, 0.015);
            Glide(e.GmG, o.GearMoving ? (inside ? 0.012 : 0.006) : 0, 0.12);
            Glide(e.FmG, o.FlapMoving ? (inside ? 0.009 : 0.004) : 0, 0.1);
            double rn = Cl(o.Rain), rsp = Math.Min(ias / 110, 1.25);
            Glide(e.RnG, rn * (0.012 + 0.05 * rsp * rsp) * (inside ? 1 : 0.6), 0.35);
            Glide(e.RnBP, 1000 + 1900 * rsp, 0.35);
            Live.AirflowGain = u * u * (inside ? 0.04 : 0.09); Live.RumbleGain = o.OnGround ? Math.Min(1, ias / 30) * (inside ? 0.1 : 0.06) : 0;
            Live.HornGain = o.Stall ? (inside ? 0.028 : 0.018) : 0; Live.GearGain = o.GearMoving ? (inside ? 0.012 : 0.006) : 0;
            Live.FlapGain = o.FlapMoving ? (inside ? 0.009 : 0.004) : 0; Live.RainGain = rn * (0.012 + 0.05 * rsp * rsp) * (inside ? 1 : 0.6);
        }
        void StopEngine()
        {
            if (eng == null) return;
            var e = eng; eng = null; cranked = -1; Live.EngineActive = false;
            if (Ok())
            {
                double t = be.CurrentTime;
                e.Bus.P("gain").SetTargetAtTime(0, t, 0.1);
                foreach (var s in e.Srcs) s.Stop(t + 0.6);
                Apply();
            }
            be.SetTimeout(() => { foreach (var nd in e.Nodes) nd.Disconnect(); }, 700);
        }

        public void Starter()
        {
            if (!Ok()) return;
            double t = be.CurrentTime; bool inside = eng != null ? eng.Inside : true;
            cranked = t;
            var C = new[] { 0.24, 0.5, 0.76, 1.0, 1.23 };
            var F = new[] { 1.42, 1.57, 1.66, 1.81, 1.89, 1.97, 2.06, 2.13, 2.21 };
            var m = be.CreateOscillator(); var mlp = be.CreateBiquad(); var mg = be.CreateGain();
            m.OscType = "sawtooth"; mlp.BiquadType = "lowpass"; mlp.P("frequency").Value = inside ? 1400 : 2600; mlp.P("Q").Value = 2;
            m.Connect(mlp).Connect(mg).Connect(engOut);
            m.P("frequency").SetValueAtTime(140, t); m.P("frequency").ExponentialRampToValueAtTime(430, t + 0.15);
            foreach (var c in C) { m.P("frequency").SetTargetAtTime(330, t + c - 0.03, 0.035); m.P("frequency").SetTargetAtTime(440, t + c + 0.07, 0.07); }
            m.P("frequency").SetTargetAtTime(90, t + 1.46, 0.2);
            mg.P("gain").SetValueAtTime(0.0001, t); mg.P("gain").ExponentialRampToValueAtTime(0.035, t + 0.08); mg.P("gain").SetTargetAtTime(0, t + 1.44, 0.07);
            var s = Src(true); var lp = be.CreateBiquad(); var g = be.CreateGain(); var th = be.CreateOscillator(); var tg = be.CreateGain();
            lp.BiquadType = "lowpass"; lp.P("Q").Value = 0.7; lp.P("frequency").Value = 420; g.P("gain").Value = 0; tg.P("gain").Value = 0;
            s.Connect(lp).Connect(g).Connect(engOut); th.Connect(tg).Connect(engOut);
            foreach (var c in C)
            {
                lp.P("frequency").SetValueAtTime(420, t + c); th.P("frequency").SetValueAtTime(48, t + c);
                g.P("gain").SetTargetAtTime(0.06, t + c, 0.03); g.P("gain").SetTargetAtTime(0, t + c + 0.08, 0.06);
                tg.P("gain").SetTargetAtTime(0.05, t + c, 0.02); tg.P("gain").SetTargetAtTime(0, t + c + 0.06, 0.05);
            }
            foreach (var c0 in F)
            {
                double c = c0 + rnd() * 0.02, a = (c0 < 1.7 ? 0.14 : 0.1) * (0.6 + 0.5 * rnd());
                lp.P("frequency").SetValueAtTime(1500, t + c); th.P("frequency").SetValueAtTime(78, t + c); th.P("frequency").SetTargetAtTime(45, t + c, 0.03);
                g.P("gain").SetTargetAtTime(a, t + c, 0.003); g.P("gain").SetTargetAtTime(0, t + c + 0.012, 0.03);
                tg.P("gain").SetTargetAtTime(a * 1.4, t + c, 0.003); tg.P("gain").SetTargetAtTime(0, t + c + 0.01, 0.04);
            }
            m.Start(t); m.Stop(t + 2); s.Start(t, rnd() * 1.5); s.Stop(t + 2.7); th.Start(t); th.Stop(t + 2.7);
            Burst(2400, 1.2, 0.03, 0.14, "bandpass", 0, 0.4, 120, 0, engOut);
            Live.OneShots.Add(new Dict { { "kind", "starter" } });
        }
        class CrkState { public SfxOsc M, Lfo; public SfxSource S; public SfxParam Mg, Ng; }
        CrkState crk;
        public void Crank(bool on, double side = 0)
        {
            if (!Ok()) return;
            double t = be.CurrentTime;
            if (on && crk == null)
            {
                bool inside = eng != null ? eng.Inside : true; var outP = be.CreatePanner();
                outP.P("pan").Value = Cl(side, -1, 1) * 0.38; outP.Connect(engOut);
                var m = be.CreateOscillator(); var mlp = be.CreateBiquad(); var mg = be.CreateGain();
                m.OscType = "sawtooth"; mlp.BiquadType = "lowpass"; mlp.P("frequency").Value = inside ? 1400 : 2600; mlp.P("Q").Value = 2;
                m.P("frequency").SetValueAtTime(140, t); m.P("frequency").ExponentialRampToValueAtTime(430, t + 0.15);
                var lfo = be.CreateOscillator(); var lg = be.CreateGain(); var s = Src(true); var nlp = be.CreateBiquad(); var ng = be.CreateGain(); var nAm = be.CreateGain();
                lfo.OscType = "square"; lfo.P("frequency").Value = 3.9; lg.P("gain").Value = 55;
                lfo.Connect(lg).Connect(m.P("frequency"));
                nlp.BiquadType = "lowpass"; nlp.P("frequency").Value = 420; ng.P("gain").Value = 0.03; nAm.P("gain").Value = 0.03;
                lfo.Connect(nAm.P("gain"));
                s.Connect(nlp).Connect(ng).Connect(nAm).Connect(outP);
                m.Connect(mlp).Connect(mg).Connect(outP);
                mg.P("gain").SetValueAtTime(0.0001, t); mg.P("gain").ExponentialRampToValueAtTime(0.035, t + 0.08);
                m.Start(t); lfo.Start(t); s.Start(t, rnd() * 1.5);
                Burst(2400, 1.2, 0.03, 0.14, "bandpass", 0, 0.4, 120, 0, engOut);
                crk = new CrkState { M = m, Lfo = lfo, S = s, Mg = mg.P("gain"), Ng = ng.P("gain") };
                Live.OneShots.Add(new Dict { { "kind", "crankOn" } });
            }
            else if (!on && crk != null)
            {
                var c = crk; crk = null;
                c.Mg.SetTargetAtTime(0, t, 0.06); c.Ng.SetTargetAtTime(0, t, 0.06); c.M.P("frequency").SetTargetAtTime(90, t, 0.15);
                foreach (var nd in new SfxSource[] { c.M, c.Lfo, c.S }) nd.Stop(t + 0.5);
                Live.OneShots.Add(new Dict { { "kind", "crankOff" } });
            }
        }
        public void Fire(double side = 0)
        {
            if (!Ok()) return;
            double t = be.CurrentTime; var F = new[] { 0.0, 0.12, 0.21, 0.36, 0.44, 0.52, 0.61, 0.68, 0.76 };
            var s = Src(true); var lp = be.CreateBiquad(); var g = be.CreateGain(); var th = be.CreateOscillator(); var tg = be.CreateGain(); var outP = be.CreatePanner();
            outP.P("pan").Value = Cl(side, -1, 1) * 0.38; outP.Connect(engOut);
            lp.BiquadType = "lowpass"; lp.P("Q").Value = 0.7; lp.P("frequency").Value = 1500; g.P("gain").Value = 0; tg.P("gain").Value = 0;
            s.Connect(lp).Connect(g).Connect(outP); th.Connect(tg).Connect(outP);
            foreach (var c0 in F)
            {
                double c = c0 + rnd() * 0.02, a = (c0 < 0.3 ? 0.14 : 0.1) * (0.6 + 0.5 * rnd());
                th.P("frequency").SetValueAtTime(78, t + c); th.P("frequency").SetTargetAtTime(45, t + c, 0.03);
                g.P("gain").SetTargetAtTime(a, t + c, 0.003); g.P("gain").SetTargetAtTime(0, t + c + 0.012, 0.03);
                tg.P("gain").SetTargetAtTime(a * 1.4, t + c, 0.003); tg.P("gain").SetTargetAtTime(0, t + c + 0.01, 0.04);
            }
            s.Start(t, rnd() * 1.5); s.Stop(t + 1.2); th.Start(t); th.Stop(t + 1.2);
            Live.OneShots.Add(new Dict { { "kind", "fire" } });
        }
        public void Squelch() { if (!Ok()) return; Burst(2200, 0.8, 0.07, 0.05, "bandpass", 0, 0, 95, 0, radOut); }
        class RadState { public SfxSource S; public SfxOsc C; public SfxParam G; public int Timer; }
        RadState rad;
        public void Radio(double sec = 3)
        {
            if (!Ok()) return;
            double t = be.CurrentTime;
            if (rad != null)
            {
                rad.G.SetTargetAtTime(0, t, 0.03); rad.S.Stop(t + 0.3); rad.C.Stop(t + 0.3); be.ClearTimeout(rad.Timer); rad = null;
                Burst(3400, 0.6, 0.12, 0.06, "bandpass", 0, 0, 95, 0, radOut);
            }
            if (!(sec > 0)) return;
            Squelch();
            var s = Src(true); var hp = be.CreateBiquad(); var lp = be.CreateBiquad(); var g = be.CreateGain();
            hp.BiquadType = "highpass"; hp.P("frequency").Value = 300; lp.BiquadType = "lowpass"; lp.P("frequency").Value = 3000;
            s.Connect(hp).Connect(lp).Connect(g).Connect(radOut);
            g.P("gain").SetValueAtTime(0.0001, t); g.P("gain").ExponentialRampToValueAtTime(0.012, t + 0.05);
            var c = be.CreateOscillator(); var cg = be.CreateGain(); c.OscType = "square"; c.P("frequency").Value = 23; cg.P("gain").Value = 0.004;
            c.Connect(cg).Connect(g.P("gain"));
            s.Start(t, rnd() * 1.5); c.Start(t);
            var me = new RadState { S = s, C = c, G = g.P("gain") };
            me.Timer = be.SetTimeout(() => { if (rad == me) Radio(0); }, Math.Min(20, sec) * 1000);
            rad = me;
            Live.OneShots.Add(new Dict { { "kind", "radio" }, { "sec", sec } });
        }
        public void Touchdown(double fpm = 200)
        {
            if (!Ok()) return;
            double k = Cl((fpm - 40) / 600, 0.08, 1), t = be.CurrentTime; bool inside = eng != null ? eng.Inside : true;
            var s = Src(); var bp = be.CreateBiquad(); var g = be.CreateGain();
            bp.BiquadType = "bandpass"; bp.P("Q").Value = 7; bp.P("frequency").SetValueAtTime(2300, t); bp.P("frequency").ExponentialRampToValueAtTime(1500, t + 0.25);
            s.Connect(bp).Connect(g).Connect(engOut); g.P("gain").Value = 0;
            double ch = (inside ? 0.6 : 1) * (0.25 + 1.1 * k), dec = 0.02 + 0.035 * k, t2 = t + 0.07 - 0.04 * k;
            g.P("gain").SetTargetAtTime(ch, t, 0.004); g.P("gain").SetTargetAtTime(0, t + 0.02, dec);
            g.P("gain").SetTargetAtTime(ch * 0.8, t2, 0.004); g.P("gain").SetTargetAtTime(0, t2 + 0.02, dec);
            s.Start(t, rnd() * 1.5); s.Stop(t + 0.6);
            Burst(420, 0.7, 0.1 + 0.15 * k, 0.08 + 0.3 * k, "lowpass", 0, 0.9, 70 + 30 * k, 0, engOut);
            if (k > 0.6) Burst(900, 1, 0.08, 0.12 * k, "bandpass", 0, 0, 95, 0.09, engOut);
            Live.OneShots.Add(new Dict { { "kind", "touchdown" }, { "fpm", fpm } });
        }
        public void ApDisc() { if (!Ok()) return; for (int i = 0; i < 6; i++) Tone(i % 2 == 1 ? 940 : 1240, i % 2 == 1 ? 940 : 1240, 0.1, 0.045, "sine", i * 0.115); }
        void ToneRad(double f, double d, double g, double at = 0)
        {
            if (!Ok()) return;
            double t = be.CurrentTime + at; var o = be.CreateOscillator(); var ga = be.CreateGain();
            o.OscType = "sine"; o.P("frequency").Value = f; o.Connect(ga).Connect(radOut); Env(ga.P("gain"), t, 0.008, g, d); o.Start(t); o.Stop(t + d + 0.05);
        }
        static readonly Dictionary<char, string> MORSE = new Dictionary<char, string>
        {
            { 'A', ".-" }, { 'B', "-..." }, { 'C', "-.-." }, { 'D', "-.." }, { 'E', "." }, { 'F', "..-." }, { 'G', "--." }, { 'H', "...." }, { 'I', ".." }, { 'J', ".---" }, { 'K', "-.-" }, { 'L', ".-.." }, { 'M', "--" }, { 'N', "-." }, { 'O', "---" }, { 'P', ".--." }, { 'Q', "--.-" }, { 'R', ".-." }, { 'S', "..." }, { 'T', "-" }, { 'U', "..-" }, { 'V', "...-" }, { 'W', ".--" }, { 'X', "-..-" }, { 'Y', "-.--" }, { 'Z', "--.." },
            { '0', "-----" }, { '1', ".----" }, { '2', "..---" }, { '3', "...--" }, { '4', "....-" }, { '5', "....." }, { '6', "-...." }, { '7', "--..." }, { '8', "---.." }, { '9', "----." },
        };
        public double Ident(string code)
        {
            if (!Ok() || string.IsNullOrEmpty(code)) return 0;
            double at = 0;
            foreach (var ch0 in code.ToUpperInvariant())
            {
                if (!MORSE.TryGetValue(ch0, out var seq)) { at += 0.36; continue; }
                foreach (var el in seq) { double d = el == '-' ? 0.36 : 0.12; ToneRad(1020, d, 0.05, at); at += d + 0.12; }
                at += 0.24;
            }
            return at;
        }
        public void Chime() { if (!Ok()) return; Tone(1175, 1175, 0.3, 0.032); Tone(880, 880, 0.42, 0.03, "sine", 0.17); }
        public void Thunder(double delay = 1.2, double k = 1)
        {
            if (!Ok()) return;
            Burst(140, 0.5, 1.6, 0.5 * k, "lowpass", 0, 0.8, 55, delay, ambOut);
            Burst(90, 0.5, 2.6, 0.3 * k, "lowpass", 0, 0, 95, delay + 0.35, ambOut);
        }
        public void Click() { if (!Ok()) return; Burst(3600, 1.6, 0.014, 0.3, "bandpass", 0, 0.25, 320); }
        public void Knob() { if (!Ok()) return; Burst(4800, 2, 0.008, 0.2); }
        class TrafState { public SfxParam G, P; public List<SfxOsc> Srcs; public Dictionary<SfxParam, double> Last = new Dictionary<SfxParam, double>(); }
        TrafState traf;
        public void Traffic(Dict o)
        {
            if (!Ok()) return;
            if (traf == null)
            {
                try
                {
                    var g = be.CreateGain(); var lp = be.CreateBiquad(); var p = be.CreatePanner(); var srcs = new List<SfxOsc>();
                    lp.BiquadType = "lowpass"; lp.P("frequency").Value = 520; g.P("gain").Value = 0;
                    g.Connect(lp).Connect(p).Connect(ambOut);
                    foreach (var (h, a) in new[] { (1, 1.0), (2, 0.55), (3, 0.3) })
                    {
                        var os = be.CreateOscillator(); var og = be.CreateGain(); os.OscType = "sawtooth"; og.P("gain").Value = a * 0.3; os.P("frequency").Value = 82 * h;
                        os.Connect(og).Connect(g); os.Start(); srcs.Add(os);
                    }
                    traf = new TrafState { G = g.P("gain"), P = p.P("pan"), Srcs = srcs };
                }
                catch { traf = null; return; }
            }
            double t = be.CurrentTime;
            void SetP(SfxParam param, double v, double tc) { if (traf.Last.TryGetValue(param, out var was) && Math.Abs(was - v) < 1e-4) return; traf.Last[param] = v; param.SetTargetAtTime(v, t, tc); }
            if (o == null || !(MiniJson.Num(o, "gain") > 0)) { SetP(traf.G, 0, 0.4); return; }
            SetP(traf.G, Cl(MiniJson.Num(o, "gain")) * 0.055, 0.25);
            SetP(traf.P, Cl(MiniJson.Num(o, "pan"), -1, 1), 0.15);
            double f = Cl(o.TryGetValue("f", out var fv) && fv is double fd && fd != 0 ? fd : 82, 40, 160);
            for (int i = 0; i < traf.Srcs.Count; i++) SetP(traf.Srcs[i].P("frequency"), f * (i + 1), 0.3);
        }
        public void SetVolume(double v)
        {
            volume = Math.Max(0, Math.Min(1, v));
            if (Ok()) master.P("gain").SetTargetAtTime(volume, be.CurrentTime, 0.05);
        }
        public void SetVolumes(double? engine = null, double? amb = null, double? radio = null)
        {
            vols["engine"] = Cl(engine ?? vols["engine"]); vols["amb"] = Cl(amb ?? vols["amb"]); vols["radio"] = Cl(radio ?? vols["radio"]);
            if (Ok()) { double t = be.CurrentTime; engOut.P("gain").SetTargetAtTime(vols["engine"], t, 0.05); ambOut.P("gain").SetTargetAtTime(vols["amb"], t, 0.05); radOut.P("gain").SetTargetAtTime(vols["radio"], t, 0.05); }
        }
        public void SetAmbience(double? indoor = null, double? wind = null, bool? airborne = null, double? rain = null)
        {
            mix["indoor"] = Cl(indoor ?? mix["indoor"]); mix["wind"] = Cl(wind ?? mix["wind"]); mixAirborne = airborne ?? mixAirborne; mix["rain"] = Cl(rain ?? mix["rain"]);
            if (Ok()) Apply();
        }
    }
}
