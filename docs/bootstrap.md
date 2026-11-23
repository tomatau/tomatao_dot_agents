# Machine setup

Clone this repository into `~/.agents`, then run `bun install`. Migration of an
existing directory is separate from bootstrap.

Before running setup, customise:

| Choice                      | Location                                                   |
| --------------------------- | ---------------------------------------------------------- |
| Extraction provider         | `hindsight/env.local`, copied from `hindsight/env.example` |
| Vault location              | `config/vault.local.yml`, as `dir: ~/path/to/vault`        |
| Vault sync and search scope | `config/vault.yml`                                         |
| Shared instructions         | `personalisation/*.md`                                     |
| Skills                      | `skills/` — remove the ones you do not want                |
| Memory banks                | `config/hindsight.yml`                                     |

`env.local` is the memory service's environment: a shell file sourced by both
CLI commands and the service. Assignments in it override inherited environment
values; shell expansion and quoting apply. Bootstrap stops before installation
or linking if the provider command is unavailable. If `env.local` is missing, a
real run creates it from the template and stops for you to edit it. A dry run
leaves it absent.

Any `config/<name>.yml` can be adjusted for one machine in a gitignored
`config/<name>.local.yml` beside it. The local file is laid over the shared one:
mappings merge key by key at every depth, and a scalar or a list replaces the
shared value whole. Either file may be absent.

`config/vault.local.yml` is gitignored, because a vault sits somewhere different
on each machine. A machine without the file has no vault: bootstrap and sync
skip the vault-fed steps and set everything else up.

## Run setup

```sh
just bootstrap --dry-run
just bootstrap
```

Bootstrap asks which harnesses to use and whether to add a missing Git remote.
It records unselected harnesses as disabled in `config/adapters.yml`. Sync
retires their repo-owned personalisation and skill links.

When `origin` points to the canonical repository, bootstrap keeps it. When
`origin` points to your fork, bootstrap offers to add the canonical repository
as `upstream`. It leaves an existing `upstream` alone.

Memory service installation uses macOS launchd. Bootstrap installs
`hindsight-api`, starts the service if necessary, waits for it to answer, and
ensures the configured banks exist. It then runs the same convergence steps as
`just sync`. Vault-fed steps run only when a vault is declared and both
configured scope notes exist in it.

For chezmoi or another non-interactive caller, pass your selection explicitly:

```sh
just bootstrap --yes --harnesses=claude,pi
```

Dry runs list the actions without applying them. When Hindsight is offline,
they list banks to ensure after startup rather than trying to inspect an absent
server. Preview requires usable settings, just as installation does.

## Memory on its own

```sh
just memory install --dry-run
just memory install
just memory banks --dry-run
just memory banks
```
