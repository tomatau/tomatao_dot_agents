# Memory strategy

Shared agent memory via one local Hindsight server; how authoritative content
reaches it and how agents consume it.

## Server

- Single process on `127.0.0.1:8888`, embedded Postgres, data under `~/.pg0`.
- Lifecycle: launchd (`RunAtLoad` + `KeepAlive`), managed via `just hindsight <cmd>`.
- Extraction/synthesis LLM: cloud cheap model (gpt-4o-mini class). No local LLM for now.

## Integration bridges (per harness, best available wins)

1. **Native integration** — deepest behaviour, zero custom wiring
   (Hermes: first-class Hindsight support via `hermes memory setup`).
2. **Hook-based auto-memory** — recall injected before prompts, turns retained
   automatically; doesn't rely on the agent choosing to call tools. Evaluate and
   adopt per harness where supported.
3. **MCP fallback** — universal baseline: pinned HTTP endpoints `/mcp/<bank>/`
   exposed to every harness identically.

## Banks

| Bank | Written by | Read by | Purpose |
|---|---|---|---|
| `profile` | vault sync only | all agents (read-mostly) | authoritative personal context |
| `learnings` | any agent, tagged `by:<agent>` | all agents | cross-project ephemera: system quirks, constraints, environment facts; audited periodically, keepers graduate to the vault |
| `project-<name>` | agents working in that repo | agents in that repo | evolving per-project understanding; pointers into the repo, never copies |

## Connections per agent

- Pinned globally: `/mcp/profile/` (read-mostly) and `/mcp/learnings/`.
- `project-*` banks attach per-repo (repo-level config names its bank).
- Hermes uses its native integration against the same banks.

## Vault → profile sync contract (ratified)

Scope lives **in the vault** at `_system/config/memory-sync.yml`; this repo owns
only the reader. Schema v1:

```yaml
version: 1

defaults:
  exclude:                          # never synced, applies under all sources
    - "**/.obsidian/**"
    - "**/.trash/**"
    - "**/_*/**"
  promote_frontmatter: [category, scope, priority]  # keys → tags when present

sources:
  - path: tomatao/preferences/coding/**/*.md       # globs only, vault-relative
    tags: { category: coding }                     # applied to every match
```

Ratified semantics:

1. **Selection**: every `path` is a glob relative to vault root; `.md` files only,
   minus global excludes. `tags` are never filters — pure annotation.
2. **Tags per document**: fixed `source:obsidian`, plus static tags from its
   source entry, plus any promoted frontmatter keys found in that file.
3. **Frontmatter** is stripped from the body before sync; it travels as
   tags/metadata instead of raw YAML.
4. **Identity**: `document_id = obsidian:<vault-relative-path>`.
5. **Declarative purge**: after every run, `profile` == exactly the whitelisted
   files. Deleted file, moved file, or removed/re-shrunk source ⇒ purge next run;
   moves surface as delete + recreate (no move detection).
6. **Change detection**: sha256 of frontmatter+body cached locally; unchanged
   files trigger zero API calls.
7. **Reporting**: each run prints added/updated/purged/unchanged plus changed
   paths; `--dry-run` plans without writing; non-zero exit on API errors.
