# Project memory bridge

How a `project-*` bank (see [memory-strategy](memory-strategy.md)) reaches an
agent automatically, in any repo, without per-repo setup.

## Why not one pinned URL per project

The bank pins are HTTP: one shared server, no per-caller context. It cannot tell
which repo a request came from, so project scope would need a distinct URL pinned
into each repo — opt-in, per harness, and impossible on codex (global config only).

A stdio server is spawned per session and inherits the harness's working
directory, so it can identify the repo itself. Measured:

```
claude   mcp list  in proj-a  →  cwd=…/proj-a
opencode mcp list  in proj-b  →  cwd=…/proj-b
```

That is what makes on-by-default possible; the tradeoff is a process we own.

## Mechanism

One stdio server pinned **once per harness at user scope**, alongside the HTTP
bank pins. It adds no tools of its own — every JSON-RPC message is forwarded
verbatim, so it stays a transport, not a second API to maintain.

```text
harness session (cwd = repo)
  └─ spawns bridge (stdio)
      ├─ gitRoot(cwd)      repo identity, or exit quietly if not a repo
      ├─ slug(root)        stable bank id
      ├─ ensureBank(slug)  PUT /v1/default/banks/project-<slug> (idempotent)
      ├─ register(slug)    records repo → bank in ~/.agents
      └─ proxy(stdio↔HTTP) /mcp/project-<slug>/
```

Consequences: every repo is covered without touching it; all harnesses resolve
the same repo to the same bank; nothing is written into the target repo, so the
commit-scope question does not arise.

## Bank identity

Slug from the git remote where there is one, else the root directory name — the
remote survives clones and directory renames, which a path does not. The registry
it writes is a record, not the source of truth: losing it costs nothing because
the slug is re-derived each session.

Outside a git repo the bridge exposes nothing rather than inventing a bank.

## Before building

- cwd inheritance is confirmed on claude and opencode only. Codex, cursor, and
  zed need the same check — codex especially, as it is the one harness with no
  project-scoped config to fall back on.
- Bank creation does not exist yet in this repo; `learnings` is pinned but was
  never created. That step is shared with this design and should land first.
- Unresolved: whether a repo can opt out, and whether `access:` should apply to
  project banks as it does to the shared ones.
