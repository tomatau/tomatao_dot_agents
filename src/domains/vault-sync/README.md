# vault-sync

Pushing the vault's authoritative notes into the profile bank, and removing what
the vault no longer holds.

- The vault always wins. This is a one-way projection; nothing here writes back.
- Which notes are in scope is declared in the vault itself, so adding a source
  never means changing this repo.
- The local cache exists only to skip unchanged files; losing it must cost
  nothing but time.
