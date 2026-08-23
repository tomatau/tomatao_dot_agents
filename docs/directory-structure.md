# `~/.agents` — Directory Structure

What lives where. Root-level concerns only; operating details live in the
topic docs ([personalisation](personalisation.md),
[memory-strategy](memory-strategy.md)).

**Built**: personalisation pipeline, skills sync. **Planned**: mcp, hindsight.

## Tree

```
~/.agents/
├── README.md
├── justfile                     # command map: just sync-personalisation, just doctor
├── .prototools                  # toolchain pin (bun 1.3.13)
├── package.json / tsconfig.json # Bun + TypeScript
├── config/
│   └── adapters.yml             # per-harness link paths (paths only, no behaviour)
├── personalisation/             # CANONICAL personalisation sources
│   └── *.md                     # symlinks into the vault, named after their source
├── dist/                        # rendered output — committed so changes are reviewable
│   ├── claude/  codex/  opencode/
│   └── cursor/rules/*.mdc       # one rule file per source
├── src/
│   ├── lib/         # generic capability: symlink handling, path utils
│   ├── settings/    # project environment: repo paths, yaml config
│   ├── domains/     # feature knowledge (personalisation, skills)
│   ├── adapters/    # per-harness content shaping
│   └── entries/     # thin command entrypoints (justfile targets)
├── docs/                        # these documents
├── skills/                      # CANONICAL shared skills (<name>/SKILL.md)
├── mcp/                         # (planned) CANONICAL shared MCP registry
└── hindsight/                   # (planned) memory server runtime files
```

## Root-level boundaries

- **`src/` layers flow one way** — `entries` → `adapters`/`domains` →
  `settings` → `lib`.
- **`config/` declares paths; adapters declare behaviour.** The yaml never
  contains logic or content details.
- **`dist/` is generated but committed** — renders are human-readable and
  diffing them beats trusting silent writes.
- **`personalisation/` mirrors its vault sources by filename** — the vault note
  is the source of truth; this dir holds only links to it.
- Planned dirs follow the same pattern when they land: canonical data here,
  merge/sync logic in `src/`, foreign configs never stored.
