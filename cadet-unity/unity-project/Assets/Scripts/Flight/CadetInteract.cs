// CadetInteract — a verbatim C# port of cadet/src/player/interact.js (Stage 9).
// What the player is looking at, and E (or a click) to use it. Targets are
// spheres in the runway frame; the nearest the view ray passes through wins;
// one with a wall between the eyes and it gives way to the next.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public class InteractTarget
    {
        public string Id;
        public double[] Frame;          // [x, y, z] in the runway frame
        public double Radius;
        public Func<string> PromptFn;   // prompt() in the original
        public string PromptText;       // or a plain string prompt
        public Func<InteractTarget, string> Use;
        public bool? Enabled;
        public double? Reach;
        public double? Priority;
        public string Owner;
        public bool Low, OnOwner;
        public string Prompt { get { return PromptFn != null ? PromptFn() : PromptText; } }
    }

    public class CadetInteract
    {
        public const double REACH = 2.6;

        readonly CadetWalker walker;
        readonly CollisionWorld world;
        readonly double G, cy, sy;
        readonly Dictionary<string, InteractTarget> targets = new Dictionary<string, InteractTarget>();
        readonly List<InteractTarget> targetList = new List<InteractTarget>();

        public InteractTarget Current { get; private set; }
        (double X, double Z)? card;
        public bool CardOpen { get { return card.HasValue; } }
        public Action<string> OnPrompt;                    // hud.prompt
        public Action<string, string, object> OnCard;      // hud.card (title, text, choices) / null to close

        public CadetInteract(CadetWalker walker, CollisionWorld world, double groundG, double frameYaw)
        {
            this.walker = walker; this.world = world; G = groundG;
            cy = Math.Cos(frameYaw); sy = Math.Sin(frameYaw);
        }

        public InteractTarget Add(InteractTarget t) { targets[t.Id] = t; targetList.Add(t); return t; }
        public void Remove(string id) { if (targets.TryGetValue(id, out var t)) { targets.Remove(id); targetList.Remove(t); } }
        public List<InteractTarget> List() { return new List<InteractTarget>(targetList); }

        // the view ray in the frame, from the walker's eye + yaw/pitch
        (double Ox, double Oy, double Oz, double Dx, double Dy, double Dz) ViewRay()
        {
            double yaw = walker.St.Yaw, pitch = walker.St.Pitch;
            double fx = -Math.Cos(pitch) * Math.Sin(yaw), fy = Math.Sin(pitch), fz = -Math.Cos(pitch) * Math.Cos(yaw);
            double px = walker.EyeX, py = walker.EyeY, pz = walker.EyeZ;
            double ox = px * cy - pz * sy, oz = px * sy + pz * cy, oy = py - G;
            double dx = fx * cy - fz * sy, dz = fx * sy + fz * cy;
            double n = Math.Sqrt(dx * dx + fy * fy + dz * dz); if (n == 0) n = 1;
            return (ox, oy, oz, dx / n, fy / n, dz / n);
        }

        public InteractTarget Update()
        {
            var r = ViewRay();
            var cands = new List<(InteractTarget T, double Score)>();
            foreach (var t in targetList)
            {
                if (t.Enabled == false) continue;
                double tx = t.Frame[0], ty = t.Frame[1], tz = t.Frame[2];
                double vx = tx - r.Ox, vy = ty - r.Oy, vz = tz - r.Oz;
                double along = vx * r.Dx + vy * r.Dy + vz * r.Dz;
                if (along < 0.15 || along > (t.Reach ?? REACH) + t.Radius) continue;
                double px = vx - r.Dx * along, py = vy - r.Dy * along, pz = vz - r.Dz * along;
                double off = Math.Sqrt(px * px + py * py + pz * pz);
                if (off > t.Radius) continue;
                cands.Add((t, along + off * 1.5 - (t.Priority ?? 0) * 10));
            }
            cands.Sort((a, b) => a.Score.CompareTo(b.Score));
            InteractTarget best = null;
            foreach (var (t, _) in cands)
            {
                double tx = t.Frame[0], ty = t.Frame[1], tz = t.Frame[2];
                double d = Math.Sqrt((tx - r.Ox) * (tx - r.Ox) + (ty - r.Oy) * (ty - r.Oy) + (tz - r.Oz) * (tz - r.Oz));
                double ux = (tx - r.Ox) / d, uy = (ty - r.Oy) / d, uz = (tz - r.Oz) / d;
                var hit = world.Raycast(r.Ox, r.Oy, r.Oz, ux, uy, uz, d);
                bool own = hit != null && hit.Box != null && hit.Box.Tag != null && (hit.Box.Tag == t.Id
                    || (hit.Box.Tag == t.Owner && (t.Low || t.OnOwner || d - hit.Dist < t.Radius + 0.6)));
                if (hit != null && hit.Dist < d - t.Radius * 0.8 && !own) continue;
                best = t; break;
            }
            Current = best;
            OnPrompt?.Invoke(Current != null && !CardOpen ? Current.Prompt : null);
            if (card.HasValue && Math.Sqrt(Math.Pow(walker.St.X - card.Value.X, 2) + Math.Pow(walker.St.Z - card.Value.Z, 2)) > 2.0) CloseCard();
            return Current;
        }

        public string Use()
        {
            if (CardOpen) { CloseCard(); return "closed"; }
            if (Current == null) return null;
            return Current.Use != null ? Current.Use(Current) : null;
        }
        public void ShowCard(string title, string text, object choices = null)
        {
            card = (walker.St.X, walker.St.Z);
            OnPrompt?.Invoke(null);
            OnCard?.Invoke(title, text, choices);
        }
        public void CloseCard()
        {
            if (!card.HasValue) return;
            card = null;
            OnCard?.Invoke(null, null, null);
        }
    }
}
