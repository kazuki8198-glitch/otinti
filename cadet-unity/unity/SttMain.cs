// SttMain — Stage 13 (Task 7): microphone → WAV → faster-whisper (external
// python, Cadet.Stt.RunnerScript) → transcript → readback match. The VM has
// no microphone, so Record() reports MicAvailable=false there; the file
// path (TranscribeFile) is the same pipeline minus the capture and is what
// the acceptance exercises. Windows runtime needs a python3 with
// faster-whisper installed (see README-UNITY).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

public class SttMain : MonoBehaviour
{
    public string LastTranscript = "", LastError = "", LastLanguage = "";
    public bool Busy;
    readonly Queue<Action> mainQueue = new Queue<Action>();
    AudioClip micClip; bool recording;

    public bool MicAvailable { get { return Microphone.devices != null && Microphone.devices.Length > 0; } }

    string RunnerPath()
    {
        string p = Path.Combine(Application.persistentDataPath, "cadet-stt-runner.py");
        if (!File.Exists(p) || File.ReadAllText(p) != Stt.RunnerScript) File.WriteAllText(p, Stt.RunnerScript);
        return p;
    }

    /// <summary>Transcribe an audio file through the whisper bridge.</summary>
    public void TranscribeFile(string audioPath, Action<string> done)
    {
        if (Busy) { done?.Invoke(null); return; }
        Busy = true; LastError = "";
        string runner = RunnerPath();
        Task.Run(() =>
        {
            string text = null, err = null, lang = null;
            try
            {
                var psi = new ProcessStartInfo("python3", "\"" + runner + "\" \"" + audioPath + "\"")
                { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true };
                using (var proc = Process.Start(psi))
                {
                    string outp = proc.StandardOutput.ReadToEnd();
                    proc.WaitForExit(300000);
                    var d = (Dict)MiniJson.Parse(outp.Trim());
                    text = MiniJson.Str(d, "text", ""); lang = MiniJson.Str(d, "language", "");
                }
            }
            catch (Exception ex) { err = ex.Message; }
            lock (mainQueue) mainQueue.Enqueue(() =>
            {
                Busy = false; LastTranscript = text ?? ""; LastError = err ?? ""; LastLanguage = lang ?? "";
                done?.Invoke(text);
            });
        });
    }

    /// <summary>Record from the default microphone for `seconds`, then
    /// transcribe. On a machine with no microphone this reports the state in
    /// LastError and invokes done(null) — it never hangs.</summary>
    public void Record(int seconds, Action<string> done)
    {
        if (!MicAvailable) { LastError = "マイクが見つかりません（この環境では録音できません）"; done?.Invoke(null); return; }
        if (recording) { done?.Invoke(null); return; }
        recording = true;
        micClip = Microphone.Start(null, false, Math.Max(1, seconds), 16000);
        StartCoroutine(StopAfter(seconds, done));
    }
    System.Collections.IEnumerator StopAfter(int seconds, Action<string> done)
    {
        yield return new WaitForSeconds(seconds);
        recording = false;
        int pos = Microphone.GetPosition(null);
        Microphone.End(null);
        if (micClip == null || pos <= 0) { LastError = "録音データがありません"; done?.Invoke(null); yield break; }
        var samples = new float[pos];
        micClip.GetData(samples, 0);
        string wav = Path.Combine(Application.persistentDataPath, "cadet-stt-last.wav");
        Stt.WriteWav16k(samples, 16000, wav);
        TranscribeFile(wav, done);
    }

    /// <summary>Check a transcript against the expected readback saying.</summary>
    public (bool Ok, double Score) CheckReadback(string transcript, string expected) { return Stt.MatchReadback(transcript, expected); }

    void Update()
    {
        while (true) { Action a = null; lock (mainQueue) { if (mainQueue.Count > 0) a = mainQueue.Dequeue(); } if (a == null) break; a(); }
    }
}
