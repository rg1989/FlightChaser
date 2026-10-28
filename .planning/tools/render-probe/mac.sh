#!/bin/bash
# One measuring run on this Mac (M2): replay API + dev client + one headless Chrome (frame cap on), all nice'd, all stopped at exit.
# RUNS lines: "<name>|static or fly|<query>|<width>|<height>|<EXPS JSON>". Only while the Mac is idle (its graphics chip is shared).
# e.g. RUNS="fuji|static|scenario=jal123&t=66973&cam=0,-6,400&governor=0|2560|1440|[[\"base\",\"\"]]" .planning/tools/render-probe/mac.sh
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
S=$(cd "$(dirname "$0")" && pwd)
T=${QA_TMP:-${TMPDIR:-/tmp}/fh-render-probe}
mkdir -p "$T/tree" "$T/out"
rsync -a --delete --exclude node_modules --exclude .git --exclude dist --exclude data --exclude .env.local --exclude .claude --exclude .superpowers --exclude .work --exclude third_party --exclude tv --exclude .planning "$ROOT/" "$T/tree/"
mkdir -p "$T/tree/data/recordings" "$T/tree/node_modules"
[ -e "$T/tree/node_modules/vite" ] || ln -s "$ROOT"/node_modules/* "$ROOT"/node_modules/.bin "$T/tree/node_modules/" 2>/dev/null
[ -e "$T/tree/data/fixtures" ] || ln -s "$ROOT/data/fixtures" "$T/tree/data/fixtures"
ln -sf "$ROOT/data/recordings/egll-arrivals-2026-09-28.jsonl" "$T/tree/data/recordings/replay.jsonl"
[ -e "$T/tree/.env.local" ] || { [ -e "$ROOT/.env.local" ] && ln -s "$ROOT/.env.local" "$T/tree/.env.local"; }
cd "$T/tree"
API=8798 FE=5198 CDP=9377
PROF=$T/chrome-prof
API_PORT=$API nice -n 10 npx vite --port $FE --strictPort > "$T/vite.log" 2>&1 &
V=$!
A= C=
trap 'kill $C $A $V 2>/dev/null; pkill -f "$PROF" 2>/dev/null; pkill -f "vite --port $FE" 2>/dev/null' EXIT
for i in $(seq 60); do curl -s -o /dev/null "http://localhost:$FE/" && break; sleep 0.5; done
while IFS= read -r line; do
  [ -z "$line" ] && continue
  IFS='|' read -r name mode query w h exps <<< "$line"
  ADSB_SOURCE=replay REPLAY_FILES=data/recordings/replay.jsonl PORT=$API RECORD_DIR= FLIGHTS_DIR= EVENTS_DIR= nice -n 10 node --env-file-if-exists=.env.local server/main.ts < /dev/null > "$T/api-$name.log" 2>&1 &
  A=$!
  rm -rf "$PROF"
  nice -n 10 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --no-first-run --remote-debugging-port=$CDP --user-data-dir="$PROF" --window-size=$w,$h about:blank < /dev/null > "$T/chrome-$name.log" 2>&1 &
  C=$!
  echo "=== $name $w×$h $query"
  XM=$EXP_MAX; [ "$name" = fuji ] && XM=40
  W=$w H=$h EXPS="$exps" EXP_MAX=$XM node "$S/run.mjs" $CDP "http://localhost:$FE/?$query&setup=0" "$T/out/$name" $mode < /dev/null 2>&1 | tee "$T/out/$name.log" | grep -E "^(NO VIEWER|EXC|settled)" 
  node -e 'for (const d of require(process.argv[1])) console.log((d.name ?? "").padEnd(9), "gpu", String(d.gpuMs).padEnd(6), "p95", String(d.gpuP95).padEnd(6), "cpu", String(d.cpuMs).padEnd(5), "draws", String(d.total?.draws).padEnd(4), "ktris", String(d.total?.ktris).padEnd(7), "tiles", d.globe?.tiles, d.net ? `gaps>50ms ${d.net.over50} long ${d.net.longTasks}/${d.net.longMax}ms` : "", d.timedOut ? "TIMED OUT" : "")' "$T/out/$name.json" 2>&1
  kill $C $A 2>/dev/null; pkill -f "$PROF" 2>/dev/null; wait $C $A 2>/dev/null
done <<< "$RUNS"
