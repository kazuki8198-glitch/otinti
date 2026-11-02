// CadetWalker — a verbatim C# port of cadet/src/player/walker.js (Stage 9).
// First-person walking: a vertical cylinder (radius 0.28 m, 1.75 m tall, eyes
// at 1.65 m). State lives in world coordinates; collisions are solved in the
// runway frame. The camera application of the original's apply() is exposed
// as data (EyePos / Yaw / Pitch / Fov / BobK) for the Unity layer to consume.
using System;

namespace Cadet
{
    public interface IWalkerInput
    {
        (double X, double Y) TakeLook();
        bool Down(string code);
    }
    public interface IWalkerSettings
    {
        bool HeadBob { get; }
        double Fov { get; }
        double Sensitivity { get; }
        bool InvertY { get; }
    }
    public class WalkerSettings : IWalkerSettings
    {
        public bool HeadBob { get; set; } = false;
        public double Fov { get; set; } = 75;
        public double Sensitivity { get; set; } = 1;
        public bool InvertY { get; set; } = false;
    }
    class NullWalkerInput : IWalkerInput
    {
        public (double, double) TakeLook() { return (0, 0); }
        public bool Down(string code) { return false; }
    }

    public class WalkerState
    {
        public double X, Z, Y, Yaw, Pitch, Vx, Vz, Speed, Phase, Bob, BobK, LastStepPhase, Foot;
    }
    public class AutoInput { public double Forward, Strafe; public bool Run; }
    public class Leash { public double X, Z, R; }

    public class CadetWalker
    {
        public static readonly (double Radius, double Height, double Eye, double Step) BODY = (0.28, 1.75, 1.65, 0.35);

        readonly CollisionWorld world;
        readonly double G, cy, sy;
        readonly IWalkerInput input;
        readonly IWalkerSettings settings;
        readonly Func<double, double, string> surfaceAt;
        readonly Action<string, double, double> onStep;

        public readonly WalkerState St = new WalkerState();
        AutoInput auto;
        double fovNow;

        // camera outputs (apply())
        public double EyeX, EyeY, EyeZ, CamFov;
        public bool FovChanged;

        public CadetWalker(CollisionWorld world, double groundG, double frameYaw, IWalkerInput input = null, IWalkerSettings settings = null,
            Func<double, double, string> surfaceAt = null, Action<string, double, double> onStep = null, double initialFov = 75)
        {
            this.world = world; G = groundG;
            cy = Math.Cos(frameYaw); sy = Math.Sin(frameYaw);
            this.input = input ?? new NullWalkerInput();
            this.settings = settings ?? new WalkerSettings();
            this.surfaceAt = surfaceAt ?? ((x, z) => "concrete");
            this.onStep = onStep ?? ((s, v, f) => { });
            fovNow = initialFov; CamFov = initialFov;
        }

        public (double, double) ToFrame(double x, double z) { return (x * cy - z * sy, x * sy + z * cy); }
        public (double, double) ToWorld(double fx, double fz) { return (fx * cy + fz * sy, -fx * sy + fz * cy); }

        public void SetAuto(AutoInput a) { auto = a; }
        public (double X, double Z) Position { get { return (St.X, St.Z); } }
        public (double X, double Z, double A, double C, double Y) FramePos
        {
            get { var (fx, fz) = ToFrame(St.X, St.Z); return (fx, fz, -fz, fx, St.Y); }
        }

        public void SetPose(double x, double z, double yaw, double pitch = 0)
        {
            St.X = x; St.Z = z; St.Y = 0; St.Yaw = yaw; St.Pitch = pitch; St.Vx = St.Vz = 0; Apply(0);
        }
        public void LookAt(double x, double y, double z)
        {
            double dx = x - St.X, dz = z - St.Z, dy = y - (G + St.Y + BODY.Eye);
            St.Yaw = Math.Atan2(-dx, -dz); St.Pitch = Math.Atan2(dy, Math.Sqrt(dx * dx + dz * dz)); Apply(0);
        }

        void Apply(double dt)
        {
            bool bobOn = settings.HeadBob;
            St.BobK += ((bobOn ? 1 : 0) * Math.Min(1, St.Speed / 1.4) - St.BobK) * Math.Min(1, dt * 6);
            double bobY = (Math.Abs(Math.Sin(St.Phase * Math.PI * 2)) - 0.6) * 0.035 * St.BobK;
            double bobX = Math.Sin(St.Phase * Math.PI * 2) * 0.015 * St.BobK;
            EyeX = St.X + Math.Cos(St.Yaw) * bobX;
            EyeY = G + St.Y + BODY.Eye + bobY;
            EyeZ = St.Z - Math.Sin(St.Yaw) * bobX;
            double fov = settings.Fov;
            FovChanged = Math.Abs(fov - fovNow) > 0.01;
            if (FovChanged) { fovNow = fov; CamFov = fov; }
        }

        (double, double) Leashed(double sx, double sz, double cx, double cz, double lim)
        {
            double ox = St.X - cx, oz = St.Z - cz, nx = ox + sx, nz = oz + sz, d = Math.Sqrt(nx * nx + nz * nz);
            if (!(d > lim)) return (sx, sz);
            double ux = nx / d, uz = nz / d, vo = St.Vx * ux + St.Vz * uz;
            if (vo > 0) { St.Vx -= ux * vo; St.Vz -= uz * vo; }
            return (ux * lim - ox, uz * lim - oz);
        }

        public bool Update(double dt, (double X, double Y)? look = null, Leash leash = null, bool upDown = true, bool still = false)
        {
            var lk = look ?? input.TakeLook();
            double sens = 0.0022 * settings.Sensitivity;
            St.Yaw -= lk.X * sens; St.Pitch -= lk.Y * sens * (settings.InvertY ? -1 : 1);
            St.Pitch = Math.Max(-1.45, Math.Min(1.45, St.Pitch));
            double f = 0, s = 0; bool run = false;
            if (auto != null) { f = auto.Forward; s = auto.Strafe; run = auto.Run; }
            else if (!still)
            {
                if (input.Down("KeyW") || (upDown && input.Down("ArrowUp"))) f += 1;
                if (input.Down("KeyS") || (upDown && input.Down("ArrowDown"))) f -= 1;
                if (input.Down("KeyD") || input.Down("ArrowRight")) s += 1;
                if (input.Down("KeyA") || input.Down("ArrowLeft")) s -= 1;
                run = input.Down("ShiftLeft") || input.Down("ShiftRight");
            }
            double len = Math.Sqrt(f * f + s * s); if (len > 1) { f /= len; s /= len; }
            double top = (run ? 3.6 : 1.45) * (f < 0 ? 0.8 : 1);
            double fx = -Math.Sin(St.Yaw), fz = -Math.Cos(St.Yaw), rx = Math.Cos(St.Yaw), rz = -Math.Sin(St.Yaw);
            double wx = (fx * f + rx * s) * top, wz = (fz * f + rz * s) * top;
            double k = 1 - Math.Exp(-(len > 0 ? 9 : 12) * dt);
            St.Vx += (wx - St.Vx) * k; St.Vz += (wz - St.Vz) * k;
            var (px, pz) = ToFrame(St.X, St.Z);
            MoveResult Go(double sx, double sz)
            {
                var (dx, dz) = ToFrame(sx, sz);
                return world.Move(px, St.Y, pz, dx, dz, BODY.Radius, BODY.Height, BODY.Step);
            }
            MoveResult r;
            if (leash == null) r = Go(St.Vx * dt, St.Vz * dt);
            else
            {
                double lim = Math.Max(leash.R, Math.Sqrt((St.X - leash.X) * (St.X - leash.X) + (St.Z - leash.Z) * (St.Z - leash.Z)));
                double sx = St.Vx * dt, sz = St.Vz * dt;
                r = default;
                for (int tries = 1; ; tries++)
                {
                    (sx, sz) = Leashed(sx, sz, leash.X, leash.Z, lim);
                    r = Go(sx, sz);
                    var (ex, ez) = ToWorld(r.X, r.Z);
                    if (!(Math.Sqrt((ex - leash.X) * (ex - leash.X) + (ez - leash.Z) * (ez - leash.Z)) > lim + 1e-9)) break;
                    if (tries == 3) { r = new MoveResult { X = px, Z = pz, Blocked = true, HitNormal = null }; break; }
                    sx = ex - St.X; sz = ez - St.Z;
                }
            }
            var (nx, nz) = ToWorld(r.X, r.Z);
            double moved = Math.Sqrt((nx - St.X) * (nx - St.X) + (nz - St.Z) * (nz - St.Z));
            if (dt > 0)
            {
                double g = world.GroundAt(r.X, r.Z, St.Y, BODY.Radius, BODY.Step);
                if (g > St.Y) St.Y = g;
                else if (g < St.Y) St.Y = Math.Max(g, St.Y - dt * 4.5);
            }
            if (dt > 0)
            {
                if (r.Blocked && r.HitNormal != null)
                {
                    var (wnx, wnz) = ToWorld(r.HitNormal[0], r.HitNormal[1]);
                    double vn = St.Vx * wnx + St.Vz * wnz;
                    if (vn < 0) { St.Vx -= wnx * vn; St.Vz -= wnz * vn; }
                }
                double real = moved / dt, v = Math.Sqrt(St.Vx * St.Vx + St.Vz * St.Vz);
                if (real < v * 0.98) { double kk = real / (v == 0 ? 1 : v); St.Vx *= kk; St.Vz *= kk; }
            }
            St.X = nx; St.Z = nz;
            St.Speed = dt > 0 ? Math.Min(moved / dt, 3.8) : 0;
            double stride = St.Speed > 2.4 ? 1.05 : 0.72;
            St.Phase += moved / stride / 2;
            double steps = Math.Floor(St.Phase * 2);
            if (steps != St.LastStepPhase) { St.LastStepPhase = steps; if (St.Speed > 0.4) onStep(surfaceAt(St.X, St.Z), St.Speed > 2.4 ? 1 : 0.6, St.Foot = 1 - St.Foot); }
            Apply(dt);
            return len > 0;
        }
    }
}
