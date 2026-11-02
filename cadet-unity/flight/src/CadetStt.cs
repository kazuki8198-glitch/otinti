// CadetStt — Stage 13 (Task 7): the speech-to-text bridge logic, kept
// Unity-free so the whole path is testable headlessly. The recogniser is
// faster-whisper (standalone-verified in tools/stt-verify.py) driven as an
// external python process; SttMain (unity/) owns the microphone and the
// process, this class owns the runner script, the WAV writer and the
// readback matching (a transcript vs the expected saying, numbers compared
// as digits so "four six zero one" matches squawk 4601).
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace Cadet
{
    public static class Stt
    {
        public const string RunnerScript = @"import sys, json
from faster_whisper import WhisperModel
import av, numpy as np
path = sys.argv[1]
container = av.open(path)
resampler = av.AudioResampler(format='fltp', layout='mono', rate=16000)
frames = []
for frame in container.decode(audio=0):
    for rf in resampler.resample(frame):
        frames.append(rf.to_ndarray().reshape(-1))
audio = np.concatenate(frames).astype(np.float32) if frames else np.zeros(0, dtype=np.float32)
m = WhisperModel('tiny', device='cpu', compute_type='int8')
segs, info = m.transcribe(audio)
text = ''.join(s.text for s in segs).strip()
print(json.dumps({'language': info.language, 'text': text}, ensure_ascii=False))
";

        /// <summary>Write float samples as a 16 kHz mono 16-bit WAV (linear
        /// resample from srcRate). Returns the path.</summary>
        public static string WriteWav16k(float[] samples, int srcRate, string path)
        {
            int n = srcRate == 16000 ? samples.Length : (int)((long)samples.Length * 16000 / srcRate);
            var outp = new float[n];
            for (int i = 0; i < n; i++)
            {
                double src = srcRate == 16000 ? i : (double)i * srcRate / 16000;
                int i0 = (int)src; double fr = src - i0;
                float a = samples[Math.Min(i0, samples.Length - 1)];
                float b = samples[Math.Min(i0 + 1, samples.Length - 1)];
                outp[i] = (float)(a + (b - a) * fr);
            }
            using (var fs = new FileStream(path, FileMode.Create))
            using (var w = new BinaryWriter(fs))
            {
                int dataLen = n * 2;
                w.Write(Encoding.ASCII.GetBytes("RIFF")); w.Write(36 + dataLen); w.Write(Encoding.ASCII.GetBytes("WAVE"));
                w.Write(Encoding.ASCII.GetBytes("fmt ")); w.Write(16); w.Write((short)1); w.Write((short)1);
                w.Write(16000); w.Write(32000); w.Write((short)2); w.Write((short)16);
                w.Write(Encoding.ASCII.GetBytes("data")); w.Write(dataLen);
                foreach (var f in outp)
                {
                    double v = Math.Max(-1, Math.Min(1, f));
                    w.Write((short)(v * 32767));
                }
            }
            return path;
        }

        static readonly Dictionary<string, string> NUMWORDS = new Dictionary<string, string>
        {
            { "zero", "0" }, { "oh", "0" }, { "one", "1" }, { "two", "2" }, { "three", "3" }, { "four", "4" },
            { "five", "5" }, { "six", "6" }, { "seven", "7" }, { "eight", "8" }, { "nine", "9" }, { "niner", "9" },
            { "ten", "10" }, { "eleven", "11" }, { "twelve", "12" }, { "thirteen", "13" }, { "fourteen", "14" },
            { "fifteen", "15" }, { "sixteen", "16" }, { "seventeen", "17" }, { "eighteen", "18" }, { "nineteen", "19" },
            { "twenty", "20" }, { "thirty", "30" }, { "forty", "40" }, { "fifty", "50" },
            { "sixty", "60" }, { "seventy", "70" }, { "eighty", "80" }, { "ninety", "90" },
            { "decimal", "." }, { "point", "." },
        };
        static readonly Dictionary<string, string> NATO = new Dictionary<string, string>
        {
            { "alfa", "a" }, { "alpha", "a" }, { "bravo", "b" }, { "charlie", "c" }, { "delta", "d" }, { "echo", "e" },
            { "foxtrot", "f" }, { "golf", "g" }, { "hotel", "h" }, { "india", "i" }, { "juliett", "j" }, { "kilo", "k" },
            { "lima", "l" }, { "mike", "m" }, { "november", "n" }, { "oscar", "o" }, { "papa", "p" }, { "quebec", "q" },
            { "romeo", "r" }, { "sierra", "s" }, { "tango", "t" }, { "uniform", "u" }, { "victor", "v" },
            { "whiskey", "w" }, { "xray", "x" }, { "yankee", "y" }, { "zulu", "z" },
        };

        /// <summary>Squash a saying for comparison: lowercase, number words
        /// and NATO letters folded to digits/letters, punctuation and spaces
        /// removed.</summary>
        public static string Squash(string text)
        {
            if (text == null) return "";
            var sb = new StringBuilder();
            foreach (var raw in text.ToLowerInvariant().Split(new[] { ' ', '\t', '\n', '\r', ',', ';', ':', '!', '?', '"', '\'' }, StringSplitOptions.RemoveEmptyEntries))
            {
                string tok = raw.Trim('.', '-');
                if (tok.Length == 0) continue;
                if (NUMWORDS.TryGetValue(tok, out var d)) sb.Append(d);
                else if (NATO.TryGetValue(tok, out var l)) sb.Append(l);
                else if (tok == "hundred" || tok == "thousand") { /* spoken as part of digit groups in readbacks; altitude forms are compared loosely below */ }
                else sb.Append(tok);
            }
            return sb.ToString().Replace("-", "").Replace(".", "p");
        }

        /// <summary>Readback check: exact squashed equality, or a token
        /// containment score ≥ 0.8 of the expected content words.</summary>
        public static (bool Ok, double Score) MatchReadback(string transcript, string expected)
        {
            string a = Squash(transcript), b = Squash(expected);
            if (b.Length == 0) return (false, 0);
            if (a == b) return (true, 1);
            if (a.Contains(b)) return (true, 0.95);
            // digit content must match exactly when the expected has digits
            string da = DigitsOnly(a), db = DigitsOnly(b);
            if (db.Length > 0 && da != db) return (false, 0.3);
            int hit = 0;
            foreach (var t in Tokens(expected)) if (Squash(transcript).Contains(Squash(t))) hit++;
            int n = Tokens(expected).Count;
            double score = n > 0 ? (double)hit / n : 0;
            return (score >= 0.8, score);
        }
        static string DigitsOnly(string s) { var sb = new StringBuilder(); foreach (var c in s) if (char.IsDigit(c)) sb.Append(c); return sb.ToString(); }
        static List<string> Tokens(string s) { var l = new List<string>(); foreach (var t in (s ?? "").Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)) l.Add(t); return l; }
    }
}
