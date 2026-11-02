// DevicesMain — flight-control devices via the Unity Input System
// (Stage 11): enumeration of gamepads / joysticks (yokes appear as HID
// joysticks), a persistent assignment of device controls to the flight
// axes, and a Poll() that produces the axis set a flight loop consumes.
// Assignments save to persistentDataPath/cadet-devices.json.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.InputSystem;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public class DeviceAssignment
{
    public string DeviceName = "", DeviceLayout = "";
    // function → control path on the device (e.g. "leftStick/y")
    public Dictionary<string, string> Axes = new Dictionary<string, string>();
    public Dictionary<string, string> Buttons = new Dictionary<string, string>();
    public Dict ToJson()
    {
        var ax = new Dict(); foreach (var kv in Axes) ax[kv.Key] = kv.Value;
        var bt = new Dict(); foreach (var kv in Buttons) bt[kv.Key] = kv.Value;
        return new Dict { { "device", DeviceName }, { "layout", DeviceLayout }, { "axes", ax }, { "buttons", bt } };
    }
    public static DeviceAssignment FromJson(Dict d)
    {
        var a = new DeviceAssignment { DeviceName = MiniJson.Str(d, "device", ""), DeviceLayout = MiniJson.Str(d, "layout", "") };
        if (MiniJson.Obj(d["axes"]) is Dict ax) foreach (var kv in ax) a.Axes[kv.Key] = kv.Value as string;
        if (d.TryGetValue("buttons", out var bv) && MiniJson.Obj(bv) is Dict bt) foreach (var kv in bt) a.Buttons[kv.Key] = kv.Value as string;
        return a;
    }
    /// <summary>Defaults for a newly seen device, by its layout.</summary>
    public static DeviceAssignment DefaultsFor(InputDevice dev)
    {
        var a = new DeviceAssignment { DeviceName = dev.name, DeviceLayout = dev.layout };
        if (dev is Gamepad)
        {
            a.Axes["pitch"] = "leftStick/y"; a.Axes["roll"] = "leftStick/x";
            a.Axes["yaw"] = "rightStick/x"; a.Axes["throttle"] = "rightTrigger";
            a.Buttons["brake"] = "buttonSouth"; a.Buttons["gear"] = "buttonEast"; a.Buttons["flapUp"] = "leftShoulder"; a.Buttons["flapDown"] = "rightShoulder";
        }
        else if (dev is Joystick)
        {
            a.Axes["pitch"] = "stick/y"; a.Axes["roll"] = "stick/x";
            a.Axes["throttle"] = "rz"; a.Axes["yaw"] = "z";
            a.Buttons["brake"] = "trigger";
        }
        return a;
    }
}
public struct DeviceAxes
{
    public double Pitch, Roll, Yaw, Throttle01;
    public bool Brake, Gear, FlapUp, FlapDown;
}

public class DevicesMain : MonoBehaviour
{
    public List<DeviceAssignment> Assignments = new List<DeviceAssignment>();
    /// <summary>True when the last Poll matched at least one connected device
    /// (or a synthetic set was injected). Gates absolute-throttle takeover.</summary>
    public bool AnyLive;
    /// <summary>Test hook: when set, Poll returns this set (the VM has no
    /// physical devices; the acceptance drives the flight loop through it).</summary>
    public DeviceAxes? Synthetic;
    public string SavePath { get { return Path.Combine(Application.persistentDataPath, "cadet-devices.json"); } }

    public static List<(string Name, string Layout, string Path)> Enumerate()
    {
        var list = new List<(string, string, string)>();
        foreach (var d in InputSystem.devices) list.Add((d.name, d.layout, d.path));
        return list;
    }
    /// <summary>Adopt a device: keep its saved assignment or create defaults.</summary>
    public DeviceAssignment Adopt(InputDevice dev)
    {
        var found = Assignments.Find(a => a.DeviceName == dev.name);
        if (found != null) return found;
        var a = DeviceAssignment.DefaultsFor(dev);
        Assignments.Add(a);
        return a;
    }
    public void Save()
    {
        var arr = new Lst(); foreach (var a in Assignments) arr.Add(a.ToJson());
        File.WriteAllText(SavePath, MiniJson.Stringify(new Dict { { "assignments", arr } }));
    }
    public bool Load()
    {
        if (!File.Exists(SavePath)) return false;
        var root = (Dict)MiniJson.Parse(File.ReadAllText(SavePath));
        Assignments.Clear();
        if (root.TryGetValue("assignments", out var av) && av is Lst arr) foreach (var o in arr) Assignments.Add(DeviceAssignment.FromJson((Dict)o));
        return true;
    }
    static float ReadAxis(InputDevice dev, string path)
    {
        if (dev == null || string.IsNullOrEmpty(path)) return 0;
        var c = dev.TryGetChildControl(path) as InputControl<float>;
        return c != null ? c.ReadValue() : 0;
    }
    static bool ReadButton(InputDevice dev, string path)
    {
        if (dev == null || string.IsNullOrEmpty(path)) return false;
        var c = dev.TryGetChildControl(path) as InputControl<float>;
        return c != null && c.ReadValue() > 0.5f;
    }
    /// <summary>The merged axis set from all adopted devices (first non-zero wins per axis).</summary>
    public DeviceAxes Poll()
    {
        if (Synthetic.HasValue) { AnyLive = true; return Synthetic.Value; }
        var outp = new DeviceAxes();
        AnyLive = false;
        foreach (var a in Assignments)
        {
            InputDevice dev = null;
            foreach (var d in InputSystem.devices) if (d.name == a.DeviceName) { dev = d; break; }
            if (dev == null) continue;
            AnyLive = true;
            string P(string k) { return a.Axes.TryGetValue(k, out var v) ? v : null; }
            string B(string k) { return a.Buttons.TryGetValue(k, out var v) ? v : null; }
            if (outp.Pitch == 0) outp.Pitch = -ReadAxis(dev, P("pitch"));
            if (outp.Roll == 0) outp.Roll = ReadAxis(dev, P("roll"));
            if (outp.Yaw == 0) outp.Yaw = ReadAxis(dev, P("yaw"));
            if (outp.Throttle01 == 0) { float t = ReadAxis(dev, P("throttle")); outp.Throttle01 = Mathf.Clamp01(t); }
            outp.Brake |= ReadButton(dev, B("brake")); outp.Gear |= ReadButton(dev, B("gear"));
            outp.FlapUp |= ReadButton(dev, B("flapUp")); outp.FlapDown |= ReadButton(dev, B("flapDown"));
        }
        return outp;
    }
}

/// <summary>Stage 13 (Task 3): merge a polled device axis set into the flight
/// state AFTER Controls.Update and BEFORE Sim.Step — the device path the
/// Stage 11 enumeration/assignment work was always aimed at. Pitch/roll/yaw
/// add onto the keyboard state (same 1.3 curve as controls.js), throttle is
/// absolute when a device is live, brake is momentary, gear/flaps are
/// rising-edge actions through Controls.Action.</summary>
public static class DeviceMerge
{
    public struct Edge { public bool Gear, FlapUp, FlapDown; }
    static double Curve(double v) { return Math.Sign(v) * Math.Pow(Math.Abs(v), 1.3); }
    public static void Apply(Controls ctl, State s, DeviceAxes ax, bool anyLive, ref Edge prev, bool free)
    {
        if (s == null) return;
        const double DZ = 0.04;
        if (Math.Abs(ax.Pitch) > DZ) s.PIn = Curve(PhysMath.Clamp(s.PKey + ax.Pitch, -1, 1));
        if (Math.Abs(ax.Roll) > DZ) s.RIn = Curve(PhysMath.Clamp(s.RKey + ax.Roll, -1, 1));
        if (Math.Abs(ax.Yaw) > DZ) s.Rud = PhysMath.Clamp(s.Rud + ax.Yaw, -1, 1);
        if (anyLive) s.Thr = PhysMath.Clamp(ax.Throttle01, 0, 1);
        if (ax.Brake) s.Brake = 1;
        if (ctl != null)
        {
            if (ax.Gear && !prev.Gear) ctl.Action(s, "gear", null, free);
            if (ax.FlapDown && !prev.FlapDown) ctl.Action(s, "flaps", null, free);
            if (ax.FlapUp && !prev.FlapUp) ctl.Action(s, "flapsUp", null, free);
        }
        prev.Gear = ax.Gear; prev.FlapUp = ax.FlapUp; prev.FlapDown = ax.FlapDown;
    }
}
