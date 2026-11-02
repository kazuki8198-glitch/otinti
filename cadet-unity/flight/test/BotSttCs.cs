// BotSttCs — Stage 13 harness for Cadet.Stt: runs the very runner script the
// Unity host spawns, against the JFK sample (skips gracefully if absent),
// and unit-checks the readback matcher + WAV writer.
using System;
using System.Diagnostics;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

public static class BotSttCs
{
    static int failures = 0;
    static void Check(bool ok, string what) { Console.WriteLine((ok ? "ok   " : "FAIL ") + what); if (!ok) failures++; }

    public static int Main(string[] args)
    {
        // --- readback matcher (pure) ---
        var m1 = Stt.MatchReadback("squawk four six zero one", "Squawk " + Say.Squawk(4601));
        Check(m1.Ok, "match: spoken squawk digits vs " + Say.Squawk(4601) + " (score " + m1.Score.ToString("F2") + ")");
        var m2 = Stt.MatchReadback("contact tower one one eight decimal seven", "Contact Tower " + Say.Freq(118.7));
        Check(m2.Ok, "match: spoken frequency vs " + Say.Freq(118.7) + " (score " + m2.Score.ToString("F2") + ")");
        var m3 = Stt.MatchReadback("squawk one two three four", "Squawk " + Say.Squawk(4601));
        Check(!m3.Ok, "match: wrong squawk digits rejected");
        // --- WAV writer ---
        var samples = new float[16000];
        for (int i = 0; i < samples.Length; i++) samples[i] = (float)Math.Sin(i * 0.1) * 0.5f;
        string wav = Stt.WriteWav16k(samples, 16000, "/tmp/botstt.wav");
        var bytes = File.ReadAllBytes(wav);
        Check(bytes.Length == 44 + 32000 && System.Text.Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF", "wav writer: 1 s of 16 kHz mono = " + bytes.Length + " bytes");
        var rs = Stt.WriteWav16k(new float[44100], 44100, "/tmp/botstt44.wav");
        Check(new FileInfo(rs).Length == 44 + 32000, "wav writer: 44.1 kHz input resampled to 16 kHz");
        // --- the whisper bridge end to end ---
        string sample = args.Length > 0 ? args[0] : "/tmp/jfk.flac";
        if (!File.Exists(sample)) { Console.WriteLine("skip whisper bridge (no sample at " + sample + ")"); }
        else
        {
            string runner = "/tmp/cadet-stt-runner.py";
            File.WriteAllText(runner, Stt.RunnerScript);
            var psi = new ProcessStartInfo("python3", "\"" + runner + "\" \"" + sample + "\"")
            { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false };
            string outp;
            using (var proc = Process.Start(psi)) { outp = proc.StandardOutput.ReadToEnd(); proc.WaitForExit(300000); }
            var d = (Dict)MiniJson.Parse(outp.Trim());
            string text = MiniJson.Str(d, "text", "");
            Console.WriteLine("transcript: " + text);
            Check(text.ToLowerInvariant().Contains("ask not what your country can do"), "whisper bridge transcribed the JFK sample");
            Check(MiniJson.Str(d, "language", "") == "en", "whisper language = en");
        }
        Console.WriteLine(failures == 0 ? "STT HARNESS: ALL PASS" : "STT HARNESS: " + failures + " FAILURES");
        return failures == 0 ? 0 : 1;
    }
}
