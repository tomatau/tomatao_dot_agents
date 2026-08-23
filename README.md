# ~/.agents

Coordination home for every agent harness on this machine. This repo owns the
*shared* stuff: canonical data plus the code that distributes it. Tool-private
configuration stays in each tool's own home.

## Quickstart

```sh
bun install                 # bun 1.3.13 pinned via .prototools
just                        # list commands
just sync-personalisation   # render + symlink personalisation into harnesses
just doctor                 # verify wiring across harnesses
```

## Layout

See [docs/directory-structure.md](docs/directory-structure.md).

## Docs

| Doc | Covers |
|---|---|
| [principles](docs/principles.md) | the four rules everything here obeys |
| [directory-structure](docs/directory-structure.md) | what lives where, built vs planned |
| [personalisation](docs/personalisation.md) | how personalisation flows from Obsidian to each harness |
| [memory-strategy](docs/memory-strategy.md) | shared agent memory plan (not yet built) |
