#!/bin/bash
# Renders and checks on the QA machine, so the Mac runs only the edits. One shared copy of this tree there, one dev
# server (no reload on change), many runs at once: each run copies only its own package folders.
#   .planning/tools/fleet-qa.sh sync                                   the whole tree; starts the dev server there
#   .planning/tools/fleet-qa.sh shots <folder…> -- [--views a,b] <model:CODE…>
#        e.g. shots liveries/RYR data/livery-refs/RYR -- b738:RYR b38m:RYR     → data/livery-refs/shots/<model>-<CODE>/
#   .planning/tools/fleet-qa.sh run <folder…> -- <command…>            copy the folders, run a command in the tree there
#        e.g. run liveries/RYR -- node --test client/livery/designs.test.ts
#   .planning/tools/fleet-qa.sh pull <folder…>                         copy folders back from there
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
H=${QA_HOST:-rgv250cc@rgv250cc-ubuntu-desktop}
D=${QA_DIR:-flightchaser-fleet-qa}
PORT=${QA_FE:-5196}
PRE="{ [ -s ~/.nvm/nvm.sh ] && . ~/.nvm/nvm.sh; }; cd ~/$D &&"
push() { for f in "$@"; do [ -e "$f" ] || continue; ssh "$H" "mkdir -p ~/$D/$(dirname "$f")"; rsync -a --delete --exclude shots "$f/" "${H}:${D}/$f/"; done; }
cmd=$1; shift || true
case "$cmd" in
  sync)
    rsync -a --delete --exclude node_modules --exclude .git --exclude dist --exclude data/recordings --exclude data/eumetsat --exclude data/livery-refs --exclude .env.local --exclude '*.log' "$ROOT/" "${H}:${D}/"
    ssh "$H" "$PRE { [ -e node_modules ] || { mkdir node_modules && ln -s ~/flighthopper-qa/node_modules/* ~/flighthopper-qa/node_modules/.bin node_modules/; }; }; curl -s -o /dev/null http://localhost:$PORT/ || { FH_HMR=0 nohup npx vite --port $PORT --strictPort > vite.log 2>&1 < /dev/null & sleep 4; }; echo synced; tail -2 vite.log" ;;
  shots)
    dirs=(); while [ $# -gt 0 ] && [ "$1" != -- ]; do dirs+=("$1"); shift; done; shift
    for f in "${dirs[@]}"; do [ -f "$f/design.ts" ] && node -e "import('./$f/design.ts')"; done # a design that does not load would break every other run's page
    push "${dirs[@]}"
    P=$((9400 + $$ % 3000))
    ssh "$H" "$PRE CHROME=\$(ls -d ~/.cache/fh-chrome/chrome/*/chrome-linux64/chrome | tail -1) node tools/livery-shots.ts --host http://localhost:$PORT --port $P --out data/livery-refs/shots $(printf ' %q' "$@")"
    mkdir -p data/livery-refs/shots
    for a in "$@"; do case "$a" in *:*) m=${a%%:*}; c=${a#*:}; n="$m-${c:-WHITE}"; rsync -a "${H}:${D}/data/livery-refs/shots/$n/" "data/livery-refs/shots/$n/";; esac; done ;;
  run)
    dirs=(); while [ $# -gt 0 ] && [ "$1" != -- ]; do dirs+=("$1"); shift; done; shift
    push "${dirs[@]}"
    ssh "$H" "$PRE $(printf ' %q' "$@")" ;;
  pull) for f in "$@"; do mkdir -p "$f"; rsync -a "${H}:${D}/$f/" "$f/"; done ;;
  *) sed -n 2,10p "$0" >&2; exit 2 ;;
esac
