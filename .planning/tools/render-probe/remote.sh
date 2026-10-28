#!/bin/bash
# On the Ubuntu desktop, in ~/flighthopper-lod-qa: vite + (per run) a replay API + one headless Chrome; each line of RUNS is
# "<name>|<mode>|<query>|<preset JS>" ; EXPS/FLY_S/SETTLE/PREFS pass through. Everything started is killed at exit.
# Setup (from the Mac): rsync the tree to ~/flighthopper-lod-qa there (exclude node_modules .git .work data/recordings
# data/livery-refs tv third_party .env.local .planning) and this folder to ~/lod-run. Results land in ~/flighthopper-lod-qa/out.
# e.g. EXPS='[["base",""],["fog2","(viewer.scene.fog.screenSpaceErrorFactor=2,1)"]]' RUNS="fuji|static|scenario=jal123&t=66973&cam=0,-6,400&governor=0|" bash ~/lod-run/remote.sh
# .planning/reports/render-lod/README.md says what the numbers mean.
[ -s ~/.nvm/nvm.sh ] && . ~/.nvm/nvm.sh
cd ~/flighthopper-lod-qa || exit 1
[ -e node_modules ] || { mkdir node_modules && ln -s ~/flighthopper-qa/node_modules/* ~/flighthopper-qa/node_modules/.bin node_modules/; }
mkdir -p data/recordings out
for f in egll-arrivals-2026-09-28.jsonl 2026-09-23.jsonl; do [ -e data/recordings/$f ] || ln -s ~/flighthopper-qa/data/recordings/$f data/recordings/; done
[ -e .env.local ] || ln -s ~/flighthopper-qa/.env.local .env.local
CHROME=$(ls -d ~/.cache/fh-chrome/chrome/*/chrome-linux64/chrome 2>/dev/null | tail -1)
API_P=8801 FE_P=5201 CDP_P=9391
PROF=/tmp/chrome-prof-lod-$FE_P
API_PORT=$API_P npx vite --port $FE_P --strictPort > vite.log 2>&1 &
VITE=$!
API= CHR=
trap 'kill $CHR $API $VITE 2>/dev/null; pkill -f "$PROF" 2>/dev/null; pkill -f "vite --port $FE_P" 2>/dev/null; pkill -f "PORT=$API_P" 2>/dev/null' EXIT
sleep 5
while IFS= read -r line; do
  [ -z "$line" ] && continue
  IFS='|' read -r name mode query preset <<< "$line"
  ADSB_SOURCE=replay REPLAY_FILES="${REPLAY:-data/recordings/egll-arrivals-2026-09-28.jsonl}" PORT=$API_P RECORD_DIR= node --env-file-if-exists=.env.local server/main.ts < /dev/null > api-$name.log 2>&1 &
  API=$!
  rm -rf $PROF
  "$CHROME" --headless=new --no-sandbox --hide-scrollbars --ignore-gpu-blocklist --use-gl=angle --use-angle=vulkan --enable-features=Vulkan \
    --password-store=basic --no-proxy-server --remote-debugging-port=$CDP_P --user-data-dir=$PROF --window-size=1470,833 about:blank < /dev/null > chrome-$name.log 2>&1 &
  CHR=$!
  sleep 3
  echo "=== $name ($mode) $query"
  node ~/lod-run/run.mjs $CDP_P "http://localhost:$FE_P/?$query&setup=0" out/$name $mode "$preset" < /dev/null 2>&1 | tail -40
  kill $CHR $API 2>/dev/null; pkill -f "$PROF" 2>/dev/null; wait $CHR $API 2>/dev/null
done <<< "$RUNS"
