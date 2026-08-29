# mcp

Declaring and converging MCP servers: what `mcp/*.yml` describes, and which of
those names this repo owns.

- It resolves a source through a `kind:` it is _given_, so it stays ignorant of
  what any kind means. Adding a provider never changes this domain.
- The registry that names providers lives above it, in `entries/`, because
  naming them all is composition.
- Harness vocabulary — config keys, entry shapes, CLI flags — belongs in
  `adapters/`, not here.
