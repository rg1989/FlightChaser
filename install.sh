#!/usr/bin/env bash
# Installs Flight Chaser on macOS or Linux and starts it:
#
#   curl -fsSL https://raw.githubusercontent.com/rg1989/FlightChaser/main/install.sh | bash
#
# It needs curl and tar, and nothing else. Where Node 24.2 or newer is not installed, a private copy goes into the
# app's folder (from nodejs.org, checked against its published SHA-256). Nothing outside that folder is changed.
# Run again, it updates the app and keeps your settings (.env.local) and your data.
#
#   FLIGHT_CHASER_DIR=<folder>   where the app goes (default: ~/FlightChaser)
#   FLIGHT_CHASER_START=0        install only, do not start
#   FLIGHT_CHASER_SOURCE=<url or file>   another .tar.gz of the app (for testing the installer)
set -euo pipefail

REPO=rg1989/FlightChaser
DIR=${FLIGHT_CHASER_DIR:-$HOME/FlightChaser}
SOURCE=${FLIGHT_CHASER_SOURCE:-https://codeload.github.com/$REPO/tar.gz/refs/heads/main}

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nFlight Chaser: %s\n' "$*" >&2; exit 1; }
command -v curl >/dev/null || die "curl is needed"
command -v tar >/dev/null || die "tar is needed"

# Whether the Node at $1 runs the app (24.2 or newer).
node_ok() { "$1" -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 24 || (a === 24 && b >= 2) ? 0 : 1)' 2>/dev/null; }

mkdir -p "$DIR"
DIR=$(cd "$DIR" && pwd)

# 1. Node: the one installed, the private copy from an earlier run, or a new private copy.
if command -v node >/dev/null && node_ok node; then
  NODE_BIN=$(dirname "$(command -v node)")
elif [ -x "$DIR/.node/bin/node" ] && node_ok "$DIR/.node/bin/node"; then
  NODE_BIN=$DIR/.node/bin
else
  case "$(uname -s)" in
    Darwin) os=darwin ;;
    Linux) os=linux ;;
    *) die "this installer is for macOS and Linux (on Windows: install.ps1)" ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) arch=x64 ;;
    arm64 | aarch64) arch=arm64 ;;
    *) die "nodejs.org has no build for $(uname -m): install Node 24.2 or newer, then run this again" ;;
  esac
  say "Node 24.2 or newer is not installed: fetching a private copy into $DIR/.node"
  base=https://nodejs.org/dist/latest-v24.x
  sums=$(curl -fsSL "$base/SHASUMS256.txt")
  file=$(printf '%s\n' "$sums" | awk -v end="-$os-$arch.tar.gz" 'substr($2, length($2) - length(end) + 1) == end { print $2; exit }')
  [ -n "$file" ] || die "nodejs.org lists no build for $os-$arch"
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  curl -fL --progress-bar -o "$tmp/$file" "$base/$file"
  want=$(printf '%s\n' "$sums" | awk -v f="$file" '$2 == f { print $1 }')
  if command -v sha256sum >/dev/null; then got=$(sha256sum "$tmp/$file" | cut -d' ' -f1); else got=$(shasum -a 256 "$tmp/$file" | cut -d' ' -f1); fi
  [ "$want" = "$got" ] || die "the Node download does not match its published checksum"
  rm -rf "$DIR/.node"
  mkdir -p "$DIR/.node"
  tar -xzf "$tmp/$file" -C "$DIR/.node" --strip-components=1
  rm -rf "$tmp"
  trap - EXIT
  NODE_BIN=$DIR/.node/bin
fi
export PATH="$NODE_BIN:$PATH"

# 2. The app: a git checkout is pulled; otherwise the newest files are unpacked over the folder.
# ponytail: a file the app no longer has stays behind after an update; harmless so far. Upgrade: unpack beside, then swap.
if [ -d "$DIR/.git" ]; then
  say "Updating the checkout in $DIR"
  git -C "$DIR" pull --ff-only
else
  say "Fetching Flight Chaser into $DIR"
  if [ -f "$SOURCE" ]; then
    tar -xzf "$SOURCE" -C "$DIR" --strip-components=1
  else
    curl -fsSL "$SOURCE" | tar -xz -C "$DIR" --strip-components=1
  fi
fi
cd "$DIR"

say "Installing its dependencies"
npm ci --no-audit --no-fund

# 3. The launcher: starts the app with the Node chosen above.
cat > flight-chaser <<'EOF'
#!/bin/sh
# Starts Flight Chaser (written by install.sh). Options: --port <n>, --no-open.
cd "$(dirname "$0")" || exit 1
[ -x .node/bin/node ] && PATH="$PWD/.node/bin:$PATH"
exec node tools/start.ts "$@"
EOF
chmod +x flight-chaser

say "Flight Chaser is installed in $DIR"
echo "    Start it:   $DIR/flight-chaser"
echo "    Update it:  run the install command again"
if [ "${FLIGHT_CHASER_START:-1}" != 0 ]; then exec ./flight-chaser; fi
