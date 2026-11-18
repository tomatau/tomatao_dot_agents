---
name: requirements-traceability
description: >-
  The user's format for requirements.md files and for how tests cite them, plus
  a drop-in check that every current requirement is covered on every surface.
  Use when writing or editing a requirements.md, naming or labelling a test in
  a project that has requirements, or checking requirement coverage.
---

# Requirements traceability

## Requirements files

Each package or assembled product keeps a tracked `requirements.md`.

- Confirmed sections are authoritative. When a README, help text or tool
  definition disagrees with them, the surface is wrong, not the requirement.
- Structure each section to suit what it holds. Add a `Source` column only
  where an external normative specification exists.
- A `Prospective` section holds short notes and a table of unconfirmed rows,
  each with the surface it was discovered from. Discovery writes only here.
- A row gets its ID when the user confirms it and moves into a confirmed
  section. Prospective rows have no IDs.
- Keep a project's existing prefixes, such as `REQ`, `PRD`, `GPRD` and `NFR`.

## Surfaces

A surface is a public contract a consumer can reach: a component, an exported
hook, a CLI command, a route, a tool definition.

- Each `requirements.md` names its surfaces once.
- Each row lists the surfaces it applies to in a `Surfaces` column, comma
  separated. Rows are never duplicated per surface.
- Coverage counts per requirement and surface pair. A row without a `Surfaces`
  column needs one citing test anywhere.
- A row with an `Applicability` column needs coverage only when it is
  `Current`.

## System tests

A `System tests` section holds `SYS-` rows. Each row names the journey and lists
every boundary it crosses, marked real or faked. A row is end-to-end when every
boundary is real. Rows live in the `requirements.md` of the assembled product.

## Tests

A test's kind follows from what it cites, never from its runner or suite name.

| Kind       | Cites                         | Exercises                  |
| ---------- | ----------------------------- | -------------------------- |
| System     | a `SYS-` ID                   | the assembled product      |
| Functional | confirmed requirement IDs     | one public surface         |
| Unit       | a bucket label, once per file | code no consumer can reach |

- IDs appear only in `requirements.md` files and in tests.
- Test names carry the IDs they cover, as in
  `it('REQ-006 command buttons do not set aria-pressed', ...)`.
- A test file declares its surface in a comment, `surface: <name>`, using the
  language's comment syntax. Without one, the surface is inferred by matching
  the file path against surface names, ignoring case and snake, camel or kebab
  style.
- A unit test file declares one bucket in a comment, `unit: <bucket>`. The
  buckets are `shared`, `algorithm` and `unreachable`. Their definitions live
  in the `Testing strategy` preference note.
- A test with no ID and no bucket is unaccounted for.

## Check

[checks/traceability.py](checks/traceability.py) is a single Python file,
standard library only, with a version stamp and a PEP 723 header. Projects keep
a copy at `.checks/traceability.py`.

- If the copy is missing, copy it in. If its version is older, offer an update.
- Run it with `uv run .checks/traceability.py` in a uv project, or `python3`
  otherwise. It takes no arguments.
- The project decides how to call it locally and in CI. Propose the wiring as
  one change for the user to approve; do not make it unasked.

It treats every ID outside `requirements.*` files as a test citation, and
reports:

- requirement and surface pairs with no citing test,
- citations of IDs that do not exist,
- citations it cannot place.

A citation resolves to the nearest `requirements.md` above the citing file that
defines the ID. A file outside every package, such as a CI workflow, may cite an
ID that exactly one `requirements.md` defines.

The check cannot find tests that cite nothing. Find those by reading the tests.
