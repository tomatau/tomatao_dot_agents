---
name: test-strategy
description: >-
  The user's approach to designing a project's whole test setup from its public
  contracts: system tests, then functional tests, then a minimal unit layer.
  Seeks a substantially better strategy rather than patching the current suite.
  Use when designing, overhauling or auditing a test strategy, preparing tests
  for a rewrite, or establishing requirements and traceability for a project.
---

# Test strategy

## Standards

The standards are the user's preference notes. Do not restate them here.
Before starting, recall the testing, quality-gate and software-design
preferences from `shared-memory-profile`.

Load the `requirements-traceability` skill for the requirements, citation and
check formats, and follow them exactly.

## Scope

Apply this to what the user names: a project, a package or a surface. If they
name nothing, ask. Repetition across a whole codebase belongs to a harness, not
to this skill.

## Stance

- Aim for the sweet spot of fast, decoupled and valuable tests. That is usually
  the functional layer.
- Design from contracts, not from the current tests or module structure. A
  suite that survives a rewrite in another language is the benchmark.
- Look for a harness that makes a whole class of tests fast and decoupled, not
  for one more test.
- Do not settle for patching the current suite when a better strategy is
  visible.

## Flow

Stop at each approval point and wait. Never commit.

1. **Discover how tests run.** Read language conventions, task runners,
   package manifests, monorepo tools, READMEs and CI. The project's documented
   local entry point is authoritative. Read CI commands as scopes over the same
   suites. Report drift, and suites with no local entry point, as findings with
   a proposed fix. Run the suites to record a baseline: pass state and runtime
   per layer. Keep it for this run only.
2. **Discover contracts.** Start from CLI help, READMEs, library
   documentation, API routes, and plugin skills and tool definitions. For a web
   app, start from its routes and clarify acceptance criteria with the user.
   Mine existing tests for the behaviour they check, never for their structure.
   Consider each NFR category. Everything found lands as prospective rows.
3. **Design.** Decide what each layer must cover, system first, then
   functional, then unit. Write `docs/test-design.md` (see Test design).
   **Approval:** the user approves the whole design.
4. **Confirm rows**, one surface at a time. Present that surface's prospective
   rows and the layer that covers each.
   **Approval:** the user confirms, edits or rejects each row. Assign IDs to
   confirmed rows.
5. **Write tests**: system, then functional, then unit. Have each new test meet
   `testing-standard`.
6. **Check.**
   - Run the `requirements-traceability` check.
   - Run `testing-standard` over the suite, including existing tests.
   - Use coverage and mutation runs to check that the new suite catches what
     matters. Never use them to generate the design.
   - Compare runtimes with this run's baseline.

## Non-functional requirements

Consider each category and state whether it applies and why: performance,
accessibility, security, reliability, compatibility, observability and
debuggability.

Propose expectations from the strongest basis available, and label it:

1. A known industry standard, such as Web Vitals, WCAG or the OWASP Top 10.
2. The user's preference notes.
3. A measured baseline of current behaviour, as a regression guard.

Every proposal lands as a prospective row.

## Test design

`docs/test-design.md` holds one short entry per surface: how the surface is
driven, and which boundaries are faked and how. Create `docs/` when missing.
Keep it short. It is authoritative: a test that bypasses it is drift.

## Superseded tests

Delete an old test, in the working tree only, when:

- every row it produced is confirmed and cited by a new test, or rejected by
  the user, and
- the replacing tests meet `testing-standard`.

List each deleted file with the rows and tests that replace it. When an old
test checks something no row captured, raise a prospective row instead of
deleting it.

## Escalations

`testing-standard` escalates fixes beyond implementation, such as moving a test
to another layer or replacing a slow harness. Weigh them here, against the
design.

## Output

At each approval point, give:

- findings, ranked by how much they change the strategy,
- the proposed design or rows,
- what each approval will cause.
