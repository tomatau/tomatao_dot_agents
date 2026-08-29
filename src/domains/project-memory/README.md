# project-memory

The bank that follows the repo: identifying which one a harness is working in,
and the stdio server that routes to it.

- Identity is derived, never configured: a git remote where there is one, else
  the directory. A repo is not asked to declare anything.
- Decisions live in `decide.ts` as a pure function over a session; effects live
  in `effects.ts` behind named dependencies. Keep the two apart.
- The server runs inside other repos, under whatever toolchain they provide, so
  it reads no configuration of its own — everything arrives as arguments.
