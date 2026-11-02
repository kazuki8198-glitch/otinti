#!/bin/bash
# Stage 19+ Windows build, end to end (see STAGE19-REPORT.md):
#   1. sync sources into the project
#   2. regenerate the Game scene from code (GameSceneSetup.BuildGameScene)
#      — a saved scene can silently accumulate acceptance-driver objects;
#      Stage 17's shipped build contained a live GameDriver "GameTest".
#   3. evacuate the editor-only sources (*Acceptance.cs, GameSceneSetup.cs)
#      — a cold player compile fails on their UnityEditor.SceneManagement
#      references (CS0234); Stage 12 documented this evacuation, Stage 17
#      passed only on the cached player assembly.
#   4. build via the Assets/Editor bootstrap (Stage19Build.BuildOnly),
#      which re-checks the scene for *Driver components before building.
#   5. restore the evacuated sources (always, even on build failure).
# Usage: bash tools/build-windows.sh [log-prefix]   (default: stage)
set -u
W=~/workspace/cadet-unity
P=/opt/cadet/CadetSlice
U=~/workspace/tools/unity/Editor/6000.3.27f2/Editor/Unity
PREFIX=${1:-stage}
REAL_HOME=$HOME
export DISPLAY=:99

# sync-unity.sh resolves ~/workspace from HOME: run it with the real HOME.
# Only the Unity editor gets the licence HOME (/tmp/unityhome3).
HOME=$REAL_HOME bash "$W/tools/sync-unity.sh" || exit 1
HOME=/tmp/unityhome3 "$U" -batchmode -projectPath "$P" -executeMethod GameSceneSetup.BuildGameScene \
    -logFile "$W/${PREFIX}-buildscene.log" || { echo "SCENE BUILD FAILED"; exit 1; }
grep -q "GAME_SCENE_BUILT" "$W/${PREFIX}-buildscene.log" || { echo "SCENE BUILD FAILED (no GAME_SCENE_BUILT)"; exit 1; }

STASH=$(mktemp -d)
restore() {
  for f in "$STASH"/*.cs; do [ -e "$f" ] && mv "$f" "$P/Assets/Scripts/"; done
  rmdir "$STASH" 2>/dev/null || true
}
trap restore EXIT
for f in "$P"/Assets/Scripts/*Acceptance.cs "$P"/Assets/Scripts/GameSceneSetup.cs; do
  mv "$f" "$STASH/"
done

HOME=/tmp/unityhome3 "$U" -batchmode -projectPath "$P" -executeMethod Stage19Build.BuildOnly \
    -logFile "$W/${PREFIX}-buildwindows.log"
rc=$?
grep "BUILD_RESULT" "$W/${PREFIX}-buildwindows.log" || true
exit $rc
