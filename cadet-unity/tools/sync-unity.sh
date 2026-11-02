#!/bin/bash
# Sync the C# sources (~/workspace/cadet-unity) into the Unity project (/opt).
set -e
W=~/workspace/cadet-unity; P=/opt/cadet/CadetSlice/Assets/Scripts
cp $W/core/src/*.cs $P/Core/
cp $W/flight/src/*.cs $P/Flight/
cp $W/slice/src/CadetPhysics.cs $W/slice/src/Controls.cs $P/
cp $W/unity/*.cs $P/ 2>/dev/null || true
for f in $W/unity/*.shader; do cp "$f" /opt/cadet/CadetSlice/Assets/Shaders/ 2>/dev/null || true; done
cp $W/data/*.json /opt/cadet/CadetSlice/Assets/StreamingAssets/cadet-data/ 2>/dev/null || true
echo "synced"
