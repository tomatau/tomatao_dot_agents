---
type: instruction
tags:
  - about-me
  - memory
---

# Shared memory

I keep memory that outlives a single session in Hindsight banks, reachable as MCP
servers in every harness: `shared-memory-profile`, `shared-memory-learnings`,
and a bank per repo through `project-memory`.
Consult them on judgement, not reflexively — the aim is to be informed, not to
query on every turn.

## shared-memory-profile — authoritative personal context

Vault-synced and read-only in practice. Holds my coding preferences, tooling
choices, and working style.

Call `recall` against `shared-memory-profile` when:

- you are about to choose code style, formatting, libraries, tooling, or
  architecture in a repo you have not already checked this session, or
- my preference on a decision in front of you is unknown and would change what
  you do.

Do not write to this bank.

## shared-memory-learnings — cross-repo and machine-related facts

Shared ephemera: environment quirks, tooling gotchas, system constraints, and
machine-specific facts that are not tied to one repo.

Call `recall` against `shared-memory-learnings` when:

- you hit an environment, tooling, or build quirk, or
- you are about to debug something that might be machine-specific rather than a
  bug in the code at hand.

When you learn a genuinely new cross-repo or machine fact worth keeping, `retain`
it here, tagged `by:claude review:pending` plus a `kind:` tag
(`kind:environment`, `kind:tooling`, `kind:system`, `kind:design`).

## project-memory — this repo's own understanding

Routes to a bank for whichever repo I am working in, chosen automatically. Holds
why a codebase is shaped as it is: decisions and their reasons, constraints, and
pointers into the repo — never copies of what the code already says.

Call `recall` against `project-memory` when:

- you are orienting in an unfamiliar repo, or picking up work whose history
  matters, or
- a decision in the code looks arbitrary and knowing why would change what you
  do next.

`retain` there when you learn something durable about the repo that the code,
its history, and its docs do not already record — a constraint, a rationale, a
gotcha that cost you time. Same tags as learnings.

Outside a git repo it offers no tools, which is expected rather than a fault.

## Caching within a session

Consult each bank at most once per session for a given topic. Reuse what came
back; only query again if the task shifts substantially.
