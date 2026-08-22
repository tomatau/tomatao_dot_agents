# Principles

1. **No duplication** — anything with an authoritative home elsewhere is referenced
   or synced, never copied into a second truth.
2. **Canonical data + merge logic live here; foreign configs never do.**
3. **Idempotency everywhere** — every sync/adapter action is safe to re-run.
4. **Memory is derived, not authoritative** — except what agents retain into
   `learnings`; the vault always wins on re-sync.
