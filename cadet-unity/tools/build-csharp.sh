#!/bin/bash
# Builds the Unity-independent C# core + a test harness with Unity's bundled
# Roslyn, and runs the harness under Unity's bundled mono.
# usage: build-csharp.sh <Harness.cs> <out-name> [-- harness args...]
set -e
U=~/workspace/tools/unity/Editor/6000.3.27f2/Editor/Data
W=~/workspace/cadet-unity
REFS=$(for f in $U/NetStandard/ref/2.1.0/*.dll; do printf -- "-r:%s " "$f"; done)
HARNESS=$1; OUT=$2; shift 2
if [ "$1" = "--" ]; then shift; fi
$U/NetCoreRuntime/dotnet $U/DotNetSdkRoslyn/csc.dll -target:exe -out:/tmp/$OUT.exe -nologo -nostdlib -langversion:latest $REFS \
  $W/core/src/*.cs $W/flight/src/*.cs $W/slice/src/CadetPhysics.cs $W/slice/src/Controls.cs "$HARNESS"
$U/MonoBleedingEdge/bin-linux64/mono /tmp/$OUT.exe "$@"
