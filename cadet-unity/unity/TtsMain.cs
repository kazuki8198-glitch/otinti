// TtsMain — Stage 13 (Task 8): text-to-speech for the Windows build via a
// SAPI bridge. There is no speech engine in this VM and Unity has no
// built-in TTS, so the bridge is a PowerShell script (System.Speech /
// SAPI) that this component writes out on first use and launches per line.
// On non-Windows platforms Speak() is a documented no-op. STATUS: the
// bridge ships in the build but is 実機未検証 — it has never run on a real
// Windows machine (see README-UNITY).
using System;
using System.Diagnostics;
using System.IO;
using UnityEngine;

public class TtsMain : MonoBehaviour
{
    public static bool Enabled = true;
    public static string LastNote = "";
    static Process current;

    const string BridgeScript = @"param([string]$TextFile, [int]$Rate = 0)
Add-Type -AssemblyName System.Speech
$text = Get-Content -Raw -Encoding UTF8 $TextFile
if ([string]::IsNullOrWhiteSpace($text)) { exit 0 }
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = $Rate
$synth.SetOutputToDefaultAudioDevice()
$synth.Speak($text)
";

    static string BridgePath()
    {
        string dir = Path.Combine(Application.persistentDataPath, "cadet-tts");
        Directory.CreateDirectory(dir);
        string p = Path.Combine(dir, "CadetTts.ps1");
        if (!File.Exists(p) || File.ReadAllText(p) != BridgeScript) File.WriteAllText(p, BridgeScript);
        return p;
    }

    /// <summary>Speak one line. Windows only; elsewhere records why not.</summary>
    public static void Speak(string text, int rate = 0)
    {
        if (!Enabled || string.IsNullOrWhiteSpace(text)) return;
        if (Application.platform != RuntimePlatform.WindowsPlayer && Application.platform != RuntimePlatform.WindowsEditor)
        {
            LastNote = "TTS は Windows 実機専用です（SAPI ブリッジ）。この環境では再生されません。";
            return;
        }
        try
        {
            string dir = Path.Combine(Application.persistentDataPath, "cadet-tts");
            Directory.CreateDirectory(dir);
            string tf = Path.Combine(dir, "line.txt");
            File.WriteAllText(tf, text);
            if (current != null && !current.HasExited) { try { current.Kill(); } catch { } }
            var psi = new ProcessStartInfo("powershell.exe",
                "-NoProfile -ExecutionPolicy Bypass -File \"" + BridgePath() + "\" -TextFile \"" + tf + "\" -Rate " + rate)
            { UseShellExecute = false, CreateNoWindow = true };
            current = Process.Start(psi);
            LastNote = "SAPI ブリッジで再生中（実機未検証）";
        }
        catch (Exception ex) { LastNote = "TTS ブリッジ起動失敗: " + ex.Message; }
    }

    void OnDestroy() { if (current != null && !current.HasExited) { try { current.Kill(); } catch { } } }
}
