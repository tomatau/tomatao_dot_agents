# LEANN

LEANN provides local semantic retrieval over source material. It complements
Hindsight, which holds distilled cross-session memory. Neither is authoritative:
an agent reads the current source before making a decision, and Obsidian remains
canonical for vault notes.

## First use case

The first index supports duplicate detection before Hermes materialises a new
Obsidian note. The workflow uses semantic search to nominate existing notes,
then reads likely matches through the Obsidian boundary before deciding whether
to update an existing note or propose a new one. A similarity score is evidence,
not an identity decision, and an empty result does not prove uniqueness.

This use case indexes the vault's Markdown notes. Mail, messages, codebases, and
other possible corpora remain out of scope until a workflow needs them.

## Ownership

- `mcp/leann.yml` declares the shared read interface for agent harnesses.
- A use-case-owned index configuration defines its sources, exclusions, and
  stable index name. Embedding model and backend are tool details, so they
  belong to the sync code rather than to the source being indexed.
- A separate idempotent sync entry builds or refreshes that index.
- Hermes owns when duplicate detection is required and how candidates affect
  its note proposal. LEANN owns retrieval only.

## Sync

`just search-sync` builds every index the vault declares in
`_system/config/search-sync.yml`; `--dry-run` reports the scope and stops. The
vault owns what is searchable, this repo owns how it is indexed, and the two
meet at that file's `version`.

Scope is an allow-list: only notes matching a source glob are indexed, and an
`unindexed` glob overrides a source. LEANN itself cannot exclude anything — it
reads only a `.gitignore` beside the documents it is handed — so the sync
passes an explicit file list and never points it at a folder.

Builds run in `leann/`, machine-local and gitignored, because LEANN writes its
index below the working directory. Running from the vault would put the index
into Obsidian's sync. Nothing is copied out of the vault, and the default
embedding model runs locally, so note content stays on the machine.

## Freshness gate

The installed LEANN 0.3.7 MCP exposes search and list operations, but no build or
status operation. Its published HNSW and DiskANN backends do not provide the IVF
incremental lifecycle described by the current unreleased source. Until an
incremental backend is available and verified, the vault sync must use a
scheduled full rebuild or an explicitly validated replacement strategy.

`leann/.state.json` records each index's last successful build — when it
finished, how many notes it held, and a hash of the file list — so a reader can
judge freshness without a status operation.

Do not use a stale index to conclude that a note is unique. The duplicate-check
workflow must know when the last successful index build completed and degrade
to its existing exact checks when freshness cannot be established.
