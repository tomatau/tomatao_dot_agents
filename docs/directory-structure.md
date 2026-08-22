# `~/.agents` — Directory Structure (end goal)

Coordination home for all agent harnesses on this machine: canonical shared data
plus the code that distributes it. See [principles](principles.md) and
[memory strategy](memory-strategy.md).

**Status: planned.** Nothing here exists until built, phase by phase.

## Source-of-truth map

| Domain | Source of truth | Reaches consumers via |
|---|---|---|
| Personal facts & preferences | Obsidian vault (`~/Documents/obsidian/Tom's`) — sync scope declared at `_system/config/memory-sync.yml` | one-way sync → Hindsight `profile` bank |
| Tooling & orchestration | dotfiles repo (`~/Code/tomatao/dotfiles`) | chezmoi |
| Shared skills | `~/.agents/skills/` | adapter-managed symlinks/copies per harness |
| Shared MCP servers | `~/.agents/mcp/` | adapter-managed merges into harness configs |
| Stable personalisation | `~/.agents/personalisation/` | rendered into each harness's instructions mechanism |
| Memory server runtime | Hindsight data (`~/.pg0`) | launchd job; native/hook/MCP bridges (see memory-strategy) |
| Hermes-specific tooling | `hermes-gizmos` repo | Hermes' own mechanisms; never synced through here |
| Project knowledge | each project repo (anywhere on disk) | read directly by agents; memory stores pointers only |

## Layout

```
~/.agents/
├── README.md
├── justfile                       # just sync / just hindsight status / just doctor …
├── docs/                          # principles.md, directory-structure.md, memory-strategy.md
├── src/                           # Bun + TypeScript
│   ├── sync/
│   │   ├── vault.ts               # reads vault whitelist → hindsight documents API
│   │   ├── skills.ts
│   │   ├── mcp.ts
│   │   └── personalisation.ts
│   ├── adapters/                  # per-harness paths/formats/merge logic only:
│   │   ├── claude.ts codex.ts cursor.ts zed.ts opencode.ts warp.ts hermes.ts
│   ├── hindsight.ts               # server lifecycle via launchctl wrapper
│   └── doctor.ts                  # cross-cutting health checks
├── skills/                        # CANONICAL shared skills (one dir per skill)
├── mcp/                           # CANONICAL shared MCP registry
├── personalisation/               # CANONICAL stable personalisation
└── hindsight/                     # server runtime files
    ├── hindsight.env              # provider/model/key, port, MCP instructions (secret)
    ├── run-hindsight.sh           # tiny launcher (launchd can't source env files)
    ├── com.hindsight.server.plist # RunAtLoad + KeepAlive
    └── logs/                      # gitignored
```

Language: Bun/TypeScript — official `@vectorize-io/hindsight-client` SDK exists;
everything else is HTTP + YAML. The server itself runs independently of this
codebase via its own installer.

## Personalisation

`personalisation/` holds durable identity and conventions — who the user is,
communication style, standing constraints, tooling facts. Adapters render it into
each harness's native mechanism (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`,
Warp rules, Zed rules files, opencode rules …).

There is no single emerging standard here yet: Claude Code has `CLAUDE.md`,
several tools are converging on `AGENTS.md`, Hermes uses profiles, and bot-agent
frameworks experiment with persona conventions like `soul.md`. Adapters absorb
the differences; canonical content stays in one place here.

It also carries the **memory directive** — every agent is told to recall before
acting and retain durable learnings afterwards, so shared memory works by
default without per-session instruction. Harnesses with hook support get true
auto-memory instead.
