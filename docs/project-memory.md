# Project memory bridge

How a `project-*` bank (see [memory-strategy](memory-strategy.md)) reaches an
agent automatically, in any repo, without per-repo setup.

## Why a stdio server

The bank pins are HTTP: one shared server, no per-caller context. It cannot tell
which repo a request came from, so project scope would otherwise need a distinct
URL pinned into each repo — opt-in, per harness, and impossible on codex, which
has no project-scoped config at all.

A stdio server is spawned per session, so it can ask. Measured across harnesses:

|                  | `roots`       | cwd          |
| ---------------- | ------------- | ------------ |
| claude, opencode | project root  | project root |
| codex            | not supported | project root |

`roots` is the protocol's own mechanism and is preferred; cwd is the fallback
that covers codex. The cost is a process per session, and one we maintain.

## Mechanism

One stdio server pinned **once per harness at user scope**, alongside the HTTP
bank pins. It adds no tools of its own — every message is forwarded verbatim, so
it stays a transport rather than a second API to keep in sync.

```text
harness session (cwd = repo)
  └─ spawns bridge (stdio)
      ├─ bankId(cwd)         a first guess, always available
      ├─ initialize          forwarded upstream, never synthesised
      ├─ roots/list          asked only once the client is initialised
      │   └─ bankId(root)    replaces the guess when it differs
      ├─ ensureBank          created on first use
      └─ forward(stdio↔HTTP) /mcp/project-<slug>/
```

Two ordering rules make it correct. `initialize` is **forwarded**, so the client
sees Hindsight's real capabilities and they cannot drift as it is upgraded —
which in turn means the bank cannot be settled first, because a server may not
request `roots/list` until the client is initialised. So requests arriving while
roots is outstanding are **queued**, not answered against the guess; an
unanswered `roots/list` falls back to cwd after five seconds rather than
wedging the session.

Consequences: every repo is covered without touching it; all harnesses resolve
the same repo to the same bank; nothing is written into the target repo, so the
question of committing a pin does not arise.

## Bank identity

Named after the git remote where there is one, else the root directory — the
remote survives clones and directory renames, which a path does not. Outside a
git repo the bridge exposes no tools rather than inventing a bank.

## Still open

- Whether a repo can opt out.
- `access: read|write` is enforceable here — the bridge can filter write tools
  out of `tools/list` — but only for traffic through it. The shared banks are
  pinned as direct HTTP and would bypass it.
- Cursor and zed are pinned but unverified live, both being GUI-only. If either
  spawns servers outside the project, `roots` is what saves it.
