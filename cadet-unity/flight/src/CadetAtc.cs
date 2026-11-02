// CADET — CadetAtc.cs : cadet/src/dialog/atc.js ported — the radio exchange
// runner: hear the lines (timed like speech), choose against the clock,
// wrong answers get the controller's correction and the choice again, a
// timeout is noted late and the controller calls again. Pure logic.
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public class RadioLine { public string Who, En, Ja; }
    public class RadioChoice { public string En, Why, Negative; public bool Ok; }
    public class Exchange
    {
        public string Station, Freq, Kind, Q, Note;
        public double? Time;
        public List<RadioLine> Hear = new List<RadioLine>();
        public List<RadioChoice> Choices = new List<RadioChoice>();
        public List<RadioLine> Reply = new List<RadioLine>();
    }
    public class Radio
    {
        public Dictionary<string, Func<string, Exchange>> Exchanges = new Dictionary<string, Func<string, Exchange>>();
        public Dictionary<string, List<string>> Sequences = new Dictionary<string, List<string>>();
        public string CallShort = "";
        public string WeatherInfo = "";
        public string AtisText = "";
    }

    public class AtcResult { public string Id, Station; public double Tries; public bool Ok, Late; }
    public class AtcEvent { public string Type, Who, En, Seq; }

    public class AtcRunner
    {
        static double LineS(string en) { return 1.2 + Regex.Split((en ?? "").Trim(), "\\s+").Length * 0.32; }

        readonly Radio _radio;
        readonly Func<double> _R;
        readonly List<AtcResult> _results = new List<AtcResult>();
        readonly List<AtcEvent> _events = new List<AtcEvent>();
        readonly List<RadioLine> _log = new List<RadioLine>();

        class SeqSt { public string Id; public List<(string id, Exchange ex)> List; public int I; }
        class CurSt
        {
            public string Id; public Exchange Ex; public string Phase;
            public List<RadioLine> Queue, Lines;
            public double T, TimeLeft; public List<int> Order; public double Tries; public bool Late;
            public Dict Last; public string WrongWhy = "";
        }
        SeqSt _seq; CurSt _cur;

        public AtcRunner(Radio radio, uint seed = 11) { _radio = radio; _R = Failures.Rng(seed); }
        public bool Busy { get { return _cur != null; } }
        public string Seq { get { return _seq != null ? _seq.Id : ""; } }
        public List<AtcResult> Results { get { return _results; } }
        public List<RadioLine> Log { get { return _log; } }

        Exchange Resolve(string id, string arg) { return _radio.Exchanges.TryGetValue(id, out var f) ? f(arg) : null; }

        public Dict Start(string seqId, string arg = null)
        {
            if (!_radio.Sequences.TryGetValue(seqId, out var ids)) throw new Exception($"atc: no sequence \"{seqId}\"");
            _seq = new SeqSt { Id = seqId, List = new List<(string, Exchange)>(), I = -1 };
            foreach (var id in ids) _seq.List.Add((id, Resolve(id, arg)));
            NextExchange();
            return View();
        }
        void NextExchange()
        {
            _seq.I++;
            if (_seq.I >= _seq.List.Count) { string id = _seq.Id; _seq = null; _cur = null; _events.Add(new AtcEvent { Type = "done", Seq = id }); return; }
            var it = _seq.List[_seq.I];
            var ex = it.ex;
            var order = new List<int>();
            for (int i = 0; i < ex.Choices.Count; i++) order.Add(i);
            for (int i = order.Count - 1; i > 0; i--) { int j = (int)Math.Floor(_R() * (i + 1)); (order[i], order[j]) = (order[j], order[i]); }
            _cur = new CurSt { Id = it.id, Ex = ex, Phase = "hear", Queue = new List<RadioLine>(ex.Hear), Lines = new List<RadioLine>(), T = 0, TimeLeft = ex.Time ?? 25, Order = order, Tries = 0, Late = false, Last = null };
            Pump();
        }
        void Pump()
        {
            if (_cur.Queue.Count > 0)
            {
                var l = _cur.Queue[0]; _cur.Queue.RemoveAt(0);
                _cur.Lines.Add(l); _log.Add(l); _cur.T = LineS(l.En);
                _events.Add(new AtcEvent { Type = "say", Who = l.Who, En = l.En });
                return;
            }
            if (_cur.Phase == "hear" || _cur.Phase == "negative") { _cur.Phase = "choose"; _cur.T = 0; return; }
            if (_cur.Phase == "reply")
            {
                _results.Add(new AtcResult { Id = _cur.Id, Station = _cur.Ex.Station, Tries = _cur.Tries, Ok = _cur.Tries == 1 && !_cur.Late, Late = _cur.Late });
                NextExchange();
            }
        }
        public List<AtcEvent> Update(double dt)
        {
            _events.Clear();
            if (_cur == null) return _events;
            if (_cur.Phase == "choose")
            {
                _cur.TimeLeft -= dt;
                if (_cur.TimeLeft <= 0 && !_cur.Late)
                {
                    _cur.Late = true; _cur.TimeLeft = _cur.Ex.Time ?? 25;
                    string stName = _cur.Ex.Station == "GND" ? "Ground" : _cur.Ex.Station == "TWR" ? "Tower" : "ATIS";
                    var again = new RadioLine { Who = _cur.Ex.Station, En = $"{_radio.CallShort}, LAB {stName}, how do you hear?", Ja = "聞こえていますか？（応答がない）" };
                    if (_cur.Ex.Station != "ATIS") { _cur.Lines.Add(again); _log.Add(again); _events.Add(new AtcEvent { Type = "say", Who = again.Who, En = again.En }); }
                }
            }
            else if ((_cur.T -= dt) <= 0) Pump();
            return _events;
        }
        public Dict Answer(int k)
        {
            if (_cur == null || _cur.Phase != "choose") return null;
            if (k < 0 || k >= _cur.Order.Count) return null;
            var c = _cur.Ex.Choices[_cur.Order[k]];
            _cur.Tries++;
            var said = new RadioLine { Who = "P", En = c.En, Ja = "" };
            if (_cur.Ex.Kind != "listen") { _cur.Lines.Add(said); _log.Add(said); }
            _cur.Last = new Dict { { "ok", c.Ok }, { "why", c.Ok ? _cur.Ex.Note ?? "" : c.Why ?? "" }, { "en", c.En } };
            if (c.Ok) { _cur.Phase = "reply"; _cur.Queue = new List<RadioLine>(_cur.Ex.Reply); _cur.T = 0.6; _cur.WrongWhy = ""; }
            else
            {
                _cur.Phase = "negative"; _cur.WrongWhy = c.Why ?? "";
                _cur.Queue = c.Negative != null ? new List<RadioLine> { new RadioLine { Who = _cur.Ex.Station, En = c.Negative, Ja = "（訂正）" } } : new List<RadioLine>();
                _cur.T = 0.5; _cur.TimeLeft = _cur.Ex.Time ?? 25;
            }
            return new Dict(_cur.Last);
        }
        public Dict View()
        {
            if (_cur == null) return null;
            var ex = _cur.Ex;
            var lines = new Lst();
            var tail = _cur.Lines.Count > 4 ? _cur.Lines.GetRange(_cur.Lines.Count - 4, 4) : _cur.Lines;
            foreach (var l in tail) lines.Add(new Dict { { "who", l.Who }, { "en", l.En }, { "ja", l.Ja } });
            var choices = new Lst();
            if (_cur.Phase == "choose") for (int k = 0; k < _cur.Order.Count; k++) choices.Add(new Dict { { "k", (double)k }, { "en", ex.Choices[_cur.Order[k]].En } });
            return new Dict
            {
                { "seq", _seq != null ? _seq.Id : "" }, { "id", _cur.Id }, { "station", ex.Station }, { "freq", ex.Freq }, { "kind", ex.Kind },
                { "phase", _cur.Phase }, { "lines", lines }, { "q", ex.Q }, { "choices", choices },
                { "timeLeft", Math.Max(0, _cur.TimeLeft) }, { "time", ex.Time ?? 25 }, { "last", _cur.Last }, { "wrongWhy", _cur.WrongWhy },
            };
        }
        public int RightIndex()
        {
            if (_cur == null || _cur.Phase != "choose") return -1;
            return _cur.Order.FindIndex(i => _cur.Ex.Choices[i].Ok);
        }
        public Dict Summary()
        {
            int first = 0, late = 0; double wrong = 0;
            foreach (var r in _results) { if (r.Ok) first++; if (r.Late) late++; wrong += Math.Max(0, r.Tries - 1); }
            var res = new Lst();
            foreach (var r in _results) res.Add(new Dict { { "id", r.Id }, { "station", r.Station }, { "tries", r.Tries }, { "ok", r.Ok }, { "late", r.Late } });
            return new Dict { { "n", (double)_results.Count }, { "first", (double)first }, { "late", (double)late }, { "wrong", wrong }, { "results", res } };
        }
    }
}
