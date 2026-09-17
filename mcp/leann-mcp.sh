#!/bin/sh
# `leann_mcp` shells out to a bare `leann`, so it needs that on PATH. A harness
# spawns servers without an interactive shell's PATH, so it is set here.
set -eu
PATH="$HOME/.local/bin:$PATH"
export PATH
exec "$HOME/.local/bin/leann_mcp"
