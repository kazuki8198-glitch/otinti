#!/bin/bash
# SessionStart hook (Claude Code cloud sessions only): makes the FLIGHT LAB / CADET toolchain ready before the session
# starts, so builds, tests, screenshots and the Blender asset scripts work at once.
#   - npm dependencies of flight-lab/ and cadet/ (three.js, esbuild, the Anthropic SDK; pinned by their lockfiles)
#   - Blender 5.2.3 (the official Linux build, checked against its SHA-256), on PATH as `blender`, for
#     cadet/tools/**/build_*.py: blender -b --factory-startup -P <script> -- <args>
# Chromium and Playwright come with the cloud image (the shot scripts find them), nothing to do here.
# Idempotent: what is already there is kept (the container is cached after this hook).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

for pkg in flight-lab cadet; do
  if [ -f "$ROOT/$pkg/package.json" ]; then
    echo "npm install in $pkg/"
    (cd "$ROOT/$pkg" && npm install --no-audit --no-fund --loglevel=error)
  fi
done

BLENDER_VERSION=5.2.3
BLENDER_NAME="blender-${BLENDER_VERSION}-linux-x64"
BLENDER_SHA256=78486c018b4443efe5e75ab54c290ed8c15abafd249b862c2c9ce2530a918eec
BLENDER_URL="https://download.blender.org/release/Blender${BLENDER_VERSION%.*}/${BLENDER_NAME}.tar.xz"
OPT="${HOME}/.local/opt"
BLENDER_DIR="$OPT/$BLENDER_NAME"

if [ ! -x "$BLENDER_DIR/blender" ]; then
  echo "installing Blender ${BLENDER_VERSION}"
  mkdir -p "$OPT"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL --retry 4 --retry-delay 2 -o "$tmp/blender.tar.xz" "$BLENDER_URL"
  echo "${BLENDER_SHA256}  $tmp/blender.tar.xz" | sha256sum -c --quiet -
  tar -xJf "$tmp/blender.tar.xz" -C "$OPT"
  rm -rf "$tmp"
  trap - EXIT
fi

# on PATH: /usr/local/bin when it can be written (root in the cloud container), else ~/.local/bin for this session
if [ -w /usr/local/bin ]; then
  ln -sf "$BLENDER_DIR/blender" /usr/local/bin/blender
else
  mkdir -p "$HOME/.local/bin"
  ln -sf "$BLENDER_DIR/blender" "$HOME/.local/bin/blender"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export PATH=\"$HOME/.local/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
  fi
fi

"$BLENDER_DIR/blender" --version | head -1
