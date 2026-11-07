---
name: code-quality-standard
description: >-
  The user's standard for code design quality, applied when writing, changing,
  or reviewing code. Pushes for structural simplification over merely working
  code, measured against the user's own preference notes. Use when writing or
  changing code with design impact, or when asked to review, audit, or critique
  code quality.
---

# Code quality standard

## Standards

The standards are the user's preference notes. Do not restate them here.
Before starting, recall the coding and software-design preferences from
`shared-memory-profile`. If that is unavailable, read `preferences/coding/` and
`preferences/software-design/` in the vault.

## Scope

Apply this to what the user names. If they name nothing, apply it to the
current branch's changes. If that is unclear, ask.

When writing code, ask the questions below before starting and again before
finishing. When reviewing, ask them of each change.

## Stance

- Be ambitious about structural simplification. Look for a reframing that
  deletes branches, layers or modes, not one that rearranges them.
- Bias toward cleaning the design. Working code is not enough.
- Prefer direct, boring code over clever or magical code.

## Questions

- Is there a simpler model that makes this complexity disappear?
- Does the change make the surrounding code harder to reason about?
- Does the logic live in the canonical layer, and does it reuse existing helpers?
- Does each abstraction, flag and special case earn its place?
- Does each deviation from the preference notes have a stated reason?

## Remedies

- Delete a layer of indirection rather than polish it.
- Reframe the model so conditionals disappear instead of being centralised.
- Change the ownership boundary so the feature extends an existing abstraction.
- Turn special-case logic into a simpler default flow with fewer exceptions.
- Extract a pure function, or split a module along a real boundary.
- Reuse the canonical helper instead of writing a near-duplicate.
- Make a type boundary explicit so the control flow simplifies.

Do not settle for renaming when the problem is structural. Do not settle for a
tidier version of the same idea when a much simpler idea is visible.

## Output

Rank findings in this order:

1. Structural regressions
2. Missed simplifications
3. Boundary, layering and type problems
4. Legibility

Prefer a few high-conviction findings to many nits. For each, quote the code,
link file and line, and name the preference it rests on, or state that it is a
judgement beyond them.

## Blockers

Treat these as blockers unless the author justifies them:

- It keeps incidental complexity when a plausible simplification would delete it.
- It adds ad-hoc branching to an existing flow.
- It scatters feature checks across shared code.
- It adds an abstraction, wrapper or cast-heavy contract that makes the design
  more indirect.
- It duplicates a helper, or puts logic in the wrong layer, when a canonical
  home exists.
- It deviates from a preference note without a stated reason.

## Approval bar

Do not approve only because behaviour is correct. Approve only when no blocker
applies and no visible simplification is left unmade. Otherwise, give specific,
actionable feedback.
