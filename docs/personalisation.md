# Personalisation pipeline

How stable personalisation reaches every harness. Content is authored once in
the vault; this repo distributes it.

## Flow

```
vault note (SoT)
  └─ symlinked into personalisation/<same-name>.md
       └─ adapters scan personalisation/*.md and render to dist/
            └─ dist/ files symlinked into each harness's expected path
```

- **Source of truth**: the vault note. Edit it there; never edit files in
  `personalisation/` (they're links) or `dist/` (they're generated, but committed).
- **Adding a personalisation file**: create/symlink a new `.md` in
  `personalisation/`, run `just sync-personalisation`. No config edits needed.

## Conventions

- **Filename drives identity**: for cursor (one rule per source), the source
  filename becomes the rule filename *and* its `description:` frontmatter.
- **Frontmatter is stripped** from sources before rendering — Obsidian
  properties are vault metadata, not agent instructions.
- **Aggregating vs per-file adapters**: claude/codex/opencode fold all sources
  into one document each; cursor maps sources 1:1.

## Config contract

`config/adapters.yml` declares **paths only** — where rendered files land
(`target`, inside `dist/`) and where harnesses expect them (`dest`). Cursor's
entry names directories; its adapter derives `<name>.mdc` per source.
Everything behavioural lives in `src/adapters/<harness>.ts`.

## Harness targets

| Harness | Destination | Behaviour |
|---|---|---|
| claude | `~/.claude/CLAUDE.md` | aggregate |
| codex | `~/.codex/AGENTS.md` | aggregate |
| opencode | `~/.config/opencode/AGENTS.md` | aggregate |
| cursor | `~/.cursor/rules/<name>.mdc` | 1:1 rules |
| warp / zed / hermes | — | stubs, not implemented |

## Commands

```sh
just render-personalisation   # personalisation/ -> dist/
just link-personalisation     # ensure symlinks dest -> dist (never overwrites foreign files)
just sync-personalisation     # both
just doctor                   # verify every link points where it should
```

`link` fails loudly rather than replacing an existing non-symlink file.
