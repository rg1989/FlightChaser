#!/bin/bash
# One QA run on this Mac, for when neither QA machine answers (qa-omarchy.sh is the usual way). Light: a replay API, a dev client
# and a headless Chrome with its frame cap on, all at low priority, all stopped when the run ends. It works on a copy of the tree
# with its own node_modules folder of links, so the Vite cache of the user's own `make` is not rebuilt under it.
#   .planning/tools/qa-mac.sh "<step>" …      the steps are cdp-driver.mjs's; @@ in a step is http://localhost:$QA_FE
#   e.g.  qa-mac.sh "size 1440 900 1" "go @@/?hex=400960&chase=1&wx=1&wxdemo=30&setup=0" "until !!window.weather3d && weather3d.known" \
#           "wait 12" "evalfile .planning/tools/wx-menu-sweep.js" "shot /tmp/x.png" "log"
# The Chrome profile is new each run: nothing is saved from the last (put choices in the query: wx=1, wxlook=…, sun=…).
# REPLAY=<file under data/recordings> (default the Heathrow arrivals; 400960 is level at 6,000 ft in its first minute).
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
T=${QA_TMP:-${TMPDIR:-/tmp}/fhqa-mac}
API=${QA_API:-8798} FE=${QA_FE:-5198} CDP=${QA_CDP:-9377}
mkdir -p "$T/tree"
rsync -a --delete --exclude node_modules --exclude .git --exclude dist --exclude data --exclude .env.local --exclude .claude --exclude .superpowers --exclude .work --exclude third_party --exclude tv "$ROOT/" "$T/tree/"
mkdir -p "$T/tree/data/recordings" "$T/tree/node_modules"
[ -e "$T/tree/node_modules/vite" ] || ln -s "$ROOT"/node_modules/* "$ROOT"/node_modules/.bin "$T/tree/node_modules/" 2>/dev/null
[ -e "$T/tree/data/fixtures" ] || ln -s "$ROOT/data/fixtures" "$T/tree/data/fixtures"
ln -sf "$ROOT/data/recordings/${REPLAY:-egll-arrivals-2026-09-28.jsonl}" "$T/tree/data/recordings/replay.jsonl"
[ -e "$T/tree/.env.local" ] || { [ -e "$ROOT/.env.local" ] && ln -s "$ROOT/.env.local" "$T/tree/.env.local"; }
cd "$T/tree"
PROF=$T/chrome-prof; rm -rf "$PROF"
ADSB_SOURCE=replay REPLAY_FILES=data/recordings/replay.jsonl PORT=$API RECORD_DIR= FLIGHTS_DIR= EVENTS_DIR= nice -n 10 node --env-file-if-exists=.env.local server/main.ts > "$T/api.log" 2>&1 &
A=$!
API_PORT=$API nice -n 10 npx vite --port $FE --strictPort > "$T/vite.log" 2>&1 &
V=$!
nice -n 10 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --no-first-run --remote-debugging-port=$CDP --user-data-dir="$PROF" --window-size=1440,900 about:blank > "$T/chrome.log" 2>&1 &
C=$!
trap 'kill $C $V $A 2>/dev/null; pkill -f "$PROF" 2>/dev/null; pkill -f "vite --port $FE" 2>/dev/null' EXIT
for i in $(seq 60); do curl -s -o /dev/null "http://localhost:$FE/" && break; sleep 0.5; done
STEPS=()
for s in "$@"; do s=${s//@@/http://localhost:$FE}; STEPS+=("${s//evalfile .planning/evalfile $ROOT/.planning}"); done
node "$ROOT/.planning/tools/cdp-driver.mjs" $CDP "${STEPS[@]}"
