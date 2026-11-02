// RasterCanvas — a software rasterizer implementing the cockpit glass's
// IBCanvas over a Texture2D: affine transform stack, path fill / stroke
// (arcs flattened), rect / circle clip masks, dashed strokes, alpha blending,
// and text through Unity's dynamic font (glyphs blitted from the font atlas;
// if no font is available, text degrades to measured blocks and says so once).
// It exists so the ported drawing (CadetBoeingDraw, proven op-identical to
// boeing.js) renders in Unity without a browser canvas.
using System;
using System.Collections.Generic;
using UnityEngine;
using Cadet;

public class RasterCanvas : IBCanvas
{
    public readonly int W, H;
    public readonly Texture2D Tex;
    readonly Color32[] px;          // canvas orientation: row 0 = top
    readonly Color32[] flip;        // upload buffer (texture orientation)
    byte[] clip;                    // null = unclipped
    bool dirty = true;

    struct M2 { public double A, B, C, D, E, F; }
    M2 m;
    struct State { public M2 M; public byte[] Clip; public string Fill, Stroke; public double Lw; public FontSpec Font; public string Align, Baseline; public double[] Dash; }
    readonly Stack<State> stack = new Stack<State>();
    readonly List<Vector2[]> subpaths = new List<Vector2[]>();
    List<Vector2> cur;

    public string FillStyle { get; set; } = "#000";
    public string StrokeStyle { get; set; } = "#000";
    public double LineWidth { get; set; } = 1;
    public FontSpec Font { get; set; }
    public string TextAlign { get; set; } = "left";
    public string TextBaseline { get; set; } = "alphabetic";
    double[] dash = new double[0];

    static Font dynFont, dynFontMono;
    static bool fontTried, fontOk;
    static readonly Dictionary<Font, Color32[]> atlasCache = new Dictionary<Font, Color32[]>();
    static readonly Dictionary<Font, Texture2D> atlasTexOf = new Dictionary<Font, Texture2D>();
    static readonly HashSet<string> seenGlyphs = new HashSet<string>();
    static bool warned;
    static void WarnOnce(string msg) { if (!warned) { warned = true; Debug.LogWarning("RasterCanvas: " + msg); } }
    public static bool FontAvailable { get { return fontOk; } }

    public RasterCanvas(int w, int h)
    {
        W = w; H = h;
        px = new Color32[w * h]; flip = new Color32[w * h];
        Tex = new Texture2D(w, h, TextureFormat.RGBA32, false);
        Tex.filterMode = FilterMode.Bilinear;
        m = new M2 { A = 1, D = 1 };
        EnsureFont();
    }

    static void EnsureFont()
    {
        if (fontTried) return; fontTried = true;
        try
        {
            // the sans face must contain the game's Japanese glyphs itself:
            // a Latin-only face makes Unity substitute CJK glyphs from a
            // fallback font whose atlas the CharacterInfo UVs do not match
            dynFont = UnityEngine.Font.CreateDynamicFontFromOSFont(new[] { "Noto Sans CJK JP", "Noto Sans JP", "DejaVu Sans", "Liberation Sans", "Arial" }, 64);
            dynFontMono = UnityEngine.Font.CreateDynamicFontFromOSFont(new[] { "DejaVu Sans Mono", "Liberation Mono", "Courier New" }, 64);
            fontOk = dynFont != null;
            if (!fontOk) Debug.LogWarning("RasterCanvas: no dynamic font — glass text will be blocks");
            else Debug.Log("RasterCanvas fonts: sans=" + dynFont.name + " mono=" + (dynFontMono != null ? dynFontMono.name : "null"));
            // an atlas rebuild moves every glyph: drop the cached pixels
            UnityEngine.Font.textureRebuilt += (f) => { atlasCache.Clear(); atlasTexOf.Clear(); };
        }
        catch (Exception e) { Debug.LogWarning("RasterCanvas: font init failed: " + e.Message); }
    }

    // ---------------------------------------------------------------- styles
    static Color32 ParseColor(string s)
    {
        if (s != null && s.StartsWith("#") && s.Length == 7)
            return new Color32(Convert.ToByte(s.Substring(1, 2), 16), Convert.ToByte(s.Substring(3, 2), 16), Convert.ToByte(s.Substring(5, 2), 16), 255);
        if (s != null && s.StartsWith("rgba("))
        {
            var p = s.Substring(5, s.Length - 6).Split(',');
            return new Color32(byte.Parse(p[0]), byte.Parse(p[1]), byte.Parse(p[2]), (byte)(double.Parse(p[3], System.Globalization.CultureInfo.InvariantCulture) * 255));
        }
        return new Color32(0, 0, 0, 255);
    }

    void Plot(int x, int y, Color32 c)
    {
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        if (clip != null && clip[y * W + x] == 0) return;
        int i = y * W + x;
        if (c.a >= 255) { px[i] = c; }
        else
        {
            var d = px[i];
            float a = c.a / 255f, ia = 1 - a;
            px[i] = new Color32((byte)(c.r * a + d.r * ia), (byte)(c.g * a + d.g * ia), (byte)(c.b * a + d.b * ia), 255);
        }
        dirty = true;
    }

    Vector2 Xf(double x, double y) { return new Vector2((float)(m.A * x + m.C * y + m.E), (float)(m.B * x + m.D * y + m.F)); }
    double ScaleAvg { get { return (Math.Abs(m.A) + Math.Abs(m.D)) / 2; } }

    // ---------------------------------------------------------------- state
    public void Save()
    {
        stack.Push(new State { M = m, Clip = clip != null ? (byte[])clip.Clone() : null, Fill = FillStyle, Stroke = StrokeStyle, Lw = LineWidth, Font = Font, Align = TextAlign, Baseline = TextBaseline, Dash = dash });
    }
    public void Restore()
    {
        if (stack.Count == 0) return;
        var s = stack.Pop();
        m = s.M; clip = s.Clip; FillStyle = s.Fill; StrokeStyle = s.Stroke; LineWidth = s.Lw; Font = s.Font; TextAlign = s.Align; TextBaseline = s.Baseline; dash = s.Dash;
    }

    // ---------------------------------------------------------------- paths
    public void BeginPath() { subpaths.Clear(); cur = null; }
    void AddPt(Vector2 p) { if (cur == null) { cur = new List<Vector2>(); subpaths.Add(null); } cur.Add(p); }
    void FlushCur() { if (cur != null) { subpaths[subpaths.Count - 1] = cur.ToArray(); cur = null; } }
    public void MoveTo(double x, double y) { FlushCur(); AddPt(Xf(x, y)); }
    public void LineTo(double x, double y) { AddPt(Xf(x, y)); }
    public void ClosePath() { if (cur != null && cur.Count > 1) cur.Add(cur[0]); }
    public void Rect(double x, double y, double w, double h)
    {
        FlushCur();
        AddPt(Xf(x, y)); AddPt(Xf(x + w, y)); AddPt(Xf(x + w, y + h)); AddPt(Xf(x, y + h)); AddPt(Xf(x, y));
        FlushCur();
    }
    public void Arc(double x, double y, double r, double a0, double a1)
    {
        // flatten in user space (canvas arcs go clockwise as the angle grows, y down)
        double sweep = a1 - a0;
        int steps = Math.Max(4, (int)(Math.Abs(sweep) / (Math.PI / 36)));
        for (int i = 0; i <= steps; i++)
        {
            double a = a0 + sweep * i / steps;
            var p = Xf(x + r * Math.Cos(a), y + r * Math.Sin(a));
            if (i == 0 && cur == null) AddPt(p); else AddPt(p);
        }
    }
    List<Vector2[]> Paths() { FlushCur(); return subpaths; }

    public void Clip()
    {
        var mask = new byte[W * H];
        FillPathsInto(mask, Paths());
        if (clip == null) clip = mask;
        else for (int i = 0; i < mask.Length; i++) clip[i] = (byte)(clip[i] & mask[i]);
        dirty = true;
    }

    void FillPathsInto(byte[] target, List<Vector2[]> paths)
    {
        // scanline even-odd fill
        var edges = new List<(double x0, double y0, double x1, double y1)>();
        foreach (var sp in paths) if (sp != null) for (int i = 0; i + 1 < sp.Length; i++) edges.Add((sp[i].x, sp[i].y, sp[i + 1].x, sp[i + 1].y));
        for (int y = 0; y < H; y++)
        {
            double yc = y + 0.5;
            var xs = new List<double>();
            foreach (var e in edges)
            {
                if ((e.y0 <= yc && e.y1 > yc) || (e.y1 <= yc && e.y0 > yc))
                    xs.Add(e.x0 + (yc - e.y0) / (e.y1 - e.y0) * (e.x1 - e.x0));
            }
            if (xs.Count < 2) continue;
            xs.Sort();
            for (int i = 0; i + 1 < xs.Count; i += 2)
            {
                int xa = Math.Max(0, (int)Math.Ceiling(xs[i] - 0.5)), xb = Math.Min(W - 1, (int)Math.Floor(xs[i + 1] - 0.5));
                for (int x = xa; x <= xb; x++) target[y * W + x] = 1;
            }
        }
    }

    public void Fill()
    {
        var c = ParseColor(FillStyle);
        var mask = new byte[W * H];
        FillPathsInto(mask, Paths());
        for (int i = 0; i < mask.Length; i++) if (mask[i] != 0) Plot(i % W, i / W, c);
    }

    void Stamp(double x, double y, double r, Color32 c)
    {
        int xi = (int)Math.Round(x), yi = (int)Math.Round(y);
        int rr = Math.Max(0, (int)Math.Ceiling(r));
        for (int dy = -rr; dy <= rr; dy++) for (int dx = -rr; dx <= rr; dx++)
            if (dx * dx + dy * dy <= r * r + 0.5) Plot(xi + dx, yi + dy, c);
    }

    public void Stroke()
    {
        var c = ParseColor(StrokeStyle);
        double wHalf = Math.Max(0.4, LineWidth * ScaleAvg / 2);
        foreach (var sp in Paths())
        {
            if (sp == null) continue;
            double dist = 0;
            for (int i = 0; i + 1 < sp.Length; i++)
            {
                var a = sp[i]; var b = sp[i + 1];
                double len = (b - a).magnitude;
                int steps = Math.Max(1, (int)(len / Math.Max(0.5, wHalf)));
                for (int sIdx = 0; sIdx <= steps; sIdx++)
                {
                    double dNow = dist + len * sIdx / steps;
                    if (dash != null && dash.Length > 0)
                    {
                        double period = 0; foreach (var d in dash) period += d;
                        double ph = period > 0 ? dNow % period : 0;
                        bool on = true; double acc = 0;
                        for (int di = 0; di < dash.Length; di++) { acc += dash[di]; if (ph <= acc) { on = di % 2 == 0; break; } }
                        if (!on) continue;
                    }
                    var p = Vector2.Lerp(a, b, (float)(sIdx / (double)steps));
                    Stamp(p.x, p.y, wHalf, c);
                }
                dist += len;
            }
        }
    }

    public void Translate(double x, double y) { var t = new M2 { A = 1, D = 1, E = x, F = y }; m = Compose(m, t); }
    public void Rotate(double a)
    {
        double cs = Math.Cos(a), sn = Math.Sin(a);
        var r = new M2 { A = cs, B = sn, C = -sn, D = cs };
        m = Compose(m, r);
    }
    public void Scale(double x, double y) { var s = new M2 { A = x, D = y }; m = Compose(m, s); }
    // canvas semantics: after an op, user points map as M_old(op(p)) — the new op acts first
    static M2 Compose(M2 outer, M2 inner)
    {
        return new M2
        {
            A = outer.A * inner.A + outer.C * inner.B,
            B = outer.B * inner.A + outer.D * inner.B,
            C = outer.A * inner.C + outer.C * inner.D,
            D = outer.B * inner.C + outer.D * inner.D,
            E = outer.A * inner.E + outer.C * inner.F + outer.E,
            F = outer.B * inner.E + outer.D * inner.F + outer.F,
        };
    }

    // ---------------------------------------------------------------- rects
    public void FillRect(double x, double y, double w, double h)
    {
        var c = ParseColor(FillStyle);
        var corners = new[] { Xf(x, y), Xf(x + w, y), Xf(x + w, y + h), Xf(x, y + h) };
        double minX = double.MaxValue, maxX = double.MinValue, minY = double.MaxValue, maxY = double.MinValue;
        bool axisAligned = true;
        foreach (var p in corners) { minX = Math.Min(minX, p.x); maxX = Math.Max(maxX, p.x); minY = Math.Min(minY, p.y); maxY = Math.Max(maxY, p.y); }
        // only axis-aligned fills take the fast path (the rotated attitude fill goes through the polygon path)
        axisAligned = Math.Abs(corners[0].y - corners[1].y) < 0.01 && Math.Abs(corners[0].x - corners[3].x) < 0.01;
        if (!axisAligned)
        {
            var mask = new byte[W * H];
            FillPathsInto(mask, new List<Vector2[]> { new[] { corners[0], corners[1], corners[2], corners[3], corners[0] } });
            for (int i = 0; i < mask.Length; i++) if (mask[i] != 0) Plot(i % W, i / W, c);
            return;
        }
        int xa = Math.Max(0, (int)Math.Floor(minX)), xb = Math.Min(W - 1, (int)Math.Ceiling(maxX) - 1);
        int ya = Math.Max(0, (int)Math.Floor(minY)), yb = Math.Min(H - 1, (int)Math.Ceiling(maxY) - 1);
        for (int yy = ya; yy <= yb; yy++) for (int xx = xa; xx <= xb; xx++) Plot(xx, yy, c);
    }
    public void StrokeRect(double x, double y, double w, double h)
    {
        BeginPath(); Rect(x, y, w, h); Stroke();
    }
    public void SetLineDash(double[] d) { dash = d; }

    // ---------------------------------------------------------------- text
    public void FillText(string str, double x, double y)
    {
        if (string.IsNullOrEmpty(str)) return;
        var col = ParseColor(FillStyle);
        int size = Math.Max(6, (int)Math.Round(Font.Size));
        var font = Font.Mono ? (dynFontMono ?? dynFont) : dynFont;
        var anchor = Xf(x, y);
        if (font == null)
        {
            // degraded: a block per character cell (layout stays honest, words don't)
            double cw = size * 0.55;
            double total = cw * str.Length;
            double sx = TextAlign == "right" ? anchor.x - total : TextAlign == "center" ? anchor.x - total / 2 : anchor.x;
            for (int i = 0; i < str.Length; i++)
                for (int yy = (int)(anchor.y - size / 2); yy < anchor.y + size / 2; yy++)
                    for (int xx = (int)(sx + i * cw + 1); xx < sx + (i + 1) * cw - 1; xx++) Plot(xx, yy, col);
            return;
        }
        var style = Font.Weight >= 600 ? FontStyle.Bold : FontStyle.Normal;
        if (font == null) font = dynFont;   // mono unavailable: fall back to the sans face
        if (font == null) return;
        font.RequestCharactersInTexture(str, size, style);
        var tex = font.material != null ? font.material.mainTexture as Texture2D : null;
        if (tex == null) { WarnOnce("font material texture is null for " + str); return; }
        // the atlas is re-read only when a character/size/style appears that we
        // have not blitted before (a rebuild could otherwise invalidate it)
        bool fresh = false;
        foreach (var ch in str) if (seenGlyphs.Add(ch + "|" + size + "|" + style + "|" + (Font.Mono ? "m" : "s"))) fresh = true;
        Color32[] cached = null; Texture2D cachedTex = null;
        atlasCache.TryGetValue(font, out cached); atlasTexOf.TryGetValue(font, out cachedTex);
        if (fresh || cachedTex != tex || cached == null)
        {
            try { cached = tex.GetPixels32(); atlasCache[font] = cached; atlasTexOf[font] = tex; }
            catch (Exception ex) { WarnOnce("font atlas read failed: " + ex.Message); cached = null; }
        }
        if (cached == null) return;
        var fontPx = cached;
        // measure
        double width = 0; var infos = new CharacterInfo[str.Length];
        for (int i = 0; i < str.Length; i++) { font.GetCharacterInfo(str[i], out infos[i], size, style); width += infos[i].advance; }
        double startX = TextAlign == "right" ? anchor.x - width : TextAlign == "center" ? anchor.x - width / 2 : anchor.x;
        double baseline = TextBaseline == "middle" ? anchor.y + size * 0.36 : anchor.y;
        double pen = startX;
        int tw = tex.width, th = tex.height;
        for (int i = 0; i < str.Length; i++)
        {
            var ci = infos[i];
            // The four UV corners fully describe the glyph bitmap's placement,
            // including 90°-rotated packing (used for large CJK glyphs in
            // Noto Sans CJK: there the u axis runs along the glyph's vertical).
            // Bilinear-map glyph-local (s: left→right, t: bottom→top) to atlas
            // UV and sample; GetPixels32 rows run v=0 first. t is measured so
            // that row 0 (glyph top) reproduces the Latin path exactly.
            var BL0 = ci.uvBottomLeft; var BR0 = ci.uvBottomRight; var TL0 = ci.uvTopLeft;
            int gw = (int)Math.Round(Math.Max(Math.Abs(BR0.x - BL0.x) * tw, Math.Abs(BR0.y - BL0.y) * th));
            int gh = (int)Math.Round(Math.Max(Math.Abs(TL0.x - BL0.x) * tw, Math.Abs(TL0.y - BL0.y) * th));
            if (gw > 0 && gh > 0)
            {
                var BL = ci.uvBottomLeft; var BR = ci.uvBottomRight; var TL = ci.uvTopLeft; var TR = ci.uvTopRight;
                double dx0 = pen + ci.bearing, dy0 = baseline - ci.maxY;
                for (int row = 0; row < gh; row++)
                {
                    double t = 1.0 - (row + 0.5) / gh;
                    int dy = (int)Math.Round(dy0) + row;
                    if (dy < 0 || dy >= H) continue;
                    for (int colI = 0; colI < gw; colI++)
                    {
                        double s = (colI + 0.5) / gw;
                        double u = BL.x * (1 - s) * (1 - t) + BR.x * s * (1 - t) + TL.x * (1 - s) * t + TR.x * s * t;
                        double v = BL.y * (1 - s) * (1 - t) + BR.y * s * (1 - t) + TL.y * (1 - s) * t + TR.y * s * t;
                        int srcX = (int)(u * tw); if (srcX < 0) srcX = 0; else if (srcX >= tw) srcX = tw - 1;
                        int srcY = (int)(v * th); if (srcY < 0) srcY = 0; else if (srcY >= th) srcY = th - 1;
                        byte a = fontPx[srcY * tw + srcX].a; if (a == 0) continue;
                        int dx = (int)Math.Round(dx0) + colI;
                        if (dx >= 0 && dx < W && (clip == null || clip[dy * W + dx] != 0))
                        {
                            int idx = dy * W + dx; var d = px[idx]; float af = a / 255f, ia = 1 - af;
                            px[idx] = new Color32((byte)(col.r * af + d.r * ia), (byte)(col.g * af + d.g * ia), (byte)(col.b * af + d.b * ia), 255);
                            dirty = true;
                        }
                    }
                }
            }
            pen += ci.advance;
        }
    }

    /// <summary>Clear to transparent (UI text canvases).</summary>
    public void ClearAll()
    {
        Array.Clear(px, 0, px.Length);
        clip = null;
        dirty = true;
    }

    /// <summary>Advance-width of a string in the given spec, via the same dynamic fonts.</summary>
    public double MeasureText(string str, FontSpec spec)
    {
        EnsureFont();
        var font = spec.Mono ? (dynFontMono ?? dynFont) : dynFont;
        if (font == null) return str.Length * spec.Size * 0.55;
        int size = Math.Max(6, (int)Math.Round(spec.Size));
        var style = spec.Weight >= 600 ? FontStyle.Bold : FontStyle.Normal;
        font.RequestCharactersInTexture(str, size, style);
        double w = 0;
        foreach (var ch in str) { font.GetCharacterInfo(ch, out var ci, size, style); w += ci.advance; }
        return w;
    }

    // ---------------------------------------------------------------- upload
    public void Upload()
    {
        if (!dirty) return; dirty = false;
        for (int y = 0; y < H; y++)
        {
            int src = (H - 1 - y) * W, dst = y * W;
            Array.Copy(px, src, flip, dst, W);
        }
        Tex.SetPixels32(flip);
        Tex.Apply(false);
    }
}
