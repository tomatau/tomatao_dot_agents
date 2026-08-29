# hindsight

Running the memory service on this machine: its launch agent and the plist that
defines it.

- Only lifecycle lives here. What the service *stores* is `shared-memory` and
  `project-memory`; talking to its API is `clients/hindsight.ts`.
- Machine-local values belong in `hindsight/env.local`, not in code.
