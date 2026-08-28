---
type: instruction
tags:
  - about-me
  - memory
---
# Shared memory

I keep memory that outlives a single session in two Hindsight banks, reachable as
MCP servers in every harness: `hindsight-profile` and `hindsight-learnings`.
Consult them on judgement, not reflexively — the aim is to be informed, not to
query on every turn.

## profile — authoritative personal context

Vault-synced and read-only in practice. Holds my coding preferences, tooling
choices, and working style.

Call `recall` against `hindsight-profile` when:

- you are about to choose code style, formatting, libraries, tooling, or
  architecture in a repo you have not already checked this session, or
- my preference on a decision in front of you is unknown and would change what
  you do.

Do not write to this bank.

## learnings — cross-repo and machine-related facts

Shared ephemera: environment quirks, tooling gotchas, system constraints, and
machine-specific facts that are not tied to one repo.

Call `recall` against `hindsight-learnings` when:

- you hit an environment, tooling, or build quirk, or
- you are about to debug something that might be machine-specific rather than a
  bug in the code at hand.

When you learn a genuinely new cross-repo or machine fact worth keeping, `retain`
it here, tagged `by:claude review:pending` plus a `kind:` tag
(`kind:environment`, `kind:tooling`, `kind:system`, `kind:design`).

## Caching within a session

Consult each bank at most once per session for a given topic. Reuse what came
back; only query again if the task shifts substantially.
