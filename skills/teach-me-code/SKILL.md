---
name: teach-me-code
description: >-
  Guided walkthrough of recent code changes. Resolves scope from working tree,
  then staged, then branch commits. Gives a short overview plus a flow diagram
  from the call site, then tours the code one step at a time with pauses for
  questions. Use when asked to walk through, teach, or explain recent changes.
---

# Teach me this code

## Scope resolution

Pick the first that yields content:

1. Working tree changes — `git diff` (unstaged)
2. Staged changes — `git diff --cached`
3. Branch commits — diff against merge-base with the default branch
   (`git log --oneline $(git merge-base HEAD <default>)..HEAD`)

If I name a scope (a PR, a commit range, a path), use that instead. If nothing
yields content, ask what to explore instead of guessing.

The diff is not the boundary of the walkthrough. When the caller that starts
the changed behaviour sits in unchanged code, read it, so the tour begins at
the real entry point. A PR description, issue, or commit history can supply
intent; keep that apart from what the code itself demonstrates.

## Phase 1 — Overview (keep it small)

Identify the call site where the changed code first executes. When the change
is reached from several independent call sites, draw one tree per call site, in
the order the tour will take them.

Deliver in ONE message:

1. At most five bullets: what changed and why (state intent explicitly; say
   when you are inferring rather than knowing).
2. One plain-text diagram of the NEW code flow starting at that call site,
   inside a fenced code block. Never Mermaid or other markup — it must render
   readably in any terminal or agent. Draw a tree with box-drawing characters:
   - Root is the call site. Each node: `name  (file:line)` followed by a short
     annotation of its observable effect.
   - Encode whichever of these the code actually exhibits; omit categories the
     change doesn't touch rather than padding the diagram:
     call order, branches and early returns, loop bodies, sequential vs
     parallel/awaited steps, data handed between nodes (`── value ──▶`),
     side effects (files written, network, process exit), error paths.
   - Edges mean "calls" by default; label an edge only when the relationship
     differs (awaits, data flow, error).

   Minimal shape (linear flow):

   ```text
   main()  (src/cli.ts:12)
    └─ run()  (src/run.ts:8)        orchestrates; returns exit code
        ├─ loadConfig()             config file → typed config
        ├─ fetchAll()               parallel requests, fails soft per item
        │   └─ fetchOne()           retries ×3 on 5xx
        └─ report(results)          prints summary to stdout
   ```

   Wider shape (branching, data flow, error path):

   ```text
   handle(req)  (src/api.ts:40)
    ├─ parse(body)                  throws on malformed input
    ├─ cache hit? ──▶ serveCached() early return, skips the rest
    ├─ loadUser(id) ─── user ──▶ render(req, user)
    └─ respond()
        ├─ ok ──▶ 200 + body
        └─ err ──▶ log(err)         (src/log.ts:9) then 500
   ```

   When the flow outgrows ~10 nodes, simplify instead of cramming: one story
   per diagram (happy path plus at most the error path this change adds);
   draw the spine — entry point → main stages → outcome; collapse everything
   else into one annotated line naming what was folded away. Phase 2 expands
   each stage as its own step, so depth can wait until then.

Then ask: "Ready for the walkthrough, questions first?" and wait.

## Phase 2 — Step-by-step tour

Walk the diagram top-down, starting at the caller that initiates the changed
behaviour rather than the file with the largest diff. Exactly ONE step per
message:

- Quote the relevant snippet(s) with `file:line` references: the lines that
  changed or that show the handoff, not the boilerplate around them
- Explain what it does, what this change altered, and why it lives there
- Call out nuances explicitly: edge cases, ordering assumptions, hidden
  coupling, error paths, performance or concurrency notes
- Mention the tests that cover this behaviour here, instead of touring the test
  files separately
- End with: "Questions about this step?"

Wait for my reply before continuing, even if I only say "next".

When the next step is not an obvious callee of the last one — a sibling, a
later phase of the same caller, a second call site of a helper already covered
— re-draw the live path from the call site down to it before explaining it.
Keep it to that path, not the whole diagram:

```text
start()
 └─ lookUp()                        at startup

sync()                              later, same store
 ├─ isQuarantined()                 skips entries already known bad
 └─ lookUp()                        same helper, second call site
```

When one call site's flow is finished, say so and ask before starting the next.

## Rules

- Never batch multiple steps into one message
- Answer questions fully before resuming; resume at the exact step we left
- A question about the current step keeps us on that step; it is not
  permission to move on
- If the code contradicts the Phase 1 overview, say so and correct the diagram
