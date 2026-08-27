#!/bin/sh
set -eu
REPO="$(cd "$(dirname "$0")/.." && pwd)"
set -a
# shellcheck disable=SC1091
. "$REPO/hindsight/env.local"
set +a
exec "$HOME/.local/bin/hindsight-api"
