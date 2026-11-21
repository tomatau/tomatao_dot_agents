---
name: a11y-specs
description: >-
  Judgement for answering accessibility questions from the a11y-specs index
  through the shared-search MCP server: which spec answers which question,
  which ones bind, and what to do when they disagree or are silent. Use for
  any question about ARIA roles, states and properties, keyboard interaction,
  focus, accessible names, WCAG success criteria, or how native HTML elements
  behave for assistive technology.
---

# Accessibility specs

The `a11y-specs` index holds five specs, one section per file, each spec its
own collection. Search them with `shared-search`'s `search`, read every section
you rely on in full with `get`, and cite the `url` in its frontmatter. Answer
from the specs, not from memory.

## Which spec answers what

| Collection  | Spec                     | Ask it                                                                                                            | Binds?      |
| ----------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| `html`      | HTML Standard            | how a native element or attribute behaves: activation, focus, dialogs, `inert`, `hidden`, `popover`, forms        | normative   |
| `html-aria` | ARIA in HTML             | an element's implicit role, and which roles and `aria-*` attributes an author may set on it                       | normative   |
| `aria`      | WAI-ARIA 1.2             | what a role, state or property means and requires: required states, owned elements, naming required or prohibited | normative   |
| `wcag`      | WCAG 2.2                 | the outcome a page must meet, and at which level                                                                  | normative   |
| `apg`       | ARIA Authoring Practices | how a custom widget is usually built: keyboard interaction, and the roles and states each pattern uses            | informative |

## Weighing them

- Start from native HTML. When an element already provides the semantics and
  behaviour, the answer is that element, and ARIA only fills a gap the element
  leaves. The APG puts it as "No ARIA is better than Bad ARIA"
  (`apg/read-me-first/no_aria_better_bad_aria.md`).
- For an HTML element, `html-aria` decides which ARIA is allowed on it. `aria`
  alone cannot, because it is written for any host language.
- The APG is guidance. Its keyboard patterns are recommendations, never
  obligations, unless a normative spec says the same thing. A project may adopt
  the APG as policy; record that as the project's decision, not the spec's.
- WCAG states outcomes, not techniques. Cite a success criterion and its level
  for what must hold, and the other specs for how it is met.
- Keep each spec's own strength. MUST, SHOULD and MAY stay as written, and a
  note or example never becomes a requirement.
- When specs disagree, quote both and say so. A normative spec outranks the
  APG. Between normative specs, the one written for the exact case usually
  governs, such as an element's `html-aria` entry over a general `aria` rule,
  but flag the conflict rather than settle it silently.

## Searching

- Ask one narrow question per search, scoped with `collections` to the spec that
  answers it. Widen to other specs only when that one is silent.
- Use `lexical` for exact names, such as `aria-activedescendant` or
  `focus-visible`, and `hybrid` for questions in prose.
- A path names its kind: `html-aria/el-div.md` is the `div` element,
  `html-aria/att-hidden.md` an attribute, and `wcag/dfn-*.md` a definition.

## When the index is silent

The index holds those five specs and nothing else: no WCAG Understanding
documents or Techniques, no accessible name computation spec, and no browser or
screen reader support data. When an answer needs one of those, say it is not in
the index, and mark anything you add from memory as such.
