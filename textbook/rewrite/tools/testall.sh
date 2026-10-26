#!/usr/bin/env bash
# textbook/rewrite/tools/testall.sh [SNAPDIR]
# Runs the three test suites — FLIGHT LAB (npm test, with its build), TEXTBOOK (npm test) and CADET (npm test, with its
# build) — on a COPY of the working tree (so editing can go on while they run, and what passed is exactly what gets
# committed: compare with `diff -r` or commit right after). cadet/node_modules is linked, not copied (npm ci first).
# Prints one line per suite (pass/fail counts) and exits non-zero if any suite fails. Logs: SNAPDIR/{fl,tb,cadet}.log
set -u
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
SNAP=${1:-${TMPDIR:-/tmp}/textbook-testall}
rm -rf "$SNAP"; mkdir -p "$SNAP"
tar -C "$ROOT" --exclude=./.git --exclude=node_modules --exclude=test-output -cf - . | tar -C "$SNAP" -xf -
ln -s "$ROOT/cadet/node_modules" "$SNAP/cadet/node_modules"
rc=0
for s in fl:flight-lab tb:textbook cadet:cadet; do
  name=${s%%:*}; dir=${s#*:}
  (cd "$SNAP/$dir" && npm test) > "$SNAP/$name.log" 2>&1; r=$?
  echo "$dir: exit $r — $(grep -E '^# (pass|fail) ' "$SNAP/$name.log" | tr '\n' ' ')"
  [ $r -ne 0 ] && rc=1
done
exit $rc
