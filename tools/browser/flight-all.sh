#!/bin/sh
# Every flight-sim check in one go (offline, headless Chromium through Playwright): prints each test's summary
# line and exits 1 if any failed. NODE_PATH must reach playwright (e.g. NODE_PATH=/opt/node22/lib/node_modules).
cd "$(dirname "$0")" || exit 1
fail=0
run() { name=$1; shift; out=$("$@" 2>&1); rc=$?; echo "$out" | grep -E "passed|^(OK|FAIL)|PAGEERROR" | sed "s/^/[$name] /"; [ $rc -ne 0 ] && { echo "[$name] exit $rc"; fail=1; }; }
run sys      node systest.js
run input    node inputtest.js
run ap       node aptest.js
run atc      node atctest.js
run traffic  node traftest.js
run weather  node wxtest.js
run failure  node failtest.js
run replay   node replaytest.js
run flight   env CASES=c172,b738 node e2etest.js
node flighttest.js 2>&1 | grep -E "touchdown|PAGEERROR" | sed "s/^/[landing] /"
exit $fail
