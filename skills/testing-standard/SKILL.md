---
name: testing-standard
description: >-
  The user's standard for how individual tests are implemented, applied when
  writing, changing, or reviewing tests within an existing test strategy. Runs
  the tests to verify findings, and pushes for fewer, clearer, faster tests
  over merely passing ones. Use when writing or changing tests, or when asked
  to review, audit, or critique tests.
---

# Testing standard

## Standards

The standards are the user's preference notes. Do not restate them here.
Before starting, recall the testing and coding preferences from
`shared-memory-profile`.

Load the `requirements-traceability` skill for how tests cite requirements,
declare surfaces and carry bucket labels.

## Scope

Apply this to the tests the user names. If they name nothing, apply it to the
current branch's test changes. If that is unclear, ask.

Work within the existing test strategy. Escalate anything beyond it.

## Stance

- Be ambitious about simplifying how tests are implemented. Look for fewer,
  clearer tests, not a tidier version of the same tests.
- Prefer direct tests over clever fixtures or helpers.
- A passing test is not enough. It must be able to fail.

## Execution

- Run the tests in scope through the project's documented local entry point,
  including existing tests, not only those you write.
- Confirm that each test passes and can fail when the behaviour it covers
  breaks.
- Compare each test's runtime with peers of the same kind and runner, and with
  the baseline from the start of the run. Be pragmatic: the aim is
  near-instant feedback, not precise budgets.
- When tests cannot be run, still review, but mark each finding you could not
  verify.

## Questions

- Does each test have exactly one justification: a confirmed ID, or a bucket
  label?
- Does it exercise the contract through its surface, without reaching into
  internals?
- Would it fail if the behaviour broke?
- When it cites an ID, does it assert the outcome that requirement states?
- Are stubs and fixtures named by scenario?
- Does shared setup reduce repetition without hiding intent?
- Is the file within the size heuristic, and is the test as fast as its peers?

## Remedies

- Merge cases that share a structure into a table.
- Extract an assertion helper that preserves intent.
- Rename a stub after its scenario.
- Delete a test whose behaviour another test already proves on the same
  surface.
- Split a file along its surfaces.

## Escalations

Report fixes beyond implementation to `test-strategy`; do not make them here.
Examples: moving a test to another layer, replacing a slow harness, or a
requirement no test can reach affordably.

## Output

Rank findings in this order:

1. Tests that cannot fail
2. Unaccounted tests and traceability breaks
3. Coupling to implementation
4. Missed simplifications
5. Legibility

Prefer a few high-conviction findings to many nits. For each, quote the test,
link file and line, name the preference it rests on or state that it is a
judgement beyond them, and say whether it was verified by running.

## Blockers

Treat these as blockers unless the author justifies them:

- A test that cannot fail.
- A test with no ID and no bucket label.
- A test coupled to implementation details its surface does not expose.
- A stub or fixture named after one instance rather than its scenario.
- An unexplained slow outlier.
- A deviation from a preference note without a stated reason.

## Approval bar

Do not approve only because the tests pass. Approve only when no blocker
applies and no visible simplification is left unmade. Otherwise, give
specific, actionable feedback.
