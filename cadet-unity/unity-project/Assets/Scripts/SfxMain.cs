// SfxMain — the audible Unity side of CadetSfx (Stage 11). The ported
// graph (CadetSfx) runs against a no-op backend and maintains LiveState;
// this component turns LiveState into sound: loop clips generated from the
// design's own numbers (the firing-pulse wavetable from pulses(), a prop
// saw, the pink-ish noise) whose pitch/volume follow the mix every frame,
// plus generated one-shot clips for the burst/tone descriptors. Spatial:
// cockpit sources sit at the listener (cockpit sound is head-local in the
// original too — stereo pan only); world one-shots (doors, footsteps) can
// be played at a position with 3D attenuation via PlayOneShotAt.
using System;
using System.Collections.Generic;
using UnityEngine;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

/// <summary>A no-op graph backend: nodes exist, time flows, timers queue.</summary>
public class NullSfxBackend : ISfxBackend
{
    class N : SfxNode { public override SfxNode Connect(object dest) { return dest as SfxNode; } }
    class S : SfxSource { public override SfxNode Connect(object dest) { return dest as SfxNode; } }
    class O : SfxOsc { public override SfxNode Connect(object dest) { return dest as SfxNode; } }
    public readonly List<(double Due, Action Fn)> Timers = new List<(double, Action)>();
    public double CurrentTime { get { return Time.timeAsDouble; } }
    public double SampleRate { get { return 44100; } }
    public string State { get { return "running"; } }
    public SfxNode Destination { get; } = new N();
    public void CreateContext() { }
    T Mk<T>(T n, params (string, double)[] ps) where T : SfxNode { foreach (var (name, def) in ps) n.Params[name] = new SfxParam { Node = n, Name = name, Value = def }; return n; }
    public SfxNode CreateGain() { return Mk(new N(), ("gain", 1)); }
    public SfxNode CreateBiquad() { return Mk(new N(), ("frequency", 350), ("Q", 1), ("gain", 0)); }
    public SfxNode CreatePanner() { return Mk(new N(), ("pan", 0)); }
    public SfxNode CreateCompressor() { return Mk(new N(), ("threshold", -24), ("ratio", 12)); }
    public SfxOsc CreateOscillator() { return Mk(new O(), ("frequency", 440), ("detune", 0)); }
    public SfxSource CreateBufferSource() { return Mk(new S(), ("playbackRate", 1), ("detune", 0)); }
    public SfxBuffer CreateBuffer(int ch, int len, double rate)
    {
        // the port fills Data itself (the noise / jitter buffers)
        return new SfxBuffer { Duration = len / rate, Data = new float[len] };
    }
    public object CreatePeriodicWave(float[] re, float[] im) { return (re, im); }
    int timerSeq;
    public int SetTimeout(Action fn, double ms) { Timers.Add((CurrentTime + ms / 1000.0, fn)); return ++timerSeq; }
    public void ClearTimeout(int id) { }
    public void Pump()
    {
        for (int i = Timers.Count - 1; i >= 0; i--) if (CurrentTime >= Timers[i].Due) { var f = Timers[i].Fn; Timers.RemoveAt(i); f(); }
    }
}

public class SfxMain : MonoBehaviour
{
    public CadetSfx Sfx;
    public NullSfxBackend Backend;
    AudioSource cycleSrc, propSrc, noiseSrc, hornSrc;
    readonly List<AudioSource> oneShotPool = new List<AudioSource>();
    readonly Dictionary<string, AudioClip> clipCache = new Dictionary<string, AudioClip>();
    System.Random rng = new System.Random(7);
    public int OneShotsPlayed;

    void Awake()
    {
        Backend = new NullSfxBackend();
        Sfx = new CadetSfx(Backend, () => rng.NextDouble());
        cycleSrc = LoopSource(MakeCycleClip(), 0);
        propSrc = LoopSource(MakeSawClip(55), 0);
        noiseSrc = LoopSource(MakeNoiseClip(), 0);
        hornSrc = LoopSource(MakeSquareClip(2800), 0);
    }
    AudioSource LoopSource(AudioClip clip, float vol)
    {
        var go = new GameObject("SfxLoop"); go.transform.SetParent(transform, false);
        var s = go.AddComponent<AudioSource>(); s.clip = clip; s.loop = true; s.volume = vol; s.spatialBlend = 0; s.Play();
        return s;
    }
    static AudioClip MakeCycleClip()
    {
        // one period of the firing-pulse waveform (pulses() Fourier series),
        // generated at a 20 Hz base: playback pitch = cycleFreq / 20
        var (re, im) = CadetSfx.Pulses(160, 1.0 / 110, 1.0 / 550);
        int n = 4410; var data = new float[n];
        double peak = 0;
        for (int i = 0; i < n; i++)
        {
            double th = 2 * Math.PI * i / n, v = 0;
            for (int k = 1; k < re.Length; k++) v += re[k] * Math.Cos(k * th) + im[k] * Math.Sin(k * th);
            data[i] = (float)v; if (Math.Abs(v) > peak) peak = Math.Abs(v);
        }
        float scale = (float)(0.85 / Math.Max(1e-6, peak));
        for (int i = 0; i < n; i++) data[i] *= scale;
        var clip = AudioClip.Create("cycle", n, 1, 44100, false); clip.SetData(data, 0); return clip;
    }
    static AudioClip MakeSawClip(double baseHz)
    {
        int n = (int)(44100 / baseHz); var data = new float[n];
        for (int i = 0; i < n; i++) data[i] = (float)((i / (double)n) * 2 - 1) * 0.5f;
        var clip = AudioClip.Create("saw", n, 1, 44100, false); clip.SetData(data, 0); return clip;
    }
    static AudioClip MakeSquareClip(double baseHz)
    {
        int n = (int)(44100 / baseHz); var data = new float[n];
        for (int i = 0; i < n; i++) data[i] = i < n / 2 ? 0.4f : -0.4f;
        var clip = AudioClip.Create("sq", n, 1, 44100, false); clip.SetData(data, 0); return clip;
    }
    AudioClip MakeNoiseClip()
    {
        int n = 44100; var data = new float[n]; double b = 0;
        for (int i = 0; i < n; i++) { double w = rng.NextDouble() * 2 - 1; b = (b + 0.02 * w) / 1.02; data[i] = (float)(w * 0.7 + b * 3) * 0.3f; }
        var clip = AudioClip.Create("noise", n, 1, 44100, false); clip.SetData(data, 0); return clip;
    }
    public void Unlock() { Sfx.Unlock(); }
    public void EngineTick(CadetSfx.EngObs obs)
    {
        Sfx.Engine(obs);
        var L = Sfx.Live;
        if (L.EngineActive)
        {
            cycleSrc.pitch = Mathf.Clamp((float)(L.CycleFreq[0] / 20.0), 0.1f, 8f);
            cycleSrc.volume = Mathf.Clamp((float)(L.ExGain[0] * 2.2), 0, 0.9f);
            propSrc.pitch = Mathf.Clamp((float)(L.PropFreq[0] / 55.0), 0.1f, 8f);
            propSrc.volume = Mathf.Clamp((float)(L.PropGain[0] * 2.0), 0, 0.7f);
            noiseSrc.volume = Mathf.Clamp((float)(L.AirflowGain * 2.0 + L.RumbleGain), 0, 0.6f);
            hornSrc.volume = Mathf.Clamp((float)(L.HornGain * 6.0), 0, 0.5f);
        }
        else { cycleSrc.volume = propSrc.volume = noiseSrc.volume = hornSrc.volume = 0; }
        DrainOneShots(null);
    }
    public void PlayOneShotAt(Dict d, Vector3 pos) { DrainOneShots(pos, d); }
    void DrainOneShots(Vector3? pos, Dict only = null)
    {
        var shots = only != null ? new List<Dict> { only } : Sfx.Live.OneShots;
        foreach (var d in shots) PlayDescriptor(d, pos);
        if (only == null) Sfx.Live.OneShots.Clear();
    }
    void PlayDescriptor(Dict d, Vector3? pos)
    {
        string kind = (string)d["kind"];
        AudioClip clip = null; float vol = 0.5f, pitch = 1f;
        if (kind == "burst")
        {
            double f = MiniJson.Num(d, "f"), dur = MiniJson.Num(d, "d"), g = MiniJson.Num(d, "g");
            string key = "b" + ((int)f) + "_" + ((int)(dur * 100));
            if (!clipCache.TryGetValue(key, out clip)) { clip = MakeBurstClip(f, dur); clipCache[key] = clip; }
            vol = Mathf.Clamp((float)g, 0.02f, 0.9f);
        }
        else if (kind == "tone")
        {
            double f0 = MiniJson.Num(d, "f0"), dur = MiniJson.Num(d, "d"), g = MiniJson.Num(d, "g");
            string key = "t" + ((int)f0) + "_" + ((int)(dur * 100));
            if (!clipCache.TryGetValue(key, out clip)) { clip = MakeToneClip(f0, MiniJson.Num(d, "f1"), dur, (string)d["type"]); clipCache[key] = clip; }
            vol = Mathf.Clamp((float)(g * 4), 0.02f, 0.7f);
        }
        else
        {
            string key = "x" + kind;
            if (!clipCache.TryGetValue(key, out clip)) { clip = MakeBurstClip(kind == "touchdown" ? 300 : 1200, kind == "starter" || kind == "crankOn" ? 1.2 : 0.3); clipCache[key] = clip; }
            vol = 0.5f;
        }
        if (clip == null) return;
        var src = GetOneShotSource(pos);
        src.clip = clip; src.volume = vol; src.pitch = pitch; src.Play();
        OneShotsPlayed++;
    }
    AudioSource GetOneShotSource(Vector3? pos)
    {
        foreach (var s in oneShotPool) if (!s.isPlaying) { s.transform.position = pos ?? transform.position; s.spatialBlend = pos.HasValue ? 1 : 0; return s; }
        var go = new GameObject("SfxOneShot"); go.transform.SetParent(transform, false);
        var src = go.AddComponent<AudioSource>(); src.playOnAwake = false;
        if (pos.HasValue) { src.transform.position = pos.Value; src.spatialBlend = 1; src.rolloffMode = AudioRolloffMode.Linear; src.maxDistance = 30; }
        oneShotPool.Add(src); return src;
    }
    AudioClip MakeBurstClip(double f, double dur)
    {
        int n = Math.Max(64, (int)(44100 * Math.Min(2, dur + 0.05))); var data = new float[n];
        double lp = 0, k = Math.Min(1, f / 8000.0 + 0.05);
        for (int i = 0; i < n; i++)
        {
            double w = rng.NextDouble() * 2 - 1;
            lp += k * (w - lp);
            double envv = Math.Exp(-i / (44100.0 * Math.Max(0.01, dur) * 0.4));
            data[i] = (float)(lp * envv * 0.8);
        }
        var clip = AudioClip.Create("burst", n, 1, 44100, false); clip.SetData(data, 0); return clip;
    }
    static AudioClip MakeToneClip(double f0, double f1, double dur, string type)
    {
        int n = Math.Max(64, (int)(44100 * (dur + 0.05))); var data = new float[n];
        double ph = 0;
        for (int i = 0; i < n; i++)
        {
            double u = i / (double)n, f = f0 * Math.Pow(f1 / Math.Max(1, f0), u);
            ph += 2 * Math.PI * f / 44100;
            double v = type == "sawtooth" ? ((ph / (2 * Math.PI)) % 1) * 2 - 1 : Math.Sin(ph);
            double envv = Math.Min(1, i / (44100.0 * 0.006)) * Math.Exp(-Math.Max(0, i - 44100.0 * dur * 0.4) / (44100.0 * 0.05));
            data[i] = (float)(v * Math.Min(1, envv) * 0.5);
        }
        var clip = AudioClip.Create("tone", n, 1, 44100, false); clip.SetData(data, 0); return clip;
    }
    void Update() { Backend.Pump(); }
    // convenience passthroughs mirroring the original's calls
    public void Click() { Sfx.Click(); DrainOneShots(null); }
    public void Door(string kind, Vector3? at = null) { Sfx.Door(kind); DrainOneShots(at); }
    public void Footstep(string surface) { Sfx.Footstep(surface); DrainOneShots(null); }
}
