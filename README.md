# ~/.agents

Coordination home for every agent harness on this machine. This repo owns the
_shared_ stuff: canonical data plus the code that distributes it. Tool-private
configuration stays in each tool's own home.

## Quickstart

```sh
bun install                 # bun 1.3.13 pinned via .prototools
just bootstrap              # set this machine up: harnesses, memory, links
just                        # list commands
just sync                   # converge everything this machine can
just doctor                 # verify wiring across harnesses
```

Configure `hindsight/env.local` from `hindsight/env.example` before setup, and
name this machine's vault in `config/vault.local.yml` if it has one. Preview
with `just bootstrap --dry-run`. See [machine setup](docs/bootstrap.md) for
harness selection, remotes, and chezmoi use.

## Layout

See [docs/directory-structure.md](docs/directory-structure.md).

## Docs

| Doc                                                | Covers                                                  |
| -------------------------------------------------- | ------------------------------------------------------- |
| [machine setup](docs/bootstrap.md)                 | first setup, customisation, and dry runs                |
| [principles](docs/principles.md)                   | the four rules everything here obeys                    |
| [directory-structure](docs/directory-structure.md) | what lives where, built vs planned                      |
| [personalisation](docs/personalisation.md)         | how personalisation flows from Obsidian to each harness |
| [memory-strategy](docs/memory-strategy.md)         | shared agent memory plan (not yet built)                |
| [search](docs/search.md)                           | local search over notes and specs, and its MCP server   |
