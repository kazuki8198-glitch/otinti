// CADET Unity port — MiniJson: a small, dependency-free JSON reader/writer for the
// ported core logic. Parses to Dictionary<string,object> / List<object> / double /
// string / bool / null, and writes the same shapes back. Numbers that are integral
// print without a decimal point, matching JS JSON.stringify for the values the
// game saves (so a C# save reads like a JS save).
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace Cadet
{
    public static class MiniJson
    {
        public static object Parse(string text)
        {
            var p = new Parser(text ?? "null");
            p.SkipWs();
            var v = p.ReadValue();
            p.SkipWs();
            return v;
        }

        public static string Stringify(object v)
        {
            var sb = new StringBuilder();
            Write(sb, v);
            return sb.ToString();
        }

        static void Write(StringBuilder sb, object v)
        {
            if (v == null) { sb.Append("null"); return; }
            if (v is bool) { sb.Append((bool)v ? "true" : "false"); return; }
            if (v is string) { WriteString(sb, (string)v); return; }
            if (v is double) { WriteNumber(sb, (double)v); return; }
            if (v is float) { WriteNumber(sb, (float)v); return; }
            if (v is int || v is long || v is uint || v is short) { sb.Append(Convert.ToString(v, CultureInfo.InvariantCulture)); return; }
            var dict = v as System.Collections.IDictionary;
            if (dict != null)
            {
                sb.Append('{');
                bool first = true;
                foreach (System.Collections.DictionaryEntry e in dict)
                {
                    if (!first) sb.Append(',');
                    first = false;
                    WriteString(sb, Convert.ToString(e.Key, CultureInfo.InvariantCulture));
                    sb.Append(':');
                    Write(sb, e.Value);
                }
                sb.Append('}');
                return;
            }
            var list = v as System.Collections.IEnumerable;
            if (list != null)
            {
                sb.Append('[');
                bool first = true;
                foreach (var item in list) { if (!first) sb.Append(','); first = false; Write(sb, item); }
                sb.Append(']');
                return;
            }
            WriteString(sb, Convert.ToString(v, CultureInfo.InvariantCulture));
        }

        static void WriteNumber(StringBuilder sb, double d)
        {
            if (double.IsNaN(d) || double.IsInfinity(d)) { sb.Append("null"); return; }   // JS JSON.stringify does the same
            if (d == Math.Floor(d) && Math.Abs(d) < 1e15) { sb.Append(((long)d).ToString(CultureInfo.InvariantCulture)); return; }
            sb.Append(d.ToString("R", CultureInfo.InvariantCulture));
        }

        static void WriteString(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (char c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    case '\b': sb.Append("\\b"); break;
                    case '\f': sb.Append("\\f"); break;
                    default:
                        if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
                        else sb.Append(c);
                        break;
                }
            }
            sb.Append('"');
        }

        class Parser
        {
            readonly string s; int i;
            public Parser(string s) { this.s = s; }
            public void SkipWs() { while (i < s.Length && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r')) i++; }
            char Peek() { return i < s.Length ? s[i] : '\0'; }

            public object ReadValue()
            {
                SkipWs();
                char c = Peek();
                if (c == '{') return ReadObject();
                if (c == '[') return ReadArray();
                if (c == '"') return ReadString();
                if (c == 't') { Expect("true"); return true; }
                if (c == 'f') { Expect("false"); return false; }
                if (c == 'n') { Expect("null"); return null; }
                return ReadNumber();
            }

            void Expect(string lit) { if (string.Compare(s, i, lit, 0, lit.Length) != 0) throw new FormatException("MiniJson: expected " + lit + " at " + i); i += lit.Length; }

            Dictionary<string, object> ReadObject()
            {
                var d = new Dictionary<string, object>();
                i++; SkipWs();
                if (Peek() == '}') { i++; return d; }
                while (true)
                {
                    SkipWs();
                    string k = ReadString();
                    SkipWs();
                    if (Peek() != ':') throw new FormatException("MiniJson: expected ':' at " + i);
                    i++;
                    d[k] = ReadValue();
                    SkipWs();
                    char c = Peek();
                    if (c == ',') { i++; continue; }
                    if (c == '}') { i++; return d; }
                    throw new FormatException("MiniJson: expected ',' or '}' at " + i);
                }
            }

            List<object> ReadArray()
            {
                var l = new List<object>();
                i++; SkipWs();
                if (Peek() == ']') { i++; return l; }
                while (true)
                {
                    l.Add(ReadValue());
                    SkipWs();
                    char c = Peek();
                    if (c == ',') { i++; continue; }
                    if (c == ']') { i++; return l; }
                    throw new FormatException("MiniJson: expected ',' or ']' at " + i);
                }
            }

            string ReadString()
            {
                if (Peek() != '"') throw new FormatException("MiniJson: expected string at " + i);
                i++;
                var sb = new StringBuilder();
                while (i < s.Length)
                {
                    char c = s[i++];
                    if (c == '"') return sb.ToString();
                    if (c == '\\' && i < s.Length)
                    {
                        char e = s[i++];
                        switch (e)
                        {
                            case '"': sb.Append('"'); break;
                            case '\\': sb.Append('\\'); break;
                            case '/': sb.Append('/'); break;
                            case 'n': sb.Append('\n'); break;
                            case 'r': sb.Append('\r'); break;
                            case 't': sb.Append('\t'); break;
                            case 'b': sb.Append('\b'); break;
                            case 'f': sb.Append('\f'); break;
                            case 'u':
                                int code = int.Parse(s.Substring(i, 4), NumberStyles.HexNumber);
                                i += 4;
                                // surrogate pair
                                if (code >= 0xD800 && code <= 0xDBFF && i + 6 <= s.Length && s[i] == '\\' && s[i + 1] == 'u')
                                {
                                    int lo = int.Parse(s.Substring(i + 2, 4), NumberStyles.HexNumber);
                                    if (lo >= 0xDC00 && lo <= 0xDFFF) { i += 6; sb.Append(char.ConvertFromUtf32(0x10000 + ((code - 0xD800) << 10) + (lo - 0xDC00))); break; }
                                }
                                sb.Append((char)code);
                                break;
                            default: sb.Append(e); break;
                        }
                    }
                    else sb.Append(c);
                }
                throw new FormatException("MiniJson: unterminated string");
            }

            double ReadNumber()
            {
                int start = i;
                while (i < s.Length && "0123456789+-.eE".IndexOf(s[i]) >= 0) i++;
                return double.Parse(s.Substring(start, i - start), CultureInfo.InvariantCulture);
            }
        }

        // ---- typed access helpers over parsed graphs (JS-flavoured: missing = null) ----
        public static Dictionary<string, object> Obj(object o) { return o as Dictionary<string, object>; }
        public static List<object> Arr(object o) { return o as List<object>; }
        public static object Get(object o, string key)
        {
            var d = o as Dictionary<string, object>;
            object v; return d != null && d.TryGetValue(key, out v) ? v : null;
        }
        public static string Str(object o, string key, string def = null)
        {
            var v = Get(o, key); return v is string ? (string)v : def;
        }
        public static double Num(object o, string key, double def = 0)
        {
            var v = Get(o, key); return v is double ? (double)v : def;
        }
        public static bool Bool(object o, string key, bool def = false)
        {
            var v = Get(o, key); return v is bool ? (bool)v : def;
        }
    }
}
