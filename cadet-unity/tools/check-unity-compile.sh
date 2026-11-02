#!/bin/bash
# Compile-check ALL C# sources (core + flight + slice + unity scene scripts)
# against the Unity editor's managed assemblies — no license needed (csc only).
# GLTFast is stubbed (its API surface used here is 3 calls).
set -e
U=~/workspace/tools/unity/Editor/6000.3.27f2/Editor/Data
W=~/workspace/cadet-unity
M=$U/Managed/UnityEngine
T=$U/Resources/PackageManager/ProjectTemplates/libcache/com.unity.template.3d-cross-platform-17.0.14/ScriptAssemblies
mkdir -p /tmp/unitycheck
cat > /tmp/unitycheck/GltfStub.cs <<'EOF'
namespace GLTFast
{
    public class GltfImport
    {
        public System.Threading.Tasks.Task<bool> Load(string path) => System.Threading.Tasks.Task.FromResult(false);
        public System.Threading.Tasks.Task<bool> InstantiateMainSceneAsync(UnityEngine.Transform parent) => System.Threading.Tasks.Task.FromResult(false);
    }
}
EOF
REFS=""
for f in $U/NetStandard/ref/2.1.0/*.dll; do REFS="$REFS -r:$f"; done
for f in $M/UnityEngine.*Module.dll $M/UnityEditor.*Module.dll; do REFS="$REFS -r:$f"; done
REFS="$REFS -r:$T/UnityEngine.UI.dll -r:$T/Unity.InputSystem.dll"
$U/NetCoreRuntime/dotnet $U/DotNetSdkRoslyn/csc.dll -target:library -out:/tmp/unitycheck/all.dll -nologo -nostdlib -langversion:latest $REFS \
  $W/core/src/*.cs $W/flight/src/*.cs $W/slice/src/CadetPhysics.cs $W/slice/src/Controls.cs $W/slice/src/SliceMain.cs \
  $W/unity/*.cs /tmp/unitycheck/GltfStub.cs 2>&1 | grep -E "error|warning CS" | head -60 || true
echo "COMPILE_CHECK_DONE"
