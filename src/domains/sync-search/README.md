# sync-search

Building the fidx indexes an agent searches, from the scope the vault declares.
It replaces `search-sync`, which builds LEANN indexes, once both have been seen
to agree.

- The vault decides what is searchable; this domain only reads that decision.
  An index gains a source by editing the vault's declaration, never this repo.
- Each index is one fidx database with one collection. Its patterns come from
  the vault's declaration, with braces expanded, because fidx's matching does
  not read them.
- fidx updates incrementally and drops deleted notes, so every sync runs it.
- fidx does not follow a symlinked folder. Each build compares fidx's count
  with the vault's own plan and fails if they differ.
