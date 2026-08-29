# Memory strategy

Shared agent memory via one local Hindsight server; how authoritative content
reaches it and how agents consume it.

## Server

- Single process on `127.0.0.1:8888`, embedded Postgres, data under `~/.pg0`.
- Lifecycle: launchd (`RunAtLoad` + `KeepAlive`), managed via `just hindsight <cmd>`.
- Extraction/synthesis LLM: via subscription OAuth (cheap, effective tier), no local LLM for now.

## Integration bridges (per harness, best available wins)

1. **Native integration** — deepest behaviour, zero custom wiring
   (Hermes: first-class Hindsight support via `hermes memory setup`).
2. **Hook-based auto-memory** — recall injected before prompts, turns retained
   automatically; doesn't rely on the agent choosing to call tools. Evaluate and
   adopt per harness where supported (wired via `hindsight-coding-agents` where applicable).
3. **MCP fallback** — universal baseline: pinned HTTP endpoints `/mcp/<bank>/`
   exposed to every harness identically.

## Banks

| Bank             | Written by                                             | Read by                  | Purpose                                                                                                                          |
| ---------------- | ------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `profile`        | vault sync only                                        | all agents (read-mostly) | authoritative personal context                                                                                                   |
| `learnings`      | any agent, tagged `by:<agent>` + `review:*` + `kind:*` | all agents               | cross-project ephemera: system quirks, constraints, environment facts; subject to external review, keepers graduate to the vault |
| `project-<name>` | agents working in that repo                            | agents in that repo      | evolving per-project understanding; pointers into the repo, never copies                                                         |

### Learnings review conventions (application-level, not Hindsight-native)

Hindsight does not natively understand “trusted” or “provisional”. Its native
`valid`/`invalidated` state controls whether a memory participates in recall,
not whether you have approved it. These conventions sit on top:

- Every agent-written learning carries provenance `by:<agent>` (e.g. `by:codex`).
- New learnings begin as `review:pending` and carry a `kind:` vocabulary tag:
  `kind:environment`, `kind:tooling`, `kind:system`, `kind:design` (extend as needed).

  ```
  by:codex  review:pending  kind:environment
  ```

  After human review:

  ```
  review:accepted
  ```

- `review:pending` learnings must not feed authoritative mental models.
- `review:accepted` learnings may be used as shared knowledge.
- Factually wrong memories use Hindsight's reversible invalidation, not deletion.
- The review and promotion process is external to Hindsight. The plan's “audit
  periodically” wording therefore means “a review process built around
  Hindsight's listing, provenance, audit-log, edit, and invalidation APIs”,
  not an approval workflow that Hindsight provides.

## Connections per agent

- Pinned globally: `/mcp/profile/` (read-mostly) and `/mcp/learnings/`.
- `project-*` banks attach per-repo (repo-level config names its bank).
- Hermes uses its native integration against the same banks.

## Vault → profile sync contract (ratified)

Scope lives **in the vault** at `_system/config/memory-sync.yml`; this repo owns
only the reader. Vault location is machine-local and not checked in:
`VAULT_DIR` in `hindsight/env.local` (gitignored), e.g. on this host
`/Users/tomatao/Documents/obsidian/Tom's`. Schema v1:

```yaml
version: 1

defaults:
  exclude: # never synced, applies under all sources
    - '**/.obsidian/**'
    - '**/.trash/**'
    - '**/_*/**'
  promote_frontmatter: [category, scope, priority] # keys → tags when present

sources:
  - path: tomatao/preferences/coding/**/*.md # globs only, vault-relative
    tags: { category: coding } # applied to every match
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
6. **Change detection**: sha256 of frontmatter+body cached locally at
   `hindsight/.sync-cache.json`; unchanged files trigger zero API calls.
7. **Reporting**: each run prints added/updated/purged/unchanged plus changed
   paths; `--dry-run` plans without writing; non-zero exit on API errors.

### Directives vs memories (vault → Hindsight)

```
vault document
  └─ retain()
      └─ memory / observation


vault rule selected as a hard instruction
  └─ separate directive synchronisation
      └─ Hindsight directive
```

- `retain()` never creates directives.
- `reflect()` reads applicable directives; it does not manage or generate them.
- If vault rules such as “use British English” or “do not invent preferences”
  should become Hindsight directives, the synchroniser must explicitly
  create/update them through the directive API.
- The vault remains authoritative; Hindsight stores the derived memories and
  directives.

## Machine-local configuration

- `hindsight/env.local` (gitignored) holds `VAULT_DIR` plus `HINDSIGHT_API_*`.
  `hindsight/env.example` is the committed template.
- This keeps host-specific paths out of the repo so the same checkout works
  across machines.
