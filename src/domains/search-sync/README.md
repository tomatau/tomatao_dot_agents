# search-sync

Building the local semantic indexes an agent searches, from the scope the vault
declares.

- The vault decides what is searchable; this domain only reads that decision.
  An index gains a source by editing the vault's declaration, never this repo.
- Only listed notes are passed to the indexer, because the indexer cannot
  exclude anything itself. Nothing is copied out of the vault, and nothing is
  written back into it.
- A build is all-or-nothing. Whether one happened is the indexer client's
  record to keep; what counts as stale afterwards is decided here, because only
  this domain knows what the index was built from.
- How text becomes vectors — model, backend, chunking — belongs here. What the
  index contains does not.
