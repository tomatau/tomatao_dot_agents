# Search

Local search over source material, through fidx: keyword and meaning-based
matching in one SQLite database per index, run on this machine. It complements
Hindsight, which holds distilled cross-session memory. Neither is
authoritative: an agent reads the current source before making a decision, and
Obsidian remains canonical for vault notes.

## Indexes

- The vault declares what is searchable in `_system/config/search-sync.yml`.
  `just sync-search` builds one database per declared index into `fidx/`,
  machine-local and gitignored; `--dry-run` reports the scope and stops. The
  vault owns what is searchable, this repo owns how it is indexed, and the two
  meet at that file's `version`.
- Other repos build their own, such as a11y-specs' `.fidx/index.db`. This repo
  only reads them.
- `config/search.local.yml`, gitignored, lists the indexes this machine offers
  agents: each name with its database and a description. A relative `db` is
  inside this repo, and `~` is home. A machine without the file offers none.

Scope is an allow-list: only notes matching a source glob are indexed, and an
`unindexed` glob overrides a source. Nothing is copied out of the vault, and the
embedding model runs locally, so note content stays on the machine.

## The `shared-search` server

`mcp/shared-search.yml` pins one stdio server into every harness, offering
`search` and `get` over each index in `config/search.local.yml`. Like
project-memory, it runs in other repos under their toolchain, so it reads no
config of its own: `just mcp` reads the local file, checks each database exists,
and passes the indexes as an argument. A change to the file takes effect after
the next `just mcp` and a harness restart.

Each call starts fidx afresh, taking well under a second, so nothing stays
loaded between calls. When a harness connects, the server tells it what each
index holds, so an agent knows to search before answering from memory.

## Freshness

fidx updates incrementally and drops deleted notes, so `just sync` runs
`sync-search` every time; with nothing changed it takes under a second. Each
build compares fidx's document count with the vault's own plan and fails if they
differ: fidx does not follow a symlinked folder.

`just doctor` reports each vault index as stale when its count differs from the
notes now in scope, or when a note changed after the last sync.

## Duplicate detection

The first use: before Hermes materialises a new Obsidian note, meaning-based
search nominates existing notes, and Hermes reads likely matches through the
Obsidian boundary before deciding whether to update one or propose a new one. A
similarity score is evidence, not an identity decision, and an empty result does
not prove uniqueness. Do not use a stale index to conclude that a note is
unique.
